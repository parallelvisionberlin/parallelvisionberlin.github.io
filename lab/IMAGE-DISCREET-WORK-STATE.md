# PV LAB Image Studio: Discreet Mode

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
- Validation: source selectors and state transitions checked; authenticated browser interaction and custom-domain deployment confirmation remain pending until verified.

## Handoff
Next action: check GitHub workflows and deployed `pvlab.studio` file versions after commit. Then test signed-in desktop/mobile hide, show and reload persistence. Do not change unrelated tools.
