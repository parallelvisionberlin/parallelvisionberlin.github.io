# PV LAB Studio boot active state
Updated: 2026-10-17
Scope: Studio initial loading overlay only.

## Approved display
- Restore the original minimal loading: near-black background, sharp centered 'PV LAB' with 'BY PARALLEL VISION', and a 1px animated progress line. No decorative shapes, liquid chrome, geometry, floating figures, particles, video, or additional graphics.
- Preserve the original exit timing: .24s opacity fade with wordmark and trail blur after true Studio readiness, but NO position changes or scaling at any frame. Do not add a minimum wait.
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

## Verification and production state
- Original-loader restoration merged through PR #291 on main as commit `cdb7734c302e8b1fafcf70bed2244b586e2e8323`.
- Focused Fashion/Studio mock browser regression passed in GitHub Actions run `39055691442`, covering stable first paint, centered desktop/mobile geometry, 100vw width, scrolling lock/recovery, native route guards, reduced-motion and original blur/fade exit.
- Static validation passed on the PR; no charged generation was tested.
- Live custom domain `https://pvlab.studio/studio` verified by `PV LAB domain live readiness` run `39055781452` (SUCCESS) against this merge SHA. The smoke asserts original centered loader markup and rejects fluid/geometric artwork while preserving .24s fade and viewport alignment.
- Logo explorations are preview-only, not committed, and the existing production branding remains unchanged. Wait for explicit user selection before touching the wordmark.

## October 17 stationary exit adjustment
- User reproduced a noticeable leftward jump during Refresh and requested that PV LAB stay perfectly fixed until it fades.
- Root cause verified in Studio CSS: `pv-boot-out` translated the wordmark -3px and -12px and scaled X; `pv-boot-trail-out` translated its duplicate 10px and 22px.
- Changed only the two existing exit keyframe transforms to `none` at each phase. Blur/opacity curves, overlay .24s fade, loading progress, route guards, root scrollbar fix, and all other Studio UI unchanged.
- Updated first-paint browser regression to seek 130ms into the exit and assert unchanged x/y/width, plus source checks for the no-motion trail.
- Updated custom-domain smoke to require the literal new keyframes before declaring the live Studio corrected.
- Baseline main: `f96c6a7d2b6a3de00488ec0e53ca4bc9bdadad67`. Branch: `fix/pvlab-stationary-boot-exit-20261017`. CI/merge/live activation must be independently verified.
