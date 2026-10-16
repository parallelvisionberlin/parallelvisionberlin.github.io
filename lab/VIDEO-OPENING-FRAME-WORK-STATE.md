# Wan references and Seedream opening frame: work state

Updated: 2026-10-16
Scope: Video Studio's Wan Reference uploader and optional Seedream-generated opening still.
Repository: parallelvisionberlin/parallelvisionberlin.github.io
Merged: PR #253, squash commit 176a618ec97d8b3541b65a263f93e7c480d5968e on main.
Feature branch: fix/wan-start-frame-browser-drop-20261016

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
- GitHub PR checks: Lab tests private-lab passed, including 490 unit/mock tests; Validate static site passed; targeted price/approval/preview and source wiring tests passed.
- Other browser workflows failed on pre-existing unrelated Image/upscale/Soul UI assertions; the same workflows were failing on main before PR #253. No related video-opening-frame assertion failed.
- GitHub Pages deployment run 38842912466 was in progress at the last check. A Cloudflare Pages production request was not reachable from the current tooling. Therefore **pvlab.studio live status remains unverified**.
- An authenticated live Seedream generation should NOT be submitted automatically during testing; requires a real customer's explicit approval and credits.
- No production deployment should be claimed from a branch commit alone.
- Follow up by verifying pvlab.studio serves `/lab/video-start-frame-maker.js` and the revised Studio UI after Cloudflare Pages finishes its Git integration build. GitHub Pages success is not proof of Cloudflare Pages status.
- Next manual smoke: Wan 3.0 References, drop 2 photos (then click browse), enter opening composition, review Seedream quote, explicitly confirm image cost, inspect completed image, Use as Start Frame, then review Wan video quote.
