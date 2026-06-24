import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import * as ExamModel from '../models/exam';
import * as ExamProctoringModel from '../models/examProctoring';
import * as CourseModel from '../models/course';
import * as EnrollmentModel from '../models/enrollment';
import * as CertificateModel from '../models/certificate';
import * as CertificateTemplateModel from '../models/certificateTemplate';
import * as NotificationModel from '../models/notification';
import { generateCertificateCode } from '../utils/helpers';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { io } from '../config/socket';

const recordingUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/webm')) cb(null, true);
    else cb(new Error('Only WEBM files are accepted'));
  },
});

async function autoIssueCertificateAfterExamPass(exam: any, userId: string, courseId: string) {
  try {
    if (!exam.certificate_template_id) return;
    const template = await CertificateTemplateModel.getTemplateById(exam.certificate_template_id);
    if (!template || !template.requires_exam) return;

    const enrollment = await EnrollmentModel.getEnrollment(userId, courseId);
    if (!enrollment?.completed) return;

    const existing = await CertificateModel.getCertificateByUserAndCourse(userId, courseId);
    if (existing) return;

    const verificationCode = generateCertificateCode();
    const certificate = await CertificateModel.createCertificate({
      user_id: userId,
      course_id: courseId,
      certificate_template_id: template.id,
      verification_code: verificationCode,
    });

    const course = await CourseModel.getCourseById(courseId);
    await NotificationModel.createNotification({
      user_id: userId,
      title: 'New Certificate Earned!',
      message: `Congratulations! You earned a certificate for completing "${course?.title || 'Course'}".`,
      type: 'certificate' as any,
    });

    io.to(userId).emit('new_notification', { title: 'Certificate Earned', message: `You earned a certificate for ${course?.title || 'Course'}!` });
    if (certificate) {
      io.to(userId).emit('certificate_issued', { certificate });
    }
  } catch (e) {
    console.error('Failed to auto-issue certificate after exam pass:', e);
  }
}

const router = Router();

const emptyOrNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(v => (v === '' || v === null || v === undefined) ? undefined : v, schema.optional());

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
  startsAt: z.preprocess(v => (v === '' || v === null || v === undefined) ? undefined : v, z.string().datetime().optional()),
  endsAt: z.preprocess(v => (v === '' || v === null || v === undefined) ? undefined : v, z.string().datetime().optional()),
  instructions: z.string().optional(),
  randomQuestionsCount: z.number().min(0).max(200).optional(),
  negativeMarking: z.boolean().optional(),
  negativePercentage: z.number().min(0).max(100).optional(),
  certificateTemplateId: z.string().uuid().nullable().optional(),
}).refine(data => {
  if (data.startsAt && data.endsAt && data.startsAt > data.endsAt) return false;
  return true;
}, { message: 'endsAt must be after startsAt', path: ['endsAt'] });

const updateExamSchema = z.object({
  courseId: z.string().uuid().optional(),
  title: z.string().min(2).max(200).optional(),
  description: z.string().optional(),
  durationMinutes: z.number().min(1).max(480).optional(),
  passingScore: z.number().min(0).max(100).optional(),
  maxAttempts: z.number().min(1).max(10).optional(),
  shuffleQuestions: z.boolean().optional(),
  showResults: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  startsAt: z.preprocess(v => (v === '' || v === null || v === undefined) ? undefined : v, z.string().datetime().optional()),
  endsAt: z.preprocess(v => (v === '' || v === null || v === undefined) ? undefined : v, z.string().datetime().optional()),
  instructions: z.string().optional(),
  randomQuestionsCount: z.number().min(0).max(200).optional(),
  negativeMarking: z.boolean().optional(),
  negativePercentage: z.number().min(0).max(100).optional(),
  certificateTemplateId: z.string().uuid().nullable().optional(),
});

