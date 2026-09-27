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

Review price requests a free live quote for the exact input/settings. A separate confirmation starts the paid request. The Lab does not hardcode advertised prices or silently reprice. Up to four active image generations and one active video generation per owner. Every generation still has its own price review and confirmation. A single guarded SQL INSERT reserves the per-type slot and shared daily estimated-spend cap atomically, including requests from multiple browser tabs. The cap counts failed/uncertain attempts conservatively and survives deletion from history. Also set provider-side spending limits.

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
