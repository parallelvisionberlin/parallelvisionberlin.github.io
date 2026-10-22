# PV LAB release checkpoint, 2026-10-21 (Europe/Berlin)

## Remove Video Generate credit-pack note, 2026-10-22 (Europe/Berlin)
- User requested removing the credit-pack sentence beneath Generate, screenshot `libfile_16cd381245908191ad774c2a2d81edd3`.
- Source base: `b77a740`; `lab/lab.js` clears only the paused-trial pricing helper and hides its empty paragraph. Generate still opens pricing and preserves the draft.
- `lab/studio.html` refreshes the JS cache marker; existing customer Video browser coverage asserts the helper is empty and hidden.
- Account-review/closed/unavailable messages and generation eligibility are retained.
- Verification: 17 approved Image/Video contract checks passed; customer Video browser checks cover desktop/mobile pricing, preserved drafts, no paid requests and existing account restrictions. Publication/live verification pending.

## Studio wordmark and Owner deck comparison, 2026-10-22 (Europe/Berlin)
- User supplied five screenshots (234106, 234114, 234203, 234230 and 235008) and prefers the Owner History composer in image 4. The Higgsfield reference is image 3.
- Verified cause of deck difference: image-deck-surface.css applies its shared grid only to the welcome/card state and guest composer; History retains its separate existing layout. Recommendation: use Owner as the canonical expanded design while preserving compact entry, fixed width/top/sides and downward opening. This turn changes the logo only; the deck recommendation is not implemented.
- Source: `50aa1d40c4ac0378aa0d67b48efe04a4ef5a098f`, based on main `8f451471f26975052a388753978b14f08a0b8b59`. Preserved concurrent editorial pricing and quiet Video History changes exactly.
- Files: lab/studio.html, lab/public-header.css, tests/lab-mood-nav-browser.mjs. Studio now uses the same approved outlined SVG as the homepage for the common guest/customer/Owner header. Reset only the nested logo label's legacy styling to preserve the original footprint and mobile visibility.
- Verification: approved Image contract 5/5 and full existing shared masthead browser test at twelve breakpoints passed. Owner/customer header controls are local fixtures, not real signed-in production sessions. The SVG decodes and stays visible on mobile.
- Published: Cloudflare Pages `pvlab-studio` succeeded for source `50aa1d4`, check `119556802383`, deployment `f6d513b2-2724-4d26-a33c-38545a966b23`. The existing read-only verifier returned LIVE_VERIFIED for public-header.css?v=20261022-studio-wordmark1, SHA-256 `eff4e0af3c395d1690c0bc0191ccc1cf9cc366c69067b04b1ed1b66912acc65f`.
- Actual production browser at https://pvlab.studio/studio?tool=image, signed out, 1363x936: new shared logo decoded from the approved SVG, displayed 64.02x20.17px, expected stylesheet version and no horizontal overflow. Real customer/Owner sessions and physical mobile devices were not inspected.
- CI masthead `119555567122` and approved Image contract `119555562963` passed. Full CI is not green: queue-smoke could not install Chromium because its CDN certificate/download failed, and Assets still fails the previously recorded Upscaler import assertion at tests/lab-assets-ui.cjs:281. No deck, billing, account or provider behavior changed by this release.
- Next deck action: use the Owner History screenshot as the reference for a shared expanded geometry, preserving compact entry and downward-only opening; this remains a recommendation for the user, not a published deck change.

## Quiet Video History empty state, 2026-10-22 (Europe/Berlin)
- Source main: `01663853cdbc07c37dde56c719130e4a56f92686`.
- User approved “Your videos will appear here.” below History, 12px, normal weight and muted grey.
- `lab/studio.html`: moved the existing `video-feed-empty` into the archive beneath its header; refreshed only the Video stylesheet marker.
- `lab/video-refresh.css`: scoped note styling and non-Video suppression. Existing loading/visibility and saved-video behavior retained.
- Verification: 17 approved Image/Video interface checks passed; existing gallery browser suite passed all six desktop/mobile image-shape cases.
- Targeted real-browser checks at 1440, 390 and 320px confirm copy, archive placement, 12px/400 muted styling, no horizontal overflow, hidden with saved videos and outside Video.
- Release: PR #432 merged as `8f451471f26975052a388753978b14f08a0b8b59`.
- Cloudflare Pages check `119555615037` succeeded. Production verifier returned LIVE_VERIFIED; reviewed CSS bytes match SHA-256 `617c90fa9510241b351967a21c35bee48c07c92e7127e73f4b7a0f14817f0bc8`.
- Live Studio HTML confirms the short copy appears after History and the old sentence is absent. Real signed-in production behavior was not inspected; synthetic browser checks covered visibility at all three widths.
- At final check, 17/18 PR workflows passed; instant first-image flow remained in progress. Required approved Image contract and static validation passed. No paid generation or real account mutation.
- Completed and live. No further implementation action.

