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

export class ClerkVerificationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ClerkVerificationError";
    this.code = code;
  }
}

export async function getClerkEmailVerification(env, clerkUserId) {
  if (!CLERK_SUBJECT_PATTERN.test(clerkUserId || "")) {
    throw new ClerkVerificationError("invalid_clerk_user", "Invalid Clerk user");
  }
  if (typeof env.CLERK_SECRET_KEY !== "string" || !env.CLERK_SECRET_KEY.trim()) {
    throw new ClerkVerificationError("clerk_verification_unavailable", "Clerk email verification is unavailable");
  }
  let response;
  try {
    response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(clerkUserId)}`, {
      headers: { "Authorization": `Bearer ${env.CLERK_SECRET_KEY}`, "Accept": "application/json" }
    });
  } catch {
    throw new ClerkVerificationError("clerk_verification_unavailable", "Clerk email verification is unavailable");
  }
  if (!response.ok) {
    throw new ClerkVerificationError("clerk_verification_unavailable", "Clerk email verification is unavailable");
  }
  const clerkUser = await response.json().catch(() => null);
  const addresses = Array.isArray(clerkUser?.email_addresses) ? clerkUser.email_addresses : [];
  const primary = addresses.find(address => address?.id === clerkUser?.primary_email_address_id);
  return {
    verified: primary?.verification?.status === "verified",
    email: typeof primary?.email_address === "string" ? primary.email_address : ""
  };
}

export async function deleteClerkUser(env, clerkUserId) {
  if (!CLERK_SUBJECT_PATTERN.test(clerkUserId || "")) throw new ClerkVerificationError("invalid_clerk_user", "Invalid Clerk user");
  if (typeof env.CLERK_SECRET_KEY !== "string" || !env.CLERK_SECRET_KEY.trim()) {
    throw new ClerkVerificationError("clerk_deletion_unavailable", "Clerk account deletion is unavailable");
  }
  let response;
  try {
    response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(clerkUserId)}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${env.CLERK_SECRET_KEY}`, "Accept": "application/json" }
    });
  } catch {
    throw new ClerkVerificationError("clerk_deletion_unavailable", "Clerk account deletion is unavailable");
  }
  if (!response.ok && response.status !== 404) {
    throw new ClerkVerificationError("clerk_deletion_failed", "Clerk account deletion failed");
  }
  return true;
}

