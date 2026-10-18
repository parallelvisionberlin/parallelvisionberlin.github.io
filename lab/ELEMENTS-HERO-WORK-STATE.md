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
