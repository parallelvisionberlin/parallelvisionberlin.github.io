import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import worker from "../src/index.js";
import { deleteUserAccountData } from "../src/account.js";

function deletionDb() {
  const state = {
    users: [
      { id: "user-a", auth_subject: "user_delete1", role: "user", memory_visitor_id: "visitor-a", referred_by_user_id: null, display_name: "A" },
      { id: "user-b", auth_subject: "user_other1", role: "user", memory_visitor_id: "visitor-b", referred_by_user_id: "user-a", display_name: "B" },
      { id: "owner", auth_subject: "user_owner1", role: "owner", memory_visitor_id: "visitor-owner", referred_by_user_id: null, display_name: "Alejandro" }
    ],
    visitors: new Set(["visitor-a", "visitor-b", "visitor-owner"]),
    conversations: [{ id: "conversation-a", visitor_id: "visitor-a" }, { id: "conversation-b", visitor_id: "visitor-b" }],
    messages: [{ id: "message-a", visitor_id: "visitor-a" }, { id: "message-b", visitor_id: "visitor-b" }],
    summaries: new Set(["visitor-a", "visitor-b"]), pins: new Set(["visitor-a", "visitor-b"]), threads: new Set(["visitor-a", "visitor-b"]),
    relationships: new Set(["user-a", "user-b"]), preferences: new Set(["user-a", "user-b"]),
    creditAccounts: new Set(["user-a", "user-b"]), creditTransactions: [{ user_id: "user-a" }, { user_id: "user-b" }],
    liveSessions: [{ user_id: "user-a" }, { user_id: "user-b" }],
    purchases: [
      { id: "paid-a", user_id: "user-a", status: "paid", pack_id: "signal_30", credits: 30, stripe_price_id: "price-a", stripe_checkout_session_id: "cs-a", stripe_payment_intent_id: "pi-a", currency: "eur", amount_total: 300, created_at: "2026-08-01", updated_at: "2026-08-01", paid_at: "2026-08-01" },
      { id: "open-a", user_id: "user-a", status: "open" },
      { id: "paid-b", user_id: "user-b", status: "paid" }
    ],
    retained: []
  };
  const remove = (array, predicate) => array.filter(item => !predicate(item));
  return {
    state,
    prepare(sql) {
      const query = sql.replace(/\s+/g, " ").trim();
      let values = [];
      return {
        bind(...bound) { values = bound; return this; },
        async first() {
          if (query.startsWith("SELECT id FROM users WHERE id = ?")) {
            return state.users.find(user => user.id === values[0] && user.auth_subject === values[1] && user.memory_visitor_id === values[2] && user.role === "user") || null;
          }
          if (query.includes("FROM users WHERE auth_provider = 'clerk' AND auth_subject = ?")) {
            return state.users.find(user => user.auth_subject === values[0]) || null;
          }
          throw new Error(`Unexpected first: ${query}`);
        },
        async run() {
          const id = values[0];
          if (query.startsWith("INSERT OR IGNORE INTO retained_signal_credit_purchases")) {
            for (const purchase of state.purchases.filter(row => row.user_id === id && row.status === "paid")) {
              if (!state.retained.some(row => row.purchase_id === purchase.id)) state.retained.push({ purchase_id: purchase.id, amount_total: purchase.amount_total, user_id: undefined });
            }
          } else if (query.startsWith("UPDATE users SET referred_by_user_id = NULL")) {
            state.users.forEach(user => { if (user.referred_by_user_id === id) user.referred_by_user_id = null; });
          } else if (query.startsWith("DELETE FROM signal_credit_purchases")) state.purchases = remove(state.purchases, row => row.user_id === id);
          else if (query.startsWith("DELETE FROM live_nina_sessions")) state.liveSessions = remove(state.liveSessions, row => row.user_id === id);
          else if (query.startsWith("DELETE FROM nina_relationship_states")) state.relationships.delete(id);
          else if (query.startsWith("DELETE FROM account_preferences")) state.preferences.delete(id);
          else if (query.startsWith("DELETE FROM signal_credit_transactions")) state.creditTransactions = remove(state.creditTransactions, row => row.user_id === id);
          else if (query.startsWith("DELETE FROM signal_credit_accounts")) state.creditAccounts.delete(id);
          else if (query.startsWith("DELETE FROM messages")) state.messages = remove(state.messages, row => row.visitor_id === id);
          else if (query.startsWith("DELETE FROM conversations")) { state.conversations = remove(state.conversations, row => row.visitor_id === id); state.messages = remove(state.messages, row => row.visitor_id === id); }
          else if (query.startsWith("DELETE FROM memory_summaries")) state.summaries.delete(id);
          else if (query.startsWith("DELETE FROM pinned_memories")) state.pins.delete(id);
          else if (query.startsWith("DELETE FROM open_threads")) state.threads.delete(id);
          else if (query.startsWith("DELETE FROM users")) state.users = remove(state.users, user => user.id === id && user.auth_subject === values[1] && user.role === "user");
          else if (query.startsWith("DELETE FROM visitors")) state.visitors.delete(id);
          else throw new Error(`Unexpected run: ${query}`);
          return { meta: { changes: 1 } };
        }
      };
    },
    async batch(statements) { for (const statement of statements) await statement.run(); }
  };
}

