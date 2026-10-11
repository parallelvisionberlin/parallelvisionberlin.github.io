# PV Lab mobile / first implementation

The existing Parallel Vision Expo project, bundle ID and native Clerk login are reused. No second EAS project or subscription is provisioned. NinaApp.js and the original mobile-app-v1 history preserve the previous app.

## Product

Create opens the source photograph, curated moods, intensity and the real generation button. Model, ratio and reference controls expand under More controls. My Moods opens the existing private creator. Gallery reuses the Lab archive. The studio stays mounted when opening My Moods, so returning keeps the source photograph and editor state. Image downloads open the native share sheet.

The mobile surface uses the same website code, prompts, API, quotes, account and generation gates. It is a dedicated app layout, not an independent generation implementation. Nina Signal Credits are not presented as Lab credits.

## Required companion release

Deploy the companion Lab web integration (native-account.js, mobile-ui.js, mobile-app.css and Worker native-auth.mjs) before installing this app. Native Clerk tokens are accepted only with the explicit Lab transport marker and permitted origin, and still require signature, issuer, expiry and owner/customer authorization. No rollout, payment or generation flags are changed.

## Windows workflow

Alejandro's existing repository is C:\Users\Alejandro\Documents\GitHub\parallelvisionberlin.github.io. Previous installations used finish-site05.ps1 and EAS preview builds. Build 14 was the last recorded installed version. Use finish-lab01.ps1 for this Lab app; the old script targets Nina.

The default script runs the app tests and iOS JavaScript export in an isolated folder. It never submits a cloud build. Run with -Build only to explicitly request ONE EAS preview using the existing project and signing credentials. It checks the deployed Lab web adapter and Worker before starting, checks upload-file hashes, and stops on failure. It does not overwrite the local app source. It does not retry failed builds.

From PowerShell in the repository root, after fetching mobile-lab-moods and extracting its finish-lab01.ps1:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\mobile-app\finish-lab01.ps1 -CheckOnly
```

To create the installable preview after the checks:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\mobile-app\finish-lab01.ps1 -Build
```

The second command uses EAS cloud build allowance. It is not a free local iOS build on Windows. It does not purchase credits or upgrade the account. If existing credentials remain valid, answer No to Apple login and Yes to reusing the provisioning profile, as in the previous installation. If they are expired or the phone is absent from the profile, stop and resolve signing instead of repeatedly rebuilding. Install the resulting preview over the current app.

No EAS cloud build is started automatically by commits or checks. Expo's SDK and local CLI are free; ordinary app usage does not consume EAS build credits. Most hosted Lab editor changes use the website deployment without another native build. Native shell/dependency changes need a new build. AI generation retains its provider costs.

## Optional local build on a Mac

A Mac with Xcode can run npm ci, npm test and npx expo run:ios --device from mobile-app/. Apple signing and physical-device setup are still required. Windows cannot compile the iOS binary locally.

## Validation

26 app tests pass and the iOS JavaScript export succeeds. Mobile browser checks pass at 320, 390 and 768 pixels using mocked API calls. These are not physical iPhone checks. Verify native sign-in, photo picker, keyboard, share sheet, background/resume and one explicitly approved generation on the installed preview. Public App Store purchase handling is not certified by this internal preview work.

Sources: https://docs.expo.dev/guides/local-app-development/ and https://docs.expo.dev/build-reference/local-builds/
