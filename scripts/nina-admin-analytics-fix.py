from pathlib import Path


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, content):
    Path(path).write_text(content, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)

# Worker analytics
path = 'anam-token-worker/src/analytics.js'
s = read(path)
needle = 'const secondsBetween = (start, end) => Math.max(0, Math.floor((Date.parse(end) - Date.parse(start)) / 1000));'
insert = '''const secondsBetween = (start, end) => Math.max(0, Math.floor((Date.parse(end) - Date.parse(start)) / 1000));
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
}'''
s = replace_once(s, needle, insert, 'timezone helpers')
s = replace_once(s, '''function rangeStart(now, days) {
  if (days === 1) {
    const date = new Date(now);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
  }
  return iso(now - days * 86400000);
}''', '''function rangeStart(now, days) {
  if (days === 1) return berlinTodayStart(now);
  return iso(now - days * 86400000);
}''', 'Berlin today range')
s = replace_once(s, "WHERE m.visitor_id = s.visitor_id\n                  AND m.role = 'user'", "WHERE m.visitor_id = COALESCE(u.memory_visitor_id, s.visitor_id)\n                  AND m.role = 'user'", 'user message identity')
s = replace_once(s, "WHERE m.visitor_id = s.visitor_id\n                  AND m.role = 'persona'", "WHERE m.visitor_id = COALESCE(u.memory_visitor_id, s.visitor_id)\n                  AND m.role = 'persona'", 'persona message identity')

detail_fn = r'''
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
'''
s = replace_once(s, 'export async function getNinaAnalyticsDashboard(env, now = Date.now()) {', detail_fn + '\nexport async function getNinaAnalyticsDashboard(env, now = Date.now()) {', 'session detail export')
s = replace_once(s, '    generatedAt: current,\n    activeWindowSeconds: NINA_ANALYTICS_ACTIVE_SECONDS,', '    generatedAt: current,\n    timeZone: NINA_ANALYTICS_TIME_ZONE,\n    todayStart: starts.today,\n    activeWindowSeconds: NINA_ANALYTICS_ACTIVE_SECONDS,', 'dashboard timezone metadata')
write(path, s)

# Worker route
path = 'anam-token-worker/src/index.js'
s = read(path)
s = replace_once(s, '  endNinaAnalyticsSession, getNinaAnalyticsDashboard, startNinaAnalyticsSession, touchNinaAnalyticsSession', '  endNinaAnalyticsSession, getNinaAnalyticsDashboard, getNinaAnalyticsSessionDetail, startNinaAnalyticsSession, touchNinaAnalyticsSession', 'analytics import')
s = replace_once(s, '''async function handleNinaAnalyticsDashboard(request, env, origin) {
  const owner = await authenticateAccountRequest(request, env);
  if (!owner) return jsonResponse({ error: "Account authentication required", code: "sign_in_required" }, 401, origin);
  if (owner.role !== "owner") return jsonResponse({ error: "Owner access required", code: "owner_required" }, 403, origin);
  return jsonResponse(await getNinaAnalyticsDashboard(env), 200, origin);
}''', '''async function handleNinaAnalyticsDashboard(request, env, origin) {
  const owner = await authenticateAccountRequest(request, env);
  if (!owner) return jsonResponse({ error: "Account authentication required", code: "sign_in_required" }, 401, origin);
  if (owner.role !== "owner") return jsonResponse({ error: "Owner access required", code: "owner_required" }, 403, origin);
  const sessionId = new URL(request.url).searchParams.get("session");
  if (sessionId) {
    const detail = await getNinaAnalyticsSessionDetail(env, sessionId);
    return detail ? jsonResponse(detail, 200, origin) : jsonResponse({ error: "Session not found", code: "session_not_found" }, 404, origin);
  }
  return jsonResponse(await getNinaAnalyticsDashboard(env), 200, origin);
}''', 'dashboard detail route')
write(path, s)

