## Extend with character identity references, 2026-10-31
- User requested saved Alma character in Extend, real image delivery with the source clip, and retention through History/Reuse.
- Base inspected: 64ed58529ad849cb692d9a8650aa1aa355e2601d. Publication status below must be verified independently.
- Root causes: Extend hid the existing image/library controls, Scene Library rejected Extend, ensureInputs omitted all images, and the Worker rejected image IDs and cleared their roles. Reuse restored images only in Reference mode.
- Extend now uses the existing optional image uploads and Saved References, retaining one required source video. Owned image IDs, roles and grouped character metadata reach the provider as signed image_urls plus the compiled reference instructions. The priced payload is submitted unchanged.
- Shared preparation validates both generation and Save draft. History retains originals and character metadata; Reuse restores the original clip and grouped character. Current-scene inspector also shows the attached images.
- No model, pricing, account, spending-limit or confirmation changes. No paid generation performed. Reference-mode generation already forwards multiple images; the specific failed result cannot prove which references the provider received. Reference guidance does not guarantee identity adherence.
- Focused server tests cover signed image delivery, private access, invalid references, immutable quote submission, video-only compatibility, Save draft and generated History. Browser regression covers actual saved Alma attachment, quoted IDs/roles, Save draft, History/Reuse and no horizontal overflow at 390px and 1440px.
- Relevant files: lab-worker/higgsfield-video.mjs, worker.mjs; lab/lab.js, scene-library.js, video-scene-states.js, studio.html and three existing Video CSS layers; tests/lab-seedance.test.mjs, lab-extend-character-ui.mjs. Browser test added to the existing Video integration workflow.
- Local checks: 33 focused checks passed; saved-character/Extend browser regression passed at both widths. CI exposed an existing lab.js query-order contract from the earlier Video Upscale cache marker; v now stays first and all cache markers are retained. Real-account generated identity fidelity remains unverified; fixtures use intercepted APIs only.
- CI also exposed an outdated existing Element recovery assertion expecting analysis during attachment. The test now enforces the current profile-before-attachment requirement and permits only Reference/Extend for video; retry/in-flight cleanup assertions remain intact.
- Publication: PR #728, implementation d8f1006801ec57e16278ab236fedc9ffdc75d1bd plus validation fixes, CI/deployment verification in progress.

## Missing input and duplicate draft prompt, 2026-10-30
- Screenshot has Reference set, typed prompt, and no reference attached. Existing hasInput correctly prevents generation; Text mode accepts prompt-only generation.
- Replaces the unexplained disabled action with Add a reference / Add a start frame / Add a video for signed-in eligible accounts with a prompt but missing media. It opens the existing picker, never a quote/job. Existing account/balance/busy guards remain; attached media restores Generate.
- Draft prompt is hidden/cleared in the create inspector. Saved/selected-video prompt renderer is separate and unchanged.
- Relevant files: video-input-action.js, lab.js, video-scene-states.js, video-relaxed-studio.css, studio.html. Targeted unit and browser regression covers mode-specific actions, account guards, native picker, no paid submission, draft prompt isolation and Generate recovery.
- 11 local focused checks PASS. Publication pending.

## Independent desktop Video scrolling, 2026-10-30
- User approved independent scrolling for the whole prompt deck, textarea, center gallery and Scene details. Base main: 4852dedb14b30c668f8661205eff291747553a96.
- Cause: the existing document wheel handler deliberately handed side-panel boundary input to History.
- video-editorial-deck.js now excludes the entire controls panel, inspector and textareas from that fallback. Center/header wheel routing remains. Desktop-only CSS contains native overscroll in both panels and the prompt; mobile keeps natural page scrolling.
- studio.html refreshes only these two asset URLs. No layout, imagery, model, quote, credit, provider or account changes.
- Updated the existing layout browser regression for upward/downward panel limits, fixed dock, inspector, native prompt scrolling and prompt limits. Full layout suite passed, including desktop, short windows, mobile and Elements.
- Approved Image contract and focused Video tests: 11/11 pass. Existing Image prompt-paste browser suite passes desktop/mobile. First-image parity suite passes on unchanged main and final patch after an initial timing-sensitive 10px label mismatch; no Image source or test changed.
- Browser fixtures use synthetic accounts and intercepted APIs. No paid generations or real signed-in production action performed.
- Published through PR #665 as 09cc9d9a80d95653a7a94fc296d7f76c0e476473. Cloudflare pvlab-studio deployment ae3eee25-f693-4a5d-9881-514f39ec72ef / check 123793079350 succeeded.
- Release verifier returned LIVE_VERIFIED for both assets. CSS v=20261030-scroll-isolation1 SHA-256 f877cdaed95ec74a9e9c8e5e685ce64b3ce0bf063cbb9adf5860675d72459603; JS (scrollIsolation=20261030-1) SHA-256 c555c0b4f1f602351da5ac86517a61ed61ccc9de2a86279aff454bf8099b62fb.
- Production public Video DOM loads both exact asset versions and computes overscroll-behavior-y:contain for controls-body, prompt, inspector and its scene body. No real signed-in History gesture or paid generation was performed.
- CI approved Image, prompt-paste and first-image checks passed. Video CI logs explicitly pass the new real-wheel boundary checks, full layout/mobile/Elements checks, History, customer model/pricing and tool routing. The broader Video job was canceled at its time limit after those PASS messages; no claim of overall CI success. Other failures concern homepage card count, asset decoding, Fashion look prompt and public-reference visibility. No gate was removed or weakened.
- Complete. Normal account-specific History scrolling remains for the owner to observe in their existing session after refresh.

