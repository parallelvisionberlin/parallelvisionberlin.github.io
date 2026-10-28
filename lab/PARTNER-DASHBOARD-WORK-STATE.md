# Vitolas Studio partner dashboard

## Bellini guide cost note / publishing, 2026-10-28
- User approved the exact generation-cost note after the 50%/20% guide entries: only compensate actual generation costs exceeding PV LAB's retained share, cap adjustment at five percentage points, first-payment commission floor45%.
- Scope is one added note paragraph inside the existing commission guide entry in lab/bellini-studio.html, preserving all eight guide entries and their styling. No calculation, reservation, payout, wallet, credit, provider, Vitolas or dossier changes. Automatic generation-cost adjustment remains unimplemented; this text change must not be reported as billing logic.
- PR #625, branch copy/bellini-generation-cost-note-20261028, baseline a3e0505e6936319b037d57b7c8858de1e8555f24; first content commit14b7932fd12aec6b6e4d62e9d4d901be290ccddf. Approved Image contract5/5 and diff whitespace checks passed. No new implementation-mirroring tests.
- Next: relevant existing CI, normal merge/publication, then exact live HTML verification. No real adjustments or funds moved.

## Bellini payout requests / published and verified, 2026-10-28
- Approved: 15th/30th transfers (February second payment on month end), minimum 50 EUR net, Solicitar pago, available → pending → paid history. Owner receives amount and confirms only an actual external transfer with a reference. No bank transfer is initiated by this feature. Keep 50% first verified payment (including initial top-up), then 20% eligible subscriptions for six calendar months. Vitolas policy and layout preserved.
- Reviewed source 12edb1152941be031d765a5fb1271f797a065cea, PR #620, merge 463d22e10dc09815fe275e2204a0f245e4a4e8c4. Latest observed main d8556a6 descends from merge; all six affected Bellini/Owner static files unchanged. Preserve concurrent Beauty/Image/hero work.
- 0043 migration stores actual verified Stripe fee/tax facts and immutable payout snapshots/claims. Exact net expectations, server minimum, atomic reservation, idempotency, one pending request, billing holds and immutable paid claims. Read-only Stripe reconciliation supports checkout and both invoice schemas; missing/mismatched/currency data stays pending. No invented fees/VAT, self-gifts, wallets or promotional allowances changed.
- Relevant frozen-head CI passed: partner job 122497043847 (54 units, 20 payout browser assertions, 589 Vitolas and 257 Bellini assertions); account, Owner, promotions, required Image, generic tests and private lab passed. Local 85 existing checks, 15 focused payout tests, account and seven-width Owner checks passed. Unrelated optional public Video pixel mismatch remained identical to documented main baseline (4796 pixels, maxDelta232); no gates weakened.
- Production Worker run 40592330177 / job 122499458007 succeeded, including migration 0043. Worker version fa6e4308-6767-4b72-8591-980574f3ab2c. Public health returns pv-lab-2026-10-27-bellini-payouts-v1. Anonymous customer payout and admin payout queue GET both return 401.
- Final publication verified 2026-10-28: production canonical Cloudflare deployment 2a52c7dc-33bc-4f5e-b28e-fca062978e53 for descendant fee8c04e67b330d2a13be9ea62cf9c9395b5f4d7 succeeded 2026-10-27T23:00:28Z (28 Oct 00:00 Berlin). Cloudflare app check 122522186753 succeeded. Live custom-domain /bellini-studio, /owner and root partner-payouts.js/css, vitolas-studio.js and owner.js all HTTP200, exactly equal to reviewed merge 463d22e. Public health still reports bellini-payouts-v1; anonymous customer/admin payout routes remain401. Earlier pending status resolved. Actual Cloudflare API established the delay was queued; build had not begun, despite generic GitHub Building label.
- Same dossier Library item libfile_f0647d4bb49c81918f196ca784b2ce2f updated with guarded replacement from v2 to v3: 18 pages / 4346 words. Clear first steps; confirmed dates, minimum and statuses; verified net basis. Changed pages 2/5/6/7/9/18 rendered and inspected. Removed unconfirmed-calendar/future-implementation prose. Authoring source tmp/build_bellini_dossier.py; output/pdf/Bellini_Studios_Dossier_PVLAB.pdf. Native Library link is authoritative; older dossier section below is historical.
- No real payout request, transfer, credits or email sent. No signed-in production behavior observed. Synthetic role/browser checks are separate from live public evidence.
- Publication complete. Real signed-in payment request and actual external transfer remain unperformed; do not confuse synthetic role tests or public byte verification with production financial transactions. No further deployment required for this feature.

## Bellini Studios dossier, delivered 2026-10-27
- Latest Library version 2: user requested positive, simple wording for recurring commissions, without highlighting zero commissions on later one-time purchases. Replaced the 10/50 top-up comparison with Creator subscription examples (39 EUR first qualifying payment = 19.50; eligible later quota = 7.80). Retained 50% first verified payment and 20% eligible subscriptions for six calendar months; no commission-policy/code change. Pages 5/6 rendered and inspected, full text/18-page count and no-self-gift rule checked.
- Updated same Library item to version 1 after user supplied other-chat economics/Stripe discussion. Added 10 EUR initial purchase = 5 EUR commission, later illustrative 50 EUR top-up = zero, and clarified no reset on product/plan changes. Re-rendered/inspected affected pages 5/6/9; all 18 pages and no-self-gift wording preserved.
- Current main partner-commissions.mjs blob c58315cb4fd5eea432dd6b468f1e9973ea9a1966 still calculates amountCents * rate without processing-fee deduction. Dossier marks proposed deduction of applicable taxes, refunds and actual processing fees as unconfirmed/unimplemented, not active terms. No Stripe tariff, VAT assumption, estimated provider losses or billing-code change included. Coordinate any later net-basis implementation before presenting it as agreed.
- Created Bellini_Studios_Dossier_PVLAB.pdf in Spanish: 18 pages, 4,385 words, 12 clickable links. Native Library libfile_f0647d4bb49c81918f196ca784b2ce2f; local output/pdf/Bellini_Studios_Dossier_PVLAB.pdf. Private guide for Alejandro Izaguirre/team, not an email send or a new commercial contract.
- Tailored to AI character/creator communities: current tools/models/prices, identity workflow, all five dashboard sections, exact 50% first-payment / 20% eligible-subscription rules, invitations, manual settlement, outreach, 14-day plan, eight proposed course modules, a practical project/prompts and 90-minute pilot.
- User explicitly forbids self-gifting. Dossier repeats that invitation allowance is for third parties, separate from the personal wallet; no own-voucher redemption, no using invitation gifts for their demonstrations. Existing deployed migration 0042 already blocks partner recipients; the focused existing Bellini budget/self-redemption regression passed. No account, budget, wallet or voucher was changed.
- Production public Bellini link resolver now returns HTTP200 with an active destination, unlike the initial release observation. Public tools, dashboard FAQ, terms, prices and support checked 27/10/2026. No signed-in customer data was used.
- All 18 PDF page renders inspected; final table-heading fix re-rendered/inspected, fonts embedded, text/link extraction and anti-self-gift/calendar wording validated. No hero imagery used: rejected hero PR #609 stays closed.
- Payout dates, payment method, invitation amount and special teaching credit terms remain unagreed. Owner-facing recommendation only: semi-monthly 15th/last day after reconciliation. No automatic transfers or guaranteed course income promised.

