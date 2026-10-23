# PV LAB public Studio preview restoration

Date: 2026-10-23 (Berlin). Initial base: `453e18a4f598184dd1980efd72a27aa9120a711d`. Current main `a10eb030babb66bb1dc79cd944c945d137926db7` incorporated by normal merge, preserving the concurrent loading wordmark, Image credit overlay, Moods and released Precision changes.
Scope: public Studio browsing and its authentication boundary. Keep this PR draft, unmerged and undeployed pending CI/review.

## Root cause and recovered designs

`8a5be639a5b6ddf50f7622880fc0d1a9b1c4e605` (2026-10-21, 23:38 Berlin) introduced the generic panels in `studio-guest-image.js`: `guestToolPages`, `guestToolPanel` and `syncGuestToolRoute()` replaced every non-Image entrance with “Sign in to open…”. Its appended CSS hid the Image carousel/composer on those routes. The accompanying routing tests explicitly required the new panels, locking in the visual regression. Before that change, the guest script also required authentication on non-Image tabs; it was not a reusable public Video/Upscaler implementation.

The approved interfaces remain in the shared components. Recover and reuse those instead of reverting the whole routing hotfix or copying Image into other tools:

- Video: `20d65ef89dac338eda82d4bc6573f37d71521285`, approved editorial restoration, retaining subsequent Video fixes.
- Upscaler: current approved V28 layout, last CSS change `6c7a98cd`, retaining the real chrome/wool photograph and existing sidebar.
- Retouch: existing Precision workspace and honest selection demonstration; `e9b4e557c87a6a36b9c5b47612abdf05b10abab2`.
- Fashion: existing outfit replacement form and shadow-root styles; `af52557090a6bff44694b9c22ed1140da89e6b9a`.
- Image: current approved entrance, Inspiration imagery, prompt code and styles are preserved. The visual baseline uses the complete approved main source at `a10eb030` rather than reverting later approved Image changes.

## Implementation and security boundary

Public presentation never sets `owner`, selects a private cache, loads History or configures a provider. Video/Upscaler reuse the real tool decks; Retouch exposes its existing empty/local sample view; Fashion shows the existing form with its private gallery hidden. Image continues to use its unchanged guest deck.

The existing API/session/upload/quote/generation guards, Worker, billing, credits and provider settings are unchanged. Account actions enter the real authentication flow; canceled authentication leaves the public interface available. Assets retains its account gate. Sign-in and sign-up force-return URLs are captured at the click, including the requested tool and query parameters. Logout clears private media/history and user-written directions before public presentation resumes, including the Fashion shadow-root form.

Explore Moods is unchanged and browser-tested for guests, customers and owners, including navigation back to Studio. Retouch/Fashion internal return links restore the public Image route and draft.

## Exact changed files (13)

- `.github/workflows/lab-public-studio-tests.yml` — independent visual/navigation coverage and retained screenshot artifacts; no changes to PR #443's workflows.
- `lab/studio-public-preview.js` — existing-deck presentation and account-action boundary.
- `lab/studio-guest-image.js` — guest route integration; retain generic gate only for private Assets.
- `lab/studio-guest-image.css` — remove broad non-Image suppression; hide private regions during public presentation.
- `lab/lab.js` — public presentation integration, route-safe internal links, cleanup and click-time auth return URLs.
- `lab/precision-edit.js` — presentation-only empty preview entry; authenticated open and paid operations retain their checks.
- `lab/fashion.js` — optional public form presentation and account-action interception; default signed-in behavior unchanged.
- `lab/fashion-studio.js` — changed child-module cache version.
- `lab/studio.html` — changed-module cache markers only; no deck markup or imagery changes.
- `tests/lab-public-studio-ui.mjs` — actual bootstrap with synthetic Clerk/Worker boundaries, approved-source screenshots, navigation and privacy tests.
- `tests/lab-tool-routing-ui.mjs` — replace generic-gate expectations with the correct tool preview while retaining login/config fallback assertions.
- `tests/lab-mobile-mood-entry.mjs` — remove the obsolete generic-gate expectation from the isolated Image fixture; preserve prompt, photo, keyboard and framing assertions.
- `lab/STUDIO-PUBLIC-PREVIEW-WORK-STATE.md` — this record.

