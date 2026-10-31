## 2026-10-31 / mobile hero without repeated navigation
- Owner request: remove clutter above the phone Identity photograph; use the existing small label inside the hero.
- Baseline main: `9342379bc07fbefbf892c31c42830553b5b83e9e`; no concurrent head change observed before commit.
- At widths up to 800 px, hide the top Back / Step / Start over row and the four-stage rail. Existing hero label, title and description remain; footer Back / Continue stays available. Desktop navigation remains visible.
- Files: `full-editorial-atelier.css`, cache key in `full-editorial.html`, updated mobile expectations in `tests/lab-full-editorial-browser.mjs`, and this checkpoint. No generation JavaScript changed.
- Verified: 10/10 existing Image UI contract and Full Editorial source tests pass. Browser inspection of actual page markup/styles at phone and desktop iframe widths confirms hidden mobile rows, hero 12 px below header, preserved desktop navigation and no phone horizontal overflow.
- Local visual fixture is presentation-only, with published images. Dedicated complete authenticated/mock billing browser suite was updated but not executed locally; CI remains required. No paid generation was run.
- Publication: this change is prepared for main; Cloudflare exact-commit status and production asset remain to be checked after commit. Do not infer live publication from the commit.

## 2026-10-30 / image-led Full Editorial Studio flow (PR #704)
- Approved visual direction: fashion photographic atelier, not a technical form, futuristic UI or decorative sci-fi scene. Full-screen responsive photo stages, clear Who/Identity > Wear/Styling > World/Location & Mood > Series/Generate.
- Reuses published original user-supplied casting assets: bronze-cast03 hero, plum-cast03 Identity, chrome-cast03 Styling, ivory-cast03 review, plus approved angular desert artwork in the World stage. No synthetic mockups are used as selectable assets.
- Public casting photos are labeled as sample references, never passed off as a user's saved private characters. Selecting an example constructs a real browser File, enters the existing bounded reference array, and is uploaded via the existing secure upload route only when the user requests the actual quote. The resulting job uses the identity/outfit/room role mapping.
- My characters, saved outfits and saved locations keep the existing authenticated PVSCENE1 Elements / private asset retrieval. Uploading user photos and describing looks are separate first-class inputs.
- Location, mood and material are independently remembered, with one choice per category. Time of day, atmosphere and color palette are real prompt directions. No invented AI preview, fixed credit estimate or fake result gallery.
- Review shows actual chosen reference thumbnails/text, output model, resolution, count, ratio, and explicit live server quote. Paid generation stays four quotes per user-approved batch, using original confirmed-job and refund handling. Only completed jobs enter the results gallery.
- Mobile navigation is accessible, editorial progress stays legible, top/footer Back share the same state-preserving action. Stage typography combines a restrained grotesk and a single expressive hero italic, avoiding generic luxury or cyberpunk decoration.
- Existing main studio, other pages, payment routes, models and history unchanged.
- Tests: static, visual/asset, Image UI, public search and dedicated 1440/390 browser flow with Back, reference selection, world persistence, real server quote, explicit confirmation, result cards and phone overflow. Workflow captures 12 reviewable desktop/phone screenshots (artifact kept one day).
- Production confirmation must be checked after merge and deploy. Reference portraits and photo crops are illustration, not model-likeness guarantees.

## 2026-10-29 / editorial hero and Studios card cohesion
- Owner accepts the angular bronze sculpture hero and editorial typography. Requested stronger hero CTA, same photograph in Full Editorial Studios card, concise card description and subtle four-stage progress feedback.
- Card now displays same owner-supplied angular desert image via previously approved CDN URL, with title, 'Build a complete fashion story.' and understated round arrow. Beauty, Fashion, Outfit and Retouch images remain unchanged.
- Studios JS/CSS cache versions refreshed on index, studio, beauty, moods and Full Editorial. Routing remains unchanged; menu active state accounts for Full Editorial.
- Hero CTA enlarged to 278x62px desktop, 248x55px mobile with more readable font. Button label and click action ID remain unchanged.
- The actual four-stage creation workflow now includes read-only progress feedback, reflecting current and completed steps from go() while preserving generation and credit logic.
- Files changed: lab/studios-menu.js, lab/studios-menu.css, lab/full-editorial.html, lab/full-editorial.css, lab/full-editorial.js, four shared entry pages, two tests and this note.
- Branch feat/pvlab-editorial-hero-menu-coherence-20261029. PR, CI and Cloudflare deployment status not yet verified.

## 2026-10-29 / angular desert hero and editorial typography
- User explicitly selected image 3, angular bronze sculptural installation with black-clad model in the desert, replacing ivory fabric.
- Owner-supplied original: hf_20261028_233627_10a3c169-0264-4d3d-9be6-65aed55f126a.png. Confirmed media CDN upload ID 6b5a3dd5-7d0e-46df-bd99-a1dbeb9c010a (external dependency). Hero, image preload and OG now use that image.
- Accessible heading Full Editorial Studio receives contrasting italic Studio., a restrained descriptive line, a four-part numbered workflow rail and clear Create your editorial action. Gradient and mobile crop adjusted independently.
- Account, credit quote, generation workflow and studio controls untouched. Branch feat/full-editorial-angular-hero-typography-20261029. Production deployment requires separate verification.

