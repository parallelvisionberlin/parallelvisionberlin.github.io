# PV LAB Studio boot animation work state

Updated: 2026-10-17
Scope: Only the initial Studio loading overlay, not the public landing, customer accounts, checkout, generation, or galleries.
Source: `lab/studio.html`; browser regression: `tests/lab-studio-layout-ui.mjs`.

## Approved reference
- User selected two monochrome minimal splash options, one sharply typeset and one with horizontal motion blur.
- Updated user direction: PV LAB starts crisp and stays normal while loading, then the horizontal motion blur plays on exit, not at the beginning. BY PARALLEL VISION and the thin progress line remain.
- Retain the centered black screen and no heavy background film, image, video, spinning graphics, faux percentages or marketing messages.
- Never hold readiness or block clicks for the effect. On readiness the overlay becomes non-interactive and completes a 240 ms visual exit.

## Implementation
- Single existing inline first-paint CSS block in `lab/studio.html`, so the splash shows before external stylesheets and JS.
- Text-based PV LAB mark; removed the previous Parallel Vision PNG and asynchronous image decoding script.
- The default first paint is a sharp, still PV LAB wordmark. On workspace readiness, the logo gains a 240 ms blur/trail exit while the screen fades; the line continues during genuine loading.
- Mobile centered width constraints and a reduced-motion override.
- Normal loading status remains available to assistive technology; visible status and Reload button appear if startup exceeds 16 seconds.
- Existing `lab-ready`, `pv-native-route-pending`, and app-ready conditions are preserved; only their dismissal styling now animates, and native route pending continues holding the overlay visible.

## October 15 direct Studio route public audit
- Report: opening `/studio?tool=fashion` briefly showed the Image editor, and other direct routes may do the same.
- Verified cause in `lab/lab.js`: `sync()` unhides #app and calls `finishLabBoot()` before waiting for History, then restores the requested route. Inline loader CSS also exits immediately on `#app:not([hidden])`.
- Authenticated entry now marks `pv-studio-route-pending` before revealing #app; boot waits until `restoreStudioEntry()` has selected Fashion/Retouch/Assets/Moods or the already initialized Image/Video/Upscaler.
- `restoreStudioEntry()` happens before dismissing boot; optional History, packs and characters load afterward. Fashion's HTML/CSS and controller settle before first exposure.
- Native route destination pending, signed-out gate, retry on error, and 240ms blur-out exit preserved.
- New regression checks startup ordering and simulates authenticated Fashion while Image is provisionally present behind the loader.
- No payments, credits, backend settings, providers, user data, gallery records or paid generation changed.
- CI, live Pages publish and cross-device browser verification still require independent confirmation.
- Deployment smoke now checks the actual published Studio HTML **and** `lab.js` for the route guard, rather than passing on an older cached deployment.
- Backend health check accepts any compatible version from `2026-10-15.1` onward, instead of failing on new releases such as source version `2026-10-15.4`. Existing production CORS origin check remains mandatory.
- Standalone mock-only Fashion browser coverage now runs automatically for Studio/Fashion changes on main, not only manual dispatch or pull requests.
- CI and domain probes will determine the final publish status. No live provider calls or real payments are made by these workflow checks.
- Fashion's embedded controller previously awaited private gallery pagination and a provider balance query before reporting readiness. Both now run as background read-only operations once account and models are verified.
- A mock Fashion regression holds gallery and balance responses to verify the editor appears before they return, then verifies normal private gallery behavior.
- Cache fingerprints were updated along the complete route: Studio HTML -> `lab.js` -> lazy `fashion-studio.js` -> `fashion.js`, plus standalone Fashion HTML. This avoids returning older JavaScript from previously cached URLs after deployment. No static gallery files or original user assets were renamed.
- Independent Fashion CI now also runs the Studio first-paint regression even when unrelated backend unit checks fail.
- Image + Base + Mood had an inconsistent metadata edge case: the automatic functional Base variation instruction was stored as `moodOriginalPrompt`, even though the user left the visible direction empty. Keep the provider's complete prompt unchanged while recording only the actual text typed by the user. The mock quote regression asserts both requirements. This also prevents generic internal Base text from appearing as the user's Mood caption.

## October 15 Fashion reload: scrollbar and logo stability
- Reported Chromium/Windows refresh of `/studio?tool=fashion`: the loading overlay was centered, but the underlying long document displayed a scrollbar; the loading logo appeared to shift briefly.
- Root cause in source: loader previously hid the main page visually but did not lock document scrolling; only Retouch set `history.scrollRestoration='manual'`; loader typography used asynchronously swapped Google fonts.
- `studio.html` now places `pv-studio-boot-lock` on the root in the very first HTML tag and locks html/body overflow in the early inline CSS. All direct Studio routes suppress restored scroll offsets and reset to top.
- The splash now uses a stable system font stack for its mark and attribution, avoiding remote-font-induced layout shifts; the selected outgoing 240ms horizontal blur is otherwise unchanged.
- Scrollbar and wheel scrolling remain suppressed through the splash exit. A 280ms guarded release waits for `lab-ready`, `pv-studio-route-pending` and `pv-native-route-pending`, with reduced-motion release immediately; the route class observer also handles delayed native resolution.
- `lab.js` re-arms scroll lock when signing into Studio without a page navigation. All other Studio CSS, customer balances, generation and pricing remain unchanged.
- Mock browser regression now checks locked overflow, unchanged wordmark coordinates, stable font, wheel-scroll suppression and scroll recovery on Image/Fashion entries.
- Live domain/CI/browser execution needs independent verification after Pages deployment.

