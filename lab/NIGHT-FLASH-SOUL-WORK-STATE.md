# Night Flash with Higgsfield Soul 2

## Owner Night Flash Photo Finish, 2026-11-07

- Owner only: Image Deck → Moods → Night Flash · Photo Finish → Apply finish. Compare or download the PNG. The point tool from #901 was replaced with an automatic mask after real owner feedback.
- #906 https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/906 uses pinned MediaPipe Vision 0.10.21 and model v1 in an opaque sandbox. The separate silhouette and face confidence masks are used for exposure and highlight protection. Static models load on demand. Photo pixels stay local.
- The background drops 0.7 EV. Face reflections lift modestly. White cloth and framing are preserved and fine grain is applied to the original dimensions.
- Both submitted private examples passed visual checks and retained 2048×1170. Chrome 390 and 1440 px using the downloaded model bytes verified apply, compare, cleanup, and that the only external requests are GETs for static files. 79 focused Node tests and the hosted Studio role check passed.
- Cloudflare production deployment e969a8ed-b687-4a5c-be82-1ed7386dbbc8 at b55bb9153a8ad6efbefe4103ff81db323ab40d33 verified on pvlab.studio. The new build has not yet been exercised in a real owner session.

## Active state, 2026-11-06

- Owner-flow PR #883: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/883
- Reviewed candidate `04413ed5aa58f6db557bb6a5c21e4b4a7fabe0d0`; merge `9919574d5d40044c04c739b7e7ed206245e5e68f`, based on `519d9fad57af01fcf836203d24f54e150a3d9455`.
- Owner Soul Generate checks the live bound quote and submits once without the second price modal. A deliberate Generate click is required. Backend `confirm:true`, budget, quote expiry, identity/Mood binding and idempotency remain.
- Customer confirmation is unchanged. `LAB_CUSTOMER_SOUL_NIGHT_FLASH_ENABLED` remains absent/false in the last verified live configuration; this frontend change does not enable it. Private Won Kar Night remains owner-only at quote and submission.
- Switching away from PV Soul with Won Kar Night opens an English compact dialog: Use PV Soul or Remove mood. Escape restores Soul. Neither choice generates; Base and authored direction remain intact.
- Compatibility help no longer adds a deck row. Shared readable Mood colors, compact prompt geometry, approved placeholders and existing #870 replacement behavior are preserved.
- Files changed: `lab/lab.js`, `lab/studio.html`, `lab/image-deck-surface.css`, `tests/lab-night-flash-soul-ui.mjs`; plus this handoff and the existing `night-flash-soul` index record. Worker and original CI gates unchanged.

## Verification and publication

