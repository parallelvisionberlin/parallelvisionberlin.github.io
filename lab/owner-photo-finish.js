const DEFAULT_POINT=Object.freeze({x:.5,y:.36});
const clamp=value=>Math.max(0,Math.min(1,value));

export function createOwnerPhotoFinish({dialog,getBase,getOwner,getSession}){
  if(!dialog)return {open(){},close(){}};
  const aim=dialog.querySelector('#owner-photo-finish-aim');
  const marker=dialog.querySelector('#owner-photo-finish-point');
  const image=dialog.querySelector('#owner-photo-finish-image');
  const apply=dialog.querySelector('#owner-photo-finish-apply');
  const compare=dialog.querySelector('#owner-photo-finish-compare');
  const download=dialog.querySelector('#owner-photo-finish-download');
  const status=dialog.querySelector('#owner-photo-finish-status');

  let base=null,baseUrl='',finishUrl='',revision=0,point=null;
  function show(url,alt){
    aim.hidden=!url;
    if(url)image.src=url;else image.removeAttribute('src');
    image.alt=alt;
    marker.hidden=!point||!url||url!==baseUrl;
    if(!marker.hidden){marker.style.left=point.x*100+'%';marker.style.top=point.y*100+'%';}
  }
  function clearFinish(){
    if(finishUrl)URL.revokeObjectURL(finishUrl);
    finishUrl='';
    compare.hidden=true;download.hidden=true;download.removeAttribute('href');
  }
  function reset(){
    revision++;
    clearFinish();
    if(baseUrl)URL.revokeObjectURL(baseUrl);
    base=null;baseUrl='';point=null;
    show('','Original Base photo');
  }
  function aimAt(x,y){
    if(!base||aim.disabled||!getOwner())return;
    point={x:clamp(x),y:clamp(y)};
    clearFinish();
    show(baseUrl,'Original Base photo');
    apply.disabled=false;
    status.textContent='Flash aimed. Select Apply finish.';
  }
  aim.onclick=event=>{
    if(!image.naturalWidth)return;
    if(!event.detail){aimAt(point?.x??DEFAULT_POINT.x,point?.y??DEFAULT_POINT.y);return;}
    const rect=image.getBoundingClientRect();
    aimAt((event.clientX-rect.left)/rect.width,(event.clientY-rect.top)/rect.height);
  };
  aim.onkeydown=event=>{
    const movement={ArrowLeft:[-.025,0],ArrowRight:[.025,0],ArrowUp:[0,-.025],ArrowDown:[0,.025]}[event.key];
    if(!movement)return;
    event.preventDefault();
    const current=point??DEFAULT_POINT;
    aimAt(current.x+movement[0],current.y+movement[1]);
  };
  dialog.addEventListener('close',()=>{if(!dialog.open)reset();});
  compare.onclick=()=>{
    const original=image.src===finishUrl;
    show(original?baseUrl:finishUrl,original?'Original Base photo':'Night Flash finish');
    compare.textContent=original?'View finish':'View original';
  };
  apply.onclick=async()=>{
    if(apply.disabled||!base||!getOwner())return;
    const current=revision,session=getSession(),photo=base,target=point??DEFAULT_POINT;
    const active=()=>dialog.open&&current===revision&&getOwner()&&session===getSession();
    apply.disabled=true;aim.disabled=true;status.textContent='Applying Night Flash…';
    try{
      const {applyNightFlash}=await import('./night-flash-photo-renderer.js?v=20261107-focused-flash1');
      if(!active())return;
      const result=await applyNightFlash(photo,target);
      if(!active())return;
      finishUrl=URL.createObjectURL(result);
      show(finishUrl,'Night Flash finish');
      compare.hidden=false;compare.textContent='View original';
      download.href=finishUrl;download.download='night-flash.png';download.hidden=false;
      status.textContent='Compare with your Base or click the photo to re-aim the flash.';
    }catch(error){
      if(active()){status.textContent=error.message||'Could not apply Night Flash.';apply.disabled=false;}
    }finally{if(active())aim.disabled=false;}
  };
  return {
    open(){
      if(!getOwner()||dialog.open)return;
      reset();base=getBase()?.file||null;
      baseUrl=base?URL.createObjectURL(base):'';
      apply.disabled=!base;aim.disabled=!base;
      show(baseUrl,'Original Base photo');
      status.textContent=base?'Click the face to aim the flash, then select Apply finish.':'Add a Base photo in Image Studio to apply Night Flash.';
      dialog.showModal();
    },
    close(){if(dialog.open)dialog.close();reset();}
  };
}
