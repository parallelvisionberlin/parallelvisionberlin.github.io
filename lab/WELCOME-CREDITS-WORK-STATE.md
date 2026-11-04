## Paid onboarding verification / 2026-11-04

- Owner policy: no automatic signup credits. Existing 40/200-credit grants, purchases,
  vouchers and refunds remain spendable. €3 buys exactly 300 credits, one time.
- Production source inspected: main `08be9b878547b3a034a012207c4e0416a013e1af`.
- Pages: Cloudflare app check `126529624456` succeeded, deployment
  `f8f55e08-dce1-4e41-ac71-1c1dd9d968c2`, project `pvlab-studio`.
- Official release verifier returned LIVE_VERIFIED for lab.js v20261101-wardrobe1,
  SHA-256 `a94902fb40ecbf9b8de2784514a6bdcf86332057e9c0860d63fe67779ee3871e`.
- Live explore-moods.js/.css, app-mood-generation.js and account.js exactly match main.
- Worker: health currently reports `pv-lab-2026-11-03-paid-onboarding`.
  Latest Worker release run `41731872740`, source PR #822 merge `3fdf286d`, succeeded.
  Version ID `0cc4f22b-0968-4b24-8525-ebdf2e7bf0b7` deployed 2026-11-03 22:47 UTC.
- That release applied migration 0060 remotely and passed all read-only policy,
  no-negative-balance, wallet/ledger reconciliation, grant uniqueness and refund checks.
- Fresh read-only audit now also checks no welcome claims/credits after migration 0060,
  checkout/public-generation switches and unique payment/job receipts. All 22 checks
  passed on 2026-11-04 12:17 UTC in run `41827836627` (SELECT/settings GET only).
- Local photo selection does not require an upload: zero-balance preparation stops
  before /api/uploads, /api/quotes or /api/jobs. Generate alone opens the inline offer.
  The selected file stays local. The focused pack opens separately at
  account.html?pack=topup3#balance. Twelve 1K images is explicitly a 25-credit example.
- 51 focused backend/billing tests pass locally, including legacy wallet spending,
  unpaid job rejection, signed webhook replay, malformed amount/currency/identity,
  exact €3/300 fulfillment and one-time purchase behavior.
- Existing Chromium + WebKit account checks passed at current main in run
  `41816723595`; Mood generation checks passed in run `41816723639`.
- Added explicit Mood Atlas desktop/phone zero-balance and synthetic purchase-return
  regression coverage. CI pending. Local browser binary download is unavailable.
- Stripe PV Lab read-only account query succeeded. No topup3 Checkout session exists
  in the returned history (20 sessions total); latest session is 2026-11-01.
  This is not proof that a new live €3 customer Checkout works.
- Live browser session is the owner, whose account correctly hides customer packs.
  No customer login was invented, impersonated or changed.
- No application defect confirmed; no production app code, payment, provider job,
  customer balance or existing account changed during this audit.
- Verification changes are tracked in PR #832. Added browser scenarios await CI.
- Remaining: actual hosted €3 Checkout needs an authenticated customer session. Stop
  before payment. Keep this distinct from synthetic coverage.

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
