# PV Lab commercial launch checklist (2026-10-10)
 
The creative owner Studio remains available at /lab/studio.html. The Lab marketing landing is /lab/.
Customer identity records, credit ledger, subscriptions and history live **only** in the Lab D1 database.
Never run migration 0006 against Nina's OWNER_DB.
 
## Development and deployment status
 
Production feature flags in lab-worker/wrangler.toml:
 
- LAB_CUSTOMER_SIGNUPS_ENABLED=true: an existing Clerk JWT can create a fresh isolated Lab customer.
- LAB_PUBLIC_GENERATION_ENABLED=false: customer paid generation and quotes are blocked.
- LAB_CHECKOUT_ENABLED=false: no checkout link is issued and customers cannot be charged.
- LAB_PUBLIC_APP_URL=https://parallelvisionlabel.com/lab/studio.html: Stripe return URL. Change when the separate domain is chosen.
 
The production Worker deployment executes migration 0006 before the new Worker code.
Existing encrypted owner SpicyAPI credentials and LAB_SECRET are unchanged.
The main site and Lab hero link to the Lab's existing public marketing entry; domain selection is separate.
 
## External configuration required before accepting payments
 
1. **Clerk Google authentication**: the current existing Clerk instance must support Google sign-in and signup in the actual production domain; configure and verify Google OAuth and redirect URLs in Clerk's production settings. The Google button opens the Clerk sign-in; it does not itself create an OAuth identity. Confirm the independent app domain before public migration to an isolated Clerk instance.
2. **Merchant approval**: confirm the chosen processor explicitly accepts the actual editorial generative service and its content rules. Do not sell or process material prohibited by the processor. Pricing and consumer rights must be reviewed for the target jurisdictions.
3. **Stripe**: create a separate restricted test or sandbox API setup first, then configure Cloudflare Worker secret LAB_STRIPE_SECRET_KEY and LAB_STRIPE_WEBHOOK_SECRET. Create webhook endpoint https://parallel-vision-lab.parallelvision.workers.dev/api/stripe/webhook for checkout.session.completed, checkout.session.async_payment_succeeded, invoice.paid, and customer.subscription.created/updated/deleted. Verify signatures, retries, renewal cycles and cancellations using Stripe test tooling.
4. **Provider account**: put a separately limited Lab provider key in the Cloudflare Worker secret LAB_CUSTOMER_SPICY_API_KEY, not source or client storage. Add independent per-vendor spend caps and reconcile model costs to the price catalog.
5. **Wallet QA**: verify cross-account isolation, no negative balances or duplicate credits, bounded quote spend, precise failed-generation refunds, no auto-retry after uncertain provider submissions. Confirm cancellations, disputes/refunds, expired quotes, batch jobs and input storage caps. Extend credit charging to all model-specific paths before enabling them for paying customers.
6. **Legal/customer content**: publish EU/Germany-compatible privacy and sales terms, adult/consent safeguards, media retention terms, refunds/withdrawal rights and account deletion policy. Validate German/EU VAT handling before final prices. Keep card data on processor checkout.
 
Once all checks pass, deliberately set LAB_PUBLIC_GENERATION_ENABLED=true, then LAB_CHECKOUT_ENABLED=true, and deploy through normal review. Do not enable either merely because this PR merges.
 
## Credit model (provisional)
 
Top-ups: €10/1000, €29/3000, €75/8000.
Subscriptions: €15/1600, €39/4500, €99/12000 per billing month.
1 USD of quoted API cost reserves 460 PV credits, minimum 7 credits; the backend stores one debit for each paid job and a refund when the job is definitively failed. This credit multiplier is a **launch assumption**, not a verified sustainable unit cost. Review per-provider actual usage and processor fees before selling.
 
Billing actions must only be considered complete when the signed webhook has been accepted and the durable ledger has updated. A browser redirect alone must never grant credits.

## Referral invitations (staged with checkout disabled)

Lab referrals are entirely separate from Nina's Signal Credits/referral database.
The signed-in Lab wallet and public landing link to the user's unique Lab invitation URL.
An invite code is recorded for a new authenticated Lab account within 24 hours of creation and before any payment. A customer can attribute one referrer only, and cannot refer their own account. The invite code survives Clerk sign-in via tab-scoped sessionStorage. The current URL is derived from `LAB_PUBLIC_APP_URL`, so when a dedicated Lab domain is chosen, update that setting and verify the invite path.

**Reward:** on the invited customer's first verified paid credit top-up or subscription payment of at least €10, the existing Stripe webhook adds **200 credits to each account** once, in an atomic D1 transaction. No signup reward and no credit based on a browser return or unverified payment. Referral wallet entries use kind `adjustment` with unique `referral:` references to preserve the original ledger constraints. The total 400-credit reward equates to ~USD 0.87 in *quoted* model costs at the provisional 460-credit/USD rate. This is not a verified margin or provider invoice.

