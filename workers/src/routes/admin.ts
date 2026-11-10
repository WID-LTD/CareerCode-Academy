import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, pageParams, requireRole, statusOf } from '../route-utils';
import { hashPassword, randomToken, type TokenPayload } from '../auth-helpers';
import { mail } from '../email';
import * as M from '../admin/models';
import * as A from '../admin/analytics';
import { syncLearningPathForCourse } from '../admin/learning-path-sync';
import messageRoutes from '../admin/messages';
import {
  logAudit,
  requestMeta,
  slugify,
  jsonBody,
  monDay,
  monYear,
  num,
  intCount,
  validateCoursePayload,
  SUPPORTED_CURRENCIES,
  isSupportedCurrency,
  sendInstructorApprovalEmail,
  sendInstructorUpgradeEmail,
} from '../admin/helpers';

// Port of backend/src/routes/admin.routes.ts (mounted at /api/v1/admin).
// Express applied `authenticate + authorize('admin','super_admin')` to the
// whole router; the same guard runs here as middleware. Socket.io emits and
// multer/PDF work are intentionally dropped (see the 501 endpoints below).

type AdminEnv = { Bindings: Env; Variables: { session: TokenPayload } };

const admin = new Hono<AdminEnv>();

admin.use('*', async (c, next) => {
  try {
    const session = await requireRole(c as any, ['admin', 'super_admin']);
    c.set('session', session);
  } catch (e: any) {
    return fail(c, statusOf(e, 401), e?.message || 'You do not have permission to perform this action');
  }
  await next();
});

// Sub-router: /admin/messages (auth already applied above; the sub-router
// re-reads the session for its own handlers).
admin.route('/messages', messageRoutes);

const AUDIT_META = (c: any) => requestMeta(c);

function isSuperAdmin(session: TokenPayload): boolean {
  return session.role === 'super_admin';
}

function forbidden(c: any) {
  return fail(c, 403, 'You do not have permission to perform this action');
}

/** `YYYY-MM` for a date-ish value. */
function monthOf(value: any): string | null {
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 7);
}

/**
 * Roll daily rows up into calendar-month buckets.
 * Postgres `DATE_TRUNC('month', col)` is not faithfully translated by
 * sql-compat (it truncates to the day), so month aggregation happens here.
 */
