# PV Lab Fashion virtual try-on models
Owner-only fashion tools. This feature does not add customer accounts, a public checkout or any new auto-billed subscription. No generations are triggered by deployment or visiting the page.

## What's integrated
- FASHN Try-On v1.6 via **fal.ai**, endpoint `fal-ai/fashn/tryon/v1.6`. Default balanced. One output only. Published fal.ai price on 2026-10-09: **$0.075 / generation**.
- FLUX Virtual Try-On Pro via **fal.ai**, endpoint `fal-ai/flux-pro/v1/vto`. Requires a styling prompt. Provider pricing from **$0.0375** for the first input megapixel, then $0.005 per extra input megapixel and $0.005 per output megapixel. The Lab conservatively reserves an estimated USD $0.075, but provider billing is authoritative. The model input is limited to 2 MP for the person and 1 MP for the garment.
- FASHN Try-On Max via the **direct FASHN API**, `POST https://api.fashn.ai/v1/run` with `model_name=tryon-max` and polling `GET /v1/status/{id}`. Direct API credits are separate from fal.ai and from the FASHN consumer app.
- The primary studio remains unchanged except for the Fashion navigation link. Open `/lab/fashion.html` after owner sign-in.

## Where to obtain credentials
**fal.ai:** https://fal.ai/dashboard/keys . Sign in and create an API key if your existing `FAL_KEY` Cloudflare Worker secret is not already configured. FASHN v1.6 and FLUX VTO share this **same** key and your fal.ai API account billing. Never paste a key into chat or commit it to GitHub.

**Direct FASHN:** https://app.fashn.ai . Follow the official API setup instructions at https://docs.fashn.ai/getting-started/api-setup . Sign up, purchase **Developer API** credits from Billing > FASHN API (minimum on-demand purchase reported at **$7.50 / 100 credits**), then open Developer API and choose **Create new API key**. Add the new key to the **parallel-vision-lab** Cloudflare Worker as a secret named exactly `FASHN_API_KEY`, not as a plain text variable. The key is shown once. Direct Max remains disabled in the Fashion page until the secret is configured and the Worker deployed. Do not buy FASHN API credits until you're ready to test.

**Cloudflare:** https://dash.cloudflare.com/ . Select the account, Workers & Pages > parallel-vision-lab > Settings > Variables and Secrets. Add a secret, save and deploy the Worker with its existing D1, R2, owner DB bindings and LAB_SECRET preserved. Do not create a new Nina database. Existing GitHub Actions deploy workflow on main detects changes under lab-worker; it does not automatically create new secrets.

## Verify that the key is actually connected, without buying an image
1. Open `https://parallelvisionlabel.com/lab/fashion.html`, sign in to the existing owner account.
2. The FASHN API connection strip makes one owner-authorized read-only request to `/api/fashion/balance`.
3. The Worker contacts `GET https://api.fashn.ai/v1/credits` with its `FASHN_API_KEY` secret.
4. A response like `Connected · 100 credits available (100 on-demand)` confirms the key and provider balance without any generation charge.
5. If it reports an invalid key, revisit the existing Cloudflare secret under Workers & Pages > parallel-vision-lab > Settings > Variables and Secrets, then re-deploy. Do not expose or paste the secret.
6. Fashion generations remain paid actions requiring image uploads, a separate estimate review and an explicit confirmation.

## FASHN direct on-demand cost table
Each API credit costs published $0.075 on-demand; one generated image only:

| Generation mode | 1K | 2K | 4K |
|---|---:|---:|---:|
| Fast | $0.075 | $0.150 | $0.225 |
| Balanced | $0.150 | $0.225 | $0.300 |
| Quality | $0.225 | $0.300 | $0.375 |

Pricing and provider billing can change. The in-app estimate is based on published API schedules, not a direct live provider quote. Verify balances before generating.

## Provider policies and privacy
- Fashion-first editorial positioning with broad legitimate artistic freedom; provider restrictions still apply.
- No safety-checker bypasses, provider-policy circumvention, automatic provider switching or hidden multi-generation.
- The system sends only the two selected photographs to the chosen provider for one generation after a fresh quote and explicit confirmation.
- Every input and result remains in owner-scoped R2/D1 history, with short-lived signed provider input links. Provider-side storage and retention follow that provider's rules, which may differ from Cloudflare.
- For portraits and clothes use licensed/consented photos. No unconsented intimate imagery.
- A failed or uncertain request is not resubmitted automatically. Check provider activity before resolving an uncertain job.

## What was not done
- No paid provider calls or image-quality comparison.
- No public customer signup, payment credits, or subscription handling.
- No homepage hero redesign.
- No claim that replacing garments preserves every logo, fabric, pose or identity detail accurately.

## Verification
New pure/mocked tests: `node --test tests/lab-fashion-tools.test.mjs`. Standard source checks: `find lab lab-worker -type f \\( -name '*.js' -o -name '*.mjs' \\) -exec node --check {} \\;`. CI on PR runs these automatically, without sending paid jobs. Test one real licensed photograph pair per model only after budget approval and API credit confirmation.

Official sources:
- https://fal.ai/models/fal-ai/fashn/tryon/v1.6/api
- https://fal.ai/models/fal-ai/flux-pro/v1/vto/api
- https://docs.fashn.ai/api-reference/tryon-max
- https://help.fashn.ai/plans-and-pricing/api-pricing
- https://docs.fashn.ai/api-overview/api-fundamentals
