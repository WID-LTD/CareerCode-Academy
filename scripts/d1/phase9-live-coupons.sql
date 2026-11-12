-- Live labs, paid-only access, reminders, coupons, project review and analytics.
-- Apply once on the production D1 database.

UPDATE calendar_events
SET meeting_url = 'https://meet.google.com/dwn-crnc-exi',
    meeting_platform = 'Google Meet',
    location = 'Google Meet'
WHERE event_type = 'live_session';

CREATE TABLE IF NOT EXISTS live_reminder_log (
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  window TEXT NOT NULL,
  sent_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (event_id, user_id, window)
);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percent',
  value REAL NOT NULL,
  course_id TEXT,
  path_id TEXT,
  max_uses INTEGER,
  uses INTEGER DEFAULT 0,
  expires_at TEXT,
  status TEXT DEFAULT 'active',
  created_by TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

ALTER TABLE projects ADD COLUMN score INTEGER;
ALTER TABLE projects ADD COLUMN reviewed_at TEXT;
ALTER TABLE payments ADD COLUMN coupon_id TEXT;

-- Enable paid checkout (this was the reason gateways appeared not to work).
UPDATE feature_flags SET enabled = 1, updated_at = datetime('now') WHERE key = 'paid_enrollment_enabled';
