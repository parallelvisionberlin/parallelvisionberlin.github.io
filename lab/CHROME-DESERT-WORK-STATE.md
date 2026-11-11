# Chrome Desert featured world / 2026-11-11

## Approved owner direction
- The homepage remains Image / Video / Upscaler → a compact Chrome Desert featured world → unchanged Full Editorial.
- Use the actual owner-supplied photographs: mirrored desert woman and architecture as hero, angular golden sculpture and curved reflective sculpture as the two supporting frames. Exclude the two dagger portraits and unrelated studio chrome image.
- Keep the premium dark editorial composition, condensed typography and a text-only `USE THIS WORLD` CTA.
- This is a conceptual world preset, **not** a downloadable private Photo Pack, default customer character, or a wardrobe template.

## Proposed implementation
- CTA `full-editorial.html?world=chrome-desert` routes directly to Identity with the curated world visibly selected.
- Choosing a casting reference, user-uploaded subject or saved Character opens review without forcing Styling or Location & Mood. On review, customers can optionally edit either stage.
- The original Full Editorial entry `?start=1` keeps its existing four-step workflow and styling requirement.
- A curated environment reference is prepared from each of the two supporting artworks via in-browser left-side crops that exclude their models. Those two environment files are uploaded through the existing authenticated reference pipeline for the actual quote. Originals stay outside customer private Photo Packs.
- The creative direction explicitly separates identity, garments and poses from the pictured people. Wardrobe stays with the selected subject unless changed.
- Paid jobs only occur after the existing server-priced quote and an explicit Generate click; do not change billing, pricing, models, auth, provider or refund paths.
- Browser source names: `lab/editorial-world-presets.js`, `lab/full-editorial.js`, `lab/full-editorial-world-preset.css`, `lab/full-editorial.html`, `lab/index.html`, `lab/home-featured-photo-pack.css`; image assets under `lab/visuals/featured-worlds/chrome-desert/`.
- Focused tests: `tests/lab-chrome-desert-world.test.mjs`, updated `tests/lab-home-featured-photo-pack.test.mjs`, existing approved Image UI contract. Source and role-based browser checks required before claiming fully verified.
- Original user-supplied PNGs and mapping are independently retained in the user's ChatGPT Library at `/PV Lab/Reference Worlds/Chrome Desert`.

## Status
- Candidate staged on branch `feat/chrome-desert-featured-world-20261111` based on current main.
- This is an implementation candidate, not a production deployment or signed-in generation verification.
- Next: focused tests, review the actual page at desktop/mobile, PR, merged source and Cloudflare Pages production verification if tests pass. Do not run paid generations for testing.
