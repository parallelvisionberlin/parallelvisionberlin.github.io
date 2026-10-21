# Image composer prompt: current state

## Active: identical entrance controls across account roles (2026-10-21)

- Latest references: image(20261021-140209).png and 140220 are Neon Riviera compact/open; 140309 is the owner in reopened Inspiration. User explicitly wants one cohesive shared entrance rather than account-specific copies.
- Baseline main 6a4c5537ddc00b546a50e498ac4a821ef156e60e; branch fix/image-role-control-parity-20261021. Later photography changes are unrelated and must be preserved.
- The authenticated editor is already one shared #image-composer DOM instance for customers and owner. Both use the same image-deck-surface.css card-entry rules. The remaining visible role divergence is the legacy #image-composer-edit-area Retouch shortcut: syncImageComposer hides it for customers but shows it to owner, adding a tool and moving every neighboring control/prompt edge.
- The earlier direct geometry/type comparison covered new customer versus public only. New/returning/owner were separately checked for outer dimensions, direction and History, which did not assert identical control sets or positions. This left the owner's additional shortcut untested.
- Expanded direct comparison now covers new customer, returning customer, owner and public in idle, focused, short-text and cleared states. It requires identical visible control sets, control/prompt/Generate geometry, typography, borders, colors, model asset and backdrop, plus one visible editor per role. Original-source run reproduces idle new/owner failure specifically on the additional Retouch control.
- Small presentation-only correction in the existing shared stylesheet: omit the redundant inline Retouch shortcut from the desktop card entrance for all authenticated roles. Retouch stays in the existing top tool navigation for owner and customers; the established owner photo/History shortcut remains. The controller already removes pv-welcome-deck when real photos are attached. No new bar, new role markup or permission change is introduced.
- Cache key: image-deck-surface.css?v=20261021-role-parity1. Files: lab/image-deck-surface.css, lab/studio.html, tests/lab-first-image-instant-browser.mjs and this record.
- No production JavaScript, provider/billing/credit/auth/deletion changes, no approved prompt copy, bar dimensions, background, Inspiration cards, Hong Kong Nights, Upscaler, History, PV Soul, native or mobile redesign.
- Image UI contract (4) passed before and after the scoped change. Direct four-role first-image comparison, prompt paste/History and Studio layout (including mobile) passed locally. Owner History Retouch and the shared Retouch navigation are explicitly asserted. Diff whitespace check passed. The existing Retouch navigation browser subset also passed locally (2 cases), including safe customer preview and completed-image handoff without upload/payment.
- Published: PR #407 squash-merged as 3ef923631ece5461650f1b9d49eb5d2c39d68152. All 18 PR workflows passed on dc0e14f2bdb3a4872424ae20fb54d21aeeb4fe8b. Initial Precision Edit run 39614911231 timed out clicking a disabled/then hidden #image-detail-edit-area in tests/lab-image-oneclick-ui.mjs:302; the unchanged test passed locally and its failed job passed on retry. No Retouch/viewer production code or test was altered to obtain that pass.
- Cloudflare Pages deployment 6b6ceb63 of 3ef9236 succeeded. The actual pvlab.studio/studio HTML serves image-deck-surface.css?v=20261021-role-parity1; downloaded live CSS exactly matches Git blob e5c53adf439eb8d4ab6a3a46f8d6399a55b6f6f9. Browser DOM independently confirms this exact stylesheet is loaded.
- Actual public web check at 1363x936: one visible Image editor, compact height 74px, and exactly the nine common controls (add, library, model, moods, base, ratio, resolution, count, exact). This release changes the owner entrance only; the public view already had that shared toolset. Four-role empty/focused/short/cleared geometry and styling are passing repository browser simulations, not production Google logins.
- Post-merge main repeats were still queued/running at this checkpoint: account 39615924530, mobile 39615924263, video 39615924473 and first-image 39615924684. Do not describe those repeat runs as completed. The separate previously recorded asset-library #canvas-import failure is outside this scoped change.
- No implementation/publication step remains for this request. Existing owner/customer tabs need a reload (Ctrl+Shift+R on the supplied Windows/Chrome profiles) to receive the new stylesheet. Preserve the same shared editor and compare all four roles directly for future entrance changes.

## Previous verified backdrop release

## Active: approved public backdrop and focus stability (2026-10-21)

