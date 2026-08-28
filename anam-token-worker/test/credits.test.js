import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import worker from "../src/index.js";
import {
  SignalCreditError, creditSignalCredits, debitSignalCredits,
  getSignalCreditBalance, getSignalCreditHistory
} from "../src/credits.js";

function creditDb() {
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

test("credit APIs reject requests without a Clerk session", async () => {
  for (const path of ["/api/nina/credits", "/api/nina/credits/history"]) {
    const response = await worker.fetch(new Request(`https://worker.example${path}`, {
      headers: { Origin: "https://parallelvisionlabel.com" }
    }), {}, { waitUntil() {} });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Account authentication required" });
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
  assert.match(frontend, /new Set\(\["signal_30", "signal_100", "signal_300", "signal_750"\]\)/);
  assert.match(frontend, /data-pack-id="signal_30"[\s\S]*?30 Signal Credits[\s\S]*?3 Min Live Nina[\s\S]*?Quick Transmission[\s\S]*?€3/);
  assert.match(frontend, /data-pack-id="signal_100"[\s\S]*?100 Signal Credits[\s\S]*?10 Min Live Nina[\s\S]*?Private Signal[\s\S]*?€9/);
  assert.match(frontend, /data-pack-id="signal_300"[\s\S]*?300 Signal Credits[\s\S]*?30 Min Live Nina[\s\S]*?Deep Transmission[\s\S]*?€25/);
  assert.match(frontend, /data-pack-id="signal_750"[\s\S]*?750 Signal Credits[\s\S]*?75 Min Live Nina[\s\S]*?Extended Access[\s\S]*?€55/);
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