function rollupByMonth(rows: any[], keys: string[]): any[] {
  const map = new Map<string, any>();
  for (const row of rows) {
    const m = monthOf(row.date);
    if (!m) continue;
    let acc = map.get(m);
    if (!acc) {
      acc = { date: `${m}-01`, label: monYear(`${m}-01`) };
      for (const k of keys) acc[k] = 0;
      map.set(m, acc);
    }
    for (const k of keys) acc[k] += num(row[k]);
  }
  return Array.from(map.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════

// GET /admin/dashboard
admin.get('/dashboard', async (c) => {
  try {
    const db = getDb(c.env);
    const range = c.req.query('range') || '6m';
    const intervalMap: Record<string, string> = {
      '7d': '7 days', '30d': '30 days', '6m': '6 months', '1y': '1 year',
    };
    const chartInterval = range === '7d' || range === '30d' ? 'day' : 'month';
    const day = chartInterval === 'day';
    const intervalStr = intervalMap[range] || '6 months';

    // Day-level grouping; month buckets are rolled up in JS (see rollupByMonth).
    const enrollTrunc = 'DATE(enrolled_at)';
    const payTrunc = 'DATE(created_at)';
    const completionTrunc = 'DATE(completed_at)';

    const totalStudents = await M.countUsers(c.env, 'student');
    const totalInstructors = await M.countUsers(c.env, 'instructor');
    const totalCourses = await M.countCourses(c.env);
    const publishedCourses = await M.countCourses(c.env, true);
    const totalEnrollments = await M.countEnrollments(c.env);
    const revenueStats = await M.getRevenueStats(c.env);

    const [pendingApps, draftC, activeUsers, certsIssued] = await Promise.all([
      db.query<any>(`SELECT COUNT(*) as count FROM instructor_applications WHERE status = 'pending'`),
      db.query<any>(`SELECT COUNT(*) as count FROM courses WHERE published = false`),
      db.query<any>(`SELECT COUNT(*) as count FROM users WHERE is_suspended = false OR is_suspended IS NULL`),
      db.query<any>(`SELECT COUNT(*) as count FROM certificates`),
    ]);

    const [
      enrollTrend,
      userRegTrend,
      topC,
      recentAct,
      revenueTrend,
      refundTrend,
      prevStats,
      payoutSum,
      completionTrend,
    ] = await Promise.all([
      db.query<any>(
        `SELECT ${enrollTrunc} as date, COUNT(*) as enrollments FROM enrollments
         WHERE enrolled_at > NOW() - INTERVAL '${intervalStr}' GROUP BY date ORDER BY date`
      ),
      db.query<any>(
        `SELECT DATE(created_at) as date, COUNT(*) as users FROM users
         WHERE created_at > NOW() - INTERVAL '${intervalStr}' GROUP BY date ORDER BY date`
      ),
      db.query<any>(
        `SELECT c.title, c.slug, COUNT(e.id) as enrollments FROM courses c
         LEFT JOIN enrollments e ON c.id = e.course_id
         GROUP BY c.id, c.title, c.slug ORDER BY enrollments DESC LIMIT 5`
      ),
      db.query<any>(
        `SELECT al.*, u.name as admin_name FROM audit_logs al
         JOIN users u ON al.admin_id = u.id ORDER BY al.created_at DESC LIMIT 10`
      ),
      db.query<any>(
        `SELECT ${payTrunc} as date, COALESCE(SUM(amount), 0) as revenue, COUNT(*) as transactions FROM payments
         WHERE status = 'completed' AND created_at > NOW() - INTERVAL '${intervalStr}'
         GROUP BY date ORDER BY date`
      ),
      db.query<any>(
        `SELECT ${payTrunc} as date, COALESCE(SUM(amount), 0) as refunds FROM payments
         WHERE status = 'refunded' AND created_at > NOW() - INTERVAL '${intervalStr}'
         GROUP BY date ORDER BY date`
      ),
      db.query<any>(
        `SELECT
          (SELECT COUNT(*) FROM users WHERE role = 'student' AND created_at < NOW() - INTERVAL '${intervalStr}') as prev_students,
          (SELECT COUNT(*) FROM users WHERE role = 'instructor' AND created_at < NOW() - INTERVAL '${intervalStr}') as prev_instructors,
          (SELECT COUNT(*) FROM enrollments WHERE enrolled_at < NOW() - INTERVAL '${intervalStr}') as prev_enrollments,
          (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND created_at < NOW() - INTERVAL '${intervalStr}') as prev_revenue`
      ),
      db.query<any>(
        `SELECT COUNT(*)::int as pending_count, COALESCE(SUM(amount), 0)::float as pending_amount
         FROM payouts WHERE status = 'pending'`
      ),
      db.query<any>(
        `SELECT ${completionTrunc} as date, COUNT(*)::int as completions FROM enrollments
         WHERE completed = true AND completed_at > NOW() - INTERVAL '${intervalStr}'
         GROUP BY date ORDER BY date`
      ),
    ]);

    const recentUsers = await M.getAllUsers(c.env, 10, 0);
    const recentPayments = await M.getAllPayments(c.env, 10, 0);

    const prev = prevStats.rows[0] || {};

    const calcTrend = (current: number, previous: number): number => {
      if (!previous) return 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const enrollTrendRows = day
      ? enrollTrend.rows.map((r: any) => ({ date: r.date, label: monDay(r.date), enrollments: num(r.enrollments) }))
      : rollupByMonth(enrollTrend.rows, ['enrollments']);

    const revenueTrendRows = day
      ? revenueTrend.rows.map((r: any) => ({
          date: r.date,
          label: monDay(r.date),
          revenue: r.revenue,
          transactions: num(r.transactions),
        }))
      : rollupByMonth(revenueTrend.rows, ['revenue', 'transactions']);

    const refundTrendRows = day
      ? refundTrend.rows.map((r: any) => ({ date: r.date, label: monDay(r.date), refunds: r.refunds }))
      : rollupByMonth(refundTrend.rows, ['refunds']);

    const completionTrendRows = rollupByMonth(completionTrend.rows, ['completions']);

    return c.json({
      success: true,
      data: {
        stats: {
          totalStudents,
          totalInstructors,
          totalCourses,
          publishedCourses,
          totalEnrollments,
          totalRevenue: revenueStats.total_revenue,
          averagePrice: revenueStats.average_price,
          pendingApplications: intCount(pendingApps.rows[0]?.count),
          draftCourses: intCount(draftC.rows[0]?.count),
          activeUsers: intCount(activeUsers.rows[0]?.count),
          certificatesIssued: intCount(certsIssued.rows[0]?.count),
          monthlyRevenue: revenueTrend.rows.reduce((acc: number, r: any) => acc + num(r.revenue), 0),
          trends: {
            totalStudents: calcTrend(totalStudents, parseInt(String(prev.prev_students || '0'), 10)),
            totalInstructors: calcTrend(totalInstructors, parseInt(String(prev.prev_instructors || '0'), 10)),
            totalEnrollments: calcTrend(totalEnrollments, parseInt(String(prev.prev_enrollments || '0'), 10)),
            totalRevenue: calcTrend(num(revenueStats.total_revenue), parseFloat(String(prev.prev_revenue || '0'))),
          },
        },
        recentUsers,
        recentPayments,
        monthlyRevenue: revenueTrendRows,
        refundTrend: refundTrendRows,
        enrollmentTrend: enrollTrendRows,
        userRegistrationTrend: userRegTrend.rows.map((r: any) => ({
          date: r.date,
          label: monDay(r.date),
          users: num(r.users),
        })),
        topCourses: topC.rows,
        recentActivities: recentAct.rows,
        payoutSummary: payoutSum.rows[0] || { pending_count: 0, pending_amount: 0 },
        completionTrend: completionTrendRows,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load dashboard');
  }
});

// ══════════════════════════════════════════════════════════════
// USERS
// ══════════════════════════════════════════════════════════════

// GET /admin/users
// POST /admin/users — create a user and email a set-password invite
admin.post('/users', async (c) => {
  try {
    const session = c.get('session');
    const body = await jsonBody(c);
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const role = body.role || 'student';
    if (!name) return fail(c, 400, 'Name is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(c, 400, 'A valid email is required');
    if (!['student', 'instructor', 'admin', 'super_admin'].includes(role)) return fail(c, 400, 'Invalid role');

    const db = getDb(c.env);
    const existing = await db.query<any>('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) return fail(c, 409, 'A user with that email already exists');

    const setupToken = randomToken(24);
    const password = await hashPassword(c.env, randomToken(24));
    const { rows } = await db.query<any>(
      `INSERT INTO users (name, email, password, role, is_verified, setup_token, setup_token_expires)
       VALUES ($1, $2, $3, $4, false, $5, $6) RETURNING id, name, email, role, is_verified, created_at`,
      [name, email, password, role, setupToken, new Date(Date.now() + 24 * 60 * 60 * 1000)]
    );
    const user = rows[0];

    await M.createNotification(c.env, {
      user_id: user.id,
      title: 'Welcome to CareerCode',
      message: `Your ${role.replace('_', ' ')} account has been created. Check your email to set a password.`,
      type: 'info',
    });

    if (body.sendInvite !== false) {
      c.executionCtx.waitUntil(mail.accountInvite(c.env, email, name, role, setupToken).catch(() => {}));
    }

    await logAudit(c.env, {
      adminId: session.userId,
      action: 'create_user',
      resourceType: 'user',
      resourceId: user.id,
      details: `Created ${role} ${email}`,
      ...AUDIT_META(c),
    });

    return c.json({ success: true, data: { ...user, inviteSent: body.sendInvite !== false } }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create user');
  }
});

admin.get('/users', async (c) => {
  try {
    const { page, limit, offset } = pageParams(c, 50);
    const role = c.req.query('role');
    const search = c.req.query('search');
    const db = getDb(c.env);

    let sql = `SELECT u.id, u.name, u.email, u.role, u.avatar, u.bio, u.is_verified, u.is_suspended, u.created_at, u.last_login, u.allowed_dashboards,
      (SELECT COUNT(*) FROM enrollments WHERE user_id = u.id)::int as enrolled_courses_count,
      (SELECT COUNT(*) FROM enrollments WHERE user_id = u.id AND completed = true)::int as completed_courses_count
      FROM users u WHERE 1=1`;
    const params: any[] = [];

    if (role) {
      params.push(role);
      sql += ` AND role = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await db.query<any>(sql, params);
    const { rows: countRows } = await db.query<any>('SELECT COUNT(*) as count FROM users');
    const total = intCount(countRows[0]?.count);

    return c.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load users');
  }
});

// GET /admin/users/:userId/completed-courses
admin.get('/users/:userId/completed-courses', async (c) => {
  try {
    const enrollments = await M.getEnrollmentsByUser(c.env, c.req.param('userId'));
    const completed = enrollments
      .filter((e: any) => e.completed)
      .map((e: any) => ({ id: e.course_id, title: e.course_title, completed_at: e.completed_at }));
    return c.json({ success: true, data: completed });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load completed courses');
  }
});

// PUT /admin/users/:id/role
admin.put('/users/:id/role', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const body = await jsonBody(c);
    const role = body.role;

    if (!['student', 'instructor', 'admin', 'super_admin'].includes(role)) {
      return fail(c, 400, 'Invalid role');
    }

    const user = await M.updateUser(c.env, id, { role });
    if (!user) return fail(c, 404, 'User not found');

    const dash = role === 'instructor' ? '/instructor/dashboard' : ['admin', 'super_admin'].includes(role) ? '/admin/dashboard' : '/student/dashboard';
    await M.createNotification(c.env, {
      user_id: id,
      title: 'Role Updated',
      message: `Your role has been updated to ${role.replace('_', ' ')}`,
      type: 'info',
      link: dash,
    });
    c.executionCtx.waitUntil(mail.roleChanged(c.env, user.email, user.name, role).catch(() => {}));

    await logAudit(c.env, {
      adminId: session.userId,
      action: 'update_role',
      resourceType: 'user',
      resourceId: id,
      details: `Role changed to ${role}`,
      ...AUDIT_META(c),
    });

    return c.json({ success: true, data: user });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update role');
  }
});

// DELETE /admin/users/:id
admin.delete('/users/:id', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');

    if (id === session.userId) return fail(c, 400, 'Cannot delete yourself');

    const deleted = await M.deleteUser(c.env, id);
    if (!deleted) return fail(c, 404, 'User not found');

    await logAudit(c.env, { adminId: session.userId, action: 'delete', resourceType: 'user', resourceId: id, ...AUDIT_META(c) });
    return c.json({ success: true, message: 'User deleted successfully' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete user');
  }
});

// ══════════════════════════════════════════════════════════════
// COURSES
// ══════════════════════════════════════════════════════════════

// GET /admin/courses
admin.get('/courses', async (c) => {
  try {
    const { page, limit, offset } = pageParams(c, 50);
    const status = c.req.query('status');
    const db = getDb(c.env);

    const courses = await M.getAllCourses(c.env, limit, offset, status ? { status } : undefined);
    const { rows } = status
      ? await db.query<any>('SELECT COUNT(*) as count FROM courses WHERE status = $1', [status])
      : await db.query<any>('SELECT COUNT(*) as count FROM courses');
    const total = intCount(rows[0]?.count);

    return c.json({
      success: true,
      data: courses,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load courses');
  }
});

// DELETE /admin/courses/:id
admin.delete('/courses/:id', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const course = await M.getCourseById(c.env, id);
    if (!course) return fail(c, 404, 'Course not found');

    await M.deleteCourse(c.env, id);
    await syncLearningPathForCourse(c.env, { id, category: course.category, level: course.level });
    await logAudit(c.env, { adminId: session.userId, action: 'delete', resourceType: 'course', resourceId: id, ...AUDIT_META(c) });
    return c.json({ success: true, message: 'Course deleted successfully' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete course');
  }
});

// GET /admin/courses/:id
admin.get('/courses/:id', async (c) => {
  try {
    const course = await M.getCourseById(c.env, c.req.param('id'));
    if (!course) return fail(c, 404, 'Course not found');
    return c.json({ success: true, data: course });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load course');
  }
});

// POST /admin/courses
admin.post('/courses', async (c) => {
  try {
    const session = c.get('session');
    const body = await jsonBody(c);
    const errors = validateCoursePayload(body, { required: true });
    if (errors) return c.json({ success: false, message: 'Validation failed', errors }, 400);

    const { title, description, price, category, level, duration, thumbnail, status, instructor_id, learning_outcomes } = body;
    const slug = slugify(title);
    const course = await M.createCourse(c.env, {
      title,
      description,
      price,
      category,
      level,
      duration,
      instructor_id,
      slug,
      thumbnail: thumbnail || undefined,
      learning_outcomes: learning_outcomes || undefined,
    });

    if (status && status !== 'draft') {
      await M.updateCourseStatus(c.env, course.id, status, undefined, session.userId);
    }

    await logAudit(c.env, { adminId: session.userId, action: 'create', resourceType: 'course', resourceId: course.id, ...AUDIT_META(c) });
    const final = await M.getCourseById(c.env, course.id);
    await syncLearningPathForCourse(c.env, final || course);
    return c.json({ success: true, data: final || course }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create course');
  }
});

// PUT /admin/courses/:id
admin.put('/courses/:id', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const existing = await M.getCourseById(c.env, id);
    if (!existing) return fail(c, 404, 'Course not found');

    const body = await jsonBody(c);
    const errors = validateCoursePayload(body, { required: false });
    if (errors) return c.json({ success: false, message: 'Validation failed', errors }, 400);

    const { title, description, price, category, level, duration, thumbnail, status, instructor_id, learning_outcomes } = body;
    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (category !== undefined) updateData.category = category;
    if (level !== undefined) updateData.level = level;
    if (duration !== undefined) updateData.duration = duration;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
    if (instructor_id !== undefined) updateData.instructor_id = instructor_id;
    if (learning_outcomes !== undefined) updateData.learning_outcomes = learning_outcomes;
    if (title !== undefined) updateData.slug = slugify(title);

    if (Object.keys(updateData).length > 0) await M.updateCourse(c.env, id, updateData);
    if (status !== undefined) await M.updateCourseStatus(c.env, id, status, undefined, session.userId);

    const updated = await M.getCourseById(c.env, id);

    await syncLearningPathForCourse(
      c.env,
      { id, category: updated?.category || existing.category, level: updated?.level || existing.level },
      existing.category,
      existing.level
    );

    await logAudit(c.env, { adminId: session.userId, action: 'update', resourceType: 'course', resourceId: id, ...AUDIT_META(c) });
    return c.json({ success: true, data: updated });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update course');
  }
});

// ══════════════════════════════════════════════════════════════
// PAYMENTS / REVENUE
// ══════════════════════════════════════════════════════════════

// GET /admin/payments
admin.get('/payments', async (c) => {
  try {
    const { page, limit, offset } = pageParams(c, 50);
    const payments = await M.getAllPayments(c.env, limit, offset);
    const { rows } = await getDb(c.env).query<any>('SELECT COUNT(*) as count FROM payments');
    const total = intCount(rows[0]?.count);
    return c.json({
      success: true,
      data: payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load payments');
  }
});

// GET /admin/revenue
admin.get('/revenue', async (c) => {
  try {
    const db = getDb(c.env);
    const revenueStats = await M.getRevenueStats(c.env);

    // Daily buckets (month rollup happens in JS — see rollupByMonth).
    const monthlyRevenue = await db.query<any>(
      `SELECT DATE(created_at) as date, COALESCE(SUM(amount), 0) as revenue, COUNT(*) as transactions
       FROM payments WHERE status = 'completed' GROUP BY date ORDER BY date DESC`
    );

    const revenueByCourse = await db.query<any>(
      `SELECT c.id, c.title, c.slug,
              COUNT(p.id) as enrollments,
              COALESCE(SUM(p.amount), 0) as revenue
       FROM courses c
       LEFT JOIN payments p ON c.id = p.course_id AND p.status = 'completed'
       GROUP BY c.id, c.title, c.slug
       ORDER BY revenue DESC
       LIMIT 20`
    );

    const revenueByProvider = await db.query<any>(
      `SELECT provider, COUNT(*) as transactions, COALESCE(SUM(amount), 0) as revenue
       FROM payments WHERE status = 'completed' GROUP BY provider`
    );

    const monthly = rollupByMonth(monthlyRevenue.rows, ['revenue', 'transactions'])
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 12)
      .map((r) => ({ month: r.date, revenue: r.revenue, transactions: r.transactions }));

    return c.json({
      success: true,
      data: {
        summary: revenueStats,
        monthly,
        byCourse: revenueByCourse.rows,
        byProvider: revenueByProvider.rows,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load revenue');
  }
});

// ══════════════════════════════════════════════════════════════
// INSTRUCTOR APPLICATIONS
// ══════════════════════════════════════════════════════════════

// GET /admin/applications
admin.get('/applications', async (c) => {
  try {
    const { page, limit, offset } = pageParams(c, 20);
    const status = c.req.query('status');
    const db = getDb(c.env);

    let queryStr = `SELECT * FROM instructor_applications`;
    let countStr = `SELECT COUNT(*) as count FROM instructor_applications`;
    const queryParams: any[] = [];
    const countParams: any[] = [];

    if (status) {
      queryStr += ` WHERE status = $1`;
      countStr += ` WHERE status = $1`;
      queryParams.push(status);
      countParams.push(status);
    }

    queryStr += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const { rows } = await db.query<any>(queryStr, queryParams);
    const countRes = await db.query<any>(countStr, countParams);
    const total = intCount(countRes.rows[0]?.count);

    return c.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load applications');
  }
});

/** Approve/upgrade flow shared by approve + PUT /applications/:id. */
async function grantInstructorAccess(
  env: Env,
  email: string,
  name: string,
  variant: 'approve' | 'update'
): Promise<void> {
  const existingUser = await M.getUserByEmail(env, email);
  if (existingUser) {
    await M.updateUser(env, existingUser.id, { role: 'instructor' });
    await M.createNotification(env, {
      user_id: existingUser.id,
      title: 'Application Approved',
      message:
        variant === 'update'
          ? 'Your instructor application has been approved! Your account is now an Instructor account.'
          : 'Your instructor application has been approved!',
      type: 'success',
    });
    await sendInstructorUpgradeEmail(env, email, name);
    return;
  }

  const tempPassword = randomToken(4);
  const hashedPassword = await hashPassword(env, tempPassword);
  const newUser = await M.createUser(env, { name, email, password: hashedPassword, role: 'instructor' });
  await M.updateUser(env, newUser.id, { is_verified: true });
  await M.createNotification(env, {
    user_id: newUser.id,
    title: 'Welcome Instructor',
    message:
      variant === 'update'
        ? 'Your instructor application has been approved! Welcome to CareerCode Academy.'
        : 'Your instructor application has been approved!',
    type: 'success',
  });
  await sendInstructorApprovalEmail(env, email, name, tempPassword);
}

// PUT /admin/applications/:id/approve
admin.put('/applications/:id/approve', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const body = await jsonBody(c);
    // Express middleware copied review_notes into notes when notes was absent.
    const notes = body.notes || body.review_notes;
    const reviewNotes = body.review_notes;
    const db = getDb(c.env);

    const oldAppResult = await db.query<any>(`SELECT status FROM instructor_applications WHERE id = $1`, [id]);
    if (oldAppResult.rows.length === 0) return fail(c, 404, 'Application not found');

    const { rows } = await db.query<any>(
      `UPDATE instructor_applications
       SET status = 'approved', notes = COALESCE($1, notes), review_notes = COALESCE($2, review_notes),
           reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [notes, reviewNotes, session.userId, id]
    );

    const application = rows[0];
    await grantInstructorAccess(c.env, application.email, application.full_name, 'approve');

    await logAudit(c.env, { adminId: session.userId, action: 'approve', resourceType: 'application', resourceId: id, ...AUDIT_META(c) });
    return c.json({ success: true, message: 'Application approved', data: application });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to approve application');
  }
});

// PUT /admin/applications/:id/reject
admin.put('/applications/:id/reject', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const body = await jsonBody(c);
    const { rows } = await getDb(c.env).query<any>(
      `UPDATE instructor_applications SET status = 'rejected', notes = COALESCE($1, notes),
         reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [body.notes, session.userId, id]
    );
    if (rows.length === 0) return fail(c, 404, 'Application not found');
    await logAudit(c.env, { adminId: session.userId, action: 'reject', resourceType: 'application', resourceId: id, ...AUDIT_META(c) });
    return c.json({ success: true, message: 'Application rejected', data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to reject application');
  }
});

// PUT /admin/applications/:id
admin.put('/applications/:id', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const body = await jsonBody(c);
    const { status, notes, review_notes } = body;
    const db = getDb(c.env);

    const oldAppResult = await db.query<any>(`SELECT status FROM instructor_applications WHERE id = $1`, [id]);
    if (oldAppResult.rows.length === 0) return fail(c, 404, 'Application not found');
    const oldStatus = oldAppResult.rows[0].status;

    const { rows } = await db.query<any>(
      `UPDATE instructor_applications
       SET status = COALESCE($1, status),
           notes = COALESCE($2, notes),
           review_notes = COALESCE($3, review_notes),
           reviewed_by = $4,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [status, notes, review_notes, session.userId, id]
    );

    const application = rows[0];
    if (status === 'approved' && oldStatus !== 'approved') {
      await grantInstructorAccess(c.env, application.email, application.full_name, 'update');
    }

    return c.json({ success: true, message: 'Application updated successfully', data: application });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update application');
  }
});

// PUT /admin/applications/:id/request-changes
admin.put('/applications/:id/request-changes', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const body = await jsonBody(c);
    const { rows } = await getDb(c.env).query<any>(
      `UPDATE instructor_applications SET status = 'pending', notes = COALESCE($1, notes),
         reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [body.notes, session.userId, id]
    );
    if (rows.length === 0) return fail(c, 404, 'Application not found');
    await logAudit(c.env, {
      adminId: session.userId,
      action: 'request_changes',
      resourceType: 'application',
      resourceId: id,
      details: body.notes,
      ...AUDIT_META(c),
    });
    return c.json({ success: true, message: 'Changes requested', data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to request changes');
  }
});

// ══════════════════════════════════════════════════════════════
// COURSE PROPOSALS
// ══════════════════════════════════════════════════════════════

// GET /admin/course-proposals
admin.get('/course-proposals', async (c) => {
  try {
    const { page, limit, offset } = pageParams(c, 20);
    const db = getDb(c.env);

    const { rows } = await db.query<any>(
      `SELECT cp.*, u.name as instructor_name, u.email as instructor_email
       FROM course_proposals cp
       JOIN users u ON cp.instructor_id = u.id
       ORDER BY cp.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countRes = await db.query<any>('SELECT COUNT(*) as count FROM course_proposals');
    const total = intCount(countRes.rows[0]?.count);

    return c.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load course proposals');
  }
});

// PUT /admin/course-proposals/:id
admin.put('/course-proposals/:id', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const body = await jsonBody(c);
    const { status, notes, review_notes } = body;
    const db = getDb(c.env);

    const oldProposal = await db.query<any>('SELECT * FROM course_proposals WHERE id = $1', [id]);
    if (oldProposal.rows.length === 0) return fail(c, 404, 'Proposal not found');
    const proposal = oldProposal.rows[0];

    const { rows } = await db.query<any>(
      `UPDATE course_proposals
       SET status = COALESCE($1, status),
           notes = COALESCE($2, notes),
           review_notes = COALESCE($3, review_notes),
           reviewed_by = $4,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [status, notes, review_notes, session.userId, id]
    );

    const updatedProposal = rows[0];

    if (status === 'approved' && proposal.status !== 'approved') {
      const slug = updatedProposal.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + randomToken(4);
      await db.query(
        `INSERT INTO courses (
           title, description, thumbnail, price, category, instructor_id, level, duration, slug, published
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)`,
        [
          updatedProposal.title,
          updatedProposal.description,
          updatedProposal.thumbnail_url,
          updatedProposal.recommended_price,
          updatedProposal.category,
          updatedProposal.instructor_id,
          updatedProposal.level,
          updatedProposal.duration,
          slug,
        ]
      );
    }

    return c.json({ success: true, data: updatedProposal });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update course proposal');
  }
});

// ══════════════════════════════════════════════════════════════
// ENROLLMENTS
// ══════════════════════════════════════════════════════════════

// GET /admin/enrollments
admin.get('/enrollments', async (c) => {
  try {
    const { page, limit, offset } = pageParams(c, 50);
    const status = c.req.query('status');
    const enrollments = await M.getAllEnrollmentsPaginated(c.env, limit, offset, status);
    // NOTE: Express counted every enrollment regardless of the status filter.
    const total = await M.countEnrollments(c.env);
    return c.json({
      success: true,
      data: enrollments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load enrollments');
  }
});

// PATCH /admin/enrollments/:id
admin.patch('/enrollments/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await jsonBody(c);
    const status = body.status;

    if (!['active', 'completed', 'cancelled'].includes(status)) {
      return c.json({ success: false, error: 'Invalid status' }, 400);
    }

    const updated = await M.updateEnrollmentStatus(c.env, id, status);
    if (!updated) return c.json({ success: false, error: 'Enrollment not found' }, 404);

    return c.json({ success: true, data: updated });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update enrollment');
  }
});

// POST /admin/enrollments/export
admin.post('/enrollments/export', async (c) => {
  try {
    const body = await jsonBody(c);
    const { status, dateFrom, dateTo, format } = body;

    let sql = `SELECT e.id, u.name as student_name, u.email as student_email, c.title as course_title,
                      c.price, e.status, e.progress, e.enrolled_at, e.completed_at
               FROM enrollments e
               JOIN users u ON e.user_id = u.id
               JOIN courses c ON e.course_id = c.id
               WHERE 1=1`;
    const params: any[] = [];

    if (status) {
      params.push(status);
      sql += ` AND e.status = $${params.length}`;
    }
    if (dateFrom) {
      params.push(dateFrom);
      sql += ` AND e.enrolled_at >= $${params.length}`;
    }
    if (dateTo) {
      params.push(dateTo);
      sql += ` AND e.enrolled_at <= $${params.length}`;
    }

    sql += ' ORDER BY e.enrolled_at DESC';
    const { rows } = await getDb(c.env).query<any>(sql, params);

    if (format === 'csv') {
      const header = 'ID,Student Name,Student Email,Course Title,Price,Status,Progress,Enrolled At,Completed At';
      const csvRows = rows.map(
        (r: any) =>
          `"${r.id}","${r.student_name}","${r.student_email}","${r.course_title}","${r.price}","${r.status}","${r.progress}","${r.enrolled_at}","${r.completed_at || ''}"`
      );
      c.header('Content-Type', 'text/csv');
      c.header('Content-Disposition', 'attachment; filename=enrollments.csv');
      return c.body([header, ...csvRows].join('\n'));
    }

    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to export enrollments');
  }
});

// ══════════════════════════════════════════════════════════════
// SUSPEND / REACTIVATE USERS
// ══════════════════════════════════════════════════════════════

// PUT /admin/users/:id/suspend
admin.put('/users/:id/suspend', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const body = await jsonBody(c);
    const { rows } = await getDb(c.env).query<any>(
      `UPDATE users SET is_suspended = true, suspended_at = NOW(), suspended_reason = $1
       WHERE id = $2 RETURNING id, name, email, role, is_suspended`,
      [body.reason || null, id]
    );
    if (!rows[0]) return fail(c, 404, 'User not found');
    await logAudit(c.env, {
      adminId: session.userId,
      action: 'suspend',
      resourceType: 'user',
      resourceId: id,
      details: body.reason,
      ...AUDIT_META(c),
    });
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to suspend user');
  }
});

// PUT /admin/users/:id/reactivate
admin.put('/users/:id/reactivate', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const { rows } = await getDb(c.env).query<any>(
      `UPDATE users SET is_suspended = false, suspended_at = NULL, suspended_reason = NULL
       WHERE id = $1 RETURNING id, name, email, role, is_suspended`,
      [id]
    );
    if (!rows[0]) return fail(c, 404, 'User not found');
    await logAudit(c.env, { adminId: session.userId, action: 'reactivate', resourceType: 'user', resourceId: id, ...AUDIT_META(c) });
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to reactivate user');
  }
});

// ══════════════════════════════════════════════════════════════
// COURSE MODERATION
// ══════════════════════════════════════════════════════════════

// PUT /admin/courses/:id/review
admin.put('/courses/:id/review', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const body = await jsonBody(c);
    const status = body.status;
    const validStatuses = ['pending_review', 'approved', 'published', 'rejected', 'draft', 'archived'];
    if (!validStatuses.includes(status)) {
      return fail(c, 400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    const course = await M.updateCourseStatus(c.env, id, status, body.review_notes, session.userId);
    if (!course) return fail(c, 404, 'Course not found');
    await logAudit(c.env, {
      adminId: session.userId,
      action: 'review',
      resourceType: 'course',
      resourceId: id,
      details: `Status set to ${status}`,
      ...AUDIT_META(c),
    });
    return c.json({ success: true, data: course });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to review course');
  }
});

// PUT /admin/courses/:id/approve
admin.put('/courses/:id/approve', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const body = await jsonBody(c);
    const course = await M.updateCourseStatus(c.env, id, 'published', body.review_notes, session.userId);
    if (!course) return fail(c, 404, 'Course not found');
    await logAudit(c.env, { adminId: session.userId, action: 'approve', resourceType: 'course', resourceId: id, ...AUDIT_META(c) });
    return c.json({ success: true, data: course });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to approve course');
  }
});

// PUT /admin/courses/:id/reject
admin.put('/courses/:id/reject', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const body = await jsonBody(c);
    const course = await M.updateCourseStatus(c.env, id, 'rejected', body.review_notes || body.reason, session.userId);
    if (!course) return fail(c, 404, 'Course not found');
    await logAudit(c.env, { adminId: session.userId, action: 'reject', resourceType: 'course', resourceId: id, ...AUDIT_META(c) });
    return c.json({ success: true, data: course });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to reject course');
  }
});

// PUT /admin/courses/:id/archive
admin.put('/courses/:id/archive', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const body = await jsonBody(c);
    const course = await M.updateCourseStatus(c.env, id, 'archived', body.review_notes, session.userId);
    if (!course) return fail(c, 404, 'Course not found');
    await logAudit(c.env, { adminId: session.userId, action: 'archive', resourceType: 'course', resourceId: id, ...AUDIT_META(c) });
    return c.json({ success: true, data: course });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to archive course');
  }
});

// PUT /admin/courses/:id/feature
admin.put('/courses/:id/feature', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const db = getDb(c.env);
    const cur = await db.query<any>(`SELECT featured FROM courses WHERE id = $1`, [id]);
    const isFeatured = cur.rows[0]?.featured;
    const { rows } = await db.query<any>(
      `UPDATE courses SET featured = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [!isFeatured, id]
    );
    if (!rows[0]) return fail(c, 404, 'Course not found');
    await logAudit(c.env, {
      adminId: session.userId,
      action: isFeatured ? 'unfeature' : 'feature',
      resourceType: 'course',
      resourceId: id,
      ...AUDIT_META(c),
    });
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to toggle featured course');
  }
});

// ══════════════════════════════════════════════════════════════
// CERTIFICATES
// ══════════════════════════════════════════════════════════════

// GET /admin/certificates
admin.get('/certificates', async (c) => {
  try {
    const { page, limit, offset } = pageParams(c, 20);
    const data = await M.getAllCertificates(c.env, limit, offset);
    const total = await M.countCertificates(c.env);
    return c.json({
      success: true,
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load certificates');
  }
});

// PUT /admin/certificates/:id/revoke
admin.put('/certificates/:id/revoke', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const cert = await M.revokeCertificateById(c.env, id);
    if (!cert) return fail(c, 404, 'Certificate not found');
    await logAudit(c.env, { adminId: session.userId, action: 'revoke', resourceType: 'certificate', resourceId: id, ...AUDIT_META(c) });
    return c.json({ success: true, data: cert });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to revoke certificate');
  }
});

// PUT /admin/certificates/:id/reissue
admin.put('/certificates/:id/reissue', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const cert = await M.reissueCertificateById(c.env, id);
    if (!cert) return fail(c, 404, 'Certificate not found');
    await logAudit(c.env, { adminId: session.userId, action: 'reissue', resourceType: 'certificate', resourceId: id, ...AUDIT_META(c) });
    return c.json({ success: true, data: cert });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to reissue certificate');
  }
});

// ══════════════════════════════════════════════════════════════
// SUPPORT TICKETS
// ══════════════════════════════════════════════════════════════

// GET /admin/tickets
admin.get('/tickets', async (c) => {
  try {
    const { page, limit, offset } = pageParams(c, 20);
    const status = c.req.query('status');
    const db = getDb(c.env);

    let sql = `SELECT t.*, u.name as user_name, u.email as user_email, a.name as assigned_name
               FROM support_tickets t
               JOIN users u ON t.user_id = u.id
               LEFT JOIN users a ON t.assigned_to = a.id`;
    const params: any[] = [];

    if (status) {
      params.push(status);
      sql += ` WHERE t.status = $${params.length}`;
    }
    sql += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await db.query<any>(sql, params);
    const countRes = await db.query<any>(
      'SELECT COUNT(*) as count FROM support_tickets' + (status ? ` WHERE status = $1` : ''),
      status ? [status] : []
    );
    const total = intCount(countRes.rows[0]?.count);

    return c.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load tickets');
  }
});

// POST /admin/tickets/:id/reply
admin.post('/tickets/:id/reply', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const body = await jsonBody(c);
    const db = getDb(c.env);
    const { rows } = await db.query<any>(
      `INSERT INTO ticket_replies (ticket_id, admin_id, message) VALUES ($1, $2, $3) RETURNING *`,
      [id, session.userId, body.message]
    );
    await db.query(`UPDATE support_tickets SET status = 'in_progress', updated_at = NOW() WHERE id = $1`, [id]);
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to reply to ticket');
  }
});

