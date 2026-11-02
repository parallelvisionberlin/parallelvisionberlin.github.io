# PV LAB introductory image balance

Updated 2026-11-02. Current approved implementation replaces the previous single-image limit.

## Owner approval
- Alejandro approved the payment-flow visual and requested implementation.
- Verified accounts created from 2026-11-01 00:00 Europe/Berlin receive exactly 40 credits once.
- Allow all remaining trial credits to fund regular images, each with an explicit Generate action.
- No unpaid video or image-tool access. No extra grant, reset or old-account backfill.
- Preserve paid wallets, voucher access, verified-email deduplication and abuse holds.

## Implementation
- Migration 0056 replaces the two trial job guards after historical 0053/0055.
- Exact 40-credit welcome cohort and regular-image type/mode required, null-safe.
- The job insert's existing ledger debit atomically rejects overspending, including queued jobs.
- Unfunded draft activation is rejected so draft state cannot bypass the ledger.
- Customer readiness remains true while eligible trial balance remains; actual quote validates affordability.
- Failed jobs refund once under existing ledger logic; deleting history never regrants funds.
- Production verification checks migration 0056, image-balance guards, nonnegative wallets, reconciliation,
  exact/unique grants and failed-job refunds. Existing pause/rollout flags remain unchanged.
- Berlin Rave advertises the first image free, retains photo/result and links to the existing one-time pack.
- Existing Stripe Checkout/SKUs and local-currency handling remain authoritative.

## Validation and release
- Base main e24644a3ed2317e39c9b9ac25a55370758d29fe7.
- 37 focused trial, welcome, pause, abuse-hold, campaign and approved Image checks passed locally.
- Browser suite extended to spend both 20-credit images, open the focused pack tab, retain photo/result,
  refresh after a synthetic purchase, and require Generate again at 390px/1440px for new/returning users.
- Account browser checks focus the €3 pack at 320px/390px/1440px with no automatic checkout.
- CI, merge and production verification pending. No paid generation or real Stripe payment used for QA.
