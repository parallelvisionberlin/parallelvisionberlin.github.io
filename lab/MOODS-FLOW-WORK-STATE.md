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
- New upload correction: source and browser checks pending on PR.
- No real paid generation triggered by tests.
- After merge verify GitHub Pages publication and exact live
  `pvlab.studio/moods` JavaScript, stylesheet and markup before saying live.
