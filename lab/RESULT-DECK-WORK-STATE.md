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
- Verified feature source: 6e2c10dac0744b89b8593c47fbb3167cd50bdb59; all ten PR workflows passed.
- Viewer/queue workflow 38287871612 and full video/reference regression 38287871766 passed.
- Reviewed desktop 1440 px and mobile 320 px screenshots; artifact 11764257448.
- All six reference downloads matched their own original bytes; Video Studio handoff passed.
- Published implementation: c5e551770931425d2bf93eecbdb512fca90557c0, PR #169.
- Confirmed public studio.html, image-result-deck.css and lab.js: HTTP 200 and exact verified-source hashes.
- Live destination: https://parallelvisionlabel.com/lab/studio.html
- Complete and confirmed live on 2026-10-12; no paid generations or live account mutations were used.

## Video handoff follow-up, 2026-10-12
- User requested removing the persistent handoff message and matching the right panel height to the media card.
- References: image(20261012-190843).png and image(20261012-191108).png.
- User also approved a warm-white Generate button matching the Image deck.
- Baseline: c980a84; changes scoped to lab.js, studio.html and video-refresh.css.
- Handoff clears old video selection, preserves the selected Start frame and opens the feed at its top.
- Success is shown inline; no persistent overlay. History selection still restores normal video details/actions.
- Preview and right inspector share one desktop height; mobile retains its stacked layout.
- Existing viewer and layout browser checks cover these fixes without paid generation.
- Verified source: 4173d338d83f8bf728eb45bd8d8f8d6990d27674; all ten PR workflows passed.
- Video/browser regression 38297210579 and image handoff checks 38297210509 passed.
- Desktop warm-white Generate and mobile screenshots reviewed; artifact 11768978866.
- Published implementation: e078e33cebb76bf2ba15dc3ccb34e27b0045ae28, PR #172.
- Public verification: all three UI files HTTP 200, exact CSS bytes and new HTML/JS handoff markers.
- Concurrent site updates are retained in public HTML/JS; the original persistent banner is absent.
- Confirmed live on 2026-10-12; no paid generation. Complete.

## Video processing stage, 2026-10-16
- Request: on confirmed video generation, replace the large Start frame with a true live-status panel; preserve the original thumbnail and prompt in the left composer.
- Source baseline: e34854e6d55e0fba36e71faac130b238be2addfa. PR #240 from `fix/video-processing-stage-20261016`.
- Implementation: `lab/studio.html` mounts the hidden accessible stage; `lab/video-refresh.css` styles the neutral animated panel; `lab/lab.js` follows Submitting, Queued, Running, Saving, Ready, Failed and Uncertain states from actual jobs.
- The panel appears at paid confirmation, then selects the accepted History job; polling and History selection update it. Completed media opens with the existing viewer flow. No fictional percentage, paid auto-retry or unsupported Cancel button.
- Only Video presentation was changed; quote, provider, credits, image, retouch, upscaling and stored source logic are preserved.
- `tests/lab-image-viewer-browser.mjs` now verifies queued, running and failed states with the source thumbnail retained at 1440 and 390 px (three source shapes).
- PR browser logs show six successful image-viewer test iterations. Static validation, Lab tests and several other suites pass. The same five broader workflow failures also occurred in the immediately preceding merged PR #239, before these changes.
- Release verification: merge to main and independently confirm published HTML/JS/CSS before claiming live. No paid generation was made for testing.
