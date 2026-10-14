# PV LAB owner Control Room: active state

Date: 2026-10-14
Production dashboard: https://parallelvisionlabel.com/lab/owner.html
Production Worker: parallel-vision-lab
Main baseline before this task: 1fb1efa7cd24cfdd3c63f8923df4ad9eaa762dd4 (PR #208).
Current implementation branch: fix/clerk-prod-sync-diagnostics-20261014 (PR #209).
Status: pending merge and deployment; verify separately.

## Existing design and safety
- Proposal 2 narrow monochrome sidebar, DM Sans, Customers/Payments/Referrals/Vouchers/Providers.
- Owner-only authorization for customer activity and provider finance.
- Existing verified purchases, Stripe checkout, credit wallets, referral/voucher ledgers unchanged.
- No generated prices, FAL/Spicy/FASHN/Gemini/Higgsfield routing changed.
- Providers finance uses secure /api/admin/providers, cached and separated by currency.
- API Balances preview hidden on Control Room; detailed Providers remains accessible.
- Desktop activity cards expanded near lower viewport edge, mobile unchanged.

## Clerk sync problem confirmed
- Cloudflare D1 has 4 lab_customers but ZERO lab_customer_contacts records.
- LAB_CLERK_SECRET_KEY exists as a secret binding; validity and instance match not verified.
- PR #208 fixed unsupported redirect:'error' to redirect:'manual' with 3xx refusal.
- Owner UI attempts to sync missing emails, but still reports Clerk sync needs attention.
- Backend failure reason cannot be inferred from the key's presence or missing emails alone.
- Official Clerk getUser API: GET https://api.clerk.com/v1/users/{id}, backend secret per application and environment.
- User must never be asked to expose Clerk secret in browser/chat; verified Clerk data is authoritative.

## PR #209 diagnosis and repair
- Migration: lab-worker/migrations/0016-clerk-sync-diagnostics.sql
- Fresh schema: lab-worker/schema.sql
- Only one D1 aggregate diagnostic row: checked_at, source, result_json of safe counts.
- NEVER store secret values, user IDs, email strings, upstream response bodies or raw tokens in the audit.
- Owner POST /api/admin/customers/sync records sanitized outcome; owner overview reads latest audit.
- Worker existing */5 min scheduled event retries eligible missing emails at most every 45 minutes.
- Cron runs independent of generation maintenance failures; tries a maximum of 12 existing customers.
- Respect 24h per-contact freshness for scheduled sync; owner manual retry bypasses this.
- Stop promptly on invalid key or rate limit; distinguish 401/403, 404, 429, network/HTTP/invalid responses.
- Owner displays backend diagnostic directly in Clerk status line, including after page reload.
- Worker VERSION set to pv-lab-2026-10-14.10-clerk-sync-audit.
- Production deploy workflow applies migration 0016 before Worker deploy.

## Verification and next actions
- Regression tests in tests/lab-promotions.test.mjs: 3 verified users, wrong-app 404,
  one audit row, private diagnostic, scheduled cooldown, owner retry and missing key.
- Existing promotions, owner security and account browser suites remain required.
- Merge PR #209 after relevant tests; verify Cloudflare Worker health and Pages deploy.
- Wait for one scheduled sync then inspect aggregate D1 lab_clerk_sync_diagnostics row and email counts.
- If invalid key or missing users persist, confirm Clerk Production secret is for the same
  app as the PV LAB sign-in instance. Secret values must stay in encrypted Worker settings.
- Never claim live email sync complete until D1 confirmed contacts with verified emails.
