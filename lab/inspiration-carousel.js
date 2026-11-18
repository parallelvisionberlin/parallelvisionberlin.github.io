import './inspiration-catalog.js?v=20261118-no-native-titles1';
// Visual browsing only. No automatic Mood changes, uploads, credits or API calls.
for(const shell of document.querySelectorAll('.inspiration-carousel-shell')){
  const track=shell.querySelector('.pv-guest-cards,.lab-welcome-presets');
  const prev=shell.querySelector('[data-inspiration-nav="prev"]');
  const next=shell.querySelector('[data-inspiration-nav="next"]');
  if(!track||!prev||!next)continue;
  let frame=0;
  const update=()=>{
    frame=0;
    const limit=Math.max(0,track.scrollWidth-track.clientWidth);
    prev.hidden=limit<3;
    next.hidden=limit<3;
    prev.disabled=limit<3||track.scrollLeft<3;
    next.disabled=limit<3||track.scrollLeft>=limit-3;
  };
  const queue=()=>{if(!frame)frame=requestAnimationFrame(update)};
  const move=direction=>{
    stopWheel();
    const first=track.querySelector(':scope > button');
    if(!first)return;
    const gap=parseFloat(getComputedStyle(track).columnGap)||0;
    const amount=first.getBoundingClientRect().width+gap;
    track.scrollBy({left:direction*amount,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    queue();
  };
  prev.addEventListener('click',()=>move(-1));
  next.addEventListener('click',()=>move(1));
  document.addEventListener('keydown',event=>{
    if(event.defaultPrevented||!['ArrowLeft','ArrowRight'].includes(event.key))return;
    if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
    if(!shell.getClientRects().length||shell.closest('[hidden]')||document.querySelector('dialog[open]'))return;
    const target=event.target;
    if(target instanceof Element&&
      (target.isContentEditable||target.closest('input,textarea,select,[role="textbox"],[role="combobox"],[contenteditable]:not([contenteditable="false"])')))return;
    if(track.scrollWidth-track.clientWidth<3)return;
    event.preventDefault();
    move(event.key==='ArrowRight'?1:-1);
  });
  // Translate vertical wheel input into continuous horizontal motion on hover.
  // Accumulate deltas into one easing destination instead of snapping per notch.
  // Native horizontal trackpad scrolling and touch swipes remain untouched.
  let wheelFrame=0;
  let wheelTarget=0;
  let lastFrameTime=0;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=(value,limit)=>Math.max(0,Math.min(limit,value));
  const stopWheel=()=>{
    if(wheelFrame)cancelAnimationFrame(wheelFrame);
    wheelFrame=0;
    lastFrameTime=0;
    track.style.removeProperty('scroll-behavior');
  };
  const wheelTick=now=>{
    const elapsed=Math.min(48,Math.max(8,now-(lastFrameTime||now-16.7)));
    lastFrameTime=now;
    const limit=Math.max(0,track.scrollWidth-track.clientWidth);
    wheelTarget=clamp(wheelTarget,limit);
    const remaining=wheelTarget-track.scrollLeft;
    if(Math.abs(remaining)<0.6){
      track.scrollLeft=wheelTarget;
      stopWheel();
      queue();
      return;
    }
    // Frame-rate-independent ease-out, with a short glide after the last input.
    const easing=1-Math.pow(0.79,elapsed/16.7);
    track.scrollLeft=clamp(track.scrollLeft+remaining*easing,limit);
    wheelFrame=requestAnimationFrame(wheelTick);
  };
  track.addEventListener('wheel',event=>{
    if(event.defaultPrevented||event.ctrlKey||event.metaKey)return;
    if(Math.abs(event.deltaY)<=Math.abs(event.deltaX)) {
      // A horizontal trackpad gesture should not fight a running wheel glide.
      if(event.deltaX)stopWheel();
      return;
    }
    const limit=Math.max(0,track.scrollWidth-track.clientWidth);
    if(limit<3||!event.deltaY)return;
    const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?track.clientWidth:1);
    const direction=Math.sign(delta);
    const base=wheelFrame?wheelTarget:track.scrollLeft;
    // Hand control back to the page when the rail has reached either end.
    if((direction<0&&track.scrollLeft<=2&&base<=2)||
       (direction>0&&track.scrollLeft>=limit-2&&base>=limit-2))return;
    event.preventDefault();
    if(reducedMotion.matches){
      stopWheel();
      track.scrollLeft=clamp(track.scrollLeft+delta,limit);
      return;
    }
    wheelTarget=clamp(base+delta*1.18,limit);
    if(!wheelFrame){
      // Inline auto avoids the existing CSS smooth-scroll fighting our frames.
      track.style.scrollBehavior='auto';
      wheelFrame=requestAnimationFrame(wheelTick);
    }
  },{passive:false});
  track.addEventListener('pointerdown',stopWheel,{passive:true});
  track.addEventListener('scroll',queue,{passive:true});
  if('ResizeObserver' in window)new ResizeObserver(queue).observe(track);
  else window.addEventListener('resize',queue,{passive:true});
  queue();
}
