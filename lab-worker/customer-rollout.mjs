// Restrict the first real Stripe Checkout + paid generation end-to-end test
// to ONE explicitly authorized Clerk customer. No owner impersonation,
// public signup grant, browser token, payment-link or bypass route is used.
//
// The allowlist is a separate encrypted Cloudflare Worker secret. Until it
// is set to a valid exact Clerk subject, customers are governed by both
// production rollout switches. The switches may be enabled by an authorized
// commercial release without changing the owner workspace.
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
// Restrict the pre-launch commercial canary to the €10 credit pack or the
// €15/month Starter subscription. Only the expressly whitelisted customer can
// access either; other plans remain unavailable until the public launch.
export function isPermittedPilotPurchase(env,subject,sku) {
  return !isPrivateLivePilot(env,subject)||sku==='topup10'||sku==='starter';
}
