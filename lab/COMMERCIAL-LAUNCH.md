# PV Lab commercial launch checklist (updated 2026-10-13)

## Current completion verification, 13 October 2026

- The pending gallery autoload change is merged through PR #163 (`0b108609`).
  Its final head `6393c0b` passed the gallery, video, queue, Mood and layout checks.
- Homepage photo-drop collection and contextual navigation are merged. The
  latest Pages deployment succeeded: run `38473483017`, main `9836573`.
- The current main contains automatic gallery pagination and its manual retry.
- Latest successful Lab Worker deployment: run `38472905893`, source `9cf1efbc`.
  That deployed source sets signup, public checkout, public generation and
  customer Higgsfield flags to `true`. Earlier off/default-deny statements below
  are historical and must not be treated as the current deployed flag state.
- An enabled flag and successful deployment do not certify the complete real
  customer purchase, generation debit, original download and return-visit flow.
  Keep those external checks and provider/commercial gates explicit.
- Cloudflare authentication in this agent session was cancelled. Do not repeat
  the already verified sandbox purchase or its old customer-mapping repair.

**13 October launch-safety update:** Live Stripe portal legal links and Stripe Tax head-office address have been configured and read back; no public access has been enabled. The whitelisted pilot now permits either one €10 top-up or one €15/month Starter subscription, but no other packs. Customer Higgsfield routes are blocked by default pending written commercial permission under its API terms; owner tools remain available. See [the 13 October release safety audit](./RELEASE-SAFETY-2026-10-13.md). Existing notes below retain historical dates.

## Active launch checkpoint, 12 October 2026

- Legal/support publication prepared from main `21cb0f5`: /lab/privacy/,
  /lab/terms/ and /lab/customersupport/. Old customer-care.html redirects.
  Landing/studio footers and account help point to the published routes.
- Notices use confirmed merchant details, current storage/billing behavior,
  provider categories and consumer withdrawal instructions/form. No claimed
  blanket provider no-training policy, EU-only storage or withdrawal waiver.
- Pages publication does not approve the full commercial launch. Still verify
  provider DPAs/transfer safeguards/retention, tax/sales scope and any necessary
  early-performance consent flow before opening public sales.
- This change is static HTML/CSS only; public checkout/generation remain off.
- Implementation commit: b8ae62407df0438c2021d2f4c0ccf709cb0e510f.
  Pages run 38292198015 was superseded; successor 38292419126 succeeded.
  All three live pages opened and their content verified in the browser.
  Customer support desktop rendering checked; responsive CSS uses a fluid width.
  Static-site validation, Lab tests and landing-load CI passed on this commit.
  Local HTML/internal links and git diff whitespace checks passed.
- Owner next for this task: paste /lab/privacy/, /lab/terms/ and
  /lab/customersupport/ into the corresponding Stripe public-profile fields.
- Legal references checked: BGB sections 355 and 357 (gesetze-im-internet.de)
  and Berlin DPA complaint guidance. Provider contract verification remains open.

- Implementation committed to main as `20de9fb95cbe4bda01564628f891edc0a5eb1ba5`.
  Includes merchant page, optional Checkout invoices, sandbox configuration and tests.
- Production Worker deployment + health passed: Actions run 38288613210.
  Sandbox deployment + health passed: run 38288612902, sandbox version 2026-10-12.2.
- Lab unit/browser CI passed: run 38288613031. All 316 local unit tests passed.
  Browser CI covers desktop/mobile gallery, originals and account cache.
- Pages run 38288613296 was superseded by another contributor's commit; successor
  run 38288828319 succeeded. Live customer-care page visibly shows the merchant
  name/address. Desktop rendering checked; local browser launch was unavailable.
- Merchant: PV LAB / Alejandro Molinari; Knorrpromenade 9, 10245 Berlin, Germany;
  contact@parallelvisionlabel.com. Owner supplied and approved these details.
