/* Video Editorial Deck. UI-only enhancements; production model controls remain original. */
function installVideoEditorialDeck(){
  const doc=document;
  const app=doc.getElementById('app');
  const controls=app?.querySelector('.workspace>.controls .controls-body');
  const referenceMode=doc.getElementById('reference-mode');
  const media=doc.getElementById('reference-media');
  const motion=doc.getElementById('video-motion-toggle');
  const output=doc.getElementById('pv-video-output-toggle');
  const summary=doc.getElementById('pv-video-output-summary');
  const modes=doc.getElementById('video-modes');
  const referenceList=doc.getElementById('reference-list');
  const empty=doc.getElementById('empty');
  if(!app||!controls||!referenceMode||!media||!motion||!output||!summary||!modes||!referenceList||!empty)return;
  let framePending=false,lastVisualKey='';
  const collage=doc.createElement('div');
  collage.id='pv-video-reference-preview';
  collage.className='pv-video-reference-preview';
  collage.setAttribute('aria-label','Actual attached reference images, not a generated video');
  collage.hidden=true;
  const headline=doc.getElementById('empty-title');
  if(headline)empty.insertBefore(collage,headline);
  else empty.prepend(collage);

  const activeMode=()=>{
    if(app.classList.contains('video-extend-active'))return 'extend';
    const selected=modes.querySelector('.mode-tab[aria-selected="true"]');
    return selected?.id==='mode-reference'?'reference':selected?.id==='mode-start'?'start':'text';
  };

  function refreshCollage(enabled){
    const thumbnails=enabled?Array.from(referenceList.querySelectorAll('.reference-item>img'))
      .slice(0,3).map(img=>img.currentSrc||img.src).filter(Boolean):[];
    const nextKey=thumbnails.join('|');
    collage.hidden=!thumbnails.length;
    if(nextKey===lastVisualKey)return;
    lastVisualKey=nextKey;
    const fragment=doc.createDocumentFragment();
    thumbnails.forEach((src,i)=>{
      const image=doc.createElement('img');
      image.src=src;
      image.loading='lazy';
      image.decoding='async';
      image.alt='';
      image.setAttribute('aria-hidden','true');
      image.className='pv-reference-preview-image pv-reference-preview-'+i;
      fragment.appendChild(image);
    });
    collage.replaceChildren(fragment);
    collage.dataset.count=String(thumbnails.length);
  }

  function summarize(){
    const value=id=>doc.getElementById(id)?.selectedOptions?.[0]?.textContent?.trim()||'';
    const audio=doc.getElementById('audio');
    const ratio=doc.getElementById('ratio');
    const audioWrapper=audio?.closest('.switch-row');
    const parts=[value('duration'),value('resolution')];
    if(ratio&&!ratio.closest('label')?.hidden&&value('ratio'))parts.push(value('ratio'));
    if(audio&&!audioWrapper?.hidden)parts.push(audio.checked?'Audio on':'Audio off');
    summary.textContent=parts.filter(Boolean).join(' · ');
    summary.title=summary.textContent;
  }

  function refresh(){
    const active=app.classList.contains('video-studio-active');
    if(!active){collage.hidden=true;return;}
    const mode=activeMode();
    const canExpand=mode==='reference'&&!media.hidden;
    motion.hidden=!canExpand;
    if(!canExpand){
      motion.setAttribute('aria-expanded','false');
      referenceMode.dataset.pvMotionOpen='false';
    } else {
      motion.setAttribute('aria-expanded',String(referenceMode.dataset.pvMotionOpen==='true'));
    }
    output.setAttribute('aria-expanded',String(!controls.classList.contains('pv-video-output-collapsed')));
    summarize();
    refreshCollage(mode==='reference');
  }

  function scheduleRefresh(){
    if(framePending)return;
    framePending=true;
    requestAnimationFrame(()=>{framePending=false;refresh();});
  }

  motion.addEventListener('click',()=>{
    if(motion.hidden)return;
    referenceMode.dataset.pvMotionOpen=referenceMode.dataset.pvMotionOpen==='true'?'false':'true';
    motion.setAttribute('aria-expanded',String(referenceMode.dataset.pvMotionOpen==='true'));
  });
  output.addEventListener('click',()=>{
    const collapsed=controls.classList.toggle('pv-video-output-collapsed');
    output.setAttribute('aria-expanded',String(!collapsed));
    summarize();
  });
  doc.addEventListener('change',scheduleRefresh,true);
  doc.addEventListener('input',event=>{
    if(['duration','resolution','ratio','audio','seed'].includes(event.target?.id))scheduleRefresh();
  },true);
  modes.addEventListener('click',scheduleRefresh);
  doc.getElementById('video-task-switch')?.addEventListener('click',scheduleRefresh);
  doc.getElementById('video-model-trigger')?.addEventListener('click',scheduleRefresh);
  new MutationObserver(scheduleRefresh).observe(app,{attributes:true,attributeFilter:['class']});
  new MutationObserver(scheduleRefresh).observe(media,{attributes:true,attributeFilter:['hidden']});
  new MutationObserver(scheduleRefresh).observe(modes,{subtree:true,attributes:true,attributeFilter:['aria-selected','hidden']});
  new MutationObserver(scheduleRefresh).observe(referenceList,{childList:true,subtree:true});
  const status=doc.getElementById('settings-summary');
  if(status)new MutationObserver(scheduleRefresh).observe(status,{childList:true,characterData:true,subtree:true});
  app.classList.add('pv-video-deck-ready');
  refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installVideoEditorialDeck,{once:true});
else installVideoEditorialDeck();
