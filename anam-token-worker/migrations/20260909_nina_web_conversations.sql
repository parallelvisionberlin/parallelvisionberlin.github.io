-- Additive, website measurement only. No changes to balances or native sessions.
CREATE TABLE IF NOT EXISTS nina_qualified_conversations (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  conversation_id TEXT REFERENCES conversations(conversation_id) ON DELETE SET NULL,
  live_session_id TEXT REFERENCES live_nina_sessions(id) ON DELETE SET NULL,
  event_id TEXT NOT NULL UNIQUE,
  qualified_at TEXT NOT NULL,
  meta_sent_at TEXT
);
CREATE INDEX IF NOT EXISTS nina_qualified_conversations_date
  ON nina_qualified_conversations(qualified_at);
