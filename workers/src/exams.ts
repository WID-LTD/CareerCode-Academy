import type { Env } from './env';
import { getDb } from './db';

// Data-access helpers for the exam domain, ported from
// backend/src/models/exam.ts, examProctoring.ts, certificateTemplate.ts,
// certificate.ts, enrollment.ts and notification.ts.
//
// All SQL stays in the Postgres dialect written for the Express backend;
// workers/src/sql-compat.ts translates it for D1 at runtime.

export interface CreateExamInput {
  course_id: string;
  title: string;
  description?: string;
  duration_minutes?: number;
  passing_score?: number;
  max_attempts?: number;
  shuffle_questions?: boolean;
  show_results?: boolean;
  is_published?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  instructions?: string;
  random_questions_count?: number;
  negative_marking?: boolean;
  negative_percentage?: number;
  certificate_template_id?: string | null;
}

// ── Exams ────────────────────────────────────────────────────────────────

export async function createExam(env: Env, input: CreateExamInput): Promise<any> {
  const { rows } = await getDb(env).query<any>(
    `INSERT INTO exams (course_id, title, description, duration_minutes, passing_score, max_attempts, shuffle_questions, show_results, is_published, starts_at, ends_at, instructions, random_questions_count, negative_marking, negative_percentage, certificate_template_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
    [
      input.course_id, input.title, input.description || null,
      input.duration_minutes || 60, input.passing_score || 70, input.max_attempts || 1,
      input.shuffle_questions || false, input.show_results !== false, input.is_published || false,
      input.starts_at || null, input.ends_at || null, input.instructions || null,
      input.random_questions_count || 0, input.negative_marking || false, input.negative_percentage || 0,
      input.certificate_template_id || null,
    ]
  );
  return rows[0];
}

export async function getAllExams(env: Env, limit = 50, offset = 0): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT e.*, c.title as course_title
     FROM exams e
     JOIN courses c ON e.course_id = c.id
     ORDER BY e.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

export async function getExamsByInstructor(env: Env, userId: string, limit = 50, offset = 0): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT e.*, c.title as course_title
     FROM exams e
     JOIN courses c ON e.course_id = c.id
     WHERE c.instructor_id = $1
     ORDER BY e.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return rows;
}

export async function countExamsByInstructor(env: Env, userId: string): Promise<number> {
  const { rows } = await getDb(env).query<any>(
    `SELECT COUNT(*)::int as total
     FROM exams e
     JOIN courses c ON e.course_id = c.id
     WHERE c.instructor_id = $1`,
    [userId]
  );
  return Number(rows[0]?.total) || 0;
}

export async function countExams(env: Env): Promise<number> {
  const { rows } = await getDb(env).query<any>('SELECT COUNT(*)::int as total FROM exams');
  return Number(rows[0]?.total) || 0;
}

export async function getExamById(env: Env, id: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    `SELECT e.*, c.title as course_title
     FROM exams e
     JOIN courses c ON e.course_id = c.id
     WHERE e.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function updateExam(env: Env, id: string, input: Partial<CreateExamInput>): Promise<any | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  const fieldMap: Record<string, string> = {
    course_id: 'course_id',
    title: 'title',
    description: 'description',
    duration_minutes: 'duration_minutes',
    passing_score: 'passing_score',
    max_attempts: 'max_attempts',
    shuffle_questions: 'shuffle_questions',
    show_results: 'show_results',
    is_published: 'is_published',
    starts_at: 'starts_at',
    ends_at: 'ends_at',
    instructions: 'instructions',
    random_questions_count: 'random_questions_count',
    negative_marking: 'negative_marking',
    negative_percentage: 'negative_percentage',
    certificate_template_id: 'certificate_template_id',
  };

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && fieldMap[key]) {
      fields.push(`${fieldMap[key]} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (fields.length === 0) return getExamById(env, id);

  fields.push('updated_at = NOW()');
  values.push(id);

  const { rows } = await getDb(env).query<any>(
    `UPDATE exams SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteExam(env: Env, id: string): Promise<boolean> {
  await getDb(env).query('DELETE FROM exams WHERE id = $1', [id]);
  return true;
}

export async function getAvailableExamsForUser(env: Env, userId: string): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT e.*, c.title as course_title,
      (SELECT COUNT(*)::int FROM exam_attempts ea WHERE ea.exam_id = e.id AND ea.user_id = $1 AND ea.status != 'abandoned') as attempt_count,
      (SELECT status FROM exam_attempts ea WHERE ea.exam_id = e.id AND ea.user_id = $1 AND ea.status = 'in_progress' ORDER BY ea.started_at DESC LIMIT 1) as active_attempt_status
     FROM exams e
     JOIN courses c ON e.course_id = c.id
     JOIN enrollments en ON en.course_id = e.course_id AND en.user_id = $1
     WHERE e.is_published = true
     ORDER BY e.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function getStudentExamHistory(env: Env, userId: string): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT ea.*, e.title as exam_title, e.course_id, c.title as course_title, e.passing_score, e.duration_minutes
     FROM exam_attempts ea
     JOIN exams e ON ea.exam_id = e.id
     JOIN courses c ON e.course_id = c.id
     WHERE ea.user_id = $1
     ORDER BY ea.started_at DESC`,
    [userId]
  );
  return rows;
}

export async function getAttemptById(env: Env, attemptId: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    `SELECT ea.*, e.title as exam_title, e.passing_score, e.show_results, e.duration_minutes, e.course_id
     FROM exam_attempts ea
     JOIN exams e ON ea.exam_id = e.id
     WHERE ea.id = $1`,
    [attemptId]
  );
  return rows[0] || null;
}

export async function abandonAttempt(env: Env, attemptId: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    `UPDATE exam_attempts SET submitted_at = NOW(), status = 'abandoned' WHERE id = $1 AND status = 'in_progress' RETURNING *`,
    [attemptId]
  );
  return rows[0] || null;
}

export async function createAttempt(env: Env, examId: string, userId: string): Promise<any> {
  const { rows } = await getDb(env).query<any>(
    `INSERT INTO exam_attempts (exam_id, user_id, status) VALUES ($1, $2, 'in_progress') RETURNING *`,
    [examId, userId]
  );
  return rows[0];
}

export async function submitAttempt(env: Env, attemptId: string, score: number, passed: boolean): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    `UPDATE exam_attempts SET submitted_at = NOW(), score = $2, passed = $3, status = 'completed' WHERE id = $1 RETURNING *`,
    [attemptId, score, passed]
  );
  return rows[0] || null;
}

export async function saveAnswer(
  env: Env,
  attemptId: string,
  questionId: string,
  answer: string,
  isCorrect: boolean,
  pointsEarned: number
): Promise<any> {
  const { rows } = await getDb(env).query<any>(
    `INSERT INTO exam_answers (attempt_id, question_id, answer, is_correct, points_earned)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (attempt_id, question_id) DO UPDATE SET answer = $3, is_correct = $4, points_earned = $5
     RETURNING *`,
    [attemptId, questionId, answer, isCorrect, pointsEarned]
  );
  return rows[0];
}

export async function getAnswersForAttempt(env: Env, attemptId: string): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT ea.*, eq.question, eq.correct_answer, eq.question_type, eq.options, eq.points
     FROM exam_answers ea
     JOIN exam_questions eq ON ea.question_id = eq.id
     WHERE ea.attempt_id = $1
     ORDER BY eq.order_index`,
    [attemptId]
  );
  return rows;
}

export async function getQuestionsByExam(env: Env, examId: string): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    'SELECT * FROM exam_questions WHERE exam_id = $1 ORDER BY order_index ASC',
    [examId]
  );
  return rows;
}

