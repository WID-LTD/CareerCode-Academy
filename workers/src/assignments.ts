import type { DbClient } from './db';

// Assignment + submission model helpers, ported from
// backend/src/models/assignment.ts and backend/src/models/submission.ts.

export interface Assignment {
  id: string;
  course_id: string;
  lesson_id: string | null;
  title: string;
  description: string;
  due_date: string | null;
  max_score: number;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  file_url: string | null;
  score: number | null;
  feedback: string | null;
  submitted_at: string;
}

export async function createAssignment(db: DbClient, input: {
  course_id: string;
  lesson_id?: string;
  title: string;
  description: string;
  due_date?: string;
  max_score?: number;
}): Promise<Assignment> {
  const { rows } = await db.query<Assignment>(
    `INSERT INTO assignments (course_id, lesson_id, title, description, due_date, max_score)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.course_id, input.lesson_id || null, input.title, input.description,
      input.due_date || null, input.max_score || 100,
    ]
  );
  return rows[0];
}

export async function getAssignmentsByCourse(db: DbClient, courseId: string): Promise<Assignment[]> {
  const { rows } = await db.query<Assignment>(
    'SELECT * FROM assignments WHERE course_id = $1 ORDER BY created_at DESC',
    [courseId]
  );
  return rows;
}

export async function getAssignmentById(db: DbClient, id: string): Promise<Assignment | null> {
  const { rows } = await db.query<Assignment>('SELECT * FROM assignments WHERE id = $1', [id]);
  return rows[0] || null;
}

const ASSIGNMENT_COLUMNS: Record<string, string> = {
  courseId: 'course_id',
  course_id: 'course_id',
  lessonId: 'lesson_id',
  lesson_id: 'lesson_id',
  title: 'title',
  description: 'description',
  dueDate: 'due_date',
  due_date: 'due_date',
  maxScore: 'max_score',
  max_score: 'max_score',
};

function snakeKey(key: string): string {
  return key.replace(/([A-Z])/g, '_$1').toLowerCase();
}

export async function updateAssignment(db: DbClient, id: string, input: Record<string, any>): Promise<Assignment | null> {
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(input || {})) {
    if (value === undefined) continue;
    const col = ASSIGNMENT_COLUMNS[key] || ASSIGNMENT_COLUMNS[snakeKey(key)];
    if (!col) continue;
    fields.push(`${col} = $${values.length + 1}`);
    values.push(value);
  }

  if (fields.length === 0) return getAssignmentById(db, id);

  fields.push('updated_at = NOW()');
  values.push(id);
  const { rows } = await db.query<Assignment>(
    `UPDATE assignments SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteAssignment(db: DbClient, id: string): Promise<boolean> {
  const { rows } = await db.query('DELETE FROM assignments WHERE id = $1 RETURNING id', [id]);
  return rows.length > 0;
}

// ── Submissions ───────────────────────────────────────────────────────────

export async function createSubmission(db: DbClient, input: {
  assignment_id: string;
  student_id: string;
  file_url?: string;
}): Promise<Submission> {
  const { rows } = await db.query<Submission>(
    `INSERT INTO submissions (assignment_id, student_id, file_url)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.assignment_id, input.student_id, input.file_url || null]
  );
  return rows[0];
}

export async function getSubmissionById(db: DbClient, id: string): Promise<Submission | null> {
  const { rows } = await db.query<Submission>(
    `SELECT s.*, u.name as student_name, u.email as student_email
     FROM submissions s
     JOIN users u ON s.student_id = u.id
     WHERE s.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function getSubmissionsByAssignment(db: DbClient, assignmentId: string): Promise<Submission[]> {
  const { rows } = await db.query<Submission>(
    `SELECT s.*, u.name as student_name, u.email as student_email
     FROM submissions s
     JOIN users u ON s.student_id = u.id
     WHERE s.assignment_id = $1
     ORDER BY s.submitted_at DESC`,
    [assignmentId]
  );
  return rows;
}

export async function getSubmissionsByStudent(db: DbClient, studentId: string): Promise<Submission[]> {
  const { rows } = await db.query<Submission>(
    `SELECT s.*, a.title as assignment_title, a.max_score
     FROM submissions s
     JOIN assignments a ON s.assignment_id = a.id
     WHERE s.student_id = $1
     ORDER BY s.submitted_at DESC`,
    [studentId]
  );
  return rows;
}

export async function gradeSubmission(db: DbClient, id: string, input: {
  score: number;
  feedback?: string;
}): Promise<Submission | null> {
  const { rows } = await db.query<Submission>(
    'UPDATE submissions SET score = $1, feedback = $2 WHERE id = $3 RETURNING *',
    [input.score, input.feedback || null, id]
  );
  return rows[0] || null;
}

export async function getSubmissionByStudentAndAssignment(
  db: DbClient,
  studentId: string,
  assignmentId: string
): Promise<Submission | null> {
  const { rows } = await db.query<Submission>(
    'SELECT * FROM submissions WHERE student_id = $1 AND assignment_id = $2',
    [studentId, assignmentId]
  );
  return rows[0] || null;
}

// ── Small course/enrollment lookups used by the routes ────────────────────

export async function getCourse(db: DbClient, id: string): Promise<any | null> {
  const { rows } = await db.query<any>('SELECT * FROM courses WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function getEnrollment(db: DbClient, userId: string, courseId: string): Promise<any | null> {
  const { rows } = await db.query<any>(
    'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
    [userId, courseId]
  );
  return rows[0] || null;
}
