# Brazil / Mexico purchase verification, 2026-11-02

- Scope: verify regional display, hosted Checkout and exactly 300 credits for the approved one-time EUR3 pack without live charges or production wallet changes.
- Source inspected: main `0e0935fac406e04d064c837c8bccf82e3d94c196`. No overlapping open billing/pricing writer found. Branch: `test/br-mx-purchase-verification-20261102`.
- Fresh release verifier: `LIVE_VERIFIED` for `lab/lab.js?v=20261101-wardrobe1`; exact-commit Cloudflare Pages check `125239933931` succeeded. Production Worker health: `pv-lab-2026-11-02-local-currency`.
- Fresh public GETs: local-currency JS/CSS, account.js and pricing-overlay.js return HTTP 200 and equal the reviewed source bytes. Published home HTML contains `data-price-eur="3"`, `topup3` and the currency-module import; account HTML references the currency-enabled account version. HTML is hosting-transformed and was not claimed byte-identical.
- Public homepage browser observation: 300 credits / EUR3 is the first one-time pack, followed by unchanged EUR10/29/75 packs. The observed browser/edge response was EUR, not a Brazil/Mexico regional observation; no geographic override was used.
- Reused actual reviewed CI evidence rather than repeating unchanged browser suites: account/home job `125235668214` passed the BRL/MXN assertions at 320/1440px; Studio job `125235665203` explicitly logs BRL and MXN passes at 320/390/1440px with the original SKU, EUR base, final-checkout disclosure and no automatic purchase. These are intercepted regional responses, not traffic originating in Brazil/Mexico.
- Stripe account inspected read-only: Adaptive Pricing is enabled on existing hosted sessions; localized IDR presentment is recorded separately from EUR base amounts. All 20 returned sessions were inspected, with no existing topup3 session or completed BRL/MXN payment. No session was created or modified.
- Checkout source retains server-controlled EUR300 cents, payment mode, topup3 metadata and explicit Adaptive Pricing. Stripe documents BR/MX support and separate presentment_details while fulfillment retains integration-currency amounts. The page explicitly says local prices are estimates and the final amount/currency is confirmed at Checkout.
- Extended the signed webhook regression from BRL-only to separate EUR/BRL/MXN cases, each with its own in-memory wallet. Every valid case grants exactly 300 once; replay, asynchronous event, invoice copy and invalid base amount/currency/status/mode/identity cannot duplicate or misroute the grant. Local amounts in these fixtures are synthetic, not live exchange quotes.
- Validation: 25 focused currency, sandbox billing, customer billing and approved Image contract tests passed; `git diff --check` passed. New local browser run was unavailable because the Chromium executable is absent; existing successful unchanged CI browser evidence above was reused.
- Live test-only Worker health returns `testOnly:true, configured:true`; browser test page requires Clerk sign-in. The connected Stripe plugin exposes only live mode, so no real Stripe test Checkout was created or completed. No production payment, balance mutation, subscription, provider call or deployment was performed by this audit.
- Result: no reproducible application defect found in the audited paths. Only regression tests and this checkpoint changed. Remaining verification: authenticated Stripe sandbox sessions with `test+location_BR@example.com` and `test+location_MX@example.com`, visible final Checkout totals, and test webhook delivery in the isolated deployed wallet. Production geographic display from BR/MX remains unobserved independently.

# Local currency by visitor country, 2026-11-02

