/* PV LAB Video Studio: actual create modes versus explicitly selected History.
 * Presentation-only. All model, authentication, input and payment behavior
 * continues through lab.js and the existing Video reference controls. */
function mountVideoSceneStates(){
  const doc=document;
  const byId=id=>doc.getElementById(id);
  const app=byId('app'),modes=byId('video-modes'),stage=byId('empty');
  const referenceList=byId('reference-list'),inspector=byId('video-inspector-empty');
  const startArt=byId('pv-video-start-visual'),textArt=byId('pv-video-text-visual');
  if(!app||!modes||!stage||!referenceList||!inspector||!startArt||!textArt)return;

  const prompt=byId('prompt'),model=byId('video-model-current'),engine=byId('video-engine');
  const fields=['duration','resolution','ratio','audio'];
  const quoteOption=id=>{
    const el=byId(id);
    return el?.selectedOptions?.[0]?.textContent?.trim()||el?.value||'';
  };
  const currentMode=()=>{
    if(app.classList.contains('video-extend-active'))return 'extend';
    const tab=modes.querySelector('[role="tab"][aria-selected="true"]');
    return tab?.id==='mode-reference'?'reference':tab?.id==='mode-start'?'start':'text';
  };
  let nextFrame=0,referencePreviewKey='';
  function setModeClass(cls,yes){
    if(app.classList.contains(cls)!==yes)app.classList.toggle(cls,yes);
  }
  function note(text){
    const node=byId('pv-video-current-reference-note');
    if(node)node.textContent=text;
  }
  function renderLiveReferences(mode){
    const host=byId('pv-video-current-references');
    if(!host)return;
    const items=[];
    const frame=(id,title)=>{
      const thumbnail=byId(id);
      if(thumbnail&&!thumbnail.hidden&&(thumbnail.currentSrc||thumbnail.src))
        items.push({src:thumbnail.currentSrc||thumbnail.src,title});
    };
    if(mode==='start'){frame('video-start-thumb','Start');frame('video-end-thumb','End');}
    if(['reference','extend'].includes(mode))for(const row of referenceList.querySelectorAll('.reference-item')){
      const img=row.querySelector('img');
      if(!img?.src)continue;
      const role=row.querySelector('.reference-fields select')?.selectedOptions?.[0]?.textContent?.trim()||'Reference';
      items.push({src:img.currentSrc||img.src,title:role});
    }
    if(mode==='extend'){
      const count=byId('video-reference-list')?.children.length||0;
      note(count+' video reference'+(count===1?'':'s')+' selected.'+(items.length?' '+items.length+' image reference'+(items.length===1?'':'s')+' attached.':''));
    }else if(mode==='start'&&items.some(item=>item.title==='Start')){
      note('Start frame ready. Describe the motion; the ending frame is optional.');
    }else note(items.length?items.length+' reference'+(items.length===1?'':'s')+' attached.':'Nothing attached yet.');
    const key=mode+':'+items.map(x=>x.src+'|'+x.title).join('::');
    if(referencePreviewKey===key)return;
    referencePreviewKey=key;
    const frag=doc.createDocumentFragment();
    for(const item of items.slice(0,6)){
      const figure=doc.createElement('figure');
      const img=doc.createElement('img');img.alt='';img.loading='lazy';img.decoding='async';img.src=item.src;
      const caption=doc.createElement('figcaption');caption.textContent=item.title;
      figure.append(img,caption);frag.append(figure);
    }
    host.replaceChildren(frag);
  }
  function refreshInspector(mode){
    if(!inspector||inspector.hidden)return;
    const name=model?.textContent?.trim()||engine?.selectedOptions?.[0]?.textContent?.trim()||'Video model';
    byId('pv-video-current-model').textContent=name;
    const sceneModel=byId('pv-video-scene-model');
    if(sceneModel)sceneModel.disabled=!!byId('video-model-trigger')?.disabled;
    byId('pv-video-current-model-description').textContent=byId('pv-video-model-hero')?.querySelector('small')?.textContent||'';
    // Draft text belongs in the composer. Saved-video prompts have their own inspector.
    const draftPrompt=byId('pv-video-current-prompt');
    if(draftPrompt){draftPrompt.textContent='';draftPrompt.closest('section').hidden=true;}
    byId('pv-video-current-duration').textContent=quoteOption('duration');
    byId('pv-video-current-resolution').textContent=quoteOption('resolution').toUpperCase();
    const ratio=byId('ratio'),ratioHidden=ratio?.closest('label')?.hidden;
    byId('pv-video-current-ratio').textContent=ratioHidden?'Source':quoteOption('ratio');
    byId('pv-video-current-audio').textContent=byId('audio')?.disabled?'Unavailable':byId('audio')?.checked?'On':'Off';
    renderLiveReferences(mode);
    // The editor owns readiness, including Gallery-to-Start-Frame handoffs.
    // Do not overwrite its synchronous status with a thumbnail decode race.
  }
  function updateTextAndVisual(mode){
    const video=app.classList.contains('video-studio-active');
    const history=app.classList.contains('pv-video-history-selected');
    const visible=video&&!history&&!stage.hidden;
    // Source media always takes precedence over the decorative empty canvas,
    // including Reference/Extend states where the empty invitation stays mounted.
    const hasInput=!!referenceList.querySelector('.reference-item')||
      ['video-start-thumb','video-end-thumb'].some(id=>{const img=byId(id);return img&&!img.hidden;})||
      !!byId('video-reference-list')?.children.length||!!byId('audio-reference-list')?.children.length;
    setModeClass('pv-video-has-input',hasInput);
    startArt.hidden=!(visible&&mode!=='text'&&!hasInput);
    const add=startArt.querySelector('.pv-video-add-frame');
    if(add)add.setAttribute('aria-label',mode==='extend'?'Choose a video':mode==='reference'?'Upload reference images':'Choose start frame');
    textArt.hidden=!(visible&&mode==='text');
    if(!visible)return;
    const title=byId('empty-title'),subtitle=byId('empty-description');
    if(!title||!subtitle)return;
    const values={
      text:['Describe the scene','Write the movement, setting and sound for your video.'],
      start:['Your next scene starts here','Choose an opening image to animate. Add an end frame only if you need a specific finish.'],
      reference:['Animate your references',''],
      extend:['Continue the scene','Upload a clip and describe what happens next.']
    };
    const [heading,description]=values[mode]||values.start;
    if(title.textContent!==heading)title.textContent=heading;
    if(subtitle.textContent!==description)subtitle.textContent=description;
    const library=byId('pv-video-browse-library');
    if(library)library.hidden=mode!=='reference'||!!byId('scene-video-open')?.disabled;
  }
  function refresh(){
    const video=app.classList.contains('video-studio-active');
    if(!video){startArt.hidden=true;textArt.hidden=true;byId('pv-video-browse-library').hidden=true;return;}
    const mode=currentMode();
    for(const m of ['text','start','reference','extend'])setModeClass('pv-video-mode-'+m,mode===m);
    const label=byId('prompt-label');
    const desired=mode==='text'?'Direction':'Prompt';
    if(label&&label.textContent!==desired)label.textContent=desired;
    updateTextAndVisual(mode);
    refreshInspector(mode);
  }
  function schedule(){
    if(nextFrame)return;
    nextFrame=requestAnimationFrame(()=>{nextFrame=0;refresh();});
  }
  app.addEventListener('click',event=>{
    if(event.target.closest('#video-modes,#video-task-switch,#video-model-trigger,#pv-video-history-back'))schedule();
  });
  byId('pv-video-browse-library')?.addEventListener('click',()=>byId('scene-video-open')?.click());
  byId('pv-video-scene-model')?.addEventListener('click',()=>byId('video-model-trigger')?.click());
  doc.addEventListener('input',event=>{
    if(event.target===prompt||fields.includes(event.target?.id))schedule();
  },true);
  doc.addEventListener('change',event=>{
    if(fields.includes(event.target?.id)||event.target?.id==='video-engine'||referenceList.contains(event.target))schedule();
  },true);
  new MutationObserver(schedule).observe(app,{attributes:true,attributeFilter:['class']});
  new MutationObserver(schedule).observe(modes,{subtree:true,attributes:true,attributeFilter:['aria-selected','hidden']});
  new MutationObserver(schedule).observe(stage,{attributes:true,attributeFilter:['hidden']});
  new MutationObserver(schedule).observe(referenceList,{childList:true,subtree:true});
  for(const id of ['video-reference-list','audio-reference-list']){
    const list=byId(id);
    if(list)new MutationObserver(schedule).observe(list,{childList:true,subtree:true});
  }
  new MutationObserver(schedule).observe(inspector,{attributes:true,attributeFilter:['hidden']});
  const thumbs=byId('start-mode');
  if(thumbs)new MutationObserver(schedule).observe(thumbs,{attributes:true,attributeFilter:['hidden'],subtree:true});
  app.classList.add('pv-video-state-ready','pv-video-compact');
  refresh();
}
if(document.readyState==='loading')
  document.addEventListener('DOMContentLoaded',mountVideoSceneStates,{once:true});
else mountVideoSceneStates();
