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

function sessionStage(status, seconds, userMessages = 0, personaMessages = 0, messageTrackingAvailable = false) {
  const connected = Math.max(0, Number(seconds) || 0);
  const userCount = Math.max(0, Number(userMessages) || 0);
  const personaCount = Math.max(0, Number(personaMessages) || 0);

  if (status === "failed") return { key: "failed", label: "FAILED DURING CONNECTION" };

  if (messageTrackingAvailable) {
    if (userCount === 0 && status !== "active") {
      return { key: "connected_no_speech", label: `${String(status || "ended").toUpperCase()} · CONNECTED · NO USER SPEECH` };
    }
    if (userCount > 0 && personaCount === 0 && status !== "active") {
      return { key: "spoke_no_reply", label: `${String(status || "ended").toUpperCase()} · USER SPOKE · NO NINA REPLY` };
    }
    if (userCount > 0 && personaCount > 0) {
      if (connected >= 180) return { key: "conversation_3m", label: `${status === "active" ? "ACTIVE" : String(status || "ended").toUpperCase()} · CONVERSATION · 3M+` };
      if (connected >= 60) return { key: "conversation_1m", label: `${status === "active" ? "ACTIVE" : String(status || "ended").toUpperCase()} · CONVERSATION · 1M+` };
      return { key: "conversation", label: `${status === "active" ? "ACTIVE" : String(status || "ended").toUpperCase()} · CONVERSATION STARTED` };
    }
  }

  if (status === "active") {
    if (connected >= 180) return { key: "deep_3m", label: "ACTIVE · DEEP SESSION 3M+" };
    if (connected >= 60) return { key: "engaged_1m", label: "ACTIVE · ENGAGED 1M+" };
    if (connected >= 30) return { key: "reached_30s", label: "ACTIVE · REACHED 30S" };
    return { key: "connected", label: "ACTIVE · CONNECTED" };
  }
  if (connected < 30) return { key: "drop_before_30s", label: `${String(status || "ended").toUpperCase()} · DROPPED <30S AFTER CONNECT` };
  if (connected < 60) return { key: "reached_30s", label: `${String(status || "ended").toUpperCase()} · REACHED 30S` };
  if (connected < 180) return { key: "engaged_1m", label: `${String(status || "ended").toUpperCase()} · ENGAGED 1M+` };
  return { key: "deep_3m", label: `${String(status || "ended").toUpperCase()} · DEEP SESSION 3M+` };
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

async function rangeMetrics(env, start) {
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
    FROM nina_analytics_sessions WHERE started_at >= ?
  `).bind(start).first();
  return Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [key, Math.max(0, Number(value) || 0)]));
}


export async function getNinaAnalyticsSessionDetail(env, sessionId) {
  if (!validEntryId(sessionId)) return null;
  const session = await env.NINA_MEMORY_DB.prepare(`
    SELECT s.*, u.display_name AS user_display_name, u.email AS user_email,
           u.memory_visitor_id AS memory_visitor_id
    FROM nina_analytics_sessions s
    LEFT JOIN users u ON u.id = s.user_id
    WHERE s.id = ? LIMIT 1
  `).bind(sessionId).first();
  if (!session) return null;

  const messageVisitorId = session.memory_visitor_id || session.visitor_id;
  const startedMs = Date.parse(session.started_at);
  const endedMs = Date.parse(session.ended_at || session.last_seen_at || session.started_at);
  const lower = iso(startedMs - 120000);
  const upper = iso(Math.max(startedMs, endedMs) + 120000);
  const purchaseUpper = iso(Math.max(startedMs, endedMs) + 3600000);

  const conversation = await env.NINA_MEMORY_DB.prepare(`
    SELECT conversation_id, started_at, ended_at
    FROM conversations
    WHERE visitor_id = ? AND started_at >= ? AND started_at <= ?
    ORDER BY ABS(strftime('%s', started_at) - strftime('%s', ?)) ASC
    LIMIT 1
  `).bind(messageVisitorId, lower, upper, session.started_at).first();

  const messages = conversation ? await env.NINA_MEMORY_DB.prepare(`
    SELECT role, content, created_at
    FROM messages
    WHERE conversation_id = ? AND visitor_id = ?
    ORDER BY created_at ASC, rowid ASC
  `).bind(conversation.conversation_id, messageVisitorId).all() : { results: [] };

  let live = null, account = null, transactions = { results: [] }, purchases = { results: [] }, qualified = null, userHistory = { results: [] };
  if (session.user_id) {
    [live, account, transactions, purchases, userHistory] = await Promise.all([
      env.NINA_MEMORY_DB.prepare(`
        SELECT id, status, started_at, ended_at, credits_available_on_start, credits_debited, created_at
        FROM live_nina_sessions
        WHERE user_id = ? AND created_at >= ? AND created_at <= ?
        ORDER BY ABS(strftime('%s', created_at) - strftime('%s', ?)) ASC LIMIT 1
      `).bind(session.user_id, lower, upper, session.started_at).first(),
      env.NINA_MEMORY_DB.prepare(`
        SELECT balance, lifetime_credited, lifetime_debited, updated_at
        FROM signal_credit_accounts WHERE user_id = ? LIMIT 1
      `).bind(session.user_id).first(),
      env.NINA_MEMORY_DB.prepare(`
        SELECT amount, type, source, description, created_at
        FROM signal_credit_transactions
        WHERE user_id = ? AND created_at >= ? AND created_at <= ?
        ORDER BY created_at ASC
      `).bind(session.user_id, lower, purchaseUpper).all(),
      env.NINA_MEMORY_DB.prepare(`
        SELECT pack_id, credits, amount_total, currency, status, created_at, paid_at
        FROM signal_credit_purchases
        WHERE user_id = ? AND created_at >= ? AND created_at <= ?
        ORDER BY created_at ASC
      `).bind(session.user_id, lower, purchaseUpper).all(),
      env.NINA_MEMORY_DB.prepare(`
        SELECT id, status, started_at, connected_seconds, is_returning
        FROM nina_analytics_sessions WHERE user_id = ?
        ORDER BY started_at DESC LIMIT 12
      `).bind(session.user_id).all()
    ]);
    if (conversation) {
      try {
        qualified = await env.NINA_MEMORY_DB.prepare(`
          SELECT qualified_at, meta_sent_at FROM nina_qualified_conversations
          WHERE user_id = ? AND conversation_id = ? LIMIT 1
        `).bind(session.user_id, conversation.conversation_id).first();
      } catch { qualified = null; }
    }
  }

  const transcript = (messages.results || []).map(row => ({
    role: row.role === 'user' ? 'user' : 'nina', content: row.content, createdAt: row.created_at
  }));
  const userMessages = transcript.filter(message => message.role === 'user').length;
  const ninaMessages = transcript.filter(message => message.role === 'nina').length;
  return {
    timeZone: NINA_ANALYTICS_TIME_ZONE,
    session: {
      id: session.id, authenticated: Number(session.is_authenticated) === 1,
      actorType: session.actor_type, returning: Number(session.is_returning) === 1,
      displayName: session.user_display_name || '', email: session.user_email || '',
      startedAt: session.started_at, endedAt: session.ended_at, lastSeenAt: session.last_seen_at,
      connectedSeconds: Math.max(0, Number(session.connected_seconds) || 0), rawStatus: session.status
    },
    conversation: conversation ? { id: conversation.conversation_id, startedAt: conversation.started_at, endedAt: conversation.ended_at } : null,
    transcript, userMessages, ninaMessages,
    live: live ? {
      id: live.id, status: live.status, startedAt: live.started_at, endedAt: live.ended_at,
      creditsAtStart: Number(live.credits_available_on_start) || 0,
      creditsDebited: Number(live.credits_debited) || 0
    } : null,
    creditAccount: account ? {
      balance: Number(account.balance) || 0, lifetimeCredited: Number(account.lifetime_credited) || 0,
      lifetimeDebited: Number(account.lifetime_debited) || 0, updatedAt: account.updated_at
    } : null,
    creditEvents: (transactions.results || []).map(row => ({ ...row, amount: Number(row.amount) || 0 })),
    purchases: (purchases.results || []).map(row => ({
      packId: row.pack_id, credits: Number(row.credits) || 0, amountTotal: Number(row.amount_total) || 0,
      currency: row.currency, status: row.status, createdAt: row.created_at, paidAt: row.paid_at
    })),
    qualified: Boolean(qualified), qualifiedAt: qualified?.qualified_at || null, metaSentAt: qualified?.meta_sent_at || null,
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
  const starts = { today: rangeStart(now, 1), days7: rangeStart(now, 7), days30: rangeStart(now, 30) };
  const [today, days7, days30, active, recent, signups, checkouts, purchases] = await Promise.all([
    rangeMetrics(env, starts.today), rangeMetrics(env, starts.days7), rangeMetrics(env, starts.days30),
    env.NINA_MEMORY_DB.prepare("SELECT COUNT(*) AS count FROM nina_analytics_sessions WHERE status = 'active' AND last_seen_at >= ?").bind(activeCutoff).first(),
    env.NINA_MEMORY_DB.prepare(`
      SELECT s.id, s.visitor_id, s.user_key, s.is_authenticated, s.actor_type, s.is_returning, s.status,
             s.started_at, s.last_seen_at, s.ended_at, s.connected_seconds,
             u.display_name AS user_display_name, u.email AS user_email,
             (SELECT COUNT(*) FROM messages m
                WHERE m.visitor_id = COALESCE(u.memory_visitor_id, s.visitor_id)
                  AND m.role = 'user'
                  AND m.created_at >= s.started_at
                  AND m.created_at <= COALESCE(s.ended_at, s.last_seen_at)) AS user_messages,
             (SELECT COUNT(*) FROM messages m
                WHERE m.visitor_id = COALESCE(u.memory_visitor_id, s.visitor_id)
                  AND m.role = 'persona'
                  AND m.created_at >= s.started_at
                  AND m.created_at <= COALESCE(s.ended_at, s.last_seen_at)) AS persona_messages
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
    timeZone: NINA_ANALYTICS_TIME_ZONE,
    todayStart: starts.today,
    activeWindowSeconds: NINA_ANALYTICS_ACTIVE_SECONDS,
    ranges: { today, days7, days30 },
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
      checkoutStarts: { available: true, value: Math.max(0, Number(checkouts?.count) || 0) },
      purchases: { available: true, value: Math.max(0, Number(purchases?.count) || 0) }
    },
    cost: {
      window: "Last 30 days", totalMinutes, pricePerMinute,
      estimatedAnamCost: pricePerMinute === null ? null : totalMinutes * pricePerMinute,
      label: "Estimated Anam cost"
    },
    sessions: (recent?.results || []).map(row => {
      const connectedSeconds = Math.max(0, Number(row.connected_seconds) || 0);
      const userMessages = Math.max(0, Number(row.user_messages) || 0);
      const personaMessages = Math.max(0, Number(row.persona_messages) || 0);
      const messageTrackingAvailable = Number(row.is_authenticated) === 1 || row.actor_type === "owner";
      const stage = sessionStage(row.status, connectedSeconds, userMessages, personaMessages, messageTrackingAvailable);
      return {
        id: row.id, userIdentifier: String(row.user_key || "").replace(/^user:/, "U-").replace(/^visitor:/, "V-").slice(0, 14),
        authenticated: Number(row.is_authenticated) === 1, actorType: row.actor_type,
        displayName: Number(row.is_authenticated) === 1 ? row.user_display_name || "" : "",
        email: Number(row.is_authenticated) === 1 ? row.user_email || "" : "",
        returning: Number(row.is_returning) === 1,
        status: stage.label,
        rawStatus: row.status,
        stage: stage.key,
        messageTrackingAvailable,
        userMessages,
        personaMessages,
        startedAt: row.started_at, lastSeenAt: row.last_seen_at, endedAt: row.ended_at,
        connectedSeconds
      };
    })
  };
}
