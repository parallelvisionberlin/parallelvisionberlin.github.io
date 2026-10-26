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

## Berlin 2063 journey, 2026-10-21
- User approved applying the reviewed journey to the page.
- Source commit: 5512fb3fb2603187a7ffd0f05e9e06c586bc3351.
- Changed only berlin-2063.html for the implementation.
- Hero and 44-second opening film preserved.
- Added bilingual Explore the worlds introduction; hero exploration link targets it.
- Preserved the complete original markup of all four world galleries and Fashion After Fabric.
- Added A transmission from Berlin 2063 after Organic Futures and before Fashion After Fabric.
- Official clip: https://www.youtube.com/watch?v=T4bKnLgdLjQ.
- Existing poster: assets/optimized/2063/lived-city/rave-a-private-second.webp.
- Responsive 16:9 player; YouTube privacy-enhanced iframe loads only on click, direct link fallback retained.
- Local npm run build passed; GitHub static validation succeeded (run 39637183464).
- GitHub Pages build and deployment succeeded (run 39637183033).
- Confirmed new headings and order on public domain; Play replaces poster with correct embedded player.
- Desktop viewport has no horizontal overflow. Mobile CSS reviewed, actual phone viewport not tested.
- Public screenshot captured; full video playback was buffering in this browser.
- Mobile follow-up: user screenshot showed a large empty gap below the opening film caption.
- Cause: #berlin-beyond inherited min-height:100svh on phones.
- Fix: mobile-only min-height:0 in css/berlin-projects.css, retaining 32px bottom spacing and desktop behavior.
- Follow-up commits: c43ad3f (CSS fix), f12c180 (stylesheet cache version).
- Publication confirmed in successful Pages run 39638982082, including subsequent main changes.
- Public HTML uses berlin-projects.css?v=20261021-mobile-film-gap.
- Browser CSSOM confirms mobile rule min-height:0px and padding:0px 0px 32px.
- User phone screenshot supplied the original reproduction; a fresh phone screenshot remains unverified.

## Desktop refinement, 2026-10-21
- User requested removing desktop blank space and competing headings, and slightly reducing the music film to fit its heading and credits in one screen.
- Verified desktop opening panel was forced to 936px (100svh).
- Scoped overrides in berlin-2063.html remove forced minimum height at all widths.
- Repeated opening-film title remains accessible but is visually hidden; hero retains the project title.
- Explore the worlds becomes a compact section label before the gallery title.
- Desktop music player, heading and credits share a centered width capped at 94% and viewport-height budget (230px for surrounding text).
- Mobile music player retains full available width; existing galleries remain intact.
- Implementation commit a93b9e6d425e4d38de843ff66bbb08a823130692; Pages run 39640446925 succeeded.
- Public browser verified: opening section reduced from 936px to ~691px; no horizontal overflow.
- At 1363x936, music player reduced from ~722px to ~679px height; whole heading/player/credits group is ~828px.
- Screenshot confirms heading at y64 and caption bottom at y892 in a 936px viewport.
- Local npm run build passed. Public desktop refinement verified.

## Artist withdrawal, 2026-10-26
- User authorized removing Amatista from the artist roster and Fashion After Fabric inhabitants; user handles Instagram.
- Verified source baseline: `939d2a0c7b53d063f52840f510bb77a4c981a2b3`.
- `index.html`: removed artist entry; corrected roster count from 12 to 11.
- `future-fashion.html`: removed inhabitant card and its mobile-only image rules; numbered remaining four inhabitants 01 through 04.
- Removed `amatista.html` and `amatista-fashion-after-fabric.html` so direct links no longer publish the profiles.
- Existing sitemap already excludes both withdrawn pages.
- No other artists, collections, page layout rules, social accounts or reusable source assets changed.
- Validation: focused roster/card/order and unchanged-content checks passed; inline JavaScript parses; diff whitespace check passed.
- Next: verify static validation, Pages deployment and public responses before confirming withdrawal.
