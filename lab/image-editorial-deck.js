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
  const app=document.getElementById('app');
  const empty=document.getElementById('image-gallery-empty');
  const welcome=document.getElementById('lab-welcome-start');
  const balance=welcome?.querySelector('.lab-welcome-balance');
  const presets=welcome?.querySelector('.lab-welcome-presets');
  const largeWelcome=window.matchMedia('(min-width:1260px) and (min-height:740px)');
  let placementFrame=0;
  function placeWelcomeDeck(){
    placementFrame=0;
    if(!app?.classList.contains('pv-welcome-deck-resting')||!balance||!presets)return;
    const first=balance.getBoundingClientRect().bottom+10;
    const last=presets.getBoundingClientRect().top-10;
    const height=real.getBoundingClientRect().height;
    if(!(last>first&&height>0))return;
    const headerBottom=document.getElementById('studio-header')?.getBoundingClientRect().bottom||0;
    const proposed=first+(last-first-height)/2;
    const top=Math.max(headerBottom+12,Math.min(proposed,window.innerHeight-height-10));
    real.style.setProperty('--pv-welcome-deck-top',Math.round(top)+'px');
  }
  const scheduleWelcomePlacement=()=>{
    if(placementFrame)cancelAnimationFrame(placementFrame);
    placementFrame=requestAnimationFrame(placeWelcomeDeck);
  };
  // Once a desktop user engages with the real deck, keep the editing layout.
  // Do not reset it on blur, choosing another Mood or completing a generation.
  let realEditingStarted=false;
  function update(surface,field,kind){
    if(!surface)return;
    const hasRefs=kind==='real' && refs && !refs.hidden && refs.children.length>0;
    const active=document.activeElement===field;
    const isSmall=small.matches;
    const expanded=(kind==='real'&&realEditingStarted&&!isSmall)||
      active||hasRefs||(isSmall&&preview[kind]&&!!field.value.trim());
    surface.classList.toggle('pv-deck-expanded',!!expanded);
    surface.classList.toggle('pv-deck-has-prompt',!!field.value.trim());
  }
  function sync(){
    if(window.__PV_LAB_NATIVE__===1)return;
    real.classList.add('pv-editorial-deck');
    update(guest,guestField,'guest');
    update(real,realField,'real');
    const resting=largeWelcome.matches && !!app && !app.hidden &&
      app.classList.contains('image-studio-active') &&
      !app.classList.contains('pv-moods-discovery-open') &&
      !!welcome && !welcome.hidden && !!empty && !empty.hidden &&
      !real.classList.contains('is-pv-soul') &&
      !real.classList.contains('pv-deck-expanded') &&
      !realField.value.trim();
    app?.classList.toggle('pv-welcome-deck-resting',resting);
    if(resting)scheduleWelcomePlacement();
    else real.style.removeProperty('--pv-welcome-deck-top');
  }
  const deferSync=()=>queueMicrotask(sync);
  for(const [field,kind] of [[guestField,'guest'],[realField,'real']]){
    field.addEventListener('focus',()=>{
      if(kind==='real'&&!small.matches)realEditingStarted=true;
      sync();
    });
    field.addEventListener('blur',()=>{
      if(!small.matches)preview[kind]=false;
      requestAnimationFrame(sync);
    });
    field.addEventListener('input',()=>{
      if(kind==='real'&&!small.matches)realEditingStarted=true;
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
  // Async authentication decides when the first-image welcome is visible.
  // Reposition after those existing state changes without modifying auth,
  // History, generated jobs or selected Mood data.
  if(app)new MutationObserver(sync).observe(app,{attributes:true,attributeFilter:['class','hidden']});
  if(welcome)new MutationObserver(sync).observe(welcome,{attributes:true,attributeFilter:['hidden']});
  if(empty)new MutationObserver(sync).observe(empty,{attributes:true,attributeFilter:['hidden']});
  window.addEventListener('resize',sync,{passive:true});
  window.addEventListener('pageshow',sync);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});
  else sync();
})();
