PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN referral_code TEXT;
ALTER TABLE users ADD COLUMN referred_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN referral_created_at TEXT;

CREATE UNIQUE INDEX users_referral_code_unique
  ON users(referral_code COLLATE NOCASE)
  WHERE referral_code IS NOT NULL;

CREATE INDEX users_referred_by_user
  ON users(referred_by_user_id)
  WHERE referred_by_user_id IS NOT NULL;
