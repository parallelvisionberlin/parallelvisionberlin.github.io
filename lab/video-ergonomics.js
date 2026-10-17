/* Video ergonomics: the native model/mode/credit state remains authoritative.
 * No new provider mode, no fake combined Start + Reference pipeline. */
function installVideoErgonomics(){
  const $=id=>document.getElementById(id);
  const app=$('app'),engine=$('video-engine'),referenceLabel=$('pv-mode-reference-label'),startLabel=$('pv-mode-start-label');
  const modes=$('video-modes');
  if(!app||!engine||!referenceLabel||!startLabel||!modes)return;
  let pending=false;
  function sync(){
    const video=app.classList.contains('video-studio-active');
    const seedance=video&&engine.value==='seedance';
    const wan=video&&['wan','wanprime'].includes(engine.value);
    for(const [name,yes] of [
      ['pv-video-ergonomic',video],['pv-video-seedance',seedance],
      ['pv-video-wan',wan]
    ])if(app.classList.contains(name)!==yes)app.classList.toggle(name,yes);
    const referenceText=seedance?'Reference set':'References';
    const startText=seedance?'Opening frame':'Start frame';
    if(referenceLabel.textContent!==referenceText)referenceLabel.textContent=referenceText;
    if(startLabel.textContent!==startText)startLabel.textContent=startText;
    const openingTab=$('mode-start');
    if(openingTab&&seedance){
      openingTab.title='Animate an opening image. This uses Seedance Start frame, separate from Reference set.';
      openingTab.setAttribute('aria-label','Opening frame: animate a still image using the separate Seedance Start mode');
    }else if(openingTab){
      openingTab.removeAttribute('title');
      openingTab.removeAttribute('aria-label');
    }
  }
  function schedule(){
    if(pending)return;
    pending=true;
    requestAnimationFrame(()=>{pending=false;sync();});
  }
  engine.addEventListener('change',schedule);
  app.addEventListener('click',event=>{
    if(event.target?.closest('#video-model-menu,#video-mode-trigger,#video-modes,#video-task-switch'))schedule();
  });
  new MutationObserver(schedule).observe(app,{attributes:true,attributeFilter:['class']});
  new MutationObserver(schedule).observe(modes,{subtree:true,attributes:true,attributeFilter:['hidden','aria-selected']});
  sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installVideoErgonomics,{once:true});
else installVideoErgonomics();
