ALTER TABLE enrollments ADD COLUMN access_type TEXT DEFAULT 'paid';
ALTER TABLE enrollments ADD COLUMN trial_started_at TEXT;
ALTER TABLE enrollments ADD COLUMN trial_ends_at TEXT;

CREATE TABLE IF NOT EXISTS trial_settings (
  id TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 1,
  default_days INTEGER DEFAULT 7,
  campaign_start TEXT,
  campaign_end TEXT,
  certificate_allowed INTEGER DEFAULT 0,
  oral_defense_allowed INTEGER DEFAULT 1,
  gigo_daily_limit INTEGER DEFAULT 20,
  max_trials INTEGER DEFAULT 1,
  reset_allowed INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

INSERT INTO trial_settings (id,enabled,default_days,campaign_start,campaign_end,certificate_allowed,oral_defense_allowed,gigo_daily_limit,max_trials,reset_allowed)
VALUES ('default',1,7,'2026-11-13T00:00:00.000Z','2026-11-20T23:59:59.000Z',0,1,20,1,0)
ON CONFLICT(id) DO UPDATE SET enabled=1,default_days=7,campaign_start='2026-11-13T00:00:00.000Z',campaign_end='2026-11-20T23:59:59.000Z',updated_at=datetime('now');

CREATE TABLE IF NOT EXISTS trial_overrides (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT,
  course_id TEXT,
  enabled INTEGER DEFAULT 1,
  days INTEGER,
  starts_at TEXT,
  ends_at TEXT,
  note TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS gigo_access_log (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT NOT NULL,
  course_id TEXT,
  intent TEXT,
  allowed INTEGER,
  reason TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

UPDATE enrollments SET access_type='paid' WHERE access_type IS NULL;
