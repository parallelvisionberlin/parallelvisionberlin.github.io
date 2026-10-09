// PV Lab owns the UI; the authenticated Worker owns credentials and provider calls.
export function createSoul2UI({api,uploadAsset,assetPhoto,notify,onChange,onJob,getPacks}){
  const $=id=>document.getElementById(id);
  let characters=[],selected='',enabled=false,timer=null,uploading=false;
  const current=()=>characters.find(c=>c.id===selected);
  function render(){
    const c=current();
    $('hf-status').textContent=!enabled?'Connect Higgsfield API to train and generate.':c?c.name+' · '+(c.state==='completed'?'ready':c.state):'Create or choose a Soul ID.';
    $('hf-connection').hidden=enabled;
    $('hf-training-submit').disabled=!enabled||uploading;
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
    if(!characters.length){const p=document.createElement('p');p.className='fine';p.textContent='No Soul IDs yet. Train one below from your identity photos.';grid.append(p);}
  }
  async function load(){
    if(!enabled){render();return;}
    const data=await api('/api/higgsfield/characters');characters=data.characters||[];
    if(!characters.some(c=>c.id===selected))selected='';
    render();onChange();clearTimeout(timer);
    if(characters.some(c=>['queued','running','submitting'].includes(c.state)))timer=setTimeout(()=>load().catch(e=>notify(e.message,true)),10000);
  }
  async function open(){
    $('hf-dialog').showModal();
    const select=$('hf-training-pack');select.replaceChildren(new Option('Upload new photos instead',''));
    for(const p of getPacks().filter(p=>p.refs?.length))select.add(new Option(p.name+' · '+p.refs.length+' photos',p.id));
    render();try{await load();}catch(e){$('hf-training-status').textContent=e.message;}
  }
  $('hf-manage').onclick=open;
  $('hf-close').onclick=()=>$('hf-dialog').close();
  $('hf-refresh').onclick=()=>load().catch(e=>notify(e.message,true));
  $('hf-strength').oninput=()=>{$('hf-strength-value').textContent=Number($('hf-strength').value).toFixed(2);onChange();};
  $('hf-resolution').onchange=onChange;
  $('hf-training-files').onchange=()=>{
    const files=[...$('hf-training-files').files];$('hf-training-count').textContent=files.length+' photos selected';
    $('hf-training-preview').replaceChildren();
    for(const file of files.slice(0,12)){const img=document.createElement('img');img.alt=file.name;const u=URL.createObjectURL(file);img.onload=img.onerror=()=>URL.revokeObjectURL(u);img.src=u;$('hf-training-preview').append(img);}
  };
  $('hf-training-submit').onclick=async()=>{
    if(uploading||!enabled)return;
    const name=$('hf-training-name').value.trim(),files=[...$('hf-training-files').files],pack=getPacks().find(p=>p.id===$('hf-training-pack').value),status=$('hf-training-status');
    if(!name){status.textContent='Name this identity first.';return;}
    if(files.length&&pack){status.textContent='Choose uploaded photos or a saved pack, not both.';return;}
    if((files.length||pack?.refs.length||0)<1||(files.length||pack?.refs.length||0)>100){status.textContent='Choose 1–100 identity photos.';return;}
    if(!$('hf-training-confirm').checked){status.textContent='Confirm the $2.50 training estimate below.';return;}
    uploading=true;render();
    try{
      let ids=pack?pack.refs.map(r=>r.id):[];
      for(let i=0;i<files.length;i++){status.textContent='Uploading photo '+(i+1)+' of '+files.length+'…';ids.push(await uploadAsset(files[i]));}
      status.textContent='Submitting Soul ID training…';
      const data=await api('/api/higgsfield/characters',{method:'POST',body:{name,referenceSourceIds:ids,confirmTraining:true}});
      onJob(data.job);status.textContent=data.job.error||'Training started. Your photo card will become selectable when ready.';
      $('hf-training-confirm').checked=false;await load();
    }catch(e){status.textContent=e.message;}finally{uploading=false;render();}
  };
  return {current,ready:()=>enabled&&(!selected||current()?.state==='completed'),open,
    configure(value){enabled=!!value;render();if(enabled)void load().catch(e=>notify(e.message,true));},
    parameters:()=>({characterId:selected,identityStrength:Number($('hf-strength').value),resolution:$('hf-resolution').value}),
    select(id){selected=id;render();},
    reset(){clearTimeout(timer);characters=[];selected='';enabled=false;render();},
    renderLibrary(grid){grid.replaceChildren();const none=document.createElement('button');none.type='button';none.className='composer-library-card';none.textContent='No character';none.setAttribute('aria-pressed',String(!selected));none.onclick=()=>{selected='';render();onChange();};grid.append(none);for(const c of characters){const b=document.createElement('button');b.type='button';b.className='composer-library-card';b.disabled=c.state!=='completed';const photo=document.createElement('span');photo.className='composer-library-photo';const name=document.createElement('strong');name.textContent=c.name;const state=document.createElement('small');state.textContent='Soul ID · '+(c.state==='completed'?'ready':c.state);b.append(photo,name,state);grid.append(b);assetPhoto(photo,c.portraitAssetId,c.name);b.onclick=()=>{selected=c.id;onChange();};}if(!characters.length){const p=document.createElement('p');p.textContent='Create your first Soul ID from photos.';grid.append(p);}}
  };
}
