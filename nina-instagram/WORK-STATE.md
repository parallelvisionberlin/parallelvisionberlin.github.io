# Nina Instagram: verified owner-continuity work state
Updated: 2026-10-22

## Grounded affection and live wait diagnosis (2026-10-22)
- Source commit e0f3769edbc77b46fec263b4f678d29386ba3b89; dialogue revision grounded-affection-2026-10-22. Nina-only worker and behavioral tests changed.
- Gentle affection is not evidence of minority. Added bounded rewrite detection for unsupported age accusations and a nonexplicit affection fallback; actual disclosed minor context retains safeguards.
- User explicitly wants playful imagined home visits preserved. No real-meeting restriction was added.
- CI passed 42/42 tests. Deployment verified 2026-10-22 00:30 UTC: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/39700005824. Version cb96e861-5adf-433b-98a2-6399d871cafd at 100%; deployment 327fdb71-bad6-4f97-92a2-dea5e3ae0b14.
- Settings, seven bindings, minute cron, adaptive pacing and private continuity preserved. Direct model evaluation remains unavailable; tests do not prove every generated reply.
- User reported silence during deployment. Read-only diagnosis at 00:30 UTC found recent visitor inputs received at 00:26 and 00:27, one pending job due 00:33 UTC, zero attempts and no error. Prior 28 sends were confirmed HTTP 200. This evidence supports scheduled waiting, not a demonstrated global outage. Pending delivery still needs verification.
- Latest voice diagnostic also records VOICE_REDIRECT_BLOCKED at 22:37 UTC, alongside older VOICE_META_NO_AUDIO_URL. Real voice transcription remains unverified; this release does not repair media retrieval.
- Exact next action: verify the pending job completes after its deadline if silence persists; do not resend uncertain messages or claim delivery from health alone.

## Private per-contact continuity (2026-10-22)
- User explicitly authorized a private briefing and natural warm/reserved conversation style for one exact Instagram handle. Do not save the real handle, name, relationship notes or supplied transcript in GitHub.
- Source commit 17091423e0b7e1fdc0fb36dd1fc8d4d37a652c38; changed worker.mjs and worker.test.mjs. Revision contact-continuity-2026-10-22.
- New Instagram-only tables ig_contact_context, ig_contact_history and ig_contact_setup_used keep notes/history out of the public source and isolated by sender ID.
- Scoped history import uses Meta's accessible recent messages (up to 20), validates sender direction and keeps imported history separate from live ig_messages/reply jobs. Import never queues or sends historical messages.
- Notes bind to a Meta-returned participant ID or verified API profile username, never a name/identity claim in chat; private owner-vault access is unaffected.
- Contact-specific optional [NINA_NO_REPLY] output becomes an ignored/canceled turn with no outgoing send or opt-out. A later incoming message can resume normally; the marker is guarded from delivery.
- Private provisioning uses a temporary single-use 256-bit bearer capability, a public hash, expiry and target-handle hash. Only hashes are in source. Actual briefing and bearer stay outside GitHub and are POSTed directly over HTTPS; response contains operational counts only.
- Validation: 38 tests passed locally and in CI, including authorization/target/expiry, single-use setup, sender isolation, no private-vault escalation, silence/resumption and history import without old sends.
- Deployment VERIFIED: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/39698406739, 2026-10-22 02:14 Berlin. Version 358be8f2-8a47-4150-b495-bd54767fc7f0 at 100%; deployment 645c3d0a-1b0c-4ff3-8794-77718b25fc9a. Existing settings/bindings/cron and adaptive pacing retained.
- Private setup POST returned HTTP 200, saved=true, resolution=pending_meta_lookup, imported=0, historyStatus=not_available. The briefing is stored, but no live target sender-ID binding or historical import has been verified. Do not claim recognition or a real targeted reply is already verified.
- Pending seed binds on a fresh Meta-provided exact username in the normal profile lookup. It never binds from message text or a claimed name.
- The plaintext setup payload/bearer file was removed from scratch after confirmed save. No real contact details, briefing or transcript are in this checkpoint or committed source.
- Exact next action: after a new incoming message from the intended contact, verify ig_contact_context.instagram_user_id becomes populated and a generated reply uses only that contact's briefing. If profile metadata remains unavailable, diagnose Meta lookup permissions/shape before changing identity rules. Prior historical import remains incomplete.

