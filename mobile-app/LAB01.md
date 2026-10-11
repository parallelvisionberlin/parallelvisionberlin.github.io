# PV Lab mobile / first implementation

The existing Parallel Vision Expo project, bundle ID and native Clerk login are reused. No second EAS project or subscription is provisioned. NinaApp.js and the original mobile-app-v1 history preserve the previous app.

## Product

Create opens the source photograph, curated moods, intensity and the real generation button. Model, ratio and reference controls expand under More controls. My Moods opens the existing private creator. Gallery reuses the Lab archive. The studio stays mounted when opening My Moods, so returning keeps the source photograph and editor state. Image downloads open the native share sheet.

The mobile surface uses the same website code, prompts, API, quotes, account and generation gates. It is a dedicated app layout, not an independent generation implementation. Nina Signal Credits are not presented as Lab credits.

## Required companion release

Deploy the companion Lab web integration (native-account.js, mobile-ui.js, mobile-app.css and Worker native-auth.mjs) before installing this app. Native Clerk tokens are accepted only with the explicit Lab transport marker and permitted origin, and still require signature, issuer, expiry and owner/customer authorization. No rollout, payment or generation flags are changed.

## Validation and local iPhone installation

Default: local builds. Do not start EAS cloud builds or purchase build credits unless Alejandro explicitly requests that route. Expo SDK and local CLI remain in use; removing them is not necessary to avoid cloud build usage.

The web/Worker companion must be deployed before testing the new native session. The code is committed for review, not yet approved for public distribution.

On a Mac with Xcode installed, open the mobile-lab-moods branch and run from mobile-app/:

```sh
npm ci
npm test
npx expo run:ios --device
```

Connect and trust the iPhone, enable Developer Mode if prompted, select it when the CLI asks, and complete Apple signing in Xcode when required. This builds locally and installs a development copy. It does not launch an EAS cloud build. A compatible Apple signing identity is still required. Do not change the existing app identifier just to bypass signing errors.

After the first native build, ordinary JavaScript changes can use `npx expo start` with the local development server. Changes to native dependencies or configuration need another local build. The development copy relies on the development server; an independently running distribution build requires the separate release and signing process.

Most changes inside the hosted Lab editor are delivered by the Lab website deployment. Native shell and dependency changes still require a new native build. AI generation continues to use the existing Lab providers and their usage costs.

The existing @parallel63/parallel-vision project remains available, but EAS cloud builds are not the default. Do not use finish-site05.ps1, which pins the old Nina revision.

Validation so far: 26 app tests pass and iOS JavaScript export succeeds. The companion mobile browser flow passes at 320, 390 and 768 pixels with all API calls mocked. An export is not an installable iPhone binary. Physical-device verification still needs native sign-in, photo picker, keyboard, share sheet, app background/resume, and one explicitly approved generation. Wider website regression failures are tracked in PR #124. Public App Store purchase handling is not certified by this internal preview work.

References: https://docs.expo.dev/guides/local-app-development/ and https://docs.expo.dev/faq/
