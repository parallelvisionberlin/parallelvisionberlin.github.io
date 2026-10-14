# PV LAB Control Room: active work state

Updated: 2026-10-14
Component: owner-only Control Room at /lab/owner.html.
Released foundation: Proposal 2 sidebar and Providers, PR #204, main e29ac661418d033ae9c92803225c164c515cfa85.
Released vertical lift: PR #205, main f8969375bd883b3cfe44c5002da9f9e8dcb3afba.
Latest baseline: main ce5632ce72b9ede4a762ad10185967f9b0918ed7.
Current branch: fix/owner-first-viewport-quick-actions-20261014, PR #206.

## Brand and product constraints
- Narrow charcoal sidebar: Control room, Customers, Payments, Referrals, Vouchers, Providers.
- Use existing PV LAB sans-serif, monochrome styling, wordmark and owner-only sign-in.
- Customer directory, purchases, referral program, credit vouchers and Clerk email sync remain intact.
- Latest signups and subscribers are based on the real owner ledger; never invent customer data.
- API Balances overview and Provider details use verified read-only Worker data.
- Do not change generation prices, provider routing, payments, wallets, auth, data or D1 schema.

## Provider finance contract
- Authenticated /api/admin/providers is behind server-side owner authorization.
- Actual Worker secrets include LAB_CUSTOMER_SPICY_API_KEY, FAL_KEY, FASHN_API_KEY, HF_CREDENTIALS and GEMINI_API_KEY.
- Personal SpicyAPI key is stored encrypted in Lab settings.
- SpicyAPI: one shared USD account wallet, separate personal/customer per-key usage where reported.
- fal.ai USD balance/usage depends on billing permissions; FAL_BILLING_KEY is optional.
- FASHN API credits are separate units; Gemini/Higgsfield account balances unavailable without verified billing-read support.
- OpenRouter is configured legacy only, without a new generation route.
- Customer PV LAB credit units are not added to provider cash or converted to USD.
- Provider reads cache for about five minutes; manual refresh throttled; credentials never reach the browser.

## Latest task: fit Quick actions within first desktop viewport
- User screenshot shows Quick actions cut off, requiring a small scroll on wide desktop.
- Leave sidebar, hero, KPIs, type scale and mobile/tablet layout unchanged.
- Scope only desktop widths greater than 1260px and the three existing activity cards.
- Reduce Latest signups panel min-height/padding, tabs, row spacing and note margin.
- Reduce Recent purchases interior height; lay out Clerk text beside Sync action while retaining full diagnostic text.
- Compact right-column gaps and Quick actions padding, retaining all actions and labels.
- Keep API Balances immediately after the activity area, not inside this visual scope.
- Files: lab/owner.css, lab/owner.html CSS cache revision, tests/lab-owner-mobile-browser.mjs.
- No Worker/backend/provider-key modifications or billable calls.

## Verification
- Owner browser CI 38596685501 PASSED on feature commit bc519330cf496fd6b67f3b8783bb0603ecae4ee6.
- At 1792x844: activity starts y413, Quick actions ends y827, API Balances begins y844.
- Test uses three synthetic signups; real customer identities and live balances are not retrieved in CI.
- Mobile/tablet widths 320, 375, 390, 430, 768 and desktop 1280 tested without horizontal overflow.
- 1280px uses a wrapped metric layout, so the first-fold guarantee is intentionally scoped to wide desktop.

## Release follow-up
- Complete relevant PR checks and merge PR #206 into main once reconciled.
- Verify GitHub Pages deployment success for merge commit and refreshed owner.css URL.
- Do not report the adjustment as live before Pages confirms successful publication.
