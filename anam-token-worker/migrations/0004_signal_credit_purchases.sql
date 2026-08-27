PRAGMA foreign_keys = ON;

CREATE TABLE signal_credit_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL CHECK(length(pack_id) BETWEEN 1 AND 50),
  credits INTEGER NOT NULL CHECK(credits > 0),
  stripe_price_id TEXT NOT NULL CHECK(length(stripe_price_id) BETWEEN 1 AND 160),
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  currency TEXT NOT NULL CHECK(length(currency) = 3),
  amount_total INTEGER NOT NULL CHECK(amount_total >= 0),
  status TEXT NOT NULL CHECK(status IN ('creating', 'open', 'paid', 'failed', 'expired', 'creation_failed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  paid_at TEXT
);

CREATE INDEX signal_credit_purchases_user_history
  ON signal_credit_purchases(user_id, created_at DESC, id DESC);

CREATE INDEX signal_credit_purchases_payment_intent
  ON signal_credit_purchases(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
