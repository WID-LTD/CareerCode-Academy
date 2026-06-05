import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

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
import { query } from './config/db';

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

import path from 'path';
// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'CareerCode Academy API is running', timestamp: new Date().toISOString() });
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

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// Database initialization
async function initDatabase() {
  try {
    const exists = await query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')`
    );
    if (exists.rows[0].exists) {
      console.log('Database tables already exist, skipping migration');
      return;
    }

    console.log('Initializing database...');

    await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
        avatar TEXT,
        bio TEXT,
        is_verified BOOLEAN DEFAULT false,
        verification_token VARCHAR(255),
        reset_token VARCHAR(255),
        reset_token_expiry TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
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

    await query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
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

    // Create indexes
    await query('CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category)');
    await query('CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(published)');
    await query('CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id)');
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

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Start server
async function start() {
  try {
    await initDatabase();
    console.log('Database connected and tables initialized');
  } catch (error) {
    console.warn('Database connection failed — server will start without DB:', (error as Error).message);
  }

  app.listen(PORT, () => {
    console.log(`CareerCode Academy API running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

start();

export default app;
