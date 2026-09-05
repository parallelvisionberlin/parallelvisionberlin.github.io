const META_PIXEL_ID = "1746851780072706";
const META_GRAPH_VERSION = "v25.0";
const EVENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;

export const NINA_META_EVENT_NAMES = new Set([
  "TalkToNinaClicked",
  "NinaAuthModalOpened",
  "NinaSignupStarted",
  "NinaAuthCompleted",
  "TalkToNina",
  "InitiateCheckout",
  "Purchase"
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

export async function hashNinaMetaEmail(email) {
  const normalized = typeof email === "string" ? email.normalize("NFKC").trim().toLowerCase() : "";
  if (!normalized) return "";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function normalizedEmailHash(value) {
  const hash = optionalClientValue(value, "email_hash").toLowerCase();
  if (!hash) return "";
  if (!SHA256_PATTERN.test(hash)) throw new MetaCapiError("invalid_email_hash", "Invalid email hash");
  return hash;
}

function commerceCustomData(input) {
  if (input === undefined || input === null) return undefined;
  if (typeof input !== "object" || Array.isArray(input)) throw new MetaCapiError("invalid_custom_data", "Invalid custom data");
  const data = {};

  if (input.currency !== undefined && input.currency !== null && input.currency !== "") {
    const currency = typeof input.currency === "string" ? input.currency.trim().toUpperCase() : "";
    if (!/^[A-Z]{3}$/.test(currency)) throw new MetaCapiError("invalid_currency", "Invalid currency");
    data.currency = currency;
  }

  if (input.value !== undefined && input.value !== null && input.value !== "") {
    const value = Number(input.value);
    if (!Number.isFinite(value) || value < 0 || value > 1000000) throw new MetaCapiError("invalid_value", "Invalid value");
    data.value = Math.round(value * 100) / 100;
  }

  if (input.contentIds !== undefined && input.contentIds !== null) {
    if (!Array.isArray(input.contentIds) || input.contentIds.length < 1 || input.contentIds.length > 50) {
      throw new MetaCapiError("invalid_content_ids", "Invalid content IDs");
    }
    const ids = input.contentIds.map(value => typeof value === "string" ? value.trim() : "");
    if (ids.some(value => !value || value.length > 100)) throw new MetaCapiError("invalid_content_ids", "Invalid content IDs");
    data.content_ids = ids;
  }

  if (input.contentType !== undefined && input.contentType !== null && input.contentType !== "") {
    const contentType = typeof input.contentType === "string" ? input.contentType.trim() : "";
    if (!["product", "product_group"].includes(contentType)) throw new MetaCapiError("invalid_content_type", "Invalid content type");
    data.content_type = contentType;
  }

  if (input.numItems !== undefined && input.numItems !== null && input.numItems !== "") {
    const numItems = Number(input.numItems);
    if (!Number.isSafeInteger(numItems) || numItems < 1 || numItems > 1000) throw new MetaCapiError("invalid_num_items", "Invalid item count");
    data.num_items = numItems;
  }

  if (input.orderId !== undefined && input.orderId !== null && input.orderId !== "") {
    const orderId = typeof input.orderId === "string" ? input.orderId.trim() : "";
    if (!orderId || orderId.length > 100) throw new MetaCapiError("invalid_order_id", "Invalid order ID");
    data.order_id = orderId;
  }

  return Object.keys(data).length ? data : undefined;
}

export async function sendNinaMetaEvent(env, input, fetcher = fetch) {
  if (!NINA_META_EVENT_NAMES.has(input?.eventName)) throw new MetaCapiError("invalid_event_name", "Invalid Nina Meta event");
  if (typeof input?.eventId !== "string" || !EVENT_ID_PATTERN.test(input.eventId)) {
    throw new MetaCapiError("invalid_event_id", "Invalid Meta event ID");
  }
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
  const emailHash = normalizedEmailHash(input.emailHash) || await hashNinaMetaEmail(input.email);
  if (emailHash) userData.em = [emailHash];
  for (const key of Object.keys(userData)) if (userData[key] === undefined) delete userData[key];

  const eventData = {
    event_name: input.eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: "website",
    event_source_url: sourceUrl,
    user_data: userData
  };
  const customData = commerceCustomData(input.customData);
  if (customData) eventData.custom_data = customData;

  const body = { data: [eventData] };
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
