# Beauty Studio and Studios navigation

## 2026-11-07 | Wider Edit Look without touching photographic hero: LIVE VERIFIED

- Owner approved the revised desktop mock after rolling back the unsuccessful #900 workstation. **Only the right Edit Look panel was enlarged**, keeping existing 5 independent tabs × 9 choices and a 3-column × 3-row visual grid. Desktop >1300px uses a width of `clamp(460px,35vw,590px)`, modestly taller panel and clearer title, and enough archive clearance for Generate. No new controls, layers or providers.
- Background asset `lab/visuals/beauty/atelier/hero.webp` and the entire `lab/beauty-editorial-final.css` are **unchanged**. The new scoped `lab/beauty-panel-widen-20261107.css` **never sets** a background image, background position, background size or fade. Regression compares the computed hero pseudo-element and hero canvas geometry with that stylesheet enabled/disabled; every value matches. The original ALTER title and left settings geometry also match.
- The 13-card Editorial Looks archive preserves its exact card height and inertia/keyboard/touch scroll. Only its vertical distance from the taller editor changed to prevent overlaps. Phone and <=1300px grid designs unchanged. Existing upload, models/ratio/resolution, five categories, prompts, credit/quote validation, Generate, private history, and real-result Before/After comparison remain native.
- PR #912 source merge **`fd9774e8bf4ff20752d064a7cf9e5b84ebd53159`**; files changed: new scoped CSS, one link in `lab/beauty.html`, narrow contract additions in `tests/lab-beauty-atelier.test.mjs` and `tests/lab-beauty-ui.mjs`.
- Scoped and standard Image/Beauty/Worker quote/idempotency and responsive browser suite passed: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42370471509. Rendered screenshots were inspected at 1366, 1440, 1920 and phone widths.
- Exact Cloudflare Pages deployment succeeded; custom domain CSS bytes, background source/crop CSS and hero image bytes matched the reviewed release, with read-only guest browser geometry and trial Generate checks at 1727, 1440, 1366, 1024 and 390: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42371185743. No paid generations, customer data access or billing mutations.
- Current safe release retains the original restored layout and background. Do not reintroduce the discarded workstation/layer UI from #900.


## 2026-11-07 | Light-tab visual variety: LIVE VERIFIED

- Follow-up to user's screenshot critique: Side Light and Rim Light felt overly similar to the nearby dark portraits. Replaced **only** those two Light thumbnails with pre-existing photographic crops (Side Light: male portrait with one-sided sculpted illumination; Rim Light: backlit blonde portrait). The other six non-Original Light cards and all Color cards stay unchanged.
- PR #895 merged as `a5392cfdcb39d3ed5d4c485df47edb08ba49e8e7`. Exactly two new WebP assets, `lab/beauty.html` and `lab/beauty-look-catalog.js` image-reference changes, and `tests/lab-beauty-side-rim-previews.test.mjs`.
- No new image generation, paid provider requests, or credits. Native settings/IDs/prompt instructions, nine-card geometry, uploaded Original photo, model/ratio/credits/Generate, private results, other Studios, favicon, hero and thirteen-card archive remain untouched.
- Scoped Image, Beauty, Light/Color and Worker quote/idempotency contracts plus complete intercepted desktop/mobile browser regression passed: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42356745757. Standard Beauty, approved Image and validation CI also passed.
- Exact Cloudflare app deployment reported success; read-only custom-domain check confirmed both images byte-for-byte and card bindings at `https://pvlab.studio/beauty`: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42357406752.
- Photographs demonstrate lighting visually; provider output fidelity has not been tested with an actual paid job.


## 2026-11-07 | Five Light/Color corrections: LIVE VERIFIED

- User approved five corrections to the examples previously marked visually misleading: Light **Direct flash**, **High key**; Color **Warm**, **Film tone**, **Soft film**. Five specific pre-existing generated photographs were reused, cropped and optimised as 800x500 WebP. No additional image-generation run.
- PR #893 merged as `c5c9e9e688bad0df51b0b3da1ff5d81d1d7ea440`. Only the five new WebP assets, two updated static preview paths in `lab/beauty.html` and `lab/beauty-look-catalog.js`, and one new mapping test were changed. Remaining eleven Light/Color photos retained. Original continues to display the local uploaded source.
- Native five-tab layout, all nine choices per category, instructions and IDs, quote/credit validation, backend/providers, Generate, results/history, album, hero, favicon and archive unchanged.
- All mapped-image, approved Image UI, Beauty/category/archive and Worker quote/idempotency contracts plus full intercepted desktop/mobile Beauty browser tests passed: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42355314100. Standard Beauty branch CI passed as well.
- Exact Cloudflare Pages app check for merge SHA succeeded; real production HTML references all five assets and served WebP SHA-256 hashes match the reviewed files. Guest desktop/mobile active-tab verification passed at 1440px and 390px, with zero charged/generation requests: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42355840420.
- Five examples are visual guides. Model output fidelity still untested without a separately approved paid inference.


