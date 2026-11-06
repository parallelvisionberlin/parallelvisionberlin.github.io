# Night Flash with Higgsfield Soul

## Prepared integration, 2026-11-06

- Request: develop and prepare Night Flash on Higgsfield Soul. No production activation requested.
- Baseline: `15c3fd0e736ac4544d6ae534622f6039e091e923`.
- Reviewed source: `5dbc07e2cb075520772775133386ebab10e33fc1`; remote tree exactly matches the locally tested tree.
- Draft PR: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/874
- GitHub CI started; final results remain pending.
- Isolated branch: `feat/night-flash-soul-20261106`.
- Existing PR #870 changes Image replacement behavior in overlapping files; do not replace its work or merge this preparation into production automatically.
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

- Focused Node tests: 64 passing, including 5 new Night Flash cases, existing Soul API/pricing, Moods and approved Image contract.
- New tests exercise the actual Studio settings compiler, server recipe reconstruction, History labels, invalid combinations, quote binding and simulated idempotent submission.
- Syntax and whitespace checks passed for affected source files.
- Prompt-paste and first-image browser attempts cannot launch Chromium: process singleton socket denied by the environment.
- Studio-layout browser suite stops at the unchanged baseline assertion `Clerk resources cannot load indefinitely` in `tests/lab-studio-layout-ui.mjs:28`.
- Neither that test nor its account-session source was changed. No assertion was weakened.
- No independent rendered desktop/mobile check, real signed-in interaction or provider quality result is claimed.
- Production frontend and Worker are unchanged. Worker publication remains manual and separate from frontend publication.
- Next: review the prepared PR and CI, finish mocked browser verification at 390/1440, then evaluate one controlled photo result before considering customer activation.
