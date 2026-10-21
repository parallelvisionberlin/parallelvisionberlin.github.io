## Signup, checkout and contact-sync repair, 2026-10-21
- Implementation branch: `fix/signup-checkout-sync-20261021`, baseline `4177ba0a`; deployment not yet verified.
- Studio pricing now retains the selected SKU through sign-in and reload for 15 minutes. It restores the relevant pricing tab and requires an explicit customer click to start checkout.
- Homepage optional referral attribution no longer delays purchase continuation.
- Paused welcome credits no longer prevent background contact sync on authenticated session refresh. The paused offer remains paused.
- Clerk backfill and owner configuration checks recognize the V2 key; unexpected storage failures produce sanitized diagnostic counters.
- Owner overview reports active accounts separately from retained historical records. Closed rows are marked closed and do not trigger missing-email sync.
- Affected source: `lab-worker/{promotions,worker}.mjs`, `lab/{pricing-overlay,customer-entry,lab,owner,owner-acquisition-ui}.js` and their HTML cache versions.
- Verification: 33 focused promotion/billing/trial/UI-contract tests and all 102 Worker tests passed; pricing modal browser regression passed at 320, 390, 1440 and 1648 pixels, including sign-in/reload recovery and no automatic checkout.
- Broader account browser suite passed homepage purchase/sign-in guards and Studio wallet flows at four widths, then stopped at an unrelated account-cover image decode error. Do not call the whole suite passing.
- Live owner sync and authenticated conversion behavior remain unverified. Existing traffic storage has no per-user location or navigation history; do not invent abandonment causes.
- Next: publish reviewed production fixes, confirm Worker and Pages deployments separately, then verify owner-only sync through an existing authorized session when available.

## Verified audit update, 2026-10-21
- Main account release: PR #377, merge 1abf77e; production Studio source independently confirmed live.
- Read-only D1 diagnostic 39574838449 verifies active customer contacts are populated/verified, all wallets reconcile to their immutable ledger, and definitely failed jobs have matching credit refunds.
- Last stored Clerk sync result contains no invalid-key/missing-key/transient error counters.
- Sync freshness remains OPEN: report age 89 hours; refresh candidates are due. Five-minute schedule and deployed backfill code are present.
- Real owner Control Room rendering and manual sync still require an authenticated browser session.
- Do not claim the historical zero-contact problem below remains current, or claim scheduled sync is healthy.
- Next: sign in as owner, inspect actual Control Room sync state, and diagnose the stale scheduled report without changing billing or deleting/reopening accounts.

# PV LAB owner Control Room: active state

Date: 2026-10-14
Production dashboard: https://parallelvisionlabel.com/lab/owner.html
Production Worker: parallel-vision-lab
Main baseline before this task: 1fb1efa7cd24cfdd3c63f8923df4ad9eaa762dd4 (PR #208).
Current implementation branch: fix/clerk-prod-sync-diagnostics-20261014 (PR #209).
Status: pending merge and deployment; verify separately.

## 2026-10-16 owner summary icon alignment
- CSS-only fix in `lab/owner.css`, commits `c41fe1111ec616754824b2b919d8d11ae7222a6e` and `c393620021ae2e025a63761e74a923deeb7eac52`.
- Scoped `.owner-metrics .owner-metric-icon` display and margin override centers all four SVGs while retaining the existing 35px small-screen circle sizing.
- No HTML, card layout, account data or billing logic changed. Commit verified in GitHub; Cloudflare Pages live deployment not verified.

## Existing design and safety
- Proposal 2 narrow monochrome sidebar, DM Sans, Customers/Payments/Referrals/Vouchers/Providers.
- Owner-only authorization for customer activity and provider finance.
- Existing verified purchases, Stripe checkout, credit wallets, referral/voucher ledgers unchanged.
- No generated prices, FAL/Spicy/FASHN/Gemini/Higgsfield routing changed.
- Providers finance uses secure /api/admin/providers, cached and separated by currency.
- API Balances preview hidden on Control Room; detailed Providers remains accessible.
- Desktop activity cards expanded near lower viewport edge, mobile unchanged.

## Clerk sync problem confirmed
- Cloudflare D1 has 4 lab_customers but ZERO lab_customer_contacts records.
- LAB_CLERK_SECRET_KEY exists as a secret binding; validity and instance match not verified.
- PR #208 fixed unsupported redirect:'error' to redirect:'manual' with 3xx refusal.
- Owner UI attempts to sync missing emails, but still reports Clerk sync needs attention.
- Backend failure reason cannot be inferred from the key's presence or missing emails alone.
- Official Clerk getUser API: GET https://api.clerk.com/v1/users/{id}, backend secret per application and environment.
- User must never be asked to expose Clerk secret in browser/chat; verified Clerk data is authoritative.

## PR #209 diagnosis and repair
- Migration: lab-worker/migrations/0016-clerk-sync-diagnostics.sql
- Fresh schema: lab-worker/schema.sql
- Only one D1 aggregate diagnostic row: checked_at, source, result_json of safe counts.
- NEVER store secret values, user IDs, email strings, upstream response bodies or raw tokens in the audit.
- Owner POST /api/admin/customers/sync records sanitized outcome; owner overview reads latest audit.
- Worker existing */5 min scheduled event retries eligible missing emails at most every 45 minutes.
- Cron runs independent of generation maintenance failures; tries a maximum of 12 existing customers.
- Respect 24h per-contact freshness for scheduled sync; owner manual retry bypasses this.
- Stop promptly on invalid key or rate limit; distinguish 401/403, 404, 429, network/HTTP/invalid responses.
- Owner displays backend diagnostic directly in Clerk status line, including after page reload.
- Worker VERSION set to pv-lab-2026-10-14.10-clerk-sync-audit.
- Production deploy workflow applies migration 0016 before Worker deploy.

## Verification and next actions
- Regression tests in tests/lab-promotions.test.mjs: 3 verified users, wrong-app 404,
  one audit row, private diagnostic, scheduled cooldown, owner retry and missing key.
- Existing promotions, owner security and account browser suites remain required.
- Merge PR #209 after relevant tests; verify Cloudflare Worker health and Pages deploy.
- Wait for one scheduled sync then inspect aggregate D1 lab_clerk_sync_diagnostics row and email counts.
- If invalid key or missing users persist, confirm Clerk Production secret is for the same
  app as the PV LAB sign-in instance. Secret values must stay in encrypted Worker settings.
- Never claim live email sync complete until D1 confirmed contacts with verified emails.
