import assert from "node:assert/strict";
import test from "node:test";
import { asMemoryIdentity, getClerkEmailVerification, resolveAuthenticatedUser, synchronizeAuthenticatedUserEmail, verifyClerkSessionToken } from "../src/auth.js";

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
    const parts = token.split(".");
    parts[2] = `${parts[2][0] === "A" ? "B" : "A"}${parts[2].slice(1)}`;
    assert.equal(await verifyClerkSessionToken({ CLERK_ISSUER: claims.iss }, parts.join("."), origin), null);
  } finally { globalThis.fetch = originalFetch; }
});

test("the same Clerk subject resolves to one permanent internal user and D1 controls the role", async () => {
  let user = null;
  const db = {
    prepare(sql) {
      return {
        bind(...values) {
          if (sql.includes("FROM users WHERE auth_provider = 'clerk'")) return { first: async () => user?.auth_subject === values[0] ? user : null };
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

test("a verified account name updates normal users but never overwrites the owner", async () => {
  const updates = [];
  let user = { id: "internal-user", auth_subject: "user_normal", display_name: "Parallel Vision User", role: "user", memory_visitor_id: "memory-user" };
  const db = {
    prepare(sql) {
      return {
        bind(...values) {
          if (sql.includes("FROM users WHERE auth_provider = 'clerk'")) return { first: async () => user };
          if (sql.startsWith("UPDATE users SET display_name")) return { run: async () => { updates.push(["users", ...values]); user = { ...user, display_name: values[0] }; } };
          if (sql.startsWith("UPDATE visitors SET display_name")) return { run: async () => { updates.push(["visitors", ...values]); } };
          throw new Error(`Unexpected SQL: ${sql}`);
        }
      };
    },
    async batch(statements) { await Promise.all(statements.map(statement => statement.run())); }
  };
  const normal = await resolveAuthenticatedUser({ NINA_MEMORY_DB: db }, { sub: "user_normal" }, "  Zoë <Admin>  ");
  assert.equal(normal.display_name, "Zoë Admin");
  assert.equal(updates.length, 2);

  user = { ...user, display_name: "Alejandro", role: "owner" };
  updates.length = 0;
  const owner = await resolveAuthenticatedUser({ NINA_MEMORY_DB: db }, { sub: "user_normal" }, "Someone Else");
  assert.equal(owner.display_name, "Alejandro");
  assert.equal(updates.length, 0);
});

test("email verification is read from Clerk's primary backend email object, not JWT claims", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({
      primary_email_address_id: "idn_primary",
      email_addresses: [
        { id: "idn_other", email_address: "other@example.com", verification: { status: "verified" } },
        { id: "idn_primary", email_address: "member@example.com", verification: { status: "unverified" } }
      ]
    }), { status: 200 });
  };
  try {
    const result = await getClerkEmailVerification({ CLERK_SECRET_KEY: "clerk-secret" }, "user_member1");
    assert.deepEqual(result, { verified: false, email: "member@example.com" });
    assert.equal(requests[0].url, "https://api.clerk.com/v1/users/user_member1");
    assert.equal(requests[0].options.headers.Authorization, "Bearer clerk-secret");
  } finally { globalThis.fetch = originalFetch; }
});

function emailSyncDb(initialUser = null) {
  let user = initialUser ? { ...initialUser } : null;
  const updates = [];
  return {
    get user() { return user; },
    updates,
    prepare(sql) {
      let values = [];
      return {
        bind(...bound) { values = bound; return this; },
        async first() {
          if (sql.includes("FROM users WHERE auth_provider = 'clerk'")) return user?.auth_subject === values[0] ? { ...user } : null;
          throw new Error(`Unexpected first: ${sql}`);
        },
        async run() {
          if (sql.includes("INSERT INTO visitors")) return {};
          if (sql.includes("INSERT INTO users")) {
            user = { id: values[0], auth_subject: values[1], email: values[2], display_name: values[3], role: "user", memory_visitor_id: values[4] };
            return {};
          }
          if (sql.startsWith("UPDATE users SET email")) {
            updates.push(values[0]);
            if (user?.id === values[2] && user.auth_subject === values[3]) user = { ...user, email: values[0] };
            return {};
          }
          throw new Error(`Unexpected run: ${sql}`);
        }
      };
    },
    async batch(statements) { await Promise.all(statements.map(statement => statement.run())); }
  };
}

const clerkUserResponse = email => new Response(JSON.stringify({
  primary_email_address_id: "idn_primary",
  email_addresses: [{ id: "idn_primary", email_address: email, verification: { status: "verified" } }]
}), { status: 200 });

test("authenticated Clerk email synchronization persists, backfills and safely updates primary email", async t => {
  const originalFetch = globalThis.fetch;
  try {
    await t.test("new users persist Clerk's primary email", async () => {
      const db = emailSyncDb();
      globalThis.fetch = async () => clerkUserResponse("New.Member@Example.com");
      const user = await resolveAuthenticatedUser({ NINA_MEMORY_DB: db, CLERK_SECRET_KEY: "clerk-secret" }, { sub: "user_newmember" });
      assert.equal(user.email, "new.member@example.com");
      assert.equal(db.user.email, "new.member@example.com");
    });

    await t.test("existing NULL emails backfill without creating a duplicate user", async () => {
      const existing = { id: "existing-1", auth_subject: "user_existing", email: null, display_name: "Existing", role: "user", memory_visitor_id: "memory-1" };
      const db = emailSyncDb(existing);
      globalThis.fetch = async () => clerkUserResponse("existing@example.com");
      const user = await resolveAuthenticatedUser({ NINA_MEMORY_DB: db, CLERK_SECRET_KEY: "clerk-secret" }, { sub: "user_existing" });
      assert.equal(user.id, existing.id);
      assert.equal(user.email, "existing@example.com");
      assert.deepEqual(db.updates, ["existing@example.com"]);
    });

    await t.test("a later Clerk primary-email change updates the same D1 user", async () => {
      const existing = { id: "existing-2", auth_subject: "user_changed", email: "old@example.com", display_name: "Existing", role: "user", memory_visitor_id: "memory-2" };
      const db = emailSyncDb(existing);
      const user = await synchronizeAuthenticatedUserEmail({ NINA_MEMORY_DB: db }, existing, "New@Example.com");
      assert.equal(user.id, existing.id);
      assert.equal(user.email, "new@example.com");
      assert.equal(db.user.email, "new@example.com");
    });

    await t.test("Clerk lookup failure leaves an existing user unchanged", async () => {
      const existing = { id: "existing-3", auth_subject: "user_unavailable", email: null, display_name: "Existing", role: "user", memory_visitor_id: "memory-3" };
      const db = emailSyncDb(existing);
      globalThis.fetch = async () => { throw new Error("Clerk unavailable"); };
      const user = await resolveAuthenticatedUser({ NINA_MEMORY_DB: db, CLERK_SECRET_KEY: "clerk-secret" }, { sub: "user_unavailable" });
      assert.equal(user.id, existing.id);
      assert.equal(user.email, null);
      assert.equal(db.updates.length, 0);
    });
  } finally { globalThis.fetch = originalFetch; }
});
