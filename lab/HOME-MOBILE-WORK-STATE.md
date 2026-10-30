# PV LAB phone homepage layout

## Referral original framing and placement, 2026-10-30

- Owner again selected image 2 and accepted the button, asking for a shorter section than that mockup.
- Baseline: main 87dedd60665dab2f92566af7072eac67bcc3820e.
- Branch: fix/referral-original-framing-20261030.
- Earlier wide adaptation changed the artwork and lifted the headline too high; it is superseded here.
- Cleanup source: exact attachment 76813ec4-f26f-4c71-a509-fa67d454aa2d(1).png.
- Imagegen removes text/UI and footer only, preserving source framing rather than widening the room.
- Generated source: exec-8bd6a424-31f1-4547-b5ed-35f6174b0e01.png.
- Asset: visuals/invite-concept06-original-20261030.webp, 1893x831, 106216 bytes.
- Restore the dark left side, original wall/garment framing and no desktop overlay.
- Desktop height: clamp(420px,31vw,600px), shorter than the reference photo ratio 734/1672.
- Headline group moves lower, around 29% of desktop stage height; description and CTA sit near the bottom.
- Retain 16px/600 button lettering, 52px height and ivory pill; width follows the reference.
- Supporting text scales to 21px; mobile stacks naturally without a fixed height.
- Referral terms, routing, accounting, homepage order and footer remain unchanged.
- Cache: invite-hero.css?v=20261030-concept06-original3.
- Validation: 11/11 existing Image/referral tests pass; final-head approved Image, homepage stability and static CI checks pass.
- Reviewed source: 9d52e4ac1e13fb54de5cdfee25a8d1ebbea098a2; PR #672 merged as 89589f6f5212ba96f5ef1d5cbeef64a11fa3dd45.
- Cloudflare pvlab-studio check 124034106895 succeeded, deployment 6d06608a-a259-4d59-afbb-25a37e737bf6.
- Homepage-scoped verifier returned LIVE_VERIFIED; CSS SHA-256 30146475f0ba1aee3e4458dc580024a65ebb13ded847c36d78975df36f08bde0.
- Production photo HTTP 200, exact 106216-byte committed match.
- Live 1363px browser: stage 422.5px; headline offset 155.7px; description two lines; button 16px/52px; no horizontal overflow. Screenshot inspected.
- Mobile stacking covered by existing responsive CI; no separate actual mobile or signed-in production session inspected.
- Request complete and live. Preserve this framing and lower placement on future refinements.

## Referral composition correction, 2026-10-30

- Owner rejected the small photograph panel and requested the exact concept 06 composition again.
- Baseline: main bfe79ed48abbeb2e51983525b28429b305aa041b; branch fix/referral-approved-composition-20261030.
- Exact selected edit source: image-edit-target-6394faac42918d26.png, identical to the attached approved concept.
- Imagegen removed text/UI/footer and adapted that source to a wide photographic background; no substitute source image.
- Generated source: exec-0632b9dc-1648-433e-a116-4177a8611817.png.
- Project asset: visuals/invite-concept06-wide-20261030.webp, 2172x724, 126728 bytes.
- Replace the small auto-scaled/offset image with full-width cover positioning and remove both heavy side fades.
- Preserve a compact 380–520px desktop stage; use larger heading, two-line description and bottom-right pill action.
- Button retains readable 16px/600 type and 52px minimum height; mobile stacks with natural height.
- Fine print matches the approved mockup wording without changing reward eligibility or €10 threshold.
- Existing owner-specific dashboard destination and label remain; ordinary visitors see Get your invite link.
- Homepage section order, footer and referral accounting are unchanged.
- Cache version: invite-hero.css?v=20261030-concept06-fullbleed2.
- Validation: 11/11 existing Image/referral tests pass; approved Image UI, homepage stability and static CI checks pass. No gate weakened.
- Source commit: 548abec67c8a2a19aaa583c23461478a28cc04e6; PR #670 merged as be71719fb468eb399f63c5e058ec2377b1b71191.
- Cloudflare pvlab-studio check 124020564952 succeeded, deployment 7a040fa9-f1d7-4bb3-ac5d-4b57d9df9b0d.
- Read-only verifier, explicitly using homepage HTML, returned LIVE_VERIFIED; CSS SHA-256 c4995f89738d4a5adf3a8cf7707a0dc4d4ea1f68f54deabab14e2c8537297446.
- Production photo HTTP 200, exact 126728-byte committed match. Live 1363px browser: full-width cover/center photo, banner 382px, headline 61.335px, button 16px, no horizontal overflow.
- Live screenshot inspected; no separate actual mobile or signed-in production session verified. Existing responsive layout CI passes.
- Correction complete and live. Earlier narrow-photo implementation below is superseded.

