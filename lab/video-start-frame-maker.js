// Optional Seedream opening-frame composition for Video Reference mode.
// Wan receives the approved still in Start mode, NEVER the still and raw references together.
// Both quote and paid submission use the existing authenticated Lab backend.
export const OPENING_FRAME_RATIOS = Object.freeze(['16:9','9:16','1:1','4:3','3:4','3:2','2:3']);

export function openingFrameSettings(prompt,aspectRatio,referenceRoles){
  if(!Array.isArray(referenceRoles)||!referenceRoles.length||referenceRoles.length>10)
    throw Error('Add 1 to 10 reference photographs before creating an opening frame.');
  if(!OPENING_FRAME_RATIOS.includes(aspectRatio))
    throw Error('Choose an opening-frame aspect ratio.');
  const direction=String(prompt||'').trim();
  if(!direction)throw Error('Describe the opening image before checking the Seedream price. No image submitted.');
  if(direction.length>5000)throw Error('Opening-frame direction exceeds 5,000 characters. No image submitted.');
  const roles=referenceRoles.map(item=>({
    name:String(item.name||''),
    role:item.role==='base'?'none':item.role||'none',
    note:String(item.note||''),
    ...(item.target?{target:item.target}:{})
  }));
  return {
    type:'image',engine:'seedream',mode:'image',referenceMode:'references',
    prompt:direction,referenceRoles:roles,resolution:'1k',
    aspectRatio,outputFormat:'png'
  };
}

export function attachVideoReferenceBrowserDrop({doc,target,input,enabled,onFiles}){
  const hasFiles=event=>!!event.dataTransfer&&Array.from(event.dataTransfer.types||[]).includes('Files');
  const allowed=event=>enabled()&&hasFiles(event);
  const clear=()=>doc.body.classList.remove('pv-video-reference-browser-drag');
  const hint=event=>{
    if(!allowed(event))return;
    event.preventDefault();
    if(event.dataTransfer)event.dataTransfer.dropEffect='copy';
    doc.body.classList.add('pv-video-reference-browser-drag');
  };
  doc.addEventListener('dragenter',hint);
  doc.addEventListener('dragover',hint);
  doc.addEventListener('dragleave',event=>{
    if(!event.relatedTarget||event.relatedTarget===doc.documentElement)clear();
  });
  doc.addEventListener('drop',event=>{
    const receive=allowed(event);
    clear();
    if(!receive)return;
    event.preventDefault();
    // The label's existing drop handler already consumes drops on the label.
    if(target.contains(event.target))return;
    const files=[...(event.dataTransfer?.files||[])];
    if(files.length)onFiles(files);
  });
  doc.defaultView?.addEventListener('blur',clear);
  target.tabIndex=0;
  target.addEventListener('keydown',event=>{
    if(event.target!==target||!['Enter',' '].includes(event.key))return;
    event.preventDefault();
    if(!input.disabled)input.click();
  });
  return {clear};
}

