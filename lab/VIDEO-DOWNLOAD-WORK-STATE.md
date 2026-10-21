# Video History card downloads: work state

## Current: Assets video downloads and compact phone controls (2026-10-22)
- User reference: image(20261021-230818).png, Library libfile_950076d97c788191be4bd834b88f5751.
- Published PR #428: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/428
- Reviewed source bfac1bc8ce5cce15ac9845d2eb9beaf12aefdef1; main release d4d72a9930f7e60681f1d4135b9d33dcfd4d4513.
- Cause: native Assets hides .cardbody and its Video result-download; only images previously had an overlay.
- lab/lab.js now adds the existing authenticated original-file overlay to every completed output.
- Video overlay is visible in Assets only. Video Studio keeps its existing single download action.
- lab/assets.css: Assets video overlays visible without hover; phone controls 30px with 15px glyphs.
- lab/video-refresh.css: phone Video History visible icon 26px, retaining its transparent 44px target.
- Desktop button sizes unchanged. Pending/failed/outputless jobs have no overlay; selection mode hides overlays.
- lab/studio.html refreshes the JS and both affected CSS cache markers.
- No paid generation, provider, billing, account, storage or backend change.
- Local verification: approved Image contract 5 passed; scoped Video tests 20 passed; syntax and diff checks passed.
- Extended tests/lab-image-viewer-browser.mjs passed all 1440/390px × landscape/portrait/square cases.
- Coverage includes production native Assets skin, visible overlays, phone sizing, Favorite separation, original MP4 download, no playback, and selection mode.
- PR CI gallery-browser, video, private-lab, approved-image-ui and other relevant UI checks passed.
- Full CI was 25 success / 4 failure, not all green. Remaining failures: queue-smoke Chromium CDN TLS/download installation; generate harness timeout at tests/lab-explore-generation.mjs:344; separate production verify; existing Upscaler #canvas-import assertion tests/lab-assets-ui.cjs:281.
- The same Upscaler assertion predates this patch, recorded in IMAGE-PROMPT-WORK-STATE.md. No unrelated tests or gates were weakened.
- Automatic review initially rejected publication; user explicitly authorized it on 2026-10-22. Published via GitHub connection because terminal push had no credential.
- Cloudflare Pages check 119546114411 succeeded for pvlab-studio, deployment 6ce865a3-6d8c-4674-a0dd-9781fd42745e.
- Read-only verifier returned LIVE_VERIFIED for all three affected assets against the exact main release.
- assets.css?v=20261022-video-download1 SHA-256 731ed078447dbc4e19728085f17fa9cab01eb58c764ed78eb967e65b40864722.
- video-refresh.css?v=20261022-compact-download1 SHA-256 32499c92c9ee96d17b3d80ac8b8540fb3bfbb1e0c6ea7ec9e0c6e183712e30c1.
- lab.js SHA-256 ae78ee36c7c09784408ce55161b4d4556315732ea68b059378418c42e963a36b.
- Production browser CSSOM independently confirms the new asset versions, Assets video visibility rule, 30px phone overlay and 26px phone Video icon.
- Production browser is signed out. Real private owner History was not inspected; browser download tests used synthetic media.
- Complete and published. No additional deployment or paid test needed for this correction.

## Current: separate phone card controls (2026-10-21)
- User reference: IMG_7915.png. Scope explicitly limited to phone cards, <=640px.
- Source baseline: 8a5be639a5b6ddf50f7622880fc0d1a9b1c4e605.
- Keep Favorite in the upper-right corner. Anchor Download at the lower-right of the thumbnail, immediately above the image/text boundary.
- Hide the redundant lower Video badge on phones; retain the existing PLAY VIDEO affordance on the thumbnail.
- Desktop positions, playback/download handlers, 44px download target and selection behavior remain unchanged.
- Product files: lab/video-refresh.css and lab/studio.html cache revision 20261021-mobile-controls1.
- Existing gallery browser coverage checks non-overlap, the exact thumbnail boundary, one visible play affordance and unchanged desktop placement; CI retains two synthetic screenshots.
- Local approved Image and scoped Video unit checks: 16 passed; whitespace check passed.
- All 18 PR workflows passed at 777c2699a0d50867ebb2c3b4d33aaea47ff740e9. The Image prompt-paste runner initially stalled in checkout, then completed successfully without a retry or source change.
- Gallery checks passed at 1440/390px for landscape, portrait and square media; synthetic screenshots inspected from artifact 12383659645 in run 39681709074.
- PR #425 merged as d49b111632196256b6500e7b59085e9125da3530; merged CSS blob matches tested source e5ac64fb652d81541d8fdbb0fa91fae4e5659dd4.
- Cloudflare Pages check 119509409001 succeeded for pvlab-studio, deployment e3bdf4d1-a0c5-4e9e-8bce-1f8e5e3249b3.
- Release verifier returned LIVE_VERIFIED for video-refresh.css?v=20261021-mobile-controls1, SHA-256 3cff0c23e0bd700cf17c1130ca631ccd1494b14c46eb0bfd07566dc8da89b5d8.
- Complete and live. Verification used synthetic History and the production stylesheet; no private user media, paid job or account mutation was needed.

