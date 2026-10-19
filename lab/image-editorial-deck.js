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
  // Keep a nonempty desktop prompt expanded across blur and Mood changes.
  // A first focus may open an empty editor, but clearing the prompt must
  // restore the compact deck even while the textarea remains focused.
  let realEditingStarted=false;
  let emptyRealFocus=false;
  function update(surface,field,kind){
    if(!surface)return;
    const hasRefs=kind==='real' && refs && !refs.hidden && refs.children.length>0;
    const active=document.activeElement===field;
    const isSmall=small.matches;
    const hasPrompt=!!field.value.trim();
    const expanded=hasRefs||
      (kind==='real'&&realEditingStarted&&!isSmall&&hasPrompt)||
      (active&&(kind!=='real'||isSmall||hasPrompt||emptyRealFocus))||
      (isSmall&&preview[kind]&&hasPrompt);
    surface.classList.toggle('pv-deck-expanded',!!expanded);
    surface.classList.toggle('pv-deck-has-prompt',hasPrompt);
  }
  function sync(){
    if(window.__PV_LAB_NATIVE__===1)return;
    real.classList.add('pv-editorial-deck');
    update(guest,guestField,'guest');
    update(real,realField,'real');
  }
  const deferSync=()=>queueMicrotask(sync);
  for(const [field,kind] of [[guestField,'guest'],[realField,'real']]){
    field.addEventListener('focus',()=>{
      if(kind==='real'&&!small.matches){
        realEditingStarted=true;
        emptyRealFocus=!field.value.trim();
      }
      sync();
    });
    field.addEventListener('blur',()=>{
      if(kind==='real')emptyRealFocus=false;
      if(!small.matches)preview[kind]=false;
      requestAnimationFrame(sync);
    });
    field.addEventListener('input',()=>{
      if(kind==='real'){
        emptyRealFocus=false;
        if(!small.matches)realEditingStarted=true;
      }
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
  window.addEventListener('resize',sync,{passive:true});
  window.addEventListener('pageshow',sync);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});
  else sync();
})();
