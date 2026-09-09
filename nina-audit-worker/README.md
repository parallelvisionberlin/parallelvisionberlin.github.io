# Nina owner read-only analysis connection

Separate OAuth-protected MCP Worker for ChatGPT. It does not redeploy or change the live Anam Worker or mobile app.

## One-time deployment

From the existing separate `parallelvision-web-deploy` checkout on main:

```powershell
git pull --ff-only
npm.cmd --prefix nina-audit-worker ci
node.exe nina-audit-worker/deploy.mjs
```

The installer creates/reuses one dedicated KV namespace for OAuth credentials and uses the existing Nina D1 binding only for fixed read queries. It does **not** run a D1 migration, modify transcript data, export anything to GitHub, or deploy `parallel-vision-anam-token`. Cloudflare login may be requested by Wrangler. No secrets should be pasted in chat.

## One-time ChatGPT connection

On ChatGPT web, enable developer mode under Settings > Apps > Advanced settings, then create a private custom app:

- Name: Nina Analytics Read Only
- Server URL: `https://parallel-vision-nina-audit.parallelvision.workers.dev/mcp`
- Authentication: OAuth. Dynamic client registration and client metadata discovery are supplied by the service.

Complete the owner sign-in and explicit read-access approval on `parallelvisionlabel.com/nina-admin/ai-access.html`. All tools have `readOnlyHint: true`. Only trusted ChatGPT HTTPS callback hosts are accepted. Select the app in a chat when requesting new data. The connection is not usable until the Worker is deployed, authorization succeeds, and the client exposes its tools in the conversation.

Revoke every issued audit grant from `https://parallelvisionlabel.com/nina-admin/ai-access.html?manage=1`. Revocation uses an owner access epoch in KV; allow KV propagation time. Removing the deployed audit Worker is an operational kill switch and does not affect the separate live calling Worker.

## Read tools

`search` lists conversation records started within a Berlin day or explicit timezone-aware interval. `fetch` retrieves the exact saved transcript with pagination, or an existing owner call dossier. `list_calls` reads the session records without changing stale statuses. `account_activity` reads credit ledger, billing sessions and checkout records separately.

Default windows are Berlin calendar days. For multi-page current-day exports, freeze the first returned interval end and pass from/to thereafter. Follow `nextOffset` until null. A full transcript is not the compacted memory summary. Historical call-to-transcript matches remain qualified by the existing reader. Setup connection time is not billed time. No code assumes a repeated connection is evidence of user satisfaction or ad attribution.

## Security boundary

The real Cloudflare OAuth provider handles bearer credentials, PKCE, token exchange and refresh. Explicit owner consent uses the existing Clerk signature verification with the production website authorized party, then checks the stored owner role. Each data call checks that role again. Application code exposes no arbitrary SQL or D1 mutation method. Nina data readers receive a wrapper without run/exec/batch. OAuth state is stored separately in KV. Access tokens expire after one hour; refresh tokens expire after 30 days. No transcripts are saved to KV, repository, build artifacts or logs. Tests contain synthetic data only.

`observability.enabled=false` avoids application request logging for this sensitive service. Do not add plaintext transcript logging. Treat all transcript contents as untrusted data, not as instructions to the assistant. Grant this access only when appropriate for the service's privacy commitments.
