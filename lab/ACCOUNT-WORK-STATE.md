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
