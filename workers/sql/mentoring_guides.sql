-- Mentorship profiles, recurring availability and exceptions.
CREATE TABLE IF NOT EXISTS "mentoring_profiles" (
  "user_id" TEXT PRIMARY KEY,
  "enabled" INTEGER NOT NULL DEFAULT 1,
  "bio" TEXT,
  "topics" TEXT NOT NULL DEFAULT '[]',
  "languages" TEXT NOT NULL DEFAULT '["English"]',
  "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
  "default_duration_minutes" INTEGER NOT NULL DEFAULT 45,
  "buffer_minutes" INTEGER NOT NULL DEFAULT 15,
  "max_sessions_per_week" INTEGER NOT NULL DEFAULT 10,
  "default_meeting_url" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY ("user_id") REFERENCES "users"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "mentoring_availability" (
  "id" TEXT PRIMARY KEY,
  "instructor_id" TEXT NOT NULL,
  "course_id" TEXT,
  "weekday" INTEGER NOT NULL,
  "start_time" TEXT NOT NULL,
  "end_time" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
  "slot_minutes" INTEGER NOT NULL DEFAULT 45,
  "buffer_minutes" INTEGER NOT NULL DEFAULT 15,
  "meeting_url" TEXT,
  "valid_from" TEXT,
  "valid_until" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY ("instructor_id") REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY ("course_id") REFERENCES "courses"(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "idx_mentoring_availability_instructor" ON "mentoring_availability" ("instructor_id", "status", "weekday");

CREATE TABLE IF NOT EXISTS "mentoring_exceptions" (
  "id" TEXT PRIMARY KEY,
  "instructor_id" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "start_time" TEXT,
  "end_time" TEXT,
  "reason" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY ("instructor_id") REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_mentoring_exceptions_instructor" ON "mentoring_exceptions" ("instructor_id", "date");

-- Guide tours, editable by admins.
CREATE TABLE IF NOT EXISTS "guide_tours" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'student',
  "type" TEXT NOT NULL DEFAULT 'role_journey',
  "description" TEXT,
  "active" INTEGER NOT NULL DEFAULT 1,
  "is_builtin" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS "guide_steps" (
  "id" TEXT PRIMARY KEY,
  "tour_id" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "route" TEXT NOT NULL,
  "selector" TEXT,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "placement" TEXT NOT NULL DEFAULT 'auto',
  "arrow" INTEGER NOT NULL DEFAULT 1,
  "spotlight_padding" INTEGER NOT NULL DEFAULT 8,
  "optional" INTEGER NOT NULL DEFAULT 0,
  "requires_access" INTEGER NOT NULL DEFAULT 0,
  "action" TEXT NOT NULL DEFAULT 'none',
  "prompt" TEXT,
  "chapter" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY ("tour_id") REFERENCES "guide_tours"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_guide_steps_tour" ON "guide_steps" ("tour_id", "position");

CREATE TABLE IF NOT EXISTS "guide_tour_versions" (
  "id" TEXT PRIMARY KEY,
  "tour_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" TEXT NOT NULL,
  "created_by" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY ("tour_id") REFERENCES "guide_tours"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "user_guide_progress" (
  "user_id" TEXT NOT NULL,
  "tour_key" TEXT NOT NULL,
  "step_index" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'in_progress',
  "started_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "completed_at" TEXT,
  PRIMARY KEY ("user_id", "tour_key"),
  FOREIGN KEY ("user_id") REFERENCES "users"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "guide_events" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT,
  "tour_key" TEXT NOT NULL,
  "step_index" INTEGER,
  "event" TEXT NOT NULL,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS "idx_guide_events_tour" ON "guide_events" ("tour_key", "event", "created_at");