## Compact referral invitation, 2026-10-30

- Owner selected concept 06, with a thinner section and legible button lettering.
- Source baseline: main 3a6bcdcdc2ad04bdad0ff44c5d4a10049e94c878.
- Branch: design/referral-concept06-20261030.
- Reuse the original uploaded suspended-garment photograph, not the composite mockup.
- Asset: visuals/invite-suspended-garment-20261030.webp, 2048x1152, 213654 bytes.
- Photo reference: hf_20261028_225639_336cd24f-aa58-4840-bae8-7e871d3cf3ae(2).png.
- Approved mockup: c7add702-4250-47fa-b7fe-3f39f3a185c4.png, Library libfile_1f7aeb19e6808191bd22952f9a6af9b4.
- Desktop stage: 304–384px, copy left, bottom-aligned pill CTA right; mobile stacks naturally.
- Button: centered 16px semibold DM Sans, at least 52px high, near-black text on ivory.
- Keep existing referral wording, eligibility, customer/owner destinations and footer unchanged.
- Code: invite-hero.css and its index.html cache key 20261030-suspended-compact1.
- Validation: 11/11 existing Image contract and referral UI/account-panel tests pass; diff whitespace passes.
- Reviewed application source: 76e1e1bd19a8918595592a668d6af6b446b9b673, PR #669.
- Published merge: c8e80057fe2a117583400b89bf999881051189bc; Cloudflare pvlab-studio check 124011069370 succeeded, deployment 7eeabd10-be77-4b75-85a9-d6c60894cdcc.
- Read-only verifier returned LIVE_VERIFIED for invite-hero.css using the homepage HTML; SHA-256 e5dd768b9e8e5c6416b6d3dd39573a725f4dee7e0384c98a428a8a681510bfba.
- Production photo returned HTTP 200 and exactly matches the committed 213654-byte WebP.
- Live browser at 1363px: banner 327px high; button 52px high, 16px/600; no page horizontal overflow. Photo shifted clear of the button after preview inspection.
- Existing homepage stability, Image contract and static checks pass in CI. Separate actual mobile and signed-in production sessions were not inspected.
- Both homepage order and referral invitation are live; no remaining action for this request.

## Homepage order and Editorial typography, 2026-10-30

- Owner approved hero → Image/Video/Upscaler → Full Editorial → Creative Studios → Characters → pricing.
- Owner additionally requested a more cohesive Full Editorial Studio heading.
- Baseline: main bf65ef6607a9e4dec96d4c5b77f6a73d22c4613f.
- Branch: fix/homepage-section-order-20261030.
- Move the existing complete #tools section before #featured-editorial in lab/index.html.
- Full Editorial heading and supporting lead use the existing DM Sans; remove italic emphasis from Studio.
- Shorten only the Editorial feature: 2.5 desktop ratio, 520px minimum; compact tablet/580px phone stage.
- Keep the existing hero, imagery, motion behavior, tool controls, links and hidden Fashion block intact.
- Bump only home-creative-features.css to 20261030-tool-first-editorial-type1.
- Checks: 14/14 existing Image contract, character and homepage showcase tests pass; whitespace diff passes.
- Source comparison verifies the hero and tool-card markup remain byte-identical apart from section placement.
- Files: lab/index.html, lab/home-creative-features.css and this checkpoint.
- Reviewed source commit: c8aaa9ef4bdb337815c9036112fa8b41724080a7, PR #668.
- Cloudflare preview 4eedb406.pvlab-studio.pages.dev succeeded; no production deployment performed.
- Preview DOM confirms visible order hero/tools/Editorial/Creative Studios/Characters/pricing; hidden Fashion remains display:none.
- Desktop preview inspected at 1363px: DM sans-serif, font-style normal, Editorial height 539px, no horizontal page overflow.
- Existing homepage stability and Image contract CI pass. The old Studios five-vs-four landing assertion still fails as on baseline main.
- No separate phone browser viewport was available for this scoped review; existing responsive rules retain the phone layout.
- PR #668 merged as 3a6bcdcdc2ad04bdad0ff44c5d4a10049e94c878; Cloudflare Pages pvlab-studio check 124006855474 succeeded.
- Live pvlab.studio DOM verified: hero → tools → Editorial → Creative Studios → Characters → pricing, with DM Sans Editorial heading and stylesheet 20261030-tool-first-editorial-type1.
- Homepage order request complete and live; referral design remains a separate change above.

