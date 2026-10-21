# Nina Instagram: verified owner-continuity work state
Updated: 2026-10-21

## Current dialogue repair deployed (2026-10-21)
- Objective: fix contradictory Workroom definitions, recurring studio/coffee anecdotes, coaching-style questions and repetitive affectionate openings.
- User supplied two conversation excerpts and asked for a more natural, dynamic Nina. Do not save the private transcripts in the repository.
- User-reported conversation from `parallelvision.label` shows text replies from a separate account after public activation. This is user-supplied conversation evidence, not a new API audit.
- Authoritative Workroom canon: `anam-token-worker/prompts/nina-system.txt` and `anam-token-worker/src/persona-context.js`.
- The Workroom is Nina's small independent attention-practice group, distinct from her recording studio. The prior Instagram prompt named it without defining it.
- Instagram public instructions now define that canon explicitly and prioritize it over contradictory earlier assistant claims.
- Removed the forced curiosity nudge that asked for a question after several replies. Added current-turn guidance that allows opinions/reactions without another question.
- Simple greetings no longer invite stock tiredness/coffee/nightlife stories; the Workroom is only relevant when the visitor asks about it.
- Coaching feedback receives a brief ordinary repair, with no question, topic menu or explanation of intentions.
- Evidenced owner familiarity remains available without requiring every response to begin with amor. Repeated pet-name openings are rewritten.
- Draft checks and one bounded rewrite catch the reported canon/style failures; fallbacks no longer invent an apology for an unsent draft during ordinary conversation.
- Earlier fabricated favorites, vague romantic summaries and improvised assistant claims are not evidence for new canon or specific memories.
- New deploy verification marker: dialogueRevision `natural-dms-2026-10-21`. The original public release/migration ID is retained so this update cannot rerun public activation.
- Changed code: `nina-instagram/worker.mjs`, `worker.test.mjs`, `deploy.mjs`, `deploy.test.mjs`, `dialogue-eval.mjs`, and `.github/workflows/deploy-nina-instagram.yml`.
- Verification passed: syntax, 16 reply tests and 4 deployment tests locally and in CI. Source commit `a5b0967025c191b6fcf6f644fd11447e433226c0`.
- Exact comparisons confirmed webhook verification, owner link/vault access, send controls, voice handling and scheduling functions are unchanged.
- Synthetic direct-model evaluation could not run: the existing deployment token lacks direct Workers AI model permission. The workflow recorded `DIALOGUE_MODEL_UNAVAILABLE`; do not claim generated sample replies or real-model quality validation.
- Deployment VERIFIED 2026-10-21 at 19:53 Europe/Berlin. Active version `58e2eb5c-4957-4b32-9797-05456e4168b9` at 100%; deployment `4fd36acb-2d35-4fc1-9680-0a7e9de7718a`.
- Successful run: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/39647666750 (job `119387421558`).
- Actual production health returned dialogueRevision `natural-dms-2026-10-21`, public mode and both public flags true. Pacing remained `[10,120]` first minutes, `120` active seconds, `6` quick replies and `30` idle minutes.
- Cloudflare bindings/runtime configuration and once-minute cron were verified around the content-only upload. A real Instagram response with this new dialogue revision remains to be observed.

### Prior verified public deployment
- Production version `8ed22136-ae82-4af0-9962-77ee4c171164` at 100%; deployment `5497e37f-714a-43c4-a3d8-26baf9d4a3b0`, verified 2026-10-21 at 16:15 Europe/Berlin.
- Prior successful CI run: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/39615126399 (source/deployer commit `a29e5a360dd6af48087970dd91bc251cae3e03c1`).
- Production health returned release `public-paced-2026-10-21`, mode public, public text true and public voice true.
- Timing retained: first reply 10 minutes to 2 hours; then up to six replies around 2 minutes; reset after 30 minutes from the last successful reply. Generation/network time is additional.
- Existing owner pacing, opt-outs, deduplication, per-sender context and private-vault isolation remain in place.
- Seven binding names/types, the private vault target and once-minute cron were verified around the prior content-only upload.
- Runtime tables `ig_reply_sessions` and `ig_runtime_migrations` implement pacing and one-time public activation; later admin disabling remains respected.
- Existing limits: 120 send attempts globally per rolling day, 80 per sender, 8 per minute per sender; 120 stored drafts per rolling day.
- Deployment access works through the repository's existing authorized `CLOUDFLARE_API_TOKEN` CI connection. Direct connector errors are not a blocker; do not request code copying or another browser login.
- Original Nina memory, private vault data, secret values and unrelated Workers are not modified. No stored messages are backfilled.
- Real public voice-note transcription and delivery remain unverified end-to-end.

### Exact next action
1. Have the user continue an existing Instagram conversation with an ordinary message; inspect the actual new response for naturalness, repetition and canon consistency.
2. Do not retry the direct Workers AI evaluation using the same deployment token; its model permission is absent. The deployment path itself works.
3. Preserve the public mode, approved pacing and owner-private continuity. Do not erase conversation history to repair style, and do not promise model quality from unit tests alone.

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
