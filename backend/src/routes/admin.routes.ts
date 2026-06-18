import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import * as UserModel from '../models/user';
import * as CourseModel from '../models/course';
import * as CategoryModel from '../models/category';
import * as EnrollmentModel from '../models/enrollment';
import * as PaymentModel from '../models/payment';
import * as NotificationModel from '../models/notification';
import * as CertificateModel from '../models/certificate';
import * as CertificateTemplateModel from '../models/certificateTemplate';
import { query } from '../config/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendInstructorApprovalEmail, sendInstructorUpgradeEmail } from '../utils/helpers';
import { logAudit } from '../middleware/audit';
import { io, emitDashboardUpdate } from '../config/socket';
import { uploadSingle } from '../middleware/upload';

const router = Router();

// All admin routes require admin role
router.use(authenticate, authorize('admin', 'super_admin'));

// GET /admin/dashboard
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const range = (req.query.range as string) || '6m';
    const intervalMap: Record<string, string> = { '7d': '7 days', '30d': '30 days', '6m': '6 months', '1y': '1 year' };
    const chartInterval = range === '7d' || range === '30d' ? 'day' : 'month';
    const dateTrunc = chartInterval === 'day' ? 'DATE' : "DATE_TRUNC('month', created_at)::date";
    const labelExpr = chartInterval === 'day' ? "to_char(created_at, 'Mon DD')" : "to_char(DATE_TRUNC('month', created_at), 'Mon YYYY')";
    const enrollLabel = chartInterval === 'day' ? "to_char(enrolled_at, 'Mon DD')" : "to_char(DATE_TRUNC('month', enrolled_at), 'Mon YYYY')";
    const enrollTrunc = chartInterval === 'day' ? 'DATE(enrolled_at)' : "DATE_TRUNC('month', enrolled_at)::date";
    const userLabel = "to_char(created_at, 'Mon DD')";

    const totalStudents = await UserModel.countUsers('student');
    const totalInstructors = await UserModel.countUsers('instructor');
    const totalCourses = await CourseModel.countCourses();
    const publishedCourses = await CourseModel.countCourses(true);
    const totalEnrollments = await EnrollmentModel.countEnrollments();
    const revenueStats = await CourseModel.getRevenueStats();

    const [pendingApps, draftC, activeUsers, certsIssued] = await Promise.all([
      query(`SELECT COUNT(*) FROM instructor_applications WHERE status = 'pending'`),
      query(`SELECT COUNT(*) FROM courses WHERE published = false`),
      query(`SELECT COUNT(*) FROM users WHERE is_suspended = false OR is_suspended IS NULL`),
      query(`SELECT COUNT(*) FROM certificates`),
    ]);

    const intervalStr = intervalMap[range] || '6 months';
    const [enrollTrend, userRegTrend, topC, recentAct, revenueTrend, refundTrend, prevStats] = await Promise.all([
      query(`SELECT ${enrollTrunc} as date, ${enrollLabel} as label, COUNT(*) as enrollments FROM enrollments WHERE enrolled_at > NOW() - INTERVAL '${intervalStr}' GROUP BY date, label ORDER BY date`),
      query(`SELECT DATE(created_at) as date, ${userLabel} as label, COUNT(*) as users FROM users WHERE created_at > NOW() - INTERVAL '${intervalStr}' GROUP BY date, label ORDER BY date`),
      query(`SELECT c.title, c.slug, COUNT(e.id) as enrollments FROM courses c LEFT JOIN enrollments e ON c.id = e.course_id GROUP BY c.id, c.title, c.slug ORDER BY enrollments DESC LIMIT 5`),
      query(`SELECT al.*, u.name as admin_name FROM audit_logs al JOIN users u ON al.admin_id = u.id ORDER BY al.created_at DESC LIMIT 10`),
      query(`SELECT ${dateTrunc} as date, ${labelExpr} as label, COALESCE(SUM(amount), 0) as revenue, COUNT(*) as transactions FROM payments WHERE status = 'completed' AND created_at > NOW() - INTERVAL '${intervalStr}' GROUP BY date, label ORDER BY date`),
      query(`SELECT ${dateTrunc} as date, ${labelExpr} as label, COALESCE(SUM(amount), 0) as refunds FROM payments WHERE status = 'refunded' AND created_at > NOW() - INTERVAL '${intervalStr}' GROUP BY date, label ORDER BY date`),
      query(`SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'student' AND created_at < NOW() - INTERVAL '${intervalStr}') as prev_students,
        (SELECT COUNT(*) FROM users WHERE role = 'instructor' AND created_at < NOW() - INTERVAL '${intervalStr}') as prev_instructors,
        (SELECT COUNT(*) FROM enrollments WHERE enrolled_at < NOW() - INTERVAL '${intervalStr}') as prev_enrollments,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND created_at < NOW() - INTERVAL '${intervalStr}') as prev_revenue
      `),
    ]);

    const recentUsers = await UserModel.getAllUsers(10, 0);
    const recentPayments = await PaymentModel.getAllPayments(10, 0);

    const prev = prevStats.rows[0];

    const calcTrend = (current: number, previous: number): number => {
      if (!previous) return 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    res.json({
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
          pendingApplications: parseInt(pendingApps.rows[0].count, 10),
          draftCourses: parseInt(draftC.rows[0].count, 10),
          activeUsers: parseInt(activeUsers.rows[0].count, 10),
          certificatesIssued: parseInt(certsIssued.rows[0].count, 10),
          monthlyRevenue: revenueStats.total_revenue,
          trends: {
            totalStudents: calcTrend(totalStudents, parseInt(prev.prev_students || '0')),
            totalInstructors: calcTrend(totalInstructors, parseInt(prev.prev_instructors || '0')),
            totalEnrollments: calcTrend(totalEnrollments, parseInt(prev.prev_enrollments || '0')),
            totalRevenue: calcTrend(revenueStats.total_revenue, parseFloat(prev.prev_revenue || '0')),
          },
        },
        recentUsers,
        recentPayments,
        monthlyRevenue: revenueTrend.rows,
        refundTrend: refundTrend.rows,
        enrollmentTrend: enrollTrend.rows,
        userRegistrationTrend: userRegTrend.rows,
        topCourses: topC.rows,
        recentActivities: recentAct.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /admin/users
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const role = req.query.role as string | undefined;
    const search = req.query.search as string | undefined;

    let sql = 'SELECT id, name, email, role, avatar, bio, is_verified, is_suspended, created_at FROM users WHERE 1=1';
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

    const { rows } = await query(sql, params);
    const { rows: countRows } = await query('SELECT COUNT(*) FROM users', []);
    const total = parseInt(countRows[0].count, 10);

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /admin/users/:id/role
router.put('/users/:id/role', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const adminId = req.user!.userId;

    if (!['student', 'instructor', 'admin', 'super_admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await UserModel.updateUser(id, { role });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await NotificationModel.createNotification({
      user_id: id,
      title: 'Role Updated',
      message: `Your role has been updated to ${role}`,
      type: 'info',
    });
    io.to(id).emit('new_notification', { title: 'Role Updated', message: `Your role has been updated to ${role}`, type: 'info' });

    await logAudit({ adminId: adminId, action: 'update_role', resourceType: 'user', resourceId: id, details: `Role changed to ${role}`, ipAddress: req.ip });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// DELETE /admin/users/:id
router.delete('/users/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const adminId = req.user!.userId;

    if (id === adminId) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }

    const deleted = await UserModel.deleteUser(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await logAudit({ adminId, action: 'delete', resourceType: 'user', resourceId: id, ipAddress: req.ip });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /admin/courses
router.get('/courses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const courses = await CourseModel.getAllCourses(limit, offset, status ? { status } : undefined);
    const total = status
      ? (await query('SELECT COUNT(*) FROM courses WHERE status = $1', [status])).rows[0].count
      : (await query('SELECT COUNT(*) FROM courses')).rows[0].count;

    res.json({
      success: true,
      data: courses,
      pagination: { page, limit, total: parseInt(total, 10), pages: Math.ceil(parseInt(total, 10) / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /admin/courses/:id
router.delete('/courses/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const deleted = await CourseModel.deleteCourse(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    await logAudit({ adminId: req.user!.userId, action: 'delete', resourceType: 'course', resourceId: id, ipAddress: req.ip });
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /admin/payments
router.get('/payments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const payments = await PaymentModel.getAllPayments(limit, offset);
    const countRes = await query('SELECT COUNT(*) FROM payments');
    const total = parseInt(countRes.rows[0].count, 10);

    res.json({
      success: true,
      data: payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /admin/revenue
router.get('/revenue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const revenueStats = await CourseModel.getRevenueStats();

    // Revenue by month
    const monthlyRevenue = await query(
      `SELECT
         DATE_TRUNC('month', created_at)::date as month,
         COALESCE(SUM(amount), 0) as revenue,
         COUNT(*) as transactions
       FROM payments
       WHERE status = 'completed'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month DESC
       LIMIT 12`
    );

    // Revenue by course
    const revenueByCourse = await query(
      `SELECT
         c.id, c.title, c.slug,
         COUNT(p.id) as enrollments,
         COALESCE(SUM(p.amount), 0) as revenue
       FROM courses c
       LEFT JOIN payments p ON c.id = p.course_id AND p.status = 'completed'
       GROUP BY c.id, c.title, c.slug
       ORDER BY revenue DESC
       LIMIT 20`
    );

    // Revenue by provider
    const revenueByProvider = await query(
      `SELECT
         provider,
         COUNT(*) as transactions,
         COALESCE(SUM(amount), 0) as revenue
       FROM payments
       WHERE status = 'completed'
       GROUP BY provider`
    );

    res.json({
      success: true,
      data: {
        summary: revenueStats,
        monthly: monthlyRevenue.rows,
        byCourse: revenueByCourse.rows,
        byProvider: revenueByProvider.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /admin/applications
router.get('/applications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    let queryStr = `SELECT * FROM instructor_applications`;
    let countStr = `SELECT COUNT(*) FROM instructor_applications`;
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

    const { rows } = await query(queryStr, queryParams);
    const countRes = await query(countStr, countParams);
    const total = parseInt(countRes.rows[0].count, 10);

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /admin/applications/:id/approve
router.put('/applications/:id/approve', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    req.body.status = 'approved';
    req.body.notes = req.body.notes || req.body.review_notes;
    next();
  } catch (error) { next(error); }
}, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { notes, review_notes } = req.body;
    const adminId = req.user!.userId;

    const oldAppResult = await query(`SELECT status FROM instructor_applications WHERE id = $1`, [id]);
    if (oldAppResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    const oldStatus = oldAppResult.rows[0].status;

    const { rows } = await query(
      `UPDATE instructor_applications
       SET status = 'approved', notes = COALESCE($1, notes), review_notes = COALESCE($2, review_notes),
           reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [notes, review_notes, adminId, id]
    );

    const application = rows[0];
    const email = application.email;
    const name = application.full_name;

    const existingUser = await UserModel.getUserByEmail(email);
    if (existingUser) {
      await UserModel.updateUser(existingUser.id, { role: 'instructor' });
      await NotificationModel.createNotification({ user_id: existingUser.id, title: 'Application Approved', message: 'Your instructor application has been approved!', type: 'success' });
      await sendInstructorUpgradeEmail(email, name);
    } else {
      const tempPassword = crypto.randomBytes(4).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 12);
      const newUser = await UserModel.createUser({ name, email, password: hashedPassword, role: 'instructor' });
      await UserModel.updateUser(newUser.id, { is_verified: true });
      await NotificationModel.createNotification({ user_id: newUser.id, title: 'Welcome Instructor', message: 'Your instructor application has been approved!', type: 'success' });
      await sendInstructorApprovalEmail(email, name, tempPassword);
    }

    await logAudit({ adminId: req.user!.userId, action: 'approve', resourceType: 'application', resourceId: id, ipAddress: req.ip });
    emitDashboardUpdate();
    res.json({ success: true, message: 'Application approved', data: application });
  } catch (error) { next(error); }
});

// PUT /admin/applications/:id/reject
router.put('/applications/:id/reject', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user!.userId;
    const { rows } = await query(
      `UPDATE instructor_applications SET status = 'rejected', notes = COALESCE($1, notes), reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW() WHERE id = $3 RETURNING *`,
      [notes, adminId, id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Application not found' });
    await logAudit({ adminId, action: 'reject', resourceType: 'application', resourceId: id, ipAddress: req.ip });
    emitDashboardUpdate();
    res.json({ success: true, message: 'Application rejected', data: rows[0] });
  } catch (error) { next(error); }
});

// PUT /admin/applications/:id
router.put('/applications/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, notes, review_notes } = req.body;
    const adminId = (req as AuthRequest).user!.userId;

    const oldAppResult = await query(`SELECT status FROM instructor_applications WHERE id = $1`, [id]);
    if (oldAppResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    const oldStatus = oldAppResult.rows[0].status;

    const { rows } = await query(
      `UPDATE instructor_applications 
       SET status = COALESCE($1, status), 
           notes = COALESCE($2, notes),
           review_notes = COALESCE($3, review_notes),
           reviewed_by = $4,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $5 
       RETURNING *`,
      [status, notes, review_notes, adminId, id]
    );

    const application = rows[0];

    // Work flow for approved status
    if (status === 'approved' && oldStatus !== 'approved') {
      const email = application.email;
      const name = application.full_name;

      const existingUser = await UserModel.getUserByEmail(email);
      if (existingUser) {
        // Upgrade existing user
        await UserModel.updateUser(existingUser.id, { role: 'instructor' });
        await NotificationModel.createNotification({
          user_id: existingUser.id, 
          title: 'Application Approved', 
          message: 'Your instructor application has been approved! Your account is now an Instructor account.', 
          type: 'success'
        });
        await sendInstructorUpgradeEmail(email, name);
      } else {
        // Create new user
        const tempPassword = crypto.randomBytes(4).toString('hex');
        const hashedPassword = await bcrypt.hash(tempPassword, 12);
        
        const newUser = await UserModel.createUser({
          name,
          email,
          password: hashedPassword,
          role: 'instructor'
        });
        await UserModel.updateUser(newUser.id, { is_verified: true });
        await NotificationModel.createNotification({
          user_id: newUser.id, 
          title: 'Welcome Instructor', 
          message: 'Your instructor application has been approved! Welcome to CareerCode Academy.', 
          type: 'success'
        });
        await sendInstructorApprovalEmail(email, name, tempPassword);
      }
    }

    res.json({
      success: true,
      message: 'Application updated successfully',
      data: application,
    });
  } catch (error) {
    next(error);
  }
});
// ----------------------------------------------------------------------
// COURSE PROPOSALS
// ----------------------------------------------------------------------
router.get('/course-proposals', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { rows } = await query(`
      SELECT cp.*, u.name as instructor_name, u.email as instructor_email
      FROM course_proposals cp
      JOIN users u ON cp.instructor_id = u.id
      ORDER BY cp.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countRes = await query('SELECT COUNT(*) FROM course_proposals');
    const total = parseInt(countRes.rows[0].count, 10);

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

router.put('/course-proposals/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, notes, review_notes } = req.body;
    const adminId = req.user!.userId;

    const oldProposal = await query('SELECT * FROM course_proposals WHERE id = $1', [id]);
    if (oldProposal.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }
    const proposal = oldProposal.rows[0];

    const { rows } = await query(`
      UPDATE course_proposals 
      SET status = COALESCE($1, status),
          notes = COALESCE($2, notes),
          review_notes = COALESCE($3, review_notes),
          reviewed_by = $4,
          reviewed_at = NOW(),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [status, notes, review_notes, adminId, id]);

    const updatedProposal = rows[0];

    // If approved and wasn't previously approved, create the draft course
    if (status === 'approved' && proposal.status !== 'approved') {
      const slug = updatedProposal.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + crypto.randomBytes(4).toString('hex');
      
      await query(`
        INSERT INTO courses (
          title, description, thumbnail, price, category, instructor_id, level, duration, slug, published
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)
      `, [
        updatedProposal.title,
        updatedProposal.description,
        updatedProposal.thumbnail_url,
        updatedProposal.recommended_price,
        updatedProposal.category,
        updatedProposal.instructor_id,
        updatedProposal.level,
        updatedProposal.duration,
        slug
      ]);
    }

    res.json({ success: true, data: updatedProposal });
  } catch (error) {
    next(error);
  }
});

// GET /admin/enrollments - list all enrollments
router.get('/enrollments', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    const enrollments = await EnrollmentModel.getAllEnrollmentsPaginated(limit, offset, status);
    const total = await EnrollmentModel.countEnrollments();

    res.json({
      success: true,
      data: enrollments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /admin/enrollments/:id - update enrollment (cancel/refund)
router.patch('/enrollments/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const updated = await EnrollmentModel.updateEnrollmentStatus(id, status);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Enrollment not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// POST /admin/enrollments/export - export enrollment data
router.post('/enrollments/export', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, dateFrom, dateTo, format } = req.body;
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
    const { rows } = await query(sql, params);

    if (format === 'csv') {
      const header = 'ID,Student Name,Student Email,Course Title,Price,Status,Progress,Enrolled At,Completed At';
      const csvRows = rows.map(r =>
        `"${r.id}","${r.student_name}","${r.student_email}","${r.course_title}","${r.price}","${r.status}","${r.progress}","${r.enrolled_at}","${r.completed_at || ''}"`
      );
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=enrollments.csv');
      return res.send([header, ...csvRows].join('\n'));
    }

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// ══════════════════════════════════════════════════════════════
// SUSPEND / REACTIVATE USERS
// ══════════════════════════════════════════════════════════════

// PUT /admin/users/:id/suspend
router.put('/users/:id/suspend', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { rows } = await query(
      `UPDATE users SET is_suspended = true, suspended_at = NOW(), suspended_reason = $1 WHERE id = $2 RETURNING id, name, email, role, is_suspended`,
      [reason || null, id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'User not found' });
    await logAudit({ adminId: req.user!.userId, action: 'suspend', resourceType: 'user', resourceId: id, details: reason, ipAddress: req.ip });
    emitDashboardUpdate();
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

// PUT /admin/users/:id/reactivate
router.put('/users/:id/reactivate', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `UPDATE users SET is_suspended = false, suspended_at = NULL, suspended_reason = NULL WHERE id = $1 RETURNING id, name, email, role, is_suspended`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'User not found' });
    await logAudit({ adminId: req.user!.userId, action: 'reactivate', resourceType: 'user', resourceId: id, ipAddress: req.ip });
    emitDashboardUpdate();
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

// ══════════════════════════════════════════════════════════════
// COURSE MODERATION (approve / archive / feature)
// ══════════════════════════════════════════════════════════════

// PUT /admin/courses/:id/review
router.put('/courses/:id/review', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, review_notes } = req.body;
    const validStatuses = ['pending_review', 'approved', 'published', 'rejected', 'draft', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }
    const adminId = req.user!.userId;
    const course = await CourseModel.updateCourseStatus(id, status, review_notes, adminId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    await logAudit({ adminId, action: 'review', resourceType: 'course', resourceId: id, details: `Status set to ${status}`, ipAddress: req.ip });
    emitDashboardUpdate();
    res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
});

// PUT /admin/courses/:id/approve (convenience wrapper — sets status to published)
router.put('/courses/:id/approve', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const adminId = req.user!.userId;
    const course = await CourseModel.updateCourseStatus(id, 'published', req.body.review_notes, adminId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    await logAudit({ adminId, action: 'approve', resourceType: 'course', resourceId: id, ipAddress: req.ip });
    emitDashboardUpdate();
    res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
});

// PUT /admin/courses/:id/reject
router.put('/courses/:id/reject', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const adminId = req.user!.userId;
    const course = await CourseModel.updateCourseStatus(id, 'rejected', req.body.review_notes || req.body.reason, adminId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    await logAudit({ adminId, action: 'reject', resourceType: 'course', resourceId: id, ipAddress: req.ip });
    emitDashboardUpdate();
    res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
});

// PUT /admin/courses/:id/archive
router.put('/courses/:id/archive', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const adminId = req.user!.userId;
    const course = await CourseModel.updateCourseStatus(id, 'archived', req.body.review_notes, adminId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    await logAudit({ adminId, action: 'archive', resourceType: 'course', resourceId: id, ipAddress: req.ip });
    emitDashboardUpdate();
    res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
});

// PUT /admin/courses/:id/feature
router.put('/courses/:id/feature', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const cur = await query(`SELECT featured FROM courses WHERE id = $1`, [id]);
    const isFeatured = cur.rows[0]?.featured;
    const { rows } = await query(
      `UPDATE courses SET featured = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [!isFeatured, id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Course not found' });
    await logAudit({ adminId: req.user!.userId, action: isFeatured ? 'unfeature' : 'feature', resourceType: 'course', resourceId: id, ipAddress: req.ip });
    emitDashboardUpdate();
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

// ══════════════════════════════════════════════════════════════
// CERTIFICATES
// ══════════════════════════════════════════════════════════════

// GET /admin/certificates
router.get('/certificates', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const data = await CertificateModel.getAllCertificates(limit, offset);
    const total = await CertificateModel.countCertificates();
    res.json({
      success: true,
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /admin/certificates/:id/revoke
router.put('/certificates/:id/revoke', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cert = await CertificateModel.revokeCertificateById(req.params.id);
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found' });
    await logAudit({ adminId: req.user!.userId, action: 'revoke', resourceType: 'certificate', resourceId: req.params.id, ipAddress: req.ip });
    res.json({ success: true, data: cert });
  } catch (error) {
    next(error);
  }
});

// PUT /admin/certificates/:id/reissue
router.put('/certificates/:id/reissue', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cert = await CertificateModel.reissueCertificateById(req.params.id);
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found' });
    await logAudit({ adminId: req.user!.userId, action: 'reissue', resourceType: 'certificate', resourceId: req.params.id, ipAddress: req.ip });
    res.json({ success: true, data: cert });
  } catch (error) {
    next(error);
  }
});

// ══════════════════════════════════════════════════════════════
// SUPPORT TICKETS
// ══════════════════════════════════════════════════════════════

// GET /admin/tickets
router.get('/tickets', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

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

    const { rows } = await query(sql, params);
    const countRes = await query('SELECT COUNT(*) FROM support_tickets' + (status ? ` WHERE status = $1` : ''), status ? [status] : []);
    const total = parseInt(countRes.rows[0].count, 10);

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// POST /admin/tickets/:id/reply
router.post('/tickets/:id/reply', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const adminId = req.user!.userId;
    const { rows } = await query(
      `INSERT INTO ticket_replies (ticket_id, admin_id, message) VALUES ($1, $2, $3) RETURNING *`,
      [id, adminId, message]
    );
    await query(`UPDATE support_tickets SET status = 'in_progress', updated_at = NOW() WHERE id = $1`, [id]);
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

// PUT /admin/tickets/:id/close
router.put('/tickets/:id/close', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      `UPDATE support_tickets SET status = 'closed', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Ticket not found' });
    await logAudit({ adminId: req.user!.userId, action: 'close', resourceType: 'ticket', resourceId: req.params.id, ipAddress: req.ip });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

// PUT /admin/tickets/:id/reopen
router.put('/tickets/:id/reopen', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      `UPDATE support_tickets SET status = 'open', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Ticket not found' });
    await logAudit({ adminId: req.user!.userId, action: 'reopen', resourceType: 'ticket', resourceId: req.params.id, ipAddress: req.ip });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

// PUT /admin/tickets/:id/assign
router.put('/tickets/:id/assign', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { adminId } = req.body;
    const { rows } = await query(
      `UPDATE support_tickets SET assigned_to = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [adminId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Ticket not found' });
    await logAudit({ adminId: req.user!.userId, action: 'assign', resourceType: 'ticket', resourceId: req.params.id, ipAddress: req.ip });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

// ══════════════════════════════════════════════════════════════
// BROADCAST NOTIFICATIONS
// ══════════════════════════════════════════════════════════════

// GET /admin/broadcasts
router.get('/broadcasts', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { rows } = await query(
      `SELECT * FROM broadcasts ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const countRes = await query('SELECT COUNT(*) FROM broadcasts');
    const total = parseInt(countRes.rows[0].count, 10);
    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// POST /admin/broadcasts
router.post('/broadcasts', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, message, audience, type, scheduledAt } = req.body;
    const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();
    const status = isScheduled ? 'scheduled' : 'sent';
    const { rows } = await query(
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

    // If sending immediately (not scheduled), deliver to users
    if (status === 'sent') {
      let userQuery = 'SELECT id FROM users WHERE 1=1';
      const userParams: any[] = [];
      if (audience === 'students') userQuery += ' AND role = $1';
      else if (audience === 'instructors') userQuery += ' AND role = $1';
      else if (audience === 'admins') userQuery += ' AND role = $1';

      let roleFilter = audience;
      if (audience === 'students') roleFilter = 'student';
      else if (audience === 'instructors') roleFilter = 'instructor';
      else if (audience === 'admins') roleFilter = 'admin';

      if (roleFilter !== 'all') userParams.push(roleFilter);

      const { rows: users } = await query(userQuery, userParams);

      for (const user of users) {
        await NotificationModel.createNotification({
          user_id: user.id,
          title,
          message,
          type: type === 'warning' ? 'warning' : type === 'announcement' ? 'info' : type === 'promotion' ? 'info' : 'info',
        });
        io.to(user.id).emit('new_notification', { title, message, type });
      }
    }

    await logAudit({ adminId: req.user!.userId, action: 'broadcast', resourceType: 'broadcast', resourceId: rows[0].id, details: `Audience: ${audience}, Title: ${title}`, ipAddress: req.ip });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

// DELETE /admin/broadcasts/:id
router.delete('/broadcasts/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { rowCount } = await query(`DELETE FROM broadcasts WHERE id = $1`, [id]);
    if (!rowCount) return res.status(404).json({ success: false, message: 'Broadcast not found' });
    await logAudit({ adminId: req.user!.userId, action: 'delete', resourceType: 'broadcast', resourceId: id, ipAddress: req.ip });
    res.json({ success: true, message: 'Broadcast deleted' });
  } catch (error) {
    next(error);
  }
});

// ══════════════════════════════════════════════════════════════
// AUDIT LOGS
// ══════════════════════════════════════════════════════════════

// GET /admin/audit-logs
router.get('/audit-logs', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { rows } = await query(
      `SELECT al.*, u.name as admin_name
       FROM audit_logs al
       JOIN users u ON al.admin_id = u.id
       ORDER BY al.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const countRes = await query('SELECT COUNT(*) FROM audit_logs');
    const total = parseInt(countRes.rows[0].count, 10);
    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// ══════════════════════════════════════════════════════════════
// SYSTEM SETTINGS
// ══════════════════════════════════════════════════════════════

// GET /admin/settings
router.get('/settings', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query('SELECT * FROM system_settings ORDER BY category, key');
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// PUT /admin/settings
router.put('/settings', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { key, value } = req.body;
    const { rows } = await query(
      `INSERT INTO system_settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2
       RETURNING *`,
      [key, value]
    );
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

// ══════════════════════════════════════════════════════════════
// CATEGORIES
// ══════════════════════════════════════════════════════════════

// GET /admin/categories
router.get('/categories', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await CategoryModel.getAllCategories();
    const total = await CategoryModel.countCategories();
    res.json({ success: true, data, pagination: { total } });
  } catch (error) {
    next(error);
  }
});

// POST /admin/categories
router.post('/categories', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, slug, description, icon, color, parent_id, sort_order } = req.body;
    if (!name || !slug) return res.status(400).json({ success: false, message: 'Name and slug are required' });
    const data = await CategoryModel.createCategory({ name, slug, description, icon, color, parent_id, sort_order });
    await logAudit({ adminId: req.user!.userId, action: 'create', resourceType: 'category', resourceId: data.id, ipAddress: req.ip });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// PUT /admin/categories/:id
router.put('/categories/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = await CategoryModel.updateCategory(id, req.body);
    if (!data) return res.status(404).json({ success: false, message: 'Category not found' });
    await logAudit({ adminId: req.user!.userId, action: 'update', resourceType: 'category', resourceId: id, ipAddress: req.ip });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// DELETE /admin/categories/:id
router.delete('/categories/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const deleted = await CategoryModel.deleteCategory(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Category not found' });
    await logAudit({ adminId: req.user!.userId, action: 'delete', resourceType: 'category', resourceId: req.params.id, ipAddress: req.ip });
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
});

// ══════════════════════════════════════════════════════════════
// MISSING ROUTES (Sprint 1.2)
// ══════════════════════════════════════════════════════════════

// POST /admin/users/:id/reset-password
router.post('/users/:id/reset-password', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tempPassword = crypto.randomBytes(4).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    const user = await UserModel.updateUser(id, { password: hashedPassword });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await logAudit({ adminId: req.user!.userId, action: 'reset_password', resourceType: 'user', resourceId: id, ipAddress: req.ip });
    res.json({ success: true, message: 'Password reset successfully', data: { tempPassword } });
  } catch (error) { next(error); }
});

// POST /admin/payments/:id/refund
router.post('/payments/:id/refund', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { rows } = await query(`UPDATE payments SET status = 'refunded' WHERE id = $1 RETURNING *`, [id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Payment not found' });
    await logAudit({ adminId: req.user!.userId, action: 'refund', resourceType: 'payment', resourceId: id, ipAddress: req.ip });
    emitDashboardUpdate();
    res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
});

// PUT /admin/applications/:id/request-changes
router.put('/applications/:id/request-changes', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user!.userId;
    const { rows } = await query(
      `UPDATE instructor_applications SET status = 'pending', notes = COALESCE($1, notes), reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW() WHERE id = $3 RETURNING *`,
      [notes, adminId, id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Application not found' });
    await logAudit({ adminId, action: 'request_changes', resourceType: 'application', resourceId: id, details: notes, ipAddress: req.ip });
      res.json({ success: true, message: 'Changes requested', data: rows[0] });
  } catch (error) { next(error); }
});

// ── Certificate Template Routes ──

// GET /admin/certificate-templates — list all templates
router.get('/certificate-templates', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const templates = await CertificateTemplateModel.getAllTemplates();
    res.json({ success: true, data: templates });
  } catch (error) { next(error); }
});

// POST /admin/certificate-templates — create template
router.post('/certificate-templates', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const template = await CertificateTemplateModel.createTemplate(req.body);
    await logAudit({ adminId: req.user!.userId, action: 'create', resourceType: 'certificate_template', resourceId: template.id, ipAddress: req.ip });
    res.status(201).json({ success: true, data: template });
  } catch (error) { next(error); }
});

// PUT /admin/certificate-templates/:id — update template
router.put('/certificate-templates/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const template = await CertificateTemplateModel.updateTemplate(req.params.id, req.body);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    await logAudit({ adminId: req.user!.userId, action: 'update', resourceType: 'certificate_template', resourceId: req.params.id, ipAddress: req.ip });
    res.json({ success: true, data: template });
  } catch (error) { next(error); }
});

// DELETE /admin/certificate-templates/:id — delete template
router.delete('/certificate-templates/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const deleted = await CertificateTemplateModel.deleteTemplate(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Template not found' });
    await logAudit({ adminId: req.user!.userId, action: 'delete', resourceType: 'certificate_template', resourceId: req.params.id, ipAddress: req.ip });
    res.json({ success: true, message: 'Template deleted' });
  } catch (error) { next(error); }
});

// POST /admin/certificate-templates/:id/upload-stamp — upload stamp image
router.post('/certificate-templates/:id/upload-stamp', uploadSingle('file', 'certificates'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const { getFileUrl } = await import('../middleware/upload');
    const url = getFileUrl(req.file);
    const template = await CertificateTemplateModel.updateTemplate(req.params.id, { stamp_url: url ?? undefined });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: { url, template } });
  } catch (error) { next(error); }
});

// POST /admin/certificate-templates/:id/upload-signature — upload signature image
router.post('/certificate-templates/:id/upload-signature', uploadSingle('file', 'certificates'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const { getFileUrl } = await import('../middleware/upload');
    const url = getFileUrl(req.file);
    const template = await CertificateTemplateModel.updateTemplate(req.params.id, { signature_url: url ?? undefined });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: { url, template } });
  } catch (error) { next(error); }
});

// POST /admin/certificate-templates/:id/upload-logo — upload logo image
router.post('/certificate-templates/:id/upload-logo', uploadSingle('file', 'certificates'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const { getFileUrl } = await import('../middleware/upload');
    const url = getFileUrl(req.file);
    const template = await CertificateTemplateModel.updateTemplate(req.params.id, { logo_url: url ?? undefined });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: { url, template } });
  } catch (error) { next(error); }
});

// POST /admin/settings/upload-branding — upload branding image (stamp/signature)
router.post('/settings/upload-branding', uploadSingle('file', 'branding'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const { getFileUrl } = await import('../middleware/upload');
    const url = getFileUrl(req.file);
    res.json({ success: true, data: { url } });
  } catch (error) { next(error); }
});

export default router;
