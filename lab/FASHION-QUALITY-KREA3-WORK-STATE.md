# PV LAB fashion fidelity and Krea 3 (October 16, 2026)

## Implemented
- No-prompt Base image generation has a conservative instruction to retain identity, body, pose, garment coverage, light and scene. It does not change the user's explicit direction and does not change Mood styling.
- Automatic prompt quality stays model-specific: fuller photographic fidelity instructions on Seedream, concise structure for Qwen Image 3.0, Nano Banana and Krea 3.
- Krea 3 added to the image catalog with both text-to-image and edit fal.ai routes; quality-focused berry, output 1K/2K, aspect ratio inherited from source where possible, at most four reference photos.
- The fal.ai provider safety checker is always enabled. Never label Krea 3 as uncensored or Artistic Freedom. Existing SpicyAPI Artistic Freedom labels remain as before.
- Price estimate: $0.025/MP, with output plus up to the output size of each reference. Upper bound estimate passed through existing FAL customer wallet pricing.
- Existing authenticated FAL queue, History, archival, failure handling and credit reservations reused; no unauthenticated proxy and no secret in the client.
- Qwen Image 3.0 remains available with identical provider route. No other model was removed.

## Verification and limits
- Automated tests include no-prompt reference preservation, per-engine hints, model field validation, safety checker and billing calculations.
- A mock or static test cannot prove face/body/garment similarity or image quality. Controlled A/B with identical consented source images, explicit fashion edits, 2K and 4 models (Seedream 5 Pro, Qwen 3, Nano Banana 2.1, Krea 3) still requires real provider generations and human ratings. No paid generation is performed by deployment.
- Published fal.ai Krea 3 edit API: https://fal.ai/models/krea/v3/edit/api
- Published fal.ai Krea 3 text API: https://fal.ai/models/krea/v3/text-to-image/api
