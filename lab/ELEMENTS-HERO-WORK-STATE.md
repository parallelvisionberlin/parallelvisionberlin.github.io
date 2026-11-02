# PV LAB Saved References / compact F

## Active mobile detail repair, 2026-11-02
- Request: repair overflowing saved Character details on phones; preserve other category overviews.
- Inspected main `7839aa341caec03b384bf39800133f14e9f1a893`; no open overlapping Elements PR found.
- Source: `lab/scene-library.css`, `lab/studio.html`.
- Reproduced the screenshot geometry with an eight-photo detail fixture and the real library styles.
- Root cause: mobile `1fr` track retains the thumbnail strip's intrinsic minimum width (546px inside a 334px feature panel).
- Mobile detail track now uses `minmax(0,1fr)`; preview, text and action stay within the panel while thumbnails retain horizontal scrolling.
- Desktop two-column detail remains unchanged. Category overviews, photos, profile analysis and scene attachment behavior are unchanged.
- Stylesheet cache key: `20261102-character-mobile-track1`.
- Verification: approved Image UI contract and scene-library cover tests passed (9 total).
- Browser QA: 390px panel inner track/cover/content 332px; 320px track/cover 262px. Photo strip remains independently scrollable.
- Desktop QA: unchanged 352.875px / 449.125px tracks in an 804px detail panel.
- QA uses synthetic local markup/media, not a real signed-in production account or paid generation.
- Source commit, CI and Cloudflare production publication: pending.
- Next: publish reviewed fix, inspect exact Cloudflare Pages check and production stylesheet version/bytes.

## Active release, 2026-10-27
- Owner approved F / Compact box and requested implementation and publication.
- Approved mock: `3352c270-443a-4584-afe0-68701d02ce7d.png`, Library `libfile_4abcb7ed43688191b33c0eba1284d0e6`.
- Base: `5953a6313b2a9c62e52cb0367d59008c7daf918d`; isolated branch `feat/reference-compact-f-20261027`.
- This approval supersedes the older photographic category-banner and matching Photo Packs frame requirements below.
- Shared Elements browser keeps its original category rail, search, sorting, grid/list, create, detail and private handoff flows.
- New scoped skin: `lab/reference-library.css?v=20261027-compact-f1`, loaded by `lab/studio.html`.
- Compact neutral-black box, text-only category heading, three landscape-cover columns on desktop, two on phones.
- New labelled create action follows category; actual profile-state badges remain truthful.
- Gallery uses existing authenticated source thumbnails. Mockup people are never seeded into live accounts.
- New Image person shortcut opens Characters directly. Four-square shortcut retains direct category menu and legacy Photo Packs access.
- Matching public person button requests sign-in; it never opens private account data.
- No changes to provider routing, selection of source views, analysis, uploads, consent, credits or backend APIs.
- Separate Photo Packs editor, Video settings/layout, homepage and Beauty remain unchanged.
- Local unit/contract checks: 12 passed; prompt-paste browser passed; Elements upload/draft/handoff browser passed.
- Focused six-cover QA passed desktop 1440/1366/1024, tablet 736 and phones 390/320; selected detail remains fitted and all original photos selectable.
- Full layout browser reaches the same mobile ResizeObserver error on this branch and unchanged base `5953a63`; no error filtering or gate weakening.
- First-image browser carousel assertion had a smooth-scroll race: now waits for the first actual card step before clicking Next again; application carousel unchanged.
- Final first-image browser passed: public/customer/owner parity, focus, attachments, carousel navigation and synthetic quote/generation handoff.
- Full source matrix: 802 passed initially; the missing sparse-checkout sandbox dependency was restored and all 9 sandbox tests passed. Dream Blur preflight timing fails equally on unchanged base under local Node 24; source unchanged.
- PR #611: initial source `72bbcf6384f914906719cd7e1ea366f057db95f9`; final test-only follow-up pending.
- Photo Packs full browser passed after replacing superseded matching-frame expectations with compact bounds, preserved category order and original Photo Packs return geometry.
- Independent public Image pixel comparison passed with only the explicitly approved Characters shortcut added to its frozen expected source. All original pixel tolerances remain unchanged; guest shortcut sign-in/privacy also passed.
- Broader public test then reaches an existing Video canvas mismatch, reproduced on unchanged base (4940 vs 4938 pixels, same max delta 232). Upscale source-preview height failure also reproduced unchanged. Neither application area was edited.
- Initial CI: approved-image-ui, unit, first-image, Image prompt, library browser, gallery, precision, Fashion, Beauty, appearance and other targeted checks passed. The legacy live-version check expects PR assets before publication and is pending production.
- Concurrent main updates through `f48a6953` (isolated per-tool uploads and square Studios menu) are preserved. Resolved only the adjacent stylesheet link conflict, retaining both the new Studios stylesheet version and compact library stylesheet.
- Production deployment and byte verification pending. Next: publish reviewed source, inspect exact Cloudflare commit, verify live CSS and shortcuts; record signed-in verification separately.