- Objective: show a familiar local price to incoming ads traffic, starting with Brazil and Mexico, on the homepage, Studio pricing overlay and account credit catalog.
- Source base: `8eee23f8fd92d95ad8a0a6f59aa9b8c16b380023`; isolated branch `feature/pvlab-local-currency-20261102`.
- Edge country comes from Cloudflare request.cf.country, never browser query/header overrides. ECB reference rates are checked for freshness, cached for one hour and used only for clearly approximate display. Missing/unsupported country or unavailable/stale rates retains EUR.
- Shared local-currency module keeps the original EUR amount visible, preserves monthly/one-time disclosures and all seven purchase SKUs, and adds a brief final-checkout confirmation note. Supports 27 non-EUR markets available in the ECB feed, including BRL/MXN/USD/GBP/PLN/RON.
- New Stripe-hosted Checkout sessions enable Adaptive Pricing explicitly. The Checkout creation request pins Stripe API 2026-09-30.endive and includes its required integration identifier; existing subscriptions and all other Stripe operations are untouched.
- Original EUR price_data, credit quantities, signed webhook validation, duplicate-event guards and immutable ledger remain authoritative. Stripe reports localized presentment separately, so BRL display does not bypass amount/currency checks.
- Tests: 28 focused billing/pricing/approved Image/locale tests passed locally. Extended sandbox assertions cover Adaptive Pricing request fields and a BRL presentment event delivering exactly 300 credits once.
- CI passed: account/browser jobs 125235643774 and 125235668214; Studio overlay 125235665203 (BRL/MXN 320/390/1440px), billing/partner unit 125235668378, trial 125235668001, promotions 125235667020 and approved Image 125235663390. Downloaded actual account/home screenshots from artifact 13135416160 and visually reviewed phone/desktop pricing. No horizontal overflow; original EUR amount and purchase SKU preserved.
- Broad suite: 948/951 pass; the same three pre-existing readFileSync/Moods/ZenCreator failures remain. Pricing browser still stops at the pre-existing Moods vs Explore Moods header expectation. No gates were disabled or unrelated application code changed.
- Published: PR #790, reviewed head 47024ed9f94aaddafd7a37c39ebb7713e7189a80, merged 80aeac5587bb4c0583b9b8117f0fb6b720064e03. Exact-merge Cloudflare Pages check 125237593914 and Worker deployment job 125237224836/run 41433386464 succeeded.
- Production: Worker /health reports pv-lab-2026-11-02-local-currency. Local-currency endpoint returns HTTP 200. Release verifier returned LIVE_VERIFIED for lab/lab.js at the merge SHA, SHA-256 572fa9de848d4cef6faa6652e6df69c703d974e407f54b42a6555e2b366dce96. Public local-currency.js and CSS returned HTTP 200 and exact reviewed bytes (JS c869afdf141ae5920fd67d89e7c1f8c0a839761b14cb86278e64ca4f4b22b5d4; CSS f62ca02fc55926b88c20345ac0a102cdfa744b8739ac5176cd3afa44b17ccf59).
- No real payment, production wallet mutation or new subscription was used for testing. Real customer local-currency payment completion remains separately unperformed.
- Next: observe real customer checkout conversion. Unsupported countries/rates retain EUR; local display is indicative and Stripe confirms the final amount/currency.

