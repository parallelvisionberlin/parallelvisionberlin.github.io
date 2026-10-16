# Parallel Vision Homepage Work State
Updated: 2026-10-16
Site: https://parallelvisionlabel.com/
Repository: parallelvisionberlin/parallelvisionberlin.github.io

## Approved direction
- The homepage represents the record label and the wider Parallel Vision world.
- Hero action: ENTER BERLIN 2063, linking to the existing `./berlin-2063.html`.
- Lab remains in the main navigation, not as the hero action.
- Preserve background image, main wordmark, explanatory copy, section layout, and navigation.

## Button revision (2026-10-16)
- `index.html` CSS-only change scoped to `.hero-world-cta`.
- New shape is a wider 278 x 54px near-rectangular editorial control, with a distinct ivory 53px arrow end-cap.
- On hover and keyboard focus, the surface inverts to light and the end-cap darkens; only the arrow path shifts diagonally.
- On mobile, the control is centered and 51px tall with a responsive width.
- Focus-visible outline and reduced-motion rules retained.
- Existing markup, link, `language.js` DE/EN translation, and every other element remain unchanged.
- Baseline source commit for this revision: `35a145ad498935c3592899d9f64d56cde444574e`.

## Checks
- Code-level assertions: exactly one Berlin 2063 hero link, unchanged label and link destination.
- CSS implementation checked for complete state, hover, mobile and reduced-motion rules.
- GitHub Pages deployment and live desktop/mobile checks pending at commit time.

## Next
- Confirm the new commit passes site validation and GitHub Pages deploys successfully.
- Review desktop and mobile presentation before changing any other homepage elements.
