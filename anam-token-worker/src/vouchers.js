import { SignalCreditError, getSignalCreditBalance } from "./credits.js";

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;
const MAX_AMOUNT = 1000000000;
const MAX_REDEMPTIONS = 1000000;

export class VoucherError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "VoucherError";
    this.code = code;
    this.status = status;
  }
}

const codeValue = value => {
  const code = typeof value === "string" ? value.normalize("NFKC").trim().toUpperCase() : "";
  if (!CODE_PATTERN.test(code)) throw new VoucherError("invalid_code", "Use 3–32 letters, numbers, underscores or hyphens");
  return code;
};

const positiveInteger = (value, maximum, field) => {
  if (!Number.isSafeInteger(value) || value <= 0 || value > maximum) throw new VoucherError(`invalid_${field}`, `Invalid ${field.replaceAll("_", " ")}`);
  return value;
};

const isoExpiration = value => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new VoucherError("invalid_expiration", "Invalid expiration date");
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new VoucherError("invalid_expiration", "Invalid expiration date");
  return new Date(timestamp).toISOString();
};

function changes(result) {
  return Number(result?.meta?.changes ?? result?.changes ?? 0);
}

export async function findCreditUser(env, query) {
  const term = typeof query === "string" ? query.normalize("NFKC").trim() : "";
  if (!term || term.length > 254) throw new VoucherError("invalid_user_query", "Enter an email or internal user ID");
  const user = await env.NINA_MEMORY_DB.prepare(`
    SELECT u.id, u.email, a.balance
    FROM users u LEFT JOIN signal_credit_accounts a ON a.user_id = u.id
    WHERE u.id = ? OR u.email = ? COLLATE NOCASE LIMIT 1
  `).bind(term, term.toLowerCase()).first();
  if (!user) throw new VoucherError("user_not_found", "User not found", 404);
  const account = await getSignalCreditBalance(env, user.id);
  return { id: user.id, email: user.email || "", balance: account.balance };
}

export async function grantGiftCredits(env, ownerId, userId, amount, note = "") {
  const credits = positiveInteger(amount, MAX_AMOUNT, "amount");
  const cleanNote = typeof note === "string" ? note.normalize("NFKC").trim() : "";
  if (cleanNote.length > 120) throw new VoucherError("invalid_note", "Note is too long");
  await getSignalCreditBalance(env, userId);
  const grant = { id: crypto.randomUUID(), at: new Date().toISOString() };
  try {
    const result = await env.NINA_MEMORY_DB.prepare(`
      INSERT INTO credit_grants
        (id, user_id, amount, previous_balance, resulting_balance, granted_at, granted_by_user_id, note)
      SELECT ?, ?, ?, balance, balance + ?, ?, ?, ?
      FROM signal_credit_accounts WHERE user_id = ?
    `).bind(grant.id, userId, credits, credits, grant.at, ownerId, cleanNote, userId).run();
    if (changes(result) !== 1) throw new VoucherError("user_not_found", "User not found", 404);
  } catch (error) {
    if (error instanceof VoucherError) throw error;
    if (error instanceof SignalCreditError) throw error;
    throw new VoucherError("grant_failed", "Unable to grant credits", 409);
  }
  const row = await env.NINA_MEMORY_DB.prepare(`
    SELECT id, user_id, amount, previous_balance, resulting_balance, granted_at, granted_by_user_id, note
    FROM credit_grants WHERE id = ?
  `).bind(grant.id).first();
  return normalizeGrant(row);
}

