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
  let wasImageEntry=false;
  function update(){
    frame=0;
    const guestImage=!gate.hidden&&gate.classList.contains('pv-guest-image')&&
      gate.dataset.guestTool==='image';
    const firstImage=!app.hidden&&app.classList.contains('image-studio-active')&&
      !welcome.hidden&&!empty.hidden;
    const active=mobile.matches&&window.__PV_LAB_NATIVE__!==1;
    const imageEntry=active&&(firstImage||guestImage);
    // Both guests and signed-in first-image users keep the same 78px masthead.
    // Scroll thresholds must never resize it underneath a viewport-fixed dock.
    header.classList.toggle('pv-mobile-entry-condensed',imageEntry);
    if(imageEntry&&!wasImageEntry&&window.scrollY>0)window.scrollTo(0,0);
    wasImageEntry=imageEntry;
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