## Video Generate and credit preview, 2026-10-29
- Base main 6311d4f; isolated branch polish/video-generate-credit.
- Requested: a modern Video Generate button with the credit price visible beside its label.
- Rounded flat pearl action, restrained diamond credit icon, one-line server credit amount; removes the separate arrow. Existing Image deck preserved.
- Video uses the existing debounced quote controller and authenticated /api/quotes. No browser rate tables or fabricated prices. Estimates carry ~. Invalid/mismatched/expired quotes cannot supply the displayed amount.
- Generate awaits/reuses the same preview, prevents competing double-clicks, and retains the final confirmation. No automatic paid submission. Source-upload completions also check Studio/session ownership.
- Quote key includes settings, session, image URLs/order, and video/audio reference identity; tool switch/sign-out discards stale prices. Video metadata is cleared before Image composer pricing.
- 18 focused unit/contract checks pass. Cloud-browser mock preview confirms 16px corners, server credit display, duration update 55 to 65, audio invalidation, and retained confirmation. These figures are synthetic test fixtures, not live prices.
- Dedicated CI browser test covers desktop/mobile, owner/customer, setting changes, double-click reuse, no job POST and Image isolation. Local Playwright browser installation unavailable; CI will run the browser suite.
- Publication pending. No real account generation, payment or checkout performed.

## Approved typography and prompt fit, 2026-10-29
- Base main 7703d35; isolated branch polish/video-typography-prompt-fit.
- Owner approved the generated refinement mockup: cohesive type, neutral secondary text, a larger prompt, and almost no empty gap above Generate.
- Scoped CSS in video-relaxed-studio.css: 13px control scale, 14px prompt (16px on mobile), restrained medium labels and neutral gray supporting copy.
- Desktop prompt frame grows into spare controls-body height. Its native textarea grows with it, retains resize and scroll, and long input/reference stacks can scroll above fixed Generate.
- Preview at 1363x936: prompt writing height about 201px, settings-to-Generate gap 8–10px across Text, Start frame and Reference set; original controls, photo, header and layout preserved. Small upload labels scale to retain narrow-side readability.
- Existing Video modes, reference inputs, audio state, character removal and all generation/account/pricing code unchanged.
- Focused mandatory Image contract and Video tests passed. Publication pending.

## Character removal and inside-prompt controls, 2026-10-29
- Base main f674201; branch fix/video-character-remove-prompt-toolbar.
- Verified cause: saved Element attaches inside busy action; grouped Remove was rendered disabled and update never re-enabled it. syncReferenceRemovalState now follows every update and preserves busy protection.
- Grouped Remove has an explicit accessible character name. Regression test runs actual render/removal handlers: loading disables removal, completion enables the existing button, removal releases all selected views of that character and keeps another character.
- Video presentation wraps the native textarea and existing utility row in one prompt surface; character and audio controls sit inside its lower edge. Original nodes return to their original positions when Video is inactive. Seed and original audio state preserved; no generation/credit/provider changes.
- Focused checks: 12 PASS including mandatory Image contract and new behavioral regression. Preview verifies buttons inside prompt bounds and audio checkbox updates.
- Pending publication and production verification. No real signed-in account actions or paid generation performed.

## Single audio chip and frame wells, 2026-10-29
- Continues 97986f9 on fix/video-prompt-resize-audio.
- User rejected nested Start/End upload boxes and full-width audio across modes.
- One speaker On/Off chip below prompt beside the identical Image character icon; Seed remains to the right. Hidden native checkbox is the sole underlying audio state. Original motion/audio-reference uploads are separate inputs, preserved.
- Start/End now use single dark dashed wells with circular image icons, small frame names and required/optional text. Native file inputs, thumbnails, removal, drop and capability gates preserved.
- 22 focused tests pass. Desktop preview confirms 50px audio chip, hidden native checkbox, single wells; resize previously drag-tested 104 to 204px.
- Verified toggle updates native #audio checkbox and remains a 50-51px chip across Start/Text/Reference modes. No paid generation performed.
- Source commit 4819ed0. Push blocked by automatic approval review: UI editing was authorized, but publication/private source egress to the existing GitHub origin was not considered authorized. No PR, merge or production deployment performed.
- User explicitly authorized push/publication on 2026-10-29. Terminal Git has no credentials, so publishing exact tested files through connected GitHub integration.

