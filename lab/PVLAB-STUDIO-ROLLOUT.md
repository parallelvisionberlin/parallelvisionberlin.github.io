# PV LAB independent domain, accounts and zero-loss cutover

## Verified public launch follow-up, 2026-10-15

- The active Cloudflare Pages project is `pvlab-studio`; apex `pvlab.studio` is active.
- `www.pvlab.studio` no longer uses Porkbun parking DNS. Its proxied CNAME targets `pvlab-studio.pages.dev`. A single Cloudflare dynamic-redirect rule (`pvlab_www_to_apex_v1`) sends it to `https://pvlab.studio` with a **301**, preserving path and query. External GitHub Actions run `38660168240` verified the actual redirect.
- The new Clerk Google OAuth client is in production and its invalid client-secret error was resolved; the owner confirmed Google sign-in works. GitHub login is disabled in Clerk Production.
- **Still requires explicit owner sign-in:** no new Clerk identities had been securely linked to old PV LAB accounts at the last read-only D1 check (4 legacy customer wallets, 0 new links, 0 unused migration codes). This does not mean records are lost. The old and new authenticated accounts must complete the one-time migration code flow; never infer links from matching emails.
- **Still requires Clerk Production secret in Cloudflare:** `LAB_CLERK_V2_SECRET_KEY` is absent from Worker `parallel-vision-lab`. Copy the **new** Clerk application's `sk_live_` value from its Production → API Keys directly into Cloudflare Worker Settings → Variables and Secrets as a Secret. Never put it in GitHub, a chat or source code. This supports trusted customer-email sync, not the OAuth callback.
- **Stripe proof outstanding:** PV Lab's live webhook endpoint is enabled, but as checked the live Stripe account had 7 Checkout sessions, all unpaid/expired, and no PaymentIntents. D1 recorded 0 `lab_stripe_events`. A user-authorized real purchase, signed webhook, wallet credit, generation, persistence and invoice/receipt check are still required; do not claim an end-to-end paid purchase was verified.
- Clerk's new app is still displayed as `My Application`. Rename it to `PV LAB` from Clerk application settings (separate from the old application). Retire the obsolete Google OAuth client secret once replacement login is confirmed.
- Commercial permission remains a launch decision: `LAB_CUSTOMER_HIGGSFIELD_ENABLED=true` is deployed, but written permission for stand-alone or substantially competing API generation resale was not verified. Review Higgsfield API Terms §4.2 and obtain written consent before relying on public access. Do not change customer availability silently.
- CI coverage was refreshed to avoid stale version-key and image-preview assertions, without changing models, charging providers, or editing the database. Always verify the latest CI run separately from Pages deployment.

State: 15 October 2026. Production release is a separately verified action, not a successful draft preview.

## Confirmed infrastructure

- Porkbun registration: `pvlab.studio`, Cloudflare DNS zone Active.
- Cloudflare Pages project `pvlab-studio` already renders the PV LAB interface at `https://pvlab-studio.pages.dev`.
- Clerk application `My Application`, **Production**: `pvlab.studio` Verified; Frontend API + Account Portal Verified; email 3/3 Verified; Frontend API and Account Portal SSL certificates Issued.
- Clerk Google SSO: Enabled/Used for sign-in with the dedicated OAuth client `PV LAB Google Login` under Google Cloud project `PARALLEL VISION`. Google OAuth audience is now **In production**. Its previous client secret caused `invalid_client` token-exchange failures; the owner rotated the dedicated client secret in Google and saved it in the new production Clerk instance, then confirmed Google login worked. The original Parallel Vision client was not changed.
- Existing PV LAB front end remains `https://parallelvisionlabel.com/lab/`, and Cloudflare Worker backend remains `parallel-vision-lab`.
- Production customer signup, live checkout and generation were already enabled on the original website. Existing credit, job, role, gallery and Stripe tables must never be cleared or guessed.

## Code architecture (PR #210)

