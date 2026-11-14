import type { DbClient } from './db';

// Quiz model helpers, ported from backend/src/models/quiz.ts.
// SQL is unchanged Postgres; the D1 client translates it via sql-compat.ts.

export interface Quiz {
  id: string;
  course_id: string;
  lesson_id: string | null;
  title: string;
  description: string | null;
  time_limit: number;
  passing_score: number;
  max_attempts: number;
  published: boolean;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  options: string[];
  correct_answer: string;
  points: number;
  order_index: number;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  answers: any[];
  score: number;
  passed: boolean;
  attempt_count?: number;
  attempted_at: string;
}

export async function createQuiz(db: DbClient, input: {
  course_id: string;
  lesson_id?: string;
  title: string;
  description?: string;
  time_limit?: number;
  passing_score?: number;
  max_attempts?: number;
  due_date?: string;
}): Promise<Quiz> {
  const { rows } = await db.query<Quiz>(
    `INSERT INTO quizzes (course_id, lesson_id, title, description, time_limit, passing_score, max_attempts, due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.course_id, input.lesson_id || null, input.title, input.description || null,
      input.time_limit || 0, input.passing_score || 70, input.max_attempts || 1, input.due_date || null,
    ]
  );
  return rows[0];
}

export async function getQuizzesByCourse(db: DbClient, courseId: string): Promise<Quiz[]> {
  const { rows } = await db.query<Quiz>(
    'SELECT * FROM quizzes WHERE course_id = $1 ORDER BY created_at ASC',
    [courseId]
  );
  return rows;
}

export async function getQuizById(db: DbClient, id: string): Promise<Quiz | null> {
  const { rows } = await db.query<Quiz>('SELECT * FROM quizzes WHERE id = $1', [id]);
  return rows[0] || null;
}

const QUIZ_COLUMNS: Record<string, string> = {
  courseId: 'course_id',
  course_id: 'course_id',
  lessonId: 'lesson_id',
  lesson_id: 'lesson_id',
  title: 'title',
  description: 'description',
  timeLimit: 'time_limit',
  time_limit: 'time_limit',
  passingScore: 'passing_score',
  passing_score: 'passing_score',
  maxAttempts: 'max_attempts',
  max_attempts: 'max_attempts',
  published: 'published',
  dueDate: 'due_date',
  due_date: 'due_date',
};

function snakeKey(key: string): string {
  return key.replace(/([A-Z])/g, '_$1').toLowerCase();
}

export async function updateQuiz(db: DbClient, id: string, input: Record<string, any>): Promise<Quiz | null> {
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(input || {})) {
    if (value === undefined) continue;
    const col = QUIZ_COLUMNS[key] || QUIZ_COLUMNS[snakeKey(key)];
    if (!col) continue;
    fields.push(`${col} = $${values.length + 1}`);
    values.push(value);
  }

  if (fields.length === 0) return getQuizById(db, id);

  fields.push('updated_at = NOW()');
  values.push(id);

  const { rows } = await db.query<Quiz>(
    `UPDATE quizzes SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteQuiz(db: DbClient, id: string): Promise<boolean> {
  const { rows } = await db.query('DELETE FROM quizzes WHERE id = $1 RETURNING id', [id]);
  return rows.length > 0;
}

export async function createQuestion(db: DbClient, input: {
  quiz_id: string;
  question: string;
  options: string[];
  correct_answer: string;
  points?: number;
  order_index?: number;
}): Promise<QuizQuestion> {
  const { rows } = await db.query<QuizQuestion>(
    `INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, points, order_index)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.quiz_id, input.question, JSON.stringify(input.options),
      input.correct_answer, input.points || 1, input.order_index || 0,
    ]
  );
  return rows[0];
}

export async function getQuestionsByQuiz(db: DbClient, quizId: string): Promise<QuizQuestion[]> {
  const { rows } = await db.query<QuizQuestion>(
    'SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_index ASC',
    [quizId]
  );
  return rows;
}

export async function getQuestionById(db: DbClient, id: string): Promise<QuizQuestion | null> {
  const { rows } = await db.query<QuizQuestion>('SELECT * FROM quiz_questions WHERE id = $1', [id]);
  return rows[0] || null;
}

const QUESTION_COLUMNS: Record<string, string> = {
  quizId: 'quiz_id',
  quiz_id: 'quiz_id',
  question: 'question',
  options: 'options',
  correctAnswer: 'correct_answer',
  correct_answer: 'correct_answer',
  points: 'points',
  orderIndex: 'order_index',
  order_index: 'order_index',
};

export async function updateQuestion(db: DbClient, id: string, input: Record<string, any>): Promise<QuizQuestion | null> {
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(input || {})) {
    if (value === undefined) continue;
    const col = QUESTION_COLUMNS[key] || QUESTION_COLUMNS[snakeKey(key)];
    if (!col) continue;
    fields.push(`${col} = $${values.length + 1}`);
    values.push(col === 'options' ? JSON.stringify(value) : value);
  }

  if (fields.length === 0) return getQuestionById(db, id);

  values.push(id);
  const { rows } = await db.query<QuizQuestion>(
    `UPDATE quiz_questions SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteQuestion(db: DbClient, id: string): Promise<boolean> {
  const { rows } = await db.query('DELETE FROM quiz_questions WHERE id = $1 RETURNING id', [id]);
  return rows.length > 0;
}

export async function createAttempt(db: DbClient, input: {
  quiz_id: string;
  user_id: string;
  answers: any[];
  score: number;
  passed: boolean;
}): Promise<QuizAttempt> {
  const { rows } = await db.query<QuizAttempt>(
    `INSERT INTO quiz_attempts (quiz_id, user_id, answers, score, passed)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.quiz_id, input.user_id, JSON.stringify(input.answers), input.score, input.passed]
  );
  return rows[0];
}

export async function getAttempt(db: DbClient, quizId: string, userId: string): Promise<QuizAttempt | null> {
  const { rows } = await db.query<QuizAttempt>(
    'SELECT * FROM quiz_attempts WHERE quiz_id = $1 AND user_id = $2',
    [quizId, userId]
  );
  return rows[0] || null;
}

export async function getAttemptsByQuiz(db: DbClient, quizId: string): Promise<any[]> {
  const { rows } = await db.query<any>(
    `SELECT qa.*, u.name as user_name, u.email as user_email
     FROM quiz_attempts qa
     JOIN users u ON qa.user_id = u.id
     WHERE qa.quiz_id = $1
     ORDER BY qa.attempted_at DESC`,
    [quizId]
  );
  return rows;
}

export async function getAttemptsByUser(db: DbClient, userId: string): Promise<any[]> {
  const { rows } = await db.query<any>(
    `SELECT qa.*, q.title as quiz_title, c.title as course_title
     FROM quiz_attempts qa
     JOIN quizzes q ON qa.quiz_id = q.id
     JOIN courses c ON q.course_id = c.id
     WHERE qa.user_id = $1
     ORDER BY qa.attempted_at DESC`,
    [userId]
  );
  return rows;
}

// Ported from backend/src/models/gamification.ts loseHeart().
// GREATEST() is not portable to SQLite, so the clamp happens in JS.
export async function loseHeart(db: DbClient, userId: string): Promise<number> {
  const { rows } = await db.query<{ hearts: number }>('SELECT hearts FROM users WHERE id = $1', [userId]);
  if (!rows.length) return 0;
  const hearts = Math.max(0, (Number(rows[0].hearts) || 0) - 1);
  await db.query('UPDATE users SET hearts = $1, updated_at = NOW() WHERE id = $2', [hearts, userId]);
  return hearts;
}
