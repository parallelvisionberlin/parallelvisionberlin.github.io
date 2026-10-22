## Active: PV LAB stabilization Phase 1 — draft PR #443 (2026-10-22)

- Branch `codex/pvlab-stabilization-phase1`; latest main incorporated through normal merges without rewriting history. Review only: no merge or production deployment.
- Video fix remains scoped: fresh Seedance uses Start frame as its actual selected mode, with remembered Create mode initialized to Start. Explicit user, History and handoff modes remain intact.
- Fresh initial-state assertions run before interaction at 1440/390px across six synthetic account states (12 cases), checking default Seedance, selected Start, uploader and zero initial POSTs. Final-head rerun and CI recorded in PR.
- Stale script assertions require the current versioned Lab module; Assets uses current visible navigation/layout; Explore extracts the actual function signature with checked bounds. Domain smoke resolves versioned assets from live HTML.
- Video workflow retains syntax/backend checks and eight separately gated browser steps. Later independent suites execute after unrelated failure; no continue-on-error. Twelve-minute allowance includes browser installation and the full mandatory matrix.
- Concurrent main Image, Clerk/D1, billing, legal, mood and approved Upscaler V28 changes are preserved. Product changes in this PR are only Video initialization and the explicitly owner-approved Precision quality choices within the existing Upscaler model dropdown.
- The prior fresh High Fidelity access conflict is now resolved. Both qualities use existing provider/quote state; newly selecting Precision defaults Standard V2 and History preserves its saved quality. Full scope and evidence: `UPSCALE-WORK-STATE.md`.
- Local Node 22 unit/release suite: 709/709 passed, including the approved Image safeguards. Upscaler full browser suite: 34 passed; desktop/mobile Upscaler Assets visibility passed. Final exact-head relevant CI and fresh Video results belong in the PR.
- Current main's V28 empty deck/photo height and retained gallery inset replace obsolete geometry assumptions. No page layout or provider/pricing/database setting was changed to satisfy a test.
- Earlier CI at `7a4c80b` confirmed seven independent browser suites passed and Reference/Seedance still ran after the now-resolved Upscaler access assertion. This is historical failure evidence, not final-head validation.
- Earlier Windows Node 24 Dream Blur timing failure was not changed; configured Node 22 suite passes. Browser harnesses use intercepted APIs and synthetic accounts/media; no real authentication, credits, Stripe or paid generation is claimed.
- Exact cumulative changed files and final passing/failing workflows are listed in draft PR #443. Cloudflare's automatic branch preview is distinct from production; no production publication initiated.

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
