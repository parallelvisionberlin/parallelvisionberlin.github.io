import {MOODS,userFacingImagePrompt,moodById} from './moods.js?v=20261011-my-moods1';

// Personal moodboards: authenticated, private, and independent of paid generation.
// Reference photos are inspiration only; they are not secretly sent to a model.
export function createMyMoods({api,assetBlob,moodUI,notify,active}){
  const $=id=>document.getElementById(id);
  const dialog=$('moodboard-editor');
  const form=$('moodboard-form');
  const title=$('moodboard-editor-title'),targetRow=$('moodboard-target-row');
  const target=$('moodboard-target'),name=$('moodboard-name'),direction=$('moodboard-direction');
  const base=$('moodboard-base'),intensity=$('moodboard-intensity');
  const imageList=$('moodboard-images'),imageCount=$('moodboard-images-count');
  const save=$('moodboard-save'),remove=$('moodboard-delete'),message=$('moodboard-editor-status');
  let boards=[],editing=null,fromJob=null,stagedIds=[],saving=false,epoch=0,loading=null;
  const urls=new Map();
  function find(id){return boards.find(board=>board.id===id)||null;}
  function all(){return [...boards];}
  function flash(text,error=false){message.textContent=text;message.classList.toggle('error',!!error);}
  function getPayload(){return {
    name:name.value.trim(),
    direction:direction.value.trim(),
    baseMoodId:base.value||null,
    intensity:Number(intensity.value),
    imageIds:[...stagedIds]
  };}
  function updatePersonal(){
    moodUI.setPersonalMoods(boards.map(board=>({...board,previewUrl:urls.get(board.imageIds?.[0])||''})));
  }
  async function imageUrl(id){
    if(!id||!active())return null;
    if(urls.has(id))return urls.get(id);
    const current=epoch,blob=await assetBlob(id);
    if(current!==epoch||!active())return null;
    if(!blob?.type?.startsWith('image/'))return null;
    const url=URL.createObjectURL(blob);urls.set(id,url);return url;
  }
  async function previews(){
    const current=epoch;
    // Load covers progressively, without downloading an entire Pinterest-style board.
    for(const board of boards.slice(0,12)){
      if(current!==epoch||!active())return;
      const id=board.imageIds?.[0];if(!id||urls.has(id))continue;
      try{await imageUrl(id);if(current===epoch)updatePersonal();}catch{/* Missing thumbnails should not hide saved recipes. */}
    }
  }
  async function refresh(){
    if(!active())return;
    if(loading)return loading;
    const current=epoch;
    loading=(async()=>{
      const data=await api('/api/moodboards');
      if(!active()||current!==epoch)return;
      boards=Array.isArray(data.moodboards)?data.moodboards:[];
      updatePersonal();
      void previews();
    })();
    try{await loading;}finally{loading=null;}
  }
  function reset(){
    ++epoch;boards=[];editing=null;fromJob=null;stagedIds=[];loading=null;
    for(const url of urls.values())URL.revokeObjectURL(url);
    urls.clear();moodUI.setPersonalMoods([]);
    if(dialog.open)dialog.close();
  }
  function populate(){
    target.replaceChildren(new Option('Create a new Mood',''));
    for(const item of boards)target.add(new Option(item.name+' · '+item.imageIds.length+' images',item.id));
    base.replaceChildren(new Option('Custom look, no curated base',''));
    for(const mood of MOODS)base.add(new Option(mood.name,mood.id));
  }
  async function renderImages(){
    imageList.replaceChildren();
    imageCount.textContent=stagedIds.length+' / 12 images';
    const current=epoch;
    for(const id of stagedIds){
      const tile=document.createElement('div');tile.className='moodboard-image-tile';
      const img=document.createElement('img');img.alt='Moodboard inspiration image';
      const removeButton=document.createElement('button');removeButton.type='button';removeButton.className='moodboard-image-remove';
      removeButton.textContent='×';removeButton.setAttribute('aria-label','Remove image from this moodboard');
      removeButton.onclick=()=>{stagedIds=stagedIds.filter(x=>x!==id);void renderImages();};
      tile.append(img,removeButton);imageList.append(tile);
      void imageUrl(id).then(url=>{
        if(current===epoch&&stagedIds.includes(id)&&tile.isConnected&&url)img.src=url;
      }).catch(()=>{});
    }
  }
  function setMode(mode){
    const existing=mode==='edit',adding=mode==='add';
    targetRow.hidden=existing||!fromJob;
    for(const el of form.querySelectorAll('.moodboard-config'))el.hidden=adding;
    name.required=!adding;
    remove.hidden=!existing;
    title.textContent=existing?'Edit your Mood':adding?'Add to Mood':'Create a Mood';
    save.textContent=existing?'Save changes':adding?'Add image to Mood':'Save Mood';
    flash('');
  }
  async function openCreate(job=null){
    if(!active())return;
    try{await refresh();}catch(error){notify('My Moods is unavailable. '+error.message,true);return;}
    populate();editing=null;fromJob=job;stagedIds=job?.outputId?[job.outputId]:[];
    const settings=job?.settings||{};
    const existingCustom=settings.moodId==='custom'?find(settings.customMoodBoardId):null;
    target.value=existingCustom?.id||'';
    name.value='';direction.value='';
    base.value=moodById(settings.moodId)?.id||existingCustom?.baseMoodId||'';
    intensity.value=String(settings.moodIntensity||existingCustom?.intensity||60);
    if(!base.value&&job){
      // User-authored text only; never expose compiled private provider instructions.
      direction.value=userFacingImagePrompt(settings).slice(0,900);
    }
    setMode(target.value?'add':'create');
    void renderImages();
    if(!dialog.open)dialog.showModal();
    if(target.value)target.focus();else name.focus();
  }
  function openEdit(board){
    if(!active())return;
    const found=find(board?.id);if(!found){notify('This Mood is no longer available. Refresh My Moods.',true);return;}
    editing=found;fromJob=null;stagedIds=[...found.imageIds];
    populate();name.value=found.name;direction.value=found.direction;
    base.value=found.baseMoodId||'';intensity.value=String(found.intensity||60);
    setMode('edit');void renderImages();
    if(!dialog.open)dialog.showModal();
    name.focus();
  }
  target.addEventListener('change',()=>{setMode(target.value?'add':'create');});
  $('moodboard-cancel').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{editing=null;fromJob=null;stagedIds=[];saving=false;flash('');});
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(saving||!active())return;
    void (async()=>{
      saving=true;save.disabled=true;remove.disabled=true;flash('Saving to your private account…');
      try{
        const selected=fromJob&&target.value?find(target.value):null;
        if(selected){
          const ids=[...new Set([...selected.imageIds,fromJob.outputId])];
          if(ids.length>12)throw Error('This Mood already has 12 images. Edit the board to make space.');
          await api('/api/moodboards/'+encodeURIComponent(selected.id),{method:'POST',body:{
            name:selected.name,direction:selected.direction,baseMoodId:selected.baseMoodId,intensity:selected.intensity,imageIds:ids
          }});
        }else{
          const payload=getPayload();
          if(!payload.name)throw Error('Give this Mood a name.');
          if(!payload.direction&&!payload.baseMoodId)throw Error('Write a style direction or choose a curated Mood.');
          if(editing)await api('/api/moodboards/'+encodeURIComponent(editing.id),{method:'POST',body:payload});
          else await api('/api/moodboards',{method:'POST',body:payload});
        }
        const wasEditing=!!editing;
        dialog.close();await refresh();
        notify(selected?'Image added to '+selected.name+'.':wasEditing?'Mood updated.':'Mood saved to My Moods. No generation charged.');
      }catch(error){flash(error.message,true);}
      finally{saving=false;save.disabled=false;remove.disabled=false;}
    })();
  });
  remove.addEventListener('click',()=>{
    if(!editing||saving||!confirm('Delete this Mood? Your original images and History will remain.'))return;
    void (async()=>{
      saving=true;remove.disabled=true;
      try{
        await api('/api/moodboards/'+encodeURIComponent(editing.id),{method:'DELETE'});
        dialog.close();await refresh();notify('Mood deleted. Your images remain in History.');
      }catch(error){flash(error.message,true);}
      finally{saving=false;remove.disabled=false;}
    })();
  });
  return {refresh,reset,all,find,openCreate,openEdit};
}
