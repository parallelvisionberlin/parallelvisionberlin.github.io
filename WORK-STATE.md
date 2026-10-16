# Parallel Vision Homepage Work State
Updated: 2026-10-16
Site: https://parallelvisionlabel.com/
Repository: parallelvisionberlin/parallelvisionberlin.github.io

## Approved direction
- The homepage presents the record label and the wider Parallel Vision universe.
- Primary hero action links directly to `./berlin-2063.html`.
- Lab remains in the top navigation.
- Preserve the main hero image, Parallel Vision title, paragraph, layout and Nina controls.

## Hero entry revision
- User rejected the small underlined text link because it blends into surrounding copy.
- New visual: an unboxed, high-contrast two-level entry. Small `ENTER` on top, prominent `BERLIN 2063` in Michroma below, an enlarged diagonal arrow to the right.
- Subtle dusty-rose rail derived from the illuminated figure in the existing image; arrow moves on hover. No pill, no filled panel, no white tile or bottom underline.
- `index.html`: modified CTA markup and CSS only.
- `language.js`: updated targeted selector translations, `Enter / Berlin 2063` and `Betrete / Berlin 2063`.
- Mobile responsiveness, keyboard focus and reduced-motion styling included.
- Baseline main SHA: `7d1f1a1ea57ed3b822d62c006dfef9bd6de68ada`.

## Verification
- Assertions for correct link destination, distinct typography, English and German text, and no old boxed or underline rules.
- CI static checks and GitHub Pages deployment: check after commit.
- Visual browser inspection on desktop and mobile: pending.

## Next
- Confirm the latest deployment after concurrent site updates, then review the CTA at phone and desktop sizes.
