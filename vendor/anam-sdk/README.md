# Nina's Anam SDK distribution

This is the exact published `@anam-ai/js-sdk@4.27.0` distribution with one local correction: both microphone acquisition paths stop a newly returned stream when the connection that requested it has already closed or been replaced.

The original SDK assigns a delayed `getUserMedia` result after shutdown. Its audio setup then returns because the peer connection no longer exists, leaving capture running without a stream-start event. There is no public cancellation or late-stream accessor on `AnamClient` for the application to use. This patch operates inside the SDK at acquisition completion; application code does not access SDK internals or defer shutdown.

No avatar, voice, model, prompts, telemetry, ICE recovery, message handling, input constraints, or public exports are changed. Every upstream export remains available. The checked-in ESM bundle includes its browser dependencies and uses no runtime CDN imports.

## Rebuild

From this directory:

```sh
npm ci --ignore-scripts
npm run build
```

Dependencies are pinned in `package-lock.json`. `capture-cancellation.mjs` refuses an unexpected source hash or capture-site count. `manifest.json` records the resulting bundle hash and public exports. Output is readable for inspection. An optional `node build.mjs --upstream-control` creates an ignored unpatched control bundle for the regression harness.

To compare the actual published SDK with the patched bundle:

```sh
node build.mjs --upstream-control
node --test ../../anam-token-worker/test/sdk-capture-cancellation.test.js
```

The tests use SDK internals only inside an isolated test sandbox to complete pending browser permission requests after real SDK shutdown. There is no private SDK field access in application code.

## Licensing

The upstream package declares the MIT license and credits Anam AI; it does not ship a separate SDK license file. `NOTICE.txt` includes MIT permission text with that attribution, plus the exact license notices of bundled `buffer`, `base64-js`, and `ieee754` dependencies.
