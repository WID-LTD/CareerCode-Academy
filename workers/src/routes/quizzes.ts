import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, requireRole, statusOf } from '../route-utils';
import { awardXp } from '../gamification';
import {
  createAttempt,
  createQuestion,
  createQuiz,
  deleteQuestion,
  deleteQuiz,
  getAttempt,
  getAttemptsByQuiz,
  getAttemptsByUser,
  getQuestionById,
  getQuestionsByQuiz,
  getQuizById,
  getQuizzesByCourse,
  loseHeart,
  updateQuestion,
  updateQuiz,
} from '../quizzes';

const quizzes = new Hono<{ Bindings: Env }>();

const STAFF = ['instructor', 'admin', 'super_admin'];
const STAFF_VIEW = ['instructor', 'admin', 'super_admin'];

// Course ownership check used by every mutating quiz endpoint.
// Returns the course row, or null when the course does not exist.
async function courseFor(db: ReturnType<typeof getDb>, courseId: string) {
  const { rows } = await db.query<any>('SELECT instructor_id FROM courses WHERE id = $1', [courseId]);
  return rows[0] || null;
}

function canManage(course: any, session: { userId: string; role: string }): boolean {
  return course.instructor_id === session.userId || ['admin', 'super_admin'].includes(session.role);
}

function publicQuestion(q: any, includeAnswer: boolean) {
  return {
    id: q.id,
    question: q.question,
    options: q.options,
    points: q.points,
    order_index: q.order_index,
    ...(includeAnswer ? { correct_answer: q.correct_answer } : {}),
  };
}

// GET /api/v1/quizzes/lesson/:lessonId — quiz for a lesson (null if none)
quizzes.get('/lesson/:lessonId', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const { rows } = await db.query<any>(
      'SELECT * FROM quizzes WHERE lesson_id = $1 LIMIT 1',
      [c.req.param('lessonId')]
    );
    const quiz: any = rows[0] || null;

    if (quiz) {
      const questions = await getQuestionsByQuiz(db, quiz.id);
      const isInstructorOrAdmin = STAFF_VIEW.includes(s.role);
      quiz.questions = questions.map((q) => publicQuestion(q, isInstructorOrAdmin));
    }

    return c.json({ success: true, data: quiz });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load quiz');
  }
});

// GET /api/v1/quizzes/course/:courseId — quizzes for a course with question counts
quizzes.get('/course/:courseId', async (c) => {
  try {
    await requireAuth(c);
    const db = getDb(c.env);
    const list = await getQuizzesByCourse(db, c.req.param('courseId'));

    const counts = new Map<string, number>();
    if (list.length) {
      const placeholders = list.map((_, i) => `$${i + 1}`).join(',');
      const { rows } = await db.query<{ quiz_id: string; count: number }>(
        `SELECT quiz_id, COUNT(*)::int as count
         FROM quiz_questions
         WHERE quiz_id IN (${placeholders})
         GROUP BY quiz_id`,
        list.map((q) => q.id)
      );
      for (const row of rows) counts.set(row.quiz_id, Number(row.count) || 0);
    }

    const result = list.map((quiz) => ({ ...quiz, questionCount: counts.get(quiz.id) || 0 }));
    return c.json({ success: true, data: result });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load quizzes');
  }
});

// GET /api/v1/quizzes/attempts/my — my attempts across all quizzes
quizzes.get('/attempts/my', async (c) => {
  try {
    const s = await requireAuth(c);
    const attempts = await getAttemptsByUser(getDb(c.env), s.userId);
    return c.json({ success: true, data: attempts });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load attempts');
  }
});

// GET /api/v1/quizzes/:id/attempts — instructor sees all, student sees own
quizzes.get('/:id/attempts', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const quiz = await getQuizById(db, c.req.param('id'));
    if (!quiz) return fail(c, 404, 'Quiz not found');

    if (STAFF_VIEW.includes(s.role)) {
      const attempts = await getAttemptsByQuiz(db, quiz.id);
      return c.json({ success: true, data: attempts });
    }

    const attempt = await getAttempt(db, quiz.id, s.userId);
    return c.json({ success: true, data: attempt ? [attempt] : [] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load attempts');
  }
});