- One-time invoices require LAB_STRIPE_INVOICES_ENABLED=true and a nonempty
  LAB_STRIPE_INVOICE_FOOTER. Invalid enabled configuration stops Checkout.
  Name/address collected by Checkout are saved for customer invoice details.
- Sandbox enables approved merchant footer and “Umsatzsteuerbefreit gemäß § 19 UStG.”
  Production invoices remain off by default; no production invoice fee initiated.
- Completed an additional isolated Stripe invoice test using fictitious customer
  details and Stripe card 4242, no real money and no Lab customer/wallet mapping:
  Checkout cs_test_a146GSr0GWHnU6OHwnMlOUmaeNM0xqcmVin2oN1HByNWE4L84heM93ccbU
  invoice in_1UPnfDAdMTXISgShscc9SUQb, number M9WPUI7N-0001.
  Stripe reports complete/paid, EUR 10, livemode=false.
- Downloaded/rendered invoice PDF: approved footer is legible and exact.
  IMPORTANT: its issuer header still uses the sandbox's existing dummy address
  (Torgau) and test phone. Do not present this as an approved production invoice.
  Email delivery to a real customer has not been tested.
- Production account read-only check: charges_enabled=true, details_submitted=true;
  public support_address and support_email are null. Existing phone preserved.
  Connector exposes no public-business-profile update operation; browser requires
  Stripe sign-in. Owner must fill public merchant details in the PV Lab account.
- Stripe's post-payment invoice surcharge is 0.4% (EUR 0.04 on EUR 10).
  Owner fee approval remains pending. Subscription footers are a separate setting;
  this change deliberately sends invoice_creation only for one-time payments.
  https://support.stripe.com/questions/pricing-for-post-payment-invoices-for-one-time-purchases-via-checkout-and-payment-links
- Existing original EUR 10 sandbox purchase and 1,000-credit wallet verification
  remain valid. Do not repeat the old secret/customer-mapping repair.
- Public checkout/generation flags remain false. The sandbox cannot generate.
  Actual customer generation, debit, download and account cleanup remain unverified.
- Legal fields still open: sales territories/tax scope, provider contracts and
  retention/transfers, final withdrawal information and retention schedules.
- Owner next: complete Stripe public name/address/support email; approve invoice
  surcharge; open /lab/?setup-pilot=1 with a separate customer Google login and
  supply the displayed user_ ID. This is not another Cloudflare/Stripe account.
- Next agent: finish account invoice header settings and bounded customer pilot.
  Production pilot ID needs Cloudflare configuration; real EUR 10 payment needs
  explicit owner payment authorization. Finish legal fields before opening sales.

## Verified implementation and remaining release gates

**Sandbox payment and credit delivery verified on 12 October 2026 at 17:43 Europe/Berlin.**
A EUR 10 test Checkout completed in the dedicated PV Lab sandbox; Stripe reported
successful event delivery with zero pending webhooks, and the owner's screenshot
showed exactly 1,000 test credits. No real charge was made.
The initial API key belonged to another test environment. The owner replaced it
with the dedicated sandbox key and cleared only the stale sandbox customer mapping.
Do not repeat that repair or the initial purchase test.

Public sales and customer generation have not been activated by this work.
Actual customer generation, debit, download and return-visit verification remain
pending, as do the unresolved legal/privacy and invoicing items below.
The agent's Cloudflare browser remains signed out; the owner performed the
configuration changes in their own browser.

Owner confirmed merchant details at 19:25 Europe/Berlin:
Alejandro Molinari, trading as PV LAB; Knorrpromenade 9, 10245 Berlin, Germany;
support contact@parallelvisionlabel.com; self-declared Kleinunternehmer status.
These details are incorporated in CUSTOMER-TERMS-DRAFT.md. This records the owner's
statement, not a determination of cross-border tax treatment.

Current source verification: **309 Lab unit tests passed** on 2026-10-12,
including automatic gallery pagination, billing, customer isolation and sandbox
webhook replay. Synthetic coverage does not replace the actual customer flow.