## One-time €3 / 300-credit pack, 2026-11-02
- Alejandro approved adding a €3 pack with 300 credits and clarified that it is a one-time payment, not a subscription. Existing packs and monthly plans remain available at their previous values.
- Baseline main: 4b51a7341d3621cfe195d72929bf7c2d24a1b4c0. Isolated branch: feature/pvlab-eur3-300-credits-20261102. Open PRs inspected; no overlapping active billing/pricing task found.
- Added server SKU topup3: payment mode, EUR 300 cents, 300 credits. Existing signed webhook validates payment status, mode, currency, amount and customer identity before the immutable credit grant; duplicate events and invoice copies cannot double-credit.
- Homepage One-time credits lists the new pack first. Studio uses that same markup and accepts/restores topup3 through sign-in; Account and wallet menus read the server catalog. No subscription, automatic renewal, provider price or free-image rule change.
- Reuses the existing inline Stripe price_data integration. No separate Stripe Product, Price, secret or migration is required.
- Added checkout/fulfillment tests for server-controlled amount, no prepayment credit, invalid payment facts, duplicate/async events, invoice copies and no subscription creation. Updated existing catalog and UI counts from six to seven products; new pack is exercised in Studio purchase and sign-in recovery tests.
- Local focused verification: 31 billing, sandbox, pilot, price-integrity and approved Image contract checks passed. Final reviewed PR head d50e90635322a0cfeb50c631682e66c7ac6f1976 passed Studio pricing overlay (125196928484), account browser (125196926794), promotions/security (125196928074), first-image trial (125196928879) and approved Image contract (125196927297).
- Broad units: 944/947 passed. Three unchanged baseline failures: missing readFileSync import in lab-meta-capi.test.mjs and old copy expectations in Moods/ZenCreator tests. Gallery pricing-count regression was corrected; the later viewer width fixture failure matches unchanged main job 125050058372 at line 265. Other existing typography/header browser failures were inspected; no test gate was disabled or production design changed to satisfy them.
- Published PR #789, merge 9facc2ff9635cb6fccb5becf34182d554e822da8. Exact-merge Cloudflare Pages check 125198778801 and production Worker deploy run 41421577759 / job 125198115220 succeeded. Worker marker: pv-lab-2026-11-02-topup3.
- Scoped release verifier returned LIVE_VERIFIED for lab/lab.js on pvlab.studio, SHA256 c85373e00ca31a5ab894af58df7b07526a822319028b80e5a5446d13ec9443d8. Public live One-time credits tab visibly lists 300 credits for EUR3, followed by unchanged EUR10/29/75 packs; desktop presentation inspected. Account and Studio checkout routing/sign-in recovery verified with intercepted browser requests at 320/390/1440/1648px.
- No real charge, new Stripe subscription, production wallet mutation or paid generation was used for validation. Signed webhook fulfillment is tested with sandbox events; a real paid customer transaction remains separately unperformed.
- Status: implemented and published. Next action: observe actual topup3 checkout/purchase conversion. No further setup required for the existing inline Stripe price_data integration.

## Estimate hint toggle, 2026-10-22 (Europe/Berlin)
- User requested the circled `!` to close its estimate explanation on the second tap on iPhone. Existing outside-tap, Escape, hover, keyboard focus and credit purchases must remain intact.
- Cause: `pricing-tabs.js` already flips `aria-expanded`, but `pricing.css` kept the tooltip visible through persistent `:hover` / `:focus-within` on touch.
- Scope: `lab/pricing-tabs.js`, `lab/pricing.css`, the homepage and Studio overlay cache references, and two existing browser tests. Dismissed visual state overrides sticky touch styles, reopens on next tap, and resets on fresh mouse hover or keyboard focus.
- Browser tests now assert open, second-tap close, and untouched checkout for homepage cards and the Studio modal, including emulated mobile touch for both monthly and one-time credits. No prices, SKUs, layouts, checkout handlers or account code changed.
- Source/test and Cloudflare publication evidence is tracked in the corresponding scoped pull request; live mobile Safari confirmation remains separate.

# Studio pricing and zero-credit exploration, 2026-10-22

