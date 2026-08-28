import Stripe from "stripe";
import { creditSignalCredits } from "./credits.js";
import { rewardQualifyingReferral } from "./referrals.js";

const PACK_DEFINITIONS = Object.freeze({
  signal_30: Object.freeze({ packId: "signal_30", credits: 30, amountEurCents: 300, priceBinding: "STRIPE_PRICE_SIGNAL_30", enabled: true }),
  signal_100: Object.freeze({ packId: "signal_100", credits: 100, amountEurCents: 900, priceBinding: "STRIPE_PRICE_SIGNAL_100", enabled: true }),
  signal_300: Object.freeze({ packId: "signal_300", credits: 300, amountEurCents: 2500, priceBinding: "STRIPE_PRICE_SIGNAL_300", enabled: true }),
  signal_750: Object.freeze({ packId: "signal_750", credits: 750, amountEurCents: 5500, priceBinding: "STRIPE_PRICE_SIGNAL_750", enabled: true })
});

export class StripePurchaseError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "StripePurchaseError";
    this.code = code;
    this.status = status;
  }
}

export function signalCreditCatalog(env) {
  return Object.fromEntries(Object.values(PACK_DEFINITIONS).map(definition => [definition.packId, {
    ...definition,
    stripePriceId: typeof env?.[definition.priceBinding] === "string" ? env[definition.priceBinding].trim() : ""
  }]));
}

function configuredPack(env, packId) {
  const pack = signalCreditCatalog(env)[packId];
  if (!pack?.enabled) throw new StripePurchaseError("invalid_pack", "Unknown or disabled Signal Credit pack");
  if (!pack.stripePriceId) throw new StripePurchaseError("stripe_not_configured", "Signal Credit purchases are unavailable", 503);
  return pack;
}

function stripeClient(env) {
  if (!env.STRIPE_SECRET_KEY) throw new StripePurchaseError("stripe_not_configured", "Signal Credit purchases are unavailable", 503);
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 2
  });
}

function checkoutUrls(origin) {
  const base = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin)
    ? origin
    : "https://parallelvisionlabel.com";
  return {
    successUrl: `${base}/?ninaCredits=success`,
    cancelUrl: `${base}/?ninaCredits=cancel`
  };
}

async function markCreationFailed(env, purchaseId) {
  const now = new Date().toISOString();
  await env.NINA_MEMORY_DB.prepare(`
    UPDATE signal_credit_purchases SET status = 'creation_failed', updated_at = ?
    WHERE id = ? AND status = 'creating'
  `).bind(now, purchaseId).run();
}

export async function createSignalCreditCheckout(env, identity, packId, origin, client = null) {
  const pack = configuredPack(env, packId);
  const stripe = client || stripeClient(env);
  const purchaseId = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.NINA_MEMORY_DB.prepare(`
    INSERT INTO signal_credit_purchases
      (id, user_id, pack_id, credits, stripe_price_id, stripe_checkout_session_id,
       stripe_payment_intent_id, currency, amount_total, status, created_at, updated_at, paid_at)
    VALUES (?, ?, ?, ?, ?, NULL, NULL, 'eur', ?, 'creating', ?, ?, NULL)
  `).bind(purchaseId, identity.user.id, pack.packId, pack.credits, pack.stripePriceId, pack.amountEurCents, now, now).run();

  const urls = checkoutUrls(origin);
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: pack.stripePriceId, quantity: 1 }],
      success_url: urls.successUrl,
      cancel_url: urls.cancelUrl,
      client_reference_id: purchaseId,
      metadata: {
        purchase_id: purchaseId,
        user_id: identity.user.id,
        clerk_user_id: identity.clerkUserId,
        pack_id: pack.packId,
        credits: String(pack.credits)
      }
    }, { idempotencyKey: `signal-credit-purchase-${purchaseId}` });
  } catch (error) {
    await markCreationFailed(env, purchaseId);
    throw error;
  }
  if (!session?.id || !session?.url) {
    await markCreationFailed(env, purchaseId);
    throw new StripePurchaseError("invalid_stripe_response", "Unable to create checkout", 502);
  }
  await env.NINA_MEMORY_DB.prepare(`
    UPDATE signal_credit_purchases
    SET stripe_checkout_session_id = ?, status = 'open', updated_at = ?
    WHERE id = ? AND status = 'creating'
  `).bind(session.id, new Date().toISOString(), purchaseId).run();
  return { sessionId: session.id, url: session.url };
}

