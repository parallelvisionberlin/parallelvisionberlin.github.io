# PV LAB Control Room: active work state

Updated: 2026-10-14
Owner dashboard: https://parallelvisionlabel.com/lab/owner.html
Latest main at task start: a07ad05f381f76b8b8cb63cead93fc740f1b70d0.
Current branch: fix/owner-clerk-sync-viewport-20261014, PR #208.
Previous releases: Proposal 2 sidebar & Providers #204, desktop lift #205, compact cards #206.

## Brand and navigation
- Neutral editorial PV LAB sans-serif, monochrome charcoal, narrow owner sidebar.
- Destinations: Control room, Customers, Payments, Referrals, Vouchers and Providers.
- Preserve owner-only authentication, production purchases, balances, vouchers and referral logic.
- No edits to the generation models, pricing, payment ledger, provider routing, or Nina records.

## Existing provider finance
- Secured, read-only GET /api/admin/providers, five-minute cached with refresh throttle.
- Actual configured credentials: LAB_CUSTOMER_SPICY_API_KEY, FAL_KEY, FASHN_API_KEY,
  HF_CREDENTIALS, GEMINI_API_KEY; personal SpicyAPI key encrypted in Lab settings.
- Spicy account wallet fetched once and personal/customer usage separated.
- fal.ai USD reports depend on billing scope, FASHN API credits kept in their own units.
- Gemini and Higgsfield balances unavailable without a verified suitable read endpoint.
- Customer credit liabilities separate from provider cash. OpenRouter remains legacy.

## New task: verified Clerk email sync
- Production D1 read-only query found 3 Lab customers and 0 rows in lab_customer_contacts.
- Secret LAB_CLERK_SECRET_KEY exists, but presence does not imply valid Clerk authentication.
- Found fetch(..., redirect:'error') inside clerkEmailStatus in promotions.mjs; same Worker
  documents this redirect mode as unsupported and uses redirect:'manual' elsewhere.
- Fix: use GET with redirect:'manual', refuse all 3xx before any further request.
- Existing 401, 403, 404, 429 and unverified-email diagnostics remain available.
- Owner dashboard attempts one secure sync per signed-in tab when missing email records exist,
  and shows results or specific errors, with manual Sync emails still supported.
- If key is still rejected or user missing, display error; do not invent email addresses.
- Security test covers 302, not forwarding Clerk secret, verified email persistence.
- Worker version bumped to pv-lab-2026-10-14.9-clerk-manual-redirect for rollout proof.
- No D1 migrations and no new credentials or secret disclosures.

## New task: hide API preview and fill overview
- Compact 'API Balances' section is hidden on Control Room; Providers detail remains reachable
  through the existing sidebar and mobile navigation after full customer ledgers.
- Provider API data lazy-loads when Providers is selected, keeping overview lightweight.
- Desktop >1260px activity panel min-height responds to viewport height; right-column
  Quick actions stays at the bottom, closer to viewport lower border.
- Tablet and mobile layout stay unchanged, no sideways scrolling.
- Files: lab-worker/promotions.mjs, lab-worker/worker.mjs,
  lab/owner.html, lab/owner.css, lab/owner.js,
  tests/lab-promotions.test.mjs, tests/lab-owner-mobile-browser.mjs.

## Verification and release
- PR #208 promotion/owner-security, Lab tests, owner dashboard UI, account UI,
  static-site and reference checks passed before handoff update.
- Synthetic desktop geometry tested at 1792x844; provider overview hidden and details below vouchers.
- Automatic email sync is tested with simulated owner API responses, not real Clerk credentials.
- Pending: merge #208, verify Worker health version & GitHub Pages publication independently.
- After owner page reload check actual D1 contact rows; if still zero, inspect the visible
  'Clerk sync needs attention' reason and verify the current Production backend key in Clerk.
