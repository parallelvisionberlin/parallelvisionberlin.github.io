export function createOwnerPhotoFinish({dialog,getBase,getOwner,getSession}){
  if(!dialog)return {open(){},close(){}};
  const image=dialog.querySelector('#owner-photo-finish-image');
  const apply=dialog.querySelector('#owner-photo-finish-apply');
  const compare=dialog.querySelector('#owner-photo-finish-compare');
  const download=dialog.querySelector('#owner-photo-finish-download');
  const status=dialog.querySelector('#owner-photo-finish-status');

  let base=null,baseUrl='',finishUrl='',revision=0;
  function show(url,alt){
    image.hidden=!url;
    if(url)image.src=url;else image.removeAttribute('src');
    image.alt=alt;
  }
  function reset(){
    revision++;
    for(const url of [baseUrl,finishUrl])if(url)URL.revokeObjectURL(url);
    base=null;baseUrl='';finishUrl='';
    compare.hidden=true;download.hidden=true;download.removeAttribute('href');
    show('','Original Base photo');
  }
  dialog.addEventListener('close',()=>{if(!dialog.open)reset();});
  compare.onclick=()=>{
    const original=image.src===finishUrl;
    show(original?baseUrl:finishUrl,original?'Original Base photo':'Night Flash finish');
    compare.textContent=original?'View finish':'View original';
  };
  apply.onclick=async()=>{
    if(apply.disabled||!base||!getOwner())return;
    const current=revision,session=getSession(),photo=base;
    const active=()=>dialog.open&&current===revision&&getOwner()&&session===getSession();
    apply.disabled=true;status.textContent='Applying Night Flash…';
    try{
      const {applyNightFlash}=await import('./night-flash-photo-renderer.js?v=20261107v1');
      if(!active())return;
      const result=await applyNightFlash(photo);
      if(!active())return;
      finishUrl=URL.createObjectURL(new Blob([result],{type:'image/png'}));
      show(finishUrl,'Night Flash finish');
      compare.hidden=false;compare.textContent='View original';
      download.href=finishUrl;download.download='night-flash.png';download.hidden=false;
      status.textContent='Compare with your Base photo or download the finish.';
    }catch(error){
      if(active()){status.textContent=error.message||'Could not apply Night Flash.';apply.disabled=false;}
    }
  };
  return {
    open(){
      if(!getOwner()||dialog.open)return;
      reset();base=getBase()?.file||null;
      baseUrl=base?URL.createObjectURL(base):'';
      apply.disabled=!base;
      show(baseUrl,'Original Base photo');
      status.textContent=base?'Applies to your Base photo. No generation credits.':'Add a Base photo in Image Studio to apply Night Flash.';
      dialog.showModal();
    },
    close(){if(dialog.open)dialog.close();reset();}
  };
}
