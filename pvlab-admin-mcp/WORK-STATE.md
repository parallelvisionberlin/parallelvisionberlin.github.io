# PV LAB Admin MCP, 2026-11-05

- Objective: private owner-only, read-only PV LAB queries from ChatGPT.
- Source: PR #839, merged commit `23cf6f313082b8267b830510085bea98c2a03784`.
- Scope: `pvlab-admin-mcp/` and `.github/workflows/pvlab-admin-mcp.yml`.
- Tools: find_customer, customer_activity, business_activity; fixed SELECTs only.
- Existing Lab, Stripe, generation flows, balances and customer state were not modified.
- Exact issuer/audience, signature, expiry, owner subject and pvlab:read remain enforced.
- D1 binding technically permits writes; the service exposes fixed read-only queries.
- No R2, OWNER_DB, Stripe or provider-key binding.

## Verified publication

- Published separately through the existing Cloudflare connector, not GitHub Actions.
- Service: `pvlab-admin-mcp`; resource: https://admin-mcp.pvlab.studio/mcp.
- Deployment: `05845cb4bd114b80a4c4324beb61fbc9`.
- Worker ETag: `64f21863a2830f1f073b74feebc5cedcbce6081ebd45cef55faa600a06a471c8`.
- Built from the merged source and pinned package-lock; ES module bundle minified with esbuild.
- Compatibility date: 2026-11-04; only LAB_DB plus the five expected configuration variables.
- Owner supplied their Clerk user ID; allowlist configured in Worker variables, not this public file.
- MCP_ENABLED=false. Public /health returned HTTP 200 with enabled=false.
- Public /mcp returned HTTP 503, Service disabled.
- Dedicated custom domain and TLS certificate attached; workers.dev and preview URLs disabled.
- No customer requests were made through this disabled MCP endpoint.
- Revalidation: 12/12 tests passed, including actual repository schema and billing/contact migrations.
- Syntax checks, Wrangler dry-run, minified-bundle disabled-mode smoke test passed.
- Production dependency audit: zero reported vulnerabilities.
- Local signed-token tests are fixture evidence, not production OAuth authorization evidence.

## OAuth and existing access

- Clerk issuer: https://clerk.pvlab.studio; JWKS: same origin /.well-known/jwks.json.
- Live discovery now advertises S256, offline_access and pvlab:read.
- Public JWKS fetched successfully; one RS256 key.
- Screenshots show dedicated PV LAB Admin client, consent on, public/device grant off.
- Settings screenshot showed JWT tokens and Require PKCE; owner was instructed to enable audience.
- Owner reported completing the configuration; no real OAuth access token was obtained.
- Exact resource audience and owner sub in a real access token remain unverified.
- Redirect URI and private ChatGPT connection remain pending. Do not weaken token checks.
- Cloud Clerk sign-in remained at Google; secure credential request was aborted.
- Do not retry authentication without renewed user intent.
- Existing Cloudflare connector DOES permit live, parameterized SELECTs against LAB_DB.
- Read-only live customer investigation succeeded through that existing connector.
- Customer details, prompts, owner identifier and credentials are deliberately omitted here.
- No OAuth client secret was deployed, copied into source, or added to workflow inputs.
- GitHub deployment-secret permissions remain untested; direct connector publication succeeded.

## Next action

- For current-chat backend questions, use existing Cloudflare connection; more Clerk setup is unnecessary.
- To finish the separate MCP connection later: set the exact callback shown by ChatGPT,
  configure client credentials in its secure UI, verify real owner OAuth claims, then activate.
- After activation, test anonymous/non-owner denial and a real owner tool call before claiming connected.
- Rollback: keep MCP_ENABLED=false or remove only this service's dedicated domain.
- Detailed operator instructions: README.md.
