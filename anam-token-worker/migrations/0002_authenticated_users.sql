PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  auth_provider TEXT NOT NULL CHECK(auth_provider = 'clerk'),
  auth_subject TEXT NOT NULL UNIQUE,
  email TEXT,
  display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 1 AND 50),
  role TEXT NOT NULL CHECK(role IN ('owner', 'user')),
  memory_visitor_id TEXT NOT NULL UNIQUE REFERENCES visitors(visitor_id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX users_single_owner
  ON users(role)
  WHERE role = 'owner';

