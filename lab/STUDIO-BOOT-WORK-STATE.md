# PV LAB Studio boot animation work state

Updated: 2026-10-15
Scope: Only the initial Studio loading overlay, not the public landing, customer accounts, checkout, generation, or galleries.
Source: `lab/studio.html`; browser regression: `tests/lab-studio-layout-ui.mjs`.

## Approved reference
- User selected two monochrome minimal splash options, one sharply typeset and one with horizontal motion blur.
- Combine them: PV LAB arrives blurred, focuses to clean sharp typography, with a small BY PARALLEL VISION line and thin progress indicator.
- Retain the centered black screen and no heavy background film, image, video, spinning graphics, faux percentages or marketing messages.
- Preserve instant dismissal when the Studio is ready. Never create an artificial animation wait.

## Implementation
- Single existing inline first-paint CSS block in `lab/studio.html`, so the splash shows before external stylesheets and JS.
- Text-based PV LAB mark; removed the previous Parallel Vision PNG and asynchronous image decoding script.
- 440 ms blur/ghost to sharp wordmark, quieter subtitle transition, indeterminate line while loading.
- Mobile centered width constraints and a reduced-motion override.
- Normal loading status remains available to assistive technology; visible status and Reload button appear if startup exceeds 16 seconds.
- Existing `lab-ready`, `pv-native-route-pending`, and app-ready dismissal rules remain unchanged.

## Verification
- Regression source asserts loader copy, animation keyframes, first paint and desktop/mobile bounds.
- No paid generation, secrets, authentication, credit, or Worker logic changed.
- Automated browser test and production activation must be confirmed independently.
- Repo change uses one atomic source/test/documentation commit; commit SHA is the Git record.

## Next action
- Check the Studio loading state on `https://pvlab.studio/studio` and sign-in readiness after the Pages deployment.
- Observe the loading sequence on mobile, keyboard reduced-motion settings, and slower network conditions.
- If ready in under 440 ms, the loader may leave before the focus animation finishes, intentionally avoiding load-time padding.
