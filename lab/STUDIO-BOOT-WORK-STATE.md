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

## Verified release of stationary fade-out
- PR #293 merged to main as `18c1a4a034ab1d2ef328abca60a0770381a44413`, affecting only Studio loader animation, scoped browser tests, domain smoke and this handoff.
- Focused Studio/Fashion mock browser regression passed: run `39057034266`, including mid-fade geometry at 130ms with no x/y/width movement.
- GitHub Pages build/deploy run `39057124363` passed.
- The initial live-domain check ran before Pages deployment and timed out waiting for the updated markup. After Pages completed, a retry of domain run `39057124528`, attempt 2, **succeeded** against `https://pvlab.studio/studio.html` with assertions that *both* exit keyframes have `transform:none` at all phases, plus existing Studio readiness and canonical paths.
- Logo appears immediately and does not move until the original .24s blur/opacity fade; status and retry still work when loading is slow. No extra waiting added.
- Next visual QA: user can hard-refresh the custom domain and confirm the previous one-centimeter left shift has disappeared. A new logo redesign remains unapproved and must not be installed automatically.

## October 17 residual visual jump diagnosed and corrected
- User still noticed the logo jumping left on Refresh after removing exit keyframe translations.
- Reproduced with headless Chromium (1440x900) using the actual early boot CSS: initial logo bounds centered at x=720px, unchanged by the Image route scrollbar gutter, and unchanged mid-exit. However, computed ghost `::before` had zero left padding while the visible logo had `padding-left:.24em` = **7.92px**. Once the blurred duplicate appears, the lettering looks displaced left even though its bounding box is stationary.
- Fixed ONLY that mismatch by adding `padding-left:inherit;box-sizing:border-box` to the pseudo-element. Exit blur/opacity/easing, 240 ms fade, progress line, route guards, scrollbar restoration and all studio tools stay unchanged.
- Added a focused computed-style browser assertion that wordmark and duplicate have matching padding, tracking and aligned sizing. Domain smoke checks the new exact CSS on production.
- Reference baseline main `84b40879b02a3c007f7f599d1a0338f059c074ab`; branch `fix/pvlab-loader-ghost-alignment-20261017`; release, CI and production checks must be verified separately.

## Separate production fingerprint (2026-10-17)
- The omnibus PV LAB readiness check failed twice after the code merged; its first check combines dozens of independent image/gallery assets and does not identify the missing assertion. To avoid conflating those with the loader, added an independent targeted `pvlab.studio/studio.html` fingerprint check for the pseudo-element padding, unchanged stationary keyframes and 100vw overlay. Run is pending. The loader code is already merged; this addition changes checks only, not the Studio.
