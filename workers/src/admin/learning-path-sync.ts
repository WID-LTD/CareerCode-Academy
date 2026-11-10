import type { Env } from '../env';
import { getDb } from '../db';
import { slugify } from './helpers';

// Port of syncLearningPathForCourse + helpers from
// backend/src/models/learningPath.ts (only the parts admin.routes.ts needs).

function pathSlug(category: string, level: string): string {
  return `${slugify(category)}-${level}`;
}

function pathTitle(category: string, level: string): string {
  const lvl = level.charAt(0).toUpperCase() + level.slice(1);
  return `${category} for ${lvl}`;
}

const levelColors: Record<string, string> = {
  beginner: 'from-emerald-500 to-teal-600',
  intermediate: 'from-blue-500 to-indigo-600',
  advanced: 'from-purple-500 to-pink-600',
};

const levelIcons: Record<string, string> = {
  beginner: 'BookOpen',
  intermediate: 'BarChart',
  advanced: 'Rocket',
};

async function upsertPath(env: Env, category: string, level: string): Promise<string> {
  const db = getDb(env);
  const slug = pathSlug(category, level);
  const title = pathTitle(category, level);
  const icon = levelIcons[level] || 'GitBranch';
  const color = levelColors[level] || 'from-blue-600 to-cyan-600';

  const existing = await db.query<any>('SELECT id FROM learning_paths WHERE slug = $1', [slug]);
  if (existing.rows.length > 0) {
    await db.query(
      `UPDATE learning_paths SET title = $1, icon = $2, color = $3, level = $4, updated_at = NOW() WHERE slug = $5`,
      [title, icon, color, level, slug]
    );
    return existing.rows[0].id;
  }

  const { rows } = await db.query<any>(
    `INSERT INTO learning_paths (title, description, icon, color, level, slug)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [title, `${category} path for ${level} learners`, icon, color, level, slug]
  );
  return rows[0].id;
}

async function upsertSchoolPath(env: Env, schoolId: string, schoolSlug: string, schoolName: string, level: string): Promise<string> {
  const db = getDb(env);
  const slug = `${schoolSlug}-${level}`;
  const lvl = level.charAt(0).toUpperCase() + level.slice(1);
  const title = `${schoolName} — ${lvl}`;
  const icon = levelIcons[level] || 'GitBranch';
  const color = levelColors[level] || 'from-blue-600 to-cyan-600';
  const existing = await db.query<any>('SELECT id FROM learning_paths WHERE slug = $1', [slug]);
  if (existing.rows.length > 0) {
    await db.query(
      `UPDATE learning_paths SET title = $1, icon = $2, color = $3, level = $4, school_id = $5, updated_at = NOW() WHERE slug = $6`,
      [title, icon, color, level, schoolId, slug]
    );
    return existing.rows[0].id;
  }
  const { rows } = await db.query<any>(
    `INSERT INTO learning_paths (title, description, icon, color, level, slug, school_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [title, `${schoolName} pathway — ${level} level`, icon, color, level, slug, schoolId]
  );
  return rows[0].id;
}

async function rebuildPathCourses(env: Env, pathId: string, category: string, level: string): Promise<void> {
  const db = getDb(env);
  const { rows } = await db.query<any>(
    `SELECT id FROM courses WHERE category = $1 AND level = $2 AND published = true ORDER BY created_at ASC`,
    [category, level]
  );

  await db.query('DELETE FROM learning_path_courses WHERE path_id = $1', [pathId]);
  for (let i = 0; i < rows.length; i++) {
    await db.query(
      `INSERT INTO learning_path_courses (path_id, course_id, order_index) VALUES ($1, $2, $3)`,
      [pathId, rows[i].id, i]
    );
  }
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
      `INSERT INTO learning_path_courses (path_id, course_id, order_index) VALUES ($1, $2, $3)`,
      [pathId, rows[i].id, i]
    );
  }
}

async function removeOrphanedPaths(env: Env): Promise<void> {
  // SQLite cannot alias a DELETE target, so reference the table by name.
  await getDb(env).query(
    `DELETE FROM learning_paths WHERE NOT EXISTS (
       SELECT 1 FROM learning_path_courses WHERE learning_path_courses.path_id = learning_paths.id
     )`
  );
}

/** Keeps category/level (and school) learning paths in sync after course edits. */
export async function syncLearningPathForCourse(
  env: Env,
  course: { id: string; category: string; level: string; program_id?: string | null },
  oldCategory?: string,
  oldLevel?: string,
  oldProgramId?: string | null
): Promise<void> {
  const db = getDb(env);
  const groups = new Set<string>();

  groups.add(`${course.category}::${course.level}`);
  if (oldCategory && oldLevel && (oldCategory !== course.category || oldLevel !== course.level)) {
    groups.add(`${oldCategory}::${oldLevel}`);
  }

  for (const g of groups) {
    const [cat, lvl] = g.split('::');
    const pathId = await upsertPath(env, cat, lvl);
    await rebuildPathCourses(env, pathId, cat, lvl);
  }

  const programIds = new Set<string>();
  if (course.program_id) programIds.add(course.program_id);
  if (oldProgramId && oldProgramId !== course.program_id) programIds.add(oldProgramId);
  for (const pid of programIds) {
    try {
      const { rows } = await db.query<any>(
        `SELECT school_id, slug, name FROM programs JOIN schools ON programs.school_id = schools.id WHERE programs.id = $1`,
        [pid]
      );
      if (rows[0]) {
        const s = rows[0];
        const pathId = await upsertSchoolPath(env, s.school_id, s.slug, s.name, course.level);
        await rebuildSchoolPathCourses(env, pathId, s.school_id, course.level);
        if (oldLevel && oldLevel !== course.level) {
          const oldPathId = await upsertSchoolPath(env, s.school_id, s.slug, s.name, oldLevel);
          await rebuildSchoolPathCourses(env, oldPathId, s.school_id, oldLevel);
        }
      }
    } catch { /* school pathways are best-effort */ }
  }

  if (!course.program_id && oldProgramId) {
    try {
      const { rows } = await db.query<any>(
        `SELECT school_id, slug, name FROM programs JOIN schools ON programs.school_id = schools.id WHERE programs.id = $1`,
        [oldProgramId]
      );
      if (rows[0]) {
        const s = rows[0];
        const pathId = await upsertSchoolPath(env, s.school_id, s.slug, s.name, course.level);
        await rebuildSchoolPathCourses(env, pathId, s.school_id, course.level);
      }
    } catch { /* best-effort */ }
  }

  await removeOrphanedPaths(env);
}