## 2026-11-07 | Light/Color distinct images: LIVE VERIFIED

- Request: use the best available portraits already submitted/generated in this chat; do not create more images. Selected sixteen different visual examples from the owner's five contact sheets and earlier supplied editorial lighting/colour grids. Eight Light and eight Color, each matched to its existing label.
- PR #892 merged as `ac9e579e3ac1f65eaebceb350607de40012e70de`. Changed only `lab/beauty.html`, `lab/beauty-look-catalog.js`, 16 new optimized `alter-light-*` / `alter-color-*` WebP assets and `tests/lab-beauty-light-color-previews.test.mjs`.
- Native option IDs, text instructions, nine-per-tab grid, dynamic Original user-photo preview, default settings, generation controls, billing, exact quotes, backend, hero, favicon, archive and other Studio components unchanged. No credits or paid provider jobs.
- Scoped browser, Worker quote/idempotency, Image/Beauty/category/13-look archive and 16-image integrity checks passed: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42353378370. Standard Beauty CI and approved Image contract also passed on final PR head.
- Cloudflare Pages reported successful deployment of the exact merge; all sixteen live photo URLs matched reviewed source SHA-256 hashes and browser tab tests at 1440/390 passed with no generation requests: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42353925748.
- The thumbnails are visual references. Fidelity of actual paid model outputs to these looks remains untested. No change to styling, naming or options requested.


## 2026-11-07 | 13-look editorial archive: LIVE VERIFIED

- User-requested redesign of only the horizontal Editorial Looks & Moods archive: 13 curated photographic directions (6 original IDs plus Sculptural, Noir, Afterimage, Street Flash, Concrete, Blue Hour and Night Tape), 12 new optimized WebP crops from user-supplied PV/HF/portrait assets and one retained original Beauty close-up. No named third-party photographer images were published.
- Every card displays a readable title and short visual treatment. Scope-limited `lab/beauty-archive-curation.css` makes the cards taller with restrained caption gradients and partially visible next card. Existing no-arrow wheel, trackpad, drag/inertia, native phone swipe and keyboard behavior retained.
- All 13 recipes map to distinct existing native Makeup/Hair/Skin/Light/Color IDs and truthful optional directions. All keep identity, outfit and environment intact. Cards are illustrative inspiration, not a wardrobe/location replacement system.
- PR #891 merged to production-source SHA `5a5e698b27e6ca173921e3bea984ea5bbe726838`; Cloudflare Pages `pvlab-studio` reported successful publication for this exact SHA.
- Tested browser source: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42318994587; original Image, Beauty, category, Worker quote/idempotency and full Studios/Beauty desktop-mobile checks passed. 13-card asset integrity, native preset bindings, mobile geometry and keyboard final-card assertions included.
- Independent real custom-domain check: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42319656534. All thirteen image bytes, archive CSS, and guest behavior at 1440/390 matched the release. Guest selection of Night Tape changed native Light to low-key and Color to film without creating paid jobs. No horizontal page overflow or missing cards.
- Backend/credits/provider/auth/Generate/history/comparison/zoom, HERO, mixed-case heading, favicon and all five Edit Look tabs unchanged. No paid generation was run. Authentic model output fidelity remains untested pending explicit test authorization.
- This is the current verified archive release; previous notes below are history.


## 2026-11-07 | Category instruction and Original preview follow-up