- Domain-aware Clerk SDK in `lab/clerk-instance.js` + `lab/native-account.js`. Legacy domain stays on original Clerk; new domain uses its own, **public** `pk_live_` key.
- Dual issuer verification in `lab-worker/worker.mjs` and `clerk-issuer-policy.mjs`. JWKS caches are independent, and JWT authorized-party checks are tied to the correct Origin. `LAB_STUDIO_AUTH_ENABLED=true` is deployed in `wrangler.toml` after the migration is applied. The old issuer remains unchanged, and invalid/unlinked sessions cannot access paid work.
- `lab-worker/migrations/0017-clerk-domain-links.sql` contains the only new tables, `lab_clerk_identity_links` and `lab_clerk_migration_codes`. Deployment runs 0017 before the Worker.
- The original identity that already owns D1 ledger, Stripe customer, R2 media, assets and owner-role mapping is preserved as the **canonical ID**; a new Clerk user is mapped to it only by verified one-time transfer.
- Transfer: old Clerk sign-in at `https://parallelvisionlabel.com/lab/connect-account.html` -> `POST /api/migration/issue` generates a random 32-byte, 10-minute, single-use code. Only its SHA-256 is stored. While independently signed into `https://pvlab.studio/connect-account.html`, the user pastes it -> `POST /api/migration/redeem`. Double links and reused/expired codes are rejected. Owner role is revalidated against the current Nina owner directory.
- The **new customer** path is a deliberate `POST /api/migration/new` that creates an isolated new wallet with one 200-credit welcome gift. No unsolicited new wallet is created simply by signing in. An unlinked signed-in user is directed to `connect-account.html`.
- Checkout return, billing portal, referral and voucher links preserve the verified requesting domain. Stripe event IDs, webhook endpoint, balance records and payment products are not migrated or duplicated.
- `lab-worker/promotions.mjs` supports a separate optional `LAB_CLERK_V2_SECRET_KEY` for checking new-only customers' verified email addresses. Keep it in Cloudflare Worker Secrets. Old customers continue to use the legacy Clerk key.
- The original Nina client, backend, Clerk key, Stripe webhook, R2 bucket and `LAB_SECRET` must remain unchanged. Never expose private keys in GitHub, Pages build variables or public screenshots.

## Launch checklist

1. Merge only after required tests and preview checks pass. This applies D1 migration 0017 and updates the production Worker with new-domain access **disabled**. Confirm existing `/lab/` customer and owner sign-in still work.
2. In Cloudflare **Workers & Pages -> pvlab-studio -> Custom domains**, add the apex `pvlab.studio`. It is a zone already in this Cloudflare account. Cloudflare creates the Pages CNAME. If an existing DNS A record blocks the action, remove only the two Porkbun parking A records for `pvlab.studio`: `207.207.210.229` and `207.207.210.107`, then retry. Do not delete any of the five Clerk DNS records. Optionally add `www` later and redirect it to the apex.
3. Add `LAB_CLERK_V2_SECRET_KEY` under **Worker -> Settings -> Variables and Secrets**, set as Secret. Retrieve it only from the new Clerk `My Application -> Production -> Instance -> API keys`, not the original Clerk. Never paste it into chat.
4. After DNS and SSL show Active, verify that the deployed Worker reports the new account-linking health version and the `LAB_STUDIO_AUTH_ENABLED=true` setting from Wrangler. A signed-in, unlinked new Clerk user should be offered transfer or new account creation. The Cloudflare custom-domain workflow attempts this connection automatically; if it lacks Pages/DNS rights, use the UI.
5. Verify transfer with two browser tabs: old account issues a code; new account redeems it; signed-in `/api/session` shows exactly the original customer ID, original wallet balance, gallery and Stripe customer. Repeated/expired code must fail. For owner, check owner dashboard only after linking the old owner.
6. Verify a fresh unrelated email account receives **exactly** 200 welcome credits, no duplicate grant on refresh. Test one customer-enabled generation only after explicit authorization, and Stripe Checkout/return, subscriptions, portal, refunds, referrals, vouchers, sign-out and mobile.
7. Check legal links, footer and analytics at new root `/` plus `/lab/`. Verify Google and email login and no leaked private credentials.
8. Keep `parallelvisionlabel.com/lab/` online for existing users during a transition period. Change public links only after these checks pass.

## Rollback

- Set `LAB_STUDIO_AUTH_ENABLED=false` and redeploy: new Clerk tokens fail closed, old Clerk on original domain remains valid.
- Keep old registered domains, keys, D1 ledger and Stripe webhook unchanged.
- Do not delete identity-link rows or remove customer wallets on rollback. No irreversible mass migration is performed.