// PUT /admin/tickets/:id/close
admin.put('/tickets/:id/close', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const { rows } = await getDb(c.env).query<any>(
      `UPDATE support_tickets SET status = 'closed', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    if (!rows[0]) return fail(c, 404, 'Ticket not found');
    await logAudit(c.env, { adminId: session.userId, action: 'close', resourceType: 'ticket', resourceId: id, ...AUDIT_META(c) });
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to close ticket');
  }
});

// PUT /admin/tickets/:id/reopen
admin.put('/tickets/:id/reopen', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const { rows } = await getDb(c.env).query<any>(
      `UPDATE support_tickets SET status = 'open', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    if (!rows[0]) return fail(c, 404, 'Ticket not found');
    await logAudit(c.env, { adminId: session.userId, action: 'reopen', resourceType: 'ticket', resourceId: id, ...AUDIT_META(c) });
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to reopen ticket');
  }
});

// PUT /admin/tickets/:id/assign
admin.put('/tickets/:id/assign', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const body = await jsonBody(c);
    const { rows } = await getDb(c.env).query<any>(
      `UPDATE support_tickets SET assigned_to = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [body.adminId, id]
    );
    if (!rows[0]) return fail(c, 404, 'Ticket not found');
    await logAudit(c.env, { adminId: session.userId, action: 'assign', resourceType: 'ticket', resourceId: id, ...AUDIT_META(c) });
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to assign ticket');
  }
});

// ══════════════════════════════════════════════════════════════
// BROADCAST NOTIFICATIONS
// ══════════════════════════════════════════════════════════════

// GET /admin/broadcasts
admin.get('/broadcasts', async (c) => {
  try {
    const { page, limit, offset } = pageParams(c, 20);
    const db = getDb(c.env);
    const { rows } = await db.query<any>(
      `SELECT * FROM broadcasts ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const countRes = await db.query<any>('SELECT COUNT(*) as count FROM broadcasts');
    const total = intCount(countRes.rows[0]?.count);
    return c.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load broadcasts');
  }
});

