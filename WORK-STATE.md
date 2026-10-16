# Parallel Vision Homepage Work State
Updated: 2026-10-16
Site: https://parallelvisionlabel.com/
Repository: parallelvisionberlin/parallelvisionberlin.github.io

## Latest user direction
- Preserve the homepage composition and the existing TALK TO NINA bottom-right treatment exactly.
- Revert the Enter Berlin 2063 action to the ORIGINAL compact outlined-pillow/pill design, but polish the button.
- User rejected the oversized/bare typographic CTA, detached arrow, vertical pink accent, white arrow end-cap and signup-style rectangle.
- Main action remains ENTER BERLIN 2063 leading to `./berlin-2063.html`, while LAB stays in the navigation.

## Implemented
- `index.html`: only the `.hero-world-cta` CSS block was replaced, using the initial compact button proportions with refined 47px height, 12px Inter, muted outline, transparent dark background, arrow inside, understated hover.
- 27px below hero description, in its original position. No added badges, rules, endcaps or accent lines.
- Phone style centered, 46px tap area, compact typography and in-button arrow.
- Existing HTML, EN/DE language.js translations, destination, video, Nina control, other modules unchanged.
- Baseline main revision: `bf4f8d6bfedfdabe5ab849204b15fdf3c16a346a`.

## Verification
- Source checks: one destination link, original text spans, translation matches, no large separated typography, no end-cap.
- CI / deployment: verify after commit.
- Live desktop and phone appearance needs visual review; no browser screenshot performed.

## Next
- Confirm GitHub Pages success for a commit containing the fix.
- Avoid further redesign until direct user feedback; retain TALK TO NINA untouched.