## Bellini hero direction, pending new asset, 2026-10-27
- User requests a more sensual dark-fashion Bellini-only hero, with readable midtones and the existing compact header. Rejected the generated satin portrait and then the monochrome leather portrait.
- Latest desired direction combines IMG_8042.jpeg (intimate monochrome grain, natural adult portrait) with IMG_8045.jpeg (triangular loft window, angular architecture and daylight), adding black fashion styling. Reference Library IDs libfile_f55db93c22b88191b21a8aa408d374b2 and libfile_ea1f167e62208191913ff8a1252c3d9d; local attachments in upload/.
- Built-in image generation rejected the two-reference combination with moderation_blocked/sexual, even with an explicitly fully clothed black dress. No combined asset was produced; do not claim otherwise or retry around the filter.
- PR #609 for the superseded leather candidate is closed without merge. Source 07c129e3bcc1d8d75300771dcbd17e7ea51e7386 remains only on design/bellini-sensual-fashion-hero-20261027. Its local tests/preview are not production or user acceptance.
- No hero change was published. Production Bellini continues using visuals/vitolas/future-beauty-v1.webp. Last completed user change remains PR #608, the verified 100 EUR / 50 EUR FAQ example.
- Next action: establish a usable clothed reference/direction for the new hero before further generation, testing or publication. Preserve Vitolas, shared CSS, dashboard behavior and budgets.

## Commission example copy, 2026-10-27
- User requested a more tangible 100 EUR first-payment / 50 EUR commission example in the 50% FAQ.
- Based on current main f2655eb631ac63e71d2b3f615ffe2f622615430a; change only the matching sentence in Bellini and Vitolas HTML. No rates, eligibility, layout, accounting or wallet changes.
- Published PR #608: reviewed source 5ac6f69559bab9cb13788581b8029276febf0b4d, production merge b1de71b5785c8b05b38f8a357f01ce01dc177e09. Local 39 existing partner/referral/menu/required Image checks passed; relevant partner browser, approved Image, private Lab and unit CI passed.
- Exact-merge Cloudflare Pages check 122431805889 succeeded for pvlab-studio deployment 6a0d6a2a-3b71-4e84-8ee6-f4b3c883d3a4. Both public dashboard HTML responses HTTP200 and exactly match reviewed bytes: Bellini SHA256 8d472754dbaef28137fe07d64c1117e973161af17eb6ffe9bc1255f60e1bceed; Vitolas 74695ca52df74a278c3ae87b7f16a2a558d0e7645a3c59ee5993eb4cbb3f289c. New 100/50 example present, previous 10/5 example absent. Status: published and verified.

## Bellini Studios / second isolated partner, published 2026-10-27
- Final user-approved name: Bellini Studios. Private dashboard https://pvlab.studio/bellini-studio; public client alias /bellini. Approved verified-primary-email allowlist uses only its hash in Worker source; audience is AI influencer/creator communities.
- Published PR #605. Reviewed final head 1c0943e644ff09434549bae732c3f967734894a6; production merge 328b964d4de05f7208435380806a80de4d0ff0c3. One normal integration with main c02b171 preserved the new Elements entry and all Studio flags.
- Reuses Vitolas layout, five sections, approved beauty asset lab/visuals/vitolas/future-beauty-v1.webp, bold logo and shared controller/CSS. Separate verified identity, referrals, customers, commissions, voucher issuer and gifting budget. Private Owner review/allocation links; no partner Owner role.
- Gifting capacity is separate from personal generation credits, assignable only by Owner, and remains unallocated/pending assignment. No real grants, issued vouchers, purchases, payouts or messages were created. Existing Vitolas accounting remains intact.
- Migration 0042 expands workspace/alias allowlists and preserves budgets, audits, links, reservations and redemptions across deployment replays; quota and recipient guards remain atomic.
- Final CI: partner job 122403429024 passed 39 units and 589 Vitolas + 253 Bellini browser assertions. Account, Owner, private Lab, generic units, promotions, prompt safety and approved Image gates passed on the reviewed head. Local 155 relevant Worker/payment/privacy tests and full account browser passed. Synthetic roles only.
- Unrelated optional failures were inspected without weakening assertions: public Video pixel test also fails on main c02b171 with exactly 4,796 pixels changed; known Upscaler viewport assertion at line 169 persists. Legacy live redirect/toast verifier also fails separately.
- Worker deployment run 40567393621/job 122412212681 succeeded, including migration 0042 and all pre-deploy/health checks. Public health independently reports pv-lab-2026-10-27-partner-workspaces-v1.
- Exact-merge Cloudflare Pages app check 122413917538 succeeded. Scoped verifier LIVE_VERIFIED for lab/lab.js?v=20261027-direct-elements1; SHA256 5603dcdc8750b4c46c83acac8f1558b72721b63dbced9ef0181f307631c0f711.
- Production Bellini HTML/link page/controller, shared partner JS, account menu and Owner JS each returned HTTP200 and matched reviewed bytes exactly. Bellini HTML SHA256 4bd007fda779c6c63ed1a864ee53b5de0537b0f2fed10968616f3e27b1909265; shared partner JS 26a05fa77f270f010a522ee5712b9711a1f1b67e80677fd8673b3b4da1321d2f.
- Production signed-out browser at 390/1440px passed name, login gate, hero decoding, containment/no overflow and no emoji arrows; rendered phone inspected. Private customer and Owner endpoints reject anonymous calls with 401. Actual signed-in customer/Owner sessions remain unobserved.
- Actual Vitolas alias still returns the existing referral 9GNPKYUW (HTTP200). Bellini alias truthfully returns 503 until the approved account first signs in and initializes its reference. Do not claim the client invitation is active before that.
- Status: page, schema and Worker published and verified. Next real action: partner signs in with the approved email; Owner may assign a separate gifting allowance later. Keep that allowance unallocated until instructed.

