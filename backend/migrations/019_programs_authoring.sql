-- Programs authoring workflow + cohorts (program-as-package).
-- Idempotent — safe to re-run by the backend migration runner.

-- ── programs: authoring workflow columns ──
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived'));
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS duration_weeks INTEGER;
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'NGN';
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Backfill: existing published programs keep working
UPDATE programs SET status = 'published' WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_programs_status ON programs(status);
CREATE INDEX IF NOT EXISTS idx_programs_created_by ON programs(created_by);

-- ── program_courses: week ordering for packaged delivery ──
ALTER TABLE program_courses
  ADD COLUMN IF NOT EXISTS week_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE program_courses
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT true;

-- ── program_cohorts: dated, capped batches of a program ──
CREATE TABLE IF NOT EXISTS program_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 100 CHECK (capacity > 0),
  price DECIMAL(10, 2),
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'full', 'ongoing', 'completed', 'cancelled')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_program_cohorts_program_id ON program_cohorts(program_id);
CREATE INDEX IF NOT EXISTS idx_program_cohorts_status ON program_cohorts(status);

-- ── program_cohort_members: who bought into which cohort ──
CREATE TABLE IF NOT EXISTS program_cohort_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES program_cohorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'dropped', 'refunded')),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(cohort_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cohort_members_cohort_id ON program_cohort_members(cohort_id);
CREATE INDEX IF NOT EXISTS idx_cohort_members_user_id ON program_cohort_members(user_id);

-- ── payments: allow program-cohort purchases (course_id becomes nullable) ──
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS program_cohort_id UUID REFERENCES program_cohorts(id) ON DELETE SET NULL;
DO $$
BEGIN
  BEGIN
    ALTER TABLE payments ALTER COLUMN course_id DROP NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    -- already nullable
    NULL;
  END;
END $$;
CREATE INDEX IF NOT EXISTS idx_payments_cohort_id ON payments(program_cohort_id);
