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

The Upscale button now authorizes one paid upscale without the price-review modal. The frontend still obtains a fresh, bound provider quote and submits its exact ID once through the existing session-safe helper. No batch, automatic repricing, paid retry, or backend change is introduced. Quote expiry, wrong-mode responses, account budgets, capacity and interrupted-request checks still stop submission. Compression permission and warnings about choosing a tier below the source resolution remain. The cost is shown after submission and in History. Video keeps its separate price confirmation; Image generation is unchanged. Reuse restores originals and settings without running a task.

Changed files: lab/index.html, lab/lab.js, lab/README.md, tests/lab-image-oneclick-ui.mjs and tests/lab-upscale-ui.mjs. Tests use synthetic media and mocked API responses only.


## Standard Seedance 2.5 (2026-09-27)

Video now offers Wan 3.0 and Seedance 2.5 Standard. Seedance supports text-to-video, first/last frames and reference-to-video with up to 30 images, 10 videos and 10 audio clips. Each audio/video reference is 2 to 30 seconds, with a separate 30-second combined limit for each media type. Workspace file limits are 20 MiB per video and 15 MiB per audio reference. Standard Seedance follows the first-frame aspect ratio. Other modes expose the supported ratios including 21:9. Output choices are 480p, 720p and 1080p, with 4 to 30 whole seconds. Selecting Seedance starts at 5 seconds and 720p; Reuse restores the saved values.

This is the standard model, not a Spicy endpoint or filter bypass. The provider's policies and model refusals remain intact. No prompt transformation to evade safety systems, automatic model fallback, or paid testing is added. The existing bound live quote and separate video confirmation remain mandatory. Reference videos may increase the quoted maximum charge.

Existing encrypted credentials, owner verification, daily budgets, spending ledger, three-video capacity, Image batches, one-click image Upscale and private R2 archive are preserved. History and Reuse retain the exact selected model, original media, reference order, roles, notes and settings. Named packs store images only. No database migration, new subscription or payment integration is required.

Deploy both worker.mjs and seedance.mjs as Worker modules, retaining the existing bindings and secret. Deploy the backend before the frontend: older backend configurations do not enable the new selector. Input reference media use owner-only upload/read endpoints and the same short-lived signed URLs supplied to the provider. Browser and backend tests use synthetic images, video, audio and mocked provider responses; no real paid generations are used.