## Spanish partner dossier, 2026-10-25
- User requested a complete Spanish PDF and ready email for Victoria following their call. Created and saved Vitolas_Studio_Dossier_Victoria_Caridad.pdf, 22 pages, with clickable dashboard/referral/tool/support links and current bold logo/approved Future Beauty artwork.
- Covers tools/models, live public plan prices, exact-route example creation costs, beauty demo, all five dashboard views, attribution, vouchers, commissions, training offers, contact scripts, four-week plan, prompts, publication review and support/refund FAQ.
- Grounded in current main dc46a790aaad404cc31a25bb1d38046c9fdbf56e and public homepage/terms/support checked 2026-10-25. All 22 page renders visually inspected; text/link extraction verified. No website, rates, wallets, actual account or payout changes.
- Preserve distinction: planned initial 20 x 200-credit invitations require actual Owner allowance assignment; 60% class-credit discount and 15th/month-end payouts remain proposals, not active promises. No blanket exclusion of statutory refund rights.
- Ready Spanish email supplied in conversation for victoriaandreacaridad@gmail.com; not sent. Next: share PDF/dashboard, confirm actual allowance and settle class-credit/payout terms before offering those benefits.

## Stable session notifications, 2026-10-25
- User reports repeated Vitolas refreshes. Root cause in current source: every Clerk notification called refresh, whose clear() hides and rebuilds panel, resets forms/pagination and renews tokens that can trigger more notifications.
- Baseline ea6e0cef68465cbba592d379fe5c737a80506446, isolated worktree vitolas-stable-session. No unrelated credit audit fixes included.
- Subscribe to meaningful signed-in identity changes only: user, session, primary email and verification details. Ignore same-identity/token-renewal events. Initial/manual refresh, real account changes, logout clearing and bfcache recovery remain.
- Regression sends 20 same-session notifications while editing a voucher and verifies no extra API calls, lost text/credits or changed tab. Existing role/logout race tests remain.
- Published PR #568, source fff698719acd0b87a7cdd3da3c1a43f4693ed7ff; merge 5b82ee38d9d80d13864d49f619f1bf00b334572d. Marker 20261025-stable-session1.
- Validation: 26 unit/required Image checks, 251 browser assertions at 390/1440px; partner CI 40229588524 passed. Exact-merge Cloudflare Pages check 121279661607 succeeded. Production HTML/CSS/JS each HTTP200 and exact reviewed bytes.
- Live 390/1920px all five sections/no-scroll/typography checks passed with synthetic read-only accounts. HTML SHA256 720713ef222d46c84fabde3128e567a479ad739edcab1a7ad1ffad30c86f8c56; JS abff813c7fba4c78d2a5c6fdd3b297c4f8f08ec5bdc46182517072a86821348d. No real account mutations.
- Status: published; no remaining action for session-notification resets. Separate provider financial audit/fixes tracked in OWNER-WORK-STATE.md.

## Approved simplified Invitations layout, 2026-10-25
- User approved visual mockup generated_images/exec-2eecc9b4-08ab-4448-bffc-99bb7e6e5c34.png and explicitly requested implementation.
- Baseline 7b04b0bc811f77dba932b5a635bfe226c377fb82, isolated worktree vitolas-invite-simple. Keep hero, logo, typography, neutral palette, results hierarchy and no-downward-scroll navigation.
- One two-column working panel: optional client/brand, credit presets/custom 1-500, validity 7/14/30 days and one Create link action on left; actual reactive invitation preview on right. Phone stacks both within the same panel.
- Real available credits now sit beside heading. Owner-only Asignar créditos opens the existing audited budget form inline, initially closed; reserved/redeemed totals move to history. No illustrative balances in production.
- Real generated link/copy/message replaces preview, while form stays present. Create is disabled with Enlace creado until Crear otra invitación resets it. Preserve history, deactivation, canje identities and pagination.
- Preview reuses existing approved beauty photo asset, no new paid generation. Zero budget remains explicit and blocks issuance; referral remains usable. No Worker/schema or commission changes.
- Files: Vitolas HTML/CSS/JS, existing browser role test and this checkpoint. Asset marker 20261025-invite-simple1.
- Published PR #564: source 70e268ce4f26820c31f3acebc3d0dd8f7407a561; merge 9f250d41959103ce3bf45619630b927d4cad596b.
- Validation: 26 partner/required Image checks and 350 browser assertions at 320/390/1440px passed. Owner inline budget, partner restrictions, real creation/copy/deactivation flow covered with isolated fixtures. Partner CI run 40222382407 passed.
- Cloudflare exact-merge check 121258255467 succeeded for pvlab-studio; scoped verifier LIVE_VERIFIED. Production HTML/CSS/JS HTTP200 and exact reviewed bytes. SHA256 HTML f3353a4b46c204eb4f021c604e9a110ae09338dfdb932fc02d874351a026f655; CSS a54335f3a1b8f1f6e891131c55fe3d77e8e76cf6b7e3629051991479dfceec3e; JS dcbfadbc618f67317d71dce3c0fd2e7b6b40e95152ee90cc55cc2c0f3e1c0f97.
- Live 390/1920px passed: new balance/form/preview, hidden Owner controls for partner, all five sections, unified font, no automatic downward scroll or overflow. Synthetic read-only account responses, no real signed-in observation.
- Status: published at https://pvlab.studio/vitolas-studio#invitaciones. No remaining implementation action; no real vouchers, allowance grants or messages created.

## Navigation without automatic downward scrolling, 2026-10-25
- User rejects section navigation scrolling down and cropping the hero. Every section control should open its destination directly, keeping the page starting at the hero with no scrolling animation.
- Baseline f4bc0ce (current main), isolated worktree vitolas-navigation. Preserve compact results, unified typography and all functionality.
- Section buttons, keyboard tabs and hash navigation reset directly to page top with instant positioning. No scrollIntoView calls remain. Voucher results and copy fallbacks retain focus using preventScroll.
- Scope: Vitolas JS/HTML asset version, existing partner unit/browser tests and this checkpoint. No financial, voucher capacity or real account changes.
- Published PR #562: reviewed head 18d6145eb0d9d40655ee8e8951675411620061fa; production merge f4aaff388d2dd30de54a6dcac76ff85f16bf0b08. Asset marker 20261025-navigation1.
- Validation: 26 partner/required Image checks, 241 browser assertions at 390/1440px; Partner CI run 40221029858 passed.
- Exact-merge Cloudflare Pages check 121254258023 succeeded for pvlab-studio; scoped release verifier LIVE_VERIFIED. Production HTML/CSS/JS each HTTP200 and exact reviewed bytes. SHA256 HTML a8af24104f96165fe1ae3624829ea71aad40249874768fde01784eeeb7d42828; JS 5e21ab001d172c69ecc86fc7a44252769a49082e699bea9f48e48787a367502b; CSS unchanged.
- Live browser at 390/1920px passed all five sections: every tab click leaves scrollY zero and hero at viewport top; current typography/compact board retained, no overflow or Unicode arrows. Synthetic read-only account responses only, no real signed-in observation or mutations.
- Status: published at https://pvlab.studio/vitolas-studio. No remaining action for this navigation fix. Keep this no-downward-scroll behavior in future Vitolas work.

