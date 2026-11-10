import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';
import { getDb, dbBackend } from './db';
import { AuthDO } from './crypto-do';
import authRoutes from './routes/auth';
import analyticsRoutes from './routes/analytics';
import publicRoutes from './routes/public';
import liveRoutes from './routes/live';
import courseRoutes from './routes/courses';
import schoolRoutes from './routes/schools';
import studentRoutes from './routes/student';
import notificationRoutes from './routes/notifications';
import certificateRoutes from './routes/certificates';
import careerGoalRoutes from './routes/career-goals';
import enrollmentRoutes from './routes/enrollments';
import lessonRoutes from './routes/lessons';
import moduleRoutes from './routes/modules';
import progressRoutes from './routes/progress';
import reviewRoutes from './routes/reviews';
import wishlistRoutes from './routes/wishlists';
import gamificationRoutes from './routes/gamification';
import learningPathRoutes from './routes/learning-paths';
import searchRoutes from './routes/search';
import userRoutes from './routes/users';
import resourceRoutes from './routes/resources';
import paymentRoutes from './routes/payments';
import programRoutes from './routes/programs';
import calendarRoutes from './routes/calendar';
import guidedRoutes from './routes/guided';
import careerRoutes from './routes/career';
import portfolioRoutes from './routes/portfolio';
import examRoutes from './routes/exams';
import quizRoutes from './routes/quizzes';
import assignmentRoutes from './routes/assignments';
import challengeRoutes from './routes/challenges';
import communityRoutes from './routes/community';
import discussionRoutes from './routes/discussions';
import forumRoutes from './routes/forum';
import adminRoutes from './routes/admin';
import instructorRoutes from './routes/instructor';
import pageRoutes from './routes/pages';
import promotionRoutes from './routes/promotions';
import applicationRoutes from './routes/applications';
import ticketRoutes from './routes/tickets';
import videoRoutes from './routes/videos';
import showcaseVideoRoutes from './routes/showcase-videos';
import uploadRoutes from './routes/upload';
import pathwayFinderRoutes from './routes/pathway-finder';
import messageRoutes from './routes/messages';
import payoutRoutes from './routes/payouts';
import boardRoutes from './routes/board';
import blogRoutes from './routes/blogs';
import aiRoutes from './routes/ai';

export { AuthDO };

const app = new Hono<{ Bindings: Env }>();

function allowedOrigins(env: Env): string[] {
  return [
    env.FRONTEND_URL,
    'https://careercode.com.ng',
    'https://www.careercode.com.ng',
    ...(env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',') : []),
  ]
    .filter(Boolean)
    .map((s) => s.trim());
}

app.use('*', async (c, next) => {
  const allowed = allowedOrigins(c.env);
  return cors({
    origin: (origin) => {
      if (!origin) return origin;
      if (allowed.includes(origin)) return origin;
      return null;
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })(c, next);
});

// ── Health ────────────────────────────────────────────────
app.get('/health', (c) =>
  c.json({
    success: true,
    message: 'CareerCode Academy API (Workers) is running',
    timestamp: new Date().toISOString(),
  })
);

app.get('/db-health', async (c) => {
  // Reports which backend is active and proves it with a real query.
  const backend = (() => { try { return dbBackend(c.env); } catch { return 'unconfigured'; } })();
  try {
    const db = getDb(c.env);
    const { rows } = await db.query<{ now: string }>('SELECT NOW() AS now');
    return c.json({
      success: true,
      message: backend === 'd1' ? 'D1 is connected' : 'Neon is connected',
      backend,
      timestamp: rows[0]?.now,
    });
  } catch (error: any) {
    return c.json(
      { success: false, message: `${backend} connection failed`, backend, detail: error?.message },
      503
    );
  }
});

// ── Phase 1: native versioned API mounts (ported from backend/src/routes) ──
// Registered BEFORE the strangler proxy so native routes take precedence.
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/analytics', analyticsRoutes);
app.route('/api/v1/public', publicRoutes);
app.route('/api/v1/live', liveRoutes);
app.route('/api/v1/courses', courseRoutes);
app.route('/api/v1/schools', schoolRoutes);
app.route('/api/v1/student', studentRoutes);
app.route('/api/v1/notifications', notificationRoutes);
app.route('/api/v1/certificates', certificateRoutes);
app.route('/api/v1/career-goals', careerGoalRoutes);
app.route('/api/v1/enrollments', enrollmentRoutes);
app.route('/api/v1/lessons', lessonRoutes);
app.route('/api/v1/modules', moduleRoutes);
app.route('/api/v1/progress', progressRoutes);
app.route('/api/v1/reviews', reviewRoutes);
app.route('/api/v1/wishlists', wishlistRoutes);
app.route('/api/v1/gamification', gamificationRoutes);
app.route('/api/v1/learning-paths', learningPathRoutes);
app.route('/api/v1/search', searchRoutes);
app.route('/api/v1/users', userRoutes);
app.route('/api/v1/resources', resourceRoutes);
app.route('/api/v1/payments', paymentRoutes);
app.route('/api/v1/programs', programRoutes);
app.route('/api/v1/calendar', calendarRoutes);
app.route('/api/v1/guided', guidedRoutes);
app.route('/api/v1/career', careerRoutes);
app.route('/api/v1/portfolio', portfolioRoutes);
app.route('/api/v1/exams', examRoutes);
app.route('/api/v1/quizzes', quizRoutes);
app.route('/api/v1/assignments', assignmentRoutes);
app.route('/api/v1/challenges', challengeRoutes);
app.route('/api/v1/community', communityRoutes);
app.route('/api/v1/discussions', discussionRoutes);
app.route('/api/v1/forum', forumRoutes);
app.route('/api/v1/admin', adminRoutes);
app.route('/api/v1/instructor', instructorRoutes);
app.route('/api/v1/pages', pageRoutes);
app.route('/api/v1/promotions', promotionRoutes);
app.route('/api/v1/applications', applicationRoutes);
app.route('/api/v1/tickets', ticketRoutes);
app.route('/api/v1/videos', videoRoutes);
app.route('/api/v1/showcase-videos', showcaseVideoRoutes);
app.route('/api/v1/upload', uploadRoutes);
app.route('/api/v1/pathway-finder', pathwayFinderRoutes);
app.route('/api/v1/messages', messageRoutes);
app.route('/api/v1/payouts', payoutRoutes);
app.route('/api/v1/board', boardRoutes);
app.route('/api/v1/blogs', blogRoutes);
app.route('/api/v1/ai', aiRoutes);

// ── No legacy fallback ────────────────────────────────────────────────────
// Every route group is now served natively from D1. An unmatched /api/v1 path
// returns a JSON 404 instead of proxying to Render, so Neon is not reachable
// from the request path at all.
app.all('/api/v1/*', (c) =>
  c.json({ success: false, message: 'Route not found' }, 404)
);

// ── 404 + errors (same envelope as Express API) ──────────
app.notFound((c) => c.json({ success: false, message: 'Route not found' }, 404));
app.onError((err, c) => {
  const status = (err as any)?.statusCode ?? (err as any)?.status ?? 500;
  console.error(JSON.stringify({ src: 'edge-onerror', message: err?.message, status }));
  return c.json({ success: false, source: 'edge', message: err?.message || 'Internal server error' }, status as any);
});

export default app;
