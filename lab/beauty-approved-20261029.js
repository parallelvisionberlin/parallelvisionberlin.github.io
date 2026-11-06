/* Beauty Studio visual controls and actual source/result comparison.
   Native select and textarea values remain the only generation settings. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const photo=$('beauty-photo-drop'), result=$('beauty-result'), source=$('beauty-photo-preview'), resultImage=$('beauty-result-image');
 if(!photo||!result||!source||!resultImage)return;
 const buttonRows=Array.from(document.querySelectorAll('[data-beauty-choice]'));
 const groups=['beauty-makeup','beauty-hair','beauty-skin','beauty-light','beauty-color'];
 const syncChoices=()=>{
  for(const btn of buttonRows){
   const select=$(btn.dataset.beautyChoice);
   btn.setAttribute('aria-pressed',String(select?.value===btn.dataset.value));
   btn.disabled=!!select?.disabled;
  }
 };
 for(const btn of buttonRows){
  btn.addEventListener('click',()=>{
   const select=$(btn.dataset.beautyChoice);
   if(!select||select.disabled)return;
   select.value=btn.dataset.value;
   select.dispatchEvent(new Event('change',{bubbles:true}));
   syncChoices();
  });
 }
 for(const id of groups){
  const select=$(id);
  select?.addEventListener('change',syncChoices);
  if(select)new MutationObserver(syncChoices).observe(select,{attributes:true,attributeFilter:['disabled']});
 }
 const direction=$('beauty-direction'), strength=$('beauty-strength');
 const updateDirection=(value)=>{
  if(direction.disabled)return;
  direction.value=value;
  direction.dispatchEvent(new Event('input',{bubbles:true}));
 };
 const choose=(id,value)=>{
  const select=$(id);
  if(!select||select.disabled)return;
  select.value=value;
  select.dispatchEvent(new Event('change',{bubbles:true}));
 };
 const presets={
  editorial:{makeup:'editorial',text:'Refined editorial portrait lighting, realistic skin detail and controlled contrast. Preserve identity and natural anatomy.'},
  natural:{makeup:'natural',text:'Gentle natural light, subtle refinement, authentic skin texture. Keep the original person and background.'},
  night:{makeup:'keep',text:'Atmospheric low-key evening portrait, controlled highlights and natural skin tones. Keep original identity.'},
  avant:{makeup:'editorial',text:'Experimental sculptural fashion portrait styling with realistic materials. Preserve the person and their identity.'},
  fashion:{makeup:'editorial',text:'High-fashion editorial portrait, refined composition and believable photographic texture. Preserve identity.'},
  film:{makeup:'keep',text:'Subtle analog grain, realistic film tonality and natural texture, understated contrast.'}
 };
 const cards=Array.from(document.querySelectorAll('[data-look]'));
 for(const card of cards){
  card.addEventListener('click',()=>{
   const preset=presets[card.dataset.look];
   if(!preset||direction.disabled)return;
   choose('beauty-makeup',preset.makeup);
   choose('beauty-hair','keep');
   choose('beauty-skin','natural');
   choose('beauty-light','keep');
   choose('beauty-color','keep');
   updateDirection(preset.text);
   syncChoices();
   for(const c of cards)c.setAttribute('aria-pressed',String(c===card));
  });
 }
 $('beauty-reset-look')?.addEventListener('click',()=>{
  if(strength.disabled)return;
  choose('beauty-makeup','keep');
  choose('beauty-hair','keep');
  choose('beauty-skin','natural');
  choose('beauty-light','keep');
  choose('beauty-color','keep');
  strength.value='50';
  strength.dispatchEvent(new Event('input',{bubbles:true}));
  updateDirection('');
  for(const c of cards)c.setAttribute('aria-pressed','false');
  syncChoices();
 });
 // Accessible independent tabs. Browsing categories never changes a setting or quotes.
 const tabs=[...document.querySelectorAll('[data-beauty-tab]')];
 const activateTab=(tab,focus=false)=>{
  for(const item of tabs){
   const selected=item===tab;
   item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;
   $(item.getAttribute('aria-controls')).hidden=!selected;
  }
  if(focus)tab.focus({preventScroll:true});
 };
 tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>activateTab(tab));
  tab.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();
   const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
   activateTab(tabs[next],true);
  });
 });
 $('beauty-form').addEventListener('reset',()=>queueMicrotask(()=>{
  syncChoices();if(tabs[0])activateTab(tabs[0]);
  for(const card of cards)card.setAttribute('aria-pressed','false');
 }));
 const before=document.createElement('img');
 before.className='beauty-before-image';
 before.alt='Original photograph';
 const slider=document.createElement('div');
 slider.className='beauty-compare-handle';
 slider.setAttribute('role','slider');
 slider.setAttribute('tabindex','0');
 slider.setAttribute('aria-label','Before and after image comparison');
 slider.setAttribute('aria-valuemin','0');
 slider.setAttribute('aria-valuemax','100');
 slider.setAttribute('aria-valuenow','50');
 const l1=document.createElement('span');l1.className='beauty-compare-label beauty-compare-before';l1.textContent='BEFORE';
 const l2=document.createElement('span');l2.className='beauty-compare-label beauty-compare-after';l2.textContent='AFTER';
 result.prepend(before);
 result.append(slider,l1,l2);
 const setSplit=value=>{
  const n=Math.min(100,Math.max(0,value));
  result.style.setProperty('--beauty-split',n+'%');
  slider.setAttribute('aria-valuenow',String(Math.round(n)));
 };
 const showComparison=()=>{
  const valid=!result.hidden&&!!result.dataset.beforeUrl&&resultImage.hasAttribute('src');
  before.hidden=!valid;
  slider.hidden=l1.hidden=l2.hidden=!valid;
  if(valid){before.src=result.dataset.beforeUrl;setSplit(50);}
  else{before.removeAttribute('src');setSplit(0);}
 };
 const resize=e=>{
  const box=result.getBoundingClientRect();
  if(box.width)setSplit((e.clientX-box.left)/box.width*100);
 };
 slider.addEventListener('pointerdown',event=>{slider.setPointerCapture(event.pointerId);resize(event);});
 slider.addEventListener('pointermove',event=>{if(slider.hasPointerCapture(event.pointerId))resize(event);});
 slider.addEventListener('keydown',event=>{
  if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
  event.preventDefault();
  const v=Number(slider.getAttribute('aria-valuenow'))||0;
  setSplit(event.key==='Home'?0:event.key==='End'?100:v+(event.key==='ArrowRight'?5:-5));
 });
 const observed={attributes:true,attributeFilter:['hidden','src','data-before-url']};
 new MutationObserver(showComparison).observe(result,observed);
 new MutationObserver(showComparison).observe(source,observed);
 new MutationObserver(showComparison).observe(resultImage,observed);

 // Native touch/trackpad scrolling; arrows page the archive and keys browse focus.
 // No browse interaction applies presets, changes a quote, or triggers generation.
 const track=$('beauty-looks-list'),section=document.querySelector('.beauty-looks');
 const prev=document.querySelector('.beauty-looks-prev'),next=document.querySelector('.beauty-looks-next');
 if(track&&section&&prev&&next&&cards.length){
  let index=0,drag=null,blockClick=false,momentum=0;
  const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const syncArrows=()=>{prev.disabled=track.scrollLeft<=2;next.disabled=track.scrollLeft>=track.scrollWidth-track.clientWidth-2;};
  const stopMomentum=()=>{cancelAnimationFrame(momentum);momentum=0;};
  const pageArchive=sign=>{stopMomentum();track.scrollBy({left:sign*track.clientWidth*.72,behavior:reduced()?'auto':'smooth'});};
  prev.addEventListener('click',()=>pageArchive(-1));next.addEventListener('click',()=>pageArchive(1));
  track.addEventListener('scroll',syncArrows,{passive:true});
  if(window.ResizeObserver)new ResizeObserver(syncArrows).observe(track);
  const browse=nextIndex=>{
   stopMomentum();index=Math.max(0,Math.min(cards.length-1,nextIndex));
   cards[index].focus({preventScroll:true});
   const card=cards[index],left=card.offsetLeft-track.offsetLeft;
   if(left<track.scrollLeft)track.scrollTo({left,behavior:reduced()?'auto':'smooth'});
   else if(left+card.offsetWidth>track.scrollLeft+track.clientWidth)track.scrollTo({left:left+card.offsetWidth-track.clientWidth,behavior:reduced()?'auto':'smooth'});
  };
  cards.forEach((card,i)=>card.addEventListener('focus',()=>{index=i;}));
  section.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||event.altKey||event.ctrlKey||event.metaKey)return;
   if(event.target.closest('input,textarea,select,[role="slider"],[contenteditable="true"]'))return;
   event.preventDefault();browse(event.key==='Home'?0:event.key==='End'?cards.length-1:index+(event.key==='ArrowRight'?1:-1));
  });
  track.addEventListener('wheel',event=>{
   if(event.ctrlKey||event.metaKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||track.scrollWidth<=track.clientWidth+2)return;
   const delta=event.deltaY*(event.deltaMode===1?20:event.deltaMode===2?track.clientWidth:1);
   if((delta>0&&track.scrollLeft<track.scrollWidth-track.clientWidth-2)||(delta<0&&track.scrollLeft>2)){
    event.preventDefault();stopMomentum();track.scrollLeft+=delta;
   }
  },{passive:false});
  track.addEventListener('pointerdown',event=>{
   if(event.pointerType!=='mouse'||event.button!==0||track.scrollWidth<=track.clientWidth+2)return;
   stopMomentum();blockClick=false;drag={id:event.pointerId,x:event.clientX,left:track.scrollLeft,lastX:event.clientX,lastTime:performance.now(),velocity:0,moved:false};
  });
  track.addEventListener('pointermove',event=>{
   if(!drag||drag.id!==event.pointerId)return;
   const distance=event.clientX-drag.x;
   if(!drag.moved&&Math.abs(distance)<6)return;
   if(!drag.moved){drag.moved=true;track.setPointerCapture(event.pointerId);track.classList.add('is-dragging');}
   const now=performance.now(),dt=Math.max(8,now-drag.lastTime);
   drag.velocity=(drag.lastX-event.clientX)/dt;drag.lastX=event.clientX;drag.lastTime=now;
   track.scrollLeft=drag.left-distance;event.preventDefault();
  });
  const endDrag=event=>{
   if(!drag||drag.id!==event.pointerId)return;
   const d=drag;drag=null;track.classList.remove('is-dragging');
   if(track.hasPointerCapture(event.pointerId))track.releasePointerCapture(event.pointerId);
   if(!d.moved)return;
   blockClick=true;setTimeout(()=>{blockClick=false},0);
   if(reduced()||event.type==='pointercancel'||performance.now()-d.lastTime>100)return;
   let velocity=Math.max(-2.5,Math.min(2.5,d.velocity))*16;
   const tick=()=>{if(Math.abs(velocity)<.4){momentum=0;return;}const before=track.scrollLeft;track.scrollLeft+=velocity;velocity*=.9;if(track.scrollLeft===before){momentum=0;return;}momentum=requestAnimationFrame(tick);};
   momentum=requestAnimationFrame(tick);
  };
  track.addEventListener('pointerup',endDrag);track.addEventListener('pointercancel',endDrag);
  track.addEventListener('pointerleave',event=>{if(drag&&!drag.moved)drag=null;});
  track.addEventListener('click',event=>{if(blockClick){event.preventDefault();event.stopImmediatePropagation();}},{capture:true});
  track.addEventListener('dragstart',event=>event.preventDefault());
  window.addEventListener('pagehide',stopMomentum);syncArrows();
 }

 syncChoices();
 showComparison();
})();