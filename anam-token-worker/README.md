# Nina Anam token, memory and Signal Credits Worker

This Worker keeps the Anam API key server-side, returns a fresh short-lived session token for Nina's published persona, stores authenticated memory, and maintains the Signal Credits ledger in the existing Cloudflare D1 database. Public visitors remain on browser-only recent memory.

## Deploy

Run these commands from `anam-token-worker`:

```powershell
npm install --global wrangler
wrangler login
wrangler secret put ANAM_API_KEY
wrangler secret put NINA_OWNER_ENROLLMENT_TOKEN
wrangler secret put NINA_OWNER_SIGNING_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put STRIPE_PRICE_SIGNAL_100
wrangler secret put STRIPE_PRICE_SIGNAL_300
wrangler secret put STRIPE_PRICE_SIGNAL_750
wrangler d1 migrations apply nina-fok-memory --remote
wrangler deploy
```

When `wrangler secret put` prompts for a value, paste the API key from Anam Lab there. Do not paste it into a file or into Codex.

Copy the deployed URL printed by Wrangler, append `/session-token`, then replace the placeholder value of `ANAM_SESSION_TOKEN_ENDPOINT` in `js/nina-access.js`. Example:

```js
const ANAM_SESSION_TOKEN_ENDPOINT =
  "https://parallel-vision-anam-token.YOUR-SUBDOMAIN.workers.dev/session-token";
```

The Worker accepts production browser requests only from `https://parallelvisionlabel.com` and `https://www.parallelvisionlabel.com`; HTTP localhost and `127.0.0.1` origins are allowed for development.

## Owner activation

The enrollment token is verified only by `POST /owner/enroll` and must never be committed, persisted by the frontend, returned by the Worker, or printed in logs. After successful enrollment, the Worker permanently binds the current `visitorId` to Alejandro in D1 and returns a separate HMAC-signed owner credential. On Alejandro's browser, enroll once from the site console:

```js
await enrollNinaAlejandro("PASTE_ONE_TIME_ENROLLMENT_TOKEN_HERE")
```

The existing browser-only 20-message archive remains available if the server binding, owner credential, or network is unavailable.

## Owner memory endpoints

All memory endpoints require the HMAC-signed owner credential, a matching permanent D1 owner binding, and the production Origin header. Local profile fields never authorize memory access.

- `GET /memory/metadata?visitorId=...` returns counts and summary presence only.
- `GET /memory/export?visitorId=...` downloads the complete transcript as JSON.
- `DELETE /memory` deletes the complete owner memory graph.
- `POST /memory/messages` accepts validated completed user/persona messages.
- `POST /memory/conversations/end` closes a conversation and schedules consolidation.

## Signal Credits foundation

Migration `0003_signal_credits.sql` adds `signal_credit_accounts` (cached balance and lifetime totals) and the append-only `signal_credit_transactions` ledger. Both use the existing internal `users.id`, which is resolved only from a verified Clerk session. The browser never supplies or chooses a ledger user ID.

- `GET /api/nina/credits` returns the authenticated account's real balance and lifetime totals. The account is created once with a zero balance when first requested.
- `GET /api/nina/credits/history?limit=20&offset=0` returns recent signed transactions, with `nextOffset` when another page exists.

`creditSignalCredits`, `debitSignalCredits`, and `getSignalCreditBalance` are server-only functions in `src/credits.js`. Every mutation requires a positive integer amount, a controlled source, and a stable reference ID. The database's unique `(user_id, reference_id)` index makes retries idempotent. SQLite triggers apply the ledger entry and cached totals together and abort a debit that would make the balance negative.

There is deliberately no public credit mutation endpoint. For owner testing, first find the internal user ID using the verified Clerk subject, then insert a test ledger entry directly through D1. Use a unique reference each time; retrying the same reference will not credit twice:

```sql
SELECT id, display_name, role FROM users WHERE auth_subject = 'CLERK_USER_SUBJECT';

INSERT OR IGNORE INTO signal_credit_accounts
  (user_id, balance, lifetime_credited, lifetime_debited, created_at, updated_at)
VALUES
  ('INTERNAL_USER_ID', 0, 0, 0, datetime('now'), datetime('now'));

INSERT INTO signal_credit_transactions
  (id, user_id, amount, type, source, reference_id, description, created_at)
VALUES
  ('manual-' || lower(hex(randomblob(16))), 'INTERNAL_USER_ID', 25, 'credit',
   'manual_test', 'owner-test-2026-08-27-01', 'Owner test allocation', datetime('now'));
```

