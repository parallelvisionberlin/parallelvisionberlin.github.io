(()=>{
  'use strict';
  const series=window.PHOTO_WORK_SERIES;
  const tabs=[...document.querySelectorAll('[data-series]')];
  const image=document.querySelector('#active-photo');
  const counter=document.querySelector('#photo-counter');
  const markers=document.querySelector('#film-marks');
  const title=document.querySelector('#series-title');
  const overline=document.querySelector('#series-overline');
  const description=document.querySelector('#series-description');
  const narrative=document.querySelector('#image-description');
  const previous=document.querySelector('#previous');
  const next=document.querySelector('#next');
  const touch=document.querySelector('#photo-touch-area');
  if(!series || !image || !counter || !markers || !title || !previous || !next || !touch) return;
  let active='after-hours';
  let index=0;
  let request=0;
  const cache=new Map();
  const pad=n=>String(n).padStart(2,'0');
  const preload=src=>{
    if(cache.has(src))return;
    const img=new Image();img.src=src;cache.set(src,img);
  };
  const safeKey=()=>{
    const key=decodeURIComponent(location.hash.replace(/^#/,''));
    return Object.prototype.hasOwnProperty.call(series,key)?key:'after-hours';
  };
  function showPhoto(){
    const photos=series[active].photographs;
    index=(index+photos.length)%photos.length;
    const photo=photos[index];
    touch.classList.toggle('is-landscape',photo.orientation==='landscape');
    const ticket=++request;
    image.classList.add('is-loading');
    image.onerror=()=>{if(ticket===request){image.classList.remove('is-loading');narrative.textContent='The photograph could not be loaded.';}};
    image.onload=()=>{if(ticket===request)image.classList.remove('is-loading');};
    image.src=photo.src;
    image.alt=photo.alt;
    counter.innerHTML=`${pad(index+1)} <span>/</span> ${pad(photos.length)}`;
    narrative.textContent=`Photograph ${index+1} of ${photos.length} in ${series[active].name}. ${photo.alt}.`;
    [...markers.children].forEach((mark,i)=>mark.setAttribute('aria-current',i===index?'true':'false'));
    previous.disabled=photos.length===1;
    next.disabled=photos.length===1;
    preload(photos[(index+1)%photos.length].src);
    if(photos.length>2)preload(photos[(index+photos.length-1)%photos.length].src);
  }
  function selectSeries(key,{keepHash=false}={}){
    if(!Object.prototype.hasOwnProperty.call(series,key))return;
    active=key;index=0;
    const group=series[key];
    tabs.forEach(tab=>{const selected=tab.dataset.series===key;tab.classList.toggle('is-active',selected);tab.setAttribute('aria-pressed',String(selected));});
    title.textContent=group.name;
    overline.textContent=group.overline;
    description.textContent=group.description;
    markers.replaceChildren();
    group.photographs.forEach((photo,i)=>{
      const button=document.createElement('button');
      button.type='button';
      button.setAttribute('aria-label',`View photograph ${i+1} of ${group.photographs.length}`);
      button.addEventListener('click',()=>{index=i;showPhoto();});
      markers.appendChild(button);
    });
    showPhoto();
    if(!keepHash && location.hash!==`#${key}`)history.replaceState(null,'',`#${key}`);
  }
  function move(delta){index+=delta;showPhoto();}
  tabs.forEach(tab=>tab.addEventListener('click',()=>selectSeries(tab.dataset.series)));
  previous.addEventListener('click',()=>move(-1));
  next.addEventListener('click',()=>move(1));
  document.addEventListener('keydown',e=>{
    if(e.altKey||e.ctrlKey||e.metaKey||e.target?.closest?.('input,textarea,select,[contenteditable]'))return;
    if(e.key==='ArrowRight'){e.preventDefault();move(1);}
    if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}
  });
  let startX=0,startY=0;
  touch.addEventListener('touchstart',e=>{if(e.touches.length===1){startX=e.touches[0].clientX;startY=e.touches[0].clientY;}},{passive:true});
  touch.addEventListener('touchend',e=>{
    if(e.changedTouches.length!==1)return;
    const dx=e.changedTouches[0].clientX-startX;
    const dy=e.changedTouches[0].clientY-startY;
    if(Math.abs(dx)>48 && Math.abs(dx)>Math.abs(dy)*1.3)move(dx<0?1:-1);
  },{passive:true});
  window.addEventListener('hashchange',()=>selectSeries(safeKey(),{keepHash:true}));
  selectSeries(safeKey(),{keepHash:true});
})();
