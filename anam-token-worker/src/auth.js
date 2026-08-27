const CLERK_TOKEN_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const CLERK_SUBJECT_PATTERN = /^user_[A-Za-z0-9]+$/;
const ALLOWED_PARTIES = new Set([
  "https://parallelvisionlabel.com",
  "https://www.parallelvisionlabel.com",
  "http://localhost:8000",
  "http://localhost:8080",
  "http://localhost:4173",
  "http://127.0.0.1:8000",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:4173"
]);
let cachedJwks = null;
let cachedJwksAt = 0;
let cachedJwksIssuer = "";

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function decodeJson(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}

async function clerkJwks(env) {
  const issuer = (env.CLERK_ISSUER || "").replace(/\/$/, "");
  if (cachedJwks && cachedJwksIssuer === issuer && Date.now() - cachedJwksAt < 600000) return cachedJwks;
  if (!issuer.startsWith("https://")) throw new Error("Clerk issuer is not configured");
  const response = await fetch(`${issuer}/.well-known/jwks.json`, { headers: { "Accept": "application/json" } });
  if (!response.ok) throw new Error("Unable to read Clerk signing keys");
  const data = await response.json();
  if (!Array.isArray(data?.keys)) throw new Error("Invalid Clerk signing keys");
  cachedJwks = data.keys;
  cachedJwksAt = Date.now();
  cachedJwksIssuer = issuer;
  return cachedJwks;
}

export async function verifyClerkSessionToken(env, token, requestOrigin = "") {
  if (!CLERK_TOKEN_PATTERN.test(token || "")) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  let header;
  let payload;
  try {
    header = decodeJson(encodedHeader);
    payload = decodeJson(encodedPayload);
  } catch { return null; }
  const issuer = (env.CLERK_ISSUER || "").replace(/\/$/, "");
  const authorizedParty = typeof payload.azp === "string" ? payload.azp : requestOrigin;
  const now = Math.floor(Date.now() / 1000);
  if (header.alg !== "RS256" || typeof header.kid !== "string") return null;
  if (payload.iss !== issuer || !CLERK_SUBJECT_PATTERN.test(payload.sub || "")) return null;
  if (!Number.isFinite(payload.exp) || payload.exp <= now - 5) return null;
  if (!Number.isFinite(payload.iat) || payload.iat > now + 5) return null;
  if (Number.isFinite(payload.nbf) && payload.nbf > now + 5) return null;
  const configuredParties = String(env.CLERK_AUTHORIZED_PARTIES || "").split(",").map(value => value.trim()).filter(Boolean);
  if (!ALLOWED_PARTIES.has(authorizedParty) && !configuredParties.includes(authorizedParty)) return null;
  const keys = await clerkJwks(env);
  const jwk = keys.find(candidate => candidate.kid === header.kid && candidate.kty === "RSA");
  if (!jwk) return null;
  try {
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      decodeBase64Url(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
    );
    return valid ? payload : null;
  } catch { return null; }
}

export async function resolveAuthenticatedUser(env, claims) {
  const existing = await env.NINA_MEMORY_DB.prepare(
    "SELECT id, display_name, role, memory_visitor_id FROM users WHERE auth_provider = 'clerk' AND auth_subject = ? LIMIT 1"
  ).bind(claims.sub).first();
  if (existing) return existing;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const displayName = "Parallel Vision User";
  try {
    await env.NINA_MEMORY_DB.batch([
      env.NINA_MEMORY_DB.prepare(
        "INSERT INTO visitors (visitor_id, display_name, profile_type, created_at, updated_at) VALUES (?, ?, 'visitor', ?, ?)"
      ).bind(id, displayName, now, now),
      env.NINA_MEMORY_DB.prepare(
        "INSERT INTO users (id, auth_provider, auth_subject, email, display_name, role, memory_visitor_id, created_at, updated_at) VALUES (?, 'clerk', ?, NULL, ?, 'user', ?, ?, ?)"
      ).bind(id, claims.sub, displayName, id, now, now)
    ]);
  } catch {
    const concurrent = await env.NINA_MEMORY_DB.prepare(
      "SELECT id, display_name, role, memory_visitor_id FROM users WHERE auth_provider = 'clerk' AND auth_subject = ? LIMIT 1"
    ).bind(claims.sub).first();
    if (concurrent) return concurrent;
    throw new Error("Unable to create authenticated user");
  }
  return { id, display_name: displayName, role: "user", memory_visitor_id: id };
}

export function asMemoryIdentity(user) {
  return {
    user_id: user.id,
    visitor_id: user.memory_visitor_id,
    display_name: user.display_name,
    profile_type: user.role === "owner" ? "owner" : "visitor",
    role: user.role,
    account_authenticated: true
  };
}
