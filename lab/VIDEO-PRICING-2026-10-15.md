# PV LAB Video pricing review | 15 October 2026

## Actual changes

- Seedance 1.5 Pro remains at 320 PV credits per USD of the bound SpicyAPI maximum quote. It is deliberately presented first as the budget video choice; no model is switched automatically.
- Standard Seedance 2.5 Start/Text/Reference changes from 230 to 160 PV credits per USD of the bound maximum vendor quote. 480p, 720p and 1080p all use the same credit multiplier, but the vendor USD amount varies substantially by resolution and duration.
- The Seedance 2.5 upscaled 4K variant remains at 190 credits/USD. Higgsfield Extend is separate and does not receive the standard Seedance discount.
- Customer video review now leads with the **approximate EUR equivalent of the credits**, using the published **€10/1,000-credits** one-time pack. The actual wallet debit is still **PV credits**, and the exact debit remains visible before confirmation. Other packs/subscriptions have different effective per-credit prices; welcome/promotional credits require no new payment. This EUR equivalent is **not a USD/EUR exchange quote**.
- Neither providers nor generation workflows switch automatically. Customer history, past purchases, paid jobs, Nina owner DB and existing ledgers are not edited.
- SpicyAPI itself classifies the standard Seedance 1.5 Pro and 2.5 routes as **Uncensored** (no *additional* platform-side safety scan). The selected model can still reject input. Higgsfield Extend and other suppliers have their own content rules. Do not market this as permission for all content.

## Illustrative 10-second, 16:9 examples

Published SpicyAPI model-page rate, not a bound customer's live quote:

| Route | SpicyAPI quoted-unit example (USD) | PV credits at launch rate | EUR equivalent at €10 / 1,000 |
| --- | ---: | ---: | ---: |
| Seedance 1.5 Pro 720p, no audio | $0.227 | 73 | €0.73 |
| Seedance 2.5 480p | $1.234 | 198 | €1.98 |
| Seedance 2.5 720p | $2.773 | 444 | €4.44 |
| Seedance 2.5 1080p | $6.823 | 1,092 | €10.92 |

Provider list prices checked 2026-10-15:
- https://spicyapi.ai/models/seedance-1-5-pro
- https://spicyapi.ai/models/seedance-2-5

Those prices are not purchase guarantees: quote maxCharge and plan credit cost prevail. Do not label them as a fixed price per generation or guaranteed profit.

## Unit economics guard

Lowest listed revenue per credit is €99/12,000 = **€0.00825 per PV credit**, before any applicable taxes and fees. A standard Seedance 2.5 USD $1 maximum quote bills 160 credits, which realizes **€1.32 gross** if all billed credits were purchased at that particular €99 plan price. Provider cost remains USD $1, requiring currency conversion. Subtract applicable taxes, Stripe fees, storage, refunds and other costs. Check provider accounting before further discounts. Promotional credits consume API spend with no matching cash receipt.

## Potential alternative supplier (research only)

reAPI advertises Seedance 2.5 Eco at **$0.201/s 720p** and **$0.347/s 1080p** for output-only jobs. On list price, a 10s 720p Eco clip would be $2.01 vs SpicyAPI standard $2.773. Eco is not the same rendering tier; reAPI notes lower quality and slower delivery. It is *not* integrated or validated for PV LAB and must not silently replace the currently selected Seedance 2.5.

Source: https://reapi.ai/models/seedance-2-5

Before integrating, check current resale permissions, user content restrictions, input retention, input mode parity, quality, payment, and controlled real-world comparison. Never make paid generation tests automatically.