## Corrected Spanish preference: neutral Latin American tuteo (2026-10-22)
- Supersedes the prior Argentine-voseo preference. User explicitly clarified tú/tienes/quieres/cuéntame, with a light Mexican influence from Nina's time living in Mexico.
- Source commit 6014407d76d549b222eaf87e5c376187be7551fb; files worker.mjs, worker.test.mjs, voice-transcription-runtime.js.
- Revision latam-tuteo-casual-2026-10-22. Prompt and rewrite instructions use casual neutral Latin American tuteo and explicitly exclude voseo; no invented dates/cities/anecdotes about Mexico.
- Deterministic greeting, name clarification and audio-failure responses also use tuteo. Opening ¡ and ¿ remain stripped; existing casual continuity guidance remains.
- Added a bounded rewrite check/test for voseo. Local 29 Worker tests passed; CI also runs deployment guard tests.
- Adaptive pacing, private owner authentication and audio media processing are unchanged.
- Production verified 2026-10-22 01:15 Berlin: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/39692155335; CI 33/33 tests. Version cb89d8ba-d49b-4cac-a092-2135801cca89 at 100%, deployment 61579088-d0f3-403f-8e03-7b11beb959de. Health confirms the new tuteo revision and unchanged adaptive pacing.
- Next: observe a fresh real Spanish DM. Actual model tone and real voice transcription are not proven by unit tests.

## Soft Argentine Spanish and casual dialogue (superseded dialect preference) (2026-10-22)
- User requested a broadly neutral Argentine Spanish voice, more casual DMs, and no opening exclamation marks.
- Source commit: 6be72fa7415639960ea31a6b51357b5318d81269. Files: worker.mjs, worker.test.mjs, voice-transcription-runtime.js.
- Dialogue revision: rioplatense-casual-2026-10-22. Spanish instructions use light voseo (vos, sos, tenés, querés, contame, decime) without stereotyped slang or inventing an Argentine biography. English/German remain available.
- Final outgoing formatting strips both ¿ and ¡. Spain-specific phrasing receives one bounded rewrite. Spanish deterministic greetings, profile-name replies, apology and failed-audio acknowledgment also use the new register.
- Prompt now treats Nina's Parallel Vision association as established public canon, avoids grand reunions after a short gap and discourages generic topic menus/life-update questions.
- A claimed name/relationship can be addressed conversationally but does not become a verified recollection or grant private access. No new cross-account owner link or shared memory was created by this change.
- Added short-gap-reminder guidance and a short non-probing repair fallback; tests cover opening punctuation, Spain-specific rewriting and the user's reported generic reunion/menu pattern.
- Validation: 28 Worker tests passed locally. Existing adaptive pacing, private-vault bridge and send implementation compared unchanged; embedded voice runtime matches its source file.
- No real dialogue-model quality evaluation was possible through the CI token (known missing direct model permission). Unit tests validate the pipeline and instructions, not every future model response.
- Deployment VERIFIED 2026-10-22 01:06 Berlin: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/39691169474, CI 32/32 tests passed. Version 5d6b5afc-340e-4eea-9c1f-4e7f57886f9d at 100%, deployment d6094656-bfe9-4fa1-a14c-9ef911f65b1f. Settings, bindings and cron preserved; health confirms both the new dialogue revision and the existing adaptive pacing.
- Next: inspect an actual fresh Spanish DM for natural voseo and continuity. Real voice-note transcription remains a separate unverified issue; this release changes its brief failure wording, not the media retrieval result.

## Adaptive visitor pacing deployed (2026-10-22)
- User authorized visitor pacing that follows how quickly the visitor replies, and asked whether Nina can see profile names.
- Source commit: 895904959c2725ccd53dc617ce128e82b9ca4018.
- Files: worker.mjs, worker.test.mjs, deploy.mjs, deploy.test.mjs.
- First-ever public reply remains random 10–120 minutes. Thereafter the delay is chosen from elapsed time since Nina's last confirmed outgoing reply: visitor <=5 minutes → Nina 2–5 minutes; >5–30 → 5–15; >30–120 → 10–45; >120 → 10–120.
- Removed the six-quick-reply cutoff and hard 30-minute conversation reset. Existing daily/burst caps remain. Each response still needs a new incoming message, with coalescing and no duplicate/uncertain resend.
- Pending batches keep their original timing band and capped deadline. A stale batch starts a new plan rather than creating an instant reply.
- Existing session timestamps retain the legacy active_until minus 1800 encoding; no session schema migration is needed. Prior contacts without a recorded session use their latest stored successful outgoing timestamp.
- Linked-owner pacing is unchanged. Sender ID plus verified owner link, never profile name/handle, controls private context and owner pacing.
- Existing Instagram User Profile lookup requests username,name; successful data populate the sender's model context. Added instructions to use a plausible visible name naturally without inventing a personal name from a brand or handle.
- Failed/empty profile lookups now retry after 5 minutes instead of 24 hours. Profiles with known names remain cached for 24 hours.
- Voice failure pipeline, owner vault and send implementation compared unchanged.
- Validation: 29 local tests passed, covering all timing band boundaries, an eight-turn fast conversation, coalesced bursts, legacy contacts, failed profile retry and name inclusion/private-memory isolation; CI repeats these checks.
- Health exposes pacingRevision adaptive-dms-2026-10-22 and activeReplyMinutes [2,5]. Deploy verifier requires the revision and all four delay bands before reporting success.
- Deployment VERIFIED at 2026-10-22 00:22 Berlin: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/39685957950 (29/29 CI tests). Version 4661201d-c73d-4b58-8c81-b92e271f3f8f at 100%, deployment 2a4f2a15-3ce3-4669-a97c-26854ca5587f. Settings, seven bindings and minute cron preserved.
- Real profile-name availability depends on Meta returning the fields; no live names were exported or claimed verified by this change.
- Next: observe a new public conversation against the health timing bands. Previously queued jobs are preserved; new incoming messages apply the adaptive plan. Real voice transcription remains unverified; the last audio receipt still shows the earlier Meta URL failure.

