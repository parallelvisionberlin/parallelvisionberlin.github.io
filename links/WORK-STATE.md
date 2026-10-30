# Parallel Vision Smart Links: current state
Updated: 2026-10-30
Repository: parallelvisionberlin/parallelvisionberlin.github.io
Feature baseline: d336368 (PR #671); white dashboard 9245740 (PR #673).
Published refinement: e354ffff1d5c6244052cf08312113d77af62b44d (PR #675); prior background service 99f4438 (PR #674).

## Approved direction
- Private dashboard: white/black/cool grey, permanent sidebar, compact medium artwork rows, prominent metrics. Only Spotify, SoundCloud, YouTube.
- Public layout now approved: artwork-first refinement exec-730d0f3b-081e-4845-8ec2-898a49b9378a.png.
- Large sharp cover left, smaller title/artist and listening links grouped right; centred composition. Phone stacks artwork above details.
- Spotify row: green brand identity on white, separate bordered Listen control. Whole row remains one accessible link.
- Blurred artwork is default for new/unconfigured links. Explicit cinematic and black choices remain available and are preserved.
- No decorative arrows, fabricated platform links, pre-saves or extra image generation for implementation.

## Current refinement
- Renderer: links/release-view.mjs. Public layout/styles: links/release.css. Matching creator preview: links/dashboard.css.
- Creator HTML/JS and listen HTML/JS receive fresh module/style query versions 20261030-refined1.
- Default background change only: lab-worker/music-links.mjs, frontend defaults, existing background round-trip tests.
- Worker feature marker music-links-20261030-v3; deploy workflow verifies that marker. No new schema migration.
- 32 focused music-links/auth tests passed. Default blur, explicit artwork/black, old-client omission and stale-save safeguards checked.
- Local browser: phone 390x844 body width/scrollWidth 390px; desktop body 1363px with 460px sharp cover and no overflow.
- Creator: 225px preview cover, all three modes checked; black has zero background images; three-platform preview fits 328px width.
- Syntax/whitespace passed. Pages run 41054184749 succeeded; seven changed frontend assets match exact committed bytes.
- Worker run 41054185064 deployed successfully (version ee7af2c5-2fbf-4be0-a237-28b70263d665), but immediate feature check still saw v2.
- Actual browser subsequently verified ready:true/music-links-20261030-v3 and Sube JSON background:blur; live page shows refined layout and real Spotify link.
- Follow-up gate retries revision mismatches during Cloudflare rollout. This fixes the observed false failure without changing application code.

## Existing implementation
- Owner /links/ uses existing Clerk with server-verified OWNER_DB role. Public /listen/?release=slug works on static hosting.
- Title, artist, catalogue, date, description, artwork, MP3, links, publication and pixel override. Stable saved slugs and optimistic revisions.
- Draft/published/archived. Artwork up to 6MB, MP3 up to 12MB; isolated public music-links R2 namespace and media byte ranges.
- Pixel 1746851780072706 matches label/prior Hypeddit music setup; separate PV LAB pixel untouched.
- Default custom click event Hypeddit Smart Link Click preserves artist, track and music_service; optional MusicLinkClick.
- Meta PageView/ViewContent/clicks require explicit consent. Decline/withdrawal preserve listening. Events Manager attribution is unobserved.
- Anonymous aggregate page loads/clicks, date ranges and platform/source/campaign reports. Not unique listeners or confirmed streams.
- Deduplicated UUID receipts; hourly HMAC rate limits store no raw IP/ad identifiers. Daily short-lived receipt/rate-limit pruning.
- Migration 0045 seeds verified Stay Low/SoundCloud; Sube originally draft. Owner has since published Sube with Spotify, verified in browser.
- Idempotent 0046 creates music_link_designs. Release/design writes share one atomic D1 batch and revision guard; old clients preserve choices.
- Canonical shared module in lab-worker/music-links-shared.mjs; links/shared.mjs re-exports it for sparse-checkout compatibility.

## Verified previous publication
- PR #674: Pages run 41051220771 and Worker run 41051221193 / job 124047472352 succeeded, including migration 0046 and v2 readiness.
- Eight frontend assets matched exact committed bytes; actual Sube loaded artwork/Spotify without horizontal overflow.
- Original 146 music/auth/Worker/owner/traffic tests passed, including save rollback. No production owner token used in fixture QA.
- Dashboard PR #673: Pages run 41048180330 and exact HTML/CSS/JS verified. Actual owner gate loads correctly while signed out.
- Original Meta browser check: no scripts before consent, scripts loaded after Allow Meta, decline afterward preserved listening.

## Links / next action
- Dashboard: https://parallelvisionlabel.com/links/ ; Sube: https://parallelvisionlabel.com/listen/?release=sube .
- Refinement is live. In Meta use Pixel 1746851780072706, event Hypeddit Smart Link Click, with music_service equals spotify for a Spotify custom conversion.
- Owner edits background under Artwork & sound > Page background, then saves. Explicit existing choices are not overwritten.
- No CAPI, historical Hypeddit import, pre-save, automatic metadata import or server-rendered per-link social cards.
- Hypeddit URL-restricted conversions require label-domain rules in Meta. Script loading does not prove ad attribution.
- Direct executor workers.dev requests previously hit Cloudflare 1010; use production workflow checks and actual frontend browser.
- Local dist/, fixture modules and .openai preview config are excluded from Git and must not ship.
