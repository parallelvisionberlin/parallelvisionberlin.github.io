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
  track.addEventListener('scroll',queue,{passive:true});
  if('ResizeObserver' in window)new ResizeObserver(queue).observe(track);
  else window.addEventListener('resize',queue,{passive:true});
  queue();
}
