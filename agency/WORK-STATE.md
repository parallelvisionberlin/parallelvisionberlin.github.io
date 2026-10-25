# Agency public launch
Updated: 2026-10-25
Source: verified launch branch based on main, inspected at 3dca5ef994c1d096ce1653fcea0be84974913bb5.

## Scope and approved decisions
- Public Agency entry in the main website navigation; Contact remains in the footer and existing contact section.
- One editorial homepage feature before Contact, using existing LOOK03.webp.
- Preserve the agency hero, typography, five original portfolio projects and PV LAB/Nina artwork.
- Independent work is labelled as independent, not presented as client commissions.
- No new Living Characters standalone page or invented client credits.
- Mobile/iPhone icon rule: do not use Unicode arrow glyphs that iOS may render as emoji; use CSS/SVG line arrows only.

## Implementation
- index.html, language.js, css/agency-feature.css: public entry, feature and English/German text.
- agency/index.html, launch.css, agency.js: expanded project notes, two film examples and direct form.
- Original film sources: Berlin 2063 / T4bKnLgdLjQ and Cabizbajo / Lotus 63 artist study.
- YouTube embeds load only on click. Original hero video behavior remains intact.
- agency-social-20261025.jpg: 1200x630 preview from existing LOOK04.webp; no new imagery.
- Social metadata, sitemap and a factual enquiry-data notice added.
- Owner menu links now lead to agency/inbox.html; public navigation leads to the public agency.
- Public enquiry endpoint: /api/public/agency/enquiries. Durable storage precedes confirmation.
- Owner API: /api/admin/agency/enquiries. Existing authenticated identity plus OWNER_DB owner check.
- Isolated agency tables; no customer, wallet, provider or generation changes.
- Notification recipient fixed to contact@parallelvisionlabel.com. Verified-domain sender hello@pvlab.studio.
- Replies are manual. No marketing subscription or automatic visitor email.
- Idempotent form receipts and email keys; honeypot, origin checks, bounded payloads and rate limits.
- Notification allowance capped at 10 attempts/day, separately from welcome mail.
- Private inbox remains the source of truth when notifications are pending or fail.
- Counts are event totals, not unique people. Optional tracking respects DNT/GPC.
- Enquiry and aggregate retention: 90 days; temporary keyed rate limits cleaned daily.

## Verification
- 15 isolated SQLite-backed enquiry tests passed locally, including permissions and duplicate prevention.
- JavaScript syntax checks passed for new frontend/backend modules.
- Tests stub all email sending; no live test message or enquiry has been sent.
- Browser regression and source publication run in the isolated agency launch workflow.
- Live deployment is not implied by a source commit. Verify public pages and API revision after merge.

## Deployment
- Migration 0040-agency-enquiries.sql is applied by the existing Lab Worker deployment workflow.
- Worker changes use the normal main-branch pipeline; no secrets or credentials added to Git.
- Public HTML/assets use the existing Parallel Vision site deployment.
- Private PV LAB owner-menu link uses the normal PV LAB release pipeline.
- Chromium checks passed at 1440, 390 and 320px, including failure/retry receipts and signed-out inbox.
- Static build and all 15 SQLite-backed enquiry tests passed in the launch workflow.
- Agency browser regression now rejects rendered Unicode ↗/→ glyphs at desktop and mobile widths.
- 2026-10-25 Flesh Zero film: original master, desktop delivery, mobile delivery and the approved FLESH ZERO HERO poster are stored in Cloudflare R2 bucket `parallel-vision-visuals` under `fashion-after-fabric/flesh-zero/`.
- R2 objects verified after upload: original 83,717,235 bytes; desktop 10,936,813 bytes; mobile 4,780,745 bytes; poster 84,362 bytes. Temporary R2 upload Worker was deleted after verification.
- Agency Work in motion now has three films: Berlin 2063, Cabizbajo / Lotus 63, and a full-width Flesh Zero feature below them. Flesh Zero uses responsive R2 MP4 variants and links to `flesh-zero.html`.
- Pending: visual screenshot review, merge and production custom-domain/API verification.
