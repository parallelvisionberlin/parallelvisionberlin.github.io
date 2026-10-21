# Nina Instagram: verified owner-continuity work state
Updated: 2026-10-21

## Current public release prepared (2026-10-21)
- Objective: enable public Instagram replies with a 10-minute to 2-hour initial wait and approximately 2-minute follow-ups.
- Authorization: Alejandro explicitly requested public activation and these timing changes in this conversation.
- Complete source recovered from user attachment `Pasted markdown(20261021-122346).md`, Library ID `libfile_f688716a1ea881919e68ce17c9c71789`.
- Markdown emphasis and escaping were decoded into valid JavaScript. The recovered embedded voice code matched the previously verified repository helper apart from whitespace before the intentional public-gate changes.
- Full deployable source now lives at `nina-instagram/worker.mjs`.
- Related files: `voice-transcription-runtime.js`, `worker.test.mjs`, `PUBLIC-RELEASE.md` in the same directory.
- Initial public deadline: uniformly selected cron-aligned minute between 10 minutes and 2 hours after the incoming message; generation/network time is additional.
- Ongoing public conversation: up to six further confirmed replies, with cron-aligned deadlines 90 to 150 seconds after the incoming message, targeting approximately 2 minutes.
- Reset after 30 minutes from the latest confirmed reply or after six quick replies. The next incoming message gets the initial wait again.
- Coalesced messages keep one latest pending reply. A write-time latest-message guard prevents slower older handlers overwriting newer jobs.
- Continuous incoming messages cannot extend the original initial deadline indefinitely; active bursts also have a bounded coalescing delay.
- Only a Meta-confirmed successful send opens/advances the active conversation. Failed or uncertain sends do not consume quick replies.
- Existing linked-owner pacing, signed webhook verification, opt-outs, send deduplication, reply window and private-vault identity checks are retained.
- Public text and voice default enabled in this explicitly authorized release when their environment overrides are absent. Explicit false or unexpected override values still disable the corresponding public feature.
- The next cron or signed webhook after deployment creates Instagram-only `ig_reply_sessions` and `ig_runtime_migrations`, then atomically upgrades the verified `tester` mode to `public` once.
- The activation marker prevents later restarts/redeploys from reopening a subsequently disabled/tester mode.
- No old stored messages are backfilled; original Nina memory and owner-vault data are not copied or modified.
- Added a read-only `/health` response with release, effective public flags and timing values; no credentials, sender IDs or private transcripts are returned.
- Existing operation limits remain: 120 send attempts globally per rolling day, 80 per sender, 8 per minute per sender; 120 stored drafts per rolling day.
- Local verification passed: JavaScript syntax and all 12 Node tests using real in-memory SQLite and simulated Meta/AI responses.
- Tests cover real queue/send flow, six quick replies, idle reset, coalescing/race ordering, stop/resume, disabled flags, one-time activation, owner/public context separation, invalid signatures, expiry, uncertain sends and voice deduplication/gating.
- D1 batch transaction semantics were verified against official Cloudflare documentation. These local tests do not prove a real Cloudflare or Meta deployment.
- Deployment status: PREPARED ONLY. Last observed production version remains `91d04d2e-783f-4730-b368-fc2020a76885`; current mode was last observed as `tester` in the user's D1 screenshot.
- Direct Cloudflare connector tools return MCP `-32603 Internal error`; the remote browser is unauthenticated. Do not repeat the failed login loop.
- No production source, bindings, secret values, mode or flags were mutated by this preparation. GitHub publication alone does not deploy the Instagram Worker.
- Recovered text replies already worked after the user reactivated the Meta account. The exact original account-block trigger and real audio-note end-to-end delivery remain unverified.

### Exact next action
1. In the existing Nina Worker dashboard's Edit code view, replace the main module with `worker.mjs` and Deploy, retaining all existing bindings/secrets/cron. Detailed instructions are in `PUBLIC-RELEASE.md`.
2. After the next cron, verify `/health` reports release `public-paced-2026-10-21`, mode `public`, and effective public flags true. An existing explicit false environment override must be changed to exact string true to enable that feature.
3. Confirm one fresh non-tester DM receives the initial delayed reply and one follow-up receives a quick reply. Do not claim public availability until this real Meta access path is verified.
4. Reuse this complete source and the passing tests; no need to ask the user to recover the Worker again.

## Historical implementation record
The sections below preserve the earlier chronological deployment and verification notes.