// GET /api/v1/quizzes/:id — quiz with questions (answers hidden from students)
quizzes.get('/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const quiz = await getQuizById(db, c.req.param('id'));
    if (!quiz) return fail(c, 404, 'Quiz not found');

    const questions = await getQuestionsByQuiz(db, quiz.id);
    const isInstructorOrAdmin = STAFF_VIEW.includes(s.role);

    return c.json({
      success: true,
      data: {
        ...quiz,
        questions: questions.map((q) => publicQuestion(q, isInstructorOrAdmin)),
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load quiz');
  }
});

// POST /api/v1/quizzes — create quiz (instructor/admin)
quizzes.post('/', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const body: any = await c.req.json().catch(() => ({}));
    const { course_id, lesson_id, title, description, time_limit, passing_score, max_attempts } = body;

    const db = getDb(c.env);
    const course = await courseFor(db, course_id);
    if (!course) return fail(c, 404, 'Course not found');
    if (!canManage(course, s)) return fail(c, 403, 'Forbidden access');

    const quiz = await createQuiz(db, {
      course_id, lesson_id, title, description, time_limit, passing_score, max_attempts,
    });
    return c.json({ success: true, data: quiz }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create quiz');
  }
});

// POST /api/v1/quizzes/:id/questions — add question to quiz
quizzes.post('/:id/questions', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const db = getDb(c.env);
    const quiz = await getQuizById(db, c.req.param('id'));
    if (!quiz) return fail(c, 404, 'Quiz not found');

    const course = await courseFor(db, quiz.course_id);
    if (!course) return fail(c, 404, 'Course not found');
    if (!canManage(course, s)) return fail(c, 403, 'Forbidden access');

    const body: any = await c.req.json().catch(() => ({}));
    const { question, options, correct_answer, points, order_index } = body;
    const q = await createQuestion(db, {
      quiz_id: quiz.id, question, options, correct_answer, points, order_index,
    });
    return c.json({ success: true, data: q }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create question');
  }
});

