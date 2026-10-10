/* PV Lab Moods V1. Editorial generation directions, not pixel filters. */
export const MOODS=Object.freeze([
  {
    "id": "hong-kong-nights",
    "name": "Hong Kong Nights",
    "category": "Cinema",
    "preview": "/assets/optimized/2063/lived-city/bedroom-before-dawn.webp",
    "description": "Neon, rain and longing",
    "direction": "1990s Hong Kong romantic cinema, red and green practical lights, rain-softened window reflections, tungsten pools, deep layered shadow, organic 35mm halation and intimate urban melancholy.",
    "subtle": "Restrained practical red and green light and a little film halation; keep the original room.",
    "intense": "Full nocturnal cinematic atmosphere with wet reflections, but keep all referenced faces, poses and composition.",
    "avoid": "generic cyberpunk, synthetic skin, neon outlines"
  },
  {
    "id": "90s-cinema",
    "name": "90s Cinema",
    "category": "Cinema",
    "preview": "/assets/optimized/2063/lived-city/nina-bedroom-afternoon.webp",
    "description": "Human, imperfect, cinematic",
    "direction": "Grounded late-1990s independent film still, unforced composition, natural imperfect light, credible wardrobe and production design, subtle 35mm grain, warm neutral film colors, soft highlight transitions and unstaged emotion.",
    "subtle": "Subtle 1990s film color and fine grain; retain the source setting.",
    "intense": "More pronounced independent-film light and narrative depth with believable physical materials.",
    "avoid": "plastic skin, overly polished CGI, teal-orange blockbuster colors"
  },
  {
    "id": "night-flash",
    "name": "Night Flash",
    "category": "Fashion",
    "preview": "/assets/optimized/2063/nightlife/ALE IRENA CANON.webp",
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
    "preview": "/assets/optimized/2063/after-the-collapse/post-apo-bedroom-panorama.webp",
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
    "description": "Sun-warmed 35mm color",
    "direction": "Classic warm consumer color negative film character inspired by Kodak Gold, golden sunlight, gentle highlight rolloff, accurate warm skin, natural deep greens, fine organic grain, subtle exposure variation and realistic microcontrast.",
    "subtle": "A hint of golden highlights and delicate fine-grain texture.",
    "intense": "Bright summer film warmth, warm color separation and rich negative-film rolloff.",
    "avoid": "orange faces, clipped highlights, heavy fake scratches"
  },
  {
    "id": "soft-pastel-film",
    "name": "Soft Pastel Film",
    "category": "Analog",
    "preview": "/lab/visuals/ivory-motion.webp",
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
    "preview": "/assets/optimized/2063/organic-futures/green-avenue.webp",
    "description": "Translucent Y2K optimism",
    "direction": "Early 2000s technology-optimist Frutiger Aero design: luminous pale blue-white light, convincing translucent objects, watery reflections, subtle soft gradients, airy modern materials and elegant utopian visual optimism.",
    "subtle": "Clean airy blue-white color and believable reflections, no new distracting elements.",
    "intense": "Translucent glasslike spatial accents and playful Y2K optimism, anchored in credible photographic materials.",
    "avoid": "childish vector stickers, floating UI icons, grim cyberpunk"
  },
  {
    "id": "sumi-ink",
    "name": "Sumi Ink",
    "category": "Experimental",
    "preview": "/assets/optimized/2063/hyperfuture/16-ninas-bath-grown-from-obsidian.webp",
    "description": "Japanese brush and negative space",
    "direction": "Refined traditional Japanese sumi-e ink wash: handmade washi paper, expressive deliberate brush marks, sensitive grayscale ink transitions, restrained composition, poetic negative space and minimal tonal gesture.",
    "subtle": "Keep the original silhouettes legible with subtle monochrome ink wash and paper texture.",
    "intense": "More expressive abstraction and atmospheric negative space, preserving the important subject arrangement.",
    "avoid": "anime, manga outlines, random calligraphy, glossy digital painting"
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
export const MOOD_MODELS=Object.freeze(['seedream','gemini']);
export const moodById=id=>MOODS.find(m=>m.id===id)||null;
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
  if(mood)return [mood.name,text].filter(Boolean).join(' · ');
  if(settings?.moodId)return ['Mood',text].filter(Boolean).join(' · ');
  if(settings?.mode==='upscale')return 'Image upscale / '+String(settings.resolution||'').toUpperCase();
  return text||'No direction saved.';
}


export function prepareMoodPrompt(input='',id='',amount=60,{engine='seedream',referenceCount=0,referenceMode='base'}={}){
  const original=String(input||'').trim(),mood=moodById(id);
  if(!mood)return {prompt:original,metadata:{},error:''};
  if(!MOOD_MODELS.includes(engine))return {prompt:original,metadata:{},error:'Moods v1 supports Seedream 5 Pro and Nano Banana Pro. Choose one of these models first.'};
  const intensity=Math.max(1,Math.min(100,Math.round(Number(amount)||60)));
  const style=intensity<=34?mood.subtle:intensity>=76?mood.direction+' '+mood.intense:mood.direction;
  const preservation=referenceCount>0
    ?referenceMode==='references'
      ?'The uploaded images only supply their assigned reference roles. Keep referenced people recognisable without copying unintended people.'
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
  const hint=panel.querySelector('#composer-moods-compat');
  const switcher=panel.querySelector('#composer-moods-switch');
  let selected=null,intensity=60,category='All';
  const tabs=new Map(),cards=new Map();
  for(const name of ['All','Cinema','Fashion','Analog','Experimental']){
    const tab=document.createElement('button');tab.type='button';tab.className='moods-filter';tab.textContent=name;
    tab.onclick=()=>{category=name;render();};filters.append(tab);tabs.set(name,tab);
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
    slider.value=String(intensity);slider.disabled=!selected;amount.textContent=intensity+'%';
    const chosen=moodById(selected);
    summary.textContent=chosen?chosen.name+' / '+(intensity<=34?'Subtle':intensity>=76?'Strong':'Balanced'):'No mood selected';
    const compatible=MOOD_MODELS.includes(getEngine());
    hint.textContent=compatible?'AI styling may change details. Reference preservation is guidance, not a guarantee.':'Switch to Seedream or Nano Banana Pro to use a mood.';
    switcher.hidden=compatible;
    button.textContent=chosen?'✦ '+chosen.name:'✦ Moods';
    button.classList.toggle('is-mood-selected',!!chosen);
    button.setAttribute('aria-expanded',String(!panel.hidden));
  }
  function close(){panel.hidden=true;button.setAttribute('aria-expanded','false');}
  function open(){if(button.disabled)return;onOpen();panel.hidden=false;render();panel.querySelector('#composer-moods-title')?.focus();}
  function clear(silent=false){selected=null;intensity=60;close();render();if(!silent)onChange();}
  function restore(settings,silent=false){selected=moodById(settings?.moodId)?.id||null;intensity=Math.min(100,Math.max(1,Number(settings?.moodIntensity)||60));close();render();if(!silent)onChange();}
  function enrich(prompt,options={}){return prepareMoodPrompt(prompt,selected,intensity,options);}
  function error(engine,prompt,count=0,referenceMode='base'){return enrich(prompt,{engine,referenceCount:count,referenceMode}).error;}
  function sync({visible=true,locked=false}={}){button.hidden=!visible;button.disabled=locked;if(!visible||locked)close();if(visible)render();}
  slider.addEventListener('input',()=>{intensity=Number(slider.value);render();onChange();});
  button.onclick=()=>{if(panel.hidden)open();else close();};
  panel.querySelector('#composer-moods-close').onclick=close;
  panel.querySelector('#composer-moods-done').onclick=close;
  panel.querySelector('#composer-moods-none').onclick=()=>clear();
  switcher.onclick=()=>{chooseEngine('seedream');render();onChange();};
  render();
  return {active:()=>!!selected,selected:()=>selected,intensity:()=>intensity,enrich,error,
    invalid:(engine,prompt,count=0,referenceMode='base')=>!!error(engine,prompt,count,referenceMode),
    sync,open,close,clear,restore};
}
