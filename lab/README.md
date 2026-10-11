# Parallel Vision Lab

Owner-only creative workbench at `/lab/`, served by the existing GitHub Pages site. No public navigation link or new hosting subscription. The static sign-in shell is public and noindexed; all generation, history, packs and media operations require a verified Clerk owner account.

## Tools

Video: Wan 3.0 start-frame animation, optional last frame, or up to ten reference images. Wan 3.0 accepts source stills up to 20 MB each through the Lab's signed HTTPS input URLs. Duration, resolution, aspect ratio, audio and optional seed.

Image: Seedream 5.0 Pro text-to-image without an input, or reference-based editing with up to ten source images. 1K/2K, supported aspect ratios, JPEG/PNG. Uses the existing encrypted SpicyAPI connection. Endpoints and input schemas checked against the provider public catalog on 2026-09-26; availability, permitted content and price remain controlled by the provider and account. No safety-checker bypass is implemented.

Reference images have numbers, original filenames, a role and optional notes. Notes are included in the provider prompt while the original written prompt is retained. They are guidance, not a guarantee of character identity. Save named packs such as `Nina FOK / Editorial`; load them into either reference workflow. No source images or character packs are invented or prepopulated.

History stores drafts and completed results with prompt, exact settings, source IDs, roles and notes. Reuse restores these without generating. View and Download open the stored output. Use in Video loads a generated image as the start frame. Deleting an image generation preserves the image when another job or reference pack still needs it.

## Infrastructure and privacy

Existing GitHub Pages frontend, isolated `parallel-vision-lab` Cloudflare Worker, `parallel-vision-lab` D1 database and private `parallel-vision-lab-private` R2 bucket. Existing Nina database is read only for owner authorization, never migrated by the Lab. No Vercel, Supabase or Stripe required. Cloud usage is subject to the account quotas and billing; generation is charged by the provider.

API keys are encrypted with AES-GCM using the existing Cloudflare `LAB_SECRET`. Preserve that secret across all deployments. Never commit keys or put them in localStorage. Every API/media request checks Clerk JWT and database owner role; file URLs for provider inputs use short-lived signatures. Prompts and private media never enter GitHub.

## Price and failure handling

For Image (text-to-image and reference editing), clicking Generate requests a live quote and submits that exact quoted job directly, without a price-review popup. The button is the user's authorization for one paid image. Video and Upscale still require Review price followed by confirmation. The Lab does not hardcode advertised prices or silently reprice. Up to four active image generations and one active video generation per owner. Every generation still uses an exact bound quote, spending checks and idempotency; only Image skips the separate review step. A single guarded SQL INSERT reserves the per-type slot and shared daily estimated-spend cap atomically, including requests from multiple browser tabs. The cap counts failed/uncertain attempts conservatively and survives deletion from history. Also set provider-side spending limits.

Timeout or network failure during paid submission is uncertain, not a safe retry. The Lab locks further submission until the owner checks the provider and explicitly resolves it. Scheduled maintenance only polls and archives existing jobs, never generates another request.

## Deployment

Existing installation: after the image migration, apply `lab-worker/migrations/0003-concurrency.sql` once to the Lab D1 database before deploying the updated Worker. It removes the former one-job unique index; the guarded INSERT enforces the new limits. All records, private media, credentials and spending history remain unchanged.

Image migration: apply `lab-worker/migrations/0002-images.sql` once atomically to the Lab D1 database after checking the migration marker and preserving existing records. It makes source IDs nullable for text-only jobs and adds private reference packs. Fresh installs use `lab-worker/schema.sql`. Do not apply this schema to Nina.

Deploy `lab-worker/worker.mjs` with the existing LAB_DB, LAB_MEDIA, OWNER_DB and LAB_SECRET bindings. Preserve the five-minute cron and disable Worker body logging. GitHub Pages serves `lab/index.html`, `lab/lab.css` and `lab/lab.js`.

## Verification

`node --test tests/lab-worker.test.mjs` covers owner authorization, encrypted keys, price confirmation, duplicate prevention, spending limits, interruption recovery, image generation, reference packs, media reuse and lossless migration with a mocked provider. Tests do not buy generations. Browser tests cover draft/reuse, reference roles, packs, price confirmation, image-to-video handoff, logout clearing and mobile overflow using synthetic media and mocked authentication/API. Live paid output quality is separate from these tests.


## Image upscaler and working copies (2026-09-27)

Upscale uses `spicyapi/image-upscaler-v1/upscale`, not Topaz. It has no content prompt or invented realism controls. Select 2K/4K/8K (about 4/17/67 megapixels) and JPEG/PNG/WebP. It shares the four-image concurrency limit and the existing live quote, confirmed payment, private result archive, download and reuse flow. The original source remains separate from the output. A smaller size tier warns before submission.

SpicyAPI uploads are limited to 10 MiB. The Lab still accepts original uploads up to its existing 20 MiB limit. Before an oversized image is sent to the image provider, the browser asks permission to prepare a compressed WebP working copy at the same dimensions, retaining transparency. Fine detail and metadata may change from compression. The original is retained in R2 and History; transfer asset IDs and original/copy byte sizes are stored in the job. Reuse restores the original and settings. Declining or failing preparation never creates a paid task. No provider limits or safety systems are bypassed. A paid quote is requested only after all input files are prepared.

