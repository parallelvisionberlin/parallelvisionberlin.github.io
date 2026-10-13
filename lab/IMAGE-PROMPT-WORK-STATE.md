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
