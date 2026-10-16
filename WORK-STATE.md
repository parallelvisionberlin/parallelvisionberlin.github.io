# Parallel Vision Homepage Work State
Updated: 2026-10-16
Site: https://parallelvisionlabel.com/
Repository: parallelvisionberlin/parallelvisionberlin.github.io

## Approved direction
- The homepage presents the independent record label and the Berlin 2063 world.
- Main hero action stays `ENTER BERLIN 2063` and links to `./berlin-2063.html`.
- PV LAB stays in the top navigation.
- Keep hero video, title, descriptive copy, header, and Nina controls unchanged.

## Current fix: intentional distance from the description
- The previous 16px CTA sitting 23px below the paragraph resembled a continuation of the small body copy.
- `index.html`: only CTA styles changed, with a 65–84px desktop margin above the action and typography of 20–24px, Inter 600.
- One clean line in white, a closely adjacent 28px diagonal arrow, no pink rail, underline, pill, rectangle, or background panel.
- On mobile, a centered 17–20px entrance with 44–60px margin above and a 24px arrow.
- No change to the action markup or translation selectors; the existing German label still applies.
- Preserved keyboard focus and reduced-motion handling.
- Based on main commit `ad7f378b3bf54c75814d1acb8d4ecf5aad4e2bc3`.

## Verification
- Reviewed existing hero styles and the desktop/mobile context.
- Code asserts exactly one hero Berlin 2063 link, original markup/translation intact, and no decoration.
- GitHub static-site validation and Pages publishing: check after commit.
- Visual desktop/mobile browser QA is not yet complete.

## Next
- Verify that the main branch retains this design and Pages deploy succeeds.
- Keep changes isolated from other active feature work.
