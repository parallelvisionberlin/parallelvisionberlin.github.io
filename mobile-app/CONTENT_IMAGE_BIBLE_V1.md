# PARALLEL VISION MOBILE
## Content & Image Bible / V1.0 / 08 October 2026

**Project:** Parallel Vision native mobile app
**Repository:** `parallelvisionberlin/parallelvisionberlin.github.io`
**Branch:** `mobile-app-v1`
**Code inspected:** `mobile-app/src/DeckScreens.js`, `site05Model.js`, `site05Assets.js`, `SiteMedia.js`, `ProjectReader.js`, `NativeAccount.js`, and public project page source.
**Status:** Approved-direction editorial brief for implementation. This document does not itself modify the app UI or replace images.

### Product definition

The mobile app is the personal entrance to Parallel Vision: music to listen to, Nina to speak with, and the Berlin 2063 archive to explore. In future it may include spatial/VR access to world environments, but no VR card or dead button should appear until a real experience exists.

Keep the existing five tabs: Home, Nina, 2063, Music, Profile. Each one must have a distinct job:

| Tab | Role | Primary action |
| --- | --- | --- |
| Home | Entrance to the app | Choose Nina, 2063, or Music |
| Nina | Conversation with Nina Fok | Talk to Nina |
| 2063 | Browse canonical world chapters | Open project |
| Music | Play the label's actual releases | Select and play release |
| Profile | Account, access, continuity | Sign in / manage account |

Avoid repeating the same Berlin 2063 hero or introduction across Home and 2063.

---

## 1. Final on-screen copy

Use the text below literally as the proposed replacement wording. Keep button casing appropriate to the existing design system.

### HOME

**Eyebrow:** `PARALLEL VISION / INDEX`

**Title:** `PARALLEL VISION`

**Lead:** `Music, moving image and a city that doesn't exist yet.`

**Entry 01:** `NINA FOK`

**Entry 01 description:** `Speak with Nina.`

**Entry 02:** `BERLIN 2063`

**Entry 02 description:** `Explore the city and its archives.`

**Entry 03:** `MUSIC`

**Entry 03 description:** `Listen to the label.`

Entries are tappable cards. Avoid decorative arrow buttons nested inside already-tappable cards.

### NINA

**Eyebrow:** `NINA FOK / LIVE`

**Title:** `NINA FOK`

**Lead:** `She's in Berlin, 2063. Speak with her live.`

**Main action:** `TALK TO NINA`

**Secondary action:** `ABOUT NINA` (opens the existing Nina project page)

**Optional account prompt, signed out only:** `Sign in to manage your access and Signal Credits.`

Do not claim that a session is live or that memory is synchronized until actual authenticated state confirms it. Preserve real Nina live-call flow and its microphone permission and privacy behavior.

### 2063

**Eyebrow:** `PARALLEL VISION / WORLD ARCHIVE`

**Title:** `BERLIN 2063`

**Lead:** `Architecture, fashion and moving images from a possible Berlin.`

**Chapter 01:** `THE CITY`
**Chapter 01 description:** `Structures, streets and everyday life in a transformed Berlin.`
**Destination:** `/berlin-2063.html`

**Chapter 02:** `FASHION AFTER FABRIC`
**Chapter 02 description:** `New forms of clothing, material and identity.`
**Destination:** `/future-fashion.html`

**Chapter 03:** `MOVING TRANSMISSIONS`
**Chapter 03 description:** `Films, loops and projections from the archive.`
**Destination:** `/moving-transmissions.html`

The third project already exists on the site. **Do not rename it to 'Transmission' and do not invent a fourth chapter.** The current app model lists all three, but the third preview is blank because its `image` is `null`.

**Chapter action:** `OPEN CHAPTER` (whole card should activate existing ProjectReader).
**Project reader actions:** `BACK`, `CLOSE`, and `TRY AGAIN` on actual error.

### MUSIC

**Eyebrow:** `PARALLEL VISION / MUSIC`

**Title:** `CURRENT SIGNALS`

**Lead:** `Listen to Parallel Vision, here.`

Keep these existing verified playlist/source mappings as the initial list:

