## Audience tracker investigation and bar-row format, 2026-11-03
- User reported no audience data/confusing coverage and supplied the existing Traffic source bars as the required visual reference.
- Baseline main `6f1bec6b726795520c6795bcda26cdff1d30497f`; branch `fix/audience-bar-rows-clarity-20261103`. Prior scratch checkout was pruned; restored a sparse checkout from GitHub and read the scoped handoff.
- Read-only live D1 confirmed migration 0058 applied at 1793706659000, no traffic-table triggers, and the first audience record in all eight dimension groups. No schema or collector defect found.
- One normal public homepage visit in the cloud browser verified the complete live pipeline: period page views 1290→1291; live owner refresh showed 1 entry, United States / Chicago, Desktop / English. This record is our QA visit, not an organic customer or a representative audience sample. No synthetic telemetry payload was inserted.
- Earlier 1290 page views predate audience collection; they contain no geographic/device attribution. Owner dashboard views intentionally do not track. The generic empty message concealed these distinctions.
- Frontend now matches the requested reference: full-width labelled rows, count/share at right and thin proportional bars beneath. Ranking, metric switching and collapsed technical details are preserved.
- Coverage copy explicitly separates the newly measured audience sample from older traffic totals, handles singular units and explains public-page versus owner-page collection. Added a local Refresh control for the audience section using the existing authenticated report request.
- Changed: `lab/owner.js`, `lab/owner.css`, `lab/owner.html`, `tests/lab-owner-mobile-browser.mjs`, this checkpoint. Cache marker `20261103-audience3`. No backend/data/privacy/account/billing change.
- Checks: 23 focused traffic/auth/privacy/Image-contract tests pass; syntax/diff whitespace pass. Existing seven-width Owner browser suite also verifies bar proportions after metric changes and the coverage explanation.
- Published PR #809, source `ad9ae80d4755e6db997d3debe903fdb5f0906911`, merge `4de383d3b7c9e91c295f202393a3dc3e119deebf`; exact tested/uploaded tree `d4c1087e2a03b5d967b312581dba17d46f5bedad`.
- Owner CI jobs 125953889665 (PR) and 125954508264 (merge) passed at seven widths, including bar proportions. Promotions/security, Image contract, motion and validation passed. Broad sweep remains 971/974 with the same three previously verified unrelated failures; no gate disabled or test weakened.
- Exact-merge Cloudflare Pages check 125955234828 succeeded; scoped release verifier returned LIVE_VERIFIED for owner.js and owner.css at `20261103-audience3`. SHA256: JS `6af876e13404975280199d5d07b907c7781fcfb2d188b56be3f49beb43490180`; CSS `e772bc29de8dc56043fe7a6576707e168913306e6980752af8ef410669e7c8fd`.
- Actual signed-in production verified count 1291, one audience QA entry, new bar rows, clear sample/older-total copy, adjacent Refresh and metric switching with correct singular page-view text. No backend redeploy required. Complete.

## Audience report hierarchy and full-width rows, 2026-11-03
- User approved refining the audience hierarchy, then explicitly requested full-width rows instead of side-by-side column boxes.
- Baseline main 361f735; isolated branch `refine/owner-audience-hierarchy-20261103`. Preserve concurrent Smart Links changes.
- Countries and cities lead as full-width tables with readable names, aligned count/share columns and expandable longer lists. Devices/languages follow with three rows initially; hourly chart is shorter and full width.
- Regions, browsers and operating systems remain available in a collapsed Technical details section. No chart boxes or decorative arrows added.
- Before any measured traffic, show one shared empty state and hide the empty report/chart. Existing tracking/date/metric data remains unchanged; no backend, pricing, customer data or account authorization changes.
- Changed files: `lab/owner.html`, `lab/owner.css`, `lab/owner.js`, `tests/lab-owner-mobile-browser.mjs`, this checkpoint. Owner JS/CSS cache marker `20261103-audience2`.
- Local checks: 23 traffic/privacy/auth/Image-contract tests, syntax and diff whitespace pass. Synthetic actual-renderer phone/desktop preview inspected; long labels wrap and phone document width equals viewport (375px excluding scrollbar).
- Existing seven-width Owner browser suite now checks shared empty state, collapsed technical disclosure and full-width section alignment alongside sorting and report behavior.
- Published PR #808: reviewed source `bb6b83ebb0198724b974094bf4329ee9d13bb4ec`, merge `640cbd26aa496e1f9d6b9ee6f93f744f0b368cca`; tested local and uploaded source trees both `8e0f362b94b9707e225ed95db74f7be056383131`.
- PR Owner job 125904859930 and merge Owner job 125905541670 passed at all seven widths (320–1792px), including empty/data transitions, table alignment, metric switching and technical disclosure. Promotions, Image contract, motion and static checks passed. Broad Node sweep remains 971/974 with the same three previously verified baseline failures; no tests bypassed or weakened.
- Exact-merge Cloudflare Pages check 125905956992 succeeded. Scoped read-only release verifier returned LIVE_VERIFIED for JS and CSS at `20261103-audience2`; hashes `3f4333f69d0b64e0cf2599fbe2ac69915dc1a5bf080c5c44d761f3d2ec27f3bd` and `5ded7b32b79befa1e3660349f85ed270a426c017f1c47d00f2fe2f3772824068` respectively.
- Actual signed-in production owner page displays the compact shared empty state with no repeated panels or empty chart. Populated full-width rows were verified with synthetic data in browser preview and CI; no fake production traffic added. No Worker deployment required.
- Complete. Audience rows populate from normal incoming visits.

