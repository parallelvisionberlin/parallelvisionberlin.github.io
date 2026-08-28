PRAGMA foreign_keys = ON;

CREATE TABLE account_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_name TEXT NOT NULL DEFAULT '' CHECK(length(preferred_name) <= 50),
  language TEXT NOT NULL DEFAULT 'en' CHECK(language IN ('en', 'de')),
  newsletter_updates INTEGER NOT NULL DEFAULT 0 CHECK(newsletter_updates IN (0, 1)),
  nina_transmissions INTEGER NOT NULL DEFAULT 0 CHECK(nina_transmissions IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
