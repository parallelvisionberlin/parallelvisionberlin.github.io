# PV LAB Elements hero photography, 2026-10-18

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
