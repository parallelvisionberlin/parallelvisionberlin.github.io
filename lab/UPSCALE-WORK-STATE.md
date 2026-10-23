# PV LAB Premium Upscale work state

## Active checkpoint / 2026-10-23
- Objective: publish visible Precision quality choices and remove the model-change notice.
- Owner explicitly authorized this repair and normal publication in the current conversation.
- Start from main 4e591596faea9d1d7d6cee1a9e18a2766e1e4262.
- Prepared implementation was in draft PR #443, head 95d6c67.
- Port only its Upscaler menu/quality behavior; leave the broader draft unmerged.
- Preserve current Video defaults, Hong Kong references, new loader logo and other concurrent work.
- Existing engines remain ByteDance Premium, Topaz Precision and Topaz Wonder 3.5.
- Standard V2 and High Fidelity V3 are nested visible actions under Precision.
- New Precision selection defaults to Standard V2; History keeps its saved quality.
- Keyboard arrows/Home/End, Enter/Space, Escape, Tab and touch remain supported.
- Keep More options hidden and preserve the approved desktop/mobile page geometry.
- Model changes no longer emit the Model changed / fresh estimate / No job submitted notice.
- Precision quality changes are also quiet; empty price status stays hidden.
- Explicit price checks, returned estimates and real errors remain available.
- Quote invalidation still runs before any subsequent submission.
- Selecting a model/quality performs no upload, quote or paid submission.
- Actual Upscale still checks a fresh bound quote and submits it once.
- No backend, provider endpoint, price, credits, authentication or database changes.
- Product files: lab/lab.js, lab/studio.html, lab/upscale-studio-v5.css.
- Both JS and CSS references receive new cache keys for this repair.
- Reuse the prepared 34-check browser suite from #443 on current main.
- Add assertions for empty/hidden status after engine and quality changes.
- Coverage retains both qualities, role/viewport matrix, History, quote validation and failures.
- Assets menu contract now asserts exactly three engines plus two nested qualities.
- Existing unrelated Assets visibility expectations remain unchanged.
- Existing Upscaler workflow retains its visibility gate and runs the paid-flow tests independently.
- Use the shared pinned Playwright 1.62.1 runtime with a bounded installation step.
- Local approved Image UI contract: 5/5 passed before and after editing.
- Local syntax checks passed; no live paid requests performed.
- CI browser/provider-fixture checks and Cloudflare publication are pending.
- Verify the exact deployed SHA and the visible menu/status on pvlab.studio before claiming live.

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

