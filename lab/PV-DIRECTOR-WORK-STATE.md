# PV Director owner-only beta (2026-10-16)

## Why
The existing automatic photo instructions are deterministic text templates. They protect identity and wardrobe better than a generic no-prompt variation, but do not understand the supplied photograph or direct an intentional new scene.

## Implemented
- Private owner-only **Direct** action in the Image composer, visible only with a Base image, no active Mood, and a reference-capable image model. The public interface and existing model defaults are unchanged.
- Explicit click transmits one temporary, compressed JPEG preview (maximum 800 px long side and 150 KB prepared size) to the existing authenticated backend. The original photo stays in the user's workspace. Director does not store the temporary preview.
- Backend uses the configured Gemini 2.5 Flash vision route and the existing Mood Creator global/per-owner D1 analysis quotas (100 global/day, 6 per owner/day shared across these two tools). Analysis is API-metered but does not charge image credits or submit a generation.
- Vision output is split into Faithful refinement and Editorial reinterpretation, with a brief grounded observation. User reviews one, applies it to the ordinary editable prompt, then separately chooses Generate.
- The owner-only Image Details drawer can reveal `appliedDirection` saved on newly compiled image jobs. It never claims to reconstruct historical prompts that were not saved.
- No safety disabling, moderation bypass or inferred identities, and no automatic replacement of user instructions.
- No automatic image model rerouting. Existing Qwen, Seedream, Nano Banana, Krea 3 and Artistic Freedom options remain in place.

## Important limitations
- We have not run a paid image benchmark. The 2 suggestions are drafts until actual visual A/B results show improvements.
- No changes to Public Moods, customer pricing, models, account permissions, checkout, galleries or existing completed assets.
- Gemini can decline individual photos. The editor is left unchanged after any failure. Analysis may be unavailable if the Gemini credential or shared quota is exhausted.
- Applied Direction is saved when the backend image compiler is invoked; model-specific provider transformations can occur downstream. This is a saved PV LAB compilation, not an independent forensic record of a third-party model's hidden prompt.
- After the private trial, use at least ten consented photographs, two explicitly fixed evaluation instructions and multiple random seeds to compare Seedream 5 Pro, Qwen Image 3.0, Nano Banana 2.1 and Krea 3. Record identity fidelity, garment fidelity, pose/anatomy, photographic character, response compliance and spend per successful image.

## Success criteria
- Owner-only control is discoverable but adds no height to the main Studio dock.
- The suggested direction can be reviewed, edited or discarded without paid image generation.
- User auth changes, model changes, source changes and typed prompt changes invalidate stale previews.
- No Gemini request runs on upload, page load or Generate.
- Customer account cannot call the analysis route or view owner-only applied guidance.
- Unit and browser regressions pass prior to merging. Validate Cloudflare Worker production health independently.
