# PV LAB introductory image trial

Updated 2026-11-02. Review base: `9c13c5efed6b3bd97513825a2eb9278a349aee19`.

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
- Browser checks and final production policy verification pending CI/deployment.
- No real provider generation, Stripe payment or production test-account creation is authorized by these checks.
- Real Clerk/OAuth completion and an actual live 40-credit award remain distinct from mocked browser verification.

## Next action
- Run dedicated CI, merge the reviewed correction, verify Worker deployment and the read-only live policy results.
- Record final commit/run IDs and browser results here before closing the task.