export async function verifyClerkUserAvailable(env, clerkUserId) {
  if (!CLERK_SUBJECT_PATTERN.test(clerkUserId || "")) throw new ClerkVerificationError("invalid_clerk_user", "Invalid Clerk user");
  if (typeof env.CLERK_SECRET_KEY !== "string" || !env.CLERK_SECRET_KEY.trim()) {
    throw new ClerkVerificationError("clerk_deletion_unavailable", "Clerk account deletion is unavailable");
  }
  let response;
  try {
    response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(clerkUserId)}`, {
      headers: { "Authorization": `Bearer ${env.CLERK_SECRET_KEY}`, "Accept": "application/json" }
    });
  } catch {
    throw new ClerkVerificationError("clerk_deletion_unavailable", "Clerk account deletion is unavailable");
  }
  if (!response.ok) throw new ClerkVerificationError("clerk_deletion_unavailable", "Clerk account deletion is unavailable");
  const clerkUser = await response.json().catch(() => null);
  if (clerkUser?.id !== clerkUserId) throw new ClerkVerificationError("clerk_identity_mismatch", "Clerk account identity mismatch");
  return true;
}

function validatedDisplayName(value) {
  if (typeof value !== "string") return "";
  const normalized = value.normalize("NFKC").replace(/[^\p{L}\p{M} .'-]/gu, " ").replace(/\s+/g, " ").trim();
  return normalized.length >= 1 && normalized.length <= 50 ? normalized : "";
}

function normalizedClerkEmail(value) {
  if (typeof value !== "string") return "";
  const email = value.normalize("NFKC").trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

export async function synchronizeAuthenticatedUserEmail(env, user, email) {
  const clerkEmail = normalizedClerkEmail(email);
  if (!user?.id || !clerkEmail || clerkEmail === normalizedClerkEmail(user.email)) return user;
  const now = new Date().toISOString();
  await env.NINA_MEMORY_DB.prepare(
    "UPDATE users SET email = ?, updated_at = ? WHERE id = ? AND auth_provider = 'clerk' AND auth_subject = ?"
  ).bind(clerkEmail, now, user.id, user.auth_subject).run();
  return { ...user, email: clerkEmail };
}

export async function resolveAuthenticatedUser(env, claims, accountDisplayName = "") {
  const verifiedDisplayName = validatedDisplayName(accountDisplayName);
  const existing = await env.NINA_MEMORY_DB.prepare(
    "SELECT id, auth_subject, email, display_name, role, memory_visitor_id FROM users WHERE auth_provider = 'clerk' AND auth_subject = ? LIMIT 1"
  ).bind(claims.sub).first();
  let clerkVerification = null;
  if (!existing || !normalizedClerkEmail(existing.email)) {
    try { clerkVerification = await getClerkEmailVerification(env, claims.sub); }
    catch { /* Authentication remains available when Clerk's user API is temporarily unavailable. */ }
  }
  if (existing) {
    const synchronized = clerkVerification?.email
      ? await synchronizeAuthenticatedUserEmail(env, existing, clerkVerification.email)
      : existing;
    if (existing.role === "user" && verifiedDisplayName && verifiedDisplayName !== existing.display_name) {
      const now = new Date().toISOString();
      await env.NINA_MEMORY_DB.batch([
        env.NINA_MEMORY_DB.prepare("UPDATE users SET display_name = ?, updated_at = ? WHERE id = ? AND role = 'user'")
          .bind(verifiedDisplayName, now, existing.id),
        env.NINA_MEMORY_DB.prepare("UPDATE visitors SET display_name = ?, updated_at = ? WHERE visitor_id = ?")
          .bind(verifiedDisplayName, now, existing.memory_visitor_id)
      ]);
      return { ...synchronized, display_name: verifiedDisplayName, clerk_email_verification: clerkVerification };
    }
    return { ...synchronized, clerk_email_verification: clerkVerification };
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const displayName = verifiedDisplayName || "Parallel Vision User";
  const email = normalizedClerkEmail(clerkVerification?.email) || null;
  try {
    await env.NINA_MEMORY_DB.batch([
      env.NINA_MEMORY_DB.prepare(
        "INSERT INTO visitors (visitor_id, display_name, profile_type, created_at, updated_at) VALUES (?, ?, 'visitor', ?, ?)"
      ).bind(id, displayName, now, now),
      env.NINA_MEMORY_DB.prepare(
        "INSERT INTO users (id, auth_provider, auth_subject, email, display_name, role, memory_visitor_id, created_at, updated_at) VALUES (?, 'clerk', ?, ?, ?, 'user', ?, ?, ?)"
      ).bind(id, claims.sub, email, displayName, id, now, now)
    ]);
  } catch {
    const concurrent = await env.NINA_MEMORY_DB.prepare(
      "SELECT id, auth_subject, email, display_name, role, memory_visitor_id FROM users WHERE auth_provider = 'clerk' AND auth_subject = ? LIMIT 1"
    ).bind(claims.sub).first();
    if (concurrent) {
      const synchronized = email ? await synchronizeAuthenticatedUserEmail(env, concurrent, email) : concurrent;
      return { ...synchronized, clerk_email_verification: clerkVerification };
    }
    throw new Error("Unable to create authenticated user");
  }
  return { id, auth_subject: claims.sub, email, display_name: displayName, role: "user", memory_visitor_id: id, clerk_email_verification: clerkVerification };
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

export function resolveOwnerMemoryVisitorId(user) {
  return user?.role === "owner" && typeof user.memory_visitor_id === "string" && user.memory_visitor_id
    ? user.memory_visitor_id
    : "";
}
