import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import * as ChallengeModel from '../models/codingChallenge';
import * as LessonModel from '../models/lesson';
import * as EnrollmentModel from '../models/enrollment';
import * as ProgressModel from '../models/progress';
import { createNotification } from '../models/notification';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { runCode, runWithTestCases, runWithExpectedOutput, getSupportedLanguages } from '../services/codeRunner';

const router = Router();

const challengeTypes = ['code', 'practical', 'design', 'media', 'business', 'essay', 'quiz'] as const;

const createChallengeSchema = z.object({
  lessonId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  instructions: z.string().min(1),
  type: z.enum(challengeTypes).default('code'),
  // Code type fields
  starterCode: z.string().optional(),
  testCode: z.string().optional(),
  expectedOutput: z.string().optional(),
  testCases: z.array(z.object({ input: z.string(), expected: z.string() })).optional().default([]),
  timeoutSeconds: z.number().int().min(1).max(30).optional().default(5),
  language: z.string().optional().default('javascript'),
  difficulty: z.string().optional().default('easy'),
  // Non-code type fields
  submissionType: z.string().optional(),
  allowedFileTypes: z.string().optional(),
  rubric: z.array(z.object({ criterion: z.string(), maxScore: z.number() })).optional().default([]),
  maxFileSize: z.number().optional().default(10),
});

const updateChallengeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  instructions: z.string().min(1).optional(),
  type: z.enum(challengeTypes).optional(),
  starterCode: z.string().optional(),
  testCode: z.string().optional(),
  expectedOutput: z.string().optional(),
  testCases: z.array(z.object({ input: z.string(), expected: z.string() })).optional(),
  timeoutSeconds: z.number().int().min(1).max(30).optional(),
  language: z.string().optional(),
  difficulty: z.string().optional(),
  submissionType: z.string().optional(),
  allowedFileTypes: z.string().optional(),
  rubric: z.array(z.object({ criterion: z.string(), maxScore: z.number() })).optional(),
  maxFileSize: z.number().optional(),
});

const submitCodeSchema = z.object({
  code: z.string().min(1),
});

const submitPracticalSchema = z.object({
  fileUrl: z.string().optional(),
  textAnswer: z.string().optional(),
});

const runCodeSchema = z.object({
  code: z.string().min(1),
  language: z.string().min(1),
  stdin: z.string().optional(),
});

// GET /challenges/languages
router.get('/languages', (_req, res: Response) => {
  res.json({ success: true, data: getSupportedLanguages() });
});

// GET /challenges/lesson/:lessonId
router.get('/lesson/:lessonId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user!.userId;
    const lesson = await LessonModel.getLessonById(lessonId);
    if (!lesson) throw new NotFoundError('Lesson');
    const enrollment = await EnrollmentModel.getEnrollment(userId, lesson.course_id);
    if (!enrollment && req.user!.role !== 'admin') throw new ForbiddenError('Not enrolled in this course');
    const challenges = await ChallengeModel.getChallengesByLesson(lessonId);
    const results = await Promise.all(
      challenges.map(async (ch) => {
        const submission = await ChallengeModel.getSubmissionByUserAndChallenge(userId, ch.id);
        return { ...ch, submission };
      })
    );
    res.json({ success: true, data: results });
  } catch (error) { next(error); }
});

// GET /challenges/course/:courseId
router.get('/course/:courseId', authenticate, authorize('instructor', 'admin', 'super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const challenges = await ChallengeModel.getChallengesByCourse(req.params.courseId);
    res.json({ success: true, data: challenges });
  } catch (error) { next(error); }
});

// GET /challenges/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const challenge = await ChallengeModel.getChallengeById(req.params.id);
    if (!challenge) throw new NotFoundError('Challenge');
    res.json({ success: true, data: challenge });
  } catch (error) { next(error); }
});

// POST /challenges/run
router.post('/run', authenticate, validate(runCodeSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { code, language, stdin } = req.body;
    const result = await runCode(code, language, stdin);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

// POST /challenges - create challenge (instructor/admin)
router.post('/', authenticate, authorize('instructor', 'admin', 'super_admin'), validate(createChallengeSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { lessonId, title, description, instructions, type,
      starterCode, testCode, expectedOutput, testCases, timeoutSeconds, language, difficulty,
      submissionType, allowedFileTypes, rubric, maxFileSize } = req.body;

    const lesson = await LessonModel.getLessonById(lessonId);
    if (!lesson) throw new NotFoundError('Lesson');

    const challenge = await ChallengeModel.createChallenge({
      lesson_id: lessonId, title, description, instructions, type: type || 'code',
      starter_code: starterCode, test_code: testCode,
      expected_output: expectedOutput, test_cases: testCases,
      timeout_seconds: timeoutSeconds, language, difficulty,
      submission_type: submissionType, allowed_file_types: allowedFileTypes, rubric, max_file_size: maxFileSize,
    });

    res.status(201).json({ success: true, data: challenge });
  } catch (error) { next(error); }
});

// PUT /challenges/:id
router.put('/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), validate(updateChallengeSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const challenge = await ChallengeModel.updateChallenge(req.params.id, req.body);
    if (!challenge) throw new NotFoundError('Challenge');
    res.json({ success: true, data: challenge });
  } catch (error) { next(error); }
});

