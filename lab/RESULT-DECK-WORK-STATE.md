# PV LAB image result deck

## Objective and accepted design
- Date: 2026-10-12.
- User approved the editorial result deck, then authorized all five visual refinements and live publication.
- Retain the warm ivory primary action, charcoal inspector and current action arrangement.
- Keep the existing Video Studio design and image-to-video Start frame handoff.
- Approved mockup: exec-7efab214-5f46-4c61-91c3-e55780501bce.png.
- Latest comparison: user screenshots image(20261012-175029).png and image(20261012-175049).png.
- Baseline: main 33d004667b11150a2ec7d0df8e11a5bbbcac13ef; original deck PR #167.

## Current refinement
- Prompt 15 px, metadata 13 px and action labels 14 px.
- Secondary controls use filled graphite surfaces, softer borders and 8 px corners.
- Reduced media toolbar, footer and stage margins give the photo more room.
- Close is anchored at the full viewer top-right, with a 44 px target.
- Ordered, deduplicated reference thumbnails replace the single source preview.
- Each reference opens its own original and downloads its exact original bytes.
- Reference previews reuse cached thumbnails; originals load on demand.
- Async guards and object URL cleanup retain private-state isolation on navigation/close/sign-out.
- Actual original pixel dimensions appear alongside the requested resolution in Details.
- Original Download, favorites, More menu, mood actions and Video Studio handoff are preserved.
- No backend, pricing, model or paid generation changes.

## Files and validation
- Interface: lab/studio.html, lab/image-result-deck.css, lab/lab.js.
- Browser checks: tests/lab-image-viewer-browser.mjs and tests/lab-reference-ui.mjs.
- Existing queue workflow uploads result-deck desktop/mobile screenshots.
- Local JavaScript syntax and diff whitespace checks passed.
- Local Chromium cannot launch in this environment; use existing GitHub browser CI.
- Added checks for six distinct original downloads, actual dimensions and full-viewer Close position.
- Existing responsive checks cover 1920, 1440, 768, 390 and 320 px.
- Existing regression coverage includes downloads, favorite sync, menu, navigation and Video Studio handoff.
- Previous deck: all ten workflows passed; Pages deployment 38284935364 succeeded.
- Current refinements: awaiting browser CI, screenshot review and publication.
- Live destination: https://parallelvisionlabel.com/lab/studio.html
- Next action: verify the branch, merge and confirm public files match the verified source.
