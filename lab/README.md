# Parallel Vision Lab

Initial workspace on branch `pv-lab-initial-20260926`. Not deployed or linked in navigation.

## Implemented in this prototype

- Responsive image-to-video preparation screen.
- JPG, PNG and WebP upload/drop, image preview and file validation.
- Prompt, duration and resolution settings.
- Explicit local draft saving in IndexedDB, including the source image.
- Reuse restores the image and every saved setting without overwriting the original.
- Delete draft action. No sample results or simulated generation.

## Not connected yet

- No generation provider or API key. Generate stays disabled.
- No server-side owner authentication or cloud history.
- Local drafts are not generated videos and are not synced across devices.
- Settings shown are preparation options, not confirmed provider capabilities or prices.

## Verification status

- JavaScript syntax checked with Node (`node --check lab/lab.js`).
- Browser end-to-end tests are not verified: navigation was blocked by the execution environment's browser policy.
- No real generation was requested or charged.

## Integration requirements

Reuse existing GitHub Pages hosting. A separate Cloudflare Worker can protect provider credentials and perform owner authorization using the existing account system. Do not change the working Nina service. Use separate private storage for Lab inputs and results, not the existing public visuals bucket. Reuse must restore original inputs, not an expiring provider URL.

Authentication must be enforced on the server for uploads, generation, media and history. An unlisted path, noindex tag or hidden frontend is not access control. Never commit API keys, passwords, private prompts or source media. Private provider uploads should use short-lived, narrowly scoped URLs only where required.

Before enabling a provider, verify its model identity, supported settings, pricing, content terms and failure-billing behavior. A model name does not establish an unmoderated API. This prototype neither calls a provider nor disables any provider protections.

Cloud generation will need explicit cost confirmation, a spending limit, idempotent submission and durable job status before activation. No paid services, model credits or Cloudflare resources have been purchased or provisioned by this prototype.
