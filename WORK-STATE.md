# Parallel Vision Homepage Work State
Updated: 2026-10-16
Scope: public Parallel Vision landing page at https://parallelvisionlabel.com/

## Approved direction
- The homepage represents Parallel Vision as a record label and connected cultural universe.
- Main hero CTA: ENTER BERLIN 2063.
- The CTA navigates directly to the existing `./berlin-2063.html` page.
- PV LAB stays discoverable in the top navigation, not as the main hero action.
- Preserve the hero image, typography, title, introductory text, and layout.

## Implementation
- `index.html`: hero link and label changed; previous pill design retained.
- `index.html`: new semantic `hero-world-cta` selector; restrained arrow movement on hover and keyboard focus.
- `index.html`: focused-outline accessibility and reduced-motion safeguard.
- `language.js`: English “Enter Berlin 2063”, German “Berlin 2063 betreten”.
- `berlin-2063.html`: existing destination, unchanged.
- Baseline Git main SHA: `cf25c408f014d7deccc70297ed0b18e865c5e7c3`.

## Checks
- Asserted exactly one hero link to `./berlin-2063.html`.
- Asserted old PV LAB hero call to action is absent.
- Verified the translation selector targets only the label span, leaving the arrow icon intact.
- Desktop and mobile live visual verification: pending.
- Live publishing / GitHub Pages: pending confirmation.

## Next
- Verify main commit and Pages deployment, then inspect the live hero on desktop/mobile.
- For future homepage changes, leave unrelated modules, Nina behavior, and PV LAB code untouched.
