import { berlinTodayStart, NINA_ANALYTICS_TIME_ZONE } from "./analytics.js";

const DAY = 86400000;
const MAX_ROWS = 10000;
const MAX_BYTES = 8 * 1024 * 1024;
const formatTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: NINA_ANALYTICS_TIME_ZONE, dateStyle: "medium", timeStyle: "long"
});

export class TranscriptExportError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

function calendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) throw new TranscriptExportError("Choose valid start and end dates.");
  const ms = Date.parse(`${value}T12:00:00Z`);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== value) {
    throw new TranscriptExportError("Choose valid start and end dates.");
  }
  return ms;
}

export function transcriptWindow(params, now = Date.now()) {
  const period = params.get("period") || "today";
  if (period === "today") return { start: berlinTodayStart(now), end: new Date(now + 1).toISOString() };
  if (period === "last3h") return { start: new Date(now - 3 * 3600000).toISOString(), end: new Date(now + 1).toISOString() };
  if (period !== "custom") throw new TranscriptExportError("Choose a supported date range.");
  const first = calendarDate(params.get("from")), last = calendarDate(params.get("to"));
  if (last < first || last - first > 30 * DAY) throw new TranscriptExportError("Choose a range of 1 to 31 days.");
  return { start: berlinTodayStart(first), end: berlinTodayStart(last + DAY) };
}

// This reader intentionally does not depend on historical analytics-to-call links,
// billing or memory summaries. It reads stored messages, without changing them.
export async function buildTranscriptExport(env, owner, params, now = Date.now()) {
  if (owner?.role !== "owner") throw new TranscriptExportError("Owner access required.", 403);
  const conversationId = params.get("conversation");
  let window = null;
  let sql, values;
  if (conversationId) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId)) {
      throw new TranscriptExportError("Invalid conversation ID.");
    }
    sql = `SELECT c.conversation_id, c.started_at, c.ended_at,
      COALESCE(u.display_name, v.display_name, 'User') AS display_name,
      m.message_id, m.role, m.content, m.created_at
      FROM conversations c JOIN visitors v ON v.visitor_id = c.visitor_id
      LEFT JOIN users u ON u.memory_visitor_id = c.visitor_id
      LEFT JOIN messages m ON m.conversation_id = c.conversation_id AND m.visitor_id = c.visitor_id
      WHERE c.conversation_id = ? ORDER BY m.created_at, m.rowid LIMIT ?`;
    values = [conversationId, MAX_ROWS + 1];
  } else {
    window = transcriptWindow(params, now);
    const query = (params.get("user") || "").trim();
    if (query.length > 254) throw new TranscriptExportError("Use an exact account email or ID.");
    let visitorId = owner.memory_visitor_id;
    if (query) {
      const accounts = await env.NINA_MEMORY_DB.prepare(
        "SELECT memory_visitor_id FROM users WHERE id = ? OR lower(email) = lower(?) LIMIT 2"
      ).bind(query, query).all();
      if (accounts.results?.length !== 1) throw new TranscriptExportError("Account not found or ambiguous. Use its exact internal ID.", 404);
      visitorId = accounts.results[0].memory_visitor_id;
    }
    if (!visitorId) throw new TranscriptExportError("Account memory identity unavailable.", 404);
    sql = `SELECT c.conversation_id, c.started_at, c.ended_at,
      COALESCE(u.display_name, v.display_name, 'User') AS display_name,
      m.message_id, m.role, m.content, m.created_at
      FROM conversations c JOIN visitors v ON v.visitor_id = c.visitor_id
      LEFT JOIN users u ON u.memory_visitor_id = c.visitor_id
      LEFT JOIN messages m ON m.conversation_id = c.conversation_id AND m.visitor_id = c.visitor_id
        AND m.created_at >= ? AND m.created_at < ?
      WHERE c.visitor_id = ? AND (m.message_id IS NOT NULL OR (c.started_at >= ? AND c.started_at < ?))
      ORDER BY c.started_at, c.conversation_id, m.created_at, m.rowid LIMIT ?`;
    values = [window.start, window.end, visitorId, window.start, window.end, MAX_ROWS + 1];
  }
  const { results: rows = [] } = await env.NINA_MEMORY_DB.prepare(sql).bind(...values).all();
  if (!rows.length) throw new TranscriptExportError("No saved conversations found for this selection.", 404);
  if (rows.length > MAX_ROWS) throw new TranscriptExportError("Too much text for one download. Choose a shorter date range. Nothing was exported.", 413);
  const messages = rows.filter(row => row.message_id).length;
  const conversations = new Set(rows.map(row => row.conversation_id)).size;
  const stamp = value => value ? formatTime.format(new Date(value)) : "Not recorded";
  const lines = ["NINA FOK / FULL STORED TRANSCRIPT", `Account: ${rows[0].display_name}`,
    `Time zone: ${NINA_ANALYTICS_TIME_ZONE}`, `Exported: ${stamp(now)}`,
    `${conversations} conversations / ${messages} messages`,
    window ? `Message window: ${stamp(window.start)} to ${stamp(window.end)} (end exclusive)` : "Complete selected conversation",
    "Stored wording preserved. Times are database timestamps, not audio timecodes.",
    "Conversation boundaries do not establish why a connection ended."];
  if (window) lines.push("Only messages inside the selected window are included. Empty records are listed.");
  let previous = null;
  for (const row of rows) {
    if (row.conversation_id !== previous) {
      lines.push("", "============================================================", `Conversation: ${row.conversation_id}`,
        `Started: ${stamp(row.started_at)}`, `Ended: ${stamp(row.ended_at)}`, "");
      previous = row.conversation_id;
    }
    if (!row.message_id) { lines.push("[No messages recorded in this window.]", ""); continue; }
    lines.push(`[${stamp(row.created_at)}] ${row.role === "persona" ? "Nina" : row.display_name}`, row.content, "");
  }
  const text = lines.join("\n") + "\n";
  if (new TextEncoder().encode(text).byteLength > MAX_BYTES) throw new TranscriptExportError("Too much text for one download. Choose a shorter date range. Nothing was exported.", 413);
  const label = conversationId || `${window.start.slice(0, 10)}_${window.end.slice(0, 10)}`;
  return { text, filename: `nina-transcript-${label}.txt`, messages, conversations };
}
