# PV LAB | One-time welcome email activation

## Active handoff | 2026-11-04 approved original editorial

- Release source: PR #842 merged as `08a3a7a9066c2342d38dfbebb2e4068444866163`. Reviewed template SHA-256 `cf1cc32ae6bf1ecedff028456095e6b4d9af8d6603a21daecb93ee397ff9e761` equals merged main. Assets from PR #837, not the older PR #825 composition.
- Locked reference: `download(20261104-141848).png` (approved green hero, three editorial tiles, Character Studio, Motion). Motion uses the approved industrial room replacement rather than the earlier dune image.
- Template: `lab-worker/signup-welcome-email.mjs`, `signupWelcomeMessage()` only. All queue, verification, Resend, deduplication, cron and retry code below it is unchanged.
- Design: official PNG wordmark; desktop and mobile green hero crops; live headline/copy and primary CTA over the image; Full Editorial, Image and Mood Atlas tiles; two original character portraits; industrial Motion panel. White exterior, black editorial body, compact phone spacing, Outlook VML fallback.
- Preserve homepage Enter the studio and `/moods` Explore Moods. Additional feature cards link to existing Full Editorial, Image, homepage Character and Video destinations. No new price, free-credit or image promises, tracking pixels or generated replacements.
- Nine assets: `lab/email/pvlab-wordmark-bold.png` and `welcome-20261104-{hero-desktop,hero-mobile,full-editorial,image,mood-atlas,character-green,character-ivory,motion}.jpg`.
- Production asset prerequisite VERIFIED: Cloudflare Pages app check on source base completed successfully, project pvlab-studio deployment `45fb390e-54be-4624-93f2-750cf83f93f6`. All nine custom-domain asset SHA-256 hashes equal checked-out main; all six link destinations return HTML/200.
- `scripts/verify-welcome-email-media.mjs --links` is read-only. Both existing public-media and Worker predeploy gates now verify the current template's exact asset bytes and destination availability rather than checking the obsolete four images.
- Local checks: nine targeted transactional tests passed, including actual signup enqueue, verified recipient, no backfill, one-time/idempotent send, closed accounts and uncertain-provider retry protection. Worker syntax passed.
- Browser matrix: actual template at 320, 390, 430, 600, 768, 1100 and 1440px; checks real image decode, original resolution, overflow, mobile stack, live CTA, image blocking and stylesheet-stripped fallback. PASS in CI run `41927662958`; mobile and desktop artifacts visually inspected. Merged-source rerun `41928115016` also passed. Local browser binary download was unavailable, so rendering used CI.
- Publication VERIFIED: Worker deploy run `41928114918` for exact merge SHA completed successfully at 22:49 UTC. Deployed version `3fc3229b-15f3-4b66-84d6-b84e7428b4a8`; public image/link preflight, production health, release-link service and read-only trial/wallet invariants all passed. Welcome email enabled; welcome credits and image trial remain disabled.
- Exact merge Cloudflare Pages app check also completed successfully: production deployment `699f7613-f39f-49d4-99b0-c23785092465`.
- Broad CI has failures in untouched Meta-cookie, Moods navigation/upload, Photobooth/Soft Pastel and Video-badge tests, plus an unmocked mood-offer browser event. Approved Image, validation, Motion and search checks passed. No gates were disabled. Existing protected Worker predeployment test suite passed.
- No permissions, credit, Stripe, registration or sender code changed. Delivery logic below signupWelcomeMessage() verified byte-identical to the source base.
- Real-inbox test: pending one newly verified test account. Do not backfill or resend old customer welcome messages. Mock-provider acceptance and browser rendering alone are not inbox verification.
- Next: user completes a fresh test signup and email verification through the prepared PV LAB Create your account form. Browser authentication guidance requires manual account creation. Then inspect the new message in an actual inbox; confirm image loading/actions and no repeat welcome on sign-in. No test account has been created and no test email has yet been sent by this task.

Historical release records below describe older compositions and do not override this approved direction.