# Admin HTML
path = 'nina-admin/index.html'
s = read(path)
s = replace_once(s, '<link rel="stylesheet" href="../css/nina-admin.css?v=20260904-readable-2">', '<link rel="stylesheet" href="../css/nina-admin.css?v=20260909-call-inspector">', 'admin css cache')
s = replace_once(s, '<div class="admin-section-heading"><p>07</p><h2 id="sessionsTitle">Recent sessions</h2></div>', '<div class="admin-section-heading"><p>07</p><div><h2 id="sessionsTitle">Recent sessions</h2><p class="admin-section-kicker">Click a call to inspect the conversation, credits and purchase path.</p></div></div>', 'session heading')
s = replace_once(s, '<script type="module" src="../js/nina-admin.js?v=20260905-voucher-copy"></script>', '<script type="module" src="../js/nina-admin.js?v=20260909-call-inspector"></script>', 'admin js cache')
write(path, s)

# Admin JS
path = 'js/nina-admin.js'
s = read(path)
s = replace_once(s, 'const dateTime = value => value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";', 'const ADMIN_TIME_ZONE = "Europe/Berlin";\nconst dateTime = value => value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: ADMIN_TIME_ZONE }).format(new Date(value)) : "—";\nconst timeOnly = value => value ? new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", timeZone: ADMIN_TIME_ZONE }).format(new Date(value)) : "—";', 'Berlin formatting')
s = replace_once(s, 'let sessionPage = 0;', 'let sessionPage = 0;\nconst sessionDetailCache = new Map();\nlet expandedSessionId = null;', 'detail state')
helper = r'''
async function fetchSessionDetail(sessionId) {
  if (sessionDetailCache.has(sessionId)) return sessionDetailCache.get(sessionId);
  const token = await clerk?.session?.getToken?.();
  if (!token) throw new Error("Sign in required");
  const response = await fetch(API_ORIGIN + "/api/nina/analytics/dashboard?session=" + encodeURIComponent(sessionId), {
    cache: "no-store", headers: { "Authorization": "Bearer " + token, "Accept": "application/json" }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Call detail unavailable");
  sessionDetailCache.set(sessionId, data);
  return data;
}

function detailStat(label, value) {
  const item = document.createElement("div");
  const name = document.createElement("span"), amount = document.createElement("strong");
  name.textContent = label; amount.textContent = value; item.append(name, amount); return item;
}

function renderSessionInspector(container, detail) {
  container.replaceChildren();
  const hero = document.createElement("div"); hero.className = "admin-call-hero";
  const title = document.createElement("div");
  const eyebrow = document.createElement("p"); eyebrow.textContent = "CALL DETAIL · BERLIN TIME";
  const heading = document.createElement("h3"); heading.textContent = detail.session.displayName || detail.session.email || "Nina visitor";
  const subtitle = document.createElement("p");
  subtitle.textContent = dateTime(detail.session.startedAt) + " · " + duration(detail.session.connectedSeconds) + " · " + String(detail.session.rawStatus || "").toUpperCase();
  title.append(eyebrow, heading, subtitle);
  const close = document.createElement("button"); close.type="button"; close.className="admin-call-close"; close.textContent="Close";
  close.addEventListener("click", event => { event.stopPropagation(); expandedSessionId = null; renderSessionPage(); });
  hero.append(title, close); container.append(hero);

  const stats = document.createElement("div"); stats.className="admin-call-stats";
  const purchase = detail.purchases?.find(item => item.status === "paid") || detail.purchases?.[0];
  stats.append(
    detailStat("Conversation", detail.transcript.length ? (detail.userMessages + " / " + detail.ninaMessages + " turns") : "No transcript"),
    detailStat("Qualified", detail.qualified ? "YES" : "NO"),
    detailStat("Credits used", detail.live ? String(detail.live.creditsDebited) : "—"),
    detailStat("Balance now", detail.creditAccount ? String(detail.creditAccount.balance) : "—"),
    detailStat("Checkout", purchase ? String(purchase.status).toUpperCase() : "NONE")
  );
  container.append(stats);

  const transcriptTitle = document.createElement("p"); transcriptTitle.className="admin-call-label"; transcriptTitle.textContent="Conversation"; container.append(transcriptTitle);
  const transcript = document.createElement("div"); transcript.className="admin-transcript";
  if (!detail.transcript.length) {
    const empty=document.createElement("p"); empty.className="admin-call-empty"; empty.textContent="No stored speech for this call."; transcript.append(empty);
  } else for (const message of detail.transcript) {
    const turn=document.createElement("div"); turn.className="admin-turn is-" + message.role;
    const meta=document.createElement("div");
    const who=document.createElement("strong"); who.textContent=message.role === "user" ? "USER" : "NINA";
    const when=document.createElement("span"); when.textContent=timeOnly(message.createdAt);
    meta.append(who,when);
    const body=document.createElement("p"); body.textContent=message.content;
    turn.append(meta,body); transcript.append(turn);
  }
  container.append(transcript);

  if (detail.userHistory?.length > 1) {
    const historyTitle=document.createElement("p"); historyTitle.className="admin-call-label"; historyTitle.textContent="Recent visits"; container.append(historyTitle);
    const history=document.createElement("div"); history.className="admin-call-history";
    for(const visit of detail.userHistory){
      const item=document.createElement("div"); item.textContent=dateTime(visit.startedAt) + " · " + duration(visit.connectedSeconds) + " · " + String(visit.status).toUpperCase() + (visit.id === detail.session.id ? " · THIS CALL" : ""); history.append(item);
    }
    container.append(history);
  }
}

async function toggleSessionDetail(session) {
  if (expandedSessionId === session.id) { expandedSessionId = null; renderSessionPage(); return; }
  expandedSessionId = session.id; renderSessionPage();
}
'''
s = replace_once(s, 'function renderSessions(sessions) {', helper + '\nfunction renderSessions(sessions) {', 'detail helpers')
s = replace_once(s, '    const row = document.createElement("tr");\n    const identity = document.createElement("td");', '    const row = document.createElement("tr");\n    row.className = "admin-session-row";\n    row.tabIndex = 0;\n    row.setAttribute("role", "button");\n    row.setAttribute("aria-expanded", expandedSessionId === session.id ? "true" : "false");\n    const identity = document.createElement("td");', 'clickable session row')
s = replace_once(s, '''    elements.sessions.append(row);
  }
  if (!visible.length) tableMessage(elements.sessions, 6, "No sessions yet.");''', '''    row.addEventListener("click", () => void toggleSessionDetail(session));
    row.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void toggleSessionDetail(session); } });
    elements.sessions.append(row);
    if (expandedSessionId === session.id) {
      const detailRow = document.createElement("tr"); detailRow.className="admin-session-detail-row"; detailRow.dataset.detailFor=session.id;
      const cell=document.createElement("td"); cell.colSpan=6;
      const panel=document.createElement("div"); panel.className="admin-call-panel"; panel.textContent="Loading call…";
      cell.append(panel); detailRow.append(cell); elements.sessions.append(detailRow);
      queueMicrotask(async () => {
        if (expandedSessionId !== session.id) return;
        try { renderSessionInspector(panel, await fetchSessionDetail(session.id)); }
        catch (error) { panel.textContent = error.message || "Call detail unavailable."; }
      });
    }
  }
  if (!visible.length) tableMessage(elements.sessions, 6, "No sessions yet.");''', 'detail row render')
