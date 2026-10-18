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
