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
