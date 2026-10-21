import {HONG_KONG_FILM_FINISH,filmFinishSettings,createFilmFinishControls} from './film-finish.js?v=20261013-green-preserving-v3&hkRestore=20261018v1&hkFilmV8=20261019&hkLight=20261021v10';
import {HONG_KONG_VARIANTS,hongKongVariant} from './hong-kong-variants.js?v=20261018-user-originals2&hkRestore=20261018v1&hkFidelity=20261018v2';
/* PV Lab Moods V1. Editorial generation directions, not pixel filters. */
const ALL_MOODS=Object.freeze([
  {
    "id": "dream-blur",
    "name": "Dream Blur",
    "category": "Analog",
    "preview": "/lab/mood-previews/dream-blur-20261015.jpg",
    "description": "Original-frame long exposure, intimate analog film grain and imperfect light leaks",
    "defaultIntensity": 78,
    "direction": "DREAM BLUR V2 / ANALOG OPTICAL TRANSFORMATION OF THE ORIGINAL. When a Base photograph is supplied, that photograph is the sole authority for subject, identity, facial structure, hair, body proportions, person count, pose, direction of gaze, wardrobe and skin coverage, camera viewpoint, distance, framing, crop, architecture, objects and background. KEEP THE SAME PHOTOGRAPHIC MOMENT. A full-body image remains full-body and a rear view remains a rear view. Do not replace the image with a close-up, an overlaid new face, a new person, a different outfit or an invented editorial location. The four built-in Style photographs are OPTICS ONLY: study their real handheld streaks, not their people, compositions or environments. Apply imperfect slow-shutter light drag and colored light leaks THROUGH THE EXISTING SCENE, motivated by plausible lights and slight camera movement. Luminous smears may cross the subject but must not change its geometry. FILM: distinctly tactile late-1980s/1990s pushed 35mm color negative scanned from analog film, dense uneven emulsion grain on skin AND shadows, subtle dye-layer drift, restrained chromatic fringing, halation around genuine highlights, irregular creamy bloom, imperfect shoulder roll-off and deep grainy black areas. Source-adaptive color: preserve existing ambient warmth, green or daylight; do not paint every input cyan. The result must look like the original photograph caught with a slower shutter and imperfect film stock, not AI concept art.",
    "routing": "READ THE BASE FIRST. PORTRAIT -> original face location, camera distance and expression remain; streak light through existing highlights, never overlay a larger eye or head. FULL BODY -> retain whole body, pose, background and crop exactly, with light passing in front or behind. REAR VIEW -> keep rear view, no facial reconstruction. ARCHITECTURE -> retain room and objects, only change exposure behavior. NO BASE -> follow the text prompt; 16:9 framing. Style photos never supply subjects or settings.",
    "subtle": "1–34%: gentle physical light drag, analog soft focus and integrated high-ISO 35mm grain; source framing unchanged.",
    "moderate": "35–69%: visible imperfect streaks anchored to real light, warm/cool halation, analog color drift and persistent fine-to-moderate grain; same scene.",
    "immersive": "70–89%: generous but believable in-camera light smearing, strongly palpable emulsion grain, creamy diffusion and shadow noise; original framing, subject and setting stay fixed.",
    "intense": "90–99%: long imperfect light trails and intense film damage-like highlight bloom; KEEP same person, entire pose, camera distance, crop and location.",
    "climax": "100%: maximum real shutter streaks, light leaks, halation and pushed-film texture OVER THE SAME FRAMING. The original face, body orientation, wardrobe, scene and number of people remain. Never recrop, insert another face or stage a different photograph.",
    "compact": "DREAM BLUR V2: faithfully EDIT the Base photograph rather than recreating it. Preserve same person, face, hair, body, pose, wardrobe, skin coverage, whole composition, crop, camera distance and location. No close-up overlay or invented background. Four Style references are OPTICS ONLY. Real handheld long-exposure streaks across existing lights, imperfect halos and slow-shutter smears on the SAME scene. Retro 1980s/1990s pushed-35mm scan: embedded uneven film grain, shadow texture, chemical color drift, source-bound halation and gently clipped highlights. Colors follow the source, not a uniform blue filter.",
    "compactRouting": "BODY -> keep full body and original view; FACE -> same scale and position; ROOM -> same furniture and perspective; TEXT ONLY -> follow subject, 16:9.",
    "compactSubtle": "minor directional light streaks, old-film grain and softly exposed highlights",
    "compactModerate": "realistic light dragging, aged film texture and analog soft focus",
    "compactImmersive": "strong source-bound light leaks with source frame unchanged and dense 35mm grain",
    "compactIntense": "large practical streaks and deep film shadows; no new crop or subject",
    "compactClimax": "maximum analog motion and grain over original composition, never replace image",
    "avoid": "different person or face, superimposed giant eyes, inserted portrait overlays, changed viewpoint or image crop, newly invented places, scene replacement, additional people, altered body proportions, different clothing, face beautification, airbrush skin, modern sterile digital rendering, uniformly blue tones, neon laser graphics, digital vector streaks, pasted noise overlay, fake film borders, duplicate anatomy, lettering",
    "compactAvoid": "new face, face overlay, altered crop, body change, new location, different outfit, digital lasers, modern glossy plastic skin, flat tint, pasted noise"
  },
  {
    "id": "midnight-reverie",
    "name": "Midnight Reverie",
    "category": "Cinema",
    "preview": "/lab/mood-previews/midnight-reverie-original-20261011.png",
    "description": "Slow-sync flash, cobalt afterglow and dreamlike 35mm night film",
    "defaultIntensity": 82,
    "direction": "MIDNIGHT REVERIE V2 / SLOW-SYNC FLASH MEMORY. One physical-looking 35mm night photograph, not a blue filter. CAPTURE: a short soft near-axis flash freezes the SAME real face, eyes, skin, hair and clothes, with slightly burned creamy glints and quick natural falloff. A slower ambient shutter exposes vivid cobalt-blue/cyan light in the actual surrounding room, street or background, recording humid luminous air and tiny directional afterimage streaks on moving lights, reflections and loose hair tips. The flash holds a clear face; the blue ambient supplies the moving dream. Relight a clean daylight photograph into physically believable nocturnal exposure across subject AND setting, not just cooler white balance. If an existing flash already makes beautiful warm hot highlights, preserve them rather than double-flash; add nocturnal blue ambient and optical diffusion behind. OPTICS: Black-Pro-Mist-like bloom around real lamps/windows, wide cyan light scatter into depth, soft focus falloff toward outer edges, near-white hot light-source centers, creamy highlight shoulder, visible fine organic pushed-35mm grain and shadow texture. COLOR: saturated cobalt/azure and blue-turquoise ambient against deep petrol-black pockets, with restrained warm flash on real skin and existing amber/red practicals. Keep eyes, lips, identity and materials legible; background and moving reflections may blur, the face must not. Preserve original person, body, wardrobe, camera, composition and recognizable location.",
    "subtle": "1–34%: a faint flash-kiss, blue ambient depth, real practical diffusion and fine film; eyes clear.",
    "intense": "90–99%: narcotic intense cobalt-cyan air, flash-frozen realistic skin, deep blacks, luminous soft bloom and moving-light afterimages; no body blur.",
    "avoid": "uniform cyan cast, global blur, face duplication or double exposure, AI plastic skin, beauty retouch, invented lights or people, added cars/rain, glow outlines, underwater look, greenwashed skin, flat daylight unchanged, impossible anatomy, noisy overlay, film borders, text",
    "routing": "VISUAL SCENE ROUTING from the Base: DAY/FLAT INTERIOR: dim whole room into blue nighttime, shape one soft flash-pop on person with credible shadows and cobalt practical glow behind. EXISTING FLASH: retain hot realistic frontal flash imprint; expose blue ambient and background afterglow, no duplicate flash. DARK INTERIOR/NIGHT PRACTICAL: actual lamp or window becomes a strong soft cyan halo, dark areas stay dark. PORTRAIT: eyes and face crisp, motion drag only on hair tips and background. EXTERIOR: trailing moving lights and dimensional cold air, no invented rain or cars. Single generated exposure, not multiple calls.",
    "compact": "MIDNIGHT REVERIE V2: one slow-sync flash night portrait. Short soft flash freezes original person's face, eyes, skin and outfit; longer cobalt-blue/cyan ambient exposure makes real lamps bloom into humid blue air and moving background lights leave delicate trails. Warm lightly burned flash highlights versus deep petrol-black shadows, strong optical diffusion, mild peripheral lens softness and tactile 35mm grain. Relight flat daylight into night across subject AND setting, never a plain blue cast or doubled body. Preserve identity, camera, clothes and place.",
    "compactRouting": "SCENE: DAY/FLAT -> blue-night room relight plus soft flash imprint; ALREADY FLASHED -> keep warm flash and add blue ambient drag; NIGHT LAMP -> cyan source-bound haze, black gaps; PORTRAIT -> eyes crisp, only moving lights and hair tips smear. No new scene.",
    "ultra": "MIDNIGHT V2: soft flash freezes face while slower cobalt ambient makes cyan practical-light haze and moving background trails. Creamy burned glints, black gaps and film grain, no global blur.",
    "ultraRouting": "DAY -> nocturnal blue room; FLASH -> retain warm flash, add cobalt ambient; LAMP -> source glow; keep same eyes, anatomy, clothes, place.",
    "moderate": "35–69%: obvious flash-frozen subject against saturated cobalt/turquoise night in the same room, strong practical light haze, soft background shutter trails, warm natural skin. Not merely cool white balance.",
    "immersive": "70–89%: voluptuous electric cobalt memory with creamy sharp flash-lit face, deep blue humid glow from actual lamps/windows, trailing distant lights, fine 35mm grain and delicate lens-edge softness, eyes intact.",
    "climax": "100%: sublime cobalt flash dream, near-axis flash freezes real expressive face and warm glints while long blue ambient exposure radiates humid light and drifting highlights behind. Dense blue spatial haze, soft optical highlights, analog grain, no duplicated face or underwater effect.",
    "compactSubtle": "subtle flash, azure night background, real face",
    "compactModerate": "clear warm flash on subject, strong cyan room haze, gentle motion in distant lights",
    "compactImmersive": "vivid cobalt night and soft frozen flash, radiant lamps, sharp eyes, 35mm",
    "compactIntense": "intense blue light source bloom, amber flash accents, dark blacks, only background blur",
    "compactClimax": "maximum flash-frozen subject + radiant cobalt humid light, afterimages behind, single sharp face",
    "ultraSubtle": "faint flash + cobalt ambient",
    "ultraModerate": "flash-frozen person + vivid cyan room",
    "ultraImmersive": "intense cobalt practical haze, sharp real face",
    "ultraIntense": "cyan source bloom, flash and moving light trails",
    "ultraClimax": "maximum blue flash dream, sharp person",
    "compactAvoid": "uniform blue or green paint, blurred eyes, double faces, invented lamps, replacement scene or clothes, CGI neon"
  },
  {
    "id": "hong-kong-nights",
    "name": "Hong Kong Nights",
    "category": "Cinema",
    "preview": "/lab/mood-references/hong-kong-nights/plaza-grill.webp",
    "description": "Humid green night, wet reflections and intimate amber light",
    "direction": "Dreamlike 1990s Hong Kong night-film photography with dense humidity, not a flat teal grade. A single evocative visual language derived from four PRIMARY photographs: green city lights dissolve behind a taxi in nocturnal atmospheric depth; a solitary figure crosses reflective wet pavement between warmly lit shops; a smoky restaurant holds intimate lime-gold tungsten light on real skin against rich black; a green fluorescent tunnel stretches light into spatial falloff. These are references for light, color, air and feeling, never for copying their people, vehicles, sets or city. SECONDARY references contribute deep dark negative space, isolated ruby light, petrol-cyan undertones and real surface texture. The image should feel physically photographed: glowing practicals, scattered humidity, broken reflections on credible outdoor surfaces, imperfect pushed 35mm high-ISO shadow texture and sensual urban longing. Do not add pasted fog, huge grain specks, generic cyberpunk or fake signage. Preserve the subject and physical scene, yet let a neutral exterior become plausibly dusk or night when intensity requests it.",
    "subtle": "Quiet warm/cool photographic separation, delicate humidity near real light sources and natural shadow emulsion. Keep the time, original weather, identity and scene; no pasted light or coarse digital noise.",
    "intense": "High-intensity atmospheric translation: the existing city or exterior may become humid blue-hour or night, with deeper petrol-emerald darkness, practical tungsten/ruby lights blooming into air and plausible damp outdoor ground reflecting those sources. Interiors keep their real furniture and dry floor but gain light-scattered depth. Keep human skin luminous and real, face and garments unchanged, street geometry intact. Include tactile fast 35mm emulsion, never digital-grit or a green LUT.",
    "avoid": "flat teal LUT, plastic green faces, copied reference people, cars, streets or signs, cyberpunk clichés, invented neon, fake indoor rain, wet beds or puddles in rooms, opaque fog overlay, coarse digital white-noise speckles, blurred eyes, harsh sharpening, dirty low-quality photo, changed clothing or architecture",
    "defaultIntensity": 60
  },
  {
    "id": "night-flash",
    "name": "Night Flash",
    "category": "Fashion",
    "preview": "/lab/mood-previews/hd/night-flash-20261011.jpg",
    "previewFull": "/lab/mood-bank/2026-10-11/night-flash/originals/night-flash.png",
    "description": "Raw after-dark photography",
    "direction": "Direct on-camera flash night fashion photography, crisp cast shadows, textured natural skin, convincing specular reflections, dark ambient falloff, candid imperfect framing, early-2000s party photography and tactile clothes.",
    "subtle": "Slight credible direct flash and dark ambient falloff with scene unchanged.",
    "intense": "Punchy flash lighting with deep surrounding darkness and raw nightlife energy.",
    "avoid": "smoothing filters, paparazzi text, hard fake glow"
  },
  {
    "id": "fisheye-2000",
    "name": "Fisheye 2000",
    "category": "Fashion",
    "preview": "/lab/mood-previews/fisheye-2000-20261020.avif",
    "previewFull": "/lab/mood-references/fisheye-2000/02-fisheye-flash.webp",
    "description": "True fisheye perspective, raw Y2K street fashion and direct flash",
    "defaultIntensity": 75,
    "direction": "FISHEYE 2000 / ORIGINAL STREET-FASHION BRIEF. Face: use the uploaded identity photograph as main visual reference if provided. Keep exactly the same face, bone structure, expression and natural skin tone, with sharply illuminated but real skin, no personality changes. Pose: two young city-dwellers in a close-range editorial frame when no Base specifies otherwise; one dominates near the camera, extending an arm toward the lens so the real fisheye exaggerates its foreground scale, while a second stands behind, clearly separated by near/far perspective. Clothing: oversized grey hoodie, black wide-leg trousers, massive silver chain necklace, stacked rings and a small leopard-print accent unless another outfit is explicitly requested. Background: a narrow lived-in Tokyo alley, densely layered Japanese storefront signs, overhead power lines, utility poles covered in stickers, imperfect walls and credible urban clutter. Lighting: bare direct on-camera flash is the key, frontal and hard, with rapid falloff from brilliantly illuminated foreground skin and fabric into naturally underexposed ambient background. Camera: actual Canon EOS 5D Mark IV documentary photograph, true 15mm fisheye lens with curved edges and natural central facial geometry; f/4, ISO 400, 1/200s flash sync. Color: Kodak Portra-like 35mm negative color, gently crushed black levels, saturated signs with restrained natural skin, fine INTEGRATED silver-grain texture, a glossy underground magazine scan. Atmosphere: immediate, candid, bold Y2K street-fashion energy and cinematic street reality. Real proportions, believable joints, true optical barrel distortion and physical depth, not digital warping. User-authored subject, location, wardrobe and person count always take priority over these defaults.",
    "baseDirection": "FISHEYE 2000 / USER PHOTO FIRST. Re-photograph IMAGE 1's exact recognizable people with the same facial identity, hair, natural skin color and expression; preserve the people count, body proportions, wardrobe, skin coverage, primary gesture, relative subject positions and original street/interior/room. Only reinterpret physical camera optics and exposure to look like a real Canon EOS 5D Mark IV 15mm fisheye street-fashion snapshot: foreground objects ALREADY near the lens gain believable near/far scale, building edges curve optically, deep peripheral vignette appears when plausible, central faces stay anatomically truthful. Bare direct on-camera flash, crisp bright fabric and silver speculars, authentic rapid falloff into darker ambient surroundings, muted Kodak Portra-like negative-film color, subtle irregular film texture embedded in actual surfaces and shadows, lived-in 2000s editorial confidence. The original example's Tokyo signage, reaching arm, second person, grey hoodie, massive chain, rings and leopard bag are optional original-brief details, NOT permission to invent them on the Base. User's own instruction may change scene, pose or styling; otherwise keep image identity and narrative.",
    "compact": "FISHEYE 2000 / real early-2000s Japanese alley street-fashion snapshot: dominant near-camera subject with arm towards the true 15mm fisheye lens, second figure in depth when requested, hoodies/baggy trousers/large silver chain and leopard accent as original styling, layered shop signs/powerlines/stickers as scene cues. Real Canon EOS 5D IV on-camera bare flash at f/4 ISO400 1/200s: hard frontal illumination and natural dark falloff. Muted Kodak Portra-like color, tactile shadow grain, strong optical edges and real skin. The user's subject, clothing and setting override these example details.",
    "compactBase": "FISHEYE 2000 / BASE PHOTO FIRST: same recognizable people, facial features, skin, number of subjects, wardrobe, pose, original place and composition. Change only physically believable 15mm fisheye optics, near/far scale and direct-camera flash with fast ambient falloff. Y2K streetwear documentary finish, restrained Kodak negative color, natural skin, integrated fine grain. Do not copy the two Style reference people, Tokyo alley, reaching pose or clothes. User directions override.",
    "subtle": "At 1–34%: visible but modest wide-angle barrel perspective and modest flash punch; preserve recognizable framing, skin and natural location.",
    "moderate": "At 35–74%: convincing documentary wide-angle, hard frontal flash, mildly curved edges and ambient falloff; never add unrelated subjects, wardrobe or signage.",
    "intense": "At 75–89%: strong real 15mm fisheye near/far hierarchy, pronounced optical peripheral curve and black border only where lens coverage warrants, raw sharp flash over credible background exposure.",
    "climax": "At 90–100%: extreme true fisheye viewpoint and near-camera scale ONLY for existing or explicitly requested close objects; protect face geometry, anatomy, outfit, scene, and person count. Not an AI swirl or fisheye overlay.",
    "avoid": "AI-plastic skin, synthetic beauty retouch, symmetry correction, duplicate fingers, exaggerated faces, warped teeth, invented arm, invented second person, fake Japanese text pasted on the customer's environment, generic cyberpunk neon, fake wet streets, blanket grime, pasted grain noise, HDR edge outlines, CGI material, melting architecture",
    "liteAvoid": "plastic skin, reshaped face, cloned subject, invented outfits or streets, paste-on grain, CGI lens and anatomy errors"
  },
  {
    "id": "dreamcore",
    "name": "Dreamcore",
    "category": "Experimental",
    "preview": "/lab/mood-bank/2026-10-11/dreamcore/preview.webp",
    "previewFull": "/lab/mood-bank/2026-10-11/dreamcore/originals/dreamcore-one.png",
    "description": "Luminous skin, pearlescent clothing and immersive dream atmosphere",
    "direction": "PV LAB DREAMCORE V7: Photograph the real subject and place as one immersive dream. Transform the subject, clothing, light, supports and spatial atmosphere together. Preserve identity and camera, not ordinary garment colors or obsolete furniture details. A coherent dream-film treatment covers the whole frame: pearl cyan/lilac/rose color separation, creamy highlight rolloff, softened microcontrast and broad optical diffusion, with readable shadows and texture.",
    "subtle": "SUBTLE 1-34%: Gentle dream-film diffusion, faint halo, luminous skin and restrained clothing color shift; preserve support geometry.",
    "moderate": "ATMOSPHERIC 35-69%: Visible pearly skin and garment color/material shifts, soft light halos and layered mist across subject and space. Keep needed support credible.",
    "immersive": "IMMERSIVE 70-89%: Strong garment recoloring and opalescent material, luminous skin, broad highlight bloom and spatial mist. Adapt incompatible cushions or backrests to the transformed space. Built environments gain radiant openings and deep atmosphere. A shiny jacket and ankle fog alone are insufficient.",
    "intense": "IMPOSSIBLE REALITY 90-99%: Bold pearly garment colors, luminous skin and whole-frame optical diffusion. Integrate subject supports physically; only minimal contact adjustments. One coherent distant light impossibility, real foreground texture.",
    "climax": "MAXIMUM 100%: Complete subject-and-space transformation. Recolor and rematerialize the outfit; skin is unmistakably luminous and pearlescent. Broad optical bloom and a cohesive dream-film grade connect all surfaces. Replace incompatible support details with believable contact surfaces. ORGANIC: luminous water/foam/foliage. ARCHITECTURE: keep the real building and perspective, with extraordinary luminous depth. No ordinary dark outfit left untouched.",
    "avoid": "lost identity, changed body proportions, changed garment cut or coverage, unchanged dark clothing at high intensity, glitter patches, sequins, speckled rainbow spray, white halo outlines, plastic skin, leftover cushions or backrests, hovering bodies, unsupported limbs, palaces, CGI buildings, copied pools or trains, cloud wallpaper, indoor floods, pasted fog",
    "person": "PERSON INTEGRATION: Preserve facial identity, expression, proportions, garment cut and coverage. Skin may become realistically pearlescent with broad luminous reflections, pores and subsurface warmth. At strong intensity visibly recolor dark/neutral garments into pearl ivory, lilac, icy cyan or rose; turn existing fabric/leather opalescent while retaining folds and construction. Treat the whole outfit and skin, never isolated glitter. For seated/reclining subjects, remove incompatible cushions, backrests or armrests and reconstruct hidden surfaces. Rebuild only the necessary support as a scene-compatible seat, ledge or continuous surface. Keep the main gesture; minimally adjust arm, hand or head contact only when necessary. Preserve weight, contact shadows and natural anatomy; no hovering or furniture fragments.",
    "atmosphere": "FOG PHYSICS: Fog occupies real volume and scatters light at different depths, with foreground texture and shadows still readable. Strong optical diffusion creates broad soft bloom around luminous openings, backlit hair, skin and clothing highlights, never a drawn outline. Apply a coherent dreamy photographic grade throughout subject and background. No sequins, rainbow speckle, glitter patches, gray fog veil or pasted smoke.",
    "compact": "PV LAB DREAMCORE V7: Transform subject AND space into one photographed dream. Route ORGANIC if beach or nature dominates; ARCHITECTURE for rooms/cities/industry; otherwise PORTRAIT. At selected strength on EVERY route, skin gains broad pearly luminosity with pores; recolor garments into pearl ivory/lilac/icy cyan/rose and opalescent satin or leather, keeping cut, coverage and folds. No background-only effect or glitter patches. WHOLE FRAME dream-film grade: creamy highlights, soft contrast, broad optical bloom at lit edges. Mist has depth; shadows remain readable. Strong intensities: remove incompatible cushions/backrests, rebuild scene-compatible support and hidden surfaces; minimally adjust contact points only if needed. Preserve identity, subject count, proportions, main gesture, camera and recognizable place. ORGANIC: luminous nature. ARCHITECTURE: deep luminous openings, rough concrete, pearly reflections.",
    "compactSubtle": "SUBTLE 1-34%: Gentle diffusion, faint halo, soft skin luminosity and restrained clothing color shift; preserve supports.",
    "compactModerate": "ATMOSPHERIC 35-69%: Clearly visible skin and garment color/material shifts, soft halos and spatial mist; credible support.",
    "compactImmersive": "IMMERSIVE 70-89%: Strong outfit recoloring, pearly skin, broad bloom and deep atmosphere. Adapt incompatible supports; shiny patches and ankle fog alone are insufficient.",
    "compactIntense": "IMPOSSIBLE REALITY 90-99%: Bold pearl garments and skin, integrated supports, whole-frame dream-film diffusion and one distant light impossibility.",
    "compactClimax": "MAXIMUM 100%: Fully recolor/rematerialize the outfit, luminous pearly skin, broad soft halation and dream-film grade throughout. Replace incompatible supports with believable contact. ORGANIC luminous water/foliage; ARCHITECTURE real building with extraordinary depth.",
    "compactAvoid": "untreated dark outfits at high intensity, glitter patches, sequins, white outlines, leftover furniture, hovering limbs, mannequin skin, lost identity, copied pools/trains, cloud wallpaper, floods",
    "routing": "SOURCE ROUTING: Inspect source and choose ONE route. ORGANIC if sea, foam, water, beach, wet rocks, vegetation or natural landscape dominates, EVEN WHEN A PERSON IS PRESENT. ARCHITECTURE if houses, streets, factories, industrial yards, transit spaces, corridors or interiors dominate, EVEN WITH A PERSON. Otherwise PORTRAIT for a person with a simple background. Every person follows PERSON INTEGRATION; retain the recognizable place.",
    "organic": "ORGANIC ROUTE, STRONGEST: REAL foam, water, wet rock, foliage and skin become luminous and pearlescent within physical mist. Retain recognizable terrain, horizon and subjects; apply the person and wardrobe transformation fully even in nature. No invented architecture.",
    "portrait": "PORTRAIT ROUTE: Transform existing garment colors and materials alongside luminous skin. Preserve identity and garment coverage; use a coherent dreamy film grade and broad optical bloom. Rebuild local support only where it conflicts with the transformed space. No ordinary cutout person against a dream background.",
    "architecture": "ARCHITECTURE ROUTE: Keep recognizable buildings and perspective. Cities and industrial scenes gain luminous depth through real openings, light scattering between structures and material-specific pearl reflections. Rough concrete and brick keep pores; glass/metal carry light. Coherently transform near and far space. No imported trains, pools or flooding."
  },
  {
    "id": "90s-cinema",
    "name": "90s Cinema",
    "category": "Cinema",
    "preview": "/lab/mood-previews/hd/90s-cinema-clean-final-20261011.jpg",
    "previewFull": "/lab/mood-bank/2026-10-11/90s-cinema/originals/90s-film.png",
    "description": "1990s 35mm movie-film color and texture",
    "direction": "Authentic 1990s independent-cinema 35mm movie-frame treatment, applied to the user's original subject and scene, not a recreation of the record-shop preview. Rich photochemical film-print color: warm golden amber backlight or practical highlights where motivated by the source lighting, teal-olive cool shadows, dense tactile blacks, glowing optical halation, imperfect fine-to-medium film grain, natural lens softness and luminous highlight bloom. A thin, believable 35mm film-gate edge with subtle dark scan borders and occasional light leaks or emulsion wear near outer margins, without obscuring subjects. Strong film narrative and editorial realism, never generic digital fashion advertising.",
    "subtle": "Introduce 1990s 35mm photochemical color with natural golden highlights, muted cool shadow separation, fine organic grain, soft film halation, gentle optical diffusion and a faint darkened frame-edge vignette. Preserve the scene and people; no obvious perforations or heavy scratched overlays.",
    "intense": "At HIGH and 100% intensity, transform the lighting and film-print character into a dramatic, glossy 1990s feature-film scene: glowing golden backlight where believable, deep teal-olive shadows, warm-versus-cool theatrical lighting, powerful shaped highlights, real 35mm optical softness, abundant organic grain and pronounced light-source halation. Recreate an authentic narrow 35mm scanned film-gate border with visible sprocket perforations only at the far outer left and right edges, subtle emulsion wear, sparse dust specks, hairline scratches and an occasional film-edge light leak. Keep the frame details clear of faces and important objects. Preserve exact faces, body proportions, pose, garments and camera geometry, but DO NOT preserve the original flat daylight look. This should look like a 1990s movie frame, not contemporary minimalist editorial photography.",
    "avoid": "forced golden sunset in an unlit scene, changing the scene into a record shop, modern digital HDR, generic e-commerce fashion, AI skin smoothing, CGI shine, costume parody, fake VHS artifacts, oversized film borders, scratches across faces, borders covering subjects"
  },
  {
    "id": "polaroid-600",
    "name": "Polaroid 600",
    "category": "Analog",
    "preview": "/lab/mood-previews/hd/polaroid-600-20261011.jpg",
    "description": "Intimate instant-film color, imperfect flash and tactile chemistry",
    "defaultIntensity": 75,
    "direction": "PV LAB POLAROID 600 / REAL INSTANT FILM. Transform the source into a believable single exposure on integral instant color film, with the physical character of a late-1980s/1990s Polaroid 600 photograph. Personal, spontaneous, tactile and editorial, never a digital retro preset. Moderate optical softness and reduced microcontrast, thick creamy highlights, compressed but detailed shadows, restrained warm/green and cyan/magenta dye irregularities, gently imperfect exposure, rich but imperfect color density and finely textured emulsion. Use credible straight-on camera flash only where source lighting and perspective allow; it can lift a nearby subject while the room falls into natural darkness, but do not invent a new night scene. Maintain the original face, identity, skin, body, clothing, pose, crop and surroundings. These are characteristics of the photograph, NOT instructions to introduce a white Polaroid paper border. Keep the image edge-to-edge unless the user explicitly asks for a print frame. Analog intimacy; considered underground fashion photography.",
    "subtle": "Subtle instant-film softness and gentle tonal compression, lightly creamy highlights, warm-cool emulsion color variation and faint organic mottling. Keep the subject and original light recognizable. No print border.",
    "moderate": "Distinct Polaroid 600 color density and soft optical definition, characterful skin texture, compressed shadows, believable close flash where motivated, delicate chemical irregularities and modest exposure drift. No pasted frames or scratches.",
    "immersive": "Unmistakable integral instant-film rendering: intimate flash falloff when credible, creamy bright exposure rolloff, dense slightly unstable dyes, soft photographic edges, organic emulsion variation and imperfect yet sophisticated fashion-documentary character. Preserve the original scene and anatomy.",
    "intense": "Strong authentic instant-film personality with substantial optical softness, uneven but physically plausible emulsion color, naturally washed highlight areas, dark flash falloff, conspicuous analog dye shifts and tactile photographic density. Keep realistic skin and the exact person; no artificial paper frame.",
    "climax": "Maximum believable Polaroid 600 chemistry, exposure accident and editorial immediacy without losing subject recognition. Strong creamy flash exposure, moody muted shadow density, wonderfully inconsistent dye color, significant analog softness and faint uneven chemical development. Edge-to-edge photograph only, never automatic white borders or digital vintage stickers.",
    "avoid": "automatic white Polaroid frame, scrapbook collage, printed text or handwriting, fake date stamps, fake film scratches, fake light leaks, all-over sepia filter, VHS artifacts, digital HDR clarity, artificial skin smoothing, plastic faces, forced night scenery, changing identity or wardrobe, exaggerated chemical destruction, blurred faces"
  },
  {
    "id": "fashion-editorial",
    "name": "Fashion Editorial",
    "category": "Fashion",
    "preview": "/lab/mood-previews/hd/fashion-editorial-20261011.jpg",
    "previewFull": "/lab/mood-bank/2026-10-11/fashion-editorial/originals/fashion-editoral.png",
    "description": "Refined fashion art direction",
    "direction": "High-end European fashion editorial as a photographic treatment, not a fixed person or outfit. Deliberate direct or off-axis flash when motivated by the requested scene, deep sculptural blacks, controlled highlight falloff, tactile leather and fabric texture where those materials exist, restrained 50mm lens character, unretouched skin detail and considered negative space. Respect the written subject, age, face, hairstyle, identity, wardrobe, pose, setting and composition. Never introduce a default wet-haired woman or force a black leather jacket.",
    "subtle": "Natural photographed contrast, material texture and restrained fashion lighting while keeping the user's exact subject and wardrobe.",
    "intense": "Bolder editorial flash and deeper tonal separation with honest material detail, but retain the written person or scene, clothing, anatomy and composition.",
    "avoid": "generic e-commerce photo, cloned faces, wet-hair portrait default, forced leather outfit, airbrushed skin, glossy AI-plastic surfaces, physically impossible fabrics"
  },
  {
    "id": "berlin-rave",
    "name": "Berlin Rave",
    "category": "Fashion",
    "preview": "/lab/mood-previews/berlin-rave-grid-20261015.webp",
    "previewFull": "/lab/mood-previews/berlin-rave-detail-20261015.webp",
    "description": "Hard flash. Sleek leather, latex and minimal rave couture",
    "defaultIntensity": 80,
    "direction": "BERLIN RAVE V5 / CHARACTER-FIRST RAVE COUTURE. Edit the Base photograph into a believable Berlin underground fashion photograph at night. Character consistency outranks styling intensity, including at 100%. Preserve facial structure, expression, original skin tone, body proportions and human/robot/cyborg nature. Dress the SAME character. Existing robot plating, joints, cables and mechanical limbs remain mechanically intact beneath and between garments; never replace machinery with human skin or add machinery to a human. With text alone, follow the requested character and composition. Explicit user instructions and assigned reference roles override these Mood defaults.\n\nWARDROBE: redesign each adult subject's visible outfit in supple black leather and glossy latex. Adapt garments to the existing anatomy and presentation, never reshape the wearer to fit a reference. For masculine styling, favor a narrow harness or open fitted vest with trousers and asymmetric straps; bralettes and lingerie are not the default. Use feminine or androgynous cuts when appropriate to the source or requested. Minimal fitted pieces, narrow harness straps, small opaque panels, precise cutouts, slender belts and real fastenings. At high intensity, openings expose the ORIGINAL skin or ORIGINAL mechanical surfaces. Fine edges, natural tension, leather grain and creases, narrow latex reflections. Add restrained dystopian tailoring through worn gunmetal fittings and utilitarian asymmetry, without new armor or generic cyberpunk. Distinct coordinated outfits per subject.\n\nLIGHT AND LOCATION: hard direct on-camera flash, readable faces, crisp shadows and rapid falloff. Relight the SAME location at night without rebuilding its geometry. Nearby walls may catch neutral flash; distant surroundings darken. Retain small existing practical lights, detail in black garments and fine photographic grain. Light may change exposure, never whiten or change the underlying skin tone.\n\nCONTINUITY: keep subject count, main pose, facing direction, camera distance, perspective, subject size and crop. Allow only small garment-fit adjustments to limbs. Full-length stays full-length; back-facing stays back-facing. Clothing refs supply garments; Style refs supply photographic treatment. Hairstyle cues may style existing hair while preserving hairline, texture and character design; never add human hair to a robot without it. References never supply a replacement face, body, skin tone, character or pose. No invented subjects or DJ equipment.",
    "subtle": "1-34% / RAVE ACCENTS: keep the original outfit recognizable, introducing restrained leather, latex and hardware accents. Night exposure and direct flash; character unchanged.",
    "moderate": "35-69% / SLEEK CLUBWEAR: replace the visible outfit with fitted leather-and-latex clubwear tailored to the source anatomy and presentation. Relight the same location at night.",
    "immersive": "70-89% / MINIMAL RAVE COUTURE: bold minimal leather-and-latex pieces, fine straps and small gunmetal fittings; openings expose original skin or machinery. Hard flash; keep the original character and shot.",
    "intense": "90-99% / DARING CUTS: complete minimal rave couture, substantial cutouts, original skin or machinery visible, thin supple materials and distinct looks per subject. Identity and anatomy stay unchanged.",
    "climax": "100% / COMPLETE WARDROBE REDESIGN: minimal leather-and-latex couture, substantial cutouts and precise harness construction. Expose original skin or machinery. Night exposure and hard flash required. Maximum styling, unchanged character, skin tone and anatomy; only small pose adjustments.",
    "compact": "BERLIN RAVE V5: identity outranks intensity, even at 100%. Keep face, expression, skin tone, proportions and human/robot/cyborg nature. Dress the SAME character; preserve robot plating, joints, cables and limbs, never humanize. Reinterpret adult outfits in supple black leather and glossy latex fitted to source anatomy/presentation. Masculine: harness/vest with trousers, not default lingerie. Narrow harness straps, cutouts, real fastenings; show ORIGINAL skin or machinery. Worn gunmetal, utilitarian asymmetry: restrained dystopia. Leather grain/creases, narrow latex reflections. Hard direct on-camera flash, crisp shadows, rapid falloff; SAME location at night. Nearby walls catch neutral flash; retain practicals, fine grain, original skin tone. Clothing refs supply garments; Style refs supply photographic treatment. Hair styling preserves hairline, texture and character design. Explicit user instructions and assigned reference roles override these Mood defaults.",
    "compactSubtle": "1-34%: recognizable original outfit, leather/latex/hardware accents; night flash.",
    "compactModerate": "35-69%: replace visible outfit with fitted leather/latex clubwear adapted to the character.",
    "compactImmersive": "70-89%: bold minimal couture, fine straps, gunmetal; openings show original skin or machinery.",
    "compactIntense": "90-99%: daring minimal leather/latex, substantial cutouts, original skin or machinery visible.",
    "compactClimax": "100%: complete wardrobe redesign, substantial cutouts, original skin or machinery visible; unchanged character.",
    "avoid": "face replacement, altered skin tone or anatomy, humanized robots, copied reference bodies or poses, new bulky armor, heavy coats, uniform catsuits, added crowd or DJ props, red neon wash, plastic skin, painted texture, text, logos",
    "compactAvoid": "face/body replacement, humanized robots, copied reference poses, new bulky armor, added crowd/DJ props, plastic skin"
  },
  {
    "id": "soft-pastel-film",
    "name": "Soft Pastel Film",
    "category": "Analog",
    "preview": "/lab/mood-bank/2026-10-11/soft-pastel-film/preview.webp",
    "previewFull": "/lab/mood-bank/2026-10-11/soft-pastel-film/originals/soft-paste-1-.png",
    "description": "Quiet creamy daylight",
    "direction": "Airy premium analog photography with creamy neutrals, soft daylight, restrained powdered pastel hues, gentle shadow separation, subtle grain, natural skin color and elegant optical softness without loss of detail.",
    "subtle": "Slightly creamy daylight and reduced color harshness; keep contrast intelligible.",
    "intense": "Deliberate pastel art direction and diffused morning atmosphere, retaining real texture.",
    "avoid": "overexposed white void, artificial pink skin, blurred facial details"
  },
  {
    "id": "80s-film",
    "name": "80s Film",
    "category": "Analog",
    "preview": "/lab/mood-previews/hd/80s-film-20261011.jpg",
    "previewFull": "/lab/mood-bank/2026-10-11/80s-film/originals/80s-film.png",
    "description": "35mm movie scenes, burned light and saturated color",
    "lowDirection": "PV LAB 80S FILM / SUBTLE ANALOG: preserve the image as shot while making it feel gently photographed on 1980s motion-picture 35mm negative. Fine textured film grain, soft lens falloff, a little photochemical color separation and gentle luminous tungsten shoulder only where the original lighting supports it. Keep real skin, existing wardrobe, pose and location. No invented haze, wind, set changes or fashion restyling at this strength.",
    "midDirection": "PV LAB 80S FILM / CINEMATIC COLOR: reinterpret the same frame with convincing late-1980s theatrical 35mm film density, tactile organic grain, stronger film-print contrast and deliberate warm tungsten against cooler blue/cyan fill when plausible. Shaped shadows, softly glowing real practical lights, tasteful saturated reds and amber. Slight optical softness and restrained atmospheric depth, not a redesigned scene. Preserve referenced people, garments, poses, camera and environment; fashion elegance comes from the light and material detail.",
    "compactLow": "80S FILM / SUBTLE: true 35mm motion-picture fine grain, gentle photochemical warmth, realistic soft highlight rolloff and lens softness. Retain all people, rooms, clothes, pose and framing; no added fog, wind or wardrobe change.",
    "compactMid": "80S FILM / CINEMATIC COLOR: authentic 35mm grain and rich film density, saturated red and warm amber accents against believable cooler shadows, warm tungsten practical glow and gentle optical halation. Maintain source subject, clothing, room and crop; minimal haze and no retro costume clichés.",
    "direction": "PV LAB 80S FILM / HIGH-FASHION FEATURE CINEMA. Transform the user's requested subject or existing photograph into a vivid frame from an exceptionally photographed mid-1980s theatrical motion picture, with European luxury-fashion art direction. It must be a believable STORY MOMENT, not a posed contemporary portrait with a vintage filter. PHOTOCHEMICAL IMAGE: organic 35mm cinema-negative and film-print character, visible irregular fine-to-medium grain living in the shadows and skin texture, slight color-layer imperfections, real lens softness and falloff, tactile midtones, dense but readable blacks, optical halation and creamy overexposed or lightly burned highlights around genuine light sources without bleaching faces. CINEMATIC COLOR: saturated crimson reds, rich amber/yellows, luminous tungsten practicals, expressive cyan or deep blue ambient fill when the scene supports it, bold warm-cool separation and strong shaped contrast; never a uniform sepia, orange or neon overlay. PHYSICAL AIR: believable suspended dust and delicate cinematic haze occupying real depth, interacting with existing window light and practical lamps, scattering light into luminous shafts and softened background planes; never pasted-on smoke. LIVING FRAME: subtle physically plausible motion in hair, the edge of a garment or a curtain, and a compelling sense of something happening just outside the frame. FASHION: elegant high-fashion silhouettes, intelligent tailoring, textured fabrics and refined editorial confidence, never decade parody. With a Base image, retain the person's identity, proportions, original garments, pose, framing and recognizable setting unless the user specifically asks to change them; achieve the fashion upgrade through lighting, fabric texture and natural breeze, not unauthorized outfit replacement. With no Base, style the requested subjects in cinematic designer-quality clothes appropriate to the scene. Compose for the user's chosen aspect ratio, never impose widescreen or copied movie sets.",
    "subtle": "SUBTLE 1-34% / ANALOG TREATMENT: introduce credible 35mm grain, photochemical density and softly luminous highlights, restrained warmth and slight optical softness. Keep the original lighting, scene, garments and action substantially intact. No forced wind, haze or scene redesign.",
    "moderate": "CINEMATIC COLOR 35-69%: establish distinct 1980s feature-film color separation, deeper shadows, visible authentic grain, beautiful tungsten-to-cool-light interplay, natural skin and motivated practical-light bloom. Add only a trace of atmospheric depth where the source supports it. Keep the existing people and surroundings recognizable.",
    "immersive": "MOVIE STILL 70-89%: make the whole frame feel photographed for an evocative 1980s feature film. Rich saturated reds, amber and cinematic blues where credible; powerful shaped lighting, prominent natural film grain, burned light-source edges, nuanced lens bloom and airborne haze illuminated by real light. Give existing fabric or hair a slight, believable sense of motion. Retain the source identity, clothes and camera.",
    "intense": "FULL CINEMATIC SCENE 90-99%: unmistakable mid-1980s movie-frame atmosphere rather than retro portraiture. Intense but photochemical color, tactile abundant 35mm grain, radiant practicals with gently burned highlight bloom, deep cinematic blacks, strong motivated warm/cool contrast, layered luminous haze with real spatial depth, and subtle wind animating hair or garment edges. Make even a plain portrait feel like a story close-up. High-fashion elegance without forced costume or replacing referenced clothing.",
    "climax": "MAXIMUM 100% / FULL MOVIE PRODUCTION: deliver the most powerful cinematic transformation permitted by the user's instructions. A breathtaking 1980s theatrical 35mm film still with abundant integrated analog grain, saturated yet photographic reds, ambers and cool blues, radiant burned highlights, glowing practical lamps, sculpted shadows and luminous real air: suspended dust or thin smoke scatters window and set lighting into volumetric shafts at several depths. Build credible mid-action energy through slightly moving hair, flowing existing fabric, a stirring curtain or another context-appropriate subtle physical cue. Art-direct everything with sophisticated, sensual European high-fashion discipline, beautifully lit tailoring and fabric, exceptional silhouettes and lived-in realism. For text-only creation or explicitly authorized restyling, dress subjects in original designer-quality editorial fashion; for a supplied Base, DO NOT replace clothes, change pose, body, face, location or framing without permission. This is a movie scene, never a sterile fashion catalog or retro cosplay.",
    "avoid": "costume parody, huge default 80s perms, fake period props or copied famous movie scenes, random DeLorean, 1950s diner aesthetic, flat nostalgic sepia, orange faces, all-over neon cyberpunk, digital HDR sharpness, CGI shine, airbrushed or plastic skin, makeup-smoothed identity, fake VHS bars, scratches or sprocket borders, stickers, pasted fog, artificial wind contorting anatomy, changing reference people, outfit changes without permission, melted fabric, unrelated new scenery",
    "compact": "80S FILM / FASHION CINEMA: a believable high-fashion 1980s movie FRAME, not a vintage costume portrait. Physical 35mm motion-picture grain, halation, burned practical highlights, textured black shadows, saturated reds, amber and yellow against believable deep blue/cyan, tungsten light and lens softness. Actual suspended haze catches existing light in real spatial depth, never a pasted overlay. Suggest narrative tension and slight motion in existing hair or fabric. Refined designer silhouettes, not perms or cosplay. With a Base preserve face, body, pose, room, clothes and camera unless explicitly edited. Without Base invent sophisticated fashion wardrobe. Preserve requested aspect ratio.",
    "compactSubtle": "1-34%: subtle film grain, natural photochemical warmth and soft optical bloom; retain scene and clothes.",
    "compactModerate": "35-69%: rich 80s movie-film color separation, grain, shaped practical lighting, minimal haze.",
    "compactImmersive": "70-89%: strong movie-still color, luminous motivated air, grain, burned practicals and slight fabric movement.",
    "compactIntense": "90-99%: powerful feature-film light, saturated rich color, heavy organic grain, volumetric haze and high-fashion story moment.",
    "compactClimax": "100%: full 1980s film-production feel: rich 35mm grain, burned luminous practicals, saturated cinematic color, volumetric haze and light shafts through real depth; hair/fabric subtly moving, luxurious editorial styling. Protect Base identity, clothes, setting and crop.",
    "compactAvoid": "wigs, costumes, VHS, neon wash, wax skin, flat fog, props copied from films, unrequested changes of identity or clothes"
  },
  {
    "id": "synthetic-romance",
    "name": "Synthetic Romance",
    "category": "Cinema",
    "preview": "/lab/mood-previews/synthetic-romance-canon-kiss-20261011.webp?v=hd-20261011",
    "description": "Black chrome, human longing and 1980s synthetic cinema",
    "defaultIntensity": 82,
    "direction": "SYNTHETIC ROMANCE / PARALLEL VISION CANON. Rebuild the uploaded person as an extraordinary human-machine hybrid in the photographic world of the user's original canon references: dark industrial retro-futurism, intimate artificial beings, 1980s photochemical science-fiction cinema. This is an INVASIVE PHYSICAL BODY TRANSFORMATION, not a color grade or costume. Read the actual source person, visible body, pose, expression, number of people, camera and spatial relationships. Reengineer visible anatomy: replace or integrate parts of head, temples, neck, shoulders, arms, torso, hands or legs with precise functional-looking mechanical structures. Choose ONE coherent morphology, not a checklist: almost-human with invasive exposed neck mechanisms; recognizable human face with a complete engineered black-chrome body; segmented cyborg skin with embedded cables and visible internals; or a nearly total android with residual human facial character. Different subjects may have different transformation degrees. Mechanical joints must actually connect, with believable thickness, articulated plates, fasteners, cable routing, contact shadows and worn interfaces. Preserve the source pose, number of subjects, camera perspective and readable identity when a human face is visible; clothing and body surfaces MAY be physically replaced by engineered anatomy, particularly at high intensity. Do not automatically create another robot, a couple, a kiss or an embrace. The photograph must have narrative tension and emotion without repeating the thumbnail scene. MATERIALS: smoked mirror chrome, black nickel, graphite titanium, subtly abraded polished steel, oxidized seams, organic skin, fine condensation and surface wear. REAL OPTICAL GLOSS: reflected narrow fluorescent tubes and broad dim practical sources produce long specular ribbons tracking curved metal anatomy, dark reflection bands between lights, roughness variation, restrained red highlights, physically plausible reflections and imperfect local contrast. No fake gloss overlay. CINEMATOGRAPHY: photographed as an early-1980s 35mm feature-film negative, fine irregular grain in shadows, dense readable blacks, restrained soft halation around actual light sources, subtle lens softness, imperfect photochemical colors and authentic highlight rolloff. Sparse red practicals, cold-white fluorescent spill, blue-grey ambient darkness, motivated backlight and thin atmospheric haze. Wet concrete or reflective flooring only when a new environment is allowed and physically credible. Environment should be functional, aged and industrial, with analog machinery, not neon decoration. At strong intensities, rebuild a bland source environment into a coherent retro-futurist industrial interior without changing subject geometry; at lower intensity keep the location recognizable. Emotion: synthetic romance, loneliness, desire, vulnerability, quiet menace and human tenderness. Respect assigned references and explicit user directions. Create a different visually intelligent transformation each time.",
    "subtle": "1-34% / SUBTLE MUTATION: clearly introduce engineered mechanical implants around visible temples, neck, shoulders or hands, plus tactile 1980s film photography. The person remains predominantly human, pose and location recognizable. Even low intensity must change anatomy, not just grading.",
    "moderate": "35-69% / PARTIAL CYBORG: substantially replace several visible body regions with real black-chrome anatomy, articulated plates and plausible internal cabling. Preserve recognizable facial structure and composition. Film lighting and atmosphere deepen.",
    "immersive": "70-89% / MAJOR SYNTHETIC RECONSTRUCTION: extensively replace the visible body with functional biomechanical construction, chrome and routed cables. Keep the human face if suitable, with a visible physical transition into the machinery. Bold industrial film atmosphere, source pose and identity respected.",
    "intense": "90-99% / RADICAL ANDROID: transform nearly the entire visible body into engineered reflective dark metal, retaining recognizable human facial cues where possible. Expose meaningful cables, mechanical joints and intricate assembly. Rebuild atmosphere and background as a credible aged 1980s industrial film set.",
    "climax": "100% / TOTAL SYNTHETIC LIBERATION: full artistic freedom for a breathtaking cyborg or android transformation. Human face can remain within a fully engineered head and body, or become partly synthetic; retain enough source facial structure to anchor identity if Lock Identity is requested. Extreme physical reconstruction, never a generic robot suit. Cinematic analog realism and restrained color remain nonnegotiable.",
    "avoid": "generic cyberpunk, neon city, Blade Runner scene recreation, flying cars, holograms, luminous circuit skin, glowing eyes by default, superhero armor, glossy plastic, CGI showroom shine, perfect chrome gradient, rubbery AI skin, mirror liquid blobs, pasted fog, random cables, floating machinery, fake red light overlay, excessive teal orange grading, contemporary digital HDR, 3D render, video game, anime, changing pose, inventing extra people, automatic kissing, identical robots, anatomical distortions, losing facial identity when requested, fake film scratches and VHS effects",
    "compact": "INVASIVE PHYSICAL BODY TRANSFORMATION: human-machine anatomy, not a costume or color grade. One coherent morphology per person; joints, plates, fasteners and routed cables connect with real thickness and contact shadows. Smoked mirror chrome, black nickel, graphite titanium, abraded steel, oxidized seams, organic skin and fine condensation. OPTICAL GLOSS: narrow fluorescent reflections and dim broad sources form curved specular ribbons, dark reflection bands and varied roughness, never a gloss overlay. Early-1980s 35mm negative: irregular shadow grain, dense readable blacks, soft halation at real lights, lens softness, imperfect photochemical color and highlight rolloff. Sparse red practicals, cold-white spill, blue-grey darkness, motivated backlight and thin spatial haze. Aged functional industrial machinery; reflective floors only when credible. Intimacy, loneliness, vulnerability, human tenderness and quiet menace.",
    "compactSubtle": "1-34% / SUBTLE MUTATION: visible temple, neck or hand implants; mainly human, recognizable location. Anatomy must change.",
    "compactModerate": "35-69% / PARTIAL CYBORG: replace several body regions with black-chrome joints and cabling; recognizable human face.",
    "compactImmersive": "70-89% / MAJOR SYNTHETIC RECONSTRUCTION: extensively engineered body, human face transitioning into machinery; industrial atmosphere.",
    "compactIntense": "90-99% / RADICAL ANDROID: nearly complete dark-metal anatomy, facial cues, functional internals; aged industrial film set.",
    "compactClimax": "100% / TOTAL SYNTHETIC LIBERATION: fully engineered body and head; retain facial structure with Lock Identity. Never a robot suit.",
    "compactAvoid": "generic cyberpunk, neon, glowing eyes, CGI/plastic skin, liquid blobs, random cables, fake gloss/fog, extra people, automatic kissing, VHS"
  },
  {
    "id": "kodak-gold",
    "name": "Kodak Gold",
    "category": "Analog",
    "preview": "/lab/visuals/greenhouse-portrait.webp",
    "description": "Bold golden negative-film color and grain",
    "direction": "Visibly strong Kodak Gold-inspired 35mm color negative and printed-photo character, not a faint warm preset. Radiant honey-gold highlights, brilliant luminous yellows, rich emerald film greens, dense summer blues with cool shadow color separation, colorful warm reds, punchy but tactile analog contrast and striking organic fine-to-medium grain. Soft halation around real bright sources, creamy highlight shoulder, subtle imperfect scan color and a wonderfully saturated 1990s summer print feeling. Keep skin realistically warm and preserve intricate photographic texture.",
    "subtle": "Visible golden color-negative print influence: warm honey-colored highlights, rich but natural film colors, optical glow, modest but clearly discernible organic grain and a gentle photographic print curve.",
    "intense": "At HIGH and 100% intensity, make this unabashedly colorful and filmic: luminous golden-yellow highlights, highly saturated yet photographic greens and blues, deep rich print contrast, bold warm-cool negative-film color separation, abundant visibly organic 35mm grain, gentle color-channel irregularities, noticeable realistic highlight halation and joyful sunlit 1990s photo-print atmosphere. Do not turn the face orange or create a monochrome sepia wash; preserve beautiful real skin.",
    "avoid": "orange skin, entire scene dyed yellow, beige flatness, plastic smoothing, fake film borders, arbitrary dust scratches, cheap filter overlays, clipped skin highlights"
  },
  {
    "id": "frutiger-aero",
    "name": "Frutiger Aero",
    "category": "Experimental",
    "preview": "/lab/mood-previews/hd/frutiger-aero-20261011.jpg",
    "previewFull": "/lab/mood-bank/2026-10-11/frutiger-aero/originals/frutiger-aero.png",
    "description": "Translucent Y2K optimism",
    "direction": "Early 2000s technology-optimist Frutiger Aero design: luminous pale blue-white light, convincing translucent objects, watery reflections, subtle soft gradients, airy modern materials and elegant utopian visual optimism.",
    "subtle": "Clean airy blue-white color and believable reflections, no new distracting elements.",
    "intense": "Translucent glasslike spatial accents and playful Y2K optimism, anchored in credible photographic materials.",
    "avoid": "childish vector stickers, floating UI icons, grim cyberpunk"
  },
  {
    "id": "hyper-pop",
    "name": "Hyper Pop",
    "category": "Experimental",
    "preview": "/lab/visuals/reptare-detail.webp",
    "description": "Vivid editorial energy",
    "direction": "Bold fashion-pop photographic treatment, saturated but controlled chromatic accents, luminous highlights, confident flash energy, sharp tactile subject detail, graphic composition, fine bloom and playful 2000s magazine sensibility.",
    "subtle": "Slightly richer chroma and highlight energy without changing anything else.",
    "intense": "Strong confident color separation, editorial flash and pop color treatments without skin artifacts.",
    "avoid": "cheap overlays, emoji, oversaturation, plastic skin"
  },
  {
    "id": "sumi-ink",
    "name": "Japanese Sumi-e",
    "category": "Experimental",
    "preview": "/lab/mood-previews/hd/japanese-sumi-e-20261011.jpg",
    "previewFull": "/lab/mood-bank/2026-10-11/sumi-ink/originals/parallel-vision-8c5ceb4a-42e5-47e4-8009-550de60d84ef-2-.png",
    "description": "Canonical black-ink wash on warm washi",
    "direction": "Canonical Japanese sumi-e (suibokuga) artwork, physically painted with black sumi ink, controlled diluted gray wash and restrained dry-brush marks on handmade warm ivory washi paper with visible subtle paper fibers. Authentic Japanese brush economy, decisive expressive black contours, gentle ink diffusion, delicate gray tonal gradients, purposeful unpainted negative space and disciplined asymmetrical composition. In portraits, keep the person's face softly recognizable through nuanced grayscale wash and careful delicate eyes, while the room, textiles, furniture and silhouette simplify into handmade brush marks. A refined Japanese ink painting with subtle realistic facial continuity, never just a black-and-white photograph.",
    "subtle": "Transform the reference into an elegant restrained sumi-e and photographic fusion: real washi paper grain, visible ink brush borders, natural gray wash and negative space while retaining recognizable features and the original arrangement.",
    "intense": "At HIGH and 100% intensity, recreate the whole scene as a confidently executed Japanese ink-wash painting. Simplify architecture, cloth, light and shadow into painterly black brush structure, water-diffused gray ink, broad ivory negative spaces, deliberate dry-brush breaks and handmade paper fibers. Keep only the important readable facial features and pose through delicate black and gray tonal drawing. This must look like real brushed sumi ink, not a grayscale filter.",
    "avoid": "anime or manga, ink cartoon outline, random kanji or seals, digital grayscale-filter photographs, brightly colored accents, messy paint splatters, watercolor postcards, glossy AI airbrush skin"
  }
]);
// Keep the public catalogue shared by Studio, My Moods and Mood Creator.
export const MOODS=ALL_MOODS;
export function moodPreviewURL(mood,{detail=false}={}){
  if(typeof window!=='undefined'&&window.__PV_LAB_NATIVE__===1)
    return '/lab/mood-previews/mobile/v1/'+mood.id+(detail?'-detail':'')+'.jpg';
  return detail?(mood.previewFull||mood.preview):mood.preview;
}

