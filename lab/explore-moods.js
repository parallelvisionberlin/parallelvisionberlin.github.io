import {moodById} from './moods.js?v=20261011-midnight-reverie1&hd=20261011&raveBudget=1&editorialHD=2&hongKongStreet=1&moodImageHD=1&raveNight=4&hongKongRefs=4&dreamcore=7&syntheticRefs=1&raveIdentity=1&filmRevision=4&hkContinuity=4&hkScene=5&hkCinematography=1&midnightFlashV2=1';
import {saveMoodHandoff,validateMoodHandoff} from './mood-handoff.js?v=20261012-generate1';
// Browsing and uploads only prepare a price. Generate explicitly authorizes one job.
export function moodExploreDestination(moodId,{create=false,handoff=null}={}){
  if(!moodById(moodId))throw Error('Choose a valid PV Lab Mood.');
  const query=new URLSearchParams(create?{base:moodId}:{tool:'image',mood:moodId});
  if(handoff)query.set('handoff',handoff);
  return './'+(create?'mood-creator.html':'studio.html')+'?'+query;
}
function initialize(){
  const $=id=>document.getElementById(id);
  const dialog=$('mc-look-dialog'),zone=$('mc-look-dropzone'),fileInput=$('mc-look-file');
  const direction=$('mc-look-direction'),status=$('mc-look-status');
  let mood=null,file=null,fileURL=null,busy=false,dragDepth=0;
  let price=null,priceRevision=0,priceTimer=null,expiryTimer=null,service=null,serviceLoading=null,needsSignIn=false;
  const generate=$('mc-look-continue');
  function generationService(){
    if(service)return Promise.resolve(service);
    return serviceLoading||(serviceLoading=import('./app-mood-generation.js?v=20261013-compact-map2&hongKongRefs=4&dreamcore=7&syntheticRefs=1&raveIdentity=1&filmRevision=4&hkContinuity=4&hkScene=5&hkCinematography=1&midnightFlashV2=1&refMode=20261014-contextual-reference1').then(({createAppMoodGeneration})=>{
      service=createAppMoodGeneration();
      let accountId;
      void service.onAccountChange(account=>{
        const next=account.user?.id||'';
        if(accountId!==undefined&&next!==accountId&&dialog.open&&!busy){
          if(next&&!dialog.matches(':modal')){dialog.close();dialog.showModal();}
          schedulePrice();
        }
        accountId=next;
      }).catch(()=>{});
      return service;
    }).catch(error=>{serviceLoading=null;throw error;}));
  }
  function resetPrice(){
    priceRevision++;clearTimeout(priceTimer);clearTimeout(expiryTimer);service?.cancel();
    price=null;needsSignIn=false;
    generate.textContent='Generate image';generate.disabled=true;
  }
  function schedulePrice(){
    resetPrice();status.textContent='';
    if(!mood||(!file&&!direction.value.trim()))return;
    generate.textContent='Checking price…';
    const stamp=priceRevision;
    priceTimer=setTimeout(()=>void preparePrice(stamp),650);
  }
  async function preparePrice(stamp=priceRevision){
    clearTimeout(priceTimer);
    generate.disabled=true;generate.textContent='Checking price…';
    try{
      const client=await generationService();if(stamp!==priceRevision)return;
      const ready=await client.prepare(file,mood,direction.value.trim());
      if(stamp!==priceRevision||!dialog.open)return;
      price=ready;generate.textContent='Generate image · '+ready.label;generate.disabled=false;
      expiryTimer=setTimeout(()=>{if(stamp===priceRevision&&!busy)schedulePrice();},Math.max(0,ready.expiresAt-Date.now()-20000));
    }catch(error){
      if(stamp!==priceRevision||!dialog.open)return;
      needsSignIn=error.code==='SIGN_IN';status.textContent=error.message;
      generate.textContent=needsSignIn?'Sign in to generate':'Retry price';generate.disabled=false;
    }
  }
  function setBusy(value){
    busy=value;
    if(value)clearDropHighlight();
    for(const control of [generate,$('mc-look-make'),fileInput,direction,$('mc-look-file-clear'),$('mc-look-close')])control.disabled=value;
  }
  const fullPreviews=new Map();
  function loadFullPreview(selected,priority='low'){
    const src=selected.previewFull;
    if(!src||src===selected.preview)return Promise.resolve(null);
    const cached=fullPreviews.get(src);
    if(cached){
      if(priority==='high')cached.image.fetchPriority='high';
      return cached.ready;
    }
    const image=new Image();
    image.decoding='async';image.fetchPriority=priority;image.src=src;
    const ready=image.decode().then(()=>image.src,()=>{
      fullPreviews.delete(src);
      return null; // Keep the sharp card image if the original cannot load.
    });
    fullPreviews.set(src,{image,ready});
    return ready;
  }
  function clearDropHighlight(){
    dragDepth=0;
    zone.classList.remove('is-over');
  }
  function clearPhoto(){
    clearDropHighlight();
    if(fileURL)URL.revokeObjectURL(fileURL);
    fileURL=null;file=null;fileInput.value='';
    $('mc-look-file-preview')?.remove();
    $('mc-look-file-clear').hidden=true;
    $('mc-look-file-label-text').textContent='Drop a photograph or browse files';
    zone.classList.remove('has-image');
  }
  function attachPhoto(input){
    if(busy)return false;
    try{validateMoodHandoff({file:input});}catch(error){status.textContent=error.message;return false;}
    clearPhoto();file=input;
    fileURL=URL.createObjectURL(file);
    const photo=document.createElement('img');photo.id='mc-look-file-preview';photo.className='mc-look-file-preview';
    photo.alt='Chosen photo to transform';photo.src=fileURL;
    zone.prepend(photo);
    $('mc-look-file-label-text').textContent=file.name;
    $('mc-look-file-clear').hidden=false;zone.classList.add('has-image');
    schedulePrice();
    return true;
  }
  function showMood(selected,photo=null){
    if(!selected||busy)return;
    resetPrice();mood=selected;clearPhoto();direction.value='';status.textContent='';
    const preview=$('mc-look-preview');
    preview.dataset.moodId=selected.id;
    // Reuse the gallery's HD image while the untouched original decodes offscreen.
    preview.src=selected.preview;
    preview.alt=selected.name+' aesthetic';
    $('mc-look-title').textContent=selected.name;
    $('mc-look-description').textContent=selected.id==='berlin-rave'?selected.description+'. Transforms wardrobe and lighting into a night-flash editorial while keeping your identity, pose and framing.':selected.id==='synthetic-romance'?selected.description+'. This mood reconstructs visible body parts into engineered chrome, cables and synthetic anatomy.':selected.description+'. Keep your own subject and scene.';
    if(photo)attachPhoto(photo);
    if(!dialog.open)dialog.showModal();
    dialog.focus({preventScroll:true});
    dialog.scrollTop=0;
    void loadFullPreview(selected,'high').then(src=>{
      if(src&&dialog.open&&mood===selected)preview.src=src;
    });
  }
  function close(){if(dialog.open&&!busy)dialog.close();}
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  dialog.addEventListener('close',()=>{
    if(dialog.open)return;
    resetPrice();clearPhoto();mood=null;setBusy(false);generate.disabled=true;
    $('mc-look-preview').removeAttribute('src');
  });
  $('mc-look-close').onclick=close;
  dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
  fileInput.addEventListener('change',()=>{if(fileInput.files?.[0])attachPhoto(fileInput.files[0]);});
  $('mc-look-file-clear').onclick=()=>{if(!busy){clearPhoto();schedulePrice();}};
  direction.addEventListener('input',schedulePrice);
  zone.addEventListener('dragenter',event=>{
    if(!event.dataTransfer?.types?.includes('Files'))return;
    event.preventDefault();
    if(busy)return;
    dragDepth++;zone.classList.add('is-over');
  });
  zone.addEventListener('dragover',event=>{
    if(!event.dataTransfer?.types?.includes('Files'))return;
    event.preventDefault();event.dataTransfer.dropEffect=busy?'none':'copy';
    if(!busy)zone.classList.add('is-over');
  });
  zone.addEventListener('dragleave',()=>{
    // Child labels and previews also fire drag events. Stay lit until the box is left.
    dragDepth=Math.max(0,dragDepth-1);
    if(!dragDepth)clearDropHighlight();
  });
  zone.addEventListener('drop',event=>{
    clearDropHighlight();
    if(event.dataTransfer?.files?.length){event.preventDefault();attachPhoto(event.dataTransfer.files[0]);}
  });
  document.addEventListener('drop',clearDropHighlight);
  document.addEventListener('dragend',clearDropHighlight);
  window.addEventListener('blur',clearDropHighlight);
  for(const card of document.querySelectorAll('.mc-look-card[data-mood-id]')){
    const selected=moodById(card.dataset.moodId);if(!selected)continue;
    const warmPreview=()=>{if(!navigator.connection?.saveData)void loadFullPreview(selected);};
    card.addEventListener('pointerenter',warmPreview,{once:true});
    card.addEventListener('focus',warmPreview,{once:true});
    card.onclick=()=>showMood(selected);
    card.addEventListener('dragover',event=>{if(event.dataTransfer?.types?.includes('Files')){event.preventDefault();event.dataTransfer.dropEffect='copy';card.classList.add('is-drag-over');}});
    card.addEventListener('dragleave',()=>card.classList.remove('is-drag-over'));
    card.addEventListener('drop',event=>{card.classList.remove('is-drag-over');if(event.dataTransfer?.files?.length){event.preventDefault();event.stopPropagation();showMood(selected,event.dataTransfer.files[0]);}});
  }
  $('mc-look-grid').addEventListener('dragover',event=>{if(event.dataTransfer?.types?.includes('Files'))event.preventDefault();});
  $('mc-look-grid').addEventListener('drop',event=>{
    if(!event.dataTransfer?.files?.length||event.target.closest('.mc-look-card[data-mood-id]'))return;
    event.preventDefault();status.textContent='Drop directly onto the Mood you want to use.';
  });
  async function continueWithMood(create=false){
    if(!mood||busy)return;
    resetPrice();setBusy(true);
    status.textContent='Preparing your private photo handoff. Nothing is being generated.';
    try{
      const token=await saveMoodHandoff({file,prompt:direction.value.trim()});
      location.assign(moodExploreDestination(mood.id,{create,handoff:token}));
    }catch(error){
      status.textContent=error.message;
      setBusy(false);schedulePrice();status.textContent=error.message;
    }
  }
  generate.onclick=()=>void (async()=>{
    if(!mood||busy)return;
    if(needsSignIn){
      try{
        const client=await generationService();
        // Clerk renders outside the native dialog's top layer. Keep the draft
        // visible, but let its sign-in modal receive focus and pointer input.
        if(dialog.matches(':modal')){dialog.close();dialog.show();}
        if(await client.signIn())schedulePrice();
      }
      catch(error){status.textContent=error.message;}
      return;
    }
    if(!price||price.expiresAt<=Date.now()+5000){await preparePrice();return;}
    setBusy(true);clearTimeout(expiryTimer);generate.textContent='Opening Image…';status.textContent='';
    try{
      const generation=price.handoff();
      const token=await saveMoodHandoff({file,prompt:direction.value.trim(),generation});
      location.assign(moodExploreDestination(mood.id,{handoff:token}));
    }catch(error){setBusy(false);schedulePrice();status.textContent=error.message;}
  })();
  $('mc-look-make').onclick=()=>void continueWithMood(true);

  // Mobile navigation follows the native PV Lab links, with a genuine close action.
  const header=$('mc-explore-header'),menu=$('mc-menu-toggle');
  if(header&&menu){
    const closeMenu=()=>{
      header.classList.remove('is-menu-open');
      menu.setAttribute('aria-expanded','false');
      menu.setAttribute('aria-label','Open navigation menu');
    };
    menu.addEventListener('click',()=>{
      const opening=!header.classList.contains('is-menu-open');
      header.classList.toggle('is-menu-open',opening);
      menu.setAttribute('aria-expanded',String(opening));
      menu.setAttribute('aria-label',opening?'Close navigation menu':'Open navigation menu');
    });
    document.addEventListener('click',event=>{if(!header.contains(event.target))closeMenu()});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu()});
    header.querySelectorAll('.mc-navigation a').forEach(link=>link.addEventListener('click',closeMenu));
  }

  window.addEventListener('pageshow',event=>{if(event.persisted){setBusy(false);if(dialog.open)schedulePrice();}});
  const requested=new URLSearchParams(location.search).get('mood');
  if(requested&&moodById(requested))showMood(moodById(requested));
}
if(typeof document!=='undefined')initialize();