## Prompt resize and compact audio, 2026-10-29
- Based on main f2113b6, isolated branch fix/video-prompt-resize-audio.
- User clarified internal scrolling works; bottom-right native resize handle was blocked.
- Removed important fixed heights from Video prompt layers so native inline drag height can win. Retained initial heights, minima, vertical scrolling and original wheel routing.
- Audio icon/toggle now shares the utility row with Seed on its right; original checkbox, numeric input and capability gates retained.
- Changed studio.html and four Video stylesheets; cache markers updated. Existing mobile starting-height assertion updated to permit drag resizing.
- All 22 focused Image contract/Video checks passed, including original artwork byte checks.
- Preview verified native drag from 104px to 204px; audio/Seed on one row. Matching Image person SVG beside prompt delegates to existing Saved References character picker.
- Implemented and locally committed; not published. No generation, credits, provider or account behavior changed.

## Seed control inline layout, 2026-10-28
- Owner screenshot: Video Studio's open Seed puts the Optional seed text and numeric input below its disclosure, adding a scrollbar and shifting the left-side stack.
- Approved behavior: keep the native `<details>` and `#seed` value, but show a compact 10px `Optional` label and numeric `Random` field to the right of `Seed` within the same 26px row; opening should not grow the panel or move Generate.
- Scoped files: `lab/video-relaxed-studio.css`, `lab/studio.html` (video Seed markup and stylesheet cache marker only), `tests/lab-video-relaxed.test.mjs`. Soul Pro Seed and other non-Video inputs untouched; no model, generation, quote, credits, price, scene, navigation or frame changes.
- Branch: `fix/video-seed-inline-right-20261028`. Focused relaxed-Video, approved Image UI, and relevant browser checks before release. Cloudflare Pages `pvlab-studio` deployment and live layout are separate from source merges.

## Customer credit currency, 2026-10-24

- User approved credits as the creation currency; euro prices belong in pricing and billing.
- Baseline main: `a295b985`. Isolated branch: `fix/customer-credits-only-20261024`.
- Video review displays the server-quoted PV credit amount and a matching Generate button, with no euro equivalent or pack conversion.
- Customer Image model captions and Fashion model notes omit provider dollar rates; verified owner cost displays remain.
- Image/Upscale submission notifications use quoted credits for customers; History, opening-frame and existing quote displays already use credits.
- Billing, pricing, SKUs, quote binding/expiry, confirmation, wallet ledger, provider dispatch and backend prices are unchanged.
- Browser regressions cover customer review/cancellation at 1440/390/320, customer model captions, retained owner USD review and Fashion customer credit review.
- Retouch customer review and Magic Select tooltips omit provider dollars; a missing/invalid credit amount blocks review and submission instead of falling back to dollars. Owner estimates remain.
- Local: syntax, credit-label tests and approved Image contract pass. Broad Node 24 suite: 764/765; unchanged Mood preflight timing test failed as previously documented. Local Chromium download is blocked/truncated; browser checks run in existing CI.
- Publication and exact-head CI pending. No real purchase, credit mutation or provider generation initiated.

## Reference invitation spacing and larger Generate, 2026-10-24

