## Active: PV LAB stabilization Phase 1 — review branch only (2026-10-22)

- Objective: repair stale regression checks and restore fresh Video Start frame initialization; stop at draft PR #443 for review. Do not merge or deploy in this task.
- Branch: `codex/pvlab-stabilization-phase1`; incorporated main `8ded7bda942c9ac12c9397f8269d0d7943966ec0` through normal branch merges, without history rewriting or force push.
- Main advances preserved: Image high-resolution validation, Clerk/D1 changes and approved Upscaler V21–V24 styling, its credit-notice overlay and automatic oversized-photo preparation. Main's Upscaler CSS, credits CSS, release handoff and HTML remain exact; only the separate Video module cache parameter differs.
- Product change: remove the one-time Seedance Start-to-Reference override and initialize the remembered Create mode to Start. Explicit user selections, History and handoff modes remain intact.
- Only other product file change relative to main: append `videoStartDefault=20261022-1` to the existing Lab module URL, retaining all existing asset revisions.
- Customer browser assertions verify default Seedance, selected Start frame, visible uploader and zero initial POSTs before any interaction at 1440/390px across six account states.
- The initial-state assertion failed against the original initialization, then passed after the fix. Desktop/mobile screenshots inspected; no horizontal overflow in checked states.
- Reference checks require exactly one versioned Lab module and retain all reference-rendering assertions; no historical cache token is pinned.
- Assets checks preserve public navigation, private Assets gating, actual full-screen upload entry, current sidebar geometry and unobstructed action controls.
- Explore extracts the current function signature with checked bounds; all 17 mocked generation/handoff scenarios passed, including Studio continuation.
- Video CI separates syntax/backend and eight browser steps. Explicit status conditions allow later suites after unrelated failures; no continue-on-error or disabled gate.
- Domain smoke requires versioned assets, obtains Generate/Exact CSS URLs from live HTML and retains existing behavior checks.
- The three edited ESM static-server harnesses use the platform separator. Unchanged Linux-only guards were adapted in memory for local Windows runs.
- Node 22.16 full Lab/release suite after the Upscaler follow-up: 709/709 passed. Approved Image/reference subset: 8/8 passed. Edited JavaScript syntax, workflow YAML/conditions and whitespace checks passed.
- Final affected checks: customer Video 12/12; Studio desktop/mobile/Fashion layout; full Assets; corrected Upscaler Assets visibility at desktop/mobile all passed after incorporating incoming main changes.
- Visual visibility test now requires current exact headings/artwork, empty versus loaded source controls, shared desktop edge, full-screen heights and the V22/V23 hidden technical disclosure. Paid-request/price-review coverage in lab-upscale-ui.mjs remains unchanged.
- Earlier browser runs at main a4ad9c7 passed all eight Video-workflow suites: customer Video, routing, layout, Soul reinterpret (13), Image one-click (53), Upscaler (8), references (22), Seedance (19). First-image four-role parity also passed.
- CI at a5c6cd8 passed all eight Video browser steps and related workflows. At ab6da25, all eight browser suites executed: seven passed, Upscaler failed on hidden More options, then references (22) and Seedance (19) passed after that failure; screenshot artifact uploaded. This directly verifies independent execution. GitHub reports the overall run cancelled; cause unverified, so it is not a green job. The separate visibility step passed before its unchanged functional step failed. Final merge-head CI must be evaluated separately.
- Follow-up replaces hidden More options interactions with visible upload/model/size/format/Upscale actions. It retains quote, credit, failure, provider payload and History assertions; no Upscaler UI/provider/default changes.
- Follow-up local browser result: 22 substantive checks pass, then a precise fresh Precision quality-access contract fails for Owner/customer at 1440/390px. Standard V2 is the fresh default; High Fidelity V3 restores/submits through History but has no fresh visible selector. Full findings and the unimplemented minimal popup proposal are in UPSCALE-WORK-STATE.md.
- New isolated backend coverage verifies exact High Fidelity V3 and Wonder provider request bodies through one idempotent mocked submission; existing Standard V2/credit safeguards remain.
- Video CI allowance increases from 8 to 12 minutes: the prior browser installation took 4m43 and an 8m31 run was cancelled despite all browser results/artifacts. Failure gates and all eight independent steps remain unchanged.
- Earlier corrected desktop visibility test exposed an overlapping action after mocked owner diagnostics. Main subsequently removed the disclosure; this is historical evidence, not the current failure. Current visibility assertions pass.
- Additional environment result before main refresh: Windows/Node 24 passed 703/704; the pre-existing Dream Blur setImmediate timing check failed. It was not changed or weakened; configured Node 22 passes.
- Both repaired public domain-smoke blocks passed via GET-only checks of the existing site. This does not publish or verify the candidate Video change in production.
- Browser evidence uses synthetic accounts/media and intercepted uploads, quotes, checkout and jobs. No real customer authentication or provider success is claimed.
- No real purchase, paid generation, account change, database mutation, Worker change or production setting change.
- Publication: PR #443 is draft and unmerged; no production deployment was initiated. Cloudflare's automatic branch preview is distinct from production.
- Final incoming-main reruns: 708/708 Node 22 tests, customer Video 12/12 and full Assets passed with the new photo-input normalizer; desktop/mobile visibility passed after the V24 spacing and overlay update. The last main change only publishes its cache marker; preserve it exactly.
- Next action: review the exact PR file list, passing checks and the remaining Upscaler test/design conflict. Resolve the fresh Precision quality-access conflict through specific owner approval; do not bypass the failing test or merge/deploy here.

