import { query } from '../config/db';

export interface CodingChallenge {
  id: string;
  lesson_id: string;
  title: string;
  description: string;
  instructions: string;
  type: string;
  starter_code: string;
  test_code: string;
  expected_output: string | null;
  test_cases: any[];
  timeout_seconds: number;
  language: string;
  difficulty: string;
  submission_type: string;
  allowed_file_types: string;
  rubric: any[];
  max_file_size: number;
  created_at: Date;
  updated_at: Date;
}

export interface ChallengeSubmission {
  id: string;
  challenge_id: string;
  user_id: string;
  code: string;
  file_url: string | null;
  text_answer: string | null;
  passed: boolean;
  score: number | null;
  feedback: string | null;
  output: string | null;
  expected_output: string | null;
  test_results: any[] | null;
  submitted_at: Date;
}

export async function getChallengesByLesson(lessonId: string): Promise<CodingChallenge[]> {
  const { rows } = await query<CodingChallenge>(
    'SELECT * FROM coding_challenges WHERE lesson_id = $1 ORDER BY created_at ASC',
    [lessonId]
  );
  return rows;
}

export async function getChallengeById(id: string): Promise<CodingChallenge | null> {
  const { rows } = await query<CodingChallenge>(
    'SELECT * FROM coding_challenges WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

export async function getChallengesByCourse(courseId: string): Promise<CodingChallenge[]> {
  const { rows } = await query<CodingChallenge>(
    `SELECT cc.* FROM coding_challenges cc
     JOIN lessons l ON cc.lesson_id = l.id
     WHERE l.course_id = $1
     ORDER BY l.order_index, cc.created_at`,
    [courseId]
  );
  return rows;
}

export async function createChallenge(input: {
  lesson_id: string;
  title: string;
  description: string;
  instructions: string;
  type?: string;
  starter_code?: string;
  test_code?: string;
  expected_output?: string;
  test_cases?: any[];
  timeout_seconds?: number;
  language?: string;
  difficulty?: string;
  submission_type?: string;
  allowed_file_types?: string;
  rubric?: any[];
  max_file_size?: number;
}): Promise<CodingChallenge> {
  const { rows } = await query<CodingChallenge>(
    `INSERT INTO coding_challenges (lesson_id, title, description, instructions, type, starter_code, test_code, expected_output, test_cases, timeout_seconds, language, difficulty, submission_type, allowed_file_types, rubric, max_file_size)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
    [
      input.lesson_id, input.title, input.description, input.instructions,
      input.type || 'code',
      input.starter_code || '', input.test_code || '',
      input.expected_output || null, JSON.stringify(input.test_cases || []),
      input.timeout_seconds || 5, input.language || 'javascript', input.difficulty || 'easy',
      input.submission_type || '', input.allowed_file_types || '', JSON.stringify(input.rubric || []),
      input.max_file_size || 10,
    ]
  );
  return rows[0];
}

export async function updateChallenge(id: string, input: Partial<CodingChallenge>): Promise<CodingChallenge | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      const dbKey = snakeKey === 'starter_code' ? 'starter_code' : snakeKey === 'test_code' ? 'test_code' : snakeKey === 'expected_output' ? 'expected_output' : snakeKey === 'test_cases' ? 'test_cases' : snakeKey === 'timeout_seconds' ? 'timeout_seconds' : snakeKey === 'submission_type' ? 'submission_type' : snakeKey === 'allowed_file_types' ? 'allowed_file_types' : snakeKey === 'max_file_size' ? 'max_file_size' : snakeKey;
      fields.push(`${dbKey} = $${idx++}`);
      values.push(dbKey === 'test_cases' || dbKey === 'rubric' ? JSON.stringify(value) : value);
    }
  }
  if (fields.length === 0) return null;
  values.push(id);
  const { rows } = await query<CodingChallenge>(
    `UPDATE coding_challenges SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function ensureColumns(): Promise<void> {
  try {
    await query(`ALTER TABLE coding_challenges ADD COLUMN IF NOT EXISTS expected_output TEXT`);
    await query(`ALTER TABLE coding_challenges ADD COLUMN IF NOT EXISTS test_cases JSONB DEFAULT '[]'::jsonb`);
    await query(`ALTER TABLE coding_challenges ADD COLUMN IF NOT EXISTS timeout_seconds INTEGER DEFAULT 5`);
    await query(`ALTER TABLE coding_challenges ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'code'`);
    await query(`ALTER TABLE coding_challenges ADD COLUMN IF NOT EXISTS submission_type VARCHAR(50) DEFAULT ''`);
    await query(`ALTER TABLE coding_challenges ADD COLUMN IF NOT EXISTS allowed_file_types VARCHAR(500) DEFAULT ''`);
    await query(`ALTER TABLE coding_challenges ADD COLUMN IF NOT EXISTS rubric JSONB DEFAULT '[]'::jsonb`);
    await query(`ALTER TABLE coding_challenges ADD COLUMN IF NOT EXISTS max_file_size INTEGER DEFAULT 10`);
    await query(`ALTER TABLE challenge_submissions ADD COLUMN IF NOT EXISTS output TEXT`);
    await query(`ALTER TABLE challenge_submissions ADD COLUMN IF NOT EXISTS expected_output TEXT`);
    await query(`ALTER TABLE challenge_submissions ADD COLUMN IF NOT EXISTS test_results JSONB DEFAULT '[]'::jsonb`);
    await query(`ALTER TABLE challenge_submissions ADD COLUMN IF NOT EXISTS file_url TEXT`);
    await query(`ALTER TABLE challenge_submissions ADD COLUMN IF NOT EXISTS text_answer TEXT`);
  } catch {
    // columns may already exist
  }
}

export async function deleteChallenge(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM coding_challenges WHERE id = $1', [id]);
  return (rowCount || 0) > 0;
}

export async function submitChallenge(input: {
  challenge_id: string;
  user_id: string;
  code?: string;
  file_url?: string;
  text_answer?: string;
  passed: boolean;
  score?: number;
  output?: string;
  expected_output?: string;
  test_results?: any[];
}): Promise<ChallengeSubmission> {
  const { rows } = await query<ChallengeSubmission>(
    `INSERT INTO challenge_submissions (challenge_id, user_id, code, file_url, text_answer, passed, score, output, expected_output, test_results)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      input.challenge_id, input.user_id, input.code || '',
      input.file_url || null, input.text_answer || null, input.passed,
      input.score || null, input.output || null, input.expected_output || null,
      JSON.stringify(input.test_results || [])
    ]
  );
  return rows[0];
}

export async function getSubmissionByUserAndChallenge(userId: string, challengeId: string): Promise<ChallengeSubmission | null> {
  const { rows } = await query<ChallengeSubmission>(
    'SELECT * FROM challenge_submissions WHERE user_id = $1 AND challenge_id = $2 ORDER BY submitted_at DESC LIMIT 1',
    [userId, challengeId]
  );
  return rows[0] || null;
}

export async function getSubmissionsByChallenge(challengeId: string): Promise<any[]> {
  const { rows } = await query(
    `SELECT cs.*, u.name as user_name, u.email as user_email
     FROM challenge_submissions cs
     JOIN users u ON cs.user_id = u.id
     WHERE cs.challenge_id = $1
     ORDER BY cs.submitted_at DESC`,
    [challengeId]
  );
  return rows;
}

export async function gradeChallengeSubmission(id: string, score: number, feedback: string): Promise<ChallengeSubmission | null> {
  const { rows } = await query<ChallengeSubmission>(
    'UPDATE challenge_submissions SET score = $1, feedback = $2 WHERE id = $3 RETURNING *',
    [score, feedback, id]
  );
  return rows[0] || null;
}

export async function getAllChallengesForInstructor(instructorId: string): Promise<any[]> {
  const { rows } = await query(
    `SELECT cc.*, l.title as lesson_title, c.title as course_title
     FROM coding_challenges cc
     JOIN lessons l ON cc.lesson_id = l.id
     JOIN courses c ON l.course_id = c.id
     WHERE c.instructor_id = $1
     ORDER BY cc.created_at DESC`,
    [instructorId]
  );
  return rows;
}