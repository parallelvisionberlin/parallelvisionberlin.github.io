CREATE TABLE IF NOT EXISTS nina_tool_diagnostics (
  request_id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  diagnostic_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS nina_tool_diagnostics_conversation ON nina_tool_diagnostics(conversation_id,created_at);
