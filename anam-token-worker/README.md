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

Stripe purchase/checkout/webhook handling is not implemented yet. Nina/Anam sessions do not deduct credits yet. Those integrations should call the existing server-only mutation functions with provider event IDs or session IDs as idempotency references.
