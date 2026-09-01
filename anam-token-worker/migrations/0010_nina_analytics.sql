PRAGMA foreign_keys = ON;

CREATE TABLE nina_analytics_sessions (
  id TEXT PRIMARY KEY,
  client_entry_id TEXT NOT NULL UNIQUE,
  visitor_id TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  user_key TEXT NOT NULL,
  is_authenticated INTEGER NOT NULL CHECK(is_authenticated IN (0, 1)),
  actor_type TEXT NOT NULL CHECK(actor_type IN ('owner', 'public')),
  is_returning INTEGER NOT NULL CHECK(is_returning IN (0, 1)),
  status TEXT NOT NULL CHECK(status IN ('active', 'ended', 'disconnected', 'failed', 'abandoned')),
  started_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  ended_at TEXT,
  connected_seconds INTEGER NOT NULL DEFAULT 0 CHECK(connected_seconds >= 0),
  session_date TEXT NOT NULL
);

CREATE INDEX nina_analytics_started_at
  ON nina_analytics_sessions(started_at DESC);

CREATE INDEX nina_analytics_user_history
  ON nina_analytics_sessions(user_key, started_at DESC);

CREATE INDEX nina_analytics_active
  ON nina_analytics_sessions(status, last_seen_at)
  WHERE status = 'active';
