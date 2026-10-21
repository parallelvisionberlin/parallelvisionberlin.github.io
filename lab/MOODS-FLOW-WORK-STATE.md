# PV LAB / Explore Moods generation and Image return
Updated: 2026-10-19

## Approved experience
- Explore Moods is an independent, photographic discovery page.
- Its shared header links to Image, Video, Upscaler, Retouch and Fashion.
- My Moods retains its existing `mood-creator.html#my-moods` scroll.
- The sixteen gallery cards, original imagery, hero and presets are unchanged.
- The Image Studio draft (prompt, references, model and settings) is preserved
  across Explore Moods / My Moods navigation using same-tab private IndexedDB.

## Existing generation (live and tested)
- After a valid photo or direction, Generate is immediately clickable.
- Credit price remains the exact server-bound quote, quietly outside the button.
- A single click asynchronously prepares photo, references and quote, then makes
  only one confirmed paid submission. Do not auto-retry an uncertain POST.
- Generation progress and its original image appear inside the selected Mood
  dialog without redirecting to Studio.
- The active result view temporarily hides the upload form, keeping the artwork
  full height and the result visible within the viewport.
- Completed results offer Download, Open in Studio and Make another.
- Make another returns to the same file/direction without an automatic charge.
- The backend/Worker credit checks, providers and archive stay unchanged.
- Screenshot-confirmed compact result revision: merged commit
  `d8da8e76b381d06be1aa8f9c1d8373b55116a193`.
- Live deployment verification: GitHub Action 38835967593, passed.

## 2026-10-16 upload feedback and no-layout-jump correction
- Oversize/invalid file uploads were rejected but their generic status appeared
  away from the upload target, and the upload thumbnail's separate Remove text
  added a layout row.
- The new upload overlay is inside the fixed-size dropzone: an explicit
  “Image too large”, exact size and “Maximum 20 MB” message, followed by
  Choose another photo and Dismiss. Not red, high contrast, keyboard accessible.
- Rejections happen before any upload, quote or paid generation.
- If replacing a previously valid photo with a rejected one, retain the valid
  file but block Generate until the error is dismissed or corrected.
- Replace the tiny Remove selected photo link with a charcoal/white × icon
  overlay on the uploaded thumbnail, with accessible label and hover title.
- Keep the editor modal's original height frozen from the empty state, before
  applying an input from a gallery drop; use its existing internal scroll
  when needed. The upload area itself stays 130px / 110px on mobile.
- The image uploader remains browser-local; no provider or Worker changes.
- Tests cover direct card drop, file picker rejection, no layout shift, icon,
  valid-photo preservation and zero paid submissions for invalid inputs.

## Relevant files
- lab/explore-moods.js, lab/explore-moods-editorial.css, lab/moods.html
- lab/explore-moods-nav.css, lab/mood-handoff.js
- lab/MOODS-FLOW-WORK-STATE.md, lab/README.md
- tests/lab-explore-generation.mjs, tests/lab-moods-inline-return.test.mjs
- All other Studio, provider, authentication and pricing files unchanged.

## Validation and deployment
- Upload feedback patch merged via PR #246; verified source commit
  `bd5a87db266aa5cb3e9f832b75316c9b12cd22a9`.
- GitHub Lab tests passed, and Playwright Explore Generate run
  `38837475487` passed all desktop/mobile and invalid-upload cases
  (including card-drop oversize), with zero real paid provider jobs.
- Production verifier `38837902255` passed at 2026-10-16 01:58 UTC,
  fetching the exact new HTML, JS and CSS from `https://pvlab.studio/moods`.
- Paid provider quality was not tested for this UI-only patch.
- Next action: ask user to refresh and verify upload, removal and dismissal
  in their own browser. No additional API, billing or provider deployment.

## 2026-10-16 photochemical Mood loading
- Replaced the narrow spinner strip with a full-width darkroom / latent-exposure
  animation inside the existing result frame. The Mood poster and dialog
  geometry remain unchanged. No synthetic image previews or fake percentages.
- Components: `lab/moods.html`, `lab/explore-moods-nav.css`,
  `lab/explore-moods.js`; no provider, billing or API changes.
- Existing verified queued/running/saving messages remain in the aria-live
  status. A failed or uncertain submission freezes motion and directs the user
  to Image History. Reduced-motion preferences disable animations.
