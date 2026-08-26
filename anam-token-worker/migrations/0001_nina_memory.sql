PRAGMA foreign_keys = ON;

CREATE TABLE visitors (
  visitor_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 1 AND 50),
  profile_type TEXT NOT NULL CHECK(profile_type IN ('owner', 'visitor')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX visitors_single_owner
  ON visitors(profile_type)
  WHERE profile_type = 'owner';

CREATE TABLE conversations (
  conversation_id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL REFERENCES visitors(visitor_id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  ended_at TEXT
);

CREATE INDEX conversations_visitor_started
  ON conversations(visitor_id, started_at DESC);

CREATE TABLE messages (
  message_id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL REFERENCES visitors(visitor_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user', 'persona')),
  content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 4000),
  created_at TEXT NOT NULL
);

CREATE INDEX messages_visitor_created
  ON messages(visitor_id, created_at DESC);
CREATE INDEX messages_conversation_created
  ON messages(conversation_id, created_at ASC);

CREATE TABLE memory_summaries (
  visitor_id TEXT PRIMARY KEY REFERENCES visitors(visitor_id) ON DELETE CASCADE,
  summary TEXT NOT NULL CHECK(length(summary) <= 3000),
  updated_at TEXT NOT NULL,
  messages_summarized_through TEXT REFERENCES messages(message_id) ON DELETE SET NULL
);

CREATE TABLE pinned_memories (
  memory_id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL REFERENCES visitors(visitor_id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK(length(category) BETWEEN 1 AND 40),
  content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 500),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX pinned_memories_visitor_updated
  ON pinned_memories(visitor_id, updated_at DESC);

CREATE TABLE open_threads (
  thread_id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL REFERENCES visitors(visitor_id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 500),
  status TEXT NOT NULL CHECK(status IN ('active', 'resolved')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX open_threads_visitor_status_updated
  ON open_threads(visitor_id, status, updated_at DESC);