- Objective approved by Alejandro: use the compact plan rows from the homepage reference; allow Mood preparation without a pricing interruption; remove the paused complimentary-generation notice.
- Reference: `image(20261021-233609).png`, Library ID `libfile_d58e2a00e0088191b7d34225d632c7cd`.
- Source base: `392fbb40748bb5f57f77c0c1527e54f18f1869ff` on main.
- Branch: `fix/remove-paused-creation-copy-20261022`.
- `lab/lab.js`: zero-credit or unavailable-generation customers do not request background provider quotes; background funding errors cannot open pricing.
- Only an explicit Generate action opens the plan comparison for insufficient funds. Upgrade and the balance retain access to the same catalog.
- Welcome balance copy no longer says complimentary generation is paused. Funding errors use a neutral credit-selection message.
- `lab/pricing-overlay.css`: centered 814px maximum desktop panel, three compact rows, subtle existing Creator photo, monthly/one-time tabs; mobile uses the same content with full-width actions.
- `lab/pricing-overlay.js`: reuse the homepage headline, intro, plan content, estimates and billing disclosure without the former card decorations.
- All six SKU IDs, euro prices, credit quantities, Stripe callbacks and backend entitlement checks remain unchanged.
- `lab/studio.html`: new `creationFlow=20261022-editorial-rows1` query and overlay cache version `20261022-editorial-rows1`.
- Tests: approved Image contract, trial pause and price/debit integrity all pass (19 checks).
- Overlay browser passes 320/390/1440/1648px, checkout SKU handoff, guest sign-in continuation, no automatic payment, draft/focus retention and renewal disclosure.
- Existing first-image browser passes new/returning/owner/public parity and quoted one-click Generate with intercepted requests.
- Full account/checkout browser passes, including zero-credit Mood selection for both generation-ready and paused accounts at 1440/390px, plus a failed background quote regression.
- Desktop and mobile panel screenshots visually reviewed using local synthetic sessions.
- Published: PR #431 merged as `a5b2b595f7997f7c335bfd3d0f8e36e25c38514a`; production descendant `8f451471f26975052a388753978b14f08a0b8b59` retains the exact reviewed JS/CSS.
- Cloudflare Pages check `119555615037` succeeded. Release verifier returned LIVE_VERIFIED for both `lab/lab.js` and `lab/pricing-overlay.css` on pvlab.studio.
- Public live panel rendered and visually checked at 1440/390px: compact rows, Creator photograph, no horizontal overflow, monthly/one-time tabs and billing disclosure. This used public GET responses only; no signed-in production account was created.
- Relevant PR gates passed: approved Image, pricing overlay, account/checkout, first-image, input paste, compact prompt, units and static validation.
- Unchanged baseline CI failures are documented in PR #431: Upscaler assertion `lab-assets-ui.cjs:281`, obsolete Explore harness signature, and a production poll before PR deployment. No gates were disabled or weakened.
- No real payment, account mutation or paid generation was used for testing.
- Next action: none for this request. Real-account actions and any unrelated baseline test repairs remain separate from these verified changes.

# Homepage pricing: current state

