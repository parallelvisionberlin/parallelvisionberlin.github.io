export const NINA_ANALYTICS_ACTIVE_SECONDS = 90;
const ENTRY_ID_PATTERN = /^[0-9a-f-]{36}$/i;
const SESSION_END_REASONS = new Set(["ended", "disconnected", "failed"]);
const iso = value => new Date(value).toISOString();
const secondsBetween = (start, end) => Math.max(0, Math.floor((Date.parse(end) - Date.parse(start)) / 1000));

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
  if (days === 1) {
    const date = new Date(now);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
  }
  return iso(now - days * 86400000);
}

async function rangeMetrics(env, start) {
  const row = await env.NINA_MEMORY_DB.prepare(`
    SELECT COUNT(DISTINCT user_key) AS unique_users, COUNT(*) AS sessions,
           COALESCE(SUM(connected_seconds), 0) AS total_seconds,
           COALESCE(AVG(connected_seconds), 0) AS average_seconds,
           COALESCE(MAX(connected_seconds), 0) AS longest_seconds,
           COUNT(DISTINCT CASE WHEN is_returning = 0 THEN user_key END) AS new_users,
           COUNT(DISTINCT CASE WHEN is_returning = 1 THEN user_key END) AS returning_users
    FROM nina_analytics_sessions WHERE started_at >= ?
  `).bind(start).first();
  return Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [key, Math.max(0, Number(value) || 0)]));
}

export async function getNinaAnalyticsDashboard(env, now = Date.now()) {
  const current = iso(now);
  const activeCutoff = iso(now - NINA_ANALYTICS_ACTIVE_SECONDS * 1000);
  await env.NINA_MEMORY_DB.prepare(`
    UPDATE nina_analytics_sessions
    SET status = 'abandoned', ended_at = last_seen_at
    WHERE status = 'active' AND last_seen_at < ?
  `).bind(activeCutoff).run();
  const starts = { today: rangeStart(now, 1), days7: rangeStart(now, 7), days30: rangeStart(now, 30) };
  const [today, days7, days30, active, recent, signups, checkouts, purchases] = await Promise.all([
    rangeMetrics(env, starts.today), rangeMetrics(env, starts.days7), rangeMetrics(env, starts.days30),
    env.NINA_MEMORY_DB.prepare("SELECT COUNT(*) AS count FROM nina_analytics_sessions WHERE status = 'active' AND last_seen_at >= ?").bind(activeCutoff).first(),
    env.NINA_MEMORY_DB.prepare(`
      SELECT s.id, s.user_key, s.is_authenticated, s.actor_type, s.is_returning, s.status,
             s.started_at, s.last_seen_at, s.ended_at, s.connected_seconds,
             u.display_name AS user_display_name, u.email AS user_email
      FROM nina_analytics_sessions s
      LEFT JOIN users u ON u.id = s.user_id
      ORDER BY s.started_at DESC LIMIT 100
    `).all(),
    env.NINA_MEMORY_DB.prepare("SELECT COUNT(*) AS count FROM users WHERE created_at >= ?").bind(starts.days30).first(),
    env.NINA_MEMORY_DB.prepare("SELECT COUNT(*) AS count FROM signal_credit_purchases WHERE created_at >= ?").bind(starts.days30).first(),
    env.NINA_MEMORY_DB.prepare("SELECT COUNT(*) AS count FROM signal_credit_purchases WHERE status = 'paid' AND paid_at >= ?").bind(starts.days30).first()
  ]);
  today.currently_active = Math.max(0, Number(active?.count) || 0);
  const configuredPrice = Number(env.ANAM_ESTIMATED_PRICE_PER_MINUTE_EUR);
  const pricePerMinute = Number.isFinite(configuredPrice) && configuredPrice > 0 ? configuredPrice : null;
  const totalMinutes = days30.total_seconds / 60;
  return {
    generatedAt: current,
    activeWindowSeconds: NINA_ANALYTICS_ACTIVE_SECONDS,
    ranges: { today, days7, days30 },
    funnel: {
      window: "Last 30 days",
      pageViews: { available: false, value: null },
      talkToNinaSessions: { available: true, value: days30.sessions },
      accountSignups: { available: true, value: Math.max(0, Number(signups?.count) || 0) },
      checkoutStarts: { available: true, value: Math.max(0, Number(checkouts?.count) || 0) },
      purchases: { available: true, value: Math.max(0, Number(purchases?.count) || 0) }
    },
    cost: {
      window: "Last 30 days", totalMinutes, pricePerMinute,
      estimatedAnamCost: pricePerMinute === null ? null : totalMinutes * pricePerMinute,
      label: "Estimated Anam cost"
    },
    sessions: (recent?.results || []).map(row => ({
      id: row.id, userIdentifier: String(row.user_key || "").replace(/^user:/, "U-").replace(/^visitor:/, "V-").slice(0, 14),
      authenticated: Number(row.is_authenticated) === 1, actorType: row.actor_type,
      displayName: Number(row.is_authenticated) === 1 ? row.user_display_name || "" : "",
      email: Number(row.is_authenticated) === 1 ? row.user_email || "" : "",
      returning: Number(row.is_returning) === 1, status: row.status,
      startedAt: row.started_at, lastSeenAt: row.last_seen_at, endedAt: row.ended_at,
      connectedSeconds: Math.max(0, Number(row.connected_seconds) || 0)
    }))
  };
}
