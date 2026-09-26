# Parallel Vision Lab

Private image-to-video workspace at `/lab/`, using the existing GitHub Pages site and an isolated Cloudflare backend. No navigation or sitemap link is added. This first version is image-to-video only, not text-to-image.

## Owner workflow

1. Open `https://parallelvisionlabel.com/lab/` and sign in with the existing Parallel Vision owner account used for Nina.
2. Upload a source image, enter a prompt and choose settings. **Save draft** stores the original image and settings in the private cloud archive without generating a video.
3. For hosted generation, open **Connection**, paste your own SpicyAPI key there (never in chat or GitHub), check provider suitability and terms, and set a daily USD budget.
4. Choose **Review price & generate**. The Lab requests a live quote for the exact input. Only **Confirm & generate** submits a paid request.
5. History can reopen completed video, download MP4 and **Reuse image + settings**. Reuse restores the original image, prompt, duration, resolution, aspect ratio, seed and audio setting without overwriting the saved record.

## Activation status

The provider adapter is implemented, but no real provider key has been connected and no paid generation has been requested. Account access, model availability, actual charged prices, content acceptance and a real output still require verification in the owner's account. Saving a key performs a read-only balance check; it is not an end-to-end generation test.

The configured provider is SpicyAPI and the model route is `alibaba/wan-3.0/image-to-video`. The application does not bypass provider protections. A model name, an external marketing claim, or a user's suitability checkbox is not proof of unrestricted generation. The provider's actual terms and decisions apply. No fixed price or guaranteed content acceptance is claimed by this implementation.

Provider documentation used for the adapter:
- `https://docs.spicyapi.ai/docs/api-reference`
- `https://docs.spicyapi.ai/docs/quotes-and-compatibility`
- `https://spicyapi.ai/models/wan-3-0`

## Architecture and privacy

- Static HTML/CSS/JavaScript under `lab/`, using the existing GitHub Pages hosting. No Next.js, Vercel, Supabase or Stripe requirement.
- Existing Clerk sign-in, with RS256 signature, issuer, authorized-party and expiry validation in the Worker.
- Every upload, private media read, history operation, setting change and generation request requires an existing owner role checked server-side. The public page is only a sign-in shell. `noindex` and an unlisted path are not the access control.
- Separate Cloudflare Worker `parallel-vision-lab`, D1 database `parallel-vision-lab`, and R2 bucket `parallel-vision-lab-private`.
- The existing Nina database is only queried for owner authorization. No Lab migrations or other writes target Nina's tables or Worker.
- Original inputs and completed outputs live in private R2. Public r2.dev access is disabled and no public bucket domain is attached.
- The provider receives a narrowly scoped, short-lived signed URL for its source image. Other downloads require the owner's verified session.
- Provider keys are AES-GCM encrypted in the Lab database. The encryption secret is stored as Cloudflare `LAB_SECRET`, not committed to the repository or returned to the browser. Preserve this secret across deployments.
- Credentials, prompts and media are not stored in localStorage. Signing out clears the private UI and in-memory media URLs.

## Spending and reliability

Prices come from the provider's live quote endpoint, not from promotional pages or a hard-coded tariff. The exact quoted payload, quote ID and expected cost are retained for submission. A changed or expired price requires another review and confirmation.

The default budget is $10 per UTC day. The owner can choose $1 to $100. This is a conservative local guard based on quoted maximums, including failed or uncertain attempts. Provider invoices remain authoritative; also configure limits on the provider API key.

The database reserves estimated spending atomically and permits only one active request per owner. Repeated submission of the same quote returns the existing job. Ambiguous submission failures are marked uncertain and block another generation until the owner checks the provider console. No automatic paid retries occur. Deleting history does not erase the spending ledger.

A five-minute Cloudflare schedule polls existing jobs, archives completed output and removes unused expired inputs. It never submits a new generation. Limits include 10 MB source uploads, 150 MB result files and 2 GB private archive usage. Delete old records when required.

No additional subscription or provider credits were purchased. Existing Cloudflare account usage and billing still apply; storage and compute are not promised to remain free at every usage level.

## Deployment and verification record

On 26 September 2026, Cloudflare accepted the Worker deployment, its D1 schema and bindings, workers.dev enablement and the five-minute schedule. The private bucket's public access was checked and is disabled.

Worker API: `https://parallel-vision-lab.parallelvision.workers.dev`

Deployed Worker source SHA-256: `7224edafd0bd3044c42a9e7b12cb7ac5319e34ef368d60f924b7f5f862ecc3d8`.

Verified locally:
- JavaScript syntax checks passed.
- Five Node backend tests passed using synthetic signed JWTs, SQLite, simulated R2 and a mocked provider. They cover owner access, encrypted credentials, quote approval, duplicate prevention, spending caps, uncertain submissions and archive deletion.
- Offline Chromium UI tests passed with mocked sign-in and backend: image preview, saving and reusing all settings, cancelled quotes, explicit submission and logout cleanup. Desktop at 1440 pixels and mobile at 390 pixels had no horizontal overflow.

Not verified end-to-end: the production Clerk sign-in, public HTTP reachability of the deployed Worker and a real provider generation. The execution environment blocked live browser navigation and direct Worker HTTP checks. Cloudflare's deployment API acceptance is not equivalent to those end-to-end checks. There are no simulated results or test credentials in the production application.

## Developer checks

Use Node 22.16 or newer for the SQLite-backed tests:

```sh
node --check lab/lab.js
node --check lab-worker/worker.mjs
node --test tests/lab-worker.test.mjs
```

Deployment configuration is in `lab-worker/wrangler.toml`. Keep `LAB_SECRET` as a Cloudflare secret and retain it on every deployment. Do not expose the R2 bucket or add a paid provider key to configuration files.