Run `lab-worker/migrations/0007-lab-referrals.sql` against **LAB_DB only**, after migration 0006, before deploying the Worker. The Lab Worker deployment workflow is set up to apply it. Public checkout and paid generation remain disabled until the existing release criteria are met. Before public launch, add dispute/refund handling and monitoring for abusive duplicate accounts and update the customer terms for referral-credit expiration and abuse rules. The MVP's 24-hour attribution window is a launch assumption, not a Clerk fraud-control guarantee.

## Soul 2 introductory pricing (2026-10-10)

The current public catalog is unchanged: top-ups €10/1,000, €29/3,000, €75/8,000, with the existing subscription tiers.

Customer Soul ID training via Higgsfield Custom References is **400 PV credits** for each verified, server-submitted training job (provider estimate **USD 2.50**). Existing migration 0006's generic 460-credits/USD charge used 1,150 credits instead. New additive migration `0008-soul-id-launch-credits.sql` replaces only the future customer-job debit trigger, keeping owner jobs, existing purchases and already issued ledger entries untouched. It must run **after 0006 and 0007** against **LAB_DB only**, before Worker deployment. Migrations are rerunnable and the Worker workflow includes 0008. Confirmed failures continue to receive the existing exactly-once credit refund.

Soul 2 image generation remains subject to a **live provider quote**, with the unchanged **7-credit minimum**. For customer accounts only, the Worker refuses the quote if it exceeds **USD 0.015**, before any job starts. Below that threshold the 460 credits/USD formula can charge no more than 7 credits. Owner quote behavior is unchanged, including the existing USD 0.25 abnormal-estimate cap. A purchase of €10 gives 1,000 credits, sufficient for **400 training + 85 × 7 image credits = 995 credits**, leaving 5 credits at current eligible rates. This is a quoted-cost offer, not 85 free images or a guarantee if provider pricing changes. The Customer Soul 2 quote displays PV credits rather than wholesale API USD. The original owner UI still displays the API estimate.

Prices are a commercial launch assumption and need review against production API invoices, actual EUR/USD, German VAT, refund/chargeback exposure, and merchant costs. This feature does **not** enable checkout, public generation, extra provider accounts, or unmetered training. `LAB_PUBLIC_GENERATION_ENABLED` and `LAB_CHECKOUT_ENABLED` remain **false** until the rest of this checklist is completed.

## Private live Checkout pilot (pre-launch)

The owner has configured the dedicated PV Lab Stripe live API secret,
webhook signing secret and a separate SpicyAPI customer credential with
limited provider spending. **Global public checkout and generation stay OFF**
until paid webhooks and per-model charging are verified.

### How to stage one authentic €10 checkout

This change adds a narrow temporary path. It does not turn on payment
or generation access by itself.

1. Sign in to `https://parallelvisionlabel.com/lab/` with a **separate
   Google/Clerk customer account**, not the existing owner account.
2. Identify that test customer's own Clerk `user_...` ID from its
   authenticated `GET /api/session` response's `ownerId` (or from
   your Clerk Dashboard > Users). This is a customer identifier, not a
   password or Stripe API secret.
3. In Cloudflare **parallel-vision-lab** > Settings > Variables and
   Secrets, add encrypted **Secret** `LAB_LIVE_PILOT_CUSTOMER_ID` with
   that exact ID. Never add the ID to GitHub or `wrangler.toml`.
4. The Worker now allows only that signed-in customer to open Stripe
   live Checkout, and only for **one €10 pack**. Others still see
   purchasing and generation disabled. No subscription checkouts or
   larger packs are allowed in the private pilot.
5. Before paying, verify the checkout uses the new PV Lab Stripe account,
   correct product/price and VAT treatment. If it fails to open, inspect
   Cloudflare logs and Stripe Workbench requests: restricted Stripe keys
   may need additional resource permissions.
6. Owner expressly approves a real €10 transaction. On payment, verify
   the signed `checkout.session.completed` webhook is delivered,
   the test customer's D1 wallet increases exactly 1,000 credits, and
   a retry cannot grant duplicate credits.
7. Start ONE low-cost Seedream image job. Verify the backend quotes the
   credit amount, the customer ledger decrements atomically and no
   other account can issue a paid generation.
8. Remove `LAB_LIVE_PILOT_CUSTOMER_ID` from Cloudflare immediately after
   the test, closing live checkout and public generation again without
   redeploy. If the provider refuses a job, verify refund/reconciliation.
9. Complete legal, Stripe Tax/VAT, subscription cancellation, refunds,
   chargeback handling and supported model QA before opening to everyone.

### Fail-closed contract

- No pilot ID configured: all customers remain checkout/generation-disabled.
- Wrong ID: no access, regardless of referral code or browser input.
- Partial global feature flag activation: still no public access and no
  pilot override.
- Missing payment webhook, Stripe API key or SpicyAPI customer key:
  paid generation and checkout remain disabled.
- Existing owner's private API access is not modified.
- When both explicit public flags are finally enabled, the pilot key
  is ignored and public rollout is separately guarded by launch QA.

Test-only repository changes do not authorize real charges. The owner
must still deliberately set the secret and approve the €10 live test.
