# PV LAB | One-time welcome email activation

## Implemented behavior

Only successful new PV LAB account onboarding can queue an email, not every login, refresh, purchase, or legacy transfer. The email is sent to the verified primary address retrieved from Clerk through the existing backend contact synchronization, never from browser input.

The design is monochrome PV LAB with the subject "Welcome to PV LAB. Your creative space is ready." It links to Studio and Explore Moods, with no 200-credit promise, marketing language, tracking pixels, or third-party remote images.

Cloudflare D1 stores one delivery row per customer. Resend Idempotency-Key prevents duplicate submissions within its documented 24-hour window. Network-ambiguous attempts are marked uncertain and are not automatically retried. New signups are never blocked if the email provider fails. Only recent verified signups receive an email. The existing five-minute cron handles pending sends, with a conservative daily cap.

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
