import {OWNER_PHOTO_FINISHES} from './film-finish.js?ownerPhotoFinish=20261107v1';

export function createOwnerPhotoFinish({dialog,api,uploadAsset,assetBlob,getBase,getOwner,getSession}){
  const select=dialog.querySelector('#owner-photo-finish-look');
  const image=dialog.querySelector('#owner-photo-finish-image');
  const apply=dialog.querySelector('#owner-photo-finish-apply');
  const compare=dialog.querySelector('#owner-photo-finish-compare');
  const download=dialog.querySelector('#owner-photo-finish-download');
  const status=dialog.querySelector('#owner-photo-finish-status');
  for(const [id,look] of Object.entries(OWNER_PHOTO_FINISHES))select.add(new Option(look.name,id));

  let base=null,baseUrl='',finishUrl='',revision=0,session=null;
  function show(url,alt){
    image.hidden=!url;
    if(url)image.src=url;else image.removeAttribute('src');
    image.alt=alt;
  }
  function clearFinish(){
    if(finishUrl)URL.revokeObjectURL(finishUrl);
    finishUrl='';compare.hidden=true;download.hidden=true;download.removeAttribute('href');
    show(baseUrl,'Original Base photo');
  }
  function reset(){
    revision++;
    if(baseUrl)URL.revokeObjectURL(baseUrl);
    base=null;baseUrl='';session=null;
    clearFinish();
  }
  dialog.addEventListener('close',()=>{if(!dialog.open)reset();});
  select.onchange=()=>{clearFinish();status.textContent='';};
  compare.onclick=()=>{
    const original=image.src===finishUrl;
    show(original?baseUrl:finishUrl,original?'Original Base photo':OWNER_PHOTO_FINISHES[select.value].name+' finish');
    compare.textContent=original?'View finish':'View original';
  };
  apply.onclick=async()=>{
    if(apply.disabled||!base||!getOwner()||session!==getSession())return;
    const current=revision,look=select.value;
    const active=()=>dialog.open&&current===revision&&getOwner()&&session===getSession();
    clearFinish();apply.disabled=true;select.disabled=true;status.textContent='Applying finish…';
    try{
      const id=base.id||await uploadAsset(base.file);
      if(!active())return;
      base.id=id;
      const result=await api('/api/owner/photo-finish',{method:'POST',body:{sourceId:id,look}});
      if(!active())return;
      const blob=await assetBlob(result.assetId);
      if(!active())return;
      finishUrl=URL.createObjectURL(blob);
      show(finishUrl,OWNER_PHOTO_FINISHES[look].name+' finish');
      compare.hidden=false;compare.textContent='View original';
      download.href=finishUrl;download.download=result.filename;download.hidden=false;
      status.textContent='Finished copy saved to Assets.';
    }catch(error){if(active())status.textContent=error.message||'Could not apply this finish.';}
    finally{if(active()){apply.disabled=false;select.disabled=false;}}
  };
  return {
    open(look){
      if(!getOwner()||dialog.open)return;
      reset();session=getSession();base=getBase();
      baseUrl=base?.file?URL.createObjectURL(base.file):'';
      select.value=Object.hasOwn(OWNER_PHOTO_FINISHES,look)?look:'night-flash';
      select.disabled=false;apply.disabled=!baseUrl;
      show(baseUrl,'Original Base photo');
      status.textContent=baseUrl?'':'Add a Base photo in Image Studio to apply a finish.';
      dialog.showModal();
    },
    close(){if(dialog.open)dialog.close();reset();}
  };
}
