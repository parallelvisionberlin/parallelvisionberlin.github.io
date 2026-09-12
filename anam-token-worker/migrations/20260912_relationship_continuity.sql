PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS nina_agreement_events (
  event_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL REFERENCES visitors(visitor_id) ON DELETE CASCADE,
  agreement_key TEXT NOT NULL CHECK(agreement_key IN ('relationship_label', 'exclusivity')),
  value TEXT NOT NULL CHECK(length(value) BETWEEN 1 AND 80),
  status TEXT NOT NULL CHECK(status IN ('active', 'ended')),
  conversation_id TEXT NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  source_message_id TEXT NOT NULL REFERENCES messages(message_id) ON DELETE CASCADE,
  source_order INTEGER NOT NULL,
  evidence_json TEXT NOT NULL CHECK(json_valid(evidence_json)),
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, agreement_key, source_message_id)
);
CREATE INDEX IF NOT EXISTS nina_agreement_current ON nina_agreement_events(user_id, agreement_key, source_order DESC);

CREATE TABLE IF NOT EXISTS nina_agreement_scans (
  conversation_id TEXT PRIMARY KEY REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  through_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS nina_private_context (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK(length(content) <= 12000),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS nina_memory_tool_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL REFERENCES visitors(visitor_id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  calls INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS nina_memory_tool_expiry ON nina_memory_tool_sessions(expires_at);
