# PV LAB Owner Control Room work state

Updated: 2026-10-14
Scope: owner-only dashboard information hierarchy and newest customer visibility.
Source: main merge 0959631abd824309be552dc9828a1e292cbdbdd4, PR #203.
Superseded PR #202 was closed because it did not include newer Clerk diagnostics.

## Decisions
- Keep the PV LAB grayscale editorial aesthetic, smaller hero and tighter metrics.
- Surface the five latest signed-up LAB accounts immediately beneath the summary.
- Show verified email when present, otherwise preserve the underlying Clerk account ID.
- Filter that recent feed to active or trialing subscribers without implying paid invoices.
- Show only verified purchases from the existing Stripe-backed ledger.
- Keep the full Customers, Payments, Referrals and Vouchers sections intact.
- Preserve owner-only API checks, credit balances, voucher flows and search semantics.

## Files
- lab/owner.html: tighter hierarchy and activity-first panels.
- lab/owner.css: responsive editorial styling, including mobile width safety.
- lab/owner.js: latest activity renderer, subscription filter and search-independent snapshot.
- tests/lab-owner-mobile-browser.mjs: real renderer with synthetic data, filter and overflow checks.
- .github/workflows/pv-lab-owner-dashboard.yml: dedicated UI regression checks.

## Verification
- JavaScript parsed and checked successfully.
- Dedicated owner browser workflow 38567848304: passed.
- Tested 320, 375, 390, 430, 768 and 1280 px; no sideways page scrolling.
- Real renderer and subscriber filter tested with synthetic customer and payment data.
- Existing Clerk API diagnostic messages are preserved from concurrent main changes.
- Other account/video CI jobs had unrelated failures; no checkout, video or account implementation was changed.

## Deployment and remaining work
- Merged to main. GitHub Pages run 38568052444 started for the merge; production status must be verified separately.
- Public dashboard URL: https://parallelvisionlabel.com/lab/owner.html (owner sign-in required for data).
- If zero emails show with a configured key, use the visible Sync emails control and inspect the returned Clerk diagnosis.
- No customer data or new transactions were created by this change.
