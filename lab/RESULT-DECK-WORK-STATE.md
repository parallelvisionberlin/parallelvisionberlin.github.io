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

## Video gallery playback and status, 2026-10-16
- Follow-up to PR #240. Screenshot showed two completed jobs rendered as original input stills while the large player was offscreen inside the center feed.
- Root cause: `renderCards` called `showVideoHistoryRecord(...,{play:true})`, whose `openVideo(...,{scroll:false})` never returned the independently scrolled video feed to the top.
- PR #242: selecting a video now reveals the large player immediately, shows Loading while retrieving stored MP4, and retains Completed in Details when backend confirms it. The passive stage says Saved, not Ready; queued/running/saving retain their actual states.
- A failed media fetch shows a retryable loading error, not a failed paid generation. No extra paid attempt, retry request or generated asset mutation.
- Video History becomes uniform 16:9 auto-fill cards with compact metadata and a Play Video label. Source stills use contain fit, avoiding unwanted portrait crop.
- Scoped implementation: `lab/lab.js`, `lab/video-refresh.css`, `lab/studio.html`; regression: `tests/lab-image-viewer-browser.mjs` with delayed MP4, 1440/390 pixel viewports and no paid APIs.
- Verified PR #242 browser checks: `Lab tests` gallery-browser and private-lab both passed on final source head `9518f398`; the fastqueue suite also passed its held-download video/gallery step. Other unrelated PR browser workflows retain earlier known failures.
- Published to the repository main branch by squash merge `c1a12a6750053072b9be873ead2fc8969a365101` on 2026-10-16; current main `lab.js`, `studio.html`, `video-refresh.css` and test each contain the change. Independent public HTTP check was blocked by tool/network access. Live Cloudflare propagation and authenticated actual-video playback have not been independently checked.

## Video confirmation banner cleanup, 2026-10-16
- Approved: remove the duplicated Video “Generation request recorded” success banner; keep the real Queued / Generating / Saving stage and History access.
- `lab/lab.js` clears the shared notice after a confirmed active or completed Video submission. Failed, resolved and uncertain requests retain their error notices; Image and Upscale notices remain unchanged.
- `lab/detail-video-studio.css` hides the now-empty Video notice element; `lab/studio.html` refreshes only these assets' cache versions.
- No model, billing, video submission, provider, backend, or stored job behavior changed. No paid job was started for validation.
- Source-level checks completed; repository publication and independent live verification are separate.

## Image gallery right-side gaps at browser zoom, 2026-10-21
- Owner screenshot: image(20261021-095646).png, Library libfile_76d84e6908f08191a6a9c817691c7505.
- User isolated the symptom to browser zoom 90%; 100% looks correct.
- Baseline: main a48aee5a7587c463ae04cd3ae50ccebc7ad41639.
- Reproduced with synthetic cards, real Lab CSS and fractional gallery widths in Chromium.
- Root cause: gallery-layout.js uses integer-rounded clientWidth as its flex row budget. It can exceed the actual fractional width, wrapping a final card and producing large right-side holes.
- Example before: actual width 1905.5px, clientWidth 1906px, completed row gap 635.5px. At width 2116.65625px, gaps reached 529.406px.
- Minimal fix: floor the measured getBoundingClientRect width before calculating rows. Only the shared gallery module changes; no account-role branch or gallery redesign.
- Existing integer-width 1905px layout is unchanged. Corrected fractional completed rows leave less than 1px tolerance instead of dropping a card.
- The intentionally incomplete final row remains unstretched, preserving original image proportions.
- Applies to shared web Image, Assets and Upscaler galleries for owner/customer accounts. Native gallery grid branch remains unchanged.
- studio.html increments only the gallery-layout.js cache revision to 20261021-zoom-row-fit1.
- New browser regression tests/lab-gallery-layout-ui.mjs covers 21 mode/width combinations plus native grid isolation, using synthetic cards with actual CSS and no account/provider calls.
- Local verification: 21 gallery cases and all four approved Image UI contract tests passed. Existing owner/customer account browser suite also passed, including private-state, billing guards and 1440/390/320px shared menus.
- Dedicated CI: .github/workflows/lab-gallery-layout.yml. No prompt deck, Mood recipe, auth, billing, provider or saved-photo changes.
- Publication and real signed-in owner/customer browser zoom remain to be verified separately; synthetic fractional-width tests are not a live account check.
- After these requested fixes are complete, remind Alejandro to test recreation/login using alejandro.molinari.c@gmail.com, which he reported deleting. Do not assume same-email recreation succeeds before testing.

