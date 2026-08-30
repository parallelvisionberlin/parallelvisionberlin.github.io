import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.js";

const encode = value => Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");

async function authFixture(origin) {
  const keys = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", keys.publicKey);
  jwk.kid = "memory-diagnostic-key";
  const issuer = "https://memory-diagnostic.clerk.accounts.dev";
  return {
    issuer, jwk,
    async token(subject) {
      const header = encode({ alg: "RS256", typ: "JWT", kid: jwk.kid });
      const now = Math.floor(Date.now() / 1000);
      const payload = encode({ iss: issuer, sub: subject, azp: origin, iat: now, nbf: now, exp: now + 300 });
      const input = `${header}.${payload}`;
      const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, new TextEncoder().encode(input));
      return `${input}.${Buffer.from(signature).toString("base64url")}`;
    }
  };
}

function diagnosticDb(users) {
  const recent = [
    { conversation_id: "conversation-1", message_id: "message-meta", role: "persona", content: "I'm an AI system.", created_at: "2026-08-30T11:01:00.000Z" },
    { conversation_id: "conversation-1", message_id: "message-ai", role: "user", content: "You're an AI running on a website.", created_at: "2026-08-30T11:00:00.000Z" }
  ];
  return {
    prepare(sql) {
      return { bind(...values) {
        if (sql.includes("FROM users WHERE auth_provider")) return { first: async () => users[values[0]] || null };
        if (sql.includes("SELECT COUNT(*) FROM messages")) return { first: async () => ({ messages: 2, conversations: 1, pinnedMemories: 1, openThreads: 1 }) };
        if (sql.includes("FROM messages")) return { all: async () => ({ results: recent }) };
        if (sql.includes("FROM pinned_memories")) return { all: async () => ({ results: [{ memory_id: "pin-1", category: "project", content: "Alejandro is building Parallel Vision.", created_at: "2026-08-30T10:00:00.000Z", updated_at: "2026-08-30T11:00:00.000Z" }] }) };
        if (sql.includes("FROM memory_summaries")) return { first: async () => ({ summary: "Alejandro is building Parallel Vision.", updated_at: "2026-08-30T11:00:00.000Z", messages_summarized_through: "message-meta" }) };
        if (sql.includes("FROM open_threads")) return { all: async () => ({ results: [{ thread_id: "thread-1", content: "Continue the archive plan.", status: "active", created_at: "2026-08-30T10:00:00.000Z", updated_at: "2026-08-30T11:00:00.000Z" }] }) };
        if (sql.includes("FROM nina_relationship_states")) return { first: async () => ({ state_json: '{"trust":"moderate"}', relationship_summary: "Measured trust.", created_at: "2026-08-30T10:00:00.000Z", updated_at: "2026-08-30T11:00:00.000Z", last_evaluated_at: "2026-08-30T11:00:00.000Z" }) };
        throw new Error(`Unexpected SQL: ${sql}`);
      } };
    }
  };
}

test("memory diagnostic is authenticated-owner-only and marks only Nina meta breaks", async () => {
  const origin = "http://127.0.0.1:4173";
  const auth = await authFixture(origin);
  const users = {
    user_owner: { id: "owner-user-id", display_name: "Alejandro", role: "owner", memory_visitor_id: "owner-memory-id" },
    user_member: { id: "member-user-id", display_name: "Member", role: "user", memory_visitor_id: "member-memory-id" }
  };
  const env = { CLERK_ISSUER: auth.issuer, NINA_MEMORY_DB: diagnosticDb(users) };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    if (String(url).includes("/.well-known/jwks.json")) return new Response(JSON.stringify({ keys: [auth.jwk] }));
    throw new Error(`Unexpected fetch: ${url}`);
  };
  const request = token => worker.fetch(new Request("https://worker.example/api/nina/memory-diagnostic", {
    headers: { Origin: origin, ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }), env, { waitUntil() {} });
  try {
    const unauthenticated = await request("");
    assert.equal(unauthenticated.status, 401);

    const member = await request(await auth.token("user_member"));
    assert.equal(member.status, 403);
    assert.equal((await member.json()).code, "owner_required");

    const owner = await request(await auth.token("user_owner"));
    assert.equal(owner.status, 200);
    const diagnostic = await owner.json();
    assert.equal(diagnostic.memoryVisitorId, "owner-memory-id");
    assert.deepEqual(diagnostic.recentMessages.map(message => [message.message_id, message.metaBreakFiltered]), [
      ["message-ai", false],
      ["message-meta", true]
    ]);
    assert.equal(diagnostic.pinnedMemories[0].memory_id, "pin-1");
    assert.equal(diagnostic.summary.messages_summarized_through, "message-meta");
    assert.equal(diagnostic.openThreads[0].thread_id, "thread-1");
    assert.deepEqual(diagnostic.relationship.state_json, { trust: "moderate" });
    assert.deepEqual(diagnostic.counts, { messages: 2, conversations: 1, pinnedMemories: 1, openThreads: 1 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
