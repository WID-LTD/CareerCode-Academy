import { query } from './config/db';

async function migrateAdmin() {
  console.log('Starting admin tables migration...');

  try {
    // 1. Support Tickets
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

    // 2. Ticket Replies
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

    // 3. Broadcasts
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

    // 4. Audit Logs
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

    // 5. System Settings
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

    // Indexes
    await query('CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status)');
    await query('CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket ON ticket_replies(ticket_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id)');
    console.log('✓ all admin indexes created');

    console.log('Admin migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Admin migration failed:', error);
    process.exit(1);
  }
}

migrateAdmin();
