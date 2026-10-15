# PV LAB Video pricing review | 15 October 2026

## Actual changes

- Seedance 1.5 Pro has a *narrow* lower rate for **720p with audio off**, 300 credits per USD of the bound vendor quote (previously 320). At other resolutions or with audio enabled, it remains 320 credits/USD.
- Standard Wan 3.0 at **1080p only** (Start or Reference) is now 388 credits per vendor USD (previously 460). Wan 720p, Wan 480p and Wan 3.0 Prime remain 460 credits/USD. No model switches automatically.
- Standard Seedance 2.5 Start/Text/Reference changes from 230 to 160 PV credits per USD of the bound maximum vendor quote. 480p, 720p and 1080p all use the same credit multiplier, but the vendor USD amount varies substantially by resolution and duration.
- The Seedance 2.5 upscaled 4K variant remains at 190 credits/USD. Higgsfield Extend is separate and does not receive the standard Seedance discount.
- Customer video review now leads with the **approximate EUR equivalent of the credits**, using the published **€10/1,000-credits** one-time pack. The actual wallet debit is still **PV credits**, and the exact debit remains visible before confirmation. Other packs/subscriptions have different effective per-credit prices; welcome/promotional credits require no new payment. This EUR equivalent is **not a USD/EUR exchange quote**.
- Neither providers nor generation workflows switch automatically. Customer history, past purchases, paid jobs, Nina owner DB and existing ledgers are not edited.
- SpicyAPI itself classifies the standard Seedance 1.5 Pro and 2.5 routes as **Uncensored** (no *additional* platform-side safety scan). The selected model can still reject input. Higgsfield Extend and other suppliers have their own content rules. Do not market this as permission for all content.

## Illustrative 10-second, 16:9 examples

Published SpicyAPI model-page rate, not a bound customer's live quote:

| Route | SpicyAPI quoted-unit example (USD) | PV credits at launch rate | EUR equivalent at €10 / 1,000 |
| --- | ---: | ---: | ---: |
| Seedance 1.5 Pro 720p, no audio | $0.227 | 69 | €0.69 |
| Seedance 2.5 480p | $1.234 | 198 | €1.98 |
| Seedance 2.5 720p | $2.773 | 444 | €4.44 |
| Seedance 2.5 1080p | $6.823 | 1,092 | €10.92 |
| Wan 3.0 1080p (prior API price example) | $1.800 | 699 | €6.99 |

Provider examples checked or supplied 2026-10-15 (Wan 3.0 amount is from the prior customer comparison, not independently live-requoted):
- https://spicyapi.ai/models/seedance-1-5-pro
- https://spicyapi.ai/models/seedance-2-5

These prices are illustrative, **not fixed retail prices**. Exact provider maxCharge, video length, resolution, audio, selected credit pack/plan and invoice charges can change the euro equivalent. Existing wallets, historical charges, download records and owner account remain unchanged. This adjustment affects new quotes after a successful production migration. No test generation is performed. Do not label them as a fixed price per generation or guaranteed profit.

## Approved targeted video price cuts

| 10s example | Previously | New EUR equivalent (one-time €10 credit pack) | Backend rule |
| --- | ---: | ---: | --- |
| Seedance 1.5 Pro 720p, audio off | €0.73 | €0.69 | 300 credits/USD for matching model, resolution and false audio only |
| Wan 3.0 1080p | €8.28 | €6.99 | 388 credits/USD for matching model and resolution only |

The price checker still returns a live, bounded API quote, and D1's `lab_charge_job` trigger uses the same credits calculation as the JavaScript quote. Audio-on Seedance 1.5, Wan Prime and all other models are explicitly excluded. Migration `0020-wan-seedance-budget-pricing.sql` is additive and reapplied **last** by the Cloudflare Worker workflow.

## Unit economics guard

Lowest listed revenue per credit is €99/12,000 = **€0.00825 per PV credit**, before any applicable taxes and fees. A standard Seedance 2.5 USD $1 maximum quote bills 160 credits, which realizes **€1.32 gross** if all billed credits were purchased at that particular €99 plan price. Provider cost remains USD $1, requiring currency conversion. Subtract applicable taxes, Stripe fees, storage, refunds and other costs. Check provider accounting before further discounts. Promotional credits consume API spend with no matching cash receipt.

## Potential alternative supplier (research only)

reAPI advertises Seedance 2.5 Eco at **$0.201/s 720p** and **$0.347/s 1080p** for output-only jobs. On list price, a 10s 720p Eco clip would be $2.01 vs SpicyAPI standard $2.773. Eco is not the same rendering tier; reAPI notes lower quality and slower delivery. It is *not* integrated or validated for PV LAB and must not silently replace the currently selected Seedance 2.5.

Source: https://reapi.ai/models/seedance-2-5

Before integrating, check current resale permissions, user content restrictions, input retention, input mode parity, quality, payment, and controlled real-world comparison. Never make paid generation tests automatically.
