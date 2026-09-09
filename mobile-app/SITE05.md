# SITE COHESION / 05.1

Completes the user's app repair request. This release is app code, not another generated design image.

## Implemented

HOME uses the original website Berlin motorbike/city film, bundled as assets/site05/city.mp4. NINA uses the original website Nina room animation, bundled as assets/site05/nina-room.mp4. Matching JPEG posters extracted from those same films remain visible until the first video frame, and are restored on media failure or reduced-motion preference. Native expo-video 57.0.2 replaces the blank HTML-video layer for these two hero animations. Films are muted, loop without native controls, pause for the live call/project reader and app background, and use mixWithOthers. There is no generated portrait dependency in these native pages.

HOME continues into three project panels using original website art: Nina, Berlin 2063 and Stay Low. The 2063 page has four working project actions. Public project articles open in a dedicated reader with native Back and Close controls that always return to the app. No account token is passed into that reader.

MUSIC has four actual SoundCloud sources from the website: Stay Low, Tanzen Im Kreis, Dark Rock EP, Built To Last EP. Selecting a release mounts one embedded SoundCloud player in the app; selecting another or leaving the tab unmounts the prior player. Playlist players have room for the track list. Autoplay is requested, but a visible instruction allows an additional play tap where required by the platform/provider. External provider navigation requires a separate confirmation. No claim of background audio, custom SoundCloud streaming access or guaranteed provider availability is made.

PROFILE is now a real native account menu, not decorative rows. Its seven destinations implement preferred-name/language saving, actual credit balance/history, access-code redemption, billing history, confirmation-gated deletion of Nina memory, newsletter preferences, and sharing the account's referral link. It uses the existing authenticated Worker endpoints with fresh-token retry on 401, bounded requests, duplicate-submit prevention and explicit error states. Billing is read-only; this update does not initiate purchases. Tests never altered a real user's account, credits, purchases or memory.

The signed-out Clerk AuthPanel, NinaLiveModal, native token bridge, app-mode script, Anam call engine, microphone acquisition, voice, persona and Cloudflare Worker were retained. The website separately received only the original canonical pre-call portrait URL in css/nina-deck04.css (main commit 2cfb5d55b8aa541cfcb047e1bfa04a0693e7379c). This does not change the live Anam avatar.

## Verified source and checks

Source: 128a274fa2531790edaef9f8f774f651151322f4
Check run: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/34353666174

20 Node tests passed. The previous required-generated-artwork assertion was replaced with the requested original-media assertions; native call and token protections remain. Component interaction tests exercised all seven profile destinations, memory-deletion confirmation, all four project destinations, all four internal music selections, hero first-frame/fallback/pause/error handling and persistent reader closing.

The iOS JavaScript export and iOS native prebuild passed with the films and JPEGs included. Twenty screen renders passed at 390x740 and 320x568 in Google Chrome and WebKit, including actual playback of the original local films, no horizontal overflow and saving a fixture profile. These renders use the real screen components through React Native Web, with explicit substitutes for native media/WebView and fixture authentication. They are not iPhone simulator screenshots. Real iPhone layout, account responses, live Nina audio and SoundCloud audio still require installation verification.

## Install

Use finish-site05.ps1. The old finish-deck04.ps1 is the same pinned installer for compatibility. Both build the exact tested source in an isolated folder without overwriting local app source. They check the dependency lock, bundled media, component actions, iOS export, upload-file hashes and archive size before starting one EAS preview build. No Worker deployment or Anam prompt change is required.

Install the completed build over the existing app. Do not delete the app or sign out. PROFILE shows SITE COHESION / 05.1.
