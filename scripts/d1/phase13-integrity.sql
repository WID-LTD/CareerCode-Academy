-- Phase 13: payment, quiz, contact, and performance integrity.
-- Apply once to the D1 database before deploying the matching worker.

-- ── Payment allocations: one row per payment/course ──────────────────────
DELETE FROM payment_courses
WHERE rowid NOT IN (
  SELECT MIN(rowid) FROM payment_courses GROUP BY payment_id, course_id
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_courses_unique
  ON payment_courses(payment_id, course_id);

CREATE INDEX IF NOT EXISTS idx_payment_courses_payment
  ON payment_courses(payment_id);

CREATE INDEX IF NOT EXISTS idx_payments_reference
  ON payments(reference);

CREATE INDEX IF NOT EXISTS idx_payments_status_created
  ON payments(status, created_at);

-- ── Instructor revenue: single source of truth ───────────────────────────
-- The old view UNION ALL'd payments and payment_courses, double-counting
-- single-course sales. Prefer payment_courses, then fall back to payments
-- only when no allocation exists for that course.
DROP VIEW IF EXISTS instructor_revenue;
CREATE VIEW instructor_revenue AS
SELECT pc.course_id AS course_id,
       pc.instructor_id AS instructor_id,
       p.id AS payment_id,
       pc.amount AS amount,
       p.status AS status,
       p.created_at AS created_at
FROM payment_courses pc
JOIN payments p ON p.id = pc.payment_id
WHERE pc.course_id IS NOT NULL
UNION ALL
SELECT p.course_id,
       c.instructor_id,
       p.id,
       p.amount,
       p.status,
       p.created_at
FROM payments p
JOIN courses c ON c.id = p.course_id
WHERE p.course_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM payment_courses pc
    WHERE pc.payment_id = p.id AND pc.course_id = p.course_id
  );

-- ── Quiz attempt limits ──────────────────────────────────────────────────
ALTER TABLE quiz_attempts ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_user
  ON quiz_attempts(quiz_id, user_id);

-- ── Contact messages ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status
  ON contact_messages(status, created_at);

-- ── Hot-path indexes ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course
  ON enrollments(user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_trial_end
  ON enrollments(access_type, trial_ends_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, read, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver
  ON messages(sender_id, receiver_id, created_at);

CREATE INDEX IF NOT EXISTS idx_channel_messages_channel
  ON channel_messages(channel_id, created_at);

CREATE INDEX IF NOT EXISTS idx_lessons_course_order
  ON lessons(course_id, order_index);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_order
  ON quiz_questions(quiz_id, order_index);

CREATE INDEX IF NOT EXISTS idx_calendar_events_start
  ON calendar_events(start_datetime, status);

CREATE INDEX IF NOT EXISTS idx_courses_published_category
  ON courses(published, category);

CREATE INDEX IF NOT EXISTS idx_users_email
  ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_username
  ON users(username);
