## Generation settlement corrections, 2026-10-25
- User authorizes fixing all findings of the preceding refund audit. Baseline ea6e0cef68465cbba592d379fe5c737a80506446, isolated worktree pvlab-settlement-fix. Concurrent Vitolas session repair is separate PR #568 and must be preserved.
- Confirmed provider costs now take precedence over failed/draft/unknown state in acquisition, customer activity and archived finance. Unsettled failures are flagged as pending, not labelled confirmed free.
- Migration 0041 stores pending terminal Spicy task IDs separately from creative jobs, backfills retained terminal jobs and captures future transitions. Reconciliation reads original recordInfo at most three tasks concurrently per scheduled invocation, with atomic claim/backoff to one hour and idempotent final recording. It never resubmits generation or modifies a credit entry.
- Final settlement survives creative deletion. No-cost settlement requires settled:true with a valid nonnegative cost; missing, transient, invalid and incomplete responses stay pending. Provider credentials resolve server-side for the original owner only.
- Other providers without a final per-task cost remain unconfirmed/estimated; no fabricated zeroes or inferred refunds. Historical jobs already deleted without task IDs cannot be recovered automatically. Provider ledger reconciliation remains necessary for exact historical actual spend.
- Customer history/detail states explicitly show Credits restored or Request pending review; existing failed-job credit restoration is unchanged. Owner pre-generation hint discloses possible provider refusal charges; customers are never silently charged for those restored failures.
- Files: worker.mjs, provider-settlement.mjs, migration 0041, promotions.mjs, Worker deployment migration list, Studio/Owner status and asset versions, financial regression tests and this checkpoint. No tariff/model availability change, new paid generation or cash refund.
- Validation: 190 focused checks passed. Initial broader validation found missing local media fixtures, a scheduling-order regression and Studio URL flags accidentally removed by cache-busting. Ordering and URL parameters were corrected before merge. Final CI private-lab job 121280962534/run 40230498288 passed all 797 tests; Owner, permissions, Image contract, pricing, safety and partner checks passed. Existing Upscaler viewport-height browser failure reproduced on unchanged baseline 4f0e2f0; no test bypass or unrelated layout change.
- Published PR #570: final source 5e01d14c36c5dcaf1dc75ae376aa5069e4c67210; merge ed4463ae6956a9811ff3d89eb93a2c247b7a8857. Worker marker pv-lab-2026-10-25-provider-settlement-v1; UI marker 20261025-settlement1.
- Worker deployment run 40230836171/job 121282008942 succeeded, including migration 0041 and production health. Independent public /health returns the expected Worker marker.
- Exact-merge Cloudflare Pages check 121285367008 succeeded. Scoped release verifier returned LIVE_VERIFIED, lab/lab.js SHA256 0ab95176f5742ab0802916aa916424de709afa99fdf0194c54fd570e8f4fde9c. Studio/Owner HTML serve the expected marker; Cloudflare rewrites email links in HTML, so HTML is not asserted byte-identical.
- Production owner.js and owner-acquisition-ui.js each HTTP200 and exact merged bytes: SHA256 fb8491f07e38fcd0349c8fab242b5cdb539392400f6745c30269d1d9a23a1ebc and 985ef3e8e8df99f618be36cb0d701450ac247308126ebd11d0afecc5a98ffd68. Later main b307199 changes Agency only; ancestry and unchanged billing assets verified.
- Status: Worker and UI published. Vitolas refresh fix separately published PR #568 and recorded in PARTNER-DASHBOARD-WORK-STATE.md. No real signed-in ledger/cash reconciliation performed. Historical deleted tasks without provider IDs and other providers lacking final costs still require provider records; never claim zero actual spend or a quantified loss for them.

