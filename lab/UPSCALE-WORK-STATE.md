# PV LAB Premium Upscale work state

Updated: 2026-10-14 (Berlin), ByteDance Premium menu.
Scope: curated SeedVR2 default replacing the public economical method.
Branch: feat/pv-lab-premium-seedvr2-20261014
Base main commit: 4f41522ee91c2861ae3b6d8f18957b5575f5313e

## Approved choices
- Sole public upscale engine remains SeedVR2 on fal.ai; public-facing tool name **Upscaler** and dedicated, clearly labeled **Model: ByteDance SeedVR2** in the control deck.
- 2× Premium: 10 credits; 4× Ultra: 18 credits.
- Preserve source ratio, original media and history; PNG/JPEG.
- Noise scale 0.1 and 32 MP output cap.
- Historical SpicyAPI/Topaz records remain accessible; Reuse selects the same SeedVR2 engine under the same SeedVR2 model, without a new product name.
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
 
## Current public model menu (2026-10-14)
- Upscaler is still the tool title, ByteDance is the engine manufacturer, SeedVR2 is the actual model, and Premium labels PV LAB's quality tier, not a new official ByteDance product.
- Clicking the model readout opens a compact, keyboard-accessible menu that shows one selected available model, ByteDance Premium / SeedVR2, and links to its actual fal.ai information page.
- Clicking the selected model closes the menu with no quote or paid task. Outside click, Escape, and leaving Upscaler also close it. No fake Topaz entry or unsupported switching.
- Model disclosure is an overlay on desktop, in-flow on mobile; the rest of the deck and gallery remain intact.
- Server route, generation parameters, private archive, refunds, and 10-credit 2× / 18-credit 4× billing remain unchanged.
- Changed files: lab/studio.html, lab/lab.js, lab/assets.css, tests/lab-upscale-ui.mjs, tests/lab-assets-ui.cjs.
- Source main b4c8dbc6ca4c5c618085cc9d28ddec89cfeb1dce; branch fix/upscale-bytedance-model-menu-20261014. Verify CI and the published Pages run after merge.