## Gmail desktop and phone redesign (2026-10-23)

- User screenshot of the first October 23 email showed an excessive full-width beige backdrop surrounding a narrow black single-column card, even though that card was responsive. This was a composition problem, not a flattened image or missing CSS.
- Replacement: no tinted full-width background; max-width **820px** dark editorial email on a white Gmail-compatible exterior.
- On desktop, one true two-column editorial spread shows the approved landscape portrait on the left and the existing welcome headline + copy on the right, so the headline appears in the first screen. The three selected thumbnail photographs remain together in one strip beneath the spread, followed by side-by-side primary button and Explore Moods text link.
- On phones, the **same markup** stacks portrait, headline/copy and actions vertically. Fluid inline-block widths allow wrapping even without media-query support; the media query refines phone padding and type sizes.
- Primary button and linked hero still open `https://pvlab.studio/`; Explore Moods opens `https://pvlab.studio/moods`. No changes to photography, welcome subject/copy, transactional sender, verification, Resend idempotency, D1, account rules or credit balances.
- Files: `lab-worker/signup-welcome-email.mjs`; `tests/lab-signup-welcome-email.test.mjs`; new `tests/lab-welcome-email-browser.mjs` and focused `.github/workflows/pvlab-welcome-email-responsive.yml`.
- New browser check renders the actual email HTML at 1440, 1100, 768, 430, 390 and 320px with the real local first-party image bytes and verifies two-column desktop, stacked phone and zero horizontal overflow. This is local mock-Gmail rendering, not confirmation of a delivered mobile Gmail message.
- **Source status:** PR #463 merged into `main` as `602cf94df2859ef55a3a1725e3744844eb21a241`. The merged Worker source was read back and contains the 820px editorial markup, the single portrait-and-copy spread and unchanged idempotent send queue. The generated HTML was executed in an isolated read-only JS check: four images, both link destinations, two copy/action columns, phone stacking fallback, no free credit offer and balanced HTML tags passed. GitHub Actions browser/workflow jobs remained **queued** at the last check; not marked passed. The actual Cloudflare Worker deployment of this exact revision and a newly delivered Gmail/phone render remain **unverified** and must not be claimed live.


## Verified desktop/mobile editorial email release (2026-10-23)

- Owner-selected photograph retained, recropped into an actual landscape image `lab/email/welcome-hero-horizontal.jpg`. Max-width 680px HTML message, live-text wordmark, three original photographic detail tiles, narrow-screen CSS, and a neutral exterior background. The current Gmail desktop screenshot's enormous black outer block and long phone-poster hero are replaced.
- Primary **Enter the studio** button and linked photo still go to `https://pvlab.studio/`; **Explore Moods** goes to `https://pvlab.studio/moods`.
- Media PR #457 merged to `main` at `3cbc3955ea6d9ec41a9a8b057549cfaae185e6cf`. GitHub Cloudflare Pages app check for that commit reported `completed / success`. The public delivery workflow run `39937944497` later passed and verified the new first-party hero and three detail images as actual JPEG bytes on `pvlab.studio`.
- Template PR #456 merged at `1c13e4463c3b97f6c48adb24dbb12a607a2531f7`. Targeted static, transactional/one-time email tests and public-media checks passed. The broad Video integration browser suite separately failed on an unrelated hidden Upscaler control, with no corresponding Video source edits in this release.
- Read-only GitHub API audit `39939359614` verified the **exact** merge-commit Cloudflare Worker deploy run `39939066107` finished `completed / success`. The asset Cloudflare Pages check was independently `success`; temporary audit PR #459 was closed, unmerged.
- Existing Resend keys, sender, verified-primary-email check, deduplication, five-minute queue processing and first-account-only trigger were not changed. No promotional credit offers were introduced.
- **Remaining real-inbox evidence:** no new verified signup account was created and no additional production email was sent as part of this visual revision. The production code and deploy succeeded; an actual Gmail/phone rendering check on the next newly registered eligible account is a separate confirmation.

