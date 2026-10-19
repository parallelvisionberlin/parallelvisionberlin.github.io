# PV LAB Inspiration carousel + Chrome Couture

Updated: 2026-10-19
Source baseline: `dde2a29e89834397a9721fc073036aa8d948c8a6` on main
Implementation: `feature/chrome-couture-inspiration-20261019`

## User-approved scope
- Retain the original six cards and their order: Dream Blur, Vinyl Heat, Flash Leather, Cloud Spa, Green Haze, Sun Fade.
- Add Chrome Couture in seventh position. Keep original six wide-desktop proportions; subtle next/previous arrows reveal further cards. Swipeable mobile/touch browsing shows two at a time and three on tablet.
- Match public Image preview and signed-in Image first-use/Inspiration experience without redesigning prompt deck, header, Generate or Gallery.
- Use the exact user-selected Dagger Girl photographic asset, optimized to 320x480 AVIF at `lab/mood-previews/chrome-couture-20261019.avif`, Git blob SHA `145625784ccccf6440c29263b3d202bee8e7777d`.
- Chrome Couture has eight rotating explicit, user-visible photographic examples. The first uses the original safe silver corset and chrome blade editorial prompt with added real-light retro optical starburst diffraction and halation. Other examples are varied adult subjects and couture details.
- Chrome Couture is a seventh Inspiration look, not a seventeenth curated Mood. Its full cinematic-photographic treatment lives in the eight explicit, visible prompts in `lab/inspiration-looks.js`. The first retains the original prompt and adds retro star-filter diffraction; every variation focuses on realistic skin, materials and directional flash. It maps to the existing backend-supported `fashion-editorial` Mood so the current 16-Mood allowlist remains unmodified. Uploaded references and custom user text take precedence.
- Inspiration user-typed prompt preservation and backend credit/quote/submit flow remain unchanged.

## Files
- `lab/studio.html`, `lab/inspiration-carousel.css`, `lab/inspiration-carousel.js` plus preview AVIF.
- `lab/inspiration-looks.js`, `lab/studio-guest-image.js`, `lab/lab.js` (module cache keys and compatible Mood alias). Existing `lab/moods.js` and Worker allowlists are preserved.
- `tests/lab-inspiration-rotation.test.mjs`, `tests/lab-inspiration-carousel.test.mjs`.
- Existing mock browser assertions in `tests/lab-first-image-instant-browser.mjs` and `tests/lab-mobile-mood-entry.mjs` updated to expect seven rather than six cards and to test browsing.
- No Worker, provider model, Stripe, credits, accounts, saved jobs or backend change.

## Verification state
- GitHub source changes and image blob stored on feature branch. Source asset SHA verified.
- PR #347 created. Static site, disabled Generate and motion checks already passing on first commit; first-image browser and Lab checks are running. Historical Dream Blur catalog-count and other brittle checks revealed why the original 16 curated Moods must not be expanded here. The feature branch now restores the exact original `lab/moods.js`.
- Live site deployment and real authenticated customer appearance NOT YET CONFIRMED.
- No real paid generation performed. A model producing an identical result to the ChatGPT reference is not guaranteed.

## Next action
Wait for updated PR checks, investigate relevant failures, merge when sound, then verify Cloudflare Pages publication of pvlab.studio.


## 2026-10-19 iPhone Inspiration spacing and background correction
- User-supplied iPhone screenshots show a roughly several-hundred-pixel blank black scroll gap after the mood cards, with the cobalt/copper backdrop missing in the center.
- Verified CSS cause: `lab/image-welcome-editorial.css` applies `min-height:calc(100dvh + 200px)` at tablet/mobile widths even for a browse-only Inspiration row. Meanwhile mobile welcome retains a 255px bottom padding to clear the *fixed* prompt deck, causing redundant empty height. Separate mobile background styling also crops the wide approved image with `cover` into its nearly black center.
- Fix branch: `fix/mobile-inspiration-spacing-backdrop-20261019` from main `071c4c071cfa7df6550609109f9f49b8c2a77a1a`, PR #348.
- Mobile-only `lab/image-moods-return.css` now derives shell height from the real welcome content, removes empty archive height/padding only while Inspiration/welcome is visible, preserves existing bottom composer clearance, and hides the browse-only marketing footer. Ordinary Image History, native app, Video, desktop and preview-hidden modes are excluded.
- The same approved `pvlab-subtle-cinematic-background-20261017.webp` is used, with the full abstract cobalt/copper plate presented across the narrow width plus subtle radial atmospheric light. No added images or model changes.
- `lab/studio.html` cache-busts the updated CSS. `tests/lab-first-image-instant-browser.mjs` adds 390px browser assertions for natural shell height, full background, scroll-bottom gap, no horizontal overflow, footer and History return.
- Verification: PR browser/CI checks pending at time of writing. Live Cloudflare deployment not yet confirmed. No paid generations or backend changes.
- Next: inspect the scoped first-image browser check, adjust if needed, merge only after passing, verify source publication, then ask user to reload the phone.


## 2026-10-19 mobile welcome compact deck and scroll stability
- User approved moving the welcome heading slightly higher, keeping the original seven swipeable photographic cards, and reducing the mobile Image prompt deck to one visible tools row. Secondary settings remain reachable from the small More/Options dropdown.
- Mobile iPhone-only implementation PR #349: `lab/mobile-image-compact-welcome.css` is loaded last; `lab/studio-mobile-entry.js` no longer toggles the signed-in welcome header at 110px scroll, which was causing geometry feedback/jitter. First welcome activation returns to scroll position zero.
- Resting welcome controls: upload, Elements, current model, Moods and More. Opening More exposes Retouch, aspect ratio, resolution, count, reference controls and existing advanced controls; all original event handlers, values and credit quote logic are retained. Generate stays full-width and is slightly shorter.
- The approved blue/copper background remains, the heading is 10-20px higher, and the welcome-only clearance is reduced to match the compact dock. Normal History, native Create, Video and desktop remain excluded.
- For tall phone viewports, CSS locks resting welcome vertical scrolling but releases it for keyboard focus or expanded options. Small phones remain scrollable as a fallback. Browser regression tests assert header stability, one tools row, option accessibility, card/deck nonoverlap and normal History return.
- Verification and production merge/deployment status must be updated after CI. No provider or paid generation changes.
