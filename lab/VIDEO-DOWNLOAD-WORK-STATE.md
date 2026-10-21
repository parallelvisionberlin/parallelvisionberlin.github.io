# Video History card downloads: work state

## Current: separate phone card controls (2026-10-21)
- User reference: IMG_7915.png. Scope explicitly limited to phone cards, <=640px.
- Source baseline: 8a5be639a5b6ddf50f7622880fc0d1a9b1c4e605.
- Keep Favorite in the upper-right corner. Anchor Download at the lower-right of the thumbnail, immediately above the image/text boundary.
- Hide the redundant lower Video badge on phones; retain the existing PLAY VIDEO affordance on the thumbnail.
- Desktop positions, playback/download handlers, 44px download target and selection behavior remain unchanged.
- Product files: lab/video-refresh.css and lab/studio.html cache revision 20261021-mobile-controls1.
- Existing gallery browser coverage checks non-overlap, the exact thumbnail boundary, one visible play affordance and unchanged desktop placement; CI retains two synthetic screenshots.
- Local approved Image and scoped Video unit checks: 16 passed; whitespace check passed.
- Release pending: verify browser CI, merge, and confirm Cloudflare and the live stylesheet bytes.

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
