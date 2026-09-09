from pathlib import Path
root=Path(__file__).resolve().parents[2]
p=root/'anam-token-worker/src/analytics.js'
s=p.read_text()
anchor='export async function getNinaAnalyticsSessionDetail(env, sessionId, now = Date.now()) {'
helper='''// Return only a safe diagnostic category, never SQL, tokens or conversation text.
function detailReadErrorCode(error) {
  const text = [error?.message, error?.cause?.message].filter(Boolean).join(" ");
  if (/no such (?:table|column)|D1_COLUMN_NOTFOUND/i.test(text)) return "schema_unavailable";
  if (/busy|overload|timeout|timed out/i.test(text)) return "temporarily_unavailable";
  return "read_failed";
}

'''
s=s.replace(anchor, helper+anchor,1)
old='''  let live = null, account = null, transactions = { results: [] }, purchases = { results: [] };
  let qualified = null, qualificationAvailable = false, userHistory = { results: [] }, liveMatch = "unlinked";'''
new='''  // The transcript is essential. Account metadata is independent: a failed ledger,
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
  let qualified = null, userHistory = { results: [] }, liveMatch = "unlinked";'''
assert old in s;s=s.replace(old,new,1)
start=s.index('    const [liveCandidates, creditAccount, nearPurchases, history] = await Promise.all([')
end=s.index('  const transcript = (messages.results || [])',start)
s=s[:start]+'''    const [liveCandidates, creditAccount, nearPurchases, history] = await Promise.all([
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
''' + s[end:]
s=s.replace('''    timeZone: NINA_ANALYTICS_TIME_ZONE, generatedAt: iso(now),
    session: presentAnalyticsCall(session),''','''    timeZone: NINA_ANALYTICS_TIME_ZONE, generatedAt: iso(now),
    revision: "admin-call-recovery-20260909", detailAvailability,
    warnings: warnings.sort((a, b) => a.section.localeCompare(b.section)),
    session: presentAnalyticsCall(session),''',1)
p.write_text(s)
p=root/'anam-token-worker/src/index.js';s=p.read_text()
old='''  if (sessionId) {
    const detail = await getNinaAnalyticsSessionDetail(env, sessionId);
    return detail ? jsonResponse(detail, 200, origin) : jsonResponse({ error: "Session not found", code: "session_not_found" }, 404, origin);
  }'''
new='''  if (sessionId) {
    try {
      const detail = await getNinaAnalyticsSessionDetail(env, sessionId);
      return detail ? jsonResponse(detail, 200, origin) : jsonResponse({ error: "Session not found", code: "session_not_found" }, 404, origin);
    } catch {
      // Do not expose database errors, emails or transcripts. Keep CORS even on failure
      // so the owner sees a retryable API error, not the browser's opaque fetch error.
      console.warn("nina_admin_call_detail_unavailable");
      return jsonResponse({ error: "Call details are temporarily unavailable. Please retry.", code: "call_detail_unavailable" }, 503, origin);
    }
  }'''
assert old in s;s=s.replace(old,new,1)
s=s.replace('return handleNinaAnalyticsDashboard(request, env, origin);','return await handleNinaAnalyticsDashboard(request, env, origin);',1)
p.write_text(s)