// POST /admin/broadcasts
admin.post('/broadcasts', async (c) => {
  try {
    const session = c.get('session');
    const body = await jsonBody(c);
    const { title, message, audience, type, scheduledAt } = body;
    const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();
    const status = isScheduled ? 'scheduled' : 'sent';
    const db = getDb(c.env);

    const { rows } = await db.query<any>(
      `INSERT INTO broadcasts (title, message, audience, type, status, scheduled_at, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        title,
        message,
        audience || 'all',
        type || 'info',
        status,
        isScheduled ? scheduledAt : null,
        isScheduled ? null : new Date(),
      ]
    );

    if (status === 'sent') {
      // One INSERT ... SELECT replaces the Express per-user notification loop
      // (and the socket.io emits, which have no Worker equivalent).
      let userSql = `INSERT INTO notifications (user_id, title, message, type) SELECT id, $1, $2, $3 FROM users WHERE 1=1`;
      const userParams: any[] = [title, message, type === 'warning' ? 'warning' : 'info'];
      let roleFilter = audience;
      if (audience === 'students') roleFilter = 'student';
      else if (audience === 'instructors') roleFilter = 'instructor';
      else if (audience === 'admins') roleFilter = 'admin';
      if (roleFilter !== 'all') {
        userParams.push(roleFilter);
        userSql += ` AND role = $${userParams.length}`;
      }
      await db.query(userSql, userParams);
    }

    await logAudit(c.env, {
      adminId: session.userId,
      action: 'broadcast',
      resourceType: 'broadcast',
      resourceId: rows[0].id,
      details: `Audience: ${audience}, Title: ${title}`,
      ...AUDIT_META(c),
    });
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to send broadcast');
  }
});

// DELETE /admin/broadcasts/:id
admin.delete('/broadcasts/:id', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const { rows } = await getDb(c.env).query<any>(`DELETE FROM broadcasts WHERE id = $1 RETURNING id`, [id]);
    if (!rows.length) return fail(c, 404, 'Broadcast not found');
    await logAudit(c.env, { adminId: session.userId, action: 'delete', resourceType: 'broadcast', resourceId: id, ...AUDIT_META(c) });
    return c.json({ success: true, message: 'Broadcast deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete broadcast');
  }
});

// ══════════════════════════════════════════════════════════════
// AUDIT LOGS
// ══════════════════════════════════════════════════════════════

// GET /admin/audit-logs
admin.get('/audit-logs', async (c) => {
  try {
    const { page, limit, offset } = pageParams(c, 20);
    const db = getDb(c.env);
    const { rows } = await db.query<any>(
      `SELECT al.*, u.name as admin_name
       FROM audit_logs al
       JOIN users u ON al.admin_id = u.id
       ORDER BY al.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const countRes = await db.query<any>('SELECT COUNT(*) as count FROM audit_logs');
    const total = intCount(countRes.rows[0]?.count);
    return c.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load audit logs');
  }
});

// ══════════════════════════════════════════════════════════════
// SYSTEM SETTINGS
// ══════════════════════════════════════════════════════════════

// GET /admin/settings
admin.get('/settings', async (c) => {
  try {
    const { rows } = await getDb(c.env).query<any>('SELECT * FROM system_settings ORDER BY category, key');
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load settings');
  }
});

// PUT /admin/settings
admin.put('/settings', async (c) => {
  try {
    const session = c.get('session');
    const body = await jsonBody(c);
    const { key, value, category } = body;
    if (!key || value === undefined) return fail(c, 400, 'key and value required');
    const db = getDb(c.env);

    // NOTE: system_settings has no updated_at column (Postgres or D1), so the
    // Express `updated_at=NOW()` clause is dropped — otherwise every write 500s.
    if (key === 'platform_currency') {
      const upper = String(value).toUpperCase();
      if (!isSupportedCurrency(upper)) {
        return fail(c, 400, `Invalid currency. Allowed: ${Object.keys(SUPPORTED_CURRENCIES).join(', ')}`);
      }
      const info = SUPPORTED_CURRENCIES[upper];
      await db.query(
        `INSERT INTO system_settings (key, value, category) VALUES ('platform_currency_locale', $1, 'payments')
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [info.locale]
      );
      await db.query(
        `INSERT INTO system_settings (key, value, category) VALUES ('platform_currency_symbol', $1, 'payments')
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [info.symbol]
      );
      const cat2 = category || 'payments';
      const { rows } = await db.query<any>(
        `INSERT INTO system_settings (key, value, category) VALUES ($1, $2, $3)
         ON CONFLICT (key) DO UPDATE SET value = $2, category = COALESCE($3, system_settings.category)
         RETURNING *`,
        [key, upper, cat2]
      );
      await logAudit(c.env, {
        adminId: session.userId,
        action: 'update_setting',
        resourceType: 'system_setting',
        resourceId: key,
        details: `${key}=${upper}`,
        ...AUDIT_META(c),
      });
      return c.json({ success: true, data: rows[0] });
    }

    const cat = category || 'general';
    const { rows } = await db.query<any>(
      `INSERT INTO system_settings (key, value, category) VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value = $2, category = COALESCE($3, system_settings.category)
       RETURNING *`,
      [key, String(value), cat]
    );
    await logAudit(c.env, {
      adminId: session.userId,
      action: 'update_setting',
      resourceType: 'system_setting',
      resourceId: key,
      details: `${key}=${String(value).slice(0, 100)}`,
      ...AUDIT_META(c),
    });
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update setting');
  }
});

// ══════════════════════════════════════════════════════════════
// CATEGORIES
// ══════════════════════════════════════════════════════════════

// GET /admin/categories
admin.get('/categories', async (c) => {
  try {
    const data = await M.getAllCategories(c.env);
    const total = await M.countCategories(c.env);
    return c.json({ success: true, data, pagination: { total } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load categories');
  }
});

// POST /admin/categories
admin.post('/categories', async (c) => {
  try {
    const session = c.get('session');
    const body = await jsonBody(c);
    const { name, slug, description, icon, color, parent_id, sort_order } = body;
    if (!name || !slug) return fail(c, 400, 'Name and slug are required');
    const data = await M.createCategory(c.env, { name, slug, description, icon, color, parent_id, sort_order });
    await logAudit(c.env, {
      adminId: session.userId,
      action: 'create',
      resourceType: 'category',
      resourceId: data.id,
      ...AUDIT_META(c),
    });
    return c.json({ success: true, data });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create category');
  }
});

// PUT /admin/categories/:id
admin.put('/categories/:id', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const body = await jsonBody(c);
    const data = await M.updateCategory(c.env, id, body);
    if (!data) return fail(c, 404, 'Category not found');
    await logAudit(c.env, { adminId: session.userId, action: 'update', resourceType: 'category', resourceId: id, ...AUDIT_META(c) });
    return c.json({ success: true, data });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update category');
  }
});

// DELETE /admin/categories/:id
admin.delete('/categories/:id', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const deleted = await M.deleteCategory(c.env, id);
    if (!deleted) return fail(c, 404, 'Category not found');
    await logAudit(c.env, { adminId: session.userId, action: 'delete', resourceType: 'category', resourceId: id, ...AUDIT_META(c) });
    return c.json({ success: true, message: 'Category deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete category');
  }
});

