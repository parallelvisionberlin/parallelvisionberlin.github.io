## 2026-10-31 / tighter Identity source strip
- Owner request: make the Choose a model heading, description and source tabs slightly more compact, using the supplied cropped strip and current desktop page.
- Baseline main: `d541ac1ba395745c4a71f72f210155d51a1a83ad`; isolated branch `fix/editorial-source-spacing-20261031`.
- Desktop Identity only: workspace top padding 22 to 14 px, heading maximum 36 to 32 px, heading-to-tabs gap 12 to 8 px, tab height 42 to 36 px, tabs-to-cards gap 16 to 12 px. Expected card-row rise about 26 px at 1920 px.
- Hero, progress rail, card images/sizing, text, phone layout and uploaded-model flow retained. No generation or account JavaScript changes.
- Files: `full-editorial-atelier.css`, cache key in `full-editorial.html`, this checkpoint.
- Local checks: 10/10 existing approved Image and Full Editorial tests plus whitespace checks pass. Actual desktop browser: source strip 105.47 px, tab height 36 px, hero still 280 px, cards start at 475.47 px and no horizontal overflow at 1348 px. Production/CI pending.
- Next: run existing scoped checks, inspect desktop/phone layout, publish and verify Cloudflare plus production CSS.

## 2026-10-31 / approved compact casting mockup
- Owner approved the visual mockup and requested implementation on the website.
- Baseline main `fb06a7bc7f3775edfd9bfb5dd937387c3637c5e4`; branch `fix/editorial-compact-casting-20261031`. Existing model-photo handoff and latest Video changes are preserved.
- Approved reference: generated mockup `PV LAB identity casting interface.png`, Library ID `libfile_062f94a74b508191ab160b5ec2b71faa`; the mockup is a layout reference, not a replacement for original photographs.
- Identity desktop hero is 280 px, title 64-84 px, original photo reframed at 58% / 26% so eyes are visible. Shared progress rail is 38 px; repeated step text inside photographic navigation is hidden. Removed Identity / Source eyebrow.
- Choose a model and its description use adjacent desktop grid columns. Compact heading/tab spacing and square original casting photographs with captions below match the approved mockup. Phone retains its existing portrait cards, stacked source copy and hidden duplicate navigation.
- Only `full-editorial-atelier.css`, stylesheet cache key in `full-editorial.html`, existing geometry checks in `tests/lab-full-editorial-browser.mjs`, and this checkpoint changed. No generation JavaScript, model handoff, pricing or billing changes.
- Local 10/10 approved Image / Full Editorial source tests and whitespace checks passed. Actual supported-browser preview at 1363x936: cards 500-767 px, no overflow. At 1920x914: cards 503-840 px and note ends at 870 px, so all five captions fit. Phone 390x844 iframe: no horizontal overflow, navigation hidden, source copy stacked.
- Existing complete mocked desktop/phone generation workflow passed at 1440 and 390 px, including a 280 px hero, nearby description, full card-row visibility, Back, reference selection and confirmed mocked generation. Approved Image UI, gallery, backend and static validation checks also passed. A broader public Studio check fails on unchanged Upscaler intro width (334 vs 302 px); inspected without expanding scope or weakening tests. No paid generation or purchase performed.
- Published PR #732: reviewed source `3d7168c1caf6aa271876a0496f467f5c902c5da4`, merge `e53b43e785b85dec2699dccf000641c13348ed21`. Cloudflare pvlab-studio deployment `580e4b0f-eb1a-485f-812a-23bbb24d3612` succeeded for the exact merged commit.
- Exact production CSS returned HTTP 200 and matches reviewed source, SHA-256 `1fc050a19251b2d04b5c32f919c052e762c8623d560092b74d3204ff75e868f7`; cache key `20261031-compact-casting1`. Production HTML loads that version.
- Actual signed-out production browser at https://pvlab.studio/full-editorial: hero 90-370 px (280 px high), complete casting row 500-767 px and its note ends 797 px at 1363x936, no horizontal overflow. Original photography and full caption row confirmed visually. Real signed-in generation was not performed.
- Next: approved compact layout is complete and verified live; no remaining work for this request.

