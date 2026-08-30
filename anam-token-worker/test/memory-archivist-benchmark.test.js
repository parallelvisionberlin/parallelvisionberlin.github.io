import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.js";

const encode = value => Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");

async function authFixture(origin) {
  const keys = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", keys.publicKey);
  jwk.kid = "archivist-benchmark-key";
  const issuer = "https://archivist-benchmark.clerk.accounts.dev";
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

function benchmarkDb(users, observedSql) {
  return {
    prepare(sql) {
      observedSql.push(sql);
      if (/\b(?:INSERT|UPDATE|DELETE|REPLACE)\b/i.test(sql)) throw new Error(`Mutation attempted: ${sql}`);
      return { bind(...values) {
        if (sql.includes("FROM users WHERE auth_provider")) return { first: async () => users[values[0]] || null };
        if (sql.includes("FROM memory_summaries")) return { first: async () => ({ summary: "", messages_summarized_through: "" }) };
        if (sql.includes("FROM messages")) return { all: async () => ({ results: [
          { message_id: "message-1", role: "user", content: "I am building the Parallel Vision archive.", created_at: "2026-08-30T12:00:00.000Z" },
          { message_id: "message-2", role: "persona", content: "Tell me more about the archive.", created_at: "2026-08-30T12:01:00.000Z" }
        ] }) };
        if (sql.includes("FROM open_threads")) return { all: async () => ({ results: [{ thread_id: "thread-1", content: "Continue discussing the archive." }] }) };
        if (sql.includes("FROM pinned_memories")) return { all: async () => ({ results: [{ memory_id: "pin-1", category: "preference", content: "Alejandro prefers concise answers." }] }) };
        throw new Error(`Unexpected SQL: ${sql}`);
      } };
    }
  };
}

test("owner-only archivist benchmark uses identical production input without D1 mutation", async () => {
  const origin = "http://127.0.0.1:4173";
  const auth = await authFixture(origin);
  const users = {
    user_owner: { id: "owner-user-id", display_name: "Alejandro", role: "owner", memory_visitor_id: "owner-memory-id" },
    user_member: { id: "member-user-id", display_name: "Member", role: "user", memory_visitor_id: "member-memory-id" }
  };
  const observedSql = [];
  const modelCalls = [];
  const env = {
    CLERK_ISSUER: auth.issuer,
    NINA_MEMORY_DB: benchmarkDb(users, observedSql),
    AI: { async run(model, options) {
      modelCalls.push({ model, options });
      return { response: JSON.stringify({
        summary: "Alejandro is building the Parallel Vision archive.",
        summary_items: [{ content: "Alejandro is building the Parallel Vision archive.", evidence_message_ids: ["message-1"] }],
        pinned_memories: [{ category: "project", content: "Alejandro is building the Parallel Vision archive.", decision: "NEW", evidence_message_ids: ["message-1"] }],
        open_threads: [], resolved_threads: []
      }) };
    } }
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    if (String(url).includes("/.well-known/jwks.json")) return new Response(JSON.stringify({ keys: [auth.jwk] }));
    throw new Error(`Unexpected fetch: ${url}`);
  };
  const request = token => worker.fetch(new Request("https://worker.example/api/nina/memory-archivist-benchmark", {
    headers: { Origin: origin, Authorization: `Bearer ${token}` }
  }), env, { waitUntil() {} });
  try {
    const member = await request(await auth.token("user_member"));
    assert.equal(member.status, 403);
    assert.equal(modelCalls.length, 0);

    const owner = await request(await auth.token("user_owner"));
    assert.equal(owner.status, 200);
    const result = await owner.json();
    assert.deepEqual(result.batch, { messageCount: 2, firstMessageId: "message-1", lastMessageId: "message-2" });
    assert.equal(result.current8B.filteredExtraction.pinned[0].category, "project");
    assert.equal(result.candidate70B.filteredExtraction.pinned[0].category, "project");
    assert.deepEqual(modelCalls.map(call => call.model), [
      "@cf/meta/llama-3.1-8b-instruct-fp8-fast",
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    ]);
    assert.deepEqual(modelCalls[0].options, modelCalls[1].options);
    assert.ok(observedSql.every(sql => !/\b(?:INSERT|UPDATE|DELETE|REPLACE)\b/i.test(sql)));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
