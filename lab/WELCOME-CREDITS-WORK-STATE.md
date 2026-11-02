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
- Release complete: PR #795, reviewed head 553ab8475d5c8a4465412844ce0cb7c118894eac,
  merged source 09c5fa07f3e5f2c5987f0bb865e855555c091d04.
- Exact-head CI PASS: trial 41464305081, account 41464305407, Mood generation 41464304793,
  approved Image contract 41464305140 and Worker integration/video-upscale 41464305105.
- Reviewed result and focused-pack screenshots at 390px/1440px; 320px account assertions pass.
- Existing unrelated broad-suite failures remain, including stale Moods/ZenCreator assertions and media/UI fixtures.
- Cloudflare Pages app check 125343696721 succeeded for the merged source, project pvlab-studio.
- Release verifier LIVE_VERIFIED for lab.js v20261101-wardrobe1;
  SHA-256 19308b2eadf108da8b915025fe9d13de87e54892e315b2c21aa99daf8e5dabd7.
- Direct production JS/CSS bytes match reviewed explore-moods, app-mood-generation, account and wallet sources.
- Live public Berlin Rave modal displays the approved first-image-free copy and retains its original layout.
- Worker deployment 41464815159 PASS; version pv-lab-2026-11-02-image-credit-balance,
  deployment e787b63c-b73e-466b-add7-fe3480f95176, migration 0056 applied remotely.
- Read-only production audit PASS: flags, cohort cutoff, legacy pause, image-balance guards,
  nonnegative/reconciled balances, exact/unique welcome grants and failed-job refunds.
- No real Stripe purchase or provider generation performed. Fresh real OAuth/payment completion remains untested;
  synthetic new/returning signup, repeated generation, pack-tab and purchase-return checks are separate evidence.
- No implementation or release task remains pending. Keep this approved policy unless Alejandro changes it.
