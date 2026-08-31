import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import worker from "../src/index.js";
import {
  SignalCreditError, creditSignalCredits, debitSignalCredits,
  ensureVerifiedSignupTrial, getSignalCreditBalance, getSignalCreditHistory
} from "../src/credits.js";

function creditDb(users = []) {
  const accounts = new Map();
  const transactions = [];
  return {
    accounts, transactions,
    prepare(sql) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      let values = [];
      return {
        bind(...bound) { values = bound; return this; },
        async run() {
          if (normalized.startsWith("INSERT OR IGNORE INTO signal_credit_accounts")) {
            if (!accounts.has(values[0])) accounts.set(values[0], { balance: 0, lifetime_credited: 0, lifetime_debited: 0, updated_at: values[2] });
            return { meta: { changes: 1 } };
          }
          if (normalized.startsWith("INSERT INTO signal_credit_transactions")) {
            const [id, userId, amount, type, source, referenceId, description, createdAt] = values;
            if (transactions.some(row => row.user_id === userId && row.reference_id === referenceId)) throw new Error("UNIQUE constraint failed");
            const account = accounts.get(userId);
            if (account.balance + amount < 0) throw new Error("insufficient_signal_credits");
            transactions.push({ id, user_id: userId, amount, type, source, reference_id: referenceId, description, created_at: createdAt });
            account.balance += amount;
            account.lifetime_credited += amount > 0 ? amount : 0;
            account.lifetime_debited += amount < 0 ? -amount : 0;
            account.updated_at = createdAt;
            return { meta: { changes: 1 } };
          }
          throw new Error(`Unexpected run: ${normalized}`);
        },
        async first() {
          if (normalized.includes("FROM users WHERE auth_provider = 'clerk' AND auth_subject = ?")) {
            return users.find(user => user.auth_subject === values[0]) || null;
          }
          if (normalized.includes("FROM users WHERE email = ? COLLATE NOCASE")) {
            return users.find(user => String(user.email || "").toLowerCase() === String(values[0]).toLowerCase()) || null;
          }
          if (normalized.includes("FROM signal_credit_accounts")) return accounts.get(values[0]) || null;
          if (normalized.includes("FROM signal_credit_transactions")) {
            return transactions.find(row => row.user_id === values[0] && row.reference_id === values[1]) || null;
          }
          throw new Error(`Unexpected first: ${normalized}`);
        },
        async all() {
          if (!normalized.includes("FROM signal_credit_transactions")) throw new Error(`Unexpected all: ${normalized}`);
          const [userId, limit, offset] = values;
          const results = transactions.filter(row => row.user_id === userId)
            .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))
            .slice(offset, offset + limit);
          return { results };
        }
      };
    }
  };
}

const encode = value => Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");

