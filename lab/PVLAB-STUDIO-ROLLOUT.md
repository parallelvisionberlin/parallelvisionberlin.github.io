# pvlab.studio migration checkpoint (14 October 2026)

## What is established
- New domain: `pvlab.studio` registered at Porkbun; Cloudflare zone is Active.
- Static frontend: `pvlab-studio.pages.dev` on a separate Cloudflare Pages project, deployed from this repository. The working Pages build duplicates `lab/` at the deployment root and `/lab/`, and copies the two top-level referenced image assets.
- Original site: `https://parallelvisionlabel.com/lab/` continues to use the original GitHub Pages hosting and original Clerk.
- New Clerk application: independent Production instance with `https://clerk.pvlab.studio`; DNS Frontend API, Account Portal and email records verified. SSL issuance was still pending in the last screenshot, so do not assume end-to-end login is working.
- New Clerk dashboard currently shows the application label `My Application`, which can be renamed to `PV LAB` without changing the integration.
- Existing backend: `parallel-vision-lab` Worker on the original D1 wallet and media database. Stripe checkout, refunds, image generations, old user identities and owner access are already live. They MUST remain intact.

## This branch, safe preparation only
1. `lab/clerk-instance.js` chooses the existing public Clerk key on the original domain and the independent public Clerk key on `pvlab.studio`. Never expose a secret key.
2. `lab/native-account.js` loads the matching Clerk Frontend API UI bundle and publishable key. Native mobile authentication remains on its previous bridge.
3. `lab-worker/clerk-issuer-policy.mjs` requires exact issuer and origin matching. New Clerk tokens are rejected by default.
4. **The new Clerk backend pilot cannot be opened to the public with this branch.** Only when both Worker settings below are present can one exact new Clerk identity read its own isolated pilot wallet:
   - `LAB_NEW_CLERK_PILOT_ENABLED=true`
   - `LAB_NEW_CLERK_PILOT_SUBJECT=user_<exact new Clerk test subject>`
5. A new pilot identity uses an isolated internal `user_PvLabV2...` namespace. It is never identified with an old account or promoted to owner by matching email or user ID.
6. On the new issuer, the Worker refuses **all non-GET/HEAD private API requests**. This deliberately prevents purchases, generation, account mutation and balance adjustments during tests.
7. The old issuer and old customer ledger remain unchanged. `LAB_PUBLIC_APP_URL` and all Stripe return URLs are NOT changed.

## Why this is NOT a customer migration
Clerk identities in separate applications have separate `user_...` values. Existing D1 `lab_customers`, `lab_credit_entries`, `lab_subscriptions`, paid work, saved assets and `OWNER_DB` role mappings belong to their previous identity. A shared email address is not sufficient evidence to merge accounts. Existing customer email synchronization has also been under repair; do not use incomplete email records to match customers.

Before production cutover, implement and test an explicit consent-based linking process requiring a verified **old** and **new** Clerk session (or equivalent independently verified ownership). Map each new subject to the existing canonical customer/owner ID; preserve the old D1 ledger, Stripe customer, subscription, gallery and referrals instead of issuing a second independent balance. Prove that unlinked users cannot access linked data, that double linking is impossible, and that expired/replayed transfer proofs are refused.

## Operator checklist, in order
1. Leave the existing Parallel Vision Clerk app and frontend untouched. Do not copy or disclose Clerk secret keys in chats or GitHub.
2. Confirm Clerk Production `pvlab.studio` Frontend API + Account Portal SSL certificates are **Issued/Active**. If Google social login is intended, complete the production Google OAuth configuration as instructed by Clerk.
3. Wait for this draft PR's tests and review. Do not merge or deploy on the strength of a successful static preview alone.
4. Build the **real** existing-account identity migration, then test with fake accounts and a separate external test account. Obtain an owner/customer balances backup or verified financial snapshot before changing anything.
5. In Cloudflare Pages project `pvlab-studio`, connect `pvlab.studio` as a custom domain **only once login and rollback are ready**. Replace its Porkbun parking A/CNAME records through Cloudflare's guided setup; do not touch DNS for `parallelvisionlabel.com`, `clerk`, `accounts`, or `clkmail` on `pvlab.studio`.
6. For the optional read-only pilot after code review, configure the two exact pilot variables in the `parallel-vision-lab` Worker. Test `/api/session`, `/api/customer/wallet` and a rejected paid POST. Do not run real paid generations.
7. Before public launch: adapt Clerk email-sync secrets per issuer and verified user mapping; choose the correct app URLs for Stripe return, voucher, referral and canonical/SEO links; test Google and email sign-in, sign-out, password/email recovery, credit balances, Stripe Checkout and portal, refunds, media/history, mobile, and old-site fallback.
8. Only after migration and end-to-end verification, change public links, enable new domain generation/billing deliberately, and remove the pilot-only restriction.

## Rollback
- Do not change the existing production `parallelvisionlabel.com/lab/` DNS, GitHub Pages or Clerk app.
- Never replace `LAB_SECRET`, D1/R2 bindings, Stripe webhook signing secret, or stored balances to fix a domain issue.
- Disable `LAB_NEW_CLERK_PILOT_ENABLED` to immediately deny new-instance backend sessions without affecting the old issuer.
- Keep the old domain available to restore original customer access while resolving the new domain.

No paid external API requests or live user migrations are executed by this branch.
