# Full Editorial Studio implementation checkpoint
Updated: 2026-10-28 (Berlin)
Branch: feat/pvlab-full-editorial-studio-20261028

## Owner-approved design and scope
- Build dedicated Full Editorial Studio page following the provided six-panel dark editorial reference. Preserve the large hero with the same wet-haired fashion model, chrome garments, dark industrial tone and minimalist typography, and follow model -> styling -> mood/location -> generation -> progress -> results.
- Original approved composite asset is the exact user-attached `5c7c5043-0dbb-4297-b339-e95ff7201c7f.png`, publicly hosted unchanged under confirmed upload `d6c51742-8079-4412-a063-25ed134cec95.png`. Hero uses CSS cropping of the original screenshot. This is not an original clean fashion image layer: the exact photograph does not exist separately in the conversation.
- No new generated images, third-party stock imagery, or misleading mock result images. Existing first-party imagery is used for non-billable mood selection thumbnails. Real user-uploaded previews and actual completed job assets replace them in the workflow.
- Keep original Beauty/Outfit/Fashion/Retouch function and existing selected artwork. Full Editorial card now leads to `/full-editorial.html`; legacy `studio.html?tool=fashion&workflow=editorial` redirects there.

## Files
- New `lab/full-editorial.html`, `lab/full-editorial.css`, `lab/full-editorial.js`.
- Shared navigation: `lab/studios-menu.js` and cache-key refresh in `lab/index.html`, `lab/studio.html`, `lab/beauty.html`, `lab/moods.html`.
- Tests: `tests/lab-full-editorial.test.mjs`, `tests/lab-full-editorial-browser.mjs`, existing landing tile expectation.
- CI: `.github/workflows/pvlab-full-editorial.yml`.

## Actual workflow
- Upload one to four identity photos, up to three garment references and two optional environment references; cap 10 total images and each input to 20 MB JPG/PNG/WebP.
- Saved Elements from the authenticated account are available directly in the three steps: `GET /api/packs`, filtered by existing `PVSCENE1|characters/outfits/locations|` names, using at most two selected views per pack and source IDs already owned by the account. Read-only thumbnails come from `/api/assets/:id/thumbnail`. Nothing in Elements is overwritten or copied.
- Artistic direction derived from selected tile plus custom text, with labeled reference roles (`identity`, `outfit`, `room`). Strength sliders are **creative prompt emphasis**, never claimed to be native numeric provider controls or guaranteed consistency.
- Uses existing Clerk and session request helpers. Real Worker `/api/uploads` for private images, `/api/quotes` with at most four bound prices, `/api/jobs` with explicit `confirm:true` and server quote IDs; each result is a real completed job read from `/api/assets/:id`.
- 4/8/12-image selection is implemented as separate groups of up to four; new batches require a new server quote and distinct user confirmation, not an assumed price or hidden purchase.
- No automatic retry on ambiguous paid submission. Completed results are downloadable as a ZIP of original image blobs.
- User may open existing Retouch and Video Studios without claiming the uploaded result is automatically transferred.

## Verification and release
- New mock-browser test exercises 1440/390 widths from actual upload through quoted credit review, explicit confirmation and four completed image assets; it must not contact real billable endpoints.
- Run targeted CI plus existing approved Image UI checks, review PR diff, then merge only after relevant checks. Confirm Cloudflare `pvlab-studio` deployment check for exact merged SHA separately. Source commit alone is not live verification.
