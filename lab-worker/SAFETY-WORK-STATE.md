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
- `lab-worker/wrangler.toml`: AI binding plus `LAB_MINOR_PROMPT_SAFETY_ENABLED="false"` default. Daily limit initially 20 evaluations.
- `lab-worker/migrations/0034-prompt-safety-daily.sql`: per-day atomically counted AI requests (no prompts/media).
- `.github/workflows/deploy-lab-worker.yml`: quota migration step and dedicated safety test.
- `tests/lab-prompt-safety.test.mjs`: text and model-result tests including the adult 19-year-old case and exact-prompt immutability.
## Verified and limits
- Ten pure module tests passed locally in Node, including adult fashion, nonsexual family, blocking and fail-closed behavior.
- The 11th test is a Worker integration contract and requires the full repository; GitHub CI after PR will test it.
- Local source syntax checked; PR CI and any Cloudflare-backed model response remain unverified.
- No native image inspection, upload age verification, output image checks, consent verification or provider-agnostic third-party deepfake defense in this phase.
- A request quota is not a guaranteed zero-cost limit: Workers AI allocation is shared, and paid-account overages may still be possible.
- PR is not merged; site and production Worker unchanged. Feature must remain OFF until model behavior, cost limit and user experience are verified.
## Next action
- Open draft PR, review CI and changes; fix only scoped regressions.
- With explicit owner approval, verify Cloudflare billing limits and AI availability before enabling production flag.
- Later separate phase: verify and moderate uploaded visual references and generated outputs.
