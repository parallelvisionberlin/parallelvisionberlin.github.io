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
- Published implementation: `a884f099ea3677a40f6ea3949bd50a089aee1ab3`.
- Static validation passed: Actions run `40389360429`; Pages build/deploy succeeded: `40389359777`.
- Public verification: homepage 200 with 11 artists and no Amatista; Fashion overview 200 with four inhabitants and no Amatista; both withdrawn profile URLs return 404.
- Browser confirmed the updated roster, four inhabitants and both missing profiles. Existing browser navigation cache required one reload.
- Instagram remains user-managed. No email sent.
- Next: user removes the Instagram publications and can send their reviewed response.

## Future Fashion collection placeholder cleanup, 2026-10-26
- Baseline main commit: `d592e3d17d5a72d5fa9935eeb14a31ea3bc4d631`.
- Scope: `dna-mutation.html` and `magnetic-tape.html` only; `fashion.css`, assets, layout and navigation unchanged.
- DNA Mutation: removed three publicly empty Gallery, Lookbook sheets and Material studies blocks with internal placeholder text. Existing hero, introduction and real campaign image retained.
- Magnetic Tape: removed empty Material studies block containing 'study hook'. Existing campaign, gallery and lookbook images retained.
- Source validation: all specified placeholder/hook phrases absent from both pages; remaining image paths, navigation and original real content preserved.
- Publication: main branch update initiated; confirm GitHub Pages build and public HTML before claiming live.

## Estero / Siento, 2026-10-30
- Objective complete: publish Estero's artist profile and Siento release page, using Tanzen Im Kreis as the release reference.
- Live artist URL: https://parallelvisionlabel.com/estero.html
- Live release URL: https://parallelvisionlabel.com/siento.html
- Implementation branch: `feat/estero-siento-pages-20261030`; PR #690.
- Published source commit: `1ba7c8c291aab20fc3f0bfd1c37085332df64428`.
- Verified deployed merge: `9bb0866c0c876d4dc6d2d062cb885bd734713417`.
- Current main before implementation was `e6a52eecd6632b9ec12ec326c8f37b350d3314f7`; relevant files were unchanged since the original baseline.
- Owner authorized completion after reviewing both previews and the explicit public repository disclosure question.
- Connected repository owner and domain verified: parallelvisionberlin / parallelvisionberlin.github.io; CNAME parallelvisionlabel.com.
- Git shell write credentials unavailable; published through the authenticated GitHub connector. Original local commits remain unrevised.
- Artist: Estero / Andrés Zendejas, Mexican producer and DJ; biography supplied by the owner.
- Release: Siento / PV016; Beatport 6 November 2026, all platforms 20 November 2026.
- `estero.html`: metal portrait hero, biography with vertical portrait, Siento feature and Fashion After Fabric visual pair.
- `siento.html`: night hero, release details, manifesto context, editorial still and four-question adaptation.
- Q&A questions frame excerpts from the supplied manifesto; original Spanish answers and editorial adaptation are explicitly disclosed.
- `css/estero-editorial.css`, `js/estero-editorial.js`: shared responsive presentation and scroll header.
- `index.html`: added Estero roster entry/count (12) and Siento release card, preserving existing entries.
- `sitemap.xml`, `scripts/verify-build.js`: both pages registered for discovery and existing static validation.
- Five full-resolution WebP assets in `assets/estero/`, quality 90; no generative retouch or identity changes.
- IMG_8214.jpeg = estero-metal-portrait.webp (artist hero).
- IMG_8224.jpeg = siento-night.webp (release hero / homepage editorial image, not final cover artwork).
- IMG_8201.jpeg = estero-petals-full.webp (artist biography).
- IMG_8202.jpeg = estero-petals-portrait.webp (artist gallery / release editorial film still).
- IMG_8217.jpeg = estero-silver-portrait.webp (artist gallery).
- All remote asset blob hashes match the locally validated files; remote product text is identical to local source.
- Animation slots documented in HTML: artist hero, release hero and release editorial still; retain corresponding images as posters.
- No listening/purchase/presave links supplied; no guessed destinations or empty players added.
- Local static validation passed all 24 maintained public HTML pages; diff whitespace check passed.
- PR static validation passed: runs 41118972497 and 41118945023.
- Main static validation passed: run 41119100824; approved Image contract also passed.
- GitHub Pages build and deployment succeeded: run 41119099499 on the verified merge.
- Browser QA before publication: desktop artist/release heroes, mobile 390/320 iframe layouts, biography/Q&A and section navigation; no horizontal overflow.
- Public browser verification: both URLs load, hero images decode, dates match, four Q&A entries present, desktop width equals scroll width.
- Public homepage verified: Estero entry links to artist page; Siento card links to release; roster count is 12.
- No outstanding publication blocker. Final artwork, listening links and animation clips remain owner-supplied follow-up assets.
- Next: replace the documented stills with the supplied clips and keep their posters; add verified listening destinations when available.
