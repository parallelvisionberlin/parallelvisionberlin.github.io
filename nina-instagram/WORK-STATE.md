# Nina Instagram API - Work State

Updated: 2026-10-15

## Objective
Connect @ninafok2000 Instagram messaging to a dedicated Cloudflare Worker with Nina's public personality, isolated memory, and safe reply delivery.

## Production infrastructure
- Meta app: Nina FOK, Instagram Login with Instagram messaging permissions and webhook subscriptions.
- Worker: `nina-instagram` on `nina-instagram.parallelvision.workers.dev`.
- Webhook: `/webhook`. HMAC-SHA256 signature verification uses `META_APP_SECRET`.
- Active Cloudflare Worker version: `e657bdb8-6be8-45fb-b8ec-683feda3557e`, verified 100% deployment.
- D1 binding: `IG_MEMORY_DB` -> `nina-instagram-memory`.
- Workers AI binding: `AI`. Model is Llama 3.3 70B Instruct FP8 Fast.
- Secrets: `META_VERIFY_TOKEN`, `META_APP_SECRET`, `INSTAGRAM_ACCESS_TOKEN`. Do not store values in GitHub.
- The existing Nina Worker and `nina-fok-memory` database are NOT used for Instagram messaging.

## Verified milestones
- Meta webhook verification and Meta sample events succeeded on 2026-10-14.
- Three real Instagram tester DMs arrived, were stored, and produced three AI drafts on 2026-10-15.
- Conversational recall on the third draft correctly identified the tester's first question.
- Auto-send code uploaded, staged, deployed, and verified on 2026-10-15; outbound real-world delivery NOT YET tested.

## Current sending safeguards
- `ig_autoreply_config.mode = 'tester'`. This is NOT public auto-reply mode.
- `ig_autoreply_testers` contains exactly one authorized Instagram tester from the original test.
- Only that tester may receive automatic replies; no auto intro has been added.
- Per-message outgoing attempts reserved in `ig_send_attempts` before calling Meta's official `POST https://graph.instagram.com/v26.0/{ig_user_id}/messages` endpoint.
- Responses are recorded as outgoing in `ig_messages` only when Meta acknowledges a sent message.
- No automatic retries on uncertain send outcomes; old drafts are never sent retroactively.
- STOP/START opt-out logic, a 25-per-day draft cap, and outgoing rate limits exist.
- Credentials remain encrypted in Cloudflare secrets; neither IDs nor private DM content are logged by send code.

## Remaining tasks
1. Ask the authorized Instagram tester to send a NEW DM to Nina.
2. Query D1 `ig_send_attempts`, `ig_processing`, `ig_messages` for success/failure; check Cloudflare telemetry without exposing private identifiers.
3. Confirm the reply actually appears in Instagram, and test response continuity across another DM.
4. Before expanding to the general public, implement an EU AI Act Article 50-compatible, unobtrusive first-interaction disclosure and update Nina Instagram privacy notice accordingly; do not assume the privacy page alone provides notice.
5. Resolve applicable Meta public messaging permission/access review if needed. Switch to public sending only after checks and user approval.

## Site legal resources
- `nina-instagram/privacy/index.html` on parallelvisionlabel.com
- `nina-instagram/data-deletion/index.html` on parallelvisionlabel.com
- Instagram-specific privacy text updated for approved tester auto-reply mode.

## Important boundaries
- Keep Nina's casual artistic persona. No generic customer-service intro.
- Never alter PV LAB or the original Nina Anam Worker to adjust Instagram.
- Do not promise public replies until an actual public-account messaging test succeeds.
