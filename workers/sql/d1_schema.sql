-- CareerCode Academy — Cloudflare D1 (SQLite) schema
-- Generated from live Neon schema. Do not edit by hand without regenerating.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "_schema_migrations" (
  "id" TEXT NOT NULL,
  "applied_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "alumni" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "graduation_year" INTEGER,
  "current_company" TEXT,
  "current_position" TEXT,
  "linkedin_url" TEXT,
  "portfolio_url" TEXT,
  "testimonial" TEXT,
  "is_featured" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "announcements" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "course_id" TEXT NOT NULL,
  "instructor_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "assignments" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "course_id" TEXT NOT NULL,
  "lesson_id" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "due_date" TEXT,
  "max_score" INTEGER NOT NULL DEFAULT 100,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES "lessons"(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "attendance" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "live_class_id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "attended_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (live_class_id, student_id),
  FOREIGN KEY (live_class_id) REFERENCES "live_classes"(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "admin_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "resource_type" TEXT NOT NULL,
  "resource_id" TEXT,
  "details" TEXT,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (admin_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "blogs" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "excerpt" TEXT,
  "author_id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "tags" TEXT DEFAULT '[]',
  "image_url" TEXT,
  "slug" TEXT NOT NULL,
  "published" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (slug),
  FOREIGN KEY (author_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "board_members" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "name" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "bio" TEXT,
  "avatar_url" TEXT,
  "sort_order" INTEGER DEFAULT 0,
  "is_active" INTEGER DEFAULT 1,
  "joined_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "board_policies" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'operations',
  "summary" TEXT,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "version" INTEGER NOT NULL DEFAULT 1,
  "published" INTEGER DEFAULT 0,
  "proposed_by" TEXT,
  "approved_by" TEXT,
  "decided_at" TEXT,
  "decision_notes" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (slug),
  FOREIGN KEY (approved_by) REFERENCES "users"(id),
  FOREIGN KEY (proposed_by) REFERENCES "users"(id)
);
CREATE TABLE IF NOT EXISTS "board_resolutions" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "resolution_number" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "body" TEXT,
  "passed" INTEGER DEFAULT 1,
  "meeting_date" TEXT NOT NULL,
  "passed_at" TEXT,
  "recorded_by" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (resolution_number),
  FOREIGN KEY (recorded_by) REFERENCES "users"(id)
);
CREATE TABLE IF NOT EXISTS "broadcasts" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "audience" TEXT NOT NULL DEFAULT 'all',
  "type" TEXT NOT NULL DEFAULT 'info',
  "status" TEXT NOT NULL DEFAULT 'sent',
  "scheduled_at" TEXT,
  "sent_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "calendar_event_reminders" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "event_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "minutes_before" INTEGER NOT NULL,
  "sent_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (event_id, user_id, minutes_before),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES "calendar_events"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "calendar_event_rsvps" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "event_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'going',
  "reminder_sent" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (event_id, user_id),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES "calendar_events"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "calendar_events" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "title" TEXT NOT NULL,
  "description" TEXT,
  "event_type" TEXT NOT NULL,
  "start_datetime" TEXT NOT NULL,
  "end_datetime" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "location" TEXT,
  "meeting_url" TEXT,
  "meeting_platform" TEXT,
  "color" TEXT,
  "course_id" TEXT,
  "module_id" TEXT,
  "program_id" TEXT,
  "cohort_id" TEXT,
  "school_id" TEXT,
  "instructor_id" TEXT,
  "community_id" TEXT,
  "channel_id" TEXT,
  "created_by" TEXT NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'public',
  "visibility_target_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "is_recurring" INTEGER DEFAULT 0,
  "recurrence_rule" TEXT,
  "max_attendees" INTEGER,
  "reminder_minutes" TEXT DEFAULT '[1440, 60, 15]',
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE SET NULL,
  FOREIGN KEY (module_id) REFERENCES "modules"(id) ON DELETE SET NULL,
  FOREIGN KEY (program_id) REFERENCES "programs"(id) ON DELETE SET NULL,
  FOREIGN KEY (school_id) REFERENCES "schools"(id) ON DELETE SET NULL,
  FOREIGN KEY (instructor_id) REFERENCES "users"(id) ON DELETE SET NULL,
  FOREIGN KEY (community_id) REFERENCES "communities"(id) ON DELETE SET NULL,
  FOREIGN KEY (channel_id) REFERENCES "community_channels"(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "career_goal_courses" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "goal_id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "phase" TEXT NOT NULL DEFAULT 'core',
  PRIMARY KEY ("id"),
  UNIQUE (goal_id, course_id),
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE,
  FOREIGN KEY (goal_id) REFERENCES "career_goals"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "career_goals" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "role_title" TEXT NOT NULL,
  "summary" TEXT,
  "icon" TEXT DEFAULT 'Target',
  "color" TEXT DEFAULT 'from-blue-600 to-cyan-600',
  "desired_skills" TEXT DEFAULT '[][]',
  "salary_band" TEXT,
  "duration_estimate" TEXT,
  "school_id" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (slug),
  FOREIGN KEY (school_id) REFERENCES "schools"(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "categories" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT,
  "color" TEXT,
  "parent_id" TEXT,
  "sort_order" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (name),
  UNIQUE (slug),
  FOREIGN KEY (parent_id) REFERENCES "categories"(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "certificate_templates" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "name" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "layout_style" TEXT DEFAULT 'professional',
  "stamp_url" TEXT,
  "signature_url" TEXT,
  "logo_url" TEXT,
  "show_stamp" INTEGER DEFAULT 1,
  "show_signature" INTEGER DEFAULT 1,
  "instructor_name" TEXT DEFAULT 'Udokamma Emmanuel',
  "org_name" TEXT DEFAULT 'Career Code WID Ltd',
  "org_rc" TEXT DEFAULT 'RC 8824091',
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "requires_exam" INTEGER DEFAULT 0,
  PRIMARY KEY ("id"),
  UNIQUE (course_id),
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "certificates" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "certificate_url" TEXT,
  "verification_code" TEXT NOT NULL,
  "issued_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "revoked" INTEGER DEFAULT 0,
  "revoked_at" TEXT,
  "expires_at" TEXT,
  "certificate_template_id" TEXT,
  PRIMARY KEY ("id"),
  UNIQUE (user_id, course_id),
  UNIQUE (verification_code),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE,
  FOREIGN KEY (certificate_template_id) REFERENCES "certificate_templates"(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "challenge_submissions" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "challenge_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "passed" INTEGER DEFAULT 0,
  "score" INTEGER,
  "feedback" TEXT,
  "submitted_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "output" TEXT,
  "expected_output" TEXT,
  "test_results" TEXT DEFAULT '[]',
  "file_url" TEXT,
  "text_answer" TEXT,
  PRIMARY KEY ("id"),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY (challenge_id) REFERENCES "coding_challenges"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "channel_invites" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "channel_id" TEXT NOT NULL,
  "created_by" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "max_uses" INTEGER,
  "use_count" INTEGER DEFAULT 0,
  "expires_at" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (code),
  FOREIGN KEY (channel_id) REFERENCES "community_channels"(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "channel_members" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "channel_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" TEXT DEFAULT 'member',
  "last_read_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "is_muted" INTEGER DEFAULT 0,
  "joined_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (channel_id, user_id),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY (channel_id) REFERENCES "community_channels"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "channel_messages" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "channel_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "edited" INTEGER DEFAULT 0,
  "deleted" INTEGER DEFAULT 0,
  "deleted_at" TEXT,
  "deleted_by" TEXT,
  "parent_message_id" TEXT,
  "is_thread_parent" INTEGER DEFAULT 0,
  "thread_count" INTEGER DEFAULT 0,
  "attachment_url" TEXT,
  "attachment_type" TEXT,
  "attachment_name" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (channel_id) REFERENCES "community_channels"(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_message_id) REFERENCES "channel_messages"(id) ON DELETE SET NULL,
  FOREIGN KEY (deleted_by) REFERENCES "users"(id),
  FOREIGN KEY (author_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "channel_pins" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "channel_id" TEXT NOT NULL,
  "message_id" TEXT NOT NULL,
  "pinned_by" TEXT NOT NULL,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (channel_id, message_id),
  FOREIGN KEY (channel_id) REFERENCES "community_channels"(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES "channel_messages"(id) ON DELETE CASCADE,
  FOREIGN KEY (pinned_by) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "click_events" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "visitor_id" TEXT NOT NULL,
  "user_id" TEXT,
  "page_url" TEXT NOT NULL,
  "element_selector" TEXT,
  "element_text" TEXT,
  "element_type" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE SET NULL,
  FOREIGN KEY (visitor_id) REFERENCES "visitors"(visitor_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "coding_challenges" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "lesson_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "instructions" TEXT NOT NULL,
  "starter_code" TEXT DEFAULT '',
  "test_code" TEXT DEFAULT '',
  "language" TEXT DEFAULT 'javascript',
  "difficulty" TEXT DEFAULT 'easy',
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "expected_output" TEXT,
  "test_cases" TEXT DEFAULT '[]',
  "timeout_seconds" INTEGER DEFAULT 5,
  "type" TEXT DEFAULT 'code',
  "submission_type" TEXT DEFAULT '',
  "allowed_file_types" TEXT DEFAULT '',
  "rubric" TEXT DEFAULT '[]',
  "max_file_size" INTEGER DEFAULT 10,
  PRIMARY KEY ("id"),
  FOREIGN KEY (lesson_id) REFERENCES "lessons"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "communities" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "image_url" TEXT,
  "category" TEXT NOT NULL DEFAULT 'General',
  "visibility" TEXT DEFAULT 'public',
  "join_policy" TEXT DEFAULT 'open',
  "created_by" TEXT NOT NULL,
  "member_count" INTEGER DEFAULT 1,
  "channel_count" INTEGER DEFAULT 0,
  "is_archived" INTEGER DEFAULT 0,
  "rules" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (slug),
  FOREIGN KEY (created_by) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "community_categories" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT,
  "color" TEXT,
  "sort_order" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (slug)
);
CREATE TABLE IF NOT EXISTS "community_channels" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "category_id" TEXT,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT DEFAULT 'text',
  "is_public" INTEGER DEFAULT 1,
  "is_archived" INTEGER DEFAULT 0,
  "created_by" TEXT,
  "course_id" TEXT,
  "lesson_id" TEXT,
  "max_members" INTEGER,
  "member_count" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "community_id" TEXT,
  PRIMARY KEY ("id"),
  UNIQUE (category_id, slug),
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES "community_categories"(id) ON DELETE SET NULL,
  FOREIGN KEY (lesson_id) REFERENCES "lessons"(id) ON DELETE SET NULL,
  FOREIGN KEY (community_id) REFERENCES "communities"(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES "users"(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "community_invites" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "community_id" TEXT NOT NULL,
  "created_by" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "max_uses" INTEGER,
  "use_count" INTEGER DEFAULT 0,
  "expires_at" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (code),
  FOREIGN KEY (community_id) REFERENCES "communities"(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "community_members" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "community_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" TEXT DEFAULT 'member',
  "is_muted" INTEGER DEFAULT 0,
  "is_banned" INTEGER DEFAULT 0,
  "joined_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (community_id, user_id),
  FOREIGN KEY (community_id) REFERENCES "communities"(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "community_moderation_actions" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "moderator_id" TEXT NOT NULL,
  "target_user_id" TEXT NOT NULL,
  "channel_id" TEXT,
  "action" TEXT NOT NULL,
  "reason" TEXT,
  "duration" TEXT,
  "is_active" INTEGER DEFAULT 1,
  "expires_at" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (channel_id) REFERENCES "community_channels"(id) ON DELETE SET NULL,
  FOREIGN KEY (target_user_id) REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY (moderator_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "community_reports" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "reporter_id" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT DEFAULT 'pending',
  "reviewed_by" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (reviewed_by) REFERENCES "users"(id),
  FOREIGN KEY (reporter_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "community_rules" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "community_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "sort_order" INTEGER DEFAULT 0,
  "is_active" INTEGER DEFAULT 1,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (community_id) REFERENCES "communities"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "completed_events" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "completed_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (user_id, event_id),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "contact_messages" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "subject" TEXT,
  "message" TEXT NOT NULL,
  "from_url" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "course_proposals" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "instructor_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "learning_outcomes" TEXT,
  "prerequisites" TEXT,
  "duration" INTEGER NOT NULL DEFAULT 0,
  "lesson_count" INTEGER NOT NULL DEFAULT 0,
  "teaching_format" TEXT,
  "technologies" TEXT,
  "projects" TEXT,
  "recommended_price" REAL NOT NULL DEFAULT 0,
  "thumbnail_url" TEXT,
  "status" TEXT DEFAULT 'pending',
  "notes" TEXT,
  "review_notes" TEXT,
  "reviewed_by" TEXT,
  "reviewed_at" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (reviewed_by) REFERENCES "users"(id) ON DELETE SET NULL,
  FOREIGN KEY (instructor_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "courses" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "thumbnail" TEXT,
  "banner_image" TEXT,
  "promo_video_url" TEXT,
  "price" REAL NOT NULL DEFAULT 0,
  "category" TEXT NOT NULL,
  "instructor_id" TEXT NOT NULL,
  "level" TEXT NOT NULL DEFAULT 'beginner',
  "duration" INTEGER NOT NULL DEFAULT 0,
  "published" INTEGER DEFAULT 0,
  "slug" TEXT NOT NULL,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "learning_outcomes" TEXT DEFAULT '[]',
  "featured" INTEGER DEFAULT 0,
  "status" TEXT DEFAULT 'draft',
  "review_notes" TEXT,
  "reviewed_by" TEXT,
  "reviewed_at" TEXT,
  "discount_percentage" REAL NOT NULL DEFAULT 0,
  "program_id" TEXT,
  "reference_url" TEXT,
  "rules" TEXT,
  PRIMARY KEY ("id"),
  UNIQUE (slug),
  FOREIGN KEY (reviewed_by) REFERENCES "users"(id) ON DELETE SET NULL,
  FOREIGN KEY (instructor_id) REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY (program_id) REFERENCES "programs"(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "daily_checkins" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "checkin_date" TEXT NOT NULL DEFAULT (date('now')),
  "productive" INTEGER,
  "energy" INTEGER,
  "blocks_completed" INTEGER DEFAULT 0,
  "claimed" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (user_id, checkin_date),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE,
  CHECK (((productive >= 1) AND (productive <= 5))),
  CHECK (((energy >= 1) AND (energy <= 5)))
);
CREATE TABLE IF NOT EXISTS "daily_xp_log" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "xp_earned" INTEGER DEFAULT 0,
  "goal_reached" INTEGER DEFAULT 0,
  "date" TEXT DEFAULT (date('now')),
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (user_id, date),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "direct_messages" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "sender_id" TEXT NOT NULL,
  "receiver_id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "is_read" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (receiver_id) REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "discount_codes" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "code" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "xp_redeemed" INTEGER NOT NULL,
  "discount_amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "status" TEXT NOT NULL DEFAULT 'active',
  "course_id" TEXT,
  "expires_at" TEXT NOT NULL,
  "used_at" TEXT,
  "used_payment_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (code),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE SET NULL,
  CHECK ((discount_amount > 0)),
  CHECK ((xp_redeemed > 0))
);
CREATE TABLE IF NOT EXISTS "discussion_replies" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "discussion_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "likes_count" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (discussion_id) REFERENCES "discussions"(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "discussions" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'General',
  "tags" TEXT DEFAULT '[]',
  "views" INTEGER DEFAULT 0,
  "likes_count" INTEGER DEFAULT 0,
  "pinned" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "enrollments" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "completed_lessons" TEXT DEFAULT '[]',
  "completed" INTEGER DEFAULT 0,
  "enrolled_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "completed_at" TEXT,
  "status" TEXT DEFAULT 'active',
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (user_id, course_id),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "exam_answers" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "attempt_id" TEXT NOT NULL,
  "question_id" TEXT NOT NULL,
  "answer" TEXT,
  "is_correct" INTEGER DEFAULT 0,
  "points_earned" INTEGER DEFAULT 0,
  PRIMARY KEY ("id"),
  UNIQUE (attempt_id, question_id),
  FOREIGN KEY (question_id) REFERENCES "exam_questions"(id) ON DELETE CASCADE,
  FOREIGN KEY (attempt_id) REFERENCES "exam_attempts"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "exam_attempts" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "exam_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "started_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "submitted_at" TEXT,
  "score" INTEGER DEFAULT 0,
  "passed" INTEGER DEFAULT 0,
  "status" TEXT DEFAULT 'in_progress',
  "flagged_answers" TEXT DEFAULT '[]',
  "manual_score" INTEGER,
  "reviewed" INTEGER DEFAULT 0,
  PRIMARY KEY ("id"),
  FOREIGN KEY (exam_id) REFERENCES "exams"(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "exam_proctoring_recordings" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "attempt_id" TEXT NOT NULL,
  "s3_url" TEXT NOT NULL,
  "duration_seconds" INTEGER DEFAULT 0,
  "file_size_bytes" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "expires_at" TEXT NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE (attempt_id),
  FOREIGN KEY (attempt_id) REFERENCES "exam_attempts"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "exam_questions" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "exam_id" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "question_type" TEXT NOT NULL DEFAULT 'mcq',
  "options" TEXT NOT NULL DEFAULT '[]',
  "correct_answer" TEXT NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 1,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (exam_id) REFERENCES "exams"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "exams" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "course_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "duration_minutes" INTEGER NOT NULL DEFAULT 60,
  "passing_score" INTEGER NOT NULL DEFAULT 70,
  "max_attempts" INTEGER NOT NULL DEFAULT 1,
  "shuffle_questions" INTEGER DEFAULT 0,
  "show_results" INTEGER DEFAULT 1,
  "is_published" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "starts_at" TEXT,
  "ends_at" TEXT,
  "instructions" TEXT,
  "random_questions_count" INTEGER DEFAULT 0,
  "negative_marking" INTEGER DEFAULT 0,
  "negative_percentage" REAL DEFAULT 0,
  "certificate_template_id" TEXT,
  PRIMARY KEY ("id"),
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE,
  FOREIGN KEY (certificate_template_id) REFERENCES "certificate_templates"(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "forum_messages" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "thread_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY (thread_id) REFERENCES "forum_threads"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "forum_threads" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "course_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "pinned" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "guided_enrollments" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "path_id" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'active',
  "day_index" INTEGER NOT NULL DEFAULT 0,
  "start_date" TEXT DEFAULT (date('now')),
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (user_id, path_id),
  FOREIGN KEY (path_id) REFERENCES "learning_paths"(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "guided_loop_entries" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "guided_enrollment_id" TEXT NOT NULL,
  "day_index" INTEGER NOT NULL,
  "course_id" TEXT,
  "lesson_id" TEXT,
  "state" TEXT DEFAULT '{}',
  "completed" INTEGER DEFAULT 0,
  "completed_at" TEXT,
  PRIMARY KEY ("id"),
  UNIQUE (guided_enrollment_id, lesson_id),
  FOREIGN KEY (lesson_id) REFERENCES "lessons"(id) ON DELETE CASCADE,
  FOREIGN KEY (guided_enrollment_id) REFERENCES "guided_enrollments"(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "instructor_applications" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "full_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "country" TEXT,
  "state" TEXT,
  "professional_title" TEXT,
  "years_experience" TEXT,
  "specialization" TEXT,
  "github_url" TEXT,
  "linkedin_url" TEXT,
  "portfolio_url" TEXT,
  "resume_url" TEXT,
  "profile_image_url" TEXT,
  "bio" TEXT,
  "teaching_experience" TEXT,
  "interested_courses" TEXT,
  "availability" TEXT,
  "motivation" TEXT,
  "status" TEXT DEFAULT 'pending',
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "notes" TEXT,
  "review_notes" TEXT,
  "reviewed_by" TEXT,
  "reviewed_at" TEXT,
  "experience_years" TEXT,
  PRIMARY KEY ("id"),
  FOREIGN KEY (reviewed_by) REFERENCES "users"(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "internships" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "title" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "location" TEXT,
  "type" TEXT NOT NULL,
  "duration" TEXT,
  "requirements" TEXT,
  "stipend" TEXT,
  "application_url" TEXT,
  "logo_url" TEXT,
  "posted_by" TEXT,
  "is_active" INTEGER DEFAULT 1,
  "expires_at" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "skills" TEXT DEFAULT '[]',
  PRIMARY KEY ("id"),
  FOREIGN KEY (posted_by) REFERENCES "users"(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "job_applications" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "job_id" TEXT,
  "internship_id" TEXT,
  "user_id" TEXT NOT NULL,
  "cover_note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'applied',
  "status_timeline" TEXT DEFAULT '[]',
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY (internship_id) REFERENCES "internships"(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES "jobs"(id) ON DELETE CASCADE,
  CHECK (((job_id IS NOT NULL) OR (internship_id IS NOT NULL)))
);
CREATE TABLE IF NOT EXISTS "jobs" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "title" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "location" TEXT,
  "type" TEXT NOT NULL,
  "salary_range" TEXT,
  "application_url" TEXT,
  "logo_url" TEXT,
  "posted_by" TEXT,
  "is_active" INTEGER DEFAULT 1,
  "expires_at" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "skills" TEXT DEFAULT '[]',
  "source" TEXT,
  "external_id" TEXT,
  "ingested_at" TEXT,
  PRIMARY KEY ("id"),
  FOREIGN KEY (posted_by) REFERENCES "users"(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "learning_path_courses" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "path_id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("id"),
  UNIQUE (path_id, course_id),
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE,
  FOREIGN KEY (path_id) REFERENCES "learning_paths"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "learning_path_enrollments" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "path_id" TEXT NOT NULL,
  "progress" INTEGER DEFAULT 0,
  "completed" INTEGER DEFAULT 0,
  "started_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "completed_at" TEXT,
  PRIMARY KEY ("id"),
  UNIQUE (user_id, path_id),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY (path_id) REFERENCES "learning_paths"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "learning_paths" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "title" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT DEFAULT 'GitBranch',
  "color" TEXT DEFAULT 'from-blue-600 to-cyan-600',
  "level" TEXT DEFAULT 'beginner',
  "slug" TEXT NOT NULL,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "school_id" TEXT,
  "career_goal_id" TEXT,
  PRIMARY KEY ("id"),
  UNIQUE (slug),
  FOREIGN KEY (career_goal_id) REFERENCES "career_goals"(id) ON DELETE SET NULL,
  FOREIGN KEY (school_id) REFERENCES "schools"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "lesson_notes" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "lesson_id" TEXT NOT NULL,
  "content" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (user_id, lesson_id),
  FOREIGN KEY (lesson_id) REFERENCES "lessons"(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "lesson_progress" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "lesson_id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "completed" INTEGER DEFAULT 0,
  "completed_at" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "watch_position" REAL DEFAULT 0,
  "watch_percentage" REAL DEFAULT 0,
  PRIMARY KEY ("id"),
  UNIQUE (user_id, lesson_id),
  FOREIGN KEY (lesson_id) REFERENCES "lessons"(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "lessons" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "course_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "video_url" TEXT,
  "video_provider" TEXT,
  "duration" INTEGER NOT NULL DEFAULT 0,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "resources" TEXT DEFAULT '[]',
  "is_free" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "module_id" TEXT,
  "video_thumbnail" TEXT,
  "script" TEXT,
  "reference_source" TEXT,
  PRIMARY KEY ("id"),
  FOREIGN KEY (module_id) REFERENCES "modules"(id) ON DELETE SET NULL,
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "live_classes" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "course_id" TEXT NOT NULL,
  "instructor_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "meeting_url" TEXT NOT NULL,
  "start_time" TEXT NOT NULL,
  "duration" INTEGER NOT NULL,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "scheduled_at" TEXT,
  PRIMARY KEY ("id"),
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "live_participants" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "session_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role_in_room" TEXT NOT NULL DEFAULT 'student',
  "joined_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "left_at" TEXT,
  "minutes_claimed" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("id"),
  UNIQUE (session_id, user_id),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES "live_sessions"(id) ON DELETE CASCADE,
  CHECK ((minutes_claimed >= 0))
);
CREATE TABLE IF NOT EXISTS "live_sessions" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "title" TEXT NOT NULL,
  "calendar_event_id" TEXT,
  "program_cohort_id" TEXT,
  "course_id" TEXT,
  "created_by" TEXT,
  "cf_session_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "max_participants" INTEGER NOT NULL DEFAULT 100,
  "started_at" TEXT,
  "ended_at" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (calendar_event_id) REFERENCES "calendar_events"(id) ON DELETE SET NULL,
  FOREIGN KEY (program_cohort_id) REFERENCES "program_cohorts"(id) ON DELETE SET NULL,
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES "users"(id) ON DELETE SET NULL,
  CHECK ((max_participants > 0))
);
CREATE TABLE IF NOT EXISTS "mentoring_slots" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "instructor_id" TEXT NOT NULL,
  "student_id" TEXT,
  "course_id" TEXT,
  "title" TEXT NOT NULL DEFAULT 'Mentoring Session',
  "description" TEXT,
  "start_time" TEXT NOT NULL,
  "end_time" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'available',
  "meeting_url" TEXT,
  "reminder_24_sent" INTEGER DEFAULT 0,
  "reminder_1_sent" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (student_id) REFERENCES "users"(id) ON DELETE SET NULL,
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "message_reactions" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "message_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (message_id, user_id, emoji),
  FOREIGN KEY (message_id) REFERENCES "channel_messages"(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "messages" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "sender_id" TEXT NOT NULL,
  "receiver_id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "is_read" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "attachment_url" TEXT,
  PRIMARY KEY ("id"),
  FOREIGN KEY (sender_id) REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "modules" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "course_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'info',
  "link" TEXT,
  "read" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "page_views" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "visitor_id" TEXT NOT NULL,
  "user_id" TEXT,
  "page_url" TEXT NOT NULL,
  "route_name" TEXT,
  "time_spent_sec" INTEGER DEFAULT 0,
  "is_exit_page" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (visitor_id) REFERENCES "visitors"(visitor_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "pages" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT DEFAULT '{}',
  "meta" TEXT DEFAULT '{}',
  "published" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (slug)
);
CREATE TABLE IF NOT EXISTS "payments" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "course_id" TEXT,
  "amount" REAL NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "provider" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "metadata" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "discount_code_id" TEXT,
  "xp_discount" INTEGER NOT NULL DEFAULT 0,
  "amount_before_discount" REAL,
  "promotion_id" TEXT,
  "promotion_title" TEXT,
  "promo_discount_percent" REAL,
  "promo_discount_amount" REAL,
  "program_cohort_id" TEXT,
  PRIMARY KEY ("id"),
  UNIQUE (reference),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY (program_cohort_id) REFERENCES "program_cohorts"(id) ON DELETE SET NULL,
  FOREIGN KEY (discount_code_id) REFERENCES "discount_codes"(id) ON DELETE SET NULL,
  FOREIGN KEY (promotion_id) REFERENCES "promotions"(id) ON DELETE SET NULL,
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "payouts" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "instructor_id" TEXT NOT NULL,
  "amount" REAL NOT NULL,
  "fee" REAL NOT NULL DEFAULT 0,
  "net_amount" REAL NOT NULL,
  "status" TEXT DEFAULT 'pending',
  "payment_method" TEXT,
  "payment_details" TEXT,
  "period_start" TEXT,
  "period_end" TEXT,
  "notes" TEXT,
  "admin_notes" TEXT,
  "reviewed_by" TEXT,
  "reviewed_at" TEXT,
  "requested_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "processed_at" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (reviewed_by) REFERENCES "users"(id) ON DELETE SET NULL,
  FOREIGN KEY (instructor_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "portfolio_items" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "project_id" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "url" TEXT,
  "image_url" TEXT,
  "skills" TEXT DEFAULT '[]',
  "is_public" INTEGER DEFAULT 1,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (project_id) REFERENCES "projects"(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "program_cohort_members" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "cohort_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "payment_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "enrolled_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "completed_at" TEXT,
  PRIMARY KEY ("id"),
  UNIQUE (cohort_id, user_id),
  FOREIGN KEY (cohort_id) REFERENCES "program_cohorts"(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_id) REFERENCES "payments"(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "program_cohorts" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "program_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "starts_at" TEXT NOT NULL,
  "ends_at" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 100,
  "price" REAL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "created_by" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (created_by) REFERENCES "users"(id) ON DELETE SET NULL,
  FOREIGN KEY (program_id) REFERENCES "programs"(id) ON DELETE CASCADE,
  CHECK ((capacity > 0)),
  CHECK ((ends_at > starts_at))
);
CREATE TABLE IF NOT EXISTS "program_courses" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "program_id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "order_index" INTEGER DEFAULT 0,
  "week_number" INTEGER NOT NULL DEFAULT 1,
  "is_required" INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY ("id"),
  UNIQUE (program_id, course_id),
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE,
  FOREIGN KEY (program_id) REFERENCES "programs"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "programs" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "school_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "career_outcomes" TEXT DEFAULT '[][]',
  "duration" TEXT,
  "icon" TEXT,
  "color" TEXT,
  "sort_order" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "main_course_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'published',
  "created_by" TEXT,
  "duration_weeks" INTEGER,
  "price" REAL NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "thumbnail_url" TEXT,
  "rejection_reason" TEXT,
  PRIMARY KEY ("id"),
  UNIQUE (slug),
  FOREIGN KEY (created_by) REFERENCES "users"(id) ON DELETE SET NULL,
  FOREIGN KEY (main_course_id) REFERENCES "courses"(id) ON DELETE SET NULL,
  FOREIGN KEY (school_id) REFERENCES "schools"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "projects" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "source_url" TEXT,
  "demo_url" TEXT,
  "image_url" TEXT,
  "skills" TEXT DEFAULT '[]',
  "course_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'submitted',
  "reviewer_id" TEXT,
  "review_feedback" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES "users"(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "promotions" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "title" TEXT NOT NULL,
  "description" TEXT,
  "slug" TEXT,
  "discount_percent" REAL NOT NULL,
  "scope" TEXT NOT NULL DEFAULT 'all',
  "category_id" TEXT,
  "course_id" TEXT,
  "starts_at" TEXT NOT NULL,
  "ends_at" TEXT NOT NULL,
  "is_active" INTEGER DEFAULT 1,
  "created_by" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (slug),
  FOREIGN KEY (category_id) REFERENCES "categories"(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES "users"(id),
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE,
  CHECK ((ends_at > starts_at)),
  CHECK (((discount_percent > (0)) AND (discount_percent <= (100))))
);
CREATE TABLE IF NOT EXISTS "quiz_attempts" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "quiz_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "answers" TEXT NOT NULL DEFAULT '[]',
  "score" INTEGER NOT NULL DEFAULT 0,
  "passed" INTEGER DEFAULT 0,
  "attempted_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (quiz_id, user_id),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY (quiz_id) REFERENCES "quizzes"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "quiz_questions" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "quiz_id" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "options" TEXT NOT NULL DEFAULT '[]',
  "correct_answer" TEXT NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 1,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (quiz_id) REFERENCES "quizzes"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "quizzes" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "course_id" TEXT NOT NULL,
  "lesson_id" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "time_limit" INTEGER NOT NULL DEFAULT 0,
  "passing_score" INTEGER NOT NULL DEFAULT 70,
  "max_attempts" INTEGER NOT NULL DEFAULT 1,
  "published" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "due_date" TEXT,
  PRIMARY KEY ("id"),
  FOREIGN KEY (lesson_id) REFERENCES "lessons"(id) ON DELETE SET NULL,
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "recurring_events" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "title" TEXT NOT NULL,
  "description" TEXT,
  "event_type" TEXT NOT NULL,
  "course_id" TEXT,
  "instructor_id" TEXT NOT NULL,
  "recurrence_pattern" TEXT NOT NULL,
  "day_of_week" INTEGER,
  "day_of_month" INTEGER,
  "start_time" TEXT NOT NULL,
  "duration" INTEGER NOT NULL DEFAULT 60,
  "start_date" TEXT NOT NULL,
  "end_date" TEXT,
  "meeting_url" TEXT,
  "reminder_24_sent" INTEGER DEFAULT 0,
  "reminder_1_sent" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES "users"(id) ON DELETE CASCADE,
  CHECK (((day_of_week >= 0) AND (day_of_week <= 6))),
  CHECK (((day_of_month >= 1) AND (day_of_month <= 31)))
);
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires_at" TEXT NOT NULL,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "device_label" TEXT,
  "ip_hash" TEXT,
  "last_used_at" TEXT,
  PRIMARY KEY ("id"),
  UNIQUE (token),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "resources" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "course_id" TEXT NOT NULL,
  "lesson_id" TEXT,
  "title" TEXT NOT NULL,
  "file_url" TEXT NOT NULL,
  "file_type" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES "lessons"(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "reviews" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "course_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "reply" TEXT,
  "reported" INTEGER DEFAULT 0,
  "replied" INTEGER DEFAULT 0,
  "replied_at" TEXT,
  "reported_at" TEXT,
  PRIMARY KEY ("id"),
  UNIQUE (user_id, course_id),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE,
  CHECK (((rating >= 1) AND (rating <= 5)))
);
CREATE TABLE IF NOT EXISTS "schools" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT,
  "color" TEXT,
  "sort_order" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (slug)
);
CREATE TABLE IF NOT EXISTS "scroll_events" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "visitor_id" TEXT NOT NULL,
  "user_id" TEXT,
  "page_url" TEXT NOT NULL,
  "depth_25" INTEGER DEFAULT 0,
  "depth_50" INTEGER DEFAULT 0,
  "depth_75" INTEGER DEFAULT 0,
  "depth_100" INTEGER DEFAULT 0,
  "max_depth" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (visitor_id) REFERENCES "visitors"(visitor_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "showcase_videos" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "video_url" TEXT NOT NULL,
  "thumbnail_url" TEXT,
  "duration" INTEGER DEFAULT 0,
  "provider" TEXT DEFAULT 'html5',
  "views" INTEGER DEFAULT 0,
  "is_active" INTEGER DEFAULT 1,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "study_plans" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "student_id" TEXT NOT NULL,
  "week_start" TEXT NOT NULL,
  "week_end" TEXT NOT NULL,
  "goal_hours" REAL NOT NULL DEFAULT 5,
  "goal_topics" TEXT DEFAULT '[]',
  "notes" TEXT,
  "is_active" INTEGER DEFAULT 1,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (student_id, week_start),
  FOREIGN KEY (student_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "submissions" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "assignment_id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "file_url" TEXT,
  "score" INTEGER,
  "feedback" TEXT,
  "submitted_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (assignment_id, student_id),
  FOREIGN KEY (student_id) REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY (assignment_id) REFERENCES "assignments"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT DEFAULT 'open',
  "priority" TEXT DEFAULT 'medium',
  "assigned_to" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (assigned_to) REFERENCES "users"(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "system_settings" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'general',
  "description" TEXT,
  PRIMARY KEY ("key")
);
CREATE TABLE IF NOT EXISTS "ticket_replies" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "ticket_id" TEXT NOT NULL,
  "admin_id" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (ticket_id) REFERENCES "support_tickets"(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "two_factor_backup_codes" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "code_hash" TEXT NOT NULL,
  "used_at" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (code_hash),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "user_badges" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "badge_id" TEXT NOT NULL,
  "earned_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (user_id, badge_id),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "user_journeys" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "visitor_id" TEXT NOT NULL,
  "user_id" TEXT,
  "pages_visited" TEXT DEFAULT '[][]',
  "conversion_type" TEXT,
  "converted" INTEGER DEFAULT 0,
  "enrolled_course_id" TEXT,
  "dropped_at_page" TEXT,
  "journey_duration_sec" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE SET NULL,
  FOREIGN KEY (enrolled_course_id) REFERENCES "courses"(id) ON DELETE SET NULL,
  FOREIGN KEY (visitor_id) REFERENCES "visitors"(visitor_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'student',
  "avatar" TEXT,
  "bio" TEXT,
  "is_verified" INTEGER DEFAULT 0,
  "verification_token" TEXT,
  "reset_token" TEXT,
  "reset_token_expiry" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "is_suspended" INTEGER DEFAULT 0,
  "suspended_at" TEXT,
  "suspended_reason" TEXT,
  "verification_token_expires" TEXT,
  "last_login" TEXT,
  "headline" TEXT,
  "location" TEXT,
  "website" TEXT,
  "github" TEXT,
  "twitter" TEXT,
  "linkedin" TEXT,
  "expertise" TEXT DEFAULT '[][]',
  "setup_token" TEXT,
  "setup_token_expires" TEXT,
  "hearts" INTEGER DEFAULT 5,
  "max_hearts" INTEGER DEFAULT 5,
  "last_heart_regeneration" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "streak_freezes" INTEGER DEFAULT 0,
  "daily_xp_goal" INTEGER DEFAULT 50,
  "best_streak" INTEGER DEFAULT 0,
  "last_active_date" TEXT,
  "failed_login_attempts" INTEGER DEFAULT 0,
  "locked_until" TEXT,
  "two_factor_secret" TEXT,
  "two_factor_enabled" INTEGER DEFAULT 0,
  "pending_email" TEXT,
  "pending_email_token" TEXT,
  "pending_email_token_expires" TEXT,
  "allowed_dashboards" TEXT,
  "username" TEXT,
  "portfolio_public" INTEGER DEFAULT 1,
  PRIMARY KEY ("id"),
  UNIQUE (username),
  UNIQUE (email)
);
CREATE TABLE IF NOT EXISTS "video_analytics" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "video_id" TEXT NOT NULL,
  "user_id" TEXT,
  "watch_duration" INTEGER DEFAULT 0,
  "completed" INTEGER DEFAULT 0,
  "ip_address" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (video_id) REFERENCES "showcase_videos"(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "visitors" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "visitor_id" TEXT NOT NULL,
  "user_id" TEXT,
  "ip_address" TEXT,
  "country" TEXT,
  "city" TEXT,
  "device_type" TEXT,
  "browser" TEXT,
  "os" TEXT,
  "referral_source" TEXT,
  "landing_page" TEXT,
  "first_visit" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "last_visit" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "visit_count" INTEGER DEFAULT 1,
  "session_start" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "session_end" TEXT,
  "is_active" INTEGER DEFAULT 1,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (visitor_id),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "wishlists" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  UNIQUE (user_id, course_id),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES "courses"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "xp_history" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "source" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("id"),
  FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
);

-- Secondary indexes
CREATE UNIQUE INDEX IF NOT EXISTS "users_pkey" ON "users" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users" (email);
CREATE UNIQUE INDEX IF NOT EXISTS "courses_pkey" ON "courses" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "courses_slug_key" ON "courses" (slug);
CREATE UNIQUE INDEX IF NOT EXISTS "lessons_pkey" ON "lessons" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "assignments_pkey" ON "assignments" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "submissions_pkey" ON "submissions" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "submissions_assignment_id_student_id_key" ON "submissions" (assignment_id, student_id);
CREATE UNIQUE INDEX IF NOT EXISTS "enrollments_pkey" ON "enrollments" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "enrollments_user_id_course_id_key" ON "enrollments" (user_id, course_id);
CREATE UNIQUE INDEX IF NOT EXISTS "payments_pkey" ON "payments" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "payments_reference_key" ON "payments" (reference);
CREATE UNIQUE INDEX IF NOT EXISTS "certificates_pkey" ON "certificates" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "certificates_verification_code_key" ON "certificates" (verification_code);
CREATE UNIQUE INDEX IF NOT EXISTS "certificates_user_id_course_id_key" ON "certificates" (user_id, course_id);
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_pkey" ON "reviews" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_user_id_course_id_key" ON "reviews" (user_id, course_id);
CREATE UNIQUE INDEX IF NOT EXISTS "blogs_pkey" ON "blogs" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "blogs_slug_key" ON "blogs" (slug);
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_pkey" ON "notifications" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "forum_threads_pkey" ON "forum_threads" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "forum_messages_pkey" ON "forum_messages" (id);
CREATE INDEX IF NOT EXISTS "idx_courses_instructor" ON "courses" (instructor_id);
CREATE INDEX IF NOT EXISTS "idx_courses_category" ON "courses" (category);
CREATE INDEX IF NOT EXISTS "idx_courses_published" ON "courses" (published);
CREATE INDEX IF NOT EXISTS "idx_lessons_course" ON "lessons" (course_id);
CREATE INDEX IF NOT EXISTS "idx_enrollments_user" ON "enrollments" (user_id);
CREATE INDEX IF NOT EXISTS "idx_enrollments_course" ON "enrollments" (course_id);
CREATE INDEX IF NOT EXISTS "idx_payments_user" ON "payments" (user_id);
CREATE INDEX IF NOT EXISTS "idx_payments_reference" ON "payments" (reference);
CREATE INDEX IF NOT EXISTS "idx_certificates_user" ON "certificates" (user_id);
CREATE INDEX IF NOT EXISTS "idx_certificates_code" ON "certificates" (verification_code);
CREATE INDEX IF NOT EXISTS "idx_notifications_user" ON "notifications" (user_id);
CREATE INDEX IF NOT EXISTS "idx_forum_threads_course" ON "forum_threads" (course_id);
CREATE INDEX IF NOT EXISTS "idx_forum_messages_thread" ON "forum_messages" (thread_id);
CREATE INDEX IF NOT EXISTS "idx_blogs_slug" ON "blogs" (slug);
CREATE INDEX IF NOT EXISTS "idx_blogs_author" ON "blogs" (author_id);
CREATE INDEX IF NOT EXISTS "idx_reviews_course" ON "reviews" (course_id);
CREATE INDEX IF NOT EXISTS "idx_submissions_assignment" ON "submissions" (assignment_id);
CREATE INDEX IF NOT EXISTS "idx_submissions_student" ON "submissions" (student_id);
CREATE UNIQUE INDEX IF NOT EXISTS "instructor_applications_pkey" ON "instructor_applications" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "modules_pkey" ON "modules" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "course_proposals_pkey" ON "course_proposals" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "announcements_pkey" ON "announcements" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "live_classes_pkey" ON "live_classes" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "direct_messages_pkey" ON "direct_messages" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_pkey" ON "attendance" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_live_class_id_student_id_key" ON "attendance" (live_class_id, student_id);
CREATE UNIQUE INDEX IF NOT EXISTS "resources_pkey" ON "resources" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_pkey" ON "refresh_tokens" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_token_key" ON "refresh_tokens" (token);
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user" ON "refresh_tokens" (user_id);
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_token" ON "refresh_tokens" (token);
CREATE UNIQUE INDEX IF NOT EXISTS "quizzes_pkey" ON "quizzes" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "quiz_questions_pkey" ON "quiz_questions" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "quiz_attempts_pkey" ON "quiz_attempts" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "quiz_attempts_quiz_id_user_id_key" ON "quiz_attempts" (quiz_id, user_id);
CREATE INDEX IF NOT EXISTS "idx_quizzes_course" ON "quizzes" (course_id);
CREATE INDEX IF NOT EXISTS "idx_quizzes_lesson" ON "quizzes" (lesson_id);
CREATE INDEX IF NOT EXISTS "idx_quiz_questions_quiz" ON "quiz_questions" (quiz_id);
CREATE INDEX IF NOT EXISTS "idx_quiz_attempts_quiz" ON "quiz_attempts" (quiz_id);
CREATE INDEX IF NOT EXISTS "idx_quiz_attempts_user" ON "quiz_attempts" (user_id);
CREATE INDEX IF NOT EXISTS "idx_lessons_module" ON "lessons" (module_id);
CREATE INDEX IF NOT EXISTS "idx_announcements_course" ON "announcements" (course_id);
CREATE INDEX IF NOT EXISTS "idx_live_classes_course" ON "live_classes" (course_id);
CREATE INDEX IF NOT EXISTS "idx_direct_messages_sender_receiver" ON "direct_messages" (sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS "idx_resources_course" ON "resources" (course_id);
CREATE INDEX IF NOT EXISTS "idx_modules_course" ON "modules" (course_id);
CREATE UNIQUE INDEX IF NOT EXISTS "wishlists_pkey" ON "wishlists" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "wishlists_user_id_course_id_key" ON "wishlists" (user_id, course_id);
CREATE UNIQUE INDEX IF NOT EXISTS "lesson_progress_pkey" ON "lesson_progress" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "lesson_progress_user_id_lesson_id_key" ON "lesson_progress" (user_id, lesson_id);
CREATE INDEX IF NOT EXISTS "idx_wishlists_user" ON "wishlists" (user_id);
CREATE INDEX IF NOT EXISTS "idx_wishlists_course" ON "wishlists" (course_id);
CREATE INDEX IF NOT EXISTS "idx_lesson_progress_user" ON "lesson_progress" (user_id);
CREATE INDEX IF NOT EXISTS "idx_lesson_progress_lesson" ON "lesson_progress" (lesson_id);
CREATE INDEX IF NOT EXISTS "idx_lesson_progress_course" ON "lesson_progress" (course_id);
CREATE UNIQUE INDEX IF NOT EXISTS "support_tickets_pkey" ON "support_tickets" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_replies_pkey" ON "ticket_replies" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "broadcasts_pkey" ON "broadcasts" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "audit_logs_pkey" ON "audit_logs" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "system_settings_pkey" ON "system_settings" (key);
CREATE INDEX IF NOT EXISTS "idx_support_tickets_user" ON "support_tickets" (user_id);
CREATE INDEX IF NOT EXISTS "idx_support_tickets_status" ON "support_tickets" (status);
CREATE INDEX IF NOT EXISTS "idx_ticket_replies_ticket" ON "ticket_replies" (ticket_id);
CREATE INDEX IF NOT EXISTS "idx_audit_logs_admin" ON "audit_logs" (admin_id);
CREATE UNIQUE INDEX IF NOT EXISTS "categories_pkey" ON "categories" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_key" ON "categories" (name);
CREATE UNIQUE INDEX IF NOT EXISTS "categories_slug_key" ON "categories" (slug);
CREATE UNIQUE INDEX IF NOT EXISTS "learning_paths_pkey" ON "learning_paths" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "learning_paths_slug_key" ON "learning_paths" (slug);
CREATE UNIQUE INDEX IF NOT EXISTS "learning_path_courses_pkey" ON "learning_path_courses" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "learning_path_courses_path_id_course_id_key" ON "learning_path_courses" (path_id, course_id);
CREATE UNIQUE INDEX IF NOT EXISTS "pages_pkey" ON "pages" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "pages_slug_key" ON "pages" (slug);
CREATE INDEX IF NOT EXISTS "idx_learning_paths_slug" ON "learning_paths" (slug);
CREATE INDEX IF NOT EXISTS "idx_pages_slug" ON "pages" (slug);
CREATE UNIQUE INDEX IF NOT EXISTS "coding_challenges_pkey" ON "coding_challenges" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "challenge_submissions_pkey" ON "challenge_submissions" (id);
CREATE INDEX IF NOT EXISTS "idx_coding_challenges_lesson" ON "coding_challenges" (lesson_id);
CREATE INDEX IF NOT EXISTS "idx_challenge_submissions_challenge" ON "challenge_submissions" (challenge_id);
CREATE INDEX IF NOT EXISTS "idx_challenge_submissions_user" ON "challenge_submissions" (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS "exams_pkey" ON "exams" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "exam_questions_pkey" ON "exam_questions" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "exam_attempts_pkey" ON "exam_attempts" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "exam_answers_pkey" ON "exam_answers" (id);
CREATE INDEX IF NOT EXISTS "idx_exams_course" ON "exams" (course_id);
CREATE INDEX IF NOT EXISTS "idx_exam_questions_exam" ON "exam_questions" (exam_id);
CREATE INDEX IF NOT EXISTS "idx_exam_attempts_exam" ON "exam_attempts" (exam_id);
CREATE INDEX IF NOT EXISTS "idx_exam_attempts_user" ON "exam_attempts" (user_id);
CREATE INDEX IF NOT EXISTS "idx_exam_answers_attempt" ON "exam_answers" (attempt_id);
CREATE UNIQUE INDEX IF NOT EXISTS "unique_attempt_question" ON "exam_answers" (attempt_id, question_id);
CREATE UNIQUE INDEX IF NOT EXISTS "certificate_templates_pkey" ON "certificate_templates" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "certificate_templates_course_id_key" ON "certificate_templates" (course_id);
CREATE UNIQUE INDEX IF NOT EXISTS "exam_proctoring_recordings_pkey" ON "exam_proctoring_recordings" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "exam_proctoring_recordings_attempt_id_key" ON "exam_proctoring_recordings" (attempt_id);
CREATE INDEX IF NOT EXISTS "idx_proctoring_recording_attempt" ON "exam_proctoring_recordings" (attempt_id);
CREATE UNIQUE INDEX IF NOT EXISTS "payouts_pkey" ON "payouts" (id);
CREATE INDEX IF NOT EXISTS "idx_payouts_instructor" ON "payouts" (instructor_id);
CREATE INDEX IF NOT EXISTS "idx_payouts_status" ON "payouts" (status);
CREATE UNIQUE INDEX IF NOT EXISTS "learning_path_enrollments_pkey" ON "learning_path_enrollments" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "learning_path_enrollments_user_id_path_id_key" ON "learning_path_enrollments" (user_id, path_id);
CREATE INDEX IF NOT EXISTS "idx_lpe_user" ON "learning_path_enrollments" (user_id);
CREATE INDEX IF NOT EXISTS "idx_lpe_path" ON "learning_path_enrollments" (path_id);
CREATE UNIQUE INDEX IF NOT EXISTS "_schema_migrations_pkey" ON "_schema_migrations" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "recurring_events_pkey" ON "recurring_events" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "mentoring_slots_pkey" ON "mentoring_slots" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "completed_events_pkey" ON "completed_events" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "completed_events_user_id_event_id_key" ON "completed_events" (user_id, event_id);
CREATE UNIQUE INDEX IF NOT EXISTS "study_plans_pkey" ON "study_plans" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "study_plans_student_id_week_start_key" ON "study_plans" (student_id, week_start);
CREATE UNIQUE INDEX IF NOT EXISTS "lesson_notes_pkey" ON "lesson_notes" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "lesson_notes_user_id_lesson_id_key" ON "lesson_notes" (user_id, lesson_id);
CREATE UNIQUE INDEX IF NOT EXISTS "visitors_pkey" ON "visitors" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "visitors_visitor_id_key" ON "visitors" (visitor_id);
CREATE UNIQUE INDEX IF NOT EXISTS "page_views_pkey" ON "page_views" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "click_events_pkey" ON "click_events" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "scroll_events_pkey" ON "scroll_events" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "user_journeys_pkey" ON "user_journeys" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "schools_pkey" ON "schools" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "schools_slug_key" ON "schools" (slug);
CREATE UNIQUE INDEX IF NOT EXISTS "programs_pkey" ON "programs" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "programs_slug_key" ON "programs" (slug);
CREATE UNIQUE INDEX IF NOT EXISTS "program_courses_pkey" ON "program_courses" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "program_courses_program_id_course_id_key" ON "program_courses" (program_id, course_id);
CREATE UNIQUE INDEX IF NOT EXISTS "discussions_pkey" ON "discussions" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "discussion_replies_pkey" ON "discussion_replies" (id);
CREATE INDEX IF NOT EXISTS "idx_discussions_category" ON "discussions" (category);
CREATE INDEX IF NOT EXISTS "idx_discussions_user" ON "discussions" (user_id);
CREATE INDEX IF NOT EXISTS "idx_discussion_replies_discussion" ON "discussion_replies" (discussion_id);
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_pkey" ON "jobs" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "internships_pkey" ON "internships" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "alumni_pkey" ON "alumni" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "showcase_videos_pkey" ON "showcase_videos" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "video_analytics_pkey" ON "video_analytics" (id);
CREATE INDEX IF NOT EXISTS "idx_showcase_videos_entity" ON "showcase_videos" (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS "idx_video_analytics_video" ON "video_analytics" (video_id);
CREATE INDEX IF NOT EXISTS "idx_video_analytics_user" ON "video_analytics" (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS "messages_pkey" ON "messages" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "community_categories_pkey" ON "community_categories" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "community_categories_slug_key" ON "community_categories" (slug);
CREATE UNIQUE INDEX IF NOT EXISTS "community_channels_pkey" ON "community_channels" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "community_channels_category_id_slug_key" ON "community_channels" (category_id, slug);
CREATE UNIQUE INDEX IF NOT EXISTS "channel_members_pkey" ON "channel_members" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "channel_members_channel_id_user_id_key" ON "channel_members" (channel_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS "channel_messages_pkey" ON "channel_messages" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "message_reactions_pkey" ON "message_reactions" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "message_reactions_message_id_user_id_emoji_key" ON "message_reactions" (message_id, user_id, emoji);
CREATE UNIQUE INDEX IF NOT EXISTS "channel_pins_pkey" ON "channel_pins" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "channel_pins_channel_id_message_id_key" ON "channel_pins" (channel_id, message_id);
CREATE UNIQUE INDEX IF NOT EXISTS "community_reports_pkey" ON "community_reports" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "community_moderation_actions_pkey" ON "community_moderation_actions" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "channel_invites_pkey" ON "channel_invites" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "channel_invites_code_key" ON "channel_invites" (code);
CREATE INDEX IF NOT EXISTS "idx_channel_messages_channel" ON "channel_messages" (channel_id, created_at);
CREATE INDEX IF NOT EXISTS "idx_channel_messages_author" ON "channel_messages" (author_id);
CREATE INDEX IF NOT EXISTS "idx_channel_messages_parent" ON "channel_messages" (parent_message_id);
CREATE INDEX IF NOT EXISTS "idx_channel_members_user" ON "channel_members" (user_id);
CREATE INDEX IF NOT EXISTS "idx_channel_members_channel" ON "channel_members" (channel_id);
CREATE INDEX IF NOT EXISTS "idx_message_reactions_message" ON "message_reactions" (message_id);
CREATE INDEX IF NOT EXISTS "idx_community_reports_status" ON "community_reports" (status);
CREATE INDEX IF NOT EXISTS "idx_community_reports_target" ON "community_reports" (target_type, target_id);
CREATE INDEX IF NOT EXISTS "idx_channel_pins_channel" ON "channel_pins" (channel_id);
CREATE INDEX IF NOT EXISTS "idx_channel_invites_code" ON "channel_invites" (code);
CREATE INDEX IF NOT EXISTS "idx_community_channels_category" ON "community_channels" (category_id);
CREATE INDEX IF NOT EXISTS "idx_community_channels_course" ON "community_channels" (course_id);
CREATE UNIQUE INDEX IF NOT EXISTS "communities_pkey" ON "communities" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "communities_slug_key" ON "communities" (slug);
CREATE UNIQUE INDEX IF NOT EXISTS "community_members_pkey" ON "community_members" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "community_members_community_id_user_id_key" ON "community_members" (community_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS "community_rules_pkey" ON "community_rules" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "community_invites_pkey" ON "community_invites" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "community_invites_code_key" ON "community_invites" (code);
CREATE INDEX IF NOT EXISTS "idx_communities_slug" ON "communities" (slug);
CREATE INDEX IF NOT EXISTS "idx_communities_category" ON "communities" (category);
CREATE INDEX IF NOT EXISTS "idx_communities_created_by" ON "communities" (created_by);
CREATE INDEX IF NOT EXISTS "idx_community_members_user" ON "community_members" (user_id);
CREATE INDEX IF NOT EXISTS "idx_community_members_community" ON "community_members" (community_id);
CREATE INDEX IF NOT EXISTS "idx_community_rules_community" ON "community_rules" (community_id);
CREATE INDEX IF NOT EXISTS "idx_community_invites_code" ON "community_invites" (code);
CREATE INDEX IF NOT EXISTS "idx_community_channels_community" ON "community_channels" (community_id);
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_events_pkey" ON "calendar_events" (id);
CREATE INDEX IF NOT EXISTS "idx_calendar_events_start" ON "calendar_events" (start_datetime);
CREATE INDEX IF NOT EXISTS "idx_calendar_events_end" ON "calendar_events" (end_datetime);
CREATE INDEX IF NOT EXISTS "idx_calendar_events_type" ON "calendar_events" (event_type);
CREATE INDEX IF NOT EXISTS "idx_calendar_events_status" ON "calendar_events" (status);
CREATE INDEX IF NOT EXISTS "idx_calendar_events_created_by" ON "calendar_events" (created_by);
CREATE INDEX IF NOT EXISTS "idx_calendar_events_course" ON "calendar_events" (course_id);
CREATE INDEX IF NOT EXISTS "idx_calendar_events_instructor" ON "calendar_events" (instructor_id);
CREATE INDEX IF NOT EXISTS "idx_calendar_events_school" ON "calendar_events" (school_id);
CREATE INDEX IF NOT EXISTS "idx_calendar_events_community" ON "calendar_events" (community_id);
CREATE INDEX IF NOT EXISTS "idx_calendar_events_visibility" ON "calendar_events" (visibility);
CREATE INDEX IF NOT EXISTS "idx_calendar_events_date_range" ON "calendar_events" (start_datetime, end_datetime);
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_event_rsvps_pkey" ON "calendar_event_rsvps" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_event_rsvps_event_id_user_id_key" ON "calendar_event_rsvps" (event_id, user_id);
CREATE INDEX IF NOT EXISTS "idx_rsvps_event" ON "calendar_event_rsvps" (event_id);
CREATE INDEX IF NOT EXISTS "idx_rsvps_user" ON "calendar_event_rsvps" (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_event_reminders_pkey" ON "calendar_event_reminders" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_event_reminders_event_id_user_id_minutes_before_key" ON "calendar_event_reminders" (event_id, user_id, minutes_before);
CREATE INDEX IF NOT EXISTS "idx_reminders_event" ON "calendar_event_reminders" (event_id);
CREATE INDEX IF NOT EXISTS "idx_reminders_user" ON "calendar_event_reminders" (user_id);
CREATE INDEX IF NOT EXISTS "idx_visitors_visitor_id" ON "visitors" (visitor_id);
CREATE INDEX IF NOT EXISTS "idx_visitors_user_id" ON "visitors" (user_id);
CREATE INDEX IF NOT EXISTS "idx_visitors_last_visit" ON "visitors" (last_visit);
CREATE INDEX IF NOT EXISTS "idx_visitors_referral_source" ON "visitors" (referral_source);
CREATE INDEX IF NOT EXISTS "idx_visitors_country" ON "visitors" (country);
CREATE INDEX IF NOT EXISTS "idx_visitors_device_type" ON "visitors" (device_type);
CREATE INDEX IF NOT EXISTS "idx_visitors_created_at" ON "visitors" (created_at);
CREATE INDEX IF NOT EXISTS "idx_page_views_visitor_id" ON "page_views" (visitor_id);
CREATE INDEX IF NOT EXISTS "idx_page_views_user_id" ON "page_views" (user_id);
CREATE INDEX IF NOT EXISTS "idx_page_views_page_url" ON "page_views" (page_url);
CREATE INDEX IF NOT EXISTS "idx_page_views_created_at" ON "page_views" (created_at);
CREATE INDEX IF NOT EXISTS "idx_page_views_route_name" ON "page_views" (route_name);
CREATE INDEX IF NOT EXISTS "idx_click_events_visitor_id" ON "click_events" (visitor_id);
CREATE INDEX IF NOT EXISTS "idx_click_events_user_id" ON "click_events" (user_id);
CREATE INDEX IF NOT EXISTS "idx_click_events_page_url" ON "click_events" (page_url);
CREATE INDEX IF NOT EXISTS "idx_click_events_element_text" ON "click_events" (element_text);
CREATE INDEX IF NOT EXISTS "idx_click_events_created_at" ON "click_events" (created_at);
CREATE INDEX IF NOT EXISTS "idx_scroll_events_visitor_id" ON "scroll_events" (visitor_id);
CREATE INDEX IF NOT EXISTS "idx_scroll_events_page_url" ON "scroll_events" (page_url);
CREATE INDEX IF NOT EXISTS "idx_scroll_events_created_at" ON "scroll_events" (created_at);
CREATE INDEX IF NOT EXISTS "idx_user_journeys_visitor_id" ON "user_journeys" (visitor_id);
CREATE INDEX IF NOT EXISTS "idx_user_journeys_user_id" ON "user_journeys" (user_id);
CREATE INDEX IF NOT EXISTS "idx_user_journeys_converted" ON "user_journeys" (converted);
CREATE INDEX IF NOT EXISTS "idx_user_journeys_created_at" ON "user_journeys" (created_at);
CREATE INDEX IF NOT EXISTS "idx_programs_school_id" ON "programs" (school_id);
CREATE INDEX IF NOT EXISTS "idx_program_courses_program_id" ON "program_courses" (program_id);
CREATE INDEX IF NOT EXISTS "idx_program_courses_course_id" ON "program_courses" (course_id);
CREATE INDEX IF NOT EXISTS "idx_courses_program_id" ON "courses" (program_id);
CREATE INDEX IF NOT EXISTS "idx_jobs_active" ON "jobs" (is_active);
CREATE INDEX IF NOT EXISTS "idx_jobs_type" ON "jobs" (type);
CREATE INDEX IF NOT EXISTS "idx_jobs_expires" ON "jobs" (expires_at);
CREATE INDEX IF NOT EXISTS "idx_internships_active" ON "internships" (is_active);
CREATE INDEX IF NOT EXISTS "idx_alumni_featured" ON "alumni" (is_featured);
CREATE UNIQUE INDEX IF NOT EXISTS "daily_xp_log_pkey" ON "daily_xp_log" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "daily_xp_log_user_id_date_key" ON "daily_xp_log" (user_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS "xp_history_pkey" ON "xp_history" (id);
CREATE INDEX IF NOT EXISTS "idx_daily_xp_log_user_date" ON "daily_xp_log" (user_id, date);
CREATE INDEX IF NOT EXISTS "idx_xp_history_user" ON "xp_history" (user_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS "contact_messages_pkey" ON "contact_messages" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "discount_codes_pkey" ON "discount_codes" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "discount_codes_code_key" ON "discount_codes" (code);
CREATE INDEX IF NOT EXISTS "idx_discount_codes_code" ON "discount_codes" (code);
CREATE INDEX IF NOT EXISTS "idx_discount_codes_user" ON "discount_codes" (user_id);
CREATE INDEX IF NOT EXISTS "idx_discount_codes_status" ON "discount_codes" (status);
CREATE INDEX IF NOT EXISTS "idx_payments_discount_code" ON "payments" (discount_code_id);
CREATE UNIQUE INDEX IF NOT EXISTS "user_badges_pkey" ON "user_badges" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "user_badges_user_id_badge_id_key" ON "user_badges" (user_id, badge_id);
CREATE INDEX IF NOT EXISTS "idx_user_badges_user" ON "user_badges" (user_id);
CREATE INDEX IF NOT EXISTS "idx_user_badges_badge" ON "user_badges" (badge_id);
CREATE UNIQUE INDEX IF NOT EXISTS "two_factor_backup_codes_pkey" ON "two_factor_backup_codes" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "two_factor_backup_codes_code_hash_key" ON "two_factor_backup_codes" (code_hash);
CREATE INDEX IF NOT EXISTS "idx_two_factor_backup_codes_user" ON "two_factor_backup_codes" (user_id);
-- SKIP non-btree: CREATE INDEX idx_users_allowed_dashboards ON public.users USING gin (allowed_dashboards)
CREATE INDEX IF NOT EXISTS "idx_learning_paths_school" ON "learning_paths" (school_id);
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users" (username);
CREATE UNIQUE INDEX IF NOT EXISTS "job_applications_pkey" ON "job_applications" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "projects_pkey" ON "projects" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_items_pkey" ON "portfolio_items" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "guided_enrollments_pkey" ON "guided_enrollments" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "guided_enrollments_user_id_path_id_key" ON "guided_enrollments" (user_id, path_id);
CREATE UNIQUE INDEX IF NOT EXISTS "guided_loop_entries_pkey" ON "guided_loop_entries" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "guided_loop_entries_guided_enrollment_id_lesson_id_key" ON "guided_loop_entries" (guided_enrollment_id, lesson_id);
CREATE UNIQUE INDEX IF NOT EXISTS "daily_checkins_pkey" ON "daily_checkins" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "daily_checkins_user_id_checkin_date_key" ON "daily_checkins" (user_id, checkin_date);
CREATE INDEX IF NOT EXISTS "idx_job_applications_user" ON "job_applications" (user_id);
CREATE INDEX IF NOT EXISTS "idx_job_applications_job" ON "job_applications" (job_id);
CREATE INDEX IF NOT EXISTS "idx_job_applications_status" ON "job_applications" (status);
CREATE INDEX IF NOT EXISTS "idx_projects_user" ON "projects" (user_id);
CREATE INDEX IF NOT EXISTS "idx_projects_status" ON "projects" (status);
CREATE INDEX IF NOT EXISTS "idx_portfolio_items_user" ON "portfolio_items" (user_id);
CREATE INDEX IF NOT EXISTS "idx_guided_entries_enrollment" ON "guided_loop_entries" (guided_enrollment_id);
CREATE INDEX IF NOT EXISTS "idx_daily_checkins_user" ON "daily_checkins" (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS "career_goals_pkey" ON "career_goals" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "career_goals_slug_key" ON "career_goals" (slug);
CREATE UNIQUE INDEX IF NOT EXISTS "career_goal_courses_pkey" ON "career_goal_courses" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "career_goal_courses_goal_id_course_id_key" ON "career_goal_courses" (goal_id, course_id);
CREATE INDEX IF NOT EXISTS "idx_career_goal_courses_goal" ON "career_goal_courses" (goal_id);
CREATE INDEX IF NOT EXISTS "idx_learning_paths_career_goal" ON "learning_paths" (career_goal_id);
CREATE UNIQUE INDEX IF NOT EXISTS "promotions_pkey" ON "promotions" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "promotions_slug_key" ON "promotions" (slug);
CREATE INDEX IF NOT EXISTS "idx_promotions_active_window" ON "promotions" (is_active, starts_at, ends_at);
CREATE UNIQUE INDEX IF NOT EXISTS "board_members_pkey" ON "board_members" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "board_policies_pkey" ON "board_policies" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "board_policies_slug_key" ON "board_policies" (slug);
CREATE UNIQUE INDEX IF NOT EXISTS "board_resolutions_pkey" ON "board_resolutions" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "board_resolutions_resolution_number_key" ON "board_resolutions" (resolution_number);
CREATE INDEX IF NOT EXISTS "idx_board_policies_status" ON "board_policies" (status, published);
CREATE INDEX IF NOT EXISTS "idx_board_members_active" ON "board_members" (is_active, sort_order);
CREATE INDEX IF NOT EXISTS "idx_programs_status" ON "programs" (status);
CREATE INDEX IF NOT EXISTS "idx_programs_created_by" ON "programs" (created_by);
CREATE UNIQUE INDEX IF NOT EXISTS "program_cohorts_pkey" ON "program_cohorts" (id);
CREATE INDEX IF NOT EXISTS "idx_program_cohorts_program_id" ON "program_cohorts" (program_id);
CREATE INDEX IF NOT EXISTS "idx_program_cohorts_status" ON "program_cohorts" (status);
CREATE UNIQUE INDEX IF NOT EXISTS "program_cohort_members_pkey" ON "program_cohort_members" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "program_cohort_members_cohort_id_user_id_key" ON "program_cohort_members" (cohort_id, user_id);
CREATE INDEX IF NOT EXISTS "idx_cohort_members_cohort_id" ON "program_cohort_members" (cohort_id);
CREATE INDEX IF NOT EXISTS "idx_cohort_members_user_id" ON "program_cohort_members" (user_id);
CREATE INDEX IF NOT EXISTS "idx_payments_cohort_id" ON "payments" (program_cohort_id);
CREATE UNIQUE INDEX IF NOT EXISTS "live_sessions_pkey" ON "live_sessions" (id);
CREATE INDEX IF NOT EXISTS "idx_live_sessions_status" ON "live_sessions" (status);
CREATE INDEX IF NOT EXISTS "idx_live_sessions_event" ON "live_sessions" (calendar_event_id);
CREATE UNIQUE INDEX IF NOT EXISTS "live_participants_pkey" ON "live_participants" (id);
CREATE UNIQUE INDEX IF NOT EXISTS "live_participants_session_id_user_id_key" ON "live_participants" (session_id, user_id);
CREATE INDEX IF NOT EXISTS "idx_live_participants_session" ON "live_participants" (session_id);
CREATE INDEX IF NOT EXISTS "idx_live_participants_user" ON "live_participants" (user_id);

CREATE TABLE IF NOT EXISTS "media_assets" (
  "id" TEXT PRIMARY KEY,
  "entity_type" TEXT,
  "entity_id" TEXT,
  "source_url" TEXT,
  "r2_key" TEXT,
  "mime" TEXT,
  "bytes" INTEGER,
  "hash" TEXT,
  "license" TEXT,
  "author" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS "portfolio_sites" (
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL UNIQUE,
  "template" TEXT NOT NULL DEFAULT 'minimal',
  "theme" TEXT DEFAULT '{}',
  "headline" TEXT,
  "about" TEXT,
  "location" TEXT,
  "availability" TEXT,
  "contact_email" TEXT,
  "socials" TEXT DEFAULT '{}',
  "sections" TEXT DEFAULT '[]',
  "seo" TEXT DEFAULT '{}',
  "is_published" INTEGER DEFAULT 0,
  "views" INTEGER DEFAULT 0,
  "custom_domain" TEXT,
  "domain_status" TEXT DEFAULT 'none',
  "domain_token" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS "portfolio_projects" (
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "site_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "summary" TEXT,
  "description" TEXT,
  "cover_url" TEXT,
  "gallery" TEXT DEFAULT '[]',
  "tech" TEXT DEFAULT '[]',
  "role" TEXT,
  "duration" TEXT,
  "repo_url" TEXT,
  "demo_url" TEXT,
  "preview_image_url" TEXT,
  "featured" INTEGER DEFAULT 0,
  "sort_order" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(site_id, slug)
);
CREATE TABLE IF NOT EXISTS "portfolio_views" (
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "site_id" TEXT,
  "path" TEXT,
  "referrer" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS "community_join_requests" (
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "community_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "message" TEXT,
  "decided_by" TEXT,
  "decided_at" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(community_id, user_id)
);

CREATE TABLE IF NOT EXISTS "user_preferences" (
  "user_id" TEXT PRIMARY KEY,
  "data" TEXT DEFAULT '{}',
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL UNIQUE,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "user_agent" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS "portfolio_likes" (
  "site_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("site_id", "user_id")
);
CREATE TABLE IF NOT EXISTS "portfolio_reviews" (
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "site_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "status" TEXT NOT NULL DEFAULT 'published',
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(site_id, user_id)
);
