# PV LAB Studio loading: active state
Updated: 2026-10-17
Scope: initial Studio splash only, for every tool route. References: the user's October 17 black geometric panels and original minimalist centered loader.

## Approved behavior
- Logo "PV LAB" and attribution plus thin loading bar appear sharply at first paint, already centered.
- Only three dark, brushed architectural plates with fine metal edges and three faint guide lines slowly fade in behind the unchanged text during real loading. No large liquid ribbons, particles, video, images, extra text, faux progress, or waiting.
- The outgoing logo blur and 240 ms overlay fade remain exactly as before. Exit happens as soon as workspace readiness is signaled, regardless of how many panels have revealed.
- Use 100vw fixed overlay width, stable system-font text, scroll lock, native-route-pending protections, 16-second timeout hint and reload fallback.
- Honor prefers-reduced-motion with a static architectural background.

## Implementation
- `lab/studio.html`: early inline CSS and six empty decorative spans behind existing loader. Removed fluid SVG and its CSS.
- `tests/lab-studio-layout-ui.mjs`: mock startup checks for first-paint logo, three panel fade delays, completed reveal during extended loading, no width jump on Image route, reduced motion and preserved fade/route gating.
- `.github/workflows/pvlab-domain-smoke.yml`: custom-domain published HTML check now expects geometric loader and rejects old fluid SVG.
- No accounts, generation, gallery, wallet, billing, pricing, provider, Worker, or main Studio composer changes.

## Context and earlier fixes
- Oct 15 route readiness guard prevents initial Image flash before Fashion/Retouch/etc; hidden scrolling and `history.scrollRestoration='manual'` prevent scrollbar jumps.
- Oct 16 legacy `/lab/studio` redirect shim and domain smoke protect external links.
- Oct 17 fluid chrome design was deployed under PR #287 / commit `2035e5744434d2e28d059676f7e00d0b7abdf86c`, but user rejected its oversized chrome ribbons. Replaced by approved minimal geometric reveal.
- Source baseline for this task: `09458598ad0d0a0d732a5846aa82056291fdfd1f`.

## Verification and deployment
- New implementation branch: `feat/pvlab-geometric-boot-20261017`. Testing, merge and public activation must be verified from GitHub Actions and the custom domain; a commit alone does not establish live deployment.
- Verify desktop and mobile overlay geometry, loading that exits before panel fades finish, native route pending, reduced motion and unchanged 240ms fade.
