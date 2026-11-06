# PV LAB Video — Transform / Replace Character
Updated: 2026-11-06 (Berlin)

## Release status
- Approved dark editorial visual applied under **Video → Seedance 2.5 → Transform**.
- PR: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/853
- Feature source head: `b4c19b10b06c3c9a090a26f56b242eef141c7b5a`.
- Feature merged to `main` as `4e01012d75fc7f403b6272a31b3e238f2353ac62`.
- Exact merge SHA Cloudflare Pages app check: **completed / success**, project `pvlab-studio`, 2026-11-06.
- Direct custom-domain asset hash and an authenticated production session remain **unverified**; do not infer them from GitHub or Cloudflare alone.
- Customer paid edits remain **disabled by default** until both `LAB_CUSTOMER_HIGGSFIELD_ENABLED=true` and `LAB_CUSTOMER_VIDEO_TRANSFORM_ENABLED=true` are deliberately set.

## Approved visual, locked features
- Source: owner-approved 2026-11-06 Transform mockup.
- Replace Character is the first Transform operation. The Create/Extend/Transform task row, compact source clip, real Character photographs, Saved Character chooser, prompt, output controls, draft inspector and Original/Result toggle are implemented.
- The original subway background image, **Video player deck geometry**, left/right column tracks and **History cards, spacing, scroll, controls and ordering** remain unchanged.
- A proposed large storyboard strip below the video was deliberately not added: it would displace the already-approved History.
- No fake result image, decorative changed photo, automatic paid generation, new campaign or change to existing Create/Extend capabilities.

## Implementation
- Frontend: `lab/studio.html`, `lab/video-transform.css`, `lab/video-scene-states.js`, `lab/video-editorial-deck.js`, `lab/lab.js`, `lab/media-references.js`, `lab/video-input-action.js`, `lab/scene-library.js`, `lab/video-models.js`.
- Backend: `lab-worker/higgsfield-video-transform.mjs`, `lab-worker/seedance.mjs`, `lab-worker/worker.mjs`.
- Tests: `tests/lab-video-transform.test.mjs`, `tests/lab-video-transform-ui.mjs`, `.github/workflows/lab-seedance-tests.yml`; related Elements/Character contract tests updated.
- Character library accepts Transform and attaches all saved photographs (up to eight), not just the preview thumbnail.
- Original/Result retrieves the actual saved source and output assets; only completed Transform jobs get this comparison.

## Provider and financial control
- Official Higgsfield `bytedance/seedance-2.5/video-edit`: source `video_url`, optional `image_urls`, prompt, 480p–1080p, MP4 output and audio choice.
- One original 4–30-second MP4/MOV, up to 20 MiB, plus 1–8 JPG/PNG/WebP identity photos.
- Live provider estimate bound to exact private assets and settings; quote is reviewed and explicitly confirmed before any job is submitted. $20 estimate guard plus existing daily cap, quote uniqueness, concurrent-job and uncertain-state safeguards.
- Video cost can count both input and generated footage; identity and source-motion preservation are not frame-perfect guarantees.
- Multi-subject target follows the owner's explicit prompt rather than an unconditional main-person assumption.
- No real paid provider submission occurred in this work.

## Verification evidence
- Main merge `4e01012`: **transform-browser SUCCESS** at 390px and 1440px (mock clips, all 8 Character photos, quotes, no automatic submission, History/Reuse and Original/Result).
- Main merge: static-site validation **SUCCESS**; PV LAB approved Image UI contract **SUCCESS**.
- Full Node suite: 1010 pass, 5 fail in already existing Moods/Meta tests, unrelated to Transform. Legacy Video credit preview also has an unrelated typography assertion.
- The source blob SHA of `video-history-cards.css`, `video-film-dossier.css`, `video-composer-single-scroll.css`, `video-compact-studio.css` and `video-restored-editorial.css` is unchanged from pre-Transform `main`.
- Cloudflare Pages deployment success does **not** independently prove custom-domain byte equality, actual owner permissions or paid-provider acceptance.

## Remaining verification
- Read-only inspect the `pvlab.studio` served HTML/CSS and signed-in owner desktop/iPhone once possible.
- Before retail rollout, verify a controlled owner-approved real Higgsfield estimate/edit, source and result quality, credit debit/reconciliation and provider refusal path.
- Do not enable the retail Transform flag merely because the design is published.
