# PV LAB Motion Effects active work state

Updated: 2026-10-16
Scope: Discover and use three creative Motion Effects via the existing Video Studio.
Working branch: `feature/pvlab-motion-effects-20261016`.
Deployment: **not confirmed** until PR checks, merge and production checks.

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
- Run `node --test tests/lab-video-effects.test.mjs` and existing lab regression suites in CI.
- Run desktop/mobile mocked browser flow, including Gallery and real price review without paid submission.
- After validation, merge and check actual GitHub Pages / Cloudflare Pages deployment separately.
- **No paid generation or reproducibility validation has been performed.** Before marketing these as effects with output demos, run paid tests on several distinct source photos per preset, adjust prompts/model settings and replace direction stills only with actual owned generated preview loops.
- If a model/account is disabled, explain it to the customer; do not silently fall back or bypass filters.
