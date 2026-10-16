# Image composer prompt: current state

- Updated: 2026-10-14, Europe/Berlin.
- Fix baseline: `bcf473df79f15e50f76094a238ef236200f354a1` on `main`.
- User approved only the contextual prompt text, not changes to the deck design or dimensions.
- Empty web prompt: `What do you imagine?`.
- With base image: `What would you like to change?`.
- References-only: `Describe the image you want to create...`.
- Diagnosis: a separate desktop CSS override forced an empty standard Image deck to at least 224px tall (272px on smaller laptops), and resized several controls.
- Fix: remove that override. Inherit the previous compact model, Mood, settings, toolbar and Generate sizing. Loaded thumbnails occupy their own photo row.
- Preserve the unified upload/saved photo packs `+` menu and text-only model photo hiding.
- Keep existing prompt JavaScript, Moods, reference guidance, native-app styling and generation controls unchanged.
- Files changed: `lab/assets.css`, `lab/studio.html`, `tests/lab-studio-layout-ui.mjs`, `tests/lab-image-prompt-dock-ui.mjs`, and this file.
- Regression checks now assert compact empty layout, photo row expansion, shrink after removal, and exact placeholder copy.
- No paid generation or changes to credits, pricing, provider APIs or customer data.
- Status: pending CI and GitHub Pages deployment confirmation.
- Next action: verify browser sizing checks and published source; leave unrelated homepage tests untouched.

## Controlled Pose guidance (2026-10-14)

- Starting commit: `238342f3a3966397469473951ec8268d29979271` on `main`.
- A disabled Controlled Pose Generate action previously surfaced generic input guidance as an inline `composer-generation-block` row, making its image deck taller than Seedream/Nano.
- For the `fal` engine, guidance is now provided on the model selector and disabled Generate tooltips and as accessible descriptions, without an inline row.
- Errors and validation still disable submission exactly as before; the underlying `message` is not discarded.
- The original model-specific input instructions remain available, including one Pose photo, 1–4 Identity photos and a prompt.
- No layout CSS, reference roles, model switches, Moods, pricing or backend changed.
- UI regression verifies that switching from a photo-loaded Seedream deck to Controlled Pose keeps comparable dimensions and that guidance is accessible and does not leak after switching back.
- Updated files: `lab/lab.js`, `lab/studio.html`, `tests/lab-studio-layout-ui.mjs`, `lab/IMAGE-PROMPT-WORK-STATE.md`.
- CI/deployment status: pending verification after commit.

## Compact Image settings (2026-10-16)
- Source baseline on main: `e07740e3af1131ac103f6bf2721802ccae72a0b2`.
- User screenshot showed a huge options panel, a redundant PNG/JPEG choice for PNG-only Seedream, and exposed disabled draft/reset buttons.
- Desktop Image settings now anchors a 330px popover above the Options button instead of expanding the entire composer; Generate and gallery geometry are unchanged.
- Native app re-parents this drawer inside its Create deck as before. Mobile web uses an above-composer flyout.
- Only genuinely selectable model settings appear. Seedream, Flash, Kling, Qwen and Z-Image output PNG and never present an ignored format choice. Formats for other tools are unaffected.
- Exact prompt stays optional. Save draft and Reset editor remain fully wired under a collapsed “Save or reset” disclosure; PV Soul strength-only settings hide this disclosure.
- Changed scope: `lab/studio.html`, `lab/assets.css`, `lab/lab.js`, `tests/lab-studio-layout-ui.mjs`, this state file. No backend, pricing, image generation or user-data changes.
- Mock browser regression added for Seedream menu layout, PNG visibility, Exact Prompt and unchanged Generate geometry; CI/deployed status to verify after commit.

## No ordinary Image settings menu (2026-10-16)
- Starting repository main head: `6427e0b842dba9d87829196b7c6ec7519d6a6606`.
- User rejected both the full Image settings popup and the compact popover. Only a subtle Exact Prompt on/off switch is retained next to the prompt, disabled by default. The existing backend uses its checked state without a new paid call.
- Seedream, Lite, Flash, Qwen, Kling, Gemini 2.1 and text-only models do not show a generic Options icon when no reference details are present.
- Models with genuine controls (Nano Banana Batch, Controlled Pose, Soul identity settings), or images with optional reference note/target fields, retain a contextual advanced control so the existing functionality is not lost.
- Save draft and Reset editor are no longer exposed in Image Studio; Video and Upscaler keep their existing controls. Important verified behavior: Reset cleared media and Mood but never deleted typed prompt text. Ctrl+A Delete affects the focused prompt only.
- Only HTML/CSS/UI wiring and mock/static tests changed. No credit, model, provider, billing, job submission or customer-data changes.
- Scope: `lab/studio.html`, `lab/assets.css`, `lab/lab.js`, `tests/lab-studio-layout-ui.mjs`, `tests/lab-smart-prompt-ui.test.mjs`, this state file.
- Regression: verify tiny toggle, visible only for supported image engines; standard toolbar has no gear, Save or Reset; hidden options are preserved for model-specific cases, and no Generate geometry shifts. CI and deployment must be confirmed separately.