- Date: 2026-10-12.
- Starting source: `916f606` on `main`.
- Scope: homepage pricing presentation, approved by Alejandro for application and commit.
- Approved proposal: `06-Create-Without-Interruption.png`, Library ID `libfile_1c262a37046c8191842574a95519bf63`.
- Follow-up refinements approved: heading approximately 20% smaller; only mood names on cards; subtle borders and shadows.
- Preserve the right-side price rows and shared left image collection.
- Heading: Create without interruption. DM Sans 300, tracking -0.052em, following the existing hero.
- Palette: neutral near-black and warm white. No olive or green interface styling.
- Cards: Polaroid 600, 90s Cinema and 80s Film, matching the user's Analog Club selection.
- Image sources: existing `mood-previews/hd/polaroid-600-20261011.jpg`, `90s-cinema-clean-final-20261011.jpg`, `80s-film-20261011.jpg`.
- Images are not regenerated or re-encoded. The Polaroid print border is cropped through CSS.
- Desktop: compact collection on the left and three monthly plan rows on the right.
- Mobile: compact collection above pricing; all three plans remain directly comparable.
- One-time credits link scrolls to the existing three credit-pack buttons.
- All six original `data-lab-buy` SKUs, existing product prices and credit quantities are retained.
- Existing Soul offer, billing notice, status live region and checkout gating remain present.
- All plan arrows share the same neutral resting state; cream highlighting appears on hover, keyboard focus or while opening checkout.
- Backend billing rules, authorization, provider costs and paid generation code are unchanged.
- Relevant sources: `index.html`, scoped `pricing.css` and `customer-entry.js`.
- Verification uses the existing `tests/lab-landing-ui.cjs` at 1440, 390, 320 and 768 pixels.
- Coverage: visual geometry, image loading, hero typography, zero horizontal overflow, six actionable checkout buttons and credit-pack navigation.
- Review desktop/mobile pricing images from `PRICING_CARDS_1440` and `PRICING_CARDS_390` in the landing CI log.
- Implementation commit: `10c8f1a`, local branch `codex/pricing-analog-cards`.
- Local checks passed: four existing Soul pricing tests, JavaScript syntax, diff whitespace, preserved checkout SKUs, existing image paths and unique HTML IDs.
- Alejandro explicitly authorized sending these changes to `parallelvisionberlin/parallelvisionberlin.github.io`, verifying desktop/mobile and publishing to `main` on 2026-10-12 at 17:41 Europe/Berlin.
- Remote implementation commit: `3553ace7bb7df34c976cab9dbfa5a2bc832d8e5b` on `codex/pricing-analog-cards`.
- Remote static build and asset verification passed. Pricing browser checks passed at 1440, 390, 320 and 768 pixels; desktop/mobile captures visually reviewed.
- Updated an outdated Studio test assertion to verify the existing title overlays inside photographs. No Studio design change.
- Complete landing browser gate passed on `72efaa2f47554bf1bd408c4e701ed9383b0b4b06` (run `38273144722`).
- Integrated concurrent main changes through `8fbf3b63989a76604c14bdd672cd69066ffe0a3e`; the README merged cleanly and unrelated work is preserved.
- Integrated commit `2f49444fb955ed76a27b6d5add48ec0aef6e55d7` passed static build, landing browser, asset/runtime and account gates (runs `38273393001`, `38273393132`, `38273393716`).
- Published to `main` by a non-forced fast-forward. Subsequent documentation commit `bce889a57079c362803203139419502c1eed4eb4` preserves this implementation.
- GitHub Pages build/deploy run `38273670635` succeeded. Live page verified on 2026-10-12 at `https://parallelvisionlabel.com/lab/#pricing`.
- Live browser confirms all three images loaded, the approved layout, DM Sans 300 and no horizontal overflow at 1363 pixels. Responsive checks passed at 1440, 390, 320 and 768 pixels in CI.
- Final scope: `lab/index.html`, `lab/pricing.css`, `lab/README.md`, this state file and `tests/lab-landing-ui.cjs`.
- Approved spacing refinement at 19:15 Europe/Berlin: subtract 36 px from desktop pricing top padding. The existing mobile override remains 48 px. Card and type sizes are retained.
- Refinement scope: `pricing.css`, its cache version in `index.html`, and this checkpoint. Diff reviewed; no behavior change.
- Spacing commit: `aad1c905c28df9ae2f1d65c8c709d4be77e31ba9`, based on `5552dd636ee59e44e2a7bc6fbad540678002a7ec`, published to main without force.
- Refinement validation: static build and asset/runtime checks passed; existing landing tests passed at 1440, 390, 320 and 768 px (run `38283210225`).
- Spacing refinement confirmed live on 2026-10-12 after successful Pages run `38283210335`: padding decreased from 95.41 px to 59.41 px at a 1363 px viewport, images loaded and no horizontal overflow. Desktop maximum padding is now 68 px; mobile remains 48 px.
- Spacing adjustment is confirmed live. New request at 21:16 Europe/Berlin: make every purchase arrow visibly respond and remove the permanent Creator highlight.
- Purchase feedback now appears beside the clicked plan or beneath credit packs. Owner, pilot, unavailable billing and account restrictions remain enforced.
- A clicked SKU is retained in same-tab session storage for up to 15 minutes and consumed once on the matching sign-in return. A URL alone cannot initiate checkout. Failed attempts are not automatically retried.
- Checkout clicks are locked while pending, require the same signed-in session, and accept only HTTPS Stripe destinations. No backend billing enablement or pricing change.
- Verification extends `tests/lab-account-browser.mjs` with all six arrows, owner/unavailable feedback on desktop/mobile, neutral idle states, duplicate clicks, sign-in continuation, invalid destinations and session changes. All payment requests are intercepted.
- Purchase implementation `059c0deb792541ef104a5b7feb0ad4349e5042cf` passed the account browser gate (run `38297348525`), including every arrow, retained SKU, intercepted Stripe navigation, duplicate-click prevention and session/URL guards. Landing and static build gates also passed.
- Integrated concurrent main changes through `10b67b678de39d7794f7ac39d4544a8e769c7360`, preserving the latest sign-in modal positioning. Published as `70480477d3a3b358f22a5005f59403c62c698173` without force; later Studio changes retain all pricing fixes.
- Pages deploy run `38297921676` reported successful publication of descendant `df33a76a752a97fe46006145ff413d8d6e6b1275` in its deployment log; the run was subsequently superseded by concurrent changes. Live browser verification completed on 2026-10-12 at `https://parallelvisionlabel.com/lab/#pricing` with cache version `20261012-purchase-feedback1`.
- All six live signed-out buttons opened sign-in and showed one nearby visible message for the selected plan or pack; each recovered its enabled, non-busy state after closing the modal. All three monthly arrows have transparent resting backgrounds, images load and there is no horizontal overflow at 1363 px. Authenticated return and checkout behavior were verified in CI with intercepted requests, without real payments.
- Final purchase-fix scope: `lab/customer-entry.js`, `lab/pricing.css`, `lab/index.html`, `tests/lab-account-browser.mjs` and this checkpoint.

