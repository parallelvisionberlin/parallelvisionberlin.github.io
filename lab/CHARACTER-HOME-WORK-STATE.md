## iPhone Character CTA arrow correction, 2026-10-27
- User's iPhone screenshot showed an unwanted emoji-style diagonal arrow after “Create a character”.
- Remove only the Unicode arrow span from the homepage CTA, retaining the exact link, text, styling and character creation behavior. Text-only button prevents iOS emoji substitution.
- Add focused static regression in tests/lab-character-home.test.mjs; no changes to layout, billing or other sections.
- Release verification pending; do not claim live before Cloudflare completes and production HTML is verified.

# PV LAB homepage / Create your character
- Date: 2026-10-24, Europe/Berlin.
- Task: Add a dedicated editorial character-creation section as a new commercial path without altering the approved image-to-motion demonstration or other homepage sections.
- Placement: after the existing Image / Video / Upscaler Studio cards, before Plans & Credits.
- Heading: "Create your character." and "A face you can return to."
- Content: Define → Save → Create, promoting the verified Elements > Characters reusable reference workflow without promising guaranteed identity fidelity.
- CTA: studio.html?tool=image&createCharacter=1.
- In authenticated image Studio, the new query intent opens the existing Elements / Characters creation form after successful workspace setup. It still uses existing ownership, credits and permission checks. Guests see their existing public Studio entrance; no private library access.
- First-party imagery from the Parallel Vision archive: optimized Nina FOK studies copied from assets/optimized/nina-fok/HDNINACANON.webp and Canon.webp; no invented people or generated mock output. The art depicts a project character, not a guaranteed same-person output proof.
- New assets: lab/visuals/character-studies/nina-canon.webp and nina-study.webp.
- New stylesheet: lab/character-home.css, strictly namespaced.
- Changes: lab/index.html, lab/lab.js, lab/studio.html cache marker, lab/README.md; tests/lab-character-home.test.mjs.
- Auth, wallet, generation, Mood Creator, current hero, image-to-motion story, pricing and existing Studio controls unchanged.
- Only direct user interaction saves reference profiles or creates paid results. No new automatic upload/training or inference.
- Tests: independent character homepage static contract; normal PR CI to check public and signed-in tool behavior, approved Image UI, homepage layout and mobile.
- Publication: GitHub merge and exact Cloudflare deployment status are separate from production DOM/image verification.
- Future improvement: replace the separate existing demo examples with a verified same-character before/transformation/video sequence when source and outputs are available.
