PRAGMA foreign_keys = ON;

CREATE TABLE live_nina_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('pending', 'active', 'ended', 'exhausted', 'failed')),
  started_at TEXT,
  last_billed_at TEXT,
  billable_until TEXT,
  ended_at TEXT,
  credits_available_on_start INTEGER NOT NULL CHECK(credits_available_on_start >= 0),
  credits_debited INTEGER NOT NULL DEFAULT 0 CHECK(credits_debited >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX live_nina_sessions_user_history
  ON live_nina_sessions(user_id, created_at DESC);

CREATE INDEX live_nina_sessions_open
  ON live_nina_sessions(user_id, status)
  WHERE status IN ('pending', 'active');
