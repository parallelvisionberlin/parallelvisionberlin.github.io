# Beauty Studio and Studios navigation

## Tall connected Studios cards correction, 2026-10-31

- Owner likes the new joined design but explicitly wants the previous tall portrait card format from screenshot 1.
- Baseline `7dfcf1e`; restore only the two desktop card-height declarations to the original `clamp(365px,50.4vh,475px)` and intermediate `clamp(330px,45vh,420px)`.
- Preserve joined borderless photos, current type, Character Studio in the header and no lower bar. Phone card dimensions are unchanged.
- No image URLs, assets, filters, crop positions, JavaScript, ALTER behavior or generation flow changed.
- Refresh only shared menu CSS cache version to `20261031-tall-connected1` on its five entry pages.
- Owner references: `libfile_beab327c6984819182b1bb79c5de1c50` (desired tall proportions), `libfile_a9545c4c102081918f46380c79a0b1a2` (keep new styling).
- PASS: five approved Image UI contracts, diff review and whitespace checks.
- PASS desktop preview: four tall cards ~472px high, no gaps, no lower bar and no clipped titles.
- PASS 390px phone preview: unchanged two-column layout, ~304px card height, no horizontal overflow.
- Deployment pending at commit preparation.

## Approved connected Studios menu, 2026-10-31

- Owner approved the connected photographic strip mockup, then removed its lower bar. Implementation is strictly the menu's presentation.
- Baseline main `72e585c`; preserve concurrent Soul and Inspiration releases.
- Four original image URLs, filters, focal positions, labels and Studio destinations remain unchanged. No ALTER application or other tool implementation is edited.
- Edge-to-edge photographs, no separate card borders or gaps, shorter desktop height, single-line titles and quiet subtitles.
- Move the original Character Studio link into the top-right header; remove the lower bar and decorative card arrows/rules, as in the approved mockup.
- Retain existing keyboard, pointer, touch, reduced-motion and original Fashion/Retouch event handlers; ArrowDown still focuses the first photographic destination.
- Phone keeps the two-column layout with joined photographs; outer panel clips its corners.
- Entry-page changes only refresh shared menu CSS/JS cache versions to `20261031-connected-strip1`.
- Approved reference: generated `exec-157d55af-4402-44dc-818e-b5790f32e7c5.png`, Library `libfile_766a73ee4b7081919072fd6f1d754efd`.
- PASS: all five approved Image contracts, menu JS syntax and diff checks.
- PASS: desktop and 390px browser menu geometry, original decoded artwork, header Character link, ArrowDown first-card focus, Escape dismissal and no title/page overflow.
- PASS: exact original image URLs, focal positions and filters; all five entry-page changes contain only menu cache versions.
- Reviewed source `00475cbe09de3e41dde8da7198ce654112997bde`; PR #744 merged as `d91b4696c865f52e6851ca27ff3398ceb17930a7`. Uploaded tree matches the local validated tree.
- PASS GitHub approved Image UI, landing stability and both static validators. The separate legacy landing suite still expects Beauty Studio; no labels or test gates were changed.
- LIVE: exact merge Cloudflare Pages check `124624659006` succeeded; deployment `4edb516b-9da8-4a8b-845d-61aa21b1e25b`.
- Release verifier returned LIVE_VERIFIED for CSS and JS at `20261031-connected-strip1`. CSS SHA-256 `d3e126dcd6ff9fd7a8a397625416bf0ade8482f749db4d7ef490cabe8132b511`; JS `7e489944bd0e8e28e60cbe41f603e856efdafadd4c84b88bfce19e5dfeba896c`.
- Live public browser confirms four decoded original photos, zero card borders/gaps, Character Studio in the header, no lower bar and no title overflow.
- Complete. No changes to ALTER internals, any original media or generation behavior; no real sign-in or paid generation used.

## Studios menu corners and Fashion crop, 2026-10-31

