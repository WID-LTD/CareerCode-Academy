import { query } from '../config/db';

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
  created_at: Date;
  updated_at: Date;
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
  attempted_at: Date;
}

export async function createQuiz(input: {
  course_id: string;
  lesson_id?: string;
  title: string;
  description?: string;
  time_limit?: number;
  passing_score?: number;
  max_attempts?: number;
}): Promise<Quiz> {
  const { rows } = await query<Quiz>(`
    INSERT INTO quizzes (course_id, lesson_id, title, description, time_limit, passing_score, max_attempts)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [input.course_id, input.lesson_id || null, input.title, input.description || null, input.time_limit || 0, input.passing_score || 70, input.max_attempts || 1]);
  return rows[0];
}

export async function getQuizzesByCourse(courseId: string): Promise<Quiz[]> {
  const { rows } = await query<Quiz>(
    'SELECT * FROM quizzes WHERE course_id = $1 ORDER BY created_at ASC',
    [courseId]
  );
  return rows;
}

export async function getQuizById(id: string): Promise<Quiz | null> {
  const { rows } = await query<Quiz>('SELECT * FROM quizzes WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function updateQuiz(id: string, input: Partial<Quiz>): Promise<Quiz | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${snakeKey} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (fields.length === 0) return getQuizById(id);

  fields.push('updated_at = NOW()');
  values.push(id);

  const { rows } = await query<Quiz>(
    `UPDATE quizzes SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteQuiz(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM quizzes WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function createQuestion(input: {
  quiz_id: string;
  question: string;
  options: string[];
  correct_answer: string;
  points?: number;
  order_index?: number;
}): Promise<QuizQuestion> {
  const { rows } = await query<QuizQuestion>(`
    INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, points, order_index)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [input.quiz_id, input.question, JSON.stringify(input.options), input.correct_answer, input.points || 1, input.order_index || 0]);
  return rows[0];
}

export async function getQuestionsByQuiz(quizId: string): Promise<QuizQuestion[]> {
  const { rows } = await query<QuizQuestion>(
    'SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_index ASC',
    [quizId]
  );
  return rows;
}

export async function getQuestionById(id: string): Promise<QuizQuestion | null> {
  const { rows } = await query<QuizQuestion>('SELECT * FROM quiz_questions WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function updateQuestion(id: string, input: Partial<QuizQuestion>): Promise<QuizQuestion | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${snakeKey} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (fields.length === 0) return getQuestionById(id);

  values.push(id);

  const { rows } = await query<QuizQuestion>(
    `UPDATE quiz_questions SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteQuestion(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM quiz_questions WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function createAttempt(input: {
  quiz_id: string;
  user_id: string;
  answers: any[];
  score: number;
  passed: boolean;
}): Promise<QuizAttempt> {
  const { rows } = await query<QuizAttempt>(`
    INSERT INTO quiz_attempts (quiz_id, user_id, answers, score, passed)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [input.quiz_id, input.user_id, JSON.stringify(input.answers), input.score, input.passed]);
  return rows[0];
}

export async function getAttempt(quizId: string, userId: string): Promise<QuizAttempt | null> {
  const { rows } = await query<QuizAttempt>(
    'SELECT * FROM quiz_attempts WHERE quiz_id = $1 AND user_id = $2',
    [quizId, userId]
  );
  return rows[0] || null;
}

export async function getAttemptsByQuiz(quizId: string): Promise<QuizAttempt[]> {
  const { rows } = await query<QuizAttempt>(
    'SELECT qa.*, u.name as user_name, u.email as user_email FROM quiz_attempts qa JOIN users u ON qa.user_id = u.id WHERE qa.quiz_id = $1 ORDER BY qa.attempted_at DESC',
    [quizId]
  );
  return rows;
}

export async function getAttemptsByUser(userId: string): Promise<any[]> {
  const { rows } = await query(`
    SELECT qa.*, q.title as quiz_title, c.title as course_title
    FROM quiz_attempts qa
    JOIN quizzes q ON qa.quiz_id = q.id
    JOIN courses c ON q.course_id = c.id
    WHERE qa.user_id = $1
    ORDER BY qa.attempted_at DESC
  `, [userId]);
  return rows;
}