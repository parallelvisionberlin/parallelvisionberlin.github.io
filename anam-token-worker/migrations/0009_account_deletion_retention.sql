PRAGMA foreign_keys = ON;

-- Paid purchase records are retained without an application user identifier for accounting reconciliation.
CREATE TABLE retained_signal_credit_purchases (
  purchase_id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL,
  credits INTEGER NOT NULL,
  stripe_price_id TEXT NOT NULL,
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  currency TEXT NOT NULL,
  amount_total INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status = 'paid'),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  paid_at TEXT
);

CREATE INDEX retained_signal_credit_purchases_payment_intent
  ON retained_signal_credit_purchases(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
