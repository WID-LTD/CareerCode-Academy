import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, pageParams, requireAuth, requireRole, statusOf } from '../route-utils';
import type { TokenPayload } from '../auth-helpers';
import {
  abandonAttempt,
  autoIssueCertificateAfterExamPass,
  countAttempts,
  countExams,
  countExamsByInstructor,
  createAttempt,
  createExam,
  createQuestion,
  deleteExam,
  deleteQuestion,
  deleteRecordingById,
  duplicateExam,
  getAllActiveAttempts,
  getAllExams,
  getAnswersForAttempt,
  getAttemptById,
  getAttemptsByExam,
  getAvailableExamsForUser,
  getExamById,
  getExamsByInstructor,
  getQuestionsByExam,
  getRandomQuestions,
  getRecordingByAttemptId,
  getRecordingsHistory,
  getStudentExamHistory,
  getActiveAttempt,
  saveAnswer,
  saveRecording,
  submitAttempt,
  updateAttemptFlags,
  updateAttemptManualGrade,
  updateExam,
  updateQuestion,
} from '../exams';

const exams = new Hono<{ Bindings: Env }>();

const STAFF = ['instructor', 'admin', 'super_admin'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function httpError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

function addErr(errors: Record<string, string[]>, key: string, msg: string): void {
  if (!errors[key]) errors[key] = [];
  errors[key].push(msg);
}

// ── Request validation (replaces the Express zod schemas) ────────────────

function validateExamBody(body: any, mode: 'create' | 'update'): Record<string, string[]> | null {
  const errors: Record<string, string[]> = {};
  const b = body && typeof body === 'object' ? body : {};
  const required = mode === 'create';
  const provided = (key: string) => b[key] !== undefined;

  if (required || provided('courseId')) {
    if (!provided('courseId')) addErr(errors, 'courseId', 'Required');
    else if (typeof b.courseId !== 'string') addErr(errors, 'courseId', 'Expected string');
    else if (!UUID_RE.test(b.courseId)) addErr(errors, 'courseId', 'Invalid uuid');
  }

  if (required || provided('title')) {
    if (!provided('title')) addErr(errors, 'title', 'Required');
    else if (typeof b.title !== 'string') addErr(errors, 'title', 'Expected string');
    else if (b.title.length < 2) addErr(errors, 'title', 'String must contain at least 2 character(s)');
    else if (b.title.length > 200) addErr(errors, 'title', 'String must contain at most 200 character(s)');
  }

  for (const key of ['description', 'instructions']) {
    if (provided(key) && typeof b[key] !== 'string') addErr(errors, key, 'Expected string');
  }

  const ranges: Array<[string, number, number]> = [
    ['durationMinutes', 1, 480],
    ['passingScore', 0, 100],
    ['maxAttempts', 1, 10],
    ['randomQuestionsCount', 0, 200],
    ['negativePercentage', 0, 100],
  ];
  for (const [key, min, max] of ranges) {
    if (!provided(key)) continue;
    if (typeof b[key] !== 'number' || !Number.isFinite(b[key])) {
      addErr(errors, key, 'Expected number');
    } else if (b[key] < min) {
      addErr(errors, key, `Number must be greater than or equal to ${min}`);
    } else if (b[key] > max) {
      addErr(errors, key, `Number must be less than or equal to ${max}`);
    }
  }

  for (const key of ['shuffleQuestions', 'showResults', 'isPublished', 'negativeMarking']) {
    if (provided(key) && typeof b[key] !== 'boolean') addErr(errors, key, 'Expected boolean');
  }

  for (const key of ['startsAt', 'endsAt']) {
    const value = b[key];
    if (value === undefined || value === null || value === '') continue;
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) addErr(errors, key, 'Invalid datetime');
  }

  const templateId = b.certificateTemplateId;
  if (templateId !== undefined && templateId !== null) {
    if (typeof templateId !== 'string' || !UUID_RE.test(templateId)) {
      addErr(errors, 'certificateTemplateId', 'Invalid uuid');
    }
  }

  if (required && b.startsAt && b.endsAt && typeof b.startsAt === 'string' && typeof b.endsAt === 'string') {
    if (b.startsAt > b.endsAt) addErr(errors, 'endsAt', 'endsAt must be after startsAt');
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

function validateQuestionBody(body: any): Record<string, string[]> | null {
  const errors: Record<string, string[]> = {};
  const b = body && typeof body === 'object' ? body : {};

  if (typeof b.question !== 'string' || b.question.length < 1) {
    addErr(errors, 'question', 'String must contain at least 1 character(s)');
  }

  if (b.questionType !== undefined && !['mcq', 'true_false', 'essay'].includes(b.questionType)) {
    addErr(errors, 'questionType', "Invalid enum value. Expected 'mcq' | 'true_false' | 'essay'");
  }

  if (b.options !== undefined) {
    if (!Array.isArray(b.options) || b.options.some((o: any) => typeof o !== 'string')) {
      addErr(errors, 'options', 'Expected string[]');
    }
  }

  if (typeof b.correctAnswer !== 'string' || b.correctAnswer.length < 1) {
    addErr(errors, 'correctAnswer', 'String must contain at least 1 character(s)');
  }

  if (b.points !== undefined) {
    if (typeof b.points !== 'number' || !Number.isFinite(b.points) || b.points < 1) {
      addErr(errors, 'points', 'Number must be greater than or equal to 1');
    }
  }

  if (b.orderIndex !== undefined) {
    if (typeof b.orderIndex !== 'number' || !Number.isFinite(b.orderIndex) || b.orderIndex < 0) {
      addErr(errors, 'orderIndex', 'Number must be greater than or equal to 0');
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

// ── Shared helpers ───────────────────────────────────────────────────────

// Instructors may only touch exams that belong to their own courses.
async function verifyExamAccess(env: Env, examId: string, session: TokenPayload): Promise<void> {
  if (session.role !== 'instructor') return; // admin / super_admin always allowed
  const exam = await getExamById(env, examId);
  if (!exam) throw httpError('Exam not found', 404);
  const { rows } = await getDb(env).query<any>(
    'SELECT 1 FROM courses WHERE id = $1 AND instructor_id = $2',
    [exam.course_id, session.userId]
  );
  if (rows.length === 0) throw httpError('You do not have access to this exam', 403);
}

async function checkEnrolled(env: Env, courseId: string, userId: string): Promise<boolean> {
  try {
    const { rows } = await getDb(env).query<any>(
      'SELECT 1 FROM enrollments WHERE course_id = $1 AND user_id = $2',
      [courseId, userId]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

// Mirrors the Express certificate-template qualification check. Returns true
// when the student still has to complete the template's linked course.
async function certificateQualificationBlocked(env: Env, exam: any, userId: string): Promise<boolean> {
  if (!exam.certificate_template_id) return false;
  const { rows } = await getDb(env).query<any>(
    `SELECT ct.*, c.title as course_title
     FROM certificate_templates ct
     JOIN courses c ON ct.course_id = c.id
     WHERE ct.id = $1`,
    [exam.certificate_template_id]
  );
  const template = rows[0];
  if (!template) return false;

  const enrollment = await getDb(env).query<any>(
    'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
    [userId, template.course_id]
  );
  return !enrollment.rows.length || !enrollment.rows[0].completed;
}

function getExamScheduleStatus(exam: any): string {
  const now = new Date();
  if (exam.starts_at && new Date(exam.starts_at) > now) return 'upcoming';
  if (exam.ends_at && new Date(exam.ends_at) < now) return 'expired';
  return 'available';
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ───────────────────────── Admin / Instructor Routes ─────────────────────

// GET /api/v1/exams/courses — courses for the exam-creation dropdown
exams.get('/courses', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    let sql = `SELECT id, title FROM courses`;
    const params: any[] = [];
    if (s.role === 'instructor') {
      sql += ` WHERE instructor_id = $1`;
      params.push(s.userId);
    }
    sql += ` ORDER BY title`;
    const { rows } = await getDb(c.env).query<any>(sql, params);
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load courses');
  }
});

// GET /api/v1/exams — list all exams (admin/instructor)
exams.get('/', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const { page, limit, offset } = pageParams(c, 50);

    let rows: any[];
    let total: number;
    if (s.role === 'instructor') {
      rows = await getExamsByInstructor(c.env, s.userId, limit, offset);
      total = await countExamsByInstructor(c.env, s.userId);
    } else {
      rows = await getAllExams(c.env, limit, offset);
      total = await countExams(c.env);
    }

    return c.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load exams');
  }
});

// GET /api/v1/exams/:id — exam details with questions
exams.get('/:id', async (c) => {
  try {
    await requireRole(c, STAFF);
    const exam = await getExamById(c.env, c.req.param('id'));
    if (!exam) throw httpError('Exam not found', 404);

    const questions = await getQuestionsByExam(c.env, exam.id);
    return c.json({ success: true, data: { ...exam, questions } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load exam');
  }
});

// POST /api/v1/exams — create exam
exams.post('/', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const body: any = await c.req.json().catch(() => ({}));
    const errors = validateExamBody(body, 'create');
    if (errors) return fail(c, 400, 'Validation failed', { errors });

    const courseRes = await getDb(c.env).query<any>('SELECT * FROM courses WHERE id = $1', [body.courseId]);
    const course = courseRes.rows[0];
    if (!course) throw httpError('Course not found', 404);
    if (s.role === 'instructor' && course.instructor_id !== s.userId) {
      throw httpError('You can only create exams for your own courses', 403);
    }

    const exam = await createExam(c.env, {
      course_id: body.courseId,
      title: body.title,
      description: body.description ?? undefined,
      duration_minutes: body.durationMinutes,
      passing_score: body.passingScore,
      max_attempts: body.maxAttempts,
      shuffle_questions: body.shuffleQuestions,
      show_results: body.showResults,
      is_published: body.isPublished,
      starts_at: body.startsAt || null,
      ends_at: body.endsAt || null,
      instructions: body.instructions ?? undefined,
      random_questions_count: body.randomQuestionsCount,
      negative_marking: body.negativeMarking,
      negative_percentage: body.negativePercentage,
      certificate_template_id: body.certificateTemplateId ?? null,
    });

    return c.json({ success: true, data: exam }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create exam');
  }
});

// PUT /api/v1/exams/:id — update exam
exams.put('/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const examId = c.req.param('id');
    await verifyExamAccess(c.env, examId, s);
    const exam = await getExamById(c.env, examId);
    if (!exam) throw httpError('Exam not found', 404);

    const body: any = await c.req.json().catch(() => ({}));
    const errors = validateExamBody(body, 'update');
    if (errors) return fail(c, 400, 'Validation failed', { errors });

    const updated = await updateExam(c.env, examId, {
      course_id: body.courseId,
      title: body.title,
      description: body.description,
      duration_minutes: body.durationMinutes,
      passing_score: body.passingScore,
      max_attempts: body.maxAttempts,
      shuffle_questions: body.shuffleQuestions,
      show_results: body.showResults,
      is_published: body.isPublished,
      starts_at: body.startsAt !== undefined && body.startsAt !== null && body.startsAt !== '' ? body.startsAt : undefined,
      ends_at: body.endsAt !== undefined && body.endsAt !== null && body.endsAt !== '' ? body.endsAt : undefined,
      instructions: body.instructions,
      random_questions_count: body.randomQuestionsCount,
      negative_marking: body.negativeMarking,
      negative_percentage: body.negativePercentage,
      certificate_template_id: body.certificateTemplateId !== undefined ? body.certificateTemplateId : undefined,
    });

    return c.json({ success: true, data: updated });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update exam');
  }
});

// DELETE /api/v1/exams/:id — delete exam
exams.delete('/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const examId = c.req.param('id');
    await verifyExamAccess(c.env, examId, s);
    const exam = await getExamById(c.env, examId);
    if (!exam) throw httpError('Exam not found', 404);

    await deleteExam(c.env, examId);
    return c.json({ success: true, message: 'Exam deleted successfully' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete exam');
  }
});

// ───────────────────────── Questions CRUD ────────────────────────────────

// POST /api/v1/exams/:examId/questions — add question
exams.post('/:examId/questions', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const examId = c.req.param('examId');
    await verifyExamAccess(c.env, examId, s);
    const exam = await getExamById(c.env, examId);
    if (!exam) throw httpError('Exam not found', 404);

    const body: any = await c.req.json().catch(() => ({}));
    const errors = validateQuestionBody(body);
    if (errors) return fail(c, 400, 'Validation failed', { errors });

    const questions = await getQuestionsByExam(c.env, examId);
    const orderIndex = body.orderIndex ?? questions.length;

    let options = body.options || [];
    if (body.questionType === 'true_false' && options.length === 0) {
      options = ['True', 'False'];
    }

    const question = await createQuestion(c.env, {
      exam_id: examId,
      question: body.question,
      question_type: body.questionType || 'mcq',
      options,
      correct_answer: body.correctAnswer,
      points: body.points || 1,
      order_index: orderIndex,
    });

    return c.json({ success: true, data: question }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create question');
  }
});

// PUT /api/v1/exams/:examId/questions/:questionId — update question
exams.put('/:examId/questions/:questionId', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const examId = c.req.param('examId');
    await verifyExamAccess(c.env, examId, s);

    const body: any = await c.req.json().catch(() => ({}));
    const errors = validateQuestionBody(body);
    if (errors) return fail(c, 400, 'Validation failed', { errors });

    let options = body.options;
    if (body.questionType === 'true_false' && (!options || options.length === 0)) {
      options = ['True', 'False'];
    }

    const question = await updateQuestion(c.env, c.req.param('questionId'), {
      question: body.question,
      question_type: body.questionType,
      options,
      correct_answer: body.correctAnswer,
      points: body.points,
      order_index: body.orderIndex,
    });

    if (!question) throw httpError('Question not found', 404);
    return c.json({ success: true, data: question });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update question');
  }
});

// DELETE /api/v1/exams/:examId/questions/:questionId — delete question
exams.delete('/:examId/questions/:questionId', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    await verifyExamAccess(c.env, c.req.param('examId'), s);

    const deleted = await deleteQuestion(c.env, c.req.param('questionId'));
    if (!deleted) throw httpError('Question not found', 404);
    return c.json({ success: true, message: 'Question deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete question');
  }
});

