# Fisheye 2000 Mood: implementation and safety

Scope: additive seventeenth curated Mood for PV LAB, using the owner's two uploaded photographs only. No AI-generated imagery.

Required: reproduce the original Canon fisheye / hard-flash / Tokyo streetwear prompt as an internal recipe, adapt to an uploaded Base without copying source faces or clothing, and attach exactly two optically-oriented Style photographs in image-model flows that support hidden references.

Protect: existing sixteen Mood recipes, seven Image Inspiration cards, prompt deck, credits, pricing, Gallery, Hong Kong Nights source-free behavior, and Dream Blur's existing four-photo references. Do not submit a generation job.

Verify: optimized actual-photo assets, new catalog and Worker allowlists, My Moods support, 5,000/3,000 final provider prompt limits, user text preservation, hidden Style reference filtering, browser/native entry and CI.

## Verified implementation
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
