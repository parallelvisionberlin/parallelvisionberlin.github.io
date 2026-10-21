# Video History card downloads: work state

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
- Release pending: run relevant CI, merge and verify Cloudflare plus the actual production asset revisions before claiming live.
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
