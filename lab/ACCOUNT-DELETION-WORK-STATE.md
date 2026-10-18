# PV LAB complete account deletion | October 18, 2026

## Customer contract

- Settings > Delete account requires the existing exact typed confirmation. The API immediately creates a durable closure record and disables creative access and spending. The browser clears personal state and signs out.
- The Worker asynchronously bans the matched customer in **PV LAB's independent Clerk application** to revoke all of that application's sessions. Clerk failure leaves a retryable task; it does not reopen creative access.
- Existing closure cleanup verifies Stripe's cancellation status before deleting the customer's private R2 prefix and creative D1 records. Storage and temporary external failures are retried.
- **Only after state = deleted and the private R2 prefix is empty**, the Worker deletes the dedicated PV LAB Clerk user via its verified Backend API response. It never deletes a user in the legacy Parallel Vision/Nina Clerk application.
- A short-lived HMAC subject key blocks stale bearer tokens from re-onboarding while JWTs expire. The raw PV LAB Clerk subject is erased from the identity mapping and pending-task record on success.
- Verified customer email snapshots are erased. Existing welcome reward entitlements retain their one-way keyed claim; legally necessary cash, credit, tax/dispute and limited abuse-prevention records remain, not prompts or media.
- New signups receive a different Clerk subject. The existing verified-email welcome-claim guard prevents new free credits for a previously claimed normalized email, without storing the email itself.
- Files retained by third-party providers and backups follow their own policies and are not represented as immediately erased.

## Production prerequisites

- Worker production secret `LAB_CLERK_V2_SECRET_KEY` must be the **PV LAB** Clerk application's `sk_live_` secret, never the legacy shared Clerk key.
- Existing `LAB_SECRET` must remain present and unchanged for keyed tombstones and prior welcome claims.
- Migration `0030-studio-account-identity-deletion.sql` must run before the new Worker is deployed. The deployment workflow runs it before `wrangler deploy --keep-vars`.
- The five-minute cron is already configured. Pending tasks retry automatically; previous closure requests are backfilled for customer-only studio identity links.

## Verification

- Synthetic tests cover: immediate closure, ban-before-delete, no delete before verified R2/D1 cleanup, no legacy Clerk mutation, missing secret fails closed, remote 503 retried, 404 idempotence, keyed stale-token rejection, no resurrection of closed email contacts and preservation of welcome/financial ledgers.
- Live deployment is not established by a merged commit alone. Check the Worker /health revision and the Cloudflare deployment run, and privately verify the presence of `LAB_CLERK_V2_SECRET_KEY` without exposing its value.
- To check one closed account privately, use the customer closure state, the studio identity deletion task (pending vs complete), and Clerk application user presence in their respective authorized admin consoles. Do not display other customers' data publicly.
