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
- Studio's account My Moods link and footer Moods link save the same draft.
- My Moods' Image and footer Studio links restore the draft on return.
- The return snapshot is scoped to the current browser tab and Clerk user.
- No new provider route, price, credit, account, or payment behavior.

## 2026-10-16: Immediate Generate and caption alignment
- Dream Blur's gallery card no longer has its own oversized font override.
  It inherits the exact weight, size and spacing of all other Mood captions.
- The quick Mood dialog enables Generate immediately after a photo or
  non-empty direction is entered, without waiting for upload or quote.
- The button says only "Generate". A successful verified quote can appear as
  understated "N credits per image" text below, never inside the button.
- Background preparation still warms uploads and quote but never blocks the button.
  If clicked early, the first click immediately reveals an expanding result
  placeholder and completes the *same* authenticated preflight before submission.
- Quote work is deduplicated per current photo/prompt revision; stale quotes are
  ignored after edits. Only one explicit confirmed /api/jobs POST is possible.
- During the click, progress changes Preparing photograph -> Sending image ->
  live queued/running/saving status -> private image + Download.
- A sign-in request preserves the photo and prompt; a failed preflight can be
  retried without cost. If a job POST is uncertain, no second paid submission is
  offered until History is checked.
- Scoped to lab/explore-moods.js, lab/moods.html,
  lab/explore-moods-editorial.css, and relevant regression tests.
- No provider, Worker, wallet or credit-pricing changes.

## 2026-10-16: Compact in-dialog generation (screenshot feedback)
- Reported: clicking Generate caused the full upload form and preview frame
  to stack, putting the image below the modal viewport behind a scrollbar.
  Sticky left artwork also ended above the dark modal bottom.
- Fix: after Generate, the existing right-side form is temporarily hidden
  and replaced by a focused status/result pane. The Mood title and description
  remain, while the left artwork fills the full modal height.
- Responsive preview box reserves a bounded space for loading and output.
  No jump when the image arrives. The whole modal remains within desktop
  viewport; compact mobile layout scrolls only if the screen is very short.
- Finished result offers Download, Open in Studio and Make another.
  Make another returns to the same reference photo and direction, without
  generating or charging automatically.
- Preflight failure restores the original form and shows its error; uncertain
  submission still requires checking History before a new paid attempt.
- No changes to API, quote, billing, account, media generation or Mood presets.
- Relevant files: explore-moods-nav.css, explore-moods.js, moods.html,
  tests/lab-explore-generation.mjs, this checkpoint.

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
- Original unified navigation and inline results verified on production on 2026-10-16.
- New immediate-Generate change: PR, CI and production verification pending.