async function purchaseForSession(env, session) {
  const purchaseId = typeof session?.metadata?.purchase_id === "string" ? session.metadata.purchase_id : "";
  if (!purchaseId || session.client_reference_id !== purchaseId || !session.id) {
    throw new StripePurchaseError("invalid_metadata", "Invalid purchase metadata");
  }
  const purchase = await env.NINA_MEMORY_DB.prepare(`
    SELECT id, user_id, pack_id, credits, stripe_price_id, stripe_checkout_session_id,
           stripe_payment_intent_id, currency, amount_total, status, created_at, updated_at, paid_at
    FROM signal_credit_purchases WHERE id = ? LIMIT 1
  `).bind(purchaseId).first();
  if (!purchase || (purchase.stripe_checkout_session_id && purchase.stripe_checkout_session_id !== session.id)) {
    throw new StripePurchaseError("purchase_mismatch", "Purchase does not match Checkout Session");
  }
  return purchase;
}

function paymentIntentId(session) {
  if (typeof session.payment_intent === "string") return session.payment_intent;
  return typeof session.payment_intent?.id === "string" ? session.payment_intent.id : null;
}

async function validatePaidSession(env, stripe, eventSession, purchase) {
  const pack = configuredPack(env, purchase.pack_id);
  const session = await stripe.checkout.sessions.retrieve(eventSession.id, { expand: ["line_items.data.price"] });
  const lineItems = session?.line_items?.data;
  const line = Array.isArray(lineItems) && lineItems.length === 1 ? lineItems[0] : null;
  const actualPriceId = typeof line?.price === "string" ? line.price : line?.price?.id;
  const metadata = session?.metadata || {};
  const matches = session.mode === "payment"
    && session.payment_status === "paid"
    && session.client_reference_id === purchase.id
    && metadata.purchase_id === purchase.id
    && metadata.user_id === purchase.user_id
    && metadata.pack_id === pack.packId
    && metadata.credits === String(pack.credits)
    && purchase.credits === pack.credits
    && purchase.stripe_price_id === pack.stripePriceId
    && actualPriceId === pack.stripePriceId
    && line?.quantity === 1
    && String(session.currency || "").toLowerCase() === "eur"
    && String(purchase.currency).toLowerCase() === "eur"
    && Number(session.amount_total) === pack.amountEurCents
    && Number(purchase.amount_total) === pack.amountEurCents;
  if (!matches) throw new StripePurchaseError("purchase_validation_failed", "Paid purchase validation failed");
  return { pack, session };
}

async function fulfillPaidSession(env, stripe, eventSession) {
  const purchase = await purchaseForSession(env, eventSession);
  const { pack, session } = await validatePaidSession(env, stripe, eventSession, purchase);
  const result = await creditSignalCredits(env, purchase.user_id, pack.credits, {
    source: "stripe_checkout",
    referenceId: session.id,
    description: "Signal Credit purchase"
  });
  const now = new Date().toISOString();
  await env.NINA_MEMORY_DB.prepare(`
    UPDATE signal_credit_purchases
    SET stripe_checkout_session_id = ?, stripe_payment_intent_id = ?, status = 'paid', updated_at = ?, paid_at = COALESCE(paid_at, ?)
    WHERE id = ? AND status != 'paid'
  `).bind(session.id, paymentIntentId(session), now, now, purchase.id).run();
  const referralReward = await rewardQualifyingReferral(env, purchase.user_id, pack.credits);
  return { fulfilled: true, idempotent: result.idempotent, referralReward };
}

async function markSessionStatus(env, eventSession, status) {
  const purchase = await purchaseForSession(env, eventSession);
  if (purchase.status === "paid") return { fulfilled: false, status: "paid" };
  const now = new Date().toISOString();
  await env.NINA_MEMORY_DB.prepare(`
    UPDATE signal_credit_purchases
    SET stripe_checkout_session_id = COALESCE(stripe_checkout_session_id, ?),
        stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, ?), status = ?, updated_at = ?
    WHERE id = ? AND status != 'paid'
  `).bind(eventSession.id, paymentIntentId(eventSession), status, now, purchase.id).run();
  return { fulfilled: false, status };
}

export async function processStripeEvent(env, event, client = null) {
  const session = event?.data?.object;
  const stripe = client || stripeClient(env);
  if (event.type === "checkout.session.completed") {
    if (session?.mode !== "payment" || session?.payment_status !== "paid") return { fulfilled: false, status: "open" };
    return fulfillPaidSession(env, stripe, session);
  }
  if (event.type === "checkout.session.async_payment_succeeded") return fulfillPaidSession(env, stripe, session);
  if (event.type === "checkout.session.async_payment_failed") return markSessionStatus(env, session, "failed");
  if (event.type === "checkout.session.expired") return markSessionStatus(env, session, "expired");
  return { fulfilled: false, ignored: true };
}

export async function verifyAndProcessStripeWebhook(env, rawBody, signature, client = null) {
  if (!env.STRIPE_WEBHOOK_SECRET || !signature) throw new StripePurchaseError("invalid_signature", "Invalid Stripe signature");
  const stripe = client || stripeClient(env);
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch {
    throw new StripePurchaseError("invalid_signature", "Invalid Stripe signature");
  }
  return processStripeEvent(env, event, stripe);
}
