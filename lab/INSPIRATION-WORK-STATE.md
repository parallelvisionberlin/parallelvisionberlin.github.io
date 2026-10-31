# Chrome Couture Qwen Signature Preset, 2026-10-31

- Owner approved the original sensual silver-corset, crystal mesh, chrome blade, glimmering/dreamy starburst editorial concept. Qwen Image 3.0 was preferred in the supplied side-by-side outputs.
- Scope: Chrome Couture Inspiration card only; keep the 16 curated Moods, with Fashion Editorial as its underlying compatible Mood. No automatic image references, Mood Creator changes, backend pricing changes or hidden generations.
- Default for a new Chrome selection: Qwen Image 3.0, 2K, 16:9, one image. Respect current user-written prompt, references and compatible user-chosen model.
- 20 adult-woman sensual editorial scenes: first retains the original Pinterest-derived prompt verbatim; 19 share an editorial master with controlled pose/camera/angle changes. Repeated taps cycle through scenes; user edits are preserved.
- Old Chrome example text is recognized for legacy draft migration, and only Chrome's old rotation position resets on this recipe upgrade.
- Guest shows Qwen/2K only as a preview; sign-in handoff restores the actual Qwen choice without starting or charging for generation.
- Changed files: lab/inspiration-looks.js, lab/lab.js, lab/studio-guest-image.js, lab/studio.html, tests/lab-inspiration-rotation.test.mjs, lab/INSPIRATION-WORK-STATE.md.
- Tests, pull request, merge SHA, Cloudflare check and independent live verification: pending.

# Dream Blur cover replacement, 2026-10-24

- User selected the tilted-face blue light-trail artwork for Dream Blur.
- Approved source: `42e2d5df-4fef-4d1c-82ff-e3f8bb3cfcc1.png`, Library ID `libfile_4adde8d7819881919b0b739219823a04`.
- Baseline: `bd199302` on main; branch `fix/dream-blur-cover-20261024`.
- One optimized 1122 × 1402 WebP, `lab/mood-previews/dream-blur-cover-20261024.webp`, used for both public/signed-in Inspiration cards, Explore Moods card and canonical selected-Mood preview.
- Preserve the old JPEG for existing backgrounds and Video Effects. No Mood recipe, Style reference, default intensity, prompt, card geometry, credit, pricing or generation change.
- Scope: `lab/studio.html`, `lab/moods.html`, `lab/moods.js`, relevant import cache keys in `lab/lab.js` and `lab/explore-moods.js`, new WebP and this note.
- Local approved Image contract, Inspiration carousel/rotation and Mood tests passed: 61 tests.
- Full first-image browser suite passed, including guest/new/returning/owner parity, desktop/mobile, focus and mocked quoted generation. Explore passed 18/19 scenarios; slowquote timing assertion (Generating vs Preparing) also fails on unchanged baseline. No test was weakened. CI/publication pending.
- PR #521: remote head `67bb4da4` preserves the latest main circular hover arrow. GitHub approved Image contract, first-image browser and full source suite passed. Public visual baseline correctly detected the intentional image change; update only its two Dream Blur image URLs, retaining the original layout and pixel tolerances.
- Next: finish updated public visual comparison, merge PR #521 after relevant checks and verify Cloudflare plus live cover bytes on both pages.

# Image entrance title-only cleanup, 2026-10-22

