# Video History card downloads: work state

Updated: 2026-10-21
Scope: A visible Download video button on completed Video Studio History cards.
Repository: parallelvisionberlin/parallelvisionberlin.github.io
Source base: 876b9548a6e8495c0317f899a37c440f65c3b10a

## Approved behavior
- Completed video cards expose their existing Download video action directly.
- The button is always visible, including on touch screens, with a 44px target.
- Keyboard users have a visible focus outline.
- Clicking the button uses the authenticated stored output through downloadJob.
- The existing card handler excludes button clicks, so download does not open playback.
- Pending, failed, draft and outputless cards have no active download button.
- Selection mode retains its selection-only behavior.
- Image Studio, Assets, video generation, pricing and the large player are unchanged.

## Implementation
- lab/video-refresh.css: show only the existing completed-output action in Video History.
- lab/studio.html: refresh the video stylesheet cache marker, cardDownload=20261021v1.
- lab/README.md: pointer to this scoped handoff.
- lab/lab.js already creates result-download only when hasResult(job) is true.
- No JavaScript, backend, dependency or database change is needed.

## Verification and release
- Local verification: 16 approved Image/Video contract, ergonomics and scene-state checks passed.
- git diff --check passed; scoped CSS cascade and existing click/download handling reviewed.
- Deployment and browser CI verification pending at implementation time.
- Existing tests/lab-image-viewer-browser.mjs covers desktop/mobile Video History,
  selecting saved videos, original-media retrieval and gallery layout.
- Live browser is signed out; private owner History cannot be inspected there.
- No paid generation or private video download is needed for verification.

## Next action
- Publish the scoped change, verify CI and the actual pvlab.studio asset marker.
- Record confirmed release status here before finishing.
