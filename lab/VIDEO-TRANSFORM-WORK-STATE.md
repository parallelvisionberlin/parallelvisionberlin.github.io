# Video Studio — Seedance Transform / Replace Character

Updated: 2026-11-05 (Berlin)
Repository: parallelvisionberlin/parallelvisionberlin.github.io
Branch: `feat/pvlab-seedance-transform-character-20261105`
Review PR: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/853
Status: implementation committed to **draft PR only**, not merged or deployed.

## Goal / approved scope
- Add a distinct third Video task, **Transform**, beside Create and Extend.
- First complete workflow: **Replace Character** in an existing clip using saved PV LAB Character or new identity photos.
- Preserve source motion, camera movement, chronology, set, wardrobe, lighting and background as prompt guidance.
- Optional prompt; before/after Original vs Result playback; private History/Reuse.
- Follow approved dark editorial UI and keep the actual video subway artwork unchanged.
- Do not create fake outputs, publish mockups or advertise unverified extra Transform modes.

## Implementation paths
- `lab/studio.html`: Transform task tab, editor identity description, character label and source/result switch.
- `lab/video-transform.css`: feature-scoped dark editorial treatment; original visual assets untouched.
- `lab/lab.js`: mode state, video + Character inputs, source preview, quotes, saved job restore, compare playback.
- `lab/video-models.js`: Seedance Video Edit mode model route.
- `lab/media-references.js`: per-mode 1 original video, source duration validation.
- `lab/video-input-action.js`: guide video or photo selection without fake Generate.
- `lab/video-scene-states.js`, `lab/video-editorial-deck.js`: presentation-only Transform state.
- `lab-worker/seedance.mjs`, `lab-worker/worker.mjs`: actual Transform parameters and private routing.
- `lab-worker/higgsfield-video-transform.mjs`: dedicated bound estimate and job submission, existing wallet/queue protections.
- `tests/lab-video-transform.test.mjs`: unit and source-level coverage.
- `tests/lab-video-transform-ui.mjs`: synthetic desktop/mobile browser coverage.
- `.github/workflows/lab-seedance-tests.yml`: independent Transform browser regression job.

## Provider and money/data protection
- Real Higgsfield route: `bytedance/seedance-2.5/video-edit`.
- One MP4/MOV source video, 4–30 seconds, max 20 MiB; 1–8 JPG/PNG/WebP character photos.
- Source and reference asset IDs remain account-owned; provider receives time-limited signed URLs.
- Server estimate via Higgsfield `/estimate/<model>` before any job; no automatic generation on upload.
- Max $20 provider estimate for the v1 feature; daily spend/concurrency/uncertain-job guards reused.
- Explicit priced confirmation, customer Higgsfield gate, original R2 source and result retained in History.
- Identity/motion preservation is generative guidance, not a guarantee; source/output may both be billed.

## Verification / current limitations
- Prior initial Video integration suite: 1008 passing, 6 failing; five unrelated existing Mood/Meta assertions and one stale media-reference limit assertion. The relevant assertion has been strengthened for Transform.
- A dedicated independent browser workflow has been added; check its actual result before any release.
- No real paid generation, authenticated owner checkout, vendor acceptance or provider output has been verified.
- No `main` merge, Cloudflare Pages deployment or production `pvlab.studio` verification.
- PR remains draft until scoped browser, quote, source preservation and provider behavior are reviewed.
- GitHub Actions dedicated browser verification and exact-branch Lab checks were queued in the latest observed run; do not claim passed until their logs confirm it.
- After code review, race-safe duplicate confirmation now resolves to the same stored quote job instead of attempting a second paid provider request.

## Exact next action
1. Read relevant GitHub Actions results for PR #853, fix Transform-only regressions.
2. Run one authorized owner account quote and one controlled paid transformation to verify native Video Edit acceptance and quality.
3. Authorize production release only after tests and costs are acceptable; follow `lab/RELEASE-PROTOCOL.md`.

## Approved visual application — 2026-11-06
- Owner approved generated Transform mockup with Create / Extend / Transform, compact source video, character image strip, saved Character chooser, Original/Result compare and editorial Scene details.
- Owner explicitly locked the current Video Studio deck geometry, original central photograph and existing Video History layout and behavior.
- Visual implementation limited to Transform-specific left controls and an inspector draft section; no second workflow strip below preview (would displace History); no invented generation or fake result.
- Corrected saved Character library allowlist to include Transform, fixing the blocked attachment reported by the synthetic browser test.
- No modifications to video-history-cards.css, center stage dimensions, source image, History renderer, Create or Extend mode layouts.

- Test hardening: wait until all eight saved Character photographs finish preparation before asserting the inspector count; preserve existing Character remove test with a focused DOM fixture; update the verified Character allowlist contract to include Transform.

- Verified public Higgsfield API reference for `bytedance/seedance-2.5/video-edit`: required prompt/video_url, optional image_urls/resolution/output_format/generate_audio; source/output time is billable.
- Separate retail release flag `LAB_CUSTOMER_VIDEO_TRANSFORM_ENABLED=true` now required on both quote and submit, alongside existing Higgsfield customer approval. Default is disabled; owner testing remains possible without allowing customer charges.
- Target subject in a multi-person source video is now governed by the explicit user prompt, rather than an unconditional main-person substitution.