- Owner authorizes the last mockup plus 90% title opacity, implementation and publication.
- Baseline current main: `2bd842e532d5c34cf4afcc30ea0dde96840d2eda`; isolated branch `polish/video-reference-air-20261024`. Older open Video PRs and unrelated work stay separate.
- Generate is 52px, retaining its width, bottom edge, style and existing 64px dock. It grows into the previous 8px top padding, so settings space and scroll geometry are unchanged.
- Reference-only heading: `Animate your references`; opacity .9. Remove the repeated description. Keep the plus and both existing actions.
- Reference tiers: 24px plus-to-title, 24px title-to-actions; 16px between buttons, 48px action height and 24px horizontal padding. Reset the old 4px title margin so measured gaps match.
- Synchronize only the Reference copy in the three existing writers: `lab.js`, `video-editorial-deck.js`, `video-scene-states.js`. No model/upload/quote/authentication/credit/pricing or submission handlers change.
- Photo, stage dimensions/crop, sidebar layout, prompt size, History and original responsive stage policy remain. Approved artwork: `visuals/video-subway-relaxed-approved.png`, SHA-256 `e5d8b8f5a46acaa9227dcaea9c37077174e60a77488b342bf7cbb1a5fbef17e4`.
- Product paths: the three JS files above, `video-relaxed-studio.css`, and version URLs in `studio.html`; new cache parameter `invitation=20261024v1` / `videoInvitation=20261024v1`.
- Update only the approved Reference copy/styles in the independent old public visual fixture. All other baseline source, Start canvas, pixel regions, tolerances and privacy assertions remain. Existing ergonomic/layout copy expectations and the 52px button contract follow the explicit owner approval.
- Existing Seedance matrix asserts 52px Generate, short Reference copy, hidden description, .9 opacity, exact tier/button gaps and previous fitted panels. Native plus/drop, optional End frame, every model mode and no automatic paid submission assertions remain.
- Local Node22: 759/759 PASS; full Seedance matrix 27/27 PASS; customer Video 18/18 PASS; Studio layout PASS, including fixed dock, short desktop, wheel navigation and mobile. Final screenshot reviewed at 1440x900.
- Local public comparison passed affected desktop Video regions, then hit the previously observed disabled Retouch fixture timeout with the alternate local Chromium. No Retouch assertion or timeout changed; pinned exact-head CI is the release gate.
- No real login, private media, paid generation, purchase or credit transaction performed. All local media/accounts/APIs are synthetic.
- Complete: [PR #527](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/527); tested head `1a7b8e1b44be9af9ae7b36f6713823f3759a28b4`, normal merge `0a26ef4aaab57a7271f3bc303f7f69f4d146c3ae`. Merge tree matches the fixed candidate exactly.
- Final head: all 20 workflows PASS, including Video [40115614689](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/40115614689) and public visual [40115614673](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/40115614673). The independent Mood Dreamcore image-load timeout passed after only that job was retried; the image queue job spent nearly its whole seven-minute budget installing Chromium, was cancelled, then passed on its individual retry. No code/assertion/timeout was changed for either unrelated job.
- Cloudflare `pvlab-studio` exact-merge check `120938928224` SUCCESS; deployment `30ef2893-4c78-4445-b992-53e805a871f2`.
- All four changed assets returned `LIVE_VERIFIED` from the existing release verifier on the custom domain. SHA-256: `lab.js` `8d7118d523c58e69581bcc7d417c8a5bb7cd9e63eed3cd3683402924c54c2f07`; `video-editorial-deck.js` `5018639dfd3db6a93babb02748341ae94314b65a579c5ab9ea5f22f4eece9e21`; `video-scene-states.js` `f0bcb6c40c5e801a4c9f10774ce31fb7d3a6f5af3fbc64bc5073be9fef09b0dd`; `video-relaxed-studio.css` `70f7584f519fde0118aee92d2b9c80e28c410d06b656f33f4a1c0205f6451be8`.
- Actual signed-out production browser at `https://pvlab.studio/studio?tool=video`: `Animate your references`, opacity0.9, no description, 24px plus/title gap, 24px title/actions gap, 16px between actions, Generate52px, prompt104px and no horizontal overflow. Screenshot visually reviewed. Approved photograph remains.
- No pending implementation/publication step for this approved refinement. Signed-in role behavior and file/generation guarantees are covered by synthetic browser/CI tests; no real customer upload or paid generation claimed.

## Video canvas plus and file drop, 2026-10-24

- Owner request: keep the approved plus visible in the empty media modes and allow image drops on both the Start frame tile and the photographic canvas/plus.
- Baseline main: `1bee82ec`; older Video branches and unrelated open work remain separate.
- The original 66px plus is now a keyboard-accessible button. It opens the existing mode-specific native file input: Start image, Reference images or Extend video. Text mode remains prompt-only.
- Start/Reference/Extend empty states share the same approved plus; attached media and explicit History selections retain precedence.
- Canvas file drops use those same native input handlers and existing image/video validation. They prepare local media only, with no upload, quote, job or credit charge.
- Preserve owner/session/busy/input-disabled guards, optional End frame, model-specific modes, authentication, prices and confirmed Video submission.
- The shared canvas's existing Upscaler drop listener is now enabled only for Upscale, preventing its unrelated no-op action from locking out the Video drop. Other upload zones retain their existing handlers.
- Add a restrained dashed drag hint and visible keyboard focus. Canvas drop explicitly clears the existing document-level Reference drag hint too; browser assertion covers cleanup. Preserve approved artwork, dimensions, settings spacing, mobile layout and History.
- Files: `lab/lab.js`, `lab/video-scene-states.js`, `lab/video-relaxed-studio.css`, `lab/studio.html`, `tests/lab-seedance-ui.mjs`, `tests/lab-public-studio-ui.mjs`.
- Cache parameter on the three changed assets: `videoCanvasDrop=20261024v1` / `canvasDrop=20261024v1`; existing version parameters retained.
- Existing browser suite adds mode-specific native-picker, plus/canvas drop, Start tile replacement, optional End frame, no automatic API calls and post-sign-out rejection assertions. Original assertions remain.
- Local Node 22: 742/742 Lab tests PASS. Full Seedance browser: 27/27 PASS, customer Video: 18/18 PASS, affected Upscaler: 38/38 PASS. Original assertion/timeout/visual tolerances remain unchanged.
- Public visual checks identified native-button font inheritance, then the intentionally added Reference plus. Retain original Arial/spacing/shadow. The independent old Video fixture adds only plus visibility in Reference/Extend; original Start pixels and every other baseline byte, comparison, region and tolerance remain unchanged. Exact-head CI and production receipts belong below.
- No real customer login, private media, paid generation, purchase or credit transaction performed.
- Complete: [PR #516](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/516), final head `b17b89641eb9f0de4d5ba1f5a1be89075153a37f`, merged as `6ee7f939a707d47a1a9b312636148c1c6022839e`. Merge tree exactly matches the tested candidate.
- Final head: all 20 workflows PASS, including Video [40091583664](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/40091583664) and public visual [40091583667](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/40091583667). An unrelated Dreamcore image-load timeout in Mood Creator browser was inspected; this fixture does not load changed Studio code. Only that job was rerun, then passed; no Mood source, assertion or timeout changed.
- Cloudflare Pages `pvlab-studio`: exact-merge check `120866345351` SUCCESS, deployment `93968020-279c-4fee-a0c1-ddfc320556d2`.
- Production verifier returned `LIVE_VERIFIED` for all three changed assets on `https://pvlab.studio/studio`: `lab.js` SHA-256 `afff37c967cfdb301da0d67f77fe4ae70e241cee14dbf965bb5cbbcc6ed5e541`; `video-scene-states.js` `6fda73acfe987d6552f6db29cd1b88dd256ea0338676bfe6e2f78cb29c583821`; `video-relaxed-studio.css` `c6031f17a2ae812988313a50a9e325dcb23e6a019629060cde67933aa942e04f`.
- Actual signed-out production browser at `/studio?tool=video`: Reference, Start and Extend show the accessible 66x66 plus with the correct image/video label. Start prompt stays 104px; no horizontal overflow. Approved photograph remains. No real signed-in upload or paid generation claimed; local/mock browser tests cover drops and native picker routing.
- No pending implementation or publication step for this request. Source, final CI, production bytes and rendered plus are verified.

## Approved Video panel polish, 2026-10-24

- Owner approved the screenshot refinements: remove unnecessary Start/Reference settings scroll, preserve the plus/drop invitation, and expose slightly more History.
- Baseline: current main `e33fce34292d652b1bf4a5088afadb39786ccc52`.
- Existing Video branches #443/#446/#448/#452 and broader maintenance #482 remain separate. No model defaults or other changes are imported.
- Reproduced at 1440x900: Start settings overflow 39px; Reference settings overflow 13px. Text is already fitted.
- Only desktop Start/Reference spacing changes: body gap 10 to 5px, bottom padding 14 to 10px. Original top padding, 124px model banner, 104px prompt and 44px Generate remain.
- At 1920x912 and 1440x900 all three empty Create modes now have zero settings overflow. At 1440x768 real overflow remains scrollable; no overflow hiding or scrollbar masking.
- The original 66px plus invitation remains visible in Start. Upload/drop handlers and source-media state remain unchanged.
- History reaches its existing cards 13px earlier by reducing archive top/header gaps. Stage dimensions, photo crop/bytes and card dimensions are unchanged.
- Mobile CSS, Text/Extend settings spacing, original selector, model capabilities, authentication, credits, quotes/prices, APIs and provider behavior remain unchanged.
- Asset identity: `lab/visuals/video-subway-relaxed-approved.png`, SHA-256 `e5d8b8f5a46acaa9227dcaea9c37077174e60a77488b342bf7cbb1a5fbef17e4`.
- CSS cache parameter: `video-relaxed-studio.css?v=20261024-relaxed1&panelPolish=20261024v1`.
- Relevant product files: `lab/video-relaxed-studio.css` and its single stylesheet URL in `lab/studio.html`.
- Existing Seedance matrix adds 1920x912 and asserts fitted Start/Reference panels, unchanged banner/prompt heights and the visible plus. All original mode/upload/price/logout assertions remain.
- Image contract and Video contracts: 7/7 PASS. Final geometry probe PASS at 1920x912, 1440x900 and 1440x768, including native short-window overflow.
- Studio layout/scroll suite PASS. Full Seedance and customer/visual final-candidate checks are recorded in the associated polish PR; only completed results count.
- Local public visual suite passed the original desktop Video canvas/banner pixel checks, then timed out in the unrelated customer Retouch fixture; the installed local Chromium differs from pinned CI. Keep assertions and tolerances unchanged and require pinned CI before release.
- No real customer login, upload, paid generation, purchase or credit grant was performed. Browser media/accounts/APIs are synthetic.
- Complete: [PR #514](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/514) merged as `79eabb6aaa7d1d0c8ed4038c67df3ae00cbd0fe4`; validated head `664b80b4b433b72ad4aa1bf0a050a719c584096c`.
- All 19 exact-head PR workflows PASS, zero failures/pending, including full Video [40084483526](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/40084483526), public Studio pixel/privacy [40084483558](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/40084483558), account, pricing, first-image and Mood checks.
- Concurrent main #513 changed only `css/home.css` and `index.html`; normal merge preserves it, and the released Lab/test sources match the validated candidate exactly.
- Cloudflare Pages `pvlab-studio`: check `120845754881` SUCCESS for the exact merge SHA; deployment `9afa4baf-8635-4ded-bd13-4465e2d90438`.
- Release verifier returned `LIVE_VERIFIED` for the custom-domain CSS; SHA-256 `d617374a9aebfe1e86041674d8497e905b8de5e7eff46e827408064358efd38d`.
- Production browser `/studio?tool=video` at 1363x936: Start and Reference both have scrollHeight=clientHeight=714, prompt 104px, model banner 124px, Generate 44px; Start plus is 66px, no horizontal overflow. Loaded URL contains `panelPolish=20261024v1`; History padding-top is 12px.
- Complete: published and verified. No pending work for these approved spacing/plus refinements.

## PR #506 release validation, 2026-10-24

- Owner now authorizes validation, merge and the existing production publication procedure for #506.
- Scope: preserve the approved charcoal Video design, original model selector, Create/Extend and Text/Start frame/Reference set.
- Starting head: `da14b874956b12677df03f9e737e3cb561b43d1c`; integrated current main `3825d0435bb35ba0b9ed6e31a383905eecfec740` without conflicts.
- Product diff against that main remains only `lab/studio.html` (one stylesheet link), `lab/video-relaxed-studio.css`, and `lab/visuals/video-subway-relaxed-approved.png`.
- Only new test repair: `tests/lab-seedance-ui.mjs:80` expects `video-subway-relaxed-approved.png`; all source-media, History, mobile, permission and quote assertions remain.
- Artwork SHA-256 remains `e5d8b8f5a46acaa9227dcaea9c37077174e60a77488b342bf7cbb1a5fbef17e4`; provenance is in `docs/previews/video-relaxed-20261024/`.
- Current main independently fails mobile Mood entry at line 83, timeout 4000ms: run [40051438124](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/40051438124), job 120744781016.
- Current main independently fails Mood masthead viewport at 1920px, line 185: run [40051438077](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/40051438077), job 120744780974.
- These match #506 runs 40051270551 and 40051270535 exactly. Neither test file nor its product source is changed by #506; inherited failures are not repaired or relabelled passed here.
- Node 22.16.0: all 742 Lab tests PASS, including Image contract, model capabilities, Worker/authentication, credits, billing and bound-price safeguards.
- Local browser: Seedance 23/23, references 22/22, customer Video 18/18 at 1440/390/320px, guest/signed-in routing, full Studio layout including wheel propagation, short desktop and mobile PASS.
- Browser fixture uses the existing local Chromium runtime; GitHub CI uses its pinned Playwright/Chromium. Final exact-head CI remains the release check.
- Local Node 24 had one asynchronous Mood timing failure; configured CI Node 22.16.0 passes all 742. No assertion or timeout was changed.
- Separate local first-image pixel comparison failed before its quote section. Its Image sources are byte-identical to main; do not claim that suite passed. Credit/price protections are covered independently above.
- No real customer login, checkout, balance debit or paid provider generation was performed. Synthetic authentication and intercepted APIs are not live-account evidence.
- Published: #506 merged as `ab924304f9ea521be44f0163bcb4fc760ebe026c`; its tree exactly matches validated head `5e22e30aa2e8a27b3207d1be8e9106e913363690`.
- Final PR CI: 17 workflows PASS, including full Video integration [40077071656](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/40077071656), public visual/privacy [40077071639](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/actions/runs/40077071639), account and pricing. Only the two independently proven inherited Mood failures remain.
- Cloudflare production: check `120823984173` SUCCESS for the merge SHA; project `pvlab-studio`, deployment `615f64a9-ce34-414b-a09f-39993e8320b4`.
- Read-only release verifier returned `LIVE_VERIFIED` on `https://pvlab.studio/studio` for `video-relaxed-studio.css?v=20261024-relaxed1`; exact CSS SHA-256 `6c9ab1d5d747c92a477b74fa3b45adefb12b3d65695dbbb638e48fdb0408c2de`.
- Live approved PNG also matches SHA-256 `e5d8b8f5a46acaa9227dcaea9c37077174e60a77488b342bf7cbb1a5fbef17e4`.
- Actual signed-out production browser at `/studio?tool=video`: approved artwork/style/model picker render; Extend selects and displays the original clip upload; Generate is 44px and no horizontal overflow. Live signed-in or paid generation is not claimed.
- Exact final head, final CI, merge SHA, Cloudflare deployment and custom-domain verification are recorded in [PR #506](https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/506).
- Complete: approved Video is verified live. Track the two inherited Mood failures separately; any real-account or paid provider acceptance remains a separate explicit check.

## CI audit: PR #496 — 2026-10-24

- Owner instruction: approved Video design is frozen; inspect only #496, compare four failed checks with main, fix only regressions introduced by #496. No new PR, merge or deployment.
- Candidate audited: `5794e7e31a99d99a65a967a749ffe593a55f54c3`; main examined separately at `6084321a4ab90efe3fde75fdc42e70ade076dbaf`, with no tracked changes.
- Three failures reproduce on main: Mood masthead overflow at 1920px; public Fashion Sign in alignment 46px versus Image 31px; legacy Fashion mock startup timeout with `htmlLoaded:false`.
- One #496 regression: image-viewer browser test still waited for illustrative reference thumbnails. Only that obsolete assertion was updated, with added checks for zero invented references and the original canvas background.
- Main viewer passed 6/6; original PR reproduced its CI timeout; corrected PR viewer passed 6/6. Remaining fastqueue and composer steps passed; Image/Video contracts 12/12, syntax and whitespace passed.
- No product/design/assets/workflow changes in this audit. Detailed evidence and CI links: `docs/ci/pr-496-audit-20261024.md`.
- Original CI also has three jobs cancelled during browser installation. Do not report them as passing; inspect the audit commit CI in #496 before calling it ready to merge.

## Approved Video Studio redesign — 2026-10-23

- Objective: compact owner-approved Video inspector, original subway empty canvas and refined Scene details; draft PR only. No merge or production deployment authorized.
- Isolated branch: `codex/video-studio-approved-redesign`, based on fetched main `59f61562c02633902564c59166135496be025e36`.
- Draft PR: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/496. Concurrent main `ad9e97f4f2dc20fa1ffcaae93857467e2508e333` was incorporated by normal merge; its Upscaler product files match main exactly. Post-merge Node 708/708, Seedance 23/23, customer 18/18 and full Studio layout passed again.
- PR #473 merge `c55e828d8d6af1514a3833ffc282930c5ffd1bae` is an ancestor. Its wheel handler is byte-for-byte unchanged; existing browser gestures still pass.
- Inspected outstanding #443, #448 and #452 metadata and diffs. No cherry-picks, model/default changes or duplicate frame-height edits. Those PRs remain untouched.
- `lab/lab.js`, model picker/capability modules and all Worker/provider/pricing/wallet/authentication code remain unchanged.
- Exact supplied artwork: `lab/visuals/video-android-trio-original.png`, copied without processing or regeneration.
- Original artwork SHA-256: `7ed8131e8432c5182a2751a6d353a5fff87fd271d07fa0163dcc74fd74fc6ad7`; enforced by the new regression test.
- Production model banner remains `visuals/leather-editorial/hero-desktop.webp`; its existing background declarations and bytes are unchanged.
- New `video-compact-studio.css` styles only Video, keeping the existing independently scrolling controls and feed, fixed Generate action and mobile document flow.
- Model banner: 112px; task/mode rows: 32px; reference entry: 50px; Generate: 38px. Four output controls share a row; audio sits below. Text retains its larger writing area.
- Existing IDs, native uploads, first/last-frame previews, capability visibility and disclosure behavior remain intact. Current Scene model/library affordances delegate to the original controls.
- `video-scene-states.js` detects actual first/end images and image/video/audio references, suppressing decoration as soon as source media is attached.
- `video-editorial-deck.js` preview now contains actual reference thumbnails only. Artwork is CSS decoration and is never a History record, attachment or generated result.
- Actual History loading, explicit selection, playback, Reuse and downloads remain owned by `lab.js`; no illustrative records are inserted.
- Desktop preview, inspector and editor share their edges. At 1440x600, native settings scroll while Generate remains visible; the #473 wheel routing preserves native settings priority.
- Existing mobile policy hides the decorative empty stage, preserving fast access to controls and real History. Real uploads and results still appear normally.
- Local validation: 708/708 Lab Node tests on configured Node 22.16.0, including mandatory approved Image contract; static build, syntax and whitespace passed.
- Browser validation: full Studio layout including 1440x600/768/820, 1728x820 and 390/320px; customer permission matrix 18/18 at 1440/390/320; Reference 22/22; guest/signed-in routing passed.
- Seedance 23/23 passed, including four added real-upload/all-mode matrices at 1440x900, 1440x600, 390x844 and 320x730, output disclosure, model changes, no invented History and no preparation submissions.
- Existing sign-out assertion was aligned with current main's public-preview behavior, retaining stronger explicit checks for cleared private History, prompt, file input and reference media.
- Public visual coverage freezes the new Video baseline at `c3f1a73e` and retains the original baselines/tolerances for every other tool. Desktop Video canvas/banner pixel comparisons passed. The full local public suite then stops on unchanged Fashion Sign in alignment (46px versus Image 31px right inset on Windows); no Fashion change or assertion bypass was made.
- Only approved visual expectations were changed in existing layout/artwork tests. No assertion bypasses, force clicks or weakened generation/account checks were introduced.
- Browser media, accounts and APIs are synthetic/intercepted. No real customer session, wallet transaction or paid provider acceptance is claimed.
- Review screenshots are in `docs/previews/video-studio-20261023/`; desktop and both phone widths plus short-height desktop.
- Windows local runner lives outside the repository and only adapts static-server path separators; repository assertions run unchanged.
- Final PR URL, commit and exact-head CI status are recorded in the draft PR and chat handoff. Inspect any failed checks before review; do not merge or deploy.

## Earlier customer access and mobile work

# Customer Video preparation and generation access

Updated: 2026-10-21 (Europe/Berlin)
Source baseline: 956361cf16f06dd4361db1d6aa3bdaa33943c67e.
Scope: customer models disabled and Generate incorrectly saying Connect generation provider.

## Verified cause
- Customer session sets config.enabled=false and videoEngines=[] whenever generationReady=false.
- generationReady includes rollout, closed/billing-review state and promotional restrictions, independently of balance.
- The Video picker consumed spending eligibility as model-selection availability.
- Video's Generate button rendered owner provider setup copy; connection() is a no-op for customers.
- The user's specific live session flags have not been read; the audit browser is signed out.

## Correction
- Session adds videoPreparationEngines for draft selection only. videoEngines and enabled remain gated.
- Customer draft model selection uses the preparation list when spending is unavailable.
- Paused free trials with billing available open existing pricing on explicit Generate.
- Generation-ready zero-credit accounts open pricing before uploads or provider quotes.
- Prompt, model and local start-frame photo remain in the editor.
- Closed, billing-review, promotion-review and unavailable accounts get explicit state-specific help.
- Customer Video never renders owner provider-connection instructions.
- Owner models, private Kling access, generation permissions, pricing and ledger checks are preserved.

## Files and verification
- lab-worker/worker.mjs: preparation-only model metadata.
- lab/lab.js and lab/studio.html: selection, customer state, pricing handoff and cache revision.
- tests/lab-worker.test.mjs: authenticated paused session can discover models but cannot quote/spend.
- tests/lab-customer-video-ui.mjs: desktop/mobile trial, zero, closed, billing review, promotion review and unavailable journeys.
- .github/workflows/lab-seedance-tests.yml runs the customer Video browser regression.
- Local relevant Worker, account, billing, trial, Image-contract and Video checks: 142 passed; 20 additional quote/pilot/provider checks passed.
- All 21 PR workflows passed at ddd9a50d2cb58843be71382d78f0647b39e88ae6.
- Customer Video browser tests passed at 1440/390px for trial pause, zero balance, closure, billing review, promotion review and unavailable service. Pricing handoff made zero POST requests.
- Browser fixture uses a valid 512px Seedance frame. Existing Image test now expects the unchanged approved eight-card order; no Image UI order was edited.
- No real checkout, provider generation, account deletion or balance mutation performed.

## Release and remaining work
- PR #421 merged as e42c5bd22e1b4a19ccc7c19afaf0adfe44f86a68. Merged lab.js blob exactly matches the locally tested file: fefa37878750437482677580f428a66d9924b02e.
- Worker deploy run 39674018212 succeeded, including production health verification.
- Cloudflare Pages app check 119479814416 succeeded for that exact SHA/project pvlab-studio; deployment 05b9c007-af5d-4ff0-a028-2460d615fa73.
- Live browser on pvlab.studio/studio?tool=video confirmed the loaded lab.js URL contains videoCustomerAccess=20261021-1.
- Read-only release verifier was invoked while deployment was pending (CLOUDFLARE_UNKNOWN). Direct HTTP asset access returned 403; terminal transport later disconnected. Use the documented connector + browser DOM fallback evidence above, not an invented byte-level live-verifier pass.
- Real screenshot-account session flags and paid production generation remain unverified; audit browser is signed out. Do not infer them from the displayed balance.
- Next: customer can reload Video and prepare a model/photo/prompt; explicit Generate should open pricing for a paused unpaid trial. Verify any remaining real-account restriction using its actual authenticated session.

## Mobile Video Create polish, 2026-10-22
- Source base: `b77a7402161455e162dbd837c3c1c7aa89bd9908`.
- User requested only a slight slimming of the Video sequence on phone, preserving Start frame as the default.
- Existing `lab/lab.js` initializes `mode='start'`; no mode or provider logic needs changing.
- CSS at 440px or below: model card 125 to 119px; two upload blocks 156 to 148px; frame wells 104 to 98px; prompt 132 to 124px. Desktop/tablet unchanged.
- CSS cache key: `20261022-mobile-slim1`. Verify mobile layout, role flows and Cloudflare Pages deployment separately.