## Compact results and unified typography, 2026-10-25
- User requests a smaller results box and at most two typefaces across the page, with an elegant, comfortable feel. Reference uploads image(20261025-175901).png and image(20261025-175927).png.
- Baseline 4b728001ea89794f6aaf27e0b89078eefa79a1cf, isolated worktree vitolas-type. Preserve results order, workflows, actual EUR figures, logo and beauty hero.
- Use the existing self-hosted DM Sans (PV Lab Navigation) throughout the workspace, controls and account menu. Unify body/control text at 14px and supporting labels at 12px, restrained heading scale and two weights. Inputs retain accessible sizing.
- Results board has less padding, reduced control spacing and 48px monetary values desktop / 44px phone. No feature or data changes.
- Changed files: lab/vitolas-studio.css, lab/vitolas-studio.html and this checkpoint. Asset marker 20261025-type1.
- Published PR #560: reviewed head 1639f33df796ca23b7c8119827f9d44c3b79cc14; production merge c5be7b6adafcf491dcd20e00fec49945959a831f.
- Checks: five required Image UI contract tests and 341 dashboard browser assertions at 320/390/1440px passed; phone and desktop screenshots inspected. Partner CI run 40219310613 passed.
- Cloudflare exact-merge check 121248088255 succeeded for pvlab-studio; scoped verifier LIVE_VERIFIED. Actual HTML/CSS/JS returned HTTP200 and matched reviewed bytes. SHA256 HTML 9ba209d0bcb1ad7e4abcbbc7f6242f6d1d76869bd4a84363af49d71a9db737ed; CSS daaab424b670e6d604b6de8f67c09fc9f8d047b29631ae10bd7e166dd24c3379. JS unchanged from prior release.
- Live-browser 390/1920px: all five sections use the same computed font family, desktop results board under 160px high, correct results order, no overflow or Unicode arrows. Synthetic read-only account responses only.
- Status: published at https://pvlab.studio/vitolas-studio. No remaining action for this change; no real account or credit mutations.

## Results first and slightly denser spacing, 2026-10-25
- User approved the current Overview and Invitations screenshots and requested only slightly smaller spacing/cards while retaining large money figures, plus the proposed results hierarchy.
- Baseline c106cd4c98daf123f9a0e349a56c06da6a5b9a77. Isolated worktree vitolas-results. Reuse bold logo, beauty hero, neutral palette and five inline sections.
- Overview now leads with active subscribers, paying customers, total paid and recorded commission in one board, followed by referral link/invitation capacity and recent activity. Registrations and 50%/20% terms remain visible as secondary context.
- Subscriber and payer shortcuts open the actual scoped Clients filter. Invitations, budget, forms and preview use slightly denser spacing. Money figures remain 58px desktop, 44px phone, and occupy full-width phone rows to avoid splitting amounts.
- Server source and EUR currency remain unchanged. No fabricated prospects, payout statuses or financial data; prospect CRM and recorded settlements remain separate future functionality.
- Scope: Vitolas HTML/CSS/JS, existing partner unit/browser tests and this handoff. No backend/schema, credit grants, real voucher creation or outbound messages.
- Published PR #559: reviewed head a498dd0973bd8ad02a595cc8da8ddfc0eaba7ac2, production merge 47e93538d3636c9f3808d65123d6bc938c404f77. Asset marker 20261025-results1.
- Checks: 26 unit/required Image tests; 441 browser assertions at 320/390/1440/1920px before final phone spacing fix, then 208 final phone assertions at 320/390px. Partner CI run 40217898037 passed.
- Cloudflare exact-merge check 121243721670 succeeded for pvlab-studio; scoped verifier LIVE_VERIFIED. Production HTML/CSS/JS each HTTP200 and exact reviewed bytes. SHA256 HTML 04463ace5a09f6eea07441a26e8d637723cfb8f5cc5e59875797b2b55c65423e; CSS 020abbfc85973a8a4bb040b08b43f9d79cb9eed48ed38d0d8e54b6b6e9c308e2; JS fc30b6544dbdf21dd55b544d35e7cfecb8f5fe2f694a96110b394bac81c58e1e.
- Live-browser 390/1920px passed: correct metrics order, all five inline sections, current logo, no Unicode arrows or horizontal overflow. Synthetic read-only responses only, no real signed-in account observation.
- Status: published at https://pvlab.studio/vitolas-studio. No remaining action for this layout change. Prospect CRM and actual settlement recording remain future work, not shipped features.

## No Unicode arrows in controls, 2026-10-25
- User explicitly prohibits the arrow characters that iOS renders as blue emoji. Remove them, do not replace them with another Unicode arrow.
- Applies to static and dynamically generated Vitolas buttons/links. Use clear text labels; pagination uses Anterior / Siguiente. No decorative row chevrons.
- Carry this preference into subsequent PV LAB interface work. If a future control needs an icon, use the established non-emoji icon system only when requested or necessary.
- Scope: Vitolas HTML/JS/CSS, existing UI contract and this handoff. Preserve all workflows, permissions and layout.
- Published PR #558: source 5405f265a06e8825f657b66bfa67239b49892d42, production merge 8aa34c0e7ae031bebcb3ca6a9450b9e7d56ecfc2. Asset marker 20261025-no-arrows1.
- Validation: 26 partner / required Image contract tests pass; 227 dashboard browser assertions pass at 390/1440px. Partner CI run 40211772314 passed.
- Cloudflare Pages exact-merge check 121225894104 succeeded for pvlab-studio. Read-only verifier returned LIVE_VERIFIED. Production HTML/CSS/JS each HTTP200 with exact reviewed bytes.
- Production SHA256 HTML b3fa16eadaa0bd45c25ecae9fe1240110db35b4bea12f3145f1b2489ab7bf7ea; CSS fa38d99eee67cf3714e646416f0adfc938ad8824c39e6220a2f5ee9dc23239f2; JS 86049fc471dcf2c0f5e5ea7ee5b359ec29fec85c7fdf525402c663181f20273b.
- Live-browser check passed at 390/1920px: all five sections, no Unicode arrows in rendered main content, no overflow or page errors. Synthetic read-only account responses only; no real signed-in account data, credit mutations or messages. No remaining action for this fix.

