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