- Latest references: image(20261021-131922).png is the signed-out compact bar; 131933 is focused; 132032 and 132112 show the owner reopening Inspiration, with short and empty prompts. User approves the current bar and requests the same final backdrop without a focus jump.
- Baseline main a672ebfc46eed7ce650d07e2ecc353c9388de076; branch fix/image-approved-backdrop-20261021. Preserve concurrent Nina, photography and other work.
- The final artwork already exists: lab/visuals/pvlab-subtle-cinematic-background-20261017.webp, 2080x1136, Git blob 71e535a06ab40bdebfd6877f1dc9a112639d9ffd. Reuse it exactly; do not generate or replace artwork, card images or prompts.
- Exact causes: public studio-guest-image.css still loaded the original Dream Blur card as wallpaper; later guest rules in image-editorial-deck.css applied another 9px blur and dark overlay. Authenticated welcome/reopened Inspiration already used the approved cobalt/copper plate without blur.
- Production diagnosis confirmed the public section/pseudo-element height changes from 854px to 867.296875px on focus at 1363x936. Its scroll-attached, centered cover wallpaper therefore reframed, even with scrollY staying zero.
- Public styling now reuses the approved plate and the same legibility gradient at full opacity, without the obsolete guest blur/overlay override. Desktop artwork and gradient are framed against the viewport so changes in editor/section height cannot reframe them. Mobile/native keep their existing scrolling mechanics.
- Scope: lab/studio-guest-image.css, lab/image-editorial-deck.css, two CSS cache keys in lab/studio.html, the existing first-image browser suite and this checkpoint. No production JavaScript, deck/card sizing, prompts, models, accounts, credits, billing, providers, History, Hong Kong Nights, Upscaler or owner background changes.
- New browser coverage compares actual painted backdrop pixels on public focus/blur at 1920x900 and 1280x720, allowing only small raster rounding (maximum 4 channel levels, mean <=0.25/255). A controlled reversal to scroll attachment produces maximum RGB deltas 183/144/157 and means 8.54/10.54/12.97; the fixed version has maximum 3 and means below 0.08. Public/customer parity also checks the actual artwork, opacity, filter and overlay in empty/focused/short/cleared states. Existing tests already compare first welcome with reopened Inspiration.
- Original-source regression confirmed: the new first-image check fails because the public CSS still serves the Dream Blur card. Local Image UI contract (4), first-image/focus-pixel/direct public-customer comparison, prompt paste/History, Studio layout and guest/mobile Mood checks all passed. Diff whitespace check passed.
- Published: PR #403 squash-merged as 7533ee80120246dc3042ccaa3f6bc5e0e637c8a0. All 18 PR workflows / 21 test jobs passed on 1b31ca5af75a480e97d446a7743932b19fefc7f1. Mood Creator's workflow summary briefly remained in progress after all three jobs succeeded; its aggregate subsequently also completed successfully. Cloudflare Pages deployment 75d8dca2 of merge 7533ee8 succeeded.
- Actual pvlab.studio/studio serves both 20261021-backdrop1 CSS markers. Downloaded live guest CSS exactly matches Git blob 546dc28d8a9019dc03aa5bf036e33b9d6af213de; editorial CSS matches 203b769936cc2cea495ebb20f74109295f29cb06. No artwork or production JS byte changed.
- Actual public browser verification at 1363x936: correct cobalt/copper file, filter none, opacity 1, fixed artwork and shade. Normal click changes the bar from 74px to 160px at unchanged top 675.796875px; outside click restores 74px, with scrollY zero throughout. The same background crop (16,110)-(353,230) in actual before/after website screenshots has zero RGB pixel difference. Public QA screenshots: pvlab-backdrop-closed-20261021.jpg and pvlab-backdrop-open-20261021.jpg.
- Post-merge main account interface 39610769554, mobile review 39610769410, first-image 39610769596 and video 39610769429 also passed. The separate existing asset-library failure remains (main 39610769615); branch job 119255274606 confirms the same tests/lab-assets-ui.cjs:281 Upscaler #canvas-import assertion recorded before this change. Do not treat it as a newly introduced background failure or patch unrelated Upscaler here.
- Synthetic new/returning/owner and reopened Inspiration comparisons are passing repository tests, not actual production Google logins. Existing owner backdrop and bar are unchanged. No pending implementation/publication step remains for this request; user should reload the already open Image page.

## Previous verified bar release

## Direct public/customer visual parity (2026-10-21)