const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
async function authFixture(origin) {
  const keys = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", keys.publicKey); jwk.kid = "account-deletion-key";
  const issuer = "https://account-deletion.clerk.accounts.dev";
  return { issuer, jwk, async token(subject) { const now = Math.floor(Date.now() / 1000), header = encode({ alg: "RS256", kid: jwk.kid }), payload = encode({ iss: issuer, sub: subject, azp: origin, iat: now, nbf: now, exp: now + 300 }), input = `${header}.${payload}`, signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, new TextEncoder().encode(input)); return `${input}.${Buffer.from(signature).toString("base64url")}`; } };
}

test("local account deletion removes only the user's application data and anonymizes paid purchases", async () => {
  const db = deletionDb();
  const user = { ...db.state.users[0], auth_subject: "user_delete1" };
  await deleteUserAccountData({ NINA_MEMORY_DB: db }, user);
  assert.equal(db.state.users.some(row => row.id === "user-a"), false);
  assert.equal(db.state.visitors.has("visitor-a"), false);
  assert.equal(db.state.conversations.some(row => row.visitor_id === "visitor-a"), false);
  assert.equal(db.state.messages.some(row => row.visitor_id === "visitor-a"), false);
  for (const collection of [db.state.summaries, db.state.pins, db.state.threads]) assert.equal(collection.has("visitor-a"), false);
  for (const collection of [db.state.relationships, db.state.preferences, db.state.creditAccounts]) assert.equal(collection.has("user-a"), false);
  assert.equal(db.state.creditTransactions.some(row => row.user_id === "user-a"), false);
  assert.equal(db.state.liveSessions.some(row => row.user_id === "user-a"), false);
  assert.equal(db.state.purchases.some(row => row.user_id === "user-a"), false);
  assert.deepEqual(db.state.retained, [{ purchase_id: "paid-a", amount_total: 300, user_id: undefined }]);
  assert.equal(db.state.users.find(row => row.id === "user-b").referred_by_user_id, null);
  assert.equal(db.state.users.some(row => row.id === "user-b"), true);
  assert.equal(db.state.messages.some(row => row.visitor_id === "visitor-b"), true);
  assert.equal(db.state.purchases.some(row => row.user_id === "user-b"), true);
  await assert.rejects(() => deleteUserAccountData({ NINA_MEMORY_DB: db }, { id: "user-b", role: "user", memory_visitor_id: "visitor-b", auth_subject: "user_delete1" }), /account_identity_mismatch/);
  await assert.rejects(() => deleteUserAccountData({ NINA_MEMORY_DB: db }, { id: "owner", role: "owner", memory_visitor_id: "visitor-owner", auth_subject: "user_owner1" }), /account_deletion_forbidden/);
});