- A completed image softly resolves into view; no new network assets.
- PR #255 merged into main as `a0d95d30c75e2c4d887c2d9494f1105232bc6604`.
  Cloudflare Pages reports a successful deployment for that commit.
- PR checks: Explore Generate browser run `38914382444` and Lab tests
  `38914382440` passed. Covers desktop/mobile sizing, errors and one paid
  request per click with mocked backend.
- Two unrelated Image Studio/Soul browser suites also failed on the baseline
  main commit `69af2df591ea1d927214ce0d2ecbfb086361333c`; not changed here.
- Direct visual verification on pvlab.studio could not be completed from this
  environment. Next: refresh `https://pvlab.studio/moods` and confirm the
  animation's look on desktop/mobile before further polish.

## 2026-10-16 Living Light refinement
- User verified the first photochemical loader across Hong Kong Nights, but
  found its central rectangle too static. Shared visual refined for all Moods.
- New Living Light is a full-frame animated silver/emerald lightfield with
  moving ribbons, abstract photographic refractions and restrained grain.
- Editorial copy cycles: “MAKING THE IMPOSSIBLE VISIBLE”, “LIGHT BECOMES FORM”,
  “THE UNEXPECTED TAKES SHAPE”. It is not a simulated progress estimate.
- “ALMOST READY” appears only on backend `saving` or confirmed `completed`,
  followed by a short 600ms final reveal. Real queued/running/saving text remains
  accessible. Error state freezes visual and directs to Image History.
- Reduced motion supported. No new network assets, AI jobs, pricing changes or
  changes to the left Mood photograph/modal geometry.
- PR #256 merged as `2cb7c38a60980f042efbbf14847ec9c1354a81ec`.
- Focused Explore Generate browser, Mood unit and static checks passed on
  premerge head `7bd0c2008c10a161f7b4791da40da4d8f7d93c94`. Visual
  screenshots reviewed from CI. Mocked jobs, no real provider charge.
- Existing Image references/Video Studio browser failures were already present
  on main before this task and are unrelated to Mood loader code.
- Cloudflare Pages reported deployment SUCCESS for merge commit
  `2cb7c38a60980f042efbbf14847ec9c1354a81ec` on 2026-10-16 at
  14:54 UTC. This verifies publication, not a direct visual browser check.
- Next: refresh `https://pvlab.studio/moods` and evaluate motion with the
  real Mood photograph on both desktop and mobile.

## 2026-10-16 neutral Mood loader and long-wait feedback
- User screenshot of Synthetic Romance showed an emerald-tinted loader and
  about two minutes of real waiting. This observation is not an SLA.
- Refined the shared lightfield to neutral graphite/silver/pearl, removed radar
  arcs and scanline pattern, preserved actual Mood photograph and modal layout.
- At 45 seconds AFTER a confirmed paid job, show an honest optional-exit note:
  users can close the dialog and follow the existing job in Image History.
  The note never appears during quote preparation or after completion/failure.
- No change to credits, prices, provider, prompt, generation, output or retry.
  No paid job was run as part of the patch.
- Source: `lab/explore-moods-nav.css`, `lab/moods.html`,
  `lab/explore-moods.js`. Validation:
  `tests/lab-explore-generation.mjs`,
  `tests/lab-moods-inline-return.test.mjs`.
- PR #259 merged to main at `3e5cc75ba709b473c84b8f5f50f321ff6db1b85e`.
  Focused PR Explore Generate run `38921938643`, Lab tests
  `38921938887`, static validation all passed on branch head
  `517a9639ba6c231d219e9a433e817f21ba439a36`.
- Two unrelated pre-existing image references and video browser suites still
  fail. Do not claim every repository test passes.
- Latency source review: Mood defaults to Seedream 5.0 Pro, with 3 server-side
  Synthetic Romance references. Frontend polls every 4 seconds; backend
  limits Spicy status checks to at least 8 seconds. No real production trace
  was available to isolate the provider-versus-archive latency precisely.
  Do not promise a generation speedup from this UI change.
- For a future optional Fast mode, compare Seedream Flash against Pro on the
  same Moods, with separate timing and image-quality evaluation and explicit
  product/pricing approval before switching models.
- Cloudflare Pages confirmed SUCCESS for UI merge commit
  `3e5cc75ba709b473c84b8f5f50f321ff6db1b85e`
  on 2026-10-16 at 15:15:29 UTC. The later documentation-only deployment is
  independent. Browser tests were mocked; no new paid generation was run.
