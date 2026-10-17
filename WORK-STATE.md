# Parallel Vision Homepage Work State
Updated: 2026-10-17
Site: https://parallelvisionlabel.com/
Repository: parallelvisionberlin/parallelvisionberlin.github.io

## Approved direction
- Change ONLY the ENTER BERLIN 2063 capsule to the latest refined design mockup, with better lettering.
- Preserve the Parallel Vision title, city video, hero copy, navigation and TALK TO NINA exactly.
- Keep the pill outline and subtle translucency, no neon or added decoration.
- Keep navigation to `./berlin-2063.html`; Lab currently links to `https://pvlab.studio/`.

## Current implementation
- `index.html`: replaced only the scoped `.hero-world-cta*` CSS region.
- More distinctive geometric letters using already-loaded Michroma (11px desktop / 10px mobile), subtly tracked and full uppercase.
- Slightly taller capsule (50px desktop, 48px mobile), refined ivory line, transparent dark fill and restrained arrow hover.
- Original HTML, German/English mappings and layout all untouched.
- Baseline main commit: `7b1f33a7b8ab6b68f2b558b383ca651469affaa4`.

## Validation
- Asserted original CTA HTML and link unchanged, outside CSS identical, translations unchanged, Nina control still present and Lab still points to pvlab.studio.
- Reduced-motion and keyboard-focus styles retained.
- Static site validation and GitHub Pages deployment: check after commit.
- Browser visual checks on desktop/phone remain pending.

## Next
- Verify deployment and visually assess the refined lettering without changing anything else.
