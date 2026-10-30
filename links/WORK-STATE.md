# Parallel Vision Smart Links: current state
Updated: 2026-10-30
Repository: parallelvisionberlin/parallelvisionberlin.github.io
Feature baseline: d336368 (PR #671); white dashboard 9245740 (PR #673).
Published visual correction: c0349a9 (PR #677), included in successful Pages run 41057895772 at 9e1e617.
Tracking correction: 5ad5fe6365228ac27186d36adb5fdd58f995f2bb (PR #678), independent MusicLinkClick, existing label pixel and consent preserved.

## Approved direction
- Private dashboard: white/black/cool grey, permanent sidebar, compact medium artwork rows, prominent metrics. Only Spotify, SoundCloud, YouTube.
- Public target: artwork-first refinement exec-730d0f3b-081e-4845-8ec2-898a49b9378a.png, re-supplied as libfile_a8746d7ea8b48191b6360f9930e777e8.
- User rejected the live 62px blur and undersized composition; preserve visible blue/red light shapes and match target proportions.
- Large sharp cover left, smaller title/artist and listening links grouped right; centred composition. Phone stacks artwork above details.
- Spotify row: green brand identity on white, separate bordered Listen control. Whole row remains one accessible link.
- Blurred artwork is default for new/unconfigured links. Explicit cinematic and black choices remain available and are preserved.
- No decorative arrows, fabricated platform links, pre-saves or extra image generation for implementation.

## Current visual correction
- CSS-only: release.css blur reduced 62px to 18px desktop and 38px to 14px phone, lighter dark overlay, saturation restored.
- Background uses the same artwork, cropped to its photographic area; full cover remains sharp and complete in front.
- Desktop columns grow up to 600/620px with larger title/artist; phone cover up to 310px. Existing Spotify row preserved.
- Creator preview uses matching lighter blur and larger mobile proportions. Entry HTML cache queries updated to 20261030-match1.
- Visual correction did not change tracking. Current tracking update advances backend to music-links-20261030-v4.
- Browser QA: phone body width/scrollWidth 390px and height 844px; desktop widths 1363px and 1920px fit without horizontal overflow.
- Desktop 1920x900 fixture fits without vertical overflow. Existing real artwork and Spotify destination unchanged.
- Visual correction verified live: four HTML/CSS assets exact, actual Sube screenshot and body width/scrollWidth 1363px. Screenshot: sube-reference-correction-live-20261030.jpg.
- Prior refinement e354fff deployed: Pages run 41054184749, seven frontend assets exact; v3 readiness verified in actual browser.
- Worker gate propagation fix c1f12ec verified by run 41055303256 / job 124061208029 success.

## Existing implementation
- Owner /links/ uses existing Clerk with server-verified OWNER_DB role. Public /listen/?release=slug works on static hosting.
- Title, artist, catalogue, date, description, artwork, MP3, links, publication and pixel override. Stable saved slugs and optimistic revisions.
- Draft/published/archived. Artwork up to 6MB, MP3 up to 12MB; isolated public music-links R2 namespace and media byte ranges.
- Pixel 1746851780072706 matches label/prior Hypeddit music setup; separate PV LAB pixel untouched.
- Custom click event MusicLinkClick preserves artist, track and music_service. Migration 0047 replaces legacy name once, preserving pixel and advancing settings revision.
- Meta target: create Parallel Vision – Spotify Click custom conversion on ParallelVision_Music_Pixel, MusicLinkClick filtered by music_service equals spotify.
- Dashboard no longer offers the legacy event. No Hypeddit service dependency exists.
- Owner explicitly requested no automatic cookie prompt, Pixel active by default. Explicit saved denied remains honored; manual Tracking settings can disable/re-enable. No consent choice is fabricated or stored for a new visitor. Meta receipt/attribution remains unobserved.
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
- Event correction live: Worker run 41059431989 / job 124075149204 succeeded; Pages run 41059430809 succeeded.
- Five runtime assets matched exact source bytes. Public Sube API reports MusicLinkClick, pixel 1746851780072706, v4; actual listening page still loads.
- 34 current music/auth tests passed, including default-on without fabricated saved consent, opt-out/re-enable and preserved previous rejection.
- Owner edits background under Artwork & sound > Page background, then saves. Explicit existing choices are not overwritten.
- No CAPI, historical Hypeddit import, pre-save, automatic metadata import or server-rendered per-link social cards.
- Current blocker: user screenshots show MusicLinkClick absent in Meta selector. Website configuration is verified; Meta receipt is NOT verified. Next: Events Manager Test events before creating conversion.
- Current update: remove automatic prompt, enable Pixel by default except saved opt-outs; keep manual Tracking settings and truthful privacy disclosure. Published 8696dd8; Pages run 41068308536 succeeded. Three public runtime files exact; actual Sube page loads auto1 module with notice hidden. 34 music/auth tests passed.
- One QA Spotify click made with consent enabled on 30 Oct, then consent declined again. Do not count that click as an acquired listener.
- Direct executor workers.dev requests previously hit Cloudflare 1010; use production workflow checks and actual frontend browser.
- Local dist/, fixture modules and .openai preview config are excluded from Git and must not ship.
