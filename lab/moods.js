/* PV Lab Moods V1. Editorial generation directions, not pixel filters. */
const ALL_MOODS=Object.freeze([
  {
    "id": "hong-kong-nights",
    "name": "Hong Kong Nights",
    "category": "Cinema",
    "preview": "/lab/mood-previews/hong-kong-nights-emerald-20261010.webp",
    "description": "Emerald haze, neon bloom and nocturnal melancholy",
    "direction": "Dreamlike 1990s Hong Kong night-film photography: humid urban darkness, atmospheric emerald haze, softened practical neon, diffused city lights, rain-wet reflections, organic 35mm grain, optical halation and nocturnal melancholy. Respect the original scene and lighting. Emerald green is an atmospheric possibility, not a mandatory color overlay.",
    "subtle": "Gentle night-film diffusion, soft practical-light bloom, subtle grain and intimate haze. Keep natural skin tones and recognizable surroundings.",
    "intense": "Immersive humid nighttime atmosphere, thick but realistic haze, luminous diffused neon in scene-appropriate greens or warm tones, wet reflections, deep layered shadows, strong analog halation and grain. Preserve referenced faces, poses and composition.",
    "avoid": "forced all-green tint, generic cyberpunk, synthetic skin, neon outlines, fake rain pasted onto dry rooms, smudged facial features"
  },
  {
    "id": "90s-cinema",
    "name": "90s Cinema",
    "category": "Cinema",
    "preview": "/lab/mood-previews/90s-cinema-record-shop-20261010.webp",
    "description": "1990s 35mm movie-film color and texture",
    "direction": "Authentic 1990s independent-cinema 35mm movie-frame treatment, applied to the user's original subject and scene, not a recreation of the record-shop preview. Rich photochemical film-print color: warm golden amber backlight or practical highlights where motivated by the source lighting, teal-olive cool shadows, dense tactile blacks, glowing optical halation, imperfect fine-to-medium film grain, natural lens softness and luminous highlight bloom. A thin, believable 35mm film-gate edge with subtle dark scan borders and occasional light leaks or emulsion wear near outer margins, without obscuring subjects. Strong film narrative and editorial realism, never generic digital fashion advertising.",
    "subtle": "Introduce 1990s 35mm photochemical color with natural golden highlights, muted cool shadow separation, fine organic grain, soft film halation, gentle optical diffusion and a faint darkened frame-edge vignette. Preserve the scene and people; no obvious perforations or heavy scratched overlays.",
    "intense": "At HIGH and 100% intensity, transform the lighting and film-print character into a dramatic, glossy 1990s feature-film scene: glowing golden backlight where believable, deep teal-olive shadows, warm-versus-cool theatrical lighting, powerful shaped highlights, real 35mm optical softness, abundant organic grain and pronounced light-source halation. Recreate an authentic narrow 35mm scanned film-gate border with visible sprocket perforations only at the far outer left and right edges, subtle emulsion wear, sparse dust specks, hairline scratches and an occasional film-edge light leak. Keep the frame details clear of faces and important objects. Preserve exact faces, body proportions, pose, garments and camera geometry, but DO NOT preserve the original flat daylight look. This should look like a 1990s movie frame, not contemporary minimalist editorial photography.",
    "avoid": "forced golden sunset in an unlit scene, changing the scene into a record shop, modern digital HDR, generic e-commerce fashion, AI skin smoothing, CGI shine, costume parody, fake VHS artifacts, oversized film borders, scratches across faces, borders covering subjects"
  },
  {
    "id": "night-flash",
    "name": "Night Flash",
    "category": "Fashion",
    "preview": "/lab/mood-previews/night-flash-elevator-20261010.webp",
    "description": "Raw after-dark photography",
    "direction": "Direct on-camera flash night fashion photography, crisp cast shadows, textured natural skin, convincing specular reflections, dark ambient falloff, candid imperfect framing, early-2000s party photography and tactile clothes.",
    "subtle": "Slight credible direct flash and dark ambient falloff with scene unchanged.",
    "intense": "Punchy flash lighting with deep surrounding darkness and raw nightlife energy.",
    "avoid": "smoothing filters, paparazzi text, hard fake glow"
  },
  {
    "id": "fashion-editorial",
    "name": "Fashion Editorial",
    "category": "Fashion",
    "preview": "/lab/visuals/silver-daylight-mobile.webp",
    "description": "Refined fashion art direction",
    "direction": "High-end European fashion editorial photograph: sophisticated magazine lighting, deliberate pose, tactile garment construction, refined shadows, subtle 50mm lens character, natural skin pores and unretouched detail, coherent studio production design.",
    "subtle": "Refined photographic grading and garment textures while keeping the clothes.",
    "intense": "Stronger fashion-magazine lighting and considered set art direction without restructuring the subject.",
    "avoid": "generic e-commerce photo, airbrushed skin, physically impossible fabrics"
  },
  {
    "id": "berlin-rave",
    "name": "Berlin Rave",
    "category": "Fashion",
    "preview": "/lab/mood-previews/berlin-rave-20261011.webp",
    "description": "Extreme leather silhouettes, underground Berlin",
    "defaultIntensity": 80,
    "direction": "BERLIN RAVE / WARDROBE TRANSFORMATION. This is a complete avant-garde OUTFIT RESTYLE, not just a dark color filter. Replace existing clothing with an extraordinary Berlin underground rave look: exaggerated Rick Owens-inspired architecture, sculptural oversized black leather outerwear, severe cocoon or angular shoulders, draped and shredded layers of authentic heavy leather, long asymmetrical hanging panels, wrapped fabrics, technical straps and industrial metal fittings, enormous platform boots. Outfit silhouettes must feel dramatically elongated and dystopian without distorting the person's anatomy. Luxury independent-designer execution: physically convincing weight, stitching, garment structure, wear and gloss. Photographic direction: Berlin underground fashion editorial, raw direct flash, real skin, moody industrial shadows, nuanced worn concrete. Keep the original setting unless the user explicitly requests a new one. No generic cyberpunk or cosplay.",
    "subtle": "1-34%: visibly REPLACE the old outfit with understated black leather tailoring, angular jacket layers, asymmetric draped details and heavy boots. Retain the original light and setting. This is still an outfit change, not a darkening filter.",
    "moderate": "35-69%: complete outfit transformation into high-end Berlin rave fashion with oversized leather shoulders, draped asymmetric construction, industrial fittings and platform boots. Strong materials, restrained photographic darkness, real-world tailoring.",
    "immersive": "70-89%: dramatic architectural leather couture, massive shaped shoulders, bold draped and distressed black layers, long fabric panels and extraordinary heavy platforms. Convincing nightclub editorial, tactile flash and shadows. Keep the original person's identity and body.",
    "intense": "90-99%: maximal extreme Berlin underground silhouette with complex sculptural leather, immense draped panels, brutalist tailoring, exaggerated outerwear and towering boots. Make an exceptional but wearable fashion statement, never a costume.",
    "climax": "100%: complete dystopian Berlin rave transformation. Monumental black leather architecture, severe angular shoulders, cascading worn and tailored panels, intricate layering, impressive industrial boots and powerful photographic flash. Radical couture, recognizable person and real materials, not a CGI character.",
    "compact": "BERLIN RAVE: REPLACE source wardrobe, not merely recolor it. Exaggerated Rick Owens-inspired Berlin underground couture: architectural black leather shoulders and coats, long asymmetric weighty drapes, worn layered leather, real hardware and enormous heavy platform boots, direct-flash editorial, genuine textile physics. Keep actual face, body, pose, camera and recognizable setting; only wardrobe is rebuilt.",
    "compactSubtle": "1-34%: clear but restrained black leather wardrobe replacement and boots.",
    "compactModerate": "35-69%: full outfit restyle, layered and draped leather, architectural shoulders.",
    "compactImmersive": "70-89%: immense wearable drapes, dramatic shoulder constructions and platforms.",
    "compactIntense": "90-99%: maximal radical leather couture silhouette, real materials and tailoring.",
    "compactClimax": "100%: extreme monumental dystopian leather rave look, still realistic and wearable.",
    "avoid": "a mere dark filter, existing T-shirt or ordinary clothes left unchanged, cheap sci-fi costumes, generic cyberpunk, neon cliches, fetish-only outfit, exposed nudity, plastic CGI leather, random tattoos, logos, copied specific runway pieces, altered face, new person, distorted natural body, swapped pose, invented room, extra limbs"
  },
  {
    "id": "80s-film",
    "name": "80s Film",
    "category": "Analog",
    "preview": "/lab/mood-previews/80s-film.svg",
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
    "id": "soft-pastel-film",
    "name": "Soft Pastel Film",
    "category": "Analog",
    "preview": "/lab/mood-previews/soft-pastel-film-portrait-f77111b4.webp",
    "description": "Quiet creamy daylight",
    "direction": "Airy premium analog photography with creamy neutrals, soft daylight, restrained powdered pastel hues, gentle shadow separation, subtle grain, natural skin color and elegant optical softness without loss of detail.",
    "subtle": "Slightly creamy daylight and reduced color harshness; keep contrast intelligible.",
    "intense": "Deliberate pastel art direction and diffused morning atmosphere, retaining real texture.",
    "avoid": "overexposed white void, artificial pink skin, blurred facial details"
  },
  {
    "id": "frutiger-aero",
    "name": "Frutiger Aero",
    "category": "Experimental",
    "preview": "/lab/mood-previews/frutiger-aero.svg",
    "description": "Translucent Y2K optimism",
    "direction": "Early 2000s technology-optimist Frutiger Aero design: luminous pale blue-white light, convincing translucent objects, watery reflections, subtle soft gradients, airy modern materials and elegant utopian visual optimism.",
    "subtle": "Clean airy blue-white color and believable reflections, no new distracting elements.",
    "intense": "Translucent glasslike spatial accents and playful Y2K optimism, anchored in credible photographic materials.",
    "avoid": "childish vector stickers, floating UI icons, grim cyberpunk"
  },
  {
    "id": "dreamcore",
    "name": "Dreamcore",
    "category": "Experimental",
    "preview": "/lab/mood-previews/dreamcore-train-20261010.webp",
    "description": "Pearlescent reality, iridescent mist and liminal light",
    "direction": "PV LAB DREAMCORE V5: A real photograph inside a softly impossible dream. Keep source camera, location, composition and natural material texture. Transform existing matter, light and atmosphere rather than inventing fantasy structures. Pearl cyan, lavender and pink are reflected-light accents, not universal filters.",
    "subtle": "SUBTLE 1-34%: Faint natural bloom, soft haze and subtle material sheen; real geometry stays intact.",
    "moderate": "ATMOSPHERIC 35-69%: Organic matter and portraits gain discernible pearly gloss, iridescent reflections and mist. Built spaces gain restrained color and atmosphere.",
    "immersive": "IMMERSIVE 70-89%: Organic water, foam and skin gain strong luminous material changes and physical fog; portraits richer gloss; architecture preserves structure with stronger light.",
    "intense": "IMPOSSIBLE REALITY 90-99%: Organic transformation becomes spectacular but photographic, portrait opalescence bold; built geometry remains real and quietly uncanny.",
    "climax": "MAXIMUM 100%: ORGANIC: exceptional wet pearlescent skin, luminous sea foam, shimmering wet rocks, iridescent water and naturally scattered fog integrated across foreground, middle distance and depth. PORTRAIT: vivid photographic opalescence on the SAME person, pose and clothes. ARCHITECTURE: keep the real building and furniture; use deeply atmospheric coherent light and only one subtle local impossibility, never fantasy structures. No flat pastel tint, pasted smoke or generic woman in front of clouds.",
    "avoid": "palaces, royal arches, castles, fantasy resorts, inserted beds, CGI dream buildings, stock cloud wallpaper, fake indoor floods, pasted fog, plastic skin, random neon patches, anatomy changes, lost identity, new outfits or different coverage",
    "person": "PERSON PRESERVATION: Preserve SAME face, eyes, hair, expression, proportions, anatomy, pose, crop and camera. Skin may become realistically pearlescent, wet-glossy or faintly metallic, but keep skin pores and truthful light on body curvature. Existing outfits can gain modest color shifts, satin or opalescent sheen, keeping garment cut and coverage. No replaced identity or cutout figure.",
    "atmosphere": "FOG PHYSICS: Fog occupies real volume, changes density with distance, scatters the actual light, occludes some distant surfaces and wraps contours. Gloss must belong to existing skin, water, foam, glass and fabric. No pasted fog, random wet floor, plastic skin, CGI walls or decorative rainbow spray.",
    "compact": "DREAMCORE: Real source photographed inside a dream, no fantasy CGI. Read scene and route: ORGANIC if beach, sea, water, foam, rocks or nature, even WITH a person; ARCHITECTURE for real rooms, houses, façades or streets; otherwise PORTRAIT for a person with simple background. Preserve every person's face, pose, proportions, crop and outfit coverage. ORGANIC: strong pearly water/foam, wet skin gloss and luminous real mist. PORTRAIT: realistic opalescent skin and fabric with coherent haze. ARCHITECTURE: retain walls, windows, furniture and camera; only light, reflections and restrained haze may change. Fog has real depth, scattering and occlusion.",
    "compactSubtle": "SUBTLE 1-34%: Soft haze, gloss and bloom only.",
    "compactModerate": "ATMOSPHERIC 35-69%: Layered mist, real pearl highlights; built scene restrained.",
    "compactImmersive": "IMMERSIVE 70-89%: Strong organic iridescence, glossy people, preserved built geometry.",
    "compactIntense": "IMPOSSIBLE REALITY 90-99%: Spectacular organic matter, spatial fog, subdued architecture.",
    "compactClimax": "MAXIMUM 100%: ORGANIC intense luminous water/foam/skin; PORTRAIT bold pearly sheen and identity preserved; ARCHITECTURE real building, liminal light only.",
    "compactAvoid": "palaces, royal arches, random bed, CGI buildings, cloud wallpaper, pasted fog, mannequin skin, lost identity",
    "routing": "SOURCE ROUTING: Inspect source and choose ONE route. ORGANIC if sea, foam, water, beach, wet rocks, vegetation or natural landscape dominates, EVEN WHEN A PERSON IS PRESENT. ARCHITECTURE if houses, corridors, interiors, façades or streets dominate. Otherwise PORTRAIT if a person dominates a simple background. Every visible person follows PERSON PRESERVATION. Never use a new place as a default.",
    "organic": "ORGANIC ROUTE, STRONGEST: Make REAL foam, water, wet rock, sand, foliage and skin physically extraordinary with luminous iridescence, pearly wet highlights, refracted color and mist naturally rising from the scene. Keep actual coast, horizon, terrain, waves and subjects recognizable. No invented architecture or fantasy props.",
    "portrait": "PORTRAIT ROUTE: In studio or simple settings, preserve person and camera; give skin and existing clothing elegant opalescent gloss and reflective color. Create coherent atmospheric depth around the person, not a stock cloud backdrop or new model.",
    "architecture": "ARCHITECTURE ROUTE, CONTROLLED: Preserve existing rooms, buildings, windows, façades, doors, furniture and perspective. Add natural optical bloom, site-specific colored reflections and subtle real atmospheric haze. Even at 100%, alter light and one small source-led detail, never the actual architectural design. No palace arches, fantasy terraces, resorts or invented beds."
  },
  {
    "id": "sumi-ink",
    "name": "Japanese Sumi-e",
    "category": "Experimental",
    "preview": "/lab/mood-previews/japanese-sumi-e.webp",
    "description": "Canonical black-ink wash on warm washi",
    "direction": "Canonical Japanese sumi-e (suibokuga) artwork, physically painted with black sumi ink, controlled diluted gray wash and restrained dry-brush marks on handmade warm ivory washi paper with visible subtle paper fibers. Authentic Japanese brush economy, decisive expressive black contours, gentle ink diffusion, delicate gray tonal gradients, purposeful unpainted negative space and disciplined asymmetrical composition. In portraits, keep the person's face softly recognizable through nuanced grayscale wash and careful delicate eyes, while the room, textiles, furniture and silhouette simplify into handmade brush marks. A refined Japanese ink painting with subtle realistic facial continuity, never just a black-and-white photograph.",
    "subtle": "Transform the reference into an elegant restrained sumi-e and photographic fusion: real washi paper grain, visible ink brush borders, natural gray wash and negative space while retaining recognizable features and the original arrangement.",
    "intense": "At HIGH and 100% intensity, recreate the whole scene as a confidently executed Japanese ink-wash painting. Simplify architecture, cloth, light and shadow into painterly black brush structure, water-diffused gray ink, broad ivory negative spaces, deliberate dry-brush breaks and handmade paper fibers. Keep only the important readable facial features and pose through delicate black and gray tonal drawing. This must look like real brushed sumi ink, not a grayscale filter.",
    "avoid": "anime or manga, ink cartoon outline, random kanji or seals, digital grayscale-filter photographs, brightly colored accents, messy paint splatters, watercolor postcards, glossy AI airbrush skin"
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
  }
].map(m=>Object.freeze(m)));
// Sumi-e remains available for previously saved jobs, but is not a selectable preset.
export const MOODS=Object.freeze([...ALL_MOODS.filter(m=>m.id!=='sumi-ink'),ALL_MOODS.find(m=>m.id==='sumi-ink')]);
export const MOOD_MODELS=Object.freeze(['seedream','gemini']);
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
    return [mood.name,strength,text].filter(Boolean).join(' · ');
  }
  if(settings?.moodId==='custom')return [settings.customMoodName||'My Mood',Number.isInteger(settings.moodIntensity)?settings.moodIntensity+'%':'',text].filter(Boolean).join(' · ');
  if(settings?.moodId)return ['Mood',text].filter(Boolean).join(' · ');
  if(settings?.mode==='upscale')return 'Image upscale / '+String(settings.resolution||'').toUpperCase();
  return text||'No direction saved.';
}