async function clerkAuthFixture(origin) {
  const keys = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", keys.publicKey);
  jwk.kid = "credit-grant-key";
  const issuer = "https://credit-grants.clerk.accounts.dev";
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

function grantUsers() {
  return [
    { id: "owner-1", auth_subject: "user_owner1", email: "owner@example.com", display_name: "Alejandro", role: "owner", memory_visitor_id: "owner-memory" },
    { id: "member-1", auth_subject: "user_member1", email: "santomolinari@gmail.com", display_name: "Santo", role: "user", memory_visitor_id: "member-memory" }
  ];
}

async function grantRequest(env, token, body) {
  return worker.fetch(new Request("https://worker.example/api/signal-credits/grant", {
    method: "POST",
    headers: {
      Origin: "http://127.0.0.1:4173",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  }), env, { waitUntil() {} });
}

test("an authenticated user starts with exactly one zero-balance account", async () => {
  const db = creditDb();
  const env = { NINA_MEMORY_DB: db };
  assert.equal((await getSignalCreditBalance(env, "user-1")).balance, 0);
  assert.equal((await getSignalCreditBalance(env, "user-1")).balance, 0);
  assert.equal(db.accounts.size, 1);
});

test("credits, debits and history preserve signed ledger totals", async () => {
  const env = { NINA_MEMORY_DB: creditDb() };
  await creditSignalCredits(env, "user-1", 12, { source: "manual_test", referenceId: "test-credit-1", description: "Test allocation" });
  await debitSignalCredits(env, "user-1", 5, { source: "internal_test", referenceId: "test-debit-1", description: "Test debit" });
  const account = await getSignalCreditBalance(env, "user-1");
  assert.deepEqual({ balance: account.balance, credited: account.lifetimeCredited, debited: account.lifetimeDebited }, { balance: 7, credited: 12, debited: 5 });
  const history = await getSignalCreditHistory(env, "user-1", { limit: 1 });
  assert.equal(history.transactions.length, 1);
  assert.equal(history.nextOffset, 1);
});

test("a repeated reference is idempotent and a conflicting reuse is rejected", async () => {
  const env = { NINA_MEMORY_DB: creditDb() };
  const options = { source: "manual_test", referenceId: "stable-reference" };
  assert.equal((await creditSignalCredits(env, "user-1", 9, options)).idempotent, false);
  assert.equal((await creditSignalCredits(env, "user-1", 9, options)).idempotent, true);
  assert.equal((await getSignalCreditBalance(env, "user-1")).balance, 9);
  await assert.rejects(() => creditSignalCredits(env, "user-1", 10, options), error => error instanceof SignalCreditError && error.code === "reference_conflict");
});

test("debits cannot create a negative balance", async () => {
  const env = { NINA_MEMORY_DB: creditDb() };
  await assert.rejects(
    () => debitSignalCredits(env, "user-1", 1, { source: "internal_test", referenceId: "overdraft" }),
    error => error instanceof SignalCreditError && error.code === "insufficient_credits"
  );
  assert.equal((await getSignalCreditBalance(env, "user-1")).balance, 0);
});

test("verified signup trial uses the permanent credit ledger exactly once", async t => {
  const originalFetch = globalThis.fetch;
  let verified = true;
  globalThis.fetch = async url => {
    if (!String(url).startsWith("https://api.clerk.com/v1/users/")) throw new Error(`Unexpected URL: ${url}`);
    return new Response(JSON.stringify({
      primary_email_address_id: "idn_primary",
      email_addresses: [{ id: "idn_primary", email_address: "member@example.com", verification: { status: verified ? "verified" : "unverified" } }]
    }), { status: 200 });
  };
  const envFor = db => ({ NINA_MEMORY_DB: db, CLERK_SECRET_KEY: "clerk-secret" });
  const user = { id: "member-trial", role: "user" };
  try {
    await t.test("verified user gets 30 once, even across concurrent retries", async () => {
      const db = creditDb();
      const env = envFor(db);
      const [first, second] = await Promise.all([
        ensureVerifiedSignupTrial(env, user, "user_member1"),
        ensureVerifiedSignupTrial(env, user, "user_member1")
      ]);
      assert.equal(first.granted || second.granted, true);
      assert.equal(db.accounts.get(user.id).balance, 30);
      assert.equal(db.transactions.length, 1);
      assert.deepEqual(db.transactions[0], {
        id: db.transactions[0].id, user_id: user.id, amount: 30, type: "credit", source: "signup_trial",
        reference_id: `signup-trial:${user.id}`, description: "Verified account Live Nina trial", created_at: db.transactions[0].created_at
      });
    });

    await t.test("spending the trial does not make it renewable", async () => {
      const db = creditDb();
      const env = envFor(db);
      await ensureVerifiedSignupTrial(env, user, "user_member1");
      await debitSignalCredits(env, user.id, 30, { source: "live_nina", referenceId: "spent-trial" });
      const repeated = await ensureVerifiedSignupTrial(env, user, "user_member1");
      assert.equal(repeated.granted, false);
      assert.equal(repeated.account.balance, 0);
      assert.equal(db.transactions.filter(row => row.source === "signup_trial").length, 1);
    });

    await t.test("purchased credits are preserved alongside the trial", async () => {
      const db = creditDb();
      const env = envFor(db);
      await creditSignalCredits(env, user.id, 100, { source: "stripe_purchase", referenceId: "purchase-1" });
      await ensureVerifiedSignupTrial(env, user, "user_member1");
      assert.equal(db.accounts.get(user.id).balance, 130);
    });

    await t.test("unverified users and owners receive no trial", async () => {
      verified = false;
      const unverifiedDb = creditDb();
      const result = await ensureVerifiedSignupTrial(envFor(unverifiedDb), user, "user_member1");
      assert.equal(result.verificationRequired, true);
      assert.equal(unverifiedDb.transactions.length, 0);
      verified = true;
      const ownerDb = creditDb();
      const owner = await ensureVerifiedSignupTrial(envFor(ownerDb), { id: "owner", role: "owner" }, "user_owner1");
      assert.equal(owner.eligible, false);
      assert.equal(ownerDb.transactions.length, 0);
    });
  } finally { globalThis.fetch = originalFetch; }
});

test("credit APIs reject requests without a Clerk session", async () => {
  for (const path of ["/api/nina/credits", "/api/nina/credits/history"]) {
    const response = await worker.fetch(new Request(`https://worker.example${path}`, {
      headers: { Origin: "https://parallelvisionlabel.com" }
    }), {}, { waitUntil() {} });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Account authentication required" });
  }
});

test("owner Signal Credit grants are protected, validated and idempotent", async t => {
  const origin = "http://127.0.0.1:4173";
  const auth = await clerkAuthFixture(origin);
  const ownerToken = await auth.token("user_owner1");
  const memberToken = await auth.token("user_member1");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ keys: [auth.jwk] }), { status: 200 });
  const envFor = db => ({ NINA_MEMORY_DB: db, CLERK_ISSUER: auth.issuer });
  try {
    await t.test("owner can grant 100 credits to an existing user with an auditable ledger entry", async () => {
      const db = creditDb(grantUsers());
      const response = await grantRequest(envFor(db), ownerToken, {
        email: "  SantoMolinari@GMAIL.COM ", amount: 100, description: "Gift from Parallel Vision", referenceId: "owner-gift-test-100"
      });
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.ok, true);
      assert.equal(result.email, "santomolinari@gmail.com");
      assert.equal(result.amount, 100);
      assert.equal(result.balance, 100);
      assert.equal(result.transaction.source, "owner_gift");
      assert.equal(db.accounts.get("member-1").lifetime_credited, 100);
      assert.equal(db.transactions.length, 1);
    });

    await t.test("non-owner receives 403", async () => {
      const response = await grantRequest(envFor(creditDb(grantUsers())), memberToken, { email: "santomolinari@gmail.com", amount: 100 });
      assert.equal(response.status, 403);
      assert.equal((await response.json()).code, "owner_required");
    });

    await t.test("unauthenticated request receives an auth failure", async () => {
      const response = await grantRequest(envFor(creditDb(grantUsers())), "", { email: "santomolinari@gmail.com", amount: 100 });
      assert.equal(response.status, 401);
      assert.equal((await response.json()).code, "sign_in_required");
    });

    await t.test("unknown email returns 404", async () => {
      const response = await grantRequest(envFor(creditDb(grantUsers())), ownerToken, { email: "unknown@example.com", amount: 100 });
      assert.equal(response.status, 404);
      assert.equal((await response.json()).code, "user_not_found");
    });

    await t.test("invalid amount is rejected", async () => {
      const response = await grantRequest(envFor(creditDb(grantUsers())), ownerToken, { email: "santomolinari@gmail.com", amount: 0 });
      assert.equal(response.status, 400);
      assert.equal((await response.json()).code, "invalid_amount");
    });

    await t.test("the same referenceId does not double-credit", async () => {
      const db = creditDb(grantUsers());
      const env = envFor(db);
      const body = { email: "santomolinari@gmail.com", amount: 100, referenceId: "stable-owner-gift" };
      const first = await grantRequest(env, ownerToken, body);
      const second = await grantRequest(env, ownerToken, body);
      assert.equal(first.status, 200);
      assert.equal(second.status, 200);
      assert.equal((await second.json()).balance, 100);
      assert.equal(db.accounts.get("member-1").balance, 100);
      assert.equal(db.transactions.length, 1);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("account panels request the server balance while usage debits remain server-authoritative", async () => {
  const [frontend, home, project] = await Promise.all([
    readFile(new URL("../../js/nina-access.js", import.meta.url), "utf8"),
    readFile(new URL("../../index.html", import.meta.url), "utf8"),
    readFile(new URL("../../nina-project.html", import.meta.url), "utf8")
  ]);
  assert.match(frontend, /\/api\/nina\/credits/);
  assert.match(frontend, /textContent = "Unavailable"/);
  assert.doesNotMatch(frontend, /debitSignalCredits|\/api\/nina\/credits\/debit/);
  assert.match(frontend, /\/api\/nina\/live\/\$\{action\}/);
  assert.match(home, /id="ninaSignalCredits"/);
  assert.match(project, /id="ninaSignalCredits"/);
});

test("Signal Credit purchase UI submits only canonical pack IDs with Clerk authentication", async () => {
  const frontend = await readFile(new URL("../../js/nina-access.js", import.meta.url), "utf8");
  assert.match(frontend, /new Set\(\["signal_60", "signal_150", "signal_300", "signal_600"\]\)/);
  assert.match(frontend, /data-pack-id="signal_60"[\s\S]*?6 MIN[\s\S]*?60 Signal Credits[\s\S]*?€3\.50/);
  assert.match(frontend, /data-pack-id="signal_150"[\s\S]*?15 MIN[\s\S]*?150 Signal Credits[\s\S]*?€9/);
  assert.match(frontend, /data-pack-id="signal_300"[\s\S]*?30 MIN[\s\S]*?300 Signal Credits[\s\S]*?€17/);
  assert.match(frontend, /data-pack-id="signal_600"[\s\S]*?60 MIN[\s\S]*?600 Signal Credits[\s\S]*?€30/);
  assert.doesNotMatch(frontend, /data-pack-id="signal_(?:30|100|750)"/);
  assert.match(frontend, /About Signal Credits \+[\s\S]*?About Signal Credits −/);
  assert.match(frontend, /\/api\/nina\/credits\/checkout/);
  assert.match(frontend, /https:\/\/parallel-vision-anam-token\.parallelvision\.workers\.dev\/session-token/);
  assert.match(frontend, /"Authorization": `Bearer \$\{token\}`/);
  assert.match(frontend, /body: JSON\.stringify\(\{ packId \}\)/);
  assert.match(frontend, /ninaCreditsPurchasePending/);
  assert.match(frontend, /Preparing checkout\.\.\./);
  assert.match(frontend, /Checkout unavailable\. Please try again\./);
  assert.match(frontend, /status: response\.status/);
  assert.match(frontend, /endpointOrigin: endpointUrl\.origin/);
  assert.match(frontend, /endpointPath: endpointUrl\.pathname/);
  assert.match(frontend, /ninaCredits.*success|returnState === "success"/s);
  assert.match(frontend, /history\.replaceState/);
  assert.doesNotMatch(frontend, /STRIPE_(?:SECRET|WEBHOOK|PRICE)|sk_(?:live|test)_|whsec_|price_\w+/);
});

test("migration enforces non-negative balances, signed types and idempotent references", async () => {
  const migration = await readFile(new URL("../migrations/0003_signal_credits.sql", import.meta.url), "utf8");
  assert.match(migration, /balance INTEGER NOT NULL DEFAULT 0 CHECK\(balance >= 0\)/);
  assert.match(migration, /UNIQUE INDEX signal_credit_transactions_idempotency/);
  assert.match(migration, /BEFORE INSERT ON signal_credit_transactions/);
  assert.match(migration, /RAISE\(ABORT, 'insufficient_signal_credits'\)/);
  assert.match(migration, /AFTER INSERT ON signal_credit_transactions/);
});
