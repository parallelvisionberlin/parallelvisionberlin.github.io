# Alejandro Molinari / Photography handoff

Date: 2026-10-21
Goal: maintain one canonical photography archive, classify all supplied photographs and publish unique compositions only.
Canonical route: `/photography/`.
Old route `/photo-work/` now has an HTML/JavaScript redirect preserving `#nocturne`, `#after-hours`, `#negative-space` hashes. There is no second active portfolio page.

Editorial direction: preserved warm analog-paper look and old-style serif typography from the former Photo Work layout. Removed sentimental hero text and flowery descriptions. The table of contents scrolls to one independent gallery section per series, rather than swapping the entire gallery.
Current series order: Nocturne (13), After Hours (11), Negative Space (2), Day (3), Night (5), Amber Room (4), Silver Room (9), totaling 47 unique public photographs.
Photo carousel frame never changes its size while paging. All photographs use `object-fit:contain`, so there is no crop. Original image files are self-hosted at `photography/assets/`.
Photo references `nocturne-02.jpeg` through `nocturne-05.jpeg` reuse exact GitHub Git blob SHAs of the originals previously hosted in `photo-work/images/nocturne/`; all 10 hashes checked against original Drive-mounted files.
Files: `photography/index.html`, `photography/style.css`, `photography/archive.js`, `photography/gallery.js`, `photo-work/index.html`, `alejandro-molinari.html`; readmes updated.
The artist page retains links to one canonical photography URL, no duplicates. No modifications to homepage, PV LAB, Nina or related worker code.
The old photo-work CSS, JS and image archive remain inert for rollback/compatibility; they are not referenced by the active page.

Prior unification QA: Chromium rendered the self-contained page at widths 320, 360, 375, 390, 430, 680, 768, 1024, 1440 px. Verified no horizontal overflow, ten original file hashes match, three galleries with correct counts, first images load when brought into view, no JavaScript errors, and After Hours photo stage unchanged in height after advancing.
The old personal/private browser editor is stored in the user's Google Drive, not deployed publicly.
Consent: the photographer confirmed original authorship and that the models approved publication. The portfolio contains artistic nudity (18+), maintains a discreet noindex directive.
Status (2026-10-21): PR #381 merged into main as commit 080466a797b945cc0db139f159314861bb84e232. All six reported checks completed successfully for that commit: GitHub Pages build/deploy/report, Validate, Approved Image UI, and Cloudflare Pages. The canonical route is /photography/; /photo-work/ redirects. Direct HTTP access to parallelvisionlabel.com could not be verified from this runtime due to network/DNS restrictions. The owner can visually review the canonical URL on iPhone. 
Next: verify deploy checks and public route after merge; add any new photographs solely in the canonical manifest.

## 2026-10-21 / Nocturnal editorial redesign

- Based on the verified canonical `/photography/` site only; no second website, no changes to other pages.
- User requested smaller Alejandro Molinari title, much shorter hero, immediate gallery entry and atmospheric near-black forest-charcoal background with subtle analog texture.
- Changed `photography/index.html` title presentation, short factual intro, non-emoji AM wordmark, jump to Nocturne, reduced intro and navigation. Changed `photography/style.css` with scoped nighttime styles. Added procedurally generated neutral noise tile `photography/assets/film-grain.png` applied to page background, not images.
- Preserved existing 10 original JPEGs, all 3 separate galleries, Nocturne first, keyboard/swipe/arrows/counters, fixed photo-stage geometry and uncropped images. `archive.js` and `gallery.js` unchanged.
- Chromium local tests at 320/360/375/390/430/680/768/1024/1440px passed: no horizontal overflow or runtime errors, anchor navigation works, stage height unchanged when advancing, photo counts 5/4/1. SHA/byte-identical check for all 10 originals.
- Production deployment: pending verification of pull-request merge and GitHub Pages/Cloudflare checks. Direct live domain HTTP from this runtime not yet verified.


## 2026-10-21 / Catalogue additions and duplicate review

