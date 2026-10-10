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
