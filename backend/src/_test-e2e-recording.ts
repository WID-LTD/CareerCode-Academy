import dotenv from 'dotenv';
dotenv.config();

import { query } from './config/db';
import * as ExamProctoringModel from './models/examProctoring';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

let studentUserId: string;
let adminUserId: string;
let courseId: string;
let examId: string;
let attemptId: string;

async function seed(): Promise<void> {
  const pwHash = '$2a$10$uMTmv1m2SA3nimppZD5d4ONOiSG1BJt2CqUuQLtbioTq0XMU4iVd6';

  const s = await query(
    `INSERT INTO users (name, email, password, role, is_verified) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    ['E2E Student', `e2e-${Date.now()}@test.local`, pwHash, 'student', true]
  );
  studentUserId = s.rows[0].id;

  const a = await query(
    `INSERT INTO users (name, email, password, role, is_verified) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    ['E2E Admin', `e2e-admin-${Date.now()}@test.local`, pwHash, 'admin', true]
  );
  adminUserId = a.rows[0].id;

  const c = await query(
    `INSERT INTO courses (title,description,category,instructor_id,price,slug) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    ['E2E Course','E2E course','testing',adminUserId,0,`e2e-${Date.now()}`]
  );
  courseId = c.rows[0].id;

  await query('INSERT INTO enrollments (user_id,course_id) VALUES ($1,$2)', [studentUserId, courseId]);

  const e = await query(
    `INSERT INTO exams (course_id,title,description,duration_minutes,passing_score,is_published) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [courseId, 'E2E Exam','E2E exam',30,70,true]
  );
  examId = e.rows[0].id;

  await query(
    `INSERT INTO exam_questions (exam_id,question,question_type,options,correct_answer,points,order_index) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [examId,'E2E test?','mcq',JSON.stringify([{text:'A'},{text:'B'}]),'A',1,0]
  );

  const att = await query(
    `INSERT INTO exam_attempts (exam_id,user_id,status) VALUES ($1,$2,'in_progress') RETURNING id`,
    [examId, studentUserId]
  );
  attemptId = att.rows[0].id;

  console.log('✓ Seed data created');
}

function generateMinimalWebm(): Buffer {
  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const p = path.join(tmpDir, 'test.webm');
  execSync(`ffmpeg -y -f lavfi -i color=c=black:s=2x2:d=1 -c:v libvpx -b:v 10k -an "${p}" 2>nul`, { timeout: 10000 });
  const buf = fs.readFileSync(p);
  fs.unlinkSync(p);
  console.log(`✓ WEBM generated (${buf.length} bytes)`);
  return buf;
}

async function cleanup(): Promise<void> {
  for (const id of [attemptId]) {
    if (id) await query('DELETE FROM exam_proctoring_recordings WHERE attempt_id = $1', [id]);
    if (id) await query('DELETE FROM exam_answers WHERE attempt_id = $1', [id]);
    if (id) await query('DELETE FROM exam_attempts WHERE id = $1', [id]);
  }
  if (examId) await query('DELETE FROM exam_questions WHERE exam_id = $1', [examId]);
  if (examId) await query('DELETE FROM exams WHERE id = $1', [examId]);
  if (courseId) await query('DELETE FROM enrollments WHERE user_id = $1', [studentUserId]);
  if (courseId) await query('DELETE FROM courses WHERE id = $1', [courseId]);
  if (studentUserId) await query('DELETE FROM users WHERE id = $1', [studentUserId]);
  if (adminUserId) await query('DELETE FROM users WHERE id = $1', [adminUserId]);
  console.log('✓ Cleanup complete');
}

async function main() {
  console.log('\n═══ CareerCode Academy — E2E Recording Pipeline Test ═══\n');

  try {
    // Phase 1: Seed
    console.log('▶ Phase 1: Seeding test data...');
    await seed();

    // Phase 2: Save recording directly (calls uploadFile → S3)
    console.log('▶ Phase 2: Saving recording to S3...');
    const webmBuf = generateMinimalWebm();
    const recording = await ExamProctoringModel.saveRecording(
      attemptId,
      webmBuf,
      `exam-${examId}-${attemptId}.webm`,
      1
    );
    if (!recording) throw new Error('saveRecording returned null');
    const s3Url = recording.s3_url;
    console.log(`  → S3 URL: ${s3Url}`);

    // Phase 3: Submit attempt
    console.log('▶ Phase 3: Submitting attempt...');
    await query(
      `UPDATE exam_attempts SET submitted_at=NOW(), score=0, passed=false, status='completed' WHERE id=$1`,
      [attemptId]
    );

    // Phase 4: Admin history
    console.log('▶ Phase 4: Verifying admin history...');
    const history = await ExamProctoringModel.getRecordingsHistory(20, 0);
    const match = history.recordings.find((r: any) => r.attempt_id === attemptId);
    if (!match) throw new Error('Recording not found in admin history');
    if (match.recording_url !== s3Url) throw new Error('S3 URL mismatch in history');
    console.log(`  → Found in history (${history.total} total)`);

    // Phase 5: Fetch by attempt
    console.log('▶ Phase 5: Fetching by attempt ID...');
    const fetched = await ExamProctoringModel.getRecordingByAttemptId(attemptId);
    if (!fetched) throw new Error('Recording not found by attempt ID');
    if (fetched.s3_url !== s3Url) throw new Error('S3 URL mismatch in direct fetch');
    console.log('  → Direct fetch OK');

    // Phase 6: Verify S3 accessible
    console.log('▶ Phase 6: Verifying S3 recording is accessible...');
    const headRes = await fetch(s3Url, { method: 'HEAD' });
    if (headRes.status !== 200) throw new Error(`S3 not accessible (HTTP ${headRes.status})`);
    console.log(`  → Recording accessible (${headRes.headers.get('content-length') || '?'} bytes)`);

    console.log('\n═══ ✅ ALL TESTS PASSED ═══\n');
  } catch (err) {
    console.error('\n═══ ❌ TEST FAILED ═══');
    console.error(err);
    process.exitCode = 1;
  } finally {
    await cleanup();
  }
}

main();