- Latest references: image(20261021-115534).png is Neon Riviera with short text; 115541 is its empty bar; 115559 is signed-out compact; 115612 is signed-out focused. These screenshots demonstrate that PR #396 still left a distinct public skin despite its passing behavior checks.
- Baseline main c84d179822e4cf0d4702699d7bd1f80f5580d3d1; branch fix/image-deck-visual-parity-20261021. Later main photography/Nina changes are unrelated and must be preserved.
- Exact remaining source differences: guest-only 11px tools, fallback model diamond, hidden Exact Prompt, an extra empty Retouch action and Generate stretching over both writing rows. Public focus/clear/short-text sizing also used a separate policy.
- Canonical desktop presentation now lives in lab/image-deck-surface.css and styles both forms through the same semantic slots/control attributes. Shared dimensions, graphite surface, typography, library circle, Seedream branding asset, Mood color, input and Generate positioning apply to empty/focused/short/cleared states.
- Public Generate uses the same 144x84px bottom-aligned action in the open deck instead of stretching. Its sign-in instruction stays outside the writing instrument. Exact Prompt uses the existing protected sign-in action; no anonymous setting entitlement or generation is introduced.
- Public input uses the same compact-overflow measurement and focus/blur policy as desktop welcome. Clearing while focused leaves editing open; outside focus collapses empty/short input without erasing it. Long writing and local photographs remain supported.
- Existing authenticated model handlers retain their own selectors; public model icon is separately named while reusing branding/bytedance.svg. No duplicate IDs or anonymous handlers can steal private model updates.
- A direct browser comparison now checks actual rendered slot/control geometry, typography, weight, colors, model icon and Generate label for empty, focus, "hola como esta?" and cleared states. Earlier tests checked the two surfaces independently and therefore missed their difference.
- Existing new/returning/owner, banner, History, privacy, pricing, references, Soul and mobile checks remain in place. Workflow path filters include the shared CSS so future changes run the comparison.
- No production lab.js, account/deletion/auth, pricing/credit/provider logic, approved prompt copy, Hong Kong Nights, Upscaler or backdrop/card art changes. Native, mobile and populated History keep their existing layout rules.
- Local verification passed: approved Image UI contract (4 tests), first-image/direct parity, guest/mobile Mood, long-prompt paste/History, Studio layout and references/PV Soul prompt-dock browser suites.
- Published: PR #400 squash-merged as d20c1b79ffa9864d9755157941799fe1ce91e616. All 18 PR workflows passed on 2534bbe461018e52d2cb3afa596273534f081e25. Cloudflare Pages deployment of d20c1b7 succeeded. Post-merge account interface 39599485948, mobile review 39599485996, video 39599485800 and first-image/direct parity 39599485957 also passed.
- Actual custom domain pvlab.studio/studio now serves all three 20261021-surface1 cache markers. Downloaded production shared CSS exactly matches Git blob 22b7a1e3256340ddbab016ca7f8ce04050b2cedf, guest CSS f72d198031db99bbd4178343905b87af66ef25c2 and controller 2ae6ef93fb7a9b580d589fe71f24314f570e8ea3.
- Verified the actual deployed public UI in the cloud browser at 1363x936: empty bar 1200x74; normal click opens to 1120x160 with unchanged viewport/document top 675.796875px and 24px gap below cards. Generate changes from 128x52 compact to 144x84 open, bottom aligned. Actual Bytedance icon and lime Moods are present; short text works; clearing while focused stays open; outside click collapses back to 74px. Exact Prompt opens the real Clerk Sign in to PV LAB modal and closes back to Image. No credentials, uploads or generation were submitted.
- Signed-in new/returning/owner, real History and references remain synthetic repository browser verifications, not actual production Google logins. User should reload Image and test with the newly recreated Google account; do not ask for another account deletion.
- Separate pre-existing main failure remains in Lab asset library tests: run 39599485856 fails tests/lab-assets-ui.cjs:281 at Upscaler #canvas-import visibility. The prior release already failed the identical assertion in run 39594593689/job 119203651643 before this change. Dedicated Upscaler PR workflow passed; no unrelated Upscaler patch is included. GitHub Pages build was superseded/cancelled, while the actual Cloudflare deployment and custom-domain bytes above were verified.

## Prior release, partially unified before the latest screenshots

## Shared account bar and downward card entrance (2026-10-21)

