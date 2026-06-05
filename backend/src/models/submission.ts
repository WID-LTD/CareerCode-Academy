import { query } from '../config/db';

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  file_url: string | null;
  score: number | null;
  feedback: string | null;
  submitted_at: Date;
}

export interface CreateSubmissionInput {
  assignment_id: string;
  student_id: string;
  file_url?: string;
}

export interface GradeSubmissionInput {
  score: number;
  feedback?: string;
}

export async function createSubmission(input: CreateSubmissionInput): Promise<Submission> {
  const { rows } = await query<Submission>(
    `INSERT INTO submissions (assignment_id, student_id, file_url)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.assignment_id, input.student_id, input.file_url || null]
  );
  return rows[0];
}

export async function getSubmissionById(id: string): Promise<Submission | null> {
  const { rows } = await query<Submission>(
    `SELECT s.*, u.name as student_name, u.email as student_email
     FROM submissions s
     JOIN users u ON s.student_id = u.id
     WHERE s.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function getSubmissionsByAssignment(assignmentId: string): Promise<Submission[]> {
  const { rows } = await query<Submission>(
    `SELECT s.*, u.name as student_name, u.email as student_email
     FROM submissions s
     JOIN users u ON s.student_id = u.id
     WHERE s.assignment_id = $1
     ORDER BY s.submitted_at DESC`,
    [assignmentId]
  );
  return rows;
}

export async function getSubmissionsByStudent(studentId: string): Promise<Submission[]> {
  const { rows } = await query<Submission>(
    `SELECT s.*, a.title as assignment_title, a.max_score
     FROM submissions s
     JOIN assignments a ON s.assignment_id = a.id
     WHERE s.student_id = $1
     ORDER BY s.submitted_at DESC`,
    [studentId]
  );
  return rows;
}

export async function gradeSubmission(id: string, input: GradeSubmissionInput): Promise<Submission | null> {
  const { rows } = await query<Submission>(
    `UPDATE submissions SET score = $1, feedback = $2 WHERE id = $3 RETURNING *`,
    [input.score, input.feedback || null, id]
  );
  return rows[0] || null;
}

export async function getSubmissionByStudentAndAssignment(studentId: string, assignmentId: string): Promise<Submission | null> {
  const { rows } = await query<Submission>(
    'SELECT * FROM submissions WHERE student_id = $1 AND assignment_id = $2',
    [studentId, assignmentId]
  );
  return rows[0] || null;
}
