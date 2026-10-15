# PV LAB / Explore Moods and Image return
Updated: 2026-10-16

## Objective
Keep Explore Moods as a standalone photographic discovery world.
Use the Image Studio navigation in its header, retain the My Moods
scroll-to-collection action, and show completed generations inside
the expanded Mood dialog, with optional Image Studio continuation.

## Approved behavior
- Header tools: Image, Retouch, Video, Upscaler, Fashion, Explore Moods.
- My Moods links to the existing mood-creator.html#my-moods section.
- The page's editorial hero, sixteen Mood cards and creator sections stay intact.
- Generate uses the existing live SpicyAPI quote and one explicit confirmed submit.
- The dialog reserves a preview frame while the accepted job runs.
- Authenticated polling reads the exact job and original output from the Worker.
- Result preview and Download appear without redirecting; Open in Studio is optional.
- Closing the dialog leaves any accepted job safely in Image History.
- Returning through header tool links restores Image prompt, model, references,
  roles, exact prompt, Mood and image settings from browser-only temporary storage.
- The return snapshot is scoped to the current browser tab and Clerk user.
- No new provider route, price, credit, account, or payment behavior.

## Source files
- lab/moods.html, lab/explore-moods-nav.css, lab/explore-moods.js
- lab/app-mood-generation.js, lab/studio.html, lab/lab.js
- lab/studio-return-draft.js, tests/lab-moods-inline-return.mjs
- lab/README.md, this work state

## Checks and deployment
- Static anchors and generation-submit path checked during implementation.
- Actual generation deliberately not triggered for testing because it spends credits.
- Confirm the GitHub commit and Pages/Cloudflare deployment independently.
- Browser QA: desktop/mobile headers, My Moods anchor, Studio state after return,
  a successful real Mood job, downloaded file, and no duplicate charge.
- Production status: pending commit and deployment verification.