- 2026-10-13 pricing clarity pass: lowered section entry spacing; aligned collection and prices at the top; enlarged Monthly plans/One-time credits tabs and hit targets; gave purchase rows more vertical breathing room. Replaced the confusing Soul ID calculation/quote exception pitch below the rule with a short, model-neutral explanation of how credits work. Kept recurring and one-time terms and all six original SKUs, payment gates and runtime billing rules. Updated landing and Soul copy assertions.

- 2026-10-13 follow-up: reserve signed-out Upgrade header space without exposing a link, preventing navigation reflow on sign-in; restore One-time credits tab for a validated checkout return tied to a one-time SKU. Fix account UI browser coverage to switch between the two panels instead of attempting hidden buttons. No billing or product pricing changes.

- 2026-10-13 final approved pricing-flow polish: removed the entire secondary How credits work/technical legal paragraph from below the two-column layout, integrated the single-credit explanation into the pricing intro, and placed a two-state renewal clarification plus Billing terms link directly beneath the selected pricing rows. Retained all six SKUs, authentication and checkout behavior, photographs, headings and existing Terms page. Billing disclosure follows the tab state with browser coverage at 1440, 768, 390 and 320 pixels; no billing backend changes.

- 2026-10-13 final desktop rhythm: approved 10–12% shorter pricing rows (117 → 103px, padding 27 → 20px); tightened heading/description/tab gaps without changing font sizes; shifted the left image deck 20px down only on desktop. Pricing now has a 100svh minimum for direct-anchor landing and the adjacent Invite a creator offer uses #141414 with light typography, avoiding a white strip at the viewport bottom. These are scoped presentation changes: the three original mood photos, both pricing tabs, six SKUs, auth, referrals and billing behavior remain unchanged. Expanded responsive browser assertions verify viewport height, row geometry and referral colors.

- 2026-10-13 approved pricing hero composition: desktop top padding now responds to viewport height (up to 110px), creating a better vertical balance on direct pricing navigation; mood card fan shifts left by 22–38px on widths above 1000px; headline grows up to 50px in DM Sans 300; desktop pricing rows grow from 103px to 112px and plan names from 24px to 26px. Tablets receive a smaller top offset; mobile card placement and 106px row rhythm remain as before. No photo assets, credit products, checkout flows or backend behavior were altered. Landing browser checks now cover headline size, image separation, section spacing and 112px rows.

- 2026-10-13 final viewport-centering refinement: replaced the earlier fixed responsive desktop top inset with true vertical centering inside the pricing section's 100svh minimum. Equal desktop vertical padding keeps the pricing headline, photo fan and price rows visually centered on both 853px and 1000px tall viewports. The prior horizontal image separation, typography and 112px plan rows are unchanged. Mobile retains its explicit block layout and compact padding. Desktop responsive tests assert balanced top/bottom free space.

