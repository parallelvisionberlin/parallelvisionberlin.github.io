# PV LAB account interface

## Current objective
- Bring the account page up to the approved fashion/editorial standard.
- User reference: image(20261012-135720).png, showing the sparse owner view.
- Date: 2026-10-12.
- Source baseline: main 2d63aa88b352c408282c57559884faf1a604a613.
- Prior shared-menu release: 5dae7de040309bede94ed2d65fdcdd1648038c1c, PR #164.

## Design and implementation
- Use monochrome black, charcoal, ivory, fine rules and light DM Sans display type.
- Reuse approved photo: lab/visuals/leather-editorial/hero-mobile.webp.
- This is brand photography, not a user's private image or generated account asset.
- Photographic account masthead, real profile photo/initials and account role.
- Clear sidebar hierarchy and responsive mobile section selector.
- Owners see Workspace, direct Studio and Mood links, and generation connection access.
- Owners do not see the empty Balance/Usage/Billing tabs.
- Customers retain their real credits, products, activity and billing views.
- Referrals remain conditional on actual API eligibility.
- No backend, product pricing, checkout payload or authorization changes.
- Do not introduce gradients outside photo legibility, green dashboard cards or invented usage data.

## Relevant files
- Page: lab/account.html, lab/account.css, lab/account.js.
- Shared menus: lab/account-menu.js, lab/account-menu.css, unchanged in this revision.
- Verification: tests/lab-account-browser.mjs, .github/workflows/lab-account-ui.yml.
- Existing session and wallet APIs remain the data source.

## Verification and release
- JavaScript syntax and five account/referral unit checks passed locally.
- Browser coverage includes customer and owner menus, billing URL guards and sign-out isolation.
- Revised owner screenshots and overflow checks cover 1920, 1440, 768, 390 and 320 px.
- Account browser workflow 38260446528 passed on 12d1131a444840de5dc55e3f5e7222676bedfedc.
- Desktop owner/customer and mobile owner screenshots inspected; no overflow.
- Editorial revision is verified and ready for production publication.
- Next action: publish to main and verify the Pages deployment and public account assets.