## Deployment verified
- Meta / Instagram: signed webhook and normal DM auto-send remain enabled only for the authorized tester, not the public.
- Instagram Worker: `nina-instagram`, deployed version `945aa15d-e1ae-42c9-b117-2900b1c84383` at 100% on the production Worker.
- Instagram Worker bindings: `AI`, `IG_MEMORY_DB`, `INSTAGRAM_ACCESS_TOKEN`, `META_APP_SECRET`, `META_VERIFY_TOKEN`, `NINA_VAULT_SIGNING_SECRET`, `OWNER_VAULT`.
- New service-binding-only Worker `nina-instagram-owner-vault`. Its Workers.dev and preview endpoints are both disabled. Its bindings include original D1 `NINA_OWNER_DB` and encrypted `NINA_VAULT_SIGNING_SECRET`.
- The same random 32-byte signing secret was written directly as encrypted secrets on both Workers; its value was NOT written to GitHub or printed.
- The original Nina/Anam Worker and original `nina-fok-memory` D1 records were not modified.
- Instagram-only D1 now includes `ig_owner_link_challenges` and `ig_owner_links` with challenge expiry, one-time consumption and revocation columns.

## Security and operation
- Private continuity is only queried for an Instagram-sender-ID that has a valid, unexpired `ig_owner_links` row.
- The user ID referenced by a challenge is checked by the nonpublic vault against the original D1 `users.role='owner'`.
- The challenge must be sent from the exact Meta-authenticated Instagram sender ID; the username/display name alone never grants private access.
- One-time plaintext challenge code is not recorded in the Instagram D1 transcript, prompts, or logs by the new Worker.
- Link commands: `NINA LINK <one-time 64-hex code>`, `NINA UNLINK`.
- Challenge expires in 15 minutes; owner association expires after 30 days or explicit unlink.
- The original D1 data are not copied into Instagram D1. Vault sends a bounded, owner-only context for a single inference call; hidden pinned memories and original personal conversation-view restrictions are respected.
- Existing public Nina personality, Spanish closing-question-mark style, DM processing, and tester allowlist remain in place.
- Original Nina Instagram privacy notice was updated on GitHub to describe this opt-in feature, though GitHub Pages deployment should still be verified.

## Current exact state
- Both Workers and all bindings were deployed and verified through Cloudflare API.
- One valid, time-limited enrollment challenge was generated for the verified original owner and the previously verified `@molinarimusic` Meta sender ID through the connected Cloudflare administrator channel. **The secret challenge value is intentionally not stored in this file.**
- User has been instructed to send the one-time link command from `@molinarimusic` to `@ninafok2000`.
- **Link redemption VERIFIED:** the one-time code was consumed exactly once, one active linked account exists, and the `NINA LINK` command was not stored in ordinary Instagram chat history. This was checked directly against D1 on 2026-10-15. The link expires on 2026-11-14 03:23:23 UTC. **A real owner-only memory retrieval and resulting Instagram reply remain untested. Do not yet claim those work end-to-end.**

## Next task
1. Link verified. User should now send a fresh, normal DM from @molinarimusic asking Nina what she remembers from before Instagram.
2. Ask one normal owner DM about a specific historical memory, then verify the original vault read completes and the generated response is grounded in actual permitted memory, not invented.
3. Confirm unlinked accounts cannot retrieve private context, check production logs for errors, and inspect scope of the prompt.
4. If the challenge expires, generate a new one only after revalidating the Cloudflare connected owner account and the exact Instagram sender.
5. Preserve tester-only auto-send until appropriate public-availability/transparency requirements are fulfilled.

## 2026-10-15 quality deployment
- Instagram worker deployed at 100%: 2e8f6409-0019-4a48-b208-0c6d27b84c3e.
- Private vault worker deployed at 100%: 6e508778-a3c0-4137-a349-2c0cfa18a4da.
- Instagram style restored: warmer conversation, independent observations, natural curiosity, brief caring repairs, and easy Spanish.
- Existing linked owner may receive familiarity grounded in approved historical continuity; unknown visitors do not receive privileged context.
- Vault retrieval now focuses on relevant conversation history, while leaving original records unchanged.
- Mode remains tester with a single authorized sender; vault public URL remains disabled.
- Preflight model tests succeeded. Next: run one real Instagram conversation and verify the outcome.

