PRAGMA foreign_keys = ON;

-- A completed call requests work durably before the HTTP response returns.
-- The conversation reference makes Forget remove even an in-flight job.
CREATE TABLE IF NOT EXISTS nina_memory_jobs (
  visitor_id TEXT PRIMARY KEY REFERENCES visitors(visitor_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('queued','running','complete','invalid_extraction','error')),
  requested_generation INTEGER NOT NULL DEFAULT 1,
  processed_generation INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT,
  lease_until TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_error_code TEXT,
  last_attempted_at TEXT,
  last_success_at TEXT,
  next_attempt_at TEXT NOT NULL,
  last_cursor TEXT REFERENCES messages(message_id) ON DELETE SET NULL,
  last_message_count INTEGER NOT NULL DEFAULT 0,
  last_pinned_count INTEGER NOT NULL DEFAULT 0,
  last_journal_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS nina_memory_jobs_due ON nina_memory_jobs(status,next_attempt_at);
