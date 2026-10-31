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

## Estero / Siento, 2026-10-31
- Current task: replace the homepage Sube feature with Siento, final cover, shadow portrait and article link. Publication pending after preview checks.
- Product scope: `index.html`, five Siento mappings in `language.js`, `assets/estero/siento-artwork-final.webp`; this checkpoint also updated.
- Final cover supplied as ARTWORK FINAL.png (2048 square); web derivative preserves full frame, 2048x2048 WebP quality 92, 464670 bytes, no generative edits.
- Homepage: full square cover at left, original metal portrait in shadow behind the text, Featured release / Siento / Estero, original manifesto question, Read the story.
- Both feature links target `./siento.html#release`; existing Siento Releases card now uses the final cover too.
- Featured release avoids implying the forthcoming release is already available; no guessed music-platform link.
- Homepage typography remains existing Michroma/Inter; feature CSS scoped to `.current-release`, portrait fades to black and keeps its top edge visible.
- Mobile <=700px stacks cover above copy with a softer portrait shadow; cover frame is never cropped or zoomed.
- English/German translations updated and language script cache version is `20261031-siento-feature`.
- Source-extracted preview verified at 390px, 320px, 1363px and 1920px, no horizontal overflow; EN/DE switch, decoded final cover and portrait confirmed.
- Local `npm run build` passed 24 maintained public pages; whitespace check passed. Source CI/public verification pending.
- Baseline main before publication: `13324d6008b6df49f45a994d24f435ef72867a89`; concurrent Studios changes preserved.
- Artist URL: https://parallelvisionlabel.com/estero.html
- Release/article URL: https://parallelvisionlabel.com/siento.html#release
- Owner authorized publication and supplied photographs. Native GitHub connector is the write route because shell Git lacks credentials.
- Artist: Estero / Andrés Zendejas, Mexican producer and DJ; supplied biography is the source.
- Release: Siento / PV016; Beatport 6 November 2026, all platforms 20 November 2026.
- Artist page: metal portrait hero, biography/vertical portrait, Siento feature and Fashion After Fabric visual pair.
- Release page: night hero, photographic manifesto story, compact six-field release strip, four-question adaptation and closing quote.
- Questions frame supplied manifesto excerpts editorially; original Spanish answers and adaptation disclosed.
- Shared presentation: `css/estero-editorial.css`, `js/estero-editorial.js`; stylesheet version `20261030-interview-type-1`.
- Original pages PR #690, deployed merge `9bb0866c0c876d4dc6d2d062cb885bd734713417`; Pages 41119099499 succeeded.
- Homepage Artists includes Estero (roster 12); original roster/release entries retained; sitemap and build verifier include both pages.
- Original photos in assets/estero, full supplied resolution WebP quality 90, no generative retouch or identity changes.
- IMG_8214.jpeg -> estero-metal-portrait.webp (artist hero and new homepage shadow).
- IMG_8224.jpeg -> siento-night.webp (release hero, formerly homepage editorial thumbnail).
- IMG_8201.jpeg -> estero-petals-full.webp (artist biography).
- IMG_8202.jpeg -> estero-petals-portrait.webp (artist gallery and release story backdrop).
- IMG_8217.jpeg -> estero-silver-portrait.webp (artist gallery and shadow interview backdrop).
- Release hero top anchored 50% 0% desktop / 51% 0% mobile; original height/title retained; closing quote capped at 64px / 1300px.
- Photographic story PR #701, merge 3b188d37, Pages 41139867141 succeeded; former paper section and duplicate photo merged into one dark photographic article.
- Clear story heading: “Siento: feeling as resistance”. Exact original question and both full original context paragraphs are locked; do not shorten without owner instruction.
- Lead: “What makes us human: our biology, or our capacity to feel?”
- Full paragraphs begin “In the manifesto for Siento…” and “Against this backdrop…” exactly as supplied; restored PR #709 source 9a22813bce29f777db07d43d3e5025ee53344cca, deployed aaf0179f7c4809413c2b0a93c164170c1963bbdc.
- Pages 41146124749 succeeded; browser verified exact original copy, retained heading and photographic design.
- Story desktop: copy over left directional shadow, portrait right, 680px measure, 20–22px body; mobile title/lead over photo, then 18px body on black.
- Metadata: six desktop columns, three tablet, two phone; original visual-study credit retained.
- Shadow interview PR #694 / Pages 41123042606: silver portrait directional gradients, .48 desktop / .30 mobile opacity, no fixed background.
- Interview type PR #706 / Pages 41141312323: local Barlow Condensed Medium for uppercase title and questions, small connecting “on”; body normal sans 20px/18px, 62ch measure.
- Font: `assets/fonts/barlow-condensed/BarlowCondensed-Medium.woff`, 49876 bytes, google/fonts, adjacent OFL.txt retained.
- Instagram edition: six 1080x1350 PNGs from original photos; order Siento, Estero, Feeling as resistance, In his own words, Fashion After Fabric, release dates/link.
- 01_SIENTO.png: libfile_2d62505da8848191bfab6f55e1c72694 v2; 02_ESTERO.png: libfile_bc8ca3f3c5188191b859d630c654ac6c v2.
- 03_FEELING_AS_RESISTANCE.png: libfile_36a57017a0288191981e58d26ce3959e v1, original question restored; 04_IN_HIS_OWN_WORDS.png: libfile_4b99efba9b28819196cc6f0208904d14 v0.
- 05_FASHION_AFTER_FABRIC.png: libfile_dfbe986e44b481918a32c37697a348ea v2; 06_RELEASE.png: libfile_e6100f66a0f881919c20bd90c1d0f534 v0.
- ZIP: libfile_7bd2cfdb533481919d47674c7dc9052a v3; preview: libfile_86be1ab9d8808191a5a54839e5bd7a9d v3.
- Caption: libfile_0fa954c693f88191b0ae84a4927aa154 v1; exact original lead and both complete paragraphs; also in ZIP.
- Corrected artifacts saved with identity/version guards; other five PNGs byte-identical; ZIP CRC/inventory and exact caption verified. No Instagram posting performed.
- Use native Library download links if sandbox ZIP fails; do not invent an unverified cause. Carousel is unchanged by the homepage task.
- Animation slots remain in artist hero, release hero and story backdrop; preserve posters and reading overlay.
- No verified listening/purchase/presave URLs supplied. Next after homepage publication: owner supplies animation clips and listening links.
