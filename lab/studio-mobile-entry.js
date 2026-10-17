/* Collapse only PV LAB's mobile Image entrance masthead while scrolling.
   No changes to browser chrome, desktop navigation, other tools or wallet state. */
(()=>{
  const header=document.getElementById('studio-header');
  const gate=document.getElementById('gate');
  const app=document.getElementById('app');
  const welcome=document.getElementById('lab-welcome-start');
  const empty=document.getElementById('image-gallery-empty');
  if(!header||!gate||!app||!welcome||!empty)return;
  const mobile=window.matchMedia('(max-width:680px)');
  let frame=0;
  function update(){
    frame=0;
    const guest=!gate.hidden&&gate.classList.contains('pv-guest-image');
    const firstImage=!app.hidden&&app.classList.contains('image-studio-active')&&
      !welcome.hidden&&!empty.hidden;
    const scrolled=(window.scrollY||document.documentElement.scrollTop)>110;
    header.classList.toggle('pv-mobile-entry-condensed',
      mobile.matches&&window.__PV_LAB_NATIVE__!==1&&(guest||firstImage)&&scrolled);
  }
  function schedule(){
    if(frame)return;
    frame=window.requestAnimationFrame(update);
  }
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('pageshow',schedule);
  const observer=new MutationObserver(schedule);
  for(const node of [gate,app,welcome,empty]){
    observer.observe(node,{attributes:true,attributeFilter:['hidden','class']});
  }
  schedule();
})();
