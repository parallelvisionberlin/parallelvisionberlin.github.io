export const NINA_ANALYTICS_ACTIVE_SECONDS = 90;
const ENTRY_ID_PATTERN = /^[0-9a-f-]{36}$/i;
const SESSION_END_REASONS = new Set(["ended", "disconnected", "failed"]);
const iso = value => new Date(value).toISOString();
const secondsBetween = (start, end) => Math.max(0, Math.floor((Date.parse(end) - Date.parse(start)) / 1000));
export const NINA_ANALYTICS_TIME_ZONE = "Europe/Berlin";

function zonedParts(value, timeZone = NINA_ANALYTICS_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date(value));
  return Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, Number(part.value)]));
}

function zoneOffsetMs(value, timeZone = NINA_ANALYTICS_TIME_ZONE) {
  const date = new Date(value);
  const p = zonedParts(date, timeZone);
  const reconstructed = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return reconstructed - Math.floor(date.getTime() / 1000) * 1000;
}

export function berlinTodayStart(now = Date.now()) {
  const p = zonedParts(now);
  const wallMidnight = Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0);
  let utc = wallMidnight - zoneOffsetMs(wallMidnight);
  utc = wallMidnight - zoneOffsetMs(utc);
  return new Date(utc).toISOString();
}

function validEntryId(value) {
  return typeof value === "string" && ENTRY_ID_PATTERN.test(value) ? value : "";
}

function analyticsIdentity(visitorId, user) {
  return {
    visitorId,
    userId: user?.id || null,
    userKey: user?.id ? `user:${user.id}` : `visitor:${visitorId}`,
    authenticated: Boolean(user?.id),
    actorType: user?.role === "owner" ? "owner" : "public"
  };
}

export function sessionStage(status, seconds, userMessages = null, personaMessages = null, messageTrackingAvailable = false) {
  // Stored text is evidence of a transcript, not proof that sound was heard.
  const prefix = String(status || "ended").toUpperCase();
  if (!messageTrackingAvailable) return { key: "unlinked", label: `${prefix} · TRANSCRIPT NOT LINKED` };
  if (userMessages > 0 && personaMessages > 0) return { key: "conversation", label: `${prefix} · CONVERSATION RECORDED` };
  if (userMessages > 0) return { key: "reply_not_recorded", label: `${prefix} · NO NINA REPLY RECORDED` };
  if (personaMessages > 0) return { key: "user_not_recorded", label: `${prefix} · NO USER MESSAGES RECORDED` };
  return { key: "empty_transcript", label: `${prefix} · NO MESSAGES RECORDED` };
}

async function sessionByEntry(env, clientEntryId) {
  return env.NINA_MEMORY_DB.prepare(`
    SELECT id, client_entry_id, visitor_id, user_id, user_key, is_authenticated, actor_type,
           is_returning, status, started_at, last_seen_at, ended_at, connected_seconds, session_date
    FROM nina_analytics_sessions WHERE client_entry_id = ? LIMIT 1
  `).bind(clientEntryId).first();
}

async function ownedSession(env, sessionId, clientEntryId, identity) {
  return env.NINA_MEMORY_DB.prepare(`
    SELECT id, client_entry_id, user_key, status, started_at, last_seen_at, connected_seconds
    FROM nina_analytics_sessions
    WHERE id = ? AND client_entry_id = ? AND user_key = ? LIMIT 1
  `).bind(sessionId, clientEntryId, identity.userKey).first();
}

export async function startNinaAnalyticsSession(env, { visitorId, user = null, clientEntryId }, now = Date.now()) {
  const entryId = validEntryId(clientEntryId);
  if (!entryId) throw new Error("invalid_analytics_entry");
  const identity = analyticsIdentity(visitorId, user);
  const existing = await sessionByEntry(env, entryId);
  if (existing) return { sessionId: existing.id, status: existing.status, duplicate: true };
  const returning = await env.NINA_MEMORY_DB.prepare(
    "SELECT 1 AS found FROM nina_analytics_sessions WHERE user_key = ? LIMIT 1"
  ).bind(identity.userKey).first();
  const sessionId = crypto.randomUUID();
  const startedAt = iso(now);
  try {
    await env.NINA_MEMORY_DB.prepare(`
      INSERT INTO nina_analytics_sessions
        (id, client_entry_id, visitor_id, user_id, user_key, is_authenticated, actor_type,
         is_returning, status, started_at, last_seen_at, ended_at, connected_seconds, session_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, NULL, 0, ?)
    `).bind(
      sessionId, entryId, identity.visitorId, identity.userId, identity.userKey,
      identity.authenticated ? 1 : 0, identity.actorType, returning ? 1 : 0,
      startedAt, startedAt, startedAt.slice(0, 10)
    ).run();
  } catch {
    const concurrent = await sessionByEntry(env, entryId);
    if (concurrent) return { sessionId: concurrent.id, status: concurrent.status, duplicate: true };
    throw new Error("analytics_session_unavailable");
  }
  return { sessionId, status: "active", duplicate: false };
}