## Local evidence

- Node **22.16.0**: **703/703** `tests/lab*.test.mjs` passed, including backend authorization, private media, billing/credits, provider behavior and all five locked Image UI contracts.
- New full-bootstrap suite: passed at **1440, 390 and 320px**, across guests, synthetic customers and synthetic owners. All five tool previews, direct URLs, tab navigation, Back/Forward, internal return links, preserved Image draft, canceled sign-in, exact auth return URLs, logout cleanup and Explore Moods passed. No horizontal overflow in the checked tool states.
- **32 pixel screenshot comparisons** passed against independently booted approved Git source. Image compares the whole public entrance. Video compares desktop Start/Reference imagery and model deck plus the approved compact phone controls; phone empty stages remain hidden exactly as in the approved source. Upscaler compares intro/drop photograph; Retouch compares its board; Fashion compares intro/source/result regions. Comparisons require identical dimensions and allow at most one channel level on 0.1% of pixels for measured fractional-border antialiasing. Component captures exclude sticky-header occlusion; full-page captures retain the header.
- Guest runs made **zero private API requests**. Assets and Scene Library stayed private; Generate, model operations, upload entry and private actions requested authentication without uploads, quotes, generation or billing mutations.
- Existing browser suites passed: tool routing/config fallback, mobile Mood entry, prompt paste/scroll and Studio desktop/mobile layout. First-image instant/parity passed on initial base `453e18a4`; after incorporating current main it fails on the independently approved zero-credit overlay. A fresh, unmodified `a10eb030` worktree reproduces the same background-pixel failure (max 234, mean 32.8579) before the guest fix. The legacy suite also retains bottom-of-viewport notice assertions. Product behavior and that existing test are left unchanged; the new approved-source guest comparisons pass against current main. Existing POSIX-only test-server path checks were adapted locally with an uncommitted Windows loader for unchanged suites; the checked-in routing/Mood fixtures are now portable. CI executes the normal scripts on Linux.
- Syntax and whitespace checks passed.
- The existing Upscaler-to-Assets workflow fails its empty-state left-source-upload assertion. A fresh unmodified `a10eb030` checkout reproduces the same failure. Its full 34-check model/quote/History suite and two-check submission smoke pass in CI; draft #443 contains the corrected visibility expectations. Those unrelated expectations are not overwritten by this PR.
- Node 24.19.0 has an existing timing failure in the unrelated Dream Blur preflight-speed test (also reproduced alone). The exact CI runtime, Node 22.16.0, passes all 703 tests. No unrelated test was weakened.

Screenshots: `test-results/studio-public-{image,video,upscale,retouch,fashion}-{1440,390,320}.png`, signed-in role captures, and `visual-*-{actual,approved}.png`. The new CI workflow publishes them as `public-studio-visual-comparisons` for seven days. CI outcomes and final PR link belong in the PR description after publication; local success is not a CI or production claim.

## Coordination with draft PR #443

Checked the actual head `95d6c67aaf033b50f883a4c4b33359c4b263d10c` in a separate detached checkout. The guest patch applies cleanly to its product code. Its Studio HTML cache additions must be combined with this PR's cache markers, retaining both sets of query flags; its Precision popup markup is untouched.

The combined local candidate passed the new full public/signed-in suite at all three widths, **34/34** Upscaler checks (both fresh Precision qualities, provider payload/quote/credit binding, History reuse, keyboard/touch and duplicate protection) and **12/12** customer Video cases asserting Start frame before interaction. Draft PR #443 and its remote branch were not modified. Do not replace its model/quality changes or Video defaults with main's older code when integrating.

No real Clerk account, production private media, real wallet balance or paid provider acceptance was tested. No merge, production deployment, purchase, paid generation or production data/settings change was initiated.
