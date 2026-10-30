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
- Objective: unite the Siento story with the approved petals portrait; artist profile and Instagram images complete.
- Artist URL: https://parallelvisionlabel.com/estero.html
- Release URL: https://parallelvisionlabel.com/siento.html
- Latest product source: `9f118cad44e79d529ab30c4d45ba7e4275660060`, PR #700.
- Latest verified deployed merge: `ccb433accec55ad3a2fe0f7b50a12b85697a1e4d`.
- GitHub Pages run 41137176120 completed successfully; public browser confirms reading-1 CSS, article-first order, new lead and 24px desktop body.
- Owner authorized publication of the pages and supplied photographs. Repository owner/domain verified; native GitHub connector is the write route because shell Git lacks credentials.
- Artist: Estero / Andrés Zendejas, Mexican producer and DJ; supplied biography is the source.
- Release: Siento / PV016; Beatport 6 November 2026, all platforms 20 November 2026.
- `estero.html`: metal portrait hero, biography/vertical portrait, Siento feature and Fashion After Fabric visual pair.
- `siento.html`: night hero, photographic manifesto story, compact release strip, four-question adaptation and closing quote.
- Questions are editorial framing around excerpts of the supplied manifesto; original Spanish answers and adaptation disclosed.
- Shared presentation: `css/estero-editorial.css`, `js/estero-editorial.js`.
- `index.html`: Estero entry in Artists (roster 12) and Siento card in Releases; original entries preserved.
- `sitemap.xml` and `scripts/verify-build.js`: both pages included.
- Assets in `assets/estero/`: full supplied resolution, WebP quality 90, no generative retouch or identity changes.
- IMG_8214.jpeg -> estero-metal-portrait.webp (artist hero).
- IMG_8224.jpeg -> siento-night.webp (release hero and homepage editorial image, not final cover artwork).
- IMG_8201.jpeg -> estero-petals-full.webp (artist biography).
- IMG_8202.jpeg -> estero-petals-portrait.webp (artist gallery and release story backdrop, used once on the release page).
- IMG_8217.jpeg -> estero-silver-portrait.webp (artist gallery and shadow interview backdrop).
- Original page implementation: PR #690, deployed merge `9bb0866c0c876d4dc6d2d062cb885bd734713417`; Pages run 41119099499 succeeded.
- Shadow interview: PR #694, merge `14a1032794b343d3933e1a4f9e9d9289ef3fc0d1`; Pages run 41123042606 succeeded.
- Decorative silver portrait behind the interview has directional dark gradients, .48 desktop opacity and .30 mobile opacity; no fixed background.
- Previous framing refinement anchors only the release hero to the source photo's top edge (50% 0% desktop / 51% 0% mobile), preventing hair cropping on wide screens. Original hero height and title size retained.
- Closing quote caps at 64px and 1300px width with 1.12 leading, .035em negative tracking and 96px maximum vertical section padding; original wording retained.
- Current release stylesheet cache: estero-editorial.css?v=20261030-visual-story-1.
- Approved visual refinement: merge the former paper story section and standalone petals photo into one dark photographic article; remove the independent duplicate image.
- Added the English translation of the supplied manifesto’s opening question as a prominent lead; existing two context paragraphs retained.
- Desktop: title, lead and both context paragraphs overlay a directional shadow on the left; portrait sits to the right with the face clear. Copy width capped at 680px; body 20–22px.
- Mobile/tablet <=960px: title and lead overlay the portrait, then body continues on black; phone body 18px and lead 24px. Gradient fades the picture into the text.
- Metadata retains all six fields in a compact strip below the article: 6 desktop columns, 3 tablet columns, 2 phone columns. Original visual-study credit retained.
- Latest changed files: `css/estero-editorial.css`, `siento.html`, this checkpoint. Artist page and interview content retained.
- Validation: static build passes 24 maintained public pages; whitespace check passes; PR static CI passed.
- Previous hero framing checked at 1920x900 and phone 390/320 frames (375/305px content widths); full head remains visible.
- At 1920px, revised closing quote measures 1300x286.7px with 64px text.
- Hero object-position remains 50% 0%; closing quote, shadow interview and artist page are unchanged by the current refinement.
- Instagram order: 01 Siento, 02 Estero, 03 Fashion After Fabric; 1080x1350 PNGs with original photographs and approved typography, repeated category numbers/dividers removed.
- 01_SIENTO.png: libfile_2d62505da8848191bfab6f55e1c72694, version 1.
- 02_ESTERO.png: libfile_bc8ca3f3c5188191b859d630c654ac6c, version 1.
- 03_FASHION_AFTER_FABRIC.png: libfile_dfbe986e44b481918a32c37697a348ea, version 1.
- Carousel ZIP: libfile_7bd2cfdb533481919d47674c7dc9052a; preview: libfile_86be1ab9d8808191a5a54839e5bd7a9d; both version 1.
- Image files were revised in place, preserving identity/history; no Instagram posting was requested or performed.
- Animation slots remain documented in artist hero, release hero and story backdrop; preserve corresponding posters and reading overlay.
- No verified listening/purchase/presave URLs supplied; no guessed destinations or empty players added.
- Previous reading refinement: PR #700 deployed as ccb433ac; Pages 41137176120 succeeded. Current photographic refinement: local build/whitespace pass; 1920px and phone 390/320 preview checked, no horizontal overflow.
- Read Estero’s words still targets #in-his-words; original paragraphs, Spanish interview, dates and photographs are retained. Only release-story/metadata presentation changes.
- Current photographic refinement is implemented locally; publication and public verification pending. Next: publish, then await owner’s animation clips, final artwork and listening links.