export async function touchNinaAnalyticsSession(env, { visitorId, user = null, sessionId, clientEntryId }, now = Date.now()) {
  const identity = analyticsIdentity(visitorId, user);
  const session = await ownedSession(env, sessionId, validEntryId(clientEntryId), identity);
  if (!session || session.status !== "active") return { updated: false };
  const seenAt = iso(now);
  const connectedSeconds = Math.max(Number(session.connected_seconds) || 0, secondsBetween(session.started_at, seenAt));
  await env.NINA_MEMORY_DB.prepare(`
    UPDATE nina_analytics_sessions SET last_seen_at = ?, connected_seconds = ?
    WHERE id = ? AND client_entry_id = ? AND user_key = ? AND status = 'active'
  `).bind(seenAt, connectedSeconds, session.id, clientEntryId, identity.userKey).run();
  return { updated: true, connectedSeconds };
}

export async function endNinaAnalyticsSession(env, { visitorId, user = null, sessionId, clientEntryId, reason }, now = Date.now()) {
  const identity = analyticsIdentity(visitorId, user);
  const session = await ownedSession(env, sessionId, validEntryId(clientEntryId), identity);
  if (!session || session.status !== "active") return { updated: false, idempotent: true };
  const endedAt = iso(now);
  const connectedSeconds = Math.max(Number(session.connected_seconds) || 0, secondsBetween(session.started_at, endedAt));
  const status = SESSION_END_REASONS.has(reason) ? reason : "ended";
  await env.NINA_MEMORY_DB.prepare(`
    UPDATE nina_analytics_sessions
    SET status = ?, last_seen_at = ?, ended_at = ?, connected_seconds = ?
    WHERE id = ? AND client_entry_id = ? AND user_key = ? AND status = 'active'
  `).bind(status, endedAt, endedAt, connectedSeconds, session.id, clientEntryId, identity.userKey).run();
  return { updated: true, connectedSeconds, status };
}

function rangeStart(now, days) {
  if (days === 1) return berlinTodayStart(now);
  return iso(now - days * 86400000);
}

async function rangeMetrics(env, start, end) {
  const row = await env.NINA_MEMORY_DB.prepare(`
    SELECT COUNT(DISTINCT user_key) AS unique_users, COUNT(*) AS sessions,
           COALESCE(SUM(connected_seconds), 0) AS total_seconds,
           COALESCE(AVG(connected_seconds), 0) AS average_seconds,
           COALESCE(MAX(connected_seconds), 0) AS longest_seconds,
           COUNT(DISTINCT CASE WHEN is_returning = 0 THEN user_key END) AS new_users,
           COUNT(DISTINCT CASE WHEN is_returning = 1 THEN user_key END) AS returning_users,
           SUM(CASE WHEN connected_seconds < 30 AND status != 'active' AND status != 'failed' THEN 1 ELSE 0 END) AS dropped_before_30s,
           SUM(CASE WHEN connected_seconds >= 30 THEN 1 ELSE 0 END) AS reached_30s,
           SUM(CASE WHEN connected_seconds >= 60 THEN 1 ELSE 0 END) AS engaged_1m,
           SUM(CASE WHEN connected_seconds >= 180 THEN 1 ELSE 0 END) AS deep_3m,
           SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_sessions
    FROM nina_analytics_sessions WHERE started_at >= ? AND started_at <= ?
  `).bind(start, end).first();
  return Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [key, Math.max(0, Number(value) || 0)]));
}