Upscale output archiving supports up to 256 MiB using bounded multipart uploads; the private archive remains capped at 2 GiB. No schema migration, added subscription, credential change or new storage bucket is required.

Primary schema references checked on 2026-09-27: https://spicyapi.ai/models/image-upscaler-v1 and https://docs.spicyapi.ai/docs/sdk . Live account quotes remain the pricing authority. Quality was not verified by a paid generation during installation.


## Sign-in renewal (2026-09-27)

The browser renews Clerk tokens near expiry and retries a known Lab authentication 401 at most once with a fresh token. These 401 responses occur before the Worker handles a private route or submits a paid task. Request bodies and quote identifiers are retained unchanged. Network errors, timeouts, 403, provider errors and 5xx responses are never automatically resubmitted. Concurrent requests share token renewal; sign-out or a session change cancels old requests. No JWT lifetime, signature, origin or owner-role checks are weakened. This is a frontend-only change, without reloading or clearing the editor during token renewal.


## One-click Image (2026-09-27)

Image Generate starts one paid job per click; it does not start a batch. The editor is held busy through quote and submission, and the actual returned quote ID is reused unchanged. Quote failure or expiry creates no paid task. No automatic repricing, loop or additional generation is introduced. The existing session-renewal helper, four-image capacity, daily budget, reference working-copy permission, History, Reuse and downloads remain unchanged. Video and Upscale retain the price dialog. Backend, provider credentials and stored data are unchanged.


## Reference preparation and result layout (2026-09-27)

The reference list is a bounded scrolling panel, independent of the fixed-height, sticky desktop result panel. Image mode never automatically places its first reference in the result canvas. The canvas stays empty until an actual result is opened or completed. Clicking an input thumbnail opens a separately labelled input-preview dialog. Adding, removing or reordering references does not replace an already displayed Image result.

Input display previews have a longest edge of at most 1,280 pixels; sidebar thumbnails at most 320 pixels. Originals retain their bytes, dimensions, file names, roles and order for uploads, History and Reuse. Display copies are never sent as model inputs. The existing explicit permission step for a provider working copy above 10 MiB remains unchanged.

Decoding, thumbnail preparation and approved large-file compression run sequentially in a browser-local Web Worker where supported, with a fallback for other browsers. Progress is visible per input. Decoded bitmaps/canvases are released after each task; object URLs and pending work are cleared on sign-out or clearing the editor. No provider, price, server-side policy, account or database changes.

New Image and Upscale forms default to PNG. JPEG remains available. Reuse restores the previously saved output format, including JPEG; existing results are never re-encoded.


## Billing errors (2026-09-27)

Provider errors 40201 (available provider balance) and 40202 (key, team or platform spending cap) now remain distinct in the Lab. The provider message is retained with signed URLs and credentials redacted. Neither message is confused with the Lab's separate daily budget. No retry, generation, recharge, limit change, key change, schema migration or history modification is added. Existing failed messages cannot retroactively recover a provider code that the previous implementation discarded.


## One-click Image Upscale (2026-09-27)

The Upscale button authorizes one paid upscale without the price-review modal. Without a checked price, the frontend obtains a fresh, bound provider quote and submits its exact ID once through the existing session-safe helper. No batch, automatic repricing, paid retry, or backend change is introduced. Quote expiry, wrong-mode responses, account budgets, capacity and interrupted-request checks still stop submission. Compression permission and warnings about choosing a tier below the source resolution remain. Video keeps its separate price confirmation; Image generation is unchanged. Reuse restores originals and settings without running a task.

As of 2026-10-02, Upscale identifies **Image Upscaler v1 · SpicyAPI** and shows the provider's published **$0.012 per image**, the same across 2K/4K/8K tiers and PNG/JPEG/WebP formats. The source ratio is retained; tiers are pixel budgets of approximately 4/17/67 MP, not fixed dimensions. Source: https://spicyapi.ai/models/image-upscaler-v1 (checked 2026-10-02). This display is a published price, not an account-specific quote.

The optional **Check live price** button uploads/prepares the selected image and requests `/api/quotes` only. It displays the estimate, a distinct maximum when returned, and expiry without submitting a generation. Upscale reuses that exact quote only while the original image, size, format and signed-in session still match. Changing those inputs or allowing the quote to expire clears its display and requires another explicit price check; it never silently replaces a checked price and submits a different one. Clearing the editor resets this optional flow. Ordinary one-click Upscale remains available when no price check has been started. The result's reported charge remains available in History.

Changed files: lab/index.html, lab/lab.js, lab/README.md, tests/lab-image-oneclick-ui.mjs and tests/lab-upscale-ui.mjs. Tests use synthetic media and mocked API responses only.


## Standard Seedance 2.5 (2026-09-27)

Video now offers Wan 3.0 and Seedance 2.5 Standard. Seedance supports text-to-video, first/last frames and reference-to-video with up to 30 images, 10 videos and 10 audio clips. Each audio/video reference is 2 to 30 seconds, with a separate 30-second combined limit for each media type. Workspace file limits are 20 MiB per video and 15 MiB per audio reference. Standard Seedance follows the first-frame aspect ratio. Other modes expose the supported ratios including 21:9. Output choices are 480p, 720p and 1080p, with 4 to 30 whole seconds. Selecting Seedance starts at 5 seconds and 720p; Reuse restores the saved values.

