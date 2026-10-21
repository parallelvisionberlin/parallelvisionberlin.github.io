# Alejandro Molinari / Photography handoff

Date: 2026-10-21
Goal: maintain one canonical photography archive, classify all supplied photographs and publish unique compositions only.
Canonical route: `/photography/`.
Old route `/photo-work/` now has an HTML/JavaScript redirect preserving `#nocturne`, `#after-hours`, `#negative-space` hashes. There is no second active portfolio page.

Editorial direction: neutral near-black photographic archive. Original Untouched by Time photograph appears as a soft, CSS-darkened shadow behind the serif artist title. Practice and abbreviated lineage appear below; native disclosure reveals the full lineage. Nocturne follows directly; the series index remains below the seven uncropped carousels.
Current series order verified from main 926e8c29: Nocturne (13), After Hours (9), Negative Space (2), Day (3), Night (5), Amber Room (4), Silver Room (9), totaling 45 public photographs. This hero change does not edit the catalogue.
Photo carousel frame never changes its size while paging. All photographs use `object-fit:contain`, so there is no crop. Original image files are self-hosted at `photography/assets/`.
Photo references `nocturne-02.jpeg` through `nocturne-05.jpeg` reuse exact GitHub Git blob SHAs of the originals previously hosted in `photo-work/images/nocturne/`; all 10 hashes checked against original Drive-mounted files.
Files: `photography/index.html`, `photography/style.css`, `photography/archive.js`, `photography/gallery.js`, `photo-work/index.html`, `alejandro-molinari.html`; readmes updated.
The artist page retains links to one canonical photography URL, no duplicates. No modifications to homepage, PV LAB, Nina or related worker code.
The old photo-work CSS, JS and image archive remain inert for rollback/compatibility; they are not referenced by the active page.

Prior unification QA: Chromium rendered the self-contained page at widths 320, 360, 375, 390, 430, 680, 768, 1024, 1440 px. Verified no horizontal overflow, ten original file hashes match, three galleries with correct counts, first images load when brought into view, no JavaScript errors, and After Hours photo stage unchanged in height after advancing.
The old personal/private browser editor is stored in the user's Google Drive, not deployed publicly.
Consent: the photographer confirmed original authorship and that the models approved publication. The portfolio contains artistic nudity (18+), maintains a discreet noindex directive.
Historical unification status (2026-10-21): PR #381 merged into main as commit 080466a797b945cc0db139f159314861bb84e232. All six reported checks completed successfully for that commit: GitHub Pages build/deploy/report, Validate, Approved Image UI, and Cloudflare Pages. The canonical route is /photography/; /photo-work/ redirects. Direct HTTP access to parallelvisionlabel.com could not be verified from this runtime due to network/DNS restrictions. The owner can visually review the canonical URL on iPhone. 
Next: add future photographs solely in the canonical manifest and compare them against the complete catalogue before publication. Current release verification is below.

## 2026-10-21 / Nocturnal editorial redesign

- Based on the verified canonical `/photography/` site only; no second website, no changes to other pages.
- User requested smaller Alejandro Molinari title, much shorter hero, immediate gallery entry and atmospheric near-black forest-charcoal background with subtle analog texture.
- Changed `photography/index.html` title presentation, short factual intro, non-emoji AM wordmark, jump to Nocturne, reduced intro and navigation. Changed `photography/style.css` with scoped nighttime styles. Added procedurally generated neutral noise tile `photography/assets/film-grain.png` applied to page background, not images.
- Preserved existing 10 original JPEGs, all 3 separate galleries, Nocturne first, keyboard/swipe/arrows/counters, fixed photo-stage geometry and uncropped images. `archive.js` and `gallery.js` unchanged.
- Chromium local tests at 320/360/375/390/430/680/768/1024/1440px passed: no horizontal overflow or runtime errors, anchor navigation works, stage height unchanged when advancing, photo counts 5/4/1. SHA/byte-identical check for all 10 originals.
- This redesign is preserved in the current release. Current production verification is recorded in the catalogue entry below.


## 2026-10-21 / Catalogue additions and duplicate review

