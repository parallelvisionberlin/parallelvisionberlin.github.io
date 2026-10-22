## Clerk production storage retry, 2026-10-22
- User reported "Clerk sync needs attention" on pvlab.studio/owner. Live D1 diagnostic at 08:28 UTC: source owner, 12 requested, 1 checked, 1 storage_error, no missing/invalid Clerk secret or reported transient API failures. The Worker previously concealed the underlying D1 exception, so the specific cause remains unconfirmed.
- Live Cloudflare read-only checks: 27 active accounts and 27 verified contact records; 25 contacts due for periodic refresh; 0 foreign-key violations; lab_customer_contacts and its triggers match expected schema; exact contact UPSERT compiled via EXPLAIN. Both secret bindings exist and the welcome campaign flag is false.
- PR #438 merged on main as a23b1d5494ddd392a01db65fadc7220663a55ff9. Contact sync now retries only recognized temporary database failures once, classifies failed database stages/types with sanitized aggregate counters, continues past one isolated failed contact, and halts after two storage failures to protect an unhealthy DB. Existing contacts, prices, paid ledgers, Clerk secrets and permissions unchanged.
- Owner display now distinguishes schema/constraint/temporary/welcome reconciliation failures. Read-only audit explicitly fails on persisted storageError instead of ignoring it. Additional tests cover transient SQLITE_BUSY and isolated constraint failures.
- Focused promotions/owner security and original PR ten-workflow suite passed. Final production Worker deploy run 39748861136 passed tests, deploy and /health; direct Cloudflare script read verified clerkStorageKind and the combined hk-three-refs1.clerk-d1-retry1 Worker version. Cloudflare Pages successfully deployed merged frontend commit a23b1d5.
- The original stored storage_error was not manually erased. Authenticated owner-triggered or subsequent scheduled live contact refresh outcome remains UNVERIFIED. Inspect the next lab_clerk_sync_diagnostics outcome to confirm issues.storageError=0, report freshness and continued 27/27 active verified contacts. Do not claim that the production error is conclusively cured from code/health evidence alone.

## Signup, checkout and contact-sync repair, 2026-10-21
- PR #412 merged as `573e76ee2b30f2fdb746fac41742c2849b0b2016`; reviewed head `f8aba62d6b83f559603fd015321c2d8557451dd7`.
- Worker production deployment `39630590896` and its expected-version health check passed: `pv-lab-2026-10-21.5-account-sync-checkout` is live.
- Frontend publication is NOW VERIFIED in the live browser: Studio serves `signupResume=20261021-1`, the homepage serves `customer-entry.js?v=20261021-purchase-resume1`, and Owner serves `owner.js?v=20261021-account-sync1`. The earlier pending-publication finding is resolved; no manual Cloudflare deployment was needed in this retry.
- Existing Cloudflare connector returned internal errors. The existing Pages API credential previously returned HTTP 403/code 10000 (recorded in FISHEYE-2000-WORK-STATE.md). No permission, secret, DNS or project-setting change was made.
- Studio pricing retains the selected SKU through sign-in/reload for 15 minutes, restores its pricing tab, and requires a fresh customer click before checkout. Homepage optional referral attribution no longer delays purchase continuation.
- Paused welcome credits no longer prevent background verified-contact sync on authenticated session refresh. The offer remains paused.
- Clerk batch/configuration checks recognize the V2 key; unexpected storage failures produce sanitized counters. Owner overview counts active accounts separately, marks retained closed records correctly and excludes them from missing-email retries.
- Source: `lab-worker/{promotions,worker}.mjs`, `lab/{pricing-overlay,customer-entry,lab,owner,owner-acquisition-ui}.js`, their HTML cache versions, and focused regressions.
- Local verification: all 102 Worker tests, 33 focused promotion/billing/trial/UI tests and 60 additional script-contract tests passed. Pricing browser coverage passed at 320, 390, 1440 and 1648 pixels, including sign-in/reload recovery and no automatic checkout.
- Final PR CI passed Lab tests, account interface, Studio pricing overlay, landing, promotions/owner security, owner dashboard, approved Image UI and compact Image prompt checks. Test fixtures now reflect the existing eight Mood identities and wait for billing-refresh completion.
- The asset-library suite still fails at its legacy Upscaler canvas expectation, tests/lab-assets-ui.cjs:281. The same failure existed on main before this PR (run `39626039656`, job `119311426893`). Preserve the approved Upscaler UI; do not weaken the test without reviewing its current flow.
- Authenticated production owner sync and a real signed-in checkout remain unverified. Existing traffic storage has no individual location or navigation history; do not invent abandonment causes.
- Remaining verification: authenticated owner contact-sync outcomes and a real customer checkout. Production HTML/module version markers are verified separately from the already-passing simulated signup, account and checkout tests. Do not request another Cloudflare sign-in just to republish this repair.

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
