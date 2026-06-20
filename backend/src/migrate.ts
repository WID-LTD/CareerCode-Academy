import { query } from './config/db';

async function migrate() {
  console.log('Starting migration to Neon...');

  try {
    await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    console.log('✓ pgcrypto extension enabled');

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
    console.log('✓ users table created');

    await query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ refresh_tokens table created');

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
    console.log('✓ courses table created');

    // Create modules table
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
    console.log('✓ modules table created');

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
    console.log('✓ lessons table created');

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
    console.log('✓ assignments table created');

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
    console.log('✓ submissions table created');

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
    console.log('✓ enrollments table created');

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
    console.log('✓ payments table created');

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
    console.log('✓ certificates table created');

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
    console.log('✓ reviews table created');

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
    console.log('✓ blogs table created');

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
    console.log('✓ notifications table created');

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
    console.log('✓ forum_threads table created');

    await query(`
      CREATE TABLE IF NOT EXISTS forum_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ forum_messages table created');

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
    console.log('✓ instructor_applications table created');

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
    console.log('✓ course_proposals table created');

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
    console.log('✓ announcements table created');

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
    console.log('✓ live_classes table created');

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
    console.log('✓ direct_messages table created');

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
    console.log('✓ attendance table created');

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
    console.log('✓ resources table created');

    // Apply schema alterations dynamically for existing installations
    // Create quizzes tables
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
    console.log('✓ quizzes table created');

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
    console.log('✓ quiz_questions table created');

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
    console.log('✓ quiz_attempts table created');

    await query('CREATE INDEX IF NOT EXISTS idx_quizzes_course ON quizzes(course_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON quizzes(lesson_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id)');

    await query('ALTER TABLE instructor_applications ADD COLUMN IF NOT EXISTS review_notes TEXT');
    await query('ALTER TABLE instructor_applications ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL');
    await query('ALTER TABLE instructor_applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ');
    await query('ALTER TABLE instructor_applications ADD COLUMN IF NOT EXISTS experience_years VARCHAR(50)');

    await query('ALTER TABLE course_proposals ADD COLUMN IF NOT EXISTS review_notes TEXT');
    await query('ALTER TABLE course_proposals ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL');
    await query('ALTER TABLE course_proposals ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ');

    await query('ALTER TABLE lessons ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES modules(id) ON DELETE SET NULL');

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
    // Admin Tables
    await query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
        priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ support_tickets table created');

    await query(`
      CREATE TABLE IF NOT EXISTS ticket_replies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ ticket_replies table created');

    await query(`
      CREATE TABLE IF NOT EXISTS broadcasts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        audience VARCHAR(50) NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'students', 'instructors', 'admins')),
        type VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'announcement', 'promotion')),
        status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed')),
        scheduled_at TIMESTAMPTZ,
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ broadcasts table created');

    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        resource_id UUID,
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ audit_logs table created');

    await query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        category VARCHAR(100) DEFAULT 'general',
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ system_settings table created');

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
    console.log('✓ certificate_templates table created');

    await query('CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status)');
    await query('CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket ON ticket_replies(ticket_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id)');
    console.log('✓ all indexes created');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
