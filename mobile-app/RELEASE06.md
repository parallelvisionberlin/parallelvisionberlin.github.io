# PARALLEL VISION MOBILE / 06
Last updated: 08 October 2026

## Release status

**First editorial implementation is in the actual mobile-app source.**
Main implementation: `8d9147eecb17ad8edfebc3f217114fce1e715375`.
Test-harness correction / pinned build source: `a2efe3a4e99b582e00e27763ab674c7efbb8c5fe`.
Branch: `mobile-app-v1`.

The user installed Mobile 06 (iPhone EAS build 13), then reported a black Home image and a Nina portrait cropped to masks. **Mobile 06.1 fixes are committed to GitHub but have not yet been built or installed on iPhone.** No additional EAS preview build has been started for 06.1.

Changes:
- HOME is the app gateway, not another Berlin 2063 archive listing. In 06.1, the unreliable black native video hero is temporarily replaced by its original approved static film poster.
- NINA now uses the previously approved full portrait from `mobile-app/assets/deck04/nina-portrait.jpg` (Nina with dark curls and black jacket), replacing the wide mask-wall image that cropped badly on an actual iPhone. Portrait is anchored to the top of its frame, and hero overflow is clipped. The live voice engine and account logic remain untouched. A new concrete-room image/animation remains a future, separately approved creative task.
- 2063 has exactly three real linked chapters (The City; Fashion After Fabric; Moving Transmissions), and the third now has its real Robo Loop poster, not a blank placeholder.
- World-index hero now uses a separate approved Berlin 2063 architecture image.
- MUSIC has a selected-release module and the original official covers of Stay Low, Tanzen im Kreis, Dark Rock EP and Built to Last EP. Playback still uses the existing in-app SoundCloud WebView, not a new streaming service.
- PROFILE and signed-out authentication no longer display internal code/revision strings.
- Native video framing now allows contentPosition to be forwarded while preserving the existing first-frame and error behavior.
- No VR functionality was added, and no real-world Nina account data or credits were changed.

## Validation

The 06.1 photo/layout correction is source commit `5e4d816cb16e60c0837ed87c613092e9360c36c8` (includes the final responsive portrait crop adjustment). The installer is pinned to that implementation and must reject different source files. Confirm the latest 06.1 test runs have passed before starting one new EAS build.


GitHub Actions automatically run the mobile node tests, React component interaction checks, iOS Expo export and browser preview checks. The original source passed npm tests and iOS export in:
https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/37696967879

After updating the test harness, the component integration checks and iOS export also passed in the Mobile 06 interface workflow run before browser tests:
https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/37697343869

The Windows checked installer passed for the app implementation source:
https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/37697201283

Real iPhone media framing, Nina live call, and SoundCloud audio require an installed preview. Browser renders are not substitutes for on-device testing.

## Safe Windows preview install (only when ready to consume ONE EAS preview build)

From your **existing local** Parallel Vision repository, in PowerShell:

```powershell
git checkout mobile-app-v1
git pull --ff-only origin mobile-app-v1
cd mobile-app
.\finish-site05.ps1 -CheckOnly
```

The `-CheckOnly` mode runs local/packaging validation and **does not start a cloud preview build**.

Only after the checks pass and when ready to consume the Expo preview-build allowance:

```powershell
.\finish-site05.ps1
```

The installer pins the precise tested app source, refuses a mismatched repo or changed source, validates packages/files and upload archive, and starts **at most one preview build**. Do not run duplicate build windows. Install the resulting EAS link on the existing iPhone app without uninstalling or signing out.

## Remaining work

- Install the 06.1 preview build only after the pinned installer checks pass. The existing iPhone Mobile 06 does not update automatically from the GitHub commit.

- Look at the latest iPhone preview, particularly Nina's full-face composition, Home hero crop, 2063 thumbnails, and music artwork.
- Replace the provisional Nina canonical image with a newly approved identity-consistent room image/animation.
- Verify sound/audio, authentication, Nina live microphone access, player behavior and back/close controls on real iPhone.
- VR landscapes remain a future scope. Do not add dead VR buttons.