- Latest owner instruction supersedes the October 20 focus-only restriction for the desktop card entrance: one Image bar across new customers, returning customers and owner; compact initially, close to the cards, opens downward on click, returns to compact on outside click. Populated History keeps the locked two-row deck from the owner's image 3.
- References: image(20261021-111950).png and 111957 show the new zero-credit customer entrance with/without the credit banner; 112150 is owner History; 112210 is reopened Inspiration. image(20261021-112849).png shows the signed-out public view with Sign in, not a verified signed-in account.
- Baseline main e51ebfeaf50f4e5ca709d6271a3d023df87e3470; branch fix/image-welcome-deck-20261021. Only presentation, cache versions, relevant existing browser/contract tests and this checkpoint change.
- Exact causes: focus-only expansion was explicitly disabled by PR #372; the welcome one-row CSS excluded reopened Inspiration; compact and expanded decks used bottom anchors, so expansion grew upward. The signed-out compact form also hid Library, Base image and resolution and used a smaller expanded writing grid.
- One card-view marker now derives from the visible welcome/Inspiration state, independent of account age, owner or balance. It places the same real editor 24px below the cards and reserves room for downward expansion before focus. A bounded textarea retains internal long-prompt scrolling.
- Empty outside-click collapse does not erase text or selected Moods. Reference photos and real long directions continue to retain required writing space. History focus alone retains its existing dimensions and 30px bottom anchor; PV Soul, native/mobile and other tools keep their existing layout.
- Public desktop entry exposes the same principal tools and expanded deck dimensions. Add/Base select local photos; Moods stays on the seven Inspiration cards; protected model/library/Retouch/ratio/resolution/count actions and Generate invoke the existing real sign-in entry. No anonymous upload, provider call or generation permission is added.
- All account roles are exercised in the existing first-image browser suite, including new-customer credit banner show/hide, 1440x900, 1280x720 and 1280x680, downward focus, outside collapse, History and reopened Inspiration. Exactly one Image bar is visible in each role.
- Existing first-image, long-prompt paste/History, guest/mobile Mood, Studio layout and reference/PV Soul prompt-dock browser suites passed locally; approved Image UI contract passed (4 tests). The added role checks exposed a test race: request-count increment preceded its delayed 202 response. The test now waits for the actual submission completion before reopening Inspiration; production generation code is untouched.
- Initial PR CI also exposed a 12.5px card shift after Discreet Mode: the new layout measured CSS-hidden cards before their restored geometry settled. Card positioning now skips hidden previews and synchronizes directly when the root privacy class changes. The complete first-image suite and Image contract passed again locally after this correction; the final PR CI also passed, as recorded below.
- No model/provider, account deletion, billing/credit safeguards, approved prompt copy, Hong Kong Nights, Upscaler, gallery data or backdrop artwork changes.
- Published: PR #396 merged as fb11a915334464017dd005f0938a5573c2d34c54. All 18 PR workflows passed on b01af26d6849836d2680a01bfaab59771a3fb8b1, including first-image 39594116859, account interface 39594116962 and video 39594116913.
- Confirmed actual pvlab.studio/studio serves all three 20261021-card-flow1 cache markers. Live JS exactly matches Git blob 786c6df0d9fc1158ce5279006b45203b34747f62, editorial CSS 929cfe759a086adee234512a5cad6063963b31bd and guest CSS f2431e1024f550b653d9058a6718b83bc1c7f7d4.
- Independently verified the deployed public site in the cloud browser: empty bar height 78px, click opens to 160px with unchanged top 686.796875px, outside click returns to 78px. Moods stays with the real cards; Seedream selector opens the actual Clerk Sign in to PV LAB dialog, then closes back to Image. No credentials, account creation, upload or generation were submitted.
- Signed-in new/returning/owner comparisons, private History, photos and mobile are verified by the repository's synthetic browser tests, not by logging into the user's production Google accounts. No implementation/publication blocker remains for this request; existing open tabs need a reload to receive new source.
- Changed files: lab/image-editorial-deck.js, lab/image-editorial-deck.css, lab/studio-guest-image.css, lab/studio.html, tests/lab-approved-image-ui-contract.test.mjs, tests/lab-first-image-instant-browser.mjs, tests/lab-image-prompt-paste-ui.mjs, tests/lab-mobile-mood-entry.mjs and this checkpoint.

## Earlier implementation history

## Standard signed-in Image prompt expands only when needed (2026-10-20)
- The owner's October 20 History screenshots showed the same empty Seedream 5 Pro Image deck growing immediately on focus. Source cause: `image-editorial-deck.js` sets `emptyRealFocus` and includes active focus as an expansion trigger, irrespective of content.
- Targeted correction: for standard signed-in Image, focus alone never expands. Compact state persists while typed text fits, and long, wrapped or multiline directions expand based on the input's measured overflow against the compact textarea. Clearing or shortening restores the compact deck while the caret stays focused. Attached reference photos continue to expand the deck.
- PV Soul's established special composition, guest Image preview, mobile native Create, prompt copy, models, Moods, tools, pricing, credits, generation and providers remain unchanged.
- Changed only `lab/image-editorial-deck.js`, its cache token in `lab/studio.html`, protective tests and this handoff. Real-browser regressions assert empty focus, short prompt, long prompt and long-to-short transition in first-image and populated History flows; maintain the original long prompt scroll and references behavior.
- PR #372 squash-merged into main at `1b2a39cd981cec024c146a962cc839953449dd4b`; merged JS and Studio cache fingerprint independently confirmed on `main`.
- Approved Image UI contract, first-image Chromium and long-prompt paste/History Chromium checks passed, including empty focus, short text, overflow and long-to-short collapse. Other broad browser failures were already observed before this focused change.
- Cloudflare publication of pvlab.studio could not be independently checked from this environment. GitHub merge is confirmed, live deployment is not.

