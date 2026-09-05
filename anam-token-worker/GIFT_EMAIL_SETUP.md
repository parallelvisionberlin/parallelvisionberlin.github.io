# Gift email activation
Implemented for positive owner credit grants only, not purchases, debits or voucher creation.
Uses the existing Zoho EU mailbox through OAuth. No email is sent until configured.
## Activate
1. Authorize a Zoho EU OAuth client for ZohoMail.messages.CREATE and obtain its refresh token. Obtain the sender account ID and authorized From address from Zoho.
2. Store ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ACCOUNT_ID and ZOHO_FROM_ADDRESS as Cloudflare Worker secrets. Never put credentials in git or frontend code.
3. From anam-token-worker run:
    npx wrangler d1 migrations apply nina-fok-memory --remote
    npx wrangler deploy
4. Make one small authorized gift to a test account. Confirm the balance, admin email status and actual inbox delivery.
## Behavior
Email failures never undo gifts. The admin displays delivery status. A D1 claim prevents repeat sends for the same grant. There are no automatic retries after uncertain delivery; check the sender's Sent folder first. Double submissions are blocked while the admin request is pending. This is not general grant API idempotency. Do not repeat a gift to retry its email.
The design uses a typographic PARALLEL VISION wordmark, black background and one button.
Docs: https://www.zoho.com/mail/help/api/post-send-an-email.html
https://www.zoho.com/developer/oauth/web-server-apps/refresh-access-token.html
