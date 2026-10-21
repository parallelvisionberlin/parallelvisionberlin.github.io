# Alejandro Molinari / Photography

The only active photography portfolio is `https://parallelvisionlabel.com/photography/`.

- The older `/photo-work/` URL redirects to `/photography/` and preserves gallery deep links.
- `index.html` holds the unified editorial page with a table of contents and seven separately scrollable gallery sections.
- `style.css` keeps a fixed-size, uncropped image stage across changes, including mixed orientations.
- `archive.js` is the single source of truth for gallery ordering, photograph metadata and paths.
- `gallery.js` builds sections from the manifest and handles arrows, swipe, keyboard, counters, film marks and hash navigation.
- The 47 photographs live under `assets/`. JPEG uploads are preserved byte for byte; the large TIFF has a colour-managed, uncropped 2048px JPEG display export. No retouching, aesthetic filters or AI generation were applied.

Current order: **Nocturne (13 photographs), After Hours (11), Negative Space (2), Day (3), Night (5), Amber Room (4), Silver Room (9)**.

Day is the colour forest series; Night is the black-and-white forest series. These are editorial titles, not claims about capture times. Their source filenames are preserved in `assets/day/` and `assets/night/`. All 41 newly supplied files are preserved in the private photographic archive, including the alternate JPEG `DSCF9053(1).JPG`; only `DSCF9053.JPG` is displayed, avoiding a repeated composition. Colour interiors extend After Hours and monochrome interiors are collected in Silver Room, and `DSCF1351.JPG` joins the existing rocky outdoor study in Negative Space. The unmodified `DSCF0813.tif` master stays in the private archive; `assets/silver-room/DSCF0813.jpg` is its web export.

Later uploads extend Nocturne with night flash and road studies, and After Hours with interior studies. Three alternate exports are retained privately rather than repeated publicly: DSCF9053(1).JPG, Untouched by Time.jpg (the existing high-resolution nocturne-05 is reused with that title), and IMG_1273.jpg (the full flower composition IMG_27231.jpg is displayed). IMG_1345(1).jpg is byte-identical to IMG_1345.jpg and reuses that existing source. The visually similar 4647EC53 photograph is a separate exposure with crossed hands, so it is included. Duplicate review covers every original and newly supplied photograph, including re-encodes and alternate crops.

Amber Room contains the warm colour session; Silver Room gathers monochrome interiors from the whole catalogue. The rooftop night photograph is in Nocturne. All 47 public photographs use the same original carousel and uncropped stage.

The user's original JPEGs and private editing materials remain in the personal Google Drive photographic archive. The editor is not publicly hosted. When publishing another photograph, add the original file to `assets/` and a matching item to `archive.js`.

The gallery is intentionally marked `noindex`, with an artistic nudity notice. Publication permission was confirmed by the photographer in the chat on 2026-10-21. There is no claim of formal legal review.

See `WORK-STATE.md` for the most recent deployment verification.
