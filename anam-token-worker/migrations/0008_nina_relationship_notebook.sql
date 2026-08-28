PRAGMA foreign_keys = ON;

CREATE TABLE nina_relationship_states (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state_json TEXT NOT NULL CHECK(json_valid(state_json)),
  relationship_summary TEXT NOT NULL CHECK(length(relationship_summary) BETWEEN 1 AND 1200),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_evaluated_at TEXT
);