// POST /api/v1/quizzes/:id/submit — submit quiz attempt (student)
quizzes.post('/:id/submit', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const quizId = c.req.param('id');
    const body: any = await c.req.json().catch(() => ({}));
    const answers = body.answers;

    const quiz = await getQuizById(db, quizId);
    if (!quiz) return fail(c, 404, 'Quiz not found');

    // Enforce the quiz attempt limit. Attempt history is stored as a counter on
    // the attempt row so the existing unique(quiz_id,user_id) constraint stays
    // intact while max_attempts is still respected.
    const existing = await getAttempt(db, quizId, s.userId);
    if (existing && Number(existing.attempt_count || 1) >= Number(quiz.max_attempts || 1)) {
      return fail(c, 400, `Quiz attempt limit reached (${quiz.max_attempts})`);
    }

    const questions = await getQuestionsByQuiz(db, quizId);
    let score = 0;
    let maxScore = 0;
    const questionResults: any[] = [];

    for (const q of questions) {
      maxScore += q.points;
      const userAnswer = Array.isArray(answers)
        ? answers.find((a: any) => a.questionId === q.id)
        : undefined;
      const isCorrect = userAnswer?.answer === q.correct_answer;
      if (isCorrect) score += q.points;
      questionResults.push({
        questionId: q.id,
        question: q.question,
        options: q.options,
        userAnswer: userAnswer?.answer || null,
        correctAnswer: q.correct_answer,
        isCorrect,
        points: q.points,
      });
    }

    const finalScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const passed = finalScore >= quiz.passing_score;

    let attempt: any;
    if (existing) {
      const { rows } = await db.query<any>(
        `UPDATE quiz_attempts
         SET answers = $1, score = $2, passed = $3, attempted_at = NOW(),
             attempt_count = COALESCE(attempt_count, 1) + 1
         WHERE id = $4 RETURNING *`,
        [JSON.stringify(answers || []), finalScore, passed, existing.id]
      );
      attempt = rows[0];
    } else {
      attempt = await createAttempt(db, {
        quiz_id: quizId, user_id: s.userId, answers: answers || [], score: finalScore, passed,
      });
    }

    // Gamification: award XP on pass, lose a heart on fail.
    let heartsRemaining: number | undefined;
    if (passed) {
      const xpAmount = finalScore >= 100 ? 30 : finalScore >= 85 ? 20 : 15;
      await awardXp(c.env, s.userId, xpAmount, 'quiz_pass', `Passed quiz with ${finalScore}%`);
    } else {
      heartsRemaining = await loseHeart(db, s.userId);
    }

    const { rows: attemptCount } = await db.query<{ n: number }>(
      'SELECT COUNT(*)::int as n FROM quiz_attempts WHERE quiz_id = $1 AND user_id = $2',
      [quizId, s.userId]
    );

    return c.json({
      success: true,
      data: {
        score: finalScore,
        maxScore: 100,
        passed,
        attempt,
        correctCount: score / (questions[0]?.points || 1),
        totalQuestions: questions.length,
        heartsRemaining,
        questionResults,
        attemptsUsed: attemptCount[0]?.n || 0,
        maxAttempts: quiz.max_attempts,
        passingScore: quiz.passing_score,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to submit quiz');
  }
});

// PUT /api/v1/quizzes/questions/:id — update a question
quizzes.put('/questions/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const db = getDb(c.env);
    const question = await getQuestionById(db, c.req.param('id'));
    if (!question) return fail(c, 404, 'Question not found');

    const quiz = await getQuizById(db, question.quiz_id);
    if (!quiz) return fail(c, 404, 'Quiz not found');

    const course = await courseFor(db, quiz.course_id);
    if (!course) return fail(c, 404, 'Course not found');
    if (!canManage(course, s)) return fail(c, 403, 'Forbidden access');

    const body: any = await c.req.json().catch(() => ({}));
    const updated = await updateQuestion(db, question.id, body);
    return c.json({ success: true, data: updated });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update question');
  }
});

// DELETE /api/v1/quizzes/questions/:id — delete a question
quizzes.delete('/questions/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const db = getDb(c.env);
    const question = await getQuestionById(db, c.req.param('id'));
    if (!question) return fail(c, 404, 'Question not found');

    const quiz = await getQuizById(db, question.quiz_id);
    if (!quiz) return fail(c, 404, 'Quiz not found');

    const course = await courseFor(db, quiz.course_id);
    if (!course) return fail(c, 404, 'Course not found');
    if (!canManage(course, s)) return fail(c, 403, 'Forbidden access');

    await deleteQuestion(db, question.id);
    return c.json({ success: true, message: 'Question deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete question');
  }
});

// PUT /api/v1/quizzes/:id — update quiz
quizzes.put('/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const db = getDb(c.env);
    const quiz = await getQuizById(db, c.req.param('id'));
    if (!quiz) return fail(c, 404, 'Quiz not found');

    const course = await courseFor(db, quiz.course_id);
    if (!course) return fail(c, 404, 'Course not found');
    if (!canManage(course, s)) return fail(c, 403, 'Forbidden access');

    const body: any = await c.req.json().catch(() => ({}));
    const updated = await updateQuiz(db, quiz.id, body);
    return c.json({ success: true, data: updated });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update quiz');
  }
});

// DELETE /api/v1/quizzes/:id — delete quiz
quizzes.delete('/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const db = getDb(c.env);
    const quiz = await getQuizById(db, c.req.param('id'));
    if (!quiz) return fail(c, 404, 'Quiz not found');

    const course = await courseFor(db, quiz.course_id);
    if (!course) return fail(c, 404, 'Course not found');
    if (!canManage(course, s)) return fail(c, 403, 'Forbidden access');

    await deleteQuiz(db, quiz.id);
    return c.json({ success: true, message: 'Quiz deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete quiz');
  }
});

export default quizzes;
