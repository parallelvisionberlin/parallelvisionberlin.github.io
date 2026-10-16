// PV LAB Motion Effects v1. These are creative direction presets, not provider guarantees.
// Each preset uses an existing, explicitly named Video Studio model and the normal priced quote.
export const VIDEO_EFFECTS=Object.freeze([
  Object.freeze({
    id:'liquid-metal',name:'Liquid Metal',category:'MATERIAL / TRANSFORMATION',
    description:'Reflective silver flows across material and settles into a sculptural surface.',
    poster:'./visuals/invite-liquid-chrome-20261015.jpg',engine:'seedance',
    duration:5,resolution:'720p',audio:false,
    prompt:'One continuous photorealistic shot based on the supplied start frame. A narrow stream of liquid chrome starts moving across an existing garment or visible solid surface, flowing with believable viscosity, weight and mirrored reflections. The silver spreads in connected waves and briefly forms sculptural folds, then settles. Keep the same person, recognizable face, body proportions, clothing coverage, camera framing and original environment. The subject makes only subtle natural movements. Consistent light sources, plausible reflection changes, restrained high-end fashion editorial realism. Locked camera, no cuts. Do not replace the person, invent extra limbs or new faces, melt skin, change the set, or turn the scene into CGI.'
  }),
  Object.freeze({
    id:'fabric-storm',name:'Fabric Storm',category:'FASHION / PHYSICS',
    description:'Wind turns cloth into dramatic, believable sculptural movement.',
    poster:'./mood-previews/berlin-rave-detail-20261015.webp',engine:'seedance',
    duration:5,resolution:'720p',audio:false,
    prompt:'Use the uploaded frame as the exact opening composition. A sudden sustained gust of wind catches the visible fabric, pulling it into large elegant sculptural arcs and folds around the subject. The cloth remains attached to its original seams and has physical tension, weight, natural inertia and a coherent direction of airflow. The subject holds their ground with subtle realistic hair and body motion. Preserve facial identity, anatomy, wardrobe coverage, scene, architecture and lighting. Fashion campaign photography, tactile textile detail, no editing cuts, slow controlled camera push only if necessary. Do not create extra people, disconnected garments, impossible hands or CGI-looking fabric.'
  }),
  Object.freeze({
    id:'ghost-motion',name:'Ghost Motion',category:'MOVEMENT / EXPOSURE',
    description:'One movement leaves a soft trail of previous moments.',
    poster:'./mood-previews/dream-blur-20261015.jpg',engine:'seedance15',
    duration:5,resolution:'720p',audio:false,
    prompt:'Animate the supplied photograph as a continuous realistic editorial shot. The main subject slowly turns or takes one small step, leaving two or three very faint translucent long-exposure echoes along the path of movement. One physical person remains solid and sharply recognizable throughout; the echoes behave as photographic light trails, never as additional bodies. Preserve the original face, body, wardrobe, pose continuity, room and color palette. Locked camera, natural human micro-movements, a measured slow-shutter finish with selective motion blur and realistic texture. No jump cuts, no new subjects, no duplicated solid faces, no melting features, no fantasy glow.'
  })
]);
export function getVideoEffect(id){
  return VIDEO_EFFECTS.find(effect=>effect.id===id)||null;
}
export function resolveVideoEffect(id,enabledEngines){
  const effect=getVideoEffect(id);
  if(!effect)return {ok:false,message:'This effect is unavailable.'};
  if(!Array.isArray(enabledEngines)||!enabledEngines.includes(effect.engine))
    return {ok:false,message:effect.name+' currently requires '+(effect.engine==='seedance15'?'Seedance 1.5 Pro':'Seedance 2.5')+'. This model is not enabled for this account. Nothing was submitted.'};
  return {ok:true,effect,settings:{
    engine:effect.engine,mode:'start',duration:effect.duration,
    resolution:effect.resolution,audio:effect.audio,prompt:effect.prompt
  }};
}
export function mountVideoEffectsGallery(root,onSelect){
  if(!root||typeof onSelect!=='function')throw Error('Effects gallery needs its container and selection handler.');
  root.replaceChildren();
  for(const effect of VIDEO_EFFECTS){
    const card=document.createElement('button');
    card.type='button';card.className='video-effect-card';card.dataset.effect=effect.id;
    card.setAttribute('aria-label','Use '+effect.name+' effect');
    const image=document.createElement('img');
    image.src=effect.poster;image.alt='Creative direction for '+effect.name+'; not a generated video result';
    image.loading='lazy';image.decoding='async';
    const top=document.createElement('span');top.className='video-effect-card-top';top.textContent='MOTION STUDY / 0'+(VIDEO_EFFECTS.indexOf(effect)+1);
    const copy=document.createElement('span');copy.className='video-effect-card-copy';
    const category=document.createElement('span');category.className='video-effect-card-category';category.textContent=effect.category;
    const title=document.createElement('strong');title.textContent=effect.name;
    const description=document.createElement('span');description.className='video-effect-card-description';description.textContent=effect.description;
    const footer=document.createElement('span');footer.className='video-effect-card-footer';
    const settings=document.createElement('span');settings.textContent=effect.duration+' SEC · '+effect.resolution.toUpperCase();
    const action=document.createElement('span');action.textContent='USE EFFECT ↗';
    footer.append(settings,action);copy.append(category,title,description,footer);
    card.append(image,top,copy);card.addEventListener('click',()=>onSelect(effect.id));
    root.append(card);
  }
}
