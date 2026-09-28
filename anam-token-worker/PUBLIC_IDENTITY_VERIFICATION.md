# Public identity correction, 2026-09-28

Problem: a visitor asked about Alejandro Molinari and Nina denied knowing him without a recorded Knowledge lookup. The legacy prompt partition treated every paragraph containing Alejandro as private. The checked-in core also lacked an explicit public introduction. Neither finding alone proves the full cause of the historical reply.

## Changes

- Every assembled session receives a reviewed public identity: Alejandro is a producer/DJ, founded Parallel Vision, and Nina knows him through that project.
- Public recognition is distinct from authentication and private memories. Missing public details require shared Knowledge lookup; an empty result does not erase supplied identity.
- Explicit `PUBLIC IDENTITY`, `PUBLIC CANON` and `PUBLIC PROFILE` sections survive name filtering. `PRIVATE OWNER CONTEXT` and legacy owner headings stay private, including their nested headings.
- Unmarked legacy paragraphs containing Alejandro remain restricted until the live Lab prompt can be reviewed and migrated. Removing that fallback blindly could expose old private content.
- The fallback Knowledge description identifies Alejandro's public work. Valid inherited shared-tool descriptions remain intact; public lookup guidance is also in every assembled prompt.
- Runtime revision: `conversation16-public-identity`.

No model, voice, avatar, D1 records, visitor authentication, private recall access or Knowledge folder IDs are changed. The stored Anam persona and PDFs are not edited.

## Verification

44 focused tests pass, including authenticated visitor session construction, explicit public facts, nested and adjacent private sections, restored enclosing public scope, owner access, and rejection of a visitor's attempted owner/folder override.

The complete suite before the final added scope test reported 477 passing, 1 failing and 2 skipped. The failure is the unchanged `account migration and frontend preserve profile-memory separation` test, which expects `Newsletter</a>` in the unchanged homepage. This patch does not change those files or suppress that test.

Worker compilation succeeds. An independent review found no blocking privacy issue.

## Remaining live validation

Anam Lab asks for sign-in in the available browser. The saved live prompt, contents/indexing of Shared Canon and real model replies have not been verified by these tests. A new visitor session should be checked with: who is Alejandro Molinari; a specific public detail absent from this identity block; and a request for another person's private conversation. Configuration tests do not prove retrieval or spoken behavior.
