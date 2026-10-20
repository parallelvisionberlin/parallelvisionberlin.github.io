# Image composer prompt: current state

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
