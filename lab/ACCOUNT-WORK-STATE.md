# PV LAB account interface

## Current objective
- Bring the account page up to the approved fashion/editorial standard.
- User reference: image(20261012-135720).png, showing the sparse owner view.
- Date: 2026-10-12.
- Source baseline: main 2d63aa88b352c408282c57559884faf1a604a613.
- Prior shared-menu release: 5dae7de040309bede94ed2d65fdcdd1648038c1c, PR #164.

## Design and implementation
- Use monochrome black, charcoal, ivory, fine rules and light DM Sans display type.
- Reuse approved photo: lab/visuals/leather-editorial/hero-mobile.webp.
- This is brand photography, not a user's private image or generated account asset.
- Photographic account masthead, real profile photo/initials and account role.
- Clear sidebar hierarchy and responsive mobile section selector.
- Owners see Workspace, direct Studio and Mood links, and generation connection access.
- Owners do not see the empty Balance/Usage/Billing tabs.
- Customers retain their real credits, products, activity and billing views.
- Referrals remain conditional on actual API eligibility.
- No backend, product pricing, checkout payload or authorization changes.
- Do not introduce gradients outside photo legibility, green dashboard cards or invented usage data.

## Relevant files
- Page: lab/account.html, lab/account.css, lab/account.js.
- Shared menus: lab/account-menu.js, lab/account-menu.css, unchanged in this revision.
- Verification: tests/lab-account-browser.mjs, .github/workflows/lab-account-ui.yml.
- Existing session and wallet APIs remain the data source.

## Verification and release
- JavaScript syntax and five account/referral unit checks passed locally.
- Browser coverage includes customer and owner menus, billing URL guards and sign-out isolation.
- Revised owner screenshots and overflow checks cover 1920, 1440, 768, 390 and 320 px.
- Account browser workflow 38260446528 passed on 12d1131a444840de5dc55e3f5e7222676bedfedc.
- Desktop owner/customer and mobile owner screenshots inspected; no overflow.
- Published implementation: 41dfbf3905a881dc4680a59aac5532384fd35b1b.
- GitHub Pages run 38260839030 completed successfully on 2026-10-12.
- Public account.html, account.css and account.js returned HTTP 200 with the new revision markers.
- Confirmed live: https://parallelvisionlabel.com/lab/account.html
- No blockers. Next action: await visual feedback; reuse these results for this unchanged revision.

## Explicit Home navigation (2026-10-12)
- Approved: a quiet Home text link beside PV LAB on internal pages, always targeting /lab/.
- Source baseline: ea2c68cc09f485a0259129acf03b36aa3c913a4e; preserve concurrent account and billing work.
- Pages: account.html, moods.html, studio.html and mood-creator.html (including My Moods).
- Shared scoped styles: home-navigation.css; the existing logo links remain intact.
- Small-screen Mood Creator uses a two-row header; Account uses the existing compact Studio label.
- Static link and stylesheet checks passed. Local Chromium cannot start in this execution environment.
- Home released in 8fbf3b63989a76604c14bdd672cd69066ffe0a3e; account workflow 38272993924 and Pages run 38272992764 passed.
- Desktop and mobile screenshots inspected. Final <=380px Studio spacing refinement preserves Add credits and Queue.
- Final source: 900e82c6d8b7786148423d1d2affe25fd71156d6; account browser run 38277187841 passed.
- Pages run 38277187963 succeeded; live Studio confirms home2 stylesheet. Home click on Account verified to /lab/.
- Complete: Home on Account, Explore Moods, Mood Creator/My Moods and Studio; no pending work for this scope.

