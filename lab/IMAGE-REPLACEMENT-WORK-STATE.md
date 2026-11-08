# Image replacement flow

## Latest clicked-subject fix, 2026-11-08

- PR #927, reviewed source `8ac47aa373faff31d3d57459e1c9c4ae7b4df942`. Frontend and Worker version `820d06ab-06c4-46f6-b195-f0dbb5bf72c0` published and independently verified by exact bytes/health.
- Removes automatic mask inversion. Every accepted mask must contain the clicked foreground. Face/Whole person retrieve at most eight separate semantic masks in one inference, then match the actual click instead of a guessed detection ID. Wrong or unclear masks leave the prior selection intact.
- Outfit/Object retain their existing single-mask requests. Signed candidate tickets, account ownership, metered quotas, private mask storage, bounded downloads and no automatic paid retries are covered by regression tests. No database migration.
- Regression checks include left/right provider-order reversal, Whole person from face click, background rejection, alpha masks, holes, browser zoom, mobile/desktop and existing Retouch/replacement flows.
- Evidence: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42477972132
- The existing token is valid. No owner credential or Cloudflare configuration task remains. Actual model result quality and true mask-aware identity generation remain separate unresolved work. No paid provider calls during this release.

## Earlier release notes

## Latest verified backend release: 2026-11-08

- Supersedes historical credential blockers below: the existing Cloudflare token is active and has expected Worker/D1 access. No rotation or permission changes were needed. Earlier missing/unusable-token claims were incorrect.
- Reviewed source: `64b9e080df47854a6b5ee1fde1451ddc0fed3058`. All 447 existing deployment-gate tests and 58 focused tests passed.
- Code-only release at 09:01:30 UTC. Worker version `e939d968-afd1-4432-a9ed-a7a128a472b2` serves 100%. Previous rollback version: `b71347b9-3ffb-42dd-a4d9-83a542b11cea`.
- Face/person/clothing semantic selection is now deployed. Published compiled code matched the reviewed build. Existing variable values, secrets and D1/R2/AI/Images bindings were preserved. No database migrations or paid generation calls.
- The first release job failed only on its final Python health probe (HTTP 403), AFTER deployment and code/settings assertions passed. Separate read-only curl probes returned HTTP 200 and confirmed the active version. Do not redeploy because of the first red job.
- Preflight: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42465081108
- Deployment: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42465335692
- Successful verification: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42465480595
- Remaining: real signed-in Whole person selection review; true mask-aware replacement generation and actual output quality. The failed Alma result is not fixed or quality-verified.

## Historical implementation and release notes

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


## Inline viewer correction, 2026-11-07

Owner reported the published workspace did not match proposals 4 and 5. The correction keeps the editor inside the original photo pane with the existing metadata sidebar. Select/Brush/Erase are primary; strength/size/expansion are under More options. An optional reference and inline Generate replace the detour to the main Image deck. The main draft is never overwritten. Existing quote endpoints, selected model routes, quotas and compositing are reused.

Scoped quote-safety unit tests, prior precision/replacement tests, full mocked 390px/1440px viewer flow and standalone Retouch navigation passed. No paid inference or real account edit was run. This branch revision is not yet claimed live.

## Compact inline editor published

- PR #917 merged as a048cedf5f589b609d4bad7e36fde64e05859d47.
- Exact Cloudflare commit and all four custom-domain viewer asset hashes verified.
- Actual public HTML/CSS/editor modules rendered at 390px and 1440px with synthetic input, stubbed session callbacks and zero API access. Editing stays inside the photo pane; metadata remains visible; Select/Brush/Erase, optional reference and Generate replace the old workspace. More options is collapsed.
- Evidence: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42385474528
- 62 provider-free unit tests and full mocked desktop/mobile inline-generation and standalone Retouch flows passed before merge. No real signed-in paid edit was run. Existing unrelated baseline CI failures remain documented.


## Guided Replace, 2026-11-07

Approved storyboard implemented as contextual guidance, selection cursor, replacement-specific copy, four type tiles, existing saved-reference library and uploads. Character attachments retain all eight photos and notes when the selected model supports their capacity; unsupported capacity fails before downloading or charging. The main Image draft stays untouched. A local account-scoped completion flag reduces guidance only after a successful result; no private images or prompts are stored for training.

70 focused unit checks and full mocked 390px/1440px guided flow passed, together with existing selection/Retouch regressions. Location is explicitly limited: the current backend cannot accept saved location-reference swaps. The UI supports explicit background selection/inversion and text-directed editing but disables location-reference picking/upload, rather than mislabeling it as an object. No Worker deployment, paid inference or real-account edit was performed. Production publication is still separate.


## Guided Replace published, 2026-11-07

- PR #920 merged as f80296c43184de3b94fa693d66341ca5483ef028. Exact Cloudflare commit and all seven related custom-domain asset hashes verified.
- Public HTML/CSS/editor modules exercised at 390px and 1440px with synthetic media, stubbed account/library/quote callbacks and zero API access. Guidance, cursor, real local selection, saved eight-photo Character card, Location guard and return to the viewer passed.
- Character, Outfit and Object reference pickers reuse existing private Elements and compatible photo packs. Guided generation preserves the main Image draft; successful completion stores only a local account-scoped guidance flag.
- LIMITATION: saved Location reference swaps remain unsupported and disabled with an explanation. Text-directed background editing and explicit mask inversion are available; no location is disguised as an object.
- Verification: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42393293916
- 70 scoped unit checks and full mocked desktop/mobile generation flow passed before release. No real-account or paid generation was run. Existing unrelated broad-suite failures remain documented and were not relabeled as passing.


