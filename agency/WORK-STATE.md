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
- Managed mobile preview reviewed at 390 and 320px; found and fixed a 3px scrollbar-related overflow using container-relative gallery widths. Footer links now stack cleanly.
- PR #591 merged as b242d32a65f90b830ba79fc1880e044d559d04c5. Static-site and approved Image UI checks passed on final candidate 5b248d230ec370aeecebf443030da47045fd0969. Browser CI remained pending in its browser installation, so do not claim its regression run passed.
- Pages deployment 40400948723 succeeded on subsequent main 258350fe9a6edde32f37c104d27467e5c299a344, which retained this feature and unrelated Agency changes.
- Production browser confirmed revised film copy, 5 Film Stills, 9 Locations and new 2-sheet Storyboard; next/previous worked, and both live storyboard images decoded at 1536px. Live screenshot captured.
- Manual desktop and 390/320px preview verification passed, with zero horizontal overflow after correction. No remaining publication blocker; optional full browser CI result can be checked in PR #591.
- No email sent as part of this website change.

### The Finest tap behaviour, 2026-10-26
- Scope: the-finest.css and its page cache token only. Shared gallery JS and other pages unchanged.
- Disable browser double-tap zoom with touch-action:manipulation; gallery viewport explicitly permits pan-y pinch-zoom, replacing the inherited pan-y restriction.
- Native viewport zoom remains enabled; no maximum-scale, user-scalable=no or blanket preventDefault.
- Source reviewed against MDN touch-action guidance; actual iPhone Safari gestures cannot be exercised in the cloud desktop browser.
- Published source d3585ad045be9325903068dceb1a4ab309aa16c5. Live browser confirmed new stylesheet token, body manipulation and gallery pan-y pinch-zoom, with next/previous counts 02/01.
- Static-site, approved Image UI and Agency browser checks passed for this source. Actual two-finger and double-tap gestures still require physical iPhone Safari confirmation.

### Film Stills selection, 2026-10-26
- User supplied five new stills and a screenshot identifying the old mirror shot to remove.
- Seven distinct frames in order: coastal-drive, city-drive-profile, window-portrait, living-room-scene, mirror-locked-mood, ocean-entry, underwater-descent.
- coastal-drive opens the gallery; city-drive-profile replaces highway-drive. mirror-locked-mood (attachment 3) replaces both old mirror views, including the shot flagged in attachment 6.
- Original assets retained; new WebP files preserve source framing. Hero, nine locations, two storyboards, touch settings and shared JS unchanged.
- Counter/ARIA updated to 7 stills; browser regression image count updated to 19.
- Published as d592e3d17d5a72d5fa9935eeb14a31ea3bc4d631; Pages deployment 40405520671 succeeded.
- Live browser verified all 7 images loaded at source dimensions and carousel wrapped back to 01 after 7 next clicks; opening screenshot saved. Header, locations and storyboards unchanged.

### Wrap transition and reading hierarchy, 2026-10-26
- The Finest only: edge wrap cuts directly between last/first without a reverse sweep; adjacent slides retain their existing transition. Shared Flesh Zero behaviour remains unchanged.
- Existing serif hero/title retained. About text enlarged to 17–19px desktop/16px mobile, credits to 15px and credit labels to 11px; brighter reading contrast and 520px measure.
- Files: flesh-zero.js, the-finest.css, maison-satin-the-finest.html cache tokens, tests/agency-finest-browser.mjs and this handoff.
- Added immediate transform-position checks for both boundary directions; node --check passed.
- Published source 680bc9a3df937acf801d777ccd5d2ccd4ce4efb3; Pages deployment 40406727702 succeeded. Static-site and approved Image UI checks passed; Agency browser regression 40406727224 was still running at final review.
- Live browser confirmed 01->07 lands directly at -7300.78px (6 x 1216.796875px), and 07->01 lands at 0 immediately. Reading text measured 17.719px in the review viewport; notes/credits screenshot reviewed and saved.

### Final six-still edit, 2026-10-26
- User approved retaining the sofa photograph and removing the standing window portrait.
- Film Stills: coastal-drive, city-drive-profile, living-room-scene, mirror-locked-mood, ocean-entry, underwater-descent. Six frames, 18 images across the page.
- Updated visible count, all slide ARIA positions and existing browser image-count assertion. Removed only the selected figure; original asset retained.
- Hero, typography, locations, storyboard and repaired touch/wrap behaviour preserved.
- Published source c657c732c3d7ec41b3812eed934f3257c4893603. Static-site, approved Image UI and Agency browser checks passed. Live browser confirmed exactly six frames in approved order, no window portrait, sofa at 03, and working forward/back navigation. Screenshot saved.