### Connected-account configuration verified on 2026-10-12

- The dedicated PV Lab **live** webhook was missing refund and dispute events.
  Added `charge.refunded` and `charge.dispute.created` to the existing endpoint,
  preserving its six existing events, URL, API version and signing secret.
  The sandbox endpoint already subscribes to all eight events.
- Created and read back the live account's default billing portal configuration:
  invoice history and payment-method updates are enabled; subscription
  cancellation is at period end with no proration. Plan changes and the public
  portal login page remain disabled. Return URL is the existing Lab Studio.
  Final privacy/terms links are still absent and must be added after approval.
- Stripe Tax returns **no configured registrations** in the live PV Lab account.
  This does not establish the merchant's legal VAT status. Do not create a tax
  registration or enable Automatic Tax until the actual status is confirmed.
- The isolated test purchase, webhook delivery and 1,000-credit wallet balance are verified above.
- Fresh-customer generation and deployed deletion remain unverified. Merchant identity,
  address, support email and self-declared tax status have been supplied; do not ask again.

Implemented in this release:

- Fixed the two gallery checks that still expected full originals instead of
  thumbnails. Existing 480px WebP previews remain private; originals remain intact.
- Added a bounded browser image cache: per authenticated account, 128 MiB / 120
  entries, 24-hour expiry, cleared on sign-out, account change and content deletion
  in that browser. Reduced speculative original preloads to one at a time. Added
  desktop/mobile browser CI covering rapid navigation, originals, repeat visits,
  account cache clearing and viewport fit.
- Added synthetic end-to-end coverage from a new signed customer identity through
  signed payment, concurrent webhook replay, exact credits, generation, download,
  returning gallery, other-account denial and confirmed-failure refund.
- Linked a stable Stripe Customer before Checkout using an idempotency key; reject
  mismatched customer mappings and test/live webhook environments. Subscription
  credit grants require an exact catalog payment and a creation/renewal invoice,
  not a proration invoice. Current subscription state is retrieved from Stripe so
  out-of-order event delivery cannot restore stale state.
- Billing portal remains available with sales disabled. Signed `charge.refunded`
  and `charge.dispute.created` events create durable billing-review holds. Holds
  stop new purchases and paid jobs, including at the database insertion boundary.
- Added customer storage usage and an explicit account-closure request. Creative
  access closes immediately; scheduled cleanup deletes the account's R2 prefix
  and creative D1 rows in bounded, retryable passes. Active/uncertain jobs and
  locally active subscriptions prevent closure. Before file deletion, Stripe is
  checked again for recurring subscriptions and open Checkout sessions are expired.
  Financial audit rows, the closure marker, shared Clerk identity and Nina remain.
- Published factual [customer service information](./customer-care.html). This is
  not a substitute for approved sales terms and the full privacy notice.

Apply `0011-customer-lifecycle.sql` to **LAB_DB and the isolated billing sandbox
database only**. Both deployment workflows include it. Never apply Lab migrations
to `OWNER_DB`.

Release gates still requiring external evidence:

1. The dedicated PV Lab Stripe **sandbox/test account is connected** and its
   webhook endpoint is enabled. Verify its restricted test API key and matching
   webhook signing secret in the sandbox Worker's
   encrypted secrets. The key needs Customers create/read, Checkout sessions
   create/read/expire, Billing Portal sessions create, Subscriptions read and
   Charges read. Test webhook retries, async payment, renewal, cancellation,
   partial/full refund and disputes. Refund/dispute subscriptions are now
   configured in both Stripe environments; signed delivery remains to be tested.
2. Run an actual new Google/Clerk customer through signup, a Stripe test purchase,
   exact 1,000-credit delivery, payment retry, one permitted generation, original
   download and return visit. Synthetic tests do not establish third-party account
   configuration, production latency or real provider billing.