- 115 focused local/CI Node cases pass: Soul API/pricing, Mood, approved Image contract, Precision Edit and replacement.
- Hosted Chrome 156 owner/customer fixtures pass at 390x844 and 1440x900: text/Base, completed/pending Soul ID, intensity/strength, bound quote, Reuse, owner one-click, rapid clicks and failed live estimate with no submission/retry.
- Compatibility popup: both options and Escape pass; preserves Base/direction, no automatic generation, no extra deck row or overflow. Phone/desktop screenshots were inspected.
- Both #870 replacement browser suites and prompt-paste layout pass. Providers, sessions and identity records are mocked. No paid generation, training, payment or real signed-in production journey was performed.
- Extended diagnostic run: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42296062207
- Legacy first-image test fails at line258: new/guest Base widths 120px vs 96px. Studio layout stops at line28, its Clerk source assertion. Both reproduce identically against unchanged main `519d9fad57af01fcf836203d24f54e150a3d9455` in that run; neither assertion was edited. The temporary comparison steps are absent from the final diff; original CI gates remain.
- Current focused run: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42296435939 (115 Node cases and all scoped Soul/replacement browser checks passed on the final candidate).
- #883 frontend LIVE_VERIFIED at 2026-11-06T22:01:47Z through production commit `9401a465bc1061f94ea4e7fa59893dedb892f4bd`, deployment `07bab2ba-ab7b-492e-b464-d45d0218306e`, successful Cloudflare check `128179600406`. Both JS/CSS scoped verifiers pass. Actual pvlab.studio/studio HTML returns 200 and contains the popup, both actions and ownerSoulFlow=20261106v1.
- Queue recovery: removed only unfinished superseded previews 91b206df (stalled clone over 30minutes), 5ede7e8d (merged #883), 6b01aab5 (merged Mood branch). Exact source commits were verified before removal. No production/completed deployment, account setting, credential, Worker or generation was changed. Production subsequently completed normally.
- Expected production SHA256: lab.js `d617259251ee204439cefddb2b76bc36f989938ce26f07bae5eb0ae970e0d266`; image-deck-surface.css `1559aa13af7c2181c6637cadfe4d6bb9801d1ac89e920f5abfd74004ef9d28e2`. HTML must contain soul-mood-dialog and ownerSoulFlow=20261106v1.

## Approved photographic behavior and assets

- Night Flash stays the existing public Mood; explicitly choose PV Soul. Direct frontal flash, deep readable blacks, organic 35mm grain, natural skin/fabric and restrained practical lights; no invented neon or native provider style UUID.
- Soul accepts authored text or one Base and an optional completed same-account Soul2 ID. Character photographs and Qwen LoRAs are not Soul IDs.
- Base identity, proportions, outfit/coverage, pose, framing and geometry stay authoritative unless authored direction or selected Soul ID changes them. Prompt guidance is not a likeness/pixel guarantee.
- Intensity, original direction, Base and Soul identity bind to the quote and persist through History/Reuse.
- Private English card name: Won Kar Night; caption PV Soul · Owner test. Selecting it chooses PV Soul but never generates. Public MOODS remains 17 entries.
- Original cover `lab/mood-previews/won-kar-night.png` exactly copies `wonkarwai1.png`, Git blob `b41cc5211b567d74d68f74cff89baa60132b94e2`; no generated/edited image. Cover is presentation only and never a provider input.
- Recipe: cinematic emerald night, warm skin, source-bound motion and organic 35mm grain; preserve Base/Soul ID and authored changes rather than copying cover people/pose/car/cigarette.

## Owner quality observation, 2026-11-07

- Night Flash at 99% kept the intended direct-flash and film look in the owner's comparison, with visible changes to faces, gaze, expression, wardrobe and framing. The matching completed request carried the Base and the preservation instruction. It carried no Soul ID and no authored changes.
- The owner also reports identity drift with Won Kar Night. Recent completed Won Kar Night requests carried a Base, no Soul ID and no authored changes. Both Base recipes already instruct Soul to preserve facial identity and scene details.
- Rechecked official Soul 2 I2I input on 2026-11-07: one image URL, one optional trained Soul ID and its strength, always-on reference prompt processing. The schema exposes no mask or source fidelity control. Mood intensity changes the text treatment, so lowering it does not lock the source.
- Candidate for review: add an optional source-preserving finish for both moods using the existing 35mm film renderer. Tune each look against the approved Soul results, applying color, tone and grain to the original geometry. Preserve the existing generative modes. Prototype and visually compare before treating this as a validated fix. No new provider generation, product change or deployment in this diagnostic.

## Provider contract and customer activation

- Official image API: https://open.higgsfield.ai/models/higgsfield-ai/soul/v2/image-to-image/api-reference
- Official text API: https://open.higgsfield.ai/models/higgsfield-ai/soul/v2/standard/api-reference
- Documented image_url, prompt, 720p/1080p, supported ratios, batch 1, seed bounds and optional completed same-account Soul ID/strength checked during #874. I2I prompt processing is always enabled; schema alone does not establish output appearance/identity retention.
- Before customer activation: record commercial/resale permission and a real account-specific live quote within existing ceilings, provider-accessible Base URL, completed same-account Soul ID when needed, and an explicitly authorized real-image quality/identity review.
- The owner's screenshot shows a returned $0.006 quote; it is user-supplied evidence, not an independent provider/account or paid quality test by this session.
- Do not run paid generation/training or enable customer Night Flash from this checkpoint. Next action is provider/account/quality validation only with the required authorization.

## Earlier releases and continuity

- #874 Night Flash: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/874
- #877 Won Kar Night: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/877
- #879 Mood palette/input guidance: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/879
- Last verified Worker publication: content-only deployment `546e7a0200594653940d85353c3d369d`, 2026-11-06T20:40:40Z, SHA256 `53244c59058136c5b3a60d96a8a8a26c893bfd18b962310671bc2f86720fc955`; bindings/compatibility unchanged; health retained imageReplacement20261106-replacement1.
- Earlier exact frontend/Worker publication hashes, 139 local initial cases and six reproducible broad-suite baseline failures: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/blob/519d9fad57af01fcf836203d24f54e150a3d9455/lab/NIGHT-FLASH-SOUL-WORK-STATE.md
- Source publication evidence is separate from real signed-in behavior and paid photographic/identity validation.
