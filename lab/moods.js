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
    "description": "Pastel liminal worlds, glowing clouds and impossible calm",
    "direction": "Photoreal dreamcore: turn the source into a vivid memory of somewhere that could not quite exist. Preserve the principal subject's identity, face, proportions, pose, recognizable clothing design and essential framing. Let the surrounding world respond to the selected intensity. Favor pearly cyan, powder pink, lavender and peach light, physically present haze, believable reflected illumination and an elegant, softly uncanny atmosphere. Choose surreal changes appropriate to the source rather than reproducing a preset image. All transformed light, mist and reflections must interact naturally with skin, hair, clothing and the location. Keep tactile photographic materials, coherent camera perspective, natural anatomy and subtle optical softness.",
    "subtle": "SUBTLE (1-34%): Keep architecture, setting and garment colors close to the original. Introduce restrained pastel ambient separation, gentle optical bloom around existing light sources, faint photographic haze and slight iridescent reflections only on suitable materials. No invented scenery or structural changes at this strength.",
    "moderate": "ATMOSPHERIC (35-69%): Noticeably reshape the ambient light into soft cyan, shell pink and lavender where physically credible. Add visible layered mist, pearlescent reflections, gentle haze entering the environment and one small scene-appropriate surreal cue, such as a strangely luminous sky visible through a window. Preserve the recognizable location, original people and clothing construction; this must go beyond a mere pastel filter.",
    "immersive": "IMMERSIVE (70-89%): Transform the surrounding atmosphere and background decisively. Introduce substantial volumetric cloud formations or luminous drifting fog where spatially appropriate, vivid iridescent reflections and altered pastel illumination that affects the whole scene. Familiar architecture can begin to open into improbable skies, distant endless water or cloud-filled spaces, selected only when natural to this location. Preserve the principal subject, essential image layout and original camera viewpoint. Allow small harmonious garment hue shifts but keep its shape, texture and details unchanged. The result must be an immersive dream world, not just recoloring.",
    "intense": "IMPOSSIBLE REALITY (90-100%): Make the environmental transformation unmistakable. Select one coherent, substantial spatial impossibility that grows from the source: windows can reveal immense pastel cloudscapes or impossible horizons; luminous clouds can drift into an ordinary room; a familiar passage can open into endless water; an existing coastline can dissolve into a spectacular pearlescent sky. Use monumental yet believable cloud volumes, layered glowing mist, iridescent light and reflections with physical depth. Relight the person and surroundings as a single photograph, with no pasted-on overlays or cutout edges. Preserve identity, anatomy, pose, recognizable clothing design, primary camera viewpoint and essential composition; allow only gentle wardrobe hue drift, never garment replacement. Serene, nostalgic, beautiful and quietly uncanny. At maximum intensity this must be actual world transformation, never only a pastel color grade.",
    "avoid": "flat pastel overlays, mere color grading at high intensity, copying preview trains or pools, indiscriminate fantasy props, pasted sticker clouds, colored glow around a cutout person, fog hiding faces, arbitrary wet floors, new people, clothing replacement, warped anatomy, plastic skin, glossy CGI architecture, symmetrical AI resorts, garish rainbow neon, childish cartoon fantasy, horror"
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
  const style=mood.id==='dreamcore'
    ?mood.direction+' '+(intensity<=34?mood.subtle:intensity<=69?mood.moderate:intensity<=89?mood.immersive:mood.intense)
    :intensity<=34?mood.subtle:intensity>=76?mood.direction+' '+mood.intense:mood.direction;
  const preservation=referenceCount>0
    ?referenceMode==='references'
      ?'The uploaded images only supply their assigned reference roles. Keep referenced people recognisable without copying unintended people.'
      :mood.id==='dreamcore'
        ?'The first reference is the base photograph. Preserve face, identity, real body proportions, pose, recognizable clothing design and primary camera viewpoint. Keep the essential composition, but allow increasingly surreal background, lighting and environmental transformations as Dreamcore intensity rises. Subtle garment color changes are permitted at high intensity, not changes to its design or material. Preservation is guidance, not a guarantee.'
        :'The first reference is the base photograph. Preserve face, identity, real body proportions, pose, camera, wardrobe and composition unless the user specifically asks to change them. Preservation is guidance, not a guarantee.'
    :'Honor the requested subject and composition.';
  const prompt=[original,'PV LAB MOOD / '+mood.name+': '+style+' '+preservation+' Avoid: '+mood.avoid+'.'].filter(Boolean).join('\n\n');
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
