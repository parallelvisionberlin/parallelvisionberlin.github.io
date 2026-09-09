import { sendNinaMetaEvent } from "./meta-capi.js";

const uuid = value => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const WEB_SIGNAL_GUIDANCE = `WEBSITE SIGNAL RECOVERY
If there is no reply, do not assume the person is distracted, rude, demanding or staring at you. Silence can be a sound or microphone problem. At most once, calmly ask whether they can hear you and point to Audio help if needed. Do not repeatedly demand that they speak. If someone says they cannot hear your replies, take that literally and do not tease them for it. Receiving transcribed words is not evidence of microphone loudness or successful output playback.
If asked how to continue or what the connection costs, briefly direct them to Get more time beside the timer. The website shows the current packs; do not invent a subscription, price, balance or remaining time. Keep your voice and identity; the controls belong to the website.`;

export function countCompletedExchanges(messages) {
  let userMessages = 0;
  let replies = 0;
  let awaiting = false;
  for (const message of messages) {
    if (message.role === "user") { userMessages++; awaiting = true; }
    else if (message.role === "persona" && awaiting) { replies++; awaiting = false; }
  }
  return { userMessages, replies };
}

export function excludeWebMeasurement(env, user) {
  const ids = String(env.NINA_ANALYTICS_EXCLUDED_USER_IDS || "").split(",").map(x => x.trim()).filter(Boolean);
  return !user?.id || user.role === "owner" || ids.includes(user.id);
}

// Inputs contain no dialogue. Qualification is checked against this authenticated
// user's stored conversation and Live session, not a client-supplied message count.
export async function qualifyWebConversation(env, user, input, requestInfo = {}, now = Date.now(), send = sendNinaMetaEvent) {
  if (excludeWebMeasurement(env, user)) return { qualified: false, excluded: true };
  if (!uuid(input?.conversationId) || !uuid(input?.usageSessionId) || input.audioConfirmed !== true) {
    return { qualified: false, reason: "signal_not_confirmed" };
  }
  const conversation = await env.NINA_MEMORY_DB.prepare(
    "SELECT conversation_id, started_at FROM conversations WHERE conversation_id = ? AND visitor_id = ?"
  ).bind(input.conversationId, user.memory_visitor_id).first();
  const live = await env.NINA_MEMORY_DB.prepare(
    "SELECT id, status, started_at, ended_at, created_at FROM live_nina_sessions WHERE id = ? AND user_id = ?"
  ).bind(input.usageSessionId, user.id).first();
  const start = Date.parse(live?.started_at || "");
  const end = Math.min(now, Date.parse(live?.ended_at || "") || now);
  if (!conversation || !live || !["active", "ended", "exhausted"].includes(live.status) ||
      !Number.isFinite(start) || end - start < 60000 ||
      Math.abs(Date.parse(live.created_at) - Date.parse(conversation.started_at)) > 120000) {
    return { qualified: false, reason: "session_not_qualified" };
  }
  const rows = await env.NINA_MEMORY_DB.prepare(`
    SELECT role FROM messages WHERE conversation_id = ? AND visitor_id = ?
      AND created_at >= ? AND created_at <= ? ORDER BY created_at ASC, rowid ASC
  `).bind(conversation.conversation_id, user.memory_visitor_id, conversation.started_at, new Date(now).toISOString()).all();
  const counts = countCompletedExchanges(rows.results || []);
  if (counts.userMessages < 2 || counts.replies < 2) return { qualified: false, reason: "not_enough_exchanges" };

  const qualifiedAt = new Date(now).toISOString();
  await env.NINA_MEMORY_DB.prepare(`
    INSERT INTO nina_qualified_conversations
      (user_id, conversation_id, live_session_id, event_id, qualified_at)
    VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO NOTHING
  `).bind(user.id, conversation.conversation_id, live.id, crypto.randomUUID(), qualifiedAt).run();
  const milestone = await env.NINA_MEMORY_DB.prepare(
    "SELECT event_id, qualified_at, meta_sent_at FROM nina_qualified_conversations WHERE user_id = ?"
  ).bind(user.id).first();
  // Stable acquisition ID across reconnects/devices. Do not replay old acquisitions
  // outside the short reporting window; browser/server share the same event ID.
  const withinWindow = now - Date.parse(milestone.qualified_at) < 86400000;
  const marketingAllowed = input.marketingAllowed === true && withinWindow;
  let metaSent = Boolean(milestone.meta_sent_at);
  if (marketingAllowed && !metaSent && env.META_CAPI_ACCESS_TOKEN) {
    try {
      await send(env, {
        eventName: "NinaQualifiedConversation", eventId: milestone.event_id,
        eventSourceUrl: requestInfo.eventSourceUrl,
        clientUserAgent: requestInfo.clientUserAgent || "",
        clientIpAddress: requestInfo.clientIpAddress || "",
        fbp: input.fbp, fbc: input.fbc, email: user.email || ""
      });
      await env.NINA_MEMORY_DB.prepare(
        "UPDATE nina_qualified_conversations SET meta_sent_at = ? WHERE user_id = ? AND meta_sent_at IS NULL"
      ).bind(qualifiedAt, user.id).run();
      metaSent = true;
    } catch { /* First-party milestone survives; retries use the same event ID. */ }
  }
  return { qualified: true, eventId: milestone.event_id, marketingAllowed,
    emitPixel: marketingAllowed, metaSent };
}
