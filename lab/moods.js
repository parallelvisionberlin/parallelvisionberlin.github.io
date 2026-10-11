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
    "id": "80s-film",
    "name": "80s Film",
    "category": "Analog",
    "preview": "/lab/mood-previews/80s-film.svg",
    "description": "Tungsten light, faded dyes",
    "direction": "Authentic early-1980s color-film atmosphere: warm tungsten practicals, restrained dye fade, gentle halation, lightly softened contrast, subtle fine grain, lifted shadow tones and period-credible lens rendering.",
    "subtle": "Gentle tungsten warmth with delicate halation and grain.",
    "intense": "Pronounced but tasteful analog film characteristics and warm practical interiors.",
    "avoid": "fake VHS bars, scratches, excessive yellow, retro costume caricature"
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
    "description": "Glossy dream light, physical fog, impossible liminal spaces",
    "direction": "PV LAB DREAMCORE: A REAL PHOTOGRAPH taken inside a dream, not fantasy illustration or CGI. Read the source and create ONE impossible event growing from its actual location and geometry. Keep the original camera viewpoint and real textures: pores, grain, weathered materials, shadows and reflections. Use source-led pearl aqua, soft pink, cyan, lavender and iridescent highlights instead of a generic gradient. Aim for quiet uncanny nostalgia, tactile gloss, luminous air and real spatial depth.",
    "subtle": "SUBTLE (1-34%): Preserve location and composition. Slight analog bloom, pastel ambient light, faint depth haze and delicate skin or fabric gloss. No spatial event.",
    "moderate": "ATMOSPHERIC (35-69%): Distinct luminous mist and iridescent reflected light, one modest surreal cue in the existing place. People receive natural-looking pearly skin and material highlights.",
    "immersive": "IMMERSIVE (70-89%): Strong scene-specific spatial transformation, physical clouds or impossible depth in the actual environment. Layered fog and light interact with the whole image; people gain visible opalescent or satin-metallic surfaces.",
    "intense": "IMPOSSIBLE REALITY (90-99%): The source location becomes a convincing impossibility, not just a new sky. Let ONE spatial phenomenon inhabit the original architecture or terrain, from foreground to background. Strong wet pearl gloss on existing skin or garments, preserved anatomy and outfit cut.",
    "climax": "MAXIMUM 100%: FULL DREAM TAKEOVER. One spectacular impossible event must occupy foreground, middle ground and depth, physically growing from the real setting. Clouds, water-light or mist can flow through existing openings and surfaces, with shared light, realistic occlusion and reflective air. The SAME person can acquire distinctly pearlescent, glossy, wet or subtly metallic skin and clothing finish, never a new face, body, pose or outfit coverage. Keep the real photographic lens and texture. Only a pastel grade, unrelated fantasy building or woman pasted before clouds is failure.",
    "avoid": "royal arches, palaces, castles, fantasy terraces, unrelated beds, angelic heaven, resort architecture, inserted trains, stock cloud wallpaper, pasted fog, fake wet floor, cartoon colors, chrome dolls, over-smooth skin, false silhouettes, altered face, body or outfit coverage, artificial CGI",
    "subjectRouting": "SOURCE ROUTING: If a person is visible in the Base image or requested output, follow PERSON. Otherwise follow SCENE. For text-only use the written subject; for reference-only respect assigned roles. This selection is a visual instruction to the generation model, not a separate classifier.",
    "person": "PERSON: KEEP the same face, hair silhouette, expression, body proportions, anatomy, pose, framing and camera viewpoint. Transform surface FINISH too: physically plausible pearlescent wet-looking skin gloss, soft-metallic or opalescent highlights that follow natural anatomy, pores and the actual light. Existing garments may gain satin shine or iridescent reflections while retaining their cut and coverage unless the user asks otherwise. Never replace the person or cut them out from the scene.",
    "environment": "SCENE: When no person is present, preserve the original setting's type and recognizable geometry while making its space impossible. Coast stays coastal, corridors stay passages, real pools stay aquatic, and streets remain urban. Choose ONE surreal event growing from an actual surface, doorway, horizon or vanishing point; never copy the mood preview's objects. If a person exists, transform the surroundings as well. Do not invent an unrelated palace, resort, bed or train.",
    "atmosphere": "PHYSICAL FOG AND GLOSS: Fog is true atmospheric volume with variable depth. It scatters scene light, partly obscures distant objects, wraps some nearby contours, crosses in front of and behind objects, and creates coherent reflections. Never a white overlay or clouds pasted behind a cutout subject. Maintain readable facial features, material imperfections, real contact shadows and physically motivated glossy highlights.",
    "compact": "DREAMCORE: REAL source location photographed inside a dream, not CGI. Read source or written direction. IF PERSON: same face, hair, anatomy, pose and framing; allow luminous pearly wet skin gloss and subtle metallic or satin sheen on existing clothes, retaining cut and coverage. IF NO PERSON: preserve place type and viewpoint, transform its own geometry and depth without adding people. ONE source-led impossible event. Fog is physical volume: coherent depth, light scattering and occlusion, not overlay. Keep skin pores and real texture, use pale aqua/lilac/pink accents sparingly.",
    "compactSubtle": "SUBTLE (1-34%): Minor color, haze, film texture and gloss only.",
    "compactModerate": "ATMOSPHERIC (35-69%): Layered luminous fog, pearly skin or material and one small surreal cue.",
    "compactImmersive": "IMMERSIVE (70-89%): Substantial source-led transformation with dimensional haze, reflections and gloss.",
    "compactIntense": "IMPOSSIBLE REALITY (90-99%): Major impossible event from real space with strong volumetric light and sheen.",
    "compactClimax": "MAXIMUM 100%: FULL DREAM TAKEOVER. One large impossible transformation affects foreground, midground and depth; preserve identity and pose, allow strong opalescent skin or fabric FINISH. Photographically integrated fog and reflection.",
    "compactAvoid": "royal architecture, random bed, fake fantasy CGI, pasted clouds, fake wet floor, cutout human, altered body, outfit replacement"
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
  if(settings?.moodId)return ['Mood',text].filter(Boolean).join(' · ');
  if(settings?.mode==='upscale')return 'Image upscale / '+String(settings.resolution||'').toUpperCase();
  return text||'No direction saved.';
}