// Historical analytics rows contain a browser visitor ID, while authenticated
// transcripts use users.memory_visitor_id. Do not equate those identifiers.
// A call has no stored conversation foreign key. Match only a UNIQUE conversation
// created before connection, within the startup window, and never assign the same
// conversation to a later retry. Ambiguity remains visible instead of guessing.
export async function readAnalyticsCalls(env, sessionId = null) {
  const query = `
    WITH selected AS (
      SELECT s.*, u.display_name AS user_display_name, u.email AS user_email,
             COALESCE(NULLIF(u.memory_visitor_id, ''), s.visitor_id) AS message_visitor_id
      FROM nina_analytics_sessions s
      LEFT JOIN users u ON u.id = s.user_id
      ${sessionId ? "WHERE s.id = ?" : ""}
      ORDER BY s.started_at DESC, s.id DESC LIMIT 100
    ), candidates AS (
      SELECT s.id AS session_id, c.conversation_id
      FROM selected s JOIN conversations c ON c.visitor_id = s.message_visitor_id
      WHERE julianday(c.started_at) BETWEEN julianday(s.started_at) - (120.0 / 86400) AND julianday(s.started_at)
        AND NOT EXISTS (
          SELECT 1 FROM nina_analytics_sessions peer
          WHERE peer.user_key = s.user_key AND peer.id != s.id
            AND julianday(peer.started_at) BETWEEN julianday(c.started_at) AND julianday(s.started_at)
        )
    ), links AS (
      SELECT session_id, COUNT(*) AS candidate_count,
             CASE WHEN COUNT(*) = 1 THEN MIN(conversation_id) ELSE NULL END AS conversation_id
      FROM candidates GROUP BY session_id
    )
    SELECT s.*, COALESCE(l.candidate_count, 0) AS link_candidates,
           c.conversation_id, c.started_at AS conversation_started_at, c.ended_at AS conversation_ended_at,
           CASE WHEN c.conversation_id IS NOT NULL THEN (
             SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.conversation_id
               AND m.visitor_id = s.message_visitor_id AND m.role = 'user'
           ) ELSE NULL END AS user_messages,
           CASE WHEN c.conversation_id IS NOT NULL THEN (
             SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.conversation_id
               AND m.visitor_id = s.message_visitor_id AND m.role = 'persona'
           ) ELSE NULL END AS persona_messages
    FROM selected s LEFT JOIN links l ON l.session_id = s.id
    LEFT JOIN conversations c ON c.conversation_id = l.conversation_id
    ORDER BY s.started_at DESC, s.id DESC
  `;
  const statement = env.NINA_MEMORY_DB.prepare(query);
  return ((await (sessionId ? statement.bind(sessionId) : statement).all()).results || []);
}

export function presentAnalyticsCall(row) {
  const linked = Boolean(row.conversation_id);
  const userMessages = linked ? Math.max(0, Number(row.user_messages) || 0) : null;
  const personaMessages = linked ? Math.max(0, Number(row.persona_messages) || 0) : null;
  const connectedSeconds = Math.max(0, Number(row.connected_seconds) || 0);
  const stage = sessionStage(row.status, connectedSeconds, userMessages, personaMessages, linked);
  return {
    id: row.id, userId: row.user_id || null,
    userIdentifier: String(row.user_key || "").replace(/^user:/, "U-").replace(/^visitor:/, "V-").slice(0, 14),
    authenticated: Number(row.is_authenticated) === 1, actorType: row.actor_type,
    displayName: Number(row.is_authenticated) === 1 ? row.user_display_name || "" : "",
    email: Number(row.is_authenticated) === 1 ? row.user_email || "" : "",
    returning: Number(row.is_returning) === 1,
    status: stage.label, rawStatus: row.status, stage: stage.key,
    transcriptMatch: linked ? "account_and_start_time" : Number(row.link_candidates) > 1 ? "ambiguous" : "unlinked",
    messageTrackingAvailable: linked, userMessages, personaMessages,
    startedAt: row.started_at, lastSeenAt: row.last_seen_at, endedAt: row.ended_at, connectedSeconds
  };
}

// Return only a safe diagnostic category, never SQL, tokens or conversation text.
function detailReadErrorCode(error) {
  const text = [error?.message, error?.cause?.message].filter(Boolean).join(" ");
  if (/no such (?:table|column)|D1_COLUMN_NOTFOUND/i.test(text)) return "schema_unavailable";
  if (/busy|overload|timeout|timed out/i.test(text)) return "temporarily_unavailable";
  return "read_failed";
}

