# PV LAB Admin connection

Private, owner-only MCP service for inspecting PV LAB records from ChatGPT.
This is a separate Cloudflare Worker. It does not modify the existing Lab Worker,
Studio, billing, balances, customer data or Nina database. Stripe continues through
the existing Stripe connector; the customer lookup returns the Stripe customer ID.

## Current state

Published at https://admin-mcp.pvlab.studio/mcp with configuration disabled;
not connected to ChatGPT. The public health endpoint reports enabled=false and
the MCP endpoint returns 503. Real owner OAuth claims and the exact ChatGPT callback
remain pending. Existing Cloudflare connector access has separately been verified
for live, read-only LAB_DB queries; current-chat customer investigations can use
that connection without completing this separate MCP setup. No live customer
investigation has been performed through this disabled MCP service.
Operational checkpoint: [WORK-STATE.md](WORK-STATE.md).

## Tools

| Tool | Inputs | Result |
| --- | --- | --- |
| `find_customer` | Exact verified email OR customer ID | Open-account matches, current credits, Stripe customer ID. Ambiguous matches remain separate. |
| `customer_activity` | Customer ID, page, limit, optional `includePrompts` | Retained upload counts, file provenance, packs, jobs, image references, working copies, saved provider input counts and credit ledger. |
| `business_activity` | Rolling window, 1–90 days | New open accounts, retained jobs by state, known provider costs and credit movements. No cash revenue inference. |

### Evidence rules

- `kind=source` is not proof of an uploaded image: generated images use that type too.
- Exact `{owner}/sources/{asset-id}` is the current upload route's storage pattern.
  Derived `{owner}/sources/{asset-id}.ext` remains `unknown-or-derived`.
- Retained upload counts are not lifetime counts; files/packs may have been deleted.
- Uploaded file means a recorded upload, not proof of ownership, authorship or who is depicted.
- A reused input is not another upload. The primary source may also appear among references.
- Saved quoted input and saved submitted input are labelled separately. Neither proves
  the provider actually received or used every image. Unknown historical fields remain unknown.
- Prompts are opt-in, truncated to 12,000 characters and treated as untrusted customer
  content. They cannot override actual file-link evidence.
- Closed accounts are excluded. No original images, storage keys, private URLs,
  provider payloads, raw error strings or service credentials are returned.
- Every result includes an observation timestamp. Independently paginated sections
  can change while a customer is active; this is not a transactional historical snapshot.

## Local checks

From the repository root:

```sh
npm --prefix pvlab-admin-mcp ci --ignore-scripts --no-audit --no-fund
npm --prefix pvlab-admin-mcp test
npm --prefix pvlab-admin-mcp run check
WRANGLER_SEND_METRICS=false npm --prefix pvlab-admin-mcp run build
npm --prefix pvlab-admin-mcp audit --omit=dev --audit-level=high
```

Tests cover real SQLite queries, existing repository schema/migrations, source
provenance, missing/deleted/cross-account references, opt-in prompts, bounded input,
pagination, closed accounts, JWT signature/issuer/audience/scope/subject/expiry,
OAuth discovery, MCP SDK initialize/list/call and fail-closed audit behavior.

## Remaining setup: existing production Clerk application

An administrator must configure the **PV LAB production** Clerk instance. Do not
change the Parallel Vision/Nina instance or migrate existing users.

1. In Clerk's OAuth applications, create a dedicated OAuth client for **PV LAB Admin**.
   Create/assign the custom scope `pvlab:read` and allow `offline_access` for refresh.
   Use the exact callback URI displayed by ChatGPT's connection configuration.
   Require authorization code + S256 PKCE and an explicit consent screen.
2. A manually registered client is sufficient: do not enable unrestricted dynamic
   client registration. If CIMD is used instead, allow only ChatGPT's exact client
   metadata identifier shown in its management page and only these scopes.
3. Use JWT access tokens. Verify the issuer's discovery document and its `jwks_uri`.
   Verify a test access token carries the **exact service /mcp resource URL as aud**,
   the owner's actual OAuth `sub`, `exp`, `iat` and the granted `pvlab:read` scope.
   Clerk's ability/configuration to issue that audience must be checked in the actual
   instance; never remove audience validation to make a token work.
4. Confirm the allowlisted `sub` belongs to Alejandro's owner account. Do not infer
   ownership from an email, a customer record or an ordinary PV LAB sign-in.
5. Keep OAuth client secrets in the connection's secure configuration, not this repo,
   chat, project attachments, workflow inputs or browser-readable application code.

JWT signature, exact issuer/audience, expiry, owner subject and custom scope are
checked on every request. Tokens for a normal user, another resource or ordinary
Clerk sessions are insufficient. This verifier accepts JWT OAuth access tokens;
opaque tokens are unsupported. JWT revocation takes effect on token expiry or by
disabling the service/removing the allowed subject. Refresh-token revocation is
managed in Clerk/ChatGPT. Reauthorization may still be required after revocation.

## Publication

The workflow `.github/workflows/pvlab-admin-mcp.yml` tests pull requests. It does
not publish on push or merge. Once reviewed code is on main and Clerk is ready,
run its manual form with:

- A dedicated PV LAB HTTPS subdomain ending in `/mcp`; the apex and Clerk hostname
  are rejected. The chosen hostname must be available in the existing Cloudflare zone.
- Exact OAuth issuer, matching JWKS URL and verified owner OAuth subject.
- Activation **false** for first deployment; activate only after the access review.

The workflow reuses the repository's existing `CLOUDFLARE_API_TOKEN` secret. Its
ability to deploy a separate Worker/custom domain and bind LAB_DB has not been
verified. If insufficient, an administrator must adjust the deployment credential
through GitHub's secret settings; do not paste it into chat. No token is extracted.

`deploy.mjs` checks discovery, issuer, JWKS, PKCE and both scopes before invoking
Wrangler. It uses a dedicated custom domain, no workers.dev route, and only LAB_DB.
The D1 binding itself has runtime write capability: read-only access is enforced
by this service's fixed SELECT-only code, not by a claimed D1 read-only credential.
There is no R2, OWNER_DB, provider API key or Stripe key binding.

Enable only after confirming owner-only access and audience configuration. Then
create/install the private ChatGPT MCP connection with the deployed URL, configure
the registered OAuth client in the secure connection settings and approve consent.
Verify initialize/tools, denied anonymous and non-owner access, and one actual
customer lookup against the Owner dashboard. Record those results before claiming
the service is live. A dry-run bundle is not production evidence.

Rollback: set `MCP_ENABLED=false` and deploy this service, or remove its dedicated
route. Revoke the OAuth connection/grants if needed. No data migrations or changes
to the existing Lab application are needed.

## Sources

- https://developers.openai.com/plugins/build/mcp-server
- https://developers.openai.com/plugins/build/auth
- https://clerk.com/docs/guides/configure/auth-strategies/oauth/how-clerk-implements-oauth
- https://clerk.com/docs/guides/configure/auth-strategies/oauth/verify-oauth-tokens
