// PV LAB owner-only Effects templates. Preview media is user-supplied, not a generated result.
// Selection prepares the existing priced Seedance Transform workflow; it never generates.
export const VIDEO_EFFECTS=Object.freeze([
  Object.freeze({
    id:'metro-blonde',name:'Metro Blonde',category:'FASHION / REPLACE CHARACTER',
    description:'Take the lead in a nocturnal underground fashion film.',
    previewVideo:'https://v3b.fal.media/files/b/0ab20f45/14erHeV1g2-yYVnPAn42K_METROBLONDE.mp4',
    engine:'seedance',mode:'transform',duration:10,resolution:'720p',audio:false,
    prompt:'Replace the blonde woman in the supplied original underground-train video with the adult person in the attached identity photograph(s). Keep exactly one principal subject. Follow the original clip closely: same train interior, windows, dark reflective surfaces, passing light streaks, camera angles and movements, shot timing, expressions and natural head turns. Preserve the subject’s real facial structure, complexion, hair texture and proportions from the identity references rather than inheriting the original actress’s face. Keep the black editorial clothing, real fabric and skin texture, believable reflections and grainy photographic lighting. Natural human motion; preserve scene continuity, camera direction and original cinematic pacing. No additional characters, face melting, synthetic plastic skin, sudden cuts, fantasy effects or changes to the train setting.'
  })
]);
export function getVideoEffect(id){return VIDEO_EFFECTS.find(effect=>effect.id===id)||null;}
export function resolveVideoEffect(id,enabledEngines){
  const effect=getVideoEffect(id);
  if(!effect)return {ok:false,message:'This template is unavailable.'};
  if(!Array.isArray(enabledEngines)||!enabledEngines.includes(effect.engine))
    return {ok:false,message:effect.name+' requires Seedance 2.5 Transform, which is not enabled for this account. Nothing was submitted.'};
  return {ok:true,effect,settings:{
    engine:effect.engine,mode:effect.mode,duration:effect.duration,
    resolution:effect.resolution,audio:effect.audio,prompt:effect.prompt
  }};
}
const PHOTO_TYPES=new Set(['image/jpeg','image/png','image/webp']);
export function validateEffectIdentityPhoto(file){
  if(!file||!PHOTO_TYPES.has(file.type)||!file.size||file.size>20*1048576)
    throw new Error('Choose a JPG, PNG or WebP identity photograph under 20 MB.');
  return file;
}
export function mountVideoEffectsGallery(root,onSelect,onError=()=>{}){
  if(!root||typeof onSelect!=='function')throw Error('Effects gallery needs its container and selection handler.');
  root.replaceChildren();
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
    for(const entry of entries){
      const video=entry.target;
      if(entry.isIntersecting){
        if(!video.src)video.src=video.dataset.src;
        if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)video.play().catch(()=>{});
      }else video.pause();
    }
  },{rootMargin:'160px 0px'}):null;
  VIDEO_EFFECTS.forEach((effect,index)=>{
    const card=document.createElement('article');card.className='video-effect-card';card.dataset.effect=effect.id;
    const video=document.createElement('video');video.className='video-effect-card-video';
    video.muted=true;video.loop=true;video.playsInline=true;video.preload='none';video.disablePictureInPicture=true;
    video.dataset.src=effect.previewVideo;video.setAttribute('aria-hidden','true');video.setAttribute('tabindex','-1');
    if(observer)observer.observe(video);
    const shade=document.createElement('div');shade.className='video-effect-card-shade';shade.setAttribute('aria-hidden','true');
    const marker=document.createElement('span');marker.className='video-effect-card-marker';marker.textContent='TEMPLATE / '+String(index+1).padStart(2,'0');
    const action=document.createElement('button');action.type='button';action.className='video-effect-card-activate';
    action.setAttribute('aria-label','Use '+effect.name+' template');
    const copy=document.createElement('span');copy.className='video-effect-card-copy';
    const category=document.createElement('small');category.textContent=effect.category;
    const title=document.createElement('strong');title.textContent=effect.name;
    const note=document.createElement('span');note.textContent='10 SEC · VIDEO / REPLACE';
    copy.append(category,title,note);action.append(copy);
    const photo=document.createElement('label');photo.className='video-effect-photo-drop';
    photo.title='Drop your photograph or click to choose';
    const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';
    input.className='video-effect-photo-input';input.setAttribute('aria-label','Upload your identity photograph for '+effect.name);
    const icon=document.createElement('span');icon.className='video-effect-photo-icon';icon.textContent='+';
    const label=document.createElement('span');label.className='video-effect-photo-label';label.textContent='YOUR PHOTO';
    const thumb=document.createElement('img');thumb.hidden=true;thumb.alt='Your selected identity photograph';
    photo.append(input,thumb,icon,label);
    let selectedPhoto=null,photoUrl=null;
    const usePhoto=next=>{
      try{
        validateEffectIdentityPhoto(next);
        if(photoUrl)URL.revokeObjectURL(photoUrl);
        selectedPhoto=next;photoUrl=URL.createObjectURL(next);thumb.src=photoUrl;thumb.hidden=false;
        card.classList.add('has-identity');label.textContent='CHANGE PHOTO';
      }catch(error){onError(error.message);}
    };
    input.addEventListener('change',()=>{if(input.files?.[0])usePhoto(input.files[0]);});
    photo.addEventListener('dragover',event=>{event.preventDefault();event.dataTransfer.dropEffect='copy';photo.classList.add('is-dragging');});
    photo.addEventListener('dragleave',()=>photo.classList.remove('is-dragging'));
    photo.addEventListener('drop',event=>{
      event.preventDefault();photo.classList.remove('is-dragging');
      if(event.dataTransfer.files?.[0])usePhoto(event.dataTransfer.files[0]);
    });
    action.addEventListener('click',()=>onSelect(effect.id,selectedPhoto));
    card.append(video,shade,action,marker,photo);
    root.append(card);
  });
}
