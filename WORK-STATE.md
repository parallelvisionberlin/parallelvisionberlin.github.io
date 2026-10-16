# Parallel Vision Homepage Work State
Updated: 2026-10-16
Site: https://parallelvisionlabel.com/
Repository: parallelvisionberlin/parallelvisionberlin.github.io

## Approved current design
- Primary CTA reads `ENTER BERLIN 2063` on **one line**, immediately followed by a small diagonal arrow.
- White/off-white Inter, 16px desktop / 15px mobile, letterspaced uppercase, consistent weight for all words.
- **No pink rail, no underline, no bordered or filled button, no separate display font**.
- Only the arrow moves slightly up/right on hover; visible keyboard focus, reduced-motion alternative.
- The button links to `./berlin-2063.html`; the existing English/German translation selectors remain unchanged.
- PV LAB remains in the nav; do not change the main city visual, wordmark, description, Nina controls, or other sections.

## Implementation
- `index.html`: replaced only the `.hero-world-cta` style block with a restrained single-line treatment.
- Markup unchanged; existing `.hero-world-cta-kicker` and `.hero-world-cta-name` spans sit side by side with identical typography.
- `language.js` unchanged, keeps `Betrete Berlin 2063` in German.
- Git baseline: `f049dcc48c1be727affcd500183b74f5cfb5da9c`.

## Verification
- Code assertions confirm target, labels, translations and no old decoration.
- GitHub CI and Pages deployment: verify after commit.
- Interactive desktop/mobile browser appearance: still to be visually checked.

## Follow-up
- Confirm successful Pages publication for this or a descendant main commit without unrelated concurrent changes overwriting the CTA.
- Keep this as the baseline; do not add extra decorative CTA layers without explicit request.
