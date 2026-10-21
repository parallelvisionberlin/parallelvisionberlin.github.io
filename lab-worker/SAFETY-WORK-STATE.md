# PV LAB prompt safety: active work state
Updated: 2026-10-20 (Berlin)

## Objective and owner decision
- Keep customer prompt moderation simple: one AI safety check when a generation is submitted, not at price quote and again at submit.
- Remove arbitrary global 20-per-day limit; user rejected this as unsustainable. Do not introduce a new fixed per-customer or global count cutoff.
- Keep legitimate fashion, adult erotic content, 19-year-old adult models, family scenes and nonsexual youth imagery allowed, with strict blocks for sexualization of minors.
- Never weaken fail-closed handling when Workers AI is unavailable.
- **Scope lock:** backend safety only. Do not change UI, Image prompt deck, Moods, Exact Prompt, pricing, credit ledger, providers or owner creative workflow.

## Source and changed areas
- Baseline: main c99eb2e62d5f614647d89751ad808517e4e3aca8, merged PR #363.
- Working branch: pvlab-one-guard-per-generation-20261020.
- `lab-worker/prompt-safety.mjs`: remove D1 request quota and env limit. Keep local obvious child-safety rules, Cloudflare Llama Guard S4 classification and fail-closed provider errors.
- `lab-worker/worker.mjs`: main SpicyAPI workflow only checks at /api/jobs submission using the stored quote; direct Gemini/FAL/Kling/Precision submissions check their prompt once. Higgsfield submits quote ID only, so read its bound settings and check once before new generation. Price quote endpoints do not run the AI.
- `lab-worker/wrangler.toml`: retain Workers AI binding and customer enabled flag; remove the 20-request cap setting.
- `tests/lab-prompt-safety.test.mjs`: test 40 independently submitted prompts, S4 vs S12, adult and family content, fail-closed, Exact Prompt, and route contracts.
- `.github/workflows/deploy-lab-worker.yml`: stop redundant 0034 quota migration on each deployment; existing D1 quota table remains unused, not deleted.
- Worker version: pv-lab-2026-10-20.2-one-check-per-generation.

## Existing verified baseline
- PR #363 successfully merged. Real isolated Workers AI Llama Guard smoke test passed for family, adult 19-year-old fashion and minor-sexualization text. Temporary smoke Worker successfully cleaned up.
- Legacy PR had one unrelated mobile-video browser test failure about an obsolete two-row layout assertion. Never touch UI to fix under this scope.
- **Only text is screened.** Uploaded photos, image-only prompts, generated output media, adult identity verification and deepfake consent protections are not covered. Do not claim otherwise.
- Cloudflare Workers AI pricing includes 10,000 free Neurons/day shared across account. On Workers Paid, use beyond the included amount may be billed. One check does not equal one Neuron. Removing app-level limit does not guarantee zero cost.

## Verification and operational requirements
- Run prompt safety tests and approved Image UI contract; observe separate Worker CI and any known independent UI failure.
- Open PR and examine exact changed files; don't merge if new tests fail.
- Verify main commit + GitHub Worker deployment + remote /health version separately. A merge is not a live proof.
- Avoid live test generation or customer billing. A safe non-graphic text smoke with an authenticated *customer* can be arranged without generating illegal material.
- If Workers AI fails at runtime, requests return temporary unavailable without customer charge, not unmoderated generation.
- No outreach email, third-party safety subscription, or visual generation.
