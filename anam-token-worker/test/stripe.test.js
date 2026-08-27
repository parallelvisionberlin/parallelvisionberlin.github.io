import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import worker from "../src/index.js";
import {
  StripePurchaseError, createSignalCreditCheckout, processStripeEvent,
  signalCreditCatalog, verifyAndProcessStripeWebhook
} from "../src/stripe.js";

const configuredEnv = db => ({
  NINA_MEMORY_DB: db,
  STRIPE_SECRET_KEY: "sk_test_mock",
  STRIPE_WEBHOOK_SECRET: "whsec_mock",
  STRIPE_PRICE_SIGNAL_100: "price_signal_100",
  STRIPE_PRICE_SIGNAL_300: "price_signal_300",
  STRIPE_PRICE_SIGNAL_750: "price_signal_750"
});

function paymentDb() {
  const purchases = new Map();
  const accounts = new Map();
  const transactions = [];
  return {
    purchases, accounts, transactions,
    prepare(sql) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      let values = [];
      return {
        bind(...bound) { values = bound; return this; },
        async run() {
          if (normalized.startsWith("INSERT INTO signal_credit_purchases")) {
            const [id, userId, packId, credits, priceId, amountTotal, createdAt, updatedAt] = values;
            purchases.set(id, {
              id, user_id: userId, pack_id: packId, credits, stripe_price_id: priceId,
              stripe_checkout_session_id: null, stripe_payment_intent_id: null, currency: "eur",
              amount_total: amountTotal, status: "creating", created_at: createdAt, updated_at: updatedAt, paid_at: null
            });
            return { meta: { changes: 1 } };
          }
          if (normalized.startsWith("UPDATE signal_credit_purchases")) {
            const purchaseId = values.at(-1);
            const purchase = purchases.get(purchaseId);
            if (!purchase) return { meta: { changes: 0 } };
            if (normalized.includes("status = 'creation_failed'")) {
              if (purchase.status === "creating") Object.assign(purchase, { status: "creation_failed", updated_at: values[0] });
            } else if (normalized.includes("status = 'open'")) {
              if (purchase.status === "creating") Object.assign(purchase, { stripe_checkout_session_id: values[0], status: "open", updated_at: values[1] });
            } else if (normalized.includes("status = 'paid'")) {
              if (purchase.status !== "paid") Object.assign(purchase, {
                stripe_checkout_session_id: values[0], stripe_payment_intent_id: values[1], status: "paid",
                updated_at: values[2], paid_at: purchase.paid_at || values[3]
              });
            } else {
              if (purchase.status !== "paid") Object.assign(purchase, {
                stripe_checkout_session_id: purchase.stripe_checkout_session_id || values[0],
                stripe_payment_intent_id: purchase.stripe_payment_intent_id || values[1],
                status: values[2], updated_at: values[3]
              });
            }
            return { meta: { changes: 1 } };
          }
          if (normalized.startsWith("INSERT OR IGNORE INTO signal_credit_accounts")) {
            if (!accounts.has(values[0])) accounts.set(values[0], { balance: 0, lifetime_credited: 0, lifetime_debited: 0, updated_at: values[2] });
            return { meta: { changes: 1 } };
          }
          if (normalized.startsWith("INSERT INTO signal_credit_transactions")) {
            const [id, userId, amount, type, source, referenceId, description, createdAt] = values;
            if (transactions.some(row => row.user_id === userId && row.reference_id === referenceId)) throw new Error("UNIQUE constraint failed");
            transactions.push({ id, user_id: userId, amount, type, source, reference_id: referenceId, description, created_at: createdAt });
            const account = accounts.get(userId);
            account.balance += amount;
            account.lifetime_credited += amount;
            account.updated_at = createdAt;
            return { meta: { changes: 1 } };
          }
          throw new Error(`Unexpected run: ${normalized}`);
        },
        async first() {
          if (normalized.includes("FROM signal_credit_purchases")) return purchases.get(values[0]) || null;
          if (normalized.includes("FROM signal_credit_accounts")) return accounts.get(values[0]) || null;
          if (normalized.includes("FROM signal_credit_transactions")) {
            return transactions.find(row => row.user_id === values[0] && row.reference_id === values[1]) || null;
          }
          throw new Error(`Unexpected first: ${normalized}`);
        }
      };
    }
  };
}

function mockStripe() {
  const calls = [];
  const sessions = new Map();
  return {
    calls, sessions,
    checkout: { sessions: {
      async create(params, options) {
        calls.push({ params, options });
        const id = `cs_test_${calls.length}`;
        return { id, url: `https://checkout.stripe.test/${id}` };
      },
      async retrieve(id) { return sessions.get(id); }
    } },
    webhooks: { async constructEventAsync() { throw new Error("bad signature"); } }
  };
}

async function openPurchase(env, stripe, packId = "signal_300", userId = "internal-user", extra = {}) {
  const result = await createSignalCreditCheckout(env, {
    user: { id: userId }, clerkUserId: "user_clerk"
  }, packId, "https://parallelvisionlabel.com", stripe);
  const purchase = [...env.NINA_MEMORY_DB.purchases.values()].at(-1);
  const pack = signalCreditCatalog(env)[packId];
  const session = {
    id: result.sessionId, mode: "payment", payment_status: "paid", client_reference_id: purchase.id,
    payment_intent: "pi_test", currency: "eur", amount_total: pack.amountEurCents,
    metadata: { purchase_id: purchase.id, user_id: userId, clerk_user_id: "user_clerk", pack_id: packId, credits: String(pack.credits) },
    line_items: { data: [{ quantity: 1, price: { id: pack.stripePriceId } }] },
    ...extra
  };
  stripe.sessions.set(result.sessionId, session);
  return { result, purchase, session };
}

