import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, requireRole, statusOf } from '../route-utils';
import {
  createChallenge,
  createNotification,
  deleteChallenge,
  getChallengeById,
  getChallengesByCourse,
  getChallengesByLesson,
  getEnrollment,
  getLessonById,
  getSubmissionByUserAndChallenge,
  getSubmissionsByChallenge,
  getSupportedLanguages,
  gradeChallengeSubmission,
  runCode,
  runWithExpectedOutput,
  runWithTestCases,
  submitChallenge,
  updateChallenge,
  upsertLessonProgress,
} from '../challenges';

const challenges = new Hono<{ Bindings: Env }>();

const STAFF = ['instructor', 'admin', 'super_admin'];
const CHALLENGE_TYPES = ['code', 'practical', 'design', 'media', 'business', 'essay', 'quiz'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Errors = Record<string, string[]>;

function addError(errors: Errors, field: string, message: string) {
  (errors[field] ||= []).push(message);
}

function isString(v: any): v is string {
  return typeof v === 'string';
}

function validationFailed(c: any, errors: Errors) {
  return fail(c, 400, 'Validation failed', { errors });
}

function validateTestCases(value: any, errors: Errors, field: string) {
  if (!Array.isArray(value)) {
    addError(errors, field, 'Expected array');
    return;
  }
  value.forEach((tc: any, i: number) => {
    if (!tc || typeof tc !== 'object' || !isString(tc.input) || !isString(tc.expected)) {
      addError(errors, `${field}.${i}`, 'Expected { input: string, expected: string }');
    }
  });
}

function validateRubric(value: any, errors: Errors, field: string) {
  if (!Array.isArray(value)) {
    addError(errors, field, 'Expected array');
    return;
  }
  value.forEach((r: any, i: number) => {
    if (!r || typeof r !== 'object' || !isString(r.criterion) || typeof r.maxScore !== 'number') {
      addError(errors, `${field}.${i}`, 'Expected { criterion: string, maxScore: number }');
    }
  });
}

// Mirrors createChallengeSchema.
function validateCreate(body: any): Errors {
  const errors: Errors = {};
  if (!isString(body.lessonId) || !UUID_RE.test(body.lessonId)) addError(errors, 'lessonId', 'Invalid uuid');
  if (!isString(body.title) || body.title.length < 1 || body.title.length > 200) {
    addError(errors, 'title', 'String must contain at least 1 and at most 200 character(s)');
  }
  if (!isString(body.description) || body.description.length < 1) addError(errors, 'description', 'String must contain at least 1 character(s)');
  if (!isString(body.instructions) || body.instructions.length < 1) addError(errors, 'instructions', 'String must contain at least 1 character(s)');
  if (body.type !== undefined && !CHALLENGE_TYPES.includes(body.type)) addError(errors, 'type', 'Invalid enum value');
  for (const field of ['starterCode', 'testCode', 'expectedOutput', 'language', 'difficulty', 'submissionType', 'allowedFileTypes']) {
    if (body[field] !== undefined && !isString(body[field])) addError(errors, field, 'Expected string');
  }
  if (body.testCases !== undefined) validateTestCases(body.testCases, errors, 'testCases');
  if (body.rubric !== undefined) validateRubric(body.rubric, errors, 'rubric');
  if (body.timeoutSeconds !== undefined && (
    typeof body.timeoutSeconds !== 'number' || !Number.isInteger(body.timeoutSeconds) ||
    body.timeoutSeconds < 1 || body.timeoutSeconds > 30
  )) {
    addError(errors, 'timeoutSeconds', 'Number must be an integer between 1 and 30');
  }
  if (body.maxFileSize !== undefined && typeof body.maxFileSize !== 'number') addError(errors, 'maxFileSize', 'Expected number');
  return errors;
}

// Mirrors updateChallengeSchema (everything optional, no defaults).
function validateUpdate(body: any): Errors {
  const errors: Errors = {};
  if (body.title !== undefined && (!isString(body.title) || body.title.length < 1 || body.title.length > 200)) {
    addError(errors, 'title', 'String must contain at least 1 and at most 200 character(s)');
  }
  for (const field of ['description', 'instructions']) {
    if (body[field] !== undefined && (!isString(body[field]) || body[field].length < 1)) {
      addError(errors, field, 'String must contain at least 1 character(s)');
    }
  }
  if (body.type !== undefined && !CHALLENGE_TYPES.includes(body.type)) addError(errors, 'type', 'Invalid enum value');
  for (const field of ['starterCode', 'testCode', 'expectedOutput', 'language', 'difficulty', 'submissionType', 'allowedFileTypes']) {
    if (body[field] !== undefined && !isString(body[field])) addError(errors, field, 'Expected string');
  }
  if (body.testCases !== undefined) validateTestCases(body.testCases, errors, 'testCases');
  if (body.rubric !== undefined) validateRubric(body.rubric, errors, 'rubric');
  if (body.timeoutSeconds !== undefined && (
    typeof body.timeoutSeconds !== 'number' || !Number.isInteger(body.timeoutSeconds) ||
    body.timeoutSeconds < 1 || body.timeoutSeconds > 30
  )) {
    addError(errors, 'timeoutSeconds', 'Number must be an integer between 1 and 30');
  }
  if (body.maxFileSize !== undefined && typeof body.maxFileSize !== 'number') addError(errors, 'maxFileSize', 'Expected number');
  return errors;
}

// Mirrors runCodeSchema.
function validateRun(body: any): Errors {
  const errors: Errors = {};
  if (!isString(body.code) || body.code.length < 1) addError(errors, 'code', 'String must contain at least 1 character(s)');
  if (!isString(body.language) || body.language.length < 1) addError(errors, 'language', 'String must contain at least 1 character(s)');
  if (body.stdin !== undefined && !isString(body.stdin)) addError(errors, 'stdin', 'Expected string');
  return errors;
}

// GET /api/v1/challenges/languages — must be registered before GET /:id
challenges.get('/languages', (c) => {
  return c.json({ success: true, data: getSupportedLanguages() });
});

// GET /api/v1/challenges/lesson/:lessonId
challenges.get('/lesson/:lessonId', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const lesson = await getLessonById(db, c.req.param('lessonId'));
    if (!lesson) return fail(c, 404, 'Lesson not found');

    const enrollment = await getEnrollment(db, s.userId, lesson.course_id);
    // Express only exempts `admin` (not super_admin) from enrollment here.
    if (!enrollment && s.role !== 'admin') return fail(c, 403, 'Not enrolled in this course');

    const list = await getChallengesByLesson(db, lesson.id);
    const results = await Promise.all(
      list.map(async (ch) => {
        const submission = await getSubmissionByUserAndChallenge(db, s.userId, ch.id);
        return { ...ch, submission };
      })
    );
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load challenges');
  }
});