3. Approve the legal merchant identity/address, full privacy notice and processor
   disclosures, provider retention/deletion process, financial retention schedule,
   credit validity, cancellation terms and statutory withdrawal process. If an
   immediate digital-service waiver is used, implement and retain the required
   explicit consent and acknowledgement after legal review. Do not infer consent
   from signup or a purchase redirect.
4. Confirm VAT registrations and the service's tax classification with the
   merchant's tax adviser; test domestic/EU/non-EU and valid business VAT-ID
   invoices. `tax_behavior=inclusive` alone does not calculate or remit VAT.
   Automatic Tax is not enabled until active registration and applicability are
   verified in the actual PV Lab Stripe account.
5. Reconcile every open `lab_billing_reviews` row against the actual Stripe refund
   or dispute. Use an immutable adjustment ledger entry with a unique reference;
   never subtract below zero. Reconcile spent/referral credits and resolve any
   remaining debt before marking the review resolved. Dispute closure does not
   automatically unfreeze an account. No automatic cash refund is implemented.
6. Verify account cleanup in deployed R2/D1 and monitor queued closure age; fulfill
   separate Clerk/provider erasure requests and legally required retention. The
   current deletion flow closes PV Lab only, not the shared Parallel Vision login.

Primary implementation references: [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment),
[Stripe refunds](https://docs.stripe.com/refunds),
[Stripe Tax in Checkout](https://docs.stripe.com/tax/checkout),
[BGB §356](https://www.gesetze-im-internet.de/bgb/__356.html),
[EU data-protection guidance](https://europa.eu/youreurope/business/dealing-with-customers/data-protection/data-protection-gdpr/index_en.htm).
 
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
Default image and other API jobs reserve 460 PV credits per USD quoted, with a minimum 7 credits. New Seedance video routes use 320 (1.5 Pro Motion), 230 (normal 2.5) and 190 (2.5 upscaled 4K) credits per USD from an exact bound quote. Existing paid entries remain unchanged. Detailed approved launch model pricing: [MODEL-PRICING-2026-10-13.md](./MODEL-PRICING-2026-10-13.md). The backend stores a debit for every paid job and a refund when the job is definitively failed. This credit multiplier is a **launch assumption**, not a verified sustainable unit cost. Review per-provider actual usage and processor fees before selling.
 
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

### How to stage one authentic €10 top-up or €15/month Starter subscription

This change adds a narrow temporary path. It does not turn on payment
or generation access by itself.

1. Open `https://parallelvisionlabel.com/lab/?setup-pilot=1` and sign in
   with a **separate Google/Clerk customer account**, not the owner.
2. The page displays that signed-in test customer's own `user_...` ID.
   Copy it directly into Cloudflare; no screenshot, password or API
   secret needs to be shared. This URL only reveals the viewer's own
   ID from their authenticated `/api/session` response.
3. In Cloudflare **parallel-vision-lab** > Settings > Variables and
   Secrets, add encrypted **Secret** `LAB_LIVE_PILOT_CUSTOMER_ID` with
   that exact ID. Never add the ID to GitHub or `wrangler.toml`.
4. The Worker now allows only that signed-in customer to open Stripe
   live Checkout, for **one €10 top-up OR one €15/month Starter
   subscription**. Other users see checkout and generation disabled.
   Higher credit packs and subscriptions remain unavailable in the pilot.
5. Before paying, verify the checkout uses the new PV Lab Stripe account,
   correct product/price and VAT treatment. If it fails to open, inspect
   Cloudflare logs and Stripe Workbench requests: restricted Stripe keys
   may need additional resource permissions.
6. Owner expressly approves the later real transaction. For the €10 pack,
   verify the signed `checkout.session.completed` webhook grants exactly
   1,000 credits. For the €15/month Starter subscription, verify a **paid
   subscription invoice** grants exactly 1,600 credits; the browser
   return or an unpaid Checkout never grants credits. Test duplicate
   delivery and cancellation at period end. This is a recurring charge.
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
must still deliberately set the secret and approve whichever live payment
is selected. Subscription billing renews monthly until cancelled.
