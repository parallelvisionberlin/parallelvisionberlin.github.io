# PV LAB Motion Effects active work state

Updated: 2026-10-16
Scope: Discover and use three creative Motion Effects via the existing Video Studio.
Release: PR #248 merged to main at `81ffd4b6547b40334f7c8225ad2f36a73f1bd0af`.
Deployment: GitHub's Cloudflare Pages check reports **Deployed successfully** for `81ffd4b`, with preview `https://1d4a93a9.pvlab-studio.pages.dev`. The custom `pvlab.studio` hostname could not be independently fetched from this environment, so domain-level smoke remains unverified.

## Product decisions
- Header gets a dedicated **Effects** entry alongside Image and Video.
- Effects opens an editorial gallery, initially three presets: Liquid Metal, Fabric Storm, Ghost Motion.
- Poster photographs are existing PV LAB-owned site assets, explicitly labeled direction studies, **not** generated effect demonstrations.
- Selecting a card opens normal Video Studio in Start frame mode with an editable effect prompt, a specific model, 5-second duration, 720p output and audio disabled.
- Liquid Metal and Fabric Storm require enabled Seedance 2.5. Ghost Motion requires enabled Seedance 1.5 Pro. If unavailable, selection fails without changing models or submitting work.
- Effect selection never triggers quote or paid generation. Video's existing live credit quote, confirmation dialog, D1 ledger, provider handling, security and queue remain untouched.
- In Video, the compact Effect card has Upload and From Gallery actions.
- Private Gallery offers up to 24 recent completed images, from at most five history pages. Thumbnails use existing private thumbnail API and session cache. Choosing one loads its original protected asset into the start-frame input.
- Extra references/end frame are cleared only after explicit confirmation. A selected original start frame is preserved.
- Custom video, handoff from Image and normal Video mode remain available. No provider safety behavior is changed.

## Changes
- `lab/video-effects.js`: fixed, auditable effect catalogue, fail-closed capability resolution and cards.
- `lab/video-effects.css`: gallery, selected-preset controls, private Gallery picker, mobile/reduced-motion styles.
- `lab/studio.html`: navigation, page, controls, Gallery dialog and cache key.
- `lab/lab.js`: navigation, apply preset, reuse existing model controls and customer video quote, private-image selection.
- `tests/lab-video-effects.test.mjs`: presets, provider capabilities, assets, fail-closed checks and contract anchors.
- No Worker modification, migration, provider keys, credit rates or billing changes.

## Verification and remaining work
- `tests/lab-video-effects.test.mjs` verifies all model/recipe and credit-review contracts and fails closed for disabled models. The `private-lab` job passed.
- `tests/lab-motion-effects-browser.mjs` plus `.github/workflows/pvlab-motion-effects.yml` verify three cards, selecting Liquid Metal, preserved video settings, private Gallery original-image handoff, explicit pricing review, no paid submission, and desktop/mobile overflow. The isolated `motion-effects` check passed on the feature commit and on merged main.
- `tests/lab-mood-nav-browser.mjs` now expects six text tools; the `masthead` test passed. Static build validation passed on the merged commit.
- Existing unrelated end-to-end workflows may report pre-existing Image, Upscale or Soul layout failures, so do not claim the whole repository CI suite is green.
- No Worker changes, database migrations, provider calls, or paid generations were performed. No actual effect-output quality or reproducibility has been verified.
- Before marketing effects with video previews, deliberately test several user-owned photographs per preset with explicitly authorized paid jobs, curate only repeatable results, and replace the illustrative static posters with verified owned generated video previews.
- If a model/account is disabled, explain it; never silently fall back to another provider or bypass safety policies.