// GET /api/v1/challenges/course/:courseId
challenges.get('/course/:courseId', async (c) => {
  try {
    await requireRole(c, STAFF);
    const list = await getChallengesByCourse(getDb(c.env), c.req.param('courseId'));
    return c.json({ success: true, data: list });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load challenges');
  }
});

// POST /api/v1/challenges/run — must be registered before parameterised routes
challenges.post('/run', async (c) => {
  try {
    await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const errors = validateRun(body);
    if (Object.keys(errors).length) return validationFailed(c, errors);

    const result = await runCode(body.code, body.language, body.stdin);
    return c.json({ success: true, data: result });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to run code');
  }
});

// GET /api/v1/challenges/:id
challenges.get('/:id', async (c) => {
  try {
    await requireAuth(c);
    const challenge = await getChallengeById(getDb(c.env), c.req.param('id'));
    if (!challenge) return fail(c, 404, 'Challenge not found');
    return c.json({ success: true, data: challenge });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load challenge');
  }
});

// POST /api/v1/challenges — create challenge (instructor/admin)
challenges.post('/', async (c) => {
  try {
    await requireRole(c, STAFF);
    const body: any = await c.req.json().catch(() => ({}));
    const errors = validateCreate(body);
    if (Object.keys(errors).length) return validationFailed(c, errors);

    const db = getDb(c.env);
    const lesson = await getLessonById(db, body.lessonId);
    if (!lesson) return fail(c, 404, 'Lesson not found');

    const {
      lessonId, title, description, instructions, type,
      starterCode, testCode, expectedOutput, testCases, timeoutSeconds, language, difficulty,
      submissionType, allowedFileTypes, rubric, maxFileSize,
    } = body;

    const challenge = await createChallenge(db, {
      lesson_id: lessonId, title, description, instructions, type: type || 'code',
      starter_code: starterCode, test_code: testCode,
      expected_output: expectedOutput, test_cases: testCases,
      timeout_seconds: timeoutSeconds, language, difficulty,
      submission_type: submissionType, allowed_file_types: allowedFileTypes, rubric, max_file_size: maxFileSize,
    });
    return c.json({ success: true, data: challenge }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create challenge');
  }
});

// PUT /api/v1/challenges/:id
challenges.put('/:id', async (c) => {
  try {
    await requireRole(c, STAFF);
    const body: any = await c.req.json().catch(() => ({}));
    const errors = validateUpdate(body);
    if (Object.keys(errors).length) return validationFailed(c, errors);

    const challenge = await updateChallenge(getDb(c.env), c.req.param('id'), body);
    if (!challenge) return fail(c, 404, 'Challenge not found');
    return c.json({ success: true, data: challenge });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update challenge');
  }
});

// DELETE /api/v1/challenges/:id
challenges.delete('/:id', async (c) => {
  try {
    await requireRole(c, STAFF);
    await deleteChallenge(getDb(c.env), c.req.param('id'));
    return c.json({ success: true, message: 'Challenge deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete challenge');
  }
});

// POST /api/v1/challenges/:id/submit — submit a solution
challenges.post('/:id/submit', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const challengeId = c.req.param('id');
    const body: any = await c.req.json().catch(() => ({}));

    const challenge = await getChallengeById(db, challengeId);
    if (!challenge) return fail(c, 404, 'Challenge not found');

    let passed = false;
    let output = '';
    const expectedOutput = challenge.expected_output || '';
    let testResults: any[] = [];
    let score = 0;
    let submission: any;

    if (challenge.type === 'code') {
      const code = body.code;
      if (!code) return fail(c, 400, 'Code is required for code challenges');

      const testCases = challenge.test_cases || [];
      const useTestCases = Array.isArray(testCases) && testCases.length > 0;
      const useExpectedOutput = !!(challenge.expected_output && String(challenge.expected_output).trim().length > 0);

      if (useTestCases) {
        const result = await runWithTestCases(code, challenge.language, testCases);
        testResults = result.testResults;
        passed = result.allPassed;
        output = testResults.map((t: any) => t.actual).join('\n');
        score = passed ? 100 : Math.round((testResults.filter((t: any) => t.passed).length / testResults.length) * 100);
      } else if (useExpectedOutput) {
        const result = await runWithExpectedOutput(code, challenge.language, challenge.expected_output as string);
        output = result.output;
        passed = result.passed;
        score = passed ? 100 : 0;
      } else {
        const result = await runCode(code, challenge.language);
        output = result.output;
        passed = result.success;
        score = passed ? 100 : 0;
      }

      submission = await submitChallenge(db, {
        challenge_id: challengeId, user_id: s.userId, code, passed, score, output,
        expected_output: expectedOutput || undefined, test_results: testResults,
      });
    } else {
      // Non-code challenges: file_url / text_answer submission.
      const { fileUrl, textAnswer } = body;
      if (!fileUrl && !textAnswer) {
        return fail(c, 400, 'File URL or text answer is required');
      }
      // Non-code submissions start as "pending review" (passed=false, score=null).
      submission = await submitChallenge(db, {
        challenge_id: challengeId, user_id: s.userId,
        file_url: fileUrl || undefined, text_answer: textAnswer || undefined,
        passed: false, score: undefined,
      });
    }

    if (passed && challenge.type === 'code') {
      try {
        const lesson = await getLessonById(db, challenge.lesson_id);
        if (lesson) {
          await upsertLessonProgress(db, s.userId, challenge.lesson_id, lesson.course_id, true);
        }
      } catch { /* ignore */ }
    }

    return c.json({ success: true, data: submission }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to submit challenge');
  }
});

// GET /api/v1/challenges/:id/submissions
challenges.get('/:id/submissions', async (c) => {
  try {
    await requireRole(c, STAFF);
    const submissions = await getSubmissionsByChallenge(getDb(c.env), c.req.param('id'));
    return c.json({ success: true, data: submissions });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load submissions');
  }
});

// PUT /api/v1/challenges/submissions/:submissionId/grade
challenges.put('/submissions/:submissionId/grade', async (c) => {
  try {
    await requireRole(c, STAFF);
    const db = getDb(c.env);
    const body: any = await c.req.json().catch(() => ({}));
    const { score, feedback } = body;

    const submission = await gradeChallengeSubmission(db, c.req.param('submissionId'), score, feedback);
    if (!submission) return fail(c, 404, 'Submission not found');

    try {
      await createNotification(db, {
        user_id: submission.user_id,
        title: 'Challenge Graded',
        message: `Your challenge has been graded with a score of ${score}.`,
        type: 'success',
      });
    } catch { /* ignore */ }

    return c.json({ success: true, data: submission });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to grade submission');
  }
});

export default challenges;