// ══════════════════════════════════════════════════════════════
// PASSWORD RESET / REFUNDS
// ══════════════════════════════════════════════════════════════

// POST /admin/users/:id/reset-password
admin.post('/users/:id/reset-password', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const tempPassword = randomToken(4);
    const hashedPassword = await hashPassword(c.env, tempPassword);
    const user = await M.updateUser(c.env, id, { password: hashedPassword });
    if (!user) return fail(c, 404, 'User not found');
    await logAudit(c.env, { adminId: session.userId, action: 'reset_password', resourceType: 'user', resourceId: id, ...AUDIT_META(c) });
    return c.json({ success: true, message: 'Password reset successfully', data: { tempPassword } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to reset password');
  }
});

// POST /admin/payments/:id/refund
admin.post('/payments/:id/refund', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const { rows } = await getDb(c.env).query<any>(
      `UPDATE payments SET status = 'refunded' WHERE id = $1 RETURNING *`,
      [id]
    );
    if (!rows[0]) return fail(c, 404, 'Payment not found');
    await logAudit(c.env, { adminId: session.userId, action: 'refund', resourceType: 'payment', resourceId: id, ...AUDIT_META(c) });
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to refund payment');
  }
});

// ══════════════════════════════════════════════════════════════
// CERTIFICATE TEMPLATES
// ══════════════════════════════════════════════════════════════

