# Nina app repair: BRIDGE 01

Source tested on 2026-09-08. Test run: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/34280225833
Tested generated commit: 959d3a8cd546c21868ce867e6edee852841ae9cd.

## Implemented

- Native Clerk session supplies short-lived tokens through a correlated message bridge. The worker verifies the token before the live page receives an authenticated identity. No second Clerk web client on the app-only route.
- Removed JWT cookie injection and automatic redirects back to Profile on a live authentication error. Tokens remain in memory and are refreshed through the native SDK.
- Exact HTTPS origin, page path, main-frame and per-document/request nonce restrictions. Malformed messages and expired tokens are rejected.
- Dedicated live markup, without a homepage, website menu, duplicate fullscreen controls or runtime fetching of the whole website.
- Actual live-engine status reporting, explicit retry errors and connection timeouts instead of indefinite black screens.
- Microphone requested when the user starts talking, not while opening the live screen. Close stops microphone/video immediately and waits for usage/memory cleanup with a bounded native fallback.
- Local transcript cache separated by signed-in account. Server authorization, credit rules, owner access and memory authorization unchanged.

## Passed checks

- 10 Node protocol and identity tests.
- 7 browser scenarios in Chromium and the same 7 in WebKit: signed-in session opens the stage without any web Clerk request; zero-credit access handling; worker-provided owner access; 401 refresh and failure; service 503; network failure; missing native reply timeout.
- Simulated call lifecycle: one microphone allocation, one Anam client, one usage activation, one usage-end request and one conversation-end request. Native close acknowledgment received.
- Compatible Expo auth dependencies resolved; clean npm ci succeeded.
- iOS JavaScript/Hermes bundle export succeeded.
- Expo iOS prebuild and app icon generation succeeded.

## Test limitations

The browser tests mock native identity, backend and Anam responses. They do not use a real account, call Nina or consume paid credits. WebKit tests are not a physical iPhone test. Xcode compilation/signing and actual Google sign-in, audio/video streaming and device background behavior still require the new preview build on a device. This is not App Store approval or a complete security audit. npm audit still reported 11 moderate dependency vulnerabilities; no forced breaking upgrades were applied.

The native counterpart is version 0.4.0 on mobile-app-v1, identified in Profile as LOGIN 03 / BRIDGE 01. Old installed builds do not implement this token bridge and must be updated. The public website keeps its existing web authentication path.