- Base: main `9ba81609`, including the concurrent nocturnal editorial redesign. Rebased the catalogue additions onto that design; its CSS and noise tile remain the current implementation.
- Scope: `archive.js`, photo-count and camera metadata in `index.html`, `README.md`, this handoff, `style.css` marker wrapping, and 37 new display assets under `assets/{nocturne,after-hours,negative-space,day,night,amber-room,silver-room}/`. Gallery engine and page structure match main b26efcd2.
- Day: DSCF9045, DSCF9053, DSCF9258. Night / Forest creatures: DSCF9094, DSCF9098, DSCF9160, DSCF9183, 1DSCF7570.
- Colour interiors extend After Hours. Monochrome interiors, including 057EBED0 and the DSCF0813 shower study, are gathered in Silver Room. Negative Space gains DSCF1351 beside the existing DSCF1331 study.
- Nocturne gains PRINT, The Embrace, IMG_1345, Lost Highway, 4647EC53, IMBWG_1132 and IMG_7946. The existing high-resolution nocturne-05 is captioned Untouched by Time. 4647EC53 is a separate exposure (crossed hands), confirmed visually; retain it despite the similar pose to nocturne-04.
- Omitted from public display: DSCF9053(1), the smaller/cropped Untouched by Time export, IMG_1273 (use the full flower composition IMG_27231), and exact byte duplicate IMG_1345(1) (reuse IMG_1345). Source variants retained; no originals deleted.
- Reviewed every supplied image against the original ten using contact sheets, byte hashes and perceptual comparisons. All ten old JPEGs remain byte-identical; new JPEG display assets are byte-identical to uploads. All 47 public sources and hashes are unique.
- Camera metadata is now Fujifilm / Canon, verified from the actual EXIF of the existing Canon EOS REBEL SL1 image and the new Fujifilm X-T50 TIFF.
- Source archive: Google Drive > Alejandro Molinari - Photography Archive. Latest additional uploads: six interiors (IMG_1198, IMG_27231, IMG_1210, IMG_2687, IMG_1246, IMG_7981), two Nocturne road images (IMBWG_1132, IMG_7946), one private flower crop (IMG_1273). Final folder counts verified by readback: Nocturne 13, After Hours 11, Negative Space 2, Day 3, Night 5, Amber Room 4, Silver Room 9; three source variants in 99 - Source Variants.
- Archive folder ID: 15xohvgHBqtVV38C05ECKL9-nA12ChZZI. Day: 14ay3CVrgqYWiNC0trnxbRrHUI2dWLT6x. Night: 1Vu50CUYhoIWciHSk_L0WTFWx4GS1g5BB. Variants: 1fuk9NjG7qi7JTXLQ2AEceJevqATYQN6e.
- TIFF master: DSCF0813.tif, 239,756,586 bytes, sha256 5abcadb0826deebc86f28e36dc33f848a56912024a17ff3d1ac6a0ede317a075, retained as the supplied persistent original. Drive upload rejected it above the connector's 104,857,600-byte limit. Do not claim that the TIFF master was copied to Drive. Its Library identity is libfile_3c842e65b1d48191912cfc2f723b3d08.
- TIFF web export: sRGB-managed JPEG, 2048x1367, 794,231 bytes, full frame; no cosmetic edits. Saved in Silver Room on Drive as DSCF0813-web.jpg; master remains intact.
- Static checks passed: JS syntax, all source paths exist, 47 unique paths and SHA-256 hashes, original-ten byte comparison, 36 new JPEGs equal uploads. Live desktop browser QA at 1363px: seven correct gallery counts; last photograph in every series loaded successfully; every image uses contain; stages remained 627.109px high while changing images; document scrollWidth equals clientWidth (1348px). Mobile viewport emulation was unavailable in this environment, so no mobile browser pass is claimed.
- Released: PR #386 merged as 1821b734215241805991f3b6f61e3c47dc8c5a7d. Validate, Approved Image UI, Cloudflare Pages, and GitHub Pages build/deployment all succeeded. GitHub Pages run: 39581438051. Confirmed directly in the live browser at https://parallelvisionlabel.com/photography/?v=20261021-catalogue1 with all 47 photographs represented in seven galleries. Exact alias IMG_1345(1) reuses the already saved IMG_1345 bytes.

- Latest session: Amber Room has DSC01805, DSC01808, DSC01811, DSC02101; Silver Room has DSC01804, DSC02058/72/84/87 and four earlier monochrome interiors (IMG_1198, IMG_1210, 057EBED0, DSCF0813 web export). DSC02122 (2) goes to Nocturne. The similar DSC01804/01805 poses are separate exposures, confirmed by crop comparison; both remain.
- Latest layout source is main b26efcd2 (direct gallery entry, index at bottom and no image enlargement), preserved when resolving concurrent index edits. A small CSS addition wraps long film-marker rows on mobile as gallery counts grow.
- Drive Amber Room folder: 1mrwtdkKPwnB82_NJhbAPfSufKa8VxXJK. Silver Room: 1EnqkYqtNvH-0-6LATefN4uQqnxEg8NVf. All 39 distinct newly supplied JPEG source files are saved; the exact alias IMG_1345(1) reuses IMG_1345. TIFF master exception remains documented above.

- Hosting note: the pvlab-studio.pages.dev preview belongs to PV LAB and serves its landing page at /photography/. It does not verify this photography route. Use the real parallelvisionlabel.com photography URL and GitHub Pages deployment for this project.

