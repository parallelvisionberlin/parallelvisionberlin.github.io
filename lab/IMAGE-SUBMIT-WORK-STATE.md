# Image submission flow

## Objective and approved behavior
- Date: 2026-10-31.
- Verified starting main: `e4c375df3b75cebf222f561a3dd42ebe6fc3020b`.
- Owner requested Generate to become available after a two-second pause.
- Scope: existing owner Seedream 5 Pro single-image preparation handoff.
- Each explicit click freezes prompt, settings and source references.
- Identical clicks during the two-second cooldown are ignored.
- After cooldown, a deliberate identical click creates an independent variation.
- Preparations continue to occupy queue capacity until acknowledged or settled.
- Each preparation has its own ticket and History card.
- Finishing an older request cannot release a newer request's reservation.
- Early acknowledgement does not shorten accidental double-click protection.
- Existing queue limits, uncertain-job review and server spending checks remain.
- No automatic provider retries or paid test generations.
- Customer credit pricing, batches and other models retain their existing flow.

## Files
- `image-submit-handoff.js`: cooldown and independent reservation accounting.
- `lab.js`: refresh Generate when cooldown ends; clearer History progress.
- `studio.html`: cache version for the updated entry module.
- `../tests/lab-image-submit-handoff.test.mjs`: timing, overlap and sign-out checks.
- `../tests/lab-fastqueue-browser.mjs`: held quotes, identical clicks and queue limit.

## Verification and release
- Approved Image UI contract and handoff unit tests: 11 passed.
- Mock browser: identical draft unlocks in two seconds before quote response.
- Mock browser: three deliberate clicks produce exactly three independent jobs.
- Mock browser: preparation reservations enforce the queue limit.
- Worker, generation finance and customer image quotes: 120 passed.
- Required prompt, first-image and Studio layout browser checks: in progress.
- Release: not yet pushed or deployed.
- Real signed-in paid generation: not performed.
- Next action: finish browser checks, publish reviewed source, verify Cloudflare and production assets.
