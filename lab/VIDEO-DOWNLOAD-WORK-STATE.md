# Video History card downloads: work state

Updated: 2026-10-21
Scope: A visible Download video button on completed Video Studio History cards.
Repository: parallelvisionberlin/parallelvisionberlin.github.io
Source base: 876b9548a6e8495c0317f899a37c440f65c3b10a
Previous release: f5e7fab0f31bc804d8e74104f887aebdce7fc1da on main.
Active revision: user requested a smaller control after seeing the full-width button.

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
- Lab tests run 39516690715 passed both private-lab and gallery-browser jobs.
- Desktop/mobile gallery, original downloads and account-cache checks passed.
- Required approved Image UI contract, static validation and Motion Effects checks passed.
- Broader video integration run 39516690798 passed desktop/mobile Video layout,
  then stopped at the unrelated 390px Image dock two-row assertion (line 937).
- Cloudflare Pages reports successful deployment of f5e7fab.
- Live pvlab.studio/studio?tool=video serves cardDownload=20261021v1.
- Production browser CSSOM contains all four download visibility/size/focus rules.
- Existing tests/lab-image-viewer-browser.mjs covers desktop/mobile Video History,
  selecting saved videos, original-media retrieval and gallery layout.
- Live browser is signed out; private owner History cannot be inspected there.
- No paid generation or private video download is needed for verification.

## Next action
- Compact revision: local checks, publish and live verification pending.
- Suggested future improvement only: use finished-video frames as card thumbnails;
  current source-frame thumbnails and playback behavior remain unchanged.