## Approved ivory-fabric Full Editorial hero replacement, 2026-10-29
- User rejected wet-haired chrome model, selected visual #2: dramatic ivory sculptural fabric in an industrial hall. Use supplied full-resolution original `hf_20261028_230415_de672549-cd46-42a2-b2d2-a92b25975add.png` rather than cropping six-panel mockup.
- Uploaded original to Higgsfield media CDN, media id `170a21ab-5d66-44bd-ada6-533d07a00014` (external source); hero, preload and Open Graph image point to CDN PNG. Third-party image dependency remains, not repository-hosted asset.
- Full-bleed responsive CSS gradient for legibility. Existing independent copy, buttons, account, and generation logic untouched.
- Feature branch: `fix/pvlab-full-editorial-ivory-hero-20261029`. Production deployment not yet verified.

## Clean photographic hero replacement, 2026-10-28
- Owner supplied a screenshot showing pixelated Full Editorial hero and ghost wording behind the live title.
- Root cause: `full-editorial.html` referenced a flattened 1536x1024 UI mockup as if it were a standalone fashion photograph; CSS enlarged its small embedded photo, exposing baked-in labels and softness.
- Replaced hero `src` with the separate clean image `lab/visuals/full-editorial-hero-clean-20261028.jpg` (Git blob `be516a8082664ab99816ce422d2561a08a03d0b1`). It is a photographic reconstruction/crop from the new clean image generation; no text or UI is embedded. 1190x809 JPEG before full-size CSS display.
- Positioned clean photo at the right with responsive crop and independent gradients on left, retaining approved Full Editorial copy, buttons, flow, account, billing, and all generation behavior.
- Updated `tests/lab-full-editorial.test.mjs` to require the standalone JPEG and reject the old flattened screenshot.
- Branch: `fix/full-editorial-clean-photographic-hero-20261028`. CI, Cloudflare deployment and real browser appearance are separately checked before claiming live.

# Full Editorial Studio implementation checkpoint
Updated: 2026-10-28 (Berlin)
Branch: feat/pvlab-full-editorial-studio-20261028

## Owner-approved design and scope
- Build dedicated Full Editorial Studio page following the provided six-panel dark editorial reference. Preserve the large hero with the same wet-haired fashion model, chrome garments, dark industrial tone and minimalist typography, and follow model -> styling -> mood/location -> generation -> progress -> results.
- Original approved composite asset is the exact user-attached `5c7c5043-0dbb-4297-b339-e95ff7201c7f.png`, publicly hosted unchanged under confirmed upload `d6c51742-8079-4412-a063-25ed134cec95.png`. Hero uses CSS cropping of the original screenshot. This is not an original clean fashion image layer: the exact photograph does not exist separately in the conversation.
- No new generated images, third-party stock imagery, or misleading mock result images. Existing first-party imagery is used for non-billable mood selection thumbnails. Real user-uploaded previews and actual completed job assets replace them in the workflow.
- Keep original Beauty/Outfit/Fashion/Retouch function and existing selected artwork. Full Editorial card now leads to `/full-editorial.html`; legacy `studio.html?tool=fashion&workflow=editorial` redirects there.

## Files
- New `lab/full-editorial.html`, `lab/full-editorial.css`, `lab/full-editorial.js`.
- Shared navigation: `lab/studios-menu.js` and cache-key refresh in `lab/index.html`, `lab/studio.html`, `lab/beauty.html`, `lab/moods.html`.
- Tests: `tests/lab-full-editorial.test.mjs`, `tests/lab-full-editorial-browser.mjs`, existing landing tile expectation.
- CI: `.github/workflows/pvlab-full-editorial.yml`.

## Actual workflow
- Upload one to four identity photos, up to three garment references and two optional environment references; cap 10 total images and each input to 20 MB JPG/PNG/WebP.
- Saved Elements from the authenticated account are available directly in the three steps: `GET /api/packs`, filtered by existing `PVSCENE1|characters/outfits/locations|` names, using at most two selected views per pack and source IDs already owned by the account. Read-only thumbnails come from `/api/assets/:id/thumbnail`. Nothing in Elements is overwritten or copied.
- Artistic direction derived from selected tile plus custom text, with labeled reference roles (`identity`, `outfit`, `room`). Strength sliders are **creative prompt emphasis**, never claimed to be native numeric provider controls or guaranteed consistency.
- Uses existing Clerk and session request helpers. Real Worker `/api/uploads` for private images, `/api/quotes` with at most four bound prices, `/api/jobs` with explicit `confirm:true` and server quote IDs; each result is a real completed job read from `/api/assets/:id`.
- 4/8/12-image selection is implemented as separate groups of up to four; new batches require a new server quote and distinct user confirmation, not an assumed price or hidden purchase.
- No automatic retry on ambiguous paid submission. Completed results are downloadable as a ZIP of original image blobs.
- User may open existing Retouch and Video Studios without claiming the uploaded result is automatically transferred.

## Verification and release
- New mock-browser test exercises 1440/390 widths from actual upload through quoted credit review, explicit confirmation and four completed image assets; it must not contact real billable endpoints.
- Run targeted CI plus existing approved Image UI checks, review PR diff, then merge only after relevant checks. Confirm Cloudflare `pvlab-studio` deployment check for exact merged SHA separately. Source commit alone is not live verification.
