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
