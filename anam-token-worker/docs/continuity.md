# Private relationship continuity

Apply `migrations/20260912_relationship_continuity.sql` before setting
`NINA_CONTINUITY_ENABLED=true` on the Worker. The migration is additive and
repeatable. Existing summaries and conversation records remain intact.

## Agreements

`nina_agreement_events` stores explicit proposals and acceptances with their
message IDs, exact evidence, speaker roles and dates. It assigns no default
relationship label. Clear pairs are captured after messages are stored; the
conversation-close pass also checks model-assisted extraction against actual
messages. Invalid model output cannot advance the extraction cursor.

Automatic memory summaries and the relationship-tone evaluator cannot write
this table. Session context loads the latest event for each agreement key.
An explicit ending can be unilateral; a new mutual agreement can supersede it.
Older events remain available. Ordinary criticism or a temporary mood is not
an ending. Exclusivity requires its own evidence.

Extraction is deliberately conservative. The close pass considers the latest
120 messages; clear live agreements are captured throughout the call. Ambiguous
phrasing may need clarification and must not be treated as a guaranteed write.
Historical restoration should cite exact existing message IDs; never set a
relationship label merely because an account has the owner role.

## Context scopes

`nina_private_context` is selected by the verified account ID and appended only
to that account's session. Keep personal profile text out of public source files.
Legacy Alejandro paragraphs in the saved Anam prompt are removed from other
accounts' session prompts. This compatibility filter is not a general-purpose
privacy classifier: the saved shared persona should contain only shared canon.

The existing `NINA_KNOWLEDGE_FOLDER_ID` is available to owner sessions. Other
accounts use only `NINA_PUBLIC_KNOWLEDGE_FOLDER_ID`. Set the latter after auditing
its documents for shared canon; an unset value means no shared Knowledge tool.
This does not modify the Anam Lab persona or share links that bypass this Worker.

## Tools

The Worker discovers organization system tools through the paginated Anam API
and attaches the actual `skip_turn` and `pause_conversation` IDs. The owner-only
runtime diagnostic reports attachment and missing tools. Prompt text alone is
not proof that the engine can execute a tool. Live voice behavior needs a call.

`recall_private_memory` is an inline server webhook. A random, short-lived token
binds each call to one verified account, visitor and active conversation. Only
its hash is stored in D1. The model supplies a query, never a user ID. Lookup is
keyword based, returns sourced prior passages, and stops at conversation end,
expiry or 40 calls. Credentials and transcript text must not be logged.

Account or conversation deletion removes dependent agreement and tool-session
rows. Clearing all memory also removes the private profile. A derived-summary
reset preserves the agreement ledger.

Privacy is account based. A second person speaking through an already open
account session is not independently authenticated; the application must start
a separate session to establish another account's scope.

## Verification

Run `npm test --prefix anam-token-worker`. The continuity suite uses real SQLite,
the actual migrations, synthetic JWTs and mocked external APIs. It checks
agreement survival, later changes, false candidates, deletion, scoped recall,
token expiry, pagination and the session payload for two distinct accounts.

Roll back Worker code or disable the feature flag if needed; leave the additive
tables in place so recorded agreements survive rollback. Privacy filtering of
the shared prompt remains active independently of that flag.