- Preserves the published PR #887 three-row layout, original hero/title/favicon, all 45 option IDs, approved photographic crops and arrow-free wheel/touch/keyboard/drag behavior. No second geometry redesign.
- One catalogue binds the existing visible labels to their exact instructions. Labels stay visible; Original uses the local uploaded photo rather than an unrelated example and clears on sign-out.
- Mood recipes set the actual category fields. Manual choices clear only unchanged automatically inserted mood text, never the user's written direction.
- Light/Color intensity follows the same strength control; strength zero excludes optional edits; monochrome uses relative skin luminance rather than a contradictory chromatic lock.
- Default prompt remains byte-identical. Source upload, model/resolution/ratio, price/quote validation, explicit generation, backend, private history, comparison and zoom remain untouched.
- LIVE: PR #888 merged to 865708443a88fcdc7e0555426e8df817e9765f83; reviewed head f474eab432537393c768befd257ffb6ccbadf1e5. Exact Cloudflare project check 128220509080 succeeded.
- The complete scoped review passed: All category unit tests, one Worker quote/idempotency integration, Studios menu and full Beauty browser suite. Evidence: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42312800540.
- Independent custom-domain check verified nine exact application/favicon asset hashes and actual guest interactions at 1440/390 including touch swipe. Production evidence: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42313460601.
- Screenshots for all five tabs were inspected in the scoped review. Live guest screenshots are separate from mocked accounts. No real signed-in provider output or payment was tested.
- Shared work record alter-tabbed-editor updated; no publication action remains pending. Provider-output fidelity remains unverified without an explicitly authorized paid test.



## 2026-11-06T23:28:36.397Z | Three-row refinement LIVE verified

- PR #889, reviewed 7f7e5e6bfbd0dcedfc23fc524619463c9d0e0ff9, merged as a2d45d0793343a9575f4d83cbae0f912e37d2387.
- Exact Cloudflare pvlab-studio check 128215858001 succeeded; /beauty references the flow1 layout and flow2 presentation JS. 24 live asset hashes match reviewed source.
- Original hero, complete original composition stylesheet, mixed-case ALTER Studio. title and existing PV LAB favicon are retained. No background replacement, recropping or recolouring.
- Nine working choices per tab, a taller right editor, taller photographic archive and no carousel arrows. Wheel over heading/cards moves both ways; native trackpad/touch, mouse drag/momentum and keyboard retained. Browsing does not apply looks or generate.
- Complete intercepted Beauty/Studios role, quote, history and responsive suite plus 14 focused contracts and Worker quote/idempotency integration passed before merge.
- Real public guest production checks passed at 1440/390: nine choices per tab, original defaults/reset, stable Generate, wheel reversal and zero idle animation callbacks, reachable last card, no page overflow and no Worker mutations.
- Evidence and screenshots: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42311975833.
- No real signed-in generation, payment, paid provider job or physical iPhone Safari verification. New preset output fidelity is not claimed.
- This is the current verified release. The pending notes below describe earlier stages only; no frontend publication remains pending.

## Scroll-settling follow-up

- Final normal-motion QA found a 1px rounding tail could keep requestAnimationFrame running after the archive stopped moving. The only interaction change is a 1.5px settle tolerance instead of 0.8px. No layout, imagery, defaults, backend or generation behavior changed.
- New regression executes the actual animation function against integer and fractional scroll positions in both directions and requires an empty frame queue. All 14 focused contracts pass. Actual isolated Chromium observation changed from 42 idle callbacks over 700ms to zero.
- Presentation JS cache key is 20261106-flow2; other refinement assets retain flow1. Production verification follows merge.

## 2026-11-06T23:20:47.783Z | Three-row refinement LIVE verified

- PR #887, reviewed 1b361a956f4cb04fe4dca376b223ca47bc3a6ce2, merged as 46054b88b991656eeb19affd7ed7e2bd6c6f8acf.
- Exact Cloudflare pvlab-studio check 128212836863 succeeded; /beauty references 20261106-flow1. 24 live asset hashes match reviewed source.
- Original hero, complete original composition stylesheet, mixed-case ALTER Studio. title and existing PV LAB favicon are retained. No background replacement, recropping or recolouring.
- Nine working choices per tab, a taller right editor, taller photographic archive and no carousel arrows. Wheel over heading/cards moves both ways; native trackpad/touch, mouse drag/momentum and keyboard retained. Browsing does not apply looks or generate.
- Complete intercepted Beauty/Studios role, quote, history and responsive suite plus 13 focused contracts and Worker quote/idempotency integration passed before merge.
- Real public guest production checks passed at 1440/390: nine choices per tab, original defaults/reset, stable Generate, wheel reversal, reachable last card, no page overflow and no Worker mutations.
- Evidence and screenshots: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42310995580.
- No real signed-in generation, payment, paid provider job or physical iPhone Safari verification. New preset output fidelity is not claimed.
- This is the current verified release. The pending notes below describe earlier stages only; no frontend publication remains pending.

