# PV LAB release checkpoint, 2026-10-21 (Europe/Berlin)


## Lock the signed-in Image entrance across accounts, 2026-10-22 (completed and live)
- Reference: image(20261022-090847).png is the canonical signed-in design;090855 is the rejected signed-out variant. Keep the approved real Image editor, original artwork and Mood ordering.
- Cause: public CSS used a different container width,40vh card height,31px carousel gap,47px title and visible card subtitles. The authenticated reference uses a1610px carousel, available-room card sizing,21px gap plus its visually hidden balance row, and43px title. The public background was fixed against the whole viewport rather than the approved gallery frame and1.008 scale.
- image-editorial-deck.css maps the existing public desktop Image entrance to that reference: same content frame, card sizes/crops/labels/overlays, title, carousel arrows and original background. Other public tool pages, closure notices, native and existing mobile responsive layouts retain their flow.
- image-editorial-deck.js reuses one card-height helper for the existing public/private DOM surfaces. The approved authenticated sizing and compact/expanded editor position remain unchanged. Existing upper navigation stays visible without a session.
- At1920x945 before: signed-in first card x147.5/y332.094/253.328x368; public x138.5/y308.594/256.328x378. After: both have the signed-in reference geometry. No new UI component, artwork or account-dependent theme.
- Initial source da13077d46c9b30dcb620347c4569031ff73db6f deployed successfully, but real public QA found an extra15px width difference: actual guest boot lacks the private Image-active class that formerly enabled the stable scrollbar gutter. The simulated guest had incorrectly retained that class.
- Followup explicitly preserves the same stable gutter on the existing desktop public frame. The first-image fixture now removes the private Image-active class, matching an actual signed-out boot. Its checks compare title/every card and painted background pixels at1920x900 and1280x720, plus new/returning/Owner/public frames, labels and backdrop framing across four writing states at1920x1000.
- Passed locally: approved Image contract5/5; full first-image browser suite, rerun after the real-guest fixture correction; prompt-paste; full Studio layout; guest mobile Mood entry. Mobile retains78px navigation, no keyboard on Mood selection and no horizontal overflow. No paid generation or identity mutations.
- Final app source c8843efade3963680eca546c871e86e9b5335f7a, based on a7009a495efe53c28c99ba0af0954753cc0fb9ec. Concurrent Upscaler HTML cache markers were preserved. Only app paths image-editorial-deck.css, image-editorial-deck.js and studio.html plus the existing first-image test and this checkpoint were changed.
- Cloudflare Pages pvlab-studio check119749960150 succeeded; deployment4829e7c5-f49f-4062-9b7f-9fed7465dc64. Final CI approved-image-ui, first-image, image-prompt-paste and mobile-review all passed. This is relevant-check evidence, not a claim that unrelated CI suites are all green.
- Existing read-only verifier returned LIVE_VERIFIED for CSS20261022-canonical-entry2 (SHA-256 b64974c1f385ebbb3c148324b8811c3c9eba191e343be13d6829804ad6eb689c) and JS20261022-canonical-entry1 (77d3c11bece992ee96e856c2ce6ee576e2e0e1fa5740fab36459b2be6fad935f). Exact reviewed bytes are live on pvlab.studio.
- Actual production guest browser1363x936: gutterstable; gallery1348x854 below82px header; first card x34.359/y323.703/201.969x365. Compact deck x114/y764/1120x74 opens downward to142 at the same x/y/width and closes to74. Card frame and scrollY0 remain fixed; no document overflow. Original upper navigation visible and old card subtitles absent. Proof pvlab-canonical-image-c8843ef.jpg.
- Approved prompt deck skin/origin, Mood imagery/copy, Hong Kong Nights, Upscaler source, billing and account logic are unchanged. Guest and account roles share presentation; actual authentication and Generate eligibility retain their existing differences.
- Complete engineering/public deployment verification. Real production signed-in Owner/customer/recreated-account sessions have not been inspected for this change; synthetic role tests must not be described as that observation.