const event = (type, session) => ({ type, data: { object: session } });

test("checkout endpoint rejects an unauthenticated browser", async () => {
  const response = await worker.fetch(new Request("https://worker.example/api/nina/credits/checkout", {
    method: "POST", headers: { Origin: "https://parallelvisionlabel.com", "Content-Type": "application/json" },
    body: JSON.stringify({ packId: "signal_100" })
  }), {}, { waitUntil() {} });
  assert.equal(response.status, 401);
});

test("unknown packs are rejected before a Stripe request", async () => {
  const stripe = mockStripe();
  await assert.rejects(
    () => createSignalCreditCheckout(configuredEnv(paymentDb()), { user: { id: "u1" }, clerkUserId: "user_1" }, "signal_999", "https://parallelvisionlabel.com", stripe),
    error => error instanceof StripePurchaseError && error.code === "invalid_pack"
  );
  assert.equal(stripe.calls.length, 0);
});

test("checkout uses only canonical pack values and assigns the authenticated user", async () => {
  const db = paymentDb();
  const env = configuredEnv(db);
  const stripe = mockStripe();
  const { purchase } = await openPurchase(env, stripe, "signal_300", "correct-user");
  const request = stripe.calls[0].params;
  assert.deepEqual(request.line_items, [{ price: "price_signal_300", quantity: 1 }]);
  assert.equal(request.metadata.credits, "300");
  assert.equal(request.metadata.user_id, "correct-user");
  assert.equal(purchase.user_id, "correct-user");
  assert.equal(purchase.credits, 300);
  assert.equal(purchase.amount_total, 2500);
});

test("localhost checkout returns local success and cancel URLs", async () => {
  const stripe = mockStripe();
  await createSignalCreditCheckout(configuredEnv(paymentDb()), { user: { id: "u1" }, clerkUserId: "user_1" }, "signal_100", "http://127.0.0.1:4173", stripe);
  assert.equal(stripe.calls[0].params.success_url, "http://127.0.0.1:4173/?ninaCredits=success");
  assert.equal(stripe.calls[0].params.cancel_url, "http://127.0.0.1:4173/?ninaCredits=cancel");
});

test("invalid webhook signatures are rejected", async () => {
  await assert.rejects(
    () => verifyAndProcessStripeWebhook(configuredEnv(paymentDb()), "{}", "invalid", mockStripe()),
    error => error instanceof StripePurchaseError && error.code === "invalid_signature"
  );
  const response = await worker.fetch(new Request("https://worker.example/api/stripe/webhook", { method: "POST", body: "{}" }), configuredEnv(paymentDb()), { waitUntil() {} });
  assert.equal(response.status, 400);
});

test("an unpaid completed session grants no credits", async () => {
  const db = paymentDb();
  const result = await processStripeEvent(configuredEnv(db), event("checkout.session.completed", { mode: "payment", payment_status: "unpaid" }), mockStripe());
  assert.equal(result.fulfilled, false);
  assert.equal(db.transactions.length, 0);
});

test("a paid session grants the canonical credits exactly once on replay", async () => {
  const db = paymentDb();
  const env = configuredEnv(db);
  const stripe = mockStripe();
  const { purchase, session } = await openPurchase(env, stripe, "signal_750");
  assert.equal((await processStripeEvent(env, event("checkout.session.completed", session), stripe)).idempotent, false);
  assert.equal((await processStripeEvent(env, event("checkout.session.completed", session), stripe)).idempotent, true);
  assert.equal(db.accounts.get("internal-user").balance, 750);
  assert.equal(db.transactions.length, 1);
  assert.equal(purchase.status, "paid");
  assert.equal(purchase.stripe_payment_intent_id, "pi_test");
});

test("tampered pack metadata is rejected without granting credits", async () => {
  const db = paymentDb();
  const env = configuredEnv(db);
  const stripe = mockStripe();
  const { session } = await openPurchase(env, stripe, "signal_100");
  stripe.sessions.get(session.id).metadata.pack_id = "signal_750";
  await assert.rejects(() => processStripeEvent(env, event("checkout.session.completed", session), stripe), /validation failed/);
  assert.equal(db.transactions.length, 0);
});

test("expired and asynchronous failed sessions never grant credits", async () => {
  for (const [type, expected] of [["checkout.session.expired", "expired"], ["checkout.session.async_payment_failed", "failed"]]) {
    const db = paymentDb();
    const env = configuredEnv(db);
    const stripe = mockStripe();
    const { purchase, session } = await openPurchase(env, stripe, "signal_100");
    await processStripeEvent(env, event(type, session), stripe);
    assert.equal(purchase.status, expected);
    assert.equal(db.transactions.length, 0);
  }
});

test("the purchase migration provides reconciliation fields and a unique Checkout Session", async () => {
  const migration = await readFile(new URL("../migrations/0004_signal_credit_purchases.sql", import.meta.url), "utf8");
  assert.match(migration, /CREATE TABLE signal_credit_purchases/);
  assert.match(migration, /stripe_checkout_session_id TEXT UNIQUE/);
  assert.match(migration, /user_id TEXT NOT NULL REFERENCES users\(id\)/);
  assert.match(migration, /status TEXT NOT NULL CHECK/);
});
