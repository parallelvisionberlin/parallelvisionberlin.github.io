# Vitolas Studio partner dashboard

## Credit invitations and working dashboard, 2026-10-25
- User requested a more useful, refined dashboard and a voucher creator so Victoria can offer credits to prospects.
- Baseline main bcd80d965b19c7d084b0c5c94009c4bb9467f3c6; isolated branch feature/vitolas-credit-invitations-20261025. Existing open PRs have no Vitolas-specific work.
- Reuse the approved Future Beauty WebP below. New editorial navigation, gift preview, campaign form, reserved/redeemed/available allowance, recent invitations and redemptions; no new image generation.
- New lab-worker/partner-vouchers.mjs, migration 0037-partner-vouchers.sql and scoped customer/admin routes reuse verified partner identity and the actual Owner guard.
- Owner sets a lifetime promotional credit allowance from the same dashboard. Default is zero; deployment issues no credits and allocates no spend. Victoria cannot raise the budget or access owner-wide vouchers.
- Each invitation: 1-500 credits, one recipient, campaign name, 1-30 days. Existing atomic voucher redemption/wallet trigger retained; one Vitolas trial per customer, no self redemption, closed/billing-held accounts rejected.
- SQLite triggers enforce reservation capacity under concurrent requests and owner restoration; expired/deactivated unused reserves release automatically. Redeemed credits stay committed. Allowance edits have an audit trail.
- Request UUID produces an idempotent invite code. Repeating a failed network request cannot create duplicate reserves; changed payload with same key is rejected.
- Gift URL includes existing referral code and voucher; account controller captures/claims the reference under unchanged new-account rules. Redemption remains an explicit customer action.
- Contact reporting redacts closed/unverified recipient emails. No real vouchers, credits, purchases, provider generations or outbound messages created during implementation.
- Local validation: 170 Worker/partner/promotions/referrals/trial/holds/menu/Image checks passed; syntax and diff checks passed.
- Browser additions cover creation/error/retry, sharing, budget controls, deactivation, zero allowance, signed-out delayed responses, and combined referral/voucher account links at mobile/desktop widths.
- Status: implementation complete locally; browser CI, visual inspection and production release pending. Next: validate fixed candidate, review mobile/desktop artifacts, publish and verify Worker plus Cloudflare Pages bytes.

## Future Beauty visual refresh, 2026-10-25
- User requested a shadowed high-fashion future-cosmetics hero and clearer explanation of Victoria's referral workflow.
- One built-in imagegen artwork: adult beauty portrait, real skin, smoked glass/chrome, deep graphite shadows, left negative space; no text or logos.
- Source generation: generated_images/exec-903f72f3-7a61-4997-acea-96007e9b226a.png. Project asset: lab/visuals/vitolas/future-beauty-v1.webp, 1983x793, 64,932 bytes.
- Scoped HTML/CSS refresh: responsive photographic hero, refined typography/rules/metrics, clearer new-account referral instructions. Auth/API/payment code unchanged.
- Baseline fad4fca5b6dd3898fe33aac2e97c30a35bae337c; 13 focused partner/Image contract tests passed locally.
- Browser workflow 40139208994 passed 116 assertions at 320/390/768/1440px: hero loading/title bounds, contained layout, Owner click-through, role denials and logout isolation. Desktop/320/390px artifact 12577904554 inspected.
- Visual PR #535 published as fc3aa0889988a74e313c424fc5f79b41d5ed7027; reviewed source 3877918d8fe8311c5988c3ec50bb6b90fce8f919.
- Scoped release verifier returned LIVE_VERIFIED for this merge. Production Vitolas HTML/CSS and hero WebP independently matched reviewed bytes (HTTP 200); asset Git blob 61161d7d5b8231ee0edb1bff9febc26d35c7e230.
- Current visual status: published. New real registrations, purchases and signed-in production roles were not simulated as real customer activity; backend and referral rules remained unchanged.