## Historical banner implementation (superseded where noted), 2026-10-18

## Objective
Apply the owner-approved Elements tab hero visuals without redesigning library, navigation, image generation, or saved references.

## Approved art
- Characters and Outfits: photographic imagery taken from the owner-approved first Elements mockup.
- Props and Locations: photographic imagery taken from the owner-approved second Elements mockup.
- Four individually cropped self-hosted WebP banners at 1536 x 256 in `lab/scene-hero-art/`: `characters.webp`, `outfits.webp`, `props.webp`, `locations.webp`.
- Left regions of those assets are kept clean for the real UI text. No screenshot lettering appears behind the live typography.
- The Photo Packs hero and collection layout remain unchanged.

## Implementation
- GitHub PR #315 added and executed a one-time importer, placing four assets in the repository. The importer was removed after the images were saved.
- PR #316 merged as commit `1064c992ec95af03e6a2d16e0895820a6b03ba7d`.
- `lab/scene-library.css` references the four local assets using `--scene-hero-image` and increases desktop hero height from 116px to 148px, tablet/mobile to 120px, smallest mobile to 112px.
- `lab/studio.html` updates the stylesheet cache key to `20261018-approved-elements-heroes1`.
- `tests/lab-studio-layout-ui.mjs` checks the four background paths and enlarged desktop height.

## Verification
- All four binary assets were confirmed in GitHub's default branch, each approximately 9 to 14 KB.
- CSS, Studio HTML, and test changes were confirmed on main after merge.
- Cloudflare production deployment and visual appearance on the custom domain have **not been independently verified** in this environment. Do not describe as live until confirmed by Pages or a browser test.

## Next action
Confirm Cloudflare Pages production deploy for merge `1064c992` or later, and visually inspect the four tabs at `https://pvlab.studio/studio?tool=image`, including narrow viewport behavior. Keep all existing Photo Packs, Elements, and generation flows.

## 2026-10-18 saved-element thumbnail and hero repair
- Reproduced from the owner's MyRoom screenshot: after creating a Location, the category hero vanished and both the selected-element preview and the card showed broken-image text.
- Root causes verified in `lab/scene-library.js`: it set `hero.hidden=true` for any saved item, and passed a precreated `<img>` to `composerAssetPhoto`, which requires a connected container element and inserts its own decoded image.
- PR #322 merged as `e29d9f54a7d172058a62baed9cef3282030cab56`. Static category hero always remains; cards and expanded details use authentic private-thumbnail DIV hosts. First item is not auto-selected, while clicking a card opens a separate feature panel. No reference order, prompts, credits, provider, or Photo Packs were changed.
- Cards compute a deterministic ratio-matched best cover from their existing private reference thumbnails with first-valid fallback. The selection is UI-only and recomputed on new sessions; no persistent cover URL or database field was added.
- `lab/scene-library.css` scopes correct `object-fit:cover` image containers and unavailable-image placeholder. `lab/lab.js` supplies dimension reading through authenticated thumbnail blobs, not provider generation. `lab/studio.html` refreshes CSS and script versions.
- Added pure selector tests `tests/lab-scene-library-cover.test.mjs` and a 4-photo MyRoom fixture regression in `tests/lab-studio-layout-ui.mjs`.
- CI on PR #322 reached the new MyRoom assertion after verifying visible hero, decoded landscape card photo and selected-item details, but its immediate image-count check after list toggle raced asynchronous decoding. PR #323 merged `156232b9476cc26d1f0dbb623870f2d5516134af` to wait for the image instead.
- The existing Photo Packs browser check also used an outdated create-card assertion after a separate toolbar redesign; PR #323 updates this test to the approved toolbar layout.
- Full post-merge browser CI and Cloudflare Pages live domain verification remain outstanding unless subsequently confirmed.

