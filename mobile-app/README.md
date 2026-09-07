# Parallel Vision Mobile

First mobile V1 scaffold for Parallel Vision.

## Current scope

- Home / current transmission
- Nina live signal entry
- Berlin 2063 world index
- Music catalogue preview
- Profile / account placeholder
- Shared dark editorial design system
- Existing Parallel Vision and Nina URLs centralized in `src/config.js`

The current live website is untouched. This app lives entirely under `mobile-app/` on the `mobile-app-v1` branch.

## Stack

- Expo SDK 57
- React Native 0.86
- React 19.2.3
- No navigation or UI framework dependency yet

The first shell intentionally uses React Native primitives so the visual language can be established before adding more infrastructure.

## Run locally

From the repository root:

```bash
cd mobile-app
npm install
npx expo start
```

Then open in an iOS simulator, Android emulator, or supported Expo development client.

## Existing services to connect next

1. Clerk authentication
2. Nina Worker API
3. Nina account memory and continuity
4. Signal Credits
5. Native Nina session rather than opening the current web signal
6. Release / artist content source
7. Push notifications for Signals

## Product rule

The app should not become a miniature copy of the website. Mobile V1 is the personal entry point into Parallel Vision, with Nina, signals, music and Berlin 2063 as the core experience.