## Guest Image composer matches the real instrument (2026-10-20)
- Owner supplied side-by-side signed-out and signed-in screens: merely focusing the anonymous textarea made a giant bordered inner box, while the real Studio kept an integrated prompt/toolbar/Generate instrument. Owner rejected the guest clone and unrelated Moods navigation.
- Signed-out first paint stays the previously approved small horizontal strip. Empty focus and short text never expand it. A real long direction, pasted text, or filled Inspiration Mood opens one clean two-row writing deck with no inner focus rectangle, bounded auto-height and a real toolbar beneath it. Clearing returns to compact even while focused.
- Public toolbar now mirrors the signed-in controls visually. Moods targets the seven preview cards on the same page; all other protected controls use Clerk Sign in without fake anonymous selections or leaving for unrelated destinations. Generate still requires authentication.
- CSS: guest layout now has a single owner (`lab/studio-guest-image.css`), avoiding conflicting guest layout rules in `lab/image-editorial-deck.css`. `lab/image-editorial-deck.js` changes only guest expansion and auto-fit, preserving real authenticated expression. `lab/studio-guest-image.js` wires the in-place Mood and protected toolbar actions. `lab/studio.html` updates guest HTML and asset cache keys.
- Mock browser tests cover empty focus, short-to-long-to-empty, no inner outline/overlap, in-place Moods, protected Sign in, and mobile Mood handoff. `tests/lab-approved-image-ui-contract.test.mjs` protects these decisions; the existing first-image workflow runs them. No provider, backend, generation, user data, credit, pricing or signed-in edits.
- PR #367 squash-merged into `main` on 2026-10-20 at commit `6187aea6d342970ccace5dca9cad5ebf12141be8`. The merged main source was fetched and all new cache tokens, guest controls, guest route guards, compact/expanded CSS and untouched authenticated CSS verified.
- Current PR checks: PV LAB approved Image UI contract, instant first-image desktop/mobile browser, long-prompt paste, static validation, private Lab tests, pricing/queue and related Image suites passed. Six other browser workflows failed in the same categories already failing on earlier PR #361 (account, Upscaler, Fashion, compact customer image preview, Mood Creator and video mobile toolbar). They are not repaired or newly introduced by the guest styling changes.
- Live Cloudflare Pages publication at `pvlab.studio` could not be independently verified; browser source endpoints are inaccessible through the available external fetch. No claim of live production until checked.

## Signed-out Image focus and header Sign in (2026-10-20)
- Owner approved image 1 as the compact guest entry, with the existing short-to-long prompt flow. Removed only the extra guest text focus rectangle and outer focus brightening; retained the resting graphite border, card layouts, responsive expansion and prompt state controller.
- Increased guest desktop Sign in from 36px/12px to 42px/13px, preserving the phone overrides and the signed-in account header.
- Scoped files: `lab/studio-guest-image.css`, `lab/image-editorial-deck.css`, `lab/studio.html`, approved Image UI contract test, and this handoff. CSS asset cache tokens updated; no JavaScript, model, privacy, payment, credits or account data changed.
- PR #366 squash-merged into `main` as `ef76bf8c847188b8e7ee81de3079c93f7133df04` on 2026-10-20. The merged Studio HTML references both updated CSS assets. Approved Image contract, long prompt paste, instant first-image, static-site, queue, pricing and core Lab tests passed on the PR.
- Six broader browser workflow failures (compact Image customer credit preview timeout, authenticated account alignment, mobile Studio dock row expectation, Upscaler spacing, Fashion dock and Mood Creator icons) matched the same failed workflows on the earlier 2026-10-19 PR #361; not altered or fixed by this styling change. Keep follow-up separate.
- Cloudflare Pages production and custom-domain appearance were not independently accessible in this environment. Source merge is confirmed, production publication not confirmed.

## Locked Image UI contract (2026-10-19)

- User request: prevent future PV LAB updates from accidentally changing approved Image copy or leaving the prompt deck stuck at an expanded height.
- Approved labels: empty `What do you imagine?`; Base `What would you like to change?`; references-only `Describe the image you want to create...`; native optional direction `Anything else? Add a direction (optional)`.
- Source of truth: `syncImageComposer()` in `lab/lab.js` owns the contextual placeholder; `fitImageComposerPrompt()` owns height only; `lab/image-editorial-deck.js` owns presentation only.
- New fast guard: `tests/lab-approved-image-ui-contract.test.mjs` exercises the actual placeholder expression, disallows extra writers or the unauthorized copy, and asserts the compact/expanded structure.
- New always-on workflow: `.github/workflows/pv-lab-approved-image-ui.yml` runs on every pull request and push to `main` without path filters.
- Existing browser workflows now trigger on changes to `image-editorial-deck.css` and `image-editorial-deck.js` as well.
- Future coding agents must read `lab/AGENTS.md`, keep changes strictly scoped, and never update the locked UI contract without explicit owner approval.
- Runtime behavior, prompts, CSS, models, prices, jobs, accounts, and customer data were intentionally not changed in this guardrail task.
- Implementation branch: `protect-pvlab-approved-image-ui-20261019`; tests, merge, and hosting deployment need separate confirmation.
- GitHub branch protection is a separate repository setting. CI checks alone report regressions but cannot prohibit a direct push without an enforced required-check rule.


