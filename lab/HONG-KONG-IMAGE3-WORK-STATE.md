# Hong Kong Nights: release verification and CI follow-up

Verified 2026-10-25 (Berlin). Source main: `61a2729fea715995ed2648aa82cb7a5d9035eee3`, including PRs #536, #537 and #538. Scoped branch: `codex/hong-kong-film-finish-ci-20261025`.

## Approved implementation

- PR #536 merged as `bcd80d965b19c7d084b0c5c94009c4bb9467f3c6`.
- New built-in Hong Kong Nights: Grain **13**, Haze **100**, Halation **78**, Film **100**, default creative intensity 60%.
- Canonical client preset: `lab/film-finish.js`; Nocturne variant: `lab/hong-kong-variants.js`; recipe and controls: `lab/moods.js`.
- Worker `imageMoodMetadata()` supplies the same preset when omitted. Explicit all-zero values override it; historical results without finish metadata display OFF. No original or historical result is rewritten.
- Cinematic recipe requests darker night exposure, localized translucent petrol-green humidity, natural warm skin and wet existing outdoor pavement. Preserve identity, wardrobe, pose, buildings and dry interiors.
- Automatic photographic inputs remain exactly `02-city-haze.jpg` and `03-shop-reflections.jpg`, with hashes in `lab/hong-kong-reference-policy.js`. Supervalu is artwork only; diner and indoor portrait are historical references, not automatic inputs.
- Studio and Explore use the shared built-in recipe/preset. Mood Creator loads the same catalog; saved personal Moods intentionally use `preparePersonalMoodPrompt()` without the built-in automatic finish, as existing tests require. They are not new Hong Kong jobs.

## Confirmed failures and scoped correction

- Main run `40141247863` failed only its browser expectation of zero defaults. Remote Cloudflare pixel/off-bypass checks and unit steps had passed.
- Update `tests/lab-film-browser.mjs` to 13/100/78/100, test explicit-zero restore/enrichment, and assert historical OFF before manually editing all four controls.
- Add Worker regressions for missing/default, zero and custom finish metadata, unrelated Moods, mocked Gemini completion and server-bound Seedream quotes. No actual provider requests.
- Main run `40141247979` expected Tools hidden whenever `#app` was hidden. Current `assets.css` explicitly preserves public navigation. This is an obsolete UI expectation, not evidence of an authorization regression.
- Reuse the scoped Assets expectation corrections already prepared in open PR #482: actual public navigation, private archive hidden, approved Upscaler/Fashion layout, real lazy-loading intersections. Keep actual file, quote/confirmation and billing assertions.
- Also await favorite-save response before inspecting its asynchronous fixture state.
- No application, permission, auth, provider, pricing or credit-ledger code is changed by this follow-up.

## Verification and publication evidence

- Targeted film/Hong Kong/Worker/approved Image contract tests passed locally: **156/156** on the initial source; recheck after current-main integration is recorded in the PR.
- Film browser passed at 1440px and 390px, including manual OFF, historical OFF, independent controls, one mock finish write and original download. Local finished-image bytes are only a browser fixture; CI must validate real Cloudflare pixels separately.
- Explore generation scenarios and all 11 Mood Creator browser checks passed with synthetic APIs.
- Full-bootstrap guest-only subset passed at 1440px, 390px and 320px: public tool decks/navigation, private Assets gate, auth return URLs and zero private API requests. This is not a signed-in production test.
- Optional full role suite stopped on its pre-existing attempt to fill disabled empty Retouch input (`#precision-prompt`), also addressed separately in #482; no product control was weakened.
- Cloudflare Pages check `121121874586`, project `pvlab-studio`, succeeded for #536. Read-only release verifier returned LIVE_VERIFIED for `lab/lab.js?v=20261024-fashion-main1`, SHA-256 `3afcb4009bf4267c7ac8ec241b291c755aab9bae5e48ad39a22f07538fec2b5f`.
- Production `film-finish.js`, `hong-kong-variants.js`, `moods.js`, `app-mood-generation.js`, `mood-creator.js`, `reference-guidance.js` and reference policy matched reviewed bytes. Studio/Explore/Creator HTML contain `hkCinema=20261025v1`. Production-loaded modules return the approved preset and preserve explicit OFF.
- Worker health reports `pv-lab-2026-10-25-vitolas-invitations-v1`, consistent with subsequent main PR #537, whose source retains Hong Kong fallback. Live unauthenticated jobs, library and private-asset requests returned 401. No authenticated production quote was made.
- Exact original city/street references and historical indoor portrait were visually inspected. No post-#536 same-input portrait/interior/street AI outputs were available for controlled comparison. Photographic result quality remains UNVERIFIED; prompt and pixel-processing tests do not prove fog/wet-ground generation quality.
- No paid generation, real-account mutation or customer media access occurred.
- Next: require relevant branch CI (real film pixels and Assets included), merge the tested SHA through the existing PR procedure, and record final main/hosting evidence separately. Controlled new visual comparisons require explicit paid-generation authorization or already-existing matching outputs.

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
