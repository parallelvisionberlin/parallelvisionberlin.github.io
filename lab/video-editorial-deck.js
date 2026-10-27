/* Video Editorial Deck. UI-only enhancements; production model controls remain original. */
function installVideoEditorialDeck(){
  const doc=document;
  const app=doc.getElementById('app');
  // Desktop keeps the editor fixed and History inside the center feed. Route
  // otherwise-unused wheel input there instead of dropping it on the locked page.
  doc.addEventListener('wheel',event=>{
    if(event.defaultPrevented||event.ctrlKey||event.shiftKey||!matchMedia('(min-width:821px)').matches||
      app?.hidden||!app?.classList.contains('video-studio-active')||
      app.matches('.assets-active,.fashion-studio-active,.is-precision-active')||
      !event.deltaY||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
    const target=event.target instanceof Element?event.target:null;
    if(!target||!target.closest('#app,#studio-header')||
      target.closest('dialog,[role="dialog"],[role="menu"],select,input[type="number"],input[type="range"]')||
      doc.querySelector('dialog[open]'))return;
    const feed=doc.getElementById('video-feed-center');
    const canScroll=el=>event.deltaY>0?el.scrollTop+el.clientHeight<el.scrollHeight-1:el.scrollTop>1;
    if(!feed||!canScroll(feed))return;
    // Let textareas, settings, menus and the feed consume their own native scroll.
    for(let el=target;el&&el!==doc.body;el=el.parentElement){
      if(/^(auto|scroll)$/.test(getComputedStyle(el).overflowY)&&canScroll(el))return;
    }
    const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?feed.clientHeight:1);
    feed.scrollBy({top:delta,behavior:'instant'});
    event.preventDefault();
  },{passive:false});
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
  const modelControl=doc.getElementById('video-model-control');
  const modelSelect=doc.getElementById('video-engine');
  const modelPill=doc.getElementById('pv-video-model-pill');
  const modelPillText=doc.getElementById('pv-video-model-pill-label');
  const audioPill=doc.getElementById('pv-video-audio-pill');
  const audioPillText=doc.getElementById('pv-video-audio-pill-label');
  const audioControl=doc.getElementById('audio');
  const prompt=doc.getElementById('prompt');
  const promptCount=doc.getElementById('pv-video-prompt-count');
  const refCount=doc.getElementById('pv-video-added-count');
  const refTitle=doc.getElementById('pv-video-ref-title');
  const clearRefs=doc.getElementById('pv-video-clear-refs');
  const hero=doc.createElement('div');
  hero.id='pv-video-model-hero';
  const heroName=doc.createElement('strong');
  const heroDescription=doc.createElement('small');
  hero.append(heroName,heroDescription);
  modelControl?.append(hero);
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
    // Only actual attachments belong in this preview. Empty-canvas artwork is
    // a separate presentation background and never enters reference or History data.
    const visuals=thumbnails;
    const nextKey='photos:'+visuals.join('|');
    collage.hidden=!visuals.length;
    collage.dataset.illustrative='false';
    collage.setAttribute('aria-label','Your attached reference images, not a generated video');
    if(nextKey===lastVisualKey)return;
    lastVisualKey=nextKey;
    const fragment=doc.createDocumentFragment();
    visuals.forEach((src,i)=>{
      const image=doc.createElement('img');
      image.src=src;
      image.loading='lazy';
      image.decoding='async';
      image.alt='';
      image.setAttribute('aria-hidden','true');
      image.className='pv-reference-preview-image pv-reference-preview-'+i;
      image.onerror=()=>{image.style.opacity='0';};
      fragment.appendChild(image);
    });
    collage.replaceChildren(fragment);
    collage.dataset.count=String(visuals.length);
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

  function refreshApproved(){
    const engine=modelSelect?.value||'';
    const name=modelSelect?.selectedOptions?.[0]?.textContent?.trim()||
      doc.getElementById('video-model-current')?.textContent?.trim()||'Video model';
    const hints={
      seedance:'Multimodal motion and cinematic direction',
      seedance15:'Motion from your opening image',
      seedance4k:'High-resolution video creation',
      klinghf:'Directed scenes and cinematic motion',
      wan:'Create motion with reference images',
      wanprime:'Fast motion guided by your references',
      h3:'Cinematic image-to-video',
      h3max:'High-quality visual reference motion',
      h3spicy:'Motion guided by your visual direction',
      h3maxfal:'Multi-image reference video',
      omni:'Visual and multimodal video creation'
    };
    heroName.textContent=name;
    heroDescription.textContent=hints[engine]||'Video creation with your selected model';
    const autoRatio=Array.from(doc.getElementById('ratio')?.options||[]).find(opt=>opt.value==='auto');
    if(autoRatio){
      if(!autoRatio.dataset.pvPreviousLabel)autoRatio.dataset.pvPreviousLabel=autoRatio.textContent;
      autoRatio.textContent='Auto';
    }
    if(modelPill&&modelPillText){
      modelPill.hidden=false;modelPillText.textContent=name.replace(/ ·.*/,'');
      modelPill.disabled=!!modelSelect?.disabled;
    }
    if(audioPill&&audioPillText){
      const wrapper=audioControl?.closest('.switch-row');
      const usable=!!audioControl&&!audioControl.disabled&&!wrapper?.hidden;
      audioPill.hidden=!usable;
      audioPill.disabled=!usable;
      audioPill.setAttribute('aria-pressed',String(!!audioControl?.checked));
      audioPillText.textContent='Audio '+(audioControl?.checked?'on':'off');
    }
    if(promptCount&&prompt){
      promptCount.textContent=prompt.value.length+' / '+(prompt.maxLength||5000);
    }
    const cards=Array.from(referenceList.querySelectorAll('.reference-item'));
    const count=cards.length;
    const single= count===1&&cards[0].classList.contains('reference-element-item')?cards[0]:null;
    const kinds={characters:'Character attached',outfits:'Outfit attached',props:'Prop attached',locations:'Location attached'};
    const label=single?(kinds[single.dataset.elementCategory]||'Element attached'):'Reference images';
    const heading=refTitle?.querySelector('strong');
    if(heading?.firstChild?.nodeType===Node.TEXT_NODE)heading.firstChild.nodeValue=label+' ';
    if(refCount)refCount.textContent=single?'':'('+count+')';
    if(refTitle)refTitle.hidden=count===0;
    // Never claim an illustrative montage is the user's generated result.
    const mode=activeMode();
    if(mode==='reference'&&doc.getElementById('empty-title')){
      doc.getElementById('empty-title').textContent='Animate your references';
      const subtitle=doc.getElementById('empty-description');
      if(subtitle)subtitle.textContent='';
      doc.getElementById('empty')?.classList.add('pv-video-references-empty');
    }else{
      doc.getElementById('empty')?.classList.remove('pv-video-references-empty');
    }
  }
  function refresh(){
    const active=app.classList.contains('video-studio-active');
    if(!active){
      collage.hidden=true;
      const autoRatio=Array.from(doc.getElementById('ratio')?.options||[]).find(opt=>opt.value==='auto');
      if(autoRatio?.dataset.pvPreviousLabel){
        autoRatio.textContent=autoRatio.dataset.pvPreviousLabel;
        delete autoRatio.dataset.pvPreviousLabel;
      }
      return;
    }
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
    refreshApproved();
  }

  function scheduleRefresh(){
    if(framePending)return;
    framePending=true;
    requestAnimationFrame(()=>{framePending=false;refresh();});
  }

  modelPill?.addEventListener('click',()=>{
    doc.getElementById('video-model-trigger')?.click();
  });
  audioPill?.addEventListener('click',()=>{
    if(audioControl&&!audioControl.disabled)audioControl.click();
  });
  clearRefs?.addEventListener('click',()=>{
    if(!app.classList.contains('video-studio-active'))return;
    const total=referenceList.querySelectorAll('.reference-item').length;
    for(let i=0;i<total;i++){
      const button=referenceList.querySelector('.reference-item .reference-actions button:last-child');
      if(!button||button.disabled)break;
      button.click();
    }
    scheduleRefresh();
  });
  prompt?.addEventListener('input',scheduleRefresh);
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
  app.classList.add('pv-video-deck-ready','pv-video-approved-ready');
  refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installVideoEditorialDeck,{once:true});
else installVideoEditorialDeck();
