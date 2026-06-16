import { query } from '../config/db';

export interface CodingChallenge {
  id: string;
  lesson_id: string;
  title: string;
  description: string;
  instructions: string;
  starter_code: string;
  test_code: string;
  language: string;
  difficulty: string;
  created_at: Date;
  updated_at: Date;
}

export interface ChallengeSubmission {
  id: string;
  challenge_id: string;
  user_id: string;
  code: string;
  passed: boolean;
  score: number | null;
  feedback: string | null;
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

export async function createChallenge(input: Partial<CodingChallenge>): Promise<CodingChallenge> {
  const { rows } = await query<CodingChallenge>(
    `INSERT INTO coding_challenges (lesson_id, title, description, instructions, starter_code, test_code, language, difficulty)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [input.lesson_id, input.title, input.description, input.instructions, input.starter_code, input.test_code, input.language || 'javascript', input.difficulty || 'easy']
  );
  return rows[0];
}

export async function updateChallenge(id: string, input: Partial<CodingChallenge>): Promise<CodingChallenge | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(value);
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

export async function deleteChallenge(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM coding_challenges WHERE id = $1', [id]);
  return (rowCount || 0) > 0;
}

export async function submitChallenge(input: {
  challenge_id: string;
  user_id: string;
  code: string;
  passed: boolean;
  score?: number;
}): Promise<ChallengeSubmission> {
  const { rows } = await query<ChallengeSubmission>(
    `INSERT INTO challenge_submissions (challenge_id, user_id, code, passed, score)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.challenge_id, input.user_id, input.code, input.passed, input.score || null]
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
