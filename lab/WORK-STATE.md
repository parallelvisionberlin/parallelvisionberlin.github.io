# PV LAB release checkpoint, 2026-10-21 (Europe/Berlin)

## Current objective and release
- User authorized finishing and releasing PR #377, then verifying the recreated-account flow.
- PR #377 merged to main as 1abf77edd3330f18adbda8abad073867adcb39eb.
- Final PR head 0ea6d77c1cb77fea8b5ede986e1235a25424e61b has all 20 PR workflows successful.
- Cloudflare Pages check for 1abf77e completed successfully.
- Live browser verified https://pvlab.studio/studio?tool=image after reload: new guest Add photographs locally control, accountFlow=20261020v6 script marker and closed-account recovery markup. Desktop width 1363, document width 1348.
- Live signed-out entry loads normally; no paid generation or checkout was submitted.

## Resulting behavior and safeguards
- Closed identities get explicit sign-out/re-registration recovery; no tombstoned wallet is reopened.
- Active customers, including zero-credit/paused-trial accounts, can prepare direction and photos before Generate opens pricing.
- Funded and zero-credit wallets use the same editorial pricing panel.
- Guest photos stay local until authenticated handoff; private Elements remain gated.
- Approved Image layout, prompts, Moods, model routing and credit rules are preserved.
- Video submission updates only the Current scene footnote; it no longer destroys fields used by the renderer.
- Current Video tests retain explicit History selection, no duplicate generation, no paid retry and original-media assertions.
- Candidate browser actually staged a synthetic local photo and edited a prompt without starting a generation.

## Live billing and Control Room evidence
- Stripe PV Lab live account read-only verification: one successful EUR 10 payment; no refunds to inspect.
- D1 read-only diagnostic 39574838449 passed wallet-ledger reconciliation, failed-job refunds, active verified contacts and absence of reported Clerk key/transient errors.
- That diagnostic FAILED freshness: last stored Clerk sync report was 89 hours old, and contact refreshes were due.
- Production five-minute cron schedule exists; deployed Worker contains scheduledClerkBackfill and diagnostic persistence. These facts do not prove scheduled execution is healthy.
- Do not disable this alert or describe all Control Room sync as verified.
- Diagnostic implementation: .github/workflows/pvlab-readonly-session-db.yml. It runs SELECT only and prints safe pass/fail labels rather than IDs, emails, balances or private media.

## Remaining verification and exact next actions
- This audit browser is signed out. Secure browserAuth rejected the password locator as not_user_visible; no credentials were entered.
- Offer the supported browser handoff for the owner/test customer to sign in.
- After sign-in: test the actual recreated account, real displayed credits, private History/Gallery and pricing handoff. Do not create purchases or delete accounts merely for testing.
- Owner session: inspect Control Room sync and run its explicit safe sync action if needed; resolve the stale scheduled report separately.
- Backend/sandbox payment, webhook idempotency and refund paths are covered by passing CI; no real refund or paid generation was performed.
- Full CI/account diagnosis history is in ACCOUNT-WORK-STATE.md. Preserve unrelated feature work.
- Earlier Flash-specific notes below are historical; current source and verified deployment take precedence.

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