- 2026-10-13 final desktop micro-adjustment: shift the entire pricing composition up 25px and the three-photo fan a further 20px left relative to the existing desktop transform, only for screens at least 1001px wide. Mobile and tablet layout, photography, typography, pricing, checkout and all interaction remain unchanged. The landing test now checks exact desktop vertical offset and photo separation.

- 2026-10-15 approved user screenshot implementation: moved the 200 free credits CTA below the photographic mood fan, enlarged purchase tabs, expanded editorial pricing rows with neutral "Most flexible" tag, kept minimal divider layout and all six live SKUs. Model-use examples are calculated from the documented 17 credit Seedream Lite 2K and 73 credit Seedance 1.5 Pro 720p/10s sample rates, marked approximate, alternatives rather than combined entitlements, and subject to live quotes. Mobile places actionable pricing first. No Stripe, account, API or provider changes. Scoped to homepage index.html, pricing.css, landing UI assertions.

- 2026-10-15 disclosure polish: removed the standalone tiny example-rate paragraph beneath pricing and replaced it with a discreet, keyboard-accessible circled ! next to the illustrative image counts on all six plans and packs. Native details supports touch clicks; hover/focus reveals the identical truthful caveat without occupying layout space. Preserve the already compact 1753x832 fold, billing terms, all credit amounts and the existing checkout. Browser coverage checks tooltip hover, tap, bounds and no accidental purchase.

- 2026-10-15 final page polish requested by user: remove Creator "Most flexible" badge; move the disclosure (!) to the end of all image/video/upscaling estimates; slightly increase estimate size, contrast and weight; add a quiet neutral purchase-row hover (fine hairline, barely visible background and 3px label nudge). Keep the fashion photography, six products, purchase overlays, keyboard disclosure and billing terms unchanged. Browser checks enforce DOM order, contrast-size floor, hover and no row shift, and mobile overflow.

- 2026-10-15 glamorous distribution refinement: revisit approved editorial mockup by widening desktop page content to 1600px, shifting photograph fan left, giving two columns more breathing room and making the 200 welcome-credit heading and primary action more prominent. Slightly strengthen plan names and prices without adding badges or ecommerce cards. Short desktop heights keep compact photos and checkout visible in one viewport. No SKU, backend, billing or sign-in changes. Browser checks add positioning, offer legibility and preservation of existing fold checks.

- 2026-10-18 approved Studio Upgrade treatment: independent centered 1090px editorial dialog, subdued reuse of existing leather-editorial fashion asset (no new image or provider generation), stacked headline “More room to create.”, restrained photo gradient, three taller side-by-side plans, line icons for credits/image/video, brief truthful usage notes, white Creator CTA, single shared footer and clear renewal/one-time terms. Studio styling is scoped to `#lab-pricing-overlay`; homepage collection and layout are unchanged.
- Uses the same live-cloned `#pricing` source, all six original `data-lab-buy` IDs and estimates, popovers, tab handlers and authenticated Stripe callbacks. Tests extended for 1440px desktop geometry and 390/320px mobile reachability, close/focus, draft retention and purchase routing. No billing code or credit figures changed.
- Source files: `lab/pricing-overlay.css`, `lab/pricing-overlay.js`, `lab/lab.js` (import cache key only), `lab/studio.html` (asset cache keys only), `tests/lab-pricing-overlay-browser.mjs`. Deployment and CI status must be verified separately.

- 2026-10-18 user explicitly rejected first deployed 1090px version and approved the second screenshot instead: wide approximately 75vw centered frame, larger header, a true three-card monthly comparison with taller cards, dark non-photographic background, thin bronze Creator emphasis and single footer row. One-time credit packs use the same card layout. The first version displayed a face and too much repeated fine print.
- Scope: Studio-only overlay CSS plus moving the existing benefits and legal renewal note together inside a shared footer; per-card duplicated billing copy removed. Original homepage image collection, products, estimates, SKUs, wallet/checkout callbacks and Terms link remain untouched.
- Added 1648px browser geometry, background-asset, footer and billing-copy checks. Source commit, CI and Cloudflare deployment must be verified before claiming live.
