// Restrict the first real Stripe Checkout + paid generation end-to-end test
// to ONE explicitly authorized Clerk customer. No owner impersonation,
// public signup grant, browser token, payment-link or bypass route is used.
//
// The allowlist is a separate encrypted Cloudflare Worker secret. Until it
// is set to a valid exact Clerk subject, all users remain gated by the normal
// public launch switches. Production checks stay false in wrangler.toml.
const SUBJECT=/^user_[A-Za-z0-9]+$/;
export function isPrivateLivePilot(env,subject) {
  return env.LAB_CHECKOUT_ENABLED!=='true' &&
    env.LAB_PUBLIC_GENERATION_ENABLED!=='true' &&
    SUBJECT.test(env.LAB_LIVE_PILOT_CUSTOMER_ID||'') &&
    subject===env.LAB_LIVE_PILOT_CUSTOMER_ID;
}
export function canCustomerGenerate(env,subject){
  const publicLaunch=env.LAB_CHECKOUT_ENABLED==='true'&&env.LAB_PUBLIC_GENERATION_ENABLED==='true';
  return (publicLaunch||isPrivateLivePilot(env,subject)) &&
    !!env.LAB_STRIPE_SECRET_KEY && !!env.LAB_STRIPE_WEBHOOK_SECRET &&
    !!env.LAB_CUSTOMER_SPICY_API_KEY;
}
export function canCustomerCheckout(env,subject){
  return canCustomerGenerate(env,subject);
}
// Limit the pre-launch commercial canary to exactly one €10 purchase.
// Subscriptions, bulk top-ups and referral bonuses will be QA-tested
// separately before public sales start.
export function isPermittedPilotPurchase(env,subject,sku) {
  return !isPrivateLivePilot(env,subject)||sku==='topup10';
}
