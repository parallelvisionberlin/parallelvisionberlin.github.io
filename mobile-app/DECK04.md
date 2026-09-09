# DECK 04: approved design implementation

Implements the user's approved mockups in app code, not another generated screenshot.

## Changes

HOME uses the existing website Berlin road/motorbike film, darkharmonyhero-mobile.mp4, with muted inline looping playback and no designed play-button overlay. A poster remains when playback is unavailable. HOME has a Nina feature panel and functioning links to native tabs.

The approved Nina image was cropped from the supplied mockup without generating a new picture. The 500x749 JPEG is bundled with the app, used on HOME and NINA, and served as the opt-in pre-call portrait. Mockup interface text is not part of that crop.

NINA has its own portrait panel and clear call action. The five-tab navigation uses bundled thin-outline icons. PROFILE includes the visible marker DECK 04; the older label inside AuthPanel remains unchanged.

The call keeps one WebView, a persistent safe-area header/close control, and an inset thin frame. The existing Anam live video is shown with less cropping and more room above. This does not change the Anam avatar, pose or background to the mockup's static scene.

The circular microphone button mutes and unmutes existing live audio tracks via enabled. The bars visualize input level from the existing stream through an isolated analyser. No new microphone stream, recording, gain stage or output connection is created by this UI. Before connection the native mic motif is static and is not described as listening. The live control reports MIC ON, MIC MUTED, INPUT INTERRUPTED or MICROPHONE OFF based on actual track state.

## Isolation

Web presentation opts in only on /nina-app.html?pv_deck=04. Existing app URLs and the regular website do not opt in. The working call engine was retained byte-for-byte with one appended read-only, app-scoped stream getter. Worker source, microphone acquisition, Anam streaming, native Clerk AuthPanel, dependencies and native configuration were not changed.

## Verification

Check run: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/34342480304
Tested generated source: 100093a9a3ba882626f6436e5ff3fa3fd97bb143

All 8 native protocol/layout-source tests passed, and the iOS JavaScript export included the portrait and six icon assets. The old test asserting hidden headers was updated to the newly approved persistent deck requirement; same-WebView and token-broker protections remain checked.

Six browser scenarios passed: Chromium and WebKit, each at 390x740, 320x520 and 430x800. Checks cover off-before-call, mute/unmute, accessible pressed state, sample-driven levels, flat bars at silence, button bounds, no microphone acquisition or track stopping, safe analyser failure, ended tracks, error UI, cleanup and old-app opt-out.

Browser tests use simulated media tracks and samples. They do not prove end-to-end iPhone call audio, recognition quality, performance, native layout at every accessibility size or real-device autoplay. Those require installation and on-device verification. No improvement in connection reliability or latency is claimed by this visual update.

Install one preview build using finish-deck04.ps1. No Cloudflare deployment or Anam prompt change is required. Keep the current app installed and install the new build over it.
