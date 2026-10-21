## Cross-project audit, 2026-10-21 (Europe/Berlin)
- Audited main at f3eb54d114b17de1dee7fe50d84ee9c4a8769088 using current commits, open PRs, feature handoffs, CI and the public Studio.
- Main includes compact Video downloads f021f28, Elements Gemini repair 0c4dbf1, feedback spacing 558dc85, mobile Upscaler ccbd7f8, Hong Kong atmosphere/optics cef509f, Image focus 1b2a39c and PV Soul toolbar bf1b2e3.
- Video downloads handoff records successful Cloudflare deployment and live CSS verification. Private owner download was not exercised.
- Elements handoff records successful Worker deployment and live health version. Actual NINA FULL BODY eight-photo analysis remains unverified.
- Hong Kong generation/optics source is merged; this audit did not verify production renderer or a paid generated result.
- Main public homepage and signed-out Image Studio loaded in cloud browser. Prompt accepts typing, seven Inspiration looks are present, and desktop has no horizontal overflow.
- Guest Image currently has no visible photo attachment control. PR #377 contains guest local-photo preparation plus closed-account recovery and unified pricing fixes, but remains OPEN and unmerged.
- #377 latest head 9a9e15c2dd55432091d8755c4b35fe99c959c261 has 19 successful returned PR workflows and one failed Lab video integration workflow.
- Failed run 39515040917/job 118945050220 passed backend/syntax. Mock browser suite times out in tests/lab-reference-ui.mjs:129 waiting for reference-item second Up button; do not describe this as a confirmed production video-generation failure.
- Next priority: repair that regression check after inspecting current reference controls, recheck #377 against latest main and locked Image contract, then release and verify real account recovery/pricing.
- Other open work: #362 Fisheye 2000, #328 saved Elements editing, #277 Synthetic Romance face preservation. Other older open PRs may be superseded; an open PR alone is not proof its feature is absent.
- Signed-in owner/customer sessions, live purchase/refund, actual generated output quality, and Control Room Clerk sync were not verified in this audit.
- No paid generations, account mutations, merges or production UI changes made during audit.
- Existing feature records below are historical; do not interpret their old pending status as current without checking commits.

# PV LAB active work state

Updated: 2026-10-14
Scope: Seedream 5 Flash migration to SpicyAPI, without unrelated deck or model changes.
Production base checked: 332ce42e1648c48f4ebb8db082e231e1364e1bdd on main.
Implementation branch: fix/flash-spicyapi-20261014.

## Approved decisions
- Image selector keeps the public name **Seedream Flash**.
- Flash uses SpicyAPI, not OpenRouter, for all new requests.
- Text: `bytedance/seedream-5.0-flash/text-to-image`.
- Reference edit: `bytedance/seedream-5.0-flash/edit`.
- 1K and 2K resolution, 2K default; up to 10 image references.
- Only provider-verified Seedream models get the green ✳ Artistic Freedom badge.
- Existing layout, decks, archive, reference role instructions and non-Flash models stay intact.

## Implementation locations
- `lab-worker/seedream-flash.mjs`: documented model IDs, ratio and reference validation.
- `lab-worker/worker.mjs`: shared SpicyAPI /api/quotes and /api/jobs routing.
- `lab-worker/image-models.mjs`: Kling-only FAL endpoint, no live OpenRouter Flash calls.
- `lab-worker/customer-image-pricing.mjs`: Flash requires a live bound provider quote.
- `lab/lab.js`: model selector, ref limit, user quote and submit paths.
- `lab/image-model-limits.js`: remove legacy combined OpenRouter image cap.
- `lab/model-labels.js`: both current Spicy Flash and legacy OpenRouter history labels.
- `lab/image-studio.css`, `lab/studio.html`: badge styling and cache revision.

## Accounting and recovery
- SpicyAPI preflight binds the provider quote before paid createTask submission.
- Private R2 staging, signed reference uploads, D1 slot caps and spending checks are reused.
- Failed submissions preserve existing ledger/refund mechanics.
- Legacy OpenRouter history/archive code remains for recovery only. No new OpenRouter billing.
- Production OpenRouter key removal is a separate Cloudflare settings cleanup, if still configured.

## Verification
- Contract checked on the official SpicyAPI Flash text and edit model pages, 2026-10-14.
- API published price: $0.029 per image; live provider quote remains authoritative.
- Backend, frontend and regression tests updated in the branch.
- GitHub Actions PR checks: pending before merge.
- Deployment: NOT confirmed. Verify production Worker health version after main deployment.
- Paid generation: NOT run. User should perform one authorized text and one edit smoke test.

## Next action
- Review CI results, correct failures, merge validated branch to main.
- Confirm automatic Cloudflare Worker deploy and GitHub Pages update separately.
- Confirm no Flash request reaches OpenRouter after rollout.
