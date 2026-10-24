# Fisheye 2000 Mood: current work state

## Active refinement, 2026-10-24

- Objective: the owner found that applying Fisheye to an uploaded Base at 100% produced mainly lens distortion, with too little of the approved circa-2000 Japanese street atmosphere. Strengthen that Base workflow while preserving identity.
- Starting main: `086d5b67731684d0617279a629414cfd546aef41`. This includes the separate Dream Blur maximum-Base refinement; preserve it.
- Evidence: uploaded screenshots `image(20261024-002247).png` (`libfile_faac237a38a08191ba0731260ebabcfc`) and `image(20261024-002317).png` (`libfile_159a2be04c1c819188484d5971b64a4d`) show Seedream 5 Pro, Base photo, Fisheye 100%, same European cafe with a circular lens treatment.
- Cause: Fisheye Base instructions explicitly locked the original location, prohibited Tokyo signage, and restricted its two Style notes to optics. Inspiration also instructed preserving the Base setting.
- Approved change: intensity may now transform the environment. 1-34% retains place; 35-74% introduces restrained Japanese period detail into recognizable scene structure; 75-89% rebuilds surroundings as a circa-2000 Tokyo side street; 90-100% fully transforms the background into an old shopping alley.
- Identity, facial features, natural skin tone, hair, body proportions, expression, people count, clothes, coverage and primary pose stay protected. Seats/supports/held objects remain spatially coherent. Explicit user location directions and assigned Environment references override the default Tokyo scene.
- Whole-frame era treatment: muted green-warm negative-film dyes, integrated skin/shadow grain, soft magazine-scan contrast, restrained halation, raw direct flash and real 15mm depth. Signage belongs to the architecture; no generic cyberpunk, pseudo-lettering overlay or oversized black-circle substitute.
- Reused both approved original photographs and photo-1 cover paths. No asset bytes, UI layout, pricing, models or other Mood recipes changed.
- Recipe changes: `lab/moods.js`; the two existing Style notes: `lab/mood-references.js`; subject-neutral Inspiration direction: `lab/inspiration-looks.js`. Other modified application files only invalidate the affected module import chain with `fisheyeY2K=20261024v1`.
- Verification: 53 focused tests pass, including five new Base-atmosphere regressions, full/Lite budgets with eight user photos plus both Style photos, explicit location/Environment priority, original-photo paths, reference deduplication, History privacy and approved Image UI contract.
- Before/after verification: 6,300 cases confirm every other Mood object/prompt and Fisheye text-only/References Only recipe remain identical to starting main. Custom user text is retained verbatim; no recipe truncation.
- Source integrated through PR #505: branch commit `488fa7d03f9c9940caece102906e3c28aa96d2d1`, main merge `fce168fc5c7d44d20da6a5c73e0eacbc56f2cf40`. GitHub private-lab (full Lab suite), reference/Worker compilation plus browser reference-deck workflow, approved-image-ui and static validate all passed.
- Existing unrelated Assets/verify failure is identical on starting main and this branch: `tests/lab-assets-ui.cjs:140`, "Tools are hidden without an authenticated workspace". Baseline job 120719198362 and branch job 120726122318 confirm the same assertion. No gate was disabled or weakened.
- Publication VERIFIED 2026-10-24 at 02:38 Europe/Berlin (00:38 UTC). Exact merge Cloudflare Pages check 120727313597 succeeded at 00:37:08 UTC for existing project pvlab-studio, deployment `115f4b1b-b341-4b1f-a62f-c60547400f92`. No manual deployment or authentication was needed.
- Repository release verifier returned LIVE_VERIFIED for public /studio and lab.js at v=20261024-fashion-main1. SHA-256: `934b73193bf5f7d4b11ffd8d460e60ee49e3ad06049d1d2f7a08011b51dcf311`.
- Independent fresh public requests returned HTTP 200 and exact reviewed-byte equality for /moods.js, /mood-references.js, /inspiration-looks.js and /studio-guest-image.js with fisheyeY2K=20261024v1. Core recipe SHA-256: `35a93c4bf6f15846af7d0c0c38a341979b8032124e63f3f5e30dc25a8ff6d981`. Thus this new Base recipe, not only the previous cover/card release, is confirmed live.
- No paid provider generation or upload was submitted. Prompt/reference routing tests cannot prove final image quality; the owner's next real Base generation remains the visual check.

## Historical release record

# Fisheye 2000 Mood: implementation and safety

Scope: additive seventeenth curated Mood for PV LAB, using the owner's two uploaded photographs only. No AI-generated imagery.

Required: reproduce the original Canon fisheye / hard-flash / Tokyo streetwear prompt as an internal recipe, adapt to an uploaded Base without copying source faces or clothing, and attach exactly two optically-oriented Style photographs in image-model flows that support hidden references.

Protect: existing sixteen Mood recipes, seven Image Inspiration cards, prompt deck, credits, pricing, Gallery, Hong Kong Nights source-free behavior, and Dream Blur's existing four-photo references. Do not submit a generation job.

