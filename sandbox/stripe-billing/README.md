# PV Lab / isolated Stripe test checkout

The user created the Cloudflare D1 database `parallel-vision-lab-sandbox` on 2026-10-10.
Its database ID is bound in `wrangler.toml`; it is NOT the production PV Lab D1.

The test-only Worker is `parallel-vision-lab-sandbox`:
`https://parallel-vision-lab-sandbox.parallelvision.workers.dev/health`

A hidden, noindex Clerk-authenticated browser test page is available at
`https://parallelvisionlabel.com/lab/billing-sandbox.html`.

## Isolation / security contract

- Only the newly created sandbox D1 has a binding (`LAB_DB`).
- No Nina `OWNER_DB`, no production `LAB_DB`, no R2 assets, no third-party
  generation provider credentials or generation endpoints are bound or exposed.
- Only Stripe API keys with `sk_test_` or `rk_test_` prefix are accepted.
- Only HMAC-verified Stripe events with `livemode === false` are processed.
- Existing production Worker settings and live Stripe credentials remain unchanged.
- Checkout is enabled **only within this billing-only sandbox Worker** after
  both test secrets are present. It does not imply paid image generation.
- The Worker reuses PV Lab's real Checkout product catalog, signed webhook
  verification, exactly-once credit ledger, and subscription tracking.
- No real money is accepted by the sandbox test flow.

## Deploy and configure

The separate GitHub Actions workflow `deploy-pv-lab-billing-sandbox.yml`
initializes **only** `parallel-vision-lab-sandbox` from the Lab schema and
migrations, deploys **only** `parallel-vision-lab-sandbox`, and validates
`/health`. It uses the existing GitHub `CLOUDFLARE_API_TOKEN` deploy secret.

After the Worker exists:

1. In **Cloudflare > Workers & Pages > parallel-vision-lab-sandbox > Settings > Variables and Secrets**,
   add **Secret** `LAB_STRIPE_SECRET_KEY` containing a `sk_test_` or suitably
   restricted `rk_test_` key created in the **PV Lab Stripe sandbox**.
   Do **not** use the live PV Lab key.
2. In **Stripe > PV Lab > Sandbox > Workbench > Webhooks**, create a *separate
   test-mode* destination targeting
   `https://parallel-vision-lab-sandbox.parallelvision.workers.dev/api/stripe/webhook`.
   Use **Your account / Snapshot**, with
   `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`,
   `invoice.paid`,
   `customer.subscription.created`,
   `customer.subscription.updated`, and
   `customer.subscription.deleted`.
3. Store that sandbox destination's `whsec_` signing secret in the **sandbox
   Worker** as `LAB_STRIPE_WEBHOOK_SECRET`.
4. Check `/health` reports `testOnly:true` and `configured:true`.
5. Open the hidden test page, sign in via Clerk, select €10 credit pack, and
   complete *test-mode* Checkout using Stripe's documented test card.
6. On returning, refresh the isolated wallet and verify exactly 1,000 credits
   were granted **only after** the signed Checkout webhook. Inspect Stripe
   sandbox **Event deliveries** for successful HTTP 200 deliveries.
7. Verify replay/idempotence, another account's balance, subscription renewal
   and cancellation, and a failed/expired Checkout before considering live launch.

## No production enablement

Do not change `LAB_PUBLIC_GENERATION_ENABLED` or `LAB_CHECKOUT_ENABLED`
on production from this workflow. Those flags remain false until separate
launch readiness, provider spend caps, legal/tax review and live reconciliation.

The new D1 may initially show zero tables until the sandbox workflow successfully
initializes it. The test page may show `not configured yet` until both test
secrets are securely supplied.