## Full-page working desk and current branding, 2026-10-25
- User rejected tiny modal tools, duplicated Help/commission-condition buttons, the old spaced wordmark and a boring empty client-first screen. Explicitly requested a redo.
- Baseline f28f7832365a1e9c6c967bd14eab1e0b8e592507, isolated worktree vitolas-desk. Keep unrelated app and concurrent work unchanged.
- New workspace: five large, persistent sections, Resumen / Clientes / Invitaciones / Comisiones / Guía. All tools render inline as full-page panels. No dialog or modal APIs remain.
- The correct logo reuses the exact current homepage asset lab/branding/pvlab-wordmark-bold.svg?v=20261022-bold1. Do not recreate it as letter-spaced text. Personal account avatars retain their actual signed-in identity.
- Preserve the approved Future Beauty photograph at lab/visuals/vitolas/future-beauty-v1.webp, wide workspace and neutral high-fashion palette. No paid image generation or new dependencies.
- Overview shows accrued commission, the 50%/20% agreement, share/copy link, invitation budget and registration/payment/subscription/revenue totals. Empty accounts get practical next steps instead of a large empty table.
- Latest registrations and purchases are visible on Overview once activity exists. Actual server-scoped activity only, with no illustrative clients, forecasts, balances or invented business names in production.
- Client list keeps global search/filtering, per-client receipts and 20-client pagination across server chunks. Permission and identity resolution remain on the server.
- Invitations combine editable 1-500 credits, 7/14/30-day expiry, optional identifying label, live gift preview, created link/copy message, available/reserved/redeemed budget, history and redemption records.
- Invitation and redemption history paginate 20 rows locally within the existing latest-60/latest-100 API bounds. On phones these records and commission receipts use labelled full-width rows instead of squeezed columns.
- Owner alone sees the allowance form; the unchanged actual admin API still enforces authorization and audited limits. Zero budget is visible and explained, while the personal referral remains usable.
- Commissions use a full-width report, actual receipt states, held amounts and CSV. Existing 50% first payment / 20% eligible subscription policy, six calendar months and manual settlement semantics are unchanged.
- Guía contains the existing eight FAQ/commission topics in one readable page. No duplicated Help/conditions controls or collapsed redemption table.
- Section hashes support direct links and refresh. Tabs support keyboard navigation. Logout and account changes clear all customer, receipt, voucher and overview caches; stale-response guards remain.
- Changed files: lab/vitolas-studio.html, lab/vitolas-studio.css, lab/vitolas-studio.js, tests/lab-partner-dashboard.test.mjs, tests/lab-partner-dashboard-browser.mjs and this scoped handoff. No Worker/schema changes.
- Asset marker: 20261025-workdesk1. The existing logo SVG is referenced, not modified.
- Local checks: 34 focused partner/referral/menu/approved Image checks passed; JavaScript syntax, balanced HTML and diff checks passed.
- Browser checks passed at 320px (99 assertions), remaining 390/768/1440/1920px (425), and the final phone layout at 320/390/768px (297). Final CI runs all five sizes together.
- Coverage includes current logo loading, no modal elements, all five inline sections and keyboard tabs, 105 clients/six pages, search races/errors, 43 invitation/23 redemption paging, CSV safety, custom credit/expiry choices, Owner budget and both-role logout races.
- Desktop empty Overview and invitation editor, and phone layouts, were inspected. No real users, invitations, payments, allowance grants, customer credits or outbound messages were created for QA.
- Published PR #556: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/556
- Reviewed head f124900c4a41a156d125e53f73dae664f1d843ff; production merge 12f6a3ff1f7472d8fb1ff369d22dee7c13f8a1ab. All eight final PR workflows passed. Partner run 40210330832/artifact 12605655214 covers all five viewport sizes.
- Exact-merge Cloudflare Pages check 121220874561 succeeded. Scoped verifier returned LIVE_VERIFIED for lab/lab.js, SHA-256 3afcb4009bf4267c7ac8ec241b291c755aab9bae5e48ad39a22f07538fec2b5f.
- Actual production Vitolas HTML/CSS/JS and the current bold logo SVG each returned HTTP 200 and exactly matched reviewed merge bytes. Asset marker 20261025-workdesk1.
- Actual live rendering passed at 390/1920px using synthetic read-only API responses: current SVG loads, all five inline sections open at page width, no modal elements, no horizontal overflow, zero-budget guard and eight-topic guide. No real signed-in account data observed.
- Additional account-menu hit testing confirmed the menu remains above the navigation on a small screen. No extra product change was needed.
- Status: published at https://pvlab.studio/vitolas-studio. No Worker or schema redeployment needed. No real promotional allocation, voucher issuance or outbound contact performed.
- Next real use: reload Vitolas Studio. Owner can assign invitation capacity in Invitaciones when needed; Victoria can share her existing referral link independently. Keep tools inline and help/terms unified in Guía.
- Real signed-in production account observation remains separate from synthetic visual/role tests. Mail provisioning, automatic payouts and the standalone dossier remain outside this redo.

## Earlier exact format and usable scale, 2026-10-25
- User rejected the shipped execution as empty, too narrow and too small, then explicitly supplied the exact visual reference to implement.
- Current reference: d9a59652-a2e8-479c-82b7-81f790da0ea7.png, attached 2026-10-25. Follow its proportions and full-width layout; do not substitute a new layout or remove working tools.
- Baseline main 87903a47e15e0ae07f70b1a96e6c692204002c23, after unrelated Upscaler #550. Isolated local worktree vitolas-restore. Other source changes are preserved.
- The reference has a single integrated PV LAB / Vitolas Studio masthead, beauty photograph and account avatar, not a separate global header plus a second inset hero.
- Main workspace spans the viewport with proportional gutters, rather than the old 1440px outer limit. Link row, inline label/value metrics, large client heading, underline filters and search follow the supplied composition.
- Main table uses readable type, circular initials, status pills, row chevrons and payment detail on demand. Customer labels use actual verified emails; no fictional business names or balances are inserted.
- Real 20-client pagination replaces unlimited row appending. Previous/next controls retain cached pages and fetch the next server chunk only when needed. Search and filters reset to page one and still query every scoped record.
- Page cache and controls clear on logout, account change and filter/search errors. Stale requests cannot populate another session or overwrite a newer query.
- Invitation form restores editable 1-500 credit amounts plus 7/14/30-day validity, alongside presets. Existing budget, idempotency, one-redemption and identity restrictions stay enforced by the unchanged backend.
- Commission report/CSV, billing holds, redemption history, Owner budget and FAQ stay functional. Footer terms are readable. Open Studio remains in the account menu.
- Existing 50% first payment / 20% eligible subscription agreement and six-calendar-month window remain unchanged. No Worker or schema changes.
- Frontend asset marker 20261025-reference2. Reuse lab/visuals/vitolas/future-beauty-v1.webp; no new image generation.
- Changed files: lab/vitolas-studio.html, lab/vitolas-studio.css, lab/vitolas-studio.js, tests/lab-partner-dashboard.test.mjs, tests/lab-partner-dashboard-browser.mjs and this scoped handoff.
- Local validation: 34 focused partner/referral/menu/approved Image checks passed; syntax and diff checks passed.
- Browser checks passed at 320/390/768/1440px (338 assertions), 1920px (80), plus final 1440px search-error/cache regression (101). Final CI runs all five sizes together.
- Coverage includes the 105-client/6-page boundary across server chunks, previous pages, global search, stale searches, failed-search cache cleanup, custom credit amounts/expiry, CSV, Owner access and both-role logout races.
- Actual desktop 1440/1920 and phone 320 screenshots inspected against the supplied reference. Workspace fills the available width; no horizontal page overflow.
- PR #552: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/552
- Final small-screen correction keeps the title and sign-in action from overlapping after logout. Browser assertions now verify both their geometry and absence of horizontal overflow.
- Published PR #552. Final reviewed head 01c9737b43d88fc2c77dba01a333c25087608c5a; production merge ab2a91ace8114ca24519bfc1a4ea9aac7c094459.
- All eight final PR workflows passed. Partner run 40204916973 covers all five viewport sizes; artifact 12603531627. Final 320px logout geometry passed locally before the final source update.
- Exact-merge Cloudflare Pages check 121204406137 succeeded. Scoped read-only verifier returned LIVE_VERIFIED for lab/lab.js, SHA-256 3afcb4009bf4267c7ac8ec241b291c755aab9bae5e48ad39a22f07538fec2b5f.
- Production Vitolas HTML/CSS/JS each returned HTTP 200 and exactly matched the reviewed merge. Asset marker 20261025-reference2.
- Actual production page rendering passed at 390/1920px with synthetic read-only API responses: single integrated masthead, full-width workspace, empty-state table, invitation controls, budget guard and Escape close. Desktop screenshot inspected.
- Status: published at https://pvlab.studio/vitolas-studio. No Worker or schema redeployment required. Real signed-in account data was not used as visual fixture data.
- Next action: reload Vitolas Studio. Keep this exact supplied format and readable scale for follow-up work; preserve the existing commission and invitation capabilities.
- No real clients, purchases, invitations, allowance changes, credit grants or outbound messages were created for verification. Real signed-in Victoria/Owner sessions are separate from synthetic QA.
- Full standalone dossier, mail provisioning and automatic payouts remain outside this correction.

