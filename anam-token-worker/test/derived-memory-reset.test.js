import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.js";

const encode = value => Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");

async function authFixture(origin) {
  const keys = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", keys.publicKey);
  jwk.kid = "derived-reset-key";
  const issuer = "https://derived-reset.clerk.accounts.dev";
  return { issuer, jwk, async token(subject) {
    const header = encode({ alg: "RS256", typ: "JWT", kid: jwk.kid });
    const now = Math.floor(Date.now() / 1000);
    const payload = encode({ iss: issuer, sub: subject, azp: origin, iat: now, nbf: now, exp: now + 300 });
    const input = `${header}.${payload}`;
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, new TextEncoder().encode(input));
    return `${input}.${Buffer.from(signature).toString("base64url")}`;
  } };
}

function resetDb(users) {
  const state = {
    derived: { "actual-owner-memory": { pinnedMemories: 2, summaries: 1, openThreads: 3 }, "wrong-profile-owner": { pinnedMemories: 9, summaries: 9, openThreads: 9 } },
    messages: 60, conversations: 4, relationships: 1, visitors: 2, users: 2,
    deletes: []
  };
  return { state,
    prepare(sql) { return { bind(...values) {
      if (sql.includes("FROM users WHERE auth_provider")) return { first: async () => users[values[0]] || null };
      if (sql.includes("SELECT COUNT(*) FROM pinned_memories")) return { first: async () => ({ ...(state.derived[values[0]] || {}) }) };
      if (sql.startsWith("DELETE FROM")) return { sql, values };
      throw new Error(`Unexpected SQL: ${sql}`);
    } }; },
    async batch(statements) {
      for (const statement of statements) {
        const table = statement.sql.match(/DELETE FROM (\w+)/)?.[1];
        const visitorId = statement.values[0];
        state.deletes.push([table, visitorId]);
        const row = state.derived[visitorId];
        if (row && table === "pinned_memories") row.pinnedMemories = 0;
        if (row && table === "memory_summaries") row.summaries = 0;
        if (row && table === "open_threads") row.openThreads = 0;
      }
      return [];
    }
  };
}

test("owner derived-memory reset uses users.memory_visitor_id and preserves raw and relationship data", async () => {
  const origin = "http://127.0.0.1:4173";
  const auth = await authFixture(origin);
  const users = {
    user_owner: { id: "owner-user", role: "owner", display_name: "Alejandro", memory_visitor_id: "actual-owner-memory" },
    user_member: { id: "member-user", role: "user", display_name: "Member", memory_visitor_id: "member-memory" }
  };
  const db = resetDb(users);
  const env = { CLERK_ISSUER: auth.issuer, NINA_MEMORY_DB: db };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => String(url).includes("/.well-known/jwks.json")
    ? new Response(JSON.stringify({ keys: [auth.jwk] })) : Promise.reject(new Error(`Unexpected fetch: ${url}`));
  const request = token => worker.fetch(new Request("https://worker.example/api/nina/reset-derived-memory", {
    method: "POST", headers: { Origin: origin, Authorization: `Bearer ${token}` }
  }), env, { waitUntil() {} });
  try {
    assert.equal((await request(await auth.token("user_member"))).status, 403);
    const response = await request(await auth.token("user_owner"));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      memoryVisitorId: "actual-owner-memory",
      before: { pinnedMemories: 2, summaries: 1, openThreads: 3 },
      after: { pinnedMemories: 0, summaries: 0, openThreads: 0 }
    });
    assert.deepEqual(db.state.deletes, [
      ["pinned_memories", "actual-owner-memory"],
      ["memory_summaries", "actual-owner-memory"],
      ["open_threads", "actual-owner-memory"]
    ]);
    assert.deepEqual(db.state.derived["wrong-profile-owner"], { pinnedMemories: 9, summaries: 9, openThreads: 9 });
    assert.deepEqual([db.state.messages, db.state.conversations, db.state.relationships, db.state.visitors, db.state.users], [60, 4, 1, 2, 2]);
  } finally { globalThis.fetch = originalFetch; }
});
