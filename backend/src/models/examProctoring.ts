import { query } from '../config/db';
import { uploadFile, deleteFile } from '../config/storage';

export interface ProctoringRecording {
  id: string;
  attempt_id: string;
  s3_url: string;
  duration_seconds: number;
  file_size_bytes: number;
  created_at: Date;
  expires_at: Date;
}

export async function saveRecording(
  attemptId: string,
  buffer: Buffer,
  fileName: string,
  durationSeconds: number
): Promise<ProctoringRecording | null> {
  const s3Url = await uploadFile(buffer, fileName, 'proctoring-recordings');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const { rows } = await query<ProctoringRecording>(
    `INSERT INTO exam_proctoring_recordings (attempt_id, s3_url, duration_seconds, file_size_bytes, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (attempt_id) DO UPDATE SET s3_url = $2, duration_seconds = $3, file_size_bytes = $4, expires_at = $5
     RETURNING *`,
    [attemptId, s3Url, durationSeconds, buffer.length, expiresAt]
  );
  return rows[0] || null;
}

export async function getRecordingByAttemptId(attemptId: string): Promise<ProctoringRecording | null> {
  const { rows } = await query<ProctoringRecording>(
    'SELECT * FROM exam_proctoring_recordings WHERE attempt_id = $1',
    [attemptId]
  );
  return rows[0] || null;
}

export async function getRecordingsHistory(
  limit: number = 20,
  offset: number = 0,
  search?: string
): Promise<{ recordings: any[]; total: number }> {
  let whereClause = 'WHERE ea.status IN (\'completed\', \'timeout\')';
  const params: any[] = [];
  let paramIndex = 1;

  if (search) {
    whereClause += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  const countResult = await query(
    `SELECT COUNT(*)::int as total FROM exam_attempts ea
     JOIN users u ON ea.user_id = u.id
     ${whereClause}`,
    params
  );
  const total = countResult.rows[0]?.total || 0;

  params.push(limit, offset);
  const { rows } = await query(
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
    params
  );
  return { recordings: rows, total };
}

export async function deleteRecordingById(recordingId: string): Promise<boolean> {
  const { rows } = await query<ProctoringRecording>(
    'SELECT * FROM exam_proctoring_recordings WHERE id = $1',
    [recordingId]
  );
  if (rows.length === 0) return false;
  try {
    await deleteFile(rows[0].s3_url);
  } catch { /* S3 delete best-effort */ }
  await query('DELETE FROM exam_proctoring_recordings WHERE id = $1', [recordingId]);
  return true;
}

export async function deleteExpiredRecordings(): Promise<number> {
  const { rows } = await query<ProctoringRecording>(
    "SELECT * FROM exam_proctoring_recordings WHERE expires_at < NOW()"
  );
  for (const rec of rows) {
    try {
      await deleteFile(rec.s3_url);
    } catch { /* S3 delete best-effort */ }
    await query('DELETE FROM exam_proctoring_recordings WHERE id = $1', [rec.id]);
  }
  return rows.length;
}
