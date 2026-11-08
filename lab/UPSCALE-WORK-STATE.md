# PV LAB Premium Upscale work state

## Independent requests and automatic recovery / 2026-11-08
- Objective: an interrupted Image upscale must not leave a customer unable to continue working or depend on the owner noticing the account.
- Baseline: main `96b8c75`; branch `fix/upscale-workflow-recovery-20261108`.
- The earlier #936 feedback repair is retained below as history; that change explained the lock but did not remove the underlying dependency.
- Only unconfirmed SeedVR2/Topaz image upscales leave active slot and interruption counts. Genuine in-flight capacity, other providers' guards, wallet limits and per-quote idempotency remain enforced.
- Starting a separate upscale while one is unconfirmed requires an explicit additional-charge confirmation; no automatic generation or retry occurs.
- The earlier request, original source, quote, reserved credits and financial history remain independently reviewable.
- New server-marked preparations claim dispatch atomically with the exact provider input. A timeout cleanup that wins first prevents late dispatch and returns customer credits once through existing refund triggers.
- Legacy or potentially submitted requests cannot be declared unsubmitted merely because no provider ID was saved.
- Bounded background recovery checks a known provider task or matches the retained exact input against provider history; no match, ambiguity or provider errors retain the original reservation.
- Recovery runs independently of other scheduled maintenance, including when the user is offline; the open Studio also refreshes review status.
- Frontend: nonblocking explanation, existing Review Queue control, ordinary active-capacity feedback, and fresh History after a rejected/stale submission attempt.
- Scope: `lab/lab.js`, `lab/studio.html`, `lab-worker/worker.mjs`, `lab-worker/upscale-recovery.mjs`, existing Upscaler/Worker tests and focused recovery tests.
- New entry cache version: `20261108-upscale-recovery1`; backend health capability: `upscaleRecovery: 20261108-independent1`.
- Production baseline verification: all 85 original source-map modules exactly match this baseline; live bindings/settings will be inherited, not reconstructed.
- Live read at implementation time found zero currently uncertain FAL image upscales. No customer media or identifiers are included here.
- Local approved Image, provider queue/recovery, pricing, wallet, finance and auth checks: 54 passed.
- Browser coverage is prepared for owner/customer at 390px/1440px: continue working, separate-charge consent, no POST on decline/review, real capacity, completed review and mode isolation.
- Final backend/auth/wallet/pricing/recovery verification: 205/205 passed; independent review approved dispatch/refund races, exact recovery leases and recovery-only output-key isolation.
- Pending: existing browser CI and separate Worker/Pages publication verification.
- No real paid generation, new customer account, purchase, speculative refund or retry was performed for verification.
- Limit: unconfirmed paid outcomes keep their credit reservation until provider evidence resolves them; available balance and genuine in-flight capacity still apply.
- Status: implementation under verification; no claim that this recovery release is live yet.