export function prepareMoodPrompt(input='',id='',amount=60,{engine='seedream',referenceCount=0,referenceMode='base',compact=false}={}){
  const original=String(input||'').trim(),mood=moodById(id);
  if(!mood)return {prompt:original,metadata:{},error:''};
  if(!MOOD_MODELS.includes(engine))return {prompt:original,metadata:{},error:'Moods v1 supports Seedream 5 Pro and Nano Banana Pro. Choose one of these models first.'};
  const intensity=Math.max(1,Math.min(100,Math.round(Number(amount)||60)));
  const dreamcore=mood.id==='dreamcore',cinematic80s=mood.id==='80s-film',berlinRave=mood.id==='berlin-rave';
  const compactBerlinRave=berlinRave&&(compact===true||referenceCount>=4||original.length>=750);
  const compactDreamcore=dreamcore&&(compact===true||referenceCount>=3||original.length>=800);
  const compact80s=cinematic80s&&(compact===true||referenceCount>=2||original.length>=800||(referenceCount===1&&original.length>=(intensity===100?200:550)));
  const dreamcoreTier=intensity<=34?'Subtle':intensity<=69?'Moderate':intensity<=89?'Immersive':intensity<=99?'Intense':'Climax';
  const dreamcoreKey=intensity<=34?'subtle':intensity<=69?'moderate':intensity<=89?'immersive':intensity<=99?'intense':'climax';
  const context=referenceCount===0?'No Base: use the written subject.':referenceMode==='references'?'Reference-only: follow requested output and explicitly assigned roles.':'Inspect the first Base image to choose PERSON or SCENE.';
  const eightyCore=compact80s
    ?intensity<=34?mood.compactLow:intensity<=69?mood.compactMid:mood.compact
    :intensity<=34?mood.lowDirection:intensity<=69?mood.midDirection:mood.direction;
  const style=berlinRave
    ?[compactBerlinRave?mood.compact:mood.direction,
      'Creative intensity '+intensity+'/100: a real outfit transformation, NOT a pixel-opacity filter.',
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
      :intensity<=34?mood.subtle:intensity>=76?mood.direction+' '+mood.intense:mood.direction;
  const preservation=referenceCount>0
    ?referenceMode==='references'
      ?'The uploaded images only supply their assigned reference roles. Keep referenced people recognisable without copying unintended people.'
      :berlinRave
        ?'The first reference is the base photograph. Explicitly REPLACE its clothes. Preserve the same face and identity, natural body proportions, hands, pose, camera angle, framing and recognizable surroundings. Wardrobe replacement is intentional, never a body or location replacement. Respect assigned reference roles.'
        :mood.id==='dreamcore'
        ?compactDreamcore
          ?'Base: preserve identity, pose, camera, garment coverage and scene type; transform atmosphere and materials. Respect assigned roles.'
          :'Base: preserve person identity, pose, camera, proportions and garment coverage where present; keep original scene recognizable and follow ORGANIC, PORTRAIT or ARCHITECTURE direction. Respect reference roles. Guidance, not a guarantee.'
        :compact80s
          ?'The first reference is the base photograph. Preserve identity, body, pose, clothes, camera and setting unless the user requests changes. Respect assigned roles.'
          :'The first reference is the base photograph. Preserve face, identity, real body proportions, pose, camera, wardrobe and composition unless the user specifically asks to change them. Preservation is guidance, not a guarantee.'
    :'Honor the requested subject and composition.';
  const prompt=[original,'PV LAB MOOD / '+mood.name+': '+style+' '+preservation+' Avoid: '+(compactDreamcore||compact80s?mood.compactAvoid:mood.avoid)+'.'].filter(Boolean).join('\n\n');
  return {prompt,metadata:{moodId:mood.id,moodIntensity:intensity,moodOriginalPrompt:original},
    error:prompt.length>5000?'Prompt and mood exceed 5,000 characters. Shorten the direction or clear the mood.':(!original&&!referenceCount?'Describe a subject or add an image before generating with a mood.':'')};
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
  // Saved Moods add their own direction after the curated base; reserve space
  // for the reference map even when the curated prompt alone would still fit.
  const baseOptions=baseId==='80s-film'&&Number(options.referenceCount)>0?{...options,compact:true}:options;
  let base=baseId?prepareMoodPrompt(original,baseId,strength,baseOptions):{prompt:original,error:''};
  const added='PV LAB MY MOOD / '+title+': Apply this REUSABLE LOOK to the current requested image, not as a replacement subject or scenery. '+direction+'. Preserve explicitly assigned reference roles and the user\'s subject and composition. Style guidance only; saved board images are inspiration and are not automatically attached to this request.';
  let prompt=[base.prompt,added].filter(Boolean).join('\n\n');
  // A rich personal style can push the detailed Dreamcore instructions above
  // the provider limit. Recompile only the base art direction compactly.
  // Keep the person's own prompt and all authored style details untouched.
  if(prompt.length>5000&&(baseId==='dreamcore'||baseId==='80s-film')){
    base=prepareMoodPrompt(original,baseId,strength,{...options,compact:true});
    prompt=[base.prompt,added].filter(Boolean).join('\n\n');
  }
  const referenceCount=Number(options.referenceCount)||0;
  return {prompt,metadata:{moodId:'custom',customMoodName:title,customMoodBoardId:mood.id,moodIntensity:strength,moodOriginalPrompt:original},
    error:base.error||(prompt.length>5000?'Your saved Mood and prompt exceed 5,000 characters. Shorten the style direction or reduce reference notes.':(!original&&!referenceCount?'Describe a subject or add an image before using this Mood.':''))};
}

export function createMoodSelector({panel,button,getEngine,chooseEngine,onChange,onOpen,onCreatePersonal=()=>{},onEditPersonal=()=>{}}){
  const grid=panel.querySelector('#composer-moods-grid');
  const filters=panel.querySelector('#composer-moods-filters');
  const slider=panel.querySelector('#composer-moods-intensity');
  const amount=panel.querySelector('#composer-moods-amount');
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
  let selected=null,intensity=60,category='All',personalMoods=[];
  const boardById=id=>personalMoods.find(board=>'custom:'+board.id===id)||null;
  const findMood=id=>moodById(id)||boardById(id);
  const desktopGridColumns=5,initiallyVisibleRows=2;
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
  createButton.onclick=()=>{close();onCreatePersonal();};
  emptyPersonal.append(emptyTitle,emptyNote,createButton);grid.append(emptyPersonal);
  for(const mood of MOODS){
    const card=document.createElement('button');card.type='button';card.className='moods-card';
    card.setAttribute('aria-label','Select '+mood.name);card.setAttribute('aria-pressed','false');
    const media=document.createElement('span');media.className='moods-card-media moods-look-'+mood.id;
    const image=document.createElement('img');image.src=mood.preview;image.alt='';image.loading='lazy';image.decoding='async';media.append(image);
    const info=document.createElement('span');info.className='moods-card-copy';
    const title=document.createElement('strong');title.textContent=mood.name;
    const subtitle=document.createElement('small');subtitle.textContent=mood.description;info.append(title,subtitle);
    card.append(media,info);
    card.onclick=()=>{selected=selected===mood.id?null:mood.id;if(selected&&mood.defaultIntensity)intensity=mood.defaultIntensity;render();fitPanelViewport();onChange();};
    grid.append(card);cards.set(mood.id,card);
  }
  const createTile=document.createElement('button');
  createTile.type='button';createTile.className='moods-card moods-board-create';
  createTile.hidden=true;createTile.setAttribute('aria-label','Create another private Mood');
  const tileMedia=document.createElement('span');tileMedia.className='moods-card-media moods-board-create-media';
  tileMedia.textContent='+';
  const tileCopy=document.createElement('span');tileCopy.className='moods-card-copy';
  const tileLabel=document.createElement('strong');tileLabel.textContent='Create Mood';
  const tileDesc=document.createElement('small');tileDesc.textContent='Start a new visual collection';
  tileCopy.append(tileLabel,tileDesc);createTile.append(tileMedia,tileCopy);
  createTile.onclick=()=>{close();onCreatePersonal();};grid.append(createTile);
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
    createTile.hidden=category!=='My Moods'||personalMoods.length===0;
    slider.value=String(intensity);slider.style.setProperty('--moods-progress',((intensity-1)/99*100).toFixed(2)+'%');slider.disabled=!selected;amount.textContent=intensity+'%';
    const chosen=findMood(selected);
    summary.textContent=chosen?chosen.name:'';
    selection.hidden=!chosen;
    selectedLabel.hidden=!chosen;
    const compatible=MOOD_MODELS.includes(getEngine());
    hint.textContent=compatible?'':'This image model does not support Moods. Switch to Seedream or Nano Banana Pro.';
    hint.hidden=compatible;
    switcher.hidden=compatible;
    switcher.disabled=!chosen;
    done.hidden=!compatible;
    done.disabled=!chosen;
    clearButton.disabled=!chosen;
    button.textContent=chosen?'✦ '+chosen.name:'✦ Moods';
    button.classList.toggle('is-mood-selected',!!chosen);
    button.setAttribute('aria-expanded',String(!panel.hidden));
  }
  function fitPanelViewport(){
    if(panel.hidden)return;
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
      copy.append(title,sub);card.append(media,copy);
      card.onclick=()=>{selected=key;intensity=board.intensity||60;render();onChange();};
      const edit=document.createElement('button');edit.type='button';edit.className='moods-board-edit';edit.textContent='Edit';
      edit.setAttribute('aria-label','Edit moodboard '+board.name);
      edit.onclick=event=>{event.stopPropagation();close();onEditPersonal(board);};
      wrap.append(card,edit);card.customWrap=wrap;grid.append(wrap);cards.set(key,card);
    }
    if(selected?.startsWith('custom:')&&!boardById(selected)){selected=null;intensity=60;onChange();}
    render();
    if(!panel.hidden){fitGridViewport();fitPanelViewport();}
  }
  // Show exactly two complete rows before the internal scrollbar reveals Sumi-e.
  function fitGridViewport(){
    if(panel.hidden)return;
    const visible=[...cards.values()].filter(card=>!card.hidden);
    if(!createTile.hidden)visible.unshift(createTile);
    grid.style.maxHeight='';
    if(window.innerWidth<=740||visible.length<=desktopGridColumns*initiallyVisibleRows){
      grid.tabIndex=visible.length>desktopGridColumns?0:-1;
      return;
    }
    const last=visible[desktopGridColumns*initiallyVisibleRows-1];
    const bounds=grid.getBoundingClientRect(),cardBounds=last.getBoundingClientRect();
    const firstTwoRows=Math.ceil(cardBounds.bottom-bounds.top+3);
    if(firstTwoRows>0)grid.style.maxHeight=firstTwoRows+'px';
    grid.tabIndex=0;
  }
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
  function clear(silent=false){selected=null;intensity=60;close(!silent);render();if(!silent)onChange();}
  function restore(settings,silent=false){
    selected=settings?.moodId==='custom'&&typeof settings.customMoodBoardId==='string'?'custom:'+settings.customMoodBoardId:moodById(settings?.moodId)?.id||null;
    intensity=Math.min(100,Math.max(1,Number(settings?.moodIntensity)||60));
    close();render();if(!silent)onChange();
  }
  function enrich(prompt,options={}){
    if(selected?.startsWith('custom:')){
      const mood=boardById(selected);
      return mood?preparePersonalMoodPrompt(prompt,mood,intensity,options):{prompt:String(prompt||'').trim(),metadata:{},error:'This saved Mood is not available. Open My Moods and choose another.'};
    }
    return prepareMoodPrompt(prompt,selected,intensity,options);
  }
  function error(engine,prompt,count=0,referenceMode='base'){return enrich(prompt,{engine,referenceCount:count,referenceMode}).error;}
  function sync({visible=true,locked=false}={}){button.hidden=!visible;button.disabled=locked;if(!visible||locked)close();if(visible)render();}
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
  switcher.onclick=()=>{chooseEngine('seedream');render();onChange();};
  grid.setAttribute('aria-label','Available moods; scroll down to explore more looks');
  function refreshViewport(){
    if(panel.hidden)return;
    fitGridViewport();fitPanelViewport();
  }
  window.addEventListener('resize',refreshViewport);
  window.visualViewport?.addEventListener('resize',refreshViewport);
  window.visualViewport?.addEventListener('scroll',refreshViewport);
  if(typeof ResizeObserver==='function'){
    const observer=new ResizeObserver(refreshViewport);
    observer.observe(panel.parentElement);
  }
  render();
  return {active:()=>!!selected,selected:()=>selected,intensity:()=>intensity,enrich,error,setPersonalMoods,
    invalid:(engine,prompt,count=0,referenceMode='base')=>!!error(engine,prompt,count,referenceMode),
    sync,open,close,clear,restore};
}
