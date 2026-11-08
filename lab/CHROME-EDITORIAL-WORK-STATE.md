# Chrome Desert homepage feature

## Owner request, 2026-11-08
Replace the existing Full Editorial feature after Image / Video / Upscaler with the approved Chrome Desert composition. Preserve the hero, tool cards, Creative Studios, Characters, pricing, referral and footer. This request supersedes only the old Full Editorial presentation recorded in HOME-MOBILE-WORK-STATE.md; it does not authorize other homepage redesigns.

## Implementation
- Baseline main: `96b8c759029ede389a6ffb20339506cbebef930a`.
- Original index blob independently matched: `5018c2a78537475f25b32ac90d07796a08817d27`.
- Static semantic HTML replaces only `#featured-editorial`. New isolated stylesheet: `home-chrome-editorial.css?v=20261108-chrome-desert1`.
- Exact owner-provided photographic collage, cropped without UI text, is preserved as transparent WebP: 1048 x 870 / 130160 bytes and 640 x 531 / 58240 bytes. Both CDN uploads confirmed HTTP 200; no generated substitute or paid generation.
- Display lettering is vectorized from the approved reference, with real accessible H2 text. No additional font download, duplicated navigation or logo.
- Desktop: large title beside layered photographs. Phone: title, photograph, supporting copy and a full-width 56px action. No forced animation.
- CTA retains `./full-editorial.html?start=1` and `.pv-feature-button`. It opens the existing Identity flow; it does NOT load a Chrome Desert preset or automatically generate images. Do not label it Use photo pack until a real preset is implemented.
- Remove only the retired feature video script from this homepage. The shared file and hero motion remain untouched.

## Verification completed locally
- 6/6 focused Node tests pass in `tests/lab-home-chrome-editorial.test.mjs`.
- Isolated Chromium section checks at 320, 390, 604, 760, 768, 1024, 1440 and 1920px: no horizontal overflow, CTA at least 56px, within section, correct href, accessible heading and visible keyboard focus.
- These browser fixtures use the approved local copies of the CDN images and the relevant inherited ID-based feature rules, not the full signed-in production page. Desktop 1440 and phone 390 screenshots visually inspected.
- Byte comparison confirms every part of index.html outside the replaced section, added stylesheet link and removed feature-loop script is unchanged.

## Release status
Source implementation prepared for PR. Repository-wide approved Image UI contract and actual Cloudflare Pages check must run on the final commit before publication. No local signed-in flow or production behavior verified. Follow RELEASE-PROTOCOL.md; GitHub Pages success alone is not production evidence. Do not merge the older, superseded phone-only PR #761 into this design.
