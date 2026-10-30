# Parallel Vision Smart Links: current state
Updated: 2026-10-30
Repository: parallelvisionberlin/parallelvisionberlin.github.io
Feature baseline: d336368 (PR #671); white dashboard 9245740 (PR #673).
Published visual correction: c0349a9 (PR #677), included in successful Pages run 41057895772 at 9e1e617.
Tracking correction: 5ad5fe6365228ac27186d36adb5fdd58f995f2bb (PR #678), independent MusicLinkClick, existing label pixel and consent preserved.

## Approved direction
- Smart Links is placed inside the existing Parallel Vision account menu below Profile for both signed-in owner and public accounts; no new main-navigation item. Public creator access is enabled by the current account-isolation update described below. Browser fixture QA: 390px public menu and 1363px owner menu without horizontal overflow. Published 3a4dd059; Pages run 41074364007 succeeded, full live homepage exact match. Static-site and Smart Links CI checks passed. Browser QA used isolated owner/public menu fixtures, not production sign-in; fixtures do not ship. Local full verifier could not run against missing sparse-checkout assets.
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
- Visual correction did not change tracking. Current backend advances to music-links-20261030-v5 for account workspaces.
- Browser QA: phone body width/scrollWidth 390px and height 844px; desktop widths 1363px and 1920px fit without horizontal overflow.
- Desktop 1920x900 fixture fits without vertical overflow. Existing real artwork and Spotify destination unchanged.
- Visual correction verified live: four HTML/CSS assets exact, actual Sube screenshot and body width/scrollWidth 1363px. Screenshot: sube-reference-correction-live-20261030.jpg.
- Prior refinement e354fff deployed: Pages run 41054184749, seven frontend assets exact; v3 readiness verified in actual browser.
- Worker gate propagation fix c1f12ec verified by run 41055303256 / job 124061208029 success.

## Existing implementation
- /links/ uses existing Parallel Vision Clerk with server-verified signature, issuer and origin. Owners retain label data; public accounts get isolated workspaces. Public /listen/?release=slug works on static hosting.
- Title, artist, catalogue, date, description, artwork, MP3, links, publication and pixel override. Stable saved slugs and optimistic revisions.
- Draft/published/archived. Artwork up to 6MB, MP3 up to 12MB; isolated public music-links R2 namespace and media byte ranges.
- Pixel 1746851780072706 matches label/prior Hypeddit music setup; separate PV LAB pixel untouched.
- Custom click event MusicLinkClick preserves artist, track and music_service. Migration 0047 replaces legacy name once, preserving pixel and advancing settings revision.
- Meta target: create Parallel Vision – Spotify Click custom conversion on ParallelVision_Music_Pixel, MusicLinkClick filtered by music_service equals spotify.
- Dashboard no longer offers the legacy event. No Hypeddit service dependency exists.
- Owner explicitly requested no automatic cookie prompt, Pixel active by default. Explicit saved denied remains honored; manual Tracking settings can disable/re-enable. No consent choice is fabricated or stored for a new visitor. Meta Test Events receipt is now confirmed by owner screenshot; ad attribution remains unobserved.
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
- Meta receipt confirmed 30 Oct: owner screenshot image(20261030-140917).png, libfile_b27c7f69d0a88191b3e96f356c7332dc shows MusicLinkClick, View content and PageView Processed via Browser on ParallelVision_Music_Pixel 1746851780072706, source parallelvisionlabel.com. Event parameters are collapsed and not yet visually verified.
- Next: expand MusicLinkClick and verify music_service=spotify, then create/select the Spotify custom conversion. Test receipt does not establish ad attribution or selector availability.
- Current update: remove automatic prompt, enable Pixel by default except saved opt-outs; keep manual Tracking settings and truthful privacy disclosure. Published 8696dd8; Pages run 41068308536 succeeded. Three public runtime files exact; actual Sube page loads auto1 module with notice hidden. 34 music/auth tests passed.
- One QA Spotify click made with consent enabled on 30 Oct, then consent declined again. Do not count that click as an acquired listener.
- Direct executor workers.dev requests previously hit Cloudflare 1010; use production workflow checks and actual frontend browser.
- Local dist/, fixture modules and .openai preview config are excluded from Git and must not ship.

## Public account fix, 30 October
- Root cause: menu linked public accounts to the owner-only API; signed-in failures left an irrelevant Sign in gate.
- Regular Parallel Vision sessions now use verified Clerk subject for their own workspace, without Lab signup, wallets or credits.
- Releases, all report queries, edits, tracking settings and upload quotas are scoped by account. Owners retain existing label records/settings and cannot edit customer links through the label workspace.
- Migration 0048 creates per-account settings and indexes, applied before Worker deploy. Customer pixels start blank; label Pixel remains unchanged. Public listener resolves the correct workspace pixel.
- Signed-in loading hides the Sign in gate. Request failures offer Retry. New smart link opens the existing creator after successful workspace load. Sidebar returns to Parallel Vision.
- Checks: 35 music/session tests and all 107 Worker tests pass. Includes two-account isolation, publication/edit, pixel/report separation, real RSA signature verification, expired/forged tokens and rejected cross-domain tokens. No Lab wallet is created.
- Browser fixture checks use actual dashboard code with simulated Clerk/API only: signed-in account, New smart link, save draft, sign out and sign back in passed. No production user credentials used.
- Published 9b3d95ea1c6dbfd27db12d2476e6bfb47dbd7a6f. Worker run 41077105268 and Pages run 41077102822 succeeded. Static-site and Smart Links CI passed. All three changed static runtime assets match production exactly.
- Live browser: actual /links/ loads new account copy/sidebar and Sign in opens Parallel Vision Clerk modal (Google/email). Actual Sube API returns v5 with existing Spotify destination, label Pixel 1746851780072706 and MusicLinkClick preserved.
- Browser fixture: phone workspace and creator have no horizontal overflow, desktop New/save draft/sign-out/sign-in work. Screenshot smart-links-public-creator-check-20261030.jpg is fixture QA, not an authenticated production account.
- Actual signed-in production customer creation was not exercised because no customer credential was used. Signed RSA customer requests, tenant CRUD and reports were verified in tests; owner should refresh their already-signed-in /links/ page.

## Expanded analytics, 30 October
- Base a76cfcf, preserves unrelated Robin partner work. Adds 0050 music analytics migration, module and deployment v6 readiness marker.
- Captures server-derived approximate country/region/city, UA category only, source/medium/campaign/content/term, UTC hour, preview plays and grouped click delay. No GPS, raw IP/UA, persistent visitor IDs or fabricated historical locations.
- Additive hourly aggregates preserve existing counts. Receipts deduplicate retries; pruning clears receipts after two days and keeps aggregates. Per-account and selected-release predicates apply to all reports.
- Performance adds release/timeline controls, bar chart with accessible table, geography, device/browser/OS, ad tags, preview count and click timing. Detail tables top 100 groups; timelines 90-day maximum.
- Meta event and label/customer pixels remain unchanged. Meta spend/CPA requires a separate connection and is not claimed.
- Checks: 36 music/session tests, 107 full Worker tests pass. New test covers geography spoof resistance, retry dedupe, previews, per-release filtering, cross-account isolation and pruning.
- Browser: actual dashboard code with simulated account/API, phone 390px iframe (body375px with scrollbar, no horizontal overflow), release and hourly controls work. Desktop 1363px also fits without horizontal overflow. Published fa1291c with all-time correction 09bdd95f998523d26e5d3afd24677304fa1bc516. Worker run 41094415793 and Pages run 41094414815 succeeded. All six changed public assets match production exactly. Actual browser status reports ready:true, music-links-20261030-v6. Fixture data does not ship.

- Final checks: 143 tests passed; all-time country totals remain available while hourly detail is bounded. Live customer reports were not opened with production credentials; account isolation, metadata capture and reports verified through real SQLite and signed-token tests. Existing label Pixel/MusicLinkClick retained. New dimensions collect forward only.

## Tracking reliability audit, 30 October
- Owner screenshot shows 43 loads, 11 clicks, 25.6%; arithmetic is correct but does not prove attribution or completeness. Metrics include repeat loads/clicks and QA, not unique listeners. No production owner dashboard credentials used.
- Live Sube API verified label Pixel 1746851780072706, MusicLinkClick, Spotify destination intact (v6 before patch). Meta reporting comparison blocked by Windsor's explicit invalidated Facebook access-token response for account 1306824064955575. Does not prove a Pixel failure.
- Confirmed code gap: sendBeacon queue acceptance was treated as completion with no acknowledgement or retry; fetch fallback errors were swallowed. No claim that this caused the screenshot's totals.
- New in-memory transport uses acknowledged keepalive fetch, up to three attempts with identical event UUID/body, plus pending pagehide beacon. No persistent visitor identifier. Permanent failures stop; failures reported in console.
- Server now recognizes existing analytics receipts before applying rate limit, avoiding retry quota consumption; rate limit returns explicit 429 instead of indistinguishable 204. Meta event sending unchanged. Version v7.
- 39 music/session/transport tests plus 107 Worker tests passed, including identical-payload retry, permanent failure, bounded attempts, unload fallback, SQL dedup and duplicate quota behavior. Published b5ed2c63df4e2d4c6fef19b404e68b57209a4f94. Worker run 41097748605 succeeded. Its Pages run was superseded by newer main 4f1d023; Pages run 41098026262 succeeded with unchanged tracking files. Actual Sube API reports v7 and the same Pixel/event. Three frontend delivery assets match production exactly. Full historical count reconciliation remains blocked by Meta reporting authorization.

## Mobile listening CTA, 30 October
- Reference: IMG_8242.jpeg (current) and IMG_8243.jpeg (Hypeddit). Preserve existing blurred background exactly.
- Phone: cover up to 330px, compact 26px title/18px artist, reduced top spacing, hide catalogue/helper copy to bring Listen above the fold. Desktop composition preserved.
- Spotify: compact green identity left with white icon curves, prominent bordered Listen control right (132x50 phone, 140x50 desktop), whole row remains one accessible link.
- Instagram circle below platform rows points to the verified existing homepage destination https://www.instagram.com/parallelvision.label/. It does not emit MusicLinkClick or inflate platform conversions. Creator preview mirrors CTA.
- Checks: 23 music/transport tests passed, syntax and diff checks passed. Browser fixture: 390x844 phone and 1363px desktop, no horizontal overflow, real Sube artwork. Preview never ships.
- Files: links/release.css, release-view.mjs, dashboard.css/mjs/index.html; listen/index.html and listen.mjs cache updates. Background and tracking delivery/event logic unchanged.
- Publication pending.
