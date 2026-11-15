-- Direct-message editing and read state.
ALTER TABLE messages ADD COLUMN edited INTEGER NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN updated_at TEXT;
CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages(sender_id, receiver_id, created_at);