## 2026-10-27 selected Element override
- Owner explicitly changed the earlier always-visible hero decision: overview retains its category artwork; clicking a Character/Element hides unrelated category photography and displays the saved item's own thumbnail and detail panel.
- Changes are scoped to `lab/scene-library.js`, stylesheet and browser regressions. Saved originals, category art files, unrelated tabs and model generation are unchanged.
- User-approved state signal: grey Not analyzed, pulsing Analyzing, green Ready only when a profile exists, and muted failure if Gemini does not return a usable result. Retry remains in expanded details.
- Newly saved item is selected automatically so its own photo and analysis state are immediately visible.
- Branch: `fix/character-uploads-analysis-selection-20261027`. Release pending verification.

## 2026-10-27 single workspace and Video handoff
- Latest owner screenshots confirmed the selected card above the collection was redundant and did not feel like opening a Character. Owner requested a clear two-screen flow.
- Collection view: existing category hero and card grid, no selected person. A selected card opens its own workspace, not an extra banner.
- Detail workspace: Back to category, one full-source fitted main photograph, all saved photo thumbnails immediately visible and selectable, truthful Gemini profile status, Analyze retry only if needed, one Use in scene action. No duplicate collection cards below.
- New saved Characters still open their dedicated detail immediately. Existing packs and permission rules are unchanged.
- Video Reference mode: attached Character appears as one named grouped reference with its saved-photo count, one remove action, no duplicate Selected items bar and no “Uploaded images” heading. Selected provider views remain implementation-only; no model/quote/credit/reference-selection logic changes.
- Implemented in `lab/scene-library.js`, `lab/scene-library.css`, `lab/lab.js`, `lab/video-editorial-deck.js`, `lab/video-restored-editorial.css`, `lab/studio.html`.
- Tests updated: `tests/lab-scene-library-cover.test.mjs`, `tests/lab-studio-layout-ui.mjs`, `tests/lab-video-editorial-deck.test.mjs`.
- Branch `fix/pvlab-character-single-workspace-20261027`. Merge, CI and custom-domain publication to be recorded separately.

## 2026-10-27 clarity: Video navigation naming
- Owner found “Scene Library” misleading for the Video Reference set entry, because it stores reusable characters, outfits, props and locations, not preassembled scenes.
- Approved visible term: **Saved References**, with “Characters, outfits & more” as the compact entry subtitle; center-canvas secondary button: **Browse saved references**.
- Supporting upload/save and in-dialog feedback no longer call the feature a Scene Library. Internal IDs, existing routes, categories, asset ownership, prompts, generation, and credits stay unchanged.
- Scoped source: `lab/studio.html` and `lab/scene-library.js`; browser-text assertion in `tests/lab-video-editorial-deck.test.mjs`.
- Branch: `fix/pvlab-saved-references-label-20261027`; merge and live deployment status require independent verification.

## 2026-10-27 Image deck four-square shortcut
- Owner supplied desktop screenshots: currently the four-square control opens an unnecessary top-level choice between Photo Packs and Elements. Approved behavior: click directly opens the existing four Elements categories (Characters, Outfits, Props, Locations), matching the previous nested categories screen.
- Only the default entry state changes in `lab/lab.js`. The legacy back arrow can expose the existing Photo Packs option; the separate saved-photo-packs chevron continues working.
- `lab/studio.html` updates the four-square tooltip/accessibility name to Elements and refreshes the script cache key. No categories, layouts, stored references, model settings, prices or paid generation change.
- `tests/lab-elements-smart-browser.mjs` and `tests/lab-studio-layout-ui.mjs` validate direct categories, legacy Photo Packs access and narrow mobile menu bounds.
- Working branch `fix/pvlab-image-elements-direct-menu-20261027`. Merge and production publication must be checked separately.

## 2026-10-27 direct Elements final source status
- UI pull request #606 merged to main as `c02b171115621d16ca90a6788084661e1b1b5057`. Clicking the Image composer four-square shortcut goes immediately to the existing Elements category list; the back option retains Photo Packs access.
- Original PR validation: approved Image UI contract and Lab tests passed. The Video browser suite exposed an older Photo Packs fixture that expected the previous first-level menu. Application behavior was not reverted.
- Test-only PR #607 updates `tests/lab-image-oneclick-ui.mjs` and `tests/lab-reference-pack-studio-ui.mjs` to traverse Back → Photo Packs. Merged to main as `c0c0a25fb766d3a71497642216e3aff9f239634e`.
- No database, references, generation provider, pricing, or Image deck layout modification. Custom-domain Cloudflare deployment and the test-only PR CI remain unverified as of this checkpoint. Exact next action: check production asset version and signed-in first-click categories.