Verify: optimized actual-photo assets, new catalog and Worker allowlists, My Moods support, 5,000/3,000 final provider prompt limits, user text preservation, hidden Style reference filtering, browser/native entry and CI.

## Cover and Inspiration update, 2026-10-21

- User explicitly requested photo 1 as the cover and Fisheye in the Studio Inspiration carousel shown in their screenshot. This supersedes the earlier seven-card-only scope.
- Reused the existing optimized original `lab/mood-references/fisheye-2000/01-analog-daylight.webp`, visually matched to uploaded `hf_20261019_221911_ba63d845-cb9a-4f5e-936e-b0e7c30c9c50 (1).png` (Library ID `libfile_5a2e548866908191bd3809c83cdde9ce`). No new image generation or asset replacement.
- The shared catalog uses photo 1 for card/full previews, including native app previews. Explore Moods static card and both guest/signed-in Inspiration carousels use it too. Fisheye is fourth, after Flash Leather; all seven previous cards retain their relative order.
- Inspiration selects the existing Fisheye recipe at 75%, with the two approved Style-only references on supported engines. The original seven looks retain their existing reference-free Inspiration behavior. The public sign-in draft preserves the same Fisheye settings.
- Reuses one subject-neutral Fisheye application direction instead of inventing new scenes. Custom text and uploaded Base remain authoritative. Recipe, reference-photo files, identity protections and Worker are unchanged.
- Local checks: 22 focused tests passed, including approved Image UI contract, Fisheye/reference tests and Inspiration order/rotation checks. Real-browser mocked checks passed at 1440 and 390 pixels for guest card, signed-in card, full Mood selector and guest sign-in handoff; photo loads and no horizontal overflow. No paid generation or upload was sent.
- Integrated in main as `926e8c290c3267cb6ac7d639f9d06a3e6255376c`; arrow-navigation test updated for eight cards in `66fcb3f214c586786d8cc2b7f02e1061e87c1b75`. Approved Image UI and static validation CI passed. Full first-image browser workflow 39623379470 passed after the scoped arrow expectation correction; it also passed locally.
- Publication VERIFIED on 2026-10-21 at 18:09 Europe/Berlin (16:09 UTC) in a fresh public browser. https://pvlab.studio/studio displays eight Inspiration cards with Fisheye fourth. Its photo-1 WebP loads at natural width 800; selecting the card sets the selected state and the intended 15mm/direct-flash/Y2K direction with explicit Base identity/clothing/setting preservation. Published Studio markup also contains the signed-in Fisheye card with the same photo and fisheyeCover=20261021v1 on both relevant script imports.
- https://pvlab.studio/moods displays Fisheye with photo 1. Opening its public preview works and the full preview loads the same photo-1 asset. The signed-in flow and 75%/two-Style-reference behavior were validated by the existing browser tests above; no authenticated production generation was run. Direct raw-module browser navigation was blocked, so no newer byte-for-byte module comparison is claimed.
- The cover/card changes reached production between the last successful old-version check at 17:22 Berlin and this verification. The exact deployment ID/trigger was not established; do not attribute this publication to the failed manual Pages API attempt or to a new deploy performed in this continuation.
- User completed the manual sign-in handoff; the browser visibly confirmed the existing GitHub account was signed in. Cloudflare's dashboard remained blank, but independent public verification proved the requested release was already live. No additional authentication or duplicate deployment is needed. No credentials, permissions or project settings were changed.

## Original implementation validation
- New Fashion-category seventeenth curated Mood `fisheye-2000`, 75% default.
- Original uploaded images only, with optimized non-generative JPEG/AVIF/WebP derivatives. No assistant-generated content.
- Card uses the owner's second fisheye photograph; both supplied photographs are auto-attached as two Style-only assets where the existing provider reference mechanism supports them.
- Fixed original street-fashion, Tokyo alley, Canon EOS 5D IV 15mm fisheye, ISO400/f4/1-200s flash, 2000s color negative and natural-skin recipe. Base editing preserves customer identity, existing clothes, location and person count.
- User direction retained verbatim after trimming outer whitespace; hidden curated recipe and references flow to provider separately. History/preview surfaces only customer-authored prompt.
- Fixed short Seedream Lite recipe for its 3,000-character limit, no dynamic recipe truncation. Hidden reference preflight checks final provider prompt length before uploads; long prompts rejected with overage message. Other supported models use 5,000-character limit.
- Existing Dream Blur four references, Hong Kong Nights no auto references and seven Image Inspiration cards unchanged.
- Native and public Explore assets included; cache-bust only changed modules.
- Non-billable `node --test tests/lab*.test.mjs`: 643 passed, 0 failed.
- `node scripts/verify-build.js`: 21 public HTML files verified.
- `git diff --check` and Node syntax checks for all `lab` / `lab-worker` JavaScript passed.
- No real API generation, credit deduction or purchase.

