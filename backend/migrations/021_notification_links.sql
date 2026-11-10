-- Deep links for notifications (used by the bell, notifications page and
-- browser notifications). Safe to re-run.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;
