# Wan references and Seedream opening frame: work state

Updated: 2026-10-16
Scope: Video Studio's Wan Reference uploader and optional Seedream-generated opening still.
Repository: parallelvisionberlin/parallelvisionberlin.github.io
Branch: fix/wan-start-frame-browser-drop-20261016

## Goal
- Let a customer drag JPG/PNG/WebP files into the browser during supported Video Reference modes.
- Preserve click to browse on the existing Reference label, its 10-image maximum for Wan, and validation/thumbnail behavior.
- Repair the visible but previously unwired "Create Start Frame" button.
- Produce one Seedream 5.0 Pro 1K PNG opening still from the selected references with its own composition prompt.
- Review a real bounded Seedream quote and PV LAB credit cost before user confirms payment.
- Inspect the saved still, choose "Use as Start Frame", then animate with Wan in Start mode on a separate paid action.

## Actual implementation
- 'lab/video-start-frame-maker.js': browser drag helper, quote/confirm/preview state machine, Wan handoff boundary.
- 'lab/video-start-frame-maker.css': restrained black editorial treatment and visible drop affordance.
- 'lab/lab.js': mounts the helper, reuses authenticated uploads, the bound quote API, job polling, credit cost and asset retrieval.
- 'lab/studio.html': clear drop/browse wording and opening-frame preview/price dialog.
- 'tests/lab-wan-opening-frame.test.mjs': unit and mocked workflow cases.
- No backend routes, API secrets, pricing schedules, wallets or model contracts were changed.

## Invariants
- Wan 3.0 does NOT accept a first frame plus independent reference images in the same provider request.
- Choosing the generated still switches to Start mode; existing reference photos remain in the Studio but are not sent to Wan with the still.
- Prompt for opening image is user-authored and distinct from movement/audio direction.
- Preview and quote are nonpaying actions; only explicit "Confirm & generate opening frame" submits one paid image.
- Video generation itself still uses its existing independent bound quote/confirmation.
- No browser-side raw customer keys. Original images remain unchanged.
- No automatic regeneration on failed/uncertain paid requests. Review History/provider before trying again.
- Existing maximum counts and per-file format/size/dimension validation remain authoritative.

## Verification and deployment
- Source and mock tests are intended to run via the existing Lab tests GitHub Actions on the feature pull request.
- An authenticated live Seedream generation should NOT be submitted automatically during testing; requires a real customer's explicit approval and credits.
- No production deployment should be claimed from a branch commit alone.
- After CI, merge to main and verify served Studio assets at pvlab.studio; confirm Cloudflare Pages status separately.
- Next manual smoke: Wan 3.0 References, drop 2 photos (then click browse), enter opening composition, review Seedream quote, explicitly confirm image cost, inspect completed image, Use as Start Frame, then review Wan video quote.