## Three-row refinement CI passed

- Complete original Beauty/Studios role, quote, history and responsive checks passed, including the new 45-choice grid, wheel reversal, drag and real emulated touch swipe.
- Evidence: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42309882483. All APIs intercepted; no provider job or payment. Merge and custom-domain publication remain separate.

## 2026-11-06 | Approved three-row editor and arrow-free scroll refinement

- Owner approved the latest mixed-case ALTER layout, larger Edit Look, three columns/three rows and a taller photographic archive. Do not replace the published background again.
- Baseline source: c714d7ec533da9807bb3f0f03e5c571463d2a4e4. Branch: fix/alter-three-row-scroll-20261106. Version: 20261106-flow1.
- The published hero.webp and the entire beauty-editorial-final.css composition stylesheet remain byte-identical. Regression checks lock both SHA-256 hashes; the original H1 and PV LAB favicon are retained.
- New scoped beauty-flow-refinement.css adjusts only panel/overlay/archive geometry, control typography and card height. It does not restyle the hero or the left title.
- Every tab has nine independently selectable, validated options. The three new makeup thumbnails are crops from the approved proposal, not new generations. Other additional presets reuse illustrative existing photography.
- Defaults remain Makeup Original / Hair Original / Skin Natural / strength 50. Light and Color start Original. Existing source/model/resolution/ratio/Generate/quote/history/comparison/zoom behavior remains intact.
- Removed the two archive arrow buttons. Wheel over the section heading OR photographs moves the strip in both directions; horizontal trackpad input, mouse dragging/momentum, native touch swipes and keyboard navigation are supported. Browser zoom gestures and page scrolling at strip boundaries are not trapped.
- Browsing never applies a preset, reprices, or submits a generation. Reduced-motion preference disables scripted animation.
- Local: 13 focused Image/Beauty/ALTER unit contracts and the Worker quote/idempotency integration passed. Isolated rendered layout and wheel/independent tab checks passed at 320/390/768/1024/1280/1366/1440/1920 px.
- Full local browser navigation is environment-blocked. Full intercepted-account browser regression runs in GitHub CI; isolated HTML evidence is not signed-in production verification.
- Pending for this new refinement: full CI, reviewed merge, exact Cloudflare deployment and custom-domain byte/guest-interaction verification. The previous #880 release below remains the historical production baseline.
- No paid generation, customer payment, provider integration or backend change.

## 2026-11-06 | LIVE publication verified

- PR #880 merged as ed1752ce3c8f06691fcb711d279fafec75a7fee4; reviewed application source 70b58d7c621c6976b4929aba73bb4f76e157f172.
- Exact Cloudflare Pages pvlab-studio check 128181428708 succeeded.
- Actual /beauty HTML serves 20261106-atelier2 and the existing ./branding/pv-mark.png favicon. 20 production asset hashes match source, including all approved image crops.
- Real guest browser checks passed at 1440px and 390px: defaults Original/Original/Natural/50, independent tabs, reset, final archive card reachable by keyboard, no page overflow, no Worker mutations.
- Complete intercepted Beauty/Studios tests and quote/idempotency tests passed in run 42299866022. The later date-format save issue and concurrent work-index conflict did not change tested application bytes.
- Real signed-in generation and provider output quality were not tested. No paid generation or payment was performed.
- Evidence and real production screenshots: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42301817916.
- Work record alter-tabbed-editor upserted against current main, preserving other tasks. No frontend deployment remains pending.

## 2026-11-06 | Final review and existing PV LAB favicon

- Reused the exact homepage favicon `./branding/pv-mark.png`; no branding regenerated.
- Fixed compact desktop clearance and breadcrumb hit targets; stylesheet `20261106-atelier2`.
- The final navigation test failure was a public local-currency request incorrectly subjected to private authorization. Exact public currency/traffic fixtures now remain separate; private token and guest-isolation assertions are preserved.
- Complete Beauty and Studios browser suites plus 12 scoped unit contracts and Worker quote/idempotency integration passed in https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42299866022.
- This is intercepted test-account evidence, not real signed-in production behavior. No paid generation or payment was made.
- Source is saved on the existing review branch; merge and production bytes remain to be verified.

## 2026-11-06 | Approved tabbed ALTER implementation

