# House After Dark Meta Ads cutover prepared, paused (20 Nov 2026)

- **All paid delivery remains paused** after the user's explicit authorization to migrate the two ad sets without activating budget. Meta confirmed the legacy campaign, both original ad sets, both replacement ad sets and four replacement ads are paused. No campaign, ad set or ad was enabled.
- Meta Events Manager screenshot verified `MusicLinkClick` processed by pixel `1746851780072706` from browser. Existing active custom conversion `Parallel Vision – Spotify Click` (`1756394412122237`) filters `MusicLinkClick` and `music_service=spotify`. Do **not** create a duplicate.
- Meta rejected direct conversion changes to published ad sets (error 3260011). Two **new paused** ad sets were created under the existing paused playlist campaign, preserving original targeting and the verified regional advertiser identities, with an additional Explore placement required by Meta.
- Four replacement ads were created paused: one previously valid Parallel Vision RAVE creative reused in Tier One and Tier Two, plus two paused recreated video ads (original video, headline, caption and CTA) pointing to `/house-after-dark/` with campaign UTMs. The reused RAVE creative retains the working long `/listen/?release=house-after-dark` URL and its original post media.
- Old ad sets, including the ads linking to Hypeddit and their obsolete `Hypeddit Smart Link Click` conversion, remain saved for history but **PAUSED**. Do not resume them with the new set. The replacement ad sets and ads must be enabled deliberately when launching.
- Meta confirmed each create/pause request. Windsor's Free plan did not permit `force_refresh` and cached insights exclude zero-delivery new ads; no independent ad preview/review or performance result was claimed. No spend or conversion result can be attributed to the new ads before they run.
- User-approved design and both existing House After Dark landing URLs remain unchanged by this ad migration. D1 production audit independently confirmed Meta-sourced traffic, direct visits and music-platform clicks are recorded and counts reconcile.
- Follow-up before spend: preview newly created ads and verify destination/copy on each placement, check any Meta review warnings, then launch chosen replacement ad sets with a controlled budget; leave legacy ad sets paused. Future automatic clean paths for new releases remain a separate infrastructure task, not completed by this ad migration.

---

# Smart Links editorial copy and Meta tracking verification status (20 Nov 2026)

