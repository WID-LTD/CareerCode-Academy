import { query } from '../config/db';

export interface Exam {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  passing_score: number;
  max_attempts: number;
  shuffle_questions: boolean;
  show_results: boolean;
  is_published: boolean;
  starts_at: Date | null;
  ends_at: Date | null;
  instructions: string | null;
  random_questions_count: number;
  negative_marking: boolean;
  negative_percentage: number;
  certificate_template_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ExamQuestion {
  id: string;
  exam_id: string;
  question: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  points: number;
  order_index: number;
  created_at: Date;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  user_id: string;
  started_at: Date;
  submitted_at: Date | null;
  score: number;
  passed: boolean;
  status: string;
  flagged_answers: string[];
  manual_score: number | null;
  reviewed: boolean;
}

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

export async function createExam(input: CreateExamInput): Promise<Exam> {
  const { rows } = await query<Exam>(
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

export async function getAllExams(limit = 50, offset = 0): Promise<any[]> {
  const { rows } = await query(
    `SELECT e.*, c.title as course_title
     FROM exams e
     JOIN courses c ON e.course_id = c.id
     ORDER BY e.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

export async function getExamsByInstructor(userId: string, limit = 50, offset = 0): Promise<any[]> {
  const { rows } = await query(
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

export async function countExamsByInstructor(userId: string): Promise<number> {
  const { rows } = await query(
    `SELECT COUNT(*)::int as total
     FROM exams e
     JOIN courses c ON e.course_id = c.id
     WHERE c.instructor_id = $1`,
    [userId]
  );
  return rows[0]?.total || 0;
}

export async function countExams(): Promise<number> {
  const { rows } = await query('SELECT COUNT(*)::int as total FROM exams');
  return rows[0]?.total || 0;
}

export async function getExamById(id: string): Promise<any | null> {
  const { rows } = await query(
    `SELECT e.*, c.title as course_title
     FROM exams e
     JOIN courses c ON e.course_id = c.id
     WHERE e.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function updateExam(id: string, input: Partial<CreateExamInput>): Promise<Exam | null> {
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
  };

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && fieldMap[key]) {
      fields.push(`${fieldMap[key]} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (fields.length === 0) return getExamById(id) as Promise<Exam | null>;

  fields.push('updated_at = NOW()');
  values.push(id);

  const { rows } = await query<Exam>(
    `UPDATE exams SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteExam(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM exams WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function getExamsByCourse(courseId: string): Promise<Exam[]> {
  const { rows } = await query<Exam>(
    'SELECT * FROM exams WHERE course_id = $1 ORDER BY created_at DESC',
    [courseId]
  );
  return rows;
}

export async function getPublishedExamsByCourse(courseId: string): Promise<Exam[]> {
  const { rows } = await query<Exam>(
    'SELECT * FROM exams WHERE course_id = $1 AND is_published = true ORDER BY created_at DESC',
    [courseId]
  );
  return rows;
}

export async function getAvailableExamsForUser(userId: string): Promise<any[]> {
  const now = new Date().toISOString();
  const { rows } = await query(
    `SELECT e.*, c.title as course_title,
      (SELECT COUNT(*)::int FROM exam_attempts ea WHERE ea.exam_id = e.id AND ea.user_id = $1) as attempt_count,
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

export async function getStudentExamHistory(userId: string): Promise<any[]> {
  const { rows } = await query(
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

export async function getAttemptById(attemptId: string): Promise<any | null> {
  const { rows } = await query(
    `SELECT ea.*, e.title as exam_title, e.passing_score, e.show_results, e.duration_minutes, e.course_id
     FROM exam_attempts ea
     JOIN exams e ON ea.exam_id = e.id
     WHERE ea.id = $1`,
    [attemptId]
  );
  return rows[0] || null;
}

export async function createAttempt(examId: string, userId: string): Promise<ExamAttempt> {
  const { rows } = await query<ExamAttempt>(
    `INSERT INTO exam_attempts (exam_id, user_id, status) VALUES ($1, $2, 'in_progress') RETURNING *`,
    [examId, userId]
  );
  return rows[0];
}

export async function submitAttempt(attemptId: string, score: number, passed: boolean): Promise<ExamAttempt | null> {
  const { rows } = await query<ExamAttempt>(
    `UPDATE exam_attempts SET submitted_at = NOW(), score = $2, passed = $3, status = 'completed' WHERE id = $1 RETURNING *`,
    [attemptId, score, passed]
  );
  return rows[0] || null;
}

export async function timeoutAttempt(attemptId: string): Promise<ExamAttempt | null> {
  const { rows } = await query<ExamAttempt>(
    `UPDATE exam_attempts SET submitted_at = NOW(), status = 'timeout' WHERE id = $1 AND status = 'in_progress' RETURNING *`,
    [attemptId]
  );
  return rows[0] || null;
}

export async function saveAnswer(attemptId: string, questionId: string, answer: string, isCorrect: boolean, pointsEarned: number): Promise<any> {
  const { rows } = await query(
    `INSERT INTO exam_answers (attempt_id, question_id, answer, is_correct, points_earned)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (attempt_id, question_id) DO UPDATE SET answer = $3, is_correct = $4, points_earned = $5
     RETURNING *`,
    [attemptId, questionId, answer, isCorrect, pointsEarned]
  );
  return rows[0];
}

export async function getAnswersForAttempt(attemptId: string): Promise<any[]> {
  const { rows } = await query(
    `SELECT ea.*, eq.question, eq.correct_answer, eq.question_type, eq.options, eq.points
     FROM exam_answers ea
     JOIN exam_questions eq ON ea.question_id = eq.id
     WHERE ea.attempt_id = $1
     ORDER BY eq.order_index`,
    [attemptId]
  );
  return rows;
}

export async function getQuestionsByExam(examId: string): Promise<ExamQuestion[]> {
  const { rows } = await query<ExamQuestion>(
    'SELECT * FROM exam_questions WHERE exam_id = $1 ORDER BY order_index ASC',
    [examId]
  );
  return rows;
}

export async function getRandomQuestions(examId: string, count: number): Promise<ExamQuestion[]> {
  const { rows } = await query<ExamQuestion>(
    'SELECT * FROM exam_questions WHERE exam_id = $1 ORDER BY RANDOM() LIMIT $2',
    [examId, count]
  );
  return rows;
}

export async function createQuestion(input: {
  exam_id: string;
  question: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  points: number;
  order_index: number;
}): Promise<ExamQuestion> {
  const { rows } = await query<ExamQuestion>(
    `INSERT INTO exam_questions (exam_id, question, question_type, options, correct_answer, points, order_index)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [input.exam_id, input.question, input.question_type, JSON.stringify(input.options), input.correct_answer, input.points, input.order_index]
  );
  return rows[0];
}

export async function updateQuestion(id: string, input: Partial<{
  question: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  points: number;
  order_index: number;
}>): Promise<ExamQuestion | null> {
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

  const { rows } = await query<ExamQuestion>(
    `UPDATE exam_questions SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteQuestion(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM exam_questions WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function getActiveAttempt(examId: string, userId: string): Promise<ExamAttempt | null> {
  const { rows } = await query<ExamAttempt>(
    `SELECT * FROM exam_attempts WHERE exam_id = $1 AND user_id = $2 AND status = 'in_progress' ORDER BY started_at DESC LIMIT 1`,
    [examId, userId]
  );
  return rows[0] || null;
}

export async function countAttempts(examId: string, userId: string): Promise<number> {
  const { rows } = await query(
    'SELECT COUNT(*)::int as total FROM exam_attempts WHERE exam_id = $1 AND user_id = $2',
    [examId, userId]
  );
  return rows[0]?.total || 0;
}

export async function getAttemptsByExam(examId: string): Promise<any[]> {
  const { rows } = await query(
    `SELECT ea.*, u.name as user_name, u.email as user_email
     FROM exam_attempts ea
     JOIN users u ON ea.user_id = u.id
     WHERE ea.exam_id = $1
     ORDER BY ea.started_at DESC`,
    [examId]
  );
  return rows;
}

export async function updateAttemptManualGrade(attemptId: string, manualScore: number, reviewed: boolean = true): Promise<ExamAttempt | null> {
  const { rows } = await query<ExamAttempt>(
    `UPDATE exam_attempts SET manual_score = $2, reviewed = $3, score = $2 WHERE id = $1 RETURNING *`,
    [attemptId, manualScore, reviewed]
  );
  return rows[0] || null;
}

export async function duplicateExam(examId: string, newTitle: string): Promise<any | null> {
  const source = await getExamById(examId);
  if (!source) return null;

  const exam = await createExam({
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

  const questions = await getQuestionsByExam(examId);
  for (const q of questions) {
    await createQuestion({
      exam_id: exam.id,
      question: q.question,
      question_type: q.question_type,
      options: q.options,
      correct_answer: q.correct_answer,
      points: q.points,
      order_index: q.order_index,
    });
  }

  return getExamById(exam.id);
}

export async function updateAttemptFlags(attemptId: string, flaggedQuestions: string[]): Promise<void> {
  await query(
    'UPDATE exam_attempts SET flagged_answers = $1 WHERE id = $2',
    [JSON.stringify(flaggedQuestions), attemptId]
  );
}

export async function getAttemptCountsByExam(examId: string): Promise<{ total: number; completed: number; passed: number }> {
  const { rows } = await query(
    `SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status = 'completed' OR status = 'timeout')::int as completed,
      COUNT(*) FILTER (WHERE passed = true)::int as passed
     FROM exam_attempts WHERE exam_id = $1`,
    [examId]
  );
  return rows[0] || { total: 0, completed: 0, passed: 0 };
}
