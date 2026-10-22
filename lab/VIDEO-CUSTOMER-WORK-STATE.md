## Active: PV LAB stabilization Phase 1 — review branch only (2026-10-22)

- Objective: repair stale regression checks and restore fresh Video Start frame initialization; stop at a PR. No merge or deployment is authorized.
- Branch: `codex/pvlab-stabilization-phase1`; incorporated main `a4ad9c7e3a3ad01ac76d88e017362250fd93f0ca`.
- Safely fast-forwarded from initial main `1a1c681`; reapplied only scoped changes. Retained concurrent Image, Upscaler and Clerk/D1 changes exactly.
- Product change: remove the one-time Seedance Start-to-Reference override and initialize the remembered Create mode to Start. Explicit user selections, History and handoff modes remain intact.
- Only other product file change: the `lab.js` cache revision in `studio.html`.
- Customer browser assertions now verify default Seedance, selected Start frame, visible uploader and zero POST requests before any interaction at 1440/390px across six account states.
- The new initial-state assertion failed against the original initialization, then passed after the fix. Desktop/mobile screenshots inspected; no horizontal overflow in checked states.
- Reference checks require one versioned Lab module and retain reference-rendering behavior assertions; no historical cache token is pinned.
- Assets checks retain visible public navigation, private Assets gating, actual full-screen Upscaler upload entry, sidebar geometry and unobstructed action controls.
- Explore extracts the current function signature with checked bounds; complete mocked generation/handoff suite passes, including the previously failing Studio continuation.
- Video CI now has separate syntax/backend steps and eight independent browser steps. Explicit status conditions allow later suites after failures; no `continue-on-error` or disabled gates.
- Domain smoke requires versioned asset links, fetches Generate/Exact CSS from the URLs in live HTML, and preserves all existing behavior checks.
- Test-only path guards in the two edited ESM browser harnesses now use the platform separator; unchanged Linux-only guards were adapted in memory for local Windows runs.
- CI-pinned Node 22.16 full Lab/release suite after final main incorporation: 708/708 passed. Approved Image contract/reference subset: 8/8 passed. Workflow YAML/conditions and edited JavaScript syntax pass.
- Customer Video: all 12 desktop/mobile scenarios pass. Routing, full Studio layout, Soul reinterpret (13), Image one-click (53), Upscaler (8), references (22), Seedance (19), and full four-role first-image parity passed in intercepted browser tests.
- Both repaired public domain smoke blocks passed as GET-only checks of the existing site; this does not publish or verify the candidate Video fix in production.
- Full local Node 24 suite before main refresh: 703/704 passed. The remaining pre-existing Dream Blur `setImmediate` timing test fails on Windows; no implementation or assertion was weakened to hide it.
- Full Assets browser suite passed after materializing its existing image/video fixtures in the sparse checkout.
- Main advanced again during branch publication: incorporated high-resolution Image fix `a4ad9c7` with a normal merge, retaining its validator, tests and primary cache token. Added only the separate Video cache parameter. Full unit, customer Video and shared layout reruns passed; final Image upload/role reruns continue before the review handoff.
- Remaining validation: PR CI. All local independent browser suites completed; do not infer real signed-in production behavior or paid-provider success from these mocks.
- Safety: synthetic accounts/media and intercepted provider/checkout requests only. No real purchase, paid generation, account change, database mutation or production setting change.
- Publication: PR is not merged; candidate is not deployed to production. Next action: review the scoped PR and outstanding test evidence; do not merge or deploy in this task.

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