## Read-only generation charge/refund audit, 2026-10-25
- User requests explanation and system review of failed generations, model content refusals and provider costs. Reviewed source 4f0e2f0c50d662cb82fe7ae0c509277b612aaf48; no production balances, jobs, policy or code changed.
- Verified atomic job debit and one-time failed-state credit restoration in 0006-customers-billing.sql. Customer prompt checks run before paid job insertion on inspected submit routes. Ambiguous submissions remain uncertain, not automatically replayed; temporary archive failures preserve generated outputs for recovery.
- Official SpicyAPI billing/errors docs: ordinary failure releases holds, but model-disclosed content_rejected failures can be settled with positive cost. FAL official FAQ: infrastructure 500+ free, some processed 422 requests can be billed. Do not infer zero provider cost from failed state.
- Finding P1: promotions.mjs acquisition/exposure CASE expressions force failed jobs to zero even with positive settled_cost_usd. Synthetic reproduction stored $0.25 confirmed cost, restored customer wallet, and owner exposure returned $0.00. This proves reporting behavior, not an actual production loss.
- Finding P1: refreshJob and Spicy callback skip terminal failed/completed jobs. If initial terminal response is not settled, later final provider cost may never be captured. Add independent financial settlement reconciliation without resubmitting generations.
- Policy decision required: customer restoration on charged refusals currently still occurs because all failed states restore credits. Prefer retaining no-delivery credit restoration, tracking any provider loss transparently and restricting/disclosing expensive refusal-prone routes instead of silent charges.
- Stripe refund/dispute webhook records billing review; partner commissions are held at account scope. This is not a full proportional cash-refund/wallet reversal/commission settlement system. Checkout inspected code does not explicitly collect digital-withdrawal acknowledgement; external Stripe settings/live checkout were not inspected.
- Checks: 37 existing billing, finance, prompt-safety, FAL queue, Higgsfield and sandbox tests passed. One isolated additional positive-cost-failure reproduction passed; temporary test removed. No paid generations.
- No production provider ledger/CSV, live database or deployed Worker version reconciled. Exact financial losses and deployed behavior remain unverified. Next: correct confirmed-cost reporting and separate terminal-job settlement reconciliation, then reconcile real provider exports before deciding further policy.
- Sources: https://docs.spicyapi.ai/docs/billing ; https://docs.spicyapi.ai/docs/errors ; https://fal.ai/docs/documentation/model-apis/faq

## Owner tables: twenty-per-page server pagination, 2026-10-25
- User screenshot shows long Owner Acquisition & revenue and Customers lists. Requested 20 newest rows in each and compact navigation for pages 2/3/4, rather than an ~200-row continuous dashboard.
- Branch: `fix/owner-customers-acquisition-pagination-20261025` from main `718a7b840291ce29b5f36e9972bde6d101a4ec57`.
- Server: `lab-worker/promotions.mjs` adds bounded `page` to existing owner-only `/api/admin/overview` and `/api/admin/acquisition`, returning 20 rows ordered by joinedAt descending + ID tie-break and true total counts. Acquisition metric summary remains whole-period, not limited to displayed rows. No wallet, billing or creative data mutation.
- Client: `lab/owner.js` and `lab/owner-acquisition-ui.js` provide independent per-table pages with Previous/Next plus 1..5 visible numbers; Accounts search stays server-side and resets page to 1; date-range changes reset acquisition page. Existing recent signups feed remains separate from page-two navigation.
- Presentation: controls under tables in `lab/owner.html`, shared `lab/owner-pagination.js`, scoped `lab/owner.css` styling. Never render all returned rows for each table at once.
- Focused `tests/lab-promotions.test.mjs` validates 20+20+10 on 50 accounts, uniqueness, permission, search filtering, totals, page validation and UI pagination contract.
- Status: branch code authored; CI, merge, Cloudflare Pages/Worker production and signed-in actual browser not yet verified in this entry.
- Next: run relevant tests via PR CI, review diff, merge only after checks, verify both Cloudflare Pages and Worker for exact merge SHA, then inspect actual signed-in page. Do not claim live based on Github Pages.

## Voucher recipient UI simplification, 2026-10-25
- User tested the real Owner voucher lookup after PR #538 and rejected the extra View recipients / Hide recipients accordion. Existing live lookup showed Clerk verified name, email and redemption timestamp, confirming the backend returns identities.
- Current branch: `fix/owner-voucher-inline-recipients-20261025`. Based on main at `2e7946b2e1316f39ee93da72d56bd39810ff6145`. Keep previous owner-only redemption endpoint unchanged.
- Owner renders redemption count plus inline recipient name, verified email and timestamp in the SAME table row. No extra click, expanded row or new navigation. Blank expiry continues to display Never.
- On-screen rows automatically load identity via the existing owner-only endpoint, with IntersectionObserver + maximum 3 concurrent lookups. No customer records, credits, billing, stored profiles or voucher redemption rules changed. Results on stale/logout screens are ignored.
- Standard vouchers remain compact when unused. For high-volume campaigns, first 10 recipients are shown and a plain-text count states how many older claims are not in the table, without adding a dropdown.
- Changed: `lab/owner.js`, `lab/owner.css`, `lab/owner.html`, `tests/lab-promotions.test.mjs`. Adds locked UI test preventing regression to toggle button.
- Branch source implemented; new PR CI, merge, Cloudflare Pages and signed-in production verification still to be recorded. No Worker deployment needed because only the owner interface and tests changed.
- Next: check PR tests then merge. Verify Cloudflare Pages commit on production, then inspect the rendered owner table in a real signed-in browser.

