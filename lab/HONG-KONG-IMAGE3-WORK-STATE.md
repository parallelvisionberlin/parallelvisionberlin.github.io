# Hong Kong Nights: current release state (2026-10-25)

Owner's current approved direction supersedes the earlier 1-90%-unchanged restriction below: a strongly nocturnal 1990s film-scene look at default Mood 60%, visible translucent petrol-green humid fog, softly darkened photographic frame edges, wet existing outdoor surfaces and warm skin. Base identity, wardrobe, architecture and dry indoor furniture remain unchanged.

## Implementation

- Scoped branch `fix/hong-kong-nights-cinematic-fog-default-20261025`, PR #536 targeting `main`. No production merge had occurred when this checkpoint was written.
- New default `35mm Film Finish`: **Grain 13%, Haze 100%, Halation 78%, Film 100%**. `lab/film-finish.js`, `lab/hong-kong-variants.js` and `lab/moods.js` agree.
- Worker `lab-worker/worker.mjs` supplies the canonical optical preset for new Hong Kong quotes if clients omit it. Explicit all-zero values still opt out. Historic job metadata remains unchanged.
- Result viewer `lab/lab.js` displays **OFF** for old jobs with no saved finish metadata, avoiding false impression that processing was applied.
- Cinematic prompt in `lab/moods.js` allows darker apparent time of day and localized petrol-green backlit humidity; always requests wet sheen on visible original outdoor pavement, never added puddles in a dry room. Physical frame falloff is not graphic bars.
- The two real model references remain `02-city-haze.jpg` and `03-shop-reflections.jpg` per `lab/hong-kong-reference-policy.js`; `Supervalu` stays preview art. No new source/style images or billing modifications.
- Model-specific compact Seedream Lite wording is independently constrained to 3,000 characters; the other supported models stay under 5,000. Wording must not truncate user-authored text or reference assignment.
- Application module import cache revisions `hkCinema=20261025v1` propagate to Studio Image, Explore Moods, Mood Creator and reference guidance; other Mood recipes remain unchanged.
- Dedicated tests cover four-slider defaults, reference numbering, film result behavior, 60%-100% mood continuity, source preservation and prompt length across supported models.
- Initial CI caught overlength prompts (5K and Lite 3K) and an outdated film-default assertion; corrected in the PR. Fresh full PR CI and release verification are required before merge.
- No charged generations or controlled image comparisons were made. Prompt compliance alone does not prove the provider rendered the requested fog, dark edges or wet ground.
- Next: require the affected CI workflows green, merge reviewed PR, verify automatic Worker deployment and Cloudflare `pvlab-studio` custom-domain artifact, then compare portrait, window/interior and street at 30/60/100% using the same Base. Record visual results separately.

## Historical approved Image 3 note (2026-10-20, superseded for new jobs)

Owner instruction: preserve the approved Image 3 palette and integrity; increase atmospheric depth only, not a new look.

- The screenshot labels Image 3 as Seedream 5 Pro, 2K, Mood 90%, Grain 29%, Haze/Halation/Film 100%. The other screenshots use different model/resolution/intensity settings and are not controlled V8-versus-V9 comparisons.
- PR #368 (experimental V9 finish) was closed without merging. Current production code was V8. There is no V9 production rollback to claim.
- Preserve the existing V8 renderer, slider settings/defaults, model choice, resolution, original images, history, references, safety and billing.
- Keep Hong Kong's entire 1-90% prompt output exact across all models and reference modes. At 91-100%, refine only canonical Hong Kong air: atmospheric diffusion, suspended humidity, soft existing-light bloom, localized halation, subtle veiling flare and physically appropriate exterior reflections. Keep color, natural skin, room detail, dry interiors and dark gaps. No global green wash, extra grain, digital sharpening or blanket blur.
- Existing approved identity/base images remain primary. No hidden style-photo injection is reintroduced.
- Preparation verifies all other Mood outputs by deterministic digest. The release diff excludes the V8 implementation, provider/reference routing, safety and billing. Permanent tests cover the approved Hong Kong recipe and controls without blocking unrelated future provider changes.
- Three anchor PROMPT checks cover portrait/interior/street for all seven compatible model settings. No paid generation or customer wallet action is performed. These are not visual approval of new AI outputs, and a matching prompt cannot guarantee identical pixels on a new stochastic generation.
- Browser module cache marker: hkImage3=20261020v1.
