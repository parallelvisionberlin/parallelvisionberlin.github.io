# PV LAB / Explore Moods generation and Image return
Updated: 2026-10-16

## Approved experience
- Explore Moods is an independent, photographic discovery page.
- Its shared header links to Image, Retouch, Video, Upscaler and Fashion.
- My Moods retains its existing `mood-creator.html#my-moods` scroll.
- The sixteen gallery cards, original imagery, hero and presets are unchanged.
- The Image Studio draft (prompt, references, model and settings) is preserved
  across Explore Moods / My Moods navigation using same-tab private IndexedDB.

## Existing generation (live and tested)
- After a valid photo or direction, Generate is immediately clickable.
- Credit price remains the exact server-bound quote, quietly outside the button.
- A single click asynchronously prepares photo, references and quote, then makes
  only one confirmed paid submission. Do not auto-retry an uncertain POST.
- Generation progress and its original image appear inside the selected Mood
  dialog without redirecting to Studio.
- The active result view temporarily hides the upload form, keeping the artwork
  full height and the result visible within the viewport.
- Completed results offer Download, Open in Studio and Make another.
- Make another returns to the same file/direction without an automatic charge.
- The backend/Worker credit checks, providers and archive stay unchanged.
- Screenshot-confirmed compact result revision: merged commit
  `d8da8e76b381d06be1aa8f9c1d8373b55116a193`.
- Live deployment verification: GitHub Action 38835967593, passed.

## 2026-10-16 upload feedback and no-layout-jump correction
- Oversize/invalid file uploads were rejected but their generic status appeared
  away from the upload target, and the upload thumbnail's separate Remove text
  added a layout row.
- The new upload overlay is inside the fixed-size dropzone: an explicit
  “Image too large”, exact size and “Maximum 20 MB” message, followed by
  Choose another photo and Dismiss. Not red, high contrast, keyboard accessible.
- Rejections happen before any upload, quote or paid generation.
- If replacing a previously valid photo with a rejected one, retain the valid
  file but block Generate until the error is dismissed or corrected.
- Replace the tiny Remove selected photo link with a charcoal/white × icon
  overlay on the uploaded thumbnail, with accessible label and hover title.
- Keep the editor modal's original height frozen from the empty state, before
  applying an input from a gallery drop; use its existing internal scroll
  when needed. The upload area itself stays 130px / 110px on mobile.
- The image uploader remains browser-local; no provider or Worker changes.
- Tests cover direct card drop, file picker rejection, no layout shift, icon,
  valid-photo preservation and zero paid submissions for invalid inputs.

## Relevant files
- lab/explore-moods.js, lab/explore-moods-editorial.css, lab/moods.html
- lab/explore-moods-nav.css, lab/mood-handoff.js
- lab/MOODS-FLOW-WORK-STATE.md, lab/README.md
- tests/lab-explore-generation.mjs, tests/lab-moods-inline-return.test.mjs
- All other Studio, provider, authentication and pricing files unchanged.

## Validation and deployment
- Upload feedback patch merged via PR #246; verified source commit
  `bd5a87db266aa5cb3e9f832b75316c9b12cd22a9`.
- GitHub Lab tests passed, and Playwright Explore Generate run
  `38837475487` passed all desktop/mobile and invalid-upload cases
  (including card-drop oversize), with zero real paid provider jobs.
- Production verifier `38837902255` passed at 2026-10-16 01:58 UTC,
  fetching the exact new HTML, JS and CSS from `https://pvlab.studio/moods`.
- Paid provider quality was not tested for this UI-only patch.
- Next action: ask user to refresh and verify upload, removal and dismissal
  in their own browser. No additional API, billing or provider deployment.

## 2026-10-16 photochemical Mood loading
- Replaced the narrow spinner strip with a full-width darkroom / latent-exposure
  animation inside the existing result frame. The Mood poster and dialog
  geometry remain unchanged. No synthetic image previews or fake percentages.
- Components: `lab/moods.html`, `lab/explore-moods-nav.css`,
  `lab/explore-moods.js`; no provider, billing or API changes.
- Existing verified queued/running/saving messages remain in the aria-live
  status. A failed or uncertain submission freezes motion and directs the user
  to Image History. Reduced-motion preferences disable animations.
- A completed image softly resolves into view; no new network assets.
- PR #255 merged into main as `a0d95d30c75e2c4d887c2d9494f1105232bc6604`.
  Cloudflare Pages reports a successful deployment for that commit.
- PR checks: Explore Generate browser run `38914382444` and Lab tests
  `38914382440` passed. Covers desktop/mobile sizing, errors and one paid
  request per click with mocked backend.
- Two unrelated Image Studio/Soul browser suites also failed on the baseline
  main commit `69af2df591ea1d927214ce0d2ecbfb086361333c`; not changed here.
- Direct visual verification on pvlab.studio could not be completed from this
  environment. Next: refresh `https://pvlab.studio/moods` and confirm the
  animation's look on desktop/mobile before further polish.
