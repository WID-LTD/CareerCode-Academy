import dotenv from 'dotenv';
dotenv.config();

import { validateEnv } from './config/env';
// Validate env early (logs warnings in dev, exits in prod)
try { validateEnv(); console.log('✅ Environment variables validated'); } catch {}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import http from 'http';
import { createSocketServer } from './config/socket';

import { errorHandler } from './middleware/errorHandler';
import { analyticsTracker } from './middleware/analytics';
import authRoutes from './routes/auth.routes';
import courseRoutes from './routes/course.routes';
import lessonRoutes from './routes/lesson.routes';
import assignmentRoutes from './routes/assignment.routes';
import paymentRoutes from './routes/payment.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import certificateRoutes from './routes/certificate.routes';
import blogRoutes from './routes/blog.routes';
import reviewRoutes from './routes/review.routes';
import notificationRoutes from './routes/notification.routes';
import forumRoutes from './routes/forum.routes';
import instructorRoutes from './routes/instructor.routes';
import enrollmentRoutes from './routes/enrollment.routes';
import studentRoutes from './routes/student.routes';
import aiRoutes from './routes/ai.routes';
import applicationRoutes from './routes/application.routes';
import moduleRoutes from './routes/module.routes';
import resourceRoutes from './routes/resource.routes';
import searchRoutes from './routes/search.routes';
import quizRoutes from './routes/quiz.routes';
import wishlistRoutes from './routes/wishlist.routes';
import progressRoutes from './routes/progress.routes';
import ticketRoutes from './routes/ticket.routes';
import learningPathRoutes from './routes/learningPath.routes';
import pageRoutes from './routes/page.routes';
import videoRoutes from './routes/video.routes';
import showcaseVideoRoutes from './routes/showcase-video.routes';
import challengeRoutes from './routes/challenge.routes';
import examRoutes from './routes/exam.routes';
import gamificationRoutes from './routes/gamification.routes';
import payoutRoutes from './routes/payout.routes';
import testRoutes from './routes/test.routes';
import analyticsRoutes from './routes/analytics.routes';
import schoolRoutes from './routes/school.routes';
import careerRoutes from './routes/career.routes';
import careerGoalRoutes from './routes/careerGoal.routes';
import discussionRoutes from './routes/discussion.routes';
import communityRoutes from './routes/community.routes';
import calendarRoutes from './routes/calendar.routes';
import uploadRoutes from './routes/upload.routes';
import publicRoutes from './routes/public.routes';
import portfolioRoutes from './routes/portfolio.routes';
import guidedRoutes from './routes/guided.routes';
import pathwayFinderRoutes from './routes/pathwayFinder.routes';
import promotionRoutes from './routes/promotion.routes';
import boardRoutes from './routes/board.routes';
import programsRoutes from './routes/programs.routes';
import { query } from './config/db';
import passport, { configurePassport } from './config/passport';

const app = express();
app.set('trust proxy', 1);
const PORT = parseInt(process.env.PORT || '5000', 10);

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.FRONTEND_URL,
      'https://career-code-academy.vercel.app',
      'https://careercode-academy-1.onrender.com',
      'https://careercode-academy.onrender.com',
      ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : []),
    ].filter(Boolean) as string[];

    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else if (/\.vercel\.app$/.test(origin) || /\.onrender\.com$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting (relaxed for development/testing)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

import path from 'path';
// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Initialize Passport
configurePassport();
app.use(passport.initialize());

// Analytics tracking middleware
app.use(analyticsTracker);

// Health check
app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'CareerCode Academy API is running', timestamp: new Date().toISOString(), build: 'c8a454b-probe' });
});

app.get('/db-health', async (_req, res) => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return res.status(503).json({
      success: false,
      message: 'DATABASE_URL is not configured in .env',
      hint: 'Copy backend/.env.example to backend/.env and set your DATABASE_URL',
    });
  }
  try {
    const dbRes = await query('SELECT NOW()');
    res.json({ success: true, message: 'Database is connected', timestamp: dbRes.rows[0].now });
  } catch (error) {
    const msg = (error as Error).message;
    res.status(503).json({
      success: false,
      message: 'Database connection failed',
      detail: msg.includes('ETIMEDOUT')
        ? 'Connection timed out — check your network or wake up NeonDB'
        : msg.includes('ECONNREFUSED')
          ? 'Connection refused — database server may be down'
          : msg,
    });
  }
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/lessons', lessonRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/certificates', certificateRoutes);
app.use('/api/v1/blogs', blogRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/forum', forumRoutes);
app.use('/api/v1/instructor', instructorRoutes);
app.use('/api/v1/enrollments', enrollmentRoutes);
app.use('/api/v1/student', studentRoutes);
app.use('/api/v1/student/ai', aiRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/modules', moduleRoutes);
app.use('/api/v1/resources', resourceRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/quizzes', quizRoutes);
app.use('/api/v1/wishlists', wishlistRoutes);
app.use('/api/v1/progress', progressRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/learning-paths', learningPathRoutes);
app.use('/api/v1/pages', pageRoutes);
app.use('/api/v1/videos', videoRoutes);
app.use('/api/v1/challenges', challengeRoutes);
app.use('/api/v1/exams', examRoutes);
app.use('/api/v1/gamification', gamificationRoutes);
app.use('/api/v1/payouts', payoutRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/schools', schoolRoutes);
app.use('/api/v1/career', careerRoutes);
app.use('/api/v1/career-goals', careerGoalRoutes);
app.use('/api/v1/discussions', discussionRoutes);
app.use('/api/v1/community', communityRoutes);
app.use('/api/v1/calendar', calendarRoutes);
app.use('/api/v1/showcase-videos', showcaseVideoRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/portfolio', portfolioRoutes);
app.use('/api/v1/guided', guidedRoutes);
app.use('/api/v1/pathway-finder', pathwayFinderRoutes);
app.use('/api/v1/promotions', promotionRoutes);
app.use('/api/v1/board', boardRoutes);
app.use('/api/v1/programs', programsRoutes);

// E2E test helper routes (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use('/api/v1/test', testRoutes);
}

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// Setup HTTP server and Socket.IO
const server = http.createServer(app);
const io = createSocketServer(server);

// Keep database alive (NeonDB free tier sleeps after 5 minutes of inactivity)
function startKeepAlive() {
  setInterval(async () => {
    try {
      await query('SELECT 1');
    } catch { /* ignore */ }
  }, 60000); // every 60 seconds
}

// Start server
async function start() {
  server.listen(PORT, () => {
    console.log(`CareerCode Academy API running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });

  startKeepAlive();

  // Start background workers
  const { startBroadcastWorker } = await import('./workers/broadcastWorker');
  startBroadcastWorker(io);
  const { startCalendarReminderWorker } = await import('./workers/calendarReminderWorker');
  startCalendarReminderWorker(io);
  const { startProctoringCleanupWorker } = await import('./workers/proctoringCleanupWorker');
  startProctoringCleanupWorker();
  const { startTokenCleanupWorker } = await import('./workers/tokenCleanupWorker');
  startTokenCleanupWorker();

  // Heart regeneration: 1 heart per 30 min for all users
  const { regenerateHearts } = await import('./models/gamification');
  setInterval(() => { regenerateHearts().catch(() => {}); }, 60000);
}

start();

export { app };