## Homepage Fashion feature visibility, 2026-10-30

- Owner requested hiding the standalone Fashion Studio feature shown in image(20261030-093559).png.
- Baseline: main 06755f1df7062d2153f4fb9052a9641c3ca4d29d.
- Change: native `hidden` attribute on `.pv-fashion-feature` in `lab/index.html`.
- Retain markup and artwork for reversal; hide on desktop and mobile without a layout gap.
- Keep the Fashion Studio navigation link, Creative Studios card and destination available.
- Other homepage sections, including Full Editorial and Characters, stay unchanged.
- Validation: approved Image UI contract passes 5/5; final diff is one HTML attribute plus this checkpoint.
- Released via PR #667 as a16d662f452fcdf2a4080823499f578df8baa171.
- Cloudflare Pages pvlab-studio check 123994717698 succeeded; production deployment f47404c1-ad69-40a0-aef9-56129f802851.
- Live homepage DOM: hidden=true, computed display:none, height 0; following Characters top equals Creative Studios bottom (no gap). One visible Fashion Studio card link remains.
- Production screenshot inspected at 1348px. Native hidden applies at every breakpoint; no separate mobile browser viewport was available.
- Relevant homepage stability and approved Image checks passed. Legacy landing test still fails its existing five-vs-four Studios menu expectation, identical on baseline main; no gates changed.
- Request complete; no further action.

- Updated: 2026-10-29, Europe/Berlin.
- Source baseline: main d3c38fd.
- Branch: fix/mobile-home-spacing.
- User references: IMG_8196.jpeg, IMG_8194.jpeg, IMG_8195.jpeg.
- Scope: Creative Studios introduction, decorative homepage arrows, mobile hero.
- Mobile/tablet introduction places Creative Studios on the left.
- Its descriptive notes sit in a separate right-hand column.
- Notes use 16px on phones and scale to 22px on tablets.
- Main heading and notes align at the top; CTA sits below.
- Preserve the existing two-column studio artwork and destinations.
- All homepage decorative CTA arrow glyphs and SVG arrows removed.
- Desktop artwork arrows are covered; its intro uses a real text-only CTA.
- Decorative showcase transition arrows removed; swipe hint remains text.
- Functional menus, video controls and photo-detail control remain usable.
- Standing preference saved in root AGENTS.md: text-only actions.
- Do not replace removed arrow glyphs with SVG or CSS decoration.
- Phone viewport is the primary visual review surface; also check desktop.
- Mobile hero uses 100svh with a 560px minimum for very short screens.
- Copy and actions sit above the bottom video control/signature row.
- Mobile poster and motion share a 48% horizontal crop to show the subject.
- Existing desktop hero, video URL, loop and autoplay logic preserved.
- Relevant code: lab/index.html, home-creative-features.css, landing-motion.css.
- Cache keys: 20261029-mobile-notes-no-arrows1 / 20261029-mobile-viewport1.
- Checks: 17 targeted Image contract, character, homepage showcase and mood tests pass.
- Diff whitespace check passed.
- Browser QA: 390x740 and 320x568 phone frames plus desktop inspected.
- Notes are right of heading, 16px; no page horizontal overflow observed.
- Small-phone hero actions remain within the viewport.
- Production authentication is outside this cosmetic change's verification.
- Reviewed remote candidate: 8e5e60442833c0630e418ed3d1fb0ec7fd36b7f4.
- PR #663; existing main has unrelated Studio-card and image-decode failures.
- PR #663 merged as 019ccfd6643c771835a07ca705f1ea8857d4ed0d.
- Cloudflare Pages pvlab-studio app check for that exact SHA: success.
- Production home-creative-features.css and landing-motion.css exactly match reviewed bytes.
- HTML differences are Cloudflare email obfuscation plus its email-decoding script.
- Live browser verifies both new CSS versions, right-side 16px notes and zero decorative action arrows.
- Live phone frames inspected at 390/320; no horizontal overflow observed.
- Updated landing stability browser suite passes, including viewport-visible actions.
- Approved Image UI, full unit suite, account, beauty and gallery checks pass.
- Existing unrelated failures: five-vs-four Studios menu expectation, asset image decoding, Fashion form timeout.
- Next: only owner-requested refinements; no deployment blocker for this change.
