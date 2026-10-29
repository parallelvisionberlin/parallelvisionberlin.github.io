# PV LAB Image Studio: Discreet Mode

## Active: History CI fixture repair (2026-10-29)
- Base/latest main reproduced: `70f87bbee522c3ab58eb2eb8551d04b3444d7190`.
- Video CI job `123472975446`: 859 tests, 855 pass, four History failures; browser steps never ran.
- All four failures reproduce in `tests/lab-history-scroll.test.mjs` with `ReferenceError: userId is not defined`.
- Cause is the isolated test fixture: its extracted History slice now includes `syncImagePreviewAccount`, but omitted the surrounding `userId`, `window`, `document` and `CustomEvent` dependencies.
- Production declares `userId` in module scope, assigns the authenticated Clerk ID before `loadHistory`, and clears/publishes it at sign-out. No application-code correction is needed for this reference error.
- Fixture supplies account state, a real EventTarget/CustomEvent and a window object. It runs the production preview publisher unchanged, recording dispatched event details.
- Original pagination, retry, filter and sign-out assertions remain. Additional assertions protect the initial preview event from append/incremental and stale responses.
- Two added cases cover empty/populated History event payloads and account changes while initial History is pending, including retained request guards and rejection of private prior-account results.
- Targeted local checks: History 6/6, account preview 4/4, approved Image UI contract 5/5; diff check passes.
- First candidate `8fba0e60`: GitHub Node 22 passes 861/861; customer Video and guest/signed-in routing pass. Full local sweep is not a pass: reduced checkout media and a Node 24 preflight timing assertion differ from CI.
- Browser steps now reach an unrelated `lab-studio-layout-ui.mjs:693` assertion expecting Audio in the former second row. Application and layout test are byte-identical to base. Preserve the approved prompt-contained audio control.
- Public visual comparison fails with exactly the same main/candidate 1440px canvas result: 4,796 changed pixels, maxDelta 232 / 613,008 pixels. Main job `123472976674`, candidate `123616661313`. Do not replace approved visuals or adjust comparison tolerances for this repair.
- Added `tests/lab-history-scroll-ui.mjs`: full Studio, synthetic auth, controlled GET responses, real cursor scroll, single-flight, manual retry, filter and sign-out invalidation, preview event payloads and zero API writes at 1440/390px. Runs as a separate additional step in the existing Video workflow; all existing tests/gates remain.
- PR: https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/pull/660 . Final CI and publication receipts belong in this section and the PR body.
- Scope: History unit/browser fixtures, one additional CI step and this checkpoint. Studio source, design, models, account isolation, pricing and billing remain unchanged. No paid generation or purchase.
- Next: validate the dedicated History browser case, integrate the fixture correction if valid, and verify Cloudflare publication and unchanged production bytes. Existing unrelated browser failures remain explicit; real signed-in production behavior is separate.

## Active: account-specific preview preference (2026-10-27)
- User reproduced a fresh account opening Image with the inspiration cards concealed.
- Verified cause: one same-origin `pv-lab-image-previews-hidden-v1` preference was reused across every account in that browser.
- `lab.js` now sends authenticated account selection and the first unfiltered History outcome to the presentation script. Session/revision guards remain unchanged.
- `image-discreet.js` stores hide/show under an account-specific key. Empty/new accounts start with cards visible. Saved explicit preferences win even with empty History.
- Existing libraries retain the legacy hidden choice on first migration; legacy concealment remains during loading to avoid flashing existing media. The early reload hint stays compatible.
- A session memory map preserves deliberate hide/show choices when browser storage is unavailable; sign-out clears the private presentation state.
- No user records, saved images, auth permissions, API requests, generations or credits are changed.
- PASS four regressions: fresh account with legacy hidden state, legacy existing-library migration, switching/reloading with independent choices, and unavailable storage. First-image real UI fixture also passes the fresh-account regression.
- Source base `463d22e1`; branch `fix/image-library-controls-20261027`. Publication pending; actual real-account signup remains separate from synthetic browser verification.


Updated: 2026-10-15
Code: lab/studio.html, lab/image-discreet.css, lab/image-discreet.js.
Initial implementation commits: 85db913, ea6d648, 90c7d985.

## Goal and approved behavior
- One compact eye button in the Image Studio History controls, ahead of Select and Refresh.
- Hidden state shows the existing high-resolution atmospheric image, with a small "Previews hidden" label. It never shows the new-user first-image onboarding on an existing account.
- Conceal the gallery, in-progress generation cards, visible history controls that cannot be used while hidden, image-detail dialogs, and current reference thumbnails.
- Preserve all generation requests, jobs, assets, downloads, account state and balance.
- Future generations stay concealed in Image History until revealed.
- Initialize before first paint from same-origin localStorage, and persist when switching views or refreshing.
- Image Studio only. Video, Upscaler, Assets, Retouch and Fashion remain unchanged.

