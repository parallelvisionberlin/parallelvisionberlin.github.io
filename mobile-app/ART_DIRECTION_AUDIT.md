# Parallel Vision Mobile: image and experience audit (08 Oct 2026)

Status: review branch only. No new Expo builds and no modifications to the installed iPhone app.

## What failed in builds 13 and 14
- Home was a tall film/poster with the three actual app actions below the initial viewport. The film also went black on the real iPhone in build 13.
- Nina's section placed a tall image into a short fixed viewport with absolute positioning. It cut off her face in build 14.
- Switching from a mask-wall image to another portrait did not fix the faulty layout. The source media was not the primary defect.
- The app should focus on three real actions: speak to Nina, listen to music, explore Berlin 2063. Future VR should remain future scope.

## Existing sources selected, no generative imagery
- Nina hero: `assets/optimized/nina-fok/Canon.webp`. Existing canonical close portrait, frontal face, dark background, wide composition that shows fully at its natural ratio.
- Home Nina chapter image: `assets/optimized/nina-fok/nina-window.webp`. Nina through scratched glass with city reflections, original archive photograph.
- Home Berlin image: `assets/optimized/2063/urban-form/berlindystopianii.webp`. Existing archive panorama with a more lived-in city scale than the vehicle POV still.
- Existing official music artworks and 2063 chapter images are unchanged.

## Concrete implementation
- **Nina**: intrinsic 512:288 wide image, `resizeMode="contain"`, never an absolutely positioned oversize portrait. Title and real TALK TO NINA action directly below.
- **Home**: reduce hero to 215-290 native points based on screen height; remove repeated oversized PARALLEL VISION title over the image; place the main purpose and three working actions under it in order Nina, Music, Berlin 2063.
- **No prompt changes**: Live Nina, Anam, Clerk auth, Cloudflare Worker, Signal Credits and SoundCloud sources are untouched.
- **Review process**: verify with Node checks, React component interaction tests, iOS Expo export, and browser previews at 320 and 390 widths before merging into mobile-app-v1 or using another EAS build.

Source art selection is based on accessible existing GitHub Parallel Vision assets. The private Cloudflare R2 Nina image master bank is not mounted in this environment, so this audit does not claim to have inspected its entire collection.