## 2026-10-31 / navigation inside the working hero
- Owner request: raise the working hero, place the four-stage rail inside the photograph, compact Back / Step / Start over, and move the Identity source description beside Choose a model.
- Baseline main: `1098236b0a44dd7457b59e4e278e75e27c76be1c`; isolated branch `fix/editorial-hero-navigation-20261031`. No open PR overlaps Full Editorial in the checked recent PR list.
- Desktop hero begins 12 px below the sticky header. Shared navigation is moved by go() into each visible photographic stage; review/results retain normal in-flow navigation. Back / Step / Start over overlay the upper edge, four-stage progress overlays the lower edge.
- Identity source description is a sibling of the title group, aligned at the right on desktop; phone keeps a readable stacked layout and the previously approved hidden duplicate navigation.
- Added scroll margin so stage entry does not hide the hero controls behind the sticky site header. Existing photograph, references, source tabs, quotes, generation and payment behavior retained.
- Files: `full-editorial.html`, `full-editorial-atelier.css`, `full-editorial.js`, `tests/lab-full-editorial-browser.mjs`, and this checkpoint. CSS and JS cache key: `20261031-inside-hero1`.
- Local checks: JS syntax, 10/10 approved Image UI + Full Editorial source tests, and whitespace checks passed. Existing browser suite now asserts rail/control containment, compact top gap, side-by-side description and casting visibility; its complete mocked billing flow subsequently passed in CI at both 1440 and 390 px.
- Actual preview inspected through the supported browser at 1363 px desktop and 390/1920 px iframe viewports. At 1920x914, hero top is 90 px (78 px header + 12 px gap), cards top 662 px; description is beside heading. Phone has 68 px header + 12 px gap, hidden repeated navigation, and scrollWidth equals clientWidth (375 px excluding scrollbar).
- Preview account loading reports the existing production Clerk key origin restriction on terminal.local. Local checks cover public layout only; no real sign-in, purchase or paid generation performed.
- Published: PR #730, reviewed source `dedb9dc08d65246278ad82f61e615896226e6d48`, merge `94261765d3ea81ae0b9b48c4f1c9856253e0f0e5`. Dedicated Full Editorial, approved Image, static validation, gallery and backend test checks passed. Broader Video checks failed on unchanged video-model-control visual comparison and Seedance panel overflow (726 vs 690 px); inspected without weakening gates or expanding scope.
- Production: superseding main `37829812bc1d52d50303cbdf646c2b4268bcad6c` contains the merge and identical Full Editorial source. Cloudflare pvlab-studio deployment `6be13010-722a-49b0-a0c7-62093aad516b` succeeded; original merge check still reported building when the newer verified release was observed.
- Exact custom-domain bytes verified: CSS SHA-256 `9a888fe2329eb1dc03cb7e812f456320ac077c3aeb8bb9eb7a388426828f5f86`; JS `a6051657ae86f617a72bf146c1ff110a16d6de02ab0965c7607808a2a9a8428b`. Both return HTTP 200 and match reviewed source with cache key `20261031-inside-hero1`.
- Production public browser at https://pvlab.studio/full-editorial confirms hero top 90 px, header bottom 78 px, navigation inside the hero, rail flush with hero bottom, description beside Choose a model, cards starting at 668 px at 1363x936, and no horizontal overflow. No signed-in production or paid generation claim.
- Next: this layout request is complete. Unrelated Video failures belong to separate work.

## 2026-10-31 / mobile hero without repeated navigation
- Owner request: remove clutter above the phone Identity photograph; use the existing small label inside the hero.
- Baseline main: `9342379bc07fbefbf892c31c42830553b5b83e9e`; no concurrent head change observed before commit.
- At widths up to 800 px, hide the top Back / Step / Start over row and the four-stage rail. Existing hero label, title and description remain; footer Back / Continue stays available. Desktop navigation remains visible.
- Files: `full-editorial-atelier.css`, cache key in `full-editorial.html`, updated mobile expectations in `tests/lab-full-editorial-browser.mjs`, and this checkpoint. No generation JavaScript changed.
- Verified: 10/10 existing Image UI contract and Full Editorial source tests pass. Browser inspection of actual page markup/styles at phone and desktop iframe widths confirms hidden mobile rows, hero 12 px below header, preserved desktop navigation and no phone horizontal overflow.
- Local visual fixture is presentation-only, with published images. Dedicated complete authenticated/mock billing browser suite was updated but not executed locally; CI remains required. No paid generation was run.
- Published source: `4878477628ca482e489d05da3bc208bc5d8af938`. Cloudflare `pvlab-studio` check succeeded, deployment `76498b1b-f270-4463-a787-2a9523c8b079`.
- Production browser verified at pvlab.studio: `full-editorial-atelier.css?v=20261031-mobile-hero-clean1` loaded, mobile top controls/rail compute to `display:none`, inside-hero label and footer Back remain; Back returns to arrival and Create reopens Identity. Phone scrollWidth equals clientWidth (375 px with iframe scrollbar); desktop top navigation remains visible. This was signed-out public UI, not an authenticated generation test. Direct asset hash verification was unavailable in the restricted executor; used the documented GitHub-check plus production DOM/CSS fallback.
- Broader CI failures were inspected: public Studio visual comparison reports a Video model-control height of 125 vs 124 px, and reference-preview stability expects an old lab.js script-tag shape in studio.html. Neither failure touches the files changed for this task; do not weaken these tests or change those interfaces in this mobile layout task.
- Next: no further layout work required for this request. Separate work may address those unrelated CI failures; dedicated Full Editorial billing browser suite remains unexecuted locally.

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