| Number | Title | Artist | Type |
| --- | --- | --- | --- |
| 01 | `STAY LOW` | `MOLINARI × NINA FOK` | Single |
| 02 | `TANZEN IM KREIS` | `ALEJANDRO MOLINARI` | SoundCloud set/playlist |
| 03 | `DARK ROCK EP` | `BLEX` | SoundCloud set/playlist |
| 04 | `BUILT TO LAST EP` | `REFRAKT` | SoundCloud set/playlist |

**Selected-release label:** `SELECTED RELEASE`
**Open-player label:** `LISTEN`
**Provider fallback:** `Tap play in the player if your phone doesn't start automatically.`
**Error:** `The player couldn't load. Try again.`

Do not invent a true 'Now Playing' state if the SoundCloud WebView has not confirmed playback. Do not add 'Sube' or any unretrieved release until its final master, official artwork and working playback URL are wired and tested.

### PROFILE

**Eyebrow:** `PARALLEL VISION ID`
**Signed-out title:** `Sign in`
**Signed-out lead:** `Your account, Nina access and Signal Credits.`

**Actions:** `CONTINUE WITH GOOGLE`, `SIGN IN WITH EMAIL`, `USE EMAIL CODE`, `CREATE ACCOUNT`.

**Signed-in title:** `YOUR ACCOUNT`
**Account sections:** Profile, Signal Credits, Redeem code, Billing, Memory, Newsletter, Refer a friend.
**Primary account action:** `TALK TO NINA`.
**Secondary action:** `SIGN OUT`.

Keep account details accurate; do not show fake balances, memory state, time remaining, or playback history. Remove `LOGIN 03 / BRIDGE 01 ...`, `SITE COHESION / ...`, and other internal build identifiers from user-facing pages.

---

## 2. Image direction and asset briefs

### General art direction

Think of one photographed, inhabited world, not a compilation of unrelated AI artwork. Archival photography and European fashion-editorial discipline, with visible real materials, normal optical depth and imperfections. Keep the interface black/off-white and let imagery carry restrained color: slate blue, concrete grey, tungsten amber, muted mineral tones. Atmospheric does not mean perpetually dark or depressing.

**Avoid:** rain-soaked neon cyberpunk clichés, ubiquitous flying cars, made-up city logos, random holograms, plastic-looking people, fashion from different visual universes, oversaturated magenta, implausible architecture, and typography baked into image files.

**Export policy:** images without titles or buttons baked in. Use JPEG/WebP for photographic art; retain an approved full-resolution original and make mobile-specific crops. Create 1x and 2x (or equivalent density) responsive derivatives. Alt/accessibility descriptions must correspond to the image. Keep all important people and architectural features out of UI text-safe zones.

### Asset 01: HOME HERO / `pv-home-hero`

**Status:** replace the current repeated city video/still only once an approved asset is available.

**Format:** master 1600×2400 or greater, 2:3 portrait crop; optional 5–8 second muted loop plus matching first-frame poster.

**Composition:** a human-height viewpoint at the threshold of a future Berlin, viewed from a deep concrete pedestrian arcade. Outside: one enormous but plausible structure, tram or rail infrastructure, a few inhabited windows, two distant people. Distinct foreground/midground/background. A believable real place with evidence of daily life. Cool exterior light and one warm interior light source. Retain readable darkness in the lower-left 30% for title and subtitle. Don't place faces or key architecture under the navigation/status bar.

**Generation-ready brief:** `Editorial architectural photograph of an imagined Berlin in 2063, observed from a deep concrete passage at human eye level. One layered rail corridor and inhabited brutalist building beyond, distant pedestrians, wet stone, aged surfaces, restrained tungsten light, atmospheric depth with believable construction and perspective, quiet and lived-in, subtle 35mm film texture, photographic realism. Vertical 2:3 composition, generous shadowed negative space lower left for app typography, no text, no logos, no spaceships, no flying cars, no neon billboard spectacle.`

**Purpose:** an entrance, not another image from the 2063 chapter grid. The three entrance cards must start within reachable scroll distance.

### Asset 02: NINA HERO / `pv-nina-hero`

**Status:** highest priority replacement, after review against approved Nina identity references.