Run SQL through `wrangler d1 execute nina-fok-memory --remote --command "..."` from this directory, or use the D1 console. Never edit `balance` directly; ledger inserts are the source of truth.

## Stripe Checkout for Signal Credits (Phase 2A)

Phase 2A adds backend-only, one-time Stripe Checkout purchases. It does not add a purchase interface to the website and does not make Nina or Anam consume credits.

The server-side catalog contains three enabled packs. The browser will eventually submit only the stable pack ID; credit quantities, prices, currency, Stripe Price IDs and user IDs are never accepted from it.

| Pack ID | Signal Credits | Price |
| --- | ---: | ---: |
| `signal_100` | 100 | €9 |
| `signal_300` | 300 | €25 |
| `signal_750` | 750 | €55 |

Create one Stripe product with three one-time EUR prices, then configure their test-mode or live-mode Price IDs in the matching Worker environment bindings:

- `STRIPE_PRICE_SIGNAL_100`
- `STRIPE_PRICE_SIGNAL_300`
- `STRIPE_PRICE_SIGNAL_750`

This project stores the Price IDs with `wrangler secret put` so production configuration stays out of the repository, although Stripe Price IDs are not credentials. Configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` as Worker secrets as well. Never put `sk_...` or `whsec_...` values in source control.

### Checkout endpoint

`POST /api/nina/credits/checkout` requires a verified Clerk session and an allowed browser origin. Its JSON request contains only a pack ID:

```json
{
  "packId": "signal_300"
}
```

The Worker resolves the internal D1 user, creates a `signal_credit_purchases` reconciliation record, and creates a Stripe Checkout Session from the configured server-side Price ID. It returns the Checkout Session ID and Stripe-hosted URL. Production returns to `https://parallelvisionlabel.com/?ninaCredits=success` or `?ninaCredits=cancel`; allowed localhost and `127.0.0.1` origins return to the same local origin.

### Webhook endpoint

Configure the Stripe Dashboard endpoint as:

```text
https://parallel-vision-anam-token.parallelvision.workers.dev/api/stripe/webhook
```

Subscribe it to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

The webhook intentionally accepts requests without a browser `Origin`. It reads the untouched request body and uses the official Stripe package with Web Crypto to verify `Stripe-Signature`. Successful fulfillment retrieves the Checkout Session and verifies its payment state, one-time mode, line-item Price ID, quantity, EUR amount, metadata, purchase record, authenticated user and canonical pack before adding credits.

Stripe may deliver the same event more than once. The ledger uses the Checkout Session ID as `reference_id` with source `stripe_checkout`; the existing unique `(user_id, reference_id)` index makes replayed fulfillment idempotent. The purchase row is also updated idempotently. The ledger remains authoritative for balances, while `signal_credit_purchases` supports reconciliation and future refund handling.

Refunds, reversals, subscriptions, frontend purchase controls and credit consumption are outside Phase 2A. Nina/Anam sessions still do not deduct Signal Credits.

### Test mode and deployment

Use Stripe test-mode Price IDs and `sk_test_...` while validating the integration. For local webhook forwarding, the Stripe CLI can forward test events to a locally running Worker:

```powershell
stripe listen --forward-to http://127.0.0.1:8787/api/stripe/webhook
```

Use the temporary `whsec_...` printed by `stripe listen` as the local `STRIPE_WEBHOOK_SECRET`. No real charge is required by the automated tests; Stripe interactions are mocked.

Apply the D1 migration before deploying the Worker:

```powershell
wrangler d1 migrations apply nina-fok-memory --remote
wrangler deploy
```

After a successful test Checkout, verify the purchase, ledger entry, balance and history:

```sql
SELECT * FROM signal_credit_purchases ORDER BY created_at DESC LIMIT 10;
SELECT * FROM signal_credit_transactions WHERE source = 'stripe_checkout' ORDER BY created_at DESC LIMIT 10;
SELECT * FROM signal_credit_accounts ORDER BY updated_at DESC LIMIT 10;
```

The authenticated `GET /api/nina/credits` and `GET /api/nina/credits/history` endpoints provide the corresponding account-facing verification.
