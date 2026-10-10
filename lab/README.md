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

### Upscaler inline progress (2026-10-10)
Upscaler now reuses the same aria-live notification element inside the generation controls, below the Upscale actions, instead of rendering progress and completion confirmations as a stray full-width line above the gallery. The notice is restored to its original location for Image, Video, Assets and Fashion; tool switches clear stale messages. SpicyAPI shows immediate upload/price-check feedback before submitting and then the confirmed quote amount when the job is accepted. This change does not modify quotes, provider calls, charge behavior, queue persistence or any generated asset. The mocked browser regression checks placement and confirms that only one paid job is submitted.
