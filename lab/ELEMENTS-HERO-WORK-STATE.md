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
