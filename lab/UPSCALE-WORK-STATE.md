## Current: PR #443 — approved Precision dropdown qualities (2026-10-22)

- Review branch `codex/pvlab-stabilization-phase1`; current main V28 full-width layout incorporated by normal merge. Keep PR #443 draft, unmerged and undeployed.
- Owner explicitly approved two discreet quality subchoices beneath the single Topaz Precision row in the existing model popup. The earlier inaccessible-quality conflict is resolved by this scoped UI change; More options remains hidden.
- Default engine remains ByteDance Premium / SeedVR2. Newly selecting Precision from another engine resets Standard V2. Direct High Fidelity V3 selection updates the visible trigger, accessible name and checked state. Reopening focuses the selected quality.
- Both qualities reuse the existing native quality state/change handler, quote invalidation and provider routing. Selection alone never uploads, quotes or submits. No provider/pricing/default configuration or database changes.
- History Reuse restores the saved Standard V2 or High Fidelity V3, scale and original source before any interaction. Its next Upscale submits that exact quality. Subsequently selecting another engine and newly selecting Precision returns to Standard V2 as requested.
- Three engine rows remain unchanged, with a labeled nested quality group, 44px quality targets, arrow/Home/End navigation, Enter/Space selection, Escape focus return, Tab exit and outside-click dismissal.
- Only popup-specific CSS added. Main's page dimensions, V28 full-width photograph/deck alignment, typography, source controls and mobile arrangement are preserved. Main's existing 344px + 12px gallery inset is retained; its old browser geometry expectations are updated precisely.
- ByteDance endpoint: `fal-ai/seedvr/upscale/image`, factor 2/4, noise 0.1, no Topaz model. Precision endpoint: `topaz/upscale/image/precision`, model exactly Standard V2 or High Fidelity V3. Wonder endpoint: `topaz/upscale/image/generative`, model Wonder 3.5. Existing crop/face flags and PNG/JPEG remain unchanged.
- Credit rules unchanged: exact SeedVR2 route costs 10/18 credits at 2x/4x; Topaz uses the existing server estimate/conversion. Both Precision qualities retain the existing same estimate for equal dimensions (320px fixture: $0.08 / 37 credits); no invented quality surcharge.
- `tests/lab-upscale-ui.mjs`: visible upload/model/quality/scale/format/Upscale actions only. Retains valid bytes/dimensions, all engines, bound quotes/credits, both quality mismatch directions, expiry, failures, duplicate clicks, downloads and History.
- Coverage includes Owner/customer at 1440/390px: both fresh quality selections/submissions, eight History combinations, unchanged selection geometry, all engine access and mobile touch; keyboard coverage exercises both qualities. Synthetic API fixtures use real backend parameter/price builders; wallet refresh is intercepted.
- `tests/lab-worker.test.mjs` retains Standard V2 coverage and adds exact High Fidelity V3/Wonder request-body and idempotency checks against the real Worker with intercepted FAL calls and an in-memory database.
- Local results: 709/709 Node 22 Lab/release unit tests passed, including mandatory approved Image contract; 34 substantive Upscaler browser checks passed; desktop/mobile Upscaler/Assets visibility passed. Final branch-head CI and fresh Video rerun are recorded in PR #443.
- Desktop/mobile empty photograph and loaded-source popup screenshots inspected. No horizontal overflow in checked states; no force-clicks, skipped checks, weakened assertions or hidden-select manipulation.
- Exact feature files: `lab/studio.html`, `lab/lab.js`, `lab/upscale-studio-v5.css`, `tests/lab-upscale-ui.mjs`, `tests/lab-upscale-assets-visibility.mjs`, `tests/lab-assets-ui.cjs` (exact three engines plus two nested qualities), plus this checkpoint and `lab/VIDEO-CUSTOMER-WORK-STATE.md`. Separate JS/CSS cache markers preserve main's existing revisions.
- No real Clerk session, customer transaction, provider generation or production success was verified. All browser accounts/media/requests are synthetic and all paid submission paths are mocked. No merge, force push, production deployment or production mutation.

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
