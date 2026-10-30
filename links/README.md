# Parallel Vision release links

Owner creator and dashboard: https://parallelvisionlabel.com/links/
Public release URL: https://parallelvisionlabel.com/listen/?release=stay-low

`WORK-STATE.md` records the current verified implementation and deployment status.

## Operation

- Existing Parallel Vision Clerk sign-in; server-side existing `OWNER_DB` owner role is mandatory for every admin request.
- Release data and aggregate counts use isolated `music_*` tables in the existing D1 database. No credit, payment or Nina tables are changed.
- Migration `lab-worker/migrations/0045-music-links.sql` is idempotent and applied by the existing Worker deployment workflow.
- Shared validation: `links/shared.mjs`; API: `lab-worker/music-links.mjs`; public page: `listen/`; owner UI: `links/`.
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
