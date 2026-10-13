// PV Lab owns the UI; the authenticated Worker owns credentials and provider calls.
export function createSoul2UI({api,uploadAsset,assetPhoto,notify,onChange,onJob,getPacks}){
  const $=id=>document.getElementById(id);
  let characters=[],selected='',enabled=false,timer=null,uploading=false,customerTrainingCredits=null,customerImageCredits=null,pendingFiles=[];
  const current=()=>characters.find(c=>c.id===selected);
  const chosenPack=()=>getPacks().find(p=>p.id===$('hf-training-pack').value);
  const photoCount=()=>pendingFiles.length||(chosenPack()?.refs?.length||0);
  function showStage(next){
    $('hf-library-view').hidden=next!=='library';
    $('hf-create-view').hidden=next!=='create';
    $('hf-title').textContent=next==='create'?'MAKE YOUR OWN CHARACTER':'YOUR CHARACTERS';
    $('hf-intro').textContent=next==='create'
      ?'Train a reusable identity for the images you create.'
      :'Create and manage identities you can reuse across new images.';
    $('hf-dialog').scrollTop=0;
  }
  function updateControls(){
    const count=photoCount();
    $('hf-training-submit').disabled=!enabled||uploading||!$('hf-training-name').value.trim()||count<1||count>100||!$('hf-training-confirm').checked;
    $('hf-upload-device').disabled=uploading;
    $('hf-upload-pack').disabled=uploading;
    $('hf-photo-clear').disabled=uploading;
    $('hf-training-pack').disabled=uploading;
    $('hf-upload-device').classList.toggle('is-selected',pendingFiles.length>0);
    $('hf-upload-pack').classList.toggle('is-selected',!!chosenPack());
  }
  function renderPhotos(){
    const pack=chosenPack(),refs=pack?.refs||[],count=photoCount(),preview=$('hf-training-preview');
    preview.replaceChildren();
    $('hf-training-count').textContent=count+' / 100 photos';
    $('hf-photo-empty').hidden=count>0;
    $('hf-photo-clear').hidden=count===0;
    const maxVisible=48;
    if(pendingFiles.length){
      for(const [index,file] of pendingFiles.slice(0,maxVisible).entries()){
        const tile=document.createElement('div');tile.className='hf-preview-tile';
        const img=document.createElement('img');img.alt='Identity photo '+(index+1);img.loading='lazy';img.decoding='async';
        const url=URL.createObjectURL(file);
        img.onload=img.onerror=()=>URL.revokeObjectURL(url);img.src=url;
        const remove=document.createElement('button');remove.type='button';remove.textContent='×';
        remove.setAttribute('aria-label','Remove '+file.name);
        remove.disabled=uploading;
        remove.onclick=()=>{if(uploading)return;pendingFiles.splice(index,1);renderPhotos();};
        tile.append(img,remove);preview.append(tile);
      }
    }else if(pack){
      for(const [index,ref] of refs.slice(0,maxVisible).entries()){
        const tile=document.createElement('div');tile.className='hf-preview-tile';
        const photo=document.createElement('span');photo.className='hf-preview-saved';
        tile.append(photo);preview.append(tile);
        assetPhoto(photo,ref.id,pack.name+' '+(index+1));
      }
    }
    if(count>maxVisible){
      const extra=document.createElement('div');extra.className='hf-preview-extra';
      extra.textContent='+'+(count-maxVisible)+' more photos selected';preview.append(extra);
    }
    updateControls();
  }
  function addPhotos(files){
    if(uploading)return;
    const accepted=['image/jpeg','image/png','image/webp'];
    const wrong=files.find(f=>!accepted.includes(f.type));
    if(wrong){$('hf-training-status').textContent='Only JPG, PNG and WebP photos are supported.';return;}
    const unique=new Set(pendingFiles.map(f=>[f.name,f.size,f.lastModified].join(':')));
    const more=files.filter(file=>{
      const key=[file.name,file.size,file.lastModified].join(':');
      if(unique.has(key))return false;unique.add(key);return true;
    });
    if(pendingFiles.length+more.length>100){
      $('hf-training-status').textContent='Choose no more than 100 photos. Clear or remove some first.';
      return;
    }
    if(!more.length)return;
    pendingFiles.push(...more);
    $('hf-training-pack').value='';
    $('hf-pack-picker').hidden=true;
    $('hf-training-status').textContent='';
    renderPhotos();
  }
  function render(){
    const c=current();
    $('hf-status').textContent=!enabled?'Connect Higgsfield API to train and generate.':c?c.name+' · '+(c.state==='completed'?'ready':c.state):'No Soul ID selected. Text or base-image generations will NOT preserve Nina.';
    $('hf-connection').hidden=enabled;
    updateControls();
    if(customerTrainingCredits!==null){
      const images=Math.floor(Math.max(0,1000-customerTrainingCredits)/customerImageCredits);
      $('hf-training-consent-copy').textContent='I confirm the identity photos depict consenting adults and authorize the one-time charge of '+customerTrainingCredits+' PV Lab credits for Soul ID training.';
      $('hf-training-submit').textContent='Create Soul ID · '+customerTrainingCredits+' credits';
      $('hf-training-price').textContent=customerTrainingCredits+' credits';
      $('hf-training-offer-note').hidden=false;
      $('hf-training-offer-note').textContent='With 1,000 credits, training leaves '+(1000-customerTrainingCredits)+' credits for up to '+images+' Soul 2 images at '+customerImageCredits+' credits each, subject to a valid live image quote.';
    }else{
      $('hf-training-consent-copy').textContent='I authorize sending these photos to Higgsfield and the estimated $2.50 one-time Soul ID training charge. Provider billing is authoritative.';
      $('hf-training-submit').textContent='Create Soul ID · est. $2.50';
      $('hf-training-price').textContent='Est. $2.50';
      $('hf-training-offer-note').hidden=true;
      $('hf-training-offer-note').textContent='';
    }
    $('hf-library-count').textContent=characters.length===1?'1 character':characters.length+' characters';
    const grid=$('hf-characters');grid.replaceChildren();
    for(const character of characters){
      const card=document.createElement('button');card.type='button';card.className='composer-library-card';card.disabled=character.state!=='completed';card.setAttribute('aria-pressed',String(character.id===selected));
      const photo=document.createElement('span');photo.className='composer-library-photo';
      const name=document.createElement('strong');name.textContent=character.name;
      const state=document.createElement('small');state.textContent=character.state==='completed'?'Soul ID · ready':character.state;
      card.append(photo,name,state);grid.append(card);assetPhoto(photo,character.portraitAssetId,character.name);
      if(character.error){const error=document.createElement('p');error.className='fine';error.textContent=character.error;grid.append(error);}
      card.onclick=()=>{selected=character.id;render();onChange();$('hf-dialog').close();};
    }
    if(!characters.length){
      const empty=document.createElement('div');empty.className='hf-empty-state';
      const symbol=document.createElement('span');symbol.className='hf-empty-symbol';symbol.textContent='✦';symbol.setAttribute('aria-hidden','true');
      const copy=document.createElement('div'),title=document.createElement('strong'),note=document.createElement('span');
      title.textContent='No characters yet';note.textContent='Create your first Soul ID from photos to get started.';
      copy.append(title,note);empty.append(symbol,copy);grid.append(empty);
    }
  }
  async function load(){
    if(!enabled){render();return;}
    const data=await api('/api/higgsfield/characters');characters=data.characters||[];
    if(!characters.some(c=>c.id===selected))selected='';
    render();onChange();clearTimeout(timer);
    if(characters.some(c=>['queued','running','submitting'].includes(c.state)))timer=setTimeout(()=>load().catch(e=>notify(e.message,true)),10000);
  }
  async function open({create=false}={}){
    const select=$('hf-training-pack'),previous=select.value;
    select.replaceChildren(new Option('Choose a saved photo pack',''));
    for(const p of getPacks().filter(p=>p.refs?.length))select.add(new Option(p.name+' · '+p.refs.length+' photos',p.id));
    if(previous&&[...select.options].some(option=>option.value===previous))select.value=previous;
    $('hf-library-message').textContent='';
    showStage(create?'create':'library');
    renderPhotos();render();
    $('hf-dialog').showModal();
    if(create)$('hf-training-name').focus({preventScroll:true});
    try{await load();}catch(e){
      if(create)$('hf-training-status').textContent=e.message;
      else $('hf-library-message').textContent=e.message;
    }
  }
  $('hf-manage').onclick=open;
  $('hf-close').onclick=()=>{if(!uploading)$('hf-dialog').close();};
  $('hf-dialog').addEventListener('cancel',event=>{if(uploading)event.preventDefault();});
  $('hf-create-open').onclick=()=>{if(uploading)return;showStage('create');$('hf-training-name').focus({preventScroll:true});};
  $('hf-back').onclick=()=>{if(!uploading)showStage('library');};
  $('hf-refresh').onclick=()=>load().catch(e=>notify(e.message,true));
  $('hf-strength').oninput=()=>{$('hf-strength-value').textContent=Number($('hf-strength').value).toFixed(2);onChange();};
  $('hf-resolution').onchange=onChange;
  $('hf-training-name').oninput=updateControls;
  $('hf-training-confirm').onchange=updateControls;
  $('hf-upload-device').onclick=()=>{if(!uploading)$('hf-training-files').click();};
  $('hf-upload-pack').onclick=()=>{
    if(uploading)return;
    const hasPacks=getPacks().some(p=>p.refs?.length);
    if(!hasPacks){$('hf-training-status').textContent='No saved photo packs yet. Upload photos from your device.';return;}
    $('hf-pack-picker').hidden=false;
    $('hf-training-pack').focus();
  };
  const uploadChoice=$('hf-upload-device');
  uploadChoice.addEventListener('dragover',e=>{if(uploading)return;e.preventDefault();uploadChoice.classList.add('is-dragging');});
  uploadChoice.addEventListener('dragleave',()=>uploadChoice.classList.remove('is-dragging'));
  uploadChoice.addEventListener('drop',e=>{
    if(uploading)return;e.preventDefault();uploadChoice.classList.remove('is-dragging');
    addPhotos([...e.dataTransfer.files]);
  });
  $('hf-training-files').onchange=()=>{
    addPhotos([...$('hf-training-files').files]);
    $('hf-training-files').value='';
  };
  $('hf-training-pack').onchange=()=>{
    if(chosenPack()){pendingFiles=[];$('hf-training-files').value='';$('hf-training-status').textContent='';}
    renderPhotos();
  };
  $('hf-photo-clear').onclick=()=>{
    if(uploading)return;pendingFiles=[];$('hf-training-files').value='';
    $('hf-training-pack').value='';$('hf-pack-picker').hidden=true;
    $('hf-training-status').textContent='';renderPhotos();
  };
  $('hf-training-submit').onclick=async()=>{
    if(uploading||!enabled)return;
    const name=$('hf-training-name').value.trim(),files=[...pendingFiles],pack=chosenPack(),status=$('hf-training-status');
    if(!name){status.textContent='Name this identity first.';return;}
    if(files.length&&pack){status.textContent='Choose uploaded photos or a saved pack, not both.';return;}
    if((files.length||pack?.refs.length||0)<1||(files.length||pack?.refs.length||0)>100){status.textContent='Choose 1–100 identity photos.';return;}
    if(!$('hf-training-confirm').checked){status.textContent=customerTrainingCredits!==null?'Confirm the '+customerTrainingCredits+'-credit Soul ID training charge.':'Confirm the $2.50 training estimate below.';return;}
    uploading=true;render();
    try{
      let ids=pack?pack.refs.map(r=>r.id):[];
      for(let i=0;i<files.length;i++){status.textContent='Uploading photo '+(i+1)+' of '+files.length+'…';ids.push(await uploadAsset(files[i]));}
      status.textContent='Submitting Soul ID training…';
      const data=await api('/api/higgsfield/characters',{method:'POST',body:{name,referenceSourceIds:ids,confirmTraining:true}});
      onJob(data.job);
      $('hf-library-message').textContent=data.job.error||'Training started. Your character will become selectable when it is ready.';
      status.textContent='';
      $('hf-training-confirm').checked=false;
      $('hf-training-name').value='';pendingFiles=[];$('hf-training-files').value='';
      $('hf-training-pack').value='';$('hf-pack-picker').hidden=true;
      renderPhotos();showStage('library');await load();
    }catch(e){status.textContent=e.message;}finally{uploading=false;render();}
  };
  return {current,ready:()=>enabled&&(!selected||current()?.state==='completed'),open,
    setCustomerPricing(price){
      const training=Number(price?.trainingCredits),image=Number(price?.imageCredits);
      customerTrainingCredits=Number.isSafeInteger(training)&&training>0&&Number.isSafeInteger(image)&&image>0?training:null;
      customerImageCredits=customerTrainingCredits===null?null:image;
      render();
    },
    configure(value){enabled=!!value;render();if(enabled)void load().catch(e=>notify(e.message,true));},
    parameters:()=>({characterId:selected,identityStrength:Number($('hf-strength').value),resolution:$('hf-resolution').value}),
    select(id){selected=id;render();},
    reset(){clearTimeout(timer);characters=[];selected='';enabled=false;customerTrainingCredits=null;customerImageCredits=null;pendingFiles=[];$('hf-training-files').value='';$('hf-training-name').value='';$('hf-training-confirm').checked=false;$('hf-training-pack').value='';renderPhotos();render();},
    renderLibrary(grid){grid.replaceChildren();const none=document.createElement('button');none.type='button';none.className='composer-library-card';none.textContent='No character';none.setAttribute('aria-pressed',String(!selected));none.onclick=()=>{selected='';render();onChange();};grid.append(none);for(const c of characters){const b=document.createElement('button');b.type='button';b.className='composer-library-card';b.disabled=c.state!=='completed';const photo=document.createElement('span');photo.className='composer-library-photo';const name=document.createElement('strong');name.textContent=c.name;const state=document.createElement('small');state.textContent='Soul ID · '+(c.state==='completed'?'ready':c.state);b.append(photo,name,state);grid.append(b);assetPhoto(photo,c.portraitAssetId,c.name);b.onclick=()=>{selected=c.id;onChange();};}if(!characters.length){const p=document.createElement('p');p.className='character-library-empty';p.textContent='Your characters will appear here once training is complete.';grid.append(p);}}
  };
}
