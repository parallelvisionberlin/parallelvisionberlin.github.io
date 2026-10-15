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

## Verification
- Regression source asserts the still, crisp initial wordmark and exit animation after readiness, first paint, desktop/mobile bounds, and a hidden overlay after completion. Native Gallery test waits for the 240 ms exit.
- No paid generation, secrets, authentication, credit, or Worker logic changed.
- Automated browser test and production activation must be confirmed independently.
- Repo change uses one atomic source/test/documentation commit; commit SHA is the Git record.

## Next action
- Check the Studio loading state on `https://pvlab.studio/studio` and sign-in readiness after the Pages deployment.
- Observe the loading sequence on mobile, keyboard reduced-motion settings, and slower network conditions.
- The logo is crisp even for fast-loading pages; its outgoing blur only plays on readiness, with pointer-events removed immediately.
