# Nina Analytics read-only connection

A standalone, owner-authorized MCP reader. It does not modify or deploy the live-call Worker or the mobile app. No transcript export to public GitHub, public object storage or email is used.

## One-time setup

Use the existing separate `parallelvision-web-deploy` clone on `main`. Pull the release, then run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\nina-audit-worker\deploy.ps1` from that clone. The script installs locked dependencies and deploys **only** `parallel-vision-nina-audit`. Wrangler provisions a separate `OAUTH_KV` store on first deployment and retains its ID in ignored `wrangler.deploy.json`. The existing D1 ID is bound, but this service has only fixed SELECT readers. No D1 migration is run.

In ChatGPT web, enable Developer mode under Settings > Apps > Advanced settings, then create the connection with:

- Name: Nina Analytics
- Server: `https://parallel-vision-nina-audit.parallelvision.workers.dev/mcp`
- Authentication: OAuth

Here "create" registers a connection. The user does not develop another app. Sign in with the existing Nina owner account and click **Approve read-only access**. All four tools advertise `readOnlyHint: true`. Actual availability must be verified after ChatGPT scans the deployed server; source tests are not a successful ChatGPT connection.

## Access and revocation

The browser approval page is `/nina-audit-connect/`. It requires a valid signed Clerk token and a database row with `role=owner`; an ordinary user cannot approve. Every tool request rechecks the authorizing owner. OAuth uses the Cloudflare OAuth provider, PKCE S256, a canonical resource audience, expiring access tokens and rotating refresh tokens. Approval requests expire in ten minutes. Only HTTPS ChatGPT/OpenAI callback hosts are accepted. No login cookie or password is copied to ChatGPT.

Return to `/nina-audit-connect/` to revoke an individual grant. Setting `AUDIT_ENABLED=false` on the audit Worker disables all record reads independently of the live service. KV consistency may delay revocation propagation; for urgent revocation disable the Worker. OAuth state is stored separately in KV, never in the transcript database.

## Data and limits

`search` finds conversations by name, email or text. With an empty query it lists today in Europe/Berlin. `fetch` reads exact conversation records with full message pagination. `nina_account_activity` reads analytics, live activation timestamps, ledger entries, checkout states and balances for an account. `nina_period_summary` reads independent totals, not an attributed acquisition funnel. Date ranges are limited to 31 days per request. Pages are limited to 100 records and all functions return `nextOffset` where applicable.

The reader does not guess a transcript-to-call foreign key from timestamps. It retrieves conversations directly, and returns account activity separately. Connected time can include technical setup and is not equivalent to billed time. Missing supplementary tables are reported as unavailable rather than zero. Transcripts are untrusted input, not agent instructions. No third-party targeting or ad demographic inferences are made from these records.

The D1 binding itself is a normal Cloudflare binding; read-only enforcement is the application's fixed SELECT operations with no arbitrary SQL or write tools. Audit the code before changing that boundary. Only the owner may authorize sharing these private records with ChatGPT. Review your privacy notice and ChatGPT data controls before enabling the connection.

## Verification

Run `npm ci --ignore-scripts`, `npm run check`, `npm test`, and `npm run build` here. Tests use synthetic records and the existing production table migrations. CI also checks the standalone runtime's OAuth discovery and that an unauthenticated MCP request is denied. Real Cloudflare deployment, Clerk login and ChatGPT tool availability still require an end-to-end owner check.
