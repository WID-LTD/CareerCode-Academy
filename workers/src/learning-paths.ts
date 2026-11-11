import type { Env } from './env';
import { getDb } from './db';

// Learning-path queries ported from backend/src/models/learningPath.ts.

const LEVEL_COLORS: Record<string, string> = {
  beginner: 'from-emerald-500 to-teal-600',
  intermediate: 'from-blue-500 to-indigo-600',
  advanced: 'from-purple-500 to-pink-600',
};
const LEVEL_ICONS: Record<string, string> = {
  beginner: 'BookOpen',
  intermediate: 'BarChart',
  advanced: 'Rocket',
};
const LEVELS = ['beginner', 'intermediate', 'advanced'];

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const pathSlug = (category: string, level: string) => `${slugify(category)}-${level}`;
export const schoolPathSlug = (schoolSlug: string, level: string) => `${schoolSlug}-${level}`;

async function upsertSchoolPath(env: Env, schoolId: string, schoolSlug: string, schoolName: string, level: string): Promise<string> {
  const db = getDb(env);
  const slug = schoolPathSlug(schoolSlug, level);
  const title = `${schoolName} — ${level.charAt(0).toUpperCase() + level.slice(1)}`;
  const icon = LEVEL_ICONS[level] || 'GitBranch';
  const color = LEVEL_COLORS[level] || 'from-blue-600 to-cyan-600';
  const existing = await db.query<any>('SELECT id FROM learning_paths WHERE slug = $1', [slug]);
  if (existing.rows.length) {
    await db.query(
      `UPDATE learning_paths SET title = $1, icon = $2, color = $3, level = $4, school_id = $5, updated_at = NOW() WHERE slug = $6`,
      [title, icon, color, level, schoolId, slug]
    );
    return existing.rows[0].id;
  }
  const { rows } = await db.query<any>(
    `INSERT INTO learning_paths (title, description, icon, color, level, slug, school_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [title, `${schoolName} pathway — ${level} level`, icon, color, level, slug, schoolId]
  );
  return rows[0].id;
}

async function rebuildSchoolPathCourses(env: Env, pathId: string, schoolId: string, level: string): Promise<void> {
  const db = getDb(env);
  const { rows } = await db.query<any>(
    `SELECT DISTINCT c.id FROM courses c
     LEFT JOIN programs pr ON pr.id = c.program_id
     LEFT JOIN program_courses pc ON pc.course_id = c.id
     LEFT JOIN programs pr2 ON pr2.id = pc.program_id
     WHERE c.published = true AND c.level = $2
       AND (pr.school_id = $1 OR pr2.school_id = $1)
     ORDER BY c.created_at ASC`,
    [schoolId, level]
  );
  await db.query('DELETE FROM learning_path_courses WHERE path_id = $1', [pathId]);
  for (let i = 0; i < rows.length; i++) {
    await db.query(
      'INSERT INTO learning_path_courses (path_id, course_id, order_index) VALUES ($1, $2, $3)',
      [pathId, rows[i].id, i]
    );
  }
}

export async function getAllLearningPaths(env: Env): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT lp.*,
       COUNT(lpc.course_id)::int as courses_count,
       COALESCE(SUM(c.duration), 0)::int as total_duration,
       (SELECT COUNT(DISTINCT e.user_id)
        FROM enrollments e
        JOIN learning_path_courses lpc2 ON e.course_id = lpc2.course_id
        WHERE lpc2.path_id = lp.id) as students_count
     FROM learning_paths lp
     LEFT JOIN learning_path_courses lpc ON lp.id = lpc.path_id
     LEFT JOIN courses c ON lpc.course_id = c.id
     GROUP BY lp.id
     ORDER BY lp.title ASC`
  );
  return rows;
}

export async function getLearningPathBySlug(env: Env, slug: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    `SELECT lp.*,
       COUNT(lpc.course_id)::int as courses_count,
       COALESCE(SUM(c.duration), 0)::int as total_duration,
       (SELECT COUNT(DISTINCT e.user_id)
        FROM enrollments e
        JOIN learning_path_courses lpc2 ON e.course_id = lpc2.course_id
        WHERE lpc2.path_id = lp.id) as students_count
     FROM learning_paths lp
     LEFT JOIN learning_path_courses lpc ON lp.id = lpc.path_id
     LEFT JOIN courses c ON lpc.course_id = c.id
     WHERE lp.slug = $1
     GROUP BY lp.id`,
    [slug]
  );
  return rows[0] || null;
}