// ───────────────────────── Administrator Attempt Management ──────────────

// GET /api/v1/exams/:id/attempts — list all attempts for an exam
exams.get('/:id/attempts', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const examId = c.req.param('id');
    await verifyExamAccess(c.env, examId, s);
    const exam = await getExamById(c.env, examId);
    if (!exam) throw httpError('Exam not found', 404);

    const attempts = await getAttemptsByExam(c.env, examId);
    return c.json({ success: true, data: attempts });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load attempts');
  }
});

// GET /api/v1/exams/:id/attempts/:attemptId — attempt detail
exams.get('/:id/attempts/:attemptId', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    await verifyExamAccess(c.env, c.req.param('id'), s);

    const attempt = await getAttemptById(c.env, c.req.param('attemptId'));
    if (!attempt) throw httpError('Attempt not found', 404);

    const answers = await getAnswersForAttempt(c.env, c.req.param('attemptId'));
    return c.json({ success: true, data: { attempt, answers } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load attempt');
  }
});

// PUT /api/v1/exams/:id/attempts/:attemptId/grade — manual grading
exams.put('/:id/attempts/:attemptId/grade', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const examId = c.req.param('id');
    await verifyExamAccess(c.env, examId, s);

    const body: any = await c.req.json().catch(() => ({}));
    const manualScore = Number(body.manualScore);
    if (body.manualScore === undefined || body.manualScore === null || Number.isNaN(manualScore) || manualScore < 0 || manualScore > 100) {
      return fail(c, 400, 'manualScore must be 0-100');
    }

    const exam = await getExamById(c.env, examId);
    if (!exam) throw httpError('Exam not found', 404);

    const passed = manualScore >= exam.passing_score;
    const updated = await updateAttemptManualGrade(c.env, c.req.param('attemptId'), manualScore, true);
    if (!updated) throw httpError('Attempt not found', 404);

    if (passed) {
      await autoIssueCertificateAfterExamPass(c.env, exam, updated.user_id, exam.course_id);
    }

    return c.json({ success: true, data: { ...updated, passed } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to grade attempt');
  }
});

