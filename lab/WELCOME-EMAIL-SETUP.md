# PV LAB | One-time welcome email activation

## Gmail desktop and phone redesign (2026-10-23)

- User screenshot of the first October 23 email showed an excessive full-width beige backdrop surrounding a narrow black single-column card, even though that card was responsive. This was a composition problem, not a flattened image or missing CSS.
- Replacement: no tinted full-width background; max-width **820px** dark editorial email on a white Gmail-compatible exterior.
- On desktop, one true two-column editorial spread shows the approved landscape portrait on the left and the existing welcome headline + copy on the right, so the headline appears in the first screen. The three selected thumbnail photographs remain together in one strip beneath the spread, followed by side-by-side primary button and Explore Moods text link.
- On phones, the **same markup** stacks portrait, headline/copy and actions vertically. Fluid inline-block widths allow wrapping even without media-query support; the media query refines phone padding and type sizes.
- Primary button and linked hero still open `https://pvlab.studio/`; Explore Moods opens `https://pvlab.studio/moods`. No changes to photography, welcome subject/copy, transactional sender, verification, Resend idempotency, D1, account rules or credit balances.
- Files: `lab-worker/signup-welcome-email.mjs`; `tests/lab-signup-welcome-email.test.mjs`; new `tests/lab-welcome-email-browser.mjs` and focused `.github/workflows/pvlab-welcome-email-responsive.yml`.
- New browser check renders the actual email HTML at 1440, 1100, 768, 430, 390 and 320px with the real local first-party image bytes and verifies two-column desktop, stacked phone and zero horizontal overflow. This is local mock-Gmail rendering, not confirmation of a delivered mobile Gmail message.
- **Release evidence:** PR #463 contains the implementation; validations and Worker release must be verified separately before claiming the new design is live. Existing one-email-per-new-verified-account logic is unchanged.


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
