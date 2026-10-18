// PV LAB Scene Library. Uses existing private photo packs and reference APIs.
// No new provider calls, training jobs, credit charges or automatic generations.
const PREFIX='PVSCENE1|';
const CATEGORIES=[
  {id:'characters',label:'Characters',role:'identity',help:'People, AI models and robots'},
  {id:'outfits',label:'Outfits',role:'outfit',help:'Clothing and complete looks'},
  {id:'props',label:'Props',role:'object',help:'Objects, products and vehicles'},
  {id:'locations',label:'Locations',role:'room',help:'Places, interiors and sets'}
];
const SCENE_NOTE_SUGGESTIONS=Object.freeze({
    "characters": "Keep recognizable facial features, hair, proportions and skin details consistent. Do not copy the original background.",
    "outfits": "Preserve garment silhouette, fabric, colors, patterns and distinctive details; fit naturally to the new scene.",
    "props": "Preserve the object shape, size, materials, markings and color. Do not replace, duplicate or redesign it.",
    "locations": "Preserve the architecture, layout, objects and distinctive details. Do not add, remove, replace or rearrange elements."
  });
export const suggestedSceneNote=categoryId=>SCENE_NOTE_SUGGESTIONS[categoryId]||'';
export const isSceneLibraryPack=pack=>typeof pack?.name==='string'&&/^PVSCENE1\|(characters|outfits|props|locations)\|.{1,80}$/.test(pack.name);
// Choose a source image closest to the card's aspect ratio. Keep saved source
// order unchanged so the image generator receives references in their original order.
export function sceneCoverId(refs,ratios=[],targetRatio=1.55){
  if(!Array.isArray(refs))return null;
  let chosen=refs.find(ref=>typeof ref?.id==='string'&&ref.id)?.id||null;
  let best=Infinity;
  refs.forEach((ref,i)=>{
    if(typeof ref?.id!=='string'||!ref.id)return;
    const ratio=ratios[i];
    if(!Number.isFinite(ratio)||ratio<=0)return;
    const score=Math.abs(Math.log(ratio/targetRatio));
    if(score<best){best=score;chosen=ref.id;}
  });
  return chosen;
}
// Select a small, prompt-relevant view subset from ONE saved visual entity.
// Profile shot descriptions come from optional one-time image analysis. Without
// analysis, preserve input order. Never pretend that this is a trained LoRA.
export function selectElementViews(item,prompt='',limit=2){
  const refs=Array.isArray(item?.refs)?item.refs:[];
  const max=Math.max(0,Math.min(refs.length,Number.isInteger(limit)?limit:2));
  if(!max)return [];
  const profile=item?.profile;
  const stop=new Set(['the','and','for','with','from','in','on','at','this','that','inside','into','a','an',
    'of','to','de','la','el','en','con','un','una','del','los','las','por','que','room','location']);
  const tokens=String(prompt||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .split(/[^\p{L}\p{N}]+/u).filter(x=>x.length>2&&!stop.has(x));
  const shots=Array.isArray(profile?.shots)?profile.shots:[];
  const ranked=refs.map((ref,index)=>{
    const shot=shots.find(s=>s.index===index);
    const words=[...(shot?.keywords||[]),shot?.description||'',ref?.name||'']
      .join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const matched=tokens.filter(t=>words.some(w=>w===t||w.startsWith(t)||t.startsWith(w)));
    return {index,score:new Set(matched).size*10+Math.min((shot?.keywords||[]).length,6)*0.01};
  });
  ranked.sort((a,b)=>b.score-a.score||a.index-b.index);
  const chosen=ranked.slice(0,max).map(x=>x.index);
  return chosen;
}
function elementReferenceNote(item,selectedIndex){
  // Preserve the user's authored saved note (including full appearance/props)
  // before adding only the visual facts that fit the provider's note budget.
  const authored=String(item.refs?.[selectedIndex]?.note||'').slice(0,230);
  const identity=String(item.profile?.signature||item.profile?.summary||'').slice(0,145);
  const shot=item.profile?.shots?.find(s=>s.index===selectedIndex);
  const view=String(shot?.description||'').slice(0,65);
  const notes=[authored||'@'+String(item.title||'').slice(0,70)+' is one consistent '+item.category+'.'];
  if(identity)notes.push('Visual signature: '+identity);
  if(view)notes.push('View: '+view);
  return notes.join(' ').slice(0,300);
}

export function createSceneLibrary({api,uploadAsset,assetFile,assetPhoto,getAssetRatio,getReferences,getReferenceLimit,getContext,prepareUse,addReferences,loadPacks,getAllPacks,notify,action,closeOverlays,openPhotoPacks}) {
  const $=id=>document.getElementById(id);
  const dialog=$('scene-library-dialog');
  if(!dialog)return {open(){},sync(){},renderSelected(){},fromGallery(){}};
  const elementsInfo=$('scene-elements-info');
  const elementsInfoTriggers=[$('scene-elements-info-toggle'),$('scene-elements-info-toggle-mobile')].filter(Boolean);
  let elementsInfoFocus=elementsInfoTriggers[0]||null;
  function setElementsInfoOpen(visible){
    if(!elementsInfo)return;
    elementsInfo.hidden=!visible;
    for(const button of elementsInfoTriggers)button.setAttribute('aria-expanded',String(visible));
  }
  for(const button of elementsInfoTriggers){
    button.addEventListener('click',()=>{
      elementsInfoFocus=button;
      setElementsInfoOpen(elementsInfo.hidden);
    });
  }
  dialog.addEventListener('click',event=>{
    if(!elementsInfo?.hidden&&!elementsInfo.contains(event.target)
      &&!elementsInfoTriggers.some(button=>button.contains(event.target)))setElementsInfoOpen(false);
  });
  let current='characters',entries=[],allPacks=[],view='browse',photos=[],working=false,selectedId=null,featuredExpanded=false,sortMode='recent',viewMode='grid';
  const coverChoices=new Map(),coverRequests=new Map();
   const pendingProfiles=new Map();
  const sceneToast=$('scene-toast'),leaveConfirm=$('scene-leave-confirm');
  let pendingNavigation=null;
  function hideSceneToast(){if(sceneToast)sceneToast.hidden=true;}
  function showSceneToast(message){
    if(!sceneToast)return;
    $('scene-toast-message').textContent=String(message||'');
    sceneToast.hidden=false;
  }
  if($('scene-toast-dismiss'))$('scene-toast-dismiss').onclick=hideSceneToast;
  let coverRevision=0;
  function renderCover(host,item){
    const refs=item?.refs||[];
    const first=sceneCoverId(refs);
    if(!first){assetPhoto(host,null);return;}
    const chosen=coverChoices.get(item.id)||first;
    // The authenticated thumbnail renderer takes a container, never an IMG.
    // It inserts an image only after successfully decoding it.
    assetPhoto(host,chosen);
    if(refs.length<2||typeof getAssetRatio!=='function'||coverChoices.has(item.id))return;
    let pending=coverRequests.get(item.id);
    if(!pending){
      const revision=coverRevision;
      pending=(async()=>{
        // The visible cover gets first priority. Reading every source immediately
        // can force multiple cold Cloudflare thumbnail transformations at once.
        const ratios=Array(refs.length).fill(null);
        const firstIndex=refs.findIndex(ref=>ref?.id===first);
        if(firstIndex>=0){
          try{ratios[firstIndex]=await getAssetRatio(first);}catch{}
        }
        if(revision!==coverRevision)return null;
        // Give the thumbnail a chance to paint before refining the crop.
        await new Promise(resolve=>{
          if(typeof window.requestIdleCallback==='function')
            window.requestIdleCallback(resolve,{timeout:1000});
          else window.setTimeout(resolve,80);
        });
        if(revision!==coverRevision)return null;
        const remaining=refs.map((ref,i)=>({ref,i}))
          .filter(({ref,i})=>i!==firstIndex&&ref?.id);
        let next=0;
        // Cover matching is optional background work, never a four-image burst
        // competing with the first visible card.
        await Promise.all(Array.from({length:Math.min(2,remaining.length)},async()=>{
          while(next<remaining.length&&revision===coverRevision){
            const {ref,i}=remaining[next++];
            try{ratios[i]=await getAssetRatio(ref.id);}catch{}
          }
        }));
        if(revision!==coverRevision)return null;
        const best=sceneCoverId(refs,ratios)||first;
        coverChoices.set(item.id,best);
        return best;
      })().catch(()=>first);
      coverRequests.set(item.id,pending);
    }
    void pending.then(best=>{
      if(best&&best!==chosen&&host.isConnected&&entries.includes(item))
        assetPhoto(host,best);
    });
  }
  const category=id=>CATEGORIES.find(c=>c.id===id)||CATEGORIES[0];
  const safeName=value=>String(value||'').trim().replace(/[\r\n|]+/g,' ').replace(/\s+/g,' ').slice(0,70);
  const displayName=pack=>pack.name.slice((PREFIX+pack.category+'|').length);
  const itemFromPack=pack=>{
    if(!isSceneLibraryPack(pack))return null;
    const name=pack.name.slice(PREFIX.length).split('|');
    return {...pack,category:name[0],title:name.slice(1).join('|')};
  };
  const setStatus=(message,error=false)=>{
    for(const id of ['scene-library-status','scene-browse-status']){
      const node=$(id);
      if(node){node.textContent=message||'';node.classList.toggle('is-error',!!error);}
    }
    // Validation and upload errors must be readable without scrolling.
    if(error&&view==='create')showSceneToast(message);
  };
  // The editor action wrapper shows the usual account notification. Keep the
  // same error in the library, so users can correct their selection in place.
  const runTask=task=>action(async()=>{try{await task();}catch(error){setStatus(error.message,true);throw error;}});
  function setWorking(value){
    working=!!value;
    $('scene-save').disabled=working;
    $('scene-new').disabled=working||allPacks.length>=40;
    $('scene-done').disabled=working;
    for(const id of ['scene-back','scene-cancel','scene-close'])$(id).disabled=working;
    $('scene-attached').disabled=working;
    $('scene-files').disabled=working;
    $('scene-note-suggest').disabled=working;
    dialog.querySelectorAll('[data-scene-use],[data-scene-delete]').forEach(btn=>btn.disabled=working);
  }
  function removePhoto(i){
    const p=photos[i];
    if(p?.owned&&p.url)URL.revokeObjectURL(p.url);
    photos.splice(i,1);renderPhotos();
  }
  function clearPhotos(){
    for(const p of photos)if(p.owned&&p.url)URL.revokeObjectURL(p.url);
    photos=[];renderPhotos();
  }
  function selectedCategory(){
    return category($('scene-category').value);
  }
  function renderPhotos(){
    const tray=$('scene-photos');
    tray.replaceChildren();
    photos.forEach((item,i)=>{
      const box=document.createElement('div');box.className='scene-photo';
      const img=document.createElement('img');img.src=item.url;img.alt='Selected reference '+(i+1);
      const remove=document.createElement('button');remove.type='button';remove.textContent='×';
      remove.setAttribute('aria-label','Remove selected photograph '+(i+1));
      remove.onclick=()=>{if(!working)removePhoto(i);};
      box.append(img,remove);tray.append(box);
    });
    $('scene-photo-count').textContent=photos.length+' / 8 images';
    $('scene-photo-hint').hidden=!!photos.length;
  }
  function appendPhotos(list){
    const remaining=8-photos.length;
    const incoming=Array.from(list||[]);
    if(incoming.length>remaining)throw Error('Choose up to eight images per saved item.');
    for(const entry of incoming){
      const file=entry.file||entry;
      if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>20*1024*1024)
        throw Error('Use JPG, PNG or WebP images under 20 MB each.');
    }
    for(const entry of incoming){
      const file=entry.file||entry;
      const externalUrl=entry.file&&(entry.thumbUrl||entry.url);
      photos.push({file,id:entry.file?entry.id||null:null,url:externalUrl||URL.createObjectURL(file),owned:!externalUrl});
    }
    renderPhotos();
    hideSceneToast();setStatus('');
  }
  function syncNoteUi(){
    const field=$('scene-note'),counter=$('scene-note-count');
    counter.textContent=field.value.length+' / '+field.maxLength;
    counter.classList.toggle('is-full',field.value.length>=field.maxLength);
    field.placeholder=({
      characters:'What facial or personal details must stay consistent?',
      outfits:'Which clothing details should stay unchanged?',
      props:'What makes this object recognizable?',
      locations:'What must stay the same in this location?'
    })[selectedCategory().id]||'Details you want the model to preserve';
  }
  function updateAppearance(){
    const isCharacter=$('scene-category').value==='characters';
    $('scene-identity-options').hidden=!isCharacter;
    $('scene-consent-wrap').hidden=!isCharacter;
    $('scene-create-description').textContent=isCharacter
      ?'Use clear photographs of the same adult. Identity only guides the face without copying wardrobe or background.'
      :'Save reference images for future scenes. Roles are applied automatically when you use them.';
    syncNoteUi();
  }
  function create(categoryId=current,starting=[]){
    current=category(categoryId).id;view='create';setStatus('');hideSceneToast();
    clearPhotos();
    $('scene-category').value=current;
    $('scene-name').value='';
    $('scene-note').value='';
    $('scene-consent').checked=false;
    if($('scene-smart-analyze'))$('scene-smart-analyze').checked=true;
    $('scene-appearance').checked=true;
    $('scene-browser').hidden=true;
    $('scene-create').hidden=false;
    updateAppearance();
    if(starting.length)appendPhotos(starting);
    $('scene-name').focus();
  }
  function browse(){
    view='browse';setStatus('');hideSceneToast();clearPhotos();
    $('scene-create').hidden=true;$('scene-browser').hidden=false;
    render();
  }
  function open(categoryId){
    if(!getContext().owner){notify('Sign in to use Scene Library.',true);return;}
    if(getContext().busy){notify('Wait for the current operation to finish.',true);return;}
    if(categoryId)current=category(categoryId).id;
    selectedId=null;featuredExpanded=false;
    closeOverlays();
    view='browse';$('scene-create').hidden=true;$('scene-browser').hidden=false;
    dialog.classList.toggle('scene-from-image',getContext().tool==='image');
    if(getContext().tool==='image'){
      const anchor=$('scene-image-open')?.getBoundingClientRect();
      dialog.style.setProperty('--scene-dialog-bottom',Math.ceil(Math.max(80,window.innerHeight-(anchor?.top||window.innerHeight-130)+10))+'px');
    }
    setStatus('');
    setElementsInfoOpen(false);
    if(!dialog.open)dialog.showModal();
    render();
  }
  function close(){
    if(working)return;
    if(leaveConfirm?.open)leaveConfirm.close();
    pendingNavigation=null;
    if(dialog.open)dialog.close();
    setElementsInfoOpen(false);
    hideSceneToast();clearPhotos();setStatus('');
  }
  function hasUnsavedDraft(){
    if(view!=='create')return false;
    return !!(photos.length||$('scene-name').value.trim()||$('scene-note').value.trim()
      ||$('scene-category').value!==current
      ||dialog.querySelector('input[name="scene-appearance"]:checked')?.value==='full'
      ||$('scene-consent').checked||$('scene-smart-analyze')?.checked===false);
  }
  function navigateTo(destination){
    if(destination?.type==='close'){close();return;}
    if(destination?.type==='packs'){close();openPhotoPacks?.();return;}
    if(destination?.type==='category'){
      current=category(destination.id).id;
      selectedId=null;featuredExpanded=false;
      $('scene-search').value='';
    }
    browse();
  }
  function requestNavigation(destination){
    if(working)return;
    if(!hasUnsavedDraft()){navigateTo(destination);return;}
    if(!leaveConfirm)return;
    const active=category($('scene-category').value);
    const target=destination.type==='category'?category(destination.id).label:
      destination.type==='packs'?'Photo packs':destination.type==='close'?'Image Studio':'your library';
    $('scene-leave-title').textContent='Save your '+active.label.toLowerCase().slice(0,-1)+'?';
    const needs=[];
    if(!$('scene-name').value.trim())needs.push('a name');
    if(!photos.length)needs.push('at least one photo');
    $('scene-leave-message').textContent='You have unsaved changes. Save before opening '+target+', discard them, or keep editing.'
      +(needs.length?' To save, add '+needs.join(' and ')+'.':'');
    pendingNavigation=destination;
    if(!leaveConfirm.open)leaveConfirm.showModal();
    $('scene-leave-stay').focus();
  }
  if(leaveConfirm){
    $('scene-leave-stay').onclick=()=>{
      leaveConfirm.close();pendingNavigation=null;$('scene-name').focus();
    };
    $('scene-leave-discard').onclick=()=>{
      const destination=pendingNavigation;
      leaveConfirm.close();pendingNavigation=null;
      navigateTo(destination);
    };
    $('scene-leave-save').onclick=()=>{
      const destination=pendingNavigation;
      leaveConfirm.close();pendingNavigation=null;
      void save(()=>navigateTo(destination));
    };
    // A queued close event from a previous confirmation must never erase
    // the destination of a confirmation opened immediately afterward.
    leaveConfirm.addEventListener('close',()=>{if(!leaveConfirm.open)pendingNavigation=null;});
  }

  const iconPaths={
    characters:'<circle cx="12" cy="7.5" r="3.5"/><path d="M5 20v-2.2c0-3.8 14-3.8 14 0V20Z"/>',
    outfits:'<path d="M9 4 7 6 3 8l3 5 2-1v9h8v-9l2 1 3-5-4-2-2-2c-.9 2-5.1 2-6 0Z"/>',
    props:'<path d="m12 2.8 8 4.5v9.4l-8 4.5-8-4.5V7.3Z"/><path d="m4 7.3 8 4.5 8-4.5M12 11.8v9.4"/>',
    locations:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>'
  };
  const categoryDescriptions={
    characters:'People and identities for your projects.',
    outfits:'Clothing and complete looks for your projects.',
    props:'Objects and details for your projects.',
    locations:'Places and environments for your projects.'
  };
  function renderFeatured(item){
    const host=$('scene-feature');
    host.replaceChildren();
    host.hidden=!item||!item.refs?.length;
    if(host.hidden)return;
    const cover=document.createElement('div');cover.className='scene-feature-cover';
    cover.setAttribute('role','img');
    cover.setAttribute('aria-label',item.title+' reference cover');
    renderCover(cover,item);
    const content=document.createElement('div');content.className='scene-feature-content';
    const eyebrow=document.createElement('span');eyebrow.className='scene-feature-eyebrow';
    eyebrow.textContent=current==='characters'?'SELECTED IDENTITY':'SELECTED ELEMENT';
    const title=document.createElement('h3');title.textContent=item.title;
    const summary=document.createElement('p');
    summary.textContent='Your saved '+(current==='characters'?'identity':category(current).label.toLowerCase().slice(0,-1))+' reference'+(item.refs.length===1?'':'s')+', ready for the next scene.';
    const bottom=document.createElement('div');bottom.className='scene-feature-bottom';
    const badges=document.createElement('div');badges.className='scene-feature-badges';
    const count=document.createElement('span');count.textContent=item.refs.length+' image'+(item.refs.length===1?'':'s');
    const kind=document.createElement('span');kind.textContent=category(current).label;badges.append(count,kind);
    const detail=document.createElement('button');detail.type='button';detail.className='scene-feature-details';
    detail.textContent=featuredExpanded?'Hide details ↑':'View details →';
    detail.setAttribute('aria-expanded',String(featuredExpanded));
    detail.onclick=()=>{featuredExpanded=!featuredExpanded;render();};
    bottom.append(badges,detail);content.append(eyebrow,title,summary,bottom);
    host.append(cover,content);
    if(featuredExpanded){
      const details=document.createElement('div');details.className='scene-feature-expanded';
      const shots=document.createElement('div');shots.className='scene-feature-photos';
      item.refs.forEach((ref,index)=>{
        if(!ref.id)return;
        const tile=document.createElement('div');tile.className='scene-feature-shot';
        tile.setAttribute('role','img');tile.setAttribute('aria-label',item.title+' view '+(index+1));
        assetPhoto(tile,ref.id);shots.append(tile);
      });
      const attach=document.createElement('button');attach.type='button';attach.className='scene-feature-attach';
      const attached=getReferences().some(active=>active.elementId===item.id)||item.refs.every(ref=>getReferences().some(active=>active.id===ref.id));
      attach.textContent=attached?'Already in deck ✓':'Use in scene →';
      attach.disabled=attached||working;attach.dataset.sceneUse='';
      attach.onclick=()=>{void useItem(item);};
      details.append(shots,attach);host.append(details);
    }
  }
  function render(){
    if(view!=='browse'||!dialog.open)return;
    const categoryData=category(current);
    const tabs=$('scene-tabs');tabs.replaceChildren();
    for(const cat of CATEGORIES){
      const btn=document.createElement('button');btn.type='button';
      btn.className='scene-category-tab'+(current===cat.id?' is-selected':'');
      btn.setAttribute('aria-pressed',String(current===cat.id));
      const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
      icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('fill','none');
      icon.setAttribute('stroke','currentColor');icon.setAttribute('stroke-width','1.7');
      icon.setAttribute('stroke-linecap','round');icon.setAttribute('stroke-linejoin','round');
      icon.setAttribute('aria-hidden','true');icon.innerHTML=iconPaths[cat.id];
      const label=document.createElement('span');label.textContent=cat.label;
      const arrow=document.createElement('span');arrow.className='scene-tab-chevron';
      arrow.textContent='›';arrow.setAttribute('aria-hidden','true');
      btn.append(icon,label,arrow);
      btn.onclick=()=>requestNavigation({type:'category',id:cat.id});
      tabs.append(btn);
    }
    const packsLink=document.createElement('button');packsLink.type='button';
    packsLink.className='scene-category-tab scene-photo-packs-link';
    packsLink.setAttribute('aria-label','Open Photo packs');
    packsLink.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.2" y="5.3" width="17.6" height="13.4" rx="2"/><circle cx="8.1" cy="9.4" r="1.5"/><path d="m4 16 5-5 4 3 3-3 4 4"/></svg><span>Photo packs</span><span class="scene-tab-chevron" aria-hidden="true">›</span>';
    packsLink.onclick=()=>requestNavigation({type:'packs'});
    tabs.append(packsLink);
    $('scene-library-title').textContent=categoryData.label;
    $('scene-description').textContent=categoryDescriptions[current];
    $('scene-search').placeholder='Search '+categoryData.label.toLowerCase()+'...';
    $('scene-search').setAttribute('aria-label','Search '+categoryData.label.toLowerCase());
    const query=String($('scene-search').value||'').trim().toLowerCase();
    const categoryItems=entries.filter(x=>x.category===current);
    const list=categoryItems.filter(x=>x.title.toLowerCase().includes(query));
    if(sortMode==='name')list.sort((a,b)=>a.title.localeCompare(b.title));
    else if(sortMode==='name-desc')list.sort((a,b)=>b.title.localeCompare(a.title));
    else {
      // Photo Packs defaults to recent, retaining API order when timestamps
      // are unavailable. Sorting is presentation-only, never saved to D1.
      const stamp=item=>Date.parse(item.updatedAt||item.updated_at||item.createdAt||item.created_at||'')||0;
      if(list.some(item=>stamp(item)))list.sort((a,b)=>stamp(b)-stamp(a));
    }
    // A saved item is not automatically selected; its private photograph
    // belongs to the card, not in place of the category artwork.
    const selected=list.find(i=>i.id===selectedId)||null;
    if(!selected)selectedId=null;
    const hero=$('scene-category-hero');
    hero.dataset.category=current;
    hero.setAttribute('aria-label',categoryData.label+' visual collection');
    $('scene-category-hero-title').textContent=categoryData.label;
    $('scene-category-hero-subtitle').textContent=categoryDescriptions[current];
    // Always preserve the chosen PV LAB category hero, even with saved items.
    hero.hidden=false;
    renderFeatured(selected);
    $('scene-active-label').textContent='All '+categoryData.label.toLowerCase();
    $('scene-library-count').textContent=query
      ?list.length+' matching · '+categoryItems.length+' saved'
      :categoryItems.length+' saved';
    const singular={characters:'character',outfits:'outfit',props:'prop',locations:'location'}[current];
    const createButton=$('scene-new');
    createButton.setAttribute('aria-label','New '+singular);
    createButton.title='New '+singular;
    createButton.disabled=working||allPacks.length>=40;
    $('scene-sort').setAttribute('aria-label','Sort '+categoryData.label.toLowerCase());
    const grid=$('scene-grid');grid.replaceChildren();grid.dataset.view=viewMode;
    $('scene-grid-view').setAttribute('aria-pressed',String(viewMode==='grid'));
    $('scene-list-view').setAttribute('aria-pressed',String(viewMode==='list'));
    for(const item of list){
      const card=document.createElement('article');card.className='scene-card'+(item.id===selectedId?' is-selected':'');
      const select=document.createElement('button');select.type='button';select.className='scene-card-select';
      select.setAttribute('aria-label','Preview '+item.title);
      select.setAttribute('aria-pressed',String(item.id===selectedId));
      const top=document.createElement('div');top.className='scene-card-image';
      top.setAttribute('role','img');top.setAttribute('aria-label',item.title+' cover');
      renderCover(top,item);
      const title=document.createElement('strong');title.textContent=item.title;
      const meta=document.createElement('small');meta.textContent=item.refs.length+' image'+(item.refs.length===1?'':'s');
      const details=document.createElement('div');details.className='scene-card-details';details.append(title,meta);
      select.append(top,details);
      select.onclick=()=>{selectedId=item.id;featuredExpanded=false;render();};
      const actions=document.createElement('div');actions.className='scene-card-actions';
      const use=document.createElement('button');use.type='button';use.className='scene-use';
      const already=getReferences().some(active=>active.elementId===item.id)||item.refs.every(ref=>getReferences().some(active=>active.id===ref.id));
      use.textContent=already?'Added ✓':'Use in scene';use.disabled=already||working;
      use.dataset.sceneUse='';use.onclick=()=>{void useItem(item);};
      const remove=document.createElement('button');remove.type='button';remove.className='scene-delete';
      remove.textContent='···';remove.title='Delete '+item.title;remove.setAttribute('aria-label','Delete '+item.title);
      remove.dataset.sceneDelete='';remove.onclick=()=>{void deleteItem(item);};
      actions.append(use,remove);card.append(select,actions);grid.append(card);
    }
    const empty=$('scene-empty');
    empty.hidden=!!list.length;
    $('scene-empty-heading').textContent=query?'No matching '+categoryData.label.toLowerCase():'No '+categoryData.label.toLowerCase()+' yet';
    $('scene-empty-description').textContent=query
      ?'Try a different search.'
      :'Save reusable reference photographs and find them here next time.';
    renderSelected();
  }
  function renderSelected(){
    const host=$('scene-video-selected');
    if(!host)return;
    host.replaceChildren();
    const selected=entries.filter(e=>getReferences().some(a=>a.elementId===e.id)||(e.refs.length&&e.refs.every(r=>getReferences().some(a=>a.id===r.id))));
    host.hidden=!selected.length;
    if(!selected.length)return;
    const label=document.createElement('small');label.textContent='Saved in this scene';
    host.append(label);
    for(const e of selected){
      const chip=document.createElement('span');chip.className='scene-attached-chip';
      chip.textContent='@'+e.title;
      chip.title=category(e.category).label+' · Remove individual images from References to detach';
      host.append(chip);
    }
  }
  async function useItem(item){
    if(working)return;
    const context=getContext();
    if(context.tool==='video'&&context.mode!=='reference'){setStatus('Use Scene Library in Video → References.',true);return;}
    if(context.tool==='image'&&!context.supportsReferences){setStatus('Choose an Image model that supports image references.',true);return;}
    const currentRefs=getReferences();
    if(currentRefs.some(ref=>ref.elementId===item.id)||item.refs.every(ref=>currentRefs.some(active=>active.id===ref.id))){
      setStatus(item.title+' is already attached.');return;
    }
    const capacity=getReferenceLimit()-currentRefs.length;
    if(capacity<1){setStatus('This model has no free reference slots. Remove an image or choose a model with more references.',true);return;}
    let attached=false;
    setWorking(true);setStatus('Preparing @'+item.title+' as one Element…');
    try{
      await runTask(async()=>{
        // Build the visual profile once, then reuse it on later insertions.
        // An unavailable analysis never destroys or changes the saved pack.
        if(context.tool==='image'&&!item.profile){
          let pending=pendingProfiles.get(item.id);
          if(!pending){
            pending=api('/api/elements/'+encodeURIComponent(item.id)+'/analyze',{method:'POST'})
              .then(result=>result?.profile||null).catch(()=>null);
            pendingProfiles.set(item.id,pending);
          }
          const profile=await pending;
          if(profile)item.profile=profile;
        }
        // Two relevant views at most: one Element, not an uncontrolled stack.
        const count=Math.min(capacity,item.category==='props'?1:2);
        const indices=selectElementViews(item,context.prompt||'',count);
        const chosen=indices.map(i=>({ref:item.refs[i],i})).filter(x=>x.ref?.id);
        if(!chosen.length)throw Error('This Element has no usable photographs.');
        const files=await Promise.all(chosen.map(({ref,i})=>assetFile(ref.id,safeName(item.title)+'-'+(i+1))));
        if(context.tool==='image'&&!currentRefs.length)prepareUse();
        const labels=chosen.map(({ref,i})=>({...ref,
          elementId:item.id,elementName:item.title,elementCategory:item.category,
          elementView:i,elementCount:item.refs.length,
          note:elementReferenceNote(item,i)
        }));
        await addReferences(files,chosen.map(({ref})=>ref.id),labels);
        // Never dismiss the library for an interrupted or partially attached set.
        if(!chosen.every(({ref})=>getReferences().some(active=>active.elementId===item.id&&active.id===ref.id)))
          throw Error('Not all selected views were attached. Please try again.');
        attached=true;
        setStatus('@'+item.title+' added as one Element · '+chosen.length+' selected view'+(chosen.length===1?'':'s')+'.');
      });
    }finally{
      setWorking(false);
      if(attached&&dialog.open){
        // Returning to the existing Image deck is navigation only. The saved
        // Element is already represented by one @name thumbnail; do not insert
        // text into the user's prompt or start a paid generation.
        close();
        if(context.tool==='image'&&window.matchMedia('(min-width:821px)').matches)
          requestAnimationFrame(()=>{
            if(!dialog.open&&getContext().owner&&getContext().tool==='image')
              $('image-composer-prompt')?.focus({preventScroll:true});
          });
      }else render();
    }
  }
  async function deleteItem(item){
    if(working||!window.confirm('Delete '+item.title+' from Scene Library? Generations already made will remain in History.'))return;
    setWorking(true);setStatus('Removing saved item…');
    try{
      await runTask(async()=>{
        await api('/api/packs/'+encodeURIComponent(item.id),{method:'DELETE'});
        await loadPacks();
        setStatus('Removed '+item.title+'.');
      });
    }finally{setWorking(false);render();}
  }
  function referenceNote(cat,title,appearance,extra){
    let note='';
    if(cat.id==='characters'){
      note=appearance==='full'
        ?'Character @'+title+': use this person, including recognizable face, hair and clothing. Do not copy the original background or pose.'
        :'Character @'+title+': match facial identity only. Do not copy clothing, pose, light or background.';
    }else if(cat.id==='outfits')note='Outfit @'+title+': transfer this clothing, not the model or setting.';
    else if(cat.id==='props')note='Prop @'+title+': preserve object design; adapt scale and lighting to the scene.';
    else note='Location @'+title+': use this setting, without copying incidental people.';
    return (note+(extra?' '+extra:'')).slice(0,300);
  }
  async function save(afterSuccess=null){
    if(working)return;
    const cat=selectedCategory(),title=safeName($('scene-name').value);
    if(!title){setStatus('Name your '+cat.label.toLowerCase().slice(0,-1)+' first.',true);return;}
    if(!photos.length){setStatus('Choose at least one photograph.',true);return;}
    if(cat.id==='characters'&&!$('scene-consent').checked){setStatus('Confirm that you are authorized to use the person’s photos.',true);return;}
    const packName=PREFIX+cat.id+'|'+title;
    if(allPacks.length>=40){setStatus('The current private archive allows 40 saved packs and Scene Library entries combined.',true);return;}
    if(entries.some(e=>e.name.toLowerCase()===packName.toLowerCase())){setStatus('You already saved '+title+' in '+cat.label+'. Use another name.',true);return;}
    const appearance=dialog.querySelector('input[name="scene-appearance"]:checked')?.value||'identity',extra=String($('scene-note').value||'').trim().slice(0,120);
    const role=cat.id==='characters'&&appearance==='full'?'custom':cat.role;
    let saved=false;
    setWorking(true);hideSceneToast();setStatus('Saving original references privately…');
    try{
      await runTask(async()=>{
        const ids=[];
        for(const item of photos)ids.push(item.id||await uploadAsset(item.file));
        const labels=ids.map((id,i)=>({
          name:photos[i].file.name||title+'-'+(i+1),role,
          ...(role==='outfit'?{target:'full'}:role==='object'?{target:'prop'}:{}),
          note:referenceNote(cat,title,appearance,extra)
        }));
        const created=await api('/api/packs',{method:'POST',body:{
          name:packName,engine:'seedance',referenceSourceIds:ids,referenceRoles:labels
        }});
        await loadPacks();
        saved=true;
        current=cat.id;browse();setStatus(title+' saved to '+cat.label+'. No generation was started.');
        if($('scene-smart-analyze')?.checked&&created?.id){
          setStatus('@'+title+' saved. Preparing its reusable visual profile…');
          const pending=api('/api/elements/'+encodeURIComponent(created.id)+'/analyze',{method:'POST'})
            .then(async result=>{
              await loadPacks();
              if(view==='browse'&&current===cat.id)
                setStatus('@'+title+' ready. Its visual profile is saved for future generations.');
              return result?.profile||null;
            })
            .catch(error=>{
              if(view==='browse'&&current===cat.id)
                setStatus('@'+title+' saved. Visual analysis unavailable: '+error.message+'. You can still use it.');
              return null;
            });
          pendingProfiles.set(created.id,pending);
          // Never hold the Save modal while Gemini indexes already-saved photos.
          void pending;
        }
      });
    }finally{
      setWorking(false);
      if(saved&&typeof afterSuccess==='function')afterSuccess();
    }
  }
  function reset(){working=false;if(leaveConfirm?.open)leaveConfirm.close();pendingNavigation=null;if(dialog.open)dialog.close();hideSceneToast();clearPhotos();allPacks=[];entries=[];selectedId=null;featuredExpanded=false;coverRevision++;coverChoices.clear();coverRequests.clear();pendingProfiles.clear();setStatus('');renderSelected();}
  function sync(packs){
    allPacks=Array.isArray(packs)?packs:[];
    coverRevision++;coverChoices.clear();coverRequests.clear();
    entries=allPacks.map(itemFromPack).filter(Boolean);
    render();
    renderSelected();
  }
  async function fromGallery(job){
    if(!job?.outputId){notify('Choose a completed image in Gallery first.',true);return;}
    try{
      const file=await assetFile(job.outputId,'gallery-character');
      open('characters');create('characters',[file]);
      setStatus('Gallery image ready. Choose the category, add more photos if needed, and save.');
    }catch(error){notify('Could not load the Gallery image: '+error.message,true);}
  }
  $('scene-close').onclick=()=>requestNavigation({type:'close'});
  $('scene-done').onclick=()=>requestNavigation({type:'close'});
  $('scene-back').onclick=()=>requestNavigation({type:'library'});
  $('scene-cancel').onclick=()=>requestNavigation({type:'library'});
  $('scene-new').onclick=()=>create(current);
  $('scene-search').addEventListener('input',render);
  $('scene-sort').addEventListener('change',event=>{
    if(!['recent','name','name-desc'].includes(event.target.value))return;
    sortMode=event.target.value;featuredExpanded=false;render();
  });
  $('scene-grid-view').onclick=()=>{viewMode='grid';render();};
  $('scene-list-view').onclick=()=>{viewMode='list';render();};
  $('scene-category').onchange=updateAppearance;
  $('scene-note').addEventListener('input',syncNoteUi);
  $('scene-note-suggest').onclick=()=>{
    if(working)return;
    const field=$('scene-note'),suggestion=suggestedSceneNote(selectedCategory().id);
    if(!suggestion)return;
    if(field.value.trim()&&field.value.trim()!==suggestion
      &&!window.confirm('Replace your current note with the suggested note?'))return;
    field.value=suggestion;syncNoteUi();field.focus();
    field.setSelectionRange(field.value.length,field.value.length);
  };
  $('scene-files').onchange=event=>{
    try{appendPhotos(event.target.files);}catch(error){setStatus(error.message,true);}
    event.target.value='';
  };
  $('scene-attached').onclick=()=>{
    try{
      if(!getReferences().length)throw Error('Add reference photos to the editor first, or upload them here.');
      appendPhotos(getReferences());setStatus('Attached photos selected. Remove unrelated images before saving.');
    }catch(error){setStatus(error.message,true);}
  };
  $('scene-save').onclick=()=>{void save();};
  dialog.addEventListener('cancel',event=>{
    if(elementsInfo&&!elementsInfo.hidden){
      event.preventDefault();setElementsInfoOpen(false);elementsInfoFocus?.focus();return;
    }
    if(working){event.preventDefault();return;}
    if(hasUnsavedDraft()){event.preventDefault();requestNavigation({type:'close'});}
  });
  dialog.addEventListener('close',()=>{
    setElementsInfoOpen(false);
    if(!working){hideSceneToast();clearPhotos();setStatus('');}
  });
  return {open,close,reset,sync,renderSelected,fromGallery,
    items:()=>entries.slice(),useById:async id=>{
      const item=entries.find(entry=>entry.id===id);
      if(!item)return false;
      await useItem(item);return true;
    }
  };
}