## Interrupted request feedback / 2026-11-08
- Objective: explain why a loaded Image Upscaler can have a disabled action and provide direct access to the existing Queue.
- Verified source baseline: main `d004356feba9533693a38e8b43c7c8ba6e3a4177`.
- Confirmed cause: one uncertain FAL upscale blocks later FAL upscales through the existing `submissionBlocked()` guard.
- The amber Queue dot indicates that state; the Upscaler previously omitted the adjacent explanation.
- Added a compact conditional reason and Review Queue control beside Upscale, with an accessible description on the disabled action.
- Show a distinct full-capacity explanation; hide the block when resolved or outside Image Upscale.
- Review Queue only opens and focuses the existing queue; it never submits, retries, resolves, quotes or charges.
- Preserve the source, model settings, disabled-state safeguards, normal footer, hidden optional price controls and all other studios.
- Files: `lab/lab.js`, `lab/studio.html`, `lab/upscale-studio-v5.css`, `tests/lab-upscale-ui.mjs`.
- Cache keys: entry `20261108-upscale-queue1`, Upscaler CSS `20261108-queue-block1`.
- The reported operational interruption was independently confirmed as preceding paid provider dispatch using the intact original quote and actual deployed Worker code.
- A guarded one-record operational review closed that stale interruption; a subsequent read confirmed no active jobs, retained original source/history and no new provider task.
- The operational review retained the spending record and did not claim a provider refund.
- No authentication guard or generation limit was changed; this was not automatic cleanup of fresh or ambiguous provider requests.
- Local JavaScript syntax and approved Image UI contract: 6/6 pass.
- Focused browser regression covers 1440px/390px: loaded image plus interrupted job, Queue opening without API writes, mode isolation, resolved history unlock, full capacity and compact normal footer.
- Local Chromium cannot launch (SIGABRT / ptrace denied); actual browser validation ran in GitHub Actions.
- Upscaler CI run `42502720973` passed 48 full browser groups and 12 smoke groups, plus Image/Video parity and Assets visibility.
- Blocked-queue screenshots were inspected at 1440px and 390px. Approved Image UI, Video Upscaler and static validations passed.
- Other existing CI failures were reviewed in unchanged Video badge, Base-width, Clerk and guest-layout fixtures; no tests or safeguards were weakened.
- Reviewed candidate: `0a3c1bf3ac94bf7411bd0f83454c93df9fd79c24`; PR #936 merged as `5b68b7a15d56c46eff4119fa264bd5ac14bd7a78`.
- Application publication: Cloudflare production check `128800348200` succeeded for the exact merge.
- Scoped release verifier returned `LIVE_VERIFIED` for both versioned JavaScript and CSS.
- Live CSS SHA-256: `75053f38119c2b5e0876f4d4edb9489de3bda2d7e9b7de65ef5a2a8e6f7aaf2e`.
- Live JavaScript SHA-256: `f0fdba78d39829766fff78c2e70adee1854aea7ff4f53dcfed52c30775e7205c`.
- Production browser confirms both new version keys and the conditional Review Queue markup.
- Live browser was signed out; backend account recovery and synthetic signed-in browser tests are separate evidence. No paid generation was submitted.
- Existing draft PR #928 remains separate and unchanged; it concerns content-decline messaging after submission.
- Status: account interruption resolved; interface fix published and verified. Existing tabs need one refresh.
- Next action: none for this repair.