## 2026-10-21 / Editorial split hero (branch feature/alejandro-photo-hero-editorial-20261021)
- Consolidated /photography/ hero: existing original Silver Room DSC02058.jpg on left, one-line artist name and two compact biography columns on right; preserves factual Dalí visit and links to Oscar's archive.
- Dark neutral museum palette retained. Image uses its native 2048x1362 ratio, full frame; no AI imagery, no new media assets and no retouching.
- Short direct transition into first Nocturne gallery. One count automatically reflects the live archive manifest. Existing gallery.js, archive.js, 47 originals, captions, arrow/swipe/keyboard and photo sizing unchanged.
- Local Chromium layout tests: 12 viewports (320 through 1650 px), no horizontal overflow, seven gallery sections, portrait/landscape layout, no JS page errors.
- Only /photography/index.html and /photography/style.css are modified; production deployment remains pending until PR merge and GitHub Pages checks confirm success.

## 2026-10-21 / Photographic monograph redesign
- Objective: replace template-like 50/50 framed hero with an institutional photographic monograph composition, keeping the requested dark archive palette.
- New hero is an oversized single-line Helvetica Neue artist name over a 38/62 image-led spread: one readable practice/lineage note on the left, original camera-and-mirror Silver Room image on the right.
- Source image: `photography/assets/silver-room/DSC02058.jpg`, original unedited; links to Silver Room. No new images generated, no cropping. Oscar Molinari’s historical details remain source-linked, without making an unsupported cohabitation claim.
- Only `photography/index.html` and `photography/style.css` are changed. Stylesheet is rewritten to remove conflicting cascades while preserving gallery dimensions, controls and accessibility. `gallery.js`, `archive.js` and all 47 image assets remain untouched.
- Local real Chromium rendering used inline assets because external browser navigation was blocked in this environment. Verified 12 viewport widths (320–1650px), no horizontal overflow or JavaScript errors, all seven galleries rendered, hero image loaded, and image carousel remains constant-height after changing photos at 320, 390, 1024 and 1650px.
- Source versions and draft files preserved in the owner’s private Google Drive Photography Archive / 04 - Website Drafts. Source parent commit for this branch: `e895212e70e421d3827c4a117a51376477440ee8`.
- Deployment status: pending PR merge and authoritative GitHub Pages build/deploy. Do not infer live domain behavior from Cloudflare PV LAB preview.

## 2026-10-21 / Diptych photographic cover, edition 004
- User rejected PR #395 as too similar to split photo/text template. Explicit aim: a real photographic archive with the photographs visually leading. New structural concept: one-line italicized serif artist title, TWO archival photographic works alongside each other as a naturally sized uncropped diptych (Silver Room DSLR-camera original / Nocturne original vertical night-flash), and one short, readable artist+Oscar Molinari biography BELOW the photographic spread. No half-page filler or bio cards.
- Scopes only photography/index.html and photography/style.css; reuses self-hosted originals `assets/silver-room/DSC02058.jpg` and `assets/nocturne-02.jpeg`. No new images, no crop, no alterations, no image-generation. Original archive.js/gallery.js and 47 photograph assets across 7 independent series unchanged.
- User's requested context preserved: Fuji/Canon cameras, Berlin photography practice, Oscar Molinari Herrera and 1972 Cadaqués visit, 1973 independent film workshop, with direct archive link, no unverified cohabitation claims. Dark neutral (#151515) museum-archive palette.
- Local Chromium source preview tested across 13 viewport widths (320, 360, 375, 390, 428, 600, 700, 768, 800, 1024, 1280, 1440, 1650 px), no document horizontal overflow, both cover originals fully loaded, all seven sections built, no JS runtime errors. Fixed photo stage height confirmed before/after navigation at 390 and 1440 px.
- Working source and backups: user's private Google Drive / Alejandro Molinari - Photography Archive / 04 - Website Drafts / museum-diptych-hero-20261021-{index.html,style.css}. Local previews: /mnt/data/photography_monograph_v4/v4-{390,1440}.png. Branch `feature/alejandro-photographic-diptych-20261021` based on `e51ebfeaf50f4e5ca709d6271a3d023df87e3470`.
- Deployment status: pending checks and merge. Authoritative photo archive is GitHub Pages / parallelvisionlabel.com, NOT PV LAB's Cloudflare Pages preview. After release check GitHub Pages build and deploy, then use a query-busted URL for owner review.

## 2026-10-21 / Direct-to-photo museum layout
- Following user review of diptych cover, removed both redundant hero photos. Approved flow: one-line large artist name; two coherent factual blocks left/right on desktop; directly into first Nocturne photograph.
- Background now pure neutral near-black #080808, not charcoal gray/green. Text warm ivory. No hero figure borders, no template-style bio cards.
- Preserved live seven galleries (47 unique images), all original images and captions, gallery.js, user controls, links and accessibility. No new images added.
- Only photography/index.html and photography/style.css changed. The previous diptych remains in Git history for rollback.
- Desktop and iPhone layouts defined via responsive CSS. GitHub build and live visual tests are tracked by the PR; no claim of full Safari test before owner verification.
- Branch: fix/photography-direct-hero-20261021. Deployment status: pending merge and GitHub Pages check.