## Owner audience geography and technology, 2026-11-03
- Status: implemented, merged and verified live in the actual signed-in Owner dashboard. PR #806, reviewed source `054c29a70c9caf03cf3a24dcd7c3adb0eb99d430`, merge `fc03b64a686afa0a4073efbe461a5e69521976fd`.
- User explicitly approved pushing and publication after the initial automatic upload rejection. Shell Git push lacked credentials; the connected GitHub API uploaded the exact tested tree `3a0028dd8147eb0c97987011ad7c44f2dbbd4c8d`. No force push or rewritten remote history.
- Production: https://pvlab.studio/owner → Traffic → Your audience. Existing dark editorial design retained; phone layouts reflow with no horizontal overflow.
- Backend adds separate daily country, region, city, device, browser, OS, language and UTC-hour counters. Geography trusts only request.cf; raw IP/UA, precise coordinates, account linkage, inferred age/gender and cross-dimension visitor profiles are not stored.
- Original public traffic payload remains unchanged. One atomic D1 batch updates original and eight independent dimension counters. Both tables retain the existing 90-day pruning. Client/server GPC/DNT, bot filtering, origin checks and server owner authorization remain in place.
- UI supports the existing 7/30-day range plus estimated-entries/page-views switching, shares, top six/expandable top 50 for each metric, unknown/empty states, hourly chart and explicit audience measurement start date.
- Historical audience data cannot be backfilled. Country-level signup/payment attribution and age/gender remain unavailable rather than fabricated. Existing financial totals are unchanged.
- Changed: `.github/workflows/deploy-lab-worker.yml`; `lab-worker/{schema.sql,traffic.mjs,traffic-audience.mjs,migrations/0058-traffic-audience.sql}`; `lab/{OWNER-WORK-STATE.md,README.md,owner.css,owner.html,owner.js,privacy/index.html}`; `tests/{lab-owner-mobile-browser.mjs,lab-traffic.test.mjs}`.
- Local verification: 55 focused tests plus 107 Worker integration tests passed; syntax/whitespace clean. Synthetic actual-renderer previews checked on desktop/390px phone; metric sorting, expansion, unknown rows and phone document fit verified.
- PR Owner CI job 125897477367 and merge Owner job 125898520404 passed at 320/375/390/430/768/1280/1792px, including new audience controls. Promotions/security, Image contract, trial, references, motion and static validation passed.
- Broad PR Node sweep: 971/974; unchanged Meta readFileSync import, Moods navigation and ZenCreator offer failures exactly match baseline main 91326f1/job 125879659384. Account browser timeout at line 249 and saved-video width error also exactly match baseline jobs 125879658806/125879659069. No test gate was disabled or assertion weakened.
- Exact-merge Cloudflare Pages app check 125898901017 succeeded. Scoped read-only /owner release verifier returned LIVE_VERIFIED for owner.js?v=20261103-audience1, SHA256 `f446bd3512c719d0267387bff0e52698dee36faf94c8025df7318b69d81677f2`.
- Worker production run 41630497299/job 125898522120 succeeded: targeted tests, migration 0058-traffic-audience, deployment, health, release-link and deployed wallet/trial invariants. Worker version `fd684be2-c1c2-4e16-b2c4-ab365dfe5251`. Concurrent 0058-music-workspace migration from main was preserved.
- Actual authenticated production page displayed all new audience panels and the waiting-for-new-traffic state after refresh. No synthetic traffic, purchase or generation was submitted to production. First real location/device counts were not yet observed; normal incoming visits will populate them.
- Complete. Next: use new incoming traffic for audience comparisons; never apply its geography/device distribution retroactively to older traffic.