**Format:** 1600×2400 vertical, 2:3 or 3:4 safe master; optional 6–8 second very subtle loop with exact matching still. Film and poster must be the same composition.

**Identity requirement:** use the approved Nina Fok master references. Identity, face shape and hair are locked to canon; don't invent a similar-looking model. No extra person.

**Location:** an intimate **enclosed** concrete room without windows, not a dungeon, temple, nightclub or showroom. Cast-concrete surfaces, subtle warm indirect lighting, tactile seating/fabric and enough personal detail to feel inhabited. Not depressive. This is a room where someone can have a real conversation.

**Framing:** Nina seated or standing naturally, 3/4 to camera. Face fully visible, clearly in focus, around the central 35–65% of image width and upper 18–55% of image height, leaving roughly the lower-left 28% quiet for the title/CTA. Do not crop her face at the right edge as in the current phone screenshot. Subject is more important than room.

**Generation-ready brief:** `Photographically real portrait of Nina Fok using the supplied approved identity references with strict face identity consistency. Nina sits comfortably inside a refined enclosed cast-concrete room in the Berlin 2063 world, no windows, soft warm indirect practical lighting, tactile upholstered furniture, a few personal objects, subtle mineral surface variation, inviting and inhabited rather than gloomy. Nina appears calm, attentive and emotionally present, natural posture, quietly distinctive clothing, precise facial anatomy and skin texture, subtle 35mm grain, real camera optics. Vertical 2:3, face fully inside the central safe crop, lower left kept clear for the TALK TO NINA interface, no theatrical masks, no nightclub lighting, no glossy synthetic skin, no text.`

**Animation direction:** breathing, small eye movement and a slight shift in posture; never a dramatic camera orbit or artificial lip movement unless it's actually synchronized with the live conversation. Avoid confusing the app introduction with the real interactive Nina call.

### Asset 03: 2063 INDEX HERO / `pv-2063-index`

**Status:** different composition from Home; avoid repeating one skyline image in both places.

**Format:** 4:3 or 3:4 crop-safe image for a short, restrained banner rather than a screen-sized collage.

**Composition:** architecture close enough to study. Layers of concrete, elevated transit, pedestrian scale, traces of maintenance and use. One restrained focal point. Less skyline spectacle and much more physical credibility. Title overlays should have a controlled shadow/gradient, not text over a bright complex street scene.

**Generation-ready brief:** `Photographic urban-form study in imagined Berlin 2063. Elevated pedestrian and rail infrastructure interwoven with inhabited concrete buildings, small human figures providing scale, visible seams, weathering, practical lighting and credible engineering. Editorial European architectural photography, muted mineral palette, thin atmospheric haze, careful linear perspective. Quiet, monumental but lived-in, no sci-fi clichés, no flying vehicles, no holographic advertisements, no text. Composition for a compact mobile banner with readable negative space behind lower-left title.`

### Asset 04: THE CITY CHAPTER THUMB / `pv-city-thumb`

**Format:** portrait 3:4, minimum 900×1200.
**Content:** specific street-level view, close to infrastructure with a readable human figure for scale; should be visibly different from the Home hero and the index banner.
**Source preference:** curate from existing approved Berlin 2063 gallery before generating anything.
**Crop:** subject stays intact in 74×94 point thumbnail.

### Asset 05: FASHION AFTER FABRIC THUMB / `pv-fashion-thumb`

**Format:** 3:4, minimum 900×1200.
**Content:** one approved sculptural clothing look or material study from the real Fashion After Fabric archive. Full or three-quarter silhouette, enough physical material texture to feel like an actual fashion photograph. Choose a recognized garment/look from the existing project instead of generating a different fashion collection.
**Source preference:** `assets/optimized/fashion-hero.webp` or another approved artist-study visual already published at `/future-fashion.html`.
**Crop:** body and garments clearly visible even when displayed very small; no text or graphic overlays.

### Asset 06: MOVING TRANSMISSIONS THUMB / `pv-transmissions-thumb`

**Status:** urgent. The current model uses `{image:null}`, so the third project has no illustration.