## 2026-10-21 / Nocturne sequence
- User selected “Untouched by Time” (`assets/nocturne-05.jpeg`) as the opening photograph in Nocturne.
- Checked actual pixel dimensions and EXIF orientation of all 13 Nocturne originals in the user's Google Drive source folder. Nine are landscape, four are portrait.
- Reordered only the 13 `images` entries in `photography/archive.js`: featured landscape image first, then all other landscapes in previous relative order, then the four portrait photographs in previous relative order.
- No file, caption, image path, gallery name, other series, gallery script or page style was modified. All seven galleries still contain 47 photographs.
- Source edit branch: `fix/nocturne-feature-first-landscapes-20261021`; publication requires green validation and the site-specific GitHub Pages deployment.

## 2026-10-21 / Oscar bio and artist link identity
- Scope: photography index, CSS and a copy of the already approved AM07 monogram. No changes to photographic works, image manifest, gallery engine or unrelated sites.
- A concise extended biography now identifies Oscar Molinari Herrera as an Italian-Venezuelan pioneer in experimental film/photography/video art; mentions Ojo de agua (1972), the Independent Film Workshop (1973), Salvador Dali friendship/mentorship, and Polaroid/video work with Alejandro Jodorowsky.
- Public sources: https://elarchivo.org/oscar-molinari-herrera/ ; https://en.everybodywiki.com/Oscar_Molinari_Herrera . Lifelong Dali friendship is documented publicly; the mentor detail is family testimony supplied by the photographer. Do not claim that Oscar lived with Dali.
- On photography mobile header, replace the blue emoji-style external-link symbol after ARTIST PAGE with a local self-contained copy of the chosen AM07 monogram from personal-site favicon.svg. Both header logo link and Artist Page destination point to https://alejandromolinari.com/; no unrelated site source modified.
- CSS styles 26px desktop and 24px mobile, no third-party image loading. Add a locally hosted favicon reference. Keep dark colour palette, unchanged gallery layout.
- Current publish status: pending deployment checks.

## 2026-10-21 / Safari touch interaction fix
- Removed the non-passive second touchend event handler that called preventDefault on image double taps, leaving one passive swipe recognizer.
- Replaced photo-stage and image touch-action pan-y with manipulation, allowing scrolling and pinch accessibility while suppressing browser smart double-tap zoom on the photo.
- No changes to photo files, gallery order, captions, hero, biography or theme. Versioned JS and CSS URLs to invalidate old mobile cache.
- Requires GitHub Pages deployment and user device confirmation; local source checks do not prove Safari fixed.


## 2026-10-21 / Shadow photograph hero and expandable lineage
- User approved an original forest photograph fading behind the artist title and a collapsible Artistic Lineage story.
- Source base: main 926e8c290c3267cb6ac7d639f9d06a3e6255376c. Branch: feature/photography-shadow-hero-20261021.
- Changed only photography/index.html, photography/style.css and this handoff. Reuse assets/nocturne-05.jpeg (Untouched by Time, 5184x3456) with CSS opacity/gradients; no new media or edits to photo bytes. The hero is decorative and hidden from assistive technology; the complete original is still visible uncropped in Nocturne.
- Preserve both photographic-practice paragraphs. Lineage introductory sentence remains visible; native details/summary reveals the entire existing remainder without rewriting facts. Labels Read the story / Close the story, plus/minus marker, 44px touch target; works without JavaScript.
- No modifications to archive.js, gallery.js, series ordering, original assets, artist-site links or unrelated pages. Current base contains 45 photographs across seven series; respect the owner's concurrent catalogue changes.
- Source QA: lineage text preserved exactly after whitespace normalization; every local HTML asset reference exists; JS syntax and git diff --check passed; archive.js/gallery.js remain byte-identical to the base.
- Browser QA through the supported Sites preview: hero original loads at naturalWidth 5184, native disclosure opens by click and closes by Enter; seven galleries render; desktop 1363px has equal scrollWidth/clientWidth 1348px. Responsive CSS adjusted at 700/480/360px; no mobile browser emulation was available, so a mobile rendering pass is not claimed.
- Owner separately requested DSCF0813.tif deletion: original moved to trash and its 239,756,586-byte scratch copy removed; existing DSCF0813 web JPEG remains. This supersedes the historical master-retention notes above.
- Publication: pending feature PR checks/merge and GitHub Pages deployment. Use the real parallelvisionlabel.com/photography/ route; PV LAB preview is unrelated.
