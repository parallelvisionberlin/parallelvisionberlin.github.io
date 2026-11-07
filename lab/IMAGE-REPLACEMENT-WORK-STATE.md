# Image replacement flow

## Current implementation on 2026-11-06

- Baseline `aea3dcd040e688150de576e09f6a001e2232c1d6`. Initial audit is preserved in commit `4c4a519`.
- Approved flow stays inside Image. A Base photo, destination Character/Clothing/Object references and the typed request propose face, person, garment, full outfit or object scope.
- The existing Generate action reads Review selection for an eligible unreviewed draft. Its explicit click prepares one text selection and opens the review canvas. Brush, Erase, Undo and point selection adjust the reviewed region.
- Use selection saves the region and returns to Image. A subsequent explicit Generate action submits the selected model. Typing, applying, restoring and finalizing never submit a generation.
- Person scope uses supported Character face, hair and build while preserving the requested Base pose and outfit. Face-only source photos cannot establish physique. Scope guidance resolves saved full-appearance notes for this request.
- Brush can extend the area for a larger silhouette. Erase protects foreground hands, objects and other people. The displayed region defines every pixel allowed to change.
- Exact composition operates on decoded original pixels and exports PNG at original dimensions. Every exterior pixel, including holes and boundary-adjacent pixels, is protected. Larger changes must fit the reviewed region.
- Prompt parsing is local and conservative. Ambiguous reference destinations produce a blocking explanation. Unknown phrasing retains the ordinary Image workflow.
- SAM selection uses the existing metered account/photo quotas and only explicit selection actions. Cached review state avoids repeating unchanged selections.

## Integrated files

- `lab/image-replacement-intent.js` reads raw English/Spanish requests and grouped reference metadata.
- `lab/image-replacement.js` and `.css` implement the review, original-size mask, state snapshot, reset and background finalization.
- `lab/image-replacement-composite.js` performs strip-based lossless composition with inward-only coverage.
- `lab/lab.js` integrates the existing action, contextual pricing, prompt preview, checkout draft, History recovery, viewer and download.
- `lab/reference-guidance.js` shares request-specific scope instructions between preview and provider assembly.
- `lab-worker/image-replacement.mjs`, `worker.mjs` and `precision-edit.mjs` validate owned sources, destination association, reviewed mask, original crop and normal model submission.
- Finalization retains the raw paid output and atomically replaces the displayed output. A scoped PNG upload can finish an owned completed replacement after its last credits are spent.
- Duplicate PNG upload/finalization and partial-storage recovery reuse the paid result. Selection, original, destination and raw assets are retained for recovery.
- `.github/workflows/pv-lab-precision-edit-ui.yml` runs targeted Node and mocked browser checks.

## Verified so far

- 94 focused Node checks passed across the new parser, compositor, backend, draft restoration, existing approved UI, prompts, purchases, references and controlled repair.
- A separate latest backend/Worker run passed 121 tests, including zero-wallet finishing, ownership, duplicate submission and missing-object recovery.
- Mock browser tests cover standalone review plus the full real-Studio Review selection / Use selection / Generate / History flow at 390px and 1440px. Local Chromium launch is blocked by a Unix socket EPERM restriction. CI execution is pending.
- No paid provider inference, payment or live account mutation was used for verification.
- PR #865's earlier enhancer wording correction is published. The new replacement flow is pending commit review, browser CI and production deployment at this checkpoint.

## Compatibility and remaining checks

- Review currently accepts photos up to 5 MP and 8192 pixels per side for predictable device memory and PNG handling. Oversized photos are rejected before generation.
- Kling's single-image input cannot receive Base plus destination references. Qwen3, Krea3 and Seedream Lite require a matching source-ratio preset. Seedream, Flash and Nano can use Auto. A model change remains an explicit user choice.
- A provider returning a changed crop or a PNG exceeding 20 MiB leaves a recoverable finishing state. It never purchases another image automatically.
- Implementation is committed locally. Automatic approval review rejected the GitHub push, requiring explicit authorization for `parallelvisionberlin/parallelvisionberlin.github.io` despite broad implementation authorization. Do not retry or bypass that rejection without the requested authorization.
- Browser CI is pending because the branch cannot yet be pushed. A CUA preview attempt also failed because its browser could not reach this execution environment's localhost server.
- Complete mocked browser CI and review desktop/mobile screenshots before merge.
- Deploy the tested Worker and verify Cloudflare Pages plus exact custom-domain assets. Record the deployed commit/version and actual production behavior separately.
- Real visual likeness, fit, occlusion and edge quality require an explicitly authorized real result. Request/pixel tests establish routing and exterior fidelity only.

## 2026-11-07: contextual viewer Replace and Edit

Added the approved sidebar cards above Turn into video and retired the main/guest Image deck Retouch action. Both cards reuse the existing precision canvas inside the image viewer. Replace transfers a full-resolution reviewed mask, source and reference to the existing Image deck; it never submits a generation or changes the selected model. Edit retains existing Retouch pricing and submission. Existing sidebar actions remain in place.

54 provider-free unit tests and focused desktop/mobile viewer, selection, prompt-paste, Soul-parity and Retouch-navigation checks passed. Two broader checks fail on unchanged application source too: first-image Base width parity and the studio-layout Clerk source-regex assertion. Neither assertion was weakened; unrelated deck/background/authentication code remains untouched. See the owner work record and workbench logs for baseline comparisons. Production hosting and signed-in paid generation are not verified. No paid provider test was run.

## Release blocker audit, 2026-11-07

- Integrated current main fa097ff9b1a776e70d097cdf585df204ac803a40, preserving the owner 1K and Mood updates.
- Existing CI logs compared in run 42380043023. General Lab/video failures have the same eight failing test names on main; header, credit preview, public Studio, queue, first-image, appearance and Fashion assertions also match.
- Compact prompt Generate-font assertion was separately reproduced on unchanged current main. Shared deck Base-width and Clerk-source assertions were already reproduced on unchanged source. No failing test was disabled or weakened.
- Combined-source checks passed: 54 focused unit tests; precision editing; desktop/mobile viewer replacement flow; prompt paste; Soul deck parity; Retouch navigation. All provider-free.
- Production publication remains a separate step. Review the standard PR checks, merge through the normal endpoint, verify the Cloudflare production commit and exact custom-domain asset bytes. No real signed-in or paid-generation verification claimed.

## Published and byte-verified

- PR #915 merged as beb1f53e8fac4b42b52660a55c47241b573f7a92.
- Exact-commit Cloudflare Pages check succeeded. Production HTML references and SHA-256 bytes verified for lab/image-viewer-editor.css, lab/lab.js, lab/precision-edit.js, lab/image-viewer-editor.js.
- Production HTML/CSS layout checked at 390px and 1440px with JavaScript blocked and a synthetic image. This is not a signed-in customer test.
- Verification evidence: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42380694787
- No paid provider generation or real-account edit was run. Existing unrelated CI failures remain documented; no assertions or gates were disabled.