## Restore original signed-out navigation, 2026-10-22 (completed and live)
- User reported missing upper navigation in signed-out Studio and explicitly requested the existing bar, with no replacement system. Also requested removal of "Sign in to your PV Lab workspace" below the deck. References image(20261022-084146).png and084154.
- Verified cause: assets.css contained body:has(#app[hidden])>#studio-header .tool-switch{display:none}. Both screenshots depict guest access: the homepage's person icon is its Sign in action, and Get credits is its guest label. No evidence of lost authentication or an account deletion regression in these screenshots.
- Removed only that obsolete menu-hiding rule. Existing header markup, guest tool-route handlers and authentication gates remain. Private Assets and Queue stay gated; no alternative navigation component or account implementation was introduced.
- studio-guest-image.css keeps both existing navigation rows in its compact mobile header (78px, matching authenticated Image), with enough scroll margin to expose the whole prompt after a Mood selection. Hide only an empty status paragraph; actual error messages still appear.
- lab.js clears the default signed-out status sentence; studio.html starts the status paragraph empty and refreshes only affected assets to20261022-guest-navigation1. Deck presentation, provider/billing logic, references, Moods and account recovery are unchanged.
- Passed: approved Image contract5/5; account-link unit checks9/9; full masthead test at twelve widths plus explicit guest1440/390/320 cases; full guest mobile Mood-entry/browser test including existing Video→Image navigation, retained deck frame, no forced login, no private workspace exposure and empty default status.
- Baseline main e60ad9542cc1c25ca349b29f7864c04c6128420d, published over1fbb9d7ed609a1aba64032cf8409f5502dfcfd31 while preserving the concurrent footer/account-menu wordmark cache updates.
- Published source930d55a052269f0c56f5f030cdc82fccc1e90eed. Cloudflare Pages pvlab-studio check119731997472 succeeded; deployment4d81eed9-e340-467b-bc8c-7fd55c344a78. Existing read-only verifier returned LIVE_VERIFIED for assets.css, studio-guest-image.css and lab.js at20261022-guest-navigation1. Their reviewed bytes match production.
- Actual production guest browser1363x936: original Image/Video/Upscaler/Retouch/Fashion/Explore Moods navigation visible; status empty and displaynone; private app remains hidden. Video opens its existing public Video screen without forcing sign-in, and Image returns to the unchanged compact deck x114/y764/1120x74. No horizontal overflow. Screenshot pvlab-original-menu-restored-930d55a.jpg.
- CI approved-image-ui, masthead and first-image passed. Mobile review was still running at final check; full local mobile Mood-entry suite passed. No claim of full CI green or actual signed-in customer/Owner/recreated-account sessions inspected.
- Completed. Existing upper bar restored for signed-out visitors; default status sentence removed. No new navigation system or deck redesign.

## One original Image deck and origin, 2026-10-22 (completed and live)
- Latest explicit requirement: preserve the original Image History deck from image(20261022-081538).png. Only Image entrance and Inspiration minimize it. Compact and expanded states must share the original History top and sides, opening downward. Same presentation for guest/customer/Owner. References also081547 and081649.
- Baseline main37c8be593893f99edbf56aff69ddae23d977f0cf; publishing on latest248fe4e97d9ed06b53243acb4ebebe947b2161a0, preserving concurrent Upscaler copy/style changes exactly. Expanded History, Inspiration and public entry already shared the same1120x142 surface and tool geometry; Generate eligibility accounts for the enabled/disabled appearance. Authenticated History and Inspiration reuse the same #image-composer element.
- Actual placement difference: welcome used cards.bottom+24, while History used its bottom30 viewport anchor. Lowering the content24px did not unify those origins. Supersedes the placement recorded below.
- image-editorial-deck.js now uses one fitDeckOrigin helper for public and authenticated entrances: original empty deck top=viewportHeight-172, reserving142px plus30px bottom clearance even when compact. Expanding74→142 keeps the same top. Long text/photos retain the original History height and bottom clearance.
- image-editorial-deck.css applies that shared viewport origin and keeps the public auth-status readable beneath it. Existing24px title/card adjustment remains. No surface, controls, copy, billing/auth/provider implementation change.
- studio.html refreshes only the editorial CSS/JS to20261022-one-origin1.
- Existing first-image coverage now compares History and expanded Inspiration frame and every control slot directly, verifies the same editor element survives, and checks compact/public/customer/Owner x/y parity. Original long prompt and photo sizing is retained.
- Passed approved Image contract5/5, prompt-paste and full Studio layout. Full first-image suite passed, including exact shared origin/History assertions, long text, photos and mobile. Local1920x1000 check: History,new entrance and guest all x392.5/y828/width1120. Compact height74; expanded142.
- Published source cf016ef0c89bc5c589784f30df44cba569b270e6. Cloudflare Pages pvlab-studio check119721957443 succeeded; deploymentaf5fa3e3-e3ec-4ce6-9a97-efc1163ca474.
- Existing read-only verifier returned LIVE_VERIFIED for both20261022-one-origin1 assets. CSS SHA-2566fa49deb95ba8b761bb82b11173abe8771cfb906558e577724d7f0448786f6d3; JS SHA-256bb18e905aa55386658899782565cf72c3ec3a1b5e4748b38ea73e71496fe3cde. Exact reviewed bytes are live.
- Actual guest production browser1363x936: compact x114/y764/width1120/height74; open x114/y764/width1120/height142, bottom906 (=viewport minus30). Closing restores74 at the same top. Cards remain y301.40625/bottom675.796875 and scrollY0. Proof pvlab-original-origin-compact-cf016ef.jpg and pvlab-original-origin-expanded-cf016ef.jpg.
- CI first-image and image-prompt-paste passed. Approved-image-ui passed5/5 locally; its remote check was queued at final review. No claim of full CI green. No real production signed-in sessions inspected; role fixtures are synthetic.
- Completed: original History design remains open in History; small state exists only in entrance/Inspiration and expands downward into the same original frame. No additional design or account work requested.

## Lower the approved Image entrance, 2026-10-22 (completed and live)
- User asked only to lower the entire title/cards/bar group a little, retaining the current compact controls and Owner expanded design. References image(20261022-080815).png and image(20261022-080848).png.
- Baseline main ca2502cad1a1d4941ab5df6231e54f4e03bbff8a, with app 48b1a99637deb9cd141273b2edb527b83a6f504f already live.
- image-editorial-deck.css moves the desktop entrance content down 24px at the existing standard breakpoint, min-width1180/min-height680. The real deck already follows the measured card edge, so no JavaScript or deck-layout change is needed. Guest, customer and Owner Inspiration use the same offset. Mobile/native/Soul and populated History keep their existing position.
- Only application changes: the position rule and its studio.html CSS cache marker, 20261022-entrance-lower1. Artwork, card sizes, title, controls, widths, expansion, auth, credits, pricing and providers are untouched.
- Passed: approved Image contract 5/5, full first-image suite, full Studio layout and prompt-paste. Synthetic role coverage includes new/returning/Owner/guest, desktop widths1180 through1920, banner, mobile/native/Soul/reference behavior. Exact before/after comparison confirmed title/cards/bar move24px with unchanged sizes and expanded controls; populated Owner History is identical.
- Published app source 610804d938aed31de0e8543a79eab84c89be8479. Cloudflare Pages pvlab-studio check119715047767 succeeded; deployment61094460-053f-441b-a4dd-51e4291a4240.
- Existing read-only verifier returned LIVE_VERIFIED for image-editorial-deck.css?v=20261022-entrance-lower1; SHA-256 440b9e6b755c8d47c703f58c8728860837ff5098eba986a40bd4f942c358e574. Exact reviewed bytes are live.
- Actual production guest browser at https://pvlab.studio/studio?tool=image: cards y301.40625 (was277.40625), deck top699.796875 (was675.796875), width1120 and compact height74. Opening grows downward to142; closing returns74 with unchanged card bounds, x114/top699.796875 and scrollY0. Screenshot pvlab-entrance-lowered-610804d.jpg.
- CI approved-image-ui and first-image passed at final review; prompt-paste was still running (passed locally). Do not claim all CI green. Real customer/Owner sessions were not inspected; their layout is covered by synthetic role tests.
- Completed. No remaining implementation action for this position request.

## Restore approved compact Image controls, 2026-10-22 (corrected and live)
- Correction: the prior prompt-only 94px minimized bar was an implementation mistake, not an approved reference. The supplied compact reference includes tools and Generate inline. Preserve the existing Owner expanded design and fixed outside width/top/sides; opening reveals downward space.
- References: 9d434cea-3ce4-44c3-affb-c45aebab9d93.png (compact), 5cbb6f1f-3395-47a2-ad9e-6f37aefd6f67.png (expanded). No new artwork, copy, controls or layout redesign.
- Baseline main dd1f96275759e26ae9b04b8add15d5c189f047b2; previous app source bc8e766e358ffb512416c04751d102f33e8da7ed. Previous prompt-only publication is superseded by this correction.
- Changed only image-deck-surface.css and its studio.html cache marker, plus existing geometry expectations in first-image, Studio layout and mobile Mood-entry tests.
- Compact entrance is 1120x74 on standard desktop, with prompt, original tools and 128x52 Generate visible in one row. Retouch remains in the expanded toolbar and retains existing eligibility. Expanded Owner geometry remains 1120x142 with 144x84 Generate; History stays expanded. All roles share one rule.
- Current main's title-only entrance, new logo, card imagery/order, fixed card anchor, long-prompt sizing, photo trays, native/Soul/mobile, auth, billing and provider behavior are preserved.
- Checks: approved Image contract 5/5, prompt paste, full Studio layout, mobile Mood entry passed. Full first-image suite passed including role parity, desktop anchors/banner/History, mobile, references and no-paid-request safeguards.
- Real production account sessions have not been inspected. Automated role fixtures are synthetic and make no paid requests.
- Published app source: 48b1a99637deb9cd141273b2edb527b83a6f504f. Cloudflare Pages pvlab-studio check 119710988844 succeeded; deployment 6cd83204-b6ce-4ae8-9a25-ff0a7752fe33. Cache marker image-deck-surface.css?v=20261022-compact-controls1.
- Existing read-only release verifier returned LIVE_VERIFIED, reviewed surface CSS SHA-256 2dbe3c98e168a8d7603ebc42559ea32be89c120a07d09302e297894d6af28500. Production serves the exact tested bytes.
- Actual production guest browser at https://pvlab.studio/studio?tool=image: compact tools and Generate visible; frame x114/y675.796875/width1120, height74. Opening gives height142 with unchanged x/y/width and card bounds, scrollY0. Closing restores height74 and the same frame. Screenshots pvlab-compact-restored-48b1a99.jpg and pvlab-expanded-preserved-48b1a99.jpg.
- Relevant CI passed approved-image-ui, image-prompt-paste, first-image and private-lab. Other workflows were still running at final review; do not claim full CI green. Previously recorded unrelated Assets/domain/Explore harness failures are outside this correction.
- Completed. No further design changes requested; real signed-in customer/Owner review remains separate from synthetic role coverage.

## Remove Video Generate credit-pack note, 2026-10-22 (Europe/Berlin)
- User requested removing the credit-pack sentence beneath Generate, screenshot `libfile_16cd381245908191ad774c2a2d81edd3`.
- Source base: `b77a740`; `lab/lab.js` clears only the paused-trial pricing helper and hides its empty paragraph. Generate still opens pricing and preserves the draft.
- `lab/studio.html` refreshes the JS cache marker; existing customer Video browser coverage asserts the helper is empty and hidden.
- Account-review/closed/unavailable messages and generation eligibility are retained.
- Verification: 17 approved Image/Video contract checks passed; customer Video browser checks cover desktop/mobile pricing, preserved drafts, no paid requests and existing account restrictions. Publication/live verification pending.

## Studio wordmark and Owner deck comparison (earlier release), 2026-10-22 (Europe/Berlin)
- User supplied five screenshots (234106, 234114, 234203, 234230 and 235008) and prefers the Owner History composer in image 4. The Higgsfield reference is image 3.
- Verified cause of deck difference: image-deck-surface.css applies its shared grid only to the welcome/card state and guest composer; History retains its separate existing layout. Recommendation: use Owner as the canonical expanded design while preserving compact entry, fixed width/top/sides and downward opening. This turn changes the logo only; the deck recommendation is not implemented.
- Source: `50aa1d40c4ac0378aa0d67b48efe04a4ef5a098f`, based on main `8f451471f26975052a388753978b14f08a0b8b59`. Preserved concurrent editorial pricing and quiet Video History changes exactly.
- Files: lab/studio.html, lab/public-header.css, tests/lab-mood-nav-browser.mjs. Studio now uses the same approved outlined SVG as the homepage for the common guest/customer/Owner header. Reset only the nested logo label's legacy styling to preserve the original footprint and mobile visibility.
- Verification: approved Image contract 5/5 and full existing shared masthead browser test at twelve breakpoints passed. Owner/customer header controls are local fixtures, not real signed-in production sessions. The SVG decodes and stays visible on mobile.
- Published: Cloudflare Pages `pvlab-studio` succeeded for source `50aa1d4`, check `119556802383`, deployment `f6d513b2-2724-4d26-a33c-38545a966b23`. The existing read-only verifier returned LIVE_VERIFIED for public-header.css?v=20261022-studio-wordmark1, SHA-256 `eff4e0af3c395d1690c0bc0191ccc1cf9cc366c69067b04b1ed1b66912acc65f`.
- Actual production browser at https://pvlab.studio/studio?tool=image, signed out, 1363x936: new shared logo decoded from the approved SVG, displayed 64.02x20.17px, expected stylesheet version and no horizontal overflow. Real customer/Owner sessions and physical mobile devices were not inspected.
- CI masthead `119555567122` and approved Image contract `119555562963` passed. Full CI is not green: queue-smoke could not install Chromium because its CDN certificate/download failed, and Assets still fails the previously recorded Upscaler import assertion at tests/lab-assets-ui.cjs:281. No deck, billing, account or provider behavior changed by this release.
- Deck follow-up: implemented in the active Owner canonical entry above; this earlier section records only the logo release.

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
