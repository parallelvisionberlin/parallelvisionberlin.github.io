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

## Production verification of aligned blur duplicate
- Headless Chromium reproduced the underlying bug at 1440px: the true logo had a 7.92px padding inset and stayed centered even when Image toggled its scrollbar gutter, but the absolute blurred copy had 0px padding. The duplicate inherited the real text's letter-spacing but lacked the left inset.
- Merged the minimal fix as PR #297, commit `70277683fa0b613563d12b024ae7a360066e444c`, adding `padding-left:inherit;box-sizing:border-box` to the blur duplicate only. No animation timing, transforms, stage behavior, auth or generation touched.
- Focused Studio/Fashion browser test passed on run `39058030147`, including matching ghost/wordmark computed inset and unchanged width/position.
- GitHub Pages deploy run `39058149029` succeeded; the Cloudflare Pages check for original commit was still building and the first omnibus custom-domain run timed out. A newer main deployment `e1bdf1a884d7448b3e7a476fa6456945102d500d` with the same source code succeeded on Cloudflare Pages at 18:41 UTC.
- **Verified public custom domain:** a separate focused source fingerprint, run `39059075554` attempt 2, passed at 18:43 UTC. It fetched `https://pvlab.studio/studio.html`, confirmed the inherited-padding ghost, stationary logo keyframes and fixed 100vw overlay; the full legacy route and other custom-domain checks in that same run also passed.
- No need for the user to wait for CDN publication now. User-side refresh is the remaining visual check. A new logo design is still unapproved.

## October 17 Windows refresh: scrollbar first-paint correction
- User reports the loader still jumps about one centimeter left before fading, even with stationary exit transforms and aligned blur pseudo-element.
- The latest 1917px desktop screenshot shows a ~14px vertical scrollbar gutter at the right edge; the logo appears centered in the remaining ~1903px area, not in the complete viewport. An isolated Chromium classic-scrollbar reproduction verified that adding a gutter **after** the loader paints shifts a percent-sized centered loader 7.5px left; the current source added `scrollbar-gutter:stable` only when `#app.image-studio-active` arrived.
- Reserve `scrollbar-gutter:stable` on `html.pv-studio-boot-lock` immediately on desktop widths >=761px, retaining the existing Image route gutter for after the loader ends. Mobile still reserves none. Leave `#lab-boot` 100vw, exit keyframes, blur, ghost alignment, progress line and ready guards untouched.
- Focused Studio mock regression now verifies first-frame gutter, no late root-width change under classic scrollbars even with percent-sized overlay, and no mobile reservation. Live-domain smoke checks the published style.
- Baseline main `cb1026a62a944ae5271c1ab371ac891ac63a43d6`. Actual browser results and deployment status must be updated after checks; unrelated generation, pricing and auth code untouched.

## October 17 first-frame scrollbar fix: verified release
- PR #298 merged into main at commit `81494e98d5de8708b9f3451f7151f998cb02470c`.
- Mock browser startup regression `39060092184` passed, including first-frame desktop gutter, a percent-width/classic-scrollbar test that reproduces a 7.5px jump without the fix, root width stability, mobile no-gutter, and unchanged 240ms blur/fade plus native route gating.
- Cloudflare Pages source check for merge commit reported **Deployed successfully**. Production custom-domain workflow `39060204657` also **passed**, with the live Studio HTML containing `html.pv-studio-boot-lock{scrollbar-gutter:stable}` and preexisting loader/route conditions.
- This targeted correction does not alter logo identity, visual effects, progress behavior, provider calls, billing, data, or app content. User refresh is the final subjective check. If motion persists, collect a screen recording across the first frame rather than repeating exit animation changes.

## October 17 authenticated Studio stuck-splash recovery
- User screenshots: Image and Video stayed behind the PV LAB loader for signed-in Eva and Camila sessions after entering from the homepage. Signed-in tokens and account contents were not available to this diagnostic.
- Verified live anonymous Chrome smoke: 2026-10-17 GitHub run 39065546981 opened both Studio routes, HTTP 200, no JS page errors and splash hidden by 20 seconds. The issue is isolated to, or aggravated by, signed-in initialization.
- In `lab/lab.js`, authenticated `sync()` awaited the private `/api/jobs` History path (65s request timeout) after the account was verified and `#app` unhidden. Auth and fallback session requests could also keep users waiting too long.
- Bound initial `/api/session` to 18s and migration-status fallback to 6s; signed-in Studio now gives private History 5s, then displays its authenticated workspace with a loading placeholder and accepts the eventual History result. The correct first-image Welcome is shown only after real History settles.
- In `lab/studio.html`, a stalled boot shows the existing 12s status and Reload even if the authenticated app container is already mounted. The approved minimal wordmark, bar, stationary .24s fade, and guards are untouched.
- Regression contract updated in `tests/lab-studio-layout-ui.mjs`; no changes to credits, generation, payment, worker, history records, account linking, or model selection.
- Deployment and live signed-in confirmation remain pending until verified after this commit. 

## October 17 release verification
- Private Lab tests, run `39066204865` on code with the bounded History fix, SUCCESS (including private-lab and gallery browser jobs). Static validation on commit `6a6755e4743acdf3f43cd0c5f1b3822247bae2e5` also succeeded.
- Production custom-domain smoke `39066494994` SUCCEEDED and explicitly required the published `https://pvlab.studio/lab.js` to include the five-second History race and `loadHistory().catch`, and the published Studio HTML to include the stalled-loader retry change. This is verification of deployed source, NOT a real Eva or Camila authenticated session.
- Added a dedicated Studio module URL cache marker `studioAuthRecovery=20261017-1` in `lab/studio.html` (commit `a1ce0bdd1361d3cb3689fa8030b64ec14c58769a`) to prevent browsers from reusing pre-fix `lab.js`. Post-commit custom-domain smoke run `39066604570` succeeded; it verifies the recovery JavaScript but does not separately assert the new query marker.
- Remaining user-side check: hard-refresh Image and Video when signed in as Eva and Camila; verify the splash clears, and saved History appears after any delayed request. No personal account login or credit spending was performed by this audit.
