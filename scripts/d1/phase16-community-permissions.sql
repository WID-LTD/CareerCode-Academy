-- Per-channel role permissions for community channels.
CREATE TABLE IF NOT EXISTS community_channel_permissions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  channel_id TEXT NOT NULL,
  role TEXT NOT NULL,
  can_read INTEGER NOT NULL DEFAULT 1,
  can_post INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(channel_id, role)
);
CREATE INDEX IF NOT EXISTS idx_channel_permissions_channel
  ON community_channel_permissions(channel_id);