export const MOOD_MODELS=Object.freeze(['seedream','seedreamlite','krea3','gemini','gemini21','qwen3','zspicy']);
export const moodById=id=>ALL_MOODS.find(m=>m.id===id)||null;
// This is intentionally presentation-only. Jobs retain the full provider prompt for
// reproduction, but the viewer and History show only user-authored text.
export function userFacingImagePrompt(settings={}){
  const raw=typeof settings?.prompt==='string'?settings.prompt.trim():'';
  const marker=raw.search(/(?:^|\n)\s*PV LAB MOOD\s*\//i);
  if(settings?.moodId){
    if(typeof settings.moodOriginalPrompt==='string')return settings.moodOriginalPrompt.trim();
    return marker>=0?raw.slice(0,marker).trim():'';
  }
  return marker>=0?raw.slice(0,marker).trim():raw;
}
export function imageHistoryCaption(settings={}){
  const text=userFacingImagePrompt(settings),mood=moodById(settings?.moodId);
  if(mood){
    const intensity=Number(settings.moodIntensity);
    const strength=Number.isInteger(intensity)&&intensity>=1&&intensity<=100?intensity+'%':'';
    const look=mood.id==='hong-kong-nights'&&settings.moodVariant&&settings.moodVariant!=='original'?HONG_KONG_VARIANTS[hongKongVariant(settings.moodVariant)].label:'';
    return [mood.name,look,strength,text].filter(Boolean).join(' · ');
  }
  if(settings?.moodId==='custom')return [settings.customMoodName||'My Mood',Number.isInteger(settings.moodIntensity)?settings.moodIntensity+'%':'',text].filter(Boolean).join(' · ');
  if(settings?.moodId)return ['Mood',text].filter(Boolean).join(' · ');
  if(settings?.mode==='upscale')return 'Image upscale / '+String(settings.resolution||'').toUpperCase();
  return text||'No direction saved.';
}


export function prepareMoodPrompt(input='',id='',amount=60,{engine='seedream',referenceCount=0,referenceMode='base',filmFinish=undefined,moodVariant='original'}={}){
  const original=String(input||'').trim(),mood=moodById(id);
  if(!mood)return {prompt:original,metadata:{},error:''};
  if(!MOOD_MODELS.includes(engine))return {prompt:original,metadata:{},error:'This image model does not support Moods. Choose Seedream Pro or Lite, Krea 3, Nano Banana, Qwen Image 3.0 or Z-Image Spicy.'};
  const intensity=Math.max(1,Math.min(100,Math.round(Number(amount)||60)));
  // Fisheye 2000 uses the owner's original Y2K flash/fisheye brief and the
  // two photographic Style sources. Never replace an uploaded Base with the
  // brief's example models, wardrobe or Tokyo location.
  if(mood.id==='fisheye-2000'){
    const editingBase=referenceCount>0&&referenceMode!=='references';
    const lite=engine==='seedreamlite';
    const style=lite?(editingBase?mood.compactBase:mood.compact):(editingBase?mood.baseDirection:mood.direction);
    const level=intensity<=34?mood.subtle:intensity<=74?mood.moderate:intensity<=89?mood.intense:mood.climax;
    const guidance=editingBase
      ?'BASE LOCK: original face, expression, subject count, pose, outfit and background remain. References marked Style provide optics only. Preserve user-assigned reference roles.'
      :referenceCount>0
        ?'REFERENCES ONLY: assigned Identity photographs determine the face, never the two built-in Style people. Compose the requested scene with original-brief defaults only where not superseded.'
        :'NO BASE: compose the user-requested subject and space. The two built-in photos provide photographic optics only, never their actual faces or outfits.';
    const prompt=[original,'PV LAB MOOD / '+mood.name+': '+style+' '+level+' '+guidance+' Avoid: '+(lite?mood.liteAvoid:mood.avoid)+'.'].filter(Boolean).join('\n\n');
    const budget=lite?3000:5000,over=prompt.length-budget;
    return {prompt,metadata:{moodId:mood.id,moodIntensity:intensity,moodOriginalPrompt:original},
      error:over>0?'Direction and Mood exceed '+budget.toLocaleString()+' characters by '+over.toLocaleString()+'. The Mood stays unchanged; shorten your direction.':(!original&&!referenceCount?'Describe a subject or add an image before generating with a mood.':'')};
  }
  // Hong Kong Nights: restore the approved October 10 photographic recipe.
  // One short art direction and the user's own photograph; no scene rebuilding
  // instructions, automatic cinematography reference map, or extra AI pass.
  // Expose one canonical creative direction while preserving historical
  // variation identifiers in saved History. 35mm Film Finish stays opt-in.
  if(mood.id==='hong-kong-nights'){
    const variant=hongKongVariant(moodVariant);
    const film=filmFinish===null?null:filmFinishSettings(filmFinish??HONG_KONG_VARIANTS[variant].filmFinish);
    const strength=intensity<=34?mood.subtle:intensity>=76?mood.direction+' '+mood.intense:mood.direction;
    const variantDirection=variant==='original'?'':HONG_KONG_VARIANTS[variant].direction;
    // Image 3 baseline: 1-90% stays byte-identical. Only 91-100% refines air.
    const refineAtmosphere=intensity>90&&variant==='original';
    // A supplied Base is a photograph to finish, not a brief to re-stage an
    // imagined Hong Kong street. The original open-ended 1990s night-film
    // direction is retained for text-only and References-only compositions.
    const editingBase=referenceCount>0&&referenceMode!=='references';
    const originalImageLock='EDIT IMAGE 1, not a new scene. Keep identical face, expression, age, hair, body, pose, outfit, framing, camera and every background building, sign and street element. Hong Kong Nights is a photographic light-and-air treatment, not an instruction to move anyone to Asia or add neon. Keep natural expressive beauty, warm healthy skin and softly visible eyes; do not age, remodel, harden eye shadows or darken the face. Change the atmosphere of the SAME photographed setting, not its geometry: permit believable dusk/night exposure, source-motivated humid air, emerald-petrol ambience and warm tungsten light. Outdoor paving may acquire a restrained wet sheen and broken reflections consistent with perspective, with no newly added rain or changed street. Interiors remain dry, intimate and physically lit. Fine pushed 35mm color-negative shadow texture is embedded in the photo, not artificial speckles or a global blur. User direction takes priority.'
    // No external scene classifier, additional references or extra API call. The
    // edit model reads IMAGE 1 and applies only the physically applicable path.
    // Primary refs 4-7 are translated into optics, never automatically staged as
    // foreign people/places. The prior four-Style-photo route damaged fidelity.
    // The Lite edit input has a hard 3K compiled prompt budget. Keep the
    // complete user instruction and use a fixed concise canon, not truncation.
    const liteBaseLock='EDIT IMAGE 1, not a new scene. Keep identical face, expression, age, hair, body, pose, outfit, framing, camera and every background building, sign and street element. Hong Kong Nights is a photographic light-and-air treatment, not an instruction to move anyone to Asia or add neon. Keep natural expressive beauty, warm healthy skin and softly visible eyes. Existing lamps make humid emerald dusk and warm skin; outdoor paving may catch wet reflections but indoor floors stay dry. Fine pushed 35mm color-negative shadow texture, not digital noise. User direction takes priority.';
    const primaryOptics=engine==='seedreamlite'
      ?'PRIMARY OPTICS: emerald city humidity, wet outdoor shops, warm green-gold restaurant and deep fluorescent tunnel. Red accents, real black shadows. Never copy the scenes.'
      :'PRIMARY FILM REFERENCE DNA (OPTICS ONLY): green taxi city -> small emerald lights receding into humidity and deep black; wet pedestrian street -> rain-polished exterior ground mirroring warm shops; lime-gold restaurant -> close tungsten intimacy, skin and smoke illuminated by physical practicals; fluorescent tunnel -> continuous green falloff in dark space. SECONDARY palette cues are quiet ruby lamps, petrol-cyan depth, dark negative space and textured surfaces. Do not copy any reference person, building, vehicle or signage.';
    const sourceLightRouting=engine==='seedreamlite'
      ?'SCENE: PORTRAIT same face/outfit; STREET humid dusk, damp paving; ROOM warm lamps and dry floor. Keep existing light sources and architecture, no added objects.'
      :'SCENE ADAPTATION, only what IMAGE 1 visibly supports: FASHION PORTRAIT -> untouched real identity, expression, pose, outfit and leather texture with inviting warm skin; the surrounding street gains plausible night air and soft scattered highlights. STREET OR TRANSIT -> allow a believable transition toward nocturnal exposure, richer dim green depth and localized damp outdoor pavement while keeping existing architecture and true light sources. BEDROOM OR INTERIOR -> the same room and furniture, warm lamps, cool spill through original windows, air scattering only close to actual light, absolutely no wet bed or floor. Light has depth, skin has life, shadows retain photographic texture; never add neon signs, taxis, rain curtains or people.';
    const approvedPhotoStrength=intensity<=34
      ?'Subtle: quiet warm/cool film response and gentle bloom from existing practical lights.'
      :intensity<=69
        ?'Editorial: luminous flattering skin, moist emerald night-air depth and restrained amber practical-light diffusion, without a uniform green veil.'
        :'Expressive: richer emerald night ambience, air-scattered practicals and physically credible wet exterior reflections. Keep the identical face, unchanged composition, clean real skin and original location. Mood intensity means light and atmosphere, not dirty film noise.';
    const airLevel=intensity===100?'MAXIMUM ATMOSPHERE':intensity>=96?'STRONG ATMOSPHERE':'VISIBLE ATMOSPHERE';
    const photoStrength=refineAtmosphere
      ?engine==='seedreamlite'
        ?airLevel+': Keep emerald/tungsten color, face and textures. Pronounced atmospheric diffusion and suspended humidity, lit by existing lights through mid/background depth. Broad soft practical bloom, localized halation and subtle veiling flare. Clear foreground eyes; rich unlit blacks. No uniform green wash, digital sharpening, extra grain or blur. Wet reflections outdoors only; dry rooms.'
        :airLevel+': Keep existing emerald/petrol shadows, warm tungsten light, natural skin and contrast. Make atmospheric diffusion clearly visible: existing lamps and window light illuminate suspended humidity at several depths, with luminous middle distance and softer receding background. Broad soft practical bloom, localized halation and subtle veiling flare surround existing bright sources. At maximum make air unmistakable, not a subtle color grade. Embed air in the scene, not a uniform green wash or clean digital sharpening. Keep clear foreground eyes, face, composition, material textures and rich unlit blacks. Wet reflections only outdoors; dry interiors. No extra grain, muddy blacks, blanket blur or new lamps.'
      :approvedPhotoStrength;
    const sceneAtmosphere=refineAtmosphere
      ?sourceLightRouting.replace('air scattering only close to actual light','visible layered humidity illuminated by existing light through the middle distance, with clear foreground details and unlit dark pockets')
      :sourceLightRouting;
    const preservation=editingBase?'':referenceCount>0
      ?'The uploaded images only supply their assigned reference roles. Keep referenced people recognisable without copying unintended people.'
      :'Honor the requested subject and composition.';
    // Lite's documented 3K provider cap gets a fixed, equally source-safe
    // recipe. No user text is shortened, and model choice alone selects it.
    const liteTextStrength='1990s Hong Kong night-film light: humid emerald depth, glowing warm practicals, wet outdoor reflections when plausible, intimate real skin and organic fine pushed-film shadow texture. Preserve original people and place. '+(intensity>=76?'Stronger believable dusk or nocturnal air, no pasted fog.':intensity<=34?'Very restrained source bloom, existing weather.':'Balanced green-gold light and humid depth.');
    const look=editingBase?[engine==='seedreamlite'?liteBaseLock:originalImageLock,primaryOptics,sceneAtmosphere,photoStrength,variantDirection].filter(Boolean).join(' '):
      [engine==='seedreamlite'?liteTextStrength:strength,variantDirection,refineAtmosphere?photoStrength:''].filter(Boolean).join(' ');
    const avoid=engine==='seedreamlite'?'teal color filter, artificial grain, copied reference faces, fake neon, indoor wetness, changed clothing or street layout':mood.avoid;
    const prompt=[original,'PV LAB MOOD / '+mood.name+': '+look+' '+preservation+' Avoid: '+avoid+'.'].filter(Boolean).join('\n\n');
    const budget=engine==='seedreamlite'?3000:5000,over=prompt.length-budget;
    return {prompt,metadata:{moodId:mood.id,moodIntensity:intensity,moodOriginalPrompt:original,moodVariant:variant,...(film?{filmFinish:film}:{})},
      error:over>0?'Direction and Mood exceed '+budget.toLocaleString()+' characters by '+over.toLocaleString()+'. The Mood stays unchanged; shorten your direction.':(!original&&!referenceCount?'Describe a subject or add an image before generating with a mood.':'')};
  }
  const hkVariant=mood.id==='hong-kong-nights'?hongKongVariant(moodVariant):null;
  const finish=hkVariant&&filmFinish!==null?filmFinishSettings(filmFinish??HONG_KONG_VARIANTS[hkVariant].filmFinish):null;
  const hkLook=hkVariant?HONG_KONG_VARIANTS[hkVariant].direction:'';
  const dreamcore=mood.id==='dreamcore',cinematic80s=mood.id==='80s-film',berlinRave=mood.id==='berlin-rave',syntheticRomance=mood.id==='synthetic-romance',midnightReverie=mood.id==='midnight-reverie',dreamBlur=mood.id==='dream-blur';
  // FIXED MOOD RECIPE: never switch between full/compact/ultra based on
  // direction length, reference count or whether a budget is almost exhausted.
  // Only the selected model and the Mood itself determine its established recipe.
  // Seedream Lite has a fixed 3,000-character model-specific formulation.
  // Hong Kong Nights uses its existing compact optical recipe on all 5K models
  // because its four Style photos and their reference guidance must also fit.
  // Other compact presets below are existing authored recipes, not truncations.
  const lite=engine==='seedreamlite';
  const compactDreamBlur=dreamBlur&&lite;
  const compactMidnight=midnightReverie&&lite;
  const ultraMidnight=midnightReverie&&lite;
  const compactHongKong=mood.id==='hong-kong-nights';
  const ultraHongKong=compactHongKong&&lite;
  const compactBerlinRave=berlinRave;
  const compactSyntheticRomance=syntheticRomance;
  const compactDreamcore=dreamcore;
  const compact80s=cinematic80s&&lite;
  const dreamcoreTier=intensity<=34?'Subtle':intensity<=69?'Moderate':intensity<=89?'Immersive':intensity<=99?'Intense':'Climax';
  const dreamcoreKey=intensity<=34?'subtle':intensity<=69?'moderate':intensity<=89?'immersive':intensity<=99?'intense':'climax';
  const context=referenceCount===0?'No Base: use the written subject.':referenceMode==='references'?'Reference-only: follow requested output and explicitly assigned roles.':'Inspect the first Base image to choose PERSON or SCENE.';
  const eightyCore=compact80s
    ?intensity<=34?mood.compactLow:intensity<=69?mood.compactMid:mood.compact
    :intensity<=34?mood.lowDirection:intensity<=69?mood.midDirection:mood.direction;
  // Keep the chosen morphology stable for a given intensity. Rebuilding a
  // quote or updating references must not randomly alter the Mood instruction.
  const syntheticMorphologies=[
    'SELECTED MORPHOLOGY: recognizable human face, surgically integrated temples, neck, exposed cable spine and engineered shoulders.',
    'SELECTED MORPHOLOGY: human face emerging from an almost entirely black-chrome android body with articulated torso and limbs.',
    'SELECTED MORPHOLOGY: asymmetrical synthetic anatomy, partial organic skin, exposed functional cabling and intricate mechanical joints.',
    'SELECTED MORPHOLOGY: nearly complete humanoid robot with precise cranial plating, subtle human facial structure and complex internal mechanisms.',
    'SELECTED MORPHOLOGY: restrained facial modification with radical torso and arm reconstruction, layered smoked-metal plates and routed cables.'
  ];
  const syntheticMorphology=syntheticRomance&&intensity>=35?syntheticMorphologies[Math.floor((intensity-35)/13)%syntheticMorphologies.length]:'';
  const style=syntheticRomance
    ?[compactSyntheticRomance?mood.compact:mood.direction,syntheticMorphology,'Creative intensity '+intensity+'/100: physical reconstruction, NOT a pixel filter.',compactSyntheticRomance?mood['compact'+dreamcoreTier]:mood[dreamcoreKey]].join(' ')
    :berlinRave
    ?[compactBerlinRave?mood.compact:mood.direction,
      'Creative intensity '+intensity+'/100: wardrobe, night lighting and atmosphere transformation, NOT a pixel-opacity filter.',
      compactBerlinRave?mood['compact'+dreamcoreTier]:mood[dreamcoreKey]
    ].join(' ')
    :dreamcore
    ?[compactDreamcore?mood.compact:[mood.direction,mood.routing,mood.person,mood.organic,mood.portrait,mood.architecture,mood.atmosphere].join(' '),
      context,'Creative intensity '+intensity+'/100; artistic instruction strength, NOT literal pixel opacity.',
      compactDreamcore?mood['compact'+dreamcoreTier]:mood[dreamcoreKey]
    ].join(' ')
    :cinematic80s
      ?[eightyCore,context,
        'Creative intensity '+intensity+'/100; cinematic generation instructions, NOT a pixel filter.',
        compact80s?mood['compact'+dreamcoreTier]:mood[dreamcoreKey]
      ].join(' ')
      :dreamBlur
        ?[
          compactDreamBlur?mood.compact:mood.direction,
          compactDreamBlur?mood.compactRouting:mood.routing,
          'Shutter-drag intensity '+intensity+'/100: a single real photographed exposure, not graphics or a uniform filter.',
          compactDreamBlur?mood['compact'+dreamcoreTier]:mood[dreamcoreKey],
          'IDENTITY FIRST / BASE FRAME LOCK: if the customer supplied a photograph, preserve identical crop, subject size, orientation, pose, body and camera viewpoint. Light and film texture may change strongly, the scene cannot be replaced. Style photos never control identity or composition.'
        ].join(' ')
      :midnightReverie
        ?[
          ultraMidnight?mood.ultra:compactMidnight?mood.compact:mood.direction,
          ultraMidnight?mood.ultraRouting:compactMidnight?mood.compactRouting:mood.routing,
          ultraMidnight?'One flash plus cobalt ambient, one image.':'CAPTURE then AMBIENT AFTERIMAGE in ONE real-looking exposure and one generation, never two API calls.',
          ultraMidnight?mood['ultra'+dreamcoreTier]:compactMidnight?mood['compact'+dreamcoreTier]:mood[dreamcoreKey],
          ultraMidnight
            ?'IDENTITY FIRST: same face, eyes, outfit, pose and camera. Blur only background moving light.'
            :'IDENTITY FIRST: same face, eyes, age, anatomy, clothing, pose, camera angle, person count and location. Flash freezes real person; trailing glow lives on lights, not cheeks or limbs.'
        ].join(' ')
      :mood.id==='hong-kong-nights'
        ?ultraHongKong
          ?[
            mood.ultra, mood.ultraRouting,hkLook,
            intensity===100?'MAXIMUM 100%: dense luminous humid air; thin black letterbox bars top/bottom without hiding the subject.':intensity>=70?'Strong night atmosphere and luminous haze with rich dark gaps.':'Gentle photographic night atmosphere.',
            'IDENTITY FIRST: keep Base/Identity facial geometry, expression, hairline, anatomy, outfit, pose, place and framing. Style references guide optics, not faces. GRAIN: fine integrated film texture. BLOOM: optical softness of people and setting. HALATION: only existing lamps, windows and specular reflections, no body halo or bright backdrop patch. WET / GLOSS: plausible glass and polished surfaces, no invented rain.'
          ].join(' ')
          :[
          compactHongKong?mood.compact:mood.direction,
          compactHongKong?mood.compactRouting:mood.cinematography,
          'Photographic treatment strength '+intensity+'/100: reconstruct cinematic scene lighting, NOT a green overlay or post-process filter.',
          intensity<=34?mood.subtle:intensity<=69?mood.moderate:intensity<100?mood.intense:mood.climax,
          hkLook,
          compactHongKong
            ?'IDENTITY FIRST: Base/Identity images control facial geometry, eyes, age, expression and hairline. Preserve body, pose, wardrobe, camera and original scene. Style references are optics only. GRAIN: fine integrated texture, no coarse generated noise. BLOOM: motivated scene-wide optical softness. HALATION: spread only at existing lamps, windows and specular reflections, no body halo or bright backdrop patch. WET / GLOSS: moisture sheen only on believable existing surfaces.'
            :'IDENTITY FIRST at every strength: Base/Identity references govern facial geometry, age, expression and hairline. Keep the Base location, architecture, subject, wardrobe, body, pose, camera and composition while allowing pores, hair and fabric edges to soften optically without reshaping the face. Style references contribute optical lighting, never other people. WET / GLOSS: integrate reflective moisture only into appropriate glass, floors and surfaces; no water on sofas or skin. GRAIN: fine natural photochemical texture, no coarse generated noise. BLOOM: luminous light spread across the real environment and subject, not a flat filter. HALATION: luminous spill tied to existing lamps, windows and specular reflections, no body outline, glowing silhouette or bright backdrop patch.'
        ].join(' ')
        :intensity<=34?mood.subtle:intensity>=76?mood.direction+' '+mood.intense:mood.direction;
  const preservation=referenceCount>0
    ?referenceMode==='references'
      ?'The uploaded images only supply their assigned reference roles. Keep referenced people recognisable without copying unintended people.'
      :syntheticRomance
        ?compactSyntheticRomance
          ?'Base: keep visible facial identity, subject count, proportions, pose, crop and camera. ALLOW replacement of wardrobe, skin, limbs and torso by machinery; high intensity allows industrial scene reconstruction. Honor explicit edits, assigned roles and Lock Identity.'
          :'The first reference is the Base person: preserve facial identity when visible, number of subjects, pose, crop, anatomy proportions and camera. Explicitly ALLOW replacement of wardrobe, skin, limbs, torso and body surfaces with engineered machinery. At high intensity ALLOW industrial scene reconstruction. Respect assigned reference roles and Lock Identity guidance; preservation is not guaranteed.'
      :berlinRave
        ?'Base: keep the same character, subject count, main pose, facing direction, camera distance, subject size, crop and location geometry. Full-length stays full-length; back-facing stays back-facing. Only small limb adjustments for garment fit. Style visible areas only.'
        :mood.id==='dreamcore'
        ?compactDreamcore
          ?'Base: preserve identity, main gesture, camera and garment coverage. Allow mood-driven recoloring, materials and compatible support reconstruction; respect assigned roles.'
          :'Base: preserve identity, proportions, main gesture, camera and garment coverage. Allow clothing recoloring, material changes and local support reconstruction with minimal contact corrections. Keep the scene recognizable and respect assigned roles.'
        :dreamBlur
        ?'BASE IMAGE FIRST: exact original subject count, pose, body orientation, clothing and skin coverage, scene objects, background, lens perspective and framing. If the original was full length, DO NOT zoom into a headshot. Style photographs are only for analog optics. Respect explicit customer-directed edits.'
        :compactHongKong
          ?'Honor assigned reference roles.'
        :compact80s
          ?'The first reference is the base photograph. Preserve identity, body, pose, clothes, camera and setting unless the user requests changes. Respect assigned roles.'
          :'The first reference is the base photograph. Preserve face, identity, real body proportions, pose, camera, wardrobe and composition unless the user specifically asks to change them. Preservation is guidance, not a guarantee.'
    :'Honor the requested subject and composition.';
  const prompt=[original,'PV LAB MOOD / '+mood.name+': '+style+' '+preservation+' Avoid: '+(compactDreamBlur||compactMidnight||ultraMidnight?mood.compactAvoid:compactHongKong?'flat green tint, direct flash unchanged, plastic skin, body halos, invented lamps, facial reshaping, flat fog, copied Style scenes':compactDreamcore||compact80s||compactBerlinRave||compactSyntheticRomance?mood.compactAvoid:mood.avoid)+'.'].filter(Boolean).join('\n\n');
  const budget=lite?3000:5000,over=prompt.length-budget;
  return {prompt,metadata:{moodId:mood.id,moodIntensity:intensity,moodOriginalPrompt:original,...(hkVariant?{moodVariant:hkVariant}:{}),...(finish?{filmFinish:finish}:{})},
    error:over>0?'Direction and Mood exceed '+budget.toLocaleString()+' characters by '+over.toLocaleString()+'. The Mood stays unchanged; shorten your direction.':(!original&&!referenceCount?'Describe a subject or add an image before generating with a mood.':'')};
}

/* Keep the Mood gallery's height independent of the image composer height.
   The deck may grow when references are added; move the popup over its dimmed
   upper edge when necessary rather than compressing the gallery rows. */
export function moodsPanelViewportGeometry({composerTop,viewportTop=0,viewportHeight,viewportWidth,panelHeight}){
  const mobile=viewportWidth<=740;
  const topInset=mobile?14:28,bottomInset=mobile?10:16,gap=mobile?10:14;
  const viewportSpace=Math.max(160,Math.floor(viewportHeight-topInset-bottomInset));
  const maxHeight=Math.min(720,viewportSpace,mobile?Math.floor(viewportHeight*.7):720);
  const displayedHeight=Math.min(maxHeight,Number.isFinite(panelHeight)?Math.max(0,panelHeight):(mobile?295:325));
  const above=Math.floor(composerTop-viewportTop-topInset-gap);
  return {gap,maxHeight,overlap:Math.ceil(Math.max(0,displayedHeight-above)),tight:maxHeight<(mobile?420:310)};
}

export function preparePersonalMoodPrompt(input='',mood,intensity=60,options={}){
  const original=String(input||'').trim();
  if(!mood||!mood.id)return {prompt:original,metadata:{},error:'Choose a saved Mood.'};
  const title=String(mood.name||'My Mood').trim().slice(0,64);
  const direction=String(mood.direction||'').trim();
  const baseId=moodById(mood.baseMoodId)?.id||null;
  const strength=Math.max(1,Math.min(100,Math.round(Number(intensity)||60)));
  // Saved Moods use the same fixed recipe as their curated base.
  // Never silently recompile the base direction when a user adds text or refs.
  const base=baseId?prepareMoodPrompt(original,baseId,strength,{...options,filmFinish:null}):{prompt:original,error:''};
  const added='PV LAB MY MOOD / '+title+': Apply this REUSABLE LOOK to the current requested image, not as a replacement subject or scenery. '+direction+'. Preserve explicitly assigned reference roles and the user\'s subject and composition. Style guidance only; saved board images are inspiration and are not automatically attached to this request.';
  const prompt=[base.prompt,added].filter(Boolean).join('\n\n');
  const budget=options.engine==='seedreamlite'?3000:5000,over=prompt.length-budget;
  const referenceCount=Number(options.referenceCount)||0;
  const nonBudgetError=base.error&&!/exceed \d[\d,]* characters by/.test(base.error)?base.error:'';
  return {prompt,metadata:{moodId:'custom',customMoodName:title,customMoodBoardId:mood.id,moodIntensity:strength,moodOriginalPrompt:original},
    error:nonBudgetError||(over>0?'Direction and saved Mood exceed '+budget.toLocaleString()+' characters by '+over.toLocaleString()+'. The Mood stays unchanged; shorten your direction or edit your saved Mood.':base.error||(!original&&!referenceCount?'Describe a subject or add an image before using this Mood.':''))};
}

export function createMoodSelector({panel,button,getEngine,chooseEngine,onChange,onOpen,onCreatePersonal=()=>{},onEditPersonal=()=>{}}){
  const grid=panel.querySelector('#composer-moods-grid');
  const createMoodButton=panel.querySelector('#composer-moods-create');
  const filters=panel.querySelector('#composer-moods-filters');
  const slider=panel.querySelector('#composer-moods-intensity');
  const amount=panel.querySelector('#composer-moods-amount');
  const browseCount=panel.querySelector('#composer-moods-browse-count');
  const summary=panel.querySelector('#composer-moods-summary');
  const selection=panel.querySelector('#composer-moods-selection');
  const selectedLabel=panel.querySelector('#composer-moods-current-label');
  const hint=panel.querySelector('#composer-moods-compat');
  const switcher=panel.querySelector('#composer-moods-switch');
  const done=panel.querySelector('#composer-moods-done');
  const clearButton=panel.querySelector('#composer-moods-none');
  const aboutButton=panel.querySelector('#composer-moods-about');
  const aboutDetails=panel.querySelector('#composer-moods-explanation');
  const backdrop=panel.parentElement.querySelector('#composer-moods-backdrop');
  let selected=null,intensity=60,category='All',personalMoods=[],hkVariation='original';
  const finishPanel=document.createElement('div');finishPanel.hidden=true;
  const finishControls=createFilmFinishControls(finishPanel,{onChange:()=>onChange(),compact:true});
  const controlDeck=panel.querySelector('.moods-controls');
  controlDeck?.insertBefore(finishPanel,controlDeck.querySelector('.moods-actions'));
  const variationBar=document.createElement('div');
  variationBar.className='hk-variation-bar';variationBar.hidden=true;
  variationBar.setAttribute('role','group');
  variationBar.setAttribute('aria-label','Hong Kong Nights photographic direction');
  const variationCaption=document.createElement('span');
  variationCaption.className='hk-variation-caption';
  variationCaption.textContent='Photo direction';
  variationBar.append(variationCaption);
  const variationChoices=document.createElement('div');
  variationChoices.className='hk-variation-choices';
  const variationButtons=new Map();
  for(const [id,look] of Object.entries(HONG_KONG_VARIANTS)){
    const variantButton=document.createElement('button');
    variantButton.type='button';variantButton.className='hk-variation-choice';
    variantButton.textContent=look.label;variantButton.title=look.direction;
    variantButton.setAttribute('aria-pressed','false');
    variantButton.onclick=()=>{
      if(selected!=='hong-kong-nights'||hkVariation===id)return;
      hkVariation=id;finishControls.set(look.filmFinish);render();fitPanelViewport();onChange();
    };
    variationChoices.append(variantButton);variationButtons.set(id,variantButton);
  }
  variationBar.append(variationChoices);
  controlDeck?.insertBefore(variationBar,finishPanel);
  const boardById=id=>personalMoods.find(board=>'custom:'+board.id===id)||null;
  const findMood=id=>moodById(id)||boardById(id);
  const desktopGridColumns=5,initiallyVisibleRows=2;
  // Keep the full creative directions available while making the grid scannable.
  const captions={
    'dream-blur':'Light leaks, motion, feelings',
    'midnight-reverie':'Flash-frozen, cobalt afterglow',
    'hong-kong-nights':'Emerald haze, night romance',
    'night-flash':'After-dark flash',
    'fisheye-2000':'Raw fisheye, hard flash, Y2K',
    'dreamcore':'Pearl light, liminal spaces',
    '90s-cinema':'35mm warmth and texture',
    'polaroid-600':'Instant film, imperfect flash',
    'fashion-editorial':'Refined fashion direction',
    'berlin-rave':'Underground couture',
    'soft-pastel-film':'Quiet creamy daylight',
    '80s-film':'Burned light, saturated color',
    'synthetic-romance':'Black chrome, human longing',
    'kodak-gold':'Golden color, organic grain',
    'frutiger-aero':'Translucent Y2K optimism',
    'hyper-pop':'Vivid editorial energy',
    'sumi-ink':'Black ink on warm washi'
  };
  const tabs=new Map(),cards=new Map();
  for(const name of ['All','Cinema','Fashion','Analog','Experimental','My Moods']){
    const tab=document.createElement('button');tab.type='button';tab.className='moods-filter';tab.textContent=name;
    tab.onclick=()=>{category=name;grid.scrollTop=0;render();fitGridViewport();fitPanelViewport();};filters.append(tab);tabs.set(name,tab);
  }
  const emptyPersonal=document.createElement('div');
  emptyPersonal.className='moods-my-empty';emptyPersonal.hidden=true;
  const emptyTitle=document.createElement('strong');emptyTitle.textContent='Your private moodboards';
  const emptyNote=document.createElement('p');emptyNote.textContent='Save a look from an image result or create a style of your own.';
  const createButton=document.createElement('button');createButton.type='button';createButton.textContent='+ Create a Mood';
  const startPersonalMood=()=>{close();onCreatePersonal();};
  createButton.onclick=startPersonalMood;
  emptyPersonal.append(emptyTitle,emptyNote,createButton);grid.append(emptyPersonal);
  for(const mood of MOODS){
    const card=document.createElement('button');card.type='button';card.className='moods-card';
    card.setAttribute('aria-label','Select '+mood.name);card.setAttribute('aria-pressed','false');
    card.title=mood.description;card.setAttribute('aria-description',mood.description);
    const media=document.createElement('span');media.className='moods-card-media moods-look-'+mood.id;
    const image=document.createElement('img');image.src=moodPreviewURL(mood);image.onerror=()=>{image.onerror=null;image.src=mood.preview;};image.alt='';image.loading='lazy';image.decoding='async';media.append(image);
    const info=document.createElement('span');info.className='moods-card-copy';
    const title=document.createElement('strong');title.textContent=mood.name;
    const subtitle=document.createElement('small');subtitle.textContent=captions[mood.id]||mood.description;info.append(title,subtitle);
    card.append(media,info);
    card.onclick=()=>{selected=selected===mood.id?null:mood.id;if(selected==='hong-kong-nights')hkVariation='original';if(selected&&mood.defaultIntensity)intensity=mood.defaultIntensity;render();fitPanelViewport();onChange({selectedMood:true});};
    grid.append(card);cards.set(mood.id,card);
  }
  function render(){
    for(const [name,tab] of tabs){tab.classList.toggle('is-selected',category===name);tab.setAttribute('aria-pressed',String(category===name));}
    for(const mood of [...MOODS,...personalMoods]){
      const key=mood.category==='My Moods'?'custom:'+mood.id:mood.id,card=cards.get(key);
      if(!card)continue;
      const hidden=category!=='All'&&category!==mood.category;
      card.hidden=hidden;if(card.customWrap)card.customWrap.hidden=hidden;
      card.classList.toggle('is-selected',key===selected);
      card.setAttribute('aria-pressed',String(key===selected));
    }
    emptyPersonal.hidden=category!=='My Moods'||personalMoods.length>0;
    slider.value=String(intensity);slider.style.setProperty('--moods-progress',((intensity-1)/99*100).toFixed(2)+'%');slider.disabled=!selected;amount.textContent=intensity+'%';
    finishPanel.hidden=selected!=='hong-kong-nights';
    variationBar.hidden=true; // New generations use a single Hong Kong Nights treatment.
    for(const [id,b] of variationButtons){b.classList.toggle('is-selected',hkVariation===id);b.setAttribute('aria-pressed',String(hkVariation===id));}
    controlDeck?.classList.toggle('has-film-finish',!finishPanel.hidden);
    const chosen=findMood(selected);
    summary.textContent=chosen?chosen.name:'';
    summary.title=chosen?.description||chosen?.direction||'';
    selection.hidden=!chosen;
    selectedLabel.hidden=!chosen;
    const compatible=MOOD_MODELS.includes(getEngine());
    hint.textContent=compatible?'':'This image model does not support Moods. Try Seedream Pro or Lite, Krea 3, Nano Banana, Qwen Image 3.0 or Z-Image Spicy.';
    hint.hidden=compatible;
    switcher.hidden=compatible;
    switcher.disabled=!chosen;
    done.hidden=!compatible;
    done.disabled=!chosen;
    clearButton.disabled=!chosen;
    const moodLabel=button.querySelector('.composer-mood-label');
    if(moodLabel)moodLabel.textContent=chosen?chosen.name:'Moods';
    else button.textContent=chosen?'✦ '+chosen.name:'✦ Moods';
    button.classList.toggle('is-mood-selected',!!chosen);
    button.setAttribute('aria-expanded',String(!panel.hidden));
  }
  function fitPanelViewport(){
    if(panel.hidden||document.documentElement.classList.contains('pv-native-lab'))return;
    const visual=window.visualViewport;
    const frame={
      composerTop:panel.parentElement.getBoundingClientRect().top,
      viewportTop:visual?.offsetTop||0,
      viewportHeight:visual?.height||window.innerHeight,
      viewportWidth:window.innerWidth
    };
    // First restore the full viewport-based height. Measuring before this step
    // would read a compressed panel left over from the previous deck state.
    const available=moodsPanelViewportGeometry(frame);
    panel.style.setProperty('--moods-anchor-gap',available.gap+'px');
    panel.style.setProperty('--moods-available-height',available.maxHeight+'px');
    panel.classList.toggle('is-viewport-tight',available.tight);
    const placed=moodsPanelViewportGeometry({...frame,panelHeight:panel.getBoundingClientRect().height});
    panel.style.setProperty('--moods-overlap',placed.overlap+'px');
    updateBrowseCount();
  }
  function setPersonalMoods(next=[]){
    for(const old of personalMoods){const key='custom:'+old.id,card=cards.get(key);card?.customWrap?.remove();cards.delete(key);}
    personalMoods=next.filter(board=>board&&typeof board.id==='string'&&typeof board.name==='string').slice(0,30).map(board=>({...board,category:'My Moods'}));
    for(const board of personalMoods){
      const key='custom:'+board.id,wrap=document.createElement('div');
      wrap.className='moods-board-wrap';
      const card=document.createElement('button');card.type='button';card.className='moods-card';
      card.setAttribute('aria-label','Use saved mood '+board.name);
      card.setAttribute('aria-pressed',String(selected===key));
      const media=document.createElement('span');media.className='moods-card-media moods-board-cover';
      if(board.previewUrl){const img=document.createElement('img');img.src=board.previewUrl;img.alt='';img.decoding='async';img.loading='lazy';media.append(img);}
      else{const placeholder=document.createElement('span');placeholder.className='moods-board-placeholder';placeholder.textContent='✦';media.append(placeholder);}
      if(board.imageIds?.length>1){const number=document.createElement('small');number.className='moods-board-count';number.textContent=board.imageIds.length+' images';media.append(number);}
      const copy=document.createElement('span');copy.className='moods-card-copy';
      const title=document.createElement('strong');title.textContent=board.name;
      const sub=document.createElement('small');sub.textContent=board.direction||((moodById(board.baseMoodId)?.name||'Saved')+' creative direction');
      card.title=sub.textContent;card.setAttribute('aria-description',sub.textContent);
      copy.append(title,sub);card.append(media,copy);
      card.onclick=()=>{selected=key;intensity=board.intensity||60;render();onChange({selectedMood:true});};
      const edit=document.createElement('button');edit.type='button';edit.className='moods-board-edit';edit.textContent='Edit';
      edit.setAttribute('aria-label','Edit moodboard '+board.name);
      edit.onclick=event=>{event.stopPropagation();close();onEditPersonal(board);};
      wrap.append(card,edit);card.customWrap=wrap;grid.append(wrap);cards.set(key,card);
    }
    if(selected?.startsWith('custom:')&&!boardById(selected)){selected=null;intensity=60;onChange();}
    render();
    if(!panel.hidden){fitGridViewport();fitPanelViewport();}
  }
  // Show exactly two complete rows before scrolling reveals the remaining Moods.
  function fitGridViewport(){
    if(panel.hidden||document.documentElement.classList.contains('pv-native-lab'))return;
    const visible=[...cards.values()].filter(card=>!card.hidden);
    grid.style.maxHeight='';
    if(window.innerWidth<=740||visible.length<=desktopGridColumns*initiallyVisibleRows){
      grid.tabIndex=visible.length>desktopGridColumns?0:-1;
      return;
    }
    const last=visible[desktopGridColumns*initiallyVisibleRows-1];
    const bounds=grid.getBoundingClientRect(),cardBounds=last.getBoundingClientRect();
    const bottomPadding=parseFloat(getComputedStyle(grid).paddingBottom)||0;
    const firstTwoRows=Math.ceil(cardBounds.bottom-bounds.top+grid.scrollTop+bottomPadding);
    if(firstTwoRows>0)grid.style.maxHeight=firstTwoRows+'px';
    grid.tabIndex=0;
  }
  function updateBrowseCount(){
    if(!browseCount||panel.hidden)return;
    const visible=[...cards.values()].filter(card=>!card.hidden);
    browseCount.hidden=!visible.length;
    if(!visible.length)return;
    const bounds=grid.getBoundingClientRect();
    let revealed=0;
    visible.forEach((card,index)=>{if(card.getBoundingClientRect().bottom<=bounds.bottom+2)revealed=index+1;});
    browseCount.textContent=grid.scrollHeight>grid.clientHeight+2
      ?revealed+' of '+visible.length+' moods'
      :visible.length+' mood'+(visible.length===1?'':'s');
  }
  grid.addEventListener('scroll',updateBrowseCount,{passive:true});
  function closeAbout(restoreFocus=false){
    if(aboutDetails.hidden)return;
    aboutDetails.hidden=true;
    aboutButton.setAttribute('aria-expanded','false');
    if(restoreFocus&&!panel.hidden)aboutButton.focus();
  }
  function close(restoreFocus=false){
    const wasOpen=!panel.hidden;
    closeAbout();panel.hidden=true;backdrop.hidden=true;
    panel.parentElement.classList.remove('is-moods-open');
    button.setAttribute('aria-expanded','false');
    if(restoreFocus&&wasOpen&&!button.hidden)button.focus();
  }
  function open(){
    if(button.disabled)return;
    onOpen();closeAbout();panel.hidden=false;backdrop.hidden=false;
    panel.parentElement.classList.add('is-moods-open');
    render();grid.scrollTop=0;fitGridViewport();fitPanelViewport();
    if(selected==='sumi-ink'){
      const card=cards.get(selected),viewport=grid.getBoundingClientRect();
      if(card&&card.getBoundingClientRect().bottom>viewport.bottom)
        grid.scrollTop+=card.getBoundingClientRect().bottom-viewport.bottom+4;
    }
    panel.querySelector('#composer-moods-title')?.focus();
  }
  function clear(silent=false){selected=null;intensity=60;hkVariation='original';finishControls.set();close(!silent);render();if(!silent)onChange();}
  function restore(settings,silent=false){
    selected=settings?.moodId==='custom'&&typeof settings.customMoodBoardId==='string'?'custom:'+settings.customMoodBoardId:moodById(settings?.moodId)?.id||null;
    intensity=Math.min(100,Math.max(1,Number(settings?.moodIntensity)||60));
    hkVariation='original'; // Historic look IDs remain in History; Reuse starts canonical.
    finishControls.set(settings?.filmFinish||(selected==='hong-kong-nights'?HONG_KONG_VARIANTS[hkVariation].filmFinish:HONG_KONG_FILM_FINISH));
    close();render();if(!silent)onChange();
  }
  function enrich(prompt,options={}){
    if(selected?.startsWith('custom:')){
      const mood=boardById(selected);
      return mood?preparePersonalMoodPrompt(prompt,mood,intensity,options):{prompt:String(prompt||'').trim(),metadata:{},error:'This saved Mood is not available. Open My Moods and choose another.'};
    }
    return prepareMoodPrompt(prompt,selected,intensity,{...options,moodVariant:hkVariation,filmFinish:finishControls.get()});
  }
  function error(engine,prompt,count=0,referenceMode='base'){return enrich(prompt,{engine,referenceCount:count,referenceMode}).error;}
  function sync({visible=true,locked=false}={}){button.hidden=!visible;button.disabled=locked;finishControls.lock(locked);if(!visible||locked)close();if(visible)render();}
  slider.addEventListener('input',()=>{intensity=Number(slider.value);render();onChange();});
  button.onclick=()=>{if(panel.hidden)open();else close();};
  // Close when clicking anywhere outside the popup; consume that first click
  // so an underlying gallery card or Generate button is not activated.
  document.addEventListener('click',event=>{
    if(panel.hidden||panel.contains(event.target)||event.target===button)return;
    event.preventDefault();event.stopPropagation();
    close(true);
  },true);
  backdrop.onclick=()=>close(true);
  panel.querySelector('#composer-moods-close').onclick=()=>close(true);
  done.onclick=()=>close(true);
  clearButton.onclick=()=>clear();
  createMoodButton.onclick=startPersonalMood;
  aboutButton.addEventListener('click',()=>{
    const opening=aboutDetails.hidden;
    aboutDetails.hidden=!opening;
    aboutButton.setAttribute('aria-expanded',String(opening));
  });
  panel.addEventListener('click',event=>{
    if(!event.target.closest('.moods-about'))closeAbout();
  });
  panel.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      event.preventDefault();event.stopPropagation();
      if(!aboutDetails.hidden)closeAbout(true);
      else close(true);
    }
    if(event.key==='Tab'){
      const tabbables=[...panel.querySelectorAll('button:not(:disabled),input:not(:disabled)')]
        .filter(el=>!el.hidden&&!el.closest('[hidden]')&&el.getClientRects().length>0);
      if(!tabbables.length)return;
      const first=tabbables[0],last=tabbables[tabbables.length-1];
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===panel.querySelector('#composer-moods-title'))){
        event.preventDefault();last.focus();
      }else if(!event.shiftKey&&document.activeElement===last){
        event.preventDefault();first.focus();
      }
    }
  });
  switcher.onclick=()=>{chooseEngine('seedream');render();onChange({selectedMood:true});};
  grid.setAttribute('aria-label','Available moods; scroll down to explore more looks');
  function refreshViewport(){
    if(panel.hidden||document.documentElement.classList.contains('pv-native-lab'))return;
    fitGridViewport();fitPanelViewport();
  }
  window.addEventListener('resize',refreshViewport);
  window.visualViewport?.addEventListener('resize',refreshViewport);
  window.visualViewport?.addEventListener('scroll',refreshViewport);
  document.fonts?.ready.then(refreshViewport);
  if(typeof ResizeObserver==='function'){
    const observer=new ResizeObserver(refreshViewport);
    observer.observe(panel.parentElement);
  }
  render();
  return {active:()=>!!selected,selected:()=>selected,intensity:()=>intensity,variant:()=>selected==='hong-kong-nights'?hkVariation:null,enrich,error,setPersonalMoods,
    invalid:(engine,prompt,count=0,referenceMode='base')=>!!error(engine,prompt,count,referenceMode),
    sync,open,close,clear,restore};
}
