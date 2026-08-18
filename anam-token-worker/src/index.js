const PERSONA_ID = "a5663da5-5f5c-4600-b545-cbb58bd4e155";
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
      const anamResponse = await fetch("https://api.anam.ai/v1/auth/session-token", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.ANAM_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ personaConfig: { personaId: PERSONA_ID } })
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