## Footer state repair / 2026-11-04
- Objective: preserve the approved Upscaler layout across upload, processing and Clear; show only the Upscale action.
- PR #833 merged as `068ebbf4b8f80d2292e8d7d90d0e2886b8edd792`.
- Tested candidate: `9182c92159db1a4293797b4892b7c6efb86ffd2d`; normal main integration `d18277e` preserves concurrent Video history and onboarding changes.
- Root cause: assets.css reopens the optional price row under .controls:has(#upscale-info[open]), overriding the old hide rule; flex:1 1 260px becomes a large vertical gap.
- Clear resets quote data but leaves that disclosure open; source state alone cannot prevent the regression.
- Fix: selectors matching the open disclosure keep #upscale-price and #save hidden, with a neutral flex basis.
- Owner explicitly rejected Check price & size, Optional · no generation charge and Save upscale draft. Only Upscale plus required progress/error feedback remains.
- Preserve original source, model cards, quote validation, credits, provider dispatch, history, downloads and the approved initial workspace.
- Files: lab/upscale-studio-v5.css; lab/studio.html cache key 20261104-single-action-footer2; tests/lab-upscale-ui.mjs; this checkpoint.
- Local approved Image contract 5/5, JavaScript syntax and whitespace checks pass.
- Final Upscaler/Assets CI run 41837796008 PASS: Image/Video parity, Assets visibility, 10 smoke groups, 46 full browser groups.
- New regression explicitly keeps both extra rows hidden through initial/open disclosure, upload, mocked processing/submission and Clear at 1920/1440/390px.
- Submitted and cleared screenshots retained in artifact 13327277759 / upscaler-assets-visibility-previews.
- Final approved Image contract and Video Upscaler validation PASS.
- Broader pre-existing unit/browser failures remain outside this bounded repair; no test, gate or security control was disabled.
- Cloudflare Pages production app check 126603006876 SUCCESS for the exact merge.
- Scoped release verifier returned LIVE_VERIFIED for the production version and exact reviewed CSS bytes.
- Live CSS SHA-256: fbd6a439ea1629200da3c49f8cdbc755148172cc790496a09e7210f2e996e39b.
- Production browser confirms the new CSS version, #upscale-price display:none, #save display:none, and compact 78px action footer.
- The browser was signed out: live loaded/processing/Clear behavior was not repeated in a real account; those transitions passed mocked browser tests.
- No real paid generation, quote, purchase or account change was initiated.
- Status: published and verified for this footer repair. Existing tabs need one reload after an active job finishes.
- Next action: none for this repair; broader test failures are separate work.

## Sidebar screenshot investigation / 2026-11-03
- User screenshot showed a large action-footer gap with the optional price row and Save upscale draft.
- Diagnosis: legacy assets.css applies flex:1 1 260px to #upscale-price and flex:1 0 100% to #save; these row-layout values consume vertical space in the column footer.
- Existing PR #794 / e24644a3ed2317e39c9b9ac25a55370758d29fe7 already hides the optional row and constrains Save to 40px with flex:0 0 auto.
- Cloudflare Pages pvlab-studio check succeeded for that exact merge.
- Fresh production /studio?tool=upscale loads upscale-studio-v5.css?v=20261102-hide-optional-price.
- Production stylesheet bytes match current main fceccfa334a3819c83cefc86864da25456d5a8eb exactly.
- Signed-in browser restored the same 1086×1448 rooftop source through History Reuse, without a quote or generation.
- Loaded source: action footer measured 78px, Upscale 47px; optional price row hidden; Save uses flex:0 0 auto and was hidden in this restored state.
- Loaded screenshot inspected: source, model cards, enlargement and format remain available above a compact footer.
- No new application change needed. The supplied screenshot reflects older styling; an already-open document/cache is the likely cause, not independently proven for the user's browser.
- Next action: let the active job finish and hard-refresh the existing tab. Recheck only if it recurs after loading the current stylesheet.
- This check did not exercise a new paid-processing state.

## Video upload repair / 2026-11-02
- Objective: diagnose inactive-looking Video Upscaler uploads and preserve the shared editor/billing flow.
- Verified base: main `8c149f2fcb2a33b7705dca1e0cc56e666cf1080a`.
- Live desktop reproduction: upload button opens the single MP4 picker; 21 MiB is rejected visibly.
- The current base already contains the November 1 source-free CSS error visibility fix.
- Verified remaining bugs: valid selection retains old rejection text; unreadable MP4 has no error handler and enables Review credits.
- Frontend size limit: 20 MiB in lab/video-upscale.js.
- Backend upload limit: /api/reference-uploads buffers at MAX_IMAGE (20 MiB).
- Backend quote limit: VIDEO_UPSCALE_MAX_BYTES = 20 MiB in lab-worker/video-upscale.mjs.
- MAX_VIDEO = 150 MiB is for provider outputs, not uploads. Raising only the frontend is invalid.
- Larger inputs remain unsupported; a separate bounded/streamed upload and metadata pipeline is needed before expanding support.
- Fix: distinct format/size/incomplete-file errors, fresh selection clears stale feedback.
- Phone reproduction: sidebar upload errors sit below the fold; upload-only messages now use the existing source stage, adjacent to the CTA (or over the preview for rejected drops).
- Additional changed CSS: lab/upscale-single-editor.css; no empty-state geometry or model changes.
- File selection waits for finite 0.5–30s video metadata before credit review.
- Decode errors and a 15s metadata timeout reset to the existing upload CTA with visible export guidance.
- Selection/drop do not upload, quote or submit automatically. Server pricing and explicit confirmation unchanged.
- Files: lab/video-upscale.js, lab/lab.js (import cache), lab/studio.html (entry cache).
- Regression: tests/lab-video-upscale-layout.mjs uses real H.264 fixtures for picker/drop/preview/mode checks on desktop 1440×900 and phone 390×844.
- Local checks: approved Image contract 5/5; video/backend/pricing suites 121/121.
- Local Playwright executable unavailable; existing GitHub CI completed the browser verification.
- Browser preview uses the managed preview service with provider/API calls disabled.
- PR #785 merged as `04fe701979240eecc4f1d13f7f85e79484265eee`.
- Validated implementation head: `0af942299b29b929f1e4fcb1961c8e1428b9674d`; current main integrated once before final validation.
- CI: Video Upscaler validation run 41361449380 passed (model/private-input/quote and 121 backend/pricing tests).
- CI: full Upscaler/Assets run 41361449389 passed: desktop + mobile upload regression, 7 Assets checks, 43 Image Upscaler model/quote/history checks.
- Browser regression includes isolated quote review, one mocked submission and retained uncertain-response lock after a later playback error.
- Approved Image UI contract and static validation passed on the final implementation.
- General Lab suite has the same 3 failures as main 38321ac: accepted-cookie Meta checkout, Explore Moods header, ZenCreator comparison. No test weakened.
- Cloudflare Pages pvlab-studio check 125013414281 succeeded for the exact production merge.
- Read-only release verifier returned LIVE_VERIFIED for upscale-single-editor.css?v=20261102-upload-feedback1 and lab.js.
- Production video-upscale.js?v=20261102-upload-validation1 matches reviewed source bytes (SHA-256 a958e733984761b20ff0351fed738c40b18fd47eb628e7c09496efacde337e0c).
- Signed-in production browser confirmed native picker, visible oversized/unreadable rejection, blocked credit review for invalid media, 1s H.264 preview, cleared old errors and Video/Image mode restoration.
- No live quote or paid-generation action was clicked; file selection stayed local.
- Completed: deployed and verified. Next action: none for this repair; larger-input support requires a separate backend design.
- No paid generation initiated.

## Active checkpoint / 2026-10-23
- Objective: simplify the confusing nested Upscaler model menu after owner feedback.
- Base: main a10eb030babb66bb1dc79cd944c945d137926db7.
- Four flat choices: ByteDance Premium, Topaz Standard V2, Topaz High Fidelity V3, Topaz Wonder 3.5.
- Remove the clickable Precision parent, indentation and separate quality grouping.
- Each Precision row retains the actual Standard V2 / High Fidelity V3 backend value.
- Reuse the existing quality click handler; no provider, billing, auth or default change.
- One checked row, keyboard focus, History reuse, quiet selection and quote invalidation remain.
- Preserve page geometry and hidden More options.
- Files: lab/studio.html, lab/upscale-studio-v5.css and existing menu test assertions.
- Cache keys: upscalePrecision=20261023-flat2 and precisionQuality=20261023-flat2.
- Existing 34 browser checks retain model/quality, role/viewport, quote and submission coverage.
- Existing independent visibility fixture baseline failure remains unchanged.
- Prior release: PR #466 / 503bbc1, deployed successfully.
- Simplification merged in PR #469 as 14d3eafcab25bc3cbbaccae02d384676d3b1a470.
- Cloudflare Pages pvlab-studio check 120424694540: success for that exact SHA.
- Custom domain /studio?tool=upscale DOM confirms all four labels and no nested group.
- Production JS/CSS version keys confirmed as 20261023-flat2.
- Browser suite passed BROWSER_CHECKS_PASSED=34 in job 120421941455.
- Desktop 1728px and phone 390px menu screenshots inspected from artifact 12503360371.
- Screenshots: upscaler-precision-empty-1728.png and upscaler-precision-empty-390.png.
- Mocked role tests retain both qualities, History, keyboard, touch, quote binding and no duplicate submission.
- Production browser signed out; real authenticated paid generation not exercised.
- Shell production byte verification unavailable; exact CF check plus browser DOM/version fallback used.
- Unrelated CI failures inspected: guest tool visibility, Image entrance backdrop, Mood nav viewport,
  old-domain redirect verification and reference image decode. Their tested behavior/files were untouched.
- Mandatory approved Image contract passed 5/5 before and after this edit.
- No paid jobs submitted.
- Publication and scoped verification complete; no further product change pending.

## Previous implementation record

Updated: 2026-10-14 (Berlin), model/visual hierarchy correction.
Scope: curated SeedVR2 default replacing the public economical method.
Branch: feat/pv-lab-premium-seedvr2-20261014
Base main commit: 4f41522ee91c2861ae3b6d8f18957b5575f5313e

## Approved choices
- Sole public upscale engine remains SeedVR2 on fal.ai; public-facing tool name **Upscaler** and dedicated, clearly labeled **Model: ByteDance SeedVR2** in the control deck.
- 2× Premium: 10 credits; 4× Ultra: 18 credits.
- Preserve source ratio, original media and history; PNG/JPEG.
- Noise scale 0.1 and 32 MP output cap.
- Historical SpicyAPI records remain accessible (reuse defaults to SeedVR2). Topaz records reuse their original Topaz engine, quality and scale.
- Do not claim identity with Higgsfield's ByteDance image enhancer, which is unverified.

## Implementation
- lab-worker/fal-upscale.mjs: model parameters, pricing estimate, input and dimensions.
- lab-worker/worker.mjs: bound quote, private uploads, task confirmation, recovery.
- lab-worker/job-pricing.mjs: exact, server-validated 10/18 credit prices.
- lab-worker/migrations/0014-premium-upscale-credits.sql: SQL billing trigger with old prices preserved.
- .github/workflows/deploy-lab-worker.yml: remote migration before Worker deployment.
- lab/lab.js, lab/studio.html, lab/assets.css: compact premium deck and mobile layout.
- Tests: lab-worker, Upscale UI and Upscale Assets visibility.

## Deployment
- Reuses FAL_KEY; never expose to the browser. No new provider keys.
- Retains owner isolation, quote expiry, single submission, image capacity, recovery and refunds.
- No paid image job submitted during development.
- CI and production deploy still need verification.
- After merge, verify migration, health, front-end and one authorized paid image smoke test.

## Brand follow-up
- Empty canvas: “Vision Upscaler” title plus discreet attribution under description.
- Loaded canvas: small “VISION UPSCALER · BYTEDANCE SEEDVR2” identification beside Source/preview.
- Main navigation remains “Upscaler”; primary button remains “Upscale”.
- Backend model, exact 10/18 credit pricing, prompt controls, gallery and mobile sizing unchanged.
- Code: lab/lab.js, lab/studio.html, lab/assets.css. Browser regression: tests/lab-upscale-ui.mjs.
- Branch: design/vision-upscaler-brand-20261014, base main 34f00e2c8c04a911b5997f141e25de101411730d; deploy and production status not yet verified.

## User-approved visual correction
- Tool title is simply **Upscaler**. ByteDance SeedVR2 is visible in its own read-only **Model** control, not branded as an independent PV LAB engine.
- Public model menu includes ByteDance Premium / SeedVR2, Topaz Precision (Standard V2 / High Fidelity V3) and Topaz Wonder 3.5. All use existing configured fal.ai endpoints.
- Reduce empty-state decoration, use premium editorial type, a quieter solid canvas border and one simple upload CTA.
- Retain real 2×/4× scale choice, format, and generate button, removing artificial Premium/Ultra labels from the choice.
- Match results width to editor, softly frame existing result cards; keep the real gallery behavior and stored media.
- Provider API, customer credits, history and refunds unchanged.
- Branch design/upscaler-engine-deck-20261014; base e5d615c3b5fdb3b315a8acba311e1258089e271e; production deploy to be verified.

## Interactive model dropdown repair (2026-10-14)
- Correct the misleading model readout: a real, keyboard-accessible popup with three selectable engines, selected checkmark, outside-click and Escape dismissal.
- Show **ByteDance Premium · SeedVR2**, **Topaz Precision · Standard V2 / High Fidelity V3**, or **Topaz Wonder · 3.5** in the trigger.
- Show the Topaz Precision quality selection in expanded More options when Precision is active.
- Changing the engine never submits a paid job, preserves the imported photo, and discards outdated price quotes. The active engine is recorded in the next quote.
- Fixed 10/18 credits apply only to SeedVR2. For Topaz, price and credits are taken from the bound model-specific estimate, never copied from SeedVR2.
- Existing backend FAL engine routing and D1 trigger were already implemented. No backend migration or new provider key required.
- Files: lab/studio.html, lab/lab.js, lab/assets.css, tests/lab-upscale-ui.mjs, tests/lab-assets-ui.cjs.
- Work branch: fix/upscaler-real-model-menu-20261014. Base: b4c8dbc6ca4c5c618085cc9d28ddec89cfeb1dce.
- Merge, browser test and production Pages deployment must be verified.

