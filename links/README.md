# Parallel Vision release links

Owner creator and dashboard: https://parallelvisionlabel.com/links/
Public release URL: https://parallelvisionlabel.com/listen/?release=stay-low

`WORK-STATE.md` records the current verified implementation and deployment status.

## Operation

- Existing Parallel Vision Clerk sign-in; server-side existing `OWNER_DB` owner role is mandatory for every admin request.
- Release data and aggregate counts use isolated `music_*` tables in the existing D1 database. No credit, payment or Nina tables are changed.
- Migrations `lab-worker/migrations/0045-music-links.sql` and `0046-music-link-designs.sql` are idempotent and applied by the existing Worker deployment workflow.
- Shared validation: `lab-worker/music-links-shared.mjs` (re-exported by `links/shared.mjs`); API: `lab-worker/music-links.mjs`; public page: `listen/`; owner UI: `links/`.
- Upload JPG/PNG/WebP artwork (6 MB), MP3 preview (12 MB), or use HTTPS URLs. Uploaded media is intentionally public through UUID URLs, isolated from Lab's private media records. A 500 MB release-media cap applies.
- Only Spotify, SoundCloud and YouTube are offered, as requested. Stay Low is published with its verified SoundCloud URL and existing artwork; Sube is prepared as a draft with its artwork. Add its actual streaming links before publishing.
- Saved slugs are immutable. Draft and archived releases return 404 publicly. Optimistic revisions prevent stale tabs from overwriting records.
- Default music Pixel: `1746851780072706`, verified in the current label site and prior Hypeddit setup. Workspace and per-release overrides are editable. PV LAB Pixel is not used here.
- Default custom click event: `Hypeddit Smart Link Click`, with `music_service`, `artist`, `track`, `content_name`, `content_ids`, and `content_type`. Existing conversions restricted to Hypeddit URLs require an Ads Manager rule update. New campaigns can choose `MusicLinkClick` in settings.
- Consent permits Meta `PageView`, `ViewContent`, and the selected click event. No Meta script/cookie is loaded before opt-in. Withdrawal revokes future page events. This initial version uses browser Pixel only; no Conversions API token or integration.
- Anonymous counters do not depend on Meta consent. They count page loads and outbound clicks, not unique people, streams, or paid conversions. Sources and sanitized UTM campaign labels are reported. No Hypeddit historical import or pre-saves.
- Random event receipts deduplicate retries; SQL trigger updates aggregates atomically. Hourly keyed network digests limit accepted events; raw IPs and advertising IDs are not stored. Receipt/rate-limit pruning runs daily via existing maintenance.
- Aggregate historical metrics are retained; all-time chart data is bounded to the most recent 90 days. No fabricated example metrics.
- Client-rendered per-release metadata is not a server-rendered Open Graph card. Public addresses use a query parameter to work on existing static hosting without changing global 404 routing.

## Checks

`node --test tests/music-links.test.mjs`

Tests exercise real SQLite migrations, owner authorization, CRUD/revisions, public visibility, upload isolation, event idempotency, reporting, rate limits, consent behavior and platform URL validation. Worker changes also run the repository's existing deployment checks.

## Landing-page design
The artwork-first renderer is shared by the public listener and the creator live preview. Each smart link stores `background`: `artwork` (cinematic), `blur` (default, same cover blurred behind the sharp cover), or `black`. Artwork URLs are assigned to image elements, never interpolated into CSS. Migration 0046 isolates presentation settings in `music_link_designs`; release and design writes share one atomic D1 batch and revision check. Old clients that omit `background` preserve the saved choice. No generated mockup pixels ship as page content.

The public layout centres a large sharp cover beside title, artist and stacked service rows. Each service row is one accessible link with a branded identity and a visually distinct Listen/Watch action, never a nested button. Saved explicit background choices are preserved; new and unconfigured links default to blur. The creator uses the same renderer.