- Updated: 2026-10-14, Europe/Berlin.
- Fix baseline: `bcf473df79f15e50f76094a238ef236200f354a1` on `main`.
- User approved only the contextual prompt text, not changes to the deck design or dimensions.
- Empty web prompt: `What do you imagine?`.
- With base image: `What would you like to change?`.
- References-only: `Describe the image you want to create...`.
- Diagnosis: a separate desktop CSS override forced an empty standard Image deck to at least 224px tall (272px on smaller laptops), and resized several controls.
- Fix: remove that override. Inherit the previous compact model, Mood, settings, toolbar and Generate sizing. Loaded thumbnails occupy their own photo row.
- Preserve the unified upload/saved photo packs `+` menu and text-only model photo hiding.
- Keep existing prompt JavaScript, Moods, reference guidance, native-app styling and generation controls unchanged.
- Files changed: `lab/assets.css`, `lab/studio.html`, `tests/lab-studio-layout-ui.mjs`, `tests/lab-image-prompt-dock-ui.mjs`, and this file.
- Regression checks now assert compact empty layout, photo row expansion, shrink after removal, and exact placeholder copy.
- No paid generation or changes to credits, pricing, provider APIs or customer data.
- Status: pending CI and GitHub Pages deployment confirmation.
- Next action: verify browser sizing checks and published source; leave unrelated homepage tests untouched.

## Controlled Pose guidance (2026-10-14)

- Starting commit: `238342f3a3966397469473951ec8268d29979271` on `main`.
- A disabled Controlled Pose Generate action previously surfaced generic input guidance as an inline `composer-generation-block` row, making its image deck taller than Seedream/Nano.
- For the `fal` engine, guidance is now provided on the model selector and disabled Generate tooltips and as accessible descriptions, without an inline row.
- Errors and validation still disable submission exactly as before; the underlying `message` is not discarded.
- The original model-specific input instructions remain available, including one Pose photo, 1–4 Identity photos and a prompt.
- No layout CSS, reference roles, model switches, Moods, pricing or backend changed.
- UI regression verifies that switching from a photo-loaded Seedream deck to Controlled Pose keeps comparable dimensions and that guidance is accessible and does not leak after switching back.
- Updated files: `lab/lab.js`, `lab/studio.html`, `tests/lab-studio-layout-ui.mjs`, `lab/IMAGE-PROMPT-WORK-STATE.md`.
- CI/deployment status: pending verification after commit.

## Compact Image settings (2026-10-16)
- Source baseline on main: `e07740e3af1131ac103f6bf2721802ccae72a0b2`.
- User screenshot showed a huge options panel, a redundant PNG/JPEG choice for PNG-only Seedream, and exposed disabled draft/reset buttons.
- Desktop Image settings now anchors a 330px popover above the Options button instead of expanding the entire composer; Generate and gallery geometry are unchanged.
- Native app re-parents this drawer inside its Create deck as before. Mobile web uses an above-composer flyout.
- Only genuinely selectable model settings appear. Seedream, Flash, Kling, Qwen and Z-Image output PNG and never present an ignored format choice. Formats for other tools are unaffected.
- Exact prompt stays optional. Save draft and Reset editor remain fully wired under a collapsed “Save or reset” disclosure; PV Soul strength-only settings hide this disclosure.
- Changed scope: `lab/studio.html`, `lab/assets.css`, `lab/lab.js`, `tests/lab-studio-layout-ui.mjs`, this state file. No backend, pricing, image generation or user-data changes.
- Mock browser regression added for Seedream menu layout, PNG visibility, Exact Prompt and unchanged Generate geometry; CI/deployed status to verify after commit.