- Objective: implement the owner-supplied dark ALTER reference, not another mock image.
- Baseline main: `674b340bcb7217ed4b4ca42344a8fde8c55c0be8`.
- Branch: `implement/alter-approved-20261106`; version `20261106-atelier1`.
- Desktop: large central photograph/upload workspace, wider Edit Look panel and six large options per active tab.
- Makeup / Hair / Skin / Light / Color retain independent native select state. Keyboard tabs use roving focus and do not change quotes.
- Defaults: Makeup Original, Hair Original, Skin Natural, Light Original, Color Original, strength 50.
- Light and Color are validated prompt instructions on the existing image route, not new backend/provider integrations. Original produces the exact legacy prompt.
- Native model/resolution/ratio, quote binding, explicit Generate confirmation, ambiguous-job protection, account access, history, comparison and zoom remain intact.
- Carousel supports native touch/trackpad, bounded wheel scrolling, mouse dragging, reduced-motion-aware inertia, heading arrows and keyboard focus. Browsing does not apply a look or generate.
- Approved six image directions remain selectable. Clicking a direction sets its makeup/direction and resets other category overrides to avoid stale contradictory instructions.
- The 15 small WebP assets are non-generative crops from the approved mock and its clean uploaded-photo flow screen. No new image generation or stock purchase occurred. They are illustrative, not guaranteed model outputs.
- Original previous assets remain in the repository. Header, other studios, backend, pricing and payment files are unchanged.
- Local checks passed: 5 approved Image contracts, 4 new ALTER unit contracts, syntax and whitespace.
- Local isolated rendered controls passed at 320/390/768/1024/1280/1366/1440/1672/1920 px: no horizontal page overflow, visible Generate, no textarea overlap, independent selections, reset, keyboard and reachable final card.
- Local browser navigation is environment-blocked, so the full original role/billing suite must run in GitHub CI. Isolated HTML rendering is not represented as a real signed-in test.
- Extended the existing Beauty browser suite for the explicitly approved visual contract, tabs, native field state, light/color quote binding and sign-out reset. Existing role, credit, source/comparison, history race and zoom assertions are retained.
- Publication is not yet verified. Required next steps: pass scoped CI, review screenshot artifacts, merge exact reviewed head, inspect Cloudflare pvlab-studio check and verify custom-domain assets.
- No real-account generation, customer payment or private media access was performed. Real provider output quality for new prompt directions remains untested.


## 2026-11-05 | ALTER editorial composition, original photographs locked

- Owner rejected the hard-edged, near-unchanged production layout and requested the previously approved cinematic editorial composition implemented and published, but with the ORIGINAL central hero photograph and a large, fully usable Edit Look deck.
- Implementation PR #851 from main `fceefe0694346856146136064712e9188fc0b36f`: new scoped `lab/beauty-editorial-final.css`, a single style link in `lab/beauty.html`, and desktop/responsive visual assertions in `tests/lab-beauty-ui.mjs`.
- Approved hero file remains `lab/visuals/beauty/beauty-hero-refined-20261031.jpg`, preloaded as before. All six approved look photos and all 12 Makeup/Hair/Skin preset thumbnails remain unchanged.
- Change is presentation only: dark background continuity, photographic hero fade, stronger type, a readable source photo control, prominent 370–430px desktop Edit Look panel, larger preset photos, and a complete six-card desktop look archive with existing browse navigation.
- User photo upload, compare slider, result zoom, History, generated file download, model/resolution/ratio, quote/submit/credit and auth code remain byte-identical to main.
- Responsive rules preserve the existing <=1000px stacked editor and <=640px horizontally scrollable looks; no shared header or other studio changes.
- Current branch CSS version: `beauty-editorial-final.css?v=20261105-finish4`. Full Beauty browser checks compare original hero source, computed photographic fade, non-boxed grid, panel/thumb sizes, absence of horizontal overflow, and all six cards.
- Branch preview successfully built by Cloudflare Pages for implementation SHA `f51ffa0346a55ac62dfbb55dae1f68f095fb403d`; approved Image UI contract and static validation passed. Final Beauty browser evidence, merge, exact-main Cloudflare deployment and custom-domain observation must be recorded separately.
- Final 1440px follow-up: the strict visual test caught a title below the >=70px desktop editorial threshold after compacting the left column. Version `finish4` sets >=70px at 1440 and offsets its vertical cost with smaller gaps, while retaining the <=1300px compact title. No generation/app logic touched.
- CI visual review of the first candidate caught a cramped right deck: Creative Direction could overlap Generate. Corrective CSS reduces vertical gaps only, keeps full preset photograph sizes and the wide panel; the browser regression keeps its strict overlap assertion. Desktop screenshot review also found a rectangular photo vignette, now removed. The latest browser run must verify the correction before merge.
- The older broad suites retain known unrelated failures; do not alter generation/account or unrelated workflows just to silence them.