**Format:** 3:4, minimum 900×1200.
**Source first:** the existing active `Robo Loop` film/poster at `assets/optimized/video/releases/tanzenimkreis/robotloop-poster.webp` shown on `/moving-transmissions.html`; evaluate the crop for legibility. Do not invent a still from an unreleased loop.
**Direction if new poster needed:** captured-looking projected moving-image fragment, distinct subject silhouette/machine body on a screen or surface in an actual room, minimal light and a believable photographic camera. This project is about moving image for screens and spaces, not another urban skyline.

### Asset 07: MUSIC ARTWORK / `pv-music-covers`

**Format:** 1:1 release covers, minimum 1200×1200, preferably original mastered artwork exports.
**Source:** the approved actual covers for the four releases in `site05Model.js`. The app already bundles Stay Low-derived art as `assets/site05/stay-low.jpg`. The other covers should be fetched from their official Parallel Vision release masters before use.
**Layout:** one larger selected-release cover and small square thumbnails in list rows. Never regenerate the original cover art or change artist typography. EPs remain playlists inside the player.
**Playback:** artwork is a visual indication of selection, not proof audio is actually playing.

### Asset 08: PROFILE

**Artwork:** none. Profile is intentionally typographic: real account details, controls and accurate balances. No decorative avatar unless the user has actually selected one.

---

## 3. Existing source-to-slot map

| Code location | Current asset / value | Proposed treatment |
| --- | --- | --- |
| `DeckScreens.js` Home Hero | `siteAssets.cityVideo` / `cityPoster` | Replace with approved home media and matching poster. Do not reuse as 2063 chapter art. |
| `DeckScreens.js` Nina Hero | `ninaVideo` / `ninaPoster` | Replace with approved Nina in enclosed concrete room; strict identity and safe crop. |
| `DeckScreens.js` 2063 Hero | `siteAssets.city` | Separate art from Home, reduce busy overlay area. |
| `site05Model.js` project 01 | `image:'city'` | Curate street-level 3:4 city thumbnail. |
| `site05Model.js` project 02 | `image:'fashion'` | Use approved Fashion After Fabric archival photograph. |
| `site05Model.js` project 03 | `image:null` | Bundle moving transmission poster and set real image key. |
| `DeckScreens.js` Music | Titles only | Add original cover thumbnails; keep embed URLs intact. |
| `DeckScreens.js` Profile | Text/form | Keep image-free; remove internal version/debug strings. |

**Specific code finding:** `DeckScreens.js` supplies `contentPosition` to `SiteFilm`, but `SiteMedia.js` does not accept that prop and sets the native video `contentPosition` to `{dx:0,dy:0}`. This means requested video crop offsets are not honored. Fix the component's crop interface and poster crop consistently before finalizing Nina and Home hero composition.

---

## 4. Implementation and acceptance

1. Keep the app on `mobile-app-v1`; do not touch Nina's production website, Anam voice engine, Worker, or authentication for this visual pass.
2. Add this copy to `site05Model.js` / `DeckScreens.js` without creating new canon chapters or misleading states.
3. Replace the blank third image first with its existing Robo Loop poster or another *approved current* transmission still.
4. Curate Home, Nina, City, Fashion, Music from their own authoritative source images, not unrelated internet results. Preserve originals.
5. Fix `SiteFilm` position handling so first-frame poster and video crop identically.
6. Simplify 2063 card layout: one image per project, 3:4 thumbnails, black cards, consistent spacing, legible title; no image behind the whole list.
7. Music must have one selected release at a time. SoundCloud must continue playing in-app where supported; don't show a false native-playback indicator.
8. Validate screens on small and standard iPhone widths, with large text, notches and bottom nav. Ensure all essential faces/titles/cards are visible and tappable.
9. Only publish after real-device checks for Nina call, account sign-in, image and video fallback, project navigation and audio playback.

**Acceptance criteria:** Five distinct sections; three correct chapters and three visible thumbnails; Nina's whole face visible and canon-consistent; the Home and 2063 hero no longer duplicate; music art uses originals; no placeholder technical labels; no dead VR buttons; no unintended changes to Nina's live-call backend.

**Do next in this order:** (1) restore project 03 image, (2) fix visual crop logic, (3) replace Nina hero with approved canon asset, (4) distinguish Home/2063, (5) bring in original release artworks, (6) test device navigation and media.
