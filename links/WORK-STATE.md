# Parallel Vision release links: current state
Updated: 2026-10-30
Objective: replace Hypeddit release-page creation and Meta click tracking on the existing label website.
Repository: parallelvisionberlin/parallelvisionberlin.github.io
Implementation baseline: c8e80057fe2a117583400b89bf999881051189bc; parent bfe79ed contains only a referral handoff follow-up.
Published implementation: d33636878743b52602a1d263331746fa25458565 (PR #671).

## Accepted scope
- Owner release creator, cross-device dashboard, public branded music landing pages, Meta Pixel.
- Only Spotify, SoundCloud and YouTube. Pre-saves explicitly deferred.
- Restrained dark editorial design, no decorative arrows; mobile-first checks.

## Implemented
- Owner workspace /links/ reuses existing Parallel Vision Clerk sessions and server-verified OWNER_DB role.
- Public /listen/?release=slug works on the existing static hosting with no global router changes.
- Editable title, artist, catalogue, date, description, artwork, MP3, platform URLs, publication status, optional pixel override.
- Draft/published/archived statuses; immutable saved slugs; revisions prevent stale-tab overwrites.
- Artwork upload up to 6 MB, MP3 up to 12 MB, isolated music-links R2 namespace, public media URLs and byte-range support.
- Workspace Pixel 1746851780072706 matches current label source and prior Hypeddit music setup; PV LAB Pixel untouched.
- Existing custom conversion event Hypeddit Smart Link Click with artist, track and music_service. Optional MusicLinkClick for new campaigns.
- Pixel PageView/ViewContent/clicks require explicit Meta consent; decline/withdrawal preserve music access.
- Anonymous aggregate page loads/clicks, release totals, 7/30/90/all-time ranges, platform/source/campaign reports.
- UUID receipts deduplicate events atomically through SQL trigger. Hourly network HMAC for rate limiting; raw IPs and ad IDs not stored.
- Idempotent D1 migration 0045 is part of the existing Worker deploy workflow. Daily maintenance prunes short-lived receipts/rate limits.
- Stay Low seed: published with existing artwork and verified SoundCloud URL. Sube seed: draft, artwork only; no invented streaming links.
- Runtime code: links/, listen/, lab-worker/music-links.mjs and music-links-shared.mjs; small routing/maintenance additions to worker.mjs.
- New dedicated CI workflow plus release-link tests and migration in normal Worker deploy workflow.

## Validation
- 144 automated tests passed across music-links, lab-auth, lab-worker, owner-providers and traffic suites.
- All changed JS modules pass syntax checks; git diff whitespace check passed.
- Real browser QA used local fixture auth/API for owner UI, real shared renderer and real public artwork.
- Phone iframe 390x844: creator entry, automatic slug, live artwork/platform preview and save-result UI exercised; dialog no overflow (375px).
- Public phone page: real Stay Low artwork loaded at 900px native width; body 390px with 390px scrollWidth.
- Public desktop body: 1363px with 1363px scrollWidth; artwork/title/button layout inspected.
- Owner desktop dialog inspected through accessibility tree and width measurement; no horizontal overflow.
- Fixture data, preview manifest and dist/ are local-only and excluded from git. No production owner token was used for testing.

## Deployment status
- PR #671 merged as d33636878743b52602a1d263331746fa25458565. Source candidate 5eeca43d6c7913eca668cb034cb6eae9768ac3f5.
- Initial CI sparse-checkout packaging failure was corrected: shared code now lives in lab-worker/music-links-shared.mjs, re-exported by links/shared.mjs.
- Candidate release-link, static validation, private-lab, owner security, partner, gallery, approved Image and safety checks passed. The slow video-browser job was superseded/cancelled after merge; do not report it as a completed pass.
- GitHub Pages run 41043602513: build and deploy succeeded. Six core frontend HTML/JS assets served HTTP 200 with exact local SHA256 bytes; .mjs assets served text/javascript.
- Cloudflare Worker run 41043602986 / job 124022121393 succeeded, including migration 0045 and both production health checks. Worker version ID 2af2044f-c747-4124-b970-be71a3415d07.
- Production /health reports musicLinks:music-links-20261030-v1; /api/music/public/status reports ready:true with the same feature revision.
- Actual browser: /links/ loads Clerk successfully and exposes an enabled owner sign-in button without exposing dashboard data while signed out.
- Actual browser: /listen/?release=stay-low loads the real D1 release, 900px artwork and verified SoundCloud destination.
- Actual consent check: no connect.facebook.net scripts before Allow Meta; the Pixel base script and its configuration loaded only after permission. Privacy choices permits decline afterward while music remains available.
- Real owner-session creation/upload/save on the production account remains unverified. Local fixture UI plus server owner/security/CRUD tests passed.
- Meta receipt/attribution in Events Manager is not observed; do not claim that browser script loading proves ad attribution.
- Direct Python requests to workers.dev were rejected with Cloudflare 1010 in this executor; production status was verified by the deployed workflow and real frontend browser fetch.

## Limits / next action
- Open https://parallelvisionlabel.com/links/ and sign in with the existing Parallel Vision owner account. Add streaming links to Sube, then publish. Stay Low is already available at https://parallelvisionlabel.com/listen/?release=stay-low.
- Existing Meta custom conversions restricted to hypeddit.com need their URL rules adjusted for the label domain.
- Initial version uses browser Pixel only, not CAPI. No historical Hypeddit import, pre-save, automatic metadata import, or server-rendered per-release social cards.
