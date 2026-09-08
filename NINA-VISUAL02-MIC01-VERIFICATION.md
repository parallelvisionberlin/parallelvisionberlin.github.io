# VISUAL 02 / MIC 01

Verified source: 2d2657f5784c751dbdf0646016432cce33df93da.
CI: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/34289068973
Native application source: af30ee9103d76c0b2c1c8982440caa9007ebece0, version 0.4.1.
Profile marker: LOGIN 03 / BRIDGE 01 · VISUAL 02 / MIC 01.

## Visual changes

The app-only pre-call stage now uses assets/optimized/nina-fok/Canon.webp, the portrait used by the browser entrance. The previous dark blurred pseudo-element is disabled. Controls fit the tested 390x720 and 390x540 viewports. Referral promotions are hidden on this route; actual credit eligibility remains visible.

Home keeps the animated red-mask hero. The native Nina tab has a different window portrait, its own heading and continuity section instead of repeating Home. Native live mode hides its header and status bar when the engine reports NINA ONLINE, with a safe-area floating close button. Non-online/error states restore the header. The WebView stays mounted during this layout change.

## Microphone changes

App-only microphone ownership maintains one active capture stream, shares concurrent requests, cancels late permission results, and releases capture on close, eligibility failure, or disconnected input. A saved input that no longer exists can fall back to the system route; permission denial is not repeatedly retried. Device-list changes do not silently acquire a replacement microphone during a call.

The app requests echo cancellation, noise suppression and automatic gain control as ideal constraints only where the device reports support. No manual gain amplification, forced 48 kHz/mono settings, or global getUserMedia monkeypatch. The diagnostic UI displays the selected track label and processing settings actually reported, or 'not reported'.

MICROPHONE > TEST MICROPHONE opens an optional eight-second input test. An analyser reads the existing stream locally; it does not record, send audio, create an Anam session or connect audio to speakers. A scalar input meter and peak/low-level warnings are advisory. They do not assess speech intelligibility, recognition accuracy or internet quality. The microphone is released after the test or reused if the user starts a conversation during it. Brief mute events can recover; persistent mute and ended tracks produce a retryable interruption rather than leaving a silently dead input.

## Checks that passed

- Node microphone tests: supported constraints, finite RMS/peak readings, one stream for concurrent requests, late permission cancellation, missing-device fallback, no re-prompt after denial, ended-event cleanup, temporary vs persistent interruption, unavailable meter, analyser cleanup.
- Existing bridge identity/protocol tests plus native immersive-state predicate and layout-source checks.
- Seven original browser identity/lifecycle scenarios in Chromium and in WebKit.
- Six extra scenarios in each engine: Canon portrait and hidden promotion, short-viewport layout, test-to-call stream reuse, timed input release, ended microphone recovery, and eligibility loss while testing.
- Clean npm ci, native tests, iOS JavaScript/Hermes export and Expo iOS prebuild with icon generation.

Auth provider and token bridge, server authorization, owner access, prices, memory and credit rules were not changed. The public website retains its prior capture behavior; the new capture controller activates only on /nina-app.html.

## Not verified here

These tests mock native identity, media tracks, worker replies and Anam streaming. Screenshots are browser renders, not physical iPhone captures. Real microphone routing, Bluetooth, acoustic level, recognition quality, interruption behavior, and the native immersive appearance still need testing in the installed preview. No real call or credit purchase was made. Xcode signing/App Store review was not performed. Dependency audit warnings were not fixed with forced upgrades.