## Boundaries and validation
- This is browser-side appearance control, not encryption, secure deletion, a private-browser mode, or permission enforcement.
- The Image gallery is still loaded from the authenticated backend. It is only concealed visually.
- Reuses lab/visuals/open-atmosphere-hd.jpg. No new artwork, paid API operations or database migration.
- Accessible icon button uses aria-label, aria-pressed, visible focus treatment, and keyboard activation.
- Verified: GitHub static validation passed on 2026-10-15. The PV LAB domain live-readiness workflow 38744051518 passed and explicitly fetched the deployed studio.html eye control plus image-discreet.js and image-discreet.css from pvlab.studio.
- Existing Image reference and queue UI workflow failures were confirmed on the pre-feature source commit ad34ccd6; unrelated to this preview toggle.
- Not yet browser-tested with a signed-in account: hide/show, reload persistence, pending result reveal, modal interaction and mobile widths.
- Source through commit c2f3b2f16bcab82f0ad2c4cc0f65b1bca422057e is published by the PV LAB custom domain, per production smoke checks.


## October 15, evening: Option B position and shadow polish
- User reported the eye shifting between gallery and hidden modes. Confirmed CSS cause: hidden mode applied display:none to Select and Refresh, causing the right-justified flex group to shrink and pull the eye right.
- Updated lab/image-discreet.css: fixed grid tracks (eye / spacer / Select / Refresh), with independently reserved positions even when Select/Refresh are not visible. The eye retains its 34×32 outer size in both states.
- Changed hidden Select/Refresh from display:none to visibility:hidden with pointer events disabled. Actions stay visually absent, but do not affect eye geometry or receive keyboard focus.
- Eye symbols overlap inside their fixed container and transition only opacity and ~.98 scale. The outer control does not move.
- Slightly separated eye from the two History actions, softer button shadow, restrained dusk-image vignette and centered label/icon shadow. Mobile grid uses tighter columns; reduced-motion preference disables transitions.
- Bumped the stylesheet query version in lab/studio.html to image-discreet.css?v=20261015-depth2.
- Updated pvlab-domain-smoke workflow to confirm the new CSS version and fixed grid, hidden-state visibility, vignette on the actual custom domain.
- This is CSS-only behavior, no account/media/credit/API alterations. Browser interaction was not authenticated in-chat; live domain smoke and static build verify deployment, not UX in a real customer session.


## October 15 late evening: anchor eye to far-right edge
- User confirmed the eye looked isolated over the blank hidden scene. Both viewports showed the eye's position was stable relative to the right margin, but the intentionally invisible Select/Refresh slots lay **to its right**, creating an awkward gap.
- Reordered only the CSS grid to [Select 54px] [Refresh 62px] [gap 12px] [Eye 34px] (compact mobile sizes 50px, 58px, 8px, 34px). The eye now stays at the far-right border of the History bar, with the action group to its left only when visible.
- The invisible buttons still reserve their slots, now **left** of the eye; no horizontal jump on toggle, no floating button in the middle of empty space.
- Updated lab/studio.html cache key to image-discreet.css?v=20261015-right-edge3 and the production smoke to verify the rightmost grid placement.
- No change to gallery visibility, saved preference, model API, credit flow or accessibility labels. Signed-in visual behavior should still be checked.

## October 17: Hide Inspiration and transient status
- Fixed the hidden-state selector in `lab/image-moods-return.css` so Inspiration disappears in any Image Studio view when the eye is hidden, not just in Mood discovery. Reserved grid slot still prevents the eye from shifting.
- Updated `lab/image-discreet.js` and `.css`: clicking Hide briefly shows "Previews hidden" for 1.6 seconds, then fades it out. Restored hidden mode on reload stays clean without replaying the label. Show/Hide immediately updates accessible state; reduced-motion users get no fade.
- Updated stylesheet and script version tags in `lab/studio.html` to bust stale browser caches. Kept media, prompt deck, preview concealment, localStorage preference and all other studio tools intact.
- Validation: selector and toggle logic reviewed. GitHub static validation succeeded on commit `ddc45a13` (run 39053080041). The updated PV LAB domain live-readiness smoke succeeded on that commit (run 39053080011), confirming that `pvlab.studio` serves the new stylesheet and JS versions. Signed-in visual interaction has not been tested in this chat.

## Handoff
Next action: test signed-in desktop/mobile Hide, Show and reload persistence visually when browser access is available. Do not change unrelated tools.

## 2026-10-18: Reference thumbnail and navigation stability
- The screenshot showed Discreet Mode enabled. Its deliberate concealment of working image pixels remains; the tile says HIDDEN instead of the ambiguous REF placeholder.
- Existing reference-image DOM nodes are retained across editor, quote and upload lock updates for unchanged references. Role, model, order or actual image changes still rerender as required.
- Working thumbnails load eagerly and fall back to their reduced preview if an image cannot load. If neither representation loads, show No preview, not the browser's broken-image glyph. Private source originals and storage are unchanged.
- The Studio navigation remains disabled during input preparation for state safety, but uses unchanged opacity to prevent visible Image, Video, Retouch, Upscaler and Fashion tab blinking.
- No Worker routes, paid provider calls, session credentials, credits, pricing or history changes. Targeted Node regression added and wired into reference CI.
- Verify CI, published Cloudflare Pages assets and authenticated browser interactions separately; a Git commit alone is not proof of production deployment.
