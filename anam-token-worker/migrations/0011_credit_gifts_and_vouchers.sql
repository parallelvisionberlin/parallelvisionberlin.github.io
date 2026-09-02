PRAGMA foreign_keys = ON;

CREATE TABLE credit_grants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK(amount > 0 AND amount <= 1000000000),
  previous_balance INTEGER NOT NULL CHECK(previous_balance >= 0),
  resulting_balance INTEGER NOT NULL CHECK(resulting_balance = previous_balance + amount),
  granted_at TEXT NOT NULL,
  granted_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  note TEXT NOT NULL DEFAULT '' CHECK(length(note) <= 120)
);

CREATE INDEX credit_grants_recent ON credit_grants(granted_at DESC, id DESC);
CREATE INDEX credit_grants_user ON credit_grants(user_id, granted_at DESC);

CREATE TRIGGER credit_grants_apply_ledger
AFTER INSERT ON credit_grants
BEGIN
  INSERT INTO signal_credit_transactions
    (id, user_id, amount, type, source, reference_id, description, created_at)
  VALUES
    (NEW.id, NEW.user_id, NEW.amount, 'credit', 'owner_gift', 'credit-grant:' || NEW.id, NEW.note, NEW.granted_at);
END;

CREATE TABLE vouchers (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK(length(code) BETWEEN 3 AND 32),
  credit_amount INTEGER NOT NULL CHECK(credit_amount > 0 AND credit_amount <= 1000000000),
  maximum_redemptions INTEGER NOT NULL CHECK(maximum_redemptions > 0 AND maximum_redemptions <= 1000000),
  expires_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX vouchers_status ON vouchers(is_active, expires_at);

CREATE TABLE voucher_redemptions (
  id TEXT PRIMARY KEY,
  voucher_id TEXT NOT NULL REFERENCES vouchers(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credit_amount INTEGER NOT NULL CHECK(credit_amount > 0),
  previous_balance INTEGER NOT NULL CHECK(previous_balance >= 0),
  resulting_balance INTEGER NOT NULL CHECK(resulting_balance = previous_balance + credit_amount),
  redeemed_at TEXT NOT NULL,
  UNIQUE(voucher_id, user_id)
);

CREATE INDEX voucher_redemptions_voucher ON voucher_redemptions(voucher_id, redeemed_at DESC);
CREATE INDEX voucher_redemptions_user ON voucher_redemptions(user_id, redeemed_at DESC);

CREATE TRIGGER voucher_redemptions_apply_ledger
AFTER INSERT ON voucher_redemptions
BEGIN
  INSERT INTO signal_credit_transactions
    (id, user_id, amount, type, source, reference_id, description, created_at)
  SELECT NEW.id, NEW.user_id, NEW.credit_amount, 'credit', 'voucher',
         'voucher-redemption:' || NEW.id, 'Voucher ' || code, NEW.redeemed_at
  FROM vouchers WHERE id = NEW.voucher_id;
END;