export async function getRandomQuestions(env: Env, examId: string, count: number): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    'SELECT * FROM exam_questions WHERE exam_id = $1 ORDER BY RANDOM() LIMIT $2',
    [examId, count]
  );
  return rows;
}

export async function createQuestion(env: Env, input: {
  exam_id: string;
  question: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  points: number;
  order_index: number;
}): Promise<any> {
  const { rows } = await getDb(env).query<any>(
    `INSERT INTO exam_questions (exam_id, question, question_type, options, correct_answer, points, order_index)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      input.exam_id, input.question, input.question_type, JSON.stringify(input.options),
      input.correct_answer, input.points, input.order_index,
    ]
  );
  return rows[0];
}

export async function updateQuestion(env: Env, id: string, input: Partial<{
  question: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  points: number;
  order_index: number;
}>): Promise<any | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (input.question !== undefined) { fields.push(`question = $${paramIndex}`); values.push(input.question); paramIndex++; }
  if (input.question_type !== undefined) { fields.push(`question_type = $${paramIndex}`); values.push(input.question_type); paramIndex++; }
  if (input.options !== undefined) { fields.push(`options = $${paramIndex}`); values.push(JSON.stringify(input.options)); paramIndex++; }
  if (input.correct_answer !== undefined) { fields.push(`correct_answer = $${paramIndex}`); values.push(input.correct_answer); paramIndex++; }
  if (input.points !== undefined) { fields.push(`points = $${paramIndex}`); values.push(input.points); paramIndex++; }
  if (input.order_index !== undefined) { fields.push(`order_index = $${paramIndex}`); values.push(input.order_index); paramIndex++; }

  if (fields.length === 0) return null;
  values.push(id);

  const { rows } = await getDb(env).query<any>(
    `UPDATE exam_questions SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteQuestion(env: Env, id: string): Promise<boolean> {
  const { rows } = await getDb(env).query<any>('DELETE FROM exam_questions WHERE id = $1 RETURNING id', [id]);
  return rows.length > 0;
}

export async function getActiveAttempt(env: Env, examId: string, userId: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    `SELECT * FROM exam_attempts WHERE exam_id = $1 AND user_id = $2 AND status = 'in_progress' ORDER BY started_at DESC LIMIT 1`,
    [examId, userId]
  );
  return rows[0] || null;
}

export async function countAttempts(env: Env, examId: string, userId: string): Promise<number> {
  const { rows } = await getDb(env).query<any>(
    "SELECT COUNT(*)::int as total FROM exam_attempts WHERE exam_id = $1 AND user_id = $2 AND status != 'abandoned'",
    [examId, userId]
  );
  return Number(rows[0]?.total) || 0;
}

export async function getAttemptsByExam(env: Env, examId: string): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT ea.*, u.name as user_name, u.email as user_email
     FROM exam_attempts ea
     JOIN users u ON ea.user_id = u.id
     WHERE ea.exam_id = $1
     ORDER BY ea.started_at DESC`,
    [examId]
  );
  return rows;
}

export async function updateAttemptManualGrade(
  env: Env,
  attemptId: string,
  manualScore: number,
  reviewed = true
): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    `UPDATE exam_attempts SET manual_score = $2, reviewed = $3, score = $2 WHERE id = $1 RETURNING *`,
    [attemptId, manualScore, reviewed]
  );
  return rows[0] || null;
}

export async function duplicateExam(env: Env, examId: string, newTitle: string): Promise<any | null> {
  const source = await getExamById(env, examId);
  if (!source) return null;

  const exam = await createExam(env, {
    course_id: source.course_id,
    title: newTitle,
    description: source.description,
    duration_minutes: source.duration_minutes,
    passing_score: source.passing_score,
    max_attempts: source.max_attempts,
    shuffle_questions: source.shuffle_questions,
    show_results: source.show_results,
    is_published: false,
    starts_at: null,
    ends_at: null,
    instructions: source.instructions,
    random_questions_count: source.random_questions_count,
    negative_marking: source.negative_marking,
    negative_percentage: source.negative_percentage,
  });

  const questions = await getQuestionsByExam(env, examId);
  for (const q of questions) {
    await createQuestion(env, {
      exam_id: exam.id,
      question: q.question,
      question_type: q.question_type,
      options: q.options,
      correct_answer: q.correct_answer,
      points: q.points,
      order_index: q.order_index,
    });
  }

  return getExamById(env, exam.id);
}

export async function updateAttemptFlags(env: Env, attemptId: string, flaggedQuestions: string[]): Promise<void> {
  await getDb(env).query(
    'UPDATE exam_attempts SET flagged_answers = $1 WHERE id = $2',
    [JSON.stringify(flaggedQuestions), attemptId]
  );
}

export async function getAllActiveAttempts(env: Env, instructorId?: string): Promise<any[]> {
  let sql = `SELECT ea.*, e.title as exam_title, e.duration_minutes, e.course_id,
            c.title as course_title, u.name as user_name, u.email as user_email, u.avatar as user_avatar
     FROM exam_attempts ea
     JOIN exams e ON ea.exam_id = e.id
     JOIN courses c ON e.course_id = c.id
     JOIN users u ON ea.user_id = u.id
     WHERE ea.status = 'in_progress'`;

  const params: any[] = [];
  if (instructorId) {
    params.push(instructorId);
    sql += ` AND c.instructor_id = $1`;
  }

  sql += ` ORDER BY ea.started_at DESC`;

  const { rows } = await getDb(env).query<any>(sql, params);
  return rows;
}

// ── Proctoring recordings ────────────────────────────────────────────────

export async function saveRecording(
  env: Env,
  attemptId: string,
  recordingUrl: string,
  durationSeconds: number,
  fileSizeBytes: number
): Promise<any | null> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const { rows } = await getDb(env).query<any>(
    `INSERT INTO exam_proctoring_recordings (attempt_id, s3_url, duration_seconds, file_size_bytes, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (attempt_id) DO UPDATE SET s3_url = $2, duration_seconds = $3, file_size_bytes = $4, expires_at = $5
     RETURNING *`,
    [attemptId, recordingUrl, durationSeconds, fileSizeBytes, expiresAt]
  );
  return rows[0] || null;
}

export async function getRecordingByAttemptId(env: Env, attemptId: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    'SELECT * FROM exam_proctoring_recordings WHERE attempt_id = $1',
    [attemptId]
  );
  return rows[0] || null;
}

export async function getRecordingsHistory(
  env: Env,
  limit = 20,
  offset = 0,
  search?: string,
  instructorId?: string
): Promise<{ recordings: any[]; total: number }> {
  let whereClause = `WHERE ea.status IN ('completed', 'timeout')`;
  const params: any[] = [];
  let paramIndex = 1;

  if (search) {
    whereClause += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (instructorId) {
    whereClause += ` AND c.instructor_id = $${paramIndex}`;
    params.push(instructorId);
    paramIndex++;
  }

  const db = getDb(env);
  const countResult = await db.query<any>(
    `SELECT COUNT(*)::int as total FROM exam_attempts ea
     JOIN users u ON ea.user_id = u.id
     JOIN exams e ON ea.exam_id = e.id
     JOIN courses c ON e.course_id = c.id
     ${whereClause}`,
    params
  );
  const total = Number(countResult.rows[0]?.total) || 0;

  const { rows } = await db.query<any>(
    `SELECT ea.id as attempt_id, ea.exam_id, ea.user_id, ea.started_at, ea.submitted_at,
            ea.score, ea.passed, ea.status,
            e.title as exam_title, e.course_id,
            c.title as course_title,
            u.name as user_name, u.email as user_email, u.avatar as user_avatar,
            epr.id as recording_id, epr.s3_url as recording_url,
            epr.duration_seconds, epr.file_size_bytes,
            epr.created_at as recording_created_at, epr.expires_at as recording_expires_at
     FROM exam_attempts ea
     JOIN exams e ON ea.exam_id = e.id
     JOIN courses c ON e.course_id = c.id
     JOIN users u ON ea.user_id = u.id
     LEFT JOIN exam_proctoring_recordings epr ON epr.attempt_id = ea.id
     ${whereClause}
     ORDER BY ea.submitted_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );
  return { recordings: rows, total };
}

