import {moodById} from './moods.js?v=20261018-girard-originals2&old=20261011-midnight-reverie1&hd=20261011&raveBudget=1&editorialHD=2&hongKongStreet=1&moodImageHD=1&raveNight=4&hongKongRefs=4&dreamcore=7&syntheticRefs=1&raveIdentity=1&filmRevision=4&hkContinuity=4&hkScene=5&hkCinematography=1&midnightFlashV2=1&moodLock=20261014-mood-consistency1&berlinCard=20261015&dreamBlur=20261015v1&filmCapture=20261016v2&hkRestore=20261018v1&hkFidelity=20261018v2&hkAtmosphere=20261019v1';
import {saveMoodHandoff,validateMoodHandoff} from './mood-handoff.js?v=20261012-generate1';
import {hongKongVariant} from './hong-kong-variants.js?v=20261018-user-originals2&hkRestore=20261018v1&hkFidelity=20261018v2';
// Browsing and uploads only prepare a price. Generate explicitly authorizes one job.
export function moodExploreDestination(moodId,{create=false,handoff=null,moodVariant='original'}={}){
  if(!moodById(moodId))throw Error('Choose a valid PV Lab Mood.');
  const query=new URLSearchParams(create?{base:moodId}:{tool:'image',mood:moodId});
  if(handoff)query.set('handoff',handoff);
  if(moodId==='hong-kong-nights'&&!create&&hongKongVariant(moodVariant)!=='original')query.set('variation',hongKongVariant(moodVariant));
  return './'+(create?'mood-creator.html':'studio.html')+'?'+query;
}
function initialize(){
  const $=id=>document.getElementById(id);
  const dialog=$('mc-look-dialog'),zone=$('mc-look-dropzone'),fileInput=$('mc-look-file');
  const direction=$('mc-look-direction'),status=$('mc-look-status');
  const uploadError=$('mc-look-upload-error'),uploadErrorTitle=$('mc-look-upload-error-title'),
    uploadErrorDetail=$('mc-look-upload-error-detail');
  let mood=null,file=null,fileURL=null,busy=false,dragDepth=0,moodVariant='original';
  const variationRow=$('mc-hk-variation');
  const variationOptions=[...variationRow.querySelectorAll('[data-hk-variant]')];
  function renderVariation(){
    variationRow.hidden=true; // One canonical treatment; old IDs remain archival.
    for(const option of variationOptions){
      const active=option.dataset.hkVariant===moodVariant;
      option.classList.toggle('is-selected',active);
      option.setAttribute('aria-pressed',String(active));
      option.disabled=busy;
    }
  }
  for(const option of variationOptions)option.onclick=()=>{
    if(busy||mood?.id!=='hong-kong-nights')return;
    const choice=hongKongVariant(option.dataset.hkVariant);
    if(choice===moodVariant)return;
    // A generated image belongs to the variation used at submission time.
    // Switching looks must never mislabel the previous result as Deep Green.
    if(!result.hidden)clearResult();
    moodVariant=choice;renderVariation();schedulePrice(0);
  };
  let price=null,priceTask=null,priceRevision=0,priceTimer=null,expiryTimer=null,service=null,serviceLoading=null,needsSignIn=false;
  const creditNote=$('mc-look-credit-note'),accessAction=$('mc-look-access-action');
  const generate=$('mc-look-continue'),result=$('mc-look-result');
  let blockedCode=null;
  const resultImg=$('mc-look-result-image'),resultLoading=$('mc-look-result-loading');
  const resultActions=$('mc-look-result-actions');
  let runSerial=0,activeJobId=null,resultURL=null,resultBlob=null,resultOutputId=null,waitNoteTimer=null;
  function clearResult(){
    clearTimeout(waitNoteTimer);waitNoteTimer=null;
    $('mc-look-result-wait-note').hidden=true;
    runSerial++;activeJobId=null;
    if(resultURL)URL.revokeObjectURL(resultURL);
    resultURL=null;resultBlob=null;resultOutputId=null;
    result.hidden=true;result.classList.remove('is-visible');
    dialog.classList.remove('is-result-view');
    resultImg.hidden=true;resultImg.removeAttribute('src');resultActions.hidden=true;
    $('mc-look-result-again').hidden=true;
    $('mc-look-result-history').hidden=true;
    resultLoading.hidden=false;resultLoading.classList.remove('is-stopped','is-finishing');
    $('mc-look-exposure-overline-text').textContent='IMAGE IN PROCESS';
    $('mc-look-result-heading').textContent='PREPARING YOUR IMAGE';
    $('mc-look-result-progress').textContent='Preparing your photograph…';
  }
  function revealResult(){
    // The result replaces the form during preparation instead of being
    // stacked below it and clipped by the dialog's viewport height.
    dialog.classList.add('is-result-view');
    result.hidden=false;
    requestAnimationFrame(()=>result.classList.add('is-visible'));
  }
  function jobProgress(job){
    return ({submitting:'Preparing your image…',queued:'In the generation queue…',
      running:'Generating your photograph…',saving:'Saving your photograph…'})
      [job?.status]||'Waiting for your result…';
  }
  async function watchJob(client,id,serial){
    let job=null,previewLoading=false,previewAvailable=false;
    for(let attempts=0;attempts<150;attempts++){
      if(serial!==runSerial)return;
      const response=await client.jobStatus(id);job=response?.job;
      if(!job||job.id!==id)throw Error('Could not verify the saved generation. Open Image History to check it.');
      if(job.status==='completed'){
        if(!job.outputId)throw Error('The job finished without an image. Check Image History.');
        // Only a verified completed job can enter the final reveal state.
        resultLoading.classList.add('is-finishing');
        $('mc-look-exposure-overline-text').textContent='FINALIZING IMAGE';
        $('mc-look-result-progress').textContent='Opening your photograph…';
        // Never delay a ready private asset for an artificial animation timer.
        clearTimeout(waitNoteTimer);waitNoteTimer=null;
        const blob=await client.outputBlob(job.outputId);
        if(serial!==runSerial)return;
        if(!blob.size||!['image/png','image/jpeg','image/webp'].includes(blob.type.split(';')[0]))
          throw Error('The completed image could not be previewed here. Open Image History.');
        if(resultURL)URL.revokeObjectURL(resultURL);
        resultBlob=blob;resultOutputId=job.outputId;resultURL=URL.createObjectURL(blob);
        resultImg.src=resultURL;resultImg.hidden=false;resultLoading.hidden=true;
        $('mc-look-result-heading').textContent='GENERATED RESULT';
        resultActions.hidden=false;
        $('mc-look-result-again').hidden=false;
        setBusy(false);
        // A finished image does not automatically request another quote.
        // The next paid attempt requires Make another -> Generate.
        generate.disabled=true;
        return;
      }
      if(['failed','uncertain','resolved','cancelled'].includes(job.status))
        throw Error(job.status==='uncertain'?'Generation status is uncertain. Check Image History before trying again.':
          job.error||'No completed image is available. Check Image History.');
      // Fetch an authenticated preview only once the provider result is
      // actually in the private saving state. Never expose its signed URL.
      if(job.status==='saving'&&!previewAvailable&&!previewLoading&&!resultOutputId&&typeof client.previewBlob==='function'){
        previewLoading=true;
        void client.previewBlob(id).then(blob=>{
          if(serial!==runSerial||resultOutputId||!dialog.open||resultLoading.hidden)return;
          if(!blob.size||!['image/png','image/jpeg','image/webp'].includes(blob.type.split(';')[0]))return;
          if(resultURL)URL.revokeObjectURL(resultURL);
          resultURL=URL.createObjectURL(blob);
          resultImg.src=resultURL;resultImg.hidden=false;resultLoading.hidden=true;
          $('mc-look-result-heading').textContent='PREVIEW · SAVING PRIVATELY';
          previewAvailable=true;
          clearTimeout(waitNoteTimer);waitNoteTimer=null;
          $('mc-look-result-wait-note').hidden=true;
        }).catch(()=>{/* Continue polling. Preview is optional, storage is required. */})
          .finally(()=>{previewLoading=false;});
      }
      // Editorial copy can loop, but "Almost ready" requires real saving state.
      const finishing=job.status==='saving';
      resultLoading.classList.toggle('is-finishing',finishing);
      $('mc-look-exposure-overline-text').textContent=finishing?'FINALIZING IMAGE':'IMAGE IN PROCESS';
      $('mc-look-result-progress').textContent=jobProgress(job);
      // Provider queue checks stay at 4s. Once saving begins, check the
      // private archived result more promptly without submitting another job.
      await new Promise(resolve=>setTimeout(resolve,job.status==='saving'?1250:4000));
    }
    throw Error('This image is taking longer than expected. Check Image History for its result.');
  }
  function generationService(){
    if(service)return Promise.resolve(service);
    return serviceLoading||(serviceLoading=import('./app-mood-generation.js?hkRealPhotos=20261018v2&accessNotice=20261018v1&dreamBlurBudget=20261016v1&v=20261013-compact-map2&hongKongRefs=4&dreamcore=7&syntheticRefs=1&raveIdentity=1&filmRevision=4&hkContinuity=4&hkScene=5&hkCinematography=1&midnightFlashV2=1&refMode=20261014-contextual-reference1&moodLock=20261014-mood-consistency1&quoteUX=20261016v1&firstRatio=20261016v2&modalInline=20261016v1&photobooth1k=20261018v1&dreamBlurNotes=20261018v1&refOnlyDreamBlurFix=20261018v1&hkRestore=20261018v1&hkFidelity=20261018v2&hkAtmosphere=20261019v1').then(({createAppMoodGeneration})=>{
      service=createAppMoodGeneration();
      let accountId;
      void service.onAccountChange(account=>{
        const next=account.user?.id||'';
        if(accountId!==undefined&&next!==accountId&&dialog.open&&!busy){
          if(next&&!dialog.matches(':modal')){dialog.close();dialog.showModal();}
          schedulePrice(0);
        }
        accountId=next;
      }).catch(()=>{});
      return service;
    }).catch(error=>{serviceLoading=null;throw error;}));
  }
  function hasGenerationInput(){return !!mood&&!!(file||direction.value.trim());}
  const accessCodes=new Set(['TRIAL_PAUSED','ACCOUNT_REVIEW','BILLING_REVIEW','ACCOUNT_CLOSED','GENERATION_UNAVAILABLE']);
  function clearAccessNotice(){
    blockedCode=null;
    dialog.classList.remove('is-generation-blocked');
    status.classList.remove('is-access-notice');
    accessAction.hidden=true;
    accessAction.textContent='';
    accessAction.removeAttribute('href');
  }
  function showAccessNotice(error){
    if(!accessCodes.has(error?.code))return false;
    blockedCode=error.code;
    dialog.classList.add('is-generation-blocked');
    status.classList.add('is-access-notice');
    status.textContent=error.message;
    const payment=error.code==='TRIAL_PAUSED';
    const support=error.code==='ACCOUNT_REVIEW'||error.code==='BILLING_REVIEW';
    accessAction.hidden=!(payment||support);
    if(payment){
      accessAction.href='./account.html#balance';
      accessAction.textContent='Add credits ↗';
    }else if(support){
      accessAction.href='mailto:contact@parallelvisionlabel.com?subject=PV%20LAB%20account%20review';
      accessAction.textContent='Contact support ↗';
    }else{
      accessAction.removeAttribute('href');
      accessAction.textContent='';
    }
    generate.textContent='Generate';
    generate.disabled=true;
    return true;
  }
  function resetPrice(){
    // Invalidate only a prepared quote, not the user's photo or creative draft.
    priceRevision++;clearTimeout(priceTimer);clearTimeout(expiryTimer);service?.cancel();
    price=null;priceTask=null;needsSignIn=false;
    clearAccessNotice();
    creditNote.hidden=true;creditNote.textContent='';
    generate.textContent='Generate';
    // The UX must never wait for uploads or a quote to activate Generate.
    generate.disabled=!hasGenerationInput();
    generate.removeAttribute('aria-busy');
  }
  function schedulePrice(delay=180){
    resetPrice();status.textContent='';
    if(!hasGenerationInput())return;
    const stamp=priceRevision;
    // Optional background preparation warms the upload and quote, but never
    // disables Generate or silently creates a paid job.
    if(delay>0)priceTimer=setTimeout(()=>void preparePrice(stamp).catch(()=>{}),delay);
    else void preparePrice(stamp).catch(()=>{});
  }
  function preparePrice(stamp=priceRevision){
    clearTimeout(priceTimer);
    if(stamp!==priceRevision||!hasGenerationInput())return Promise.resolve(null);
    if(price?.expiresAt>Date.now()+5000)return Promise.resolve(price);
    if(priceTask?.stamp===stamp)return priceTask.promise;
    const source=file,selected=mood,description=direction.value.trim();
    const promise=(async()=>{
      const client=await generationService();
      if(stamp!==priceRevision||!dialog.open)return null;
      const ready=await client.prepare(source,selected,description,moodVariant);
      if(stamp!==priceRevision||!dialog.open)return null;
      price=ready;needsSignIn=false;clearAccessNotice();
      // Keep the exact verified charge separate from the main button.
      creditNote.textContent=ready.label+' per image';creditNote.hidden=false;
      expiryTimer=setTimeout(()=>{
        if(stamp===priceRevision&&!busy)schedulePrice(0);
      },Math.max(0,ready.expiresAt-Date.now()-20000));
      return ready;
    })().catch(error=>{
      if(stamp===priceRevision&&dialog.open){
        needsSignIn=error.code==='SIGN_IN';
        if(!busy&&!showAccessNotice(error))status.textContent=error.message;
      }
      throw error;
    }).finally(()=>{
      if(priceTask?.promise===promise)priceTask=null;
    });
    priceTask={stamp,promise};
    return promise;
  }
  function setBusy(value){
    busy=value;
    if(value)clearDropHighlight();
    for(const control of [generate,$('mc-look-make'),fileInput,direction,$('mc-look-file-clear'),$('mc-look-close')])control.disabled=value;
  }
  const fullPreviews=new Map();
  function loadFullPreview(selected,priority='low'){
    const src=selected.previewFull;
    if(!src||src===selected.preview)return Promise.resolve(null);
    const cached=fullPreviews.get(src);
    if(cached){
      if(priority==='high')cached.image.fetchPriority='high';
      return cached.ready;
    }
    const image=new Image();
    image.decoding='async';image.fetchPriority=priority;image.src=src;
    const ready=image.decode().then(()=>image.src,()=>{
      fullPreviews.delete(src);
      return null; // Keep the sharp card image if the original cannot load.
    });
    fullPreviews.set(src,{image,ready});
    return ready;
  }
  function clearDropHighlight(){
    dragDepth=0;
    zone.classList.remove('is-over');
  }
  function hideUploadError(){
    zone.classList.remove('has-error');
    uploadError.hidden=true;
    uploadErrorTitle.textContent='';
    uploadErrorDetail.textContent='';
  }
  function showUploadError(input,error){
    const tooLarge=Number.isFinite(input?.size)&&input.size>20*1024*1024;
    uploadErrorTitle.textContent=tooLarge?'Image too large':'Cannot use this image';
    uploadErrorDetail.textContent=tooLarge
      ?(input.size/(1024*1024)).toFixed(1)+' MB selected. Maximum 20 MB.'
      :error.message;
    uploadError.hidden=false;
    zone.classList.add('has-error');
    status.textContent='';
    // A rejected replacement cannot accidentally generate with an older photo.
    if(!busy)generate.disabled=true;
    // Browsers must fire change even when this same rejected file is chosen again.
    fileInput.value='';
  }
  function clearPhoto(){
    clearDropHighlight();
    hideUploadError();
    if(fileURL)URL.revokeObjectURL(fileURL);
    fileURL=null;file=null;fileInput.value='';
    $('mc-look-file-preview')?.remove();
    $('mc-look-file-clear').hidden=true;
    $('mc-look-file-label-text').textContent='Drop a photograph or browse files';
    zone.classList.remove('has-image');
  }
  function attachPhoto(input){
    if(busy)return false;
    try{validateMoodHandoff({file:input});}
    catch(error){showUploadError(input,error);return false;}
    clearPhoto();file=input;
    fileURL=URL.createObjectURL(file);
    const photo=document.createElement('img');photo.id='mc-look-file-preview';photo.className='mc-look-file-preview';
    photo.alt='Chosen photo to transform';photo.src=fileURL;
    zone.prepend(photo);
    $('mc-look-file-label-text').textContent=file.name;
    $('mc-look-file-clear').hidden=false;zone.classList.add('has-image');
    schedulePrice(0);
    return true;
  }
  function showMood(selected,photo=null){
    if(!selected||busy)return;
    clearResult();resetPrice();mood=selected;moodVariant='original';renderVariation();clearPhoto();direction.value='';status.textContent='';
    const preview=$('mc-look-preview');
    preview.dataset.moodId=selected.id;
    // Reuse the gallery's HD image while the untouched original decodes offscreen.
    preview.src=selected.preview;
    preview.alt=selected.name+' aesthetic';
    $('mc-look-title').textContent=selected.name;
    $('mc-look-description').textContent=selected.id==='berlin-rave'?selected.description+'. Transforms wardrobe and lighting into a night-flash editorial while keeping your identity, pose and framing.':selected.id==='synthetic-romance'?selected.description+'. This mood reconstructs visible body parts into engineered chrome, cables and synthetic anatomy.':selected.description+'. Keep your own subject and scene.';
    if(!dialog.open)dialog.showModal();
    // Freeze the natural empty editor height before any dropped/selected photo
    // changes DOM nodes. Subsequent photo changes never resize the Mood card.
    if(!dialog.style.getPropertyValue('--mc-editor-height')){
      const height=dialog.getBoundingClientRect().height;
      dialog.style.setProperty('--mc-editor-height',Math.ceil(height)+'px');
    }
    if(photo)attachPhoto(photo);
    dialog.focus({preventScroll:true});
    dialog.scrollTop=0;
    void loadFullPreview(selected,'high').then(src=>{
      if(src&&dialog.open&&mood===selected)preview.src=src;
    });
  }
  function close(){if(dialog.open&&(!busy||activeJobId))dialog.close();}
  dialog.addEventListener('cancel',event=>{if(busy&&!activeJobId)event.preventDefault();});
  dialog.addEventListener('close',()=>{
    if(dialog.open)return;
    dialog.style.removeProperty('--mc-editor-height');
    clearResult();resetPrice();clearPhoto();mood=null;moodVariant='original';renderVariation();setBusy(false);generate.disabled=true;
    $('mc-look-preview').removeAttribute('src');
  });
  $('mc-look-close').onclick=close;
  dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
  fileInput.addEventListener('change',()=>{if(fileInput.files?.[0])attachPhoto(fileInput.files[0]);});
  $('mc-look-file-clear').onclick=()=>{if(!busy){clearPhoto();schedulePrice();}};
  $('mc-look-upload-error-dismiss').onclick=()=>{
    hideUploadError();
    generate.disabled=!hasGenerationInput()||busy;
  };
  direction.addEventListener('input',()=>schedulePrice(180));
  zone.addEventListener('dragenter',event=>{
    if(!event.dataTransfer?.types?.includes('Files'))return;
    event.preventDefault();
    if(busy)return;
    dragDepth++;zone.classList.add('is-over');
  });
  zone.addEventListener('dragover',event=>{
    if(!event.dataTransfer?.types?.includes('Files'))return;
    event.preventDefault();event.dataTransfer.dropEffect=busy?'none':'copy';
    if(!busy)zone.classList.add('is-over');
  });
  zone.addEventListener('dragleave',()=>{
    // Child labels and previews also fire drag events. Stay lit until the box is left.
    dragDepth=Math.max(0,dragDepth-1);
    if(!dragDepth)clearDropHighlight();
  });
  zone.addEventListener('drop',event=>{
    clearDropHighlight();
    if(event.dataTransfer?.files?.length){event.preventDefault();attachPhoto(event.dataTransfer.files[0]);}
  });
  document.addEventListener('drop',clearDropHighlight);
  document.addEventListener('dragend',clearDropHighlight);
  window.addEventListener('blur',clearDropHighlight);
  for(const card of document.querySelectorAll('.mc-look-card[data-mood-id]')){
    const selected=moodById(card.dataset.moodId);if(!selected)continue;
    const warmPreview=()=>{if(!navigator.connection?.saveData)void loadFullPreview(selected);};
    card.addEventListener('pointerenter',warmPreview,{once:true});
    card.addEventListener('focus',warmPreview,{once:true});
    card.onclick=()=>showMood(selected);
    card.addEventListener('dragover',event=>{if(event.dataTransfer?.types?.includes('Files')){event.preventDefault();event.dataTransfer.dropEffect='copy';card.classList.add('is-drag-over');}});
    card.addEventListener('dragleave',()=>card.classList.remove('is-drag-over'));
    card.addEventListener('drop',event=>{card.classList.remove('is-drag-over');if(event.dataTransfer?.files?.length){event.preventDefault();event.stopPropagation();showMood(selected,event.dataTransfer.files[0]);}});
  }
  $('mc-look-grid').addEventListener('dragover',event=>{if(event.dataTransfer?.types?.includes('Files'))event.preventDefault();});
  $('mc-look-grid').addEventListener('drop',event=>{
    if(!event.dataTransfer?.files?.length||event.target.closest('.mc-look-card[data-mood-id]'))return;
    event.preventDefault();status.textContent='Drop directly onto the Mood you want to use.';
  });
  async function continueWithMood(create=false){
    if(!mood||busy)return;
    resetPrice();setBusy(true);
    status.textContent='Preparing your private photo handoff. Nothing is being generated.';
    try{
      const token=await saveMoodHandoff({file,prompt:direction.value.trim()});
      location.assign(moodExploreDestination(mood.id,{create,handoff:token,moodVariant}));
    }catch(error){
      status.textContent=error.message;
      setBusy(false);schedulePrice();status.textContent=error.message;
    }
  }
  async function openGenerationSignIn(){
    const client=await generationService();
    // Clerk's sign-in portal must not be obstructed by a native modal.
    if(dialog.matches(':modal')){dialog.close();dialog.show();}
    if(await client.signIn())schedulePrice(0);
    else status.textContent='Sign in to generate. Your photograph stays here.';
  }
  window.addEventListener('focus',()=>{
    // Billing opens in another tab so the selected local photograph stays here.
    // Recheck readiness upon return without creating a second paid request.
    if(dialog.open&&blockedCode&&!busy&&hasGenerationInput())schedulePrice(0);
  });
  generate.onclick=()=>void (async()=>{
    if(!hasGenerationInput()||busy||blockedCode)return;
    if(needsSignIn){
      try{await openGenerationSignIn();}
      catch(error){status.textContent=error.message;}
      return;
    }
    const stamp=priceRevision,serial=++runSerial;
    let attemptedSubmission=false;
    // An immediate, honest visual response. Upload and pricing finish inside
    // this one action, without requiring the customer to click twice.
    setBusy(true);clearTimeout(expiryTimer);status.textContent='';
    revealResult();$('mc-look-result-progress').textContent='Preparing your photograph…';
    generate.textContent='Preparing…';
    try{
      const currentPrice=await preparePrice(stamp);
      if(serial!==runSerial||!dialog.open)return;
      if(!currentPrice||currentPrice.expiresAt<=Date.now()+5000)
        throw Error('The generation price changed. Press Generate again to retry.');
      $('mc-look-result-progress').textContent='Sending your image…';
      generate.textContent='Generating…';
      attemptedSubmission=true;
      const response=await currentPrice.submit();
      const job=response?.job;
      if(!job?.id)throw Error('Submission could not be confirmed. Check Image History before trying again.');
      if(serial!==runSerial)return;
      activeJobId=job.id;
      // A confirmed server job keeps running if the user closes Explore Moods.
      // Offer the safe exit only after the wait becomes substantial.
      clearTimeout(waitNoteTimer);
      waitNoteTimer=setTimeout(()=>{
        if(serial===runSerial&&dialog.open&&activeJobId===job.id&&!resultLoading.hidden)
          $('mc-look-result-wait-note').hidden=false;
      },45000);
      $('mc-look-result-heading').textContent='GENERATING YOUR IMAGE';
      $('mc-look-result-history').hidden=false;
      $('mc-look-close').disabled=false; // Accepted jobs keep running in History if closed.
      $('mc-look-result-progress').textContent=jobProgress(job);
      await watchJob(await generationService(),job.id,serial);
    }catch(error){
      if(serial!==runSerial)return;
      clearTimeout(waitNoteTimer);waitNoteTimer=null;
      $('mc-look-result-wait-note').hidden=true;
      setBusy(false);
      $('mc-look-close').disabled=false;
      if(error.code==='SIGN_IN'&&!attemptedSubmission){
        clearResult();
        try{await openGenerationSignIn();}
        catch(signInError){status.textContent=signInError.message;}
        return;
      }
      if(attemptedSubmission){
        resultLoading.hidden=false;resultImg.hidden=true;
        resultLoading.classList.remove('is-finishing');
        resultLoading.classList.add('is-stopped');
        $('mc-look-exposure-overline-text').textContent='CHECK GENERATION STATUS';
      }
      $('mc-look-result-heading').textContent=attemptedSubmission?'GENERATION STATUS':'PREPARATION FAILED';
      $('mc-look-result-progress').textContent=error.message;
      status.textContent=error.message;
      if(attemptedSubmission){
        $('mc-look-result-history').hidden=false;
        // A timed-out paid POST may have succeeded. Never auto-retry or allow
        // an ambiguous second debit without checking the saved job first.
        generate.disabled=true;generate.textContent='Check Image History';
      }else{
        // A failed preparation never spent credits: return to the original
        // photo/prompt editor with the error clearly visible and try again.
        clearResult();
        status.textContent=error.message;
        generate.textContent='Generate';
        if(!showAccessNotice(error))generate.disabled=!hasGenerationInput();
      }
    }
  })();
  $('mc-look-result-again').onclick=()=>{
    if(busy)return;
    clearResult();
    status.textContent='';
    schedulePrice(0);
  };
  $('mc-look-result-download').onclick=()=>{
    if(!resultBlob||!resultURL||!resultOutputId)return;
    const ext=({'image/png':'png','image/jpeg':'jpg','image/webp':'webp'})[resultBlob.type.split(';')[0]]||'png';
    const link=document.createElement('a');
    link.href=resultURL;link.download='pvlab-'+(mood?.id||'mood')+'-'+resultOutputId+'.'+ext;
    document.body.append(link);link.click();link.remove();
  };
  $('mc-look-result-studio').onclick=()=>void (async()=>{
    if(!resultBlob||!mood||busy)return;
    const type=resultBlob.type.split(';')[0],ext=type==='image/jpeg'?'jpg':type==='image/webp'?'webp':'png';
    setBusy(true);
    try{
      const created=new File([resultBlob],'pvlab-'+mood.id+'.'+ext,{type});
      const token=await saveMoodHandoff({file:created,prompt:direction.value.trim()});
      location.assign(moodExploreDestination(mood.id,{handoff:token,moodVariant}));
    }catch(error){setBusy(false);status.textContent=error.message;}
  })();
  $('mc-look-make').onclick=()=>void continueWithMood(true);

  // Mobile navigation follows the native PV Lab links, with a genuine close action.
  const header=$('mc-explore-header'),menu=$('mc-menu-toggle');
  if(header&&menu){
    const closeMenu=()=>{
      header.classList.remove('is-menu-open');
      menu.setAttribute('aria-expanded','false');
      menu.setAttribute('aria-label','Open navigation menu');
    };
    menu.addEventListener('click',()=>{
      const opening=!header.classList.contains('is-menu-open');
      header.classList.toggle('is-menu-open',opening);
      menu.setAttribute('aria-expanded',String(opening));
      menu.setAttribute('aria-label',opening?'Close navigation menu':'Open navigation menu');
    });
    document.addEventListener('click',event=>{if(!header.contains(event.target))closeMenu()});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu()});
    header.querySelectorAll('.mc-navigation a').forEach(link=>link.addEventListener('click',closeMenu));
  }

  window.addEventListener('pageshow',event=>{if(event.persisted){setBusy(false);if(dialog.open)schedulePrice();}});
  const requested=new URLSearchParams(location.search).get('mood');
  if(requested&&moodById(requested))showMood(moodById(requested));
}
if(typeof document!=='undefined')initialize();

