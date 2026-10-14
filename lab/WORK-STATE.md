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