- User approved restrained visual refinements, **not** a change of page layout. The 2-column desktop artwork/CTA design and original mobile presentation are locked.
- PR [#1080](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/1080), merge `77b3c3ca2a93264d63f1f8fbb4d4d5750123f4ac`: desktop title `clamp(36px,3.1vw,54px)`; secondary artist/curator line `clamp(18px,1.5vw,24px)`; remove repeated exact `Curated by <artist>` phrase from displayed playlist description, without editing saved text.
- Changed `links/release-view.mjs`, `links/release.css`, `links/index.html`, `listen/index.html`, `house-after-dark/index.html`, `tests/music-links.test.mjs`. Pixel configuration, tracking logic, paid campaigns, backend/Worker/D1, PV LAB, and short alias remain unchanged.
- Existing `MusicLinkClick` browser event fired via `fbq('trackSingleCustom', pixelId, clickEvent, metadata)` from `listen/listen.mjs` when the user follows a platform link. Unit test now checks actual pixel `1746851780072706`, custom event name `MusicLinkClick`, Spotify service and content ID; CI `Parallel Vision release links`, `Validate static site`, `PV LAB approved Image UI contract` passed.
- GitHub Pages production deployment: run `44748256093` completed successfully. This confirms publishing, not live browser interactions.
- Direct **Meta Events Manager receipt is NOT verified**. Connected Windsor.ai Meta Ads data is ad-attributed, not a raw pixel Test Events feed. On Nov 16–20 the still-ACTIVE legacy `PLAYLIST HOUSE  + TIER TWO` campaign spent €4.82, 18 attributed link clicks, 0 landing page views and 0 custom pixel conversions. No campaign was paused/changed, and these figures do not prove raw events did not arrive. Live confirmation requires authorized Meta Events Manager Test Events access and a real Spotify click (browser tracker not blocked).
- Both House After Dark URLs remain usable: `/listen/?release=house-after-dark` and `/house-after-dark/`; the shorter one is shown by the dashboard for that playlist.
- Future fully automatic vanity URLs like `/come-back/` are **not** implemented. GitHub Pages is a static host and the creator stores releases in the Worker/D1; no authorized custom-domain dynamic routing or secure write-to-GitHub webhook is available. Do not create arbitrary 404-based routes for paid advertising, since they may be rejected by Meta. Avoid guessing that saved links will automatically have root vanity paths.
- Follow-ups (requires access or explicit scope): (1) observe `MusicLinkClick` in Meta Events Manager Test Events and configure conversion for Spotify clicks to House After Dark; (2) pause or replace old Hypeddit-targeted campaign only with explicit user authorization; (3) implement dynamic pretty-path routing using an authorized Cloudflare zone/edge route or approved hosting migration; (4) separately assess EU tracking consent (existing page defaults to marketing measurement unless user opts out).

---

# Restore approved House After Dark desktop + artwork loading fix (20 Nov 2026)

- User clarified the only requested change was a practical short URL, **not** a desktop redesign. The compact vertical page introduced in PR #1078 was unapproved; original desktop two-column art/text layout is locked reference (user screenshot image 3).
- Restored the original desktop layout by removing exactly the playlist-specific stacked CSS overrides in `links/release.css`. Preserved existing approved CTA, Instagram icon sizing, mobile response, playlist identification and visual background.
- Retained the physical `https://parallelvisionlabel.com/house-after-dark/` public page and original `/listen/?release=house-after-dark` route. Both share the same record, statistics and click event handling.
- Fixed initial empty artwork/oversized first paint by making both public pages display a minimal loading state until artwork decodes, then rendering the full layout atomically. Record a PageView immediately after release fetch, before waiting on the image; failed images fall back to the existing PV placeholder.
- PR [#1079](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/1079) merged, commit `b687f4287d01d5aea7dcb8bab0413ab5a22b381b`.
- Changed: `links/release.css`, `listen/listen.mjs`, `listen/index.html`, `house-after-dark/index.html`, `tests/music-links.test.mjs`.
- Verified: PR CI Parallel Vision release links, Validate static site, PV LAB approved Image UI contract all succeeded. Test verifies artwork decoding precedes render, desktop grid intact, both pages start in loading state. Pages deployment `44739835009` must be separately checked; no independently authenticated live browser audit was available.
- Still pending for advertising: verify actual Meta Test Events and music-link click attribution before resuming ad spend. Do not change paid Meta campaigns without separate evidence.

---

# House After Dark public landing and clean campaign URL (20 November 2026)

- User rejected the appearance and share URL of the newly published House After Dark landing. The preview was compact and vertical while the public desktop CSS rendered a huge two-column layout with a title up to 128px.
- PR [#1078](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/1078) merged as `c74cac99227729c310515f1db7785e6ca3bd7b6f`. Scope: public landing + exact House After Dark vanity route; no Worker, D1, credentials, customer records, billing or paid ads changed.
- Added a static `/house-after-dark/` HTTP-success page loading the same existing public music-link record, `MusicLinkClick` event, campaign UTM tracking and Meta pixel. The legacy `/listen/?release=house-after-dark` link remains supported.
- Updated dashboard title, Open, Copy link and after-save URL to use the short route for House After Dark; other link URLs remain unchanged.
- Scoped new vertically stacked, artwork-centered styling to public playlist pages, retaining prior visual references and making CTA layout match editor. Releases and backend tracking remain unchanged.
- Compatibility: legacy releases with no catalogue/date and one direct Spotify playlist destination are recognized as playlists in the UI; future edits can migrate them to the explicit catalogue marker. Does not mutate stored data.
- PR checks passed: Parallel Vision release links, Validate static site, PV LAB approved Image UI contract. Regression test covers short alias, music API request, canonical, Meta event, source and UTM campaign.
- Deployment: GitHub Pages workflow `44738480621`; final status must be verified separately before claiming live publication. An authenticated real browser check of the public landing was not available through current tools.
- Note: only this playlist has the new physical vanity path; automatic clean routes for all future smart links are not yet implemented and must not be advertised as available.

---

# Smart Links Pixel and playlist layout refinement (20 November 2026)

- Owner screenshot revealed the creator's optional `Pixel override` field was confusing and browser-native pattern validation blocked submit. The workspace music pixel `1746851780072706` already exists; do not require re-entry per release.
- Implemented a visible `Meta Pixel` status row that inherits the workspace pixel automatically, plus a collapsed `Use a different pixel for this smart link` control for exceptional per-link overrides.
- Removed browser-native pattern validation only from the creator's optional per-link pixel input; strip pasted whitespace / zero-width characters and validate optional digits (8–20) in the creator with a clear error. Server validation and workspace Tracking settings remain intact.
- Reduced Instagram circle to 32px and glyph to 16px. Increased gap before the Spotify call to action for single-destination pages, with additional playlist-only spacing, on phone and desktop. Other multi-platform release layouts retain compact spacing.
- PR https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/1076 merged as `197929981f7a0e493e68492fa7d53b68042db47e`; music-link, static-site and PV LAB image-UI checks passed. GitHub Pages build/deploy `44734261636` completed successfully.
- Files: `links/index.html`, `links/dashboard.mjs`, `links/dashboard.css`, `links/release-view.mjs`, `links/release.css`, `listen/index.html`, `tests/music-links.test.mjs`.
- Verification: source merged and Pages deployment succeeded. Authenticated creator save and published live pixel attribution not independently tested. The public crawler may return older cached HTML; do not misrepresent cached content as current or claim a live signed-in save.
- Next: reload the existing creator, keep the inherited Parallel Vision pixel, publish the House After Dark playlist using its direct Spotify link, and validate Meta Test Events before restarting ad spend.

---

# Smart Links: releases + Spotify playlists (20 November 2026)

- Owner request: select **Music release** or **Spotify playlist** in the existing Smart Link Creator, retaining the approved white workspace and dark public landing design.
- Implemented: selector, release/playlist-specific titles and labels, curator instead of artist on playlists, no catalogue/date/MP3/pre-save for playlists, Spotify-only destination, preview/public copy and direct playlist URL validation.
- Existing releases remain unchanged; no Worker/D1/Stripe/PV LAB changes. Playlist classification persists via reserved `catalogue='__PV_PLAYLIST__'` in the existing music link API. The UI hides this technical token. Future schema work could promote it to an explicit column; do not remove or repurpose without data migration.
- Existing browser `MusicLinkClick` analytics and workspace music Pixel are preserved. Counts are outbound playlist clicks, not confirmed Spotify followers/saves/streams.
- PR: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/1075, squash merge `b2e6fe080828aabbcdfd4b11034c2d1730998fd0`.
- PR checks: Parallel Vision release links, Validate static site and PV LAB approved Image UI contract all passed. GitHub Pages build/deploy job `44732113059` completed successfully.
- A new test covers playlist create, public lookup and edit persistence. Authenticated live creator save and Meta Events attribution were **not** exercised; public web crawler showed a stale page during post-deploy check, so do not claim a verified live customer flow.
- Next: owner reloads `https://parallelvisionlabel.com/links/`, creates House After Dark using a direct Spotify playlist URL, verifies published link and tests Meta custom conversion before ads.

---

# Layout correction: 3 November 2026

- Owner reference: third screenshot image(20261103-114516).png, libfile_7f4d6eae273081918950757d00494e24.
- Baseline: 2196460e1ee47bc857b62488097a1d2d5104c290.
- Restore original Smart Links list: remove filter-summary text/reset row, explanatory Performance banner and fourth row button.
- Sidebar restored to Smart Links, Performance, Tracking, Settings.
- Keep detailed analytics under Performance. Custom dates and Reset are scoped there.
- Notes & changes is a collapsed section inside Performance, with plain form labels and no instructional side panel.
- Old #experiments addresses resolve to Performance and open Notes & changes. Existing notes remain available.
- Returning to Smart Links clears Performance-only release/source/custom-date filters so list counts are not silently scoped.
- Pre-save options, public listening pages, destinations, MusicLinkClick, backend and data are untouched.
- Files: links/index.html, dashboard.css, dashboard.mjs, workspace-tools.mjs.
- 46 music/auth/transport tests and syntax/whitespace checks passed. Desktop fixture verified original list structure and notes toggle.
- Published PR #807, merge f6135fb7edf84c764f2e0864fcbb78fca3c49f59. Pages run 41631070581 succeeded at b003620d50dfefc4ead02bbc04da39bceab0fa9a; the later commit changes only the unrelated owner handoff.
- All four changed runtime assets match source exactly on parallelvisionlabel.com. Live signed-out browser shows the original four-item navigation.
- Phone fixture: body width/scrollWidth 375px; desktop restored list and optional notes verified. Old #experiments redirect verified.
- No backend, saved notes, pre-save settings or tracking changes. Owner should reload /links/#smart-links.

---

# Current Smart Links work: 3 November 2026

- User requested integration into the existing `/links/` workspace, retaining its current white design.
- Baseline: `1d1cf59f8fd289642a95dedcb714971173d7547f`; changes on `codex/smart-links-presave-workspace`.
- Standalone Sites prototype is separate and is not the production tracker or data source.
- Existing geography/device/browser/OS/ad-tag/preview/click-delay reports were already present in Performance.
- Added direct Performance shortcut and per-release report actions, without changing public destinations.
- Added UTC custom dates and traffic-source filter across totals, timelines and all detailed reports.
- Added release/campaign comparison tables and report JSON export.
- Added private, account-scoped experiment log with update revisions, frozen report snapshots and export.
- Added pre-save provider URL/display controls and matching shared public/creator renderer.
- Modes: Off, Before release (switch at 00:00 UTC), Always alongside listening links.
- Existing Spotify, SoundCloud and YouTube URLs, label Pixel and MusicLinkClick are preserved.
- Pre-save clicks are separate provider redirects; they do not count as confirmed saves or MusicLinkClick.
- No native Spotify OAuth, email subscriber capture or save scheduler is implemented. A working provider URL is required.
- Listening links must be added before release day. Without them the post-release page says links are coming soon.
- New matched visit/first-listening-click aggregates provide forward-only no-click measurement.
- In-memory page UUIDs are not persistent visitor IDs. Both network arrival orders deduplicate correctly.
- Raw aggregate visits/clicks retain their original meaning. They are not unique people or confirmed streams.
- Existing historical location and outcome gaps are not backfilled. Age is explicitly unavailable.
- Additive migration: `lab-worker/migrations/0058-music-workspace.sql`; included before Worker deploy.
- New modules: `lab-worker/music-experiments.mjs`, `links/workspace-tools.mjs`.
- Core files: `lab-worker/music-links.mjs`, `music-links-shared.mjs`, `music-analytics.mjs`; `links/` dashboard/renderer; `listen/`.
- Privacy and README describe provider handoff, page-load matching and private notes.
- Worker readiness marker: `music-links-20261103-v8`.
- Validation: 153 music/session/transport/Worker tests passed; syntax and whitespace checks passed.
- Browser fixture QA: phone 390px (375px usable with scrollbar), desktop 1348px, no horizontal body overflow.
- Fixture exercised release filtering, custom dates/source, experiment creation and pre-save creator preview.
- Fixture uses simulated account/API and does not ship. It is not production authenticated verification.
- Published PR #805: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/805 ; merge `f235b84c11cc7e15b3782901d1e2a80b5a23fb00`.
- Pages run 41627938011 and Worker run 41627938120 succeeded; strict v8 readiness/seed check passed.
- All 11 changed public runtime files matched source bytes exactly on parallelvisionlabel.com.
- Actual signed-out browser shows the new Experiments navigation at /links/#performance. No production authenticated records were changed in QA.
- Smart Links CI, static validation, Image UI contract, image references and first-image trial checks passed.
- Broad Lab/video checks retain the same three failing assertions verified on the unchanged base: checkout Meta IDs, Moods return links and ZenCreator prepaid copy. No unrelated fixes were included.
- Next: refresh the existing owner workspace; configure a real pre-save provider URL per upcoming release. Native Spotify OAuth remains a separate integration.

---

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
- Published 3b249c5d2075f9663913b9cac8ca82e3598f8b30. Pages run 41116572521 succeeded, static-site and Smart Links CI succeeded. All seven public runtime files match committed bytes exactly. Actual public Sube page shows the correct Instagram destination and preserved Spotify URL; no desktop overflow. Phone fixture also verified at 320px. Two QA landing loads occurred; no Spotify conversion click was made.