## Single-sidebar mode switch, 2026-11-07

Editing now replaces Image details in the existing right-hand sidebar rather than adding a middle panel. The photograph retains normal viewer fit, including small originals. Exit restores metadata/actions. Guided selection, saved references, provider/model and billing behavior are unchanged.

70 focused unit tests and the full mocked flow at 390px, 1440px and 1728px passed, including photo-size parity and masks. Existing Precision and standalone Retouch regression checks passed. No paid or real-account edit was run. Production verification remains separate.


## Single-sidebar published, 2026-11-07

- PR #921 merged as e363f1316b4c05552cac046246411e72ecb6424d. Exact Cloudflare deployment and all four modified custom-domain asset hashes verified.
- Edit/Replace controls replace the original right-hand Image details panel. The photo keeps normal viewer fit and metadata/actions return on exit. No middle panel.
- Public HTML/CSS/modules verified at 390px, 1440px and 1728px in both modes with synthetic photo/stubbed callbacks and all APIs blocked. This is not a real signed-in customer journey.
- 70 focused unit tests and complete mocked replacement/Precision/Retouch regressions passed before release. No paid generation was run. Existing saved Location limitation remains unchanged.
- Evidence: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42396759207


## Character replacement: Face / Whole person (2026-11-07)

- PR #922 merged as `01753ca93c4bde1f9a37906ccd59a420e5bc3394`. Cloudflare Pages deployment succeeded. The custom production domain delivered SHA-256-identical reviewed bytes for `lab.js`, `viewer-guided-replace.css`, `image-viewer-editor.js`, `precision-edit.js`, `viewer-selection-scope.js`, and `viewer-replacement-library.js` (read-only verification: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42424109922).
- Character now offers explicit Face / Whole person. Face is the initial scope. Changing scope clears the old selection/reference and invalidates price approval; new segmentation requires a fresh deliberate photo click. The actual purple mask remains the only editable pixel region. Face reference views are limited to identity data; Whole person can attach full-appearance references if the selected image model supports their capacity.
- The selected scope changes the direction, selected-area labels, and explanatory copy. Conservative mask bounding-box warnings suggest Brush or deliberate reselection; they do not pretend to detect anatomy or trigger extra metered calls. Existing Outfit/Object/Location, Image draft, original-pixel compositing, customer credits, quote expiry, idempotent submission and standalone Retouch remain unchanged.
- Scoped PR CI passed: approved Image UI contract, Precision Edit browser regression at phone/desktop, Worker image-reference integration tests including a point-plus-text request, and existing provider-free safety checks. Broader unrelated repository suites still have failures and were not weakened, bypassed or represented as passes. No real-account or paid generation was run.
- **Not yet live:** semantic guidance to SAM 3. The frontend now sends a bounded Face/person/clothing target with a deliberate point click; the reviewed Worker supports forwarding both, but the production Worker release remains separate and manual-only because Cloudflare deployment credentials are unavailable to the repository workflow. Until that Worker is deployed and checked, Magic Select remains the existing point-based selection. The saved Location reference limitation is unchanged.

## Saved Character loading and output-quality audit, 2026-11-08

- PR #926 merged at `4edc1437e032ae4de0229113d93febff86a034bc`. Cloudflare Pages exact commit succeeded, and `pvlab.studio/studio` served SHA-256-identical reviewed bytes of `lab.js`, `image-viewer-editor.js`, and `viewer-replacement-library.js`. Verification: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42459529984.
- Saved Character photos download in at most three concurrent requests, retaining every required photo in authored order with original view metadata/notes. A bounded (20 MiB, 12 entries) in-memory cache is isolated by account, cleared on account change/reset, and never persisted. Private saved references reuse their owned asset IDs.
- The viewer displays a selected Character card and numeric loading progress immediately. Cancellation, error, stale account response, quote progress, and paid-submit status are explicit. The quote adapter measures saved reference dimensions without constructing all nine redundant image previews, and batches remaining inspection to three at a time. Source file validation, image/model limits, quote expiry and idempotent submit stay enforced.
- A face-sized Whole person selection and oversized Face selection now disable Generate, requiring user refinement. This guard is based only on mask bounding-box geometry, **not anatomical understanding**. User-facing copy warns that unmasked generation can still create visible seams in overlapping people. The prompt now explicitly preserves camera, pose, other subjects, hands, limbs, contact points, tattoos and clothing outside the reviewed area.
- Focused PR tests passed: approved Image UI contract, private loading/cancellation/cache tests, Precision Edit and full 390/1440/1728 browser replacement flow, reference integration and pricing/duplicate safeguards. Existing unrelated broad CI failures were not disabled or presented as passing. No paid inference or real-account edit was performed.
- **Unresolved quality issue:** The Seedream replacement generator still receives full photo + refs + prompt, not a true inpainting mask; final composition copies generated pixels under the original selection. This guarantees untouched exterior pixels but cannot ensure correct facial alignment, occlusion or arm contact. The original/paid raw output/mask for the reported failed job were not accessible for direct comparison. Do not claim that the new instructions solve these structural defects.
- **Unresolved deployment:** The bounded SAM 3 point+semantic target Worker source is not independently verified in production; the Worker deployment workflow requires a valid Cloudflare API token, presently absent/unusable. This needs an authorized Worker release, /health check and one small cost-controlled live test. Avoid repeating paid generation with the same complex pose before a mask-aware model is evaluated.