## Owner review extension, 2026-10-24
- User explicitly requested private Owner access to Victoria's dashboard.
- Hidden links in Owner sidebar/mobile navigation reveal only after verified owner session; no general customer-menu changes.
- Same Vitolas page selects the customer or admin endpoint from the verified session role.
- New read-only GET /api/admin/partners/vitolas-studio reuses the existing OWNER_DB role/auth-provider guard.
- Owner data scope resolves Victoria's approved verified email on the server, ignoring browser-supplied customer IDs.
- Before Victoria's first login, owner sees an activation-pending message, with no fabricated link or counters.
- No promotion of Victoria to owner, payouts, balance changes, email or schema migration.
- Validation: 44 focused checks and 103 Worker tests passed; final browser run 40136336537 passed 81 assertions including actual Owner sign-in/menu/click-through, denied customers, pending activation and both-role logout races. Desktop/phone artifacts 12576849464 inspected.
- Extension PR #534 published as dbf8e3ce8e8afed2aab7698c33bbc8032edc5919; reviewed head 17eb5224bbafa83a0c9b2b05feb28d09a629bb98.
- Worker production run 40136458774 completed successfully, including deployment and health.
- Scoped release verifier returned LIVE_VERIFIED for this merge; production Owner HTML/JS and Vitolas HTML/JS independently matched reviewed bytes (HTTP 200).
- Current extension status: published. Actual Alejandro/Victoria production sessions have not been used; next real-account check is Owner Dashboard > Vitolas Studio.

- Approved and published 2026-10-24: **Vitolas Studio**, for Victoria Caridad.
- Authorized primary email is represented by SHA-256 in the Worker; no private address in public source.
- PR: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/533
- Reviewed code head: `550c90d8f401d3dbeda558adbf329b95983bdbb8`.
- Production merge: `f59a75ab5ce3fde29cf35d314cc972ae0b585c18`.
- Live entrance: https://pvlab.studio/vitolas-studio
- Source: `lab/vitolas-studio.{html,css,js}`, `lab/account-menu.js`, `lab-worker/partner-dashboard.mjs`.
- Authenticated read endpoint: `GET /api/customer/partner`.
- Account-menu import/cache markers refreshed in account, homepage/Moods, Studio and Mood Creator.
- Worker checks a freshly verified Clerk primary email on every dashboard/page request.
- Dedicated Studio identity uses existing server-side identity links.
- Session/menu discovery stays read-only and never waits on Clerk.
- First-login contact discovery comes from existing background sync; direct dashboard access verifies and populates the menu immediately.
- Closed accounts, unverified/changed emails and failed upstream verification cannot read partner data.
- Referral scope is the authenticated internal subject, never a browser-supplied customer ID.
- Existing stable referral link, attribution window and referral reward rules are reused unchanged.
- Spanish panel: registrations, paying customers, active subscriptions, verified purchase counts and paginated contacts.
- Closed referred identities are anonymized; prompts, media, provider finance and owner-wide data are excluded.
- Purchase metrics use immutable verified purchase/subscription entries and aggregate all pages.
- No commission or payout agreement has been defined or implemented.
- No manual credit adjustment, real purchase, provider generation or outbound email was performed.
- Local checks passed: 103 existing Worker tests plus 40 focused partner/referral/promotion/menu/Image checks.
- Final partner workflow `40131708686` passed 42 browser assertions at 390/768/1440px.
- Desktop/phone artifact `12575666321` inspected: contained layout, aligned header, protected roles and logout/stale-response cleanup.
- Final full Lab/account/promotions/video checks passed; Upscaler passed one targeted infrastructure retry.
- Two duplicated final browser installers were cancelled; the same compact Image/pricing scripts passed on parent `3e9721b`, with byte-identical shared app modules. Final delta was confined to new Vitolas header styling and passed its own browser suite.
- Worker production run `40132488747` completed successfully, including health; deployed version ID `95e9bd55-fd5a-47c7-b064-38a10bcc74ba`.
- Scoped release verifier returned `LIVE_VERIFIED` for production merge and `lab/lab.js`; SHA-256 `6852ec4ccf4cbfe2742026fc68f9f4e1de5a39df7b68d95c1ac2a1651e157bc2`.
- New HTML/JS/CSS and account-menu bytes independently matched the reviewed files on pvlab.studio (HTTP 200).
- Status: frontend and Worker published. Victoria's actual signed-in session and real referral/purchase flow remain unverified.
- Next: Victoria signs in with the approved email, opens the panel, and copies her actual personal referral link. Keep commission decisions separate.