test("account deletion endpoint authenticates, protects owner, and deletes the authenticated Clerk subject", async () => {
  const origin = "http://127.0.0.1:4173", auth = await authFixture(origin), db = deletionDb(), clerkRequests = [];
  let deleteFails = true;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).endsWith("/.well-known/jwks.json")) return new Response(JSON.stringify({ keys: [auth.jwk] }));
    if (String(url).startsWith("https://api.clerk.com/v1/users/")) {
      const method = options.method || "GET";
      clerkRequests.push({ url: String(url), method, authorization: options.headers.Authorization });
      if (method === "DELETE" && deleteFails) return new Response(JSON.stringify({ error: "temporary" }), { status: 503 });
      return new Response(JSON.stringify(method === "GET" ? { id: "user_delete1" } : { deleted: true }));
    }
    throw new Error(`Unexpected URL: ${url}`);
  };
  const env = { NINA_MEMORY_DB: db, CLERK_ISSUER: auth.issuer, CLERK_SECRET_KEY: "clerk-secret" };
  const request = (token, confirmation = "DELETE") => worker.fetch(new Request("https://worker.example/api/account", { method: "DELETE", headers: { Origin: origin, "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ confirmation }) }), env, { waitUntil() {} });
  try {
    assert.equal((await request("")).status, 401);
    assert.equal((await request(await auth.token("user_owner1"))).status, 403);
    assert.equal((await request(await auth.token("user_delete1"), "delete")).status, 400);
    const failed = await request(await auth.token("user_delete1"));
    assert.equal(failed.status, 502);
    assert.equal(db.state.users.some(row => row.id === "user-a"), true);
    assert.equal(db.state.messages.some(row => row.visitor_id === "visitor-a"), true);
    deleteFails = false;
    const response = await request(await auth.token("user_delete1"));
    assert.equal(response.status, 200); assert.deepEqual(await response.json(), { deleted: true });
    assert.deepEqual(clerkRequests.map(request => request.method), ["GET", "DELETE", "GET", "DELETE"]);
    assert.equal(clerkRequests.every(request => request.url === "https://api.clerk.com/v1/users/user_delete1" && request.authorization === "Bearer clerk-secret"), true);
    assert.equal(db.state.users.some(row => row.id === "user-a"), false);
    assert.equal(db.state.users.some(row => row.id === "owner"), true);
  } finally { globalThis.fetch = originalFetch; }
});

test("account deletion UI requires DELETE, hides owner access, signs out, clears scoped Nina storage and returns home", async () => {
  const [page, frontend, migration] = await Promise.all([
    readFile(new URL("../../account.html", import.meta.url), "utf8"),
    readFile(new URL("../../js/account.js", import.meta.url), "utf8"),
    readFile(new URL("../migrations/0009_account_deletion_retention.sql", import.meta.url), "utf8")
  ]);
  assert.match(page, /Permanently delete your Parallel Vision account, Nina memory and associated data\./);
  assert.match(page, /id="accountDeleteConfirmation"/);
  assert.match(page, /id="accountDeleteFinal"[^>]*disabled/);
  assert.match(frontend, /deleteAccountFinal\.disabled=elements\.deleteAccountInput\.value!=="DELETE"/);
  assert.match(frontend, /body:JSON\.stringify\(\{confirmation:"DELETE"\}\)/);
  assert.match(frontend, /elements\.deleteAccountSection\.hidden=!deletable/);
  assert.match(frontend, /await clerk\?\.signOut\(\)/);
  assert.match(frontend, /clearDeletedAccountStorage\(\)/);
  assert.match(frontend, /location\.href="\.\/index\.html"/);
  assert.match(frontend, /"Account deleted\."/);
  assert.match(migration, /CREATE TABLE retained_signal_credit_purchases/);
  assert.doesNotMatch(migration, /user_id/);
});
