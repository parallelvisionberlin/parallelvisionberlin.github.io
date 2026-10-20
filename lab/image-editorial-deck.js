/* PV LAB Image deck input behavior. Never changes prompts, jobs, quotes,
   Stripe, authentication or model selection. */
(()=>{
  const guest=document.getElementById('pv-guest-composer');
  const guestField=document.getElementById('pv-guest-prompt');
  const real=document.getElementById('image-composer');
  const realField=document.getElementById('image-composer-prompt');
  const refs=document.getElementById('image-composer-references');
  if(!guest||!guestField||!real||!realField)return;
  const small=window.matchMedia('(max-width:680px)');
  const preview={guest:false,real:false};
  // PV Soul keeps its own established editor behavior. The standard Image
  // deck must not turn a simple cursor focus into a taller writing surface.
  let realEditingStarted=false;
  let emptyRealFocus=false;
  let emptyGuestFocus=false;
  function realPromptNeedsSpace(surface,field){
    if(!field.value.trim())return false;
    // A deliberate line break needs a writing surface, even when short.
    if(field.value.includes('\n'))return true;
    // Measure against the *compact* field. Reading an already-expanded
    // textarea would make a previously long prompt sticky after shortening.
    const wasExpanded=surface.classList.contains('pv-deck-expanded');
    const previousHeight=field.style.height;
    if(wasExpanded)surface.classList.remove('pv-deck-expanded');
    field.style.removeProperty('height');
    const needsSpace=field.scrollHeight>field.clientHeight+3||
      field.scrollWidth>field.clientWidth+3;
    field.style.height=previousHeight;
    if(wasExpanded)surface.classList.add('pv-deck-expanded');
    return needsSpace;
  }
  function update(surface,field,kind){
    if(!surface)return;
    const hasRefs=kind==='real' && refs && !refs.hidden && refs.children.length>0;
    const guestPhotos=document.getElementById('pv-guest-attachments');
    const hasGuestPhotos=kind==='guest'&&!!guestPhotos&&!guestPhotos.hidden;
    const active=document.activeElement===field;
    const isSmall=small.matches;
    const hasPrompt=!!field.value.trim();
    // Keep the public entrance compact at rest, then open the same unframed
    // writing instrument on focus, when typing, or when photos are selected.
    const guestNeedsSpace=kind==='guest'&&
      (hasPrompt||(active&&emptyGuestFocus));
    const isSoul=kind==='real'&&surface.classList.contains('is-pv-soul');
    const realNeedsSpace=kind==='real'&&!isSoul&&!hasRefs&&
      realPromptNeedsSpace(surface,field);
    const expanded=hasRefs||hasGuestPhotos||
      (kind==='guest'&&guestNeedsSpace)||
      realNeedsSpace||
      (isSoul&&realEditingStarted&&!isSmall&&hasPrompt)||
      (isSoul&&active&&(isSmall||hasPrompt||emptyRealFocus))||
      (isSoul&&isSmall&&preview.real&&hasPrompt);
    surface.classList.toggle('pv-deck-expanded',!!expanded);
    surface.classList.toggle('pv-deck-has-prompt',hasPrompt);
    // Clearing or shortening an expanded prompt must also drop its old inline
    // textarea height, not merely remove the expanded container class.
    if(kind==='real'&&!isSoul&&!expanded)field.style.removeProperty('height');
  }
  function fitGuestPrompt(){
    if(!guest.classList.contains('pv-deck-expanded')){
      guestField.style.height='';
      return;
    }
    const minimum=small.matches?104:50,maximum=small.matches?132:150;
    // Measure from a known minimum, never the previous long height.
    guestField.style.height=minimum+'px';
    guestField.style.height=Math.min(maximum,Math.max(minimum,guestField.scrollHeight))+'px';
  }
  function sync(){
    if(window.__PV_LAB_NATIVE__===1)return;
    real.classList.add('pv-editorial-deck');
    update(guest,guestField,'guest');
    fitGuestPrompt();
    update(real,realField,'real');
  }
  const deferSync=()=>queueMicrotask(sync);
  for(const [field,kind] of [[guestField,'guest'],[realField,'real']]){
    field.addEventListener('focus',()=>{
      if(kind==='real'&&!small.matches){
        realEditingStarted=true;
        emptyRealFocus=!field.value.trim();
      }
      if(kind==='guest')emptyGuestFocus=!field.value.trim();
      sync();
    });
    field.addEventListener('blur',()=>{
      if(kind==='real')emptyRealFocus=false;
      if(kind==='guest')emptyGuestFocus=false;
      if(!small.matches)preview[kind]=false;
      requestAnimationFrame(sync);
    });
    field.addEventListener('input',()=>{
      if(kind==='real'){
        emptyRealFocus=false;
        if(!small.matches)realEditingStarted=true;
      }
      if(kind==='guest')emptyGuestFocus=false;
      preview[kind]=small.matches;sync();
    });
  }
  // Mood handlers run first and own their actual prompt data. This only rechecks
  // presentation after they fill the field, avoiding any duplicate state.
  document.addEventListener('click',event=>{
    if(!(event.target instanceof Element))return;
    const g=event.target.closest('[data-guest-mood]');
    const r=event.target.closest('[data-welcome-mood]');
    if(!g&&!r)return;
    const kind=g?'guest':'real';
    preview[kind]=small.matches;
    if(kind==='real'&&!small.matches)realEditingStarted=true;
    deferSync();
  });
  document.addEventListener('pointerdown',event=>{
    if(!small.matches)return;
    if(!guest.contains(event.target)&&!event.target.closest?.('[data-guest-mood]'))preview.guest=false;
    if(!real.contains(event.target)&&!event.target.closest?.('[data-welcome-mood]'))preview.real=false;
  },{passive:true});
  if(refs){
    new MutationObserver(sync).observe(refs,{attributes:true,attributeFilter:['hidden'],childList:true});
  }
  window.addEventListener('pv-guest-photos-changed',sync);
  window.addEventListener('resize',sync,{passive:true});
  window.addEventListener('pageshow',sync);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});
  else sync();
})();
