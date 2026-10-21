# Alejandro Molinari / Photography handoff

Date: 2026-10-21
Goal: consolidate two overlapping photography portfolios into **one** canonical route and preserve all ten original photographs.
Canonical route: `/photography/`.
Old route `/photo-work/` now has an HTML/JavaScript redirect preserving `#nocturne`, `#after-hours`, `#negative-space` hashes. There is no second active portfolio page.

Editorial direction: preserved warm analog-paper look and old-style serif typography from the former Photo Work layout. Removed sentimental hero text and flowery descriptions. The table of contents scrolls to one independent gallery section per series, rather than swapping the entire gallery.
Series order: Nocturne first (5), After Hours second (4), Negative Space third (1).
Photo carousel frame never changes its size while paging. All photographs use `object-fit:contain`, so there is no crop. Original image files are self-hosted at `photography/assets/`.
Photo references `nocturne-02.jpeg` through `nocturne-05.jpeg` reuse exact GitHub Git blob SHAs of the originals previously hosted in `photo-work/images/nocturne/`; all 10 hashes checked against original Drive-mounted files.
Files: `photography/index.html`, `photography/style.css`, `photography/archive.js`, `photography/gallery.js`, `photo-work/index.html`, `alejandro-molinari.html`; readmes updated.
The artist page retains links to one canonical photography URL, no duplicates. No modifications to homepage, PV LAB, Nina or related worker code.
The old photo-work CSS, JS and image archive remain inert for rollback/compatibility; they are not referenced by the active page.

Local QA: Chromium rendered the self-contained page at widths 320, 360, 375, 390, 430, 680, 768, 1024, 1440 px. Verified no horizontal overflow, ten original file hashes match, three galleries with correct counts, first images load when brought into view, no JavaScript errors, and After Hours photo stage unchanged in height after advancing.
The old personal/private browser editor is stored in the user's Google Drive, not deployed publicly.
Consent: the photographer confirmed original authorship and that the models approved publication. The portfolio contains artistic nudity (18+), maintains a discreet noindex directive.
Status (2026-10-21): PR #381 merged into main as commit 080466a797b945cc0db139f159314861bb84e232. All six reported checks completed successfully for that commit: GitHub Pages build/deploy/report, Validate, Approved Image UI, and Cloudflare Pages. The canonical route is /photography/; /photo-work/ redirects. Direct HTTP access to parallelvisionlabel.com could not be verified from this runtime due to network/DNS restrictions. The owner can visually review the canonical URL on iPhone. 
Next: verify deploy checks and public route after merge; add any new photographs solely in the canonical manifest.
