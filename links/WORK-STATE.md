# Parallel Vision release links: current state
Updated: 2026-10-30
Objective: replace Hypeddit release-page creation and Meta click tracking on the existing label website.
Repository: parallelvisionberlin/parallelvisionberlin.github.io
Baseline: c8e80057fe2a117583400b89bf999881051189bc; current main bfe79ed is a referral handoff-only follow-up.

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
- Runtime code: links/, listen/, lab-worker/music-links.mjs, small routing/maintenance additions to worker.mjs.
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
- PR #671, initial source c2ab38009f38d6007e4d3428331a882305a5448d. Frontend/Worker publication pending.
- CI found existing Lab sparse checkouts omit links/: canonical shared module moved to lab-worker/music-links-shared.mjs; links/shared.mjs re-exports it. This keeps backend-only checkouts self-contained.
- Do not claim production readiness until exact frontend files and /api/music/public/status + release seed are verified.
- Real owner session, upload and save on the production account remain unverified until the owner signs in.
- Meta event delivery to Events Manager is not yet observed; browser consent/event-call behavior is tested.

## Limits / next action
- Publish, inspect CI, verify frontend bytes and backend readiness, then return /links/ and the Stay Low public URL.
- Existing Meta custom conversions restricted to hypeddit.com need their URL rules adjusted for the label domain.
- Initial version uses browser Pixel only, not CAPI. No historical Hypeddit import, pre-save, automatic metadata import, or server-rendered per-release social cards.