export function createVideoStartFrameMaker({
  element,context,session,active,action,ensureReferences,prepareQuoteInputs,
  referenceRoles,compilePrompt,validateReferences,api,onAccepted,loadPreview,useFrame,
  imageQueueAvailable,describePrice
}){
  const $=element;
  const dialog=$('start-frame-dialog'),openButton=$('create-start-frame');
  const direction=$('start-frame-direction'),aspect=$('start-frame-aspect');
  const review=$('start-frame-review'),quoteBox=$('start-frame-quote-info');
  const quotePrice=$('start-frame-price'),quoteNote=$('start-frame-price-note');
  const confirmButton=$('start-frame-confirm'),status=$('start-frame-status');
  const resultBox=$('start-frame-result'),resultImage=$('start-frame-result-image');
  const useButton=$('start-frame-apply');
  let initialized=false,quote=null,quoteKey='',working=false,stage='idle';
  let pendingJobId=null,currentJob=null,previewURL=null,previewId=null,previewLoad=null,unconfirmed=false;

  function stateKey(){
    const c=context();
    return JSON.stringify([session(),c.engine,c.references.map(r=>[
      r.url,r.file?.name,r.file?.size,r.file?.lastModified,r.role,r.note,r.target
    ]),direction.value,aspect.value]);
  }
  function say(message,error=false){
    status.textContent=message;
    status.classList.toggle('error',!!error);
  }
  function forgetQuote(){
    quote=null;quoteKey='';
    quoteBox.hidden=true;
    if(stage==='review')stage='idle';
  }
  function clearPreview(){
    if(previewURL)URL.revokeObjectURL(previewURL);
    previewURL=null;previewId=null;previewLoad=null;
    resultImage.removeAttribute('src');
    resultBox.hidden=true;
  }
  function sync(){
    const c=context(),ready=c.allowed&&c.references.length>0&&c.providerReady;
    // Show this optional Seedream composition workflow only after the user
    // has selected reference photographs in a supported Reference mode.
    // Never make it look like a Wan input or required setup step.
    const maker=$('start-frame-maker');
    if(maker)maker.hidden=!(c.allowed&&c.references.length>0);
    const activeJob=!!pendingJobId&&['submitting','queued','running','saving','uncertain'].includes(stage);
    openButton.disabled=!ready||c.busy;
    openButton.title=!c.references.length?'Add at least one reference photograph first.':
      !c.providerReady?'Seedream is unavailable on the Lab backend.':
      'Compose one Seedream opening image, review it, then animate with the video model.';
    review.disabled=!ready||c.busy||working||activeJob||unconfirmed||!imageQueueAvailable();
    const goodQuote=quote&&quoteKey===stateKey()&&Date.now()<quote.expiresAt;
    quoteBox.hidden=!goodQuote;
    confirmButton.disabled=!goodQuote||c.busy||working||activeJob||unconfirmed||!imageQueueAvailable();
    useButton.disabled=!currentJob?.outputId||stage!=='completed'||working||c.busy;
    resultBox.hidden=!previewURL;
    dialog.setAttribute('aria-busy',String(working));
  }
  function invalidate(){
    forgetQuote();sync();
  }
  openButton.onclick=()=>{
    const c=context();
    if(!c.allowed||c.busy||!c.references.length)return;
    if(!initialized){
      direction.value='';
      const ratio=c.aspectRatio;
      const first=c.references[0];
      aspect.value=OPENING_FRAME_RATIOS.includes(ratio)?ratio:
        first?.height>first?.width?'9:16':first?.height===first?.width?'1:1':'16:9';
      initialized=true;
    }
    if(!dialog.open)dialog.showModal();
    if(stage==='idle')say('Describe your opening composition. No image generation or credits until you confirm the Seedream price.');
    sync();
  };
  $('start-frame-close').onclick=()=>dialog.close();
  direction.addEventListener('input',invalidate);
  aspect.addEventListener('change',invalidate);
  dialog.addEventListener('close',()=>{forgetQuote();sync();});

  review.onclick=()=>void action(async()=>{
    if(working||unconfirmed)return;
    working=true;forgetQuote();stage='checking';
    say('Preparing references and checking the live Seedream price. No generation has started.');
    sync();
    try{
      const requestEpoch=session(),c=context();
      if(!c.allowed||!c.providerReady||!c.references.length)throw Error('Choose Video References and add photographs first.');
      if(!imageQueueAvailable())throw Error('An image job is already running or needs review. Check Queue.');
      const settings=openingFrameSettings(direction.value,aspect.value,referenceRoles());
      const labelError=validateReferences(settings.referenceRoles,settings);
      if(labelError)throw Error(labelError);
      const compiled=compilePrompt(settings.prompt,settings.referenceRoles,settings);
      if(compiled.length>5000)throw Error('Opening prompt and reference instructions exceed 5,000 characters by '+(compiled.length-5000)+'. Shorten the opening direction or reference notes. No image submitted.');
      const fingerprint=stateKey();
      const ids=await ensureReferences();
      if(!active(requestEpoch)||fingerprint!==stateKey())throw Error('Your session or references changed. No generation submitted.');
      const originals=c.references.map((r,i)=>({id:ids[i],file:r.file,width:r.width,height:r.height}));
      const inputs=await prepareQuoteInputs(
        {sourceId:ids[0],lastSourceId:null,referenceSourceIds:ids},
        {originals,engine:'seedream'}
      );
      if(!inputs||!active(requestEpoch)||fingerprint!==stateKey())
        throw Error('Your session or references changed. No generation submitted.');
      const checked=await api('/api/quotes',{method:'POST',body:{...inputs,settings}});
      if(!active(requestEpoch)||fingerprint!==stateKey())
        throw Error('Your session or references changed. No generation submitted.');
      if(checked.settings?.type!=='image'||checked.settings.engine!=='seedream'||
        checked.settings.mode!=='image'||checked.settings.referenceSourceIds?.length!==ids.length)
        throw Error('The price check did not match your Seedream references. Nothing submitted.');
      const displayPrice=describePrice(checked);
      quote=checked;quoteKey=fingerprint;stage='review';
      quotePrice.textContent=displayPrice;
      quoteNote.textContent='Bound maximum · expires '+new Date(checked.expiresAt).toLocaleTimeString()+'. Separate image cost. Video is not included.';
      say('Review the price, then confirm. The original references stay unchanged.');
    }catch(error){
      stage='error';say(error.message,true);throw error;
    }finally{working=false;sync();}
  });

  confirmButton.onclick=()=>void action(async()=>{
    if(working||unconfirmed||!quote)return;
    working=true;
    const approved=quote;
    try{
      if(!active(session())||quoteKey!==stateKey()||Date.now()>=approved.expiresAt)
        throw Error('The quote expired or your opening frame changed. Review a new price. No image submitted.');
      if(!imageQueueAvailable())throw Error('An image job is already running. No generation submitted.');
      forgetQuote();clearPreview();currentJob=null;pendingJobId=null;stage='submitting';
      say('Submitting one paid Seedream opening image. Do not submit another request while this is being confirmed.');
      sync();
      // The paid request is deliberately sent once. Network uncertainty requires History review.
      const response=await api('/api/jobs',{method:'POST',body:{quoteId:approved.id,confirm:true}});
      if(!response?.job?.id)throw Error('No acknowledged job was returned. Check History before another attempt.');
      pendingJobId=response.job.id;currentJob=response.job;
      onJob(response.job);
      onAccepted(response.job);
      if(!['completed','failed'].includes(response.job.status))
        say('Seedream is creating the opening image. You may close this panel; the paid job remains in History.');
    }catch(error){
      if(stage==='submitting'){
        unconfirmed=true;stage='uncertain';
        say('Submission was not confirmed. Review History and provider charges before creating another image. '+error.message,true);
      }else{stage='error';say(error.message,true);}
      throw error;
    }finally{working=false;sync();}
  });

  async function previewCompleted(job){
    if(!job.outputId||previewId===job.outputId||previewLoad)return;
    const id=job.outputId,requestEpoch=session();
    previewLoad=loadPreview(id).then(blob=>{
      if(!active(requestEpoch)||pendingJobId!==job.id)return;
      clearPreview();
      previewURL=URL.createObjectURL(blob);previewId=id;
      resultImage.src=previewURL;resultBox.hidden=false;
      sync();
    }).catch(error=>{
      if(active(requestEpoch)&&pendingJobId===job.id)
        say('Opening image saved to History, but its preview could not load: '+error.message,true);
    }).finally(()=>{previewLoad=null;});
    await previewLoad;
  }
  function onJob(job){
    if(!job||job.id!==pendingJobId)return;
    currentJob=job;
    if(job.status==='completed'&&job.outputId){
      stage='completed';unconfirmed=false;
      say('Opening image ready. Inspect it below, then choose Use as Start Frame. Video is not generated yet.');
      void previewCompleted(job);
    }else if(job.status==='uncertain'){
      stage='uncertain';unconfirmed=true;
      say('Seedream result is uncertain. Check History before another paid request.',true);
    }else if(['failed','resolved'].includes(job.status)){
      stage=job.status;unconfirmed=false;
      say(job.error||'This image job did not produce an opening frame. Check History before generating again.',true);
    }else{
      stage=job.status||'queued';
      say('Seedream opening image: '+stage+'. You can close this panel while it runs.');
    }
    sync();
  }
  useButton.onclick=()=>void action(async()=>{
    if(working||stage!=='completed'||!currentJob?.outputId)return;
    working=true;sync();
    try{
      const job=currentJob;
      dialog.close();
      await useFrame(job);
      say('Opening image loaded. Animate it in Start Frame mode.');
    }catch(error){say(error.message,true);throw error;}
    finally{working=false;sync();}
  });
  function clear(){
    forgetQuote();clearPreview();
    pendingJobId=null;currentJob=null;working=false;stage='idle';unconfirmed=false;
    direction.value='';initialized=false;say('');
    if(dialog.open)dialog.close();
    sync();
  }
  sync();
  return {sync,clear,onJob,invalidate};
}