## Phone Studios menu fit, 2026-11-01

- Owner supplied current/desired phone screenshots `IMG_8313.jpeg` / `IMG_8314.jpeg` (`libfile_6f680364225481918e2bb6512df08db2`, `libfile_906df4efaa208191843d12a0f04d30b8`). Remove the extra mobile Studios/Character Studio header and show all four cards including bottom labels.
- Baseline main `e5ca45d369f91d518b2ac35419683dd2a719583b`; branch `fix/studios-phone-fit-20261101`.
- At <=900 px hide the panel header and size each of the two grid rows to half the available visible viewport, capped at the existing 322 px maximum. Retain original artwork, filters, crops, fonts, captions, routes, joined edges and rounded outer panel.
- Positioning uses visualViewport height/offset when available, with innerHeight fallback, and responds to visual viewport resize/scroll so iOS browser chrome cannot hide the lower row. Desktop card dimensions/header are unchanged.
- Cache version `20261101-phone-fit1` for shared menu CSS/JS on the five existing entry pages. No account, generation, billing or model changes.
- Files: shared menu CSS/JS, menu cache versions on index/studio/beauty/moods/Full Editorial, new `tests/lab-studios-menu-ui.mjs`, existing Beauty workflow and this checkpoint. The menu check runs before the unchanged Beauty role/billing suite; no gates weakened.
- Checks: local syntax, five approved Image contracts and whitespace pass. Final source CI passes the menu matrix (390x844/visual 666, 320x700/visual 520, 768x1024/visual 820, 1440x900), visual-viewport shrink/offset changes, full card/title/caption containment, no internal scrolling and ArrowDown/Escape/focus. Full Beauty guest/customer/owner/billing/navigation suite passes, as do approved Image, Editorial, landing stability and static validation.
- Preserved concurrent homepage CTA (#749) and cinematic Editorial progress from main `888e098` after an overlapping-cache-key merge conflict. Resolved only the shared HTML version lines; own menu code remains unchanged. Final reviewed source `4134935a321edb3369cfe650d07d523282b4afe0`, PR #750, merge `029992b82610252887b7fe0988229f95f7bd0f77`.
- Broader checks are not globally green: legacy landing still waits for the removed Beauty Studio label; an Assets assertion concerns unchanged Video reference-drop state. These were inspected without expanding scope or weakening checks.
- LIVE: exact merge Cloudflare pvlab-studio deployment `31547ab9-cc81-47e5-a49c-8d29b5e5539d` succeeded, check `124688971837`.
- Scoped read-only verifier returns LIVE_VERIFIED for both `20261101-phone-fit1` assets, exact reviewed production bytes: CSS SHA-256 `351e57d80ae69cb64171811db82e0aaa00c74b5ea622a2e1fa9f8016b4b31e6d`; JS `418097a6eca9615ceaf057661bb3cb0f4aefbf79111516f95b30f8b70880b0aa`.
- Public production browser confirms the new stylesheet, original desktop header, four menu cards and all original images loaded (1448/2048/2048/1122 px widths). Local phone preview panel ends at 653.98 px in a 666 px viewport, with 544 px scrollHeight/clientHeight, so no lower captions are clipped. Phone/browser-bar behavior is tested in Chromium, not a physical iPhone Safari session. No sign-in, paid generation or purchase performed.
- Complete and verified live. Keep phone header hidden and two card rows constrained to the visible viewport.

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
- Reviewed source `26bb016350aae6bb967b64ce7e643e06e8b3612b`; PR #745 merged as `a46a7c5e7820552bbecd85cb71ccdd04c9d15f74`.
- PASS GitHub approved Image UI, landing stability and both static validators. Legacy landing still expects Beauty Studio; no assertions or labels changed.
- LIVE: exact merge Cloudflare Pages check `124646795426` succeeded; release verifier returned LIVE_VERIFIED for `20261031-tall-connected1`.
- Production CSS SHA-256 `8e772916d81127c8d1afcbcbfc1552a2cbd67cda873001fd73d8e40e90b7af57` matches reviewed bytes.
- Live public browser confirms ~472px tall cards, zero gaps, Character Studio in the header and no lower bar. Complete; no remaining release action.

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
