# PV LAB publication protocol

## Fixed destination

- Production: `https://pvlab.studio`, Cloudflare Pages project `pvlab-studio`, Git branch `main`.
- GitHub stores source and runs tests. The GitHub Actions workflow `pages build and deployment` publishes a separate GitHub Pages destination. Its success is never evidence of a pvlab.studio release.
- Read Cloudflare evidence from the exact commit's `/check-runs` endpoint. `fetch_commit_workflow_runs` only lists PR-triggered Actions runs and omits Cloudflare's app check.

## Small changes stay small

1. Start from current main and the scoped checkpoint. Edit only the approved change. Upload the tested file bytes directly; do not reconstruct code inside escaped API strings.
2. Select relevant existing tests once. Typography/color changes need the approved Image contract and the affected visual/role comparison. Changes to deck sizing/behavior need the three browser suites listed in lab/AGENTS.md. Account, billing, credit, deletion and security changes retain all applicable safeguards. Documentation/tooling changes do not need the app's entire browser matrix.
3. Existing CI continues normally. Wait for required and relevant checks; inspect an unexpected failure before retrying. Do not disable gates or repeatedly rerun passing suites.
4. Merge the reviewed commit. Read the Cloudflare Pages app check for that exact SHA. If another main commit supersedes it, confirm ancestry and verify the changed asset bytes against the reviewed source.
5. While Cloudflare is building, report that state. Check again at 45-60 second intervals, not repeated browser reloads. Do not start authentication, another deployment or a manual release workflow while a normal deployment is already pending.
6. After successful Cloudflare deployment, verify the custom domain's expected asset version and exact reviewed bytes. For visual changes, inspect the affected rendered style or behavior once.
7. Record source SHA, Cloudflare result, live evidence and any remaining real-account verification in the scoped checkpoint. Report these separately. A source/test pass cannot become a claim about a real signed-in session.

## Read-only verification command

From the repository root, with the full Cloudflare deployment commit present locally:

```sh
node .github/scripts/verify-pvlab-release.mjs --sha FULL_DEPLOYMENT_SHA --asset lab/image-editorial-deck.css --version 20261021-title-medium1
```

The command checks the Cloudflare app identity/project/commit, the production HTML version and SHA-256 equality with `git show SHA:asset`. It makes no deployment or account changes and never starts login. `LIVE_VERIFIED` means publication of this asset, not visual QA, account behavior or the entire site. Exit 0 means verified; exit 2 means pending/mismatched evidence; exit 1 means evidence unavailable or invalid input. It has no internal polling.

If direct network access is unavailable, use the GitHub connector for the same exact check, then browser DOM/CSS evidence on the production domain. State the limitation; do not repeatedly request access already authorized. A manual Pages API release previously failed with HTTP 403/code 10000 and must not be retried until access has materially changed.

Tool verification: `node --test tests/pvlab-release-status.test.mjs`.

## Current record

- Added 2026-10-21 after the title-weight release. The tests reject GitHub Pages success, a different commit, pending Cloudflare, stale HTML, stale CSS and unavailable evidence.
- Verified locally: all five verifier tests pass. The actual read-only command against deployment commit `f12c180fda07e5d78a3f52bb9ae8ec5d539a077e` returned `LIVE_VERIFIED` for `image-editorial-deck.css?v=20261021-title-medium1`; SHA-256 `76a83244713ed2e5d930e5fc33557495dd1f686c605a85d8f62905248a83315f`. This is actual custom-domain byte verification; the failure cases are isolated test fixtures.
- These instructions and the read-only verifier are repository controls for future work. They do not change account permissions, hosting settings, existing CI gates or already-running chats.
