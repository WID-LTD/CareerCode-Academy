-- Native live classroom (Cloudflare Realtime SFU) bookkeeping.
-- Media flows through Cloudflare; these tables track scheduling,
-- participation (for free-tier minute accounting), and lifecycle.
-- Idempotent — safe to re-run by the backend migration runner.

CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
  program_cohort_id UUID REFERENCES program_cohorts(id) ON DELETE SET NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  cf_session_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  max_participants INTEGER NOT NULL DEFAULT 100 CHECK (max_participants > 0),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_event ON live_sessions(calendar_event_id);

CREATE TABLE IF NOT EXISTS live_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_in_room VARCHAR(20) NOT NULL DEFAULT 'student'
    CHECK (role_in_room IN ('host', 'cohost', 'student')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  minutes_claimed INTEGER NOT NULL DEFAULT 0 CHECK (minutes_claimed >= 0),
  UNIQUE(session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_live_participants_session ON live_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_live_participants_user ON live_participants(user_id);
