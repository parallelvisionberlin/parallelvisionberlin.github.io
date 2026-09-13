-- Private snapshots make an explicitly reviewed derived-memory repair reversible.
-- Raw transcripts remain in messages and are never duplicated here.
CREATE TABLE IF NOT EXISTS nina_memory_recoveries (
  recovery_id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL REFERENCES visitors(visitor_id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  before_json TEXT NOT NULL,
  reviewed_extraction_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
