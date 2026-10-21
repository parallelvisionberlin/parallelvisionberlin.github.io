# Active account recreation repair, 2026-10-21

- User deleted Neon Riviera, returned through Google and saw Account closed on the homepage. Reference image(20261021-100259).png, Library libfile_6baf9c98052881919f4a3f87e61adeb2.
- Baseline: main 8b44762ba8cf41f485eecdb0799fed1c0461e5dd. Work branch fix/account-recreation-20261021.
- Production read-only audit 39583438685: four creative closures deleted, all four identity tasks pending, none banned/completed; oldest pending 5,083 minutes. Dedicated PV LAB Clerk secret and five-minute schedule are present. Wallet ledger and failed-job refunds reconcile. Contact-sync report is 90 hours old, a separate live warning.
- Thus deletion of creative content succeeded while the login identities stayed linked to closed wallets. No real replacement Google identity has been verified.
- Source fault reproduced: identity erasure was behind generation maintenance; an earlier provider/training/source-cleanup failure prevents it from running.
- Fix separates account maintenance into its own scheduled task. Returning closed sessions can also finish only their own pending identity task, independently of cron.
- New private bounded attempt diagnostics record a fixed issue category, not emails, secrets or remote response bodies. Migration 0035 is applied before Worker deployment.
- Financial/credit ledgers, stale-token tombstones, no repeated free gift, storage-empty and Stripe verification, owner/legacy identity isolation remain enforced.
- Existing deletion/lifecycle plus same-email fresh-subject, stale-token, retry-category, provider-failure isolation and paid-ban regressions: 12 passed locally; final relevant backend suite: 163 passed.
- PR #390 merged as f7e00d8e33609e9aa3660da7bbb21fa0314c7eee. Deploy 39584417299 succeeded; production /health confirmed revision .2-account-recreation. All eight PR workflows passed.
- Live retry audit 39584417178 attempt 2 exposed the exact blocking error: clerk_http_402 before any ban was confirmed. The previous task processor required the paid ban operation before normal user deletion, even after creative cleanup was complete.
- Follow-up: verified completed closures now use ordinary Clerk DELETE directly, independently of the optional ban feature. D1 closure still immediately rejects spending and creative access. Regression reproduces ban HTTP 402 and confirms normal deletion completes.
- Follow-up PR #391 merged as d8aea1f7e7099a0b5772ef01ee2671a3cb3bf8bc. Deploy 39585320649 passed; live /health confirms pv-lab-2026-10-21.3-account-delete-no-ban. All eight PR CI workflows passed.
- Production audit 39585320624 attempt 3, job 119174265450, at 2026-10-21 10:36:46 UTC: four creative closures deleted, all four identity tasks complete, zero pending tasks, all four cleanup outcomes success. No raw subject, customer email or secret was logged.
- The audit workflow still fails its separate contact-sync freshness invariant (90-hour-old sync report). Wallet ledger, failed-job refund and active-contact checks passed. This is not an identity-deletion failure and was left outside this repair.
- Remaining user verification: sign out/reload pvlab.studio and sign up again with Google using Neon Riviera. A real fresh Google subject/account creation has not been exercised by the agent. Same-email recreation and no inherited balance/free-credit duplication passed synthetic tests.
- Earlier gallery change PR #387 is independent: floors the fractional measured row width, avoiding card wrapping at 90% browser zoom. No gallery/deck redesign was done in this account repair.
- Prompt deck, Hong Kong Nights, galleries, Upscaler, models and billing implementation remain outside this repair.

# PV LAB complete account deletion | October 18, 2026

## Customer contract

- Settings > Delete account requires the existing exact typed confirmation. The API immediately creates a durable closure record and disables creative access and spending. The browser clears personal state and signs out.
- The Worker attempts an early ban in **PV LAB's independent Clerk application** as a best-effort session revocation while cleanup is pending. Clerk ban failure leaves creative access blocked by D1; final user deletion does not depend on the paid ban feature.
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

- Synthetic tests cover: immediate closure, best-effort early ban, paid-ban failure independent of final deletion, no delete before verified R2/D1 cleanup, no legacy Clerk mutation, missing secret fails closed, remote 503 retried, 404 idempotence, keyed stale-token rejection, no resurrection of closed email contacts and preservation of welcome/financial ledgers.
- Live deployment is not established by a merged commit alone. Check the Worker /health revision and the Cloudflare deployment run, and privately verify the presence of `LAB_CLERK_V2_SECRET_KEY` without exposing its value.
- To check one closed account privately, use the customer closure state, the studio identity deletion task (pending vs complete), and Clerk application user presence in their respective authorized admin consoles. Do not display other customers' data publicly.
