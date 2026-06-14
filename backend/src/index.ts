import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import { Server, Socket } from 'socket.io';

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
import applicationRoutes from './routes/application.routes';
import moduleRoutes from './routes/module.routes';
import resourceRoutes from './routes/resource.routes';
import searchRoutes from './routes/search.routes';
import quizRoutes from './routes/quiz.routes';
import wishlistRoutes from './routes/wishlist.routes';
import progressRoutes from './routes/progress.routes';
import ticketRoutes from './routes/ticket.routes';
import { query } from './config/db';

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://career-code-academy.vercel.app',
    'https://careercode-academy.onrender.com'
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
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/modules', moduleRoutes);
app.use('/api/v1/resources', resourceRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/quizzes', quizRoutes);
app.use('/api/v1/wishlists', wishlistRoutes);
app.use('/api/v1/progress', progressRoutes);
app.use('/api/v1/tickets', ticketRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// Database initialization
async function initDatabase() {
  try {
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
        reset_token VARCHAR(255),
        reset_token_expiry TIMESTAMPTZ,
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

    // Add suspended column to users
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_reason TEXT`);

    // Add revoked column to certificates
    await query(`ALTER TABLE certificates ADD COLUMN IF NOT EXISTS revoked BOOLEAN DEFAULT false`);
    await query(`ALTER TABLE certificates ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ`);
    await query(`ALTER TABLE certificates ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`);

    // New lesson_progress table
    await query(`
      CREATE TABLE IF NOT EXISTS lesson_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, lesson_id)
      )
    `);

    // Add featured and status columns to courses
    await query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false`);
    await query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft'`);

    // Review columns for courses
    await query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS review_notes TEXT`);
    await query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL`);
    await query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ`);

    // Add learning_outcomes to courses if not exists
    await query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_outcomes JSONB DEFAULT '[]'`);

    // Add status column to enrollments if not exists
    await query(`ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`);
    await query(`ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`);

    // Add status constraint to courses
    await query(`ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_status_check`);
    await query(`ALTER TABLE courses ADD CONSTRAINT courses_status_check CHECK (status IN ('draft', 'pending_review', 'approved', 'published', 'rejected', 'archived'))`);

    // Categories table
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

    // Add indexes for new tables
    await query('CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_wishlists_course ON wishlists(course_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_lesson_progress_course ON lesson_progress(course_id)');
 
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Setup HTTP server and Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'https://career-code-academy.vercel.app',
      'https://careercode-academy.onrender.com'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

const onlineUsers = new Map<string, { socketId: string; name?: string; role?: string }>();

io.on('connection', (socket: Socket) => {
  console.log('A user connected via socket:', socket.id);

  socket.on('join_room', (userId: string, name?: string, role?: string) => {
    socket.join(userId);
    console.log(`User ${userId} joined their personal room`);
    onlineUsers.set(userId, { socketId: socket.id, name, role });
    io.emit('online_users', {
      count: onlineUsers.size,
      users: Array.from(onlineUsers.entries()).map(([id, data]) => ({ id, name: data.name, role: data.role })),
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const [userId, data] of onlineUsers.entries()) {
      if (data.socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit('online_users', {
      count: onlineUsers.size,
      users: Array.from(onlineUsers.entries()).map(([id, data]) => ({ id, name: data.name, role: data.role })),
    });
  });
});

// Retry database initialization with backoff
async function initDatabaseWithRetry(retries: number = 3, delay: number = 3000): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await initDatabase();
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
}

start();

export { app, io };