## Earlier daily workspace, 2026-10-25
- User approved the two simplified visual mockups and explicitly requested applying them to the website.
- Baseline main: bb99854d0b3d62c81e20607e7922a46a05f0143c. Current unrelated Agency work is preserved.
- New main screen: 138px beauty masthead, personal link/copy, one primary invitation action, three compact totals and one searchable client list.
- Reuse approved asset lab/visuals/vitolas/future-beauty-v1.webp. No new paid media or imagery.
- Approved mockups: generated_images/exec-79c5c5fe-c2a7-4dff-832b-3fc0e3e1ce9e.png and exec-4eec5683-fb4b-48b7-a76e-190322828dfd.png.
- Removed duplicate activity/financial panels and section navigation from the daily screen.
- Commissions/CSV, invitation history, Owner budget and FAQ remain available in accessible native dialogs.
- Invitation dialog: optional identifying label, 100/200/300 credit presets, one redemption and 14-day validity. Existing issuance/idempotency/allowance checks remain unchanged.
- Optional name/email is an invitation label, not recipient binding or email sending. The form explains that whoever receives the link can redeem it.
- New registered-without-purchase filter and verified-email search query the entire scoped client set, including correct pagination after search/filter.
- Server builds per-client commission summaries from immutable ledger customer identity; never joins people by email or redacted labels. Internal customer IDs are discarded before serialization.
- Clicking a client reveals its verified payments inline. Reviewed/held amounts are marked and excluded from accrued totals.
- Existing 50%/20% agreement, six-calendar-month window, billing holds, privacy/Owner guards and voucher capacity unchanged.
- Frontend: lab/vitolas-studio.{html,css,js}; backend: lab-worker/partner-{dashboard,commissions}.mjs, Worker version marker only; existing schema unchanged.
- Validation: 34 focused partner/referral/menu/Image contract tests, 137 Worker/billing/promotions/holds tests and nine sandbox billing tests passed.
- Browser: 295 assertions passed at 320/390/768/1440px using synthetic identities. Covers search/filter/detail, stale search responses, native dialogs, CSV safety, invitation errors/retry/copy/deactivate, zero budget, Owner navigation and both-role logout races.
- Desktop, invitation dialog and 320px screenshots inspected. No horizontal mobile overflow. Actual source layout matches the approved mockup.
- Published PR #549: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/549
- Reviewed head fcdc4226ceea631e235988c70405c4141251869e; production merge b14cbdc463ed1fef6dba3adff30e8a1f0cadc600. All ten final PR workflows passed, including partner browser run 40201677479, artifact 12601054166.
- Production Worker run 40202131358/job 121195333161 succeeded, including deployment and health. Live version pv-lab-2026-10-25-vitolas-workspace-v1. Shared isolated billing sandbox run 40202131229 also succeeded.
- Exact-merge Cloudflare Pages check 121195660676 succeeded. Scoped verifier returned LIVE_VERIFIED for lab/lab.js, SHA-256 3afcb4009bf4267c7ac8ec241b291c755aab9bae5e48ad39a22f07538fec2b5f.
- Actual production Vitolas HTML/CSS/JS returned HTTP 200 and exactly matched reviewed merge bytes. Asset marker 20261025-workspace1.
- Live page rendered at 390/1440px with synthetic, read-only API responses: compact masthead, empty state, contained layout, invitation dialog, zero-budget guard and Escape close passed. Screenshot inspected. This is production-asset rendering, not observation of Victoria's real session.
- Status: frontend and Worker published. Private page https://pvlab.studio/vitolas-studio; share link remains https://pvlab.studio/vitolas.
- Changed files: lab/vitolas-studio.html, lab/vitolas-studio.css, lab/vitolas-studio.js, lab-worker/partner-dashboard.mjs, lab-worker/partner-commissions.mjs, lab-worker/worker.mjs (version marker), tests/lab-partner-dashboard.test.mjs, tests/lab-partner-dashboard-browser.mjs and this scoped handoff.
- Next real use: open Vitolas Studio from the existing Victoria/Owner menu. Owner can set the existing invitation allowance from Tus invitaciones if needed; this release did not allocate credits.
- No real invitations, allowance allocation, payments, customer credit grants, outbound messages or real signed-in production sessions were used for verification.
- Full standalone dossier and automatic payouts remain outside this request.