export async function getNinaAnalyticsSessionDetail(env, sessionId, now = Date.now()) {
  if (!validEntryId(sessionId)) return null;
  const [session] = await readAnalyticsCalls(env, sessionId);
  if (!session) return null;
  const messageVisitorId = session.message_visitor_id;
  const startedMs = Date.parse(session.started_at);
  const endedMs = Date.parse(session.ended_at || session.last_seen_at || session.started_at);
  const lower = iso(startedMs - 120000);
  const purchaseUpper = iso(Math.min(now, Math.max(startedMs, endedMs) + 3600000));
  const conversationId = session.conversation_id;
  const messages = conversationId ? await env.NINA_MEMORY_DB.prepare(`
    SELECT role, content, created_at FROM messages
    WHERE conversation_id = ? AND visitor_id = ? AND role IN ('user', 'persona')
    ORDER BY created_at ASC, rowid ASC LIMIT 2001
  `).bind(conversationId, messageVisitorId).all() : { results: [] };

  // The transcript is essential. Account metadata is independent: a failed ledger,
  // checkout or qualification read must not turn a saved conversation into a fetch error.
  const detailAvailability = { live: null, credits: null, creditEvents: null, purchases: null, history: null, qualification: null };
  const warnings = [];
  async function optionalRead(section, read, fallback) {
    try {
      const result = await read();
      detailAvailability[section] = true;
      return result;
    } catch (error) {
      const code = detailReadErrorCode(error);
      detailAvailability[section] = false;
      warnings.push({ section, code });
      console.warn("nina_admin_detail_section_unavailable", section, code);
      return fallback;
    }
  }
  let live = null, account = null, transactions = { results: [] }, purchases = { results: [] };
  let qualified = null, userHistory = { results: [] }, liveMatch = "unlinked";
  if (session.user_id) {
    const [liveCandidates, creditAccount, nearPurchases, history] = await Promise.all([
      optionalRead("live", () => env.NINA_MEMORY_DB.prepare(`
        SELECT l.id, l.status, l.started_at, l.ended_at, l.credits_available_on_start, l.credits_debited, l.created_at
        FROM live_nina_sessions l
        WHERE l.user_id = ? AND l.created_at >= ? AND l.created_at <= ?
          AND NOT EXISTS (
            SELECT 1 FROM nina_analytics_sessions peer WHERE peer.user_key = ? AND peer.id != ?
              AND julianday(peer.started_at) BETWEEN julianday(l.created_at) AND julianday(?)
          )
        ORDER BY l.created_at ASC LIMIT 3
      `).bind(session.user_id, lower, session.started_at, session.user_key, session.id, session.started_at).all(), { results: [] }),
      optionalRead("credits", () => env.NINA_MEMORY_DB.prepare(`
        SELECT balance, lifetime_credited, lifetime_debited, updated_at
        FROM signal_credit_accounts WHERE user_id = ? LIMIT 1
      `).bind(session.user_id).first(), null),
      // This is account activity near the call, NOT a proven call-to-purchase link.
      optionalRead("purchases", () => env.NINA_MEMORY_DB.prepare(`
        SELECT pack_id, credits, amount_total, currency, status, created_at, paid_at
        FROM signal_credit_purchases WHERE user_id = ? AND created_at >= ? AND created_at <= ?
        ORDER BY created_at ASC LIMIT 51
      `).bind(session.user_id, session.started_at, purchaseUpper).all(), { results: [] }),
      optionalRead("history", () => env.NINA_MEMORY_DB.prepare(`
        SELECT id, status, started_at, connected_seconds, is_returning
        FROM nina_analytics_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 30
      `).bind(session.user_id).all(), { results: [] })
    ]);
    account = creditAccount; purchases = nearPurchases; userHistory = history;
    const liveRows = liveCandidates.results || [];
    if (liveRows.length === 1) { live = liveRows[0]; liveMatch = "account_and_start_time"; }
    else if (liveRows.length > 1) liveMatch = "ambiguous";
    else if (detailAvailability.live === false) liveMatch = "unavailable";
    if (live) {
      transactions = await optionalRead("creditEvents", () => env.NINA_MEMORY_DB.prepare(`
        SELECT amount, type, source, description, created_at FROM signal_credit_transactions
        WHERE user_id = ? AND reference_id LIKE ? ORDER BY created_at ASC LIMIT 500
      `).bind(session.user_id, `anam-session:${live.id}:through:%`).all(), { results: [] });
    }
    if (conversationId) {
      qualified = await optionalRead("qualification", () => env.NINA_MEMORY_DB.prepare(`
        SELECT qualified_at, meta_sent_at FROM nina_qualified_conversations
        WHERE user_id = ? AND conversation_id = ? LIMIT 1
      `).bind(session.user_id, conversationId).first(), null);
    }
  }
  const qualificationAvailable = detailAvailability.qualification === true;
  const transcript = (messages.results || []).slice(0, 2000).map(row => ({
    role: row.role === "user" ? "user" : "nina", content: row.content, createdAt: row.created_at
  }));
  return {
    timeZone: NINA_ANALYTICS_TIME_ZONE, generatedAt: iso(now),
    revision: "admin-call-recovery-20260909", detailAvailability,
    warnings: warnings.sort((a, b) => a.section.localeCompare(b.section)),
    session: presentAnalyticsCall(session),
    match: {
      conversation: presentAnalyticsCall(session).transcriptMatch, live: liveMatch,
      note: "Historical call links use account identity and start time, not a stored call-to-conversation ID. Ambiguous matches are left unlinked. Stored text does not prove the audio was heard."
    },
    conversation: conversationId ? { id: conversationId, startedAt: session.conversation_started_at, endedAt: session.conversation_ended_at } : null,
    transcript, transcriptTruncated: (messages.results || []).length > 2000,
    userMessages: conversationId ? Number(session.user_messages) || 0 : null,
    ninaMessages: conversationId ? Number(session.persona_messages) || 0 : null,
    live: live ? {
      id: live.id, status: live.status, startedAt: live.started_at, endedAt: live.ended_at,
      creditsAtStart: Number(live.credits_available_on_start) || 0, creditsDebited: Number(live.credits_debited) || 0
    } : null,
    creditAccount: account ? {
      balance: Number(account.balance) || 0, lifetimeCredited: Number(account.lifetime_credited) || 0,
      lifetimeDebited: Number(account.lifetime_debited) || 0, updatedAt: account.updated_at
    } : null,
    creditEvents: (transactions.results || []).map(row => ({ ...row, amount: Number(row.amount) || 0 })),
    purchaseWindow: { start: session.started_at, end: purchaseUpper, attribution: "account_activity_only" },
    purchasesTruncated: (purchases.results || []).length > 50,
    purchases: (purchases.results || []).slice(0, 50).map(row => ({
      packId: row.pack_id, credits: Number(row.credits) || 0, amountTotal: Number(row.amount_total) || 0,
      currency: row.currency, status: row.status, createdAt: row.created_at, paidAt: row.paid_at
    })),
    qualificationAvailable, qualified: qualificationAvailable ? Boolean(qualified) : null,
    qualifiedAt: qualified?.qualified_at || null, metaSentAt: qualified?.meta_sent_at || null,
    userHistory: (userHistory.results || []).map(row => ({
      id: row.id, status: row.status, startedAt: row.started_at,
      connectedSeconds: Math.max(0, Number(row.connected_seconds) || 0), returning: Number(row.is_returning) === 1
    }))
  };
}

