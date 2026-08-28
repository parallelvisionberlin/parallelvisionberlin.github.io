import { SignalCreditError, debitSignalCredits, getSignalCreditBalance } from "./credits.js";

export const CREDITS_PER_MINUTE = 10;
export const SECONDS_PER_CREDIT = 6;
export const LIVE_NINA_SETTLEMENT_SECONDS = 30;

const validSessionId = value => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : "";
const iso = value => new Date(value).toISOString();
const identityUserId = user => user.id || user.user_id;

export function creditsToSeconds(credits) {
  return Math.max(0, Number.isSafeInteger(credits) ? credits : 0) * SECONDS_PER_CREDIT;
}

export function formatLiveTime(credits) {
  const seconds = creditsToSeconds(credits);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}:${String(remainder).padStart(2, "0")}` : `${minutes}:00`;
}

async function sessionForUser(env, userId, sessionId) {
  if (!validSessionId(sessionId)) return null;
  return env.NINA_MEMORY_DB.prepare(`
    SELECT id, user_id, status, started_at, last_billed_at, billable_until, ended_at,
           credits_available_on_start, credits_debited, created_at, updated_at
    FROM live_nina_sessions WHERE id = ? AND user_id = ? LIMIT 1
  `).bind(sessionId, userId).first();
}

export async function createLiveNinaSession(env, user, now = Date.now()) {
  if (user.role === "owner") return { bypass: true, sessionId: null, balance: null, remainingSeconds: null };
  const userId = identityUserId(user);
  const account = await getSignalCreditBalance(env, userId);
  if (account.balance < 1) throw new SignalCreditError("insufficient_credits", "No Signal Credits");
  const sessionId = crypto.randomUUID();
  const createdAt = iso(now);
  await env.NINA_MEMORY_DB.prepare(`
    INSERT INTO live_nina_sessions
      (id, user_id, status, started_at, last_billed_at, billable_until, ended_at,
       credits_available_on_start, credits_debited, created_at, updated_at)
    VALUES (?, ?, 'pending', NULL, NULL, NULL, NULL, ?, 0, ?, ?)
  `).bind(sessionId, userId, account.balance, createdAt, createdAt).run();
  return { bypass: false, sessionId, balance: account.balance, remainingSeconds: creditsToSeconds(account.balance), settlementSeconds: LIVE_NINA_SETTLEMENT_SECONDS };
}

export async function failLiveNinaSession(env, userId, sessionId, now = Date.now()) {
  if (!validSessionId(sessionId)) return false;
  const changed = await env.NINA_MEMORY_DB.prepare(`
    UPDATE live_nina_sessions SET status = 'failed', ended_at = ?, updated_at = ?
    WHERE id = ? AND user_id = ? AND status = 'pending'
  `).bind(iso(now), iso(now), sessionId, userId).run();
  return Number(changed?.meta?.changes || 0) > 0;
}

export async function activateLiveNinaSession(env, user, sessionId, now = Date.now()) {
  if (user.role === "owner") return { bypass: true, status: "active", balance: null, remainingSeconds: null };
  const session = await sessionForUser(env, user.id, sessionId);
  if (!session) throw new SignalCreditError("invalid_session", "Live Nina session unavailable");
  if (session.status === "active") {
    const account = await getSignalCreditBalance(env, user.id);
    return { status: "active", balance: account.balance, remainingSeconds: creditsToSeconds(account.balance), settlementSeconds: LIVE_NINA_SETTLEMENT_SECONDS };
  }
  if (session.status !== "pending") throw new SignalCreditError("session_closed", "Live Nina session is closed");
  const account = await getSignalCreditBalance(env, user.id);
  if (account.balance < 1) throw new SignalCreditError("insufficient_credits", "No Signal Credits");
  const startedAt = iso(now);
  const billableUntil = iso(now + creditsToSeconds(account.balance) * 1000);
  await env.NINA_MEMORY_DB.prepare(`
    UPDATE live_nina_sessions
    SET status = 'active', started_at = ?, last_billed_at = ?, billable_until = ?,
        credits_available_on_start = ?, updated_at = ?
    WHERE id = ? AND user_id = ? AND status = 'pending'
  `).bind(startedAt, startedAt, billableUntil, account.balance, startedAt, sessionId, user.id).run();
  return { status: "active", balance: account.balance, remainingSeconds: creditsToSeconds(account.balance), settlementSeconds: LIVE_NINA_SETTLEMENT_SECONDS };
}

export async function settleLiveNinaSession(env, user, sessionId, { end = false, now = Date.now() } = {}) {
  if (user.role === "owner") return { bypass: true, status: end ? "ended" : "active", debited: 0, balance: null, remainingSeconds: null };
  const session = await sessionForUser(env, user.id, sessionId);
  if (!session) throw new SignalCreditError("invalid_session", "Live Nina session unavailable");
  if (session.status === "pending") {
    if (end) await failLiveNinaSession(env, user.id, sessionId, now);
    const account = await getSignalCreditBalance(env, user.id);
    return { status: end ? "failed" : "pending", debited: 0, balance: account.balance, remainingSeconds: creditsToSeconds(account.balance) };
  }
  if (session.status !== "active") {
    const account = await getSignalCreditBalance(env, user.id);
    return { status: session.status, debited: 0, balance: account.balance, remainingSeconds: creditsToSeconds(account.balance), idempotent: true };
  }
  const started = Date.parse(session.started_at);
  const cappedNow = Math.min(now, Date.parse(session.billable_until));
  const completedCredits = Math.max(0, Math.floor((cappedNow - started) / (SECONDS_PER_CREDIT * 1000)));
  const alreadyDebited = Number(session.credits_debited);
  const due = Math.max(0, completedCredits - alreadyDebited);
  const accountBefore = await getSignalCreditBalance(env, user.id);
  const debitAmount = Math.min(due, accountBefore.balance);
  if (debitAmount > 0) {
    await debitSignalCredits(env, user.id, debitAmount, {
      source: "anam_session",
      referenceId: `anam-session:${session.id}:through:${completedCredits}`,
      description: `Live Nina · ${debitAmount * SECONDS_PER_CREDIT} sec`
    });
  }
  const account = await getSignalCreditBalance(env, user.id);
  const exhausted = account.balance === 0 || now >= Date.parse(session.billable_until);
  const status = exhausted ? "exhausted" : end ? "ended" : "active";
  const sessionSecondsRemaining = Math.max(0, Math.floor((Date.parse(session.billable_until) - now) / 1000));
  const remainingSeconds = status === "active"
    ? Math.min(creditsToSeconds(account.balance), sessionSecondsRemaining)
    : creditsToSeconds(account.balance);
  const settledAt = iso(now);
  await env.NINA_MEMORY_DB.prepare(`
    UPDATE live_nina_sessions
    SET credits_debited = MAX(credits_debited, ?), last_billed_at = ?,
        status = ?, ended_at = CASE WHEN ? = 'active' THEN ended_at ELSE COALESCE(ended_at, ?) END,
        updated_at = ?
    WHERE id = ? AND user_id = ? AND status = 'active'
  `).bind(alreadyDebited + debitAmount, settledAt, status, status, settledAt, settledAt, session.id, user.id).run();
  return { status, debited: debitAmount, balance: account.balance, remainingSeconds, settlementSeconds: LIVE_NINA_SETTLEMENT_SECONDS, idempotent: debitAmount === 0 };
}