- Base: main `9ba81609`, including the concurrent nocturnal editorial redesign. Rebased the catalogue additions onto that design; its CSS and noise tile remain the current implementation.
- Scope: `archive.js`, photo-count and camera metadata in `index.html`, `README.md`, this handoff, and 37 new display assets under `assets/{nocturne,after-hours,negative-space,day,night}/`. No new gallery engine or layout.
- Day: DSCF9045, DSCF9053, DSCF9258. Night / Forest creatures: DSCF9094, DSCF9098, DSCF9160, DSCF9183, 1DSCF7570.
- After Hours gains four supplied interior JPEGs (88527B82, 8009CDF7, E0E4E219, 057EBED0) and the DSCF0813 shower study. Negative Space gains DSCF1351, alongside the existing DSCF1331 study.
- Nocturne gains PRINT, The Embrace, IMG_1345, Lost Highway, 4647EC53, IMBWG_1132 and IMG_7946. The existing high-resolution nocturne-05 is captioned Untouched by Time. 4647EC53 is a separate exposure (crossed hands), confirmed visually; retain it despite the similar pose to nocturne-04.
- Omitted from public display: DSCF9053(1), the smaller/cropped Untouched by Time export, IMG_1273 (use the full flower composition IMG_27231), and exact byte duplicate IMG_1345(1) (reuse IMG_1345). Source variants retained; no originals deleted.
- Reviewed every supplied image against the original ten using contact sheets, byte hashes and perceptual comparisons. All ten old JPEGs remain byte-identical; new JPEG display assets are byte-identical to uploads. All 47 public sources and hashes are unique.
- Camera metadata is now Fujifilm / Canon, verified from the actual EXIF of the existing Canon EOS REBEL SL1 image and the new Fujifilm X-T50 TIFF.
- Source archive: Google Drive > Alejandro Molinari - Photography Archive. Latest additional uploads: six interiors (IMG_1198, IMG_27231, IMG_1210, IMG_2687, IMG_1246, IMG_7981), two Nocturne road images (IMBWG_1132, IMG_7946), one private flower crop (IMG_1273). Final folder counts verified by readback: Nocturne 13, After Hours 11, Negative Space 2, Day 3, Night 5, Amber Room 4, Silver Room 9; three source variants in 99 - Source Variants.
- Archive folder ID: 15xohvgHBqtVV38C05ECKL9-nA12ChZZI. Day: 14ay3CVrgqYWiNC0trnxbRrHUI2dWLT6x. Night: 1Vu50CUYhoIWciHSk_L0WTFWx4GS1g5BB. Variants: 1fuk9NjG7qi7JTXLQ2AEceJevqATYQN6e.
- TIFF master: DSCF0813.tif, 239,756,586 bytes, sha256 5abcadb0826deebc86f28e36dc33f848a56912024a17ff3d1ac6a0ede317a075, retained as the supplied persistent original. Drive upload rejected it above the connector's 104,857,600-byte limit. Do not claim that the TIFF master was copied to Drive. Its Library identity is libfile_3c842e65b1d48191912cfc2f723b3d08.
- TIFF web export: sRGB-managed JPEG, 2048x1367, 794,231 bytes, full frame; no cosmetic edits. Saved in Silver Room on Drive as DSCF0813-web.jpg; master remains intact.
- Static checks passed: JS syntax, all source paths exist, 47 unique paths and SHA-256 hashes, original-ten byte comparison, 36 new JPEGs equal uploads. Browser QA: local Playwright executable absent and official download returned a truncated archive; use hosted preview/live browser after publication. No mobile/browser pass is claimed yet.
- Current task status: local implementation and Drive source organization complete, awaiting PR checks and publication. Nocturne 13, After Hours 11, Negative Space 2, Day 3, Night 5, Amber Room 4, Silver Room 9. Exact alias IMG_1345(1) reuses the already saved IMG_1345 bytes, avoiding a redundant Drive upload.

- Latest session: Amber Room has DSC01805, DSC01808, DSC01811, DSC02101; Silver Room has DSC01804, DSC02058/72/84/87 and four earlier monochrome interiors (IMG_1198, IMG_1210, 057EBED0, DSCF0813 web export). DSC02122 (2) goes to Nocturne. The similar DSC01804/01805 poses are separate exposures, confirmed by crop comparison; both remain.
- Latest layout source is main b26efcd2 (direct gallery entry, index at bottom and no image enlargement), preserved when resolving concurrent index edits. A small CSS addition wraps long film-marker rows on mobile as gallery counts grow.
- Drive Amber Room folder: 1mrwtdkKPwnB82_NJhbAPfSufKa8VxXJK. Silver Room: 1EnqkYqtNvH-0-6LATefN4uQqnxEg8NVf. All 39 distinct newly supplied JPEG source files are saved; the exact alias IMG_1345(1) reuses IMG_1345. TIFF master exception remains documented above.