## Implemented behavior

Only successful new PV LAB account onboarding can queue an email, not every login, refresh, purchase, or legacy transfer. The email is sent to the verified primary address retrieved from Clerk through the existing backend contact synchronization, never from browser input.

The design is monochrome PV LAB with the subject "Welcome to PV LAB. Your creative space is ready." The 23 October desktop/mobile refinement keeps the owner-selected fashion portrait and three first-party detail images in `lab/email/`, now using `welcome-hero-horizontal.jpg`, a real wordmark, a 680px editorial HTML email container, and a subtle light outer background instead of the oversized black Gmail canvas. All copy remains accessible HTML and the action remains a real full-width button. **Enter the studio points to the PV LAB homepage hero (`https://pvlab.studio/`)**, not to the editor or a checkout screen. **Explore Moods** points to `https://pvlab.studio/moods`. No emoji arrow, no welcome-credit promise, tracking pixels or third-party remote assets.

Cloudflare D1 stores one delivery row per customer. Resend Idempotency-Key prevents duplicate submissions within its documented 24-hour window. Network-ambiguous attempts are marked uncertain and are not automatically retried. New signups are never blocked if the email provider fails. Only recent verified signups receive an email. The existing five-minute cron handles pending sends, with a conservative daily cap.

## Release order for the approved editorial version

1. Publish the four `lab/email/welcome-*.jpg` assets to the PV LAB Pages project. They must be retrievable at `https://pvlab.studio/email/` *before* the updated Worker sends emails that reference them.
2. Deploy the updated `lab-worker/signup-welcome-email.mjs` via the existing protected Cloudflare Worker deployment workflow. Leave D1 welcome-queue state, Resend secrets and deduplication logic untouched.
3. For a **new** verified test customer only, inspect Resend's acceptance record and inbox rendering on mobile; verify the full-width button opens `https://pvlab.studio/`, Explore Moods opens `/moods`, the four images load, and login again sends no duplicate. Do not re-send to existing customers for this test.
4. Image blocking must still leave readable copy, an accessible primary action and a plain-text fallback. Hosting images is not image tracking.

## To activate after deployment

1. Create a free Resend account at https://resend.com (currently up to 3,000 messages/month, 100/day).
2. Resend dashboard → Domains → Add pvlab.studio. Add the exact Resend-provided SPF/DKIM records in Cloudflare's pvlab.studio DNS. Verify the domain. Preserve any other existing MX/DNS records.
3. Create a restricted sending-only Resend API key. In Cloudflare Workers & Pages → parallel-vision-lab → Settings → Variables and Secrets, save it as an encrypted secret named LAB_RESEND_API_KEY. Never share it in chat or commit it to GitHub.
4. Verify migration 0031-signup-welcome-email.sql was applied by the Worker deploy workflow.
5. Only after Resend shows Verified, set LAB_WELCOME_EMAIL_ENABLED = "true" in lab-worker/wrangler.toml and deploy.
6. Create one new verified PV LAB test account. Confirm the single welcome email is accepted in Resend and appears in the inbox, without an offer of paused free credits.
7. Sign out and in again, refresh, and confirm another welcome message is NOT sent.

## Reference and recovery

Sender: PV LAB <hello@pvlab.studio>
Reply-To: contact@parallelvisionlabel.com
Resend API: POST https://api.resend.com/emails
Private Worker secret: LAB_RESEND_API_KEY
Feature switch: LAB_WELCOME_EMAIL_ENABLED (default false)
D1 delivery records: lab_signup_welcome_emails
The sender's address is not necessarily an inbox; replies route to the support address.

Sent means the provider accepted the email, not guaranteed inbox delivery. Pending may be waiting for primary-email verification. Uncertain requires manual inspection of Resend delivery activity before replay; failed requires an explicit operator decision. Account deletion clears the private welcome delivery record. Provider-held copies follow the provider's retention terms.

No old account backfill occurs. A future marketing campaign is a separate feature subject to independent consent and compliance controls.
