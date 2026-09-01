import { getClerkEmailVerification, synchronizeAuthenticatedUserEmail } from "./auth.js";

const MAX_CREDIT_AMOUNT = 1000000000;
const DEFAULT_HISTORY_LIMIT = 20;
const MAX_HISTORY_LIMIT = 50;

export class SignalCreditError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SignalCreditError";
    this.code = code;
  }
}

function validUserId(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 128) throw new SignalCreditError("invalid_user", "Invalid user");
  return value;
}

function validAmount(value) {
  if (!Number.isSafeInteger(value) || value <= 0 || value > MAX_CREDIT_AMOUNT) {
    throw new SignalCreditError("invalid_amount", "Credit amount must be a positive integer");
  }
  return value;
}

function validText(value, field, maximum, required = false) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if ((required && !normalized) || normalized.length > maximum) {
    throw new SignalCreditError(`invalid_${field}`, `Invalid ${field}`);
  }
  return normalized;
}

async function ensureSignalCreditAccount(env, userId) {
  const now = new Date().toISOString();
  await env.NINA_MEMORY_DB.prepare(`
    INSERT OR IGNORE INTO signal_credit_accounts
      (user_id, balance, lifetime_credited, lifetime_debited, created_at, updated_at)
    VALUES (?, 0, 0, 0, ?, ?)
  `).bind(validUserId(userId), now, now).run();
}

function normalizeAccount(row) {
  if (!row) throw new SignalCreditError("account_unavailable", "Signal Credit account unavailable");
  return {
    balance: Number(row.balance),
    lifetimeCredited: Number(row.lifetime_credited),
    lifetimeDebited: Number(row.lifetime_debited),
    updatedAt: row.updated_at
  };
}

export async function getSignalCreditBalance(env, userId) {
  await ensureSignalCreditAccount(env, userId);
  const row = await env.NINA_MEMORY_DB.prepare(`
    SELECT balance, lifetime_credited, lifetime_debited, updated_at
    FROM signal_credit_accounts WHERE user_id = ?
  `).bind(userId).first();
  return normalizeAccount(row);
}

async function existingMutation(env, userId, referenceId) {
  return env.NINA_MEMORY_DB.prepare(`
    SELECT id, amount, type, source, reference_id, description, created_at
    FROM signal_credit_transactions WHERE user_id = ? AND reference_id = ? LIMIT 1
  `).bind(userId, referenceId).first();
}

async function mutateSignalCredits(env, userId, signedAmount, type, options) {
  const source = validText(options?.source, "source", 50, true);
  const referenceId = validText(options?.referenceId, "reference", 160, true);
  const description = validText(options?.description, "description", 240);
  await ensureSignalCreditAccount(env, userId);
  const prior = await existingMutation(env, userId, referenceId);
  if (prior) {
    if (Number(prior.amount) !== signedAmount || prior.type !== type || prior.source !== source) {
      throw new SignalCreditError("reference_conflict", "Signal Credit reference was already used for another transaction");
    }
    return { account: await getSignalCreditBalance(env, userId), transaction: prior, idempotent: true };
  }
  const transaction = {
    id: crypto.randomUUID(), userId, amount: signedAmount, type, source,
    referenceId, description, createdAt: new Date().toISOString()
  };
  try {
    await env.NINA_MEMORY_DB.prepare(`
      INSERT INTO signal_credit_transactions
        (id, user_id, amount, type, source, reference_id, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      transaction.id, userId, signedAmount, type, source, referenceId, description, transaction.createdAt
    ).run();
  } catch (error) {
    const concurrent = await existingMutation(env, userId, referenceId);
    if (concurrent && Number(concurrent.amount) === signedAmount && concurrent.type === type && concurrent.source === source) {
      return { account: await getSignalCreditBalance(env, userId), transaction: concurrent, idempotent: true };
    }
    if (String(error?.message || error).includes("insufficient_signal_credits")) {
      throw new SignalCreditError("insufficient_credits", "Insufficient Signal Credits");
    }
    throw error;
  }
  return { account: await getSignalCreditBalance(env, userId), transaction, idempotent: false };
}

export function creditSignalCredits(env, userId, amount, options) {
  return mutateSignalCredits(env, validUserId(userId), validAmount(amount), "credit", options);
}

export async function ensureVerifiedSignupTrial(env, user, clerkUserId) {
  if (user?.role !== "user") return { eligible: false, verificationRequired: false, granted: false };
  const verification = user.clerk_email_verification || await getClerkEmailVerification(env, clerkUserId);
  await synchronizeAuthenticatedUserEmail(env, { ...user, auth_subject: clerkUserId }, verification.email);
  if (!verification.verified) return { eligible: false, verificationRequired: true, granted: false };
  const userId = validUserId(user.id || user.user_id);
  const result = await creditSignalCredits(env, userId, 30, {
    source: "signup_trial",
    referenceId: `signup-trial:${userId}`,
    description: "Verified account Live Nina trial"
  });
  return {
    eligible: true,
    verificationRequired: false,
    granted: !result.idempotent,
    account: result.account,
    transaction: result.transaction
  };
}

export function debitSignalCredits(env, userId, amount, options) {
  return mutateSignalCredits(env, validUserId(userId), -validAmount(amount), "debit", options);
}

export async function getSignalCreditHistory(env, userId, { limit = DEFAULT_HISTORY_LIMIT, offset = 0 } = {}) {
  await ensureSignalCreditAccount(env, userId);
  const safeLimit = Math.min(MAX_HISTORY_LIMIT, Math.max(1, Number.parseInt(limit, 10) || DEFAULT_HISTORY_LIMIT));
  const safeOffset = Math.min(10000, Math.max(0, Number.parseInt(offset, 10) || 0));
  const result = await env.NINA_MEMORY_DB.prepare(`
    SELECT id, amount, type, source, reference_id, description, created_at
    FROM signal_credit_transactions
    WHERE user_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT ? OFFSET ?
  `).bind(validUserId(userId), safeLimit + 1, safeOffset).all();
  const rows = Array.isArray(result?.results) ? result.results : [];
  const hasMore = rows.length > safeLimit;
  return {
    transactions: rows.slice(0, safeLimit).map(row => ({
      id: row.id, amount: Number(row.amount), type: row.type, source: row.source,
      referenceId: row.reference_id, description: row.description, createdAt: row.created_at
    })),
    nextOffset: hasMore ? safeOffset + safeLimit : null
  };
}