// GET /admin/certificate-templates
admin.get('/certificate-templates', async (c) => {
  try {
    return c.json({ success: true, data: await M.getAllTemplates(c.env) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load certificate templates');
  }
});

// POST /admin/certificate-templates
admin.post('/certificate-templates', async (c) => {
  try {
    const session = c.get('session');
    const body = await jsonBody(c);
    const template = await M.createTemplate(c.env, body);
    await logAudit(c.env, {
      adminId: session.userId,
      action: 'create',
      resourceType: 'certificate_template',
      resourceId: template.id,
      ...AUDIT_META(c),
    });
    return c.json({ success: true, data: template }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create certificate template');
  }
});

// PUT /admin/certificate-templates/:id
admin.put('/certificate-templates/:id', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const body = await jsonBody(c);
    const template = await M.updateTemplate(c.env, id, body);
    if (!template) return fail(c, 404, 'Template not found');
    await logAudit(c.env, {
      adminId: session.userId,
      action: 'update',
      resourceType: 'certificate_template',
      resourceId: id,
      ...AUDIT_META(c),
    });
    return c.json({ success: true, data: template });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update certificate template');
  }
});

// DELETE /admin/certificate-templates/:id
admin.delete('/certificate-templates/:id', async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const deleted = await M.deleteTemplate(c.env, id);
    if (!deleted) return fail(c, 404, 'Template not found');
    await logAudit(c.env, {
      adminId: session.userId,
      action: 'delete',
      resourceType: 'certificate_template',
      resourceId: id,
      ...AUDIT_META(c),
    });
    return c.json({ success: true, message: 'Template deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete certificate template');
  }
});