const questionSchema = z.object({
  question: z.string().min(1),
  questionType: z.enum(['mcq', 'true_false', 'essay']).optional(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().min(1),
  points: z.number().min(1).optional(),
  orderIndex: z.number().min(0).optional(),
});

// ───────────────────────── Admin / Instructor Routes ─────────────────────────

// Helper: verify the requesting instructor owns the exam's course
async function verifyExamAccess(req: AuthRequest, examId: string): Promise<void> {
  if (req.user?.role !== 'instructor') return; // admin/super_admin always allowed
  const exam = await ExamModel.getExamById(examId);
  if (!exam) throw new NotFoundError('Exam');
  const { query: dbQuery } = await import('../config/db');
  const { rows } = await dbQuery(
    'SELECT 1 FROM courses WHERE id = $1 AND instructor_id = $2',
    [exam.course_id, req.user!.userId]
  );
  if (rows.length === 0) throw new ForbiddenError('You do not have access to this exam');
}

// GET /exams/courses — list courses for exam creation dropdown (admin/instructor)
router.get(
  '/courses',
  authenticate,
  authorize('admin', 'super_admin', 'instructor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { query: dbQuery } = await import('../config/db');
      let sql = `SELECT id, title FROM courses`;
      const params: any[] = [];
      if (req.user?.role === 'instructor') {
        sql += ` WHERE instructor_id = $1`;
        params.push(req.user.userId);
      }
      sql += ` ORDER BY title`;
      const { rows } = await dbQuery(sql, params);
      res.json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  }
);

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

      let exams, total;
      if (req.user?.role === 'instructor') {
        exams = await ExamModel.getExamsByInstructor(req.user.userId, limit, offset);
        total = await ExamModel.countExamsByInstructor(req.user.userId);
      } else {
        exams = await ExamModel.getAllExams(limit, offset);
        total = await ExamModel.countExams();
      }

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
  authorize('admin', 'super_admin', 'instructor'),
  validate(createExamSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const course = await CourseModel.getCourseById(data.courseId);
      if (!course) throw new NotFoundError('Course');

      // Instructors can only create exams for their own courses
      if (req.user?.role === 'instructor' && course.instructor_id !== req.user.userId) {
        throw new ForbiddenError('You can only create exams for your own courses');
      }

      const exam = await ExamModel.createExam({
        course_id: data.courseId,
        title: data.title,
        description: data.description ?? undefined,
        duration_minutes: data.durationMinutes,
        passing_score: data.passingScore,
        max_attempts: data.maxAttempts,
        shuffle_questions: data.shuffleQuestions,
        show_results: data.showResults,
        is_published: data.isPublished,
        starts_at: data.startsAt ?? null,
        ends_at: data.endsAt ?? null,
        instructions: data.instructions ?? undefined,
        random_questions_count: data.randomQuestionsCount,
        negative_marking: data.negativeMarking,
        negative_percentage: data.negativePercentage,
        certificate_template_id: data.certificateTemplateId ?? null,
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
  authorize('admin', 'super_admin', 'instructor'),
  validate(updateExamSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await verifyExamAccess(req, req.params.id);
      const exam = await ExamModel.getExamById(req.params.id);
      if (!exam) throw new NotFoundError('Exam');

      const data = req.body;
      const updated = await ExamModel.updateExam(req.params.id, {
        course_id: data.courseId,
        title: data.title,
        description: data.description,
        duration_minutes: data.durationMinutes,
        passing_score: data.passingScore,
        max_attempts: data.maxAttempts,
        shuffle_questions: data.shuffleQuestions,
        show_results: data.showResults,
        is_published: data.isPublished,
        starts_at: data.startsAt !== undefined ? data.startsAt : undefined,
        ends_at: data.endsAt !== undefined ? data.endsAt : undefined,
        instructions: data.instructions,
        random_questions_count: data.randomQuestionsCount,
        negative_marking: data.negativeMarking,
        negative_percentage: data.negativePercentage,
        certificate_template_id: data.certificateTemplateId !== undefined ? data.certificateTemplateId : undefined,
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
  authorize('admin', 'super_admin', 'instructor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await verifyExamAccess(req, req.params.id);
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
  authorize('admin', 'super_admin', 'instructor'),
  validate(questionSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await verifyExamAccess(req, req.params.examId);
      const exam = await ExamModel.getExamById(req.params.examId);
      if (!exam) throw new NotFoundError('Exam');

      const data = req.body;
      const questions = await ExamModel.getQuestionsByExam(req.params.examId);
      const orderIndex = data.orderIndex ?? questions.length;

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
  authorize('admin', 'super_admin', 'instructor'),
  validate(questionSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await verifyExamAccess(req, req.params.examId);
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
  authorize('admin', 'super_admin', 'instructor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await verifyExamAccess(req, req.params.examId);
      const deleted = await ExamModel.deleteQuestion(req.params.questionId);
      if (!deleted) throw new NotFoundError('Question');
      res.json({ success: true, message: 'Question deleted' });
    } catch (error) {
      next(error);
    }
  }
);

// ───────────────────────── Administrator Attempt Management ─────────────────────────

// GET /exams/:id/attempts — list all attempts for an exam
router.get(
  '/:id/attempts',
  authenticate,
  authorize('admin', 'super_admin', 'instructor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await verifyExamAccess(req, req.params.id);
      const exam = await ExamModel.getExamById(req.params.id);
      if (!exam) throw new NotFoundError('Exam');

      const attempts = await ExamModel.getAttemptsByExam(req.params.id);
      res.json({ success: true, data: attempts });
    } catch (error) {
      next(error);
    }
  }
);

// GET /exams/:id/attempts/:attemptId — view attempt detail
router.get(
  '/:id/attempts/:attemptId',
  authenticate,
  authorize('admin', 'super_admin', 'instructor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await verifyExamAccess(req, req.params.id);
      const attempt = await ExamModel.getAttemptById(req.params.attemptId);
      if (!attempt) throw new NotFoundError('Attempt');

      const answers = await ExamModel.getAnswersForAttempt(req.params.attemptId);
      res.json({ success: true, data: { attempt, answers } });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /exams/:id/attempts/:attemptId/grade — manually grade attempt
router.put(
  '/:id/attempts/:attemptId/grade',
  authenticate,
  authorize('admin', 'super_admin', 'instructor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await verifyExamAccess(req, req.params.id);
      const { manualScore } = req.body;
      if (manualScore === undefined || manualScore < 0 || manualScore > 100) {
        return res.status(400).json({ success: false, message: 'manualScore must be 0-100' });
      }

      const exam = await ExamModel.getExamById(req.params.id);
      if (!exam) throw new NotFoundError('Exam');

      const passed = manualScore >= exam.passing_score;
      const updated = await ExamModel.updateAttemptManualGrade(req.params.attemptId, manualScore, true);
      if (!updated) throw new NotFoundError('Attempt');

      if (passed) {
        await autoIssueCertificateAfterExamPass(exam, updated.user_id, exam.course_id);
      }

      res.json({ success: true, data: { ...updated, passed } });
    } catch (error) {
      next(error);
    }
  }
);

// POST /exams/:id/duplicate — duplicate an exam
router.post(
  '/:id/duplicate',
  authenticate,
  authorize('admin', 'super_admin', 'instructor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await verifyExamAccess(req, req.params.id);
      const exam = await ExamModel.getExamById(req.params.id);
      if (!exam) throw new NotFoundError('Exam');

      const newTitle = req.body.title || `${exam.title} (Copy)`;
      const duplicated = await ExamModel.duplicateExam(req.params.id, newTitle);

      res.status(201).json({ success: true, data: duplicated });
    } catch (error) {
      next(error);
    }
  }
);

// GET /exams/:id/export — CSV export of results
router.get(
  '/:id/export',
  authenticate,
  authorize('admin', 'super_admin', 'instructor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await verifyExamAccess(req, req.params.id);
      const exam = await ExamModel.getExamById(req.params.id);
      if (!exam) throw new NotFoundError('Exam');

      const attempts = await ExamModel.getAttemptsByExam(req.params.id);

      const header = 'Student Name,Email,Score,Passed,Status,Started At,Submitted At\n';
      const rows = attempts.map((a: any) =>
        `"${a.user_name || ''}","${a.user_email || ''}",${a.score ?? ''},${a.passed ? 'Yes' : 'No'},${a.status},"${a.started_at ? new Date(a.started_at).toLocaleString() : ''}","${a.submitted_at ? new Date(a.submitted_at).toLocaleString() : ''}"`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="exam-${exam.title.replace(/[^a-z0-9]/gi, '_')}-results.csv"`);
      res.send(header + rows);
    } catch (error) {
      next(error);
    }
  }
);

// ───────────────────────── Student Routes ─────────────────────────

function getExamScheduleStatus(exam: any): string {
  const now = new Date();
  if (exam.starts_at && new Date(exam.starts_at) > now) return 'upcoming';
  if (exam.ends_at && new Date(exam.ends_at) < now) return 'expired';
  return 'available';
}

// GET /exams/student/list — available exams for enrolled courses
router.get(
  '/student/list',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const exams = await ExamModel.getAvailableExamsForUser(userId);

      const enriched = exams.map((e: any) => ({
        ...e,
        schedule_status: getExamScheduleStatus(e),
      }));

      res.json({ success: true, data: enriched });
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

      const status = getExamScheduleStatus(exam);
      if (status === 'expired') {
        return res.status(403).json({ success: false, message: 'This exam has ended' });
      }

      const enrolled = await checkEnrolled(exam.course_id, userId);
      if (!enrolled) {
        return res.status(403).json({ success: false, message: 'You are not enrolled in this course' });
      }

      // Certificate template qualification check
      if (exam.certificate_template_id) {
        const { getTemplateById } = await import('../models/certificateTemplate');
        const template = await getTemplateById(exam.certificate_template_id);
        if (template) {
          const enrollment = await EnrollmentModel.getEnrollment(userId, template.course_id);
          if (!enrollment || !enrollment.completed) {
            return res.status(403).json({
              success: false,
              message: 'You must complete the linked course before taking this exam',
            });
          }
        }
      }

      if (exam.max_attempts > 0) {
        const attemptCount = await ExamModel.countAttempts(req.params.examId, userId);
        if (attemptCount >= exam.max_attempts) {
          return res.status(403).json({ success: false, message: 'Maximum attempts reached' });
        }
      }

      let questions;
      if (exam.random_questions_count > 0) {
        questions = await ExamModel.getRandomQuestions(req.params.examId, exam.random_questions_count);
      } else {
        questions = await ExamModel.getQuestionsByExam(req.params.examId);
      }

      const safeQuestions = questions.map((q: any) => ({
        id: q.id,
        question: q.question,
        question_type: q.question_type,
        options: q.options,
        points: q.points,
        order_index: q.order_index,
      }));

      const activeAttempt = await ExamModel.getActiveAttempt(req.params.examId, userId);
      const attemptCount = await ExamModel.countAttempts(req.params.examId, userId);

      res.json({
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

      const status = getExamScheduleStatus(exam);
      if (status === 'upcoming') {
        return res.status(403).json({ success: false, message: 'This exam has not started yet' });
      }
      if (status === 'expired') {
        return res.status(403).json({ success: false, message: 'This exam has ended' });
      }

      const enrolled = await checkEnrolled(exam.course_id, userId);
      if (!enrolled) {
        return res.status(403).json({ success: false, message: 'Not enrolled' });
      }

      // Certificate template qualification check
      if (exam.certificate_template_id) {
        const { getTemplateById } = await import('../models/certificateTemplate');
        const template = await getTemplateById(exam.certificate_template_id);
        if (template) {
          const enrollment = await EnrollmentModel.getEnrollment(userId, template.course_id);
          if (!enrollment || !enrollment.completed) {
            return res.status(403).json({
              success: false,
              message: 'You must complete the linked course before starting this exam',
            });
          }
        }
      }

      // Abandon any existing active attempt — every exam is a fresh start
      const active = await ExamModel.getActiveAttempt(req.params.examId, userId);
      if (active) {
        await ExamModel.abandonAttempt(active.id);
      }

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
      const { answers, flaggedQuestions } = req.body;
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

      let totalPoints = 0;
      let maxPoints = 0;
      let wrongCount = 0;

      for (const q of questions) {
        maxPoints += q.points;
      }

      for (const ans of answers) {
        const question = questionMap.get(ans.questionId);
        if (!question) continue;

        const isCorrect = question.correct_answer.toLowerCase().trim() === (ans.answer || '').toLowerCase().trim();
        const pointsEarned = isCorrect ? question.points : 0;
        totalPoints += pointsEarned;
        if (!isCorrect) wrongCount++;

        await ExamModel.saveAnswer(activeAttempt.id, ans.questionId, ans.answer, isCorrect, pointsEarned);
      }

      // Apply negative marking
      let percentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
      if (exam.negative_marking && exam.negative_percentage > 0 && wrongCount > 0) {
        const deduction = Math.round(wrongCount * exam.negative_percentage);
        percentage = Math.max(0, percentage - deduction);
      }

      // Update flagged answers if provided
      if (flaggedQuestions && Array.isArray(flaggedQuestions)) {
        await ExamModel.updateAttemptFlags(activeAttempt.id, flaggedQuestions);
      }

      const passed = percentage >= exam.passing_score;
      await ExamModel.submitAttempt(activeAttempt.id, percentage, passed);

      if (passed) {
        await autoIssueCertificateAfterExamPass(exam, userId, exam.course_id);
      }

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

      const exam = await ExamModel.getExamById(req.params.examId);
      const questions = await ExamModel.getQuestionsByExam(req.params.examId);
      let totalScore = 0;
      let maxScore = 0;
      for (const q of questions) {
        maxScore += q.points;
      }

      const answers = await ExamModel.getAnswersForAttempt(activeAttempt.id);
      for (const ans of answers) {
        totalScore += ans.points_earned || 0;
      }

      const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
      const passed = exam ? percentage >= exam.passing_score : false;

      await ExamModel.submitAttempt(activeAttempt.id, percentage, passed);

      if (passed && exam) {
        await autoIssueCertificateAfterExamPass(exam, userId, exam.course_id);
      }

      res.json({
        success: true,
        data: { attemptId: activeAttempt.id, score: percentage, passed, timedOut: true },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /exams/student/:examId/results/:attemptId — view results for an attempt
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

      const examAnswers = await ExamModel.getAnswersForAttempt(req.params.attemptId);

      res.json({
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

// POST /exams/student/:examId/attempts/:attemptId/upload-recording — upload WEBM recording to S3
router.post(
  '/student/:examId/attempts/:attemptId/upload-recording',
  authenticate,
  recordingUpload.single('recording'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No recording file provided' });
      }

      const attempt = await ExamModel.getAttemptById(req.params.attemptId);
      if (!attempt || attempt.user_id !== userId || attempt.exam_id !== req.params.examId) {
        return res.status(400).json({ success: false, message: 'Invalid attempt' });
      }

      const durationSeconds = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000);
      const recording = await ExamProctoringModel.saveRecording(
        attempt.id,
        req.file.buffer,
        `exam-${req.params.examId}-${attempt.id}.webm`,
        durationSeconds
      );

      res.json({ success: true, data: recording });
    } catch (error) {
      next(error);
    }
  }
);

// ───────────────────────── Monitor & Proctoring Routes (Admin & Instructor) ─────────────────────────

// GET /exams/monitor/active-attempts
router.get(
  '/monitor/active-attempts',
  authenticate,
  authorize('admin', 'super_admin', 'instructor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const instructorId = req.user!.role === 'instructor' ? req.user!.userId : undefined;
      const attempts = await ExamModel.getAllActiveAttempts(instructorId);
      res.json({ success: true, data: attempts });
    } catch (error) {
      next(error);
    }
  }
);

// GET /exams/monitor/proctoring-history
router.get(
  '/monitor/proctoring-history',
  authenticate,
  authorize('admin', 'super_admin', 'instructor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(Math.abs(parseInt(req.query.limit as string) || 20), 100);
      const offset = Math.abs(parseInt(req.query.offset as string) || 0);
      const search = req.query.search as string || undefined;
      const instructorId = req.user!.role === 'instructor' ? req.user!.userId : undefined;
      const result = await ExamProctoringModel.getRecordingsHistory(limit, offset, search, instructorId);
      res.json({ success: true, data: result.recordings, total: result.total });
    } catch (error) {
      next(error);
    }
  }
);

// GET /exams/monitor/proctoring-recording/:attemptId
router.get(
  '/monitor/proctoring-recording/:attemptId',
  authenticate,
  authorize('admin', 'super_admin', 'instructor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const recording = await ExamProctoringModel.getRecordingByAttemptId(req.params.attemptId);
      if (!recording) {
        return res.status(404).json({ success: false, message: 'Recording not found' });
      }
      res.json({ success: true, data: recording });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /exams/monitor/proctoring-recording/:recordingId
router.delete(
  '/monitor/proctoring-recording/:recordingId',
  authenticate,
  authorize('admin', 'super_admin', 'instructor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const deleted = await ExamProctoringModel.deleteRecordingById(req.params.recordingId);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Recording not found' });
      }
      res.json({ success: true, message: 'Recording deleted' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