## Approved bold homepage wordmark, 2026-10-22 (Europe/Berlin)
- User approved the heavy, condensed PV LAB lettering in the homepage mockup and authorized applying it to the website.
- Both homepage placements use one small outlined SVG, derived from Anton with its SIL OFL notice included. No new font download or font swap is needed.
- Kept the existing text footprint and accessible names. Preserved the portrait, Fashion. Reimagined. copy, buttons, navigation positions and latest mobile hero lift. No Image deck, account, billing or provider code changed.
- Local checks: approved Image contract 5/5; homepage assertions from the existing landing-stability suite passed at 1912, 1440, 768, 390 and 320px with delayed and ready fonts, signed-in and guest mocks. These mocks do not verify real customer sessions.
- Separate before/after browser comparison at 1440, 390 and 320px confirmed unchanged header, navigation, portrait and hero-copy geometry, no horizontal overflow, and both SVG placements decoded from the same asset.
- The full landing-stability suite also includes unrelated Studio media and guest-deck checks. It did not complete in the sparse checkout because those media fixtures are absent; do not claim a full-suite pass. Its local server now supplies the correct SVG MIME type for the new logo.
- Published source: `d3763cd4447f1770ed119f8d6fdb10ec2573841a`. Cloudflare Pages `pvlab-studio` succeeded, check `119551817721`, deployment `e33d66db-3430-408e-8c35-7d55af54f88e`.
- Production verification returned LIVE_VERIFIED using the existing read-only verifier with its HTML request explicitly scoped to the homepage. CSS SHA-256: `3f1a49531ef01e658be257e35c78344a6b069c13f2cb239b50dbcdc13eb87030`; outlined SVG SHA-256: `d18b296987adca0e46c70fa0dac332a72d3568576e3dd4c2e69a57d944a43db0`. SVG returned HTTP 200 and image/svg+xml, exactly matching reviewed source bytes.
- Actual production browser, signed out at 1363x936: both vector logos decoded, correct stylesheet version, no horizontal overflow and the Fashion. Reimagined. headline preserved. Real signed-in production sessions and mobile devices were not inspected for this logo change.
- CI's full landing test reached its unrelated guest-deck assertion and found an outdated expected order. Updated only that assertion to the previously approved card swap (chrome-couture fifth, hong-kong-nights sixth, dreamcore seventh); no deck implementation changed. Both landing jobs and the approved Image contract passed on follow-up commit `01663853cdbc07c37dde56c719130e4a56f92686`; its Cloudflare deployment also succeeded.
- Other CI failures were the existing Assets Upscaler import assertion at tests/lab-assets-ui.cjs:281 and a live Generate/Exact freshness check that ran before Cloudflare completed. These are not a full green CI result, and no paid/account flow was tested here.

## Mobile homepage hero visibility, 2026-10-22 (Europe/Berlin)
- Source main before this change: `b674dc29ed0981f40f17fcd65b60c68ba67b97e1`.
- User-approved goal: raise the entire PV LAB / Fashion. Reimagined. hero copy, description and two buttons on mobile so Safari's bottom toolbar does not cut off the actions.
- Changed only mobile `lab/landing-motion.css` copy anchoring, from fixed 84px to responsive `clamp(148px, calc(820px - 100svh), 220px)`; preserved the photograph, wording, sizes, desktop geometry and navigation.
- Bumped only the `landing-motion.css` cache key in `lab/index.html` to `20261022-mobile-hero-lift1`.
- Publishing: PR and checks required; verify Cloudflare Pages `pvlab-studio` against the deployed commit and production stylesheet before claiming live.

## Current objective and release
- User authorized finishing and releasing PR #377, then verifying the recreated-account flow.
- PR #377 merged to main as 1abf77edd3330f18adbda8abad073867adcb39eb.
- Final PR head 0ea6d77c1cb77fea8b5ede986e1235a25424e61b has all 20 PR workflows successful.
- Cloudflare Pages check for 1abf77e completed successfully.
- Live browser verified https://pvlab.studio/studio?tool=image after reload: new guest Add photographs locally control, accountFlow=20261020v6 script marker and closed-account recovery markup. Desktop width 1363, document width 1348.
- Live signed-out entry loads normally; no paid generation or checkout was submitted.

