import assert from "node:assert/strict";
import test from "node:test";
import { asMemoryIdentity, resolveAuthenticatedUser, verifyClerkSessionToken } from "../src/auth.js";

const encode = value => Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");

async function signedToken(subject, origin) {
  const keys = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", keys.publicKey);
  jwk.kid = "development-key";
  const header = encode({ alg: "RS256", typ: "JWT", kid: jwk.kid });
  const now = Math.floor(Date.now() / 1000);
  const payload = encode({ iss: "https://climbing-wombat-2717.clerk.accounts.dev", sub: subject, azp: origin, iat: now, nbf: now, exp: now + 300 });
  const input = `${header}.${payload}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, new TextEncoder().encode(input));
  return { token: `${input}.${Buffer.from(signature).toString("base64url")}`, jwk };
}

test("Worker verifies a Clerk session and rejects a changed signature", async () => {
  const origin = "http://127.0.0.1:4173";
  const { token, jwk } = await signedToken("user_alejandro", origin);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
  try {
    const claims = await verifyClerkSessionToken({ CLERK_ISSUER: "https://climbing-wombat-2717.clerk.accounts.dev" }, token, origin);
    assert.equal(claims.sub, "user_alejandro");
    assert.equal(await verifyClerkSessionToken({ CLERK_ISSUER: claims.iss }, `${token.slice(0, -1)}x`, origin), null);
  } finally { globalThis.fetch = originalFetch; }
});

test("the same Clerk subject resolves to one permanent internal user and D1 controls the role", async () => {
  let user = null;
  const db = {
    prepare(sql) {
      return {
        bind(...values) {
          if (sql.includes("SELECT id, display_name")) return { first: async () => user?.auth_subject === values[0] ? user : null };
          if (sql.includes("INSERT INTO visitors")) return { run: async () => ({}) };
          if (sql.includes("INSERT INTO users")) return { run: async () => ({}) };
          throw new Error(`Unexpected SQL: ${sql}`);
        }
      };
    },
    async batch(statements) { await Promise.all(statements.map(statement => statement.run())); }
  };
  const env = { NINA_MEMORY_DB: db };
  const first = await resolveAuthenticatedUser(env, { sub: "user_alejandro" });
  user = { id: first.id, auth_subject: "user_alejandro", display_name: "Alejandro", role: "owner", memory_visitor_id: first.id };
  const second = await resolveAuthenticatedUser(env, { sub: "user_alejandro" });
  assert.equal(first.id, second.id);
  assert.equal(asMemoryIdentity(second).role, "owner");
  assert.equal(asMemoryIdentity(second).visitor_id, first.id);
});