- Owner asked to soften the square cards and centre the second (Fashion Studio) photograph.
- Baseline: main `e4c375d`, following the approved four-card navigation.
- Shared `studios-menu.css`: 8px card corners, 12px panel corners on desktop and mobile; image layers remain clipped by each card.
- Fashion photograph uses `object-position: center center`; keep the exact approved photograph, filters and hover zoom.
- Refresh stylesheet cache version to `20261031-soft-centred1` on index, studio, beauty, moods and Full Editorial.
- Preserve card sizes, responsive column counts, typography, labels, routes and menu interactions.
- PASS: all five approved Image UI contracts; diff whitespace check.
- PASS desktop and 390px browser checks: 8px cards, 12px panel, centred Fashion crop, two phone columns and zero horizontal overflow.
- Reviewed source `6d41edb3d27faefc936f7ebd774f826d71bfda84`; PR #740 merged as `283996fdc9d5b14c50fb84d689a7b10fc3dcbc65`. Source tree matches the locally tested bytes.
- PASS GitHub approved Image UI, landing stability and static validation. Separate legacy landing suite still expects Beauty Studio instead of approved ALTER; public visual suite fails unchanged Upscaler intro dimensions; first-image suite fails unchanged Inspiration backdrop parity. No test or unrelated flow changed.
- LIVE: Cloudflare Pages check `124605057076` succeeded for merge SHA; deployment `1b3c949d-570b-435c-a2dd-90f7abede66c`.
- Read-only verifier returned LIVE_VERIFIED; production stylesheet SHA-256 `957f02234f9e1f9892862e28d21912b8b3f8adb0003567339d384f523ff3654a` matches reviewed source.
- Live public browser confirms `20261031-soft-centred1`, all four 8px corners, 12px panel and Fashion crop 50% 50%. No sign-in or paid generation involved.
- Complete; no release action remains for this menu change.

## ALTER functional corrections, 2026-10-31