export async function createVoucher(env, ownerId, input) {
  const voucher = {
    id: crypto.randomUUID(), code: codeValue(input?.code),
    credits: positiveInteger(input?.creditAmount, MAX_AMOUNT, "credit_amount"),
    limit: positiveInteger(input?.maximumRedemptions, MAX_REDEMPTIONS, "maximum_redemptions"),
    expiresAt: isoExpiration(input?.expiresAt), active: input?.active !== false,
    createdAt: new Date().toISOString()
  };
  try {
    await env.NINA_MEMORY_DB.prepare(`
      INSERT INTO vouchers
        (id, code, credit_amount, maximum_redemptions, expires_at, is_active, created_at, created_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(voucher.id, voucher.code, voucher.credits, voucher.limit, voucher.expiresAt, voucher.active ? 1 : 0, voucher.createdAt, ownerId).run();
  } catch (error) {
    if (String(error?.message || error).toLowerCase().includes("unique")) throw new VoucherError("code_exists", "Voucher code already exists", 409);
    throw error;
  }
  return voucher;
}

export async function redeemVoucher(env, userId, rawCode, now = new Date()) {
  const code = codeValue(rawCode);
  await getSignalCreditBalance(env, userId);
  const redemption = { id: crypto.randomUUID(), at: now.toISOString() };
  let result;
  try {
    result = await env.NINA_MEMORY_DB.prepare(`
      INSERT INTO voucher_redemptions
        (id, voucher_id, user_id, credit_amount, previous_balance, resulting_balance, redeemed_at)
      SELECT ?, v.id, ?, v.credit_amount, a.balance, a.balance + v.credit_amount, ?
      FROM vouchers v JOIN signal_credit_accounts a ON a.user_id = ?
      WHERE v.code = ? COLLATE NOCASE
        AND v.is_active = 1
        AND (v.expires_at IS NULL OR v.expires_at > ?)
        AND NOT EXISTS (SELECT 1 FROM voucher_redemptions own WHERE own.voucher_id = v.id AND own.user_id = ?)
        AND (SELECT COUNT(*) FROM voucher_redemptions used WHERE used.voucher_id = v.id) < v.maximum_redemptions
    `).bind(redemption.id, userId, redemption.at, userId, code, redemption.at, userId).run();
  } catch (error) {
    if (String(error?.message || error).toLowerCase().includes("unique")) throw new VoucherError("already_redeemed", "You already redeemed this code", 409);
    throw error;
  }
  if (changes(result) !== 1) {
    const voucher = await env.NINA_MEMORY_DB.prepare(`
      SELECT id, is_active, expires_at, maximum_redemptions,
             (SELECT COUNT(*) FROM voucher_redemptions WHERE voucher_id = vouchers.id) AS redemption_count,
             EXISTS(SELECT 1 FROM voucher_redemptions WHERE voucher_id = vouchers.id AND user_id = ?) AS redeemed_by_user
      FROM vouchers WHERE code = ? COLLATE NOCASE LIMIT 1
    `).bind(userId, code).first();
    if (!voucher) throw new VoucherError("voucher_not_found", "Voucher not found", 404);
    if (Number(voucher.redeemed_by_user)) throw new VoucherError("already_redeemed", "You already redeemed this code", 409);
    if (!Number(voucher.is_active)) throw new VoucherError("voucher_inactive", "Voucher is inactive", 409);
    if (voucher.expires_at && Date.parse(voucher.expires_at) <= now.getTime()) throw new VoucherError("voucher_expired", "Voucher has expired", 409);
    if (Number(voucher.redemption_count) >= Number(voucher.maximum_redemptions)) throw new VoucherError("voucher_limit_reached", "Voucher redemption limit reached", 409);
    throw new VoucherError("redemption_failed", "Unable to redeem voucher", 409);
  }
  const account = await getSignalCreditBalance(env, userId);
  return { code, balance: account.balance };
}

function normalizeGrant(row) {
  return {
    id: row.id, userId: row.user_id, amount: Number(row.amount), previousBalance: Number(row.previous_balance),
    resultingBalance: Number(row.resulting_balance), grantedAt: row.granted_at,
    grantedByUserId: row.granted_by_user_id, note: row.note || ""
  };
}

export async function getCreditAdminDashboard(env) {
  const [grants, vouchers] = await Promise.all([
    env.NINA_MEMORY_DB.prepare(`
      SELECT g.id, g.user_id, g.amount, g.previous_balance, g.resulting_balance, g.granted_at, g.granted_by_user_id, g.note,
             u.email AS user_email
      FROM credit_grants g JOIN users u ON u.id = g.user_id
      ORDER BY g.granted_at DESC, g.id DESC LIMIT 25
    `).all(),
    env.NINA_MEMORY_DB.prepare(`
      SELECT v.id, v.code, v.credit_amount, v.maximum_redemptions, v.expires_at, v.is_active, v.created_at,
             COUNT(r.id) AS redemption_count
      FROM vouchers v LEFT JOIN voucher_redemptions r ON r.voucher_id = v.id
      GROUP BY v.id ORDER BY v.created_at DESC, v.id DESC LIMIT 100
    `).all()
  ]);
  return {
    grants: (grants?.results || []).map(row => ({ ...normalizeGrant(row), userEmail: row.user_email || "" })),
    vouchers: (vouchers?.results || []).map(row => ({
      id: row.id, code: row.code, creditAmount: Number(row.credit_amount), maximumRedemptions: Number(row.maximum_redemptions),
      redemptionCount: Number(row.redemption_count), expiresAt: row.expires_at, active: Number(row.is_active) === 1, createdAt: row.created_at
    }))
  };
}
