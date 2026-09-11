import { SignalCreditError, getSignalCreditBalance } from "./credits.js";

export const CREDITS_PER_MINUTE = 10;
export const SECONDS_PER_CREDIT = 6;
export const LIVE_NINA_SETTLEMENT_SECONDS = 30;
export const SIGNUP_TRIAL_GRACE_SECONDS = 60;

const validSessionId = value => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : "";
const iso = value => new Date(value).toISOString();
const identityUserId = user => user.id || user.user_id;

async function signupTrialCreditsRemaining(env, userId, account) {
  const trial = await env.NINA_MEMORY_DB.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS credited
    FROM signal_credit_transactions
    WHERE user_id = ? AND type = 'credit' AND source = 'signup_trial'
  `).bind(userId).first();
  const credited = Math.max(0, Number(trial?.credited) || 0);
  return Math.max(0, credited - Math.max(0, Number(account?.lifetimeDebited) || 0));
}

async function signupTrialHasStarted(env, userId) {
  const session = await env.NINA_MEMORY_DB.prepare(`
    SELECT id FROM live_nina_sessions WHERE user_id = ? AND started_at IS NOT NULL LIMIT 1
  `).bind(userId).first();
  return Boolean(session);
}

async function signupTrialGraceRemainingSeconds(env, userId, excludeSessionId = "", now = Date.now()) {
  const result = await env.NINA_MEMORY_DB.prepare(`
    SELECT id, last_billed_at, ended_at
    FROM live_nina_sessions
    WHERE user_id = ? AND status IN ('pending', 'failed') AND started_at IS NULL
      AND last_billed_at IS NOT NULL
  `).bind(userId).all();
  const rows = Array.isArray(result?.results) ? result.results : [];
  let consumed = 0;
  for (const row of rows) {
    if (excludeSessionId && row.id === excludeSessionId) continue;
    const started = Date.parse(row.last_billed_at);
    const ended = row.ended_at ? Date.parse(row.ended_at) : now;
    if (!Number.isFinite(started) || !Number.isFinite(ended) || ended <= started) continue;
    consumed += Math.min(SIGNUP_TRIAL_GRACE_SECONDS, Math.ceil((ended - started) / 1000));
    if (consumed >= SIGNUP_TRIAL_GRACE_SECONDS) return 0;
  }
  return Math.max(0, SIGNUP_TRIAL_GRACE_SECONDS - consumed);
}

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
  const trialActivationPending = await signupTrialCreditsRemaining(env, userId, account) > 0
    && !await signupTrialHasStarted(env, userId);
  const trialSetupRecovery = trialActivationPending
    && await signupTrialGraceRemainingSeconds(env, userId, "", now) === 0;
  const sessionId = crypto.randomUUID();
  const createdAt = iso(now);
  await env.NINA_MEMORY_DB.prepare(`
    INSERT INTO live_nina_sessions
      (id, user_id, status, started_at, last_billed_at, billable_until, ended_at,
       credits_available_on_start, credits_debited, created_at, updated_at)
    VALUES (?, ?, 'pending', NULL, NULL, NULL, NULL, ?, 0, ?, ?)
  `).bind(sessionId, userId, account.balance, createdAt, createdAt).run();
  return { bypass: false, sessionId, balance: account.balance, remainingSeconds: creditsToSeconds(account.balance), settlementSeconds: LIVE_NINA_SETTLEMENT_SECONDS, trialActivationPending, trialSetupRecovery };
}

export async function failLiveNinaSession(env, userId, sessionId, now = Date.now()) {
  if (!validSessionId(sessionId)) return false;
  const changed = await env.NINA_MEMORY_DB.prepare(`
    UPDATE live_nina_sessions SET status = 'failed', ended_at = ?, updated_at = ?
    WHERE id = ? AND user_id = ? AND status = 'pending'
  `).bind(iso(now), iso(now), sessionId, userId).run();
  return Number(changed?.meta?.changes || 0) > 0;
}

export async function beginLiveNinaTrialGrace(env, user, sessionId, now = Date.now()) {
  if (user.role === "owner") return { bypass: true, status: "ready", trialActivationPending: false };
  const session = await sessionForUser(env, user.id, sessionId);
  if (!session) throw new SignalCreditError("invalid_session", "Live Nina session unavailable");
  if (session.status !== "pending") return { status: session.status, trialActivationPending: false };
  const account = await getSignalCreditBalance(env, user.id);
  const trialActivationPending = await signupTrialCreditsRemaining(env, user.id, account) > 0
    && !await signupTrialHasStarted(env, user.id);
  if (!trialActivationPending) return { status: "pending", trialActivationPending: false };
  const readyAt = iso(now);
  const remaining = await signupTrialGraceRemainingSeconds(env, user.id, sessionId, now);
  const elapsed = session.last_billed_at ? Math.max(0, Math.ceil((now - Date.parse(session.last_billed_at)) / 1000)) : 0;
  const graceSeconds = Math.max(0, remaining - elapsed);
  await env.NINA_MEMORY_DB.prepare(`
    UPDATE live_nina_sessions SET last_billed_at = COALESCE(last_billed_at, ?), updated_at = ?
    WHERE id = ? AND user_id = ? AND status = 'pending'
  `).bind(readyAt, readyAt, sessionId, user.id).run();
  return { status: "ready", trialActivationPending: true, graceSeconds, cumulativeGrace: true,
    // Once the free greeting allowance is spent, reconnect silently and allow
    // only a bounded microphone handshake. First speech still starts billing.
    recoverySeconds: graceSeconds === 0 ? Math.max(0, 10 - elapsed) : 0 };
}

export async function activateLiveNinaSession(env, user, sessionId, now = Date.now()) {
  if (user.role === "owner") return { bypass: true, status: "active", balance: null, remainingSeconds: null };
  const session = await sessionForUser(env, user.id, sessionId);
  if (!session) throw new SignalCreditError("invalid_session", "Live Nina session unavailable");
  if (session.status === "active") {
    const account = await getSignalCreditBalance(env, user.id);
    const remainingSeconds = Math.min(creditsToSeconds(account.balance), Math.max(0, Math.floor((Date.parse(session.billable_until) - now) / 1000)));
    return { status: "active", balance: account.balance, remainingSeconds, settlementSeconds: LIVE_NINA_SETTLEMENT_SECONDS };
  }
  if (session.status !== "pending") throw new SignalCreditError("session_closed", "Live Nina session is closed");
  const account = await getSignalCreditBalance(env, user.id);
  if (account.balance < 1) throw new SignalCreditError("insufficient_credits", "No Signal Credits");
  // Speech is the authoritative trial start. A spent setup-grace budget must never
  // prevent a legitimate first utterance from activating the remaining trial.
  const startedAt = iso(now);
  const billableUntil = iso(now + creditsToSeconds(account.balance) * 1000);
  const activated = await env.NINA_MEMORY_DB.prepare(`
    UPDATE live_nina_sessions
    SET status = 'active', started_at = ?, last_billed_at = ?, billable_until = ?,
        credits_available_on_start = ?, updated_at = ?
    WHERE id = ? AND user_id = ? AND status = 'pending'
  `).bind(startedAt, startedAt, billableUntil, account.balance, startedAt, sessionId, user.id).run();
  if (!Number(activated?.meta?.changes)) {
    const current = await sessionForUser(env, user.id, sessionId);
    if (current?.status === "active") return activateLiveNinaSession(env, user, sessionId, now);
    throw new SignalCreditError("session_closed", "Live Nina session is closed");
  }
  return { status: "active", balance: account.balance, remainingSeconds: creditsToSeconds(account.balance), settlementSeconds: LIVE_NINA_SETTLEMENT_SECONDS };
}

async function debitCompletedCreditUnits(env, userId, sessionId, throughInclusive, now) {
  // The SELECT, ledger insert and existing balance trigger form one SQLite
  // transaction. Read the ledger, not a possibly stale session snapshot.
  // The prefix also includes debits written by the previous Worker version.
  const id = crypto.randomUUID();
  const prefix = `anam-session:${sessionId}:`;
  await env.NINA_MEMORY_DB.prepare(`
    INSERT INTO signal_credit_transactions
      (id, user_id, amount, type, source, reference_id, description, created_at)
    SELECT ?, s.user_id,
           -MIN(a.balance, MAX(0, ? - COALESCE((
             SELECT -SUM(t.amount) FROM signal_credit_transactions t
             WHERE t.user_id = s.user_id AND t.source = 'anam_session'
               AND t.type = 'debit' AND t.reference_id GLOB ?
           ), 0))),
           'debit', 'anam_session', ?, 'Live Nina', ?
    FROM live_nina_sessions s
    JOIN signal_credit_accounts a ON a.user_id = s.user_id
    WHERE s.id = ? AND s.user_id = ? AND s.status = 'active'
      AND a.balance > 0
      AND ? > COALESCE((
        SELECT -SUM(t.amount) FROM signal_credit_transactions t
        WHERE t.user_id = s.user_id AND t.source = 'anam_session'
          AND t.type = 'debit' AND t.reference_id GLOB ?
      ), 0)
  `).bind(id, throughInclusive, `${prefix}*`, `${prefix}through:${throughInclusive}`,
    iso(now), sessionId, userId, throughInclusive, `${prefix}*`).run();
  const result = await env.NINA_MEMORY_DB.prepare(`
    SELECT COALESCE(-SUM(amount), 0) AS covered,
           COALESCE(-SUM(CASE WHEN id = ? THEN amount ELSE 0 END), 0) AS newly_debited
    FROM signal_credit_transactions
    WHERE user_id = ? AND source = 'anam_session' AND type = 'debit'
      AND reference_id GLOB ?
  `).bind(id, userId, `${prefix}*`).first();
  return { covered: Number(result.covered), newlyDebited: Number(result.newly_debited) };
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
  const alreadyDebited = Math.max(0, Number(session.credits_debited) || 0);
  const debit = completedCredits > alreadyDebited
    ? await debitCompletedCreditUnits(env, user.id, session.id, completedCredits, now)
    : { covered: alreadyDebited, newlyDebited: 0 };
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
  `).bind(debit.covered, settledAt, status, status, settledAt, settledAt, session.id, user.id).run();
  return { status, debited: debit.newlyDebited, balance: account.balance, remainingSeconds, settlementSeconds: LIVE_NINA_SETTLEMENT_SECONDS, idempotent: debit.newlyDebited === 0 };
}
