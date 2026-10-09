# PV Lab: Fashion Studio commercial beta
**Planning only. Prepared 2026-10-09. No deployment, provider submissions, payment setup, or production data changes.**

## Objective and constraints
- Seek paid pilot work next week while preparing a self-service fashion product.
- Cash preservation: no new domain, subscriptions, provider generation, paid advertisements, production migration or billed test in this plan.
- Do not promise customer launch before multi-tenant authorization, billing and failure handling pass testing.
- Preserve the current editorial hero, image/video/upscaler studio, founder's media and the Nina database.
- Product hypothesis: focused fashion transformations, not a broad catalogue of AI models.

## Ground truth verified in GitHub
- `lab/index.html` is the Fashion. Reimagined. landing page; three studio entrances point to image, video and upscale.
- `lab/studio.html`, `lab/lab.js` and `lab-worker/worker.mjs` provide the existing owner experience; `lab-worker/wrangler.toml` binds `LAB_DB` (D1), `LAB_MEDIA` (private R2), and `OWNER_DB` (read-only Nina owner lookup).
- At worker.mjs authenticate(), verified Clerk JWTs are permitted only if `OWNER_DB` contains an owner. This MUST NOT be removed as an expedient public-access patch.
- Existing D1 `assets`, `quotes`, `jobs`, `packs` and `spend` records are keyed by `owner_id`. R2 source keys already use owner identifiers. These are useful design patterns, not proof of secure public tenancy.
- Provider credential is encrypted in owner settings. Owner's secret and provider key must not be shared with customers.
- Image reference-role prompt compilation and Base/Clothing/Identity etc. roles exist. Exact outfit transfer, clothing-logo preservation and cross-model fidelity remain unverified.
- Current code includes active-job capacity limits and quote-bound paid generation. This cannot substitute for a customer credit wallet.
- Source code review is NOT verification of deployed code, provider performance, production schema drift, card settlement or browser compatibility.
- Older README statements can disagree with current code. Treat current code and integration tests as authoritative and resolve discrepancies before release.

## Delivery order
### 0. Paid creative service, without public software access
- Make 3 evidence-based demos using rights-cleared images: (1) garment change, (2) editorial reinterpretation, (3) still-to-motion. Label AI-edited content appropriately.
- Offer **Editorial Study** at a provisional €190 (four selected images, one coherent creative direction, one bounded revision) and **Micro Campaign** at a provisional €490 (ten curated stills and two short motion clips, one revision). These are hypotheses, NOT proven willingness to pay.
- Before accepting a paid project, agree in writing on scope, revision ceiling, suitability of source material, failed-generations policy, delivery date and licensing. Estimate provider spend at live quote; require authorization for extra deliverables.
- Use client invoice / bank transfer or Stripe Payment Links once an appropriate Stripe account and VAT treatment are verified. Do not create live products/payment links yet.
- Send at least 20 personalized offers to warm contacts and relevant fashion creatives. Track responses, deposits, attempts per accepted output and repeat intent. Avoid any automatic outreach.
- No speculative paid generation greater than €10 in total until first paid invoice. Keep that €10 as a proposed ceiling, not a spend authorization.

### 1. Customer authentication and isolation
- Do not make the private owner Worker publicly accessible. Prefer a **separate customer-facing Worker** and namespace/DB/bucket bindings or meticulously isolated routes and access policy after threat-model review. Reusing the same Cloudflare account is fine. Separation reduces the risk of impacting owner-only operations.
- Add `customers` keyed by verified Clerk subject, mapping to an internal immutable user ID. Do not use client-submitted IDs for ownership.
- For every customer endpoint authorize identity AND ownership of the requested record, including GET/list/download, uploads, versions, projects, folders, generation, jobs, notes, delete, and signed URL creation.
- Never allow customers to read owner secret settings or configure the shared provider key. Maintain server-only admin credentials and a role boundary.
- Preserve existing owner archive and Nina read-only integration. Never migrate or edit Nina D1 tables for PV Lab customer accounts.
- Cross-tenant tests: customer A cannot access, list, delete, download, reuse or signed-link another customer B's assets, jobs, quote or projects; no account enumeration; expired signed links and incorrect JWT `azp`/issuer forbidden.
- Define retention, deletion, backup/export, privacy and rights/consent policies before accepting customer personal photographs.

### 2. Personal Fashion Memory Bank
Use Cloudflare D1 for metadata and private Cloudflare R2 for originals/results. A *memory bank* is persistent files and structured metadata; generative models do not automatically have memory.
Proposed D1 tables (names are proposals):
- `customers(id, clerk_subject UNIQUE, status, created_at, ...)`
- `customer_assets(id, customer_id, r2_key UNIQUE, bytes, mime, checksum, type, created_at, ...)`
- `collections(id, customer_id, name, category, created_at, ...)`, e.g. Wardrobe, Models, References, Creations
- `collection_items(collection_id, customer_id, asset_id, position,...)`
- `projects(id, customer_id, title, status, created_at, ...)`
- `project_assets(project_id, asset_id, customer_id, role, ...)`
- `generation_jobs(id, customer_id, quote_id, state, provider, ...)`
- `customer_quotas(customer_id, storage_bytes_limit, concurrent_images, concurrent_videos, ...)`
Prefer relational ownership constraints (composite foreign keys where suitable), not merely front-end filters. R2 object key pattern `customers/{opaqueCustomerId}/assets/{uuid}` is an organization convention, not authorization. All reads require server-side checks.
- Sample beta quotas to test: 1 GB storage, 2 image jobs at once, 0 or 1 video job depending on tier. These are illustrative and must be validated with cloud costs.
- Do not create unlimited storage or silent permanent free media retention. Model lifecycle, deletion policy and user download/export.

