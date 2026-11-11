# Chrome Desert featured world / 2026-11-11

## Approved creative and behavior
- The three original owner-supplied references are kept as separate public web-ready photographs: mirrored desert model and architecture as hero, angular gold installation and curved chrome sculpture as two compact supporting cards. Dagger portraits and unrelated studio chrome are excluded.
- Homepage order remains Image / Video / Upscaler → Chrome Desert featured world → unchanged Full Editorial.
- CTA is text-only **USE THIS WORLD**. This is a curated visual direction, not a customer character, wardrobe, or private Photo Pack.
- Full Editorial `?world=chrome-desert` starts at Identity, preselects 2 model-free desert architecture crops, and sends a selected subject straight to priced review. Styling and Location & Mood can be edited optionally from review.
- Existing `?start=1` follows its unchanged four-step flow. Server quote, credits, submission, failures and refunds were not modified. No paid job occurs until explicit Generate.

## Source
- PR #964: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/964
- Reviewed launch/merge SHA: `766540fec6eac12f9d329508bfddcfee9d375245`
- Home: `lab/index.html`, `lab/home-featured-photo-pack.css`
- Preset: `lab/editorial-world-presets.js`, `lab/full-editorial.js`, `lab/full-editorial.html`, `lab/full-editorial-world-preset.css`
- Five JPGs at `lab/visuals/featured-worlds/chrome-desert/`, including two scenery-only crops.
- Regression: `tests/lab-chrome-desert-world.test.mjs`, `tests/lab-home-featured-photo-pack.test.mjs`, `tests/lab-full-editorial-browser.mjs`; Full Editorial CI sparse checkout includes new image directory.
- Original full-resolution PNGs and manifest preserved in ChatGPT Library at `/PV Lab/Reference Worlds/Chrome Desert`.

## Verification
- 36 focused Node tests passed. Existing Full Editorial mock browser including the Chrome Desert route passed at 1440/390 with sign-in/quote stubs and no paid generation.
- PR CI passed: Full Editorial, approved Image UI contract, static, image references and Owner. Unrelated historical Lab/legacy page failures not weakened.
- Live guest browser at `https://pvlab.studio/`: HTTP 200, three images displayed, clicked CTA entered preselected Full Editorial, two scenery references loaded, subject selection jumped to Review, no horizontal overflow/errors on 1440/390, no jobs or spending.
- Live 200 assets byte-identical with reviewed PR for `full-editorial.html`, `full-editorial.js`, `editorial-world-presets.js`, `full-editorial-world-preset.css`, `home-featured-photo-pack.css`, hero JPG and both scenery JPGs. Home HTML contains exact approved feature; Cloudflare footer-email obfuscation accounts for its byte difference.

## Production
- Production Cloudflare Pages project `pvlab-studio`, custom alias `https://pvlab.studio`.
- Cloudflare canonical deployment `e3ebe0b5-32d4-41f6-8255-0ed5a1300748`: **deploy success**.
- Canonical production source SHA `6fe930c143d45f3efdd5c35f1d5ddb94da6ef9e0` is a verified descendant of launch SHA by two commits; the intervening files are unrelated to this feature.
- Original exact-merge deployment `df8e2d58-93ff-4d52-8c11-317465e80454` still displayed queued metadata, so use the verified canonical success + live byte checks, not that stale record.

## Remaining limitation
- No authenticated customer session or paid image generation was executed in production. Public guest route and the mocked exact-quote contract are verified, but real user billing/provider completion is not claimed.
