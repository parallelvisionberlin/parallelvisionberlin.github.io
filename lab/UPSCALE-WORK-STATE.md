# PV LAB Premium Upscale work state

Updated: 2026-10-14 (Berlin), model/visual hierarchy correction.
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

## Brand follow-up
- Empty canvas: “Vision Upscaler” title plus discreet attribution under description.
- Loaded canvas: small “VISION UPSCALER · BYTEDANCE SEEDVR2” identification beside Source/preview.
- Main navigation remains “Upscaler”; primary button remains “Upscale”.
- Backend model, exact 10/18 credit pricing, prompt controls, gallery and mobile sizing unchanged.
- Code: lab/lab.js, lab/studio.html, lab/assets.css. Browser regression: tests/lab-upscale-ui.mjs.
- Branch: design/vision-upscaler-brand-20261014, base main 34f00e2c8c04a911b5997f141e25de101411730d; deploy and production status not yet verified.

## User-approved visual correction
- Tool title is simply **Upscaler**. ByteDance SeedVR2 is visible in its own read-only **Model** control, not branded as an independent PV LAB engine.
- No public Topaz option is implied; only ByteDance SeedVR2 is offered.
- Reduce empty-state decoration, use premium editorial type, a quieter solid canvas border and one simple upload CTA.
- Retain real 2×/4× scale choice, format, and generate button, removing artificial Premium/Ultra labels from the choice.
- Match results width to editor, softly frame existing result cards; keep the real gallery behavior and stored media.
- Provider API, customer credits, history and refunds unchanged.
- Branch design/upscaler-engine-deck-20261014; base e5d615c3b5fdb3b315a8acba311e1258089e271e; production deploy to be verified.