## Commission dashboard and neutral redesign, 2026-10-25
- User rejected the olive/green palette, requested a thinner hero and business results immediately below it, then latest signups/purchases, private Owner visibility, a clean referral URL and an FAQ. Full dossier is deferred.
- Commission rule explicitly selected by user: 50% of each referred customer's first paid purchase or first subscription payment; later subscription installments at 20% for six calendar months. Never add both rates to one receipt. Window begins with the first paid subscription installment, does not restart on reactivation, and excludes the exact six-month boundary.
- Baseline 940c00c99f8a57877dd587177c3249917b0730bc, isolated branch feature/vitolas-commissions-20261025. Existing voucher/Owner work in other PRs is outside this scope.
- Active code: lab/vitolas-studio.{html,css,js}, lab/vitolas.html, lab/vitolas-link.js, lab-worker/partner-{dashboard,commissions}.mjs, lab-worker/customer-billing.mjs and migration 0038.
- Reused the approved beauty hero, now a compact masthead; neutral grayscale invitation tools. Business link, counts, cash totals, commission agreement, latest signup/payment cards and full contact filters precede vouchers.
- Report, CSV and per-receipt rates/window dates come from actual EUR revenue ledger entries joined to signed processor payment timing. New migration 0038 stores only payment context and the stable alias binding; no payouts or wallet/allowance changes.
- Existing signed, fully paid billing branches record payment context idempotently. First/renewal ordering uses processor payment time, not webhook arrival order. Missing timing or ambiguous first-payment ordering is sent to reconciliation rather than guessed.
- Refund/dispute accounts have all commissions held for reconciliation, excluded from the registered total. No automatic settlement or payout date is invented.
- Partner report is always scoped by verified server-side identity. Closed/unverified emails are redacted; global Owner receipts, prompts and media are excluded. Contact filters query all scoped records, with pagination.
- Public pvlab.studio/vitolas resolves only the registered existing personal referral. Cached approved identity can activate the alias without a Clerk lookup. Private reporting remains at /vitolas-studio under the same login guards.
- Static invitation entrance has a checked destination and safe failure state, preserving the rest of the static site's routing. It cannot redirect to arbitrary domains or use a visitor-supplied ref code.
- FAQ explains attribution, 50/20 calculations, the six-month window, verified money, billing reviews, vouchers, privacy and manual settlement coordination. No standalone dossier created.
- Local validation: 201 relevant Worker/auth/billing/promotions/referral/trial/partner/menu/Image checks passed; 24 focused final partner/Image checks passed after added filter/link checks. Syntax and diff checks passed.
- Browser additions cover compact hero, grayscale card, business-before-vouchers order, recent activity, scoped contact filters, real CSV download/formula protection, FAQ, public referral entrance and private data cleanup.
- Published PR #541: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/541
- Code merge 006b8c1a33826cda616c0f3d0d4b4d5f7928f36a; integrated reviewed head 02fd5221933e46e441ce36c9fbf403dc0a3ecee5. Frontend visually reviewed at 716f1894535307625292b6066a385824565095d1.
- Integrated main 8fbc86478eec56b47da86db0bab4465999f29681 to retain Owner pagination and Agency. The only conflict was adjacent migration commands; both 0038 and 0040 are retained. All Agency Worker routes and scheduled handlers preserved.
- Integrated local Worker/partner/sandbox/Image suite: 138 checks passed. Final binding/partner/Image suite: 25 passed. A complete controller/DOM binding contract now protects all dashboard sections during rearrangement.
- All ten final integrated PR workflows passed. Integrated partner run 40182033174 passed 273 browser assertions, including the actual updated Owner page. Final artifact 12594494197; identical frontend at artifact 12594309262 was inspected on desktop/390/320px.
- Production Worker run 40182257193/job 121135583607 succeeded, including both migrations and health. UUID eb14aeea-ac06-492b-aa22-9cc90b1be7c7. Live health reports pv-lab-2026-10-25-vitolas-commissions-v1.
- Shared billing sandbox run 40182257014 also succeeded, including isolated schema setup/deployment and test-only health.
- Exact-merge Cloudflare Pages check 121135750427 succeeded. Scoped verifier returned LIVE_VERIFIED for lab/lab.js, SHA-256 3afcb4009bf4267c7ac8ec241b291c755aab9bae5e48ad39a22f07538fec2b5f.
- Production Vitolas HTML/CSS/JS, public invitation HTML and redirect helper independently matched reviewed bytes, HTTP 200. Public page has no CSP preventing its tested module redirect.
- Public alias lookup returned HTTP 200 with correct pvlab.studio CORS and https://pvlab.studio/?ref=9GNPKYUW. This initializes only the authorized vanity binding to the existing referral; no signup, payment, voucher or credit grant is generated.
- Status: frontend, schema, production and sandbox Workers published. Real signed-in Victoria/Owner sessions and real purchase/renewal/redemption activity were not used as tests. No real promotional budget or outbound message was created.
- Current scope tracks accruals and holds, with CSV export. No automatic refund reconciliation, settlement bookkeeping or bank payout execution is implemented; held accounts need manual reconciliation.
- Next real action: share https://pvlab.studio/vitolas. Victoria sees referred activity/commissions in her normal Vitolas menu; Owner opens the same scoped report through the existing private link. Full standalone dossier remains deferred.

## Credit invitations and working dashboard, 2026-10-25
- User requested a more useful, refined dashboard and a voucher creator so Victoria can offer credits to prospects.
- Published PR #537: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/537
- Reviewed head 87d4cb7b2f96c8b1513ff4f1371b7e4db776d59c; code merge 709effcc1ee94563ef8e07cf9086dd0c28389914. Baseline bcd80d965b19c7d084b0c5c94009c4bb9467f3c6; no unrelated source edits.
- Reused the approved Future Beauty WebP below. New editorial navigation, gift preview, campaign form, allowance summary, invitation status and private redemption history.
- Frontend: lab/vitolas-studio.{html,css,js}, lab/account.{html,js}; backend: lab-worker/partner-vouchers.mjs, shared partner resolver, Worker routes and migration 0037-partner-vouchers.sql.
- Owner alone sets a lifetime promotional credit allowance from the same dashboard. Default is zero; this release allocated no actual promotional budget and created no real vouchers or wallet grants.
- Victoria cannot increase the budget or read owner-wide vouchers. All partner requests reverify her approved primary email; admin requests use the actual OWNER_DB role/provider guard.
- Each invitation: 1-500 credits, one recipient, campaign name, 1-30 days. Existing atomic redemption/wallet trigger retained; one Vitolas trial per customer, no self redemption, closed/billing-held accounts rejected.
- SQLite triggers enforce capacity under concurrent creation and owner restoration. Expired/deactivated unused reserves release automatically; redeemed credits stay committed. Allowance edits have an audit trail.
- UUID-based idempotency prevents duplicate reservations on network retry; reusing a request with changed details is rejected.
- Gift URL combines voucher and existing referral code. The real account controller claims the referral under unchanged attribution/reward rules; the customer must explicitly redeem the voucher.
- Reports redact closed/unverified recipient emails. No real purchases, provider generations or outbound messages were made. Clipboard sharing was tested with synthetic data only.
- Local validation: 170 Worker/partner/promotions/referrals/trial/holds/menu/Image checks passed. Syntax and diff checks passed.
- All 11 final PR workflows passed. General account browser needed one targeted retry for an existing shared-checkout request/count timing race; no product code or assertion was weakened.
- Partner run 40177903389 passed 208 browser assertions at 320/390/768/1440px: create/error/retry, sharing, budget controls, deactivation, zero allowance, Owner navigation and both-role delayed-response isolation.
- Artifact 12593262321: desktop, phone, Owner and unallocated layouts inspected. Combined referral/voucher account-controller flow also passed at desktop/mobile widths.
- Worker production run 40178243603/job 121123504597 succeeded, including migration 0037 and health. Worker UUID 771a39f1-0301-40e4-b110-49f00bf5232a; live health reports pv-lab-2026-10-25-vitolas-invitations-v1.
- Exact-merge Cloudflare Pages check 121123822822 succeeded. Scoped verifier returned LIVE_VERIFIED for lab/lab.js v=20261024-fashion-main1, SHA-256 3afcb4009bf4267c7ac8ec241b291c755aab9bae5e48ad39a22f07538fec2b5f.
- Production Vitolas HTML/CSS/JS and account.js independently matched reviewed bytes (HTTP 200). Account HTML references partner=20261025-invitations1; existing Cloudflare email-protection transforms its footer, so raw HTML bytes differ.
- Status: frontend, schema and Worker published. Actual Victoria/Owner signed-in production sessions and real referral/redemption activity were not used as tests.
- Next real action: Owner Dashboard > Vitolas Studio > Presupuesto total. Set the allowance, then Victoria can create and copy her credit invitations.