export async function getPathCourses(env: Env, pathId: string): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT c.id, c.title, c.slug, c.thumbnail, c.duration, c.level, c.price,
            lpc.order_index, u.name as instructor_name
     FROM learning_path_courses lpc
     JOIN courses c ON lpc.course_id = c.id
     JOIN users u ON c.instructor_id = u.id
     WHERE lpc.path_id = $1
     ORDER BY lpc.order_index ASC`,
    [pathId]
  );
  return rows;
}

export async function getGroupedByCategory(env: Env): Promise<any[]> {
  const db = getDb(env);
  const { rows: cats } = await db.query<any>(
    'SELECT DISTINCT category FROM courses WHERE published = true ORDER BY category ASC'
  );
  const result: any[] = [];
  for (const { category } of cats) {
    const zones: Record<string, any> = {};
    let hasAny = false;
    for (const level of LEVELS) {
      const { rows: pathRows } = await db.query<any>('SELECT * FROM learning_paths WHERE slug = $1', [pathSlug(category, level)]);
      const path = pathRows[0] || null;
      const { rows: courseRows } = await db.query<any>(
        `SELECT c.id, c.title, c.slug, c.thumbnail, c.duration, c.level, c.price, u.name as instructor_name
         FROM learning_path_courses lpc
         JOIN courses c ON lpc.course_id = c.id
         JOIN users u ON c.instructor_id = u.id
         WHERE lpc.path_id = $1 ORDER BY lpc.order_index ASC`,
        [path?.id || '00000000-0000-0000-0000-000000000000']
      );
      const countRes = await db.query<any>(
        `SELECT COUNT(*)::int as cnt, COALESCE(SUM(duration),0)::int as dur
         FROM courses WHERE category=$1 AND level=$2 AND published=true`,
        [category, level]
      );
      const cnt = Number(countRes.rows[0]?.cnt) || 0;
      if (cnt > 0 && path) {
        const stats = await db.query<any>(
          `SELECT COUNT(DISTINCT e.user_id)::int as students
           FROM enrollments e
           JOIN learning_path_courses lpc2 ON e.course_id = lpc2.course_id
           WHERE lpc2.path_id=$1`,
          [path.id]
        );
        zones[level] = {
          path,
          courses: courseRows,
          courses_count: cnt,
          total_duration: Number(countRes.rows[0]?.dur) || 0,
          students_count: Number(stats.rows[0]?.students) || 0,
          color: path.color,
          icon: path.icon,
        };
        hasAny = true;
      } else {
        zones[level] = null;
      }
    }
    if (hasAny) result.push({ category, categorySlug: slugify(category), zones });
  }
  return result;
}

export async function getGroupedBySchool(env: Env): Promise<any[]> {
  const db = getDb(env);
  const { rows: schools } = await db.query<any>(
    `SELECT s.*, COUNT(p.id)::int as program_count FROM schools s
     LEFT JOIN programs p ON p.school_id = s.id GROUP BY s.id ORDER BY s.sort_order ASC`
  );
  const result: any[] = [];
  for (const school of schools) {
    const zones: Record<string, any> = {};
    let hasAny = false;
    let totalSchoolCourses = 0;
    for (const level of LEVELS) {
      const slug = schoolPathSlug(school.slug, level);
      const { rows: pathRows } = await db.query<any>('SELECT * FROM learning_paths WHERE slug = $1', [slug]);
      let path = pathRows[0] || null;
      const countRes = await db.query<any>(
        `SELECT COUNT(DISTINCT c.id)::int as cnt, COALESCE(SUM(c.duration),0)::int as dur
         FROM courses c
         LEFT JOIN programs pr ON pr.id = c.program_id
         LEFT JOIN program_courses pc ON pc.course_id = c.id
         LEFT JOIN programs pr2 ON pr2.id = pc.program_id
         WHERE c.published = true AND c.level = $2
           AND (pr.school_id = $1 OR pr2.school_id = $1)`,
        [school.id, level]
      );
      const cnt = Number(countRes.rows[0]?.cnt) || 0;
      totalSchoolCourses += cnt;

      if (cnt > 0 && !path) {
        try {
          const newId = await upsertSchoolPath(env, school.id, school.slug, school.name, level);
          await rebuildSchoolPathCourses(env, newId, school.id, level);
          const { rows } = await db.query<any>('SELECT * FROM learning_paths WHERE slug = $1', [slug]);
          path = rows[0] || null;
        } catch { /* leave null */ }
      } else if (cnt > 0 && path) {
        const linkRows = await db.query<any>('SELECT COUNT(*)::int as n FROM learning_path_courses WHERE path_id = $1', [path.id]);
        if (Number(linkRows.rows[0]?.n) === 0) {
          try { await rebuildSchoolPathCourses(env, path.id, school.id, level); } catch { /* ignore */ }
        }
      }

      if (cnt > 0 && path) {
        const { rows: courseRows } = await db.query<any>(
          `SELECT c.id, c.title, c.slug, c.thumbnail, c.duration, c.level, c.price, c.category,
                  u.name as instructor_name
           FROM learning_path_courses lpc
           JOIN courses c ON lpc.course_id = c.id
           JOIN users u ON c.instructor_id = u.id
           WHERE lpc.path_id = $1 ORDER BY lpc.order_index ASC`,
          [path.id]
        );
        const stats = await db.query<any>(
          `SELECT COUNT(DISTINCT e.user_id)::int as students
           FROM enrollments e
           JOIN learning_path_courses lpc2 ON e.course_id = lpc2.course_id
           WHERE lpc2.path_id=$1`,
          [path.id]
        );
        zones[level] = {
          path,
          courses: courseRows,
          courses_count: cnt,
          total_duration: Number(countRes.rows[0]?.dur) || 0,
          students_count: Number(stats.rows[0]?.students) || 0,
          color: path.color,
          icon: path.icon,
        };
        hasAny = true;
      } else {
        zones[level] = null;
      }
    }
    if (hasAny) {
      result.push({
        school: {
          id: school.id,
          name: school.name,
          slug: school.slug,
          description: school.description,
          icon: school.icon,
          color: school.color,
          sort_order: school.sort_order,
          program_count: Number(school.program_count) || 0,
        },
        category: school.name,
        categorySlug: school.slug,
        totalCourses: totalSchoolCourses,
        zones,
      });
    }
  }
  return result;
}


export async function getPathPricing(env: Env, path: any, userId?: string | null) {
  const db = getDb(env);
  const { rows: courses } = await db.query<any>(
    `SELECT c.id, c.title, c.slug, c.thumbnail, c.duration, c.level, c.price,
            lpc.order_index, u.name as instructor_name
     FROM learning_path_courses lpc
     JOIN courses c ON lpc.course_id = c.id
     JOIN users u ON c.instructor_id = u.id
     WHERE lpc.path_id = $1 ORDER BY lpc.order_index ASC`,
    [path.id]
  );

  let owned = new Set<string>();
  if (userId) {
    const { rows } = await db.query<any>(
      `SELECT e.course_id FROM enrollments e
       JOIN learning_path_courses lpc ON lpc.course_id = e.course_id
       WHERE e.user_id = $1 AND lpc.path_id = $2`,
      [userId, path.id]
    );
    owned = new Set(rows.map((r: any) => r.course_id));
  }

  const enriched = courses.map((c: any) => ({
    ...c,
    price: Number(c.price) || 0,
    owned: owned.has(c.id),
    effective_price: owned.has(c.id) ? 0 : Number(c.price) || 0,
  }));

  const paid = enriched.filter((c: any) => c.price > 0);
  const free = enriched.filter((c: any) => c.price <= 0);
  const unpaid = paid.filter((c: any) => !c.owned);
  const fullPaidTotal = paid.reduce((sum: number, c: any) => sum + c.price, 0);
  const unpaidTotal = unpaid.reduce((sum: number, c: any) => sum + c.price, 0);
  const discountPct = Math.max(0, Math.min(90, Number(path.bundle_discount_percent) || 0));

  let bundlePrice = unpaidTotal;
  if (path.bundle_price !== null && path.bundle_price !== undefined && Number(path.bundle_price) > 0 && fullPaidTotal > 0) {
    bundlePrice = Number(path.bundle_price) * (unpaidTotal / fullPaidTotal);
  } else if (discountPct > 0) {
    bundlePrice = unpaidTotal * (1 - discountPct / 100);
  }
  bundlePrice = Math.round(Math.max(0, bundlePrice) * 100) / 100;
  const savings = Math.round(Math.max(0, unpaidTotal - bundlePrice) * 100) / 100;

  return {
    path_id: path.id,
    courses: enriched,
    full_price: Math.round(unpaidTotal * 100) / 100,
    bundle_price: bundlePrice,
    savings,
    discount_percent: discountPct,
    paid_courses: paid.length,
    free_courses: free.length,
    unpaid_courses: unpaid.length,
    owned_courses: owned.size,
    total_courses: enriched.length,
    requires_payment: unpaid.length > 0 && bundlePrice > 0,
    bundle_enabled: path.bundle_enabled === undefined || path.bundle_enabled === null ? true : !!path.bundle_enabled,
  };
}

async function ensurePathTodos(env: Env, userId: string, path: any, courses: any[]): Promise<void> {
  try {
    const db = getDb(env);
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      const autoKey = `path:${path.id}:course:${course.id}`;
      const existing = await db.query<any>('SELECT id FROM todos WHERE user_id = $1 AND auto_key = $2', [userId, autoKey]);
      if (existing.rows.length) continue;
      await db.query(
        `INSERT INTO todos (id, user_id, title, notes, priority, category, course_id, path_id, source, auto_key, sort_order)
         VALUES ($1,$2,$3,$4,$5,'study',$6,$7,'path',$8,$9)`,
        [
          crypto.randomUUID(), userId, `Work through: ${course.title}`,
          `Part of the ${path.title} learning path.`, i === 0 ? 'high' : 'medium',
          course.id, path.id, autoKey, i,
        ]
      );
    }
  } catch { /* to-dos are best-effort */ }
}

export async function enrollInPath(env: Env, userId: string, path: any, mode: 'free' | 'all' | 'force' = 'free') {
  const db = getDb(env);
  const existing = await db.query<any>(
    'SELECT * FROM learning_path_enrollments WHERE user_id = $1 AND path_id = $2',
    [userId, path.id]
  );

  const { rows: courseRows } = await db.query<any>(
    `SELECT c.id, c.title, c.slug, c.price, c.instructor_id
     FROM learning_path_courses lpc
     JOIN courses c ON c.id = lpc.course_id
     WHERE lpc.path_id = $1 ORDER BY lpc.order_index ASC`,
    [path.id]
  );

  const enrolledCourseIds: string[] = [];
  const paidCourses: any[] = [];
  for (const course of courseRows) {
    const has = await db.query<any>(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [userId, course.id]
    );
    if (Number(course.price) > 0) {
      if (!has.rows.length) {
        if (mode === 'force') {
          await db.query(
            `INSERT INTO enrollments (user_id, course_id, status) VALUES ($1, $2, 'active')`,
            [userId, course.id]
          );
          enrolledCourseIds.push(course.id);
          await db.query(
            `INSERT INTO notifications (user_id, title, message, type, link)
             VALUES ($1, 'New Enrollment', $2, 'enrollment', '/instructor/students')`,
            [course.instructor_id, `A new student enrolled in "${course.title}"`]
          );
        } else {
          paidCourses.push({ id: course.id, title: course.title, slug: course.slug, price: Number(course.price) });
        }
      } else {
        enrolledCourseIds.push(course.id);
      }
      continue;
    }
    if (has.rows.length) { enrolledCourseIds.push(course.id); continue; }

    await db.query(
      `INSERT INTO enrollments (user_id, course_id, status) VALUES ($1, $2, 'active')`,
      [userId, course.id]
    );
    enrolledCourseIds.push(course.id);
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, 'New Enrollment', $2, 'enrollment', $3)`,
      [course.instructor_id, `A new student enrolled in "${course.title}"`, '/instructor/students']
    );
  }

  // "all" only succeeds when nothing is left to pay for.
  if (mode === 'all' && paidCourses.length > 0) {
    return {
      enrollment: existing.rows[0] || null,
      enrolledCourseIds,
      paidCourses,
      requiresPayment: true,
    };
  }

  let enrollment = existing.rows[0] || null;
  if (enrollment) {
    await db.query(
      `UPDATE learning_path_enrollments SET status = 'active' WHERE id = $1`,
      [enrollment.id]
    );
  } else {
    const { rows } = await db.query<any>(
      `INSERT INTO learning_path_enrollments (user_id, path_id, status) VALUES ($1, $2, 'active') RETURNING *`,
      [userId, path.id]
    );
    enrollment = rows[0];
  }

  await ensurePathTodos(env, userId, path, courseRows);
  return { enrollment, enrolledCourseIds, paidCourses, requiresPayment: false };
}
