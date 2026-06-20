import { Router, Request, Response } from 'express';
import { query } from '../config/db';

const router = Router();

interface SeedResult {
  studentUserId: string;
  studentEmail: string;
  adminUserId: string;
  adminEmail: string;
  courseId: string;
  examId: string;
  attemptId: string;
}

let lastSeed: SeedResult | null = null;

// POST /api/v1/test/seed
router.post('/seed', async (_req: Request, res: Response) => {
  try {
    if (lastSeed) {
      await cleanupInternal(lastSeed);
    }

    const testPasswordHash = '$2a$10$uMTmv1m2SA3nimppZD5d4ONOiSG1BJt2CqUuQLtbioTq0XMU4iVd6';
    const studentEmail = `e2e-student-${Date.now()}@test.local`;
    const studentRes = await query(
      `INSERT INTO users (name, email, password, role, is_verified) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      ['E2E Student', studentEmail, testPasswordHash, 'student', true]
    );
    const studentUserId = studentRes.rows[0].id;

    const adminEmail = `e2e-admin-${Date.now()}@test.local`;
    const adminRes = await query(
      `INSERT INTO users (name, email, password, role, is_verified) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      ['E2E Admin', adminEmail, testPasswordHash, 'admin', true]
    );
    const adminUserId = adminRes.rows[0].id;

    const courseRes = await query(
      `INSERT INTO courses (title, description, category, instructor_id, price, slug) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      ['E2E Course', 'E2E course for testing', 'testing', adminUserId, 0, `e2e-course-${Date.now()}`]
    );
    const courseId = courseRes.rows[0].id;

    await query(
      'INSERT INTO enrollments (user_id, course_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [studentUserId, courseId]
    );

    const examRes = await query(
      `INSERT INTO exams (course_id, title, description, duration_minutes, passing_score, is_published) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [courseId, 'E2E Exam', 'E2E exam', 30, 70, true]
    );
    const examId = examRes.rows[0].id;

    await query(
      `INSERT INTO exam_questions (exam_id, question, question_type, options, correct_answer, points, order_index) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [examId, 'E2E test question?', 'mcq', JSON.stringify([{ text: 'A' }, { text: 'B' }]), 'A', 1, 0]
    );

    const attemptRes = await query(
      `INSERT INTO exam_attempts (exam_id, user_id, status) VALUES ($1,$2,'in_progress') RETURNING id`,
      [examId, studentUserId]
    );
    const attemptId = attemptRes.rows[0].id;

    lastSeed = { studentUserId, studentEmail, adminUserId, adminEmail, courseId, examId, attemptId };

    res.json({
      success: true,
      data: {
        student: { id: studentUserId, email: studentEmail },
        admin: { id: adminUserId, email: adminEmail },
        course: { id: courseId },
        exam: { id: examId },
        attempt: { id: attemptId },
        password: 'dummy',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

async function cleanupInternal(s: SeedResult): Promise<void> {
  const { attemptId, examId, courseId, studentUserId, adminUserId } = s;
  await query('DELETE FROM exam_proctoring_recordings WHERE attempt_id = $1', [attemptId]);
  await query('DELETE FROM exam_answers WHERE attempt_id = $1', [attemptId]);
  await query('DELETE FROM exam_attempts WHERE id = $1', [attemptId]);
  await query('DELETE FROM exam_questions WHERE exam_id = $1', [examId]);
  await query('DELETE FROM exams WHERE id = $1', [examId]);
  await query('DELETE FROM enrollments WHERE user_id = $1', [studentUserId]);
  await query('DELETE FROM courses WHERE id = $1', [courseId]);
  await query('DELETE FROM users WHERE id = $1', [studentUserId]);
  await query('DELETE FROM users WHERE id = $1', [adminUserId]);
}

// POST /api/v1/test/cleanup
router.post('/cleanup', async (_req: Request, res: Response) => {
  try {
    if (lastSeed) {
      await cleanupInternal(lastSeed);
      lastSeed = null;
    }
    res.json({ success: true, message: 'Cleaned up' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
