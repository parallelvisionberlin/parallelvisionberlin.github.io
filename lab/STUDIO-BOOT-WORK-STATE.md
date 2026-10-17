# PV LAB Studio boot active state
Updated: 2026-10-17
Scope: Studio initial loading overlay only.

## Approved display
- Restore the original minimal loading: near-black background, sharp centered 'PV LAB' with 'BY PARALLEL VISION', and a 1px animated progress line. No decorative shapes, liquid chrome, geometry, floating figures, particles, video, or additional graphics.
- Preserve the original exit: .24s opacity fade plus the approved wordmark horizontal blur/trail after true Studio readiness. Do not add a minimum wait.
- Keep first-paint scroll lock, 100vw overlay to prevent the old -7.5px shift, stable system fonts, 16s slow-start message with Reload, route pending guards, and accessibility/reduced-motion behavior.
- New logo directions are exploratory mockups only. Do NOT change production logo/brand without approval.

## Scoped implementation
- `lab/studio.html`: removed .lab-boot-architecture CSS, HTML and reduced-motion overrides. Reused the existing original markup and progress bar.
- `tests/lab-studio-layout-ui.mjs`: checks minimal first-paint structure, stable geometry on desktop/mobile, reduced motion and unchanged readiness/fade behavior.
- `.github/workflows/pvlab-domain-smoke.yml`: verifies live HTML includes the minimal .lab-boot-content and no unwanted fluid/architecture elements.
- This state file updated. No changes to account, billing, jobs, workers, providers, galleries, credit, generation or site navigation.

## Previous context
- Original Studio loader predated the Oct 17 experiment, already sharp/centered. Oct 15 auth/route and scrollbar fixes are preserved.
- Oct 17 fluid variant merged in PR #287, then user rejected it.
- Oct 17 geometric variant merged in PR #289, user rejected it and requested original unchanged.
- Base main commit for restore: `41f7a6bf4902623e4e007c8ac7c71d4ebd178636`.

## Verification
- Source style/structure assertions passed in patch construction. Independent CI, merge and live custom-domain check must be recorded after execution.
- Live verification should check original wordmark, animated bar and identical exit, full viewport alignment across Image and Fashion routes. The only pending design choice is a future logo direction.
