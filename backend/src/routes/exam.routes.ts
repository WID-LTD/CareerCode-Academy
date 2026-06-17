import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import * as ExamModel from '../models/exam';
import * as CourseModel from '../models/course';
import { NotFoundError, ForbiddenError } from '../utils/errors';

const router = Router();

const createExamSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(2).max(200),
  description: z.string().optional(),
  durationMinutes: z.number().min(1).max(480).optional(),
  passingScore: z.number().min(0).max(100).optional(),
  maxAttempts: z.number().min(1).max(10).optional(),
  shuffleQuestions: z.boolean().optional(),
  showResults: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

const updateExamSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().optional(),
  durationMinutes: z.number().min(1).max(480).optional(),
  passingScore: z.number().min(0).max(100).optional(),
  maxAttempts: z.number().min(1).max(10).optional(),
  shuffleQuestions: z.boolean().optional(),
  showResults: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

const questionSchema = z.object({
  question: z.string().min(1),
  questionType: z.enum(['mcq', 'true_false', 'essay']).optional(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().min(1),
  points: z.number().min(1).optional(),
  orderIndex: z.number().min(0).optional(),
});

const answerSchema = z.object({
  questionId: z.string().uuid(),
  answer: z.string(),
});

// ───────────────────────── Admin / Instructor Routes ─────────────────────────

// GET /exams — list all exams (admin/instructor)
router.get(
  '/',
  authenticate,
  authorize('admin', 'super_admin', 'instructor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const offset = (page - 1) * limit;

      const exams = await ExamModel.getAllExams(limit, offset);
      const total = await ExamModel.countExams();

      res.json({
        success: true,
        data: exams,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /exams/:id — get exam details with questions
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin', 'instructor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const exam = await ExamModel.getExamById(req.params.id);
      if (!exam) throw new NotFoundError('Exam');

      const questions = await ExamModel.getQuestionsByExam(req.params.id);
      res.json({ success: true, data: { ...exam, questions } });
    } catch (error) {
      next(error);
    }
  }
);

// POST /exams — create exam
router.post(
  '/',
  authenticate,
  authorize('admin', 'super_admin'),
  validate(createExamSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const course = await CourseModel.getCourseById(data.courseId);
      if (!course) throw new NotFoundError('Course');

      const exam = await ExamModel.createExam({
        course_id: data.courseId,
        title: data.title,
        description: data.description,
        duration_minutes: data.durationMinutes,
        passing_score: data.passingScore,
        max_attempts: data.maxAttempts,
        shuffle_questions: data.shuffleQuestions,
        show_results: data.showResults,
        is_published: data.isPublished,
      });

      res.status(201).json({ success: true, data: exam });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /exams/:id — update exam
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  validate(updateExamSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const exam = await ExamModel.getExamById(req.params.id);
      if (!exam) throw new NotFoundError('Exam');

      const data = req.body;
      const updated = await ExamModel.updateExam(req.params.id, {
        title: data.title,
        description: data.description,
        duration_minutes: data.durationMinutes,
        passing_score: data.passingScore,
        max_attempts: data.maxAttempts,
        shuffle_questions: data.shuffleQuestions,
        show_results: data.showResults,
        is_published: data.isPublished,
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /exams/:id — delete exam
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const exam = await ExamModel.getExamById(req.params.id);
      if (!exam) throw new NotFoundError('Exam');

      await ExamModel.deleteExam(req.params.id);
      res.json({ success: true, message: 'Exam deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// ───────────────────────── Questions CRUD ─────────────────────────

// POST /exams/:examId/questions — add question
router.post(
  '/:examId/questions',
  authenticate,
  authorize('admin', 'super_admin'),
  validate(questionSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const exam = await ExamModel.getExamById(req.params.examId);
      if (!exam) throw new NotFoundError('Exam');

      const data = req.body;
      const questions = await ExamModel.getQuestionsByExam(req.params.examId);
      const orderIndex = data.orderIndex ?? questions.length;

      // Parse options for true_false
      let options = data.options || [];
      if (data.questionType === 'true_false' && options.length === 0) {
        options = ['True', 'False'];
      }

      const question = await ExamModel.createQuestion({
        exam_id: req.params.examId,
        question: data.question,
        question_type: data.questionType || 'mcq',
        options,
        correct_answer: data.correctAnswer,
        points: data.points || 1,
        order_index: orderIndex,
      });

      res.status(201).json({ success: true, data: question });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /exams/:examId/questions/:questionId — update question
router.put(
  '/:examId/questions/:questionId',
  authenticate,
  authorize('admin', 'super_admin'),
  validate(questionSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = req.body;

      let options = data.options;
      if (data.questionType === 'true_false' && (!options || options.length === 0)) {
        options = ['True', 'False'];
      }

      const question = await ExamModel.updateQuestion(req.params.questionId, {
        question: data.question,
        question_type: data.questionType,
        options,
        correct_answer: data.correctAnswer,
        points: data.points,
        order_index: data.orderIndex,
      });

      if (!question) throw new NotFoundError('Question');
      res.json({ success: true, data: question });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /exams/:examId/questions/:questionId — delete question
router.delete(
  '/:examId/questions/:questionId',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const deleted = await ExamModel.deleteQuestion(req.params.questionId);
      if (!deleted) throw new NotFoundError('Question');
      res.json({ success: true, message: 'Question deleted' });
    } catch (error) {
      next(error);
    }
  }
);

// ───────────────────────── Student Routes ─────────────────────────

// GET /exams/student/list — available exams for enrolled courses
router.get(
  '/student/list',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const exams = await ExamModel.getAvailableExamsForUser(userId);
      res.json({ success: true, data: exams });
    } catch (error) {
      next(error);
    }
  }
);

// GET /exams/student/history — past attempts
router.get(
  '/student/history',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const history = await ExamModel.getStudentExamHistory(userId);
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }
);

// GET /exams/student/:examId — get exam to take (with questions, no answers)
router.get(
  '/student/:examId',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const exam = await ExamModel.getExamById(req.params.examId);
      if (!exam) throw new NotFoundError('Exam');
      if (!exam.is_published) throw new NotFoundError('Exam');

      // Check enrollment
      const enrolled = await checkEnrolled(exam.course_id, userId);
      if (!enrolled) {
        return res.status(403).json({ success: false, message: 'You are not enrolled in this course' });
      }

      // Check attempt limit
      if (exam.max_attempts > 0) {
        const attemptCount = await ExamModel.countAttempts(req.params.examId, userId);
        if (attemptCount >= exam.max_attempts) {
          return res.status(403).json({ success: false, message: 'Maximum attempts reached' });
        }
      }

      const questions = await ExamModel.getQuestionsByExam(req.params.examId);

      // Strip correct answers for the frontend
      const safeQuestions = questions.map(q => ({
        id: q.id,
        question: q.question,
        question_type: q.question_type,
        options: q.options,
        points: q.points,
        order_index: q.order_index,
      }));

      // Check for existing in-progress attempt
      const activeAttempt = await ExamModel.getActiveAttempt(req.params.examId, userId);

      res.json({
        success: true,
        data: {
          ...exam,
          questions: exam.shuffle_questions ? shuffleArray(safeQuestions) : safeQuestions,
          activeAttemptId: activeAttempt?.id || null,
          activeAttemptStartedAt: activeAttempt?.started_at || null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /exams/student/:examId/start — start a new attempt
router.post(
  '/student/:examId/start',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const exam = await ExamModel.getExamById(req.params.examId);
      if (!exam) throw new NotFoundError('Exam');

      const enrolled = await checkEnrolled(exam.course_id, userId);
      if (!enrolled) {
        return res.status(403).json({ success: false, message: 'Not enrolled' });
      }

      // Check existing in-progress attempt
      const active = await ExamModel.getActiveAttempt(req.params.examId, userId);
      if (active) {
        return res.json({ success: true, data: { attempt: active, resumed: true } });
      }

      // Check max attempts
      if (exam.max_attempts > 0) {
        const count = await ExamModel.countAttempts(req.params.examId, userId);
        if (count >= exam.max_attempts) {
          return res.status(403).json({ success: false, message: 'Maximum attempts reached' });
        }
      }

      const attempt = await ExamModel.createAttempt(req.params.examId, userId);
      res.status(201).json({ success: true, data: { attempt, resumed: false } });
    } catch (error) {
      next(error);
    }
  }
);

// POST /exams/student/:examId/submit — submit answers
router.post(
  '/student/:examId/submit',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { answers } = req.body;
      if (!Array.isArray(answers)) {
        return res.status(400).json({ success: false, message: 'answers must be an array' });
      }

      const exam = await ExamModel.getExamById(req.params.examId);
      if (!exam) throw new NotFoundError('Exam');

      const activeAttempt = await ExamModel.getActiveAttempt(req.params.examId, userId);
      if (!activeAttempt) {
        return res.status(400).json({ success: false, message: 'No active attempt found' });
      }

      const questions = await ExamModel.getQuestionsByExam(req.params.examId);
      const questionMap = new Map(questions.map(q => [q.id, q]));

      let totalScore = 0;
      let maxScore = 0;

      for (const q of questions) {
        maxScore += q.points;
      }

      for (const ans of answers) {
        const question = questionMap.get(ans.questionId);
        if (!question) continue;

        const isCorrect = question.correct_answer.toLowerCase().trim() === (ans.answer || '').toLowerCase().trim();
        const pointsEarned = isCorrect ? question.points : 0;
        totalScore += pointsEarned;

        await ExamModel.saveAnswer(activeAttempt.id, ans.questionId, ans.answer, isCorrect, pointsEarned);
      }

      const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
      const passed = percentage >= exam.passing_score;

      await ExamModel.submitAttempt(activeAttempt.id, percentage, passed);

      res.json({
        success: true,
        data: {
          attemptId: activeAttempt.id,
          score: percentage,
          passed,
          totalQuestions: questions.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /exams/student/:examId/timeout — timeout attempt
router.post(
  '/student/:examId/timeout',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const activeAttempt = await ExamModel.getActiveAttempt(req.params.examId, userId);
      if (!activeAttempt) {
        return res.status(400).json({ success: false, message: 'No active attempt' });
      }

      const questions = await ExamModel.getQuestionsByExam(req.params.examId);
      let totalScore = 0;
      let maxScore = 0;
      for (const q of questions) {
        maxScore += q.points;
      }

      // Grade whatever answers were saved
      const answers = await ExamModel.getAnswersForAttempt(activeAttempt.id);
      for (const ans of answers) {
        totalScore += ans.points_earned || 0;
      }

      const exam = await ExamModel.getExamById(req.params.examId);
      const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
      const passed = exam ? percentage >= exam.passing_score : false;

      await ExamModel.submitAttempt(activeAttempt.id, percentage, passed);

      res.json({
        success: true,
        data: { attemptId: activeAttempt.id, score: percentage, passed, timedOut: true },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /exams/student/:examId/results — view results for an attempt
router.get(
  '/student/:examId/results/:attemptId',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const attempt = await ExamModel.getAttemptById(req.params.attemptId);
      if (!attempt) throw new NotFoundError('Attempt');
      if (attempt.user_id !== userId) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      const exam = await ExamModel.getExamById(req.params.examId);
      if (!exam) throw new NotFoundError('Exam');

      const answers = await ExamModel.getAnswersForAttempt(req.params.attemptId);

      res.json({
        success: true,
        data: {
          attempt,
          exam: { title: exam.title, passing_score: exam.passing_score, show_results: exam.show_results },
          answers,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Helper: check enrollment
async function checkEnrolled(courseId: string, userId: string): Promise<boolean> {
  try {
    const { query } = await import('../config/db');
    const { rows } = await query(
      'SELECT 1 FROM enrollments WHERE course_id = $1 AND user_id = $2',
      [courseId, userId]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default router;
