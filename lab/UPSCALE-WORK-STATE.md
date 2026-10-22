## Current: approved design preserved; PR #443 test follow-up (2026-10-22)

- Source reviewed: main `8ded7bda942c9ac12c9397f8269d0d7943966ec0`, incorporated normally into `codex/pvlab-stabilization-phase1`. Review-only; do not merge or deploy.
- Owner confirmed the current desktop/mobile design. Preserve layout, typography, photograph, source panel, controls and the exact three-engine popup. Do not restore More options.
- This follow-up changes tests/checkpoints and the Video CI time allowance only. No Upscaler app code, CSS, provider settings, defaults, prices or database behavior changes.
- Visible popup selects ByteDance Premium, Topaz Precision and Topaz Wonder 3.5. Engine choices alone never quote, upload or submit a paid job.
- Fresh Precision uses `Standard V2`. The popup's Precision row changes only the engine; its `Standard V2 / High Fidelity V3` caption is not a quality selector.
- The existing quality select lives inside `#upscale-info`, hidden by the approved V22 CSS. Setting its own hidden flag false/opening the details does not override that hidden ancestor. No other fresh quality control was found in the current source or rendered desktop/mobile UI.
- Existing History Reuse restores both `Standard V2` and `High Fidelity V3`, displays the restored value in the trigger and preserves it across switching away/back to Precision. Reuse itself makes no quote or paid call.
- Visible Upscale after either History mode sends the restored `topazModel` in the quote, then submits only its bound quote ID with `confirm:true`; no hidden select is manipulated by the tests.
- Backend route: Precision -> `topaz/upscale/image/precision`, input `model` exactly `Standard V2` or `High Fidelity V3`. Wonder -> `topaz/upscale/image/generative`, input `model: Wonder 3.5`. SeedVR2 -> `fal-ai/seedvr/upscale/image`, factor/noise 0.1, no Topaz model field.
- Official FAL read-only schema verification: https://fal.ai/models/topaz/upscale/image/precision/api lists Standard V2 as default and High Fidelity V3 as a supported model value. https://fal.ai/models/topaz/upscale/image/generative/api lists Wonder 3.5. Existing explicit crop/face/format settings are preserved; no paid provider acceptance was tested.
- Both Precision values remain supported by server validation; no separate role/tier gate exists for quality. Prior approved work state and tests expose both modes; there is no authorization to silently retire fresh High Fidelity access or change the default.
- Existing credit rules are unchanged: exact SeedVR2 route gets 10/18 credits at 2x/4x; Topaz uses the bound server estimate and existing conversion. Browser fixtures use the real parameter/price builders; isolated Worker tests verify actual mocked FAL request bodies and quote idempotency.
- Browser flow follows current visible Upload image, model popup, size/format and Upscale. The old manual price-check-only path is replaced by assertions on one bound quote plus one submission per explicit action. Quote-only/no-provider-call checks remain in Worker tests.
- Browser checks preserve model IDs, quality parameters, source bytes, dimensions, credits, format/scale changes, rejected/malformed/expired quotes, failed/rejected/network submissions, duplicate-click prevention, downloads and History reuse.
- Local Node 22 result before final publication: 22 substantive browser checks passed; then `FRESH_PRECISION_QUALITY_UNAVAILABLE` fails for Owner/customer at 1440/390px. This is an intentional retained requirement, not a hidden click timeout or a skipped check.
- Full Node 22 Lab/release suite: 709/709 passed, including approved Image safeguards. Fresh Video Start frame: 12/12 passed. Desktop/mobile visibility passed on Node 24.
- Focused Worker/pricing checks: 16 passed, including new exact High Fidelity V3/Wonder provider payloads and duplicate quote submission. Ordinary Standard V2 submission coverage is retained.
- Screenshots capture the real visible popup and source workspace; browser accounts/media/API calls are synthetic. No production login, real purchase or paid generation was performed.
- Precise unresolved conflict: three approved engine rows advertise both Precision qualities, but a fresh user can select only Standard V2. Existing V3 users can reach it through History; users without a suitable record cannot.
- Smallest proposed solution, NOT implemented: add two quality subchoices inside the existing Precision popup row, reusing the existing quality change handler and Standard V2 default. Retain the three engine rows and avoid changing sidebar/photo/mobile geometry or restoring More options. This changes the approved popup and needs specific owner approval.
- PR #443 must remain draft until that functional decision is resolved and mandatory checks are green. Final-head workflow results are recorded in the PR; do not infer production behavior from mocks.

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
