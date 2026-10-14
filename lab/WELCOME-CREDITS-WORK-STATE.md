# PV LAB welcome credits: 2026-10-14

Scope: automatic one-time 200-credit gift for verified non-owner Lab accounts.

## Approved behavior
- Give each newly signed-in customer 200 PV Lab credits; previously created external test customers also receive them at their next authenticated request if not already granted.
- These are ordinary credits, available for customer-enabled image or video routes and other existing billable tools. A single quoted video may use all 200 credits.
- No double grants on repeat sign-in or concurrent requests. Existing closed accounts are excluded.
- Generation estimates and debit triggers still reject jobs that exceed the actual available balance; failed jobs retain normal refund mechanics.
- Referral rewards and credit packs remain independent. This welcome grant does not require a purchase.

## Implementation
- `lab-worker/customer-billing.mjs`: idempotent `welcome:<Clerk subject>` ledger entry of kind `adjustment`; 200-credit amount is a server constant.
- `lab-worker/wrangler.toml`: `LAB_WELCOME_CREDITS_ENABLED=true` for production; omitted in test/sandbox bindings.
- `lab/account.js`: label the entry `Welcome credits` in activity.
- `tests/lab-welcome-credits.test.mjs`: returning user, simultaneous calls, one-video 200-credit debit, insufficient balance, refund, opt-out and closed account tests.
- `.github/workflows/deploy-lab-worker.yml`: add welcome test to predeployment gate.
- No migrations, subscriptions, catalog prices, provider credentials or custom job restrictions changed.

## Verification and rollout
- PR [#191](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/191) was merged to main on 2026-10-14, squash commit `a83591837ec80331902be4d405dbbac574a2b0d7`.
- PR test suite (Lab tests, video integration, image references and static validation): all succeeded.
- Production Cloudflare Worker deployment [run 38499814726](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/38499814726): succeeded, including remote migrations, deploy and production health verification.
- Frontend GitHub Pages cache/deployment was not independently verified and other commits are publishing concurrently.
- Verify with a new external Clerk account and the earlier non-owner test account. Each should show 200 credits once in the account wallet. A priced video over 200 must refuse without charging.
- Do not initiate any paid vendor generation automatically.
