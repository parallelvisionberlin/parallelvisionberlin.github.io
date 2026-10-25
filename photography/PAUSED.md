# Photography public pause · 2026-10-25

Current state: **Photography gallery is not shown publicly.** Both direct website entry routes (`/photography/` and legacy `/photo-work/`) show a neutral "Page currently unavailable" screen, with no photographs, gallery scripts or image requests. No public links remain on `alejandro-molinari.html`: its Architecture list has four items, and the Editorial Archive remains with the portrait only.

**Source code for restoration:** `parallelvisionberlin/parallelvisionberlin.github.io` commit `4f0e2f0c50d662cb82fe7ae0c509277b612aaf48` (before this pause).
- Original published gallery HTML: `photography/index.html`.
- Legacy redirect: `photo-work/index.html`.
- Two original public links: `alejandro-molinari.html`, within Architecture and Editorial Archive.
- Photographic manifest, gallery engine, stylesheet and the 47 original photographic assets in `photography/archive.js`, `photography/gallery.js`, `photography/style.css`, `photography/assets/` are intentionally **unchanged** for rapid restoration.

To republish:
1. Recover the two original HTML pages from the commit above, preserving newer fixes if needed.
2. Restore the two marked Photography sections in `alejandro-molinari.html` and change `System Index / 04 Fields` to `05 Fields`.
3. Verify every gallery image, carousels, styling, mobile layouts and GitHub Pages build/deployment.
4. Only then restore the links in `alejandromolinari.com`; its own instructions are in the personal repo `docs/photography-paused.md`.

Important technical limit: both repositories are public. This hides the portfolio from normal site visitors and from navigation, **not** from somebody who knows a direct public image URL or looks at the public Git history. Actual private access requires private storage/access control and asset removal from public hosting.
