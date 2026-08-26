# Parallel Vision performance audit

## Summary

The main loading bottleneck was direct delivery of large PNG artwork and autoplay MP4 files from GitHub Pages. GitHub Pages serves those files as committed and does not create responsive or compressed derivatives.

This pass keeps every original asset untouched and adds 76 WebP derivatives under `assets/optimized/`. The source images represented by the optimizer total approximately 430.5 MB; their optimized derivatives total approximately 6.9 MB, a reduction of about 98%.

## Largest original assets found

| Original asset | Approximate size |
| --- | ---: |
| `assets/01RADIUM-FRONT.png` | 24.46 MB |
| `assets/fashion-after-fabric/artists/amatista/heroamatistafashion.mp4` | 23.69 MB |
| `assets/fashion-after-fabric/artists/amatista/amarantaherofashion.mp4` | 23.33 MB |
| `assets/chromia-phase-aureole-sheet.png` | 22.69 MB |
| `assets/releases/tanzenimkreis/cabisitlower.png` | 21.63 MB |
| `assets/LOOK04.png` | 21.43 MB |
| `assets/Ravesiaremixesart.png` | 21.30 MB |
| `assets/molinarifashionfilmhero1.mp4` | 21.20 MB |
| `assets/ebers2063.png` | 20.98 MB |
| `assets/chromiavesselhero.png` | 19.80 MB |
| `nina-fok/ninaloophero.mp4` | 18.08 MB |
| `assets/ninamain.png` | 16.46 MB |
| `assets/thecitysuperhd1.png` | 14.88 MB |
| `assets/2063/darkharmonyhero.mp4` | 14.15 MB |

## Optimized replacements

The optimizer mirrors useful source paths beneath `assets/optimized/` and writes WebP files with role-based limits:

- Hero posters: up to 1800 px wide, quality 78.
- Normal editorial and gallery images: up to 1400 px wide, quality 78.
- Square release artwork: up to 900 px wide, quality 80.
- Press and proof screenshots: up to 900 px wide, quality 78.

Examples:

- `assets/2063/POV DARK HARMONY.png` → `assets/optimized/2063/POV DARK HARMONY.webp` (about 127 KB).
- `assets/LOOK04.png` → `assets/optimized/LOOK04.webp` (about 129 KB).
- `assets/Ravesiaremixesart.png` → `assets/optimized/Ravesiaremixesart.webp` (about 54 KB).
- `assets/2063/urban-form/urbangalleryfirst.png` → `assets/optimized/2063/urban-form/urbangalleryfirst.webp` (about 187 KB).
- `assets/releases/tanzenimkreis/Metrosolo.png` → `assets/optimized/releases/tanzenimkreis/Metrosolo.webp` (about 69 KB).
- `nina-fok/HDNINACANON.png` → `assets/optimized/nina-fok/HDNINACANON.webp` (about 65 KB).

## Pages and loading behavior updated

- `index.html`: optimized hero poster and all page imagery; hero MP4 source is assigned after first paint during idle time on capable desktop connections.
- `tanzen-im-kreis.html`: optimized cover, archive frames and proof cards; robot-loop source is deferred; SoundCloud remains deferred; YouTube remains lazy with its fallback link.
- `berlin-2063.html`: optimized hero and all gallery sources; gallery images use lazy loading, asynchronous decoding and low fetch priority.
- `future-fashion.html`: optimized posters and editorial imagery; hero video is deferred; below-the-fold videos load near the viewport and pause after leaving it.
- `nina-project.html`: optimized hero and city posters; its two editorial MP4s use the same deferred/near-viewport strategy. The Anam interaction video and Nina application logic were not changed.
- `nina-fok.html`: already used the small `ninamain-page.webp`, so no markup change was necessary.
- `css/home.css`: the fixed blend-mode texture is disabled on small screens and for reduced-motion users.
- `js/home.js`: adds the deferred homepage hero loader without removing the existing loop/recovery behavior.

On `saveData` or `prefers-reduced-motion`, decorative hero and editorial video sources are not assigned. On screens up to 760 px, hero video loading waits for user interaction instead of competing with first paint. Desktop users on normal connections retain autoplay after the source is assigned.

## Expected improvement

The first visible image can now arrive as a roughly 65–190 KB WebP rather than a multi-megabyte PNG. Below-the-fold galleries no longer point at 2–12 MB originals, and large MP4 downloads do not begin during HTML parsing. On slow mobile connections this should remove the largest causes of the reported long blank/loading period and substantially reduce initial transferred bytes, decoding work and GPU composition cost.

## Remaining heavy originals

Originals are intentionally retained for archival quality. Several large files are not loaded by the optimized priority-page paths, including:

- `assets/releases/tanzenimkreis/cabisitlower.png`
- `assets/ebers2063.png`
- `assets/chromiavesselhero.png`
- the Amatista artist hero videos
- `assets/molinarifashionfilmhero1.mp4`
- large media used by individual artist and collection pages

Those should be converted or deferred when their specific pages receive a performance pass. No originals should be deleted until all uses and archival requirements are reviewed.

## Regenerating optimized images

Install dependencies and run:

```sh
npm install
npm run optimize:images
```

Existing outputs are skipped. To rebuild them after source changes:

```sh
npm run optimize:images -- --force
```

The source pages and extra poster list are defined in `scripts/optimize-images.mjs`.