export function prepareMoodPrompt(input='',id='',amount=60,{engine='seedream',referenceCount=0,referenceMode='base'}={}){
  const original=String(input||'').trim(),mood=moodById(id);
  if(!mood)return {prompt:original,metadata:{},error:''};
  if(!MOOD_MODELS.includes(engine))return {prompt:original,metadata:{},error:'Moods v1 supports Seedream 5 Pro and Nano Banana Pro. Choose one of these models first.'};
  const intensity=Math.max(1,Math.min(100,Math.round(Number(amount)||60)));
  const dreamcore=mood.id==='dreamcore';
  const compactDreamcore=dreamcore&&(referenceCount>=4||original.length>=1100);
  const dreamcoreTier=intensity<=34?'Subtle':intensity<=69?'Moderate':intensity<=89?'Immersive':intensity<=99?'Intense':'Climax';
  const dreamcoreKey=intensity<=34?'subtle':intensity<=69?'moderate':intensity<=89?'immersive':intensity<=99?'intense':'climax';
  const context=referenceCount===0?'No Base: use the written subject.':referenceMode==='references'?'Reference-only: follow requested output and explicitly assigned roles.':'Inspect the first Base image to choose PERSON or SCENE.';
  const style=dreamcore
    ?[compactDreamcore?mood.compact:[mood.direction,mood.subjectRouting,mood.person,mood.environment,mood.atmosphere].join(' '),
      context,'Creative intensity '+intensity+'/100; artistic instruction strength, NOT literal pixel opacity.',
      compactDreamcore?mood['compact'+dreamcoreTier]:mood[dreamcoreKey]
    ].join(' ')
    :intensity<=34?mood.subtle:intensity>=76?mood.direction+' '+mood.intense:mood.direction;
  const preservation=referenceCount>0
    ?referenceMode==='references'
      ?'The uploaded images only supply their assigned reference roles. Keep referenced people recognisable without copying unintended people.'
      :mood.id==='dreamcore'
        ?compactDreamcore
          ?'Base image: keep identity, anatomy, pose, camera and garment coverage; transform surface and scene. Follow reference roles.'
          :'Base image: preserve human identity, proportions, pose and recognizable outfit coverage, but transform material finish and environment. If no person, preserve scene type and camera while transforming atmosphere and space. Respect reference roles. Guidance, not a guarantee.'
        :'The first reference is the base photograph. Preserve face, identity, real body proportions, pose, camera, wardrobe and composition unless the user specifically asks to change them. Preservation is guidance, not a guarantee.'
    :'Honor the requested subject and composition.';
  const prompt=[original,'PV LAB MOOD / '+mood.name+': '+style+' '+preservation+' Avoid: '+(compactDreamcore?mood.compactAvoid:mood.avoid)+'.'].filter(Boolean).join('\n\n');
  return {prompt,metadata:{moodId:mood.id,moodIntensity:intensity,moodOriginalPrompt:original},
    error:prompt.length>5000?'Prompt and mood exceed 5,000 characters. Shorten the direction or clear the mood.':(!original&&!referenceCount?'Describe a subject or add an image before generating with a mood.':'')};
}
export function createMoodSelector({panel,button,getEngine,chooseEngine,onChange,onOpen}){
  const grid=panel.querySelector('#composer-moods-grid');
  const filters=panel.querySelector('#composer-moods-filters');
  const slider=panel.querySelector('#composer-moods-intensity');
  const amount=panel.querySelector('#composer-moods-amount');
  const summary=panel.querySelector('#composer-moods-summary');
  const selectedLabel=panel.querySelector('#composer-moods-current-label');
  const hint=panel.querySelector('#composer-moods-compat');
  const switcher=panel.querySelector('#composer-moods-switch');
  const done=panel.querySelector('#composer-moods-done');
  const clearButton=panel.querySelector('#composer-moods-none');
  const aboutButton=panel.querySelector('#composer-moods-about');
  const aboutDetails=panel.querySelector('#composer-moods-explanation');
  let selected=null,intensity=60,category='All';
  const desktopGridColumns=5,initiallyVisibleRows=2;
  const tabs=new Map(),cards=new Map();
  for(const name of ['All','Cinema','Fashion','Analog','Experimental']){
    const tab=document.createElement('button');tab.type='button';tab.className='moods-filter';tab.textContent=name;
    tab.onclick=()=>{category=name;grid.scrollTop=0;render();fitGridViewport();};filters.append(tab);tabs.set(name,tab);
  }
  for(const mood of MOODS){
    const card=document.createElement('button');card.type='button';card.className='moods-card';
    card.setAttribute('aria-label','Select '+mood.name);card.setAttribute('aria-pressed','false');
    const media=document.createElement('span');media.className='moods-card-media moods-look-'+mood.id;
    const image=document.createElement('img');image.src=mood.preview;image.alt='';image.loading='lazy';image.decoding='async';media.append(image);
    const info=document.createElement('span');info.className='moods-card-copy';
    const title=document.createElement('strong');title.textContent=mood.name;
    const subtitle=document.createElement('small');subtitle.textContent=mood.description;info.append(title,subtitle);
    card.append(media,info);
    card.onclick=()=>{selected=mood.id;render();onChange();};
    grid.append(card);cards.set(mood.id,card);
  }
  function render(){
    for(const [name,tab] of tabs){tab.classList.toggle('is-selected',category===name);tab.setAttribute('aria-pressed',String(category===name));}
    for(const mood of MOODS){const card=cards.get(mood.id);card.hidden=category!=='All'&&category!==mood.category;card.classList.toggle('is-selected',mood.id===selected);card.setAttribute('aria-pressed',String(mood.id===selected));}
    slider.value=String(intensity);slider.style.setProperty('--moods-progress',((intensity-1)/99*100).toFixed(2)+'%');slider.disabled=!selected;amount.textContent=intensity+'%';
    const chosen=moodById(selected);
    summary.textContent=chosen?chosen.name:'Select a mood';
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
  // Show exactly two complete rows before the internal scrollbar reveals Sumi-e.
  function fitGridViewport(){
    if(panel.hidden)return;
    const visible=[...cards.values()].filter(card=>!card.hidden);
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
  function close(){closeAbout();panel.hidden=true;button.setAttribute('aria-expanded','false');}
  function open(){
    if(button.disabled)return;
    onOpen();closeAbout();panel.hidden=false;render();grid.scrollTop=0;fitGridViewport();
    if(selected==='sumi-ink'){
      const card=cards.get(selected),viewport=grid.getBoundingClientRect();
      if(card&&card.getBoundingClientRect().bottom>viewport.bottom)
        grid.scrollTop+=card.getBoundingClientRect().bottom-viewport.bottom+4;
    }
    panel.querySelector('#composer-moods-title')?.focus();
  }
  function clear(silent=false){selected=null;intensity=60;close();render();if(!silent)onChange();}
  function restore(settings,silent=false){selected=moodById(settings?.moodId)?.id||null;intensity=Math.min(100,Math.max(1,Number(settings?.moodIntensity)||60));close();render();if(!silent)onChange();}
  function enrich(prompt,options={}){return prepareMoodPrompt(prompt,selected,intensity,options);}
  function error(engine,prompt,count=0,referenceMode='base'){return enrich(prompt,{engine,referenceCount:count,referenceMode}).error;}
  function sync({visible=true,locked=false}={}){button.hidden=!visible;button.disabled=locked;if(!visible||locked)close();if(visible)render();}
  slider.addEventListener('input',()=>{intensity=Number(slider.value);render();onChange();});
  button.onclick=()=>{if(panel.hidden)open();else close();};
  panel.querySelector('#composer-moods-close').onclick=close;
  done.onclick=close;
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
    if(event.key==='Escape'&&!aboutDetails.hidden){
      event.preventDefault();
      event.stopPropagation();
      closeAbout(true);
    }
  });
  switcher.onclick=()=>{chooseEngine('seedream');render();onChange();};
  grid.setAttribute('aria-label','Available moods; scroll down to explore more looks');
  window.addEventListener('resize',()=>{if(!panel.hidden)fitGridViewport();});
  render();
  return {active:()=>!!selected,selected:()=>selected,intensity:()=>intensity,enrich,error,
    invalid:(engine,prompt,count=0,referenceMode='base')=>!!error(engine,prompt,count,referenceMode),
    sync,open,close,clear,restore};
}
