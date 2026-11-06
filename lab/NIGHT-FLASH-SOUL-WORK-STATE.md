# Night Flash with Higgsfield Soul 2

## Current state, 2026-11-06

- PR #874 merged: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/874
- Tested application source: `86a00a39806dc1aac172a1229ba9d1b4d782b8a3`.
- Current frontend source: #879 merge `a8b44c3f52b382e6032a2f8bd8de16d6036d5054`; baseline `5bd91d73a1af1e9c3eae40ed82b5efcad3680589` preserves compact prompts, Identity typography, #874/#877 and #870.
- Night Flash remains the existing Mood/card; users explicitly choose PV Soul. No automatic model switch or new native style UUID.
- One Base or an authored text subject; optional completed, owned Soul 2 ID. Character photographs and Qwen LoRAs are not Soul IDs.
- Recipe keeps direct frontal flash, deep readable blacks, organic 35mm grain, natural skin/fabric and restrained practical lights; no invented neon.
- Base guidance preserves identity, proportions, outfit/coverage, pose, framing and geometry unless the authored direction or selected Soul ID changes them. This is guidance, not a likeness/pixel guarantee.
- Intensity, original direction, Base and Soul identity stay bound to the quote and persist through History/Reuse. Existing credit ceiling, budget, confirmation and idempotency remain.
- Customer gate: `LAB_CUSTOMER_SOUL_NIGHT_FLASH_ENABLED` must equal `true`. Absent/false stays blocked even when general Higgsfield access is enabled.
- Frontend blocks automatic Night Flash price requests while closed. Worker blocks quote and unused-quote submission before vendor calls/reservation. Existing-job replay and ordinary Soul remain available.

## Verified tests and scope

- 115 focused Node 22.16.0 CI tests pass: Soul API/pricing, Mood, approved Image contract, Precision Edit and replacement.
- Full Studio/controller fixtures pass for owner/customer at 1440x900 and 390x844.
- Verified model/Mood selection, intensity, text/Base, completed/pending identity, strength, seven-credit mock quote, cancel, explicit confirmation and Reuse.
- Customer flag is closed by default; the enabled customer path is simulated only inside the isolated fixture.
- #870 selection/brush/composition test and full replacement flow pass at 390px and 1440px. Its application files remain unchanged from main.
- CI: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42290239663
- Night Flash and owner-card screenshots: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42290239663/artifacts/13538434373
- Initial Night Flash release: 139 local Worker/customer/pricing/prompt-safety/submission tests passed on Node 24.22.1.
- Prior Night Flash broad baseline: 1096/1102 passed. All six failures reproduce on main in the four affected files (20 cases, 14 pass/6 fail): Meta cookie IDs; Dream Blur upload scheduling; Moods header; oversized upload; Soft Pastel focal point; photobooth stylesheet. Assertions unchanged.
- Separate approved-image-ui workflow passes for the owner-card candidate; normal merge API used without bypass options.
- Hosted Chrome 156 supplied the compatible browser. The old apt browser installation exhausted its timeout; local Chromium is blocked by socket permissions.
- No real provider generation, training, payment or signed-in production journey was performed. Fixture photographs are existing previews, not new generated results.

## Publication

- Initial Night Flash baseline Worker was rebuilt and verified byte-identical: SHA-256 `1b1497dc3c269e04251f26daceee0e5adda94ed16484c417f3e0f8758bea805d`.
- Gated Worker published via Cloudflare content-only endpoint at 2026-11-06T20:40:40Z; deployment `546e7a0200594653940d85353c3d369d`.
- Downloaded Worker exactly matches tested bundle SHA-256 `53244c59058136c5b3a60d96a8a8a26c893bfd18b962310671bc2f86720fc955`.
- All live bindings and compatibility settings stayed unchanged. Customer Night Flash flag is absent, therefore false; source configuration also declares false.
- Health OK; `imageReplacement: 20261106-replacement1` retained. No credential/configuration or migration changes.
- Initial Night Flash frontend production: scoped verifier returned `LIVE_VERIFIED` for merge `454c5ab51f9a2417e0977e791705450699a9e3f4`; exact Cloudflare Pages check `128131672180` succeeded.
- Initial Night Flash custom-domain `lab.js` matches source SHA-256 `299c5d0973c35f7fbbf58fd2cf297efbd9f0d1e27fd6348d81185331797cbe98`. Asset evidence does not establish a signed-in production journey.

## Provider contract and activation conditions

- Official image API: https://open.higgsfield.ai/models/higgsfield-ai/soul/v2/image-to-image/api-reference
- Official text API: https://open.higgsfield.ai/models/higgsfield-ai/soul/v2/standard/api-reference
- Rechecked routes, Base URL, prompt, 720p/1080p, supported ratios, batch size 1, seed bounds and optional same-account completed Soul ID/strength. No invented `style_id`.
- Provider image-to-image prompt processing is always enabled. Its schema does not establish generated appearance or identity retention.
- Before customer activation: record commercial/resale permission and a real account-specific live quote within existing ceilings; verify a completed same-account Soul ID when needed and provider-accessible Base URL.
- An explicitly authorized real-image test must establish photographic quality, identity and Base handling before changing the customer flag. No paid generation/training is authorized by this checkpoint.
- Next: leave the customer gate closed pending the provider/account/quality conditions above; obtain explicit authorization before any paid real-image test.

## Won Kar Night: owner-only Soul test

- User-confirmed English name: **Won Kar Night**; caption: **PV Soul · Owner test**.
- Card exists only for `ownerAccount` in Image Studio Moods. Selecting it explicitly chooses PV Soul without generating. Public `MOODS` stays at 17 entries.
- Cover `lab/mood-previews/won-kar-night.png` exactly copies existing `wonkarwai1.png` (Git blob `b41cc5211b567d74d68f74cff89baa60132b94e2`); no generated or edited image.
- Cover is presentation only, never a provider input. Cinematic emerald night, source-bound motion and 35mm grain; Base/Soul ID and authored changes stay authoritative.
- Customers are rejected at both quote and unused-quote submission, even with all customer provider flags enabled. Budget, explicit price confirmation, History/Reuse and idempotency stay intact.
- Three new Node cases and owner/customer 390px/1440px browser checks pass in the CI above; existing replacement suites also pass. No paid generation/training.
- Files: `lab/won-kar-night.js`, `lab/moods.js`, `lab/night-flash-soul.js`, `lab/lab.js`, `lab-worker/higgsfield.mjs`, `tests/lab-won-kar-night.test.mjs`.
- Owner-card frontend `64c57859046816f6b01b7023965fd5319b42e884`: `LIVE_VERIFIED`, successful Cloudflare check `128143935832`; lab.js SHA-256 `91f169e126d73f4abf74d705bd22c1a8b065b5639192efbc2028880b8bd351b6`. Moods, recipe, quote helper and original cover bytes also match production.

## Soul Mood/input feedback, PR #879
- Shared Image Mood colors fix Soul's dark-on-dark label. An empty Soul form requires a Base or prompt; a Soul ID stays optional. Useful disabled-button tooltip, no extra deck row, no provider/billing changes.
- Current CI: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42293137011 (115 Node cases and owner/customer 390/1440px browser flows, including palette equality and text-only/no-ID, pass).
- A separate error after supplying input is unverified; obtain its exact error response. No paid generation performed. Frontend is `LIVE_VERIFIED` for #879 merge `a8b44c3f52b382e6032a2f8bd8de16d6036d5054`; Cloudflare check `128154416758` successful, exact CSS/JS verified. Worker unchanged.
