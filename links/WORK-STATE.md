# Parallel Vision Smart Links: current state
Updated: 2026-10-30
Objective: replace Hypeddit page creation and Meta click tracking on the existing label website.
Repository: parallelvisionberlin/parallelvisionberlin.github.io
Published feature: d33636878743b52602a1d263331746fa25458565 (PR #671); initial deployment record 87dedd6.
Published white dashboard: 9245740 (PR #673); After Dark and saved backgrounds: 99f443826ca4641c87c0819cc736e4b52e968ecb (PR #674).

## Approved design and scope
- White/black/cool-grey Smart Links dashboard, permanent left navigation; no orange interface accent.
- Compact full-width rows with 144px desktop artwork (100px phones), prominent top metrics, black controls.
- Approved reference: exec-0dccd0cb-3a18-48df-8349-609c2005bf51.png. Use actual catalogue artwork and configured platform links.
- Sidebar opens working Smart Links, Performance, Tracking and Settings views; mobile navigation moves above content.
- Smart Links replaces Releases in workspace navigation/actions. No decorative arrows.
- Only Spotify, SoundCloud and YouTube; pre-saves deferred.
- Public landing page approved: proposal 03 After Dark, with per-link cinematic artwork, blurred artwork or solid black background.
- Approved landing reference: exec-6ebba67a-d71a-4c69-87b9-20f82f061253.png; attached reference libfile_41bedebeb9e481919955f5f62c04cc2a.

## Implemented behavior
- Owner /links/ reuses Parallel Vision Clerk and server-verified OWNER_DB role; public /listen/?release=slug uses existing static hosting.
- Creator supports title, artist, catalogue, date, description, artwork, MP3, platforms, publication and pixel override.
- Draft/published/archived; immutable saved slugs; optimistic revisions prevent stale-tab overwrites.
- Artwork up to 6MB, MP3 up to 12MB, isolated music-links R2 namespace, public media URLs, byte ranges, 500MB workspace cap.
- Pixel 1746851780072706 matches label and previous Hypeddit music setup; PV LAB Pixel untouched.
- Default custom event Hypeddit Smart Link Click preserves artist, track and music_service; optional MusicLinkClick for new campaigns.
- Meta PageView/ViewContent/clicks require explicit consent. Decline/withdrawal preserve music access.
- Anonymous page loads/clicks, 7/30/90/all-time totals, platform/source/campaign reports. Not unique listeners or streams.
- UUID receipts deduplicate SQL aggregates; hourly HMAC rate limit stores no raw IP/ad identifiers. Daily receipt/rate-limit pruning.
- Idempotent migration 0045 is in Worker deployment. Stay Low published with verified SoundCloud URL; Sube draft has artwork only.
- Runtime: links/, listen/, lab-worker/music-links.mjs, music-links-shared.mjs, worker routing/maintenance, migration 0045.
- Shared code lives within lab-worker for sparse CI checkouts; links/shared.mjs re-exports it.

## Current landing-page update
- After Dark layout: full-screen cover backdrop, sharp cover, bold title/artist and platform-icon listening dock; phone links stack.
- Creator: Page background under Artwork & sound, live preview, persisted per-link choice. Existing links default to cinematic artwork.
- Renderer and styles: links/release-view.mjs, release.css, dashboard.css; creator HTML/JS and listen module cache versions refreshed.
- Backend: music-links.mjs and shared constants; idempotent migration 0046 stores designs separately. Workflow applies migration before Worker deploy.
- Atomic create/update, revision protection, legacy omission preservation and invalid-background rejection tested.
- 146 focused music/auth/Worker/owner/traffic tests passed. JS syntax and whitespace checks passed.
- Browser fixture QA: phone public body width/scrollWidth 390px, creator dialog 375px; desktop body 1363px, no horizontal overflow.
- UI verified blur/black live preview, black has no background image, save and reopen preserve selection; sharp artwork and platform links remain.
- PR #674 merged; Pages run 41051220771 and Worker run 41051221193 / job 124047472352 succeeded, including migration 0046 and v2 readiness.
- Eight live frontend assets returned 200 with exact committed bytes. Actual Sube page loaded cinematic artwork and owner-saved Spotify destination without overflow.
- Relevant candidate checks passed; the separate video job was still running when checked after merge. No completed video pass claimed.
- Dashboard PR #673 already live at 9245740; Pages run 41048180330 and exact dashboard HTML/CSS/JS verified.

## Verified original deployment
- PR #671 frontend GitHub Pages run 41043602513 succeeded; six core frontend assets matched exact expected SHA256, JS MIME valid.
- Worker run 41043602986 / job 124022121393 succeeded with migration 0045 and production health checks.
- Worker version 2af2044f-c747-4124-b970-be71a3415d07; /health musicLinks and public status revision music-links-20261030-v1, ready:true.
- Actual browser: owner gate/Clerk loaded, public Stay Low loaded D1 data, 900px artwork and verified SoundCloud destination.
- Meta scripts absent before consent, loaded after Allow Meta; privacy decline afterwards preserved music access.
- Original feature validation: 144 focused tests passed. Relevant release/static/security/partner/image/safety CI passed.
- No production owner token used for QA; real owner create/upload/save not exercised by agent. User later supplied working owner screenshot.

## Limits and next action
- Dashboard: https://parallelvisionlabel.com/links/ ; public example: https://parallelvisionlabel.com/listen/?release=stay-low .
- After Dark is live. In /links/, edit a smart link, then Artwork & sound > Page background; save to apply its selection.
- Meta Events Manager receipt/attribution remains unobserved; script loading does not prove attribution.
- Hypeddit URL-restricted custom conversions require label-domain rules in Meta. Browser Pixel only, no CAPI.
- No historical Hypeddit import, pre-save, auto metadata import or server-rendered per-link social cards.
- Python workers.dev requests hit Cloudflare 1010 in executor; verified original health through deployment workflow and browser frontend.
- Local dist/fixture auth/request mocks and .openai preview config are excluded from Git and must never ship.
