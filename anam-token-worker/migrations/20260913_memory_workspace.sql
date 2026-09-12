PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS nina_memory_controls (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL REFERENCES visitors(visitor_id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('profile','pin','summary','thread','agreement')),
  target_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('save','hide','restore')),
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(user_id,kind,target_id)
);
CREATE INDEX IF NOT EXISTS nina_memory_controls_visitor ON nina_memory_controls(visitor_id,kind);

CREATE TABLE IF NOT EXISTS nina_journal_entries (
  entry_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL REFERENCES visitors(visitor_id) ON DELETE CASCADE,
  source_message_id TEXT REFERENCES messages(message_id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('independent','shared','fantasy')),
  scope TEXT NOT NULL DEFAULT 'private' CHECK(scope IN ('private','shared')),
  content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 800),
  story_date TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','hidden')),
  origin TEXT NOT NULL CHECK(origin IN ('conversation','editor')),
  revision INTEGER NOT NULL DEFAULT 1,
  recorded_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(scope='private' OR kind='independent')
);
CREATE INDEX IF NOT EXISTS nina_journal_scope ON nina_journal_entries(scope,user_id,status,updated_at DESC);

CREATE TABLE IF NOT EXISTS nina_session_diagnostics (
  conversation_id TEXT PRIMARY KEY REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anam_session_id TEXT,
  setup_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(setup_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS nina_conversation_events (
  conversation_id TEXT NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  kind TEXT NOT NULL,
  elapsed_ms INTEGER NOT NULL,
  data_json TEXT NOT NULL CHECK(json_valid(data_json)),
  PRIMARY KEY(conversation_id,event_id),
  UNIQUE(conversation_id,sequence)
);

CREATE TABLE IF NOT EXISTS nina_relationship_evaluations (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  input_characters INTEGER NOT NULL DEFAULT 0,
  attempted_at TEXT NOT NULL,
  PRIMARY KEY(user_id,conversation_id)
);
