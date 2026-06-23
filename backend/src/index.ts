import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import http from 'http';
import { createSocketServer } from './config/socket';

import { errorHandler } from './middleware/errorHandler';
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
import challengeRoutes from './routes/challenge.routes';
import examRoutes from './routes/exam.routes';
import payoutRoutes from './routes/payout.routes';
import testRoutes from './routes/test.routes';
import { query } from './config/db';

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'https://localhost:3000',
    'http://127.0.0.1:3000',
    'https://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://career-code-academy.vercel.app',
    'https://careercode-academy-1.onrender.com',
    ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : []),
  ],
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

// Health check
app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'CareerCode Academy API is running', timestamp: new Date().toISOString() });
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
app.use('/api/v1/payouts', payoutRoutes);

// E2E test helper routes (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use('/api/v1/test', testRoutes);
  console.log('✓ E2E test routes registered (development mode)');
}

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// Database initialization
async function initDatabase() {
  try {
    // Check if database is already fully initialized to avoid delay and duplication
    let needsFullInit = process.env.FORCE_INIT_DB === 'true';
    if (!needsFullInit) {
      try {
        const checkResult = await query<{ exists: boolean }>(`
          SELECT EXISTS (
            SELECT FROM pg_tables 
            WHERE schemaname = 'public' 
              AND tablename = 'exam_answers'
          )
        `);
        needsFullInit = !checkResult.rows[0]?.exists;
      } catch (e) {
        console.log('Failed to check database tables status, proceeding with full initialization.');
        needsFullInit = true;
      }
    }

    if (needsFullInit) {
      console.log('Initializing database schemas and migrations...');

    await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin', 'super_admin')),
        avatar TEXT,
        bio TEXT,
        is_verified BOOLEAN DEFAULT false,
        verification_token VARCHAR(255),
        verification_token_expires TIMESTAMPTZ,
        reset_token VARCHAR(255),
        reset_token_expiry TIMESTAMPTZ,
        is_suspended BOOLEAN DEFAULT false,
        last_login TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS courses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        thumbnail TEXT,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        category VARCHAR(100) NOT NULL,
        instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        level VARCHAR(20) NOT NULL DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
        duration INTEGER NOT NULL DEFAULT 0,
        published BOOLEAN DEFAULT false,
        slug VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // New modules table
    await query(`
      CREATE TABLE IF NOT EXISTS modules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        video_url TEXT,
        duration INTEGER NOT NULL DEFAULT 0,
        order_index INTEGER NOT NULL DEFAULT 0,
        resources JSONB DEFAULT '[]',
        is_free BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        due_date TIMESTAMPTZ,
        max_score INTEGER NOT NULL DEFAULT 100,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
        student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        file_url TEXT,
        score INTEGER,
        feedback TEXT,
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(assignment_id, student_id)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        progress INTEGER NOT NULL DEFAULT 0,
        completed_lessons JSONB DEFAULT '[]',
        completed BOOLEAN DEFAULT false,
        enrolled_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        UNIQUE(user_id, course_id)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
        provider VARCHAR(50) NOT NULL,
        reference VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        certificate_url TEXT,
        verification_code VARCHAR(255) UNIQUE NOT NULL,
        certificate_template_id UUID REFERENCES certificate_templates(id) ON DELETE SET NULL,
        issued_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, course_id)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, course_id)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS blogs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(100) NOT NULL,
        tags JSONB DEFAULT '[]',
        image_url TEXT,
        slug VARCHAR(255) UNIQUE NOT NULL,
        published BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS forum_threads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        pinned BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS forum_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS instructor_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name VARCHAR(200) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        country VARCHAR(100),
        state VARCHAR(100),
        professional_title VARCHAR(200),
        years_experience VARCHAR(50),
        experience_years VARCHAR(50),
        specialization VARCHAR(100),
        github_url TEXT,
        linkedin_url TEXT,
        portfolio_url TEXT,
        resume_url TEXT,
        profile_image_url TEXT,
        bio TEXT,
        teaching_experience TEXT,
        interested_courses TEXT,
        availability VARCHAR(100),
        motivation TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        notes TEXT,
        review_notes TEXT,
        reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS course_proposals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        category VARCHAR(100) NOT NULL,
        level VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        learning_outcomes TEXT,
        prerequisites TEXT,
        duration INTEGER NOT NULL DEFAULT 0,
        lesson_count INTEGER NOT NULL DEFAULT 0,
        teaching_format VARCHAR(100),
        technologies TEXT,
        projects TEXT,
        recommended_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        thumbnail_url TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        notes TEXT,
        review_notes TEXT,
        reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS live_classes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        meeting_url TEXT NOT NULL,
        start_time TIMESTAMPTZ NOT NULL,
        duration INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS direct_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // New attendance table
    await query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        live_class_id UUID NOT NULL REFERENCES live_classes(id) ON DELETE CASCADE,
        student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        attended_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(live_class_id, student_id)
      )
    `);

    // New resources table
    await query(`
      CREATE TABLE IF NOT EXISTS resources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
        title VARCHAR(200) NOT NULL,
        file_url TEXT NOT NULL,
        file_type VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // New quizzes table
    await query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        time_limit INTEGER NOT NULL DEFAULT 0,
        passing_score INTEGER NOT NULL DEFAULT 70,
        max_attempts INTEGER NOT NULL DEFAULT 1,
        published BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // New quiz_questions table
    await query(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        options JSONB NOT NULL DEFAULT '[]',
        correct_answer VARCHAR(500) NOT NULL,
        points INTEGER NOT NULL DEFAULT 1,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // New quiz_attempts table
    await query(`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        answers JSONB NOT NULL DEFAULT '[]',
        score INTEGER NOT NULL DEFAULT 0,
        passed BOOLEAN DEFAULT false,
        attempted_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(quiz_id, user_id)
      )
    `);

    await query('CREATE INDEX IF NOT EXISTS idx_quizzes_course ON quizzes(course_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON quizzes(lesson_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id)');

    // Apply schema alterations dynamically for existing installations
    await query('ALTER TABLE instructor_applications ADD COLUMN IF NOT EXISTS review_notes TEXT');
    await query('ALTER TABLE instructor_applications ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL');
    await query('ALTER TABLE instructor_applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ');
    await query('ALTER TABLE instructor_applications ADD COLUMN IF NOT EXISTS experience_years VARCHAR(50)');

    await query('ALTER TABLE course_proposals ADD COLUMN IF NOT EXISTS review_notes TEXT');
    await query('ALTER TABLE course_proposals ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL');
    await query('ALTER TABLE course_proposals ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ');

    await query('ALTER TABLE lessons ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES modules(id) ON DELETE SET NULL');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ');
    await query('ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_thumbnail TEXT');

    // Learning paths table
    await query(`
      CREATE TABLE IF NOT EXISTS learning_paths (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        icon VARCHAR(50) DEFAULT 'GitBranch',
        color VARCHAR(100) DEFAULT 'from-blue-600 to-cyan-600',
        level VARCHAR(20) DEFAULT 'beginner',
        slug VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS learning_path_courses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        order_index INTEGER NOT NULL DEFAULT 0,
        UNIQUE(path_id, course_id)
      )
    `);

    // CMS pages table
    await query(`
      CREATE TABLE IF NOT EXISTS pages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(200) NOT NULL,
        content JSONB DEFAULT '{}',
        meta JSONB DEFAULT '{}',
        published BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Coding challenges table
    await query(`
      CREATE TABLE IF NOT EXISTS coding_challenges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        instructions TEXT NOT NULL,
        starter_code TEXT DEFAULT '',
        test_code TEXT DEFAULT '',
        language VARCHAR(50) DEFAULT 'javascript',
        difficulty VARCHAR(20) DEFAULT 'easy',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS challenge_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        challenge_id UUID NOT NULL REFERENCES coding_challenges(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code TEXT NOT NULL,
        passed BOOLEAN DEFAULT false,
        score INTEGER,
        feedback TEXT,
        submitted_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create indexes
    await query('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)');
    await query('CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category)');
    await query('CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(published)');
    await query('CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference)');
    await query('CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates(verification_code)');
    await query('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_forum_threads_course ON forum_threads(course_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_forum_messages_thread ON forum_messages(thread_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug)');
    await query('CREATE INDEX IF NOT EXISTS idx_blogs_author ON blogs(author_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_reviews_course ON reviews(course_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_announcements_course ON announcements(course_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_live_classes_course ON live_classes(course_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_receiver ON direct_messages(sender_id, receiver_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_resources_course ON resources(course_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id)');
 
    // New wishlists table
    await query(`
      CREATE TABLE IF NOT EXISTS wishlists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, course_id)
      )
    `);

    // admin_support_tickets table
    await query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS ticket_replies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Broadcast notifications table (admin-level, distinct from user notifications)
    await query(`
      CREATE TABLE IF NOT EXISTS broadcasts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        audience VARCHAR(50) NOT NULL DEFAULT 'all',
        type VARCHAR(50) NOT NULL DEFAULT 'info',
        status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
        scheduled_at TIMESTAMPTZ,
        sent_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Audit logs table
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(255),
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // System settings table
    await query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'general',
        description TEXT
      )
    `);

    // New lesson_progress table
    await query(`
      CREATE TABLE IF NOT EXISTS lesson_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        completed BOOLEAN DEFAULT false,
        watch_position NUMERIC DEFAULT 0,
        watch_percentage NUMERIC DEFAULT 0,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, lesson_id)
      )
    `);
    await query('ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS watch_position NUMERIC DEFAULT 0');
    await query('ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS watch_percentage NUMERIC DEFAULT 0');

    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(50),
        color VARCHAR(20),
        parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Update notification types constraint to include all new types
    await query(`ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check`);
    await query(`ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('info', 'success', 'warning', 'error', 'enrollment', 'payment', 'progress', 'certificate', 'system'))`);

    // Add payment provider enum constraint check
    await query(`ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_provider_check`);
    await query(`ALTER TABLE payments ADD CONSTRAINT payments_provider_check CHECK (provider IN ('paystack', 'flutterwave', 'manual'))`);

    // Exam tables
    await query(`
      CREATE TABLE IF NOT EXISTS exams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        duration_minutes INTEGER NOT NULL DEFAULT 60,
        passing_score INTEGER NOT NULL DEFAULT 70,
        max_attempts INTEGER NOT NULL DEFAULT 1,
        shuffle_questions BOOLEAN DEFAULT false,
        show_results BOOLEAN DEFAULT true,
        is_published BOOLEAN DEFAULT false,
        starts_at TIMESTAMPTZ,
        ends_at TIMESTAMPTZ,
        instructions TEXT,
        random_questions_count INTEGER DEFAULT 0,
        negative_marking BOOLEAN DEFAULT false,
        negative_percentage NUMERIC DEFAULT 0,
        certificate_template_id UUID REFERENCES certificate_templates(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS exam_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        question_type VARCHAR(20) NOT NULL DEFAULT 'mcq',
        options JSONB NOT NULL DEFAULT '[]',
        correct_answer VARCHAR(500) NOT NULL,
        points INTEGER NOT NULL DEFAULT 1,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS exam_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        submitted_at TIMESTAMPTZ,
        score INTEGER DEFAULT 0,
        passed BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'in_progress',
        flagged_answers JSONB DEFAULT '[]',
        manual_score INTEGER,
        reviewed BOOLEAN DEFAULT false
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS exam_answers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
        question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
        answer TEXT,
        is_correct BOOLEAN DEFAULT false,
        points_earned INTEGER DEFAULT 0,
        CONSTRAINT unique_attempt_question UNIQUE (attempt_id, question_id)
      )
    `);

    console.log('Database tables initialized successfully');
  } else {
    console.log('Database tables already initialized (running migrations only).');
  }

    // Certificate templates table — always run for existing installations
    await query(`
      CREATE TABLE IF NOT EXISTS certificate_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        course_id UUID UNIQUE NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        layout_style VARCHAR(50) DEFAULT 'professional',
        stamp_url TEXT,
        signature_url TEXT,
        logo_url TEXT,
        show_stamp BOOLEAN DEFAULT true,
        show_signature BOOLEAN DEFAULT true,
        instructor_name VARCHAR(200) DEFAULT 'Udokamma Emmanuel',
        org_name VARCHAR(200) DEFAULT 'Career Code WID Ltd',
        org_rc VARCHAR(100) DEFAULT 'RC 8824091',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Add suspended column to users (safe for re-runs)
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_reason TEXT`);

    // Add revoked columns to certificates (safe for re-runs)
    await query(`ALTER TABLE certificates ADD COLUMN IF NOT EXISTS revoked BOOLEAN DEFAULT false`);
    await query(`ALTER TABLE certificates ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ`);
    await query(`ALTER TABLE certificates ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`);

    // Add certificate_template_id FK to certificates and exams (safe for re-runs)
    await query(`ALTER TABLE certificates ADD COLUMN IF NOT EXISTS certificate_template_id UUID REFERENCES certificate_templates(id) ON DELETE SET NULL`);
    await query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS certificate_template_id UUID REFERENCES certificate_templates(id) ON DELETE SET NULL`);

    // Add requires_exam to certificate_templates (safe for re-runs)
    await query(`ALTER TABLE certificate_templates ADD COLUMN IF NOT EXISTS requires_exam BOOLEAN DEFAULT false`);

    // Exam table migrations — always run to ensure columns exist for existing installations
    try {
      await query(`
        DELETE FROM exam_answers a USING exam_answers b
        WHERE a.id < b.id 
          AND a.attempt_id = b.attempt_id 
          AND a.question_id = b.question_id
      `);
      await query('ALTER TABLE exam_answers ADD CONSTRAINT unique_attempt_question UNIQUE (attempt_id, question_id)');
    } catch (e) {
      // Ignore if constraint already exists or fails
    }
  await query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ');
  await query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ');
  await query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS instructions TEXT');
  await query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS random_questions_count INTEGER DEFAULT 0');
  await query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS negative_marking BOOLEAN DEFAULT false');
  await query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS negative_percentage NUMERIC DEFAULT 0');
  await query('ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS flagged_answers JSONB DEFAULT \'[]\'');
  await query('ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS manual_score INTEGER');
  await query('ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS reviewed BOOLEAN DEFAULT false');

  await query('CREATE INDEX IF NOT EXISTS idx_exams_course ON exams(course_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam ON exam_attempts(exam_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_exam_attempts_user ON exam_attempts(user_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt ON exam_answers(attempt_id)');

  // Add indexes for new tables
  await query('CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_wishlists_course ON wishlists(course_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_lesson_progress_course ON lesson_progress(course_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_learning_paths_slug ON learning_paths(slug)');
  await query('CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug)');
  await query('CREATE INDEX IF NOT EXISTS idx_coding_challenges_lesson ON coding_challenges(lesson_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_challenge_submissions_challenge ON challenge_submissions(challenge_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_challenge_submissions_user ON challenge_submissions(user_id)');

  // Learning path enrollments table (per-user progress tracking)
  await query(`
    CREATE TABLE IF NOT EXISTS learning_path_enrollments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
      progress INTEGER DEFAULT 0,
      completed BOOLEAN DEFAULT false,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      UNIQUE(user_id, path_id)
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_lpe_user ON learning_path_enrollments(user_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_lpe_path ON learning_path_enrollments(path_id)');

  // Payouts table
  await query(`
    CREATE TABLE IF NOT EXISTS payouts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount DECIMAL(10, 2) NOT NULL,
      fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
      net_amount DECIMAL(10, 2) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
      payment_method VARCHAR(100),
      payment_details TEXT,
      period_start TIMESTAMPTZ,
      period_end TIMESTAMPTZ,
      notes TEXT,
      admin_notes TEXT,
      reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMPTZ,
      requested_at TIMESTAMPTZ DEFAULT NOW(),
      processed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_payouts_instructor ON payouts(instructor_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status)');

  // Add commission_rate to system_settings
  await query(`
    INSERT INTO system_settings (key, value, category, description)
    VALUES ('commission_rate', '30', 'payouts', 'Platform commission percentage')
    ON CONFLICT (key) DO NOTHING
  `);

  // Exam proctoring recordings table
  await query(`
    CREATE TABLE IF NOT EXISTS exam_proctoring_recordings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      attempt_id UUID UNIQUE NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
      s3_url TEXT NOT NULL,
      duration_seconds INTEGER DEFAULT 0,
      file_size_bytes BIGINT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_proctoring_recording_attempt ON exam_proctoring_recordings(attempt_id)');

  console.log('Database migrations complete');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Setup HTTP server and Socket.IO
const server = http.createServer(app);
const io = createSocketServer(server);

// Retry database initialization with backoff
async function initDatabaseWithRetry(retries: number = 3, delay: number = 3000): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await initDatabase();
      try {
        const { ensureColumns } = await import('./models/codingChallenge');
        await ensureColumns();
      } catch (e) {
        // non-critical migration may fail if columns already exist
      }
      console.log('Database connected and tables initialized');
      return true;
    } catch (error) {
      const msg = (error as Error).message;
      if (i < retries - 1) {
        console.warn(`Database init attempt ${i + 1} failed (${msg}), retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      } else {
        console.warn('══════════════════════════════════════════════════════════');
        console.warn('  DATABASE CONNECTION FAILED');
        console.warn('══════════════════════════════════════════════════════════');
        console.warn(`  ${msg}`);
        console.warn('');
        if (msg.includes('ETIMEDOUT')) {
          console.warn('  Cause: Connection to NeonDB timed out.');
          console.warn('  This usually means your network blocks port 5432');
          console.warn('  or the NeonDB instance needs to be woken up.');
          console.warn('');
          console.warn('  Fixes to try:');
          console.warn('  1. Visit https://console.neon.tech and open your project');
          console.warn('  2. Check if your IP is allowed in NeonDB settings');
          console.warn('  3. Use a VPN or different network');
          console.warn('  4. Run the database locally by installing PostgreSQL');
          console.warn('     and updating DATABASE_URL in backend/.env');
        } else if (msg.includes('ECONNREFUSED')) {
          console.warn('  Cause: Connection refused.');
          console.warn('  Check DATABASE_URL in backend/.env:');
          console.warn('  ' + (process.env.DATABASE_URL?.substring(0, 50) + '...' || 'NOT SET'));
        }
        console.warn('══════════════════════════════════════════════════════════');
      }
    }
  }
  return false;
}

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
  await initDatabaseWithRetry(3, 3000);

  server.listen(PORT, () => {
    console.log(`CareerCode Academy API running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });

  startKeepAlive();

  // Start background workers
  const { startBroadcastWorker } = await import('./workers/broadcastWorker');
  startBroadcastWorker(io);
  const { startProctoringCleanupWorker } = await import('./workers/proctoringCleanupWorker');
  startProctoringCleanupWorker();
}

start();

export { app };
