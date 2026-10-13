# Image composer prompt: current state

- Updated: 2026-10-14, Europe/Berlin.
- Baseline: `0e396a2413f477818c46edcae3550e515d8defc3` on `main`.
- Scope: public PV LAB Image Studio textarea placeholder copy only.
- Approved empty text: `What do you imagine?`
- When editing a base photo: `What would you like to change?`
- In references-only mode, and for controlled-pose references: `Describe the image you want to create...`
- The existing editor state determines the placeholder when images are uploaded, removed, models changed or reference mode changed.
- A text-only model still displays the empty prompt. Parked photos do not count as visible references.
- Native-app-only prompt copy is deliberately preserved; this UI adjustment targets the web Studio.
- Static HTML fallback matches the empty placeholder; the Lab module cache key was updated.
- No modification to generated prompts, reference roles, Moods, image endpoints, pricing, credits, or backend.
- Files changed: `lab/lab.js`, `lab/studio.html`, `lab/README.md`; this file added.
- Source checks: exact original placeholder location verified, one replacement, cache key updated, existing context mode retained.
- Deployment status: requires GitHub Pages success after publishing this commit.
- Next action: confirm the GitHub Pages workflow and the live Studio loader.