This is the standard model, not a Spicy endpoint or filter bypass. The provider's policies and model refusals remain intact. No prompt transformation to evade safety systems, automatic model fallback, or paid testing is added. The existing bound live quote and separate video confirmation remain mandatory. Reference videos may increase the quoted maximum charge.

Existing encrypted credentials, owner verification, daily budgets, spending ledger, three-video capacity, Image batches, one-click image Upscale and private R2 archive are preserved. History and Reuse retain the exact selected model, original media, reference order, roles, notes and settings. Named packs store images only. No database migration, new subscription or payment integration is required.

Deploy both worker.mjs and seedance.mjs as Worker modules, retaining the existing bindings and secret. Deploy the backend before the frontend: older backend configurations do not enable the new selector. Input reference media use owner-only upload/read endpoints and the same short-lived signed URLs supplied to the provider. Browser and backend tests use synthetic images, video, audio and mocked provider responses; no real paid generations are used.


## PV Soul character training (2026-09-29)

Image mode includes PV Soul, a private reusable-character workflow built on hosted APIs rather than a managed GPU server. The owner can train a character from 20–80 consented adult identity photos. The browser creates compact WebP working copies and a ZIP locally, the private archive stores that ZIP temporarily, and the Worker submits one Qwen Image 2512 LoRA training job to FAL. The FAL API key is a Cloudflare Worker secret named `FAL_KEY`; it is never returned to the browser or committed to GitHub.

Training uses `fal-ai/qwen-image-2512-trainer` with 1,000 steps and a per-character trigger caption. D1 stores only the training state and character metadata. Completed LoRA weights are copied into private R2 when the provider result is available; temporary datasets are removed after successful or definite failed training and stale unused datasets are pruned by maintenance. An uncertain FAL submission must be checked in the FAL dashboard and explicitly resolved before another character training can start.

PV Soul image generation still uses the existing encrypted SpicyAPI connection and the Lab's live quote, spending, concurrency, idempotency, History and private-result archive. v0.1 uses the Qwen Image 2512 text-to-image LoRA endpoint, which matches the base used by the FAL Qwen Image 2512 trainer. Reference-conditioned PV Soul generation is intentionally disabled because the available Qwen Image Edit endpoint uses a different edit base and a matching edit-model identity trainer has not been verified. Seedream and Nano Banana remain available for reference editing. Identity strength is saved with the generation settings.

Training inputs must comply with FAL's rules. The UI requires confirmation that depicted people are adults and that the owner has the rights and consent to train the identity. No safety-checker bypass is implemented.

Deployment requires the additive `lab-worker/migrations/0004-pv-soul.sql` migration before the updated Worker. The production deployment workflow applies this idempotent migration automatically, then deploys the Worker. Existing Lab records, encrypted SpicyAPI credentials, Nina authorization data and non-Soul media are unchanged.

## PV Soul / Reinterpret

Inside Image > PV Soul, Text keeps the existing Qwen Image 2512 identity. Reinterpret accepts one base photograph, an optional direction, eight photographic presets, image fidelity, identity strength, composition/styling guidance, source aspect ratio and PNG/JPEG output. History keeps the original source and all settings for Reuse; completed results retain Repair, Upscale, Use in Video and Download.

### Compatibility and activation

The current Qwen Image 2512 Text weights cannot be used on the hosted Qwen Edit 2511 route. Reinterpret therefore requires a **separate Z-Image Turbo identity** linked to the original Soul. Existing Text weights are never converted, relabelled or replaced. A missing, failed or unready linked identity blocks generation.

In Reinterpret, choose **Prepare Reinterpret identity**, select 20–80 suitable identity photos and explicitly approve the separate training. Previous training ZIPs were temporary and are not recovered from unrelated assets. The published FAL price checked on 2026-10-01 is **$2.26 for 1,000 steps**. The Lab reserves that estimate against the daily spending limit before submitting once. Ambiguous submissions require an explicit owner check of FAL before any retry. Deleting a training record does not erase its spending reservation.

Verified provider routes and schemas:

