# PV LAB Control Room / active work state

Date: 2026-10-14
Scope: approved Proposal 2 left sidebar plus provider finances, owner-only.
Base: main 8383c73d9237c54e2abf7135428fbe452eaa835d.
Implementation branch: feature/owner-editorial-sidebar-20261014, PR #204.
Code reference: compare PR #204 head; do not assume merge or deploy until confirmed.

## Approved design
- Narrow desktop sidebar with Control room, Customers, Payments, Referrals, Vouchers and Providers.
- Mobile navigation becomes six compact tabs; page must never scroll sideways at 320px.
- Preserve DM Sans and the existing PV LAB wordmark. Large Control room heading is sans-serif.
- Dark charcoal/editorial surfaces, no green KPI or colorful crypto-dashboard cards.
- Top metrics, latest signups, customer status, recent purchases, Clerk sync and quick actions.
- Compact API Balances preview and detailed Providers section in the same page.
- Do not modify other PV LAB views, generation models, wallets, pricing or routes.

## Production integration audit (actual Cloudflare Worker binding names)
- Worker: parallel-vision-lab, Wrangler-deployed production.
- Configured: LAB_CUSTOMER_SPICY_API_KEY, FAL_KEY, FASHN_API_KEY, HF_CREDENTIALS, GEMINI_API_KEY.
- Personal Spicy key is encrypted per owner under Lab DB settings.
- OPENROUTER_API_KEY secret is still present but current generation code has no active route.
- Secrets are not retrievable as plain text from Cloudflare bindings listing; do not claim authenticated provider reads until they run.

## Financial data and integrity
- New GET /api/admin/providers is behind original signed session and requireOwner.
- New lab-worker/owner-providers.mjs does read-only authenticated GETs, no paid jobs.
- SpicyAPI shared USD wallet fetched once, with owner vs customer key settled usage separated.
- Optional Spicy funding separates prepaid/grants/approved credit, not additive to wallet.
- fal.ai USD balance API and usage estimates require billing-scoped key permissions.
- FASHN balance in API credits via verified /v1/credits, not converted to USD.
- Higgsfield and Gemini have working API credentials, but no verified key-based balance endpoint; show unavailable.
- Gemini may be prepaid or postpaid; do not infer plan type from generation key.
- Customer wallet liability is isolated, displayed only in PV LAB credit units.
- All provider responses use a 5-minute isolate cache with a 30-second manual refresh throttle.
- Provider requests use timeouts, reject redirects and return sanitized errors.
- No prices, model settings, owner access, historical credits or D1 migrations changed.

## Files touched
- Frontend: lab/owner.html, lab/owner.css, lab/owner.js, lab/owner-providers-ui.js.
- Backend: lab-worker/owner-providers.mjs, lab-worker/promotions.mjs, lab-worker/worker.mjs.
- Tests: tests/lab-owner-providers.test.mjs and tests/lab-owner-mobile-browser.mjs.
- CI: .github/workflows/pv-lab-owner-dashboard.yml, pv-lab-promotions.yml and deploy-lab-worker.yml.

## Checks and release
- Existing Lab tests, promotions/owner security and 320–1280px owner browser checks passed on PR before final funding-breakdown adjustment.
- Tested UI uses mock customer/provider data, not actual provider wallet values.
- The full Lab video browser suite has historical failures on main and is separate from this scope.
- Re-run CI on final PR head and compare unrelated video baseline before merging.
- After merge check GitHub Pages and Cloudflare Worker production health version separately.
- Public owner URL: https://parallelvisionlabel.com/lab/owner.html ; signed-in owner is required to retrieve finances.
- Open page as owner then Refresh balances to validate actual provider permissions and live values.