## No ordinary Image settings menu (2026-10-16)
- Starting repository main head: `6427e0b842dba9d87829196b7c6ec7519d6a6606`.
- User rejected both the full Image settings popup and the compact popover. Only a subtle Exact Prompt on/off switch is retained next to the prompt, disabled by default. The existing backend uses its checked state without a new paid call.
- Seedream, Lite, Flash, Qwen, Kling, Gemini 2.1 and text-only models do not show a generic Options icon when no reference details are present.
- Models with genuine controls (Nano Banana Batch, Controlled Pose, Soul identity settings), or images with optional reference note/target fields, retain a contextual advanced control so the existing functionality is not lost.
- Save draft and Reset editor are no longer exposed in Image Studio; Video and Upscaler keep their existing controls. Important verified behavior: Reset cleared media and Mood but never deleted typed prompt text. Ctrl+A Delete affects the focused prompt only.
- Only HTML/CSS/UI wiring and mock/static tests changed. No credit, model, provider, billing, job submission or customer-data changes.
- Scope: `lab/studio.html`, `lab/assets.css`, `lab/lab.js`, `tests/lab-studio-layout-ui.mjs`, `tests/lab-smart-prompt-ui.test.mjs`, this state file.
- Regression: verify tiny toggle, visible only for supported image engines; standard toolbar has no gear, Save or Reset; hidden options are preserved for model-specific cases, and no Generate geometry shifts. CI and deployment must be confirmed separately.

## Disabled Generate ghost-tile correction (2026-10-16)
- Source baseline on main: `5f21cc4ff5e051d14f8763c6a4b3d74e1197caf5`.
- Screenshot showed a conspicuous pale 144 × 84 Generate button with disabled gray lettering and an empty prompt.
- A late `lab/studio-finish-v2.css` override forced light `#e9e7e0` even when the button was disabled.
- The disabled Image Generate appearance is now graphite `#292c2a`, a quiet outline and readable muted text; the existing pearl-white enabled state stays untouched.
- No change to control height, image deck geometry, model behavior, eligibility, credits or paid generation.
- `lab/studio.html` updates its CSS cache token. The compact prompt browser regression checks computed disabled background and text for Seedream and Soul, and now runs on main pushes.
- GitHub Actions and GitHub Pages release status must be verified after committing.

- Regression harness follow-up: the current extracted `fitImageComposerPrompt()` also calls `effectiveImagePrompt()`. The mock-only browser harness now stubs this contextual direction function to an empty string, so its CSS assertions can run. No application logic changes.

- CI isolation follow-up: the inherited long-prompt mock browser test fails on unrelated historical layout assumptions after being made runnable. Restored it and its PR-only workflow to their previous versions; it is not a reliable gate for the disabled-button color.
- Added `tests/lab-image-generate-disabled-ui.mjs` and `.github/workflows/pv-lab-generate-disabled.yml` to verify rendered dark disabled / pearl enabled styles on desktop, mobile and Soul without booting or charging the Lab.
- Source baseline for the isolated test: `05ded0336275982e42b81429b982d15fbc8e20c3`. New CI and page deployment status to verify after commit.

## Empty Generate tile behavior (2026-10-16)
- User verified the darkened disabled Generate CTA had reached PV LAB, but the full-size inert tile was still visible on an empty Image deck.
- Hide the disabled Generate tile only when the standard Image prompt is empty and no photo-reference tiles are attached. Keep its layout slot to prevent composer motion.
- With text/photos, show a disabled button if blocked so important feedback remains available. Submitted states and PV Soul's identity workflow remain intact.
- No backend, credits, pricing, model, reference or photo-display modifications.
- Updated `lab/studio-finish-v2.css`, CSS cache token in `lab/studio.html`, test `tests/lab-image-generate-disabled-ui.mjs`, and this handoff.
- Browser verification covers empty, text-present, photo-present and ready states at 1440 desktop, 390 mobile and Soul.
- GitHub Actions CI and GitHub Pages deployment to verify after commit.

## Permanent Generate and corrected Exact control location (2026-10-16)
- The user clarified that "ghost button" referred to the out-of-place Exact switch, not Generate. Never remove Generate when there is no prompt. Starting verified main source head: `842201dd4027190f49f0b63484fa8178659789fd`.
- Removed mistaken `visibility:hidden` for empty Generate. Its large right-hand position remains constant. Inactive Generate has a visibly muted pearl finish and stays disabled; active Generate keeps the existing brighter treatment and actual provider/credit checks unchanged.
- Moved the existing functional `composer-exact-prompt` control out of the text-writing row to immediately after Image count inside the toolbar, with a small normal-height chip. It retains its original checked state and backend behavior. Native Create keeps the switch inside More controls rather than overlaying the prompt.
- Touched only `lab/studio.html`, `lab/assets.css`, `lab/studio-finish-v2.css`, `lab/native-create-gallery.css`, `tests/lab-image-generate-disabled-ui.mjs`, `tests/lab-studio-layout-ui.mjs`, this handoff. No account, billing, job, pricing, provider, backend or saved user data changes.
- Mock browser regression now checks Generate remains visible and non-clickable when empty, enabled surface when ready, and exact switch alignment. GitHub Pages publication and CI separately verified after commit.

