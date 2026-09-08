# Parallel Vision 0.4.0: LOGIN 03 / BRIDGE 01

This version replaces native-JWT cookie injection and the Profile redirect loop with a native-to-live token protocol. App sign-in remains in the native Clerk SDK. The worker still verifies all access and owns balances, usage and memory authorization.

Passed on 2026-09-08: 10 Node protocol/identity tests, 7 Chromium scenarios and the same 7 WebKit scenarios, clean npm ci, iOS JavaScript export and iOS prebuild/icon generation. Reference run: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/34280225833 . Tested source commit: 959d3a8cd546c21868ce867e6edee852841ae9cd . Node 22.23.2 and npm 10.9.8.

The tests mock identity/backend/Anam. They are not physical iPhone tests or a real Google login. A fresh preview build and live device check are still required. npm audit reports 11 moderate dependency vulnerabilities; no forced breaking upgrades were applied.

Expected device test: keep the existing signed-in account, open Talk to Nina, observe account verification and the live stage, start a conversation, close it, confirm return to the native Nina screen. Errors must remain visible with Retry rather than silently bouncing to Profile. Confirm the Profile marker LOGIN 03 / BRIDGE 01 to identify the correct binary.

The matching web page must be deployed from the main branch BRIDGE 01 revision. This app does not recreate a web Clerk session. Tokens are fetched on demand and not put in URLs, cookies or persistent storage. Native close/background attempts to end usage and memory before unmounting, with a bounded fallback. Physical device microphone/background behavior must still be checked.

Use finish-bridge01.ps1 for a clean, pinned preview workspace outside the website repository. It preserves local edits and validates code, icon and archive before requesting an EAS build. This is not an App Store submission. Store payment, account deletion and other review requirements remain a separate release checklist.
