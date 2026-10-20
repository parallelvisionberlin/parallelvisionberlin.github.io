# PV LAB minor-safety prompt gate (2026-10-20)
## Scope and baseline
- Approved phase: customer prompt screening only. Explicit user request: no new paid service, no simultaneous UI redesign, no live change before review.
- Baseline: `main` commit `1b7bde7481098849bbf6e898e2448d1f51d8fd35`.
- Branch: `pvlab-minor-prompt-safety-20261020`.
- Do not edit Image Composer, the approved Exact Prompt toggle, reference roles, Moods, models, pricing, videos or owner tools.
## Prepared implementation
- `lab-worker/prompt-safety.mjs`: screens customer creative JSON text and reference notes without modifying the request.
- Immediate high-confidence English/Spanish/German minor+sexualization rules; distinct teenage/adult contexts.
- Optional Cloudflare `@cf/meta/llama-guard-3-8b` classifier; block S4 (child sexual exploitation), not S12 alone (adult sexual content).
- Fail closed if AI is unavailable, undecidable or daily cap has been reached. Raw prompts are not stored by the quota feature.
- `lab-worker/worker.mjs`: customer-only check before billable direct generation and quote creation; recheck bound quote text before paid submission.
- `lab-worker/wrangler.toml`: AI binding plus `LAB_MINOR_PROMPT_SAFETY_ENABLED="true"` for customer generation. Daily limit 20 evaluations until usage monitoring.
- `lab-worker/migrations/0034-prompt-safety-daily.sql`: per-day atomically counted AI requests (no prompts/media).
- `.github/workflows/deploy-lab-worker.yml`: quota migration step and dedicated safety test.
- `tests/lab-prompt-safety.test.mjs`: text and model-result tests including the adult 19-year-old case and exact-prompt immutability.
## Verified and limits
- Automated safety tests passed in GitHub CI, along with the approved Image UI contract, reference integration, static site, and broad Lab tests. One unrelated mobile-video browser regression remained failing due to a stale two-row layout assertion.
- Real Cloudflare Workers AI binding test passed on 2026-10-20: family photograph allowed, adult 19-year-old fashion portrait allowed, and a non-graphic sexualization-of-minor prompt classified as S4 and blocked. Temporary isolated smoke Worker was deleted via Cloudflare API; no persistent new service.
- The first REST smoke attempt failed with 401 because the deployment token lacked direct AI-inference scope. The Worker binding test succeeded, which matches production integration. No real user data was used.
- No native image inspection, upload age verification, output image checks, consent verification or provider-agnostic third-party deepfake defense in this phase.
- A request quota is not a guaranteed zero-cost limit: Workers AI allocation is shared, and paid-account overages may still be possible.
- Phase 1 is now approved for production deployment on merge, with a conservative global allowance of 20 classifier calls per day and fail-closed behavior on quota exhaustion/model failure. No raw prompt storage. This is not a guaranteed zero-bill configuration and users may see a temporary-unavailable error when the cap is reached.
## Next action
- Merge PR #363 after CI. Verify GitHub production Worker deploy and /health version, then exercise safe non-graphic smoke prompts through the authenticated customer UI before claiming full production effectiveness.
- If deploy or live evaluation fails, disable LAB_MINOR_PROMPT_SAFETY_ENABLED and redeploy after diagnosis; do not silently bypass the S4 rule.
- Later, separate phase: inspect uploaded visual references and generated outputs, verify permissions/identity of adult real people, and review billing usage.
