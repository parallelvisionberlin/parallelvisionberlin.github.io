PRAGMA foreign_keys = ON;

CREATE TABLE signal_credit_accounts (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK(balance >= 0),
  lifetime_credited INTEGER NOT NULL DEFAULT 0 CHECK(lifetime_credited >= 0),
  lifetime_debited INTEGER NOT NULL DEFAULT 0 CHECK(lifetime_debited >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE signal_credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES signal_credit_accounts(user_id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK(amount != 0),
  type TEXT NOT NULL CHECK(type IN ('credit', 'debit')),
  source TEXT NOT NULL CHECK(length(source) BETWEEN 1 AND 50),
  reference_id TEXT CHECK(reference_id IS NULL OR length(reference_id) BETWEEN 1 AND 160),
  description TEXT NOT NULL DEFAULT '' CHECK(length(description) <= 240),
  created_at TEXT NOT NULL,
  CHECK((type = 'credit' AND amount > 0) OR (type = 'debit' AND amount < 0))
);

CREATE UNIQUE INDEX signal_credit_transactions_idempotency
  ON signal_credit_transactions(user_id, reference_id)
  WHERE reference_id IS NOT NULL;

CREATE INDEX signal_credit_transactions_history
  ON signal_credit_transactions(user_id, created_at DESC, id DESC);

CREATE TRIGGER signal_credit_transactions_prevent_overdraft
BEFORE INSERT ON signal_credit_transactions
WHEN NEW.amount < 0 AND (
  SELECT balance + NEW.amount
  FROM signal_credit_accounts
  WHERE user_id = NEW.user_id
) < 0
BEGIN
  SELECT RAISE(ABORT, 'insufficient_signal_credits');
END;

CREATE TRIGGER signal_credit_transactions_apply_balance
AFTER INSERT ON signal_credit_transactions
BEGIN
  UPDATE signal_credit_accounts
  SET balance = balance + NEW.amount,
      lifetime_credited = lifetime_credited + CASE WHEN NEW.amount > 0 THEN NEW.amount ELSE 0 END,
      lifetime_debited = lifetime_debited + CASE WHEN NEW.amount < 0 THEN -NEW.amount ELSE 0 END,
      updated_at = NEW.created_at
  WHERE user_id = NEW.user_id;
END;