export async function deleteRecordingById(env: Env, recordingId: string): Promise<boolean> {
  const db = getDb(env);
  const { rows } = await db.query<any>('SELECT * FROM exam_proctoring_recordings WHERE id = $1', [recordingId]);
  if (rows.length === 0) return false;
  // S3 deletion is skipped on Workers (recordings are supplied as URLs).
  await db.query('DELETE FROM exam_proctoring_recordings WHERE id = $1', [recordingId]);
  return true;
}

// ── Certificate auto-issue ───────────────────────────────────────────────

export function generateCertificateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand = (n: number) => {
    const bytes = new Uint8Array(n);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => chars[b % chars.length]).join('');
  };
  return `CERT-${rand(8)}-${rand(6)}`;
}

async function getTemplateById(env: Env, id: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    `SELECT ct.*, c.title as course_title
     FROM certificate_templates ct
     JOIN courses c ON ct.course_id = c.id
     WHERE ct.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function getEnrollment(env: Env, userId: string, courseId: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
    [userId, courseId]
  );
  return rows[0] || null;
}

async function getCertificateByUserAndCourse(env: Env, userId: string, courseId: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    'SELECT * FROM certificates WHERE user_id = $1 AND course_id = $2',
    [userId, courseId]
  );
  return rows[0] || null;
}

export async function autoIssueCertificateAfterExamPass(
  env: Env,
  exam: any,
  userId: string,
  courseId: string
): Promise<void> {
  try {
    if (!exam.certificate_template_id) return;
    const template = await getTemplateById(env, exam.certificate_template_id);
    if (!template || !template.requires_exam) return;

    const enrollment = await getEnrollment(env, userId, courseId);
    if (!enrollment?.completed) return;

    const existing = await getCertificateByUserAndCourse(env, userId, courseId);
    if (existing) return;

    const db = getDb(env);
    const verificationCode = generateCertificateCode();
    await db.query(
      `INSERT INTO certificates (user_id, course_id, certificate_url, verification_code, certificate_template_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, courseId, null, verificationCode, template.id]
    );

    const courseRes = await db.query<any>('SELECT title FROM courses WHERE id = $1', [courseId]);
    const courseTitle = courseRes.rows[0]?.title || 'Course';

    await db.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        userId,
        'New Certificate Earned!',
        `Congratulations! You earned a certificate for completing "${courseTitle}".`,
        'certificate',
      ]
    );

    // Socket.IO emits (new_notification / certificate_issued) are dropped on
    // Workers — the realtime Durable Object has no equivalent exam channel.
  } catch (e) {
    console.error('Failed to auto-issue certificate after exam pass:', e);
  }
}
