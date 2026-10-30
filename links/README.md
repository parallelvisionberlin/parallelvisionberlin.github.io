# Parallel Vision release links

Account creator and dashboard: https://parallelvisionlabel.com/links/
Public release URL: https://parallelvisionlabel.com/listen/?release=stay-low

`WORK-STATE.md` records the current verified implementation and deployment status.

## Operation

- Existing Parallel Vision Clerk sign-in, signature/issuer/origin verified on the server. Public accounts have independent workspaces keyed by verified Clerk subject. Existing owners retain the label workspace. No Lab registration, wallet, payment or credits are required.
- Release data and aggregate counts use isolated `music_*` tables in the existing D1 database. No credit, payment or Nina tables are changed.
- Migrations `lab-worker/migrations/0045-music-links.sql` and `0046-music-link-designs.sql` are idempotent and applied by the existing Worker deployment workflow.
- Shared validation: `lab-worker/music-links-shared.mjs` (re-exported by `links/shared.mjs`); API: `lab-worker/music-links.mjs`; public page: `listen/`; owner UI: `links/`.
- Upload JPG/PNG/WebP artwork (6 MB), MP3 preview (12 MB), or use HTTPS URLs. Uploaded media is intentionally public through UUID URLs, isolated from Lab's private media records. A 500 MB release-media cap applies per account.
- Only Spotify, SoundCloud and YouTube are offered, as requested. Stay Low is published with its verified SoundCloud URL and existing artwork; Sube is prepared as a draft with its artwork. Add its actual streaming links before publishing.
- Saved slugs are immutable. Draft and archived releases return 404 publicly. Optimistic revisions prevent stale tabs from overwriting records.
- Label workspace default music Pixel: `1746851780072706`, verified in the current label site and prior Hypeddit setup. Customer workspaces start with no Pixel and can configure their own; workspace and per-release overrides are editable. PV LAB Pixel is not used here.
- Custom click event: `MusicLinkClick`, with `music_service`, `artist`, `track`, `content_name`, `content_ids`, and `content_type`. For Spotify optimisation, create a Meta custom conversion named `Parallel Vision – Spotify Click` on `ParallelVision_Music_Pixel`, filtering `music_service` equals `spotify`. The event fires on a platform button click while advertising measurement is enabled. Migration 0047 replaces the legacy event label, preserving the pixel ID. No Hypeddit service is used.
- Per explicit owner instruction, Meta Pixel initializes by default without an automatic cookie prompt, except when a previous denied choice is stored. Manual Tracking settings remain available to disable/re-enable it. New visitors are not assigned a fabricated consent choice. This is an opt-out configuration, not a claim of regulatory compliance. Browser Pixel only; no Conversions API integration.
- Anonymous counters do not depend on Meta consent. They count page loads and outbound clicks, not unique people, streams, or paid conversions. Sources and sanitized UTM campaign labels are reported. No Hypeddit historical import or pre-saves.
- Random event receipts deduplicate retries; SQL trigger updates aggregates atomically. Hourly keyed network digests limit accepted events; raw IPs and advertising IDs are not stored. Receipt/rate-limit pruning runs daily via existing maintenance.
- Aggregate historical metrics are retained; all-time chart data is bounded to the most recent 90 days. No fabricated example metrics.
- Client-rendered per-release metadata is not a server-rendered Open Graph card. Public addresses use a query parameter to work on existing static hosting without changing global 404 routing.

## Checks

`node --test tests/music-links.test.mjs`

Tests exercise real SQLite migrations, account isolation, authorization, CRUD/revisions, public visibility, upload isolation, event idempotency, reporting, rate limits, consent behavior and platform URL validation. Worker changes also run the repository's existing deployment checks.

## Landing-page design
The artwork-first renderer is shared by the public listener and the creator live preview. Each smart link stores `background`: `artwork` (cinematic), `blur` (default, same cover blurred behind the sharp cover), or `black`. Artwork URLs are assigned to image elements, never interpolated into CSS. Migration 0046 isolates presentation settings in `music_link_designs`; release and design writes share one atomic D1 batch and revision check. Old clients that omit `background` preserve the saved choice. No generated mockup pixels ship as page content.

The public layout centres a large sharp cover beside title, artist and stacked service rows. Each service row is one accessible link with a branded identity and a visually distinct Listen/Watch action, never a nested button. Saved explicit background choices are preserved; new and unconfigured links default to blur. The creator uses the same renderer.

## Detailed analytics (0050)
Server-side network metadata supplies approximate country, region and city. User-agent is reduced to device, browser and OS labels; raw IP/UA, GPS coordinates and fingerprint identifiers are not stored. Unknown location is explicit. Additive hourly aggregates preserve existing daily totals. UUID receipts deduplicate retries and are pruned after two days; aggregates remain. Campaign tags: source, medium, campaign, content (ad), term (ad set). These labels require tagged ad URLs and do not connect to Meta spend reporting.

Performance supports per-release filters across existing reports and new breakdowns, daily and hourly UTC timelines, audio-preview plays (first play per page load), and grouped elapsed time before platform clicks. Detailed timelines cover up to 90 days and report tables show up to 100 groups; historical total counts remain available. Earlier visits cannot be backfilled. Analytics are scoped to the managing account, including all new queries.
