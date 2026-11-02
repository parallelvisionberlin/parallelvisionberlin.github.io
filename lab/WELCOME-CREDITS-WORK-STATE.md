# PV LAB introductory image trial

Updated 2026-11-02. Deployed correction: `b2e1f0aad3523271d2bda192f16b157308e59f5d` (PR #788).
Review base: `9c13c5efed6b3bd97513825a2eb9278a349aee19`.

## Current owner request
- Verified accounts created from 2026-11-01 00:00 Europe/Berlin receive exactly 40 credits once.
- Permit one regular image, with failed/refunded attempts retryable. No unpaid videos or image tools.
- Preserve existing wallets, purchases, voucher access, identity deduplication and approved interfaces.
- Berlin Rave signup must keep the local photo, selected Mood and campaign URL.

## Verified baseline
- PR #780 added the cohort, verified-email claim and database restrictions; #782 keeps `/moods` onboarding in place.
- Later migration 0052 removed the one-job limit and permitted spending the balance across multiple images.
- Production Worker run 41361037052 succeeded on 2026-11-01 at source `38321ac6e3f3959d05772649ff16e203b6bcb6d7`.
- Its logs confirm remote migrations 0051/0052, image trial true, old welcome false, free trial paused true.
- Public campaign page currently opens Berlin Rave and advertises 40 credits.

## Correction in this work unit
- `lab-worker/migrations/0053-single-image-trial.sql` restores atomic insert/activation guards using durable generation finance.
- `lab-worker/customer-lifecycle.mjs` reports the trial unavailable after a non-failed job even when residual credits remain.
- No balances are reset, consumed retroactively or backfilled. A purchase enables the ordinary retained wallet.
- Deployment workflow applies 0053 after 0052 and runs a read-only production verification script.
- `.github/scripts/verify-lab-image-trial-live.mjs` verifies deployed flags, migration markers, trigger guards and wallet/refund invariants, printing booleans only.
- `tests/lab-first-image-trial.test.mjs` covers repeated/parallel claims, job retries, refunds, repeat images, deleted history, drafts, videos, old accounts, paid wallets and isolation.
- `tests/lab-berlin-rave-signup-browser.mjs` exercises the actual editor/service/session handshake with synthetic identity and API responses at 390px and 1440px.

## Checks and remaining evidence
- 54 focused trial, welcome, pause, hold, signup and auth tests passed locally.
- 122 Worker, customer lifecycle, customer billing and sandbox billing integration tests passed locally.
- Approved Image contract and campaign tests passed; an unrelated existing Moods header wording assertion fails in `lab-moods-inline-return.test.mjs`.
- Nine approved Image/campaign contracts passed locally. General CI has three failures in unchanged checkout-tracking, Moods-header and ZenCreator-copy assertions.
- Dedicated trial CI [41373460852](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/41373460852) passed, including new/returning users at 390px with mobile/touch emulation and 1440px.
- Browser checks assert original uploaded bytes and preview, selected Berlin Rave Mood, exact campaign URL, one wallet creation and one explicit mocked job.
- Production Worker [41373651233](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/41373651233) succeeded for the deployed correction.
- Worker version: `a749e553-779c-4123-bc58-74244ac7960e`. Remote migration 0053 executed successfully.
- Live read-only audit passed all three flags, migrations 0051/0052/0053, Berlin cutoff, legacy pause, both single-image triggers, wallet reconciliation, exact 40-credit receipts, receipt uniqueness and failed-job refunds.
- Live `https://pvlab.studio/session-request.js` exactly matches reviewed source, SHA-256 `0ee185a33004cffc3359b7ab45fd280d4a3ebf6aeccc7e81e49ae7f344c91d49`.
- Verification incident: one unintended production image was generated from a synthetic geometric test file through an already signed-in session. No further live generation checks were performed. Automated CI uses mocks only.
- No production test account or Stripe payment was created. Real fresh Clerk/OAuth completion remains untested; mocked registration is separate evidence.

## Next action
- No correction rollout remains pending. Preserve these restrictions and the approved interface.
- A future real signup check should use a dedicated test account and must not submit provider generation.