- Next: user refreshes `https://pvlab.studio/moods` and evaluates Silver
  Darkroom on Synthetic Romance and another Mood. Quality/latency A/B is
  separate and requires authorization for real paid comparisons.

## 2026-10-16 Seedream 2K and private delivery optimization
- Public Explore Moods remains a single Seedream Pro experience. All Moods now
  quote and request 2K, with server-bound 2K credit pricing before submission.
- Seedream Pro EDIT always sends `enable_thinking:true`. The text-only model
  keeps its documented schema. No Mood instruction or reference was shortened.
- Exact SHA-256 reference bytes are reused from owner/API-key-scoped Spicy file
  tickets while verified and valid; revoked references can be re-staged once
  before the paid submission. New D1 migration: 0022-mood-delivery.sql.
- During a real provider `saving` state, the existing authenticated customer
  may preview the completed provider image via a private bounded Worker proxy,
  without exposing provider URLs. Archiving remains in private R2, with Gallery
  actions unlocked only upon completion. Hong Kong film-finish results never
  expose unprocessed previews.
- Signed per-task Spicy v2 webhook callback validates a raw HMAC and bound task,
  and archives asynchronously. **Webhook activation is pending the real account
  SPICY_WEBHOOK_SECRET in Cloudflare**; polling works as a fallback until then.
- Added private owner-scoped per-job timing: preflight, quote, submission,
  provider completion, preview and R2 archival. No extra paid tests were run.
- Files: `lab/app-mood-generation.js`, `lab/explore-moods.js`,
  `lab/moods.html`, `lab-worker/worker.mjs`,
  `lab-worker/spicy-webhook.mjs`, `lab-worker/wrangler.toml`,
  `lab-worker/migrations/0022-mood-delivery.sql`, `lab-worker/schema.sql`,
  deploy workflow, and focused tests.
- PR #265 merged as `2aa9625d66122af06a779379624e832ad569619d`.
  Cloudflare Worker run `38937028417` passed with health verification and
  migration; Pages also reports success on the same UI commit.
- Isolated Mood browser tests and new callback/cache tests passed. Broader repo
  suites have existing Studio version-selector assertions unrelated to Moods;
  do not report every CI job as passing.
- Next: install the exact Spicy Webhook signing secret in Cloudflare Worker,
  then use future ordinary paid Mood generations to measure time to preview.
  Never claim sub-minute rendering without measured data.

## 2026-10-16 Completion callbacks with no additional key
- Verified Cloudflare Worker account (via authorized Cloudflare API): existing
  `LAB_SECRET` and `LAB_CUSTOMER_SPICY_API_KEY` are present;
  `SPICY_WEBHOOK_SECRET` is absent. No secret value read or exposed.
- Replaced the missing native signature dependency with a private per-quote
  HMAC wake-up URL derived from the EXISTING `LAB_SECRET`.
- SpicyAPI requires `callBackUrl` be *identical* for quote and paid createTask.
  The callback quote UUID and token are generated before pricing, persisted
  unchanged in the quote payload, and used for exactly one paid submission.
- Incoming callback content is ignored, even if forged; token validation
  only triggers the existing server-authenticated `recordInfo` check.
  Fallback 8-second polling remains enabled; no duplicate billed job.
- Tests cover invalid URL tokens, tampered body, exact quote/submit payload,
  callback replay, real provider completion and no second paid submission.
- PR #268 merged as `cba2702f24b84576560921c0c5d2b43dd22cf69b`.
  Existing unrelated Studio fastload assertion still fails; new tests pass.
- Worker deployment run `38940647626` completed SUCCESS. Its syntax,
  deploy and production health steps all passed, verifying Worker version
  `pv-lab-2026-10-16.3-spicy-mood-wakeup`. No real paid generation was run.
  Future natural completions will validate callback delivery end-to-end.
- No changes required in SpicyAPI or Cloudflare dashboards.

## 2026-10-18 Photobooth first-result speed default
- Explore Moods web modal and native mobile Moods now request Seedream 1K (previously 2K) through the shared `app-mood-generation.js` prepare and server-bound quote.
- Regular Studio retains explicit 1K/2K selection and existing Mood handoff defaults; no model, reference, identity, style, pricing math or paid submission logic changed.
- Refresh both Photobooth module imports, assert the quote resolution in the Explore Moods browser test and the private delivery unit test.
- Resolution may improve provider latency but per-job results remain variable; production measurements should confirm any improvement.