## Resulting behavior and safeguards
- Closed identities get explicit sign-out/re-registration recovery; no tombstoned wallet is reopened.
- Active customers, including zero-credit/paused-trial accounts, can prepare direction and photos before Generate opens pricing.
- Funded and zero-credit wallets use the same editorial pricing panel.
- Guest photos stay local until authenticated handoff; private Elements remain gated.
- Approved Image layout, prompts, Moods, model routing and credit rules are preserved.
- Video submission updates only the Current scene footnote; it no longer destroys fields used by the renderer.
- Current Video tests retain explicit History selection, no duplicate generation, no paid retry and original-media assertions.
- Candidate browser actually staged a synthetic local photo and edited a prompt without starting a generation.

## Live billing and Control Room evidence
- Stripe PV Lab live account read-only verification: one successful EUR 10 payment; no refunds to inspect.
- D1 read-only diagnostic 39574838449 passed wallet-ledger reconciliation, failed-job refunds, active verified contacts and absence of reported Clerk key/transient errors.
- That diagnostic FAILED freshness: last stored Clerk sync report was 89 hours old, and contact refreshes were due.
- Production five-minute cron schedule exists; deployed Worker contains scheduledClerkBackfill and diagnostic persistence. These facts do not prove scheduled execution is healthy.
- Do not disable this alert or describe all Control Room sync as verified.
- Diagnostic implementation: .github/workflows/pvlab-readonly-session-db.yml. It runs SELECT only and prints safe pass/fail labels rather than IDs, emails, balances or private media.

## Remaining verification and exact next actions
- This audit browser is signed out. Secure browserAuth rejected the password locator as not_user_visible; no credentials were entered.
- Offer the supported browser handoff for the owner/test customer to sign in.
- After sign-in: test the actual recreated account, real displayed credits, private History/Gallery and pricing handoff. Do not create purchases or delete accounts merely for testing.
- Owner session: inspect Control Room sync and run its explicit safe sync action if needed; resolve the stale scheduled report separately.
- Backend/sandbox payment, webhook idempotency and refund paths are covered by passing CI; no real refund or paid generation was performed.
- Full CI/account diagnosis history is in ACCOUNT-WORK-STATE.md. Preserve unrelated feature work.
- Earlier Flash-specific notes below are historical; current source and verified deployment take precedence.

# PV LAB active work state

Updated: 2026-10-14
Scope: Seedream 5 Flash migration to SpicyAPI, without unrelated deck or model changes.
Production base checked: 332ce42e1648c48f4ebb8db082e231e1364e1bdd on main.
Implementation branch: fix/flash-spicyapi-20261014.

## Approved decisions
- Image selector keeps the public name **Seedream Flash**.
- Flash uses SpicyAPI, not OpenRouter, for all new requests.
- Text: `bytedance/seedream-5.0-flash/text-to-image`.
- Reference edit: `bytedance/seedream-5.0-flash/edit`.
- 1K and 2K resolution, 2K default; up to 10 image references.
- Only provider-verified Seedream models get the green ✳ Artistic Freedom badge.
- Existing layout, decks, archive, reference role instructions and non-Flash models stay intact.

## Implementation locations
- `lab-worker/seedream-flash.mjs`: documented model IDs, ratio and reference validation.
- `lab-worker/worker.mjs`: shared SpicyAPI /api/quotes and /api/jobs routing.
- `lab-worker/image-models.mjs`: Kling-only FAL endpoint, no live OpenRouter Flash calls.
- `lab-worker/customer-image-pricing.mjs`: Flash requires a live bound provider quote.
- `lab/lab.js`: model selector, ref limit, user quote and submit paths.
- `lab/image-model-limits.js`: remove legacy combined OpenRouter image cap.
- `lab/model-labels.js`: both current Spicy Flash and legacy OpenRouter history labels.
- `lab/image-studio.css`, `lab/studio.html`: badge styling and cache revision.

## Accounting and recovery
- SpicyAPI preflight binds the provider quote before paid createTask submission.
- Private R2 staging, signed reference uploads, D1 slot caps and spending checks are reused.
- Failed submissions preserve existing ledger/refund mechanics.
- Legacy OpenRouter history/archive code remains for recovery only. No new OpenRouter billing.
- Production OpenRouter key removal is a separate Cloudflare settings cleanup, if still configured.

## Verification
- Contract checked on the official SpicyAPI Flash text and edit model pages, 2026-10-14.
- API published price: $0.029 per image; live provider quote remains authoritative.
- Backend, frontend and regression tests updated in the branch.
- GitHub Actions PR checks: pending before merge.
- Deployment: NOT confirmed. Verify production Worker health version after main deployment.
- Paid generation: NOT run. User should perform one authorized text and one edit smoke test.

## Next action
- Review CI results, correct failures, merge validated branch to main.
- Confirm automatic Cloudflare Worker deploy and GitHub Pages update separately.
- Confirm no Flash request reaches OpenRouter after rollout.
