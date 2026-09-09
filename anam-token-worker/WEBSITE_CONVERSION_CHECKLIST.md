# Nina website conversion release, 2026-09-09

## Scope
Website only. `/nina-app.html` uses the existing microphone/Clerk bridge and trial activation. No native app file, price, payment secret or credit rate changes.

## Changes
- Resume a stored `signal` intent after same-page Clerk signup/signin. Never start a call for an arbitrary signed-in page load.
- Website trial requires user-confirmed output playback and a captured user turn before activating billing. Existing 60-second grace limit remains. Audio help stops the call and gives recovery instructions.
- End-of-trial primary action explicitly requests the existing 6-minute EUR 3.50 pack. Secondary action opens the other packs. Idle intro no longer intercepts the continuation buttons.
- Checkout-return state does not claim success merely from a URL parameter. After the existing ledger/balance confirmation, show Return to Nina.
- Website-only recovery prompt avoids blame/teasing for possible audio problems and points to the actual controls for pricing.
- Qualified conversation requires explicit audio confirmation, visible playing video on the client, authenticated ownership, 60 seconds since Live activation and two user/reply pairs verified from stored role/timestamps. One acquisition milestone per account; stable event ID for Pixel/CAPI retries. No message content is sent to Meta.

## Deployment
1. Pull the published main commit from the repository root. Do not overwrite uncommitted app work.
2. From `anam-token-worker`, apply only this additive migration:
   `npx.cmd wrangler d1 execute nina-fok-memory --remote --file migrations/20260909_nina_web_conversations.sql`
3. Deploy the Worker: `npx.cmd wrangler deploy`.
4. Frontend publication uses the existing GitHub Pages deployment.

The new endpoint fails softly while the migration/Worker deployment is missing; that telemetry failure does not prevent existing calls or payments.

## Verification before increasing advertising
- Fresh non-owner account, Safari and Instagram/Facebook in-app browsers: signup returns to the Nina entry screen. No surprise live connection.
- Block audio, deny microphone, close and retry: no trial activation until both explicit output confirmation and user speech. Audio help stops the call. A returned WebRTC error is not interpreted as user rejection.
- At trial end, tap the 6-minute action and verify EUR 3.50 at Stripe. Complete only an intentional test purchase; do not treat owner/friend transactions as acquisition evidence.
- Payment return: verify credits then Return to Nina. A forged success URL must not assert payment or create credits.
- Verify `NinaQualifiedConversation` in Meta only after deployment. Leave existing campaign optimization unchanged until it is confirmed.
- Set the Worker variable `NINA_ANALYTICS_EXCLUDED_USER_IDS` to comma-separated internal/test account IDs. Owners are excluded automatically; other friend/test accounts are not guessed from names or demographics. Do not store private emails or transcripts in this repository.

## Measurement limits
Audio confirmation is an explicit user acknowledgement, not proof from hardware that sound was heard. A qualified event is an operational criterion, not proof of emotional engagement, payment, or ad attribution. These tests use mock media, auth and payment endpoints, not physical iOS speakers or real checkout. Existing consent/Pixel configuration is not replaced by this change; qualified CAPI follows the existing loaded-Pixel/test-mode gate. No claim of a complete consent audit is made.

## Tests
`node --test test/web-conversion.test.js` from the Worker folder (Node 22.16+).
`python scripts/test-nina-web-browser.py` from the repository root (Python Playwright and Chromium). `CHROMIUM_PATH` and `NINA_TEST_ARTIFACTS` override the local binary/output directory.