- Objective: finish PR #726 without changing the approved art direction, identity prompt, prices or other Studios.
- Integration baseline: main `a6a59ed2152c74dec1d023bdc332149266cc1378`.
- Subsequent main through `1098236b0a44dd7457b59e4e278e75e27c76be1c` changes only Video Extend CSS and its HTML version; preserve those changes at merge.
- PR original head: `68100b36b9eeb70792cb8caee3ed7a17535664b5`.
- Auto uses decoded photo dimensions and the smallest logarithmic proportional distance across all 15 ratios accepted by the existing Seedream/Flash contracts.
- Exact supported shapes stay exact, including 2:1, 1:2, 3:1 and 1:3 omitted by the original PR.
- Explicit ratios override Auto; the resolved ratio is visible in the Auto option and bound to the server quote.
- The visible model list is Seedream 5 Pro and Seedream Flash. The legacy seedream-pro input alias remains accepted.
- Editorial photographs are labelled illustrative on desktop and mobile. A pre-existing phone rule hid the label; only that heading layout is adjusted.
- Each displayed result owns an independent URL for its original image. Changing the upload cannot revoke the displayed comparison.
- History fetches the original belonging to that job. Missing originals hide comparison controls while retaining the saved output.
- Result/account revisions reject delayed output/source responses and clear private comparison URLs on sign-out.
- Relevant source: beauty.html, beauty.js, beauty-settings.js, beauty-approved-20261029.js/.css.
- Relevant tests: lab-beauty.test.mjs, lab-beauty-ui.mjs, and the existing Beauty Worker quote/idempotency case.
- PASS: all 884 Lab tests under the CI Node 22.16.0 runtime, including quote binding, credits, refunds, privacy and identity guards.
- PASS: all 8 approved Image/Beauty unit contracts and all 141 image-reference/Worker checks under Node 24.
- PASS: Beauty browser layout at 1920/1440/1366/1280/1024px; guest/menu/owner/customer checks at 1448/1024/390/320px.
- PASS: 1448/390px model selection, photo-derived/explicit ratios, visible illustration label, independent originals, history retrieval/races and missing originals.
- PASS: keyboard comparison and a real dispatched touch gesture at 390px; no horizontal overflow.
- PASS: saved Alma Extend references, payload, History/Reuse and layout at 390/1440px; its files are identical to baseline.
- PASS: static build validation, syntax checks and git diff whitespace checks.
- Original PR's seven unit failures no longer reproduce on current main. Its image-reference asset-regex failure also passes now.
- Node 24 alone fails the existing Dream Blur parallel-upload test after one setImmediate; unchanged main reproduces it. Node 22 passes all 884.
- Existing main public Studio visual CI fails Video model comparison; existing Video CI fails an image-input scroll assertion. Neither workflow nor its assertions is weakened here.
- Local Upscaler layout test reaches an existing mobile button-position mismatch under Chromium 153; all source files it exercises are byte-identical to baseline main.
- Validation uses synthetic accounts/media and intercepted provider APIs only. No real paid generation or payment is authorized or performed.
- MERGED: PR #726, reviewed source `388a5306d5816becaeb534e25871369864e1ef24`, production merge `4432ec6827b3ec8e51f133bff41b66b966a0b144`.
- The merge includes latest main `1098236b0a44dd7457b59e4e278e75e27c76be1c`; its Video/Extend/Upscaler files remain byte-identical after integration.
- PASS in updated GitHub CI: Beauty, private-lab, approved Image, image-reference test, gallery, account, search, static validation and Motion Effects.
- Other completed failures match main: public Video visual, Video input scrolling, Assets assertion at lab-assets-ui.cjs:423, and landing menu expecting the obsolete Beauty Studio name. No gate was disabled or weakened.
- LIVE: exact merge SHA Cloudflare Pages app check `124515141103`, project pvlab-studio, success; deployment `6cdcf9f9-8689-49e9-9d64-e302f356953e`.
- Read-only release verifier returned LIVE_VERIFIED against https://pvlab.studio/beauty for controller, comparison JS and CSS, using the Beauty entry instead of its default Studio entry.
- Custom-domain SHA-256 matches reviewed source: beauty.js `6be0abd596e110e1164904c617d9303d13e116a0a1f0d365d37895c74023b36f`; comparison JS `81480c47ea98638465f21e4b83a2e40b4b10145e6ca09056d85124f4fe3b19db`.
- Also matched: approved CSS `384dcd33cec0b72dd9a1b45c15dec744c53ba75d45f457e3eac980dc6319f4cd`; HTML `6fdec97e08ad43aa5b7daf405fa6af764200ee16295c7c7bc2e0a3bed9a30104`; settings JS `c5441931e65f39beec814bfdd86df9c4fd795eb1e875b18971bb04146df92039`.
- PASS on the custom domain at 1448/390px: model/ratio selection, visible illustrative label, independent original URL, keyboard/touch comparison, actual per-job originals, delayed source races and missing-source fallback. These use deployed client assets with synthetic accounts and intercepted APIs, not a real signed-in generation.
- Status: corrected behavior is deployed and verified; no paid image generation or real-account output-quality claim. No ALTER release action remains.

## Retouch image card in shared Studios menu, 2026-10-28
- Scope: Replace the existing secondary Retouch text entry with a fifth photographic tile inside the same Studios dropdown, preserving its existing Retouch route; keep Character Studio as the secondary text link.
- Approved artwork: exact owner-selected Retouch Studio card composition based on the supplied fully clothed editorial photograph; optimized and packaged as `visuals/beauty/retouch-studio-reference-card.svg` with self-contained WebP pixels (400×218), no regenerated face or external image dependencies. The committed 400px image's base64 checksum 1210898344 matched the original optimized file and its self-contained SVG rasterized successfully.
- Responsive arrangement: three cards top row, two centered beneath on wide desktop; 2-column intermediate layouts, last card centered; 1-column mobile with contained panel scroll. Existing three original photographic tiles and Outfit artwork are untouched.
- Changed `studios-menu.js`, `studios-menu.css`, index/studio/moods/beauty cache version tags, and the existing five-card landing role assertions. No Studio editing flows, header order, pricing or models changed.
- Publication status: source changes are on feature branch `feat/retouch-studios-card-photo-20261028`; PR/CI/merge/Cloudflare deployment and custom-domain verification must be recorded separately. Do not report as live before Cloudflare and production checks.


