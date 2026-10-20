# Photography / Work State

Date: 2026-10-21

Objective: Add an independent analog/editorial photographic archive for Alejandro Molinari under Parallel Vision, preserving the main site and existing pages.

Public site path: `/photography/`
Source repo: `parallelvisionberlin/parallelvisionberlin.github.io`
Base commit before addition: `a121fdaef3a566cd9c802dc9b52262a2fee301bd`

Included:
- `photography/index.html` and `photography/archive.js`.
- `photography/assets/after-hours-{01..04}.jpeg`
- `photography/assets/nocturne-01.jpeg`
- `photography/assets/negative-space-01.jpeg`
- One Photography entry under the existing artist-page Architecture index; main homepage not modified.

Galleries: After Hours (4), Nocturne (1), Negative Space (1).
Metadata: only DSCF1331 source confirmed FUJIFILM X-T50; the site does not claim all images use a specific camera.
Behavior: central photograph, arrows, keyboard navigation, touch swipe, independent sections, mobile layout.
Verification: Source image Git blob SHA-1 values match local image-file Git hashes; local JS passes Node syntax check. Browser rendering could not be checked in the restricted runtime; public deployment must be checked separately.
Editorial policy: photograph files are as supplied; no AI imagery or generated substitutions. Site contains adult nudity and should be reviewed for participant consent and applicable hosting/age-access requirements before promotion.
Editor: separate local-only editor, not hosted publicly; editing does not sync automatically with production.

Next: Verify production URL and gallery functionality, then decide whether to link more prominently from the main homepage.