s = replace_once(s, '    elements.generated.textContent = `Generated ${dateTime(data.generatedAt)} / Active window ${data.activeWindowSeconds} seconds`;', '    elements.generated.textContent = `Generated ${dateTime(data.generatedAt)} · Today resets at 00:00 Europe/Berlin · Active window ${data.activeWindowSeconds} seconds`;', 'generated timezone label')
write(path, s)

# Admin CSS
path = 'css/nina-admin.css'
s = read(path)
s += r'''

/* 2026-09-09 · elegant call inspector */
.admin-section-kicker{margin:8px 0 0;color:#8f8f8a;font:14px/1.5 Inter,sans-serif;letter-spacing:0;text-transform:none}
.admin-session-row{cursor:pointer;transition:background .18s ease,color .18s ease}
.admin-session-row:hover,.admin-session-row:focus-visible,.admin-session-row[aria-expanded="true"]{background:#0a0a0c;outline:none}
.admin-session-row[aria-expanded="true"] td{border-bottom-color:#3a3a3a}
.admin-session-detail-row td{padding:0;border-bottom:1px solid #3a3a3a;text-transform:none!important;font-family:Inter,sans-serif!important}
.admin-call-panel{padding:clamp(24px,3vw,42px);background:linear-gradient(180deg,#0a0a0c 0%,#060607 100%);box-shadow:inset 0 1px rgba(255,255,255,.035)}
.admin-call-hero{display:flex;justify-content:space-between;gap:28px;align-items:flex-start;padding-bottom:24px;border-bottom:1px solid #242426}
.admin-call-hero p{margin:0;color:#8f8f8a;font:13px/1.5 'Courier New',monospace;letter-spacing:.1em;text-transform:uppercase}
.admin-call-hero h3{margin:8px 0 7px;color:#f3f3ef;font:400 clamp(21px,2.2vw,30px)/1.2 Michroma,sans-serif;letter-spacing:.025em;text-transform:none}
.admin-call-hero h3 + p{letter-spacing:.035em;text-transform:none;font-family:Inter,sans-serif}
.admin-call-close{border:0;border-bottom:1px solid #555;background:none;color:#bbb;padding:4px 0;font:12px/1.4 'Courier New',monospace;letter-spacing:.1em;text-transform:uppercase;cursor:pointer}
.admin-call-stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1px;margin:24px 0;background:#262628;border:1px solid #262628}
.admin-call-stats>div{padding:16px;background:#08080a;min-width:0}
.admin-call-stats span{display:block;color:#8f8f8a;font:11px/1.35 'Courier New',monospace;letter-spacing:.11em;text-transform:uppercase}
.admin-call-stats strong{display:block;margin-top:9px;overflow-wrap:anywhere;color:#ededE9;font:500 15px/1.35 Inter,sans-serif}
.admin-call-label{margin:28px 0 12px;color:#8f8f8a;font:12px/1.4 'Courier New',monospace;letter-spacing:.14em;text-transform:uppercase}
.admin-transcript{display:grid;gap:1px;border-top:1px solid #252527}
.admin-turn{display:grid;grid-template-columns:92px minmax(0,1fr);gap:20px;padding:17px 2px;border-bottom:1px solid #202022}
.admin-turn>div{display:flex;flex-direction:column;gap:5px}
.admin-turn strong{font:11px/1.4 'Courier New',monospace;letter-spacing:.1em;color:#a8a8a3}
.admin-turn span{font:11px/1.4 'Courier New',monospace;color:#62625f}
.admin-turn p{margin:0;max-width:760px;color:#e6e6e1;font:16px/1.58 Inter,sans-serif;text-transform:none}
.admin-turn.is-nina p{color:#bfc0bb}
.admin-turn.is-nina strong{color:#777873}
.admin-call-empty{margin:0;padding:20px 0;color:#777772;font:15px/1.5 Inter,sans-serif}
.admin-call-history{border-top:1px solid #252527}
.admin-call-history div{padding:11px 0;border-bottom:1px solid #1d1d1f;color:#989893;font:12px/1.45 'Courier New',monospace;letter-spacing:.035em;text-transform:none}
@media(max-width:900px){.admin-call-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.admin-turn{grid-template-columns:72px minmax(0,1fr)}}
@media(max-width:600px){.admin-call-panel{padding:22px 16px}.admin-call-hero{gap:14px}.admin-call-stats{grid-template-columns:1fr 1fr}.admin-turn{grid-template-columns:1fr;gap:7px}.admin-turn>div{flex-direction:row;justify-content:space-between}.admin-turn p{font-size:15px}}
'''
write(path, s)

# Focused tests
write('anam-token-worker/test/admin-analytics-fix.test.js', '''import test from 'node:test';
import assert from 'node:assert/strict';
import { berlinTodayStart, NINA_ANALYTICS_TIME_ZONE } from '../src/analytics.js';

test('Today resets at Berlin midnight during CEST',()=>{
  assert.equal(NINA_ANALYTICS_TIME_ZONE,'Europe/Berlin');
  assert.equal(berlinTodayStart(Date.parse('2026-09-09T00:30:00Z')),'2026-09-08T22:00:00.000Z');
});

test('Today resets at Berlin midnight during CET',()=>{
  assert.equal(berlinTodayStart(Date.parse('2026-12-09T00:30:00Z')),'2026-12-08T23:00:00.000Z');
});
''')
print('Applied Nina admin analytics fix.')
