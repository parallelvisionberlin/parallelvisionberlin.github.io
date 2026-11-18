# PV LAB release safety

Initial baseline db094023c73ba452ec73c30b971a05c59a836a78; integrated
latest base 6c03c4002447fbed1c8f6104f92d8a482fdd3240 including large-video
multipart uploads before final validation. This is a staged
release-control change, not an activated production protection or a complete
staging environment. No merge, deployment, migration or repository-setting
change is performed by these files.

## One mandatory customer-safety check

Run `node scripts/pvlab-release-safety.mjs` from the repository root.
The same named check runs on every PR, main push and merge-group candidate,
without path filters. It has read-only repository permissions, no service
secrets, no deploy step and no live checkout/provider requests.

The profile `.github/pvlab-customer-safety.json` groups existing isolated tests
for session/authentication, checkout creation, signed payment-webhook credit
delivery, duplicate protection, debit/refund behavior, image/video quotes and
jobs, source uploads, account lifecycle and the approved Image source contract.
It includes the existing isolated billing-sandbox tests. Their database changes
are in-memory test fixtures, not applied production migrations.

Any test-process failure, missing test, launch error or interruption fails the
check. There are no allowed-failure steps. The Google-login test fixture now
uses/restores property descriptors so Node's getter-only crypto object does not
prevent the actual OAuth-return assertions from running. Auth implementation
and assertions are unchanged.

## Activation sequence and exact remaining decisions

1. Inspect the draft's exact-head `PV LAB customer safety` result. Review its
   whole diff. Existing unrelated red jobs must be identified as baseline
   failures with evidence; a green safety check does not erase them.
2. User approval is required before merge. This change does not publish a
   Worker or edit the live application. Keep the separate manual Worker-release
   fix in PR #1049; do not duplicate its source edits here.
3. After the check exists and passes, an administrator can import/apply
   `.github/pvlab-main-ruleset.json` through GitHub repository Rules. This is
   a prepared REST ruleset payload, not auto-applied configuration.
   It requires PRs, latest-main validation, the exact safety and approved Image
   checks from the observed GitHub Actions app (15368), blocks force pushes and
   deletion, and has no bypass actors. A solo owner may review/merge without a
   second GitHub account; no separate approving-review count is imposed.
4. Verify the rule is actually active through `GET /repos/OWNER/REPO/rules/branches/main`.
   Verify a deliberately failing test branch cannot merge, then close it
   unmerged. Do not perform this acceptance check against production data.
   Merely adding the workflow/JSON to the repository DOES NOT block merges.
5. Require a separate user decision before activating protections, altering
   production deployment settings or publishing any application/Worker change.
   The current connector cannot administer branch protection (403).

GitHub schema: https://docs.github.com/en/rest/repos/rules#create-a-repository-ruleset

## Remaining browser and environment work

This check validates source contracts and isolated behavior. It does not prove
visual layout, real OAuth, real checkout or real provider output. Reuse PR #934
for the existing phone-freeze/deck/browser repairs; its tested head is not a
substitute for integration with latest main. Do not copy its overlapping edits
into this change or declare it ready from old passing jobs.

Before UI publication, validate the affected desktop/mobile role and browser
flows on the actual candidate, including adjacent Image/Video surfaces. Before
backend publication, repeat the relevant quote/debit/refund/webhook/job tests
and check frontend/Worker/schema compatibility.

Existing Pages previews are frontend previews. A preview that calls the live
Worker is not an isolated rehearsal. The existing billing sandbox is separate,
but is not a full Image/Video staging backend. A complete staging setup still
needs a separate Worker, database/media storage, test authentication/payment
configuration and intercepted generation providers. Prepare/review those
bindings before requesting a deployment or resource-setting decision. Never
copy customer data, production secrets or customer balances into staging.

## Publication and recovery

Before any approved release, record the known-good frontend commit, Worker
version and schema compatibility. Keep additive/backward-compatible contracts;
do not combine irreversible schema changes with a routine interface edit.
Cloudflare supports Worker versions and rollback, but rolling code back does
not reverse database writes or payments. No automatic rollback script is
introduced here.

After publication, separately verify hosting evidence, exact live assets,
Worker capability and affected read-only customer behavior. A health marker or
deployment success alone does not prove a functioning purchase/generation.
Report verified customer impact and the needed action in plain Spanish; keep
technical evidence in the PR. Suppress unchanged risks and routine no-change
messages. Existing periodic checks do not provide real-time coverage.

## Validation checkpoint

- Base: 236 focused tests; 235 pass, one Google test fails before its assertions
  because Node crypto is getter-only. The initial sparse checkout omitted a
  `.mjs` dependency; the base was rerun after completing the checkout.
- Latest-main base: 245 checks, 244 pass; the same crypto fixture failure.
- Integrated candidate: 246/246 profile checks (including host restoration) and
  4/4 runner fault-propagation/configuration checks passed locally. Parsed YAML,
  required-check names, no-secret execution and preserved work records checked.
  Repeat the same checks on the exact remote candidate; hosted CI remains required.
- Full work-index validation already fails on the unrelated ALTER record's
  unsupported queued result. Preserve its contents and other handoffs. Validate
  this task's record individually until that existing blocker is repaired.
- No current application/Worker or live settings were changed by this work.
