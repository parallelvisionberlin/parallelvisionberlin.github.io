# Parallel Vision Smart Links: current state
Updated: 2026-10-30
Objective: replace Hypeddit page creation and Meta click tracking on the existing label website.
Repository: parallelvisionberlin/parallelvisionberlin.github.io
Published feature: d33636878743b52602a1d263331746fa25458565 (PR #671); initial deployment record 87dedd6.
Published white dashboard: 92457400122206f17d56b934d6440807031afa86 (PR #673).

## Approved design and scope
- White/black/cool-grey Smart Links dashboard, permanent left navigation; no orange interface accent.
- Compact full-width rows with 144px desktop artwork (100px phones), prominent top metrics, black controls.
- Approved reference: exec-0dccd0cb-3a18-48df-8349-609c2005bf51.png. Use actual catalogue artwork and configured platform links.
- Sidebar opens working Smart Links, Performance, Tracking and Settings views; mobile navigation moves above content.
- Smart Links replaces Releases in workspace navigation/actions. No decorative arrows.
- Only Spotify, SoundCloud and YouTube; pre-saves deferred. Public listener design remains unchanged.

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

## Latest dashboard update
- Frontend-only: links/index.html, dashboard.css, dashboard.mjs. Backend/public listening pages unchanged.
- Search, status tabs and archived filter retained; real per-link metrics and only configured service labels.
- White creator retains its actual dark public-page preview. Auth, revision and upload request behavior preserved.
- Local fixture QA: phone body/dialog scrollWidth equals 375px clientWidth; desktop body 1363px with no horizontal overflow.
- Draft filtering, sidebar views, existing Sube editor, fixed slug, artwork/live preview exercised in browser.
- Focused music-links + lab-auth suites: 30 passed. JS syntax and git whitespace checks passed.
- PR #673 merged. Candidate 0745ec85: all four GitHub validation jobs passed.\n- GitHub Pages run 41048180330 succeeded. Live HTML, CSS and JS returned 200 and exact SHA256 bytes; JS MIME text/javascript.\n- Actual production browser loaded the white sidebar, Smart Links heading and enabled Clerk sign-in gate; signed-out data stays hidden.

## Verified original deployment
- PR #671 frontend GitHub Pages run 41043602513 succeeded; six core frontend assets matched exact expected SHA256, JS MIME valid.
- Worker run 41043602986 / job 124022121393 succeeded with migration 0045 and production health checks.
- Worker version 2af2044f-c747-4124-b970-be71a3415d07; /health musicLinks and public status revision music-links-20261030-v1, ready:true.
- Actual browser: owner gate/Clerk loaded, public Stay Low loaded D1 data, 900px artwork and verified SoundCloud destination.
- Meta scripts absent before consent, loaded after Allow Meta; privacy decline afterwards preserved music access.
- Original feature validation: 144 focused tests passed. Relevant release/static/security/partner/image/safety CI passed.
- Old video-browser job was superseded/cancelled after merge, never reported as passed.
- No production owner token used for QA; real owner create/upload/save not exercised by agent. User later supplied working owner screenshot.

## Limits and next action
- Dashboard: https://parallelvisionlabel.com/links/ ; public example: https://parallelvisionlabel.com/listen/?release=stay-low .
- Design is live at /links/. Owner can add real Sube platform links and publish through the existing creator.
- Meta Events Manager receipt/attribution remains unobserved; script loading does not prove attribution.
- Hypeddit URL-restricted custom conversions require label-domain rules in Meta. Browser Pixel only, no CAPI.
- No historical Hypeddit import, pre-save, auto metadata import or server-rendered per-link social cards.
- Python workers.dev requests hit Cloudflare 1010 in executor; verified original health through deployment workflow and browser frontend.
- Local dist/fixture auth/request mocks and .openai preview config are excluded from Git and must never ship.
