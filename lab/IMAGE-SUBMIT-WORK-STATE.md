# Image submission flow

## Insufficient-credit purchase flow, 2026-11-04
- Owner approved removal of the failure toast and empty/unconfirmed card when insufficient credits opens pricing.
- Source baseline: main ba038d5dcbe11b32f38e29909b68f6edaba23071. Later main d2f8932b changed only unrelated welcome-email files.
- Reference: image(20261104-222706).png, Library libfile_cc1bf03f4db481918ba7227e17b09af7; visible balance 19 versus quoted charge 35.
- Root cause: api() opened pricing on HTTP 402, then threw a generic Error. Image submission treated the rejected POST as an unconfirmed provider request and retained a local error card plus toast.
- Compare the verified total image price with current balance before local preparation or paid submission.
- Retain a typed credit-required outcome for definitive wallet rejections, including through asynchronous pricing and wallet-refresh invalidation.
- Credit gating leaves the purchase window only; remove this attempt's temporary preparation and keep the editor intact. Closing pricing has no generation side effect.
- Provider HTTP 402 stays distinct from PV LAB wallet insufficiency. Real transport/unknown submission failures retain their review card and safeguards.
- Reuse private same-tab, account-bound Image draft storage before creating Checkout; a failed save prevents checkout creation/navigation.
- Billing success or cancellation restores only a checkout-tagged draft: photos, IDs/roles, prompt, Mood and settings. Never auto-generate.
- Preserve existing pricing, Stripe/webhook/ledger authority, backend gates, idempotency and request limits. No backend changes.
- Product files: lab.js, customer-image-pricing.js, customer-wallet.js and studio.html cache references.
- New unit coverage exercises actual API/submission code, typed price outcomes, unknown transport, provider errors, checkout-save order and account switches.
- New intercepted actual-module browser runner covers low balance, server rejection, quote rejection, unknown transport and checkout return at 390/1440px.
- Dedicated workflow retains the approved Image contract and customer image-pricing, billing and generation-finance tests.
- Local focused tests: 15 passed; JS syntax and diff whitespace checks passed.
- Publication status: awaiting PR CI, merge and Cloudflare/live verification. No real paid generation or purchase used.
- Next: inspect scoped browser/finance results, publish the tested commit and record release evidence here.

## Objective and approved behavior
- Date: 2026-10-31.
- Verified starting main: `e4c375df3b75cebf222f561a3dd42ebe6fc3020b`.
- Owner requested Generate to become available after a two-second pause.
- Scope: existing owner Seedream 5 Pro single-image preparation handoff.
- Each explicit click freezes prompt, settings and source references.
- Identical clicks during the two-second cooldown are ignored.
- After cooldown, a deliberate identical click creates an independent variation.
- Preparations continue to occupy queue capacity until acknowledged or settled.
- Each preparation has its own ticket and History card.
- Finishing an older request cannot release a newer request's reservation.
- Early acknowledgement does not shorten accidental double-click protection.
- Existing queue limits, uncertain-job review and server spending checks remain.
- No automatic provider retries or paid test generations.
- Customer credit pricing, batches and other models retain their existing flow.

## Files
- `image-submit-handoff.js`: cooldown and independent reservation accounting.
- `lab.js`: refresh Generate when cooldown ends; clearer History progress.
- `studio.html`: cache version for the updated entry module.
- `../tests/lab-image-submit-handoff.test.mjs`: timing, overlap and sign-out checks.
- `../tests/lab-fastqueue-browser.mjs`: held quotes, identical clicks and queue limit.

## Verification and release
- Approved Image UI contract and handoff unit tests: 11 passed.
- Mock browser: identical draft unlocks in two seconds before quote response.
- Mock browser: three deliberate clicks produce exactly three independent jobs.
- Mock browser: preparation reservations enforce the queue limit.
- Worker, generation finance and customer image quotes: 120 passed.
- Prompt-paste and desktop/mobile Studio layout browser checks: passed.
- GitHub: full private-lab, queue-smoke, approved-image-ui, Generate, appearance,
  compact-image-prompt and image-prompt-paste checks passed.
- First-image suite: existing Inspiration backdrop mismatch reproduced on unchanged main.
- Other inspected CI failures concern Video Extend visibility and an obsolete Beauty Studio link.
- PR #739 merged; production source: `af37ed2e27ac6e7e7151f70fa94dcba3a3a1fbc8`.
- Cloudflare Pages check `124604690295`: completed successfully for this source.
- Scoped release verifier: `LIVE_VERIFIED` at `https://pvlab.studio/studio`.
- Production `lab.js` SHA-256: `9a10db39053444e32d33aeccc391755fce2b704de2edbf6700e6dade9c76200f`.
- Real signed-in paid generation: not performed.
- Next action: owner can reload Studio and use deliberate repeated Generate clicks.
- Queue capacity and uncertain-job review may still disable Generate for their existing reasons.

