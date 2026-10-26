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
- Flesh Zero is now the featured film immediately after the Agency hero, before Selected Work. It uses the verified responsive R2 MP4 variants and approved FLESH ZERO HERO poster, and links to `flesh-zero.html`. Work in motion is reduced to Berlin 2063 and Cabizbajo / Lotus 63.
- Selected Work now uses the exact user-approved 2048×1152 REPTARE / FLESH ZERO look-development sheet, stored in Cloudflare R2 at `fashion-after-fabric/agency/reptare-look-02-development-sheet.webp`; the two lead project cards use a 16:9 ratio. Berlin 2063 keeps the existing urban passage image.
- Pending: visual screenshot review, merge and production custom-domain/API verification.

## The Finest, 2026-10-26
- Resumed PR #584, original source d410f1eb90860398b5c98033f7142c238689bcfa.
- New maison-satin-the-finest.html and the-finest.css: official film FnU6oW1__Lg, 6 Film Stills and 9 Locations, plus original key art.
- 16 supplied WebP assets under assets/optimized/the-finest/; reuse flesh-zero.js gallery controls.
- Agency Work in Motion adds The Finest as a third card; existing films and later main changes preserved.
- Corrected stale two-film regression assertion and replaced new page Unicode arrows with SVG for iPhone.
- Added scoped 1440/390/320px gallery, image-decoding, keyboard and overflow checks to Agency CI.
- Local static validation passed; GitHub browser checks passed for The Finest and Agency at 1440/390/320px.
- PR #584 merged as 228f02280c6470c5b1f7370b17a9bc373b03134e; GitHub Pages deployment 40373722883 succeeded.
- Production Agency custom-domain/API verification passed in run 40373722640.
- Live browser confirmed The Finest page, working next buttons in both galleries, keyboard navigation and the Agency entry. Hero and Locations screenshot review passed.
- Public URL: https://parallelvisionlabel.com/maison-satin-the-finest.html
- No remaining blocker for this feature. Full continuous YouTube playback was not verified.


### The Finest editorial refinement and storyboard, 2026-10-26
- Based on main e8e9ba342597af3761e69f8879aaf7c4914baced; other work preserved.
- Neutral black/grey UI; original warm film imagery and hero artwork retained.
- Replaced character-consistency sales copy with concise film notes; reduced oversized notes heading.
- Removed the mismatched elevator portrait from the visible selection, leaving the original mirror portrait; asset retained.
- Film Stills now has 5 frames; Locations retains all 9.
- Added a third, 2-sheet Storyboard gallery, with the supplied ocean sequence and underwater framing studies.
- Sources: Underwater Story 2.png and Underwater Story..png. WebP delivery preserves full sheets at 1536x1024; full-size links permit reading details.
- Three supplied road-board variants excluded for duplication and illegible annotations; no generated replacements.
- Storyboard technical annotations are identified as previsualisation references, not physical camera-production claims.
- Reused existing controls, SVG arrows and keyboard/swipe support; no shared JS changes.
- Local source validation and desktop managed-preview visual review passed; all 3 galleries initialized, new previous/next controls passed, no desktop overflow.
- Scoped CI updated for 17 images, 3 galleries, two-sheet wraparound, decoding and 1440/390/320px layout.
- Publication pending validation of this revision; no email sent as part of this website change.
