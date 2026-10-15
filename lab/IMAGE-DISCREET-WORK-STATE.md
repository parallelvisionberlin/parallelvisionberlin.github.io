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

## Handoff
Next action: perform an authenticated desktop and mobile interaction test of the actual eye toggle and persisted preference. If a visual regression is found, edit only the Image Studio scoped assets and rerun production smoke.