- Date: 2026-10-27, Europe/Berlin.
- Approved task: build the selected Beauty Studio page and add Studios to the upper navigation, for now.
- Viewport refinement baseline: main `79ca3b2a67e8a67d6b739beedf088761181c8a45`; original launch baseline `0b1f8f56`.
- Initial launch: PR #599. Viewport refinement: PR #604, feature source `8718ad9c5f23344e6b8530d5b27eda81de14ad67`, published after the owner requested a visible lower bar and smoother flow.
- Current production application source: `2aa1138afb101e694b39e977ec528737477106a4`, preserving the latest Saved References changes from main `df803f9b`.
- Approved page reference: `fb67472e-b6c9-4c43-ac94-3bc39eda7143.png`, Library `libfile_1c73c9c1156c8191a8380dea0f292c90`.
- Entry: `beauty.html`, with `beauty.css`, `beauty.js`, and the pure prompt/price binding functions in `beauty-settings.js`.
- Approved black-veil portrait restored to a clean background without interface elements using ImageGen, then saved as `visuals/beauty/beauty-veil-editorial.webp` (1448x1086, approximately 193 KiB).
- Viewport refinement 2026-10-27: tighter desktop title/back spacing, smaller height-responsive photo tile, 2-row optional notes, and shorter control gaps keep Generate in the first view. Portrait framing follows viewport height so the action bar sits below the face. Phone inputs remain 16px with natural scrolling.
- The background is labelled Example look. It is never treated as an uploaded user photograph or a generated result.
- User uploads accept decodable JPG/PNG/WebP images up to 10 MiB. Guest selection stays local; generation requires the existing Clerk account flow.
- Makeup, hair, skin, strength and optional direction compile a reference edit preserving the person's identity, age, pose, anatomy and background. Strength is prompt guidance, not a provider-native guarantee.
- Auto and Seedream 5 Pro use the existing Seedream route. Seedream Flash uses the existing Flash edit route. Defaults: 1K, 4:5, PNG.
- No new provider, Worker route, database, price table, wallet rule or credential is introduced.
- The existing session-request module handles authentication renewal and account setup. Tokens and private photographs are not placed in browser storage.
- Free quote preparation follows a valid authenticated source/settings change. Generate displays only the bound server credit price, including for owners.
- Quotes must match the exact engine, prompt, resolution, ratio and source, with integer credits and an unexpired ID. Stale async responses cannot replace a newer selection.
- One explicit priced Generate submits that exact quote with confirm:true. Duplicate actions are held busy; backend quote idempotency is retained.
- Ambiguous submission is not retried or repriced. A session-bound pending job/quote marker survives reload and directs the user to Image History. Explicit reset requires a new edit and never resubmits the old request.
- Actual completed images are fetched from private assets, displayed without cropping, downloadable, and available in recent Beauty history. The full Image archive remains the existing history destination.
- Account changes/sign-out clear photos, prompts, private history, result URLs, quotes and polling. No real account, generation, payment or private customer media was used in validation.
- Results and history use selection revisions as well as the account epoch: late image/history responses cannot replace a newer selection. Browser coverage selects two saved results with the older response deliberately delayed; selection causes no generation.
- Live-result layout is bounded to the editor rather than the growing History section, with Generate above the image layer. Browser coverage submits a second edit and checks that Generate remains clickable with completed desktop/phone results. Beauty HTML loads `beauty.css?v=20261027-beauty-fit1` and the unchanged v2 controller.
- `studios-menu.js` and `.css` progressively replace the existing Fashion header entry on homepage, Studio and Explore Moods. The original Fashion element/ID/listeners and return-to-draft URL remain intact inside the dropdown.
- Menu entries: Beauty Studio, existing Fashion Studio, and Character Studio linked to the verified Elements/Characters creation entry (`studio.html?tool=image&createCharacter=1`).
- Upscaler and Retouch remain direct header links. Menus support keyboard opening, Escape, outside dismissal and bounded mobile positioning.
- Homepage hero, sections, Image composer, Moods content, and other studio controllers remain outside this change. The separately discussed homepage card section, Beauty/Fashion arrival hub and Full Editorial workspace are not implemented in this step.
- PASS: 5 approved Image UI contracts, 2 Beauty prompt/quote tests, 4 search/crawler checks; 11 selected Worker credit/refund/identity/idempotency cases, including the actual Beauty Seedream/Flash route test.
- PASS after viewport refinement: complete Generate bar visible with non-overlapping notes at 1920x900, 1440x800, 1366x768, 1280x720 and 1024x768; existing 1448/1024/390/320px Beauty role/credit/privacy/history/menu checks also pass. Desktop and phone screenshots inspected.
- PASS: existing tool-routing regression at 1440 and 390px. Browser screenshots were visually inspected for desktop, phone, and the open mobile menu.
- Full public Studio visual suite passed its 1440px guest component comparisons and navigation before stopping on the existing disabled customer Retouch `#precision-prompt` field. Both the full and header-only paths stop there.
- Baseline reproduction: unchanged main `0b1f8f56`, in a separate detached worktree, stops at the same Retouch field (`tests/lab-public-studio-ui.mjs:349`; candidate line shifted by new menu-open actions). No Retouch gate/assertion was weakened.
- Existing public browser navigation tests now open Studios before selecting the unchanged Fashion tool. Pixel thresholds and other role/privacy assertions are unchanged.
- New CI: `.github/workflows/pv-lab-beauty.yml`; screenshots artifact `beauty-studio-screenshots`.
- GitHub implementation commit: `fbbe8105034b02377c94b767426f958e055d7d67`, PR #599. Its complete tree `6bbb0aaf0a82d1effc9a4f360239f13cb1dd86cf` exactly matches the locally tested source.
- Cloudflare branch preview deployed successfully: `https://f08e2389.pvlab-studio.pages.dev/beauty.html`. HTTP 200 and SHA-256 equality verified for Beauty HTML/CSS/JS, menu JS and the portrait asset. This is a feature preview, not production.
- CI's old landing navigation assertion expected Fashion as a direct tab. Updated that assertion to explicitly check Studios, its Beauty/Fashion/Character destinations and Escape dismissal. Existing Assets/Fashion navigation checks now open the menu, including its scrollable mobile trigger; original geometry, image and financial assertions remain.
- PASS after those updates: full existing `lab-landing-ui.cjs` at six responsive sizes and full `lab-assets-ui.cjs`, including embedded Fashion, shared session/input persistence, quoted generation, mobile menu reachability, navigation geometry and the original gallery/submission checks. Sparse checkout needed the existing tracked image/video test fixtures restored locally; they were not changed or added to the feature commit.
- PASS: final Beauty browser matrix also follows the actual mobile Explore Moods menu into Beauty, generates two edits, keeps Generate clickable after completion, and rejects delayed older result selection. The final 7 approved Image/Beauty contracts passed.
- Refinement CI passed Beauty, approved Image, static build and search. A separate public Studio Video canvas screenshot comparison failed; this change touches no Video/shared Studio/reference-snapshot files. That gate remains unchanged. Earlier Upscale source-preview failure reproduces on the original baseline.
- Exact merged application checks passed locally: all 7 approved Image/Beauty contracts, full Beauty role/responsive/credit/privacy browser cases, and tool routing at 1440/390px.
- LIVE 2026-10-27: Cloudflare Pages app `cloudflare-workers-and-pages`, project `pvlab-studio`, check `122265448208`, exact application commit `2aa1138a`, deployment `0383d5ab-f816-42a0-89d4-18cf030c2712`, conclusion success.
- Release verifier returned LIVE_VERIFIED for `studios-menu.js?v=20261027-studios1`, SHA-256 `f0510e9f11ed35f1b5ad885945a825d96fcd1f217cfb1bcaaa29d3f87e16e540`.
- Current Beauty HTML and `beauty.css?v=20261027-beauty-fit1` return HTTP 200 and exactly match reviewed source bytes. CSS SHA-256: `8fd0eae9dd3cf0d5f76a72a4ee67b8076d2c780926f82b95d535041bf88afc55`. Controller/settings/menu/portrait are unchanged from the original seven-file byte verification.
- Live browser at `https://pvlab.studio/beauty` verified fit1 CSS and the complete action bar: bottom 803.625px in a 1363x936 viewport, with notes above it. Production composition inspected. Real signed-in generation/payment remains untested.
- Status: viewport refinement is published and verified. This record update changes documentation only. No release action is pending. Homepage hero/cards and arrival hub remain separate work.