// DELETE /challenges/:id
router.delete('/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await ChallengeModel.deleteChallenge(req.params.id);
    res.json({ success: true, message: 'Challenge deleted' });
  } catch (error) { next(error); }
});

// POST /challenges/:id/submit - submit a solution
router.post('/:id/submit', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const challengeId = req.params.id;
    const userId = req.user!.userId;
    const challenge = await ChallengeModel.getChallengeById(challengeId);
    if (!challenge) throw new NotFoundError('Challenge');

    let passed = false;
    let output = '';
    let expected_output = challenge.expected_output || '';
    let testResults: any[] = [];
    let score = 0;
    let submission;

    if (challenge.type === 'code') {
      const { code } = req.body;
      if (!code) return res.status(400).json({ success: false, message: 'Code is required for code challenges' });

      const testCases = challenge.test_cases || [];
      const useTestCases = Array.isArray(testCases) && testCases.length > 0;
      const useExpectedOutput = challenge.expected_output && challenge.expected_output.trim().length > 0;

      if (useTestCases) {
        const result = await runWithTestCases(code, challenge.language, testCases);
        testResults = result.testResults;
        passed = result.allPassed;
        output = testResults.map((t: any) => t.actual).join('\n');
        score = passed ? 100 : Math.round((testResults.filter((t: any) => t.passed).length / testResults.length) * 100);
      } else if (useExpectedOutput) {
        const result = await runWithExpectedOutput(code, challenge.language, challenge.expected_output!);
        output = result.output;
        passed = result.passed;
        score = passed ? 100 : 0;
      } else {
        const result = await runCode(code, challenge.language);
        output = result.output;
        passed = result.success;
        score = passed ? 100 : 0;
      }

      submission = await ChallengeModel.submitChallenge({
        challenge_id: challengeId, user_id: userId, code, passed, score, output,
        expected_output: expected_output || undefined, test_results: testResults,
      });
    } else {
      // Non-code challenges: file_url / text_answer submission
      const { fileUrl, textAnswer } = req.body;
      if (!fileUrl && !textAnswer) {
        return res.status(400).json({ success: false, message: 'File URL or text answer is required' });
      }
      // Non-code submissions start as "pending review" (passed=false, score=null)
      submission = await ChallengeModel.submitChallenge({
        challenge_id: challengeId, user_id: userId,
        file_url: fileUrl || undefined, text_answer: textAnswer || undefined,
        passed: false, score: null,
      });
    }

    if (passed && challenge.type === 'code') {
      try {
        const lesson = await LessonModel.getLessonById(challenge.lesson_id);
        if (lesson) {
          await ProgressModel.upsertLessonProgress(userId, challenge.lesson_id, lesson.course_id, true);
        }
      } catch { /* ignore */ }
    }

    res.status(201).json({ success: true, data: submission });
  } catch (error) { next(error); }
});

// GET /challenges/:id/submissions
router.get('/:id/submissions', authenticate, authorize('instructor', 'admin', 'super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const submissions = await ChallengeModel.getSubmissionsByChallenge(req.params.id);
    res.json({ success: true, data: submissions });
  } catch (error) { next(error); }
});

// PUT /challenges/submissions/:submissionId/grade
router.put('/submissions/:submissionId/grade', authenticate, authorize('instructor', 'admin', 'super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { submissionId } = req.params;
    const { score, feedback } = req.body;
    const submission = await ChallengeModel.gradeChallengeSubmission(submissionId, score, feedback);
    if (!submission) throw new NotFoundError('Submission');
    try {
      await createNotification({
        user_id: submission.user_id,
        title: 'Challenge Graded',
        message: `Your challenge has been graded with a score of ${score}.`,
        type: 'success',
      });
    } catch { /* ignore */ }
    res.json({ success: true, data: submission });
  } catch (error) { next(error); }
});

export default router;