## Verification
- Regression source asserts the still, crisp initial wordmark and exit animation after readiness, first paint, desktop/mobile bounds, and a hidden overlay after completion. Native Gallery test waits for the 240 ms exit.
- No paid generation, secrets, authentication, credit, or Worker logic changed.
- Automated browser test and production activation must be confirmed independently.
- Repo change uses one atomic source/test/documentation commit; commit SHA is the Git record.

## Next action
- Check the Studio loading state on `https://pvlab.studio/studio` and sign-in readiness after the Pages deployment.
- Observe the loading sequence on mobile, keyboard reduced-motion settings, and slower network conditions.
- The logo is crisp even for fast-loading pages; its outgoing blur only plays on readiness, with pointer-events removed immediately.

## October 15 Image Studio loading-width correction
- The Image page's scrollbar is hidden during the loading animation and restored afterward, while image History loads asynchronously. In classic-scrollbar browsers that can change available gallery width, creating an apparent size/scroll movement.
- The early Studio boot CSS reserves a stable root scrollbar gutter for the web Image workspace on desktop/tablet widths >=761px. Mobile remains unreserved so the floating composer stays centered; all other Studio tools keep the existing layout.
- A mock-only browser regression tests the actual Studio HTML/CSS at 1440x900 and 390x844 before boot release, afterward and after a simulated increase in History height. Root/gallery/composer geometry remains constant and scrollY stays zero.
- Account menu alignment tests use the usable page geometry when a reserved scrollbar is active. No generation, provider, payment, authentication, or gallery data code changed.

## October 16 incorrect shared Studio URL
- Incoming `https://pvlab.studio/lab/studio?tool=image&utm_source=chatgpt.com` uses the legacy `/lab/` prefix on the new domain; canonical production path verified by the existing domain smoke workflow is `https://pvlab.studio/studio?tool=image`.
- Added Cloudflare Pages output `lab/_redirects` for `/lab/studio`, `/lab/studio/`, and `/lab/studio.html` to `/studio` (301), without injecting new query parameters. The source link's query should be preserved, but this requires an HTTP redirect check after Pages deployment.
- This is a static routing compatibility rule only. No changes to sign-in, payment, inference, JS startup or account migration.
- Baseline main: `e34854e6d55e0fba36e71faac130b238be2addfa`. Confirm actual custom-domain redirect and corrected UI on the active Pages deployment before declaring the broken route fixed in production.

## Legacy-path static alias after live redirect check (2026-10-16)
- Actual production smoke for `https://pvlab.studio/lab/studio?tool=image&utm_source=chatgpt.com`: the page returned HTTP 200 without a Location header for 12 attempts, so `lab/_redirects` alone was not effective in the live project.
- Cloudflare Pages documents that unknown routes serve the SPA root with HTTP 200 when no root `404.html` exists. This can load a homepage HTML at a nested URL and break relative scripts and styles.
- Added concrete `lab/lab/studio.html`, matching Cloudflare Pages extensionless `/lab/studio`, which only redirects via first-paint inline script to `https://pvlab.studio/studio` while preserving the entire search query and hash; its no-JS fallback opens Image Studio.
- No login, generation, API, wallet, provider, user data or existing Studio HTML are touched. Existing `_redirects` remains as an optional edge-level fast path.
- Production smoke now accepts either an actual canonical HTTP redirect or the exact dedicated redirect shim, rejects the erroneous generic SPA fallback. Deploy/Live alias requires a fresh check.
- Baseline: `6e1b698efeb40a9af97f924d05db815ea3a5bd95`. Files: `lab/lab/studio.html`, `.github/workflows/pvlab-domain-smoke.yml`, this state file.

## October 17 fluid chrome loading and stable center
- Approved selection: Fluid Transition, the black-chrome membrane option from the visual storyboard. The PV LAB logo/attribution and thin progress line stay centered and readable.
- lab/studio.html now paints lightweight inline decorative SVG chrome ribbons around the edges with slow drifting reflections, using CSS only. No fetched asset, video, animation timer, new JS, readiness wait, or provider call.
- The user explicitly asked not to change the existing 240 ms blur/trail and screen fade-out; its keyframes, selectors and timing are untouched. Native-route and route-ready guards, 16-second fallback, and boot retry remain intact.
- Desktop root scrollbar-gutter reserves stable space at first paint during boot lock, before #app receives .image-studio-active. A mock Chromium geometry reproduction moved the logo -7.5px without it and 0px with the rule.
- The fluid graphic is aria-hidden, behind the brand, pointer-inert and respects prefers-reduced-motion. Mobile uses lightweight vector art scaled to viewport, not a background download.
- Tests in tests/lab-studio-layout-ui.mjs cover initial gutter reservation, inline SVG, no logo displacement when Image class appears, reduced motion and the previous exit.
- Desktop/mobile art was rendered in local isolated Chromium previews. The repo full browser test and live Cloudflare deployment still require independent confirmation.
- Scope: Studio loading overlay and layout test/state only. No galleries, generation, worker, accounts, pricing, or payments altered.
