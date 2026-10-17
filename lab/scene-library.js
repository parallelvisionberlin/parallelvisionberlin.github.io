// PV LAB Scene Library. Uses existing private photo packs and reference APIs.
// No new provider calls, training jobs, credit charges or automatic generations.
const PREFIX='PVSCENE1|';
const CATEGORIES=[
  {id:'characters',label:'Characters',role:'identity',help:'People, AI models and robots'},
  {id:'outfits',label:'Outfits',role:'outfit',help:'Clothing and complete looks'},
  {id:'props',label:'Props',role:'object',help:'Objects, products and vehicles'},
  {id:'locations',label:'Locations',role:'room',help:'Places, interiors and sets'}
];
export const isSceneLibraryPack=pack=>typeof pack?.name==='string'&&/^PVSCENE1\|(characters|outfits|props|locations)\|.{1,80}$/.test(pack.name);
export function createSceneLibrary({api,uploadAsset,assetFile,assetPhoto,getReferences,getReferenceLimit,getContext,prepareUse,addReferences,loadPacks,getAllPacks,notify,action,closeOverlays}) {
  const $=id=>document.getElementById(id);
  const dialog=$('scene-library-dialog');
  if(!dialog)return {open(){},sync(){},renderSelected(){},fromGallery(){}};
  let current='characters',entries=[],allPacks=[],view='browse',photos=[],working=false;
  const category=id=>CATEGORIES.find(c=>c.id===id)||CATEGORIES[0];
  const safeName=value=>String(value||'').trim().replace(/[\r\n|]+/g,' ').replace(/\s+/g,' ').slice(0,70);
  const displayName=pack=>pack.name.slice((PREFIX+pack.category+'|').length);
  const itemFromPack=pack=>{
    if(!isSceneLibraryPack(pack))return null;
    const name=pack.name.slice(PREFIX.length).split('|');
    return {...pack,category:name[0],title:name.slice(1).join('|')};
  };
  const setStatus=(message,error=false)=>{
    const node=$('scene-library-status');
    if(node){node.textContent=message||'';node.classList.toggle('is-error',!!error);}
  };
  function setWorking(value){
    working=!!value;
    $('scene-save').disabled=working;
    $('scene-new').disabled=working;
    $('scene-done').disabled=working;
    $('scene-attached').disabled=working;
    $('scene-files').disabled=working;
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
  }
  function updateAppearance(){
    const isCharacter=$('scene-category').value==='characters';
    $('scene-identity-options').hidden=!isCharacter;
    $('scene-consent-wrap').hidden=!isCharacter;
    $('scene-create-description').textContent=isCharacter
      ?'Use clear photographs of the same adult. Identity only guides the face without copying wardrobe or background.'
      :'Save reference images for future scenes. Roles are applied automatically when you use them.';
  }
  function create(categoryId=current,starting=[]){
    current=category(categoryId).id;view='create';setStatus('');
    clearPhotos();
    $('scene-category').value=current;
    $('scene-name').value='';
    $('scene-note').value='';
    $('scene-consent').checked=false;
    $('scene-appearance').value='identity';
    $('scene-browser').hidden=true;
    $('scene-create').hidden=false;
    updateAppearance();
    if(starting.length)appendPhotos(starting);
    $('scene-name').focus();
  }
  function browse(){
    view='browse';setStatus('');clearPhotos();
    $('scene-create').hidden=true;$('scene-browser').hidden=false;
    render();
  }
  function open(categoryId){
    if(!getContext().owner){notify('Sign in to use Scene Library.',true);return;}
    if(getContext().busy){notify('Wait for the current operation to finish.',true);return;}
    if(categoryId)current=category(categoryId).id;
    closeOverlays();
    view='browse';$('scene-create').hidden=true;$('scene-browser').hidden=false;
    setStatus('');
    if(!dialog.open)dialog.showModal();
    render();
  }
  function close(){
    if(working)return;
    if(dialog.open)dialog.close();
    clearPhotos();setStatus('');
  }
  function render(){
    if(view!=='browse')return;
    const categoryData=category(current);
    const tabs=$('scene-tabs');tabs.replaceChildren();
    for(const cat of CATEGORIES){
      const btn=document.createElement('button');
      btn.type='button';btn.className='scene-category-tab'+(current===cat.id?' is-selected':'');
      const count=entries.filter(item=>item.category===cat.id).length;
      btn.textContent=cat.label+' · '+count;btn.setAttribute('aria-pressed',String(current===cat.id));
      btn.onclick=()=>{current=cat.id;render();};tabs.append(btn);
    }
    $('scene-active-label').textContent=categoryData.label;
    const query=String($('scene-search').value||'').trim().toLowerCase();
    const list=entries.filter(x=>x.category===current&&x.title.toLowerCase().includes(query))
      .sort((a,b)=>a.title.localeCompare(b.title));
    const grid=$('scene-grid');grid.replaceChildren();
    for(const item of list){
      const card=document.createElement('article');card.className='scene-card';
      const image=document.createElement('img');image.alt=item.title+' reference preview';image.loading='lazy';image.decoding='async';
      if(item.refs?.[0]?.id)assetPhoto(image,item.refs[0].id);
      const top=document.createElement('div');top.className='scene-card-image';top.append(image);
      const title=document.createElement('strong');title.textContent=item.title;
      const meta=document.createElement('small');meta.textContent=item.refs.length+' image'+(item.refs.length===1?'':'s');
      const details=document.createElement('div');details.className='scene-card-details';details.append(title,meta);
      const actions=document.createElement('div');actions.className='scene-card-actions';
      const use=document.createElement('button');use.type='button';use.className='scene-use';
      const already=item.refs.every(ref=>getReferences().some(active=>active.id===ref.id));
      use.textContent=already?'Added ✓':'Use in scene';use.disabled=already||working;
      use.dataset.sceneUse='';use.onclick=()=>{void useItem(item);};
      const remove=document.createElement('button');remove.type='button';remove.className='scene-delete';remove.textContent='···';
      remove.title='Delete '+item.title;remove.setAttribute('aria-label','Delete '+item.title);
      remove.dataset.sceneDelete='';remove.onclick=()=>{void deleteItem(item);};
      actions.append(use,remove);card.append(top,details,actions);grid.append(card);
    }
    const add=document.createElement('button');add.type='button';add.className='scene-card scene-create-tile';
    const plus=document.createElement('span');plus.className='scene-create-plus';plus.textContent='+';
    const label=document.createElement('strong');label.textContent='New '+categoryData.label.slice(0,-1).replace(/ie$/,'y');
    const sub=document.createElement('small');sub.textContent='Save your own images';
    add.append(plus,label,sub);add.onclick=()=>create(current);grid.append(add);
    $('scene-empty').hidden=!!list.length||!query;
    $('scene-library-count').textContent=entries.length+' saved · private to your account';
    renderSelected();
  }
  function renderSelected(){
    const host=$('scene-video-selected');
    if(!host)return;
    host.replaceChildren();
    const selected=entries.filter(e=>e.refs.length&&e.refs.every(r=>getReferences().some(a=>a.id===r.id)));
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
    const missing=item.refs.filter(r=>!currentRefs.some(active=>active.id===r.id));
    if(!missing.length){setStatus(item.title+' is already attached.');return;}
    if(currentRefs.length+missing.length>getReferenceLimit()){setStatus('This model supports up to '+getReferenceLimit()+' image references. Remove some before adding this item.',true);return;}
    setWorking(true);setStatus('Loading original images…');
    try{
      await action(async()=>{
        // Use the existing validated asset download and reference pipeline.
        const files=await Promise.all(missing.map((ref,i)=>assetFile(ref.id,safeName(item.title)+'-'+(i+1))));
        if(context.tool==='image'&&!currentRefs.length)prepareUse();
        await addReferences(files,missing.map(ref=>ref.id),missing.map(ref=>({...ref,note:(ref.note||'').slice(0,300)})));
        setStatus(item.title+' added. You can add more references or close the library.');
      });
    }finally{setWorking(false);render();}
  }
  async function deleteItem(item){
    if(working||!window.confirm('Delete '+item.title+' from Scene Library? Generations already made will remain in History.'))return;
    setWorking(true);setStatus('Removing saved item…');
    try{
      await action(async()=>{
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
  async function save(){
    if(working)return;
    const cat=selectedCategory(),title=safeName($('scene-name').value);
    if(!title){setStatus('Name your '+cat.label.toLowerCase().slice(0,-1)+' first.',true);return;}
    if(!photos.length){setStatus('Choose at least one photograph.',true);return;}
    if(cat.id==='characters'&&!$('scene-consent').checked){setStatus('Confirm that you are authorized to use the person’s photos.',true);return;}
    const packName=PREFIX+cat.id+'|'+title;
    if(allPacks.length>=40){setStatus('The current private archive allows 40 saved packs and Scene Library entries combined.',true);return;}
    if(entries.some(e=>e.name.toLowerCase()===packName.toLowerCase())){setStatus('You already saved '+title+' in '+cat.label+'. Use another name.',true);return;}
    const appearance=$('scene-appearance').value,extra=String($('scene-note').value||'').trim().slice(0,120);
    const role=cat.id==='characters'&&appearance==='full'?'custom':cat.role;
    setWorking(true);setStatus('Saving original references privately…');
    try{
      await action(async()=>{
        const ids=[];
        for(const item of photos)ids.push(item.id||await uploadAsset(item.file));
        const labels=ids.map((id,i)=>({
          name:photos[i].file.name||title+'-'+(i+1),role,
          ...(role==='outfit'?{target:'full'}:role==='object'?{target:'prop'}:{}),
          note:referenceNote(cat,title,appearance,extra)
        }));
        await api('/api/packs',{method:'POST',body:{
          name:packName,engine:'seedance',referenceSourceIds:ids,referenceRoles:labels
        }});
        await loadPacks();
        current=cat.id;browse();setStatus(title+' saved to '+cat.label+'. No generation was started.');
      });
    }finally{setWorking(false);}
  }
  function sync(packs){
    allPacks=Array.isArray(packs)?packs:[];
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
  $('scene-close').onclick=close;
  $('scene-done').onclick=close;
  $('scene-back').onclick=browse;
  $('scene-cancel').onclick=browse;
  $('scene-new').onclick=()=>create(current);
  $('scene-search').addEventListener('input',render);
  $('scene-category').onchange=updateAppearance;
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
  dialog.addEventListener('cancel',event=>{if(working)event.preventDefault();});
  dialog.addEventListener('close',()=>{if(!working){clearPhotos();setStatus('');}});
  return {open,close,sync,renderSelected,fromGallery};
}
