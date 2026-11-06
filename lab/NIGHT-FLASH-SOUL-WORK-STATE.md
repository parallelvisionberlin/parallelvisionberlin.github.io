# Night Flash with Higgsfield Soul 2

## Current state, 2026-11-06

- PR #874 merged: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/874
- Tested application source: `c1119d687d487e8a324189cdf0037194f1ae1d86`.
- Merge/source: `454c5ab51f9a2417e0977e791705450699a9e3f4`; baseline `24d2b96d4c1b171edfd431f840aa73bcc1f366eb` includes merged #870.
- Night Flash remains the existing Mood/card; users explicitly choose PV Soul. No automatic model switch or new native style UUID.
- One Base or an authored text subject; optional completed, owned Soul 2 ID. Character photographs and Qwen LoRAs are not Soul IDs.
- Recipe keeps direct frontal flash, deep readable blacks, organic 35mm grain, natural skin/fabric and restrained practical lights; no invented neon.
- Base guidance preserves identity, proportions, outfit/coverage, pose, framing and geometry unless the authored direction or selected Soul ID changes them. This is guidance, not a likeness/pixel guarantee.
- Intensity, original direction, Base and Soul identity stay bound to the quote and persist through History/Reuse. Existing credit ceiling, budget, confirmation and idempotency remain.
- Customer gate: `LAB_CUSTOMER_SOUL_NIGHT_FLASH_ENABLED` must equal `true`. Absent/false stays blocked even when general Higgsfield access is enabled.
- Frontend blocks automatic Night Flash price requests while closed. Worker blocks quote and unused-quote submission before vendor calls/reservation. Existing-job replay and ordinary Soul remain available.

## Verified tests and scope

- 112 focused Node 22.16.0 CI tests pass: Soul API/pricing, Mood, approved Image contract, Precision Edit and replacement.
- Full Studio/controller fixtures pass for owner/customer at 1440x900 and 390x844.
- Verified model/Mood selection, intensity, text/Base, completed/pending identity, strength, seven-credit mock quote, cancel, explicit confirmation and Reuse.
- Customer flag is closed by default; the enabled customer path is simulated only inside the isolated fixture.
- #870 selection/brush/composition test and full replacement flow pass at 390px and 1440px. Its application files remain unchanged from main.
- CI: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42286485840
- Four screenshots: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/42286485840/artifacts/13538485226
- 139 local Worker/customer/pricing/prompt-safety/submission tests pass on Node 24.22.1.
- Broad local suite: 1096/1102 pass. All six failures reproduce on main in the four affected files (20 cases, 14 pass/6 fail): Meta cookie IDs; Dream Blur upload scheduling; Moods header; oversized upload; Soft Pastel focal point; photobooth stylesheet. Assertions unchanged.
- Separate approved-image-ui workflow was queued at merge; the identical required contract passed inside the successful focused CI above. Normal merge API was used without bypass options.
- Hosted Chrome 156 supplied the compatible browser. The old apt browser installation exhausted its timeout; local Chromium is blocked by socket permissions.
- No real provider generation, training, payment or signed-in production journey was performed. Fixture photographs are existing previews, not new generated results.

## Publication

- Deployed main baseline Worker was first rebuilt and verified byte-identical: SHA-256 `1b1497dc3c269e04251f26daceee0e5adda94ed16484c417f3e0f8758bea805d`.
- Gated Worker published via Cloudflare content-only endpoint at 2026-11-06T20:12:14Z; deployment `0397edf10b1542beb37b61679cd83ca3`.
- Downloaded Worker exactly matches tested bundle SHA-256 `43a390e06f862bc9ecfae56a4dd9bc3114a31cf5d005a43428f7f00a82fede97`.
- All live bindings and compatibility settings stayed unchanged. Customer Night Flash flag is absent, therefore false; source configuration also declares false.
- Health OK; `imageReplacement: 20261106-replacement1` retained. No credential/configuration or migration changes.
- Frontend production: scoped verifier returned `LIVE_VERIFIED` for merge `454c5ab51f9a2417e0977e791705450699a9e3f4`; exact Cloudflare Pages check `128131672180` succeeded.
- Custom-domain `lab.js` matches source SHA-256 `299c5d0973c35f7fbbf58fd2cf297efbd9f0d1e27fd6348d81185331797cbe98`. Asset evidence does not establish a signed-in production journey.

## Provider contract and activation conditions

- Official image API: https://open.higgsfield.ai/models/higgsfield-ai/soul/v2/image-to-image/api-reference
- Official text API: https://open.higgsfield.ai/models/higgsfield-ai/soul/v2/standard/api-reference
- Rechecked routes, Base URL, prompt, 720p/1080p, supported ratios, batch size 1, seed bounds and optional same-account completed Soul ID/strength. No invented `style_id`.
- Provider image-to-image prompt processing is always enabled. Its schema does not establish generated appearance or identity retention.
- Before customer activation: record commercial/resale permission and a real account-specific live quote within existing ceilings; verify a completed same-account Soul ID when needed and provider-accessible Base URL.
- An explicitly authorized real-image test must establish photographic quality, identity and Base handling before changing the customer flag. No paid generation/training is authorized by this checkpoint.
- Next: leave the customer gate closed pending the provider/account/quality conditions above; obtain explicit authorization before any paid real-image test.
