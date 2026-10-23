## Checkout recovery: review pending (2026-10-23)

- Objective: implement only P1/P2/P3 from the purchase audit at `69d7d02`.
- Branch: `codex/pvlab-checkout-return-recovery`; [PR #462](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/462), draft and unmerged.
- Latest incorporated main: `43db51b9bfa53483e9fdb709bc568b6c37c151aa`; normal merge `be9efc4` preserves its final Explore CSS reference.
- Implementation commit: `7558a13`; no force push. Exact-head remote checks are pending review in the PR.
- Preserve the later homepage credit banner, responsive welcome email, Explore photobooth and subsequent shared banner style changes.
- P1: `customer-wallet.js` refreshes `/api/session`, including authorization and provider configuration.
- `lab.js` applies that profile without replaying account initialization or resetting the draft.
- Positive balance never sets `generationReady`; review/closure/promotion restrictions remain enforced.
- Success return polls at 2-second intervals, at most 12 requests within a 30-second scheduling window.
- The existing session request timeout bounds any final in-flight request; focus/manual refresh remains available after polling stops.
- Logout/account changes invalidate pending profiles, queued refreshes and recovery timers.
- P2: `pricing-overlay.js` keeps imported cards inert and purchase buttons disabled until handlers and the requested tab are ready.
- P3: `checkout-return.js` stores only SKU, customer, route, draft marker and timestamp in same-tab sessionStorage.
- Checkout context is allowlisted, customer-bound, expires after 30 minutes and is consumed once.
- Cancellation restores the monthly/one-time tab and selected SKU focus; it never starts another Checkout.
- Homepage, Studio and account-page purchase entries record context only after validating the Stripe destination.
- Existing private Image draft storage preserves prompt/settings/photos through outgoing Studio Checkout.
- Focus and persisted pageshow refresh the complete profile; browser Back restores selection with or without a cached document.
- No CSS, photographs, design, prices, billing address, Worker, database or commercial settings changed.
- New deterministic tests cover bounded/late webhook, rejected context, account switches and the BFCache purchase lock.
- Extended account browser tests cover 1440/390px late webhook, denied positive balances, first usable click, cancel, focus and Back.
- Actual Back navigations passed; Chromium reported `pageshow.persisted=false` in all four cases.
- Persisted BFCache lifecycle is explicitly simulated in browser and unit tests; native cache eviction/restore remains unverified.
- Local relevant unit checks: 110 passed, 0 skipped (including approved Image contract and billing/credit/webhook guards).
- Account browser passed full existing matrix plus the new regressions; pricing overlay browser passed 320/390/1440/1648px.
- Existing homepage credit banner browser passed all five desktop/tablet/phone sizes, with no geometry changes.
- Existing one-click mock-generation browser: 53/53 passed; Windows path adapter used in memory only.
- Screenshots inspected for funded desktop/mobile and cancelled pack/subscription selection; no horizontal overflow.
- Known unrelated failure retained: `lab-first-image-instant-browser.mjs:126` backdrop comparison at 1920px.
- Audit baseline: max=234 / mean=40.745716145833335. After the later main banner CSS, both exact main `43db51b` and PR `df04848` fail with max=234 / mean=32.85790798611111; no assertion changed.
- Payment, credit allocation and first generation are tested locally with synthetic identities/intercepted APIs only.
- No real purchase, paid generation, production account mutation, PR merge or production deployment performed.
- Final local application validation: `df04848`, Node 24; the subsequent handoff-only commit does not change tested application/test bytes.
- GitHub Actions: 25 checks queued on `df04848`; no remote test pass claimed.
- Cloudflare automatically built a branch preview (`c410bf21`), not production; no manual deployment was initiated.
- Remaining acceptance: normal-customer test payment -> webhook credits -> first generation in a confirmed test environment, plus real Safari BFCache.
- Next: review draft PR and its exact-head CI; retain failures/limitations explicitly before any release approval.

## Homepage zero-credit banner (2026-10-23, completed and live)

- Objective: reuse the approved Studio white notice on the PV LAB homepage for confirmed zero-credit customers, with no layout movement.
- Date: 2026-10-23 (Europe/Berlin).
- Verified source baseline: main `69d7d02c236fc33472881451257b70b38715bee3`.
- Implementation commit: `7f503be30837ae68f29817f32ad8cc7d397bf9b2`.
- [PR #455](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/455) merged as `088d9c1b014aa167e61125a6a3250dd7042cd1f0`; concurrent main changes were preserved.
- Application scope: `lab/index.html`, `lab/customer-entry.js`, `lab/studio-credits.css` only.
- Regression coverage: `tests/lab-home-credit-banner-browser.mjs`, existing `.github/workflows/lab-landing-stability.yml`.
- Reuse the Studio notice classes, copy, responsive styling and Video absolute overlay rule; no new banner system.
- Mount inside the existing homepage masthead so `.landing-header--home + main` and hero selectors remain intact.
- The banner top equals the navigation bottom at desktop, tablet and phone widths.
- Eligibility reads the existing authenticated `/api/session` response: current session, `customer === true`, numeric `balanceCredits === 0`.
- Hide while loading or refreshing and after failures; never infer zero from missing, null, string or invalid balances.
- Exclude logged-out visitors, funded customers, Owner/Admin, closed accounts and billing-review accounts.
- Dismissal uses sessionStorage keyed to the current login session, plus an in-memory fallback for storage errors.
- Dismissal survives account refresh and same-session reload; a different login session is eligible again.
- The existing copy links to the homepage's existing `#pricing` flow without starting checkout.
- No prices, SKUs, billing handlers, authentication, credit balances, hero content, photography or typography changed.
- Required Image contract and account/referral/role unit checks passed locally (15 checks).
- New browser coverage passed 1920x1080, 1440x950, 768x1024, 390x844 and 320x740.
- Exact geometry equality on appearance/dismissal includes hero/photo/copy/actions, header/nav, main/footer, document height/width and scroll offsets.
- Eligibility, delayed/failed responses, session dismissal, pricing link, account-menu hit targets and no API writes passed; no mobile horizontal overflow.
- Existing landing browser suite passed all ten width/font cases; existing account/checkout suite and all twelve customer Video cases passed.
- Local legacy suites used temporary Windows path adapters only; no unrelated committed test changes.
- PR CI passed landing/new banner, account, pricing, approved Image contract, static validation, backend, gallery and image-reference checks.
- Approved Image CI initially timed out during checkout; one diagnosed retry passed the unchanged required test.
- Broader Video CI fails the existing hidden `#upscale-info summary` timeout in `tests/lab-upscale-ui.mjs:57`; the identical failure exists on baseline main.
- Domain readiness smoke also fails on baseline main and still expects `lab.js?v=20261018-ref-stable1`; neither gate was weakened.
- Cloudflare Pages `pvlab-studio` production deployment `bab55682-ebf5-4524-b1e3-2491d9c94b5c`, check `120365173297`, succeeded for merged commit `088d9c1b`.
- Existing read-only release verifier, scoped to homepage references, returned LIVE_VERIFIED for both changed assets on `https://pvlab.studio/`.
- CSS version `20261023-home-overlay1`: SHA-256 `3d57c110d2188420983b4805a4a977376b5d2bed6cf43da8dd2758f3b48f6130`.
- Script version `20261023-home-credit-banner1`: SHA-256 `8965cb4c19dcce35ced4a3e0eeb825b9770cfa10aee779658ab66d5513b7d00e`.
- Live 1440/390px presentation probe used actual published assets and synthetic identity: guest hidden, below-nav overlay, identical geometry after dismissal, no account/payment writes.
- Real signed-in production customer behavior was not exercised; role/balance behavior is covered by intercepted browser tests.
- No remaining implementation blocker. Next action: optional real-customer acceptance; unrelated baseline CI repairs remain separate work.

## Mobile account menu correction (2026-10-21)
- User screenshot: account dropdown hidden behind the Image composer in an iPhone in-app browser.
- Scope: shared menu stylesheet, Studio stylesheet revision and existing account browser coverage.
- Cause: the menu is inside the header stacking context (35), below the fixed composer (82); the panel's own 1000 cannot escape its parent.
- Fix: lift the Studio header only while the account menu is open, and remove its backdrop-filter containing block so the fixed menu positions against the viewport.
- Preserve menu design, prompt deck, account permissions and all billing behavior.
- Browser regression: customer and owner at 390/320px, 660px height; scroll to Sign out and verify actual tap target plus no horizontal overflow.
- Local approved Image contract and account unit checks: 7 passed. Account browser workflow 39580042516 passed, including short-screen tap reachability for customer and owner.
- CI screenshots inspected at 390px; no overflow or menu obstruction. Approved Image contract, prompt expansion, compact prompt, first-image and pricing browser workflows passed.
- Released source: PR #385 merged as 181f3c8fd5c6b0a06365de7e89cf4c3273ae4d64. Cloudflare deployment 8c8542b2-4c34-49d3-9cbd-6eea731d12a5 succeeded.
- Confirmed live DOM on pvlab.studio/studio?tool=image: account-menu.css?v=20261021-menu-above-deck1 and the open-header z-index 1300/backdrop-filter:none rule loaded. Actual signed-in owner UI was covered by synthetic browser tests, not a live owner session.
- PR checks: 18/19 passed. Separate video workflow 39580042703 failed in lab-reference-ui.mjs:187 with EncodingError (source image cannot be decoded); no video/reference source changed in this patch. Preserve as pending investigation; do not claim all CI green.
- Next: user can reload phone Studio and open the account menu; real recreated-account and stale Control Room sync verification remain separate pending work.

# PV LAB account interface

## Current objective
- Bring the account page up to the approved fashion/editorial standard.
- User reference: image(20261012-135720).png, showing the sparse owner view.
- Date: 2026-10-12.
- Source baseline: main 2d63aa88b352c408282c57559884faf1a604a613.
- Prior shared-menu release: 5dae7de040309bede94ed2d65fdcdd1648038c1c, PR #164.

## Design and implementation
- Use monochrome black, charcoal, ivory, fine rules and light DM Sans display type.
- Reuse approved photo: lab/visuals/leather-editorial/hero-mobile.webp.
- This is brand photography, not a user's private image or generated account asset.
- Photographic account masthead, real profile photo/initials and account role.
- Clear sidebar hierarchy and responsive mobile section selector.
- Owners see Workspace, direct Studio and Mood links, and generation connection access.
- Owners do not see the empty Balance/Usage/Billing tabs.
- Customers retain their real credits, products, activity and billing views.
- Referrals remain conditional on actual API eligibility.
- No backend, product pricing, checkout payload or authorization changes.
- Do not introduce gradients outside photo legibility, green dashboard cards or invented usage data.

## Relevant files
- Page: lab/account.html, lab/account.css, lab/account.js.
- Shared menus: lab/account-menu.js, lab/account-menu.css, unchanged in this revision.
- Verification: tests/lab-account-browser.mjs, .github/workflows/lab-account-ui.yml.
- Existing session and wallet APIs remain the data source.

## Verification and release
- JavaScript syntax and five account/referral unit checks passed locally.
- Browser coverage includes customer and owner menus, billing URL guards and sign-out isolation.
- Revised owner screenshots and overflow checks cover 1920, 1440, 768, 390 and 320 px.
- Account browser workflow 38260446528 passed on 12d1131a444840de5dc55e3f5e7222676bedfedc.
- Desktop owner/customer and mobile owner screenshots inspected; no overflow.
- Published implementation: 41dfbf3905a881dc4680a59aac5532384fd35b1b.
- GitHub Pages run 38260839030 completed successfully on 2026-10-12.
- Public account.html, account.css and account.js returned HTTP 200 with the new revision markers.
- Confirmed live: https://parallelvisionlabel.com/lab/account.html
- No blockers. Next action: await visual feedback; reuse these results for this unchanged revision.

## Explicit Home navigation (2026-10-12)
- Approved: a quiet Home text link beside PV LAB on internal pages, always targeting /lab/.
- Source baseline: ea2c68cc09f485a0259129acf03b36aa3c913a4e; preserve concurrent account and billing work.
- Pages: account.html, moods.html, studio.html and mood-creator.html (including My Moods).
- Shared scoped styles: home-navigation.css; the existing logo links remain intact.
- Small-screen Mood Creator uses a two-row header; Account uses the existing compact Studio label.
- Static link and stylesheet checks passed. Local Chromium cannot start in this execution environment.
- Home released in 8fbf3b63989a76604c14bdd672cd69066ffe0a3e; account workflow 38272993924 and Pages run 38272992764 passed.
- Desktop and mobile screenshots inspected. Final <=380px Studio spacing refinement preserves Add credits and Queue.
- Final source: 900e82c6d8b7786148423d1d2affe25fd71156d6; account browser run 38277187841 passed.
- Pages run 38277187963 succeeded; live Studio confirms home2 stylesheet. Home click on Account verified to /lab/.
- Complete: Home on Account, Explore Moods, Mood Creator/My Moods and Studio; no pending work for this scope.

## Active: approved Studio credit notice (2026-10-12)
- User approved the white out-of-credits Studio bar and asked for a simple Add credits deck.
- Rejected: Keep creating / Find your rhythm marketing headings and the large comparison designs.
- Reference: generated image exec-571e8dfa-0030-44ec-942f-0102b37ca003.png in the design conversation.
- Baseline: main 916f6068bd782316775041c23a6ae1e6a7375d17; preserves the newer Film Finish changes.
- White dismissible notice below navigation, driven by the real customer balance at zero.
- Header Add credits opens a compact dialog listing only actual one-time products from the API.
- Monthly plans and account management remain on account.html#billing.
- Balance refreshes after reserved jobs, confirmed failed jobs, wallet opening and window focus.
- No local credit deduction; existing checkout request and Stripe URL guard retained.
- Checkout blocks duplicate pending submissions and ignores responses after a session change.
- Notice is hidden for owners, signed-out, closed or review-restricted accounts.
- No new imagery, prices, backend code, provider credentials or rollout flags.
- Files: lab/studio.html, lab/studio-credits.css, lab/customer-wallet.js, lab/lab.js.
- Tests: tests/lab-account-browser.mjs, tests/lab-image-viewer-browser.mjs, .github/workflows/lab-account-ui.yml.
- Local checks: JS syntax, diff whitespace and 18 account/referral/billing/image-quote tests passed.
- Browser workflow 38272089739 passed at be0acac979cea20b4bbfc3bece7f99b5854299cc, PR #165.
- Desktop and mobile screenshots inspected; no horizontal overflow.
- Existing wallet=1 script marker retained; new creditNotice parameter refreshes the script cache.
- Storage/closure assertions moved to existing account-page coverage; compact deck links there.
- Screenshots cover 1440/768/390/320 px; intercepted checkout only, no real payments.
- Source published: b25fa89eefa76952c8731e1e110a82d8d4ba2785 (PR #165).
- Unrelated landing test expects titles above photos; same failure verified on baseline run 38268271852.
- Gallery/queue workflow 38272411110 and Lab tests 38272411132 passed at e92704f425a26cddce924dfb50ff99b5854299cc.
- Combined Home + credits account workflow 38272993924 passed at 8fbf3b63989a76604c14bdd672cd69066ffe0a3e.
- Pages run 38272992764 succeeded; production Studio HTML, CSS, wallet and app JS verified against that release.
- Live: https://parallelvisionlabel.com/lab/studio.html
- Next: no remaining work for this scope; reuse these results unless relevant files change.

## Refined sign-in and Studio controls (2026-10-12)
- Approved: Google belongs inside the sign-in panel; keep two hero actions only.
- Approved: Assets, Queue and avatar form a compact group at the Studio's right edge.
- References: image(20261012-165335).png and image(20261012-165357).png in the design conversation.
- Baseline: e1398f1b4899ccbd5c065b062aff44c87b98d187; preserves Home, credits and Analog Club pricing.
- Hero Google button removed; header Sign in opens the existing account panel with charcoal/ivory styling.
- Signed-out Start creating opens that same panel and returns to Image Studio after sign-in or sign-up.
- Signed-in and modified link clicks retain normal navigation; early clicks wait for account loading.
- Studio controls align to the gallery edge; Assets has a flat quiet surface and the avatar a subtle border.
- Source: lab/index.html, lab/customer-entry.js, lab/public-header.css, lab/studio.html.
- Checks: tests/lab-landing-stability.mjs and tests/lab-account-browser.mjs cover the affected flow/layout.
- Local syntax, account identity/referral checks and diff whitespace passed.
- Existing CI provides desktop/mobile verification; no local browser or new imagery needed.
- Published implementation: fc970b82c4bfa3dfeaa7b15fe705285214f6d90b, PR #166.
- Landing workflow 38281522737 and account workflow 38281516758 passed at 57eb2f9dfe475fd67c41a2aba56a4c0843835e3a.
- Landing widths: 1912/1440/768/390/320 px, including delayed font/account recovery and signed-out entry.
- Desktop/mobile landing and Studio screenshots inspected; no horizontal overflow.
- Reusable screenshots: artifacts 11761606797 (landing) and 11761512005 (account); local header-review folder in this conversation.
- Pages run 38281749385 succeeded. Public index.html, studio.html, public-header.css and customer-entry.js returned HTTP 200 and matched the release bytes.
- Account-provider calls are mocked in CI; no real Google login or payment was performed.
- Complete: https://parallelvisionlabel.com/lab/ and /lab/studio.html. Reuse these checks for the unchanged revision.

## Desktop hero position (2026-10-12)
- Approved: lift the complete hero copy and actions into a balanced vertical position; preserve the shared left margin and type sizes.
- Reference: image(20261012-173957).png. Final user direction: place it where it fits best professionally.
- Baseline: 33d004667b11150a2ec7d0df8e11a5bbbcac13ef; preserves concurrent result deck and pricing work.
- Above 900 px, center the whole copy block in the photograph below the header. This adapts to the viewport instead of using one fixed offset.
- Mobile/tablet composition, portrait crop, navigation and buttons are unchanged.
- Files: lab/landing-motion.css and its version in lab/index.html. No new tests or assets.
- Published: 8687506edda7f3532cdac65b606c37750605ec08, PR #168.
- Landing-stability run 38287658538 passed at 59d925495daeb8d34a5a76d2d40d8ee2bedfbd63 across desktop/mobile sizes.
- Desktop/mobile screenshots inspected; reusable artifact 11763463490, local hero-position-review folder.
- Pages run 38287852016 succeeded. Live index.html and landing-motion.css returned HTTP 200 and matched the release bytes.
- Complete: https://parallelvisionlabel.com/lab/. No pending work for this adjustment.

## Desktop hero horizontal inset (2026-10-12)
- Approved from image(20261012-182541).png: move the full hero copy/actions 30–40 px right on desktop.
- Add 35 px to the existing hero gutter above 900 px. Preserve navigation, vertical centering, type sizes and mobile/tablet layout.
- Files: lab/public-header.css, its cache version in lab/index.html, and this checkpoint.
- Baseline: c980a84ce88aa39e605d0c913437c89ff3f81a34. No new images, dependencies or tests.
- Verification: reuse the existing landing-stability workflow and its desktop/mobile screenshots.
- Published: 7f96a352798565cb68a4c5713e0b87c3e81ed48c, PR #171.
- Landing-stability run 38296031846 passed at 504fd198ac93133580efb632cc83f87186661809 across desktop/mobile widths; screenshots inspected.
- Reusable screenshots: artifact 11768432488, local hero-inset-review folder.
- Pages run 38296277169 built and deployed successfully. Live index.html and public-header.css returned HTTP 200 and matched release bytes.
- Complete: https://parallelvisionlabel.com/lab/. Reuse these checks for this unchanged revision.

## Homepage account and credit header (2026-10-14)
- User approved replacing the logged-in Upgrade pill with an understated, useful credit control; visitor header, hero image, hero typography and main navigation stay unchanged.
- Source baseline: main 4b4a19de61208519b7df57cd5ff9ce035de87fd4.
- Customer shows authenticated integer balance from /api/session, plus a small + link to #pricing. Zero shows Get credits. Missing balance is not misrepresented as zero. Owner and visitor show no credit-sales control.
- Clicking the avatar exposes My account, Credits & billing, Pricing, My moods, eligible referral entry, Settings and Sign out.
- On mobile, the header keeps Open studio and account while shortening credit copy; at <=375px an accessible + remains.
- The real balance refreshes on focus/visibility and history restoration. Checkout, authorization, wallet and Stripe URLs are untouched.
- Files: lab/index.html, public-header.css, mobile-polish.css, customer-entry.js, tests/lab-landing-stability.mjs, tests/lab-account-browser.mjs and this checkpoint.
- New browser assertions cover customer, owner, zero balance, refreshed balance and sign-out at several desktop/mobile widths, without real sign-in, payment or generation.
- Branch: codex/pvlab-home-credit-header-20261014. Check Actions and Pages separately before marking the change live.

## Homepage first-paint and type polish (2026-10-14)
- User screenshots show visitor Sign in replaced by account avatar and Get credits after a slow Clerk load. Approved: make both Open studio and Get credits visibly semi-bold and keep the right-hand header composed during authentication.
- Baseline main: 76baa089f84a2a133af45a2296f5e5cd723e62c6. Changes limited to homepage HTML, homepage-scoped public-header CSS, customer-entry session presentation, landing browser test and this checkpoint.
- First paint shows fixed-width neutral credit and circle placeholders instead of speculative Sign in or user data. No loading animation, no cached identity or guessed wallet values. CSS reserves identical geometry across anonymous, loading, customer and owner states.
- Clerk identity completion reveals avatar before the slower customer /api/session fetch. That fetch later replaces the credit placeholder with the actual wallet balance or Get credits at zero. Guests see Sign in only after Clerk confirms they are signed out.
- Native auth, checkout, payment products, wallet API, account authorization, images, hero composition and Studio layout are unchanged.
- Homepage-only DM Sans action face supports weights 600–700. Both Open studio and Get credits use weight 600; the Studio pill border is slightly stronger.
- Landing CI verifies first-paint placeholders, delayed customer session, avatar appearing ahead of wallet balance, no geometry shift, guest sign-out, semi-bold computed styles and desktop/mobile no overflow.
- Branch: codex/pvlab-header-first-paint-20261014. Commit and deployment confirmation pending at time of edit; preserve this distinction.

## Shared editorial account dropdown (2026-10-14)
- Approved screenshot follow-up: compact dropdown, real identity row, subtle monochrome icons, smaller typography, owner dashboard separated from standard actions.
- Keep the exact established logo asset `lab/branding/pvlab-wordmark.svg` with its existing 157 x 31 display treatment.
- Source baseline: main b0ce8364526f4443f74360ed266e66c9b1f5cd50. Scope limited to shared account menu JS/CSS, four module-import cache revisions, five HTML cache revisions, and this checkpoint.
- Owner link still gated on the verified profile; customer-only voucher/referrals and session-derived balance remain unchanged. Existing direct URLs, sign-out handlers, avatar trigger and authentication remain intact.
- Studio still loads its dedicated menu overrides after the shared stylesheet; no other Studio design surfaces or backend are changed.
- Static checks: exact source anchors, stylesheet versions and markup references reviewed; no authenticated browser or live deployment check in this environment.
- Deployment: unverified until Pages finishes and the menu is inspected in the real browser on desktop/mobile.

## Account dropdown neutral charcoal color correction (2026-10-14)
- Screenshot confirmed the compact dropdown is released but its slight green/olive cast clashes with the black/grey My Account page.
- Approved: remove green undertones in panel fill, borders, separators, badges, hovers and text, using neutral monochrome charcoal, grey and white.
- Preserve the exact `pvlab-wordmark.svg`, all spacing and typography, account/user roles, menu icon graphics, links and logic. Studio-specific graphite overlay remains separate.
- Baseline: main 1faafac43c4abceb49ca98d83fcbb39b0f12b733. Changes: `lab/account-menu.css`, five shared CSS cache tags, and this state checkpoint only.
- No authenticated session logic, billing or API changes.
- Verify account/landing CI and GitHub Pages deployment separately; do not assume the new revision is live until its Pages run completes.

## PR #377 CI diagnosis and account repair, 2026-10-21
- Source under review: 9a9e15c2dd55432091d8755c4b35fe99c959c261; PR remains open.
- Scope: investigate account/guest/pricing repairs, reference regression and main mobile failures.
- CI repair commits: bf0e670, 0920a39, b3d3941 on the existing PR branch.
- No prompt deck, Mood recipe, Upscaler, Worker, Stripe or credit-ledger edits in this follow-up.
- Original failed video run 39515040917/job 118945050220 actually stopped in lab-reference-ui.mjs:129.
- Its backend and preceding video browser checks passed; the failing locator addressed a hidden legacy Up control.
- getByRole excludes hidden controls by default; includeHidden retains the disabled Base-order assertion.
- The next run reached reference prompt checks and exposed old fallback wording; tests now assert the existing controlled Base variation text while retaining role/target/order checks.
- Main account run 39518038947 passed scrollbar stability and failed its hard-coded 16px header inset at 768px.
- Responsive header CSS overrides that inset; the test now compares actual bounding boxes to computed padding and border within 1px, retaining viewport containment checks.
- Account workflow 39572766964 passed with this stricter assertion, replacing the PR's loose 0–40px tolerance.
- Main mobile run 39518038968 passed native login/upload/Mood/single-submit at 390/320/768px.
- Failure was Discovery lab-app-discovery.mjs:54, after upload, not native startup or Mood selection.
- Discovery fixture omitted required SpicyAPI provider/creditCost and expected USD text after UI adopted credits.
- Fixture now supplies provider SpicyAPI/creditCost 25 and waits for Generate · 25 credits.
- Discovery is now included in the existing Explore Generate PR workflow; no catalogue changes.
- Account repair source shows active zero-credit accounts retain credits controls and can draft before Generate opens pricing.
- Funded/zero-credit customer wallets share editorial pricing; session renewal, duplicate-submit, billing readiness and untrusted URL guards remain tested.
- Closed Clerk identities get explicit closed-account sign-out recovery, never reopening a tombstoned wallet.
- Guest photos remain local until authenticated handoff; guest Generate requests sign-in; private Elements stay protected.
- Initial local required contract/account suite: 14 passed; additional relevant billing/quote/account tests: 24 passed.
- Broad local Node 24 run: 659/660 passed; existing mood-preflight-speed test expects Blob decoding/uploads after one setImmediate and observed zero, including in an isolated rerun. No production change made for that unrelated timing assertion.
- Browser binaries unavailable locally; download returned truncated archives. Browser verification uses repository GitHub Actions.
- Final browser CI results and deployment status must be recorded below after completion.
- Production customer recovery, real Clerk identity recreation, real payments and paid generation have NOT been exercised.
- Prior Cloudflare preview success does not prove authenticated production behavior; no merge or release in this task.

- Follow-on full video run 39573205471 passed reference tests, then exposed a real inspector DOM destruction bug in Seedance submission.
- renderVideoJobStage assigned textContent to video-inspector-empty, deleting the structured Current scene fields; video-scene-states then wrote to missing nodes.
- Minimal implementation fix writes submission text to the existing pv-video-sidebar-footnote only. Seedance test retains its no-page-errors assertion and explicitly checks the model field survives submission.
- Discovery workflow 39573117858 passed native login/upload/Mood/single-submit and Discovery at 390/320/768px with corrected bound-credit fixture.
- The existing reset path addressed a nonexistent footnote ID; it now uses the same existing class selector as submission status. No layout changes.
- Concurrent branch commit 966f279 strengthens the static inspector contract against destructive container writes and updates its selector expectation. Preserved it without overwriting the branch. All payment, quote and submission logic remains unchanged.
- Later Seedance coverage reached hidden legacy media-note inputs; 16002a1 tests their retained input handlers directly, keeping draft/reuse/order and no-charge assertions.
- Concurrent d97c2dc updates the completed-video test to explicit History selection, preserving Create until selection and still asserting exactly one MP4 fetch and zero generation.
- Later Effects coverage clicked hidden legacy tool-effects; 30ac309 exercises the retained handler while the separate Motion Effects browser workflow verifies its current UI.

- Validated code: 30ac309d4f58727c09ffece0cc49a72596cc3097. Video run 39576002620 passed: 669 backend tests, 13 Soul, 53 one-click, 8 Upscaler, 22 reference and 19 Seedance browser checks.
- Current code has 19 successful PR workflows, including account 39576002029 and Explore Generate 39576002192; first-image run 39576002281 is still in actions/checkout, not a test failure. Earlier same-production-code first-image run passed.
- Deployment: PR remains open and unmerged. No authenticated deployed-site behavior, payment or paid generation was verified in this investigation.
- Next action: finish the pending checkout/test run, review PR, then separately verify hosting and real customer identities before claiming customer issues fixed live.

## Published verification, 2026-10-21 (Europe/Berlin)
- PR #377 merged at 09:26:32 UTC / 11:26:32 Berlin into main as 1abf77edd3330f18adbda8abad073867adcb39eb.
- Supersedes the earlier OPEN/unmerged status above. No further merge was needed in this verification turn.
- Verified current main 632fe303199031ce5f5a30c0dc69910ed4e48a2b.
- Direct HTTPS GET https://pvlab.studio/lab.js returned the exact Git blob efb44a89faff520c9baaabbab0df2f98a242341a served by current main.
- Published code includes explicit closed-account sign-out recovery and preservation/reset of the structured Video inspector.
- Real cloud-browser visit https://pvlab.studio/studio loaded the seven-look guest Image view and Add photographs locally control.
- Typed a harmless test direction and selected Green Haze; the exact direction remained intact and no authentication or generation was triggered.
- Real Sign in click opened Clerk's working Google/email-password modal; this browser has no authenticated PV LAB customer session.
- Merged-source account 39576985629, mobile 39576985711, first-image 39576985451, pricing 39576985606 and Video 39576985449 workflows passed.
- Live-domain checks 39576985542 and deployed Studio recovery check 39576985570 passed.
- Separate asset-library workflow 39576985538 fails its legacy Upscaler canvas-import visibility assertion (tests/lab-assets-ui.cjs:281); dedicated Upscaler browser checks passed before merge. Not changed under this account-release scope.
- No real customer login/recreated identity, purchase/refund, private Gallery, or paid generation was exercised. These require an authenticated session and remain explicitly unverified.
- Publication itself is verified on the production custom domain. Next: authenticated customer acceptance test; do not describe a synthetic or public check as a real customer test.
