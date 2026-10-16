# Parallel Vision Homepage Work State
Updated: 2026-10-16
Site: https://parallelvisionlabel.com/
Repository: parallelvisionberlin/parallelvisionberlin.github.io

## Current approved concept
- Parallel Vision hero remains a music-label and cultural-world introduction.
- The action reads "ENTER BERLIN 2063" and opens `./berlin-2063.html`.
- German label from `language.js`: "BERLIN 2063 BETRETEN".
- Lab remains in navigation, not the primary hero destination.
- Preserve the existing background, typography, hero layout, navigation and Nina controls.

## Latest revision (2026-10-16)
- User rejected the boxed, ivory-end-cap treatment as reminiscent of a signup button.
- `index.html`: changed only the `.hero-world-cta` CSS back to an unboxed editorial navigation link.
- The text and a small diagonal arrow share a single transparent baseline with a fine 1px underline.
- Subtle animated underline and arrow path on hover/focus, no colored block or pill.
- Mobile centered responsive width and 52px-tall tap area.
- Preserved focus-visible and prefers-reduced-motion support.
- HTML link and `language.js` unchanged.
- Revision based on main commit `3be0086318e844927d78dc145b38a2e3e00f282a`.

## Verification
- Assertions: one Berlin 2063 hero CTA, correct link, no ivory panel CSS, hover/mobile/reduced-motion present.
- GitHub Pages/CI deployment: verify after commit.
- Desktop/mobile visual review: pending. No other page components deliberately changed.

## Next
- Confirm GitHub Pages build and deployment; review desktop and mobile hero.
- For later changes preserve the editorial unboxed direction unless user explicitly changes it.