// ── Uploads (R2) ──────────────────────────────────────────────────────────
// The Express app used multer; here we accept multipart/form-data (or a JSON
// base64 body) and store the object in the R2 media bucket.
async function storeUpload(env: Env, file: File, folder: string): Promise<string> {
  if (!env.R2) throw Object.assign(new Error('R2 is not configured'), { statusCode: 503 });
  const safe = (file.name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safe}`;
  await env.R2.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });
  return `${(env.R2_PUBLIC_URL || '').replace(/\/$/, '')}/${key}`;
}

async function readUpload(c: any): Promise<File | null> {
  const type = c.req.header('content-type') || '';
  if (type.includes('application/json')) {
    const body: any = await c.req.json().catch(() => ({}));
    if (!body.data) return null;
    const bytes = Uint8Array.from(atob(String(body.data)), (ch) => ch.charCodeAt(0));
    return new File([bytes], body.fileName || body.name || 'upload', { type: body.contentType || 'application/octet-stream' });
  }
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file') || form?.get('image') || form?.get('stamp') || form?.get('signature') || form?.get('logo');
  return file instanceof File ? file : null;
}

async function uploadTemplateImage(c: any, column: 'stamp_url' | 'signature_url' | 'logo_url') {
  try {
    const file = await readUpload(c);
    if (!file) return fail(c, 400, 'No file uploaded');
    const url = await storeUpload(c.env, file, 'certificates');
    const { rows } = await getDb(c.env).query<any>(
      `UPDATE certificate_templates SET ${column} = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [url, c.req.param('id')]
    );
    if (!rows.length) return fail(c, 404, 'Template not found');
    return c.json({ success: true, data: { url, template: rows[0] } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Upload failed');
  }
}

admin.post('/certificate-templates/:id/upload-stamp', (c) => uploadTemplateImage(c, 'stamp_url'));
admin.post('/certificate-templates/:id/upload-signature', (c) => uploadTemplateImage(c, 'signature_url'));
admin.post('/certificate-templates/:id/upload-logo', (c) => uploadTemplateImage(c, 'logo_url'));

