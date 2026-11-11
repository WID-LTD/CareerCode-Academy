-- Phase 7: GiGo voice/history, To-Do, learning-path bundles, feature flags,
-- mentorship reschedule, custom-domain metadata.
-- Idempotent where SQLite allows; ALTERs are applied with a tolerant runner.

CREATE TABLE IF NOT EXISTS "ai_conversations" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "title" TEXT,
  "context" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS "idx_ai_conversations_user" ON "ai_conversations" (user_id, updated_at);

CREATE TABLE IF NOT EXISTS "ai_messages" (
  "id" TEXT PRIMARY KEY,
  "conversation_id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "blocks" TEXT,
  "audio_key" TEXT,
  "model" TEXT,
  "tokens" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS "idx_ai_messages_conversation" ON "ai_messages" (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS "ai_usage" (
  "user_id" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "requests" INTEGER NOT NULL DEFAULT 0,
  "voice_requests" INTEGER NOT NULL DEFAULT 0,
  "tts_requests" INTEGER NOT NULL DEFAULT 0,
  "tokens" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("user_id", "day")
);

CREATE TABLE IF NOT EXISTS "todos" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "due_at" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "status" TEXT NOT NULL DEFAULT 'open',
  "category" TEXT NOT NULL DEFAULT 'personal',
  "course_id" TEXT,
  "lesson_id" TEXT,
  "path_id" TEXT,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "auto_key" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "completed_at" TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS "todos_user_auto_key" ON "todos" (user_id, auto_key);
CREATE INDEX IF NOT EXISTS "idx_todos_user_status" ON "todos" (user_id, status, due_at);

CREATE TABLE IF NOT EXISTS "feature_flags" (
  "key" TEXT PRIMARY KEY,
  "enabled" INTEGER NOT NULL DEFAULT 0,
  "description" TEXT,
  "updated_by" TEXT,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS "payment_courses" (
  "payment_id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "amount" REAL NOT NULL DEFAULT 0,
  "instructor_id" TEXT,
  "commission_rate" REAL,
  PRIMARY KEY ("payment_id", "course_id")
);
CREATE INDEX IF NOT EXISTS "idx_payment_courses_course" ON "payment_courses" (course_id);

CREATE TABLE IF NOT EXISTS "cron_runs" (
  "name" TEXT PRIMARY KEY,
  "last_run_at" TEXT,
  "last_status" TEXT,
  "last_detail" TEXT
);

CREATE TABLE IF NOT EXISTS "testimonials" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT,
  "course_id" TEXT,
  "quote" TEXT NOT NULL,
  "role" TEXT,
  "company" TEXT,
  "image_url" TEXT,
  "status" TEXT NOT NULL DEFAULT 'published',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Learning path commerce
ALTER TABLE "learning_paths" ADD COLUMN "bundle_price" REAL;
ALTER TABLE "learning_paths" ADD COLUMN "bundle_discount_percent" REAL DEFAULT 0;
ALTER TABLE "learning_paths" ADD COLUMN "enrollment_mode" TEXT DEFAULT 'mixed';
ALTER TABLE "learning_paths" ADD COLUMN "bundle_enabled" INTEGER DEFAULT 1;
ALTER TABLE "learning_paths" ADD COLUMN "is_published" INTEGER DEFAULT 1;
ALTER TABLE "learning_path_enrollments" ADD COLUMN "status" TEXT DEFAULT 'active';

-- Mentorship reschedule
ALTER TABLE "mentoring_slots" ADD COLUMN "reschedule_status" TEXT;
ALTER TABLE "mentoring_slots" ADD COLUMN "reschedule_requested_by" TEXT;
ALTER TABLE "mentoring_slots" ADD COLUMN "reschedule_reason" TEXT;
ALTER TABLE "mentoring_slots" ADD COLUMN "proposed_start_time" TEXT;
ALTER TABLE "mentoring_slots" ADD COLUMN "proposed_end_time" TEXT;

-- Custom-domain serving metadata
ALTER TABLE "portfolio_sites" ADD COLUMN "custom_hostname_id" TEXT;
ALTER TABLE "portfolio_sites" ADD COLUMN "domain_verified_at" TEXT;
ALTER TABLE "portfolio_sites" ADD COLUMN "domain_last_error" TEXT;

-- Revenue view used by payouts and instructor analytics. Covers single-course
-- payments and learning-path bundle allocations.
CREATE VIEW IF NOT EXISTS "instructor_revenue" AS
SELECT p.course_id AS course_id, c.instructor_id AS instructor_id, p.id AS payment_id,
       p.amount AS amount, p.status AS status, p.created_at AS created_at
FROM payments p JOIN courses c ON p.course_id = c.id
UNION ALL
SELECT pc.course_id, pc.instructor_id, p.id, pc.amount, p.status, p.created_at
FROM payment_courses pc JOIN payments p ON p.id = pc.payment_id;

INSERT OR IGNORE INTO "feature_flags" ("key","enabled","description") VALUES
  ('ai_enabled',1,'GiGo AI assistant (text)'),
  ('ai_voice_enabled',1,'GiGo voice input and spoken replies'),
  ('registration_enabled',1,'Public sign-up'),
  ('paid_enrollment_enabled',1,'Paid course and bundle checkout'),
  ('community_enabled',1,'Community spaces'),
  ('mentorship_enabled',1,'Mentoring bookings'),
  ('jobs_enabled',1,'Job board and ingestion'),
  ('portfolio_enabled',1,'Public portfolios'),
  ('certificates_enabled',1,'Certificate issuing'),
  ('maintenance_mode',0,'Show maintenance notice to non-admins');