# Customer Video preparation and generation access

Updated: 2026-10-21 (Europe/Berlin)
Source baseline: 956361cf16f06dd4361db1d6aa3bdaa33943c67e.
Scope: customer models disabled and Generate incorrectly saying Connect generation provider.

## Verified cause
- Customer session sets config.enabled=false and videoEngines=[] whenever generationReady=false.
- generationReady includes rollout, closed/billing-review state and promotional restrictions, independently of balance.
- The Video picker consumed spending eligibility as model-selection availability.
- Video's Generate button rendered owner provider setup copy; connection() is a no-op for customers.
- The user's specific live session flags have not been read; the audit browser is signed out.

## Correction
- Session adds videoPreparationEngines for draft selection only. videoEngines and enabled remain gated.
- Customer draft model selection uses the preparation list when spending is unavailable.
- Paused free trials with billing available open existing pricing on explicit Generate.
- Generation-ready zero-credit accounts open pricing before uploads or provider quotes.
- Prompt, model and local start-frame photo remain in the editor.
- Closed, billing-review, promotion-review and unavailable accounts get explicit state-specific help.
- Customer Video never renders owner provider-connection instructions.
- Owner models, private Kling access, generation permissions, pricing and ledger checks are preserved.

## Files and verification
- lab-worker/worker.mjs: preparation-only model metadata.
- lab/lab.js and lab/studio.html: selection, customer state, pricing handoff and cache revision.
- tests/lab-worker.test.mjs: authenticated paused session can discover models but cannot quote/spend.
- tests/lab-customer-video-ui.mjs: desktop/mobile trial, zero, closed, billing review, promotion review and unavailable journeys.
- .github/workflows/lab-seedance-tests.yml runs the customer Video browser regression.
- Local relevant Worker, account, billing, trial, Image-contract and Video checks: 142 passed; 20 additional quote/pilot/provider checks passed.
- All 21 PR workflows passed at ddd9a50d2cb58843be71382d78f0647b39e88ae6.
- Customer Video browser tests passed at 1440/390px for trial pause, zero balance, closure, billing review, promotion review and unavailable service. Pricing handoff made zero POST requests.
- Browser fixture uses a valid 512px Seedance frame. Existing Image test now expects the unchanged approved eight-card order; no Image UI order was edited.
- No real checkout, provider generation, account deletion or balance mutation performed.

## Release and remaining work
- PR #421 merged as e42c5bd22e1b4a19ccc7c19afaf0adfe44f86a68. Merged lab.js blob exactly matches the locally tested file: fefa37878750437482677580f428a66d9924b02e.
- Worker deploy run 39674018212 succeeded, including production health verification.
- Cloudflare Pages app check 119479814416 succeeded for that exact SHA/project pvlab-studio; deployment 05b9c007-af5d-4ff0-a028-2460d615fa73.
- Live browser on pvlab.studio/studio?tool=video confirmed the loaded lab.js URL contains videoCustomerAccess=20261021-1.
- Read-only release verifier was invoked while deployment was pending (CLOUDFLARE_UNKNOWN). Direct HTTP asset access returned 403; terminal transport later disconnected. Use the documented connector + browser DOM fallback evidence above, not an invented byte-level live-verifier pass.
- Real screenshot-account session flags and paid production generation remain unverified; audit browser is signed out. Do not infer them from the displayed balance.
- Next: customer can reload Video and prepare a model/photo/prompt; explicit Generate should open pricing for a paused unpaid trial. Verify any remaining real-account restriction using its actual authenticated session.

## Mobile Video Create polish, 2026-10-22
- Source base: `b77a7402161455e162dbd837c3c1c7aa89bd9908`.
- User requested only a slight slimming of the Video sequence on phone, preserving Start frame as the default.
- Existing `lab/lab.js` initializes `mode='start'`; no mode or provider logic needs changing.
- CSS at 440px or below: model card 125 to 119px; two upload blocks 156 to 148px; frame wells 104 to 98px; prompt 132 to 124px. Desktop/tablet unchanged.
- CSS cache key: `20261022-mobile-slim1`. Verify mobile layout, role flows and Cloudflare Pages deployment separately.
