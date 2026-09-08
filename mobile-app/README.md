# Parallel Vision Mobile

Mobile V1 for Parallel Vision.

## Current scope

- Home / current transmission
- Nina live signal embedded inside the app
- Berlin 2063 world index
- Music catalogue preview
- Native Clerk profile, sign-in and sign-up
- Secure persisted Clerk sessions
- Shared dark editorial design system
- Existing Parallel Vision and Nina URLs centralized in `src/config.js`

The current live website is untouched. This app lives entirely under `mobile-app/` on the `mobile-app-v1` branch.

## Stack

- Expo SDK 57
- React Native 0.86
- React 19.2.3
- react-native-webview 13.16.1
- @clerk/expo 4.x
- expo-secure-store

## Nina in V1

The production `nina.html` experience runs inside an app-owned WebView instead of opening Safari/Chrome. This preserves the production Anam session flow, Nina memory, Clerk web authentication, Signal Credits and existing analytics while giving the user an in-app experience.

External domains are opened outside the embedded Nina surface. Parallel Vision URLs remain in the WebView.

## Native permissions

The app requests microphone access only for Live Nina:

- iOS: `NSMicrophoneUsageDescription`
- Android: `RECORD_AUDIO`

## Native Clerk account layer

The app now wraps the native shell in `ClerkProvider` using the same production Clerk instance as parallelvisionlabel.com. `@clerk/expo/token-cache` persists the active session through `expo-secure-store`.

The Profile screen includes a Parallel Vision-native custom flow for:

- sign in with email + password
- device-trust email verification when requested by Clerk
- sign up with email + password
- sign-up email verification code
- secure persisted signed-in state
- sign out

The Clerk publishable key is public client configuration and matches the existing production web configuration. No Clerk secret key is stored in the mobile app.

### Required Clerk dashboard activation

Before native authentication can succeed against the production Clerk instance:

1. Open Clerk Dashboard → Native applications.
2. Enable Native API.
3. Add Android app:
   - Namespace: `com.parallelvision.app`
   - Package name: `com.parallelvision.app`
4. Add iOS app using:
   - Bundle ID: `com.parallelvision.app`
   - Apple Team ID / App ID Prefix from the Apple Developer account.
5. For mobile SSO later, allowlist the appropriate callback. Clerk's default callback is based on the bundle/package identifier.

The Apple Team ID is intentionally not guessed or committed because it has not been found in the repository.

## Run locally

From the repository root:

```bash
cd mobile-app
npm install
npx expo start
```

For dependency alignment after pulling these changes, Expo's recommended install command is:

```bash
npx expo install @clerk/expo expo-secure-store react-native-webview
```

## Next backend layer

After Native API is enabled and the app is registered in Clerk, the next connection is the existing Nina Worker. The app will use the native Clerk session token to read:

- `GET /api/nina/credits`
- account/profile data
- Nina session usage data

The Worker currently validates production browser origins. Mobile API requests need an explicit authenticated mobile request policy before direct native credit calls are enabled. The embedded production Nina surface remains authoritative until that server-side rule is added and tested.

## Product rule

The app should not become a miniature copy of the website. Mobile V1 is the personal entry point into Parallel Vision, with Nina, signals, music and Berlin 2063 as the core experience.