## Release verification, 2026-10-21 (Europe/Berlin)
- Original PR #362 was blocked by conflicts in ten shared UI/module import files after later main changes. No Fisheye implementation was present on main before this integration.
- Existing integration commit 96787c37e7ab60f0011c7fd0d5e6b5f02189aacc resolved those conflicts on top of 3ef9236 while preserving the approved recipe and assets.
- PR #362 merged at 16:24 Berlin as 1b0ad3537b8372ea9f5e1a55df40586ddc60f101. The merge happened during the follow-up audit; it was not repeated.
- Cloudflare Pages check for that merge succeeded. Live https://pvlab.studio/moods displayed and opened Fisheye 2000 in an unauthenticated browser.
- Worker deployment run 39616520033 passed its tests, deployment and production-health steps. Both server Mood allowlists include fisheye-2000.
- Public deployed bytes matched the reviewed source for moods.js, mood-references.js, reference-guidance.js, app-mood-generation.js and lab.js, plus all five approved image derivatives. Source assets also match original PR dbd5625 exactly.
- Focused Mood, identity/reference, prompt-limit and approved UI checks: 97 passed.
- Local full suite on Node 24: 685/686 passed. The Dream Blur preflight timing test fails at its single setImmediate assertion; the same failure was reproduced with pre-Fisheye 3ef9236 loader source. Do not describe the full suite as green.
- Mocked Explore browser tests passed desktop, mobile and text-only Fisheye selection: quote uses fisheye-2000, 15mm recipe, user Base first and exactly two Style references, preserving 1K photobooth pricing.
- Mocked full Studio browser test passed at 1440px and 390px: visible Fisheye card selection, preserved source, correct recipe, no horizontal overflow, no upload/paid request on selection.
- Follow-up fixes: reserve two reference slots in Studio's counter (8 customer photos for supported engines), and update the hero from sixteen to seventeen. Cache revision fisheye=20261021v2. Browser regression: tests/lab-fisheye-2000-browser.mjs.
- Follow-up source commit: b48329a70e570188f1275b4f5e0f1dde1fd7e846. Its approved Image UI contract and static site validation CI passed; the full Studio Fisheye browser regression passed locally at desktop/mobile sizes.
- Follow-up production verification completed at 14:53 UTC / 16:53 Berlin. Fresh public requests show Seventeen visual worlds on /moods and fisheye=20261021v2 on /studio?tool=image. Public /lab.js matches b48329a byte-for-byte (Git blob SHA 14b5114044cb96d2482b4646c291941cf6a138da), including the eight-customer-photo limit for Fisheye's two hidden Style references. The original feature and both follow-up fixes are now confirmed published. This does not claim unrelated later main changes are deployed.
- Manual Pages API release run 39618936024 failed on GET of the existing pvlab-studio project with HTTP 403 / Cloudflare code 10000. It never reached the deployment POST. Existing Worker deployment access remains successful. No permissions, secrets, bindings or project settings were changed.
- Fallback workflow .github/workflows/pvlab-pages-release.yml is manual-only. Cloudflare dashboard authentication is no longer needed for this Fisheye release: subsequent public verification confirmed the follow-ups deployed. The failed manual API attempt did not deploy them; the exact later deployment trigger was not established. Do not retry authentication or trigger a duplicate Fisheye release.
- Authenticated production provider generation was not run; visual output quality is not claimed.
- At the original release, the seven introductory Inspiration cards remained separate. The later explicit user request above now adds Fisheye to that carousel too.

### Reproduce the focused Studio verification
Run `PV_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs PV_CHROMIUM_EXECUTABLE=/path/to/chromium node tests/lab-fisheye-2000-browser.mjs` from the repository root. It uses synthetic authentication, mock API responses and a local synthetic Base image. No production account or provider call is made.

### Secure sign-in continuation
- User selected GitHub in Cloudflare secure browserAuth, then Google on the GitHub sign-in page. The tool reported both method selections submitted, not authenticated success.
- Automatic approval review rejected observing the next screen, citing an unapproved Google sign-in path and risk of exposing private Google account content outside this task. Do not bypass the rejection. User approval is required before continuing the Google sign-in path specifically to finish Cloudflare access.
- Public Fisheye release and the successful Worker deployment remain unaffected. Subsequent public verification at 16:53 Berlin confirmed both b48329a UI follow-ups published, so this authentication continuation is unnecessary and was not resumed.

### Cover-update authentication continuation, 2026-10-21
- The later explicit user authorization superseded the earlier approval blocker for Google sign-in solely to access Cloudflare and publish the cover/carousel update.
- After an incorrect-password error, manual handoff was used. The user subsequently reported signing in; the GitHub page confirmed the account was already signed in.
- Public verification at 18:09 Berlin confirmed the requested cover/card update already live. Authentication work is closed for this task. Do not retry credentials or trigger a duplicate release.
