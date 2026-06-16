import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import * as ChallengeModel from '../models/codingChallenge';
import * as LessonModel from '../models/lesson';
import * as EnrollmentModel from '../models/enrollment';
import { createNotification } from '../models/notification';
import { NotFoundError, ForbiddenError } from '../utils/errors';

const router = Router();

const createChallengeSchema = z.object({
  lessonId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  instructions: z.string().min(1),
  starterCode: z.string().default(''),
  testCode: z.string().default(''),
  language: z.string().default('javascript'),
  difficulty: z.string().default('easy'),
});

const submitChallengeSchema = z.object({
  code: z.string().min(1),
  passed: z.boolean(),
  score: z.number().int().min(0).optional(),
});

// GET /challenges/lesson/:lessonId - get challenges for a lesson (authenticated)
router.get(
  '/lesson/:lessonId',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { lessonId } = req.params;
      const userId = req.user!.userId;

      const lesson = await LessonModel.getLessonById(lessonId);
      if (!lesson) throw new NotFoundError('Lesson');

      const enrollment = await EnrollmentModel.getEnrollment(userId, lesson.course_id);
      if (!enrollment && req.user!.role !== 'admin') {
        throw new ForbiddenError('Not enrolled in this course');
      }

      const challenges = await ChallengeModel.getChallengesByLesson(lessonId);
      const results = await Promise.all(
        challenges.map(async (ch) => {
          const submission = await ChallengeModel.getSubmissionByUserAndChallenge(userId, ch.id);
          return { ...ch, submission };
        })
      );

      res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  }
);

// GET /challenges/:id - get a single challenge
router.get(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const challenge = await ChallengeModel.getChallengeById(req.params.id);
      if (!challenge) throw new NotFoundError('Challenge');
      res.json({ success: true, data: challenge });
    } catch (error) {
      next(error);
    }
  }
);

// POST /challenges - create challenge (instructor/admin)
router.post(
  '/',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  validate(createChallengeSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { lessonId, title, description, instructions, starterCode, testCode, language, difficulty } = req.body;

      const lesson = await LessonModel.getLessonById(lessonId);
      if (!lesson) throw new NotFoundError('Lesson');

      const challenge = await ChallengeModel.createChallenge({
        lesson_id: lessonId,
        title,
        description,
        instructions,
        starter_code: starterCode,
        test_code: testCode,
        language,
        difficulty,
      });

      res.status(201).json({ success: true, data: challenge });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /challenges/:id - update challenge
router.put(
  '/:id',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const challenge = await ChallengeModel.updateChallenge(req.params.id, req.body);
      if (!challenge) throw new NotFoundError('Challenge');
      res.json({ success: true, data: challenge });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /challenges/:id
router.delete(
  '/:id',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await ChallengeModel.deleteChallenge(req.params.id);
      res.json({ success: true, message: 'Challenge deleted' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /challenges/:id/submit - submit a solution
router.post(
  '/:id/submit',
  authenticate,
  validate(submitChallengeSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const challengeId = req.params.id;
      const userId = req.user!.userId;
      const { code, passed, score } = req.body;

      const challenge = await ChallengeModel.getChallengeById(challengeId);
      if (!challenge) throw new NotFoundError('Challenge');

      const submission = await ChallengeModel.submitChallenge({
        challenge_id: challengeId,
        user_id: userId,
        code,
        passed,
        score,
      });

      res.status(201).json({ success: true, data: submission });
    } catch (error) {
      next(error);
    }
  }
);

// GET /challenges/:id/submissions - get all submissions for a challenge (instructor)
router.get(
  '/:id/submissions',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const submissions = await ChallengeModel.getSubmissionsByChallenge(req.params.id);
      res.json({ success: true, data: submissions });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /challenges/submissions/:submissionId/grade - grade a submission (instructor)
router.put(
  '/submissions/:submissionId/grade',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { submissionId } = req.params;
      const { score, feedback } = req.body;

      const submission = await ChallengeModel.gradeChallengeSubmission(submissionId, score, feedback);
      if (!submission) throw new NotFoundError('Submission');

      try {
        await createNotification({
          user_id: submission.user_id,
          title: 'Challenge Graded',
          message: `Your coding challenge has been graded with a score of ${score}.`,
          type: 'success',
        });
      } catch { }

      res.json({ success: true, data: submission });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
