# PV LAB Admin MCP, 2026-11-04

- Objective: reliable read-only backend queries from ChatGPT, reusing Stripe's
  existing connector and avoiding repeated Owner-browser authentication.
- Baseline main: `19e1995719ce155209fbe57a6767e134a3a4b4a7`.
- Scoped source: `pvlab-admin-mcp/`; workflow `.github/workflows/pvlab-admin-mcp.yml`.
- Separate Worker and manual deployment; existing Lab/Stripe/Studio flows unchanged.
- Three tools: exact customer lookup, retained customer activity and bounded business
  activity. Uploads, generated results, working copies, references and quoted/submitted
  provider-input snapshots are separate evidence. Prompt text is not upload evidence.
- Default disabled. OAuth JWT signature, exact issuer, exact /mcp audience, expiry,
  explicit owner subject and `pvlab:read` scope enforced. `offline_access` requested
  to support provider-managed refresh. No arbitrary SQL or write tools.
- Original upload rows use exact `/sources/{asset-id}`. Generated output and derived
  source paths are classified separately; deleted/unmatched records stay unknown.
- Counts cover retained records, not all-time uploads. Closed accounts excluded.
- No customer source media, storage keys, raw provider errors, keys or URLs exposed.
- Prompts opt-in; audit logs contain tool/time/random request ID only.
- D1 binding can technically write; the application implements fixed SELECTs only.
- Deployment form reuses the existing GitHub Cloudflare secret, with no secret reads.
- Local validation: 12 tests passed (including actual repository schema), syntax
  checks passed and Wrangler 4.157.0 dry-run bundle succeeded. npm audit reported
  zero known vulnerabilities across production and development dependencies.
- SDK 1.32.2, jose 6.1.3 and Zod 4.6.7 pinned with package lock. No live credentials
  used by tests and no production payment, generation, write or deployment performed.
- Current publication status: NOT deployed, NOT connected to ChatGPT; local fixtures
  do not establish any fact about Gonzalo or live payment/post-purchase behavior.
- Remaining external requirements: production Clerk OAuth client/custom scope, exact
  callback and resource-audience support, verified owner sub, and deployment rights
  for a separate Worker/custom domain. These have not been provisioned or verified.
- Next: review draft PR, configure existing production Clerk, run manual disabled
  deployment after merge, verify access restrictions, connect/consent in ChatGPT,
  then compare a real customer query with original live records.
- Detailed operator steps and references: `README.md` in this directory.
