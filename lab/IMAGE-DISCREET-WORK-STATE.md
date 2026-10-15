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
- Pending browser checks: click hide/show, refresh persistence, populated/empty gallery, completed job while hidden, view changes, mobile widths.
- Publishing through the existing static hosting workflow should be checked before reporting the change as live.

## Handoff
Confirm the latest commit on main and the published studio.html on https://pvlab.studio/studio.html?tool=image. If CDN still serves the old HTML, wait for Pages rollout or investigate cache; do not change the backend to solve a static UI propagation delay.