### 3. Fashion-first product workflows
Preserve current Image/Video/Upscaler tools; add guided actions, not duplicate render engines.
- **Replace Outfit**: source person photo plus garment reference. Input validation, role compilation, preserve identity/pose/setting, show honest accuracy limitations. Route selection after controlled tests; general editing is not pixel-exact virtual try-on.
- **Reinterpret Outfit**: one base image and a bounded named aesthetic/material direction (e.g. sculptural, reconstructed, liquid metal, tailoring). Editable prompt and preserve/cut controls must be described as guidance, not guaranteed geometry.
- **Reimagine Scene**: lock intended subject/garment only as feasible and use optional scene reference.
- **Bring Into Motion**: existing approved image passed to current Video model, with independent cost review.
- Every run records input identities/roles, model, settings, quote, cost authorization, source/output, status, and user ownership. Limit outputs per click.
- Build with model-route adapters so the fashion user sees an intention rather than provider API names. Store original references; don't overwrite source assets.
- Beta acceptance: 10 rights-cleared paired test cases per workflow, human evaluation on silhouette, face, pose, garment details/logos, lighting, realism and failures. Record cost per *acceptable* result, not just cost per attempt.

### 4. Prepaid billing, no uncontrolled generation
Use hosted payment checkout. Stripe Payment Links are suitable for selling fixed-price done-for-you services fast. For self-service wallet, a verified Checkout/webhook-based integration is needed.
- Define packages only after confirmed price/usage. Earlier €19/€49/€99 figures are proposals, NOT published packages.
- Webhook verifies Stripe signature using exact raw request body, deduplicates event IDs and payment/session IDs, and credits wallet exactly once in a database transaction only after confirmed payment. Browser success redirect is never authoritative.
- Ledger model: `credit_ledger(id, customer_id, order_id UNIQUE?, job_id UNIQUE?, delta, type, created_at)`; `wallets(customer_id PRIMARY KEY, balance, ...)`; `payment_events(id UNIQUE, status, ...)`; explicit refunds and adjustments. Use integer smallest units; never floats for balances.
- Price each generation with a server-side provider bound quote and disclosed customer debit. Apply currency conversion / margin rules server-side, cap per-job cost, reserve credits atomically before paid dispatch, settle exactly once, and handle definite failure vs uncertain submission without duplicate charge or refund errors.
- Enforce spending controls and provider budget limits at server, customer and global level; no auto-retry on ambiguous paid submissions. Support partial refunds/chargebacks, expiry and payout delays.
- German VAT/tax categorization for online AI services and creative services requires verification before live checkout. Define gross/net prices and invoices correctly.
- Do not expose a zero-price route to the paid model. All job routes need an entitlement check and atomic reservation.

### 5. Testing and deploy gates
1. Copy or isolate the relevant modules on a non-production branch. No changes to main yet.
2. Build mock/test Worker and D1 migrations with separate named resources, never run production migrations during preparation.
3. Unit tests for tenant scoping, credit arithmetic/rollbacks, webhook duplicate/reorder, max storage, concurrency and idempotency.
4. Browser tests with two synthetic customer accounts and owner account. Verify desktop/mobile, no cross-user leakage and clean logout.
5. Mock all expensive providers. Do not start real generations in automated suites.
6. Test deploy in a staging hostname/Cloudflare environment, confirm correct auth origins, response headers, images, signed URLs, webhook endpoint and error telemetry (without sensitive logging).
7. On approval, deploy backend before frontend, with preflight backups and a documented rollback. Separate launch feature flags default OFF.
8. Only enable payment collection after refunds, pricing, privacy/terms, tax and customer support policies are ready.

## Unit economics and decisions
- Never sell unlimited generation. Storage is usually cheaper than video generation; verify your actual Cloudflare plan and R2 operations.
- Track customer price, provider quoted max, provider settled charge, failed/cancelled attempts, payment processing fees, VAT where required, support/review time, and net gross margin. Monitor cash actually received, not just booked revenue.
- For urgent rent cash, prioritize upfront-paid client service. A paid SaaS launch this week is not a credible income guarantee.
- Go/no-go for self-service: at least 2 paid editorial pilots, examples with stable quality and manageable retries, model pricing confirmed, and security/billing tests passing.

## Immediate next implementation PR candidates (still unapproved)
A. A separate customer Worker with mock JWT verification and tenant-only asset CRUD, backed by a separate staging D1/R2. No shared provider key, no generation.
B. Fashion guided controls on a separate preview route, powered by existing role compiler, disabled paid submit.
C. Stripe integration in TEST MODE, with webhook-driven wallet and automated duplicate-event tests.
D. Admin cost report and per-model burn dashboard.
Do not start A–D on production without explicitly approving scope. Never alter main layout or PV Lab hero unless asked.

## Sources to verify during implementation
- Stripe Payment Links: https://docs.stripe.com/payment-links
- Stripe payment link setup: https://docs.stripe.com/payment-links/create
- EU VAT: https://docs.stripe.com/tax/supported-countries/european-union
- AI services tax classification: https://docs.stripe.com/tax/ai
- Internal architecture: `lab-worker/worker.mjs`, `lab-worker/schema.sql`, `lab-worker/wrangler.toml`, `lab/lab.js`, `lab/studio.html`, `AGENTS.md`