## Immersive result viewer, 2026-10-29
- Requested visual target: screenshots of PV LAB viewer and Higgsfield modal. Enlarge the photo, hide the viewer's branded top strip, maximize the usable desktop canvas. Higgsfield's underlying generation composer screenshot is reference context, not an instruction to replace the approved PV LAB prompt deck.
- Source branch: `design/image-result-immersive-20261029` from current main, review pending.
- Desktop web at 961px+: media fills full viewer height; top controls become a floating counter and Fit action. Bottom metadata stays legible as a lightweight image overlay. Right inspector narrows to 304–336px so the photograph gets more width. Full image remains uncropped with zoom behavior retained.
- Keep original image/action state, reference navigation, Download, video handoff, prompt control geometry, mobile and native layouts unchanged. No backend, credits or model changes.
- Files: `lab/image-result-deck.css`, stylesheet cache version in `lab/studio.html`, this checkpoint.
- Verify Image UI contract, image viewer browser/desktop responsiveness, and live Cloudflare deployment before claiming publication. No paid generation required.


## Image history: four results per row, 2026-10-31
- Request: match the supplied Higgsfield screenshots with four results in each desktop row and full 9:16 portraits. References: image(20261031-155916).png (PV LAB), image(20261031-160011).png and image(20261031-160051).png (Higgsfield).
- Source baseline: main `9802d76cb2fc1c78449e0b72b226a4bd286c5a57`; branch `codex/image-history-four-columns`.
- `lab/gallery-layout.js`: Image rows group four results above 1020px, three at tablet widths, two at 740px or below. Each row shares a height, with widths following stored image proportions. Existing 2px seams, chronological order and uncropped media are retained.
- A partial last row does not enlarge its remaining images. Native, Assets and Upscaler layouts retain their previous behavior. Composer, models, credits and generation logic are unchanged.
- `lab/image-studio.css`: align the pre-JavaScript fallback to four desktop columns. `lab/studio.html`: refresh only those two asset versions.
- `tests/lab-gallery-layout-ui.mjs`: 34 browser cases pass, including 320/390px phones, tablet boundaries, desktop, fractional zoom widths, mixed ratios, full 9:16 rows, partial rows and native isolation. Approved Image UI contract: 5/5. JavaScript syntax and diff whitespace checks pass.
- Rendered local preview inspected at 1348px: four portrait cards share one row at their original proportions. No paid generation or account mutation.
- Local implementation commit: `9fc1be8`. All four preview images loaded and the browser confirmed their stored proportions. Responsive tests also use actual matching viewport widths.
- Owner explicitly approved push and publication in the follow-up message. Shell Git push has no usable authentication; publication uses the connected GitHub integration with the exact reviewed local bytes. Current main was integrated to preserve its separate studio.html update; no gallery source conflict. Real signed-in history remains unverified.
- Release complete: PR #737 merged as `a09d043b49b69b7440948a83ef93df8f56b70c3e`. Cloudflare Pages check `124590586757` confirms successful deployment to project pvlab-studio.
- Production verifier returned LIVE_VERIFIED for both `gallery-layout.js` and `image-studio.css`, version `20261031-four-image-rows1`. SHA-256: JS `3a16535a689d26cd152c691526333366365487ac5ebfab8d1e58814fa5f3d1b0`; CSS `8e85b5ee07679f84679faff9aab2ce43e4c4de5036599f5e2e1c3b124e7002c5`.
- PR checks passed: gallery, gallery-browser, approved-image-ui, unit, static validation. Broader Video Extend and Upscaler visual failures were compared against main and are identical. First-image Inspiration background and legacy Beauty Studio link checks also fail outside this gallery scope.
- Final release checkpoint is retained on `codex/image-history-four-columns` to avoid an additional production deployment for documentation alone. Main contains the implementation and its pre-release checkpoint.
- Next action: no further implementation work. Real signed-in History observation remains separate from source, synthetic browser and production-byte verification.