export async function getNinaAnalyticsDashboard(env, now = Date.now()) {
  const current = iso(now);
  const activeCutoff = iso(now - NINA_ANALYTICS_ACTIVE_SECONDS * 1000);
  await env.NINA_MEMORY_DB.prepare(`
    UPDATE nina_analytics_sessions
    SET status = 'abandoned', ended_at = last_seen_at
    WHERE status = 'active' AND last_seen_at < ?
  `).bind(activeCutoff).run();
  const starts = { today: rangeStart(now, 1), last24: iso(now - 86400000), days7: rangeStart(now, 7), days30: rangeStart(now, 30) };
  const [today, last24, days7, days30, active, recent, signups, billingStarts, preActivationFailures, exhaustedSignals, checkouts, checkoutFailures, purchases] = await Promise.all([
    rangeMetrics(env, starts.today, current), rangeMetrics(env, starts.last24, current), rangeMetrics(env, starts.days7, current), rangeMetrics(env, starts.days30, current),
    env.NINA_MEMORY_DB.prepare("SELECT COUNT(*) AS count FROM nina_analytics_sessions WHERE status = 'active' AND last_seen_at >= ?").bind(activeCutoff).first(),
    readAnalyticsCalls(env),
    env.NINA_MEMORY_DB.prepare("SELECT COUNT(*) AS count FROM users WHERE created_at >= ?").bind(starts.days30).first(),
    env.NINA_MEMORY_DB.prepare("SELECT COUNT(*) AS count FROM live_nina_sessions WHERE started_at >= ?").bind(starts.days30).first(),
    env.NINA_MEMORY_DB.prepare("SELECT COUNT(*) AS count FROM live_nina_sessions WHERE status = 'failed' AND started_at IS NULL AND created_at >= ?").bind(starts.days30).first(),
    env.NINA_MEMORY_DB.prepare("SELECT COUNT(*) AS count FROM live_nina_sessions WHERE status = 'exhausted' AND ended_at >= ?").bind(starts.days30).first(),
    env.NINA_MEMORY_DB.prepare("SELECT COUNT(*) AS count FROM signal_credit_purchases WHERE stripe_checkout_session_id IS NOT NULL AND created_at >= ?").bind(starts.days30).first(),
    env.NINA_MEMORY_DB.prepare("SELECT COUNT(*) AS count FROM signal_credit_purchases WHERE status IN ('creation_failed','failed') AND created_at >= ?").bind(starts.days30).first(),
    env.NINA_MEMORY_DB.prepare("SELECT COUNT(*) AS count FROM signal_credit_purchases WHERE status = 'paid' AND paid_at >= ?").bind(starts.days30).first()
  ]);
  today.currently_active = Math.max(0, Number(active?.count) || 0);
  last24.currently_active = today.currently_active;
  const configuredPrice = Number(env.ANAM_ESTIMATED_PRICE_PER_MINUTE_EUR);
  const pricePerMinute = Number.isFinite(configuredPrice) && configuredPrice > 0 ? configuredPrice : null;
  const totalMinutes = days30.total_seconds / 60;
  return {
    generatedAt: current,
    timeZone: NINA_ANALYTICS_TIME_ZONE,
    todayStart: starts.today,
    activeWindowSeconds: NINA_ANALYTICS_ACTIVE_SECONDS,
    revision: "conversion-hardening-20260911",
    rangeBoundaries: Object.fromEntries(Object.entries(starts).map(([key, start]) => [key, { start, end: current, kind: key === "today" ? "berlin_calendar_day" : "rolling" }])),
    ranges: { today, last24, days7, days30 },
    engagement: {
      window: "Last 30 days",
      connected: days30.sessions,
      droppedBefore30s: days30.dropped_before_30s,
      reached30s: days30.reached_30s,
      engaged1m: days30.engaged_1m,
      deep3m: days30.deep_3m,
      failed: days30.failed_sessions
    },
    funnel: {
      window: "Last 30 days",
      pageViews: { available: false, value: null },
      talkToNinaSessions: { available: true, value: days30.sessions },
      accountSignups: { available: true, value: Math.max(0, Number(signups?.count) || 0) },
      billingStarts: { available: true, value: Math.max(0, Number(billingStarts?.count) || 0) },
      preActivationFailures: { available: true, value: Math.max(0, Number(preActivationFailures?.count) || 0) },
      exhaustedSignals: { available: true, value: Math.max(0, Number(exhaustedSignals?.count) || 0) },
      checkoutStarts: { available: true, value: Math.max(0, Number(checkouts?.count) || 0) },
      checkoutFailures: { available: true, value: Math.max(0, Number(checkoutFailures?.count) || 0) },
      purchases: { available: true, value: Math.max(0, Number(purchases?.count) || 0) }
    },
    cost: {
      window: "Last 30 days", totalMinutes, pricePerMinute,
      estimatedAnamCost: pricePerMinute === null ? null : totalMinutes * pricePerMinute,
      label: "Estimated Anam cost"
    },
    // Dashboard has counts only. Message contents are fetched on explicit owner click.
    sessions: recent.map(presentAnalyticsCall)
  };
}
