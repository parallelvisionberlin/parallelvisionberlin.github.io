# Fisheye 2000 Mood: implementation and safety

Scope: additive seventeenth curated Mood for PV LAB, using the owner's two uploaded photographs only. No AI-generated imagery.

Required: reproduce the original Canon fisheye / hard-flash / Tokyo streetwear prompt as an internal recipe, adapt to an uploaded Base without copying source faces or clothing, and attach exactly two optically-oriented Style photographs in image-model flows that support hidden references.

Protect: existing sixteen Mood recipes, seven Image Inspiration cards, prompt deck, credits, pricing, Gallery, Hong Kong Nights source-free behavior, and Dream Blur's existing four-photo references. Do not submit a generation job.

Verify: optimized actual-photo assets, new catalog and Worker allowlists, My Moods support, 5,000/3,000 final provider prompt limits, user text preservation, hidden Style reference filtering, browser/native entry and CI.

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
- Follow-up public-byte verification is still pending. The original Fisheye deployment remains confirmed live. Authenticated production provider generation was not run; visual output quality is not claimed.
- Seven introductory Inspiration cards remain the approved separate catalog. Fisheye belongs to Explore Moods and the full Studio Mood selector, as specified in the original PR.
