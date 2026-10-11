# PV Lab mobile / first implementation

The existing Parallel Vision Expo project, bundle ID and native Clerk login are reused. No second EAS project or subscription is provisioned. NinaApp.js and the original mobile-app-v1 history preserve the previous app.

## Product

Create opens the source photograph, curated moods, intensity and the real generation button. Model, ratio and reference controls expand under More controls. My Moods opens the existing private creator. Gallery reuses the Lab archive. The studio stays mounted when opening My Moods, so returning keeps the source photograph and editor state. Image downloads open the native share sheet.

The mobile surface uses the same website code, prompts, API, quotes, account and generation gates. It is a dedicated app layout, not an independent generation implementation. Nina Signal Credits are not presented as Lab credits.

## Required companion release

Deploy the companion Lab web integration (native-account.js, mobile-ui.js, mobile-app.css and Worker native-auth.mjs) before installing this app. Native Clerk tokens are accepted only with the explicit Lab transport marker and permitted origin, and still require signature, issuer, expiry and owner/customer authorization. No rollout, payment or generation flags are changed.

## Validation and build

From mobile-app/: npm ci; npm test; npx expo export --platform ios.

Once the web companion is deployed and the mobile visual review passes, run npx eas-cli build --platform ios --profile preview. Use the EXISTING @parallel63/parallel-vision project. This consumes an EAS build allowance. Do not use finish-site05.ps1, which pins the old Nina revision.

The local iOS export is not an installed iPhone build. Device verification still needs native sign-in, photo picker, keyboard, share sheet, app background/resume, and one explicitly approved generation. Public App Store purchase handling is not certified by this internal preview work.
