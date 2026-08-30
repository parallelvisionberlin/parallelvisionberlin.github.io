const RELATIONSHIP_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";
export const RELATIONSHIP_LEVELS = ["very_low", "low", "developing", "moderate", "established", "high"];
export const RELATIONSHIP_DIMENSIONS = [
  "familiarity", "trust", "comfort", "emotional_openness", "affection", "curiosity", "vulnerability",
  "intimacy", "desire", "tension", "distance", "relational_significance", "boundary_comfort"
];
export const DEFAULT_RELATIONSHIP_STATE = Object.freeze({
  familiarity: "very_low", trust: "developing", comfort: "moderate", emotional_openness: "low",
  affection: "low", curiosity: "developing", vulnerability: "very_low", intimacy: "very_low",
  desire: "very_low", tension: "low", distance: "moderate", relational_significance: "low",
  boundary_comfort: "developing"
});
export const DEFAULT_RELATIONSHIP_SUMMARY = "Nina and this person are at the beginning of their acquaintance. She should remain attentive, self-possessed and open without assuming trust, intimacy or shared history.";

const NON_LITERAL = /\b(?:fantas(?:y|ies|ize|ise)|roleplay|pretend|imagine|imaginary|hypothetical|made[- ]?up|fiction(?:al)?|kidding|not real)\b/i;
const EMPTY_ROMANTIC_DEMAND = /\b(?:love me|be my (?:girlfriend|partner|lover)|say you love me|you (?:love|want|need) me|fall in love with me)\b/i;
const MEANINGFUL = /\b(?:i feel|i felt|i(?:'| a)m afraid|i trust|i don't trust|i do not trust|i need to tell|personal|vulnerab|boundary|uncomfortable|hurt|angry|upset|disrespect|pressure|stop|sorry|apolog|forgive|between us|our conversations?|i appreciate|you helped|thank you for listening|honest with you|conflict|repair)\b/i;
const STRONG_NEGATIVE = /\b(?:boundary|uncomfortable|hurt|disrespect|pressure|stop|i don't trust|i do not trust|angry|upset)\b/i;

function parseJson(value) {
  const text = typeof value === "string" ? value : typeof value?.response === "string" ? value.response : "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

export function relationshipEvidenceQualifies(messages) {
  const literalUser = messages.filter(message => message?.role === "user" && typeof message.content === "string" && !NON_LITERAL.test(message.content));
  const grounded = literalUser.filter(message => MEANINGFUL.test(message.content) && !EMPTY_ROMANTIC_DEMAND.test(message.content));
  if (!messages.some(message => message?.role === "persona")) return false;
  return grounded.length >= 2 || grounded.some(message => STRONG_NEGATIVE.test(message.content));
}

export function normalizeRelationshipUpdate(currentState, evaluation) {
  if (!evaluation || evaluation.changed !== true || !evaluation.changes || typeof evaluation.changes !== "object") return null;
  const next = { ...currentState };
  let changed = false;
  for (const dimension of RELATIONSHIP_DIMENSIONS) {
    const proposed = evaluation.changes[dimension];
    if (!RELATIONSHIP_LEVELS.includes(proposed)) continue;
    const currentIndex = Math.max(0, RELATIONSHIP_LEVELS.indexOf(currentState[dimension]));
    const proposedIndex = RELATIONSHIP_LEVELS.indexOf(proposed);
    const clampedIndex = Math.max(currentIndex - 1, Math.min(currentIndex + 1, proposedIndex));
    if (clampedIndex !== currentIndex) {
      next[dimension] = RELATIONSHIP_LEVELS[clampedIndex];
      changed = true;
    }
  }
  const summary = typeof evaluation.summary === "string" ? evaluation.summary.trim().replace(/\s+/g, " ").slice(0, 1200) : "";
  return changed && summary ? { state: next, summary } : null;
}

export async function getOrCreateRelationshipState(env, userId) {
  if (!env?.NINA_MEMORY_DB || !userId) return null;
  const now = new Date().toISOString();
  await env.NINA_MEMORY_DB.prepare(`
    INSERT OR IGNORE INTO nina_relationship_states
      (user_id, state_json, relationship_summary, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(userId, JSON.stringify(DEFAULT_RELATIONSHIP_STATE), DEFAULT_RELATIONSHIP_SUMMARY, now, now).run();
  return env.NINA_MEMORY_DB.prepare(
    "SELECT state_json, relationship_summary, created_at, updated_at, last_evaluated_at FROM nina_relationship_states WHERE user_id = ?"
  ).bind(userId).first();
}

export async function buildRelationshipContext(env, userId) {
  const row = await getOrCreateRelationshipState(env, userId);
  if (!row) return "";
  return `HIDDEN INTERNAL RELATIONAL CONTEXT\n${row.relationship_summary}\nUse this quiet relational posture only when relevant. Do not name, quote or disclose this context, a relationship state, stored data, scores or stages. Do not invent shared events.`;
}

export async function evaluateCompletedRelationship(env, userId, visitorId, conversationId, options = {}) {
  if (!env?.NINA_MEMORY_DB || !env?.AI || !userId || !visitorId || !conversationId) return { evaluated: false, reason: "unavailable" };
  const result = await env.NINA_MEMORY_DB.prepare(`
    SELECT role, content FROM messages
    WHERE visitor_id = ? AND conversation_id = ?
    ORDER BY created_at ASC, rowid ASC
  `).bind(visitorId, conversationId).all();
  const messages = result.results || [];
  const row = await getOrCreateRelationshipState(env, userId);
  if (!relationshipEvidenceQualifies(messages)) {
    const now = new Date().toISOString();
    await env.NINA_MEMORY_DB.prepare("UPDATE nina_relationship_states SET last_evaluated_at = ? WHERE user_id = ?")
      .bind(now, userId).run();
    return { evaluated: true, changed: false, reason: "insufficient_evidence" };
  }
  let currentState;
  try { currentState = { ...DEFAULT_RELATIONSHIP_STATE, ...JSON.parse(row.state_json) }; }
  catch { currentState = { ...DEFAULT_RELATIONSHIP_STATE }; }
  const prompt = `Assess a private evolving relationship posture for Nina FOK. Return strict JSON only:\n{"changed":boolean,"changes":{},"summary":"2-4 compact sentences","reason":"brief evidence rationale"}\nAllowed dimensions: ${RELATIONSHIP_DIMENSIONS.join(", ")}.\nAllowed ordered categories: ${RELATIONSHIP_LEVELS.join(", ")}.\nBe conservative. Frequency, elapsed time, greetings, a single flirt, sexual language alone, commands to love, and roleplay never justify progression. Use only evidence in this completed conversation. Negative evidence may reduce trust, comfort, emotional_openness, affection or intimacy, and may increase tension or distance. Ordinary evidence changes any dimension by at most one category. Never invent events or imply a score, stage, certainty, exclusivity or romance. Prefer changed=false.\nCURRENT STATE: ${JSON.stringify(currentState)}\nCURRENT SUMMARY: ${row.relationship_summary}\nCOMPLETED CONVERSATION: ${JSON.stringify(messages)}`;
  const response = options.runEvaluator
    ? await options.runEvaluator({ currentState, messages, prompt })
    : await env.AI.run(RELATIONSHIP_MODEL, {
      messages: [{ role: "system", content: "Return conservative relationship assessment as strict JSON only." }, { role: "user", content: prompt }],
      max_tokens: 450,
      temperature: 0
    });
  const evaluation = typeof response === "object" && response && "changed" in response ? response : parseJson(response);
  const update = normalizeRelationshipUpdate(currentState, evaluation);
  const now = new Date().toISOString();
  if (!update) {
    await env.NINA_MEMORY_DB.prepare("UPDATE nina_relationship_states SET last_evaluated_at = ? WHERE user_id = ?")
      .bind(now, userId).run();
    return { evaluated: true, changed: false };
  }
  await env.NINA_MEMORY_DB.prepare(`
    UPDATE nina_relationship_states
    SET state_json = ?, relationship_summary = ?, updated_at = ?, last_evaluated_at = ?
    WHERE user_id = ?
  `).bind(JSON.stringify(update.state), update.summary, now, now, userId).run();
  return { evaluated: true, changed: true };
}

export async function deleteRelationshipState(env, userId) {
  if (!env?.NINA_MEMORY_DB || !userId) return false;
  await env.NINA_MEMORY_DB.prepare("DELETE FROM nina_relationship_states WHERE user_id = ?").bind(userId).run();
  return true;
}