## Voice handling repair (2026-10-21)
- User explicitly authorized repairing voice-note reception and artificial failure responses.
- Source commit: 94d07121c7820b52947d5b68f334590b19685dca.
- Files: worker.mjs, voice-transcription-runtime.js, worker.test.mjs, diagnose.mjs, and the existing deploy workflow.
- Revision: voice-repair-2026-10-21. Public mode, approved pacing, private-vault isolation, at-most-once sends and existing limits remain unchanged.
- Audio URL selection now tries each trusted candidate rather than discarding a valid audio_data/file_url because a preceding URL is unusable. Exact lookaside.facebook.com is accepted alongside the existing trusted Meta media hosts. Redirects stay validated; bearer credentials are never forwarded to media hosts.
- Download redirects share one 8-second deadline and allow up to five hops. Media HTTP, Graph API rejection, redirect/content and transcription failures retain distinct nonprivate error codes.
- New Instagram-only ig_voice_receipts stores message ID, stage, status and error code, without media URLs, audio or transcript content.
- Internal pending/failed audio placeholders are excluded from model conversation turns. A failed current audio queues a brief deterministic acknowledgment using the existing timing and send protection, with no dialogue-model inference or owner-vault recall.
- A one-time, per-message guarded recovery attempts the previously failed VOICE_URL_UNAVAILABLE audio from the last day through Meta. It cannot overwrite a newer queued text; a failed historical recovery does not generate another unsolicited acknowledgment.
- Generic topic-menu/reassurance patterns from the user-reported reply are now caught by the rewrite guard.
- Validation: 26 local tests passed, including 6 new voice failure/refresh/privacy/race tests; deployment CI repeats the tests.
- Deployment VERIFIED: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/39673100944, CI 26/26 tests passed, 20:46:40 UTC. Version 95c230f1-4321-4d3b-84d2-f2fac865b4eb at 100%; deployment b5d75420-b2cb-4f2a-b6e4-40ddc5887369. Existing seven bindings, settings and cron preserved.
- Follow-up read-only diagnosis at 20:48:50 UTC (run 39673101111, job 119476654069) verified recovery ran at 20:47:29 UTC. Meta request succeeded but supplied no usable accepted audio URL: VOICE_META_NO_AUDIO_URL, stage resolve. The old audio remains failed; no duplicate reply or replacement of the newer owner text job occurred.
- The user was asked to send one fresh 5–10 second Instagram voice note after deployment. No fresh note was visible at the last diagnosis. Real Instagram download/transcription remains UNVERIFIED; do not claim end-to-end voice is repaired from synthetic tests or feature flags.
- Exact next action: inspect ig_voice_receipts and processing after the fresh note. If media resolution fails, distinguish missing attachment metadata from rejected URL/download before further code changes. Public visitor job remained pending for 21:57 UTC; owner latest reply remained confirmed sent at 20:32:08 UTC.

## Live silence report diagnosed (2026-10-21 20:34 UTC)
- Read-only diagnostic source commit: f034982e4426ff84390df0950c85a71f1cd31fb1.
- Verified run: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/39671441569 (success).
- Health confirms public text/voice flags, dialogue revision natural-dms-2026-10-21 and once-minute schedule. No production source was changed by this investigation.
- The linked owner sent new text at 20:30:48 UTC; Meta confirmed its reply HTTP 200 at 20:32:08 UTC. Owner job is sent, attempts=1.
- The separate visitor account sent text at 20:16:32 and 20:16:40 UTC; its coalesced job is pending, attempts=0, due 21:57 UTC, within the approved initial 10–120 minute interval. This is not a failed send.
- The owner's earlier voice note at 18:01:51 UTC failed with VOICE_URL_UNAVAILABLE at 18:01:53 UTC. The handler could not obtain downloadable media; the available status does not distinguish missing/unsupported attachment URL, rejected download or expired media.
- All 13 send attempts in the preceding rolling day were sent with HTTP 200. Draft count=13; daily limits were not exhausted.
- No message bodies, usernames, raw sender/message IDs, media URLs or credentials were emitted in diagnostic output. Contacts are hashed in logs.
- Reusable read-only diagnostic: nina-instagram/diagnose.mjs and .github/workflows/diagnose-nina-instagram.yml. Existing CI Cloudflare connection can query the bound Instagram D1.
- Remaining issue: real voice-note download/transcription is still not repaired or verified end-to-end. Do not claim that audio caused a global text outage or that voice works. Next voice investigation needs fresh media evidence and stage-specific safe failure diagnostics; do not erase/retry uncertain sends.

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