- Training: [`fal-ai/z-image-trainer`](https://fal.ai/models/fal-ai/z-image-trainer/api), `image_data_url`, `steps:1000`, `learning_rate:0.0001`, `default_caption`, `training_type:content`.
- Reinterpret: [`alibaba/z-image-turbo-lora/edit`](https://spicyapi.ai/ru/models/z-image-turbo-lora), `prompt`, one `image_url`, `resolution` (1k / 1.5k), `strength`, `loras[{path,scale}]`, `output_format`. Uses the existing SpicyAPI live quote and idempotent submission flow.
- [Qwen editing compatibility](https://spicyapi.ai/blog/qwen-image-2512-lora-edit-compatibility).

The backend owns preset directions and validates every control. Provider `strength = 1 - imageFidelity`; identity strength sets only the linked adapter scale. Composition/styling choices are prompt guidance. High fidelity may also retain the source person's face. Identity replacement quality, layout preservation and the best strength need visual evaluation with the newly trained identity. This release has mock coverage, **not a paid Nina Reinterpret quality benchmark**. No new identity training or generation was purchased during implementation.

### Input lifetime and deployment

Reinterpret stages the base image through the existing SpicyAPI file-upload mechanism. Weight links remain signed for 24 hours. Queued FAL pose, identity, source and mask links now last 24 hours and support unauthenticated signed HEAD requests. This reduces the former 30-minute queue expiry risk; jobs delayed beyond 24 hours can still fail. A FAL completed-request result returning HTTP 422 becomes failed without resubmission or removal of its spend reservation. The older uncertain Gemini job is untouched.

Apply `lab-worker/migrations/0005-soul-reinterpret.sql` to LAB_DB only, then upload all Worker modules while retaining every secret, D1 and R2 binding. Verify `/health` before merging the UI. Worker auto-deploy stays manual. The migration is additive and idempotent.

Verification: `node --test tests/lab*.test.mjs`, the new mock-only `tests/lab-soul-reinterpret-ui.mjs`, the four existing Lab browser suites, JavaScript syntax checks, and `npm run build`. Browser suites use `PV_PLAYWRIGHT_MODULE` and need Playwright Chromium. They make no real provider submissions.
## Reference guidance, 2026-10-02

Seedream 5 Pro uses the existing SpicyAPI connection. Its role menu is compiled into the provider prompt; it is not a set of native provider parameters. Nano Banana Pro uses the same role compiler on its separate Google route. The compiler is shared between the browser preview and Worker.

1. Choose **Base image** on the photograph to edit. This selection places it first and visibly renumbers the list. Only one base is allowed. The first reference controls Seedream's automatic aspect ratio.
2. Assign only the property each other image contributes: Identity, Pose only, Composition, Detail, Clothing, Object, Environment, Style or Lighting.
3. Detail reveals Hands, Feet, Hair, Face detail and Skin texture. Clothing and Object reveal their own choices. Optional notes describe small refinements.
4. With a base and another assigned role, Image direction becomes optional. Otherwise write the desired edit. Expand **What will be sent** to inspect the exact compiled prompt and its 5,000-character budget.

Selecting a role does not guarantee a pixel-identical base or exact identity. SpicyAPI's Seedream edit schema has no mask or region-coordinate field. The existing **Repair Region** action is a separate FAL inpainting operation; this change does not present it as a Seedream feature or add layer decomposition.

Reference metadata survives saved packs and History Reuse. Duplicate asset IDs are rejected before a provider quote so subsequent image numbers cannot shift. Reference order is unchanged during submission. Switching the Base selection is the only automatic move, with an explicit on-screen notice.

The same release fixes the SpicyAPI concurrency query: active or uncertain FAL jobs no longer occupy Seedream/Upscale slots or trigger a false SpicyAPI interruption. Existing unresolved records and budget reservations remain intact.

Verified against https://spicyapi.ai/models/seedream-5-0-pro/edit and https://spicyapi.ai/models/seedream-5-0-pro/edit/api. Regression checks use synthetic inputs and mocked paid endpoints.

## Upscale methods and FAL recovery (2026-10-02)

Upscale offers three methods through the existing provider connections:

| Method | Provider/model | Price shown |
| --- | --- | --- |
| Economical | SpicyAPI Image Upscaler v1 | $0.012/image, all size tiers and formats |
| Preserve | FAL Topaz Precision, Standard V2 or High Fidelity V3 | $0.08 per started 24 output megapixels |
| Restore | FAL Topaz Wonder 3.5 | $0.08 per started 8 output megapixels |

Topaz supports 2×/4× enlargement and PNG/JPEG here. The server reads source dimensions from the stored image, computes target dimensions and the published-price estimate, and binds the saved input and settings to that estimate. FAL pricing is explicitly an estimate, not a provider-guaranteed maximum. A free price check is required before a Topaz submission; changing the image, model, scale, format or session invalidates it. The existing SpicyAPI one-click and optional bound-price-check flow remains. Topaz uses the existing backend FAL key; no separate Topaz account or desktop licence is needed for this integration. Face enhancement is disabled to avoid an unsolicited face reconstruction. Wonder is a separate, explicit restoration choice because it can invent detail.

Content labels describe the provider policy, not a promise of acceptance: SpicyAPI adds no platform filter to this upscaler but its model may still refuse; FAL prohibits sexually explicit content. No safety-checker bypass or automatic provider fallback is added. SeedVR2 is not enabled because its public image price does not establish whether billing uses input or output megapixels or how units are rounded.

FAL queue polling and result retrieval now use the owning app route, matching the official JavaScript SDK. Submission retains the full model route. This fixes lookups such as `ideogram/v4.5/edit/requests/...`, which must instead use `ideogram/v4.5/requests/...`. HTTP status is retained in diagnostics, and lookup/authentication errors do not prove that a submitted generation failed. Failed records with an existing provider ID can retrieve the original result through **Recover FAL output**, without a new inference request.

For eligible interrupted Soul Pro requests without a provider ID, **Check FAL status** searches the provider's request history. It requires a unique match of the complete original input and compatible submission time before associating a request ID and checking its result. Missing payloads, ambiguous matches, unavailable history or access errors leave the request unresolved. It never generates, retries inference, clears an unknown charge or guesses from time alone.

Official sources, checked 2 October 2026:
- https://fal.ai/models/topaz/upscale/image/precision
- https://fal.ai/models/topaz/upscale/image/generative
- https://fal.ai/legal/acceptable-use-policy
- https://spicyapi.ai/models/image-upscaler-v1
- https://github.com/fal-ai/fal-js/blob/012ef177b996b9c78ac0d5baf4c430b9a249028b/libs/client/src/queue.ts
- https://fal.ai/docs/platform-apis/v1/models/requests/by-endpoint

## Moods V1

Ten editorial mood presets are available in Image Studio, with intensity and original-prompt preservation. Only Seedream 5 Pro and Nano Banana Pro support moods in V1. Selecting a mood never starts generation; the existing paid workflow remains unchanged. Job settings retain the selected mood for History and Reuse. Moods are AI generation styling, not pixel-based image filters.

### Clean image details (2026-10-10)
The Image result viewer prominently labels the chosen Mood and intensity. It shows and copies only the original user-authored direction, not the compiled provider prompt. If the user selected a Mood without writing a direction, the prompt text and Copy control are hidden, while source images remain visible. Gallery history captions likewise omit internally injected mood instructions. Full settings are still retained in private generation history for Reuse. This change is presentation-only, not a secrecy boundary for browser API consumers.

### Mood calibration and model hover labels (2026-10-10)
90s Cinema now uses bold glossy photochemical theater lighting and saturated late-1990s film color at high intensity. Kodak Gold now makes 35mm negative film grain, color, print contrast and halation visibly strong even at medium strength. The stable `sumi-ink` ID is now presented as Japanese Sumi-e, with canonical physical ink-wash brushwork on washi paper and the reference image supplied during design review. Hong Kong Nights keeps the already proven generation recipe while replacing its preview with a more appropriate street scene. Gallery hover metadata now displays the generating image model. No paid generations are initiated by these changes and historical results are untouched.

### Compact Upscaler working deck (2026-10-10)
The existing Upscaler controls now align in a single desktop row: method, output size (Spicy resolution or Topaz enlargement), output format and Upscale. Mobile wraps to two columns. The optional model info, live quote check and Save draft stay under the collapsed **More options** disclosure, retaining their original IDs, handlers and provider safeguards. Expired or invalidated quotes that require review automatically expand the disclosure. The original large preview, upload, queue and generated results stay unchanged, with duplicate file-drop rows hidden in Upscaler mode only. No additional paid tasks or backend changes.

### Upscaler Workdeck V3: visual polish (2026-10-10)
The empty Upscaler preview is intentionally shorter than a loaded-image preview so the first row of Upscaled images appears higher on a normal desktop viewport. The centered stage, original upload area, source-ratio summary and quote safeguards remain. Controls have tighter vertical spacing, consistent 39px input heights and improved focus treatments. The collapsed More options disclosure is right aligned with an explicit chevron and remains keyboard accessible. Scope remains Upscaler-only; no media/model/price/credit changes. The mocked browser test verifies empty/filled canvas height behavior, desktop gallery visibility, dropdown alignment, focusable More options, mobile height and the original advanced price checks.

### Upscaler advanced setup and gallery loading (2026-10-10)
The Upscaler hides its duplicate technical footer when empty or showing a source; a finished preview still offers Download. Its provider, current output tier and source ratio are displayed dynamically within More options. The archived Upscaled images gallery keeps its existing owner-scoped asset loading and cache. Cards loading their real thumbnails show an animated skeleton instead of inert dark tiles; loaded images stop animating and failures still show Preview unavailable. A genuine zero-results response says No upscaled images yet, without fictitious skeleton records. Select/Refresh remain functional and closer together. The original large preview dimensions, working deck and generation/credit logic remain unchanged.


## Retouch V2 / Precision Edit (2026-10-11)

**Retouch** is a dedicated PV Lab studio destination alongside Image, Video, Upscaler, Assets and Fashion, at `/lab/studio.html?tool=retouch`. The editor is no longer embedded in the Image gallery. Image retains its original deck, uploaded references, roles, mood, prompt and settings while Retouch is open. The Image deck shortcut hands the current Base image and existing uploaded source ID to Retouch, without uploading again or requesting paid generation; image details also has a Retouch action. Switching between sections does not discard the Retouch working mask or source. Native browser Back and the visible Back to Image button return to Image without resetting its workspace. Direct Retouch URLs show a standalone photograph drop zone.

The underlying tool remains **Precision Edit** using SAM 3 point segmentation, local mask tools and FLUX inpainting. Customer accounts can enter the Retouch workspace, add a photograph and try local brush tools. Magic Select and paid generation remain disabled for customer accounts until credit authorization and real-provider billing are verified. Owner accounts retain the complete Precision Edit workflow.

- **Progressive editing and visual discovery:** the Original panel makes upload the first action, while the empty Result panel shows a CSS-animated *selection-only* walkthrough using an existing Parallel Vision image. It is explicitly labeled illustrative and is **not** represented as a genuine AI-generated before/after result. The animation stops as soon as any photograph is loaded. The panels retain their positions and the navigation remains static.
- **Try with a sample:** a separate button loads the locally hosted `assets/fashion-hero.png` with a small **browser-painted starter selection**, a liquid-chrome example prompt, and editable mask controls. This is a free preview workflow: no segmentation, quote, upload or generation is triggered merely by selecting the sample. It is deliberately labeled a local starter mask that may need brush refinement. Customers still cannot authorize paid inference.
- **Creative suggestions:** Change outfit, Chrome material, Remove object and Skin finish fill useful editable prompts only after a photo is present, without charging or altering the selection. The selected prompt goes through the same normal price review before inference.
- **Zoom and pan:** Fit, zoom in/out, wheel zoom anchored to the pointer, a working-preview 100% button, and Pan/Space-drag. The overlay and source image share one transformed stage; brush size accounts for zoom. The 100% button refers to the max-2048px working preview, not a full-native-pixel view of 8K input.
- **Magic Select consent:** SAM 3 click selections are approximately **$0.005 each** at the currently published rate, *not* a bound live price. The first clicked selection requires explicit approval for up to five metered clicks in the current session. Neither entering Retouch nor opening a photograph sends a paid request. Authorizations reset at logout.
- **Free local refinement:** Add, Erase, Expand, Undo, and Clear modify only the working mask. Changing the selected area invalidates any pending paid quote.
- **Signed FLUX quote:** FLUX Inpainting uses `fal-ai/flux-general/inpainting` with the existing private source URL, daily budget, active FAL capacity and unique quote-ID protections. Review Price performs no inference. The provider estimate and the optional export fallback approval are bound to the same signed quote ticket; expired or changed submissions are rejected.
- **Large photograph protection:** originals over **5 million pixels** require explicit opt-in for a high-quality JPEG backup before a paid quote. Finalization first produces a lossless full-resolution PNG preserving decoded original pixels outside the selection. If the PNG exceeds **20 MiB** and JPEG fallback was approved, the client exports a JPEG within the private media size limit, clearly labels JPG and explains that a JPEG recompresses pixels outside the mask. The Worker rejects unapproved JPEG finalization. A particularly extreme image can still exceed the limit; raw paid results remain in History, with no automatic second inference. Composite memory is reduced by working on the selected region rather than three full-size patch canvases.
- **Non-blocking Queue:** authorization and submission are separated. Once a job ID is confirmed, the Retouch deck is re-enabled immediately, while background status polling and original-preserving finalization continue. Earlier jobs remain in History and cannot overwrite the newest active editing preview. Failed or uncertain jobs direct the user to Queue and are not retried automatically.
- **Result iteration:** Before/After, Download, and **Continue editing** become available only when an edited output is ready. Continue editing reuses the result's saved asset ID as the new Original and clears the mask, without a duplicate upload. The previous generation remains in History. Returning to Image retains its model, references and prompt. A fresh browser reload still requires locally held files to be selected again; server-persisted jobs remain in History.

**Paid Retouch operations are currently owner-only.** Customer accounts may preview the editor and local tools, but cannot submit Magic Select or FLUX inference pending real-account cost verification and controlled rollout. There is no new secret or database migration. It requires the existing FAL_KEY, LAB_SECRET, D1 and private R2 bindings. No provider keys or user photographs are committed to GitHub.

Verification:
- node --test tests/lab-precision-edit.test.mjs tests/lab-worker.test.mjs
- node tests/lab-precision-edit-ui.mjs with PV_PLAYWRIGHT_MODULE pointing to an installed Playwright Chromium module.
- The .github/workflows/pv-lab-precision-edit-ui.yml workflow runs a synthetic browser test covering pixel preservation, mask editing, price confirmation, responsive layout and status handling. No paid inference is performed by tests.
- Real FAL SAM 3 mask accuracy, prompt response, color edges and billable inference cost still need controlled verification before enabling commercial accounts.



### 80s Film V2, cinematic 35mm fashion (2026-10-11)
The curated `80s-film` Mood now targets expressive mid-1980s theatrical **movie scenes**, not a warm portrait preset. Its image-model instructions combine fine-to-medium organic 35mm motion-picture grain, bold photochemical red/amber/cyan color separation, glowing and lightly burned practical highlights, real volumetric haze that scatters the source lighting, plausible moving air in hair/fabric, and refined European high-fashion art direction. It does not force retro costumes, wigs, VHS overlays, film sprocket borders, a particular film scene, or a new aspect ratio.

Five instruction tiers: **1-34%** subtle analog; **35-69%** cinematic color and light; **70-89%** expressive movie still; **90-99%** immersive cinematic frame; **exactly 100%** full high-fashion film-production atmosphere and movement. For any Base reference the model is instructed to preserve subject identity, anatomy, pose, camera, scene geometry and original clothes unless the user explicitly requests changes. With no Base it may invent appropriate high-fashion wardrobe. This is creative model guidance and not a physically controllable filter; visual fidelity requires testing with real generations. Compact instructions apply from two references onward, to long user prompts, and when adding a personal Mood direction, to help preserve the provider's 5,000-character prompt budget. The preset ID, thumbnail, prices, models, Worker metadata, queue and billing are unchanged. The Mood Creator and Image Studio share the updated versioned module. Existing stored results are not re-rendered.

### Dreamcore V5 nature, portrait and architecture routes (2026-10-11)
One Dreamcore mood remains public. The image model is instructed to select ORGANIC when the source includes dominant water, beach, foam, rocks or natural landscape even with people. This route prioritizes pearlescent existing matter, liquid shine, photographic wet skin and physically scattered fog. PORTRAIT makes restrained but striking opalescent skin and existing-garment material changes while preserving identity and pose. ARCHITECTURE keeps the original walls, windows, furniture, building geometry and setting recognizable even at 100%, applying source-led liminal light, existing reflections and subdued haze instead of invented architecture. Person-preservation directions apply on every route. The existing creative-intensity slider is not a literal pixel filter. Routing is model instruction from the source image, not a separate classifier, and quality is not guaranteed. From three reference photos onward, a compact art direction protects the 5,000-character prompt budget. Mood thumbnails, other preset prompts, payment, provider integrations, page design and queue remain unchanged.

### Dreamcore V4, source-aware glossy dream world (2026-10-11)
Dreamcore prompts the multimodal image-generation model to visually choose PERSON or SCENE from the supplied Base image or written request. There is no additional paid classifier or frontend vision request. The person route preserves identity, anatomy, pose, camera and wardrobe coverage while allowing physically integrated wet gloss, iridescent or soft metallic finish to visible skin and fabric. The scene route transforms its original landscape or architecture with one cohesive liminal event. Fog is modeled as physical depth, light scattering, occlusion and reflection rather than a pasted overlay.
The existing intensity slider selects five creative instruction tiers (1-34, 35-69, 70-89, 90-99, exactly 100), embedding its numeric value in the prompt. It is not literal pixel opacity or model-native denoising strength. A compact variant keeps multi-photo decks within the current 5,000-character budget where possible; extensive custom reference notes can still exceed that existing limit and block generation before paid submission. No changes to other moods, fees, provider logic or page layout. Visual results need real image tests.

### Dreamcore V3, immersive photographic dream logic (2026-10-11)
Dreamcore deliberately differs from a simple pastel filter. Its art direction combines familiar, nostalgic liminal spaces with a single coherent surreal spatial contradiction selected to suit the source photograph. Photographic imperfections, natural skin and fabric texture, restrained scene-dependent powder colors, imperfect analog exposure, real occlusion and consistent environmental light prevent glossy AI-resort results. The first image remains the Base for person, pose, lens and recognizable clothing while high intensity can substantially transform the background. The mood prompt honors other reference roles.
The intensity instructions are distinct: 1-34 subtle film atmosphere; 35-69 visible haze plus one small liminal cue; 70-89 significant background transformation; 90-99 a clearly impossible world; and exactly 100 an unmistakable world-scale change. Only the Dreamcore preset and its base-reference exception were updated; Hong Kong Nights and other mood definitions, UI layout, provider pricing and paid generation flow are untouched. Changes to prompts affect new generations; existing stored results are not re-rendered.

### Moods gallery and controls (2026-10-10)
The selector now shows **ten** moods in a consistent five-by-two desktop grid. Dreamcore replaces Japanese Sumi-e in the visible presets. The original `sumi-ink` definition and Worker validation remain available for previously saved generations and History/Reuse. Dreamcore is included in the Worker's accepted mood metadata. The footer uses two aligned rows: selected mood with a small About link above a wide intensity slider and compact Use mood control. Selecting a thumbnail keeps the selector open so the intensity can be adjusted before applying; applying does not start generation or incur costs.

### Responsive floating Moods panel (2026-10-11)
The Moods popup still floats above the existing Image composer, but uses the composer's actual position to calculate maximum height and a minimum 28px desktop or 14px mobile top inset. The panel only overlaps the dimmed composer when the viewport is too short to accommodate the header and actions above it. The popup's title, category bar and action footer remain stable in normal viewports, while the mood image grid scrolls internally. On very short viewports the whole panel can scroll rather than clipping its controls. A dark translucent, clickable cover quiets the image composer while Moods is open and blocks accidental changes; clicking outside the popup, its Close button or Escape closes it. Responsive recalculation follows composer resizes and mobile visual-viewport changes; body/gallery page scroll remains unaffected. Moods, pricing, image models and the creation deck design are otherwise unchanged.

### Centered Moods deck and scroll-only Sumi-e (2026-10-10)
The gallery offers eleven moods: ten full cards in the initial five-by-two desktop grid, with Japanese Sumi-e eleventh in an internal scroll region. Card geometry sets the viewport to two full rows, not a cut-off third card. The overlay is centered over the floating Image composer and the thumbnails are slightly larger. The empty state says only Select a mood; Selected mood appears after choice. About moods sits below Use mood and Clear selection. Model prompts, intensity and paid generation behavior are unchanged.

### Seedream reference megapixel preflight (2026-10-10)
SpicyAPI's Seedream edit endpoint rejects input images above 36 megapixels. Some completed PV Lab outputs (such as 7728 × 5152) have about 39.8 MP despite being smaller than 10 MiB as files. Source images reintroduced from History or the gallery retain their original IDs, but before a paid Seedream quote PV Lab now prepares a private WebP working copy at approximately 34 MP, preserving aspect ratio and the untouched original. The server verifies staged Seedream input dimensions before requesting the provider quote. File-size-only optimizations and all other image engines are unchanged. No automatic paid retries are made for earlier failed jobs.

### Local Seedream background reference preparation (2026-10-11)
On Image Studio, reference photos exceeding Seedream's 36 MP input limit or SpicyAPI's 10 MiB transfer limit are now pre-encoded locally when their previews are added to the working deck. Only the actual Seedream model triggers this path. Background preparation requires a functioning Web Worker and OffscreenCanvas; unsupported browsers defer conversion to the deliberate Generate action rather than freezing during reference addition. In-flight conversions are shared by Generate and customer quote flows; results are cached by File object identity for 15 minutes. No background network uploads, vendor quotes, payment reservations, or automatic generation occur. Original references and saved History assets remain unchanged. Clearing the editor invalidates the cache. A Worker startup failure may fall back to the established generate-time conversion path.

### Responsive Seedream preparation and local Queue handoff (2026-10-11)
For owner Seedream 5 Pro single-image requests, Generate creates an immediate local History preparation card, freezes all inputs and pricing settings, and releases the Image Studio composer while references are uploaded, transferred to SpicyAPI, priced and submitted. The local card is never represented as an accepted provider job. The user can change the prompt or references and submit another request immediately, subject to the same server-enforced provider concurrency and spending limits. Exact repeat clicks are blocked until the first request is acknowledged; in-flight local preparations reserve a concurrency slot. A confirmed job replaces its local card and appears in the real Queue. Never automatically retry an uncertain provider response. Customer credit-based generations, batches, Soul and other models retain their existing safeguards. When a detached request is preparing, clearing the editor leaves its existing image worker alive so the frozen snapshot can complete; logging out still aborts local work. No speculative vendor submissions or charges.

### My Moods private inspiration boards (2026-10-11)
A signed-in user can create a Mood from a completed image, save up to 12 generated images or private uploaded inspiration images, name the board, edit its style direction and optional curated Mood starting point, and reuse it under My Moods in the existing Mood gallery. Boards are owner-scoped D1 records; media remains in authenticated R2. Board images are visual inspiration only, not automatically sent as provider references or trained as an AI model. Creating or editing a board never starts paid generation. A selected board compiles the user's prompt with its saved creative instructions and intensity and stores a custom Mood label in generation History. On sign-out, thumbnail object URLs are revoked. Removing a board preserves original images. D1 migration 0009 runs in the GitHub Worker deployment workflow before the new private routes activate.

### Mood Creator independent creative studio (2026-10-11)
The PV Lab home now includes its own editorial Mood Creator feature, linked to /lab/mood-creator.html. Its independent workspace offers From an Image and From an Idea, a private 12-image reorderable inspiration board, a named editable style recipe, a curated Mood starting point and adjustable intensity. The My Moods gallery reopens saved boards, their photographs, palette and material/film qualities. Small optimized inspiration copies are saved privately to the existing R2 bucket. Up to 60 lightweight copies per account, up to 30 MB total, no active credit balance required for this separate Moodboard route. Full originals remain on the user's device. Managing boards never submits a priced generation.
Only an explicit Develop the aesthetic click sends up to 12 small compressed Moodboard previews and/or the written creative idea to Google's Gemini 2.5 Flash service in ONE authenticated analysis request. The focus photograph anchors direction but every included image is considered; the resulting style recipe combines light, color, film texture and material treatments across the collection rather than selecting one image. Images are 600px-or-smaller previews, at most 145 KB each, with server limits of 12 photos, 160 KB per image and 1.85 MB total decoded image data. Legacy single-photo clients remain supported. This is consented remote image analysis, not model training. Authenticated requests validate MIME and image size, no public URLs are created, and limits remain six analyses per account and at most 100 platform analyses per UTC day. The suggestion can be edited or rejected; manual written directions still work without AI or Gemini credentials.
Use in Image saves the board, then opens /lab/studio.html?tool=image&moodboard=ID, selects the saved art direction and initial intensity, and leaves paid Generate fully manual. Image result Save as Mood may deep link with ?fromJob=ID. My Moods Edit and Create lead to the full editor. Existing generation model prices, payment controls, saved jobs and studio UI are unchanged. Worker deployment applies the idempotent LAB_DB 0010-mood-creator-analysis.sql migration for quotas and visual notes before enabling the endpoints. The key GEMINI_API_KEY remains a Worker secret. Production browser experience and real provider quality still require verification.

### Separate Explore Moods, photographic Mood Creator and My Moods (2026-10-11)
**Explore Moods** lives at `/lab/explore-moods.html` with the entire eleven-look curated photographic gallery and a twelfth Create Mood card in one consistent section. The homepage contains four clearly labelled previews and a link to the complete gallery; its existing three-photo creator feature leads directly to the personal workspace. Choosing or dropping a JPG, PNG or WebP photo onto any curated card opens a quick source/prompt tray and a one-shot same-origin IndexedDB handoff to Image at `/lab/studio.html?tool=image&mood=<curated-id>`. It selects only the Mood and carries the optional user photo and prompt. No quote, generation or debit occurs before Image's explicit Generate action. The tray's **Make it your own** action opens `/lab/mood-creator.html?base=<curated-id>`, optionally passing the same one-use photo and idea.
**Mood Creator** restores the photographic editorial collage and pairs the left 12-photo inspiration bank with the integrated Art Direction deck. The curated card grid is removed from this page. Its explicit Develop the aesthetic action uses all attached photos as inspiration, with a chosen focus image, to propose a reusable style direction and optional palette. It does not send the full resolution originals or train a model. Users may name/edit the result, save privately, and use it in Image without being charged for managing the Mood. The **My Moods** bank remains at `/lab/mood-creator.html#my-moods` and is linked from Home, Explore and Studio. Studio navigation adds Explore Moods and Mood Creator as links while preserving the six existing tools, the static header and Image generator deck; at constrained widths the link row scrolls within its own container.
The updated non-billable quality suite covers separated gallery and workbench pages, desktop/mobile navigation, private one-shot handoff and one-provider-call multi-photo style analysis. Production browser behavior and real provider output quality require deployment and live testing.

