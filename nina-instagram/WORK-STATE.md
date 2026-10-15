# Nina Instagram API - Work State

Updated: 2026-10-15

## Objective
Connect @ninafok2000 Instagram messaging to isolated Cloudflare memory and Nina's public artistic persona, with controlled tester delivery before public rollout.

## Production infrastructure
- Meta app: Nina FOK. Published Instagram Login app; webhook `/webhook` verified with Meta.
- Cloudflare Worker: `nina-instagram` at `https://nina-instagram.parallelvision.workers.dev/webhook`.
- Production version: `6e750848-8c06-4566-be39-30c9321700bc` deployed at 100% on 2026-10-15.
- Bindings: `AI` (Workers AI), `IG_MEMORY_DB` (D1 `nina-instagram-memory`), `INSTAGRAM_ACCESS_TOKEN`, `META_APP_SECRET`, `META_VERIFY_TOKEN` (encrypted).
- Inference: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`.
- Original Nina/Anam Worker and the private `nina-fok-memory` D1 database are untouched and isolated.

## Verified functionality
- Meta webhook verification and simulated message tests passed.
- Real incoming Instagram DMs store by IG-scoped user, draft with Workers AI, and send via Meta.
- 13 outbound DM attempts were accepted by Meta with HTTP 200 before the latest personality patch. A tester confirmed actual replies in the Instagram chat.
- Three early test DMs demonstrated same-sender context recall; quality was imperfect.
- Recent tester transcript on 2026-10-15 showed repetitive capability disclaimers, promotional language and defensive responses.

## Quality fix deployed 2026-10-15
- Replaced generic AI-assistant persona with a conversational Nina: concise, curious, dry humor, art/romance conversation without moralizing.
- Explicitly avoids repeated technical explanations, overpromotion of Alejandro, baseless public-reputation claims, and hostile/condescending retorts.
- If Meta provides the sender's Instagram username or public display name, the Worker now retrieves it and includes it as unverified profile metadata, without treating it as authenticated real-world identity.
- D1 `ig_contacts` has `ig_username`, `ig_display_name`, `profile_last_checked_at`; profile lookup only when interacting and at most about once per day per user.
- History window expanded from 12 to 28 messages. `memory_summary` exists but automatic long-term summarization is NOT yet implemented.
- A second AI pass or small conversational fallback replaces common robotic replies when detected.
- Raised tester daily/burst limits to permit legitimate rapid conversation testing. Sending remains controlled by D1 allowlist and at-most-once `ig_send_attempts`.
- No generic automatic introduction was added. When explicitly asked if AI/digital, Nina answers transparently in character.

## Current safeguards
- `ig_autoreply_config.mode = tester`; one authorized tester only. Public auto replies disabled.
- No sending of older drafts or automatic retries after uncertain outcomes.
- STOP/START optout and D1 per-message send reservations remain.
- EU legal transparency for automated public DMs remains a separate pre-public-launch requirement.
- Nina privacy page updated to mention optional public sender username/display-name processing.

## Next step
1. Authorized tester sends a new DM asking for the visible profile name or a normal conversation question.
2. Check D1 for the draft, outgoing send status, the username/display-name retrieval result, and answer quality.
3. If Meta does not provide profile name, retain honest natural fallbacks; do not invent it.
4. Continue persona testing on several turns, especially music, personal curiosity, frustration, and repeated questions.
5. Only after user approval and transparency review, consider public sending; do not assume being Published in Meta enables broad app permissions.

## Site and privacy
- `nina-instagram/privacy/index.html`
- `nina-instagram/data-deletion/index.html`
- Cloudflare is the deployed code source; there is no GitHub-managed automatic deploy for this Worker yet.
