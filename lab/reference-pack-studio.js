// PV LAB / Photo Pack Studio.
// Private, non-billable reference collection editor. Uses the existing authenticated
// pack API and upload helpers; opening/choosing a pack never initiates generation.
export function createReferencePackStudio({
  getPacks,getReferences,getRoleLabels,ensureReferences,uploadAsset,
  api,loadPacks,assetPhoto,onUse,notify,isOwner,isBusy,session,openElementCategory
}){
  const $=id=>document.getElementById(id);
  const modal=$('pack-studio-dialog');
  let stage='library',source='none',files=[],saving=false,viewMode='grid',sortMode='recent';
  let sourceUploads=new WeakMap(),previewUrls=new Set(),currentSession=0;
  const maxPhotos=10,maxBytes=20*1024*1024;
  const fileKey=file=>[file.name,file.size,file.lastModified].join(':');
  const photos=()=>source==='deck'?getReferences():source==='device'?files:[];
  const isOpen=()=>modal.open;
  function checkSession(start){
    if(!isOwner()||start!==session())throw new Error('Your account changed. Nothing saved.');
  }
  function freePreviews(){
    for(const url of previewUrls)URL.revokeObjectURL(url);
    previewUrls.clear();
  }
  function view(name){
    stage=name;
    modal.classList.toggle('is-creating',name==='create');
    $('pack-studio-heading').textContent=name==='create'?'New photo pack':'Photo packs';
    $('pack-studio-library-view').hidden=name!=='library';
    $('pack-studio-create-view').hidden=name!=='create';
    modal.scrollTop=0;
  }
  function resetCreate(){
    freePreviews();files=[];sourceUploads=new WeakMap();
    $('pack-studio-files').value='';
    $('pack-studio-name').value='';
    $('pack-studio-create-status').textContent='';
    source='none';
    renderCreate();
  }
  function makeCard(pack){
    const card=document.createElement('article');card.className='pack-studio-card';
    const choose=document.createElement('button');choose.type='button';choose.className='pack-studio-card-select';
    choose.title='Load '+pack.name+' into the Image deck';
    choose.setAttribute('aria-label','Load '+pack.name+', '+pack.refs.length+' photographs');
    const cover=document.createElement('span');cover.className='pack-studio-card-photo';
    const photo=document.createElement('span');photo.className='pack-studio-card-media';
    const count=document.createElement('small');count.className='pack-studio-card-count';
    count.textContent=pack.refs.length+' photo'+(pack.refs.length===1?'':'s');
    cover.append(photo);
    const name=document.createElement('strong');name.className='pack-studio-card-name';
    name.textContent=pack.name;name.title=pack.name;
    choose.append(cover,name,count);
    choose.onclick=()=>{if(saving||isBusy())return;close();onUse(pack.id);};
    const remove=document.createElement('button');remove.type='button';remove.className='pack-studio-card-delete';
    remove.textContent='×';remove.title='Delete '+pack.name;
    remove.setAttribute('aria-label','Delete pack '+pack.name);
    remove.onclick=async event=>{
      event.stopPropagation();
      if(saving||isBusy()||!isOwner())return;
      if(!window.confirm('Delete photo pack "'+pack.name+'"? Existing generations remain in History.'))return;
      remove.disabled=true;choose.disabled=true;
      const at=session();
      try{
        await api('/api/packs/'+encodeURIComponent(pack.id),{method:'DELETE'});
        checkSession(at);
        await loadPacks();
        if(!isOpen())return;
        $('pack-studio-library-status').textContent='Pack deleted. Existing generations remain in History.';
        renderLibrary();
      }catch(error){
        if(isOwner()&&at===session()){
          $('pack-studio-library-status').textContent=error.message||'Could not delete this pack.';
          remove.disabled=false;choose.disabled=false;
        }
      }
    };
    card.append(choose,remove);
    assetPhoto(photo,pack.refs[0]?.id||null);
    return card;
  }
  function renderLibrary(){
    if(!isOpen())return;
    const allPacks=getPacks().filter(pack=>pack.refs?.length);
    const query=String($('pack-studio-search')?.value||'').trim().toLocaleLowerCase();
    const packs=allPacks.filter(pack=>pack.name.toLocaleLowerCase().includes(query));
    if(sortMode==='name')packs.sort((a,b)=>a.name.localeCompare(b.name));
    else if(sortMode==='name-desc')packs.sort((a,b)=>b.name.localeCompare(a.name));
    else {
      // Keep the original order when the API does not supply modification times.
      const stamp=pack=>Date.parse(pack.updatedAt||pack.updated_at||pack.createdAt||pack.created_at||'')||0;
      if(packs.some(pack=>stamp(pack)))packs.sort((a,b)=>stamp(b)-stamp(a));
    }
    $('pack-studio-library-count').textContent=query
      ?packs.length+' matching · '+allPacks.length+' saved'
      :allPacks.length+' / 40 packs';
    const grid=$('pack-studio-grid');grid.replaceChildren();grid.dataset.view=viewMode;
    $('pack-studio-grid-view').setAttribute('aria-pressed',String(viewMode==='grid'));
    $('pack-studio-list-view').setAttribute('aria-pressed',String(viewMode==='list'));
    if(!packs.length){
      const empty=document.createElement('div');empty.className='pack-studio-empty';
      const icon=document.createElement('span');icon.className='pack-studio-empty-symbol';icon.textContent='▧';
      const details=document.createElement('div');
      const headline=document.createElement('strong');
      headline.textContent=query?'No matching photo packs':'No packs yet';
      const message=document.createElement('small');
      message.textContent=query?'Try a different search.':'Save your favorite photo references to find them here next time.';
      details.append(headline,message);empty.append(icon,details);grid.append(empty);
    }
    for(const pack of packs)grid.append(makeCard(pack));
    // Keep creation prominent in the collection toolbar rather than an empty grid tile.
    const heading=modal.querySelector('.pack-studio-collection-heading');
    let create=$('pack-studio-new');
    if(!create){
      create=document.createElement('button');
      create.type='button';create.id='pack-studio-new';
      create.className='pack-studio-new-toolbar';
      create.textContent='+  New photo pack';
      heading?.querySelector('.pack-studio-collection-title')?.after(create);
    }
    create.disabled=saving||isBusy();create.onclick=beginCreate;
  }
  function makePreview(item,i){
    const tile=document.createElement('div');tile.className='pack-studio-preview';
    const frame=document.createElement('span');frame.className='pack-studio-preview-image';
    const image=document.createElement('img');image.alt='Photo '+(i+1);image.decoding='async';
    if(source==='deck'){
      image.src=item.thumbUrl||item.url;
    }else{
      const url=URL.createObjectURL(item);
      previewUrls.add(url);
      image.onload=image.onerror=()=>{
        if(previewUrls.has(url)){previewUrls.delete(url);URL.revokeObjectURL(url);}
      };
      image.src=url;
    }
    frame.append(image);
    const title=document.createElement('small');title.className='pack-studio-preview-label';
    title.textContent=source==='deck'?(item.role==='base'?'Base image':(item.role&&item.role!=='none'?item.role:'Reference')+' · '+(i+1)):'Reference '+(i+1);
    title.title=item.file?.name||item.name||title.textContent;
    tile.append(frame,title);
    if(source==='device'){
      const remove=document.createElement('button');remove.type='button';remove.className='pack-studio-preview-remove';
      remove.textContent='×';remove.setAttribute('aria-label','Remove '+item.name);
      remove.disabled=saving;
      remove.onclick=()=>{
        if(saving)return;
        files.splice(i,1);renderCreate();
      };
      tile.append(remove);
    }
    return tile;
  }
  function renderCreate(){
    if(!isOpen())return;
    freePreviews();
    const refs=getReferences(),chosen=photos(),count=chosen.length;
    $('pack-studio-deck-caption').textContent=refs.length
      ?refs.length+' attached photo'+(refs.length===1?'':'s')+', with roles'
      :'Add photos to the Image deck first';
    $('pack-studio-from-deck').disabled=saving||!refs.length||refs.length>maxPhotos;
    $('pack-studio-from-device').disabled=saving;
    $('pack-studio-files').disabled=saving;
    $('pack-studio-from-deck').setAttribute('aria-pressed',String(source==='deck'));
    $('pack-studio-from-device').setAttribute('aria-pressed',String(source==='device'));
    $('pack-studio-photo-count').textContent=count+' / 10 photos';
    $('pack-studio-photo-hint').textContent=source==='deck'
      ?'Your existing photo order, roles and notes will be saved without changing this Image deck.'
      :source==='device'
      ?'Original photographs stay private. All uploaded photos start as general references; you can assign roles after loading the pack.'
      :'Choose Current Image deck or Upload from computer to add photographs.';
    const grid=$('pack-studio-previews');grid.replaceChildren();
    if(!count){
      const empty=document.createElement('p');empty.className='pack-studio-empty';
      empty.textContent=source==='none'
        ?'Select a photo source above to begin.'
        :'Choose photographs from your computer to start this pack.';
      grid.append(empty);
    }else{
      chosen.forEach((item,i)=>grid.append(makePreview(item,i)));
    }
    $('pack-studio-save').disabled=saving||isBusy()||!isOwner()||!$('pack-studio-name').value.trim()||count<1||count>maxPhotos;
    $('pack-studio-save').querySelector('span').textContent=saving?'…':'↗';
    $('pack-studio-back').disabled=saving;
    $('pack-studio-close').disabled=saving;
  }
  function beginCreate(){
    if(saving||isBusy()||!isOwner())return;
    view('create');resetCreate();
    $('pack-studio-name').focus({preventScroll:true});
  }
  function addFiles(incoming){
    if(saving)return;
    const valid=['image/jpeg','image/png','image/webp'];
    const selected=[...incoming];
    if(!selected.length)return;
    if(selected.some(file=>!valid.includes(file.type)||!file.size||file.size>maxBytes)){
      $('pack-studio-create-status').textContent='Choose JPG, PNG or WebP photos, each no larger than 20 MB.';
      return;
    }
    const seen=new Set(files.map(fileKey)),accepted=[];
    for(const file of selected){
      const key=fileKey(file);
      if(!seen.has(key)){seen.add(key);accepted.push(file);}
    }
    if(files.length+accepted.length>maxPhotos){
      $('pack-studio-create-status').textContent='A photo pack holds up to 10 photographs.';
      return;
    }
    files.push(...accepted);source='device';
    $('pack-studio-create-status').textContent='';
    renderCreate();
  }
  function close({force=false}={}){
    if(!modal.open||(saving&&!force))return;
    modal.close();
  }
  function open(){
    if(isBusy()||!isOwner())return;
    if(!modal.open)modal.showModal();
    currentSession=session();
    $('pack-studio-library-status').textContent='';
    $('pack-studio-search').value='';
    sortMode='recent';viewMode='grid';$('pack-studio-sort').value='recent';
    view('library');renderLibrary();
  }
  async function save(){
    if(saving||isBusy()||!isOwner())return;
    const name=$('pack-studio-name').value.trim(),selected=[...photos()];
    if(!name){$('pack-studio-create-status').textContent='Give this photo pack a name first.';return;}
    if(!selected.length||selected.length>maxPhotos){$('pack-studio-create-status').textContent='Choose 1 to 10 photographs.';return;}
    saving=true;renderCreate();
    const at=session(),status=$('pack-studio-create-status');
    try{
      let ids,labels;
      if(source==='deck'){
        labels=getRoleLabels();
        status.textContent='Saving the current reference set…';
        ids=await ensureReferences();checkSession(at);
      }else{
        ids=[];labels=selected.map(file=>({name:file.name,role:'none',note:'',target:''}));
        for(const [i,file] of selected.entries()){
          checkSession(at);
          status.textContent='Saving original photograph '+(i+1)+' of '+selected.length+'…';
          let id=sourceUploads.get(file);
          if(!id){id=await uploadAsset(file);sourceUploads.set(file,id);}
          ids.push(id);
        }
      }
      checkSession(at);
      status.textContent='Creating your private pack…';
      await api('/api/packs',{method:'POST',body:{name,engine:'wan',referenceSourceIds:ids,referenceRoles:labels}});
      checkSession(at);
      await loadPacks();
      checkSession(at);
      saving=false;
      resetCreate();view('library');renderLibrary();
      $('pack-studio-library-status').textContent='"'+name+'" saved privately. Ready to use.';
      notify('Photo pack saved. No generation or credit charge.');
    }catch(error){
      if(at===session()&&isOwner())status.textContent=error?.message||'Could not save this pack.';
    }finally{
      saving=false;
      if(at===session()&&isOwner()&&isOpen())renderCreateIfNeeded();
    }
  }
  function renderCreateIfNeeded(){if(stage==='create')renderCreate();}
  $('pack-studio-close').onclick=close;
  $('pack-studio-search').addEventListener('input',()=>{if(stage==='library')renderLibrary();});
  $('pack-studio-sort').onchange=()=>{sortMode=$('pack-studio-sort').value;renderLibrary();};
  for(const mode of ['grid','list'])$('pack-studio-'+mode+'-view').onclick=()=>{
    viewMode=mode;renderLibrary();
  };
  for(const button of modal.querySelectorAll('[data-pack-element]')){
    button.onclick=()=>{
      if(saving||isBusy()||!isOwner())return;
      const category=button.dataset.packElement;
      close();
      openElementCategory?.(category);
    };
  }
  $('pack-studio-nav-packs').onclick=()=>{
    if(saving)return;
    if(stage==='create'){resetCreate();view('library');renderLibrary();}
  };
  $('pack-studio-back').onclick=()=>{if(!saving){resetCreate();view('library');renderLibrary();}};
  $('pack-studio-name').oninput=()=>{
    $('pack-studio-create-status').textContent='';
    // Typing a name must not tear down and re-decode the image previews.
    const n=photos().length;
    $('pack-studio-save').disabled=saving||isBusy()||!isOwner()||!$('pack-studio-name').value.trim()||n<1||n>maxPhotos;
  };
  $('pack-studio-from-deck').onclick=()=>{
    const count=getReferences().length;
    if(saving||!count||count>maxPhotos)return;
    source='deck';renderCreate();
    $('pack-studio-create-status').textContent=count+' photo'+(count===1?'':'s')+' selected from the current Image deck.';
  };
  $('pack-studio-from-device').onclick=()=>{
    if(saving)return;
    if(source!=='device'&&files.length){
      source='device';renderCreate();
      $('pack-studio-create-status').textContent=files.length+' uploaded photo'+(files.length===1?'':'s')+' selected.';
      return;
    }
    // Keep the current source if the user cancels the native file picker.
    $('pack-studio-files').click();
  };
  $('pack-studio-files').onchange=()=>{
    addFiles($('pack-studio-files').files||[]);
    $('pack-studio-files').value='';
  };
  const picker=$('pack-studio-from-device');
  picker.addEventListener('dragover',event=>{if(saving)return;event.preventDefault();picker.classList.add('is-dragging');});
  picker.addEventListener('dragleave',()=>picker.classList.remove('is-dragging'));
  picker.addEventListener('drop',event=>{
    if(saving)return;event.preventDefault();picker.classList.remove('is-dragging');
    addFiles(event.dataTransfer?.files||[]);
  });
  $('pack-studio-save').onclick=()=>void save();
  modal.addEventListener('cancel',event=>{if(saving)event.preventDefault();});
  modal.addEventListener('close',()=>{
    freePreviews();files=[];sourceUploads=new WeakMap();stage='library';
    $('composer-add-saved-toggle').setAttribute('aria-expanded','false');
    $('pack-studio-create-status').textContent='';
  });
  modal.addEventListener('click',event=>{
    if(event.target===modal&&!saving)close();
  });
  return {open,close,isOpen,refresh:()=>{if(isOpen()&&stage==='library')renderLibrary();},forceClose:()=>close({force:true})};
}
