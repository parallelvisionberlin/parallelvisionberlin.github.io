# RECOVERY 01

Published app-route changes are the exact four runtime files from tested commit 50545cefaa3e95b3d0f8334bad54f2ac3aef7dd8.
Checks: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/34291926518

The preceding rollback restored the shared engine, but initially restored an older bootstrap with another getUserMedia override. Both audio modifications are now removed. This keeps the unmodified capture call and does not claim that microphone gain or speech intelligibility has been improved.

A concurrent restore01 change also removed that override and changed cache versions. This publication preserves those purposes: getUserMedia is not replaced, the inactive microphone-test panel remains hidden, and bootstrap, engine and CSS use fresh recovery01 cache versions. The visible pre-call revision is RECOVERY 01. The installed native app and its Profile marker do not change.

Connection failure previously appeared only as CONNECTION FAILED. App-only diagnostics now retain the failing phase, exception name, safe error code and HTTP status. Raw error messages, tokens, URLs, account values and audio are not included. Phases distinguish microphone capture, saved conversation preparation, connection service, avatar streaming and live-session activation. They identify where a failure occurred, not necessarily its ultimate cause.

The error/retry panel is no longer covered by the pre-call portrait. The retry button and start button have explicit readable text color. Portrait, native identity, credits and memory rules are preserved. No backend, SDK version, auth provider or native binary was changed.

Checks passed: static website validation; existing native identity/protocol tests; all seven existing mocked authenticated lifecycle scenarios in Chromium and WebKit; five recovery scenarios in each engine (successful lifecycle without a capture override, denied microphone, service HTTP 503, avatar startup exception, and visible/reachable retry after a generic error).

The physical iPhone failure is not yet diagnosed or confirmed resolved. These browser tests mock native identity, media capture, server responses and avatar streaming. No real call, credit purchase or physical-device test was made. If the phone still fails, the RECOVERY 01 diagnostic identifies the next investigation instead of another speculative microphone change.