## 2026-10-19 Hong Kong Nights provider parameter rollback
- Root cause verified against production Cloudflare D1, not only synthetic mocks: Seedream 5 Pro Edit completed multiple Hong Kong Nights 1K jobs on 2026-10-18; two owner jobs at 21:44 and 21:46 UTC had one Base image and NO explicit `enable_thinking` property in their stored vendor quote payloads.
- Historical commit `dde2a29e8983` at 22:27 UTC changed the existing conditional to send `enable_thinking:false` specifically for Hong Kong Nights. SpicyAPI rejected the combination with a provider preflight error.
- Revert exactly that parameter behavior to the preceding successful source (`d6021026f43d`): leave `enable_thinking` omitted for Hong Kong Nights Edit; other Seedream Edit Moods still explicitly send true. Preserve explicit 1K and 2K values and the existing model, curated/user references, prompt, film finish, pricing, paid submit, history and customer data.
- Targeted unit regression verifies stored vendor quote model, 1K resolution, one Base image, original Hong Kong prompt, and lack of `enable_thinking`. Spicy Mood delivery test rejects the accidental false override.
- Production D1 read-only check on 2026-10-19: no failed Hong Kong Nights job, no generation-debit/refund ledger entries on that date, and zero uncertain jobs; the screenshot rejection likely happened during pricing, before a job was created. This is not proof of a specific Spicy provider invoice.
- Worker version advances to `pv-lab-2026-10-19.1-hongkong-spicy-compat` solely for production health verification. No schema migration, UI redesign, provider migration, altered pricing or new paid generation.
- Next: pass focused and complete Worker tests, merge with existing deployment process, verify the exact production health version; actual post-fix image quality still requires an explicitly authorized paid generation.

## 2026-10-19 Hong Kong Nights controlled atmosphere and V8 finishing
- Baseline 200c21a087960f772e1d7420c6ef422686ffb6d2. Existing Base-first identity, 0 default finish and SpicyAPI/Seedream Pro 1K/2K compatibility remain unchanged.
- Refined the Mood toward authentic warm skin against emerald-petrol depth, real source-scattered humidity, nocturnal longing and sensual restraint. Conditional art direction routes a fashion portrait, street/transit, room/interior or dry/daylight through the visible Base, without classifier or additional paid calls. No new fog, neon, rain or grain.
- V8 retains V3's scene-bound emitter masking and 35mm print curve, reducing only blanket softness by more than half. V3/V6 remain explicit A/B and rollback renderers. Render revision 8 separates new output cache from past film derivatives. Manual sliders remain 0-100 and off by default.
- Three controlled non-paid Cloudflare Images optical A/B sheets (portrait, interior, street) compare original/V3/V8. These DO NOT replace paid AI generation comparison or user assessment of final image quality.
- No provider route, authorization, customer credit, prompt reference, gallery or unrelated Mood changes. Branch tests, deployment and visual review pending.

## 2026-10-20 Hong Kong Nights: one reference-led look
- Hide the three Photo direction pills in Studio and Explore Moods, preserving existing original/deep-green/slow-shutter IDs and past jobs. New and reused generations start with canonical original. No changes to the film renderer, 35mm slider defaults (0), Seedream/SpicyAPI, quote or debit logic.
- Derive the one primary optical recipe from user supplied reference frames #4 green city/taxi (humid lights), #5 wet street (pavement and tungsten), #6 green-gold smoker in restaurant (skin/light), #7 tunnel (fluorescent spatial falloff). Remaining uploaded imagery secondary for black intervals, ruby accents and texture. These are interpreted as lighting descriptions only, not invisible photos that could overwrite the source image; prior auto staging was a known cause of loss of scene fidelity.
- A Base source must preserve identity and geometry but may shift credible exterior ambient exposure, introduce plausible outdoor dampness, and disperse existing practical light to produce more sensual humid night atmosphere. Interior floors stay dry; 35mm grain stays embedded in the model's photographic character, never artificial speckled overlay. User text still has priority. Three portrait/interior/street contexts require validation, and real visual success remains unverified without an actual generation.