## Current: monochrome controls and quieter phone screen (2026-10-21)
- User references: IMG_7911.png and IMG_7912.jpeg, attached in this conversation.
- Source baseline: a3bfda1ca9afd67bbdc3b868c005132d614f80dc.
- Replace the platform-colored play glyph in both PLAY VIDEO and the Video badge with thin currentColor SVG triangles.
- At <=820px hide only the decorative empty stage, including its example image, introductory copy, header and footer.
- Desktop keeps the existing introductory panel. User source frames, attached-reference montages, active job states and saved video playback stay visible on every screen.
- Files: lab/lab.js, lab/assets.js, lab/assets.css, lab/video-refresh.css, lab/studio.html.
- Existing tests/lab-image-viewer-browser.mjs checks SVG controls, source/queued/saved playback visibility, and desktop/mobile empty-stage behavior.
- Local approved Image contract and scoped Video unit checks: 16 passed; JS syntax and diff whitespace pass.
- No paid generation, billing change, account change or unrelated redesign.
- All 20 PR workflows passed at 313c5b046fc7486f213bef81ce54e3eb6bcc5735. Gallery browser coverage passed 1440/390px with landscape, portrait and square media.
- PR #423 merged as 2bcf82de16b027ab2dee883e0dabf1843b953b8c. Tested video-refresh.css and assets.js blobs exactly match merged source.
- Cloudflare Pages check 119498191095 succeeded for pvlab-studio, deployment 671717b2-4e70-42ff-8e9a-1d6ea68dc5c8.
- Release verifier returned LIVE_VERIFIED for video-refresh.css?v=20261021-mobile-quiet1; SHA-256 9b952f6902f74b8e94a1aea44e072226f787cd2a4d3ac4faf50c0f42a5b3b760.
- Live browser confirmed assets.css?v=20261021-svg-play1, lab.js videoMobileQuiet=20261021-1 and the <=820px empty-only rule in the production CSSOM.
- Complete and published. Real private owner History was covered by mocked browser tests, not inspected in the signed-out production browser; no paid generation needed.
- The earlier compact Download control and its release evidence below remain intact.

Updated: 2026-10-21
Scope: A visible Download video button on completed Video Studio History cards.
Repository: parallelvisionberlin/parallelvisionberlin.github.io
Source base: 426c98e9d5c37c346fd135e5897beb620d3b7afa
Release: f021f28cd1642345e04e9f9308b053b734aca688 on main.
User requested a smaller control after seeing the initial full-width button.

## Approved behavior
- Completed video cards expose their existing Download video action directly.
- Small 30px dark download icon in the thumbnail's upper-right corner.
- Invisible 44px tap target; always visible on desktop and touch screens.
- No extra button row or added card height; accessible Download video text remains in the button.
- Keyboard users have a visible focus outline.
- Clicking the button uses the authenticated stored output through downloadJob.
- The existing card handler excludes button clicks, so download does not open playback.
- Pending, failed, draft and outputless cards have no active download button.
- Selection mode retains its selection-only behavior.
- Image Studio, Assets, video generation, pricing and the large player are unchanged.

## Implementation
- lab/video-refresh.css: show only the existing completed-output action in Video History.
- lab/studio.html: refresh the video stylesheet cache marker, cardDownload=20261021v2.
- lab/README.md: pointer to this scoped handoff.
- lab/lab.js already creates result-download only when hasResult(job) is true.
- No JavaScript, backend, dependency or database change is needed.

## Verification and release
- Local verification: 16 approved Image/Video contract, ergonomics and scene-state checks passed.
- git diff --check passed; scoped CSS cascade and existing click/download handling reviewed.
- Lab tests run 39518038955 passed both private-lab and gallery-browser jobs.
- Desktop/mobile gallery, original downloads and account-cache checks passed.
- Required approved Image UI contract and static validation passed.
- Cloudflare Pages reports successful deployment of f021f28.
- Live pvlab.studio/studio?tool=video serves cardDownload=20261021v2.
- Production browser CSSOM confirms absolute corner placement, the 30px icon,
  transparent 44px target, no added row, and hover/focus rules.
- Existing tests/lab-image-viewer-browser.mjs covers desktop/mobile Video History,
  selecting saved videos, original-media retrieval and gallery layout.
- Live browser is signed out; private owner History cannot be inspected there.
- No paid generation or private video download is needed for verification.

## Next action
- Completed and live. User can refresh Video Studio to receive the compact control.
- Suggested future improvement only: use finished-video frames as card thumbnails;
  current source-frame thumbnails and playback behavior remain unchanged.
