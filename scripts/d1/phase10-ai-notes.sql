-- Gemini-generated lesson study notes (no verbatim transcripts).
CREATE TABLE IF NOT EXISTS lesson_ai_notes (
  lesson_id TEXT PRIMARY KEY,
  course_id TEXT,
  model TEXT,
  status TEXT DEFAULT 'ready',
  notes TEXT,
  tokens INTEGER DEFAULT 0,
  error TEXT,
  generated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