## Disabled Generate ghost-tile correction (2026-10-16)
- Source baseline on main: `5f21cc4ff5e051d14f8763c6a4b3d74e1197caf5`.
- Screenshot showed a conspicuous pale 144 × 84 Generate button with disabled gray lettering and an empty prompt.
- A late `lab/studio-finish-v2.css` override forced light `#e9e7e0` even when the button was disabled.
- The disabled Image Generate appearance is now graphite `#292c2a`, a quiet outline and readable muted text; the existing pearl-white enabled state stays untouched.
- No change to control height, image deck geometry, model behavior, eligibility, credits or paid generation.
- `lab/studio.html` updates its CSS cache token. The compact prompt browser regression checks computed disabled background and text for Seedream and Soul, and now runs on main pushes.
- GitHub Actions and GitHub Pages release status must be verified after committing.

- Regression harness follow-up: the current extracted `fitImageComposerPrompt()` also calls `effectiveImagePrompt()`. The mock-only browser harness now stubs this contextual direction function to an empty string, so its CSS assertions can run. No application logic changes.

- CI isolation follow-up: the inherited long-prompt mock browser test fails on unrelated historical layout assumptions after being made runnable. Restored it and its PR-only workflow to their previous versions; it is not a reliable gate for the disabled-button color.
- Added `tests/lab-image-generate-disabled-ui.mjs` and `.github/workflows/pv-lab-generate-disabled.yml` to verify rendered dark disabled / pearl enabled styles on desktop, mobile and Soul without booting or charging the Lab.
- Source baseline for the isolated test: `05ded0336275982e42b81429b982d15fbc8e20c3`. New CI and page deployment status to verify after commit.

## Empty Generate tile behavior (2026-10-16)
- User verified the darkened disabled Generate CTA had reached PV LAB, but the full-size inert tile was still visible on an empty Image deck.
- Hide the disabled Generate tile only when the standard Image prompt is empty and no photo-reference tiles are attached. Keep its layout slot to prevent composer motion.
- With text/photos, show a disabled button if blocked so important feedback remains available. Submitted states and PV Soul's identity workflow remain intact.
- No backend, credits, pricing, model, reference or photo-display modifications.
- Updated `lab/studio-finish-v2.css`, CSS cache token in `lab/studio.html`, test `tests/lab-image-generate-disabled-ui.mjs`, and this handoff.
- Browser verification covers empty, text-present, photo-present and ready states at 1440 desktop, 390 mobile and Soul.
- GitHub Actions CI and GitHub Pages deployment to verify after commit.

## Permanent Generate and corrected Exact control location (2026-10-16)
- The user clarified that "ghost button" referred to the out-of-place Exact switch, not Generate. Never remove Generate when there is no prompt. Starting verified main source head: `842201dd4027190f49f0b63484fa8178659789fd`.
- Removed mistaken `visibility:hidden` for empty Generate. Its large right-hand position remains constant. Inactive Generate has a visibly muted pearl finish and stays disabled; active Generate keeps the existing brighter treatment and actual provider/credit checks unchanged.
- Moved the existing functional `composer-exact-prompt` control out of the text-writing row to immediately after Image count inside the toolbar, with a small normal-height chip. It retains its original checked state and backend behavior. Native Create keeps the switch inside More controls rather than overlaying the prompt.
- Touched only `lab/studio.html`, `lab/assets.css`, `lab/studio-finish-v2.css`, `lab/native-create-gallery.css`, `tests/lab-image-generate-disabled-ui.mjs`, `tests/lab-studio-layout-ui.mjs`, this handoff. No account, billing, job, pricing, provider, backend or saved user data changes.
- Mock browser regression now checks Generate remains visible and non-clickable when empty, enabled surface when ready, and exact switch alignment. GitHub Pages publication and CI separately verified after commit.

## Exact switch without label or container (2026-10-16)
- User approved the original fixed Generate button and requested a final reduction of Exact: remove the visible word and bordered chip, leave only a tiny switch after the Image count control. Hover/focus reveals an explanatory "Exact Prompt" tooltip.
- Source baseline: `89f0717c970e670ec37833195c238f8a09e557d6`. The same `composer-exact-prompt` ID, checked state, enabled models and backend logic remain untouched. The tooltip states that automatic prompt improvements are disabled but Moods and references still apply.
- `lab/assets.css` uses a 36px transparent switch wrapper, with absolute, noninteractive tooltip. Native Create retains a compact switch in expanded controls and an accessible label.
- Regression tests verify transparent chipless appearance, 40px-or-less width, hover visibility, and existing Generate position. Production smoke checks new CSS asset fingerprint and tooltip CSS.
- Files: `lab/studio.html`, `lab/assets.css`, `lab/native-create-gallery.css`, `tests/lab-studio-layout-ui.mjs`, `tests/lab-smart-prompt-ui.test.mjs`, `.github/workflows/pvlab-domain-smoke.yml`, this handoff.
- No Generate, credit, price, model, upload, account, gallery, Worker or paid job changes. CI and live-domain deployment must be checked independently.