## Exact switch without label or container (2026-10-16)
- User approved the original fixed Generate button and requested a final reduction of Exact: remove the visible word and bordered chip, leave only a tiny switch after the Image count control. Hover/focus reveals an explanatory "Exact Prompt" tooltip.
- Source baseline: `89f0717c970e670ec37833195c238f8a09e557d6`. The same `composer-exact-prompt` ID, checked state, enabled models and backend logic remain untouched. The tooltip states that automatic prompt improvements are disabled but Moods and references still apply.
- `lab/assets.css` uses a 36px transparent switch wrapper, with absolute, noninteractive tooltip. Native Create retains a compact switch in expanded controls and an accessible label.
- Regression tests verify transparent chipless appearance, 40px-or-less width, hover visibility, and existing Generate position. Production smoke checks new CSS asset fingerprint and tooltip CSS.
- Files: `lab/studio.html`, `lab/assets.css`, `lab/native-create-gallery.css`, `tests/lab-studio-layout-ui.mjs`, `tests/lab-smart-prompt-ui.test.mjs`, `.github/workflows/pvlab-domain-smoke.yml`, this handoff.
- No Generate, credit, price, model, upload, account, gallery, Worker or paid job changes. CI and live-domain deployment must be checked independently.

## Long pasted Image prompt expansion (2026-10-16)
- Source main baseline: `7036f988b940ee961cd807dbc6496ff7b7bd67ba`.
- Screenshot showed Seedream prompt trapped in a ~54px editor even after a prior bounded-autosize helper was deployed. Diagnosis: `image-composer-stable.css` forced the textarea height, top-row height and desktop grid track with `!important`, defeating inline JS fitting.
- Restored content-driven top track and JS-controlled textarea height. Empty composer remains compact; pasted prompts expand to approximately 176px on large desktop, up to 122px on mobile, then scroll internally without hiding Generate or controls.
- Paste at the end now scrolls to the final written lines after normal composer synchronization; pasting/editing earlier text does not jump to the bottom. Only the Image web composer layout changes; the native Create and PV Soul special layout remain excluded from these CSS overrides.
- CSS and JS fingerprints changed in `lab/studio.html`, without modifying the image providers, jobs, auth, pricing, credits, user prompts or gallery data.
- Files: `lab/image-composer-stable.css`, `lab/lab.js`, `lab/studio.html`, `tests/lab-image-prompt-paste-ui.mjs`, `.github/workflows/pv-lab-image-paste.yml`, this handoff.
- Browser regression tests empty -> long paste -> scroll -> clear, desktop, laptop, mobile and short mobile; creates no paid image generation.
- Status: branch `fix/image-prompt-expand-paste-scroll-20261016`; PR checks and production publication to be verified, not assumed.

## Taller desktop writing area (2026-10-16)
- User confirmed the previous expansion is live, but the long prompt still felt too shallow compared with the Higgsfield reference. This is an incremental capacity change, not a deck redesign.
- Starting production main baseline: `48f0c985130122773e32d0f1f2afe7fbe409eff4`.
- Standard desktop web Image editors now grow as the text grows, up to **232px** (or 31% of visible viewport height, whichever is lower). Very short desktop viewports limit expansion to 27% to preserve the gallery and controls.
- Mobile web keeps its 122px limit; PV Soul and native Create retain their previous 176px-class desktop logic. Empty one-line composer, Generate button, toolbar, photo references, pricing, and scroll-at-end behavior stay the same.
- Updated `lab/lab.js`, Studio script cache fingerprint in `lab/studio.html`, both mock Chromium prompt tests and this handoff. No paid calls or image-provider changes.
- Branch: `improve/desktop-image-prompt-taller-20261016`. CI, merge, and Cloudflare production deployment to be checked independently.

## Correction: text size only, not textarea size (2026-10-16)
- The user clarified that the requested Higgsfield comparison concerns **letter size** inside the prompt input, not the editor's height.
- Reversed PR #249's 232px desktop editor cap; retain the previously verified 176px desktop / 122px mobile long-text auto-expansion logic unchanged.
- In non-native standard Image Studio at widths over 740px, change **only the prompt text font size** to 17px with the last loaded `image-composer-stable.css`. Mobile, PV Soul, Generate, toolbar, prompt-scroll behavior, model prices and reference layout remain untouched.
- New CSS version query `20261016-font-size17` ensures the change loads on pvlab.studio. JS cache token restored to the original `20261016-scroll-paste1` because that code is unchanged.
- Tests restore the old geometry assertions and add a Chromium computed-font-size check for desktop, preserving mobile baseline.
- Branch: `fix/image-prompt-font-only-20261016`. Do not claim published until Cloudflare production deployment succeeds.
