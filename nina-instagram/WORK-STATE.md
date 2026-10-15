# Nina Instagram: verified owner-continuity work state
Updated: 2026-10-15

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
