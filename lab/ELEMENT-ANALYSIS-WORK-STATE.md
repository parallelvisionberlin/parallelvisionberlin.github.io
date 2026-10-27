# PV LAB Elements visual analysis

Updated: 2026-10-21 (Europe/Berlin)
Source base: `1566e668b4688bbf499a3fb700c316fbf1d08ca1`, main.

## Objective and evidence
- Repair Analyze photos for saved Elements, including NINA FULL BODY's eight references.
- User screenshot shows both Gemini attempts ending in HTTP 404.
- Previous recovery code used `gemini-2.5-flash` and `gemini-2.5-flash-lite`.
- Google now restricts both 2.5 models to projects with prior usage.
- Official reference: https://ai.google.dev/gemini-api/docs/deprecations
- This feature indexes saved references; it does not train or alter LoRA weights.

## Implemented
- `lab-worker/element-profiles.mjs`: current GA Gemini 3.8 Flash with one Gemini 3.5 Flash-Lite fallback.
- Uses supported `thinkingLevel` settings: low for 3.8, minimal for Flash-Lite.
- Uses Google's recommended temperature 1 and a bounded 4096-token response budget.
- Excludes thought parts from JSON parsing.
- Preserves private 480px previews, owner checks, original assets, cached profiles, quotas, and generation credits.
- `lab-worker/worker.mjs`: health version `pv-lab-2026-10-21.1-elements-gemini3`.
- `tests/lab-element-profile-recovery.test.mjs`: eight-view 404 recovery, bounded dual failure, thought filtering, and model-specific request regression.
- `.github/workflows/deploy-lab-worker.yml`: recovery tests now run before deployment.
- No frontend, other generation model, Mood Creator, or LoRA training change.

## Verification and release
- 11 targeted tests passed, including cache behavior, ownership, and original-image preservation.
- Worker syntax and whitespace checks passed.
- Before release, live health reported `pv-lab-2026-10-20.2-one-check-per-generation`.
- Released commit: `0c4dbf1dc46acbacd430c2af5113e46c4b2e5995` on main.
- GitHub Actions deployment `39514538194` completed successfully, including all required tests and production health verification.
- Direct production health read confirmed `pv-lab-2026-10-21.1-elements-gemini3` after release.
- Browser at https://pvlab.studio/studio?tool=image is signed out in this session, so the real private Nina-pack provider response was not tested.
- Next: signed-in owner should click Analyze photos on the existing NINA FULL BODY Element; no reupload or LoRA retraining is required.

## Message spacing follow-up, 2026-10-21
- User requested only removal of the small message scrollbar and inset text.
- `lab/scene-library.css`: nonempty browse feedback gets a separate wrapping footer, aligned to the existing 24px desktop, 17px tablet and 14px phone content gutters.
- With a message visible, the gallery retains wheel/touch scrolling; the message does not add an outer scrollbar. Empty-message layout and the create form retain their existing behavior.
- `lab/studio.html`: stylesheet cache revision only. No JS, backend, asset, typography or card-layout changes.
- Published commit: `558dc8599d7f9a1c563b221e8765ce6478b74da9`.
- Static diff checks and existing Lab desktop/mobile browser CI `39515740820` passed.
- Live browser at pvlab.studio confirmed stylesheet revision `statusSpacing=20261021v1` and computed message wrapping `anywhere`.
- Local preview browser download was unavailable; the signed-out production session cannot open the owner's actual saved Element.

## 2026-10-27 Character usability follow-up
- Character photo upload automatically prepares oversized and browser-decodable alternate-format images as private WebP copies, preserving the local source file.
- Video Studio automatically fits over-limit camera photos to each mode's bound and clears stale original asset IDs when a working copy is made. The image model's own pixel/size constraints remain.
- Character list and selected details show actual analysis state from stored profile or in-flight request. This does not claim Gemini completed until a valid profile was stored.
- Existing stored Jenn LSS images remain untouched; Video can prepare a compatible copy on selection.
- Branch `fix/character-uploads-analysis-selection-20261027`, not yet published or verified against a signed-in customer session.
