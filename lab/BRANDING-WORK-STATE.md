# PV LAB wordmark refinement (2026-11-01)

## Approved direction
- The current bold condensed Anton PV LAB wordmark is the canonical identity. Preserve its glyph paths, sizes, positioning and responsive layout.
- Owner approved a subtle black-and-white film-wear/grain character based on the 9:16 cinematic end card. Keep it restrained and legible, especially at small header size.
- Do not insert the end card CTA, texture background, tagline or poster crop into the website UI.

## Scoped implementation
- Canonical logo untouched: `lab/branding/pvlab-wordmark-bold.svg`.
- New variant: `lab/branding/pvlab-wordmark-cinema.svg`, identical Anton path and viewBox, microscopic black mask flecks only.
- Homepage only: `lab/index.html` uses the variant for the preloaded asset, existing header logo and existing hero logo, preserving all width/height/CSS/layout, alt text, actions, imagery and navigation.
- Other PV LAB pages, account, Studio loader, partner dashboards and footer continue to use the approved original asset.

## Source and release
- Implemented on branch `pvlab-cinematic-wordmark-20261101` starting from `main` on 2026-11-01.
- Verified the index change replaces exactly three logo asset references; no other homepage strings changed.
- Production requires merge, Cloudflare deployment check and direct comparison of live asset with reviewed SVG. Until verified, do not claim the site is live.
