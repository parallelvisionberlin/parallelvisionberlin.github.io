# Berlin 2063 / Gallery work state

Date: 2026-10-30
Repository: parallelvisionberlin/parallelvisionberlin.github.io
Branch: main
Verified code commit: ab4c7e2496ce73129d3a9a54e6f2e96a8f8a5c9a

## Gallery order update, 2026-10-30
- Objective: place Organic Futures before After the Collapse on the Berlin 2063 overview.
- Base verified: bf65ef6 on main; this entry is committed with the page change.
- Changed `berlin-2063.html`: world order is Hyperfuture Berlin, Berlin 2063, Organic Futures, After the Collapse.
- Organic Futures is now 03; After the Collapse is now 04, including EN/DE labels.
- Moved complete gallery sections with images, captions, controls, context and links intact.
- Verification: exact section-preservation assertions and `git diff --check` passed. No CSS or JavaScript changes.
- Publishing: ready to push to main; public propagation still requires verification.
- Existing gallery and Chromia notes below describe the earlier recorded work, not a fresh asset audit.

## Completed
- Removed the Organic Futures slide with dark futuristic vehicle at `assets/optimized/2063/organic-futures/night-transit.webp` from `berlin-2063.html`.
- Organic Futures now contains 6 slides instead of 7. The source image asset was left in the repository so any other references are unaffected.
- Added the user-provided "LOOK 01 / LIQUID CHROME VEIL / BERLIN 2063" design sheet to Chromia's `03 / Lookbook sheets` section.
- New site image `assets/optimized/chromia-liquid-chrome-veil-look-01.jpg`, 1235 x 821 pixels, 93452 bytes.
- Updated `chromia.html`, making this new sheet a full-width first lookbook item; existing images remain in place.

## Verification
- Confirmed new file blob exists on main, SHA `3f196baca3ea9d9c1d6a71f13f00c549568fe608`.
- Confirmed `chromia.html` references the new image once.
- Confirmed `berlin-2063.html` no longer references `night-transit.webp` in the Organic Futures carousel.
- Changes pushed to GitHub main. Production CDN/browser propagation has not been independently verified.

## Worldbuilding direction under discussion
- Berlin 2063 may use retractable residential structures extending from surface apartments into protective subterranean levels during conflict, severe weather, or infrastructure crises.
- Geomagnetic storms mainly endanger technological infrastructure; a protected offline residential mode is more credible than requiring shelter from direct surface exposure.
- This is a creative concept for future imagery and lore, not a committed change to public gallery copy.

## Next
- If editing visuals, prioritize realistic inhabited architecture and historical Berlin continuity; avoid giant holograms and generic glossy sci-fi.
- Verify updated public galleries directly after deployment before claiming a live release.
