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
