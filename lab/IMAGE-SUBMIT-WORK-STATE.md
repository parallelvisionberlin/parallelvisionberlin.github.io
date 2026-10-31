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
- Prompt-paste and desktop/mobile Studio layout browser checks: passed.
- GitHub: full private-lab, queue-smoke, approved-image-ui, Generate, appearance,
  compact-image-prompt and image-prompt-paste checks passed.
- First-image suite: existing Inspiration backdrop mismatch reproduced on unchanged main.
- Other inspected CI failures concern Video Extend visibility and an obsolete Beauty Studio link.
- PR #739 merged; production source: `af37ed2e27ac6e7e7151f70fa94dcba3a3a1fbc8`.
- Cloudflare Pages check `124604690295`: completed successfully for this source.
- Scoped release verifier: `LIVE_VERIFIED` at `https://pvlab.studio/studio`.
- Production `lab.js` SHA-256: `9a10db39053444e32d33aeccc391755fce2b704de2edbf6700e6dade9c76200f`.
- Real signed-in paid generation: not performed.
- Next action: owner can reload Studio and use deliberate repeated Generate clicks.
- Queue capacity and uncertain-job review may still disable Generate for their existing reasons.