## Voucher redemption identities and expiry clarity, 2026-10-25
- Source baseline: main bcd80d965b19c7d084b0c5c94009c4bb9467f3c6. Work branch: `fix/owner-voucher-recipients-20261025`.
- User screenshots show newly created 200-credit voucher Active, 0/1 with no expiry. Backend already accepts `expiresAt=null`, stores SQL NULL and permits redemption when expiry is NULL. PR #528 was merged 2026-10-24.
- Owner UI now says expiry is optional; blank means never, and existing NULL expiries show Never. No automatic restoration, revocation, purchase or wallet change.
- New owner-only `GET /api/admin/vouchers/redemptions?code=...&offset=...` pages 10 historical redemptions at a time, using authoritative redemption rows joined to verified stored contacts.
- On-demand bounded Clerk profile lookup adds first/last name and verified primary email only when the owner clicks View recipients. No profile names stored. Clerk API failures fall back to verified stored contact/email or customer ID.
- Closed accounts expose neither stored email nor live profile; their claim remains counted. Page uses textContent, never HTML rendering of identity values.
- Changed: `lab-worker/promotions.mjs`, `lab/{owner.js,owner.html,owner.css}`, `tests/lab-promotions.test.mjs`.
- Added focused tests: no-expiry claim, owner-only identity access, Clerk success/unavailable, closed-account privacy and pagination with immutable ledgers.
- Status: source branch changed; automated CI, merge, Cloudflare Pages and Worker deployment, and real signed-in owner verification not yet confirmed in this record.
- Next: inspect PR CI and branch diff; only merge when checks pass, then verify actual Cloudflare production and an owner sign-in result. Preserve parallel in-progress branches.

## Clerk D1 contact sync root-cause repair, 2026-10-22
- Production diagnostic after PR #438 (before this repair): scheduled sync tried 2/12 due contacts; both failed at contact_write with SQLite constraint category. Live Cloudflare D1 showed 28/28 active contacts verified, 25 refreshes due, first six due contact categories disposable; no Clerk key errors.
- Root cause reproduced using the exact contact UPSERT and the disposable-account hold trigger: SQLite's outer ON CONFLICT DO UPDATE takes precedence over the trigger's INSERT OR IGNORE; refreshing a disposable account with an existing lab_promo_generation_holds row raised UNIQUE constraint failed: lab_promo_generation_holds.customer_id.
- PR #441 merged as 6991d915972c70f21e567ef255bb27dd961a83dd. Both trigger bodies now conditionally insert only when a hold is absent, preserving existing holds and unpaid-generation restrictions. Repaired the original 0025 migration for fresh installs; added idempotent production 0036-clerk-contact-hold-upsert.sql and included it in Worker deploy workflow.
- Focused promotions/owner security and static checks passed; test additions cover repeated migration, Clerk refreshing two held disposable accounts without duplicate-key errors, unchanged holds, paused welcome credits, and ongoing trial/paid protection. Unrelated stale Studio module cache marker test was corrected to assert a versioned script URL, without changing UI.
- Cloudflare Worker production workflow run 39756143044 completed successfully including deployment and health. Direct Cloudflare D1 after migration confirmed 0036 applied, both corrected triggers installed, 28/28 active emails verified, 10 pre-existing hold records preserved, and zero wallet/ledger mismatches.
- Last stored scheduled Clerk sync diagnostic still reports the PRE-MIGRATION two constraint errors (age 41 minutes at final D1 read). No authenticated owner sync was issued. Next cron/owner sync must replace this result before declaring storageError=0 and dashboard warning fully cleared. Do not delete or reset stored diagnostic merely to hide the warning.

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
