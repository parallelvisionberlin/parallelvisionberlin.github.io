# PV LAB Studio boot animation work state

Updated: 2026-10-15
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
- User reported a small apparent expansion of /studio.html?tool=image as the page finishes loading, without deliberate automatic scrolling.
- The boot sequence hides the scrollbar until splash exit. Authenticated Image History loads asynchronously after the editor becomes available and can introduce a classic desktop scrollbar, shifting content width.
- Image-only early CSS now reserves a stable root scrollbar gutter whenever #app.image-studio-active exists; Video, Fashion and other tools retain their current gutter behavior. No paid generation, login, data, gallery fetch, or pricing logic changed.
- Standalone mock-only Chromium regression tests the live Studio HTML/CSS at 1440x900 and 390x844. It checks image gallery and fixed composer geometry while locked, after splash exit, and as the simulated image history grows. It also verifies no automatic scrolling and no gutter change to other tools. Run via the account UI browser workflow.

- Responsive correction: reserve Image scrollbar space only at desktop/tablet widths >=761px. Phone scrollbars overlay the content; reserving an extra 15px there would miscenter the fixed composer. The header alignment regression now compares against the usable page content edge, not the outer browser viewport.
