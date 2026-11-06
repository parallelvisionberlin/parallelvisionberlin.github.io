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

 // Continuous archive: wheel over the heading OR cards, trackpad, mouse drag,
 // native touch momentum and keyboard. Browsing never selects or generates.
 const track=$('beauty-looks-list'),section=document.querySelector('.beauty-looks');
 if(track&&section&&cards.length){
  let index=0,drag=null,wheelFrame=0,inertiaFrame=0,target=track.scrollLeft,lastDirection=0,suppressClickUntil=0;
  const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const limit=()=>Math.max(0,track.scrollWidth-track.clientWidth);
  const clamp=value=>Math.max(0,Math.min(limit(),value));
  const stop=()=>{cancelAnimationFrame(wheelFrame);cancelAnimationFrame(inertiaFrame);wheelFrame=inertiaFrame=0;target=track.scrollLeft;};
  const animateWheel=()=>{
   const distance=target-track.scrollLeft;
   if(Math.abs(distance)<.8){track.scrollLeft=target;wheelFrame=0;return;}
   track.scrollLeft=clamp(track.scrollLeft+distance*.34);
   wheelFrame=requestAnimationFrame(animateWheel);
  };
  section.addEventListener('wheel',event=>{
   if(event.ctrlKey||event.metaKey||limit()<2)return;
   const primary=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
   const delta=primary*(event.deltaMode===1?20:event.deltaMode===2?track.clientWidth:1);
   if(!delta)return;
   const direction=Math.sign(delta);
   if(!wheelFrame||direction!==lastDirection)target=track.scrollLeft;
   const next=clamp(target+delta);
   // At a boundary the normal page scroll remains available.
   if(Math.abs(next-target)<.5)return;
   event.preventDefault();cancelAnimationFrame(inertiaFrame);inertiaFrame=0;
   target=next;lastDirection=direction;
   if(reduced()){cancelAnimationFrame(wheelFrame);wheelFrame=0;track.scrollLeft=target;}
   else if(!wheelFrame)wheelFrame=requestAnimationFrame(animateWheel);
  },{passive:false});
  const browse=nextIndex=>{
   stop();index=Math.max(0,Math.min(cards.length-1,nextIndex));
   const card=cards[index];card.focus({preventScroll:true});
   const a=card.getBoundingClientRect(),b=track.getBoundingClientRect();
   const left=a.left<b.left?track.scrollLeft+a.left-b.left:a.right>b.right?track.scrollLeft+a.right-b.right:track.scrollLeft;
   track.scrollTo({left:clamp(left),behavior:reduced()?'auto':'smooth'});
  };
  cards.forEach((card,i)=>card.addEventListener('focus',()=>{index=i;}));
  section.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||event.altKey||event.ctrlKey||event.metaKey)return;
   if(event.target.closest('input,textarea,select,[role="slider"],[contenteditable="true"]'))return;
   event.preventDefault();browse(event.key==='Home'?0:event.key==='End'?cards.length-1:index+(event.key==='ArrowRight'?1:-1));
  });
  track.addEventListener('pointerdown',event=>{
   stop();
   if(event.pointerType!=='mouse'||event.button!==0||limit()<2)return;
   suppressClickUntil=0;drag={id:event.pointerId,x:event.clientX,left:track.scrollLeft,lastX:event.clientX,lastTime:performance.now(),velocity:0,moved:false};
  });
  track.addEventListener('pointermove',event=>{
   if(!drag||drag.id!==event.pointerId)return;
   const distance=event.clientX-drag.x;
   if(!drag.moved&&Math.abs(distance)<6)return;
   if(!drag.moved){drag.moved=true;track.setPointerCapture(event.pointerId);track.classList.add('is-dragging');}
   const now=performance.now(),dt=Math.max(8,now-drag.lastTime);
   drag.velocity=(drag.lastX-event.clientX)/dt;drag.lastX=event.clientX;drag.lastTime=now;
   track.scrollLeft=clamp(drag.left-distance);event.preventDefault();
  });
  const endDrag=event=>{
   if(!drag||drag.id!==event.pointerId)return;
   const d=drag;drag=null;track.classList.remove('is-dragging');
   if(track.hasPointerCapture(event.pointerId))track.releasePointerCapture(event.pointerId);
   if(!d.moved)return;
   suppressClickUntil=performance.now()+250;
   if(reduced()||event.type==='pointercancel'||performance.now()-d.lastTime>100)return;
   let velocity=Math.max(-2.5,Math.min(2.5,d.velocity)),last=performance.now();
   const tick=now=>{
    const dt=Math.min(32,Math.max(1,now-last));last=now;
    if(Math.abs(velocity)<.025){inertiaFrame=0;return;}
    const before=track.scrollLeft;track.scrollLeft=clamp(before+velocity*dt);velocity*=Math.pow(.9,dt/16);
    if(Math.abs(track.scrollLeft-before)<.1){inertiaFrame=0;return;}
    inertiaFrame=requestAnimationFrame(tick);
   };
   inertiaFrame=requestAnimationFrame(tick);
  };
  track.addEventListener('pointerup',endDrag);track.addEventListener('pointercancel',endDrag);
  track.addEventListener('lostpointercapture',event=>{if(drag?.id===event.pointerId){drag=null;track.classList.remove('is-dragging');}});
  track.addEventListener('pointerleave',()=>{if(drag&&!drag.moved)drag=null;});
  track.addEventListener('click',event=>{if(event.detail!==0&&performance.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();}},{capture:true});
  track.addEventListener('dragstart',event=>event.preventDefault());
  window.addEventListener('pagehide',stop);
 }

 syncChoices();
 showComparison();
})();