## Future Beauty visual refresh, 2026-10-25
- User requested a shadowed high-fashion future-cosmetics hero and clearer explanation of Victoria's referral workflow.
- One built-in imagegen artwork: adult beauty portrait, real skin, smoked glass/chrome, deep graphite shadows, left negative space; no text or logos.
- Source generation: generated_images/exec-903f72f3-7a61-4997-acea-96007e9b226a.png. Project asset: lab/visuals/vitolas/future-beauty-v1.webp, 1983x793, 64,932 bytes.
- Scoped HTML/CSS refresh: responsive photographic hero, refined typography/rules/metrics, clearer new-account referral instructions. Auth/API/payment code unchanged.
- Baseline fad4fca5b6dd3898fe33aac2e97c30a35bae337c; 13 focused partner/Image contract tests passed locally.
- Browser workflow 40139208994 passed 116 assertions at 320/390/768/1440px: hero loading/title bounds, contained layout, Owner click-through, role denials and logout isolation. Desktop/320/390px artifact 12577904554 inspected.
- Visual PR #535 published as fc3aa0889988a74e313c424fc5f79b41d5ed7027; reviewed source 3877918d8fe8311c5988c3ec50bb6b90fce8f919.
- Scoped release verifier returned LIVE_VERIFIED for this merge. Production Vitolas HTML/CSS and hero WebP independently matched reviewed bytes (HTTP 200); asset Git blob 61161d7d5b8231ee0edb1bff9febc26d35c7e230.
- Current visual status: published. New real registrations, purchases and signed-in production roles were not simulated as real customer activity; backend and referral rules remained unchanged.

## Owner review extension, 2026-10-24
- User explicitly requested private Owner access to Victoria's dashboard.
- Hidden links in Owner sidebar/mobile navigation reveal only after verified owner session; no general customer-menu changes.
- Same Vitolas page selects the customer or admin endpoint from the verified session role.
- New read-only GET /api/admin/partners/vitolas-studio reuses the existing OWNER_DB role/auth-provider guard.
- Owner data scope resolves Victoria's approved verified email on the server, ignoring browser-supplied customer IDs.
- Before Victoria's first login, owner sees an activation-pending message, with no fabricated link or counters.
- No promotion of Victoria to owner, payouts, balance changes, email or schema migration.
- Validation: 44 focused checks and 103 Worker tests passed; final browser run 40136336537 passed 81 assertions including actual Owner sign-in/menu/click-through, denied customers, pending activation and both-role logout races. Desktop/phone artifacts 12576849464 inspected.
- Extension PR #534 published as dbf8e3ce8e8afed2aab7698c33bbc8032edc5919; reviewed head 17eb5224bbafa83a0c9b2b05feb28d09a629bb98.
- Worker production run 40136458774 completed successfully, including deployment and health.
- Scoped release verifier returned LIVE_VERIFIED for this merge; production Owner HTML/JS and Vitolas HTML/JS independently matched reviewed bytes (HTTP 200).
- Current extension status: published. Actual Alejandro/Victoria production sessions have not been used; next real-account check is Owner Dashboard > Vitolas Studio.

- Approved and published 2026-10-24: **Vitolas Studio**, for Victoria Caridad.
- Authorized primary email is represented by SHA-256 in the Worker; no private address in public source.
- PR: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/533
- Reviewed code head: `550c90d8f401d3dbeda558adbf329b95983bdbb8`.
- Production merge: `f59a75ab5ce3fde29cf35d314cc972ae0b585c18`.
- Live entrance: https://pvlab.studio/vitolas-studio
- Source: `lab/vitolas-studio.{html,css,js}`, `lab/account-menu.js`, `lab-worker/partner-dashboard.mjs`.
- Authenticated read endpoint: `GET /api/customer/partner`.
- Account-menu import/cache markers refreshed in account, homepage/Moods, Studio and Mood Creator.
- Worker checks a freshly verified Clerk primary email on every dashboard/page request.
- Dedicated Studio identity uses existing server-side identity links.
- Session/menu discovery stays read-only and never waits on Clerk.
- First-login contact discovery comes from existing background sync; direct dashboard access verifies and populates the menu immediately.
- Closed accounts, unverified/changed emails and failed upstream verification cannot read partner data.
- Referral scope is the authenticated internal subject, never a browser-supplied customer ID.
- Existing stable referral link, attribution window and referral reward rules are reused unchanged.
- Spanish panel: registrations, paying customers, active subscriptions, verified purchase counts and paginated contacts.
- Closed referred identities are anonymized; prompts, media, provider finance and owner-wide data are excluded.
- Purchase metrics use immutable verified purchase/subscription entries and aggregate all pages.
- No commission or payout agreement has been defined or implemented.
- No manual credit adjustment, real purchase, provider generation or outbound email was performed.
- Local checks passed: 103 existing Worker tests plus 40 focused partner/referral/promotion/menu/Image checks.
- Final partner workflow `40131708686` passed 42 browser assertions at 390/768/1440px.
- Desktop/phone artifact `12575666321` inspected: contained layout, aligned header, protected roles and logout/stale-response cleanup.
- Final full Lab/account/promotions/video checks passed; Upscaler passed one targeted infrastructure retry.
- Two duplicated final browser installers were cancelled; the same compact Image/pricing scripts passed on parent `3e9721b`, with byte-identical shared app modules. Final delta was confined to new Vitolas header styling and passed its own browser suite.
- Worker production run `40132488747` completed successfully, including health; deployed version ID `95e9bd55-fd5a-47c7-b064-38a10bcc74ba`.
- Scoped release verifier returned `LIVE_VERIFIED` for production merge and `lab/lab.js`; SHA-256 `6852ec4ccf4cbfe2742026fc68f9f4e1de5a39df7b68d95c1ac2a1651e157bc2`.
- New HTML/JS/CSS and account-menu bytes independently matched the reviewed files on pvlab.studio (HTTP 200).
- Status: frontend and Worker published. Victoria's actual signed-in session and real referral/purchase flow remain unverified.
- Next: Victoria signs in with the approved email, opens the panel, and copies her actual personal referral link. Keep commission decisions separate.