// POST /api/v1/exams/:id/duplicate — duplicate an exam
exams.post('/:id/duplicate', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const examId = c.req.param('id');
    await verifyExamAccess(c.env, examId, s);
    const exam = await getExamById(c.env, examId);
    if (!exam) throw httpError('Exam not found', 404);

    const body: any = await c.req.json().catch(() => ({}));
    const newTitle = body.title || `${exam.title} (Copy)`;
    const duplicated = await duplicateExam(c.env, examId, newTitle);

    return c.json({ success: true, data: duplicated }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to duplicate exam');
  }
});

// GET /api/v1/exams/:id/export — CSV export of results
exams.get('/:id/export', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const examId = c.req.param('id');
    await verifyExamAccess(c.env, examId, s);
    const exam = await getExamById(c.env, examId);
    if (!exam) throw httpError('Exam not found', 404);

    const attempts = await getAttemptsByExam(c.env, examId);
    const header = 'Student Name,Email,Score,Passed,Status,Started At,Submitted At\n';
    const rows = attempts.map((a: any) =>
      `"${a.user_name || ''}","${a.user_email || ''}",${a.score ?? ''},${a.passed ? 'Yes' : 'No'},${a.status},"${a.started_at ? new Date(a.started_at).toLocaleString() : ''}","${a.submitted_at ? new Date(a.submitted_at).toLocaleString() : ''}"`
    ).join('\n');

    const filename = `exam-${String(exam.title).replace(/[^a-z0-9]/gi, '_')}-results.csv`;
    return c.body(header + rows, 200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to export results');
  }
});