## Human-paced delayed DM delivery (2026-10-15)
- Active production IG Worker version: `20185f8a-6075-4ad2-93a4-eb7b19078da0` (100% of traffic) as verified via Cloudflare API.
- Cloudflare Cron Trigger now runs `* * * * *` (every minute, UTC). New IG-only D1 table `ig_reply_jobs` stores one pending job per sender.
- Linked owner `@molinarimusic`: approx. 38 to 118 seconds of randomized delay before cron jitter. Other users, once PUBLIC mode is explicitly enabled with the required controls, use a variable 5-minute to 22.5-hour delay distribution.
- Inbound texts are stored immediately, but the latest due job generates its response only at delivery time. Pending messages from one sender coalesce into a single latest turn. Existing signature checks, owner memory service binding, and normal outgoing at-most-once protections remain.
- Checked mode: `tester`, one approved sender; public auto-replies remain OFF. This delay implementation does NOT itself enable replies to the general public.
- Verified schedules and database schema, but an end-to-end live delayed reply needs one fresh Instagram tester DM.
- Preserve Nina's affectionate, curious, self-possessed personality without obligatory questions or assistant-style boilerplate.

## Timing safety refinement
- Production version `20185f8a-6075-4ad2-93a4-eb7b19078da0` verified 100% active. Previous version `bb6ac09d-673f-442a-b4dc-d0c55529f098` added sender-job/latest-message guard and owner-audience transition handling.
- Replies now target concise DMs: approximately 340 characters max for strangers, 450 for linked owner, with a longer allowance only when explicitly asked for details. Spanish closing question-mark style retained.
- Cron saved as `* * * * *`; it may take up to 15 minutes to propagate. Initial live delayed tester DM has not been confirmed end-to-end yet. An actual new tester DM is the next verification step.
- At last check the delay-job table had no queued jobs. No old messages are backfilled.
- PUBLIC auto-replies remain disabled: the randomly delayed stranger behavior is coded but not activated while Meta public access/transparency is unresolved. Do not flip PUBLIC mode without explicit review and approval.

## Incoming voice notes (2026-10-15)
- **Production deployed and confirmed 100%:** Cloudflare Worker `nina-instagram`, version `91d04d2e-783f-4730-b368-fc2020a76885`; deployment `0cb5b2cc-c975-4d5b-b376-1fd1ca8f0d0a`. Previous production version `20185f8a-6075-4ad2-93a4-eb7b19078da0` remains available for rollback.
- GitHub source for the embedded handler: `nina-instagram/voice-transcription-runtime.js` (commit `ac6620cce0d3730c7ff7e92f60007dd5ada4774d`). Existing Worker source was patched narrowly at `incomingMessages` and its webhook dispatch only; original text, cron, private owner vault, send controls, and 7 bindings were retained.
- Signed Meta webhook audio attachment detection: `audio`, `voice`, or recognized audio `file`. Only trusted HTTPS Meta CDN hosts are downloaded, following validated redirects. The graph.instagram.com message attachments API is a best-effort fallback when signed media URLs are absent/expired.
- Voice notes are bounded at 8 MiB, fetched with timeouts, and passed as base64 to the existing AI binding using `@cf/openai/whisper-large-v3-turbo`, `task:transcribe`, automatic language detection. Raw audio is not persisted. Resulting transcript replaces an incoming D1 placeholder and is handed to the existing human-paced reply queue and owner-memory flow.
- Original Meta message ID is claimed with `INSERT OR IGNORE` before transcribing to deduplicate deliveries and avoid duplicate transcription/sends. Transcription failures use nonprivate status codes and a nontext D1 placeholder, not fabricated content or automatic hallucinated replies.
- **Access:** Existing tester-only mode still applies. Public voice processing is separately gated behind both `NINA_PUBLIC_DM_ENABLED=true` and `NINA_PUBLIC_VOICE_ENABLED=true`; neither public mode nor public voice was enabled.
- **Verified:** helper JavaScript syntax and simulated voice-path flow, Cloudflare version compilation and all seven inherited bindings, production 100% deployment, active cron schedule. Instagram audio note delivery, CDN retrieval, and Whisper accuracy from a real Instagram voice message **are not yet end-to-end verified**.
- Privacy policy updated to disclose temporary audio processing and stored speech-to-text transcript (GitHub commit `393494b985582ce52d3f40568997aefa53033eeb`); confirm the public GitHub Pages build.
- **Next:** from the authorized `@molinarimusic` Instagram sender, send one fresh short voice note to `@ninafok2000`. Check the new incoming D1 row and processing status, transcription, queued job, and actual outgoing response. If no incoming event is visible, inspect Meta webhook payload support without recording raw audio or private transcripts in logs. Do not claim Meta supports all voice-note formats without this test.
