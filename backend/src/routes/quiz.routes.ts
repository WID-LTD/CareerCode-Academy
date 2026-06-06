import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { query } from '../config/db';
import * as QuizModel from '../models/quiz';
import { NotFoundError, ForbiddenError } from '../utils/errors';

const router = Router();

// GET /quizzes/course/:courseId - Get quizzes for a course (with questions count)
router.get('/course/:courseId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    const quizzes = await QuizModel.getQuizzesByCourse(courseId);

    // Attach question count to each quiz
    const result = await Promise.all(quizzes.map(async (quiz) => {
      const questions = await QuizModel.getQuestionsByQuiz(quiz.id);
      return { ...quiz, questionCount: questions.length };
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /quizzes/:id - Get quiz with questions (hide correct answers for students)
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const quiz = await QuizModel.getQuizById(id);
    if (!quiz) throw new NotFoundError('Quiz');

    const questions = await QuizModel.getQuestionsByQuiz(id);
    const isInstructorOrAdmin = ['instructor', 'admin', 'super_admin'].includes(req.user!.role);

    res.json({
      success: true,
      data: {
        ...quiz,
        questions: questions.map(q => ({
          id: q.id,
          question: q.question,
          options: q.options,
          points: q.points,
          order_index: q.order_index,
          ...(isInstructorOrAdmin ? { correct_answer: q.correct_answer } : {}),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /quizzes - Create quiz (instructor/admin)
router.post('/', authenticate, authorize('instructor', 'admin', 'super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { course_id, lesson_id, title, description, time_limit, passing_score, max_attempts } = req.body;

    // Verify course ownership
    const course = await query('SELECT instructor_id FROM courses WHERE id = $1', [course_id]);
    if (course.rows.length === 0) throw new NotFoundError('Course');
    if (course.rows[0].instructor_id !== req.user!.userId && !['admin', 'super_admin'].includes(req.user!.role)) {
      throw new ForbiddenError();
    }

    const quiz = await QuizModel.createQuiz({
      course_id, lesson_id, title, description, time_limit, passing_score, max_attempts,
    });

    res.status(201).json({ success: true, data: quiz });
  } catch (error) {
    next(error);
  }
});

// PUT /quizzes/:id - Update quiz
router.put('/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const quiz = await QuizModel.getQuizById(req.params.id);
    if (!quiz) throw new NotFoundError('Quiz');

    const course = await query('SELECT instructor_id FROM courses WHERE id = $1', [quiz.course_id]);
    if (course.rows[0].instructor_id !== req.user!.userId && !['admin', 'super_admin'].includes(req.user!.role)) {
      throw new ForbiddenError();
    }

    const updated = await QuizModel.updateQuiz(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /quizzes/:id - Delete quiz
router.delete('/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const quiz = await QuizModel.getQuizById(req.params.id);
    if (!quiz) throw new NotFoundError('Quiz');

    const course = await query('SELECT instructor_id FROM courses WHERE id = $1', [quiz.course_id]);
    if (course.rows[0].instructor_id !== req.user!.userId && !['admin', 'super_admin'].includes(req.user!.role)) {
      throw new ForbiddenError();
    }

    await QuizModel.deleteQuiz(req.params.id);
    res.json({ success: true, message: 'Quiz deleted' });
  } catch (error) {
    next(error);
  }
});

// POST /quizzes/:id/questions - Add question to quiz
router.post('/:id/questions', authenticate, authorize('instructor', 'admin', 'super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const quiz = await QuizModel.getQuizById(req.params.id);
    if (!quiz) throw new NotFoundError('Quiz');

    const course = await query('SELECT instructor_id FROM courses WHERE id = $1', [quiz.course_id]);
    if (course.rows[0].instructor_id !== req.user!.userId && !['admin', 'super_admin'].includes(req.user!.role)) {
      throw new ForbiddenError();
    }

    const { question, options, correct_answer, points, order_index } = req.body;
    const q = await QuizModel.createQuestion({
      quiz_id: req.params.id, question, options, correct_answer, points, order_index,
    });

    res.status(201).json({ success: true, data: q });
  } catch (error) {
    next(error);
  }
});

// PUT /quizzes/questions/:id - Update a question
router.put('/questions/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const question = await QuizModel.getQuestionById(req.params.id);
    if (!question) throw new NotFoundError('Question');

    const quiz = await QuizModel.getQuizById(question.quiz_id);
    if (!quiz) throw new NotFoundError('Quiz');

    const course = await query('SELECT instructor_id FROM courses WHERE id = $1', [quiz.course_id]);
    if (course.rows[0].instructor_id !== req.user!.userId && !['admin', 'super_admin'].includes(req.user!.role)) {
      throw new ForbiddenError();
    }

    const updated = await QuizModel.updateQuestion(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /quizzes/questions/:id - Delete a question
router.delete('/questions/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const question = await QuizModel.getQuestionById(req.params.id);
    if (!question) throw new NotFoundError('Question');

    const quiz = await QuizModel.getQuizById(question.quiz_id);
    if (!quiz) throw new NotFoundError('Quiz');

    const course = await query('SELECT instructor_id FROM courses WHERE id = $1', [quiz.course_id]);
    if (course.rows[0].instructor_id !== req.user!.userId && !['admin', 'super_admin'].includes(req.user!.role)) {
      throw new ForbiddenError();
    }

    await QuizModel.deleteQuestion(req.params.id);
    res.json({ success: true, message: 'Question deleted' });
  } catch (error) {
    next(error);
  }
});

// POST /quizzes/:id/submit - Submit quiz attempt (student)
router.post('/:id/submit', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const quizId = req.params.id;
    const { answers } = req.body;

    const quiz = await QuizModel.getQuizById(quizId);
    if (!quiz) throw new NotFoundError('Quiz');

    // Check if already attempted and max attempts reached
    const existing = await QuizModel.getAttempt(quizId, userId);
    if (existing && quiz.max_attempts <= 1) {
      return res.status(400).json({ success: false, message: 'Quiz already attempted' });
    }

    // Get questions and grade
    const questions = await QuizModel.getQuestionsByQuiz(quizId);
    let score = 0;
    let maxScore = 0;

    for (const q of questions) {
      maxScore += q.points;
      const userAnswer = answers?.find((a: any) => a.questionId === q.id);
      if (userAnswer && userAnswer.answer === q.correct_answer) {
        score += q.points;
      }
    }

    const finalScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const passed = finalScore >= quiz.passing_score;

    // If existing attempt, update it; otherwise create new
    let attempt;
    if (existing) {
      const { rows } = await query(`
        UPDATE quiz_attempts SET answers = $1, score = $2, passed = $3, attempted_at = NOW()
        WHERE id = $4 RETURNING *
      `, [JSON.stringify(answers || []), finalScore, passed, existing.id]);
      attempt = rows[0];
    } else {
      attempt = await QuizModel.createAttempt({ quiz_id: quizId, user_id: userId, answers: answers || [], score: finalScore, passed });
    }

    res.json({
      success: true,
      data: {
        score: finalScore,
        maxScore: 100,
        passed,
        attempt,
        correctCount: score / (questions[0]?.points || 1),
        totalQuestions: questions.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /quizzes/:id/attempts - Get attempts for a quiz (instructor sees all, student sees own)
router.get('/:id/attempts', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const quizId = req.params.id;
    const quiz = await QuizModel.getQuizById(quizId);
    if (!quiz) throw new NotFoundError('Quiz');

    const isInstructorOrAdmin = ['instructor', 'admin', 'super_admin'].includes(req.user!.role);

    if (isInstructorOrAdmin) {
      const attempts = await QuizModel.getAttemptsByQuiz(quizId);
      return res.json({ success: true, data: attempts });
    }

    const attempt = await QuizModel.getAttempt(quizId, req.user!.userId);
    res.json({ success: true, data: attempt ? [attempt] : [] });
  } catch (error) {
    next(error);
  }
});

// GET /quizzes/attempts/my - Get my attempts across all quizzes
router.get('/attempts/my', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const attempts = await QuizModel.getAttemptsByUser(req.user!.userId);
    res.json({ success: true, data: attempts });
  } catch (error) {
    next(error);
  }
});

export default router;