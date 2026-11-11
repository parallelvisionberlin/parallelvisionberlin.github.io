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
  const welcomeWidth=window.matchMedia('(min-width:1180px) and (min-height:680px)');
  const app=document.getElementById('app');
  const welcome=document.getElementById('lab-welcome-start');
  const empty=document.getElementById('image-gallery-empty');
  const cards=document.getElementById('lab-welcome-presets');
  const gate=document.getElementById('gate');
  const guestContent=gate.querySelector('.pv-guest-content');
  const guestCards=document.getElementById('pv-guest-cards');
  let welcomeEditing=false;
  let guestEditing=false;
  const preview={guest:false,real:false};
  // PV Soul keeps its established editor. Standard Image History remains
  // content-sized; the card entrance has its own focus/blur state below.
  let realEditingStarted=false;
  let emptyRealFocus=false;
  let emptyGuestFocus=false;
  function fitWelcomeCards(surface,grid,available){
    const copy=grid.getBoundingClientRect().top-surface.firstElementChild.getBoundingClientRect().top;
    const height=Math.max(140,Math.min(379,innerHeight*.39,available-copy));
    surface.style.setProperty('--pv-welcome-card-height',Math.floor(height)+'px');
  }
  function fitWelcomeDeck(){
    const visible=welcomeWidth.matches&&!document.documentElement.classList.contains('pv-image-previews-hidden')&&
      app&&!app.hidden&&app.classList.contains('image-studio-active')&&
      welcome&&!welcome.hidden&&empty&&!empty.hidden&&cards&&!real.classList.contains('is-pv-soul');
    real.classList.toggle('pv-welcome-deck',!!visible);
    if(!visible){
      welcome?.style.removeProperty('--pv-welcome-card-height');
    }else{
      // The approved signed-in frame remains authoritative for both entries.
      fitWelcomeCards(welcome,cards,innerHeight-empty.getBoundingClientRect().top-260);
    }
    const guestVisible=welcomeWidth.matches&&!gate.hidden&&gate.dataset.guestTool==='image'&&
      !gate.querySelector('#pv-guest-closed-state:not([hidden])');
    if(guestVisible)fitWelcomeCards(guestContent,guestCards,guestContent.getBoundingClientRect().height);
    else guestContent.style.removeProperty('--pv-welcome-card-height');
  }
  function clearWelcomeDeck(surface,grid,deck,visible){
    surface?.style.removeProperty('--pv-welcome-deck-lift');
    if(!surface||!grid||!visible||!welcomeWidth.matches)return;
    // The fixed deck grows upward. Keep the entire photo and its name above
    // its measured top, first using spare heading space, then only the height
    // that cannot fit in a short window. Never change card widths or imagery.
    const title=surface.querySelector('h1,h2');
    const header=document.getElementById('studio-header');
    const top=(header?.getBoundingClientRect().bottom||0)+16;
    const overlap=Math.max(0,grid.getBoundingClientRect().bottom-deck.getBoundingClientRect().top+16);
    const lift=Math.min(overlap,Math.max(0,title.getBoundingClientRect().top-top));
    if(overlap>lift){
      const height=parseFloat(surface.style.getPropertyValue('--pv-welcome-card-height'));
      surface.style.setProperty('--pv-welcome-card-height',Math.max(100,Math.floor(height-overlap+lift))+'px');
    }
    // Shorter cards recenter the content. Measure the final position before
    // lifting, so that re-centering cannot consume the recovered clearance.
    const finalOverlap=Math.max(0,grid.getBoundingClientRect().bottom-deck.getBoundingClientRect().top+16);
    const finalLift=Math.min(finalOverlap,Math.max(0,title.getBoundingClientRect().top-top));
    if(finalLift)surface.style.setProperty('--pv-welcome-deck-lift',Math.ceil(finalLift)+'px');
  }
  // On phones a long prompt grows the fixed dock upward. Reposition only the
  // Inspiration entrance within the space beneath the header, then shorten
  // the photo if a short in-app browser leaves insufficient room. Neither
  // History nor the separate Moods grid uses this adjustment.
  function fitPhoneInspiration(surface,grid,deck,visible){
    if(!surface||!grid)return;
    surface.classList.remove('pv-phone-inspiration-lift');
    surface.style.removeProperty('--pv-phone-inspiration-lift');
    grid.style.removeProperty('--pv-phone-inspiration-card-height');
    if(!small.matches||!visible||!deck.classList.contains('pv-deck-expanded')||
      document.documentElement.classList.contains('pv-native-lab')||
      document.documentElement.classList.contains('pv-image-previews-hidden'))return;
    const title=surface.querySelector('h1,h2');
    const first=grid.querySelector(':scope > button');
    if(!title||!first)return;
    surface.classList.add('pv-phone-inspiration-lift');
    const header=document.getElementById('studio-header');
    const headerBottom=header?.getBoundingClientRect().bottom||0;
    const availableLift=Math.max(0,title.getBoundingClientRect().top-headerBottom-12);
    const overlap=Math.max(0,grid.getBoundingClientRect().bottom-deck.getBoundingClientRect().top+12);
    const lift=Math.ceil(Math.min(overlap,availableLift));
    if(lift>0)surface.style.setProperty('--pv-phone-inspiration-lift',lift+'px');
    // Preserve original image size whenever shifting into the spare top
    // space suffices. Only short browser chrome requires a height reduction.
    const remaining=Math.max(0,grid.getBoundingClientRect().bottom-deck.getBoundingClientRect().top+12);
    if(remaining>1){
      const natural=first.getBoundingClientRect().height;
      const minimum=innerHeight<690?120:Math.min(160,Math.max(140,innerHeight*.2));
      const target=Math.max(minimum,Math.floor(natural-remaining));
      if(target<natural-1)grid.style.setProperty('--pv-phone-inspiration-card-height',target+'px');
    }
  }
  function fitDeckOrigin(surface,visible){
    if(!welcomeWidth.matches||!visible){surface.style.removeProperty('--pv-image-deck-top');return;}
    // Original History is 142px tall and 30px above the viewport edge.
    // Its compact entrance keeps that same top; larger photo/text content
    // retains History's existing bottom clearance instead of leaving the screen.
    const height=Math.max(142,surface.getBoundingClientRect().height);
    surface.style.setProperty('--pv-image-deck-top',(innerHeight-30-height)+'px');
  }
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
      (welcomeWidth.matches?(guestEditing||realPromptNeedsSpace(surface,field)):
        (hasPrompt||(active&&emptyGuestFocus)));
    const isSoul=kind==='real'&&surface.classList.contains('is-pv-soul');
    const realNeedsSpace=kind==='real'&&!isSoul&&!hasRefs&&
      realPromptNeedsSpace(surface,field);
    const welcomeFocus=kind==='real'&&surface.classList.contains('pv-welcome-deck')&&welcomeEditing;
    const expanded=hasRefs||hasGuestPhotos||
      (kind==='guest'&&guestNeedsSpace)||
      welcomeFocus||
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
    const minimum=small.matches?104:50,maximum=small.matches?132:136;
    // Measure from a known minimum, never the previous long height.
    guestField.style.height=minimum+'px';
    guestField.style.height=Math.min(maximum,Math.max(minimum,guestField.scrollHeight))+'px';
  }
  function sync(){
    if(window.__PV_LAB_NATIVE__===1)return;
    real.classList.add('pv-editorial-deck');
    // syncSoulBar owns the model-specific identity position. Preserve the
    // approved PV Still portrait tile while this controller measures the deck.
    fitWelcomeDeck();
    update(guest,guestField,'guest');
    fitGuestPrompt();
    update(real,realField,'real');
    fitDeckOrigin(real,real.classList.contains('pv-welcome-deck'));
    fitDeckOrigin(guest,!document.getElementById('gate').hidden);
    clearWelcomeDeck(welcome,cards,real,real.classList.contains('pv-welcome-deck'));
    clearWelcomeDeck(guestContent,guestCards,guest,!gate.hidden&&gate.dataset.guestTool==='image'&&
      !gate.querySelector('#pv-guest-closed-state:not([hidden])'));
    fitPhoneInspiration(welcome,cards,real,!app.hidden&&app.classList.contains('image-studio-active')&&
      welcome&&!welcome.hidden&&empty&&!empty.hidden);
    fitPhoneInspiration(guestContent,guestCards,guest,!gate.hidden&&gate.dataset.guestTool==='image'&&
      !gate.querySelector('#pv-guest-closed-state:not([hidden])'));
    if(welcomeWidth.matches&&!app.hidden&&app.classList.contains('image-studio-active'))
      app.style.setProperty('--pv-image-deck-reserve',Math.ceil(real.getBoundingClientRect().height+46)+'px');
    else app?.style.removeProperty('--pv-image-deck-reserve');
  }
  const deferSync=()=>queueMicrotask(sync);
  for(const [field,kind] of [[guestField,'guest'],[realField,'real']]){
    field.addEventListener('focus',()=>{
      if(kind==='real'&&!small.matches){
        welcomeEditing=true;
        realEditingStarted=true;
        emptyRealFocus=!field.value.trim();
      }
      if(kind==='guest'){guestEditing=true;emptyGuestFocus=!field.value.trim();}
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
  real.addEventListener('focusout',event=>{
    // Model choices rebuild their own focused menu row. Losing that detached
    // button is not an outside click and must not hide the tools just chosen.
    if(event.relatedTarget?!real.contains(event.relatedTarget):event.target===realField&&!realField.disabled)welcomeEditing=false;
    requestAnimationFrame(sync);
  });
  real.addEventListener('click',event=>{
    if(real.classList.contains('pv-welcome-deck')&&
      (event.target===real||event.target.classList.contains('image-composer-top')))
      realField.focus({preventScroll:true});
  });
  guest.addEventListener('click',event=>{
    if(event.target===guest||event.target.classList.contains('pv-guest-prompt-row'))
      guestField.focus({preventScroll:true});
  });
  guest.addEventListener('focusout',event=>{
    if(event.relatedTarget?!guest.contains(event.relatedTarget):event.target===guestField)guestEditing=false;
    requestAnimationFrame(sync);
  });
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
    if(!real.contains(event.target)){welcomeEditing=false;requestAnimationFrame(sync);}
    if(!guest.contains(event.target)){guestEditing=false;requestAnimationFrame(sync);}
    if(!small.matches)return;
    if(!guest.contains(event.target)&&!event.target.closest?.('[data-guest-mood]'))preview.guest=false;
    if(!real.contains(event.target)&&!event.target.closest?.('[data-welcome-mood]'))preview.real=false;
  },{passive:true});
  if(refs){
    new MutationObserver(sync).observe(refs,{attributes:true,attributeFilter:['hidden'],childList:true});
  }
  for(const node of [document.documentElement,app,welcome,empty,gate,document.getElementById('pv-guest-closed-state'),document.getElementById('lab-credit-banner')]){
    if(node)new MutationObserver(deferSync).observe(node,{attributes:true,attributeFilter:['hidden','class','data-guest-tool']});
  }
  if(welcome&&empty&&typeof ResizeObserver!=='undefined'){
    const layout=new ResizeObserver(deferSync);
    layout.observe(empty);layout.observe(welcome);layout.observe(real);layout.observe(guest);
  }
  window.addEventListener('pv-guest-photos-changed',sync);
  window.addEventListener('resize',sync,{passive:true});
  window.addEventListener('pageshow',sync);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});
  else sync();
})();
