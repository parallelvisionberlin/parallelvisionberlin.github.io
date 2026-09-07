# Parallel Vision Mobile

Mobile V1 for Parallel Vision.

## Current scope

- Home / current transmission
- Nina live signal embedded inside the app
- Berlin 2063 world index
- Music catalogue preview
- Profile / account bridge
- Shared dark editorial design system
- Existing Parallel Vision and Nina URLs centralized in `src/config.js`

The current live website is untouched. This app lives entirely under `mobile-app/` on the `mobile-app-v1` branch.

## Stack

- Expo SDK 57
- React Native 0.86
- React 19.2.3
- react-native-webview 13.16.1

## Why Nina uses an embedded web surface in V1

Anam's official JavaScript SDK is designed around browser WebRTC and a video element. Anam currently lists community mobile SDKs for Kotlin Multiplatform and Flutter rather than an official React Native SDK.

For V1 the production `nina.html` experience therefore runs inside an app-owned WebView instead of opening Safari/Chrome. This preserves the production Anam session flow, Nina memory, Clerk web authentication, Signal Credits and existing analytics while giving the user an in-app experience.

External domains are opened outside the embedded Nina surface. Parallel Vision URLs remain in the WebView.

## Native permissions

The app requests microphone access only for Live Nina:

- iOS: `NSMicrophoneUsageDescription`
- Android: `RECORD_AUDIO`

## Run locally

From the repository root:

```bash
cd mobile-app
npm install
npx expo start
```

Then open the project in Expo Go or an Expo development build. The Nina WebView dependency is included in Expo Go for SDK 57.

## Next account layer

The repository already exposes a production Clerk application and the Nina Worker verifies Clerk bearer tokens before returning account/credit data. The next mobile step is native Clerk authentication with `@clerk/expo`, secure token storage, and direct authenticated calls to:

- `GET /api/nina/credits`
- the account/profile endpoints
- Nina session usage endpoints

Before a production native Clerk flow is built, `com.parallelvision.app` must be registered in Clerk's Native applications configuration so its callback is accepted. Until then the embedded Nina surface remains the authoritative signed-in experience.

## Product rule

The app should not become a miniature copy of the website. Mobile V1 is the personal entry point into Parallel Vision, with Nina, signals, music and Berlin 2063 as the core experience.