// ───────────────────────── Student Routes ────────────────────────────────

// GET /api/v1/exams/student/list — available exams for enrolled courses
exams.get('/student/list', async (c) => {
  try {
    const s = await requireAuth(c);
    const list = await getAvailableExamsForUser(c.env, s.userId);
    const enriched = list.map((e: any) => ({
      ...e,
      schedule_status: getExamScheduleStatus(e),
    }));
    return c.json({ success: true, data: enriched });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load exams');
  }
});

// GET /api/v1/exams/student/history — past attempts
exams.get('/student/history', async (c) => {
  try {
    const s = await requireAuth(c);
    const history = await getStudentExamHistory(c.env, s.userId);
    return c.json({ success: true, data: history });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load exam history');
  }
});

// GET /api/v1/exams/student/:examId — exam to take (no answers)
exams.get('/student/:examId', async (c) => {
  try {
    const s = await requireAuth(c);
    const examId = c.req.param('examId');

    const exam = await getExamById(c.env, examId);
    if (!exam || !exam.is_published) throw httpError('Exam not found', 404);

    const status = getExamScheduleStatus(exam);
    if (status === 'expired') return fail(c, 403, 'This exam has ended');

    const enrolled = await checkEnrolled(c.env, exam.course_id, s.userId);
    if (!enrolled) return fail(c, 403, 'You are not enrolled in this course');

    if (await certificateQualificationBlocked(c.env, exam, s.userId)) {
      return fail(c, 403, 'You must complete the linked course before taking this exam');
    }

    if (exam.max_attempts > 0) {
      const attemptCount = await countAttempts(c.env, examId, s.userId);
      if (attemptCount >= exam.max_attempts) return fail(c, 403, 'Maximum attempts reached');
    }

    let questions: any[];
    if (exam.random_questions_count > 0) {
      questions = await getRandomQuestions(c.env, examId, exam.random_questions_count);
    } else {
      questions = await getQuestionsByExam(c.env, examId);
    }

    const safeQuestions = questions.map((q: any) => ({
      id: q.id,
      question: q.question,
      question_type: q.question_type,
      options: q.options,
      points: q.points,
      order_index: q.order_index,
    }));

    const activeAttempt = await getActiveAttempt(c.env, examId, s.userId);
    const attemptCount = await countAttempts(c.env, examId, s.userId);

    return c.json({
      success: true,
      data: {
        ...exam,
        schedule_status: status,
        attempt_count: attemptCount,
        questions: exam.shuffle_questions ? shuffleArray(safeQuestions) : safeQuestions,
        activeAttemptId: activeAttempt?.id || null,
        activeAttemptStartedAt: activeAttempt?.started_at || null,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load exam');
  }
});

// POST /api/v1/exams/student/:examId/start — start a new attempt
exams.post('/student/:examId/start', async (c) => {
  try {
    const s = await requireAuth(c);
    const examId = c.req.param('examId');

    const exam = await getExamById(c.env, examId);
    if (!exam) throw httpError('Exam not found', 404);

    const status = getExamScheduleStatus(exam);
    if (status === 'upcoming') return fail(c, 403, 'This exam has not started yet');
    if (status === 'expired') return fail(c, 403, 'This exam has ended');

    const enrolled = await checkEnrolled(c.env, exam.course_id, s.userId);
    if (!enrolled) return fail(c, 403, 'Not enrolled');

    if (await certificateQualificationBlocked(c.env, exam, s.userId)) {
      return fail(c, 403, 'You must complete the linked course before starting this exam');
    }

    // Abandon any existing active attempt — every exam is a fresh start.
    const active = await getActiveAttempt(c.env, examId, s.userId);
    if (active) await abandonAttempt(c.env, active.id);

    if (exam.max_attempts > 0) {
      const count = await countAttempts(c.env, examId, s.userId);
      if (count >= exam.max_attempts) return fail(c, 403, 'Maximum attempts reached');
    }

    const attempt = await createAttempt(c.env, examId, s.userId);
    return c.json({ success: true, data: { attempt, resumed: false } }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to start exam');
  }
});

// POST /api/v1/exams/student/:examId/submit — submit answers
exams.post('/student/:examId/submit', async (c) => {
  try {
    const s = await requireAuth(c);
    const examId = c.req.param('examId');
    const body: any = await c.req.json().catch(() => ({}));
    const { answers, flaggedQuestions } = body;

    if (!Array.isArray(answers)) return fail(c, 400, 'answers must be an array');

    const exam = await getExamById(c.env, examId);
    if (!exam) throw httpError('Exam not found', 404);

    const activeAttempt = await getActiveAttempt(c.env, examId, s.userId);
    if (!activeAttempt) return fail(c, 400, 'No active attempt found');

    const questions = await getQuestionsByExam(c.env, examId);
    const questionMap = new Map(questions.map((q: any) => [q.id, q]));

    let totalPoints = 0;
    let maxPoints = 0;
    let wrongCount = 0;

    for (const q of questions) {
      maxPoints += Number(q.points) || 0;
    }

    for (const ans of answers) {
      const question: any = questionMap.get(ans.questionId);
      if (!question) continue;

      const isCorrect =
        String(question.correct_answer ?? '').toLowerCase().trim() ===
        String(ans.answer ?? '').toLowerCase().trim();
      const pointsEarned = isCorrect ? Number(question.points) || 0 : 0;
      totalPoints += pointsEarned;
      if (!isCorrect) wrongCount++;

      await saveAnswer(c.env, activeAttempt.id, ans.questionId, ans.answer, isCorrect, pointsEarned);
    }

    // Apply negative marking
    let percentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
    if (exam.negative_marking && exam.negative_percentage > 0 && wrongCount > 0) {
      const deduction = Math.round(wrongCount * exam.negative_percentage);
      percentage = Math.max(0, percentage - deduction);
    }

    if (flaggedQuestions && Array.isArray(flaggedQuestions)) {
      await updateAttemptFlags(c.env, activeAttempt.id, flaggedQuestions);
    }

    const passed = percentage >= exam.passing_score;
    await submitAttempt(c.env, activeAttempt.id, percentage, passed);

    if (passed) {
      await autoIssueCertificateAfterExamPass(c.env, exam, s.userId, exam.course_id);
    }

    return c.json({
      success: true,
      data: {
        attemptId: activeAttempt.id,
        score: percentage,
        passed,
        totalQuestions: questions.length,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to submit exam');
  }
});

// POST /api/v1/exams/student/:examId/timeout — timeout an attempt
exams.post('/student/:examId/timeout', async (c) => {
  try {
    const s = await requireAuth(c);
    const examId = c.req.param('examId');

    const activeAttempt = await getActiveAttempt(c.env, examId, s.userId);
    if (!activeAttempt) return fail(c, 400, 'No active attempt');

    const exam = await getExamById(c.env, examId);
    const questions = await getQuestionsByExam(c.env, examId);

    let totalScore = 0;
    let maxScore = 0;
    for (const q of questions) {
      maxScore += Number(q.points) || 0;
    }

    const answers = await getAnswersForAttempt(c.env, activeAttempt.id);
    for (const ans of answers) {
      totalScore += Number(ans.points_earned) || 0;
    }

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed = exam ? percentage >= exam.passing_score : false;

    await submitAttempt(c.env, activeAttempt.id, percentage, passed);

    if (passed && exam) {
      await autoIssueCertificateAfterExamPass(c.env, exam, s.userId, exam.course_id);
    }

    return c.json({
      success: true,
      data: { attemptId: activeAttempt.id, score: percentage, passed, timedOut: true },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to timeout exam');
  }
});

// GET /api/v1/exams/student/:examId/results/:attemptId — attempt results
exams.get('/student/:examId/results/:attemptId', async (c) => {
  try {
    const s = await requireAuth(c);
    const attempt = await getAttemptById(c.env, c.req.param('attemptId'));
    if (!attempt) throw httpError('Attempt not found', 404);
    if (attempt.user_id !== s.userId) return fail(c, 403, 'Forbidden');

    const exam = await getExamById(c.env, c.req.param('examId'));
    if (!exam) throw httpError('Exam not found', 404);

    const examAnswers = await getAnswersForAttempt(c.env, c.req.param('attemptId'));

    return c.json({
      success: true,
      data: {
        attempt,
        exam: {
          title: exam.title,
          passing_score: exam.passing_score,
          show_results: exam.show_results,
          negative_marking: exam.negative_marking,
          negative_percentage: exam.negative_percentage,
        },
        answers: examAnswers,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load results');
  }
});

// POST /api/v1/exams/student/:examId/attempts/:attemptId/upload-recording
// Express accepted a WEBM multipart upload; Workers accepts a URL in the body.
exams.post('/student/:examId/attempts/:attemptId/upload-recording', async (c) => {
  try {
    const s = await requireAuth(c);
    const examId = c.req.param('examId');
    const body: any = await c.req.json().catch(() => ({}));
    const recordingUrl = body.recordingUrl || body.url;

    if (!recordingUrl || typeof recordingUrl !== 'string') {
      return fail(c, 400, 'No recording file provided');
    }

    const attempt = await getAttemptById(c.env, c.req.param('attemptId'));
    if (!attempt || attempt.user_id !== s.userId || attempt.exam_id !== examId) {
      return fail(c, 400, 'Invalid attempt');
    }

    const elapsed = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000);
    const durationSeconds = Number.isFinite(Number(body.durationSeconds)) ? Number(body.durationSeconds) : elapsed;
    const fileSizeBytes = Number.isFinite(Number(body.fileSizeBytes)) ? Number(body.fileSizeBytes) : 0;

    const recording = await saveRecording(c.env, attempt.id, recordingUrl, durationSeconds, fileSizeBytes);
    return c.json({ success: true, data: recording });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to save recording');
  }
});

// ───────────────────────── Monitor & Proctoring ──────────────────────────

// GET /api/v1/exams/monitor/active-attempts
exams.get('/monitor/active-attempts', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const instructorId = s.role === 'instructor' ? s.userId : undefined;
    const attempts = await getAllActiveAttempts(c.env, instructorId);
    return c.json({ success: true, data: attempts });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load active attempts');
  }
});

// GET /api/v1/exams/monitor/proctoring-history
exams.get('/monitor/proctoring-history', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const limit = Math.min(Math.abs(parseInt(c.req.query('limit') || '', 10) || 20), 100);
    const offset = Math.abs(parseInt(c.req.query('offset') || '', 10) || 0);
    const search = c.req.query('search') || undefined;
    const instructorId = s.role === 'instructor' ? s.userId : undefined;

    const result = await getRecordingsHistory(c.env, limit, offset, search, instructorId);
    return c.json({ success: true, data: result.recordings, total: result.total });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load proctoring history');
  }
});

// GET /api/v1/exams/monitor/proctoring-recording/:attemptId
exams.get('/monitor/proctoring-recording/:attemptId', async (c) => {
  try {
    await requireRole(c, STAFF);
    const recording = await getRecordingByAttemptId(c.env, c.req.param('attemptId'));
    if (!recording) return fail(c, 404, 'Recording not found');
    return c.json({ success: true, data: recording });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load recording');
  }
});

// DELETE /api/v1/exams/monitor/proctoring-recording/:recordingId
exams.delete('/monitor/proctoring-recording/:recordingId', async (c) => {
  try {
    await requireRole(c, STAFF);
    const deleted = await deleteRecordingById(c.env, c.req.param('recordingId'));
    if (!deleted) return fail(c, 404, 'Recording not found');
    return c.json({ success: true, message: 'Recording deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete recording');
  }
});

export default exams;
