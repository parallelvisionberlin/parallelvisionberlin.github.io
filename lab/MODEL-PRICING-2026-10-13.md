# PV LAB video/image launch pricing — 13 October 2026

## Included model routes

- **Seedance 2.5** (default): existing SpicyAPI `bytedance/seedance-2.5` Start/Text/Reference, native available resolutions, and existing Extend route
- **Seedance 1.5 Pro · Motion**: `bytedance/seedance-1.5-pro/image-to-video` and `text-to-video`; 4–12s; 480p, 720p, 1080p; optional `camera_fixed`. Sound defaults off when first selected; the user can enable it
- **Seedance 2.5 · 4K**: `bytedance/seedance-2.5-spicy/image-to-video`, marketed by its 4K deliverable, **upscaled from a native render up to 1080p, not native 4K**. 4–30s image-to-video only, optional last frame/audio. The code retains the exact vendor model ID internally; no content-policy bypass
- **Seedream 5 Lite**: `bytedance/seedream-5.0-lite/text-to-image` and `edit`; 2K, eight size presets, up to ten reference photos, max 3,000 characters after Mood and reference directions, before provider quote
- All existing image, Wan and MiniMax models remain available and retain their existing price policy

## Billable PV credits per provider USD (based on bound maxCharge)

| Model category | Credits per $1 vendor quote | Minimum |
|---|---:|---:|
| General images and other API models | 460 | 7 credits |
| Seedance 1.5 Pro · Motion | 320 | 7 credits |
| Seedance 2.5 normal | 230 | 7 credits |
| Seedance 2.5 · 4K | 190 | 7 credits |

Exact backend path: `lab-worker/job-pricing.mjs`. Only valid model-and-engine pairs qualify for a special rate. All others fall back to 460. Customer quote exposes `creditCost`, customer job history exposes `creditCost`, and SQLite's authoritative `lab_charge_job` trigger calculates the same number using the saved server-normalized job settings.

**Critical deploy order:** Existing migration 0008 sets a special **400-credit** Higgsfield Soul ID training rate. New migration `0012-video-tiered-pricing.sql` must run **after 0008** against LAB_DB; it rebuilds only the future job debit trigger, preserves that Soul ID exception, and preserves failed-job refund logic. Do not touch Nina's OWNER_DB or historical ledger entries. Migration is repeatable.

### Sample expected customer prices, €10 / 1,000 PV credits pack

Prices are example estimates at published provider prices. Every request must be quoted at its **live maximum**; this table does not override it.

| Output | Vendor estimate USD | PV credits | Equivalent EUR |
|---|---:|---:|---:|
| Seedream Lite 2K | $0.035 | 17 | €0.17 |
| Seedance 1.5 Pro 720p, 10s, no audio | $0.227 | 73 | €0.73 |
| Seedance 2.5 normal 720p, 10s | $2.31 | 532 | €5.32 |
| Seedance 2.5 normal 1080p, 10s | $5.69 | 1,309 | €13.09 |
| Seedance 2.5 · 4K, 10s | $21.60 | 4,104 | €41.04 |

The nominal margin on fully redeemed credits varies by plan (one-time packs and monthly plans have different € per credit). Credit debits do not by themselves establish net profit: subtract VAT where applicable, Stripe fees, storage, chargebacks, provider repricing and infrastructure. Do not promise every model can process every sensitive request.

## Quality and rollout

Run node CI and browser regressions before merge. Deploy to Cloudflare through the existing `Deploy Parallel Vision Lab Worker` workflow (including migration); confirm `/health` version `pv-lab-2026-10-13.2-seedance-lite-pricing`. Then check a newly signed-in test customer can see a quote matching the server multiplier without actual checkout or billable generation.

Do not activate the separate welcome-credit draft or alter public checkout/registration/Higgsfield provider flags as part of this change. Run quality A/B tests (moods, identities, long clips) separately. The user plans to do the paid creative comparisons themselves.