admin.post('/settings/upload-branding', async (c) => {
  try {
    const file = await readUpload(c);
    if (!file) return fail(c, 400, 'No file uploaded');
    const url = await storeUpload(c.env, file, 'branding');
    return c.json({ success: true, data: { url } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Upload failed');
  }
});

// ══════════════════════════════════════════════════════════════
// SUPER ADMIN ONLY
// ══════════════════════════════════════════════════════════════

// GET /admin/admins
admin.get('/admins', async (c) => {
  try {
    const session = c.get('session');
    if (!isSuperAdmin(session)) return forbidden(c);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT id, name, email, role, avatar, created_at, last_login, allowed_dashboards,
         (SELECT COUNT(*) FROM courses WHERE instructor_id = u.id)::int as course_count
       FROM users u
       WHERE role IN ('admin', 'super_admin')
       ORDER BY role DESC, created_at ASC`
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load admins');
  }
});

// PUT /admin/users/:id/promote-admin
admin.put('/users/:id/promote-admin', async (c) => {
  try {
    const session = c.get('session');
    if (!isSuperAdmin(session)) return forbidden(c);
    const id = c.req.param('id');
    const db = getDb(c.env);
    const isNumeric = /^\d+$/.test(id);
    const target = await db.query<any>(
      isNumeric ? `SELECT id, role FROM users WHERE id = $1` : `SELECT id, role FROM users WHERE email = $1`,
      [id]
    );
    if (target.rows.length === 0) return fail(c, 404, 'User not found');
    if (target.rows[0].role === 'super_admin') return fail(c, 400, 'Cannot promote a super_admin');
    if (target.rows[0].role === 'admin') return fail(c, 400, 'User is already an admin');

    await db.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [id]);
    await logAudit(c.env, { adminId: session.userId, action: 'promote_admin', resourceType: 'user', resourceId: id, ...AUDIT_META(c) });
    return c.json({ success: true, message: 'User promoted to admin' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to promote user');
  }
});

// PUT /admin/users/:id/demote-admin
admin.put('/users/:id/demote-admin', async (c) => {
  try {
    const session = c.get('session');
    if (!isSuperAdmin(session)) return forbidden(c);
    const id = c.req.param('id');
    const db = getDb(c.env);
    const target = await db.query<any>(`SELECT id, role FROM users WHERE id = $1`, [id]);
    if (target.rows.length === 0) return fail(c, 404, 'User not found');
    if (target.rows[0].role !== 'admin') return fail(c, 400, 'User is not an admin');
    if (String(parseInt(id, 10)) === String(session.userId)) return fail(c, 400, 'Cannot demote yourself');

    await db.query(`UPDATE users SET role = 'student' WHERE id = $1`, [id]);
    await logAudit(c.env, { adminId: session.userId, action: 'demote_admin', resourceType: 'user', resourceId: id, ...AUDIT_META(c) });
    return c.json({ success: true, message: 'Admin demoted to student' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to demote admin');
  }
});

// ── RBAC per-user dashboard permissions (super_admin) ─────────────────────
const ALLOWED_DASHBOARDS = [
  '/admin/dashboard',
  '/admin/users',
  '/admin/courses',
  '/admin/categories',
  '/admin/course-proposals',
  '/admin/applications',
  '/admin/payments',
  '/admin/exams',
  '/admin/exams/monitor',
  '/admin/certificates',
  '/admin/certificate-templates',
  '/admin/calendar',
  '/admin/tickets',
  '/admin/broadcasts',
  '/admin/messages',
  '/admin/community-management',
  '/admin/reports',
  '/admin/analytics',
  '/admin/settings',
  '/admin/payouts',
  '/admin/audit-log',
];

// GET /admin/users/:id/permissions
admin.get('/users/:id/permissions', async (c) => {
  try {
    const session = c.get('session');
    if (!isSuperAdmin(session)) return forbidden(c);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT id, name, email, role, allowed_dashboards FROM users WHERE id = $1`,
      [c.req.param('id')]
    );
    if (!rows[0]) return fail(c, 404, 'User not found');
    return c.json({
      success: true,
      data: { allowed_dashboards: rows[0].allowed_dashboards, allowedOptions: ALLOWED_DASHBOARDS },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load permissions');
  }
});

// PUT /admin/users/:id/permissions
admin.put('/users/:id/permissions', async (c) => {
  try {
    const session = c.get('session');
    if (!isSuperAdmin(session)) return forbidden(c);
    const id = c.req.param('id');
    const body = await jsonBody(c);
    const allowed_dashboards = body.allowed_dashboards;

    if (allowed_dashboards !== null && allowed_dashboards !== undefined) {
      if (!Array.isArray(allowed_dashboards)) return fail(c, 400, 'allowed_dashboards must be array or null');
      const invalid = allowed_dashboards.filter((p: string) => !ALLOWED_DASHBOARDS.includes(p));
      if (invalid.length) return fail(c, 400, `Invalid dashboards: ${invalid.join(', ')}`);
    }

    const db = getDb(c.env);
    const target = await db.query<any>(`SELECT id, role FROM users WHERE id = $1`, [id]);
    if (target.rows.length === 0) return fail(c, 404, 'User not found');

    const val = allowed_dashboards === null ? null : allowed_dashboards;
    const { rows } = await db.query<any>(
      `UPDATE users SET allowed_dashboards = $1, updated_at = NOW() WHERE id = $2 RETURNING id, allowed_dashboards`,
      [val, id]
    );
    await logAudit(c.env, {
      adminId: session.userId,
      action: 'update_permissions',
      resourceType: 'user',
      resourceId: id,
      details: `allowed_dashboards=${JSON.stringify(val)}`,
      ...AUDIT_META(c),
    });
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update permissions');
  }
});

// ══════════════════════════════════════════════════════════════
// CALENDAR
// ══════════════════════════════════════════════════════════════

// GET /admin/calendar
admin.get('/calendar', async (c) => {
  try {
    const db = getDb(c.env);
    const [assignmentsRes, liveClassesRes, quizzesRes, examsRes, certificatesRes] = await Promise.all([
      db.query<any>(
        `SELECT a.id, a.title, a.due_date as date, c.title as course_title, 'assignment' as type
         FROM assignments a
         JOIN courses c ON c.id = a.course_id
         WHERE a.due_date >= NOW()
         ORDER BY a.due_date ASC
         LIMIT 50`
      ),
      db.query<any>(
        `SELECT lc.id, lc.title, lc.scheduled_at as date, c.title as course_title, 'live-class' as type
         FROM live_classes lc
         JOIN courses c ON c.id = lc.course_id
         WHERE lc.scheduled_at >= NOW()
         ORDER BY lc.scheduled_at ASC
         LIMIT 50`
      ),
      db.query<any>(
        `SELECT q.id, q.title, q.due_date as date, c.title as course_title, 'quiz' as type
         FROM quizzes q
         JOIN courses c ON c.id = q.course_id
         WHERE q.due_date IS NOT NULL AND q.due_date >= NOW()
         ORDER BY q.due_date ASC
         LIMIT 50`
      ),
      db.query<any>(
        `SELECT e.id, e.title, e.starts_at as date, c.title as course_title, 'exam' as type
         FROM exams e
         JOIN courses c ON c.id = e.course_id
         WHERE e.starts_at >= NOW() AND e.is_published = true
         ORDER BY e.starts_at ASC
         LIMIT 50`
      ),
      db.query<any>(
        `SELECT c.id, co.title || ' Certificate' as title, c.issued_at as date, co.title as course_title, 'certificate' as type
         FROM certificates c
         JOIN courses co ON co.id = c.course_id
         WHERE c.issued_at >= NOW() - INTERVAL '30 days'
         ORDER BY c.issued_at DESC
         LIMIT 50`
      ),
    ]);

    const withTime = (rows: any[]) =>
      rows.map((r: any) => ({
        ...r,
        time: new Date(r.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      }));

    const events = [
      ...withTime(assignmentsRes.rows),
      ...withTime(liveClassesRes.rows),
      ...withTime(quizzesRes.rows),
      ...withTime(examsRes.rows),
      ...withTime(certificatesRes.rows),
    ].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return c.json({ success: true, data: events });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load calendar');
  }
});

// ══════════════════════════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════════════════════════

admin.get('/analytics/overview', async (c) => {
  try {
    return c.json({ success: true, data: await A.getOverview(c.env, c.req.query('range') || '7d') });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load analytics overview');
  }
});

admin.get('/analytics/visitors', async (c) => {
  try {
    return c.json({ success: true, data: await A.getVisitorTrend(c.env, c.req.query('range') || '7d') });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load visitor analytics');
  }
});

admin.get('/analytics/pages', async (c) => {
  try {
    return c.json({ success: true, data: await A.getPageAnalytics(c.env, c.req.query('range') || '7d') });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load page analytics');
  }
});

admin.get('/analytics/devices', async (c) => {
  try {
    return c.json({ success: true, data: await A.getDeviceAnalytics(c.env, c.req.query('range') || '7d') });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load device analytics');
  }
});

admin.get('/analytics/sources', async (c) => {
  try {
    return c.json({ success: true, data: await A.getSourceAnalytics(c.env, c.req.query('range') || '7d') });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load source analytics');
  }
});

admin.get('/analytics/conversions', async (c) => {
  try {
    return c.json({ success: true, data: await A.getConversionFunnel(c.env, c.req.query('range') || '7d') });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load conversion analytics');
  }
});

admin.get('/analytics/journeys', async (c) => {
  try {
    return c.json({ success: true, data: await A.getJourneyAnalytics(c.env, c.req.query('range') || '7d') });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load journey analytics');
  }
});

admin.get('/analytics/courses', async (c) => {
  try {
    return c.json({ success: true, data: await A.getCourseAnalytics(c.env, c.req.query('range') || '7d') });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load course analytics');
  }
});

admin.get('/analytics/clicks', async (c) => {
  try {
    return c.json({ success: true, data: await A.getClickAnalytics(c.env, c.req.query('range') || '7d') });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load click analytics');
  }
});

admin.get('/analytics/realtime', async (c) => {
  try {
    return c.json({ success: true, data: await A.getRealtimeStats(c.env) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load realtime analytics');
  }
});

admin.get('/analytics/summary', async (c) => {
  try {
    return c.json({ success: true, data: await A.getDashboardSummary(c.env) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load analytics summary');
  }
});

export default admin;
