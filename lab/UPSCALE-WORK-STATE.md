# PV LAB Premium Upscale work state

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
- Local Playwright executable unavailable; browser suite will run in existing GitHub CI.
- Browser preview uses the managed preview service with provider/API calls disabled.
- Deployment: pending branch validation and production release verification.
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

