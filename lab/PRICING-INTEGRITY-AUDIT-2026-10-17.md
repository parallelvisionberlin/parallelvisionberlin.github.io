# PV LAB pricing integrity audit: 17 October 2026

## Verified source scope
- `lab-worker/job-pricing.mjs` is the canonical JavaScript customer credit calculation.
- `lab-worker/migrations/0029-pricing-debit-parity.sql` is the D1 atomic debit and parity guard. Apply **after** migration 0028 and only to LAB_DB.
- `lab-worker/customer-billing.mjs` is the authoritative Stripe product and credited-points catalog.
- All paid provider estimates and quotes must be generated server-side. Neither the customer browser nor the Mood card sets a rate.
- No actual live provider receipts, Cloudflare D1 production data, or Stripe payout exchange rates were supplied to this audit.

## Currency dimensions (do not conflate)

1. **USD provider cost:** For bound SpicyAPI requests, reserve the verified vendor `maxCharge` expressed as integer USD micros. Some other APIs provide *estimates* only; mark them as such.
2. **Customer credits:** The commercial unit is PV credits per USD provider cost, currently 460 for standard routes. This is a **retail pricing multiplier**, not a USD/EUR exchange rate.
3. **Gross EUR per purchased credit:** Credited packages differ by product, and welcome/promotional credits have zero directly attributable purchase revenue. Do not claim a universal real EUR per credit.
4. **Real contribution margin:** Requires actual USD/EUR settlement, fee/tax regime, actual provider bill, payment fees, refunded customer payments and costs of promotional/free credits. Not computable from the source alone.

## Immutable commercial catalog

| SKU | Customer price (EUR) | PV credits | Gross EUR/credit |
|---|---:|---:|---:|
| topup10 | 10 | 1000 | 0.010000 |
| topup29 | 29 | 3000 | 0.009667 |
| topup75 | 75 | 8000 | 0.009375 |
| starter | 15 | 1600 | 0.009375 |
| creator | 39 | 4500 | 0.008667 |
| studio | 99 | 12000 | 0.008250 |

Conservative paid-credit valuation for **gross sensitivity analyses only**: EUR 0.00825/credit. At the standard 460 credits per USD provider quote, one USD of provider exposure earns at least EUR 3.795 of *gross credit-package equivalent* before tax, Stripe, currency conversion, free-credit attribution, storage or other costs. This is neither guaranteed collected revenue nor net profit.

## Three visible Mood prices

- Vinyl Heat is the welcome label for Mood `90s-cinema`. It uses the chosen model and no automatic Mood reference images.
- Cloud Spa maps to `dreamcore`, which currently stages 3 backend reference images.
- Green Haze maps to `hong-kong-nights`, whose browser reference planner adds 4 Style reference images.
- Seedream 5 Pro 2K at published SpicyAPI base $0.072 yields ceil(0.072*460)=34 -> 35 credits using the approved five-credit retail step.
- 40 credits is consistent with additional provider charges for references, **but the exact vendor quotes for the screenshot were not retrieved**. Never infer a real quote solely from the displayed number.
- Do not drop built-in style references or silently lower the output resolution to alter the quote.

## Exceptions already approved and preserved

- Spicy image generation: 5-credit ceil steps, minimum 10.
- Standard image/other API models: 460 credits per vendor USD, minimum 7.
- Seedance 1.5: 320; silent 720p: 300.
- Standard Seedance 2.5: 160.
- Seedance 2.5 upscale-to-4K route: 190.
- Wan 1080p: 388. Other Wan routes remain at standard.
- Nano Banana 2.1 normal 1K/2K/4K: 8/10/20 fixed.
- SeedVR 2x/4x: 10/18 fixed.
- Higgsfield Soul ID training: 400 fixed.

Model and provider selectors must be exact server-normalized pairs. Fal.ai/Higgsfield requests may not inherit Spicy video multipliers even if a malicious or corrupt payload uses another model label.

## Corrections implemented on pricing-integrity branch

- Stored integer USD micros used for JS price calculation, consistent with DB estimation.
- Server side quote/debit parity enforced atomically on new priced jobs by SQL.
- New non-draft customer image/video jobs with zero-valued USD quote rejected before provider submission.
- Soul ID training quote fallback correctly reports 400 credits.
- Centralized legacy default rate fallback onto canonical JavaScript pricing policy.
- Fashion, Retouch, fal.ai video and Higgsfield Extend carry server credit costs through the quote/job flow; remove hardcoded browser conversion fallback.
- Frontend customer confirmation declines a quote lacking server `creditCost`.
- Existing prices, promotional credits, Stripe catalog, owner DB, refunds, and historical accounting untouched.

## Production verification required

1. CI pricing tests and browser regressions must pass. A pre-existing visual test in Video verifies Image deck height and is not a pricing assertion.
2. GitHub deploy workflow applies D1 migration 0029 **before** publishing updated Worker.
3. Confirm `/health` reports the new version after deploy.
4. For each product route, compare backend quoted cost, `jobs.estimate_microusd`, generation entry delta and completed/failed refund. This can be done with read-only D1 access by an authorized owner; avoid exposing prompts/media in logs.
5. Reconcile sample provider paid invoices and Stripe settlement amounts against modeled gross EUR/credit. Until then, do not certify model net margins or convert vendor USD into a fabricated EUR cost.
6. Do not run paid test generations automatically. Use mock API/SQLite tests first.

## Pricing-change recommendation

Do not change the 460 conversion, existing special multipliers, public package sizes or the 5-credit rounding policy merely to reduce customer prices. First sample real provider quotes and invoices. Consider a future **versioned policy** separating USD/EUR conversion, vendor-cost markup, EUR/credit valuation and model-specific round-off, with matched migrations and parity tests. Apply such policy changes only to *future* quotes after review. Protect old paid ledgers and existing customer balances.
