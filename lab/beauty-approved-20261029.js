/* Beauty Studio visual controls and actual source/result comparison.
   Native select and textarea values remain the only generation settings. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const photo=$('beauty-photo-drop'), result=$('beauty-result'), source=$('beauty-photo-preview'), resultImage=$('beauty-result-image');
 if(!photo||!result||!source||!resultImage)return;
 const buttonRows=Array.from(document.querySelectorAll('[data-beauty-choice]'));
 const groups=['beauty-makeup','beauty-hair','beauty-skin'];
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
  strength.value='50';
  strength.dispatchEvent(new Event('input',{bubbles:true}));
  updateDirection('');
  for(const c of cards)c.setAttribute('aria-pressed','false');
  syncChoices();
 });
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
  const valid=!result.hidden&&!source.hidden&&source.hasAttribute('src')&&resultImage.hasAttribute('src');
  before.hidden=!valid;
  slider.hidden=l1.hidden=l2.hidden=!valid;
  if(valid){before.src=source.src;setSplit(50);}
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
 const observed={attributes:true,attributeFilter:['hidden','src']};
 new MutationObserver(showComparison).observe(result,observed);
 new MutationObserver(showComparison).observe(source,observed);
 new MutationObserver(showComparison).observe(resultImage,observed);
 syncChoices();
 showComparison();
})();