## Active: approved Video Studio redesign — 2026-10-23

- Objective: compact owner-approved Video inspector, original subway empty canvas and refined Scene details; draft PR only. No merge or production deployment authorized.
- Isolated branch: `codex/video-studio-approved-redesign`, based on fetched main `59f61562c02633902564c59166135496be025e36`.
- PR #473 merge `c55e828d8d6af1514a3833ffc282930c5ffd1bae` is an ancestor. Its wheel handler is byte-for-byte unchanged; existing browser gestures still pass.
- Inspected outstanding #443, #448 and #452 metadata and diffs. No cherry-picks, model/default changes or duplicate frame-height edits. Those PRs remain untouched.
- `lab/lab.js`, model picker/capability modules and all Worker/provider/pricing/wallet/authentication code remain unchanged.
- Exact supplied artwork: `lab/visuals/video-android-trio-original.png`, copied without processing or regeneration.
- Original artwork SHA-256: `7ed8131e8432c5182a2751a6d353a5fff87fd271d07fa0163dcc74fd74fc6ad7`; enforced by the new regression test.
- Production model banner remains `visuals/leather-editorial/hero-desktop.webp`; its existing background declarations and bytes are unchanged.
- New `video-compact-studio.css` styles only Video, keeping the existing independently scrolling controls and feed, fixed Generate action and mobile document flow.
- Model banner: 112px; task/mode rows: 32px; reference entry: 50px; Generate: 38px. Four output controls share a row; audio sits below. Text retains its larger writing area.
- Existing IDs, native uploads, first/last-frame previews, capability visibility and disclosure behavior remain intact. Current Scene model/library affordances delegate to the original controls.
- `video-scene-states.js` detects actual first/end images and image/video/audio references, suppressing decoration as soon as source media is attached.
- `video-editorial-deck.js` preview now contains actual reference thumbnails only. Artwork is CSS decoration and is never a History record, attachment or generated result.
- Actual History loading, explicit selection, playback, Reuse and downloads remain owned by `lab.js`; no illustrative records are inserted.
- Desktop preview, inspector and editor share their edges. At 1440x600, native settings scroll while Generate remains visible; the #473 wheel routing preserves native settings priority.
- Existing mobile policy hides the decorative empty stage, preserving fast access to controls and real History. Real uploads and results still appear normally.
- Local validation: 708/708 Lab Node tests on configured Node 22.16.0, including mandatory approved Image contract; static build, syntax and whitespace passed.
- Browser validation: full Studio layout including 1440x600/768/820, 1728x820 and 390/320px; customer permission matrix 18/18 at 1440/390/320; Reference 22/22; guest/signed-in routing passed.
- Seedance suite includes four added real-upload/all-mode matrices at 1440x900, 1440x600, 390x844 and 320x730, output disclosure, model changes, no invented History and no preparation submissions.
- Existing sign-out assertion was aligned with current main's public-preview behavior, retaining stronger explicit checks for cleared private History, prompt, file input and reference media.
- Only approved visual expectations were changed in existing layout/artwork tests. No assertion bypasses, force clicks or weakened generation/account checks were introduced.
- Browser media, accounts and APIs are synthetic/intercepted. No real customer session, wallet transaction or paid provider acceptance is claimed.
- Review screenshots are in `docs/previews/video-studio-20261023/`; desktop and both phone widths plus short-height desktop.
- Windows local runner lives outside the repository and only adapts static-server path separators; repository assertions run unchanged.
- Final PR URL, commit and exact-head CI status are recorded in the draft PR and chat handoff. Inspect any failed checks before review; do not merge or deploy.

## Earlier customer access and mobile work

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
