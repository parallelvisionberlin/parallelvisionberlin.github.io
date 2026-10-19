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
  let wasFirstImage=false;
  function update(){
    frame=0;
    const guest=!gate.hidden&&gate.classList.contains('pv-guest-image');
    const firstImage=!app.hidden&&app.classList.contains('image-studio-active')&&
      !welcome.hidden&&!empty.hidden;
    const scrolled=(window.scrollY||document.documentElement.scrollTop)>110;
    const active=mobile.matches&&window.__PV_LAB_NATIVE__!==1;
    // Signed-in welcome must never change header height at a scroll threshold.
    // This avoids the iPhone scroll/resize feedback loop reported by the owner.
    header.classList.toggle('pv-mobile-entry-condensed',active&&(firstImage||(guest&&scrolled)));
    if(active&&firstImage&&!wasFirstImage&&window.scrollY>0)window.scrollTo(0,0);
    wasFirstImage=active&&firstImage;
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