- User approved the cleaner mockup, explicitly restricting this implementation to the header and preserving the deck and its processes.
- Source base: `a0b27a95ea865a978b35ae20fbd412aa2a44974f` on main.
- Reference: `image(20261022-002230).png`, Library ID `libfile_24dbb1b8c0e881918065e973839f6843`; approved visual mockup was generated in this conversation.
- Only visible entrance heading remains: `Start with a feeling.`
- `lab/image-welcome-editorial.css` hides the public/signed-in overline, subtitle and welcome balance sentence.
- Retains those DOM elements and their layout space so account-state updates, card positions and deck geometry remain safe; the header credit control remains available.
- `lab/studio.html` bumps only that stylesheet version to `20261022-title-only1`.
- No deck styles, dimensions, markup, JavaScript, controls, Moods, prompts, generation, pricing or payment handlers are edited.
- Verification passed: approved Image contract (5 checks) and the full existing first-image browser suite, including guest/new/returning/owner parity, mobile spacing, focus expansion and quoted one-click generation.
- The same approved Image, first-image, compact prompt and static checks passed in PR #436. The unrelated existing Upscaler assertion at `tests/lab-assets-ui.cjs:281` remains unchanged.
- Published: PR #436 merged as `9bcafbb03cea522984f19c5c8e783ab14aed95a3`.
- Cloudflare Pages check `119569686616` succeeded. Production `image-welcome-editorial.css?v=20261022-title-only1` exactly matches the reviewed source; release verifier returned LIVE_VERIFIED.
- Hosted stylesheet computed in an isolated browser fixture confirms hidden secondary text, visible headings and retained layout space. No real signed-in production account or paid generation was used.
- Next action: none for this header-only request. Preserve the deck and its processes.

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

## 2026-10-19 Image Studio viewport and carousel arrows
- User screenshot: reopening Inspiration in signed-in Image allowed a long empty gallery and full marketing footer; a horizontal browser scrollbar appeared. Existing single-viewport desktop CSS excluded the revisit state, while the transformed background could extend beyond the shell.
- The Image tab now hides the marketing footer in both History and Inspiration. Only welcome/Inspiration is viewport-locked when screen height accommodates it; actual saved History retains natural vertical page growth. Desktop and eligible tablet viewports clip decorative overflow, not the gallery's saved assets; short displays can still scroll for access.
- Both Inspiration arrows remain visible while cards overflow, with the unavailable edge disabled rather than removed. Original seven photographic presets, card sizes and swipe behavior remain unchanged. Linked aria-controls now targets the actual carousel ID.
- Scoped files: image-editorial-deck.css, inspiration-carousel.css/js, studio.html, tests/lab-first-image-instant-browser.mjs and tests/lab-inspiration-carousel.test.mjs. No image-generator/provider, credit, model, deck controls, footer contents, other tool layouts or backend changes.
- Browser CI plus static assertions to confirm arrow movement, History release, desktop vertical/horizontal overflow and no marketing footer. Deployment is not confirmed until the relevant checks and live site are verified.


## 2026-10-19 Gallery arrows and visual ordering
- Following the approved single-screen Image fix, user requested a cleaner left/right navigation, keyboard ArrowLeft/ArrowRight movement, and Chrome Couture in the sixth visible slot with Sun Fade moved to seventh.
- The public and signed-in Image entrance now share that seven-card order; source photographs and prompt/example mappings do not change.
- Rounded glyph overlays were replaced by thin SVG editorial chevrons, in the outside gutters on wide desktop; both remain present with the unavailable direction subdued. Tablet/phone controls remain at the carousel edges, preserving the original six/three/two card sizing, no browser-wide scrolling, and touch/swipe browsing.
- Keydown acts only while the carousel is visible, never when editing inputs, with modifiers, or in open dialogs. One card advances per arrow. No paid calls or prompt modifications.
- Scope: lab/studio.html, lab/inspiration-carousel.css, lab/inspiration-carousel.js, targeted tests, and this handoff. No other image tools, footer, credits, Worker or provider change. Verification/production deployment to be confirmed by CI and GitHub Pages.


## 2026-10-21 Fisheye cover and eighth Inspiration card
- User explicitly requested Fisheye 2000 in this carousel, using photo 1. Added fourth after Flash Leather in both public and signed-in Studio. Other cards retain their relative order and the existing responsive carousel geometry.
- Reuses the approved Fisheye Mood at 75% with its two Style references; original seven Inspiration looks keep their existing behavior. Details and release status: `lab/FISHEYE-2000-WORK-STATE.md`.