## Active: approved Studio credit notice (2026-10-12)
- User approved the white out-of-credits Studio bar and asked for a simple Add credits deck.
- Rejected: Keep creating / Find your rhythm marketing headings and the large comparison designs.
- Reference: generated image exec-571e8dfa-0030-44ec-942f-0102b37ca003.png in the design conversation.
- Baseline: main 916f6068bd782316775041c23a6ae1e6a7375d17; preserves the newer Film Finish changes.
- White dismissible notice below navigation, driven by the real customer balance at zero.
- Header Add credits opens a compact dialog listing only actual one-time products from the API.
- Monthly plans and account management remain on account.html#billing.
- Balance refreshes after reserved jobs, confirmed failed jobs, wallet opening and window focus.
- No local credit deduction; existing checkout request and Stripe URL guard retained.
- Checkout blocks duplicate pending submissions and ignores responses after a session change.
- Notice is hidden for owners, signed-out, closed or review-restricted accounts.
- No new imagery, prices, backend code, provider credentials or rollout flags.
- Files: lab/studio.html, lab/studio-credits.css, lab/customer-wallet.js, lab/lab.js.
- Tests: tests/lab-account-browser.mjs, tests/lab-image-viewer-browser.mjs, .github/workflows/lab-account-ui.yml.
- Local checks: JS syntax, diff whitespace and 18 account/referral/billing/image-quote tests passed.
- Browser workflow 38272089739 passed at be0acac979cea20b4bbfc3bece7f99b5854299cc, PR #165.
- Desktop and mobile screenshots inspected; no horizontal overflow.
- Existing wallet=1 script marker retained; new creditNotice parameter refreshes the script cache.
- Storage/closure assertions moved to existing account-page coverage; compact deck links there.
- Screenshots cover 1440/768/390/320 px; intercepted checkout only, no real payments.
- Source published: b25fa89eefa76952c8731e1e110a82d8d4ba2785 (PR #165).
- Unrelated landing test expects titles above photos; same failure verified on baseline run 38268271852.
- Gallery/queue workflow 38272411110 and Lab tests 38272411132 passed at e92704f425a26cddce924dfb50ff99b5854299cc.
- Combined Home + credits account workflow 38272993924 passed at 8fbf3b63989a76604c14bdd672cd69066ffe0a3e.
- Pages run 38272992764 succeeded; production Studio HTML, CSS, wallet and app JS verified against that release.
- Live: https://parallelvisionlabel.com/lab/studio.html
- Next: no remaining work for this scope; reuse these results unless relevant files change.

## Refined sign-in and Studio controls (2026-10-12)
- Approved: Google belongs inside the sign-in panel; keep two hero actions only.
- Approved: Assets, Queue and avatar form a compact group at the Studio's right edge.
- References: image(20261012-165335).png and image(20261012-165357).png in the design conversation.
- Baseline: e1398f1b4899ccbd5c065b062aff44c87b98d187; preserves Home, credits and Analog Club pricing.
- Hero Google button removed; header Sign in opens the existing account panel with charcoal/ivory styling.
- Signed-out Start creating opens that same panel and returns to Image Studio after sign-in or sign-up.
- Signed-in and modified link clicks retain normal navigation; early clicks wait for account loading.
- Studio controls align to the gallery edge; Assets has a flat quiet surface and the avatar a subtle border.
- Source: lab/index.html, lab/customer-entry.js, lab/public-header.css, lab/studio.html.
- Checks: tests/lab-landing-stability.mjs and tests/lab-account-browser.mjs cover the affected flow/layout.
- Local syntax, account identity/referral checks and diff whitespace passed.
- Existing CI provides desktop/mobile verification; no local browser or new imagery needed.
- Published implementation: fc970b82c4bfa3dfeaa7b15fe705285214f6d90b, PR #166.
- Landing workflow 38281522737 and account workflow 38281516758 passed at 57eb2f9dfe475fd67c41a2aba56a4c0843835e3a.
- Landing widths: 1912/1440/768/390/320 px, including delayed font/account recovery and signed-out entry.
- Desktop/mobile landing and Studio screenshots inspected; no horizontal overflow.
- Reusable screenshots: artifacts 11761606797 (landing) and 11761512005 (account); local header-review folder in this conversation.
- Pages run 38281749385 succeeded. Public index.html, studio.html, public-header.css and customer-entry.js returned HTTP 200 and matched the release bytes.
- Account-provider calls are mocked in CI; no real Google login or payment was performed.
- Complete: https://parallelvisionlabel.com/lab/ and /lab/studio.html. Reuse these checks for the unchanged revision.

## Desktop hero position (2026-10-12)
- Approved: lift the complete hero copy and actions into a balanced vertical position; preserve the shared left margin and type sizes.
- Reference: image(20261012-173957).png. Final user direction: place it where it fits best professionally.
- Baseline: 33d004667b11150a2ec7d0df8e11a5bbbcac13ef; preserves concurrent result deck and pricing work.
- Above 900 px, center the whole copy block in the photograph below the header. This adapts to the viewport instead of using one fixed offset.
- Mobile/tablet composition, portrait crop, navigation and buttons are unchanged.
- Files: lab/landing-motion.css and its version in lab/index.html. No new tests or assets.
- Published: 8687506edda7f3532cdac65b606c37750605ec08, PR #168.
- Landing-stability run 38287658538 passed at 59d925495daeb8d34a5a76d2d40d8ee2bedfbd63 across desktop/mobile sizes.
- Desktop/mobile screenshots inspected; reusable artifact 11763463490, local hero-position-review folder.
- Pages run 38287852016 succeeded. Live index.html and landing-motion.css returned HTTP 200 and matched the release bytes.
- Complete: https://parallelvisionlabel.com/lab/. No pending work for this adjustment.

## Desktop hero horizontal inset (2026-10-12)
- Approved from image(20261012-182541).png: move the full hero copy/actions 30–40 px right on desktop.
- Add 35 px to the existing hero gutter above 900 px. Preserve navigation, vertical centering, type sizes and mobile/tablet layout.
- Files: lab/public-header.css, its cache version in lab/index.html, and this checkpoint.
- Baseline: c980a84ce88aa39e605d0c913437c89ff3f81a34. No new images, dependencies or tests.
- Verification: reuse the existing landing-stability workflow and its desktop/mobile screenshots.
- Published: 7f96a352798565cb68a4c5713e0b87c3e81ed48c, PR #171.
- Landing-stability run 38296031846 passed at 504fd198ac93133580efb632cc83f87186661809 across desktop/mobile widths; screenshots inspected.
- Reusable screenshots: artifact 11768432488, local hero-inset-review folder.
- Pages run 38296277169 built and deployed successfully. Live index.html and public-header.css returned HTTP 200 and matched release bytes.
- Complete: https://parallelvisionlabel.com/lab/. Reuse these checks for this unchanged revision.

## Homepage account and credit header (2026-10-14)
- User approved replacing the logged-in Upgrade pill with an understated, useful credit control; visitor header, hero image, hero typography and main navigation stay unchanged.
- Source baseline: main 4b4a19de61208519b7df57cd5ff9ce035de87fd4.
- Customer shows authenticated integer balance from /api/session, plus a small + link to #pricing. Zero shows Get credits. Missing balance is not misrepresented as zero. Owner and visitor show no credit-sales control.
- Clicking the avatar exposes My account, Credits & billing, Pricing, My moods, eligible referral entry, Settings and Sign out.
- On mobile, the header keeps Open studio and account while shortening credit copy; at <=375px an accessible + remains.
- The real balance refreshes on focus/visibility and history restoration. Checkout, authorization, wallet and Stripe URLs are untouched.
- Files: lab/index.html, public-header.css, mobile-polish.css, customer-entry.js, tests/lab-landing-stability.mjs, tests/lab-account-browser.mjs and this checkpoint.
- New browser assertions cover customer, owner, zero balance, refreshed balance and sign-out at several desktop/mobile widths, without real sign-in, payment or generation.
- Branch: codex/pvlab-home-credit-header-20261014. Check Actions and Pages separately before marking the change live.

## Homepage first-paint and type polish (2026-10-14)
- User screenshots show visitor Sign in replaced by account avatar and Get credits after a slow Clerk load. Approved: make both Open studio and Get credits visibly semi-bold and keep the right-hand header composed during authentication.
- Baseline main: 76baa089f84a2a133af45a2296f5e5cd723e62c6. Changes limited to homepage HTML, homepage-scoped public-header CSS, customer-entry session presentation, landing browser test and this checkpoint.
- First paint shows fixed-width neutral credit and circle placeholders instead of speculative Sign in or user data. No loading animation, no cached identity or guessed wallet values. CSS reserves identical geometry across anonymous, loading, customer and owner states.
- Clerk identity completion reveals avatar before the slower customer /api/session fetch. That fetch later replaces the credit placeholder with the actual wallet balance or Get credits at zero. Guests see Sign in only after Clerk confirms they are signed out.
- Native auth, checkout, payment products, wallet API, account authorization, images, hero composition and Studio layout are unchanged.
- Homepage-only DM Sans action face supports weights 600–700. Both Open studio and Get credits use weight 600; the Studio pill border is slightly stronger.
- Landing CI verifies first-paint placeholders, delayed customer session, avatar appearing ahead of wallet balance, no geometry shift, guest sign-out, semi-bold computed styles and desktop/mobile no overflow.
- Branch: codex/pvlab-header-first-paint-20261014. Commit and deployment confirmation pending at time of edit; preserve this distinction.

## Shared editorial account dropdown (2026-10-14)
- Approved screenshot follow-up: compact dropdown, real identity row, subtle monochrome icons, smaller typography, owner dashboard separated from standard actions.
- Keep the exact established logo asset `lab/branding/pvlab-wordmark.svg` with its existing 157 x 31 display treatment.
- Source baseline: main b0ce8364526f4443f74360ed266e66c9b1f5cd50. Scope limited to shared account menu JS/CSS, four module-import cache revisions, five HTML cache revisions, and this checkpoint.
- Owner link still gated on the verified profile; customer-only voucher/referrals and session-derived balance remain unchanged. Existing direct URLs, sign-out handlers, avatar trigger and authentication remain intact.
- Studio still loads its dedicated menu overrides after the shared stylesheet; no other Studio design surfaces or backend are changed.
- Static checks: exact source anchors, stylesheet versions and markup references reviewed; no authenticated browser or live deployment check in this environment.
- Deployment: unverified until Pages finishes and the menu is inspected in the real browser on desktop/mobile.

## Account dropdown neutral charcoal color correction (2026-10-14)
- Screenshot confirmed the compact dropdown is released but its slight green/olive cast clashes with the black/grey My Account page.
- Approved: remove green undertones in panel fill, borders, separators, badges, hovers and text, using neutral monochrome charcoal, grey and white.
- Preserve the exact `pvlab-wordmark.svg`, all spacing and typography, account/user roles, menu icon graphics, links and logic. Studio-specific graphite overlay remains separate.
- Baseline: main 1faafac43c4abceb49ca98d83fcbb39b0f12b733. Changes: `lab/account-menu.css`, five shared CSS cache tags, and this state checkpoint only.
- No authenticated session logic, billing or API changes.
- Verify account/landing CI and GitHub Pages deployment separately; do not assume the new revision is live until its Pages run completes.
