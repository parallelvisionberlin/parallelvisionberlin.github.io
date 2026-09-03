const META_PIXEL_ID = "1746851780072706";
const META_GRAPH_VERSION = "v25.0";

export const NINA_META_EVENT_NAMES = new Set([
  "TalkToNinaClicked",
  "NinaAuthModalOpened",
  "NinaSignupStarted",
  "NinaAuthCompleted",
  "TalkToNina"
]);

export class MetaCapiError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "MetaCapiError";
    this.code = code;
    this.status = status;
  }
}

function optionalClientValue(value, field) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string" || value.length > 255) throw new MetaCapiError(`invalid_${field}`, `Invalid ${field}`);
  return value;
}

async function hashEmail(email) {
  const normalized = typeof email === "string" ? email.normalize("NFKC").trim().toLowerCase() : "";
  if (!normalized) return "";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function sendNinaMetaEvent(env, input, fetcher = fetch) {
  if (!NINA_META_EVENT_NAMES.has(input?.eventName)) throw new MetaCapiError("invalid_event_name", "Invalid Nina Meta event");
  if (typeof env?.META_CAPI_ACCESS_TOKEN !== "string" || !env.META_CAPI_ACCESS_TOKEN) {
    throw new MetaCapiError("meta_capi_unavailable", "Meta CAPI is unavailable", 503);
  }
  let sourceUrl;
  try { sourceUrl = new URL(input.eventSourceUrl).href; }
  catch { throw new MetaCapiError("invalid_event_source_url", "Invalid event source URL"); }

  const userData = {
    client_user_agent: input.clientUserAgent || undefined,
    client_ip_address: input.clientIpAddress || undefined,
    fbp: optionalClientValue(input.fbp, "fbp") || undefined,
    fbc: optionalClientValue(input.fbc, "fbc") || undefined
  };
  const emailHash = await hashEmail(input.email);
  if (emailHash) userData.em = [emailHash];
  for (const key of Object.keys(userData)) if (userData[key] === undefined) delete userData[key];

  const body = {
    data: [{
      event_name: input.eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      event_source_url: sourceUrl,
      user_data: userData
    }]
  };
  const testEventCode = optionalClientValue(input.testEventCode, "test_event_code");
  if (testEventCode) body.test_event_code = testEventCode;
  const response = await fetcher(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${META_PIXEL_ID}/events`,
    {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.META_CAPI_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );
  if (!response.ok) throw new MetaCapiError("meta_capi_failed", "Meta CAPI request failed", 502);
  return { accepted: true };
}