## Owner generation quality review, 2026-11-02
- Status: implemented, merged and verified live. PR #798, source `0de6190735ec4b81b0d8af5068472aed45dce50f`, merge `7654c18aa38b4347209184b8a7f0f6bc384a374d`.
- Production: https://pvlab.studio/owner → Customers → View activity. Existing activity dialog/layout retained; no separate dashboard or customer consent workflow.
- Inspected main 09c5fa0 and built on 3b63418; later unrelated Mood changes were preserved. All 15 merged file blobs matched reviewed local source exactly.
- New backend `lab-worker/quality-review.mjs` is reached only after existing requireOwner authorization. Ordinary and paying customers are reviewable; every request excludes closed accounts.
- `/api/admin/customers/inspect` returns 24 retained jobs per page, server-side Mood/feature/model/status filters, exact recorded model/provider, prompts, original Mood direction, settings/reference counts, timestamps, status, charged/refunded credits and explicitly settled/estimated/unconfirmed provider costs.
- Exact provider prompt comes only from a retained saved request. When absent, the UI identifies the stored job prompt and states the compiled provider prompt was not retained. Historic Mood prompts are never rebuilt using current rules.
- Thumbnail and larger image/video endpoints require owner access, customer/output linkage and results/film-finish storage namespaces. No input uploads, reference IDs, object keys, public URLs, raw provider payloads, credentials or orphaned assets are returned.
- Missing/deleted results show unavailable. Finance-only records never restore deleted creative content. Existing separate promotional-abuse review is unchanged.
- Frontend `lab/owner-customer-inspection-ui.js` uses DOM textContent, authenticated session requests, private blob URLs, at most three concurrent thumbnails, and session/revision guards. Close/Escape/session/page changes abort reads and release previews.
- Migration `0057-owner-quality-review.sql` and base schema add access metadata only. Logging must succeed before any disclosure. Scheduled cleanup expires QA audit rows after 180 days; logs contain no prompts or media.
- Privacy notice records internal QA, the legitimate-interest purpose subject to necessity/proportionality and rights, owner-only access, retention and objection/restriction requests. Review adds no creative archive, marketing use or model-training use.
- Existing customer gallery/upload/history/authentication/provider-generation/Stripe/wallet implementations are unchanged. Regression snapshots preserve jobs/assets/quotes/spend/customer/credit/finance rows during review.
- Local checks: 69 focused owner/security/gallery/billing/lifecycle/settlement/Image-contract tests and all 107 Worker integration tests passed; syntax and whitespace passed.
- Final PR CI: Owner UI at 320/375/390/430/768/1280/1792px passes, with QA interactions at 390 and 1792px. Private image/video elements, enlargement, literal prompt text, settings/cost, filters/pages/deleted states and blob cleanup covered. Phone and desktop screenshots inspected.
- Promotions/security, Image contract, trial, partner dashboard, motion effects, validation and general tests pass. Broad Node sweep is 956/959, with three failures in unchanged Meta test import, Moods navigation and ZenCreator offer assertions. Existing account Dream Blur timeout is independently verified on unchanged main 3b63418/job 125351923482. Unchanged Studio gallery ratio and Video canvas dimension tests also fail. No tests were bypassed or customer/Mood/gallery behavior altered to satisfy them; see PR #798 for details.
- Production Worker run 41469728489/job 125359834879 succeeded: tests, migrations/deploy, health, release-link check and deployed trial/wallet invariants all passed. Worker version UUID 9de0a867-70fe-4a8f-bf2b-add22f353443.
- Exact-merge Cloudflare Pages app check 125360723291 succeeded. Read-only release verifier, scoped to /owner, returned LIVE_VERIFIED for owner.js?v=20261102-quality1, SHA256 2d32cd227a17fa5f90184cb6e0c6d3f7f50ec2124cd06b3919b6e67b22cabeff.
- Production inspection module and owner.css were HTTP 200 and byte-identical to reviewed source. Privacy QA notice is live; HTML differs due to Cloudflare transformation. Anonymous production inspect request returned HTTP 401.
- Actual signed-in production check: an ordinary customer's retained thumbnail, saved provider prompt, original direction, exact model/Mood/settings, credits and settled cost displayed; larger image loaded privately at 2688×1536 via blob URL.
- Actual paid-account check: 25 retained jobs, Page 1 of 2; Berlin Rave server filter returned its retained result with prompt and loaded private thumbnail. No consent prompt or hold requirement. No new paid generation, payment, customer gallery mutation or deletion.
- Complete. Live video playback and every historical/provider variant were not manually verified; video authorization/delivery and UI elements passed synthetic tests. Future work should retain this QA scope and address unrelated CI regressions separately.

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
