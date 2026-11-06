# Night Flash with Higgsfield Soul

## Live release requested, 2026-11-06

- User explicitly authorized live publication on 2026-11-06. Do not ask for that authorization again.
- Baseline: `15c3fd0e736ac4544d6ae534622f6039e091e923`.
- Reviewed source: `5dbc07e2cb075520772775133386ebab10e33fc1`; remote tree exactly matches the locally tested tree.
- Draft PR: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/874
- Final tested source: `b6e5ee4c52c2992243e99cf2fa1dd45c052394d7`; application source unchanged from the reviewed implementation.
- Isolated branch: `feat/night-flash-soul-20261106`.
- PR #870 has overlapping Image work. Preserve it; inspect current deployed Worker source/settings before staging.
- Night Flash remains the existing photographic Mood with its existing card and imagery.
- User chooses PV Soul in the existing Image model menu, then Night Flash in Moods.
- No automatic model switch or price change when selecting a Mood.
- Soul 2 text and one-base-image routes use a shared, bounded Night Flash recipe.
- An optional completed Soul ID remains owned and validated by the existing Worker.
- Qwen LoRAs and multiple Character reference photographs are not converted to Soul IDs.
- Unsupported Moods on Soul are blocked with the existing explicit model-switch action.
- Base recipe requests the existing person, outfit, pose, framing and geometry while relighting.
- Text recipe requires an authored subject. No silent copy of the card's model.
- Identity preservation is model guidance, never a pixel or likeness guarantee.
- Intensity affects flash, ambient exposure and grain, never permission to change identity or wardrobe.
- Worker recompiles from authored direction; client recipe text is not authoritative.
- No native Soul style UUID has been selected or fabricated.
- The connected Higgsfield app catalog and the direct API expose different schemas; do not assume parity.
- Official direct API docs checked: https://open.higgsfield.ai/models/higgsfield-ai/soul/v2/image-to-image/api-reference
- Direct API accepts a photograph, prompt and optional Soul ID. Reference-image prompt processing remains enabled by the provider.
- Official text API: https://open.higgsfield.ai/models/higgsfield-ai/soul/v2/standard/api-reference
- Prompt, Mood ID, intensity and authored direction persist through quote/job settings for History and Reuse.
- Checkout restoration also restores Soul resolution and identity strength.
- Both customer preview pricing and explicit submission reject a quote with different Night Flash metadata.
- Existing live estimates, customer price ceiling, daily budget, account isolation, explicit confirmation, idempotency and uncertain-job blocks remain intact.
- No migrations, credentials, billing rates, paid generation, training or live configuration changes.

## Verification and release boundary

- GitHub Node 22.16.0: 64 focused tests PASS, including 5 new Night Flash cases and the approved Image contract.
- GitHub browser: actual Studio/controller with synthetic owner and customer sessions PASS at 1440x900 and 390x844.
- Verified selection, text/base recipe, unsupported Mood blocking, geometry without horizontal overflow, bound quote and one explicit confirmed submission.
- No live vendor, payment, training or generation call; provider boundaries are mocked.
- CI receipt: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42259976134/job/128037028189
- Four desktop/phone screenshots retained in that run's night-flash-soul-desktop-phone artifact.
- General suite: candidate 1043/1048 PASS; base 1038/1043 PASS. Both fail the same five named tests: checkout Meta cookie IDs, Moods header links, oversized Mood upload, Soft Pastel focal point and photobooth stylesheet semantics.
- Candidate general-suite receipt: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42259976116/job/128037028334
- Baseline job: 127983011457 on 15c3fd0e736ac4544d6ae534622f6039e091e923. Existing assertions remain unchanged.
- Local prompt-paste/first-image browser launch was environment-blocked; existing Studio-layout stops on its unchanged baseline Clerk assertion. The new focused CI flow supplies the missing actual browser coverage.
- Cloudflare branch preview succeeds; this is not production publication.
- Deployment BLOCKED: Cloudflare dashboard is signed out; no deployment credentials are available in this session. Secure sign-in request was aborted and the page still shows login.
- No backend deployment, main merge or production frontend release performed. No real signed-in production or paid quality result claimed.
- Next: complete authorized Cloudflare authentication, compare deployed Worker source/settings, deploy backend preserving bindings, then merge the reviewed frontend and verify exact production assets and live behavior.
