const PERSONA_ID = "a5663da5-5f5c-4600-b545-cbb58bd4e155";
const HISTORY_LIMIT = 20;
const MESSAGE_CHARACTER_LIMIT = 4000;
const VISITOR_ID_PATTERN = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|visitor-[a-z0-9-]+)$/i;
const PRIVATE_MEMORY_INSTRUCTIONS = `Private previous-conversation context follows.
Use it naturally only when relevant.
Never announce that you received prior messages, a transcript, saved memory or injected context.
Never automatically summarize or recite the previous conversation.`;
const PRODUCTION_ORIGINS = new Set([
  "https://parallelvisionlabel.com",
  "https://www.parallelvisionlabel.com"
]);

function isAllowedOrigin(origin) {
  if (PRODUCTION_ORIGINS.has(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function jsonResponse(body, status, origin = "") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(origin ? corsHeaders(origin) : {})
    }
  });
}

function validateHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-HISTORY_LIMIT).flatMap(message => {
    const role = message?.role === "user" || message?.role === "persona" ? message.role : "";
    const content = typeof message?.content === "string"
      ? message.content.trim().slice(0, MESSAGE_CHARACTER_LIMIT)
      : "";
    return role && content ? [{ role, content }] : [];
  }).slice(-HISTORY_LIMIT);
}

function formatPrivateMemory(history) {
  if (!history.length) return "";
  const transcript = history
    .map(message => `${message.role === "user" ? "VISITOR" : "NINA"}: ${message.content}`)
    .join("\n");
  return `${PRIVATE_MEMORY_INSTRUCTIONS}\n\n${transcript}`;
}

async function getCurrentPersonaPrompt(apiKey) {
  const response = await fetch(`https://api.anam.ai/v1/personas/${PERSONA_ID}`, {
    headers: { "Authorization": `Bearer ${apiKey}` }
  });
  if (!response.ok) throw new Error("Unable to read persona configuration");
  const persona = await response.json();
  return typeof persona?.brain?.systemPrompt === "string" ? persona.brain.systemPrompt.trim() : "";
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    if (url.pathname !== "/session-token") return jsonResponse({ error: "Not found" }, 404);
    if (!isAllowedOrigin(origin)) return jsonResponse({ error: "Origin not allowed" }, 403);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, origin);
    if (!env.ANAM_API_KEY) return jsonResponse({ error: "Service unavailable" }, 503, origin);

    try {
      const requestBody = await request.json().catch(() => ({}));
      const visitorId = typeof requestBody?.visitorId === "string" ? requestBody.visitorId.trim() : "";
      if (!visitorId || visitorId.length > 128 || !VISITOR_ID_PATTERN.test(visitorId)) {
        return jsonResponse({ error: "Invalid visitor" }, 400, origin);
      }
      const history = validateHistory(requestBody.history);
      const privateMemory = formatPrivateMemory(history);
      const personaConfig = { personaId: PERSONA_ID };
      if (privateMemory) {
        const currentSystemPrompt = await getCurrentPersonaPrompt(env.ANAM_API_KEY);
        personaConfig.systemPrompt = [currentSystemPrompt, privateMemory].filter(Boolean).join("\n\n");
      }
      const anamResponse = await fetch("https://api.anam.ai/v1/auth/session-token", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.ANAM_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ personaConfig })
      });
      if (!anamResponse.ok) return jsonResponse({ error: "Unable to start session" }, 502, origin);
      const data = await anamResponse.json();
      if (typeof data.sessionToken !== "string" || !data.sessionToken) {
        return jsonResponse({ error: "Invalid session response" }, 502, origin);
      }
      return jsonResponse({ sessionToken: data.sessionToken }, 200, origin);
    } catch {
      return jsonResponse({ error: "Unable to start session" }, 502, origin);
    }
  }
};
