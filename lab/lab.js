import {createAccountMenu} from './account-menu.js?v=20261016-account-menu-edge24';
import {createSceneLibrary,isSceneLibraryPack} from './scene-library.js?v=20261018-elements-visual-profiles1&deckReturn=20261018v1&aboutElements=20261018v1&draftNavigation=20261018v1&geminiRepair=20261020v1';
const studioAccount=createAccountMenu(document.getElementById('studio-account-menu'));
import {createFilmFinishControls,HONG_KONG_FILM_FINISH,FILM_FINISH_RENDER_REVISION} from './film-finish.js?v=20261013-green-preserving-v3&hkPhoto=20261018v1&hkRestore=20261018v1&hkFilmV8=20261019&hkLight=20261021v10';
import {preparePhotoInput,prepareUpscaleInput} from './photo-input.js?v=2';
import {createMoodReferenceLoader,moodReferencePlan,isMoodStyleReference} from './mood-references.js?hkPhotoOriginals=20261018v2&dreamBlurBudget=20261016v1&v=20261013-compact-map2&seedreamlite=1&raveIdentity=1&filmRevision=4&hkContinuity=4&hkScene=5&hkCinematography=1&midnightFlashV2=1&nano21=1&refMode=20261014-contextual-reference1&moodLock=20261014-mood-consistency1&dreamBlur=20261015v1&internalReference=20261016v2&refOnlyDreamBlurFix=20261018v1&hkPhoto=20261018v1&hkVariants=20261018-real1&hkRestore=20261018v1&fisheye=20261020v1&hkRefs=20261022three1';
import {visibleImageReferenceIds} from './image-detail-references.js?v=20261016-hidden-preset1&fisheye=20261020v1&hkRefs=20261022three1';
import {createPrivateMediaCache} from './private-media-cache.js?v=20261012-cache1';
import {loadLabAccount} from './native-account.js?v=20261014-native-photo-picker1&createGallery=20261014-1&generateStable=20261014-1&studioAuth=20261015-1&providerPolicy=20261015-google-only1';
import {createAssetLibrary} from './assets.js?v=20261021-svg-play1';
import {createPrecisionEditor} from './precision-edit.js?v=20261015-eye-repair1';
import {createPricingOverlay} from './pricing-overlay.js?signupResume=20261021-1&v=20261022-editorial-rows1';
import {createCustomerWallet} from './customer-wallet.js?v=20261017-pricing-overlay1&model-rates=1&metaCheckout=20261015-1&freeTrialPause=20261017-1&creditNotice=20261021-owner1';
import {createCustomerImagePricing} from './customer-image-pricing.js?v=20261016-instant-price1&credits=1';
import {customerImagePriceKey,pricedBoundQuotes,imageAutoRatio} from './image-credit-preview.js?v=20261010-customer-credits1&imageRatio=20261016-inherit1';
import {captureReferralCode,claimReferral} from './referral-capture.js?v=20261010-referrals1';
captureReferralCode();
import {createSoul2UI} from './higgsfield-ui.js?v=20261013-character-studio1';
import {VIDEO_MODELS,engineFor,videoLabel} from './video-models.js?v=20261009-extend1&seedance15-4k=1&publicLabels=20261017-1';
import {mountVideoEffectsGallery,resolveVideoEffect} from './video-effects.js?v=20261016-1';
import {createVideoModelPicker} from './video-model-picker.js?v=20261016-wan-mini-priority1';
import {videoCustomerQuoteLabels} from './video-euro-pricing.js?v=20261015-value2';
import {imageModelLabel} from './model-labels.js?v=20261016-krea3-fashion1&nano21=1';
import {REFERENCE_ROLES,REFERENCE_TARGETS,normalizeReferenceLabel,compileImagePrompt,AUTO_IMAGE_REINTERPRET_PROMPT,referenceGuidanceError,referenceRoleAdvisories,canUseReferenceGuidance,builtInMoodReferenceCount} from './reference-guidance.js?dreamBlurBudget=20261016v1&v=20261013-compact-map2&seedreamlite=1&dreamcore=7&syntheticRefs=1&raveIdentity=1&qwen3-zimage=1&nano21=1&refMode=20261014-contextual-reference1&quality=20261016-fashion2&refOnlyDreamBlurFix=20261018v1&elements=20261018-visual-profile1&fisheye=20261020v1&hkRefs=20261022three1&photoOnlyAuto=20261022v3';
import {createInspirationRotation,INSPIRATION_VARIATIONS} from './inspiration-looks.js?v=20261019-chrome1&fisheyeCover=20261021v1';
import {createMoodSelector,moodById,userFacingImagePrompt,imageHistoryCaption} from './moods.js?v=20261018-girard-originals2&20261011-midnight-reverie1&flashStyle=20261018-inspiration1&seedreamlite=1&deckLabelCenter=1&filmDeck=2&filmOptics=2&hd=20261011&raveBudget=1&editorialHD=2&moodImageHD=1&moodDeckSpace=1&raveNight=4&syntheticBudget=1&hongKongRefs=4&dreamcore=7&syntheticRefs=1&raveIdentity=1&filmRevision=4&hkContinuity=4&hkScene=5&hkCinematography=1&midnightFlashV2=1&qwen3-zimage=1&nano21=1&moodLock=20261014-mood-consistency1&dreamBlur=20261015v1&filmCapture=20261016-preserve1&moodDefault2k=20261017v1&hkPhoto=20261018v1&hkVariants=20261018-real1&hkRestore=20261018v1&hkFidelity=20261018v2&hkAtmosphere=20261019v1&kreaMoods=20261020v1&hkCanon=20261020v1&hkImage3=20261020v1&hkLight=20261021v10&fisheye=20261020v1&fisheyeCover=20261021v1&hkRefs=20261022three1';
import {HONG_KONG_VARIANTS} from './hong-kong-variants.js?v=20261018-user-originals2&hkRestore=20261018v1&hkFidelity=20261018v2&hkRefs=20261022three1';
import {createMyMoods} from './my-moods.js?v=20261011-midnight-reverie1&hd=20261011&raveBudget=1&editorialHD=2&editorialHD=2&moodImageHD=1&raveNight=4&hongKongRefs=4&dreamcore=7&syntheticRefs=1&raveIdentity=1&filmRevision=4&hkContinuity=4&hkScene=5&hkCinematography=1&midnightFlashV2=1&moodLock=20261014-mood-consistency1&fisheye=20261020v1&fisheyeCover=20261021v1';
import {takeMoodHandoff,moodGenerationQuote} from './mood-handoff.js?v=20261012-generate1';
import {saveStudioReturnDraft,readStudioReturnDraft,clearStudioReturnDraft,storedImageFile} from './studio-return-draft.js?v=20261016-moods-return1';
import {createMediaReferences} from './media-references.js?v=20261009-extend2';
import { createSessionRequest } from './session-request.js?v=20261015-canonical-studio1';
import { createSoulController } from './soul.js?v=20261014-krea2-training1';
import { PROVIDER_IMAGE_LIMIT, SEEDREAM_INPUT_MAX_PIXELS, UPSCALE_PIXELS, imageDimensions, providerWorkingCopy, seedreamWorkingCopy, canPrepareImagesInBackground, wanUltrawideWorkingCopy, imagePreview, cancelImagePreparation } from './image-tools.js?v=20261011-reference-prewarm1';
import {modelImageInputIssue} from './image-model-limits.js?v=20261010-model-limits1&qwen3-zimage=1&nano21=1';
import {createImageSubmitHandoff} from './image-submit-handoff.js?v=20261011-fast-queue1';
import {createUpscaleResultUI} from './upscale-result-ui.js?v=20261015-flow2';
import {createSeedreamReferencePreparer} from './seedream-reference-prep.js?v=20261011-reference-prewarm1';
import {createReferencePackStudio} from './reference-pack-studio.js?v=20261018-gallery-create2';
import {createVideoStartFrameMaker,attachVideoReferenceBrowserDrop} from './video-start-frame-maker.js?v=20261016-wan-startframe-drop1';
// General-purpose private image-to-video workspace. Credentials never enter browser storage.
const API='https://parallel-vision-lab.parallelvision.workers.dev';
const $=id=>document.getElementById(id), activeStates=new Set(['submitting','queued','running','saving','uncertain']), slotStates=new Set(['submitting','queued','running','uncertain']);
let customerVideoProfile={},customerCreditBalance=0;
let clerk, owner=false, ownerAccount=false, customerMode=false, customerGenerationReady=false, customerTrialGenerationPaused=false, customerBillingReady=false, customerImagePricing=null, imageRatioExplicit=false, soulRatioExplicit=false, userId='', epoch=0, syncing=false, config={}, file=null, sourceId=null, imageRevision=0, busy=false;
let imageSubmissionPending=false,imageSubmissionStage='Sending…',customerPriceIntentPending=false;
let frameMaker=null;
const fastImageHandoff=createImageSubmitHandoff();
const moodReferences=createMoodReferenceLoader({upload:uploadAsset});
const pendingImageCards=new Map();
// Move only the currently edited Image workspace when navigating to Explore.
// IndexedDB stores File blobs privately, and the token is specific to this tab.
function studioReturnPhoto(item){
  if(!item?.file)return null;
  return {file:item.file,name:item.file.name,type:item.file.type,lastModified:item.file.lastModified,
    id:item.id||null,role:item.role||'none',note:item.note||'',target:item.target||'',nonBaseRole:item.nonBaseRole||'',
    elementId:item.elementId||null,elementName:item.elementName||'',elementCategory:item.elementCategory||'',
    elementView:item.elementView,elementCount:item.elementCount};
}
async function saveImageForMoods(){
  if(!owner||tool!=='image'||fashionActive)return false;
  if(busy||imageSubmissionPending)throw Error('Wait until the current Image action finishes before opening Moods.');
  const state={
    settings:settings(),prompt:$('prompt').value,model:imageEngine,processing:imageProcessing,
    referenceMode:imageReferenceMode,imageRatioExplicit,soulRatioExplicit,
    ratio:$('ratio').value,resolution:$('resolution').value,
    count:$('image-count').value,outputFormat:$('output-format').value,
    exactPrompt:$('composer-exact-prompt').checked,source:studioReturnPhoto(file?{file,id:sourceId}:null),
    references:references.map(studioReturnPhoto),
    mood:{selected:moodUI.selected(),intensity:moodUI.intensity(),variant:moodUI.variant()},
    soulCharacter:$('soul-character').value,
    poseStrength:$('pose-strength').value,identityStrength:$('identity-strength').value,
    controlledPoseSeed:$('controlled-pose-seed').value
  };
  await saveStudioReturnDraft(userId,state);
  return true;
}
async function restoreStudioFromMoods(){
  const state=await readStudioReturnDraft(userId);
  if(!state)return false;
  const p=state.settings||{};
  if(p.type!=='image'||!state.model||typeof state.prompt!=='string')
    throw Error('The temporary Image workspace could not be validated.');
  if(busy||imageSubmissionPending)throw Error('Finish the active Image task before restoring your workspace.');
  clearMedia();
  imageEngine=state.model;
  imageProcessing=state.processing==='batch'?'batch':'normal';
  imageReferenceMode=state.referenceMode==='references'?'references':'base';
  $('image-engine').value=imageEngine;
  $('image-processing').value=imageProcessing;
  $('composer-exact-prompt').checked=state.exactPrompt===true;
  if(imageEngine==='soul'){soul.setSelected(p.characterId||state.soulCharacter||'');soul.restore(p);}
  if(imageEngine==='soulpro'){
    soulProModel=['soul2','kontextmax'].includes(p.soulProModel)?p.soulProModel:'ideogram45';
    if(soulProModel==='soul2'){hf.select(p.characterId||'');$('hf-bar-ratio').value=p.aspectRatio||'source';}
    soulProQuality=['very_low','low','medium','high'].includes(p.soulProQuality)?p.soulProQuality:'medium';
    $('soul-pro-model').value=soulProModel;$('soul-pro-quality').value=soulProQuality;
    $('soul-pro-seed').value=p.seed??'';updateSoulProModelUi();
  }
  setTool('image');
  if(state.mood?.selected?.startsWith('custom:'))await myMoods.refresh();
  moodUI.restore(p.moodId? p : {moodId:state.mood?.selected,moodIntensity:state.mood?.intensity,moodVariant:state.mood?.variant},true);
  const chosen=Array.isArray(state.references)?state.references:[];
  if(state.source)await setImage(storedImageFile(state.source),state.source.id||null);
  if(chosen.length){
    await addReferences(chosen.map(storedImageFile),chosen.map(r=>r.id||null),
      chosen.map(r=>({role:r.role,note:r.note,target:r.target,elementId:r.elementId,
        elementName:r.elementName,elementCategory:r.elementCategory,elementView:r.elementView,elementCount:r.elementCount})));
    // Preserve non-base role for a later toggle back to References only.
    for(let i=0;i<chosen.length;i++)if(references[i])references[i].nonBaseRole=chosen[i].nonBaseRole||'none';
  }
  const selectIfAvailable=(id,value)=>{
    const select=$(id);
    if([...select.options].some(o=>o.value===String(value)))select.value=String(value);
  };
  selectIfAvailable('resolution',state.resolution);
  selectIfAvailable('ratio',state.ratio);
  selectIfAvailable('image-count',state.count);
  selectIfAvailable('output-format',state.outputFormat);
  if(imageEngine==='fal'){
    $('pose-strength').value=state.poseStrength||'1';
    $('identity-strength').value=state.identityStrength||'0.7';
    $('controlled-pose-seed').value=state.controlledPoseSeed||'';
  }
  imageRatioExplicit=state.imageRatioExplicit===true;
  soulRatioExplicit=state.soulRatioExplicit===true;
  $('prompt').value=state.prompt;
  update();
  await clearStudioReturnDraft();
  notify('Your Image workspace is restored. No generation was started.');
  return true;
}
function bindExploreMoodsReturn(){
  // Studio has several ways to reach Moods: the Explore link, the account
  // dropdown's My Moods link and the footer. Intercept all same-tab links,
  // without altering the visual design or a modified/open-in-new-tab click.
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href]');
    if(!link||event.defaultPrevented||event.button!==0||
      event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const destination=new URL(link.href,location.href);
    if(destination.origin!==location.origin||
      !/\/(?:moods|moods\.html|mood-creator\.html)$/.test(destination.pathname))return;
    if(!owner||tool!=='image'||fashionActive)return;
    event.preventDefault();
    if(link.dataset.savingDraft==='1')return;
    link.dataset.savingDraft='1';link.setAttribute('aria-busy','true');
    void saveImageForMoods().then(()=>location.assign(destination.href)).catch(error=>{
      notify('Could not preserve your Image workspace: '+error.message,true);
      link.removeAttribute('aria-busy');delete link.dataset.savingDraft;
    });
  });
}
bindExploreMoodsReturn();
function renderPendingImageCards(){
  const visible=owner&&tool==='image'&&!fashionActive&&!assetLibrary?.active();
  for(const card of $('history').querySelectorAll('[data-local-submission]'))
    if(!visible||!pendingImageCards.has(card.dataset.localSubmission))card.remove();
  if(!visible)return;
  for(const entry of [...pendingImageCards.values()].reverse()){
    let card=[...$('history').children].find(el=>el.dataset.localSubmission===entry.id);
    if(!card){
      card=document.createElement('article');card.className='card submission-card';
      card.dataset.localSubmission=entry.id;card.dataset.job=entry.id;card.dataset.kind='image';card.dataset.deletable='false';card.dataset.ratio=String(entry.ratio);
      const content=document.createElement('div');content.className='submission-progress';
      const mark=document.createElement('span');mark.className='submission-mark';mark.setAttribute('aria-hidden','true');
      const title=document.createElement('strong');title.className='submission-title';
      const detail=document.createElement('span');detail.className='submission-detail';
      const dismiss=document.createElement('button');dismiss.className='submission-dismiss';dismiss.type='button';dismiss.textContent='Dismiss';
      dismiss.onclick=()=>{pendingImageCards.delete(entry.id);syncImageGalleryEmpty();};
      content.append(mark,title,detail,dismiss);card.append(content);$('history').prepend(card);
    }
    card.dataset.state=entry.error?'submission-error':'preparing';card.setAttribute('aria-busy',String(!entry.error));
    card.querySelector('.submission-title').textContent=entry.title;
    card.querySelector('.submission-detail').textContent=entry.detail;
    card.querySelector('.submission-dismiss').hidden=!entry.error;
  }
  if(pendingImageCards.size)$('emptyarchive').hidden=true;
}
function beginImageFeedback(count,selected,ratio){
  for(const [id,entry] of pendingImageCards)if(entry.error)pendingImageCards.delete(id);
  const ids=Array.from({length:count},()=> 'local-'+crypto.randomUUID());
  for(const id of ids)pendingImageCards.set(id,{id,ratio,title:'Preparing',detail:detailModelName({settings:selected}),error:false});
  syncImageGalleryEmpty();
  let drivesComposerButton=true;
  return {
    detachButton(){drivesComposerButton=false;},
    phase(title,detail=''){
      const publicTitle=['Uploading references','Preparing provider files','Optimizing references'].includes(title)?'Preparing image':title;
      for(const id of ids){const entry=pendingImageCards.get(id);if(entry){entry.title=publicTitle;entry.detail='';}}
      if(drivesComposerButton&&imageSubmissionPending){
        imageSubmissionStage=publicTitle+'…';
        // Keep the paid action fixed; progress lives outside the Generate button.
        const status=$('image-composer-status');
        if(status){status.textContent=imageSubmissionStage;status.hidden=false;}
      }
      renderPendingImageCards();
    },
    accept(){const id=ids.shift();if(id)pendingImageCards.delete(id);renderPendingImageCards();},
    fail(error,dispatched){
      const first=ids.shift();
      for(const id of ids.splice(0))pendingImageCards.delete(id);
      const entry=pendingImageCards.get(first);
      if(entry){entry.error=true;entry.title=dispatched?'Request not confirmed':'Could not prepare';entry.detail=dispatched?'Check History before trying again. '+error.message:error.message;}
      syncImageGalleryEmpty();
    },
    finish(){for(const id of ids)pendingImageCards.delete(id);syncImageGalleryEmpty();}
  };
}
let assetLibrary=null;
let sceneLibrary=null;
let retouchActive=false;
let fashionActive=false,fashionController=null,fashionMount=null;
function studioRoute(){const value=new URLSearchParams(location.search).get('tool');return ['image','retouch','video','upscale','assets','fashion'].includes(value)?value:'image';}
function syncStudioRoute(value,{push=false,retouchFrom=null}={}){
  if(!owner)return;
  const url=new URL(location.href);
  if(url.searchParams.get('tool')===value)return;
  url.searchParams.set('tool',value);
  const state={...(history.state||{}),pvLabRetouchEntry:push&&value==='retouch',pvLabRetouchFrom:push&&value==='retouch'?retouchFrom:null};
  if(push)history.pushState(state,'',url);
  else history.replaceState(state,'',url);
}
async function restoreStudioEntry(requestedRoute=studioRoute()){
  const route=requestedRoute,query=new URLSearchParams(location.search);
  if(query.get('returnToDraft')==='1'){
    // This is navigation only; never auto-generate or submit a quote.
    await restoreStudioFromMoods();
    const clean=new URL(location.href);
    clean.searchParams.delete('returnToDraft');
    history.replaceState(history.state,'',clean);
    if(route==='retouch')await openRetouch({push:false,autofill:false});
    else if(route==='fashion')await openFashionStudio();
    else if(route==='assets')await assetLibrary.open();
    else if(route!=='image')setTool(route);
    return;
  }
  if(route==='assets')await assetLibrary.open();
  else if(route==='fashion')await openFashionStudio();
  else if(route==='retouch')await openRetouch({push:false,autofill:false});
  else if(route==='image'&&(query.has('moodboard')||query.has('mood'))){
    // Plain Mood links only select a look. A one-shot, priced Generate
    // handoff is the only entry point that submits a job here.
    const moodId=query.get('mood'),boardId=query.get('moodboard');
    if(moodId&&!moodById(moodId)){
      notify('That curated Mood no longer exists. Choose another look in Moods.',true);
      return;
    }
    if(boardId&&!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(boardId)){
      notify('Invalid personal Mood link.',true);return;
    }
    try{
      setTool('image');
      let title='Mood';
      if(boardId){
        await myMoods.refresh();
        const personal=myMoods.find(boardId);
        if(!personal)throw Error('This saved Mood is not available on your account.');
        moodUI.restore({moodId:'custom',customMoodBoardId:boardId,moodIntensity:personal.intensity},true);
        title=personal.name;
      }else{
        const mood=moodById(moodId);
        moodUI.restore({moodId:mood.id,moodIntensity:mood.defaultIntensity||70,...(mood.id==='hong-kong-nights'?{moodVariant:query.get('variation')||'original'}:{})},true);
        title=mood.name;
      }
      if(imageEngine==='seedream')$('resolution').value='2k';
      let hadPhoto=false,generation=null;
      if(query.has('handoff')){
        try{
          const packet=await takeMoodHandoff(query.get('handoff'));
          if(packet.generation){
            generation=packet.generation;
            // Restore the exact default used to price this request, even if
            // the previous Image workspace used another model or batch size.
            clearMedia();imageEngine='seedream';imageProcessing='normal';imageReferenceMode='base';
            $('image-engine').value='seedream';setTool('image');
            $('resolution').value='2k';$('image-count').value='1';
          }
          if(packet.file){await addReferences([packet.file],generation?.sourceId?[generation.sourceId]:[]);hadPhoto=true;}
          if(generation){
            // First uploaded Base controls ratio, not the internal Mood optics.
            if(hadPhoto)syncDefaultRatio(true);
            else $('ratio').value='16:9';
          }
          if(packet.prompt)$('prompt').value=packet.prompt;
        }finally{
          // The handoff token is one-shot; a refresh may still re-select the
          // Mood but cannot accidentally replay a private draft photograph.
          const clean=new URL(location.href);
          clean.searchParams.delete('handoff');
          history.replaceState(history.state,'',clean);
        }
      }
      update();
      if(generation){await submitMoodGeneration(generation,moodId);return;}
      notify(title+' is selected. '+(hadPhoto?'Your photograph is ready. ':'')+'Press Generate when you are ready. No generation was submitted.');
    }catch(error){notify('Could not prepare your Mood. '+error.message,true);}
  }else if(['image','video','upscale'].includes(route)){
    // Direct tool links must win over any stale editor selection from boot or config.
    // Never silently convert a Video/Upscaler URL into an Image URL.
    if(tool!==route)setTool(route);
    else syncStudioRoute(route);
  }
}
async function submitMoodGeneration(generation,moodId){
  const q=moodGenerationQuote(generation,{userId,moodId});
  if(!owner||!config.enabled||customerMode&&!customerGenerationReady)throw Error('Image generation is not available for this account yet.');
  if(busy||imageSubmissionPending||submissionBlocked())throw Error('The generation queue is busy. Review Image before trying again.');
  const sessionEpoch=epoch;
  imageSubmissionPending=true;imageSubmissionStage='Generating…';update();
  const ratio=references[0]?.width/references[0]?.height;
  const feedback=beginImageFeedback(1,q.settings,ratio>0?ratio:16/9);
  let dispatched=false;
  try{
    feedback.phase('Submitting','Starting '+(moodById(moodId)?.name||'your Mood')+'.');
    dispatched=true;
    await submitQuotedGeneration(q,sessionEpoch);
    feedback.finish();
  }catch(error){
    feedback.fail(error,dispatched);
    notify(error.message,true);
  }finally{
    if(epoch===sessionEpoch){imageSubmissionPending=false;imageSubmissionStage='Sending…';update();}
  }
}
let sourceUrl=null, lastFile=null, lastSourceId=null, lastUrl=null, references=[], mode='start';
let lastVideoCreateMode='reference',initialVideoEntryConfigured=false;
let engine='seedance', imageEngine='seedream', imageProcessing='normal', soulProModel='soul2', soulProQuality='medium', soulProIdentity={configured:false,count:0,refs:[]}, soulProPackSelection=[], soulProPackUrls=[], poseMapSourceId=null, repairTarget=null, repairImage=null, repairMaskCanvas=null, repairMaskDirty=false;
let tool='image', packs=[],resultKind='video',resultExt='mp4';
const videoModelPicker=createVideoModelPicker({select:$('video-engine'),getBusy:()=>busy,isActive:()=>tool==='video'&&owner&&!fashionActive&&!assetLibrary?.active()});
let resultUrl=null, resultId=null, resultSettings=null, previewRevision=0, autoPreview=null, currentQuote=null, next=null, activeJob=null, timer=null, historyRevision=0;
let activeJobs=[], polling=false, historySelectMode=false, historySelected=new Set();
const downloadUrls=new Set();
const workingCopies=new Map();
// Prefetch only local files. Uploads, quotes and credits remain at their
// existing explicit generation/price-check boundaries.
const seedreamPreparer=createSeedreamReferencePreparer({
  pixelCopy:seedreamWorkingCopy,byteCopy:providerWorkingCopy,
  canBackground:canPrepareImagesInBackground
});
function prewarmSeedreamReference(item){
  if(!owner||tool!=='image'||imageEngine!=='seedream')return;
  const task=seedreamPreparer.warm(item);
  // Speculative failures stay silent. Generate can retry the normal path.
  if(task)void task.catch(()=>{});
}
function prewarmSeedreamDeck(){
  if(!owner||tool!=='image'||imageEngine!=='seedream')return;
  for(const item of references)prewarmSeedreamReference(item);
}
let upscaleQuote=null,upscaleQuoteNeedsCheck=false,upscaleQuoteTimer=null,upscalePriceMessage='',upscaleManualReviewRequired=false,upscaleManualReviewKey='';
let upscaleEngine='seedvr2';
const UPSCALE_MODELS=Object.freeze({
  seedvr2:{name:'SeedVR2',provider:'ByteDance · fal.ai',model:'fal-ai/seedvr/upscale/image',pricing:'https://fal.ai/models/fal-ai/seedvr/upscale/image',price:'Provider estimate: $0.001 per output megapixel.',description:'Restore photographic detail in hair, skin and fabric. Choose 2× or 4× enlargement, up to 32 megapixels. Generative restoration can subtly alter details.'},
  spicy:{name:'Image Upscaler v1',provider:'SpicyAPI',model:'spicyapi/image-upscaler-v1/upscale',pricing:'https://spicyapi.ai/models/image-upscaler-v1',price:'Published price: $0.012 per image, the same for every size and file format.',description:'Enlarge one finished image, keeping its framing and aspect ratio. Size tiers are approximately 4, 17 and 67 megapixels. Choose a tier above your source size. No prompt, creativity or face controls.'},
  'topaz-precision':{name:'Topaz Precision',provider:'FAL',model:'topaz/upscale/image/precision',pricing:'https://fal.ai/models/topaz/upscale/image/precision',price:'Published price: $0.08 per started 24 megapixels of output.',description:'Enlarge while preserving the photograph. Standard V2 is the general option; High Fidelity V3 is for detailed sources. Choose 2× or 4× width and height. Face enhancement and cropping stay off.'},
  'topaz-wonder':{name:'Topaz Wonder 3.5',provider:'FAL',model:'topaz/upscale/image/generative',pricing:'https://fal.ai/models/topaz/upscale/image/generative',price:'Published price: $0.08 per started 8 megapixels of output.',description:'Restore small or blurry images with reconstructed detail. Texture and facial details may change. Choose 2× or 4× width and height. Face enhancement and cropping stay off.'}
});
let sourcePixels=0, sourceWidth=0, sourceHeight=0;
let ratioSourceKey='';
// New image drafts start by editing their first photo. Existing saved jobs
// and explicit References only selections still restore per draft.
function preferredImageReferenceMode(){return 'base';}
let imageReferenceMode=preferredImageReferenceMode();
let referenceIntentOpen=false;
let myMoods=null;
// Only the explicit six-card Inspiration flow is text-only; manual Mood selection retains its own references.
let inspirationMoodId=null;
const moodUI=createMoodSelector({panel:$('composer-moods'),button:$('image-composer-moods'),getEngine:()=>imageEngine,
  chooseEngine:engine=>{if(busy)return;$('image-engine').value=engine;$('image-engine').dispatchEvent(new Event('change',{bubbles:true}));},
  onOpen:()=>{
    closeReferenceIntent();closeImageModelMenu();closeComposerLibrary();closeComposerAddMenu();toggleImageSettings(false);
    if(myMoods)void myMoods.refresh().catch(()=>{/* Curated Moods remain usable while personal boards are unavailable. */});
  },
  onCreatePersonal:()=>location.assign('./mood-creator.html?start=idea'),
  onEditPersonal:board=>location.assign('./mood-creator.html?board='+encodeURIComponent(board.id)),
  onChange:change=>{
    if(change?.selectedMood||!moodUI.active())inspirationMoodId=null;
    // A newly selected Mood starts at the approved 2K Seedream quality.
    // A later explicit resolution choice is still respected.
    if(change?.selectedMood&&moodUI.selected()&&imageEngine==='seedream'&&!busy)
      $('resolution').value='2k';
    autoPreview=null;update();
    // Bypass the generic typing debounce on an intentional Mood selection.
    if(change?.selectedMood)customerImagePricing?.prime();
  }
});
myMoods=createMyMoods({api,assetBlob,moodUI,notify:(...args)=>notify(...args),active:()=>owner});
$('image-reference-mode').onchange=()=>setImageReferenceMode($('image-reference-mode').value);
function referencesOnly(){return usesReferenceGuidance()&&imageReferenceMode==='references';}
function closeReferenceIntent(){
  referenceIntentOpen=false;
  $('composer-reference-intent').hidden=true;
  $('composer-reference-intent-toggle').setAttribute('aria-expanded','false');
}
function syncReferenceIntentUi(){
  const eligible=tool==='image'&&usesReferenceGuidance();
  const toggle=$('composer-reference-intent-toggle'),panel=$('composer-reference-intent');
  const identityRefs=referencesOnly()?references:references.slice(1);
  const identityButton=$('composer-reference-same-person');
  identityButton.hidden=!eligible||(referencesOnly()?identityRefs.length<2:identityRefs.length<1);
  identityButton.disabled=busy;
  identityButton.setAttribute('aria-pressed',String(identityRefs.length>0&&identityRefs.every(ref=>ref.role==='identity')));
  toggle.hidden=!eligible;toggle.disabled=busy;
  if(!eligible){closeReferenceIntent();return;}
  toggle.textContent=(referencesOnly()?'References only':'Base image')+' ⌄';
  // Only narrow phones use this short display label; the control action stays unchanged.
  toggle.dataset.compactLabel=referencesOnly()?'Refs ⌄':'Base ⌄';
  toggle.title=referencesOnly()?'Create a new composition using all images as references.':'Build on the first image. Your prompt can change anything.';
  toggle.setAttribute('aria-expanded',String(referenceIntentOpen));
  panel.hidden=!referenceIntentOpen;
  for(const button of panel.querySelectorAll('[data-reference-intent]')){
    button.setAttribute('aria-pressed',String(button.dataset.referenceIntent===imageReferenceMode));
    button.disabled=busy||(imageEngine==='kling'&&button.dataset.referenceIntent==='references');
  }
}
function openReferenceIntent(){
  if(busy||tool!=='image'||!usesReferenceGuidance())return;
  moodUI.close();closeImageModelMenu();closeComposerLibrary();toggleImageSettings(false);
  referenceIntentOpen=true;syncReferenceIntentUi();
}
function setImageReferenceMode(value){
  if(busy||!usesReferenceGuidance()||!['base','references'].includes(value)||(imageEngine==='kling'&&value==='references'))return;
  if(imageReferenceMode===value){closeReferenceIntent();update();return;}
  imageReferenceMode=value;
  autoPreview=null;
  closeReferenceIntent();renderReferences();syncDefaultRatio(!imageRatioExplicit);update();
}
function applySamePerson(){
  if(busy||!usesReferenceGuidance()||!references.length)return;
  const targets=referencesOnly()?references:references.slice(1);
  if(!targets.length)return;
  for(const ref of targets){ref.role='identity';ref.nonBaseRole='identity';ref.target='';}
  autoPreview=null;closeReferenceIntent();renderReferences();update();
}
$('composer-reference-intent-toggle').onclick=()=>referenceIntentOpen?closeReferenceIntent():openReferenceIntent();
$('composer-reference-intent-close').onclick=closeReferenceIntent;
for(const button of $('composer-reference-intent').querySelectorAll('[data-reference-intent]'))
  button.onclick=()=>setImageReferenceMode(button.dataset.referenceIntent);
$('composer-reference-same-person').onclick=applySamePerson;
document.addEventListener('pointerdown',event=>{
  if(referenceIntentOpen&&!event.target.closest('#composer-reference-intent,#composer-reference-intent-toggle'))closeReferenceIntent();
});
document.addEventListener('keydown',event=>{
  if(referenceIntentOpen&&event.key==='Escape')closeReferenceIntent();
});
const cardUrls=new Set(), requestControllers=new Set();
// Private, bounded session cache. Gallery and viewer share original bytes and
// in-flight reads; each surface owns its own revocable object URL.
const deviceMediaCache=createPrivateMediaCache();
const assetBlobs=new Map(),assetReads=new Map();
const thumbnailBlobs=new Map(),thumbnailReads=new Map();
let assetBlobBytes=0,thumbnailBytes=0;
function clearAssetCache(){
  assetBlobs.clear();assetReads.clear();assetBlobBytes=0;
  imageDetailPrefetchQueue.length=0;releaseImageDetailPreview();
  thumbnailBlobs.clear();thumbnailReads.clear();thumbnailBytes=0;
}
async function assetBlob(id){
  if(!owner)throw new Error('Sign in first.');
  const cached=assetBlobs.get(id);
  if(cached){assetBlobs.delete(id);assetBlobs.set(id,cached);return cached;}
  if(assetReads.has(id))return assetReads.get(id);
  const generation=epoch;
  const pending=(async()=>{
    const local=await deviceMediaCache.get('original:'+id);
    if(!owner||generation!==epoch)throw Error('Session changed.');
    if(local)return local;
    const blob=await api('/api/assets/'+encodeURIComponent(id),{blob:true});
    if(owner&&generation===epoch)void deviceMediaCache.put('original:'+id,blob);
    return blob;
  })().then(blob=>{
    if(owner&&generation===epoch&&blob.type.startsWith('image/')&&blob.size>0&&blob.size<=32*1048576){
      assetBlobs.set(id,blob);assetBlobBytes+=blob.size;
      while(assetBlobs.size>24||assetBlobBytes>96*1048576){
        const oldest=assetBlobs.keys().next().value;
        assetBlobBytes-=assetBlobs.get(oldest).size;assetBlobs.delete(oldest);
      }
    }
    return blob;
  }).finally(()=>{if(assetReads.get(id)===pending)assetReads.delete(id);});
  assetReads.set(id,pending);return pending;
}
// Image cards use lightweight private R2 WebP previews. Image viewers, Download,
// Reuse, Upscale and source editing still call assetBlob() for the original.
async function assetThumbnailBlob(id){
  if(!owner)throw new Error('Sign in first.');
  const cached=thumbnailBlobs.get(id);
  if(cached){thumbnailBlobs.delete(id);thumbnailBlobs.set(id,cached);return cached;}
  if(thumbnailReads.has(id))return thumbnailReads.get(id);
  const generation=epoch;
  const pending=(async()=>{
    const local=await deviceMediaCache.get('preview:'+id);
    if(!owner||generation!==epoch)throw Error('Session changed.');
    if(local)return local;
    const blob=await api('/api/assets/'+encodeURIComponent(id)+'/thumbnail',{blob:true});
    if(owner&&generation===epoch)void deviceMediaCache.put('preview:'+id,blob);
    return blob;
  })().then(blob=>{
    if(!blob?.type?.startsWith('image/')||!blob.size)throw Error('Thumbnail unavailable');
    if(owner&&generation===epoch&&blob.size<=2*1048576){
      thumbnailBlobs.set(id,blob);thumbnailBytes+=blob.size;
      while(thumbnailBlobs.size>80||thumbnailBytes>12*1048576){
        const oldest=thumbnailBlobs.keys().next().value;
        thumbnailBytes-=thumbnailBlobs.get(oldest).size;thumbnailBlobs.delete(oldest);
      }
    }
    return blob;
  }).catch(error=>{if(!owner||generation!==epoch)throw error;return assetBlob(id);}).finally(()=>{
    if(thumbnailReads.get(id)===pending)thumbnailReads.delete(id);
  });
  thumbnailReads.set(id,pending);return pending;
}
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:4}).format(n);
// Keep Upscaler progress and confirmation alongside its paid action controls.
function syncNoticePlacement(){
  const notice=$('notice'),slot=$('upscale-notice-slot'),inline=tool==='upscale'&&owner&&!assetLibrary?.active()&&!fashionActive;
  if(inline&&notice.parentElement!==slot)slot.append(notice);
  else if(!inline&&notice.parentElement===slot)$('archive-rest-anchor').before(notice);
  slot.hidden=!inline||!notice.textContent.trim()||!notice.classList.contains('error');
}
function clearImageComposerNotice(){
  const status=$('image-composer-status');
  if(!status)return;
  status.hidden=true;status.replaceChildren();status.classList.remove('is-import-error');
  status.setAttribute('role','status');
}
function isContentRestriction(message){
  // All generation providers use different refusal wording. Match content-policy
  // refusals, not transport errors, payment failures or generic provider rejection.
  const reason=String(message||'');
  return /content[_\s-]*policy[_\s-]*violation|flagged by (?:a )?content (?:checker|filter)|(?:content|safety)[_\s-]*(?:checker|filter)[_\s-]*(?:blocked|rejected|flagged)|(?:blocked|rejected|flagged) (?:by|for|due to) (?:a |the )?(?:content|safety|moderation)|moderation[_\s-]*(?:rejected|blocked|failed)|\bNSFW\b|prohibited (?:sexual |adult )?content|sexual(?:ly)? explicit content (?:is )?not allowed|\b(?:blocked|rejected|refused|denied|flagged)\b.{0,120}\b(?:content|safety)[_\s-]*(?:moderation|policy|filter|guidelines)\b|\b(?:content|safety)[_\s-]*(?:moderation|policy|filter|guidelines)\b.{0,120}\b(?:blocked|rejected|refused|denied|flagged|violation)\b|unsafe[_\s-]*content/i.test(reason);
}
function contentRestrictionGuidance(job){
  const label=job?.settings?.type==='video'?videoLabel(job.settings):galleryImageModelName(job);
  return label+" couldn't process this request under its content guidelines. Try a different direction or explore another model.";
}
function jobCreditsReturned(job){
  return !!(customerMode&&job?.status==='failed'&&Number(job.creditCost)>0);
}
function imageFailureHeading(message){
  const reason=String(message||'').replace(/^Generation failed:\s*/i,'');
  if(isContentRestriction(reason))return 'Not with this model.';
  if(/^Image too small for /i.test(reason))return 'Image too small for model';
  if(/^Unsupported image proportions for /i.test(reason))return 'Unsupported image ratio';
  if(/^(?:Image too large for |Batch input too large for |SpicyAPI image uploads are limited|Nano Banana Pro references exceed|Use smaller reference images:|Kling needs |This Batch would exceed|File or request is too large)/i.test(reason)||/\bHTTP 413\b/i.test(reason))return 'Image exceeds model limit';
  return 'Generation failed';
}
function showImageComposerError(message){
  const reason=String(message||'').replace(/^Generation failed:\s*/i,'');
  if(tool!=='image'||!owner||assetLibrary?.active())return;
  const status=$('image-composer-status');if(!status)return;
  const large=reason.match(/^Image too large: (.+) \(([\d.]+) MB\)\./);
  const small=reason.match(/^Image too small: (.+) \((\d+) × (\d+) px\)\./);
  const dimensions=reason.match(/^Image dimensions too large: (.+) \((\d+) × (\d+) px\)\./);
  const dimensionsLimit=dimensions?reason.match(/Maximum ([\d,]+) pixels per side\./)?.[1]||'8,000':null;
  const proportions=reason.match(/^Unsupported image proportions: (.+) \((\d+) × (\d+) px\)\./);
  const format=reason.match(/^Unsupported image format: (.+)\. Use JPG, PNG or WebP\.$/);
  const fileName=large?.[1]||small?.[1]||dimensions?.[1]||proportions?.[1]||format?.[1]||'';
  const originalDimensions=small||dimensions||proportions;
  const measurement=large?large[2]+' MB':originalDimensions?originalDimensions[2]+' × '+originalDimensions[3]+' px':'';
  const moderation=isContentRestriction(reason);
  const modelHeading=imageFailureHeading(reason),isModelInputError=modelHeading!=='Generation failed'&&!moderation;
  const isFileError=!!(fileName||reason.startsWith('This image is empty.')||reason.startsWith('No image was provided.')||isModelInputError);
  const heading=large?'Image too large':small?'Image too small':dimensions?'Image dimensions too large':proportions?'Unsupported proportions':format?'Unsupported format':reason.startsWith('This image is empty.')?'Empty file':moderation?'Not with this model.':isModelInputError?modelHeading:isFileError?'Image unavailable':message.startsWith('Generation failed:')||imageSubmissionPending?'Generation failed':'Request failed';
  const detail=large?'Maximum file size is 20 MB. Compress this image and try again.':
    small?'Minimum dimensions are 240 × 240 px. Choose a larger image.':
    dimensions?'Each side must be '+dimensionsLimit+' px or smaller. Resize this image.':
    proportions?'Image proportions exceed the supported 8:1 range.':
    format?'Use a JPG, PNG or WebP image.':
    reason.startsWith('This image is empty.')?'Choose an image containing actual picture data.':
    reason.startsWith('No image was provided.')?'Drop or browse for an image file.':moderation?'This model could not process the request under its content guidelines. Edit the prompt or choose another model.':reason;
  const el=(tag,className,text)=>{const node=document.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const icon=el('span','import-toast-icon','!');icon.setAttribute('aria-hidden','true');
  const copy=el('span','import-toast-copy');
  copy.append(el('span','import-toast-kicker',isFileError?'PV LAB / IMAGE INPUT':'PV LAB / NOTICE'));
  copy.append(el('strong','import-toast-title',heading));
  if(fileName){
    const file=el('span','import-toast-file');
    const name=el('span','import-toast-filename',fileName);name.title=fileName;
    file.append(name);
    if(measurement)file.append(el('span','import-toast-measure',measurement));
    copy.append(file);
  }
  copy.append(el('span','import-toast-detail',detail));
  if(isFileError){
    const limits=el('span','import-toast-limits');
    if(isModelInputError){
      limits.append(el('span','import-toast-limit',modelHeading==='Image too small for model'?'MODEL MINIMUM':modelHeading==='Unsupported image ratio'?'MODEL ASPECT RATIO':'MODEL SIZE LIMIT'));
      limits.append(el('span','import-toast-limit','ORIGINAL KEPT'));
    }else{
      limits.append(el('span','import-toast-limit','MIN 240 × 240 PX'));
      limits.append(el('span','import-toast-limit','MAX 20 MB'));
      limits.append(el('span','import-toast-limit','JPG / PNG / WEBP'));
    }
    copy.append(limits);
  }
  const dismiss=el('button','import-toast-dismiss','×');dismiss.type='button';
  dismiss.setAttribute('aria-label','Dismiss PV Lab notification');
  dismiss.onclick=clearImageComposerNotice;
  status.replaceChildren(icon,copy,dismiss);
  status.classList.add('is-import-error');
  status.setAttribute('role','alert');
  status.hidden=false;
}
const notify=(text,error=false)=>{
  const notice=$('notice');notice.textContent=text;notice.classList.toggle('error',error);
  syncNoticePlacement();
  if(error)showImageComposerError(text);
  else clearImageComposerNotice();
};
function release(url){if(url)URL.revokeObjectURL(url);}
function isSoul2(){return tool==='image'&&imageEngine==='soulpro'&&soulProModel==='soul2';}
const hf=createSoul2UI({api,uploadAsset,assetPhoto:composerAssetPhoto,notify,getPacks:()=>packs,onChange:()=>{composerLibraryKey='';update();},onJob:job=>{if(activeStates.has(job.status))setActive(job);surfaceHistoryJob(job);refreshHistorySoon();}});
function referenceRoles(){return references.map(r=>normalizeReferenceLabel({name:r.file.name,role:r.role||'none',note:r.note||'',target:r.target||'',
  elementId:r.elementId,elementName:r.elementName,elementCategory:r.elementCategory,elementView:r.elementView,elementCount:r.elementCount}));}
// Switching to a text-only model parks photos in the editor, it never deletes them.
function imageInputReferences(){return tool==='image'&&imageEngine==='zspicy'?[]:references;}
function usesReferenceGuidance(){return tool==='image'&&['seedream','seedreamlite','gemini','gemini21','flash','kling','qwen3','krea3'].includes(imageEngine);}
function imageGuidance(){
  const labels=referenceRoles(),mood=moodUI.enrich(effectiveImagePrompt(),{engine:imageEngine,referenceCount:references.length,referenceMode:imageReferenceMode});
  const current={type:'image',mode:'image',engine:imageEngine,referenceMode:imageReferenceMode,exactPrompt:$('composer-exact-prompt').checked,...mood.metadata};
  try{
    // Inspiration examples use only the explicit prompt and the user's visible attachments.
    const planned=inspirationMoodId===current.moodId
      ?{settings:{...current,prompt:mood.prompt,referenceRoles:labels},references:[]}
      :moodReferencePlan({...current,prompt:mood.prompt,referenceRoles:labels});
    const prompt=compileImagePrompt(planned.settings.prompt,planned.settings.referenceRoles,current);
    const limit=imageEngine==='seedreamlite'?3000:5000;
    const over=prompt.length-limit;
    const budgetError=over>0?'Direction, Mood and reference instructions exceed '+limit.toLocaleString()+' characters by '+over.toLocaleString()+'. Keep the Mood; shorten your direction or optional reference notes.':'';
    return {prompt,error:(imageEngine==='qwen3'&&labels.length>3?'Qwen Image 3.0 supports at most three reference photographs. Remove the others.':'')||referenceGuidanceError(labels,current)||budgetError||mood.error};
  }catch(error){return {prompt:compileImagePrompt(mood.prompt,labels,current),error:error.message};}
}
function updateComposerPromptBudget(){
  const counter=$('composer-prompt-budget');
  if(!counter)return;
  const visible=tool==='image'&&usesReferenceGuidance()&&(moodUI.active()||references.length>0);
  const promptTop=$('image-composer').querySelector('.image-composer-top');
  // Keep numbers invisible while writing. Warn only when the full compiled
  // prompt exceeds its limit, without adding an extra deck row.
  counter.hidden=true;
  promptTop.classList.remove('has-prompt-budget');
  if(!visible)return;
  const {prompt}=imageGuidance(),limit=imageEngine==='seedreamlite'?3000:5000;
  const remaining=limit-prompt.length;
  const over=remaining<0;
  counter.textContent=over?(-remaining).toLocaleString()+' characters over limit':remaining.toLocaleString()+' left';
  counter.classList.toggle('is-over',over);
  counter.hidden=!over;
  promptTop.classList.toggle('has-prompt-budget',over);
  counter.title=prompt.length.toLocaleString()+' / '+limit.toLocaleString()+' characters including written direction, Mood and reference instructions.';
}
function updateReferenceGuidance(){
  $('ref-count').textContent=references.length+' / '+referenceLimit();
  $('reference-drop').querySelector('small').textContent=tool==='image'&&imageEngine==='zspicy'?'Text-only model · no reference photos':'JPG / PNG / WebP · up to '+referenceLimit()+' photos';
  const panel=$('reference-guidance'),active=usesReferenceGuidance();panel.hidden=!active||!references.length;
  if(!active)return;
  const {prompt,error}=imageGuidance();
  $('reference-guidance-text').textContent=prompt;
  $('reference-guidance-count').textContent=prompt.length.toLocaleString()+' / '+(imageEngine==='seedreamlite'?'3,000':'5,000')+' characters';
  const warning=$('reference-guidance-warning'),advisories=referenceRoleAdvisories(referenceRoles());
  warning.textContent=[error,...advisories].filter(Boolean).join(' ');warning.hidden=!error&&!advisories.length;warning.classList.toggle('error',!!error);
  const referenceVendor=['kling','krea3'].includes(imageEngine)?'FAL':['gemini','gemini21'].includes(imageEngine)?'Google':'SpicyAPI';
  $('reference-provider').textContent=imageModelLabel({engine:imageEngine})+' · '+referenceVendor;
  $('reference-help').textContent=referencesOnly()?'Create a new composition from references. General references are prompt-guided; optional roles specify exactly what each image contributes.':'The first photo is the base, but the prompt can change it. Optional roles define what to borrow from other references.';
  $('prompt-label').textContent=references.length?'Image direction (optional)':'Image direction';
}
function isReinterpret(){return tool==='image'&&imageEngine==='soul'&&soul.mode()==='reinterpret';}
function sourceHelp(){return tool==='upscale'?'Choose the finished image to enlarge. Its framing and aspect ratio are kept.':tool==='image'&&imageEngine==='soulpro'?'Choose the exact source photograph. It controls pose, body, camera and scene.':'Choose the exact opening frame.';}
function isFalUpscale(){return tool==='upscale'&&upscaleEngine!=='spicy';}
function upscaleMode(p){return Object.hasOwn(UPSCALE_MODELS,p?.upscaleEngine)?p.upscaleEngine:'seedvr2';}
function upscaleName(p){const model=UPSCALE_MODELS[upscaleMode(p)];return model.name+(upscaleMode(p)==='topaz-precision'?' / '+(p.topazModel||'Standard V2'):'')+' · '+model.provider;}
function upscaleSize(p){return p.targetWidth&&p.targetHeight?p.targetWidth+' × '+p.targetHeight:p.scale?p.scale+'×':String(p.resolution||'').toUpperCase();}
const UPSCALE_PUBLIC_ENGINES=Object.freeze(['seedvr2','topaz-precision','topaz-wonder']);
const UPSCALE_MODEL_UI=Object.freeze({
  seedvr2:{brand:'ByteDance Premium',version:'SeedVR2'},
  'topaz-precision':{brand:'Topaz Precision',version:'Standard V2'},
  'topaz-wonder':{brand:'Topaz Wonder',version:'3.5'}
});
function closeUpscaleModelMenu(focusTrigger=false){
  const menu=$('upscale-model-menu'),trigger=$('upscale-model-trigger');
  if(menu.hidden)return;
  menu.hidden=true;trigger.setAttribute('aria-expanded','false');
  if(focusTrigger)trigger.focus({preventScroll:true});
}
function openUpscaleModelMenu(){
  if(tool!=='upscale'||busy||!config.falEnabled)return;
  const menu=$('upscale-model-menu'),trigger=$('upscale-model-trigger');
  menu.hidden=false;trigger.setAttribute('aria-expanded','true');
  (menu.querySelector('[data-upscale-engine="'+upscaleEngine+'"]')||menu.querySelector('button'))?.focus({preventScroll:true});
}
function updateUpscaleModel(){
  // Provider diagnostics are for the verified PV LAB owner, never customer accounts.
  for(const diagnostic of $('upscale-info').querySelectorAll('[data-upscale-owner-only]'))diagnostic.hidden=!ownerAccount;
  const active=tool==='upscale',fal=isFalUpscale(),model=UPSCALE_MODELS[upscaleEngine];$('upscale-model-control').hidden=true;$('upscale-model-display').hidden=!active;$('upscale-topaz-control').hidden=!active||upscaleEngine!=='topaz-precision';$('upscale-scale-control').hidden=!fal;$('mode-heading').parentElement.classList.toggle('upscale-mode',active);
  if(!active)closeUpscaleModelMenu();
  const shown=UPSCALE_MODEL_UI[upscaleEngine]||UPSCALE_MODEL_UI.seedvr2;
  $('upscale-engine').value=upscaleEngine;
  $('upscale-model-brand').textContent=shown.brand;
  $('upscale-model-id').textContent=upscaleEngine==='topaz-precision'?$('upscale-topaz-model').value:shown.version;
  $('upscale-model-trigger').setAttribute('aria-label','Choose upscale model, currently '+shown.brand+' '+$('upscale-model-id').textContent);
  $('upscale-model-trigger').disabled=!active||busy||!config.falEnabled;
  for(const item of $('upscale-model-menu').querySelectorAll('[data-upscale-engine]'))item.setAttribute('aria-checked',String(item.dataset.upscaleEngine===upscaleEngine));
  for(const option of $('upscale-engine').options)option.disabled=option.value!=='spicy'&&!config.falEnabled;
  if(!active)return;
  $('resolution-control').hidden=fal;$('engine-name').textContent=model.name.toUpperCase()+' · '+model.provider.toUpperCase();
  const liveUpscaleSettings=settings();
  $('upscale-technical-summary').textContent=upscaleName(liveUpscaleSettings)+' / '+upscaleSize(liveUpscaleSettings)+' / source ratio';
  $('upscale-model-name').textContent=upscaleName(liveUpscaleSettings);$('upscale-model-description').textContent=model.description+(fal&&upscaleEngine!=='seedvr2'?' Lab output limit: approximately 67 megapixels.':'');$('upscale-published-price').textContent=model.price;$('upscale-pricing-link').href=model.pricing;
  $('upscale-content-label').textContent=fal?'FAL content restrictions':'No added SpicyAPI filter';$('upscale-content-note').textContent=fal?'Sexually explicit content is not allowed.':'The model may still refuse an input.';$('upscale-content-link').href=fal?'https://fal.ai/legal/acceptable-use-policy':model.pricing;
  $('upscale-price-help').textContent='Optional · no generation charge';
  $('generation-help').textContent=fal?'Premium Upscale starts one paid upscaling job. PV LAB checks the provider estimate and output dimensions before submission; provider billing is authoritative.':'Upscale starts one paid upscaling job. You can check its live price above first; there is no extra price-review popup. Inputs over 10 MiB need a working copy; the Lab prepares it automatically and keeps the original.';
}
function upscalePriceKey(){return JSON.stringify({epoch,imageRevision,sourceId,tool,settings:tool==='upscale'?settings():null});}
function clearUpscalePrice(){clearTimeout(upscaleQuoteTimer);upscaleQuoteTimer=null;upscaleQuote=null;upscaleQuoteNeedsCheck=false;upscalePriceMessage='';upscaleManualReviewRequired=false;upscaleManualReviewKey='';}
function invalidateUpscalePrice(message){
  clearTimeout(upscaleQuoteTimer);upscaleQuoteTimer=null;
  if(upscaleQuote||upscaleQuoteNeedsCheck||upscaleManualReviewRequired){upscaleQuote=null;upscaleQuoteNeedsCheck=true;upscalePriceMessage=message;upscaleManualReviewRequired=false;upscaleManualReviewKey='';}
}
function expireUpscalePrice(message){
  clearTimeout(upscaleQuoteTimer);upscaleQuoteTimer=null;upscaleQuote=null;upscaleQuoteNeedsCheck=false;upscalePriceMessage=message;upscaleManualReviewRequired=false;upscaleManualReviewKey='';
}
function requireUpscaleManualReview(key,message){
  clearTimeout(upscaleQuoteTimer);upscaleQuoteTimer=null;upscaleQuote=null;upscaleQuoteNeedsCheck=true;upscaleManualReviewRequired=true;upscaleManualReviewKey=key;upscalePriceMessage=message;
}
function updateUpscalePrice(){
  const active=tool==='upscale',fal=isFalUpscale(),key=upscalePriceKey();$('upscale-price').hidden=!active;
  if(upscaleManualReviewRequired&&upscaleManualReviewKey&&upscaleManualReviewKey!==key){upscaleManualReviewRequired=false;upscaleManualReviewKey='';upscaleQuoteNeedsCheck=false;upscalePriceMessage='Settings changed. A fresh estimate will be checked automatically when you upscale.';}
  if(upscaleQuote&&upscaleQuote.key!==key)invalidateUpscalePrice(fal?'Image or settings changed. A fresh estimate will be checked automatically when you upscale.':'Image or settings changed. Check live price again before upscaling.');
  if(upscaleQuote&&Date.now()>=upscaleQuote.quote.expiresAt)expireUpscalePrice(fal?'Estimate expired. A fresh estimate will be checked when you upscale.':'Live quote expired. A fresh price will be checked when you upscale.');
  if(active&&(upscaleQuoteNeedsCheck||upscaleManualReviewRequired))$('upscale-info').open=true;
  $('upscale-check-price').disabled=!active||!owner||!file||busy||!(fal?config.falEnabled:config.enabled);
  $('upscale-check-price').textContent=fal?(upscaleQuoteNeedsCheck?'Check price & size again':'Check price & size'):(upscaleQuoteNeedsCheck?'Check live price again':'Check live price');
  const q=upscaleQuote?.quote;
  $('upscale-price-status').textContent=customerMode&&q?('Estimated credit charge: '+(Number.isSafeInteger(q.creditCost)?q.creditCost+' credits':wallet.describe(q.maxUsd))+'. Valid until '+new Date(q.expiresAt).toLocaleTimeString()+'. No generation submitted.'):q?(q.priceIsEstimate?('Estimated charge: '+money(q.estimatedUsd)+' USD. '+q.settings.sourceWidth+' × '+q.settings.sourceHeight+' to '+q.settings.targetWidth+' × '+q.settings.targetHeight+' output. Not a guaranteed maximum. Valid until '+new Date(q.expiresAt).toLocaleTimeString()+'. No generation submitted.'):('Live price: '+money(q.estimatedUsd)+' USD'+(q.maxUsd!==q.estimatedUsd?' · maximum '+money(q.maxUsd)+' USD':'')+'. Valid until '+new Date(q.expiresAt).toLocaleTimeString()+'. No generation submitted.')):upscalePriceMessage||(fal?'Check the estimated charge and output dimensions before upscaling.':'Check the price for this image before upscaling, or use Upscale directly.');
  if(active&&(fal&&!config.falEnabled||(!fal&&upscaleQuoteNeedsCheck)||upscaleManualReviewRequired))$('generate').disabled=true;
  if(active&&q)$('generate').textContent=customerMode?'Upscale · '+(Number.isSafeInteger(q.creditCost)?q.creditCost+' credits':wallet.describe(q.maxUsd)):'Upscale · '+(q.priceIsEstimate?'est. ':q.maxUsd!==q.estimatedUsd?'max ':'')+money(q.priceIsEstimate?q.estimatedUsd:q.maxUsd);
  else if(active&&customerMode)$('generate').textContent=upscaleEngine==='seedvr2'?'Upscale · '+(Number($('upscale-scale').value)===4?18:10)+' credits':'Upscale';
}
function validateUpscaleQuote(q,selected){
  const which=upscaleMode(selected),fal=which!=='spicy',p=q?.settings,wrong=!q||!p||q.provider!==(fal?'fal.ai':'SpicyAPI')||p.model!==UPSCALE_MODELS[which].model||p.type!=='image'||p.mode!=='upscale'||upscaleMode(p)!==which||p.outputFormat!==selected.outputFormat||!q.id||!Number.isFinite(q.estimatedUsd)||q.estimatedUsd<0||!Number.isFinite(q.maxUsd)||q.maxUsd<q.estimatedUsd||!Number.isFinite(q.expiresAt)||q.expiresAt<=Date.now();
  if(wrong||customerMode&&(!Number.isSafeInteger(q.creditCost)||q.creditCost<1)||fal&&(q.priceIsEstimate!==true||q.requiresPriceReview!==true||p.scale!==selected.scale||(which!=='seedvr2'&&p.topazModel!==selected.topazModel)||![p.sourceWidth,p.sourceHeight,p.targetWidth,p.targetHeight].every(n=>Number.isSafeInteger(n)&&n>0)||p.targetWidth!==p.sourceWidth*selected.scale||p.targetHeight!==p.sourceHeight*selected.scale)||!fal&&p.resolution!==selected.resolution)throw new Error('No usable upscale quote was returned for these settings. Nothing was submitted.');
}
function effectiveImagePrompt(){const typed=$('prompt').value.trim();if(typed)return typed;const base=tool==='image'&&imageReferenceMode==='base'&&imageInputReferences().length>0&&['seedream','seedreamlite','flash','kling','qwen3','gemini','gemini21','krea3'].includes(imageEngine);if(!base)return '';if(moodUI.active())return 'Create a natural photographic variation of the base image, preserving its subject and overall composition.';return AUTO_IMAGE_REINTERPRET_PROMPT;}
function settings(){if(tool==='upscale')return isFalUpscale()?{type:'image',mode:'upscale',upscaleEngine,scale:Number($('upscale-scale').value),...(upscaleEngine==='topaz-precision'?{topazModel:$('upscale-topaz-model').value}:upscaleEngine==='topaz-wonder'?{topazModel:'Wonder 3.5'}:{}),prompt:'',resolution:$('upscale-scale').value+'x',aspectRatio:'source',outputFormat:$('output-format').value,referenceRoles:[]}:{type:'image',mode:'upscale',upscaleEngine:'spicy',prompt:'',resolution:$('resolution').value,aspectRatio:'auto',outputFormat:$('output-format').value,referenceRoles:[]};if(isSoul2())return {type:'image',provider:'higgsfield',engine:'soulpro',soulProModel:'soul2',mode:'identity-edit',prompt:$('prompt').value.trim(),...hf.parameters(),seed:$('soul-pro-seed').value,aspectRatio:$('hf-bar-ratio').value,outputFormat:'png',referenceRoles:[]};if(tool==='image'&&imageEngine==='soulpro')return {type:'image',provider:'fal',engine:'soulpro',mode:'identity-edit',soulProModel,soulProQuality,prompt:$('prompt').value.trim(),sourceWidth,sourceHeight,seed:$('soul-pro-seed').value,resolution:'source',aspectRatio:'source',outputFormat:'png',referenceRoles:[]};if(tool==='image'&&imageEngine==='fal')return {type:'image',provider:'fal',engine:'fal',mode:'controlled-pose',prompt:$('prompt').value.trim(),resolution:'1k',aspectRatio:$('ratio').value,outputFormat:'png',poseStrength:Number($('pose-strength').value),identityStrength:Number($('identity-strength').value),seed:$('controlled-pose-seed').value,referenceRoles:referenceRoles()};if(tool==='image'){const mood=moodUI.enrich(effectiveImagePrompt(),{engine:imageEngine,referenceCount:imageInputReferences().length,referenceMode:imageEngine==='zspicy'?'base':imageReferenceMode});const base={type:'image',engine:imageEngine,processing:imageProcessing,referenceMode:imageEngine==='zspicy'?'base':imageReferenceMode,mode:'image',prompt:mood.prompt,...mood.metadata,...(mood.metadata?.moodId?{moodOriginalPrompt:$('prompt').value.trim()}:{}),resolution:imageEngine==='soul'?'native':$('resolution').value,aspectRatio:$('ratio').value,outputFormat:['seedream','seedreamlite','flash','kling','qwen3','krea3','zspicy'].includes(imageEngine)?'png':$('output-format').value,referenceRoles:['soul','zspicy'].includes(imageEngine)?[]:referenceRoles(),exactPrompt:$('composer-exact-prompt').checked===true};return imageEngine==='soul'?{...base,provider:soul.isKrea()?'fal':'spicy',trainer:soul.isKrea()?'krea2':'qwen2512',characterId:soul.selectedId(),identityStrength:soul.strength(),...(isReinterpret()?{...soul.reinterpretSettings(),resolution:$('resolution').value,aspectRatio:'source'}:{})}:base;}return {type:'video',engine,mode,...(mode==='extend'||engine==='klinghf'?{provider:'higgsfield'}:{}),referenceVideos:['reference','extend'].includes(mode)?mediaRefs.labels('video'):[],referenceAudio:mode==='reference'?mediaRefs.labels('audio'):[],prompt:$('prompt').value.trim(),duration:Number($('duration').value),resolution:$('resolution').value,aspectRatio:mode==='extend'?'auto':$('ratio').value,seed:mode==='extend'||engine==='klinghf'?null:$('seed').value,audio:$('audio').checked,cameraFixed:engine==='seedance15'&&$('video-camera-lock').checked,referenceRoles:referenceRoles(),referencePixels:engine==='h3maxfal'?references.map(r=>r.width*r.height):[]};}
function hasInput(){if(tool==='video'&&mode==='extend')return mediaRefs.labels('video').length===1&&!!$('prompt').value.trim();if(tool==='upscale')return !!file;if(tool==='image'&&imageEngine==='soulpro')return isSoul2()?hf.ready()&&(!!file||!!$('prompt').value.trim()):!!file&&soulProIdentity.configured;if(tool==='image'&&imageEngine==='fal'){const roles=referenceRoles(),poses=roles.filter(r=>r.role==='pose').length,identities=roles.filter(r=>r.role==='identity').length;return !!$('prompt').value.trim()&&references.length>=2&&references.length<=5&&poses===1&&identities>=1&&identities<=4&&poses+identities===references.length;}if(tool==='image'&&imageEngine==='soul')return isReinterpret()?soul.reinterpretReady()&&!!file:soul.ready()&&!!$('prompt').value.trim();if(tool==='image'&&imageEngine==='zspicy')return !!$('prompt').value.trim();if(usesReferenceGuidance())return !imageGuidance().error&&(!!effectiveImagePrompt()||references.length>0);return tool==='image'||mode==='text'?(tool==='image'?!!effectiveImagePrompt():!!$('prompt').value.trim()):mode==='start'?!!file:references.length>0||(engine==='seedance'&&mediaRefs.count()>0);}
function syncVideoFrameCards(){
  for(const [id,url] of [['video-start-thumb',sourceUrl],['video-end-thumb',lastUrl]]){const img=$(id);if(!img)continue;img.hidden=!url;img.parentElement.classList.toggle('has-frame',!!url);if(url&&img.getAttribute('src')!==url)img.src=url;else if(!url)img.removeAttribute('src');}
}
function currentImageSubmissionKey(selected=null,count=null){
  if(tool!=='image')return '';
  const frozen=selected||settings();
  const sourceMode=imageEngine==='soulpro'||isReinterpret();
  const imageSources=sourceMode?[sourceUrl||sourceId||'']:imageInputReferences().map(r=>r.url||r.id||'');
  return JSON.stringify([frozen,imageSources,count??(Number($('image-count').value)||1)]);
}
function imageCreditQuoteSnapshot(){
  if(!customerMode||!owner||!customerGenerationReady||customerCreditBalance<=0||tool!=='image'||fashionActive||busy||imageSubmissionPending||!hasInput())return null;
  const selected=structuredClone(settings());
  const count=Math.max(1,Math.min(imageEngine==='gemini'&&imageProcessing==='batch'?20:4,Number($('image-count').value)||1));
  const sourceMode=imageEngine==='soulpro'||isReinterpret();
  const chosen=sourceMode?(file?[{file,id:sourceId,url:sourceUrl,width:sourceWidth,height:sourceHeight}]:[]):
    imageEngine==='soul'?[]:imageInputReferences().map(ref=>({file:ref.file,id:ref.id,url:ref.url,width:ref.width,height:ref.height,ref}));
  const key=customerImagePriceKey({
    sessionEpoch:epoch,settings:selected,count,images:sourceMode?[]:chosen,
    source:sourceMode&&file?{file,url:sourceUrl,width:sourceWidth,height:sourceHeight}:null
  });
  return {key,settings:selected,count,chosen,sourceMode,provider:currentProvider(),
    disableAutoMoodReferences:inspirationMoodId!==null&&selected.moodId===inspirationMoodId};
}
function customerImageProviderReady(){
  const provider=currentProvider();
  return provider==='higgsfield'?!!config.higgsfieldEnabled:
    provider==='gemini'?!!config.geminiEnabled:
    provider==='fal'?!!config.falEnabled:
    !!config.enabled;
}
async function fetchCustomerImagePrice(s,check){
  const {provider,count,chosen,sourceMode}=s;
  let selected=s.settings;
  if(provider==='spicy'||provider==='higgsfield'){
    const originals=[];
    for(const item of chosen){
      check();
      let id=item.id;
      if(!id){
        id=await uploadAsset(item.file);check();
        if(item.ref&&references.includes(item.ref)&&item.ref.file===item.file)item.ref.id=id;
        if(sourceMode&&file===item.file)sourceId=id;
      }
      originals.push({id,file:item.file,width:item.width,height:item.height});
    }
    check();
    const curated=s.disableAutoMoodReferences
      ?{settings:selected,references:[]}
      :await moodReferences.prepare(selected,{sessionKey:epoch,check});
    selected=curated.settings;originals.push(...curated.references);
    let inputs={sourceId:sourceMode?originals[0]?.id||null:null,lastSourceId:null,
      referenceSourceIds:sourceMode?[]:originals.map(item=>item.id)};
    if(provider==='spicy'){
      inputs=await prepareQuoteInputs(inputs,{originals,engine:selected.engine});check();
      if(!inputs)throw new Error('Price checking was cancelled. Nothing was charged.');
      const reply=await api('/api/quotes',{method:'POST',
        body:{...inputs,settings:selected,...(count>1?{count}:{})}});
      check();
      const priced=pricedBoundQuotes(reply,count,'SpicyAPI');
      if(priced.quotes.some(q=>q.settings?.engine!==selected.engine||q.settings?.type!=='image'||q.settings?.resolution!==selected.resolution))
        throw new Error('Provider priced a different image model.');
      return {...priced,provider,inputs};
    }
    const quote=await api('/api/higgsfield/quote',{method:'POST',body:{...inputs,settings:selected}});
    check();
    const priced=pricedBoundQuotes(quote,1,'Higgsfield');
    if(quote.settings?.characterId!==selected.characterId||quote.sourceId!==inputs.sourceId)
      throw new Error('The Soul 2 quote does not match the selected identity or photograph.');
    return {...priced,provider,inputs};
  }
  const priced=await api('/api/customer/image-price',{
    method:'POST',body:{settings:selected,count}
  });
  check();
  if(priced?.kind!=='server-estimate'||priced.source!=='backend-model-rate'||
     priced.count!==count||!Number.isSafeInteger(priced.credits)||priced.credits<1)
    throw new Error('PV Lab could not verify this model price.');
  return {...priced,provider};
}
function applyCustomerImagePriceToGenerate(){
  if(!customerMode||tool!=='image'||fashionActive){
    customerImagePricing?.sync(false);return;
  }
  // The customer's first Generate click may be waiting on its live bound quote.
  // Do not cancel that exact quote while the one-click intent is pending.
  if(customerPriceIntentPending)return;
  const button=$('generate');
  if(!customerGenerationReady){
    customerImagePricing?.sync(false);
    delete button.dataset.credits;
    // A genuine signed-in customer may prepare a prompt and local photographs
    // while complimentary generation is paused. Generate opens pricing, never
    // submits a disabled job, without creating any account privileges.
    const showPlans=customerTrialGenerationPaused&&customerBillingReady&&
      window.__PV_LAB_NATIVE__!==1&&hasInput()&&!busy&&!imageSubmissionPending;
    button.disabled=!showPlans;
    button.textContent='Generate';
    button.title=showPlans
      ?'Choose credits to start creating. Your prompt and photographs will be preserved.'
      :customerTrialGenerationPaused?'Choose credits when you are ready to create.'
      :'Customer generation and checkout are not enabled yet.';
    return;
  }
  if(busy||imageSubmissionPending||!hasInput()||button.disabled||!customerImageProviderReady()){
    customerImagePricing?.sync(false);return;
  }
  delete button.dataset.credits;
  const quote=customerImagePricing?.sync(true);
  if(quote?.status==='ready'){
    const estimated=quote.kind==='server-estimate';
    button.textContent='Generate';
    button.dataset.credits=(estimated?'~':'')+quote.credits.toLocaleString()+' credits';
    button.title=estimated?'Backend-calculated estimate. The server validates the cost again before submission.':
      'Live, bound provider quote. The amount updates with your selections.';
  }else if(quote?.status==='error'){
    button.textContent='Generate';
    button.title=(quote.message||'Could not check price. No generation was submitted.')+' Click Generate to retry the quote.';
  }else if(quote?.status==='checking'){
    button.textContent='Generate';
    // A live quote still has to arrive before any paid submission, but it
    // must not block the button. A click will reuse/await that exact quote.
    button.title='Ready to generate. The verified credit price is being confirmed before submission.';
  }
}

// Choosing a model prepares a local draft; only generation uses spending eligibility.
function videoSelectionEngines(){
  return customerMode&&!customerGenerationReady
    ?config.videoPreparationEngines||config.videoEngines||[]
    :config.videoEngines||[];
}
function customerVideoAccess(){
  if(customerVideoProfile.accountClosed)return {label:'Account closed',message:'This account is closed. Contact PV LAB support for account or billing help.'};
  if(customerVideoProfile.billingReview)return {label:'Generation paused',message:'A refund or dispute is under review. Contact PV LAB support; your saved work remains available.'};
  if(customerTrialGenerationPaused&&customerBillingReady)return {pricing:true,label:'Generate',message:''};
  if(customerVideoProfile.promotionReview)return {label:'Generation paused',message:'Free generation is unavailable for this account. Contact PV LAB support for a review; your saved work remains available.'};
  return {label:'Video temporarily unavailable',message:'Video generation is currently unavailable for this account. Your prompt and photographs stay in place. Contact PV LAB support for help.'};
}
function applyCustomerVideoAccess(){
  $('generation-help').style.display='';
  if(!customerMode||tool!=='video')return;
  const button=$('generate');
  // Provider setup belongs to the owner, never to a retail customer.
  if(customerGenerationReady){button.textContent='Generate';button.title='';return;}
  const access=customerVideoAccess();
  button.textContent=access.label;button.title=access.message;
  if(!access.pricing)button.disabled=true;
  $('generation-help').textContent=access.message;
  $('generation-help').style.display=access.message?'block':'none';
}
function update(){syncVideoFrameCards();$('app').classList.toggle('extension-loaded',tool==='video'&&mode==='extend'&&mediaRefs.labels('video').length>0);if(tool==='video'&&mode==='extend')$('video-ref-count').textContent=mediaRefs.labels('video').length+' / 1';$('save').textContent=tool==='video'?'Save draft':tool==='upscale'?'Save upscale draft':'Save draft';$('clear').textContent=tool==='image'?'Reset editor':'Clear';if($('soul-base-preview')){$('soul-base-preview').hidden=!sourceUrl;if(sourceUrl)$('soul-base-preview').src=sourceUrl;else $('soul-base-preview').removeAttribute('src');$('soul-base-name').textContent=file?.name||'';}const current=settings(),p=resultSettings||current,ratio=p.aspectRatio==='auto'?(p.mode==='reference'?'adaptive':'source ratio'):p.aspectRatio,imageName=p.mode==='upscale'?'Upscale':imageModelLabel(p),resolution=p.resolution==='native'?'native':String(p.resolution||'').toUpperCase();$('settings-summary').textContent=p.mode==='upscale'?upscaleName(p)+' / '+upscaleSize(p)+' / source ratio':p.type==='image'?imageName+' / '+resolution+' / '+ratio:`${videoLabel(p)} / ${p.duration}s / ${p.resolution} / ${ratio}`;$('save').disabled=!owner||!hasInput()||busy;$('clear').disabled=(!file&&!lastFile&&!references.length&&!mediaRefs.count()&&!resultUrl&&!$('prompt').value.trim())||busy;const provider=currentProvider(),ready=provider==='openrouter'?config.openrouterEnabled:provider==='higgsfield'?config.higgsfieldEnabled:provider==='gemini'?config.geminiEnabled:provider==='fal'?config.falEnabled:config.enabled,soulBlocked=tool==='image'&&imageEngine==='soul'&&(!config.soulTrainingEnabled||!soul.ready()||(isReinterpret()&&!soul.reinterpretReady()));$('generate').disabled=!owner||!hasInput()||(tool!=='upscale'&&!isReinterpret()&&imageEngine!=='soulpro'&&!current.prompt&&!(usesReferenceGuidance()&&references.length>0))||busy||imageSubmissionPending||customerPriceIntentPending||(tool==='image'&&fastImageHandoff.has(currentImageSubmissionKey()))||submissionBlocked()||soulBlocked||(tool==='image'&&moodUI.invalid(imageEngine,$('prompt').value,imageInputReferences().length,imageEngine==='zspicy'?'base':imageReferenceMode))||(tool==='upscale'&&((!isFalUpscale()&&upscaleQuoteNeedsCheck)||upscaleManualReviewRequired));$('generate').textContent=ready?(tool==='image'?'Generate':tool==='upscale'?'Upscale':'Generate'):(provider==='openrouter'?'Connect OpenRouter':provider==='higgsfield'?'Higgsfield API not connected':provider==='gemini'?'Gemini API not connected':provider==='fal'?'FAL API not connected':'Connect generation provider');$('generation-help').textContent=tool==='image'&&imageEngine==='qwen3'?'Qwen Image 3.0 · text or up to 3 image references · 2K by default. SpicyAPI returns a bound quote including references.':tool==='image'&&imageEngine==='zspicy'?'Z-Image Spicy · text-to-image only · up to 1536 pixels per side. A bound SpicyAPI quote appears before generation.':tool==='image'&&imageEngine==='seedreamlite'?'Seedream 5 Lite · 2K · up to 10 photo references · live SpicyAPI quote.':tool==='image'&&imageEngine==='flash'?'Seedream Flash · $0.018 estimated per image · OpenRouter. '+(config.openrouterEnabled?'':'Add OPENROUTER_API_KEY in the Worker secrets to connect. '):tool==='image'&&imageEngine==='kling'?'Kling V3 · $0.028 estimated per image · FAL. Text or one base image; 1K / 2K.':isSoul2()?'PV Soul uses one base image and an optional trained Soul ID, NOT multiple reference photos. '+(hf.current()?'Selected identity: '+hf.current().name+'. ':'NO SOUL ID: results will not preserve Nina. ')+(customerMode?'Soul 2 uses PV Lab credits at its confirmed live quote.':'Review the live Higgsfield price and confirm before any generation; provider billing is authoritative.'):tool==='image'&&imageEngine==='soulpro'?(soulProIdentity.configured?(soulProModel==='ideogram45'?'One base image only. Nina identity loads automatically. Ideogram Precise keeps edit_precision=high; selected quality estimate: '+({very_low:'$0.008',low:'$0.03',medium:'$0.06',high:'$0.22'}[soulProQuality]||'$0.06')+' per image.':'One base image only. Nina identity loads automatically. Kontext Max uses the base plus up to 3 identity refs because its total image limit is 4. Estimate: $0.08 per image.'):'Set Nina identity once, then every Soul Pro render needs only one base image.'):tool==='image'&&imageEngine==='fal'?'Controlled Pose uses FAL DWPose + FLUX EasyControl. One Pose role and 1–4 Identity roles are required. Preview Pose is a small separate fal.ai compute charge.':tool==='image'&&imageEngine==='soul'?(isReinterpret()?'One base photograph and a separately trained Soul identity. High fidelity may keep the original face; lower it for more change. The live provider quote controls the charge.':'PV Soul Text uses your trained Qwen Image 2512 identity. The live provider quote is authoritative.'):tool==='image'&&imageEngine==='gemini'?(imageProcessing==='batch'?'Batch uses the same Nano Banana Pro model at 50% of standard API price. It runs asynchronously and can take minutes or hours; Google targets completion within 24 hours.':'Normal sends Nano Banana Pro immediately. 1K/2K are estimated at $0.134 per image and 4K at $0.24; Google billing is authoritative.'):(tool==='image'?'Generate starts one paid image at the live provider price, within your daily spending limit. No price-review popup.':tool==='upscale'?'Upscale starts one paid upscaling job. You can check its live price above first; there is no extra price-review popup.':'A live quote appears before any paid video.')+' Inputs over 10 MiB need a working copy; the Lab prepares it automatically and keeps the original. Saving a draft does not generate or charge.';for(const el of document.querySelectorAll('.controls input,.controls select,.controls textarea,.mode-tab,.tool-tab'))el.disabled=busy;updateReferenceGuidance();updateUpscaleModel();updateUpscalePrice();applyCustomerImagePriceToGenerate();syncImageComposer();applyCustomerVideoAccess();videoModelPicker.sync();frameMaker?.sync();}
function options(id,values,value){$(id).replaceChildren(...values.map(v=>new Option(v==='auto'?'Follow reference':v==='source'?'Source':v.toUpperCase(),v)));$(id).value=value;}
function syncDefaultRatio(force=false){
  const select=$('ratio'),values=[...select.options].map(o=>o.value);
  if(tool==='upscale'||(tool==='image'&&(imageEngine==='soulpro'||isReinterpret())))return;
  if(force)imageRatioExplicit=false;
  const ref=referencesOnly()||tool==='image'&&imageEngine==='zspicy'?null:references.find(r=>r.role==='base')||references.find(r=>r.role==='pose')||references[0];
  const source=referencesOnly()||tool==='image'&&imageEngine==='zspicy'?null:tool==='image'&&imageEngine==='soul'?null:tool==='video'&&mode==='text'?null:
    tool==='video'&&mode==='start'?(file?{width:sourceWidth,height:sourceHeight}:null):ref||((tool==='image'&&file)?{width:sourceWidth,height:sourceHeight}:null);
  const key=[tool,imageEngine,imageReferenceMode,mode,source?.width||0,source?.height||0,ref?.url||sourceUrl||'',values.join(',')].join(':');
  if(!force&&key===ratioSourceKey)return;
  ratioSourceKey=key;
  select.value=imageAutoRatio({values,reference:source,explicit:tool==='image'&&imageRatioExplicit&&!force,current:select.value,defaultRatio:'16:9',resolveSourceRatio:tool==='image'});
}

function setFashionActive(active){
  if(fashionActive===active)return;
  fashionActive=active;
  $('app').classList.toggle('fashion-studio-active',active);
  $('fashion-studio').hidden=!active;
  for(const name of ['image','video','upscale','fashion']){
    const selected=active?name==='fashion':!retouchActive&&name===tool;
    $('tool-'+name).classList.toggle('active',selected);
    $('tool-'+name).setAttribute('aria-pressed',String(selected));
  }
  syncImageStudioMode();syncVideoStudioMode();syncStudioNav();
}
async function openFashionStudio(){
  if(!owner)return;
  if(busy)return;
  if(retouchActive)leaveRetouch();
  ++previewRevision;syncStudioRoute('fashion');
  assetLibrary?.close();
  if($('soul-pro-identity-dialog').open)$('soul-pro-identity-dialog').close();
  $('video').pause();
  setFashionActive(true);
  const host=$('fashion-studio');
  const sessionClient={
    get session(){return owner?clerk?.session:null;},
    get isSignedIn(){return owner&&!!clerk?.session;},
    openSignIn:()=>clerk?.openSignIn()
  };
  try{
    if(!fashionMount){
      host.setAttribute('aria-busy','true');
      fashionMount=import('./fashion-studio.js?v=20261010-deck01&firstReady=20261015-1&singleFooter=20261015-1')
        .then(({mountFashionStudio})=>mountFashionStudio(host,{sessionClient,onNavigate:setTool}))
        .then(controller=>{fashionController=controller;return controller;})
        .catch(error=>{fashionMount=null;throw error;});
    }
    const controller=await fashionMount;
    if(!owner)controller.lock();else await controller.sync();
  }catch(error){
    notify(error.message,true);
    if(!host.shadowRoot){
      const retry=document.createElement('button');retry.type='button';retry.textContent='Retry loading Fashion';
      retry.onclick=()=>void openFashionStudio();host.replaceChildren(retry);
    }
  }finally{host.setAttribute('aria-busy','false');}
}

function setTool(value){
  if(value==='retouch'){void openRetouch({autofill:true});return;}
  // Retouch keeps the Image composer mounted. Do not reset its settings on return.
  if(value==='image'&&retouchActive&&tool==='image'){
    leaveRetouch();syncStudioRoute('image');syncStudioNav();return;
  }
  if(retouchActive)leaveRetouch();
  if(value==='fashion'){void openFashionStudio();return;}
  if(value==='assets'){void viewMedia(()=>assetLibrary.open());return;}
  setFashionActive(false);
  const nextTool=['image','video','upscale'].includes(value)?value:'image';
  const galleryChanged=nextTool!==tool||!!assetLibrary?.active();
  assetLibrary?.close();
  if($('soul-pro-identity-dialog').open)$('soul-pro-identity-dialog').close();
  const toolChanged=tool!==nextTool;
  if(effectViewOpen){effectViewOpen=false;updateEffectUrl(false);}
  if(nextTool!=='video')activeVideoEffect=null;
  tool=nextTool;syncStudioRoute(tool);const image=tool==='image',upscale=tool==='upscale',video=tool==='video';
  // Seedance Create begins in a reference-friendly editor. Explicit opening-image
  // handoffs and subsequent choices retain their original provider mode.
  if(video&&!initialVideoEntryConfigured){initialVideoEntryConfigured=true;if(engine==='seedance'&&mode==='start'&&!file)mode='reference';}
  $('app').classList.toggle('upscale-studio-active',upscale);
  if(toolChanged){$('notice').textContent='';$('notice').classList.remove('error');}
  syncNoticePlacement();
  for(const name of ['image','video','upscale']){$('tool-'+name).classList.toggle('active',tool===name);$('tool-'+name).setAttribute('aria-pressed',String(tool===name));}$('soul-launch').hidden=!image;
  $('video-modes').hidden=!video;$('duration-control').hidden=!video;$('image-model-control').hidden=!image;$('engine-name').hidden=image;$('image-processing-control').hidden=!image||imageEngine!=='gemini';$('soul-pro-settings').hidden=!image||imageEngine!=='soulpro';$('controlled-pose-settings').hidden=!image||imageEngine!=='fal';$('image-count-control').hidden=!image||imageEngine==='fal'||imageEngine==='soulpro'||imageEngine==='soul'&&soul.isKrea();$('video-utilities').hidden=!video;$('format-control').hidden=video||(image&&['seedream','seedreamlite','flash','kling','qwen3','krea3','zspicy','gemini','gemini21','fal','soulpro'].includes(imageEngine));$('soul-controls').hidden=!image||imageEngine!=='soul';
  $('start-mode').hidden=(image&&imageEngine!=='soulpro')||video&&mode!=='start';$('reference-mode').hidden=upscale||video&&mode!=='reference'||image&&['soul','soulpro','zspicy'].includes(imageEngine);
  $('last-upload').hidden=upscale||image&&imageEngine==='soulpro';$('start-label').textContent=upscale?'Image to upscale':image&&imageEngine==='soulpro'?'Base image':'Start frame';
  $('upscale-info').hidden=!upscale;$('prompt').hidden=upscale;$('prompt-label').hidden=upscale;$('resolution-control').hidden=image&&(imageEngine==='soul'&&!isReinterpret()||imageEngine==='fal'||imageEngine==='soulpro');$('ratio-control').hidden=upscale||image&&imageEngine==='soulpro';
  $('mode-heading').textContent=upscale?'03 / Image Upscale':image&&imageEngine==='soulpro'?'02 / PV Soul Pro · Nina Reinterpret':image?'02 / Text to Image + Reference Edit':'01 / Image to Video';
  $('engine-name').textContent=upscale?'BYTEDANCE SEEDVR2':image?(imageEngine==='gemini21'?'NANO BANANA 2.1':imageEngine==='gemini'?'NANO BANANA PRO':imageEngine==='soulpro'?'PV SOUL PRO':imageEngine==='soul'?'PV SOUL':imageEngine==='fal'?'CONTROLLED POSE · FAL':imageEngine==='seedreamlite'?'SEEDREAM 5 LITE':imageEngine==='qwen3'?'QWEN IMAGE 3.0':imageEngine==='zspicy'?'Z-IMAGE SPICY':'SEEDREAM 5.0 PRO'):'WAN 3.0';
  $('prompt-label').textContent=image?'Image direction':'Motion direction';$('prompt').maxLength=image?(imageEngine==='seedreamlite'?3000:5000):6000;
  $('prompt').placeholder=image?(imageEngine==='zspicy'?'Describe an original image from words. This model does not accept photographs.':'Describe the image. Add references for identity, wardrobe, a room or an object, or start with text only.'):'One clear action, one camera move, light, atmosphere and sound.';
  options('resolution',upscale?['2k','4k','8k']:image?(imageEngine==='soulpro'?['source']:imageEngine==='fal'?['1k']:['gemini','gemini21'].includes(imageEngine)?['1k','2k','4k']:imageEngine==='zspicy'?['1k','1.5k']:imageEngine==='seedreamlite'?['2k']:imageEngine==='soul'?(isReinterpret()?['1k','1.5k']:['native']):['1k','2k']):['480p','720p','1080p'],upscale?'4k':image?(imageEngine==='soulpro'?'source':imageEngine==='soul'?(isReinterpret()?'1.5k':'native'):imageEngine==='zspicy'?'1.5k':['fal','seedream','kling'].includes(imageEngine)?'1k':'2k'):engine==='seedance'?'720p':'1080p');
  if(upscale)for(const option of $('resolution').options)option.textContent=option.value.toUpperCase()+' · ~'+({'2k':4,'4k':17,'8k':67}[option.value])+' MP';
  options('output-format',upscale&&!isFalUpscale()?['png','jpeg','webp']:['png','jpeg'],'png');
  if(!file)$('filemeta').textContent=sourceHelp();
  options('ratio',image?(imageEngine==='soulpro'?['source']:['qwen3','zspicy','seedreamlite','krea3'].includes(imageEngine)?['1:1','16:9','9:16','4:3','3:4','3:2','2:3','21:9']:['flash','kling'].includes(imageEngine)?['auto','16:9','9:16','1:1','4:3','3:4','3:2','2:3','21:9']:imageEngine==='fal'?['1:1','4:3','3:4','16:9','9:16','21:9']:['gemini','gemini21'].includes(imageEngine)?['auto','1:1','2:3','3:2','3:4','4:3','4:5','5:4','9:16','16:9','21:9']:imageEngine==='soul'?(isReinterpret()?['source']:['1:1','16:9','9:16','4:3','3:4','3:2','2:3','21:9','9:21']):['auto','1:1','4:3','3:4','16:9','9:16','3:2','2:3','4:5','5:4','21:9','9:21','2:1','1:2','3:1','1:3']):['auto','16:9','9:16','1:1','4:3','3:4'],image&&imageEngine==='soulpro'?'source':image&&imageEngine==='soul'?(isReinterpret()?'source':'1:1'):image&&imageEngine==='fal'?'3:4':image&&['qwen3','zspicy','seedreamlite','krea3'].includes(imageEngine)?'16:9':'auto');
  if(image){const values=(imageEngine==='fal'||imageEngine==='soulpro'||imageEngine==='soul'&&soul.isKrea())?[1]:imageEngine==='gemini'&&imageProcessing==='batch'?[1,2,4,10,20]:[1,2,3,4],selected=Math.min(Number($('image-count').value)||1,values.at(-1));$('image-count').replaceChildren(...values.map(n=>new Option(n+' image'+(n===1?'':'s'),String(n))));$('image-count').value=String(values.includes(selected)?selected:1);}
  if(isReinterpret()){$('prompt-label').textContent='Optional changes';$('prompt').placeholder='Optional changes: black shirt, wet hair, warmer bedside lamp…';$('prompt').maxLength=3000;}
  if(image&&imageEngine==='soulpro'){
    $('prompt-label').textContent='Optional changes';
    $('prompt').placeholder='Leave empty for identity transfer only. Or describe one deliberate change while preserving the source structure.';
    $('prompt').maxLength=3500;
    $('filemeta').textContent=file?$('filemeta').textContent:'Choose the exact source photograph. It controls pose, body, camera and scene.';
    $('soul-pro-identity-status').textContent=soulProIdentity.configured?'Saved Nina identity · '+soulProIdentity.count+' reference'+(soulProIdentity.count===1?'':'s'):'Nina identity not set yet';
    $('reference-mode').hidden=true;
  }else{
    const drop=$('reference-drop');drop.querySelector('span').textContent='Add identity, wardrobe or set references';drop.querySelector('small').textContent='Up to 10 images';
    $('reference-help').textContent='Reference numbers, filenames, roles and notes are added to your generation prompt. They guide the model; they do not guarantee identity matching.';
  }
  configureVideoControls();syncDefaultRatio(true);renderReferences();prewarmSeedreamDeck();resetPreview();refreshCanvasImport();update();syncImageStudioMode();syncVideoStudioMode();syncStudioNav();
  if(owner&&assetLibrary&&galleryChanged){setHistorySelectMode(false);void loadHistory().catch(e=>notify(e.message,true));}
  refreshEffectsView();
}

/* Floating Image Studio: one gallery, one real backend, no duplicate submissions.
   The composer mirrors the existing hidden advanced controls, which remain
   authoritative for pricing, authentication, model limits and provider calls. */
const imageStudio = $('image-studio');
const imageComposer = $('image-composer');
const precisionEditor=createPrecisionEditor({host:$('app'),api,assetBlob,uploadAsset,notify,
  owner:()=>owner,falReady:()=>!!config.falEnabled&&(!customerMode||customerGenerationReady),magicReady:()=>!!config.falEnabled&&!customerMode,
  onExit:()=>returnToImageFromRetouch(),
  onJob:job=>{surfaceHistoryJob(job);refreshHistorySoon();}});
// Retouch is an independent route. Image state stays in its existing deck.
let lastNativeStudioTab='';
function syncStudioNav(){
  const selected=retouchActive?'retouch':assetLibrary?.active()?'assets':fashionActive?'fashion':tool;
  for(const name of ['image','retouch','video','upscale','assets','fashion']){
    const tab=$('tool-'+name);if(!tab)continue;
    const active=selected===name;
    tab.classList.toggle('active',active);
    tab.setAttribute('aria-pressed',String(active));
  }
  // Native tab navigation is owned by the Expo shell. Notify it only after
  // its first destination command has resolved, avoiding a false Create flash.
  // This also keeps Back to Image in the Retouch workspace in sync.
  if(window.__PV_LAB_NATIVE__===1&&window.__pvNativeRouteResolved===true&&window.ReactNativeWebView){
    const nativeTab=selected==='assets'?'gallery':selected==='retouch'?'retouch':selected==='image'?'create':null;
    if(nativeTab&&nativeTab!==lastNativeStudioTab){
      lastNativeStudioTab=nativeTab;
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'PV_LAB_TAB',tab:nativeTab}));
    }
  }
}
function imageBaseForRetouch(){
  if(tool!=='image')return null;
  if(imageEngine==='soulpro'||isReinterpret())return file?{file,id:sourceId}:null;
  if(referencesOnly())return null;
  const source=references.find(ref=>ref.role==='base')||references[0];
  return source?{file:source.file,id:source.id}:null;
}
function leaveRetouch(){
  if(!retouchActive&&!precisionEditor.isOpen())return;
  retouchActive=false;precisionEditor.close();
  history.scrollRestoration='auto';
  $('app').classList.remove('retouch-studio-active');
  syncImageStudioMode();syncVideoStudioMode();syncStudioNav();
}
async function openRetouch({file:chosenFile=null,id=null,autofill=false,push=true,allowBusy=false}={}){
  if(!owner||(busy&&!allowBusy))return;
  const from=studioRoute();
  // A Retouch visit is not a continuation of Image's old scroll position.
  // Suppress automatic browser restoration for this route and its image decode.
  history.scrollRestoration='manual';
  const selected=chosenFile?{file:chosenFile,id}:
    autofill&&!precisionEditor.hasBase()?imageBaseForRetouch():null;
  if($('image-lightbox').open)closeImageDetail();
  if($('soul-pro-identity-dialog').open)$('soul-pro-identity-dialog').close();
  setFashionActive(false);
  if(assetLibrary?.active())assetLibrary.close();
  retouchActive=true;
  $('app').classList.add('retouch-studio-active');
  $('precision-access-note').hidden=!customerMode;
  syncStudioRoute('retouch',{push:push&&from!=='retouch',retouchFrom:from});
  syncImageStudioMode();syncVideoStudioMode();syncStudioNav();
  // Reuse the exact File object and uploaded asset ID. Do not upload or bill here.
  try{await precisionEditor.open(selected||{});}
  catch(error){notify(error.message,true);}
}
function returnToImageFromRetouch(){
  if(!retouchActive)return;
  // A Retouch shortcut opened from Image has a genuine Image history entry.
  if(history.state?.pvLabRetouchEntry&&history.state.pvLabRetouchFrom==='image'){
    history.back();return;
  }
  if(tool==='image'){leaveRetouch();syncStudioRoute('image');syncStudioNav();}
  else setTool('image');
}
window.addEventListener('popstate',()=>{
  if(!owner)return;
  const route=studioRoute();
  if(route==='retouch'){void openRetouch({push:false});return;}
  if(retouchActive)leaveRetouch();
  if(route==='assets'){void assetLibrary?.open();return;}
  if(route==='fashion'){void openFashionStudio();return;}
  if(['image','video','upscale'].includes(route)){
    if(tool!==route||fashionActive||assetLibrary?.active())setTool(route);
    else{syncImageStudioMode();syncVideoStudioMode();syncStudioNav();}
  }
});
const archive = document.querySelector('.archive');
let imageMenuOpen = false;

const composerPortraits=new Map();
const composerHomes=new Map();
let composerLibraryKey='',composerPortraitKey='',soulProEditingCurrent=false;
function composerAssetPhoto(host,id,characterName='',characterId=''){
  // Never insert an <img> until its image has actually loaded: an empty src
  // makes Chromium paint its native broken-image symbol and alt text.
  const token=Symbol('composer-photo');
  host._composerPhotoToken=token;
  host.replaceChildren();
  host.classList.remove('is-photo-loading','is-photo-unavailable');
  host.removeAttribute('aria-busy');
  host.removeAttribute('title');
  const cover=/^nina[\s._-]*fok$/i.test(characterName.trim())?'/assets/optimized/nina-fok/Canon.webp':null;
  const initials=characterName.trim().split(/\s+/).filter(Boolean).map(s=>s[0]).slice(0,2).join('').toUpperCase();
  const current=()=>host._composerPhotoToken===token;
  const placeholder=(failed=false)=>{
    if(!current())return;
    host.replaceChildren();
    host.classList.remove('is-photo-loading');
    host.classList.toggle('is-photo-unavailable',failed);
    host.removeAttribute('aria-busy');
    if(!failed){host.textContent=initials||'+';return;}
    host.title='Preview unavailable';
    if(initials){host.textContent=initials;return;}
    const icon=document.createElement('span');
    icon.className='composer-photo-fallback';
    icon.setAttribute('aria-hidden','true');
    icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 3-3 4 4"/></svg>';
    host.append(icon);
  };
  if(!id&&!cover&&!characterId){placeholder();return;}
  host.classList.add('is-photo-loading');
  host.setAttribute('aria-busy','true');
  const reveal=url=>{
    if(!current()||!host.isConnected)return;
    if(!url){placeholder(true);return;}
    const img=new Image();
    img.alt=''; // The card name is already visible beneath the decorative image.
    img.decoding='async';
    img.onload=()=>{
      if(!current()||!host.isConnected)return;
      if(!img.naturalWidth){placeholder(true);return;}
      host.replaceChildren(img);
      host.classList.remove('is-photo-loading','is-photo-unavailable');
      host.removeAttribute('aria-busy');
    };
    img.onerror=()=>{if(current())placeholder(true);};
    img.src=url;
  };
  if(cover){reveal(cover);return;}
  const cacheKey=characterId?'character:'+characterId:id;
  if(!composerPortraits.has(cacheKey)){
    const revision=epoch;
    // Preview the private 480px thumbnail rather than download every full original.
    // The thumbnail helper already falls back to original bytes when needed.
    const photo=characterId
      ? api('/api/soul/characters/'+encodeURIComponent(characterId)+'/preview',{blob:true}).catch(error=>{if(id)return assetThumbnailBlob(id);throw error;})
      : assetThumbnailBlob(id);
    const pending=photo.then(blob=>{
      if(epoch!==revision||!owner||!blob?.type?.startsWith('image/')||!blob.size)return null;
      return URL.createObjectURL(blob);
    }).catch(()=>null);
    composerPortraits.set(cacheKey,pending);
    // A temporary failure should retry when the gallery is reopened.
    void pending.then(url=>{if(!url&&composerPortraits.get(cacheKey)===pending)composerPortraits.delete(cacheKey);});
  }
  void composerPortraits.get(cacheKey).then(reveal);
}
// Reuse the authenticated lightweight thumbnail pipeline for aspect-ratio
// matching. This never accesses public image URLs or paid generation APIs.
async function sceneAssetRatio(id){
  const blob=await assetThumbnailBlob(id);
  if(!blob?.type?.startsWith('image/')||!blob.size)return null;
  const bitmap=await createImageBitmap(blob);
  try{return bitmap.width&&bitmap.height?bitmap.width/bitmap.height:null;}
  finally{bitmap.close();}
}
function composerCharacterAsset(id){
  const job=[...imageDetailCache.values()].find(j=>j.settings?.characterId===id&&j.outputId);
  return job?.outputId||null;
}
// Independent modal only for standard photo-reference engines. PV Soul's trained
// identity library and its native/mobile picker retain their original flow.
const packStudio=createReferencePackStudio({
  getPacks:()=>packs,getReferences:()=>references,getRoleLabels:referenceRoles,
  ensureReferences,uploadAsset,api,loadPacks,assetPhoto:composerAssetPhoto,
  onUse:id=>{$('pack-select').value=id;$('pack-load').click();},
  notify,isOwner:()=>owner,isBusy:()=>busy,session:()=>epoch,
  openElementCategory:categoryId=>sceneLibrary?.open(categoryId)
});
sceneLibrary=createSceneLibrary({
  api,uploadAsset,assetFile,assetPhoto:composerAssetPhoto,getAssetRatio:sceneAssetRatio,
  getReferences:()=>references,getReferenceLimit:referenceLimit,
  getContext:()=>({owner,busy,tool,mode,prompt:$('prompt').value.trim(),supportsReferences:usesReferenceGuidance()&&imageEngine!=='kling'}),
  prepareUse:()=>{
    // A saved item starts a new composition rather than silently making
    // its first image the Base. Preserve any existing Base/editor photos.
    if(tool==='image'&&usesReferenceGuidance()&&!references.length){
      imageReferenceMode='references';closeReferenceIntent();syncReferenceIntentUi();
    }
  },
  addReferences,loadPacks,getAllPacks:()=>packs,notify,action,
  openPhotoPacks:()=>packStudio.open(),
  closeOverlays:()=>{sceneImageMenuClose();closeComposerLibrary();closeImageModelMenu();closeReferenceIntent();moodUI.close();toggleImageSettings(false);}
});
$('scene-video-open').onclick=()=>sceneLibrary.open('characters');

function sceneImageMenuClose(){
  $('scene-image-menu').hidden=true;
  $('scene-image-menu-home').hidden=false;
  $('scene-image-menu-categories').hidden=true;
  $('scene-image-open').setAttribute('aria-expanded','false');
}
$('scene-image-open').onclick=()=>{
  if(busy)return;
  if(!owner){notify('Sign in to use your library.',true);return;}
  const menu=$('scene-image-menu');
  if(!menu.hidden){sceneImageMenuClose();return;}
  closeComposerLibrary();closeImageModelMenu();closeReferenceIntent();
  moodUI.close();toggleImageSettings(false);
  $('scene-image-menu-home').hidden=false;
  $('scene-image-menu-categories').hidden=true;
  menu.hidden=false;
  $('scene-image-open').setAttribute('aria-expanded','true');
};
$('scene-menu-elements').onclick=()=>{
  $('scene-image-menu-home').hidden=true;
  $('scene-image-menu-categories').hidden=false;
  $('scene-menu-back').focus({preventScroll:true});
};
$('scene-menu-back').onclick=()=>{
  $('scene-image-menu-categories').hidden=true;
  $('scene-image-menu-home').hidden=false;
  $('scene-menu-elements').focus({preventScroll:true});
};
$('scene-menu-packs').onclick=()=>{
  sceneImageMenuClose();
  // Preserve the working, private Photo Packs selector and its existing callbacks.
  $('composer-add-saved-toggle').click();
};
for(const button of document.querySelectorAll('#scene-image-menu [data-scene-target]')){
  button.onclick=()=>{const id=button.dataset.sceneTarget;sceneImageMenuClose();sceneLibrary.open(id);};
}
document.addEventListener('click',event=>{
  if(!$('scene-image-library-wrap').contains(event.target))sceneImageMenuClose();
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape')sceneImageMenuClose();
});


function composerMove(id,target){
  const node=$(id);if(!node)return;
  if(!composerHomes.has(id)){const anchor=document.createComment('Home: '+id);node.before(anchor);composerHomes.set(id,anchor);}
  if(target){if(node.parentElement!==target)target.append(node);}
  else composerHomes.get(id).after(node);
}
function syncComposerOptions(){
  const image=tool==='image',target=$('composer-options-fields');
  for(const id of ['format-control','image-processing-control','soul-controls','soul-pro-settings','controlled-pose-settings','reference-list','composer-reference-same-person','reference-guidance'])composerMove(id,image?target:null);
  // Draft and reset remain available to Video/Upscaler, not as Image toolbar controls.
  for(const id of ['save','clear'])composerMove(id,null);
  if(!image){$('reference-list').hidden=false;return;}
  $('composer-exact-prompt-option').hidden=!usesReferenceGuidance();
  $('composer-exact-prompt').disabled=busy;
  target.dataset.engine=imageEngine;
  target.dataset.compact=String(imageEngine==='soul'&&!isReinterpret());
  $('reference-list').hidden=['soul','soulpro','zspicy'].includes(imageEngine);
  for(const el of target.querySelectorAll('input,select,textarea'))el.disabled=busy;
  const identity=imageEngine==='soulpro',trained=imageEngine==='soul';
  const selected=isSoul2()?(hf.current()?.name||'NO SOUL ID'):identity?'Nina FOK':trained?($('soul-character').selectedOptions[0]?.textContent||'Character'):packs.find(p=>p.id===$('pack-select').value)?.name||'References';
  $('composer-character-name').textContent=selected;if(isSoul2())$('composer-character').title=hf.current()?'Selected Soul ID: '+selected:'No Soul ID selected. Click to choose a trained identity. Without one, the face is not preserved.';
  $('composer-character').disabled=busy;
  const portrait=isSoul2()?hf.current()?.portraitAssetId:identity?soulProIdentity.refs?.[0]?.id:trained?composerCharacterAsset($('soul-character').value):packs.find(p=>p.id===$('pack-select').value)?.refs?.[0]?.id;
  const key=selected+':'+(portrait||'')+':'+(trained?$('soul-character').value:'');
  if(key!==composerPortraitKey){composerPortraitKey=key;composerAssetPhoto($('composer-character-photo'),portrait,trained&&$('soul-character').value?selected:'',trained?$('soul-character').value:'');}
  if(!$('composer-library').hidden)renderComposerLibrary();
}
function closeComposerLibrary(){
  if(packStudio.isOpen())packStudio.close();
  $('composer-library').hidden=true;
  $('composer-character').setAttribute('aria-expanded','false');
  $('composer-add-saved-toggle').setAttribute('aria-expanded','false');
}
function closeComposerAddMenu(){
  // The + opens the native file chooser directly. Saved packs have their own arrow.
}
function openComposerLibrary(){
  if(busy)return;
  toggleImageSettings(false);closeImageModelMenu();closeComposerAddMenu();
  $('composer-library').hidden=false;
  $('composer-character').setAttribute('aria-expanded','true');
  $('composer-add-saved-toggle').setAttribute('aria-expanded','true');
  renderComposerLibrary();
}
function renderComposerLibrary(){
  $('composer-library').classList.toggle('is-character-library',isSoul2());
  $('composer-character-create').hidden=!isSoul2();
  $('composer-library-create').hidden=isSoul2();
  if(isSoul2()){
    $('composer-library-title').textContent='MAKE YOUR OWN CHARACTER';$('composer-library-note').textContent='Upload photos from different angles to create your character. Then use the same identity across new images in PV Lab.';
    $('composer-library-create').textContent='Create Soul ID';$('composer-library-manage').hidden=false;$('composer-library-manage').textContent='Manage characters';$('composer-library-delete').hidden=true;
    hf.renderLibrary($('composer-library-cards'));return;
  }

  const trained=imageEngine==='soul',identity=imageEngine==='soulpro';
  const entries=trained?[...$('soul-character').options].filter(o=>o.value).map(o=>({id:o.value,name:o.textContent,photo:composerCharacterAsset(o.value)})):packs.filter(p=>p.refs?.length).map(p=>({...p,photo:p.refs[0].id}));
  if(identity&&soulProIdentity.configured)entries.unshift({id:'current-identity',name:'Active Nina photos',photo:soulProIdentity.refs?.[0]?.id});
  const key=JSON.stringify([imageEngine,entries.map(p=>[p.id,p.name,p.photo]),$('soul-character').value,$('pack-select').value,busy]);
  $('composer-library-title').textContent=trained?'Trained LoRAs':identity?'Reference photo packs':'Saved photo packs';
  $('composer-library-note').textContent=trained?'Choose a trained character for text-to-image generation.':identity?'Photo edit uses reference photos, not a LoRA. Choose a pack, then select up to 4 photos.':'Saved photos with their roles. These packs are not trained LoRAs.';
  $('composer-library-create').textContent=trained?'Train a LoRA':identity?'Edit active photos':'Save current photos';
  $('composer-library-manage').hidden=!trained;
  $('composer-library-manage').textContent='Manage trained LoRAs';
  $('composer-library-delete').hidden=trained;
  $('composer-library-delete').disabled=busy||!$('pack-select').value;
  $('composer-library-create').disabled=busy||(!trained&&!identity&&!references.length);
  $('composer-library-create').title=!trained&&!identity&&!references.length?'Add photos before saving a pack':'';
  if(key===composerLibraryKey)return;composerLibraryKey=key;
  const grid=$('composer-library-cards');grid.replaceChildren();
  for(const entry of entries){
    const card=document.createElement('button');card.type='button';card.className='composer-library-card';card.disabled=busy;
    card.setAttribute('aria-pressed',String(entry.id===(trained?$('soul-character').value:identity?'current-identity':$('pack-select').value)));
    const photo=document.createElement('span');photo.className='composer-library-photo';
    const title=document.createElement('strong');title.textContent=entry.name;
    const kind=document.createElement('small');kind.textContent=trained?'Trained LoRA':entry.id==='current-identity'?soulProIdentity.count+' active photos':entry.refs.length+' reference photos';
    card.append(photo,title,kind);grid.append(card);composerAssetPhoto(photo,entry.photo,trained?entry.name:'',trained?entry.id:'');
    card.onclick=()=>{
      if(busy)return;
      if(entry.id==='current-identity'){$('soul-pro-identity-manage').click();return;}
      if(trained){$('soul-character').value=entry.id;$('soul-character').dispatchEvent(new Event('change',{bubbles:true}));closeComposerLibrary();}
      else if(identity){$('soul-pro-identity-manage').click();$('soul-pro-pack-select').value=entry.id;$('soul-pro-pack-select').dispatchEvent(new Event('change',{bubbles:true}));closeComposerLibrary();}
      else{$('pack-select').value=entry.id;$('pack-load').click();closeComposerLibrary();}
    };
  }
  if(!entries.length){const empty=document.createElement('p');empty.className='fine';empty.textContent=trained?'No trained characters yet. Train one to keep it here.':'No saved packs yet. Add photos and save a pack to reuse it here.';grid.append(empty);}
}
$('composer-character').onclick=()=>{if(busy)return;if($('composer-library').hidden)openComposerLibrary();else closeComposerLibrary();};
$('composer-library-close').onclick=closeComposerLibrary;
$('composer-character-create').onclick=()=>{if(busy)return;closeComposerLibrary();void hf.open({create:true});};
$('composer-library-delete').onclick=()=>{if(!busy)$('pack-delete').click();};
$('composer-options-close').onclick=()=>toggleImageSettings(false);
$('composer-exact-prompt').addEventListener('change',()=>{if(!busy){updateReferenceGuidance();update();}});
$('composer-library-create').onclick=()=>{if(busy)return;if(isSoul2()){closeComposerLibrary();void hf.open({create:true});return;}if(imageEngine==='soul')$('soul-manage').click();else if(imageEngine==='soulpro')$('soul-pro-identity-manage').click();else $('pack-save').click();};
$('composer-library-manage').onclick=()=>{if(busy)return;if(isSoul2()){closeComposerLibrary();void hf.open();return;}(imageEngine==='soulpro'?$('soul-pro-identity-manage'):$('soul-manage')).click();};
function setModelIcon(element,engine){
  const paths={seedream:'bytedance.svg',seedreamlite:'bytedance.svg',flash:'bytedance.svg',qwen3:'qwen.svg',zspicy:'z-image.svg',gemini:'google.svg',gemini21:'google.svg',soulpro:'pv-mark.png',soul:'pv-mark.png'};
  const path=paths[engine];element.replaceChildren();
  if(path){const img=document.createElement('img');img.src='./branding/'+path+(engine==='qwen3'?'?v=20261013-mono1':'');img.alt='';img.width=20;img.height=20;element.append(img);}
  else element.textContent='◈';
}
const imageModelDescriptions = Object.freeze({
  seedream:'Image creation and reference-guided edits',
  seedreamlite:'2K · text or up to 10 reference images',
  flash:'Fast · from $0.029/image · up to 10 references',
  qwen3:'2K · text or 1–3 reference photos',
  krea3:'Editorial image editing · 1K or 2K · up to 4 references · fal.ai safety checking',
  zspicy:'Z-Image Spicy · text-only · up to 1536 px',
  kling:'Kling V3 · $0.028/image · text or one base image',
  gemini:'Nano Banana Pro · image and reference editing',
  gemini21:'Google · 1K, 2K, 4K · reference editing',
  soulpro:'Create from text or a photograph · optional character',
  soul:'Krea 2 / Qwen · identity LoRA training',
  fal:'Controlled Pose · FAL FLUX image controls'
});
function imageStudioModelTitle(){
  if(isSoul2())return 'PV Soul';
  if(tool==='image'&&imageEngine==='soul')return soul.isKrea()?'Krea 2 LoRA':'Character LoRAs';
  const select=$('image-engine');
  return select.options[select.selectedIndex]?.textContent || 'Image model';
}
function referenceRatioLabel(){
  const ref=references.find(r=>r.role==='base')||references[0];
  if(!ref?.width||!ref?.height)return '16:9';
  const ratios=[...$('ratio').options].map(o=>o.value).filter(v=>/^\d+:\d+$/.test(v));
  const distance=r=>{const [w,h]=r.split(':').map(Number);return Math.abs(Math.log(w/h/(ref.width/ref.height)));};
  return ratios.reduce((a,b)=>distance(b)<distance(a)?b:a,ratios[0]||'16:9');
}
function synchronizeComposerSelect(composerId,realId){
  const mirror=$(composerId),real=$(realId);
  if(!mirror || !real)return;
  const current=[...real.options].filter(option=>!(realId==='ratio'&&referencesOnly()&&option.value==='auto')).map(option=>[option.value,realId==='ratio'&&option.value==='auto'?'Auto · '+referenceRatioLabel():option.textContent]);
  const previous=[...mirror.options].map(option=>[option.value,option.textContent]);
  if(JSON.stringify(current)!==JSON.stringify(previous))
    mirror.replaceChildren(...current.map(([value,label])=>new Option(label,value)));
  if(mirror.value!==real.value)mirror.value=real.value;
}
let moodDiscoveryOpen=false;
function syncImageGalleryEmpty(){
  renderPendingImageCards();
  const imageCards=$('history').querySelectorAll('.card[data-kind="image"]').length;
  // A cleared gallery is not proof that History is empty while a tab switch is loading.
  // Show the first-image welcome only after the current History page has resolved.
  $('image-gallery-empty').hidden=!historyHasPage||(imageCards>0&&!moodDiscoveryOpen);
  // Empty History always returns to the approved Inspiration entrance.
  // Do not revive the older landscape/quick-actions screen after a refresh
  // or after closing Inspiration before the first image exists.
  if(historyHasPage&&!imageCards&&owner&&tool==='image'&&!assetLibrary?.active()
    &&!document.documentElement.classList.contains('pv-native-lab')
    &&!document.documentElement.classList.contains('pv-image-previews-hidden')){
    $('lab-welcome-start').hidden=false;
    $('lab-image-empty-intro').hidden=true;
  }
  // The customer welcome has no saved image to select. Synchronize History
  // actions when a first result appears (or the empty welcome returns), too.
  if(tool==='image')updateHistorySelectionUi();
}

// A one-time, text-first welcome path. Authentication, wallet funding, model
// quotations and final Generate all remain owned by their existing flows.
const welcomeRequested=new URLSearchParams(location.search).get('welcome')==='1';
const welcomePrompts=INSPIRATION_VARIATIONS;
const inspirationRotation=createInspirationRotation(sessionStorage);
// Consume only a short-lived text draft deliberately created in the public Studio.
// Never touch identity, wallet, pricing or job state before authenticated /api/session.
function restoreGuestImageDraft(){
  if(!owner||tool!=='image')return;
  const key='pv-lab-guest-image-draft-v1';let draft;
  try{draft=JSON.parse(sessionStorage.getItem(key)||'null');}catch{return;}
  if(!draft||!Number.isFinite(draft.at)||Date.now()-draft.at>30*60*1000||draft.at>Date.now()+60000){
    try{sessionStorage.removeItem(key);}catch{}return;
  }
  // Photos chosen before sign-in stay on the device until the session is
  // verified. Move those File objects into the real reference composer only
  // when Clerk signs in without a full-page redirect. No guest upload occurs.
  const stagedFiles=Array.isArray(window.__pvLabGuestFiles)
    ?window.__pvLabGuestFiles.filter(value=>value instanceof File).slice(0,8):[];
  window.__pvLabGuestFiles=[];
  if(stagedFiles.length)void addReferences(stagedFiles).catch(error=>
    notify('Your photographs could not be attached. Please add them again. '+error.message,true));
  const prompt=typeof draft.prompt==='string'?draft.prompt.slice(0,5000):'';
  if(!prompt.trim()||$('prompt').value.trim())return;
  // Chrome Couture is an Inspiration look based on the existing Fashion Editorial Mood.
  // Keep the 16-Mood backend allowlist unchanged, including on public sign-in handoff.
  const draftMood=draft.mood==='chrome-couture'?'fashion-editorial':draft.mood;
  if(typeof draftMood==='string'&&moodById(draftMood)){
    if(imageEngine!=='seedream'){$('image-engine').value='seedream';$('image-engine').dispatchEvent(new Event('change',{bubbles:true}));}
    moodUI.restore({moodId:draftMood,moodIntensity:draftMood==='fisheye-2000'?75:60},true);
    // A draft from the public six-card preview remains a visible-prompt-only Inspiration selection.
    inspirationMoodId=draftMood;
    if(draftMood==='fisheye-2000')inspirationMoodId=null;
    $('resolution').value='2k';
  }
  $('prompt').value=prompt;
  $('prompt').dispatchEvent(new Event('input',{bubbles:true}));
  update();
  try{sessionStorage.removeItem(key);}catch{}
}
function resetWelcomeStart(){
  const panel=$('lab-welcome-start'),intro=$('lab-image-empty-intro');
  if(panel)panel.hidden=true;
  if(intro)intro.hidden=false;
  document.querySelectorAll('[data-welcome-mood]').forEach(button=>button.setAttribute('aria-pressed','false'));
}
function setMoodDiscoveryOpen(next){
  if(next&&(!owner||tool!=='image'||!$('app').classList.contains('image-studio-active')||assetLibrary?.active()||document.documentElement.classList.contains('pv-image-previews-hidden')))return;
  moodDiscoveryOpen=!!next;
  $('app').classList.toggle('pv-moods-discovery-open',moodDiscoveryOpen);
  const panel=$('lab-welcome-start'),intro=$('lab-image-empty-intro'),button=$('history-moods-toggle');
  if(moodDiscoveryOpen){
    panel.hidden=false;intro.hidden=true;
    const balanceLine=panel.querySelector('.lab-welcome-balance');
    if(balanceLine)balanceLine.hidden=!customerMode;
    if(customerMode){
      const walletText=$('lab-wallet-toggle')?.textContent.trim()||'';
      if(/^\d[\d,.\s]*\s+credits?$/i.test(walletText))$('lab-welcome-balance').textContent=walletText;
    }
  }else{
    panel.hidden=true;intro.hidden=false;
    const balanceLine=panel.querySelector('.lab-welcome-balance');
    if(balanceLine)balanceLine.hidden=false;
  }
  if(button){
    button.querySelector('.mood-view-label').textContent=moodDiscoveryOpen?'History':'Inspiration';
    button.setAttribute('aria-pressed',String(moodDiscoveryOpen));
    button.setAttribute('aria-label',moodDiscoveryOpen?'Back to image History':'Open Inspiration gallery');
    button.title=moodDiscoveryOpen?'Back to History':'Open Inspiration';
  }
  syncImageGalleryEmpty();
}
$('history-moods-toggle')?.addEventListener('click',()=>setMoodDiscoveryOpen(!moodDiscoveryOpen));
function showWelcomeStart(session){
  const panel=$('lab-welcome-start');
  if(!panel)return;
  // Do not infer new-user eligibility from the URL or a localStorage flag.
  // Show only after authenticated /api/session and history have both arrived.
  // Normal Image entry is as eligible as the promotional welcome link.
  // The approved six-card Image welcome is a visual entry state, not a
  // credit/grant/generation entitlement. New signed-in customers must see it
  // even with zero credits or while generation permissions are settling.
  // Server-side permission and wallet checks still govern actual generation.
  const eligible=(welcomeRequested||tool==='image')&&owner
    &&session?.accountClosed!==true
    &&!$('history').querySelector('.card[data-kind="image"]');
  if(!eligible){resetWelcomeStart();return;}
  const amount=$('lab-welcome-balance');
  const balance=Number.isSafeInteger(session.balanceCredits)?session.balanceCredits:null;
  if(amount)amount.textContent=balance===null?'Your credits':balance.toLocaleString('en-GB')+' credits';
  const creditStatus=$('lab-welcome-credit-status');
  if(creditStatus)creditStatus.textContent=balance===0?'on your account. Choose a plan when you are ready.':'available to create.';
  panel.hidden=false;
  $('lab-image-empty-intro').hidden=true;
  syncImageGalleryEmpty();
}
function useWelcomeMood(id){
  if(!Object.prototype.hasOwnProperty.call(welcomePrompts,id)||!owner
    ||busy||imageSubmissionPending||$('lab-welcome-start')?.hidden)return;
  // Commit the user-visible choice before running model/mood synchronization.
  // The decorative deck expansion must never be the only result of a click.
  const choice=inspirationRotation.select(id,$('prompt').value);
  if(!choice)return;
  const selectedPrompt=choice.prompt;
  const preserveWorkspace=choice.preserved||references.length>0||!!file;
  const visiblePrompt=$('image-composer-prompt');
  $('prompt').value=selectedPrompt;
  if(visiblePrompt){
    visiblePrompt.value=selectedPrompt;
    visiblePrompt.dispatchEvent(new Event('input',{bubbles:true}));
  }
  document.querySelectorAll('[data-welcome-mood]').forEach(button=>{
    button.setAttribute('aria-pressed',String(button.dataset.welcomeMood===id));
  });
  // Respect a compatible user-chosen model; only switch when the current model cannot run Moods.
  const moodCompatible=['seedream','seedreamlite','gemini','gemini21','qwen3','zspicy'].includes(imageEngine);
  if(imageEngine!=='seedream'&&(!preserveWorkspace||!moodCompatible)){
    $('image-engine').value='seedream';
    $('image-engine').dispatchEvent(new Event('change',{bubbles:true}));
  }else if(tool!=='image')setTool('image');
  // Keep customer settings and user-uploaded photographs when applying the aesthetic to their own work.
  if(!preserveWorkspace){
    imageProcessing='normal';$('image-processing').value='normal';
    $('resolution').value='2k';$('image-count').value='1';
    if(!references.length&&!file){$('ratio').value='16:9';imageRatioExplicit=false;}
  }
  // A seventh look can provide a distinct visible prompt without creating
  // an unsupported seventeenth server Mood or changing credit/provider routing.
  const underlyingMood=id==='chrome-couture'?'fashion-editorial':id;
  if(moodById(underlyingMood))moodUI.restore({moodId:underlyingMood,moodIntensity:underlyingMood==='fisheye-2000'?75:60},true);
  inspirationMoodId=underlyingMood;
  // Fisheye is the same approved Mood from Explore, including its two Style references.
  if(underlyingMood==='fisheye-2000')inspirationMoodId=null;
  $('prompt').value=selectedPrompt;
  $('prompt').dispatchEvent(new Event('input',{bubbles:true}));
  syncImageComposer();
  // Apply after all synchronous Mood sync work, including any composer update.
  if(visiblePrompt){
    visiblePrompt.value=selectedPrompt;
    visiblePrompt.dispatchEvent(new Event('input',{bubbles:true}));
  }
  update();
  // Curated first-image looks are deliberate selections, not keystrokes.
  // Start the read-only price request now instead of waiting 850 ms.
  customerImagePricing?.prime();
  // A Mood tap is not a request to type. A focused textarea would open
  // the mobile keyboard and hide the selected style and Generate button.
  const composerField=$('image-composer-prompt');
  if(window.matchMedia('(max-width:680px)').matches && window.__PV_LAB_NATIVE__!==1){
    if(document.activeElement===composerField)composerField.blur();
    const dock=$('image-composer');
    // Result galleries use a fixed dock, already visible. If a future welcome
    // treatment puts it in document flow, navigate there without keyboard focus.
    if(dock && getComputedStyle(dock).position!=='fixed'){
      requestAnimationFrame(()=>dock.scrollIntoView({
        behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',
        block:'start'
      }));
    }
  }
  // Desktop Mood selection also keeps the deck compact. The prompt is
  // already loaded; opening the editor is a separate deliberate click.
}
document.querySelectorAll('[data-welcome-mood]').forEach(button=>{
  button.addEventListener('click',()=>useWelcomeMood(button.dataset.welcomeMood));
});
// Empty-gallery shortcuts dispatch the same existing composer actions.
// They never bypass review, price checks, or explicit Generate.
$('image-empty-add')?.addEventListener('click',()=>{
  if(owner&&tool==='image')$('image-composer-add')?.click();
});
$('image-empty-write')?.addEventListener('click',()=>{
  if(owner&&tool==='image')$('image-composer-prompt')?.focus({preventScroll:true});
});
$('image-empty-moods')?.addEventListener('click',()=>{
  if(owner&&tool==='image')$('image-composer-moods')?.click();
});
let draggedComposerReference=null;
// Keep reference previews mounted while unrelated editor/pricing state changes.
let composerReferenceRenderKey=null;
function moveComposerReference(ref,target,after=false){
  if(busy||ref===target)return;
  const from=references.indexOf(ref);if(from<0||!references.includes(target))return;
  references.splice(from,1);references.splice(references.indexOf(target)+(after?1:0),0,ref);
  autoPreview=null;if(imageEngine==='fal')poseMapSourceId=null;
  closeInputPreview();renderReferences();refreshInputPreview();update();
}
function syncImageReferences(){
  const tray=$('image-composer-references');
  if(!tray)return;
  if(tool!=='image'||imageEngine==='zspicy'||imageEngine==='soul'&&!isReinterpret()){
    if(tray.childElementCount)tray.replaceChildren();
    composerReferenceRenderKey=null;
    tray.hidden=true;return;
  }
  const items=isSoul2()?[]:references.filter((ref,i)=>!ref.elementId||references.findIndex(other=>other.elementId===ref.elementId)===i);
  if((imageEngine==='soulpro'||isReinterpret())&&sourceUrl)items.unshift({thumbUrl:sourceUrl,file:{name:'Base image'},isBase:true});
  const renderKey=JSON.stringify([imageEngine,imageReferenceMode,usesReferenceGuidance(),isSoul2(),
    items.map(ref=>[ref.thumbUrl||ref.url,ref.url,ref.role,ref.file?.name,!!ref.isBase,ref.elementId||'',ref.elementName||'',ref.elementCount||0])]);
  if(renderKey===composerReferenceRenderKey&&tray.childElementCount===items.length){
    // Maintain the upload lock but do not reset already decoded thumbnail elements.
    for(const tile of tray.children){
      if(!tile.hasAttribute('role'))tile.draggable=!busy&&!tile.classList.contains('composer-element-tile');
      const role=tile.querySelector('.composer-reference-role');if(role)role.disabled=busy;
      const remove=tile.querySelector('.composer-reference-remove');if(remove)remove.disabled=busy;
    }
    tray.hidden=!items.length;
    return;
  }
  composerReferenceRenderKey=renderKey;
  tray.replaceChildren();
  for(let i=0;i<items.length;i++){
    const ref=items[i],tile=document.createElement('div');
    tile.className='composer-reference-tile'+(ref.elementId?' composer-element-tile':'');tile.title=ref.elementId?'@'+ref.elementName+' · saved '+(ref.elementCount||1)+' views':ref.file?.name||'Reference image';
    tile.classList.toggle('role-general',usesReferenceGuidance()&&!ref.isBase&&(!ref.role||ref.role==='none'));
    const img=document.createElement('img');
    img.src=ref.thumbUrl||ref.url;img.alt=(ref.isBase?'Base image':'Image reference '+(i+1));
    // Working previews are already reduced, local assets; display them immediately.
    img.loading='eager';img.decoding='async';img.draggable=false;
    // Reference previews must remain reachable in the visible floating Image
    // deck. The older side rail can be hidden without losing the read-only
    // original/preview action. Soul's Base replacement retains its own flow.
    if(!ref.isBase&&!ref.elementId){
      img.tabIndex=0;
      img.setAttribute('role','button');
      img.setAttribute('aria-label','Preview input reference '+(i+1));
      const preview=()=>{if(owner&&!busy&&references.includes(ref))
        viewReference(ref,references.indexOf(ref));};
      img.addEventListener('click',event=>{event.stopPropagation();preview();});
      img.addEventListener('keydown',event=>{
        if(event.key!=='Enter'&&event.key!==' ')return;
        event.preventDefault();event.stopPropagation();preview();
      });
    }
    img.addEventListener('error',()=>{
      if(img.dataset.previewFallback!=='1'&&ref.url&&img.src!==ref.url){
        img.dataset.previewFallback='1';img.src=ref.url;return;
      }
      img.hidden=true;tile.classList.add('preview-unavailable');
      tile.title='Preview unavailable. Remove and add this reference again.';
    });
    tile.append(img);
    if(!ref.isBase&&!ref.elementId){
      tile.draggable=!busy;tile.tabIndex=0;tile.setAttribute('aria-label','Image '+(i+1)+'. Drag to reorder, or use Alt and arrow keys.');
      tile.addEventListener('dragstart',e=>{
        if(busy||e.target.closest('button,select')){e.preventDefault();return;}
        draggedComposerReference=ref;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/x-pv-reference',String(references.indexOf(ref)));tile.classList.add('is-reordering');
      });
      tile.addEventListener('dragover',e=>{if(!draggedComposerReference||draggedComposerReference===ref)return;e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect='move';const after=e.clientX>tile.getBoundingClientRect().left+tile.offsetWidth/2;tile.classList.toggle('drop-after',after);tile.classList.toggle('drop-before',!after);});
      tile.addEventListener('dragleave',()=>tile.classList.remove('drop-before','drop-after'));
      tile.addEventListener('drop',e=>{if(!draggedComposerReference)return;e.preventDefault();e.stopPropagation();const moving=draggedComposerReference;draggedComposerReference=null;const after=e.clientX>tile.getBoundingClientRect().left+tile.offsetWidth/2;moveComposerReference(moving,ref,after);});
      tile.addEventListener('dragend',()=>{draggedComposerReference=null;tray.querySelectorAll('.composer-reference-tile').forEach(t=>t.classList.remove('is-reordering','drop-before','drop-after'));});
      tile.addEventListener('keydown',e=>{if(e.target!==tile||!e.altKey||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const next=references.indexOf(ref)+(e.key==='ArrowLeft'?-1:1);if(references[next]){moveComposerReference(ref,references[next],e.key==='ArrowRight');tray.querySelectorAll('.composer-reference-tile')[next]?.focus();}});
    }
    const marker=document.createElement('span');marker.className='composer-reference-index';
    marker.textContent=ref.elementId?'@'+ref.elementName:ref.isBase||ref.role==='base'?'BASE':ref.role&&ref.role!=='none'?ref.role.toUpperCase():String(i+1);
    marker.setAttribute('aria-hidden','true');if(isSoul2())marker.hidden=true;tile.append(marker);
    if(usesReferenceGuidance()&&(i>0||referencesOnly())&&!ref.elementId){
      marker.hidden=true;
      const role=document.createElement('select');role.className='composer-reference-role';role.setAttribute('aria-label','Role for image '+(i+1));role.disabled=busy;
      for(const [value,label] of REFERENCE_ROLES.filter(([value])=>value!=='base'))role.add(new Option(value==='none'?'General':label,value));
      role.value=ref.role||'none';role.title=role.value==='none'?'General reference. Choose a role for more precise guidance.':'Reference role: '+role.value;
      role.onchange=()=>{ref.role=role.value;ref.target=role.value==='outfit'?'full':'';if(referencesOnly())ref.nonBaseRole=ref.role;autoPreview=null;renderReferences();update();};tile.append(role);
    }

    if(ref.isBase){
      tile.tabIndex=0;tile.setAttribute('role','button');tile.setAttribute('aria-label','Replace base image');
      tile.onclick=()=>{if(!busy)$('soul-base-image').click();};
      tile.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tile.click();}};
    }
    if(!ref.isBase||isSoul2()){
      const remove=document.createElement('button');
      remove.type='button';remove.className='composer-reference-remove';remove.textContent='×';
      remove.setAttribute('aria-label','Remove reference '+(i+1));
      remove.disabled=busy;
      const target=ref;
      remove.onclick=e=>{
        e.stopPropagation();
        if(busy)return;
        if(target.isBase){file=null;sourceId=null;release(sourceUrl);sourceUrl=null;sourceWidth=0;sourceHeight=0;sourcePixels=0;update();return;}
        const idx=references.indexOf(target);if(idx<0)return;
        closeInputPreview();
        if(target.elementId){
          for(let at=references.length-1;at>=0;at--)if(references[at].elementId===target.elementId){releaseReference(references[at]);references.splice(at,1);}
        }else{releaseReference(target);references.splice(idx,1);}
        if(!references.length){imageReferenceMode=preferredImageReferenceMode();closeReferenceIntent();}
        if(imageEngine==='fal')poseMapSourceId=null;
        renderReferences();refreshInputPreview();update();
      };
      tile.append(remove);
    }
    tray.append(tile);
  }
  // Keep upload and saved packs in the clearly labelled toolbar control.
  tray.hidden=!items.length;
}
// Keep even very long pasted prompts inside the scrollable editor. The
// textarea is never allowed to determine the height of the floating dock.
function fitImageComposerPrompt(){
  const textbox=$('image-composer-prompt');
  if(!textbox)return;
  // syncImageComposer() owns the contextual placeholder. Do not overwrite its
  // approved Base-image text while measuring the textarea's height.
  const narrow=window.innerWidth<=740;
  const short=window.innerHeight<=640;
  const minimum=narrow?47:42;
  const viewport=window.visualViewport?.height||window.innerHeight;
  // Expand pasted direction until the bounded scroll height. Seedream must not
  // collapse to a single 56px line on desktop.
  const maximum=Math.max(minimum,Math.min(narrow?122:176,Math.floor(viewport*(short ? 0.21 : narrow ? 0.22 : 0.25))));
  const previousScroll=textbox.scrollTop;
  const top=imageComposer.querySelector('.image-composer-top');
  top.style.removeProperty('min-height');
  textbox.style.height=minimum+'px';
  const naturalHeight=textbox.scrollHeight;
  textbox.style.height=Math.min(maximum,Math.max(minimum,naturalHeight))+'px';
  textbox.style.overflowY=naturalHeight>maximum?'auto':'hidden';
  textbox.scrollTop=Math.min(previousScroll,Math.max(0,textbox.scrollHeight-textbox.clientHeight));
  // Soul's first grid row otherwise sizes to the textarea's one-line intrinsic
  // minimum and flex-shrinks even when the textarea has a bounded inline height.
  if(imageComposer.classList.contains('is-pv-soul')){
    const tray=$('image-composer-references');
    const referencesHeight=!tray.hidden?Math.ceil(tray.getBoundingClientRect().height):0;
    const fittedHeight=Math.min(maximum,Math.max(minimum,naturalHeight));
    top.style.minHeight=(fittedHeight+referencesHeight+(referencesHeight?8:0))+'px';
  }else top.style.removeProperty('min-height');
}
function syncImageComposer(){
  if(!imageStudio)return;
  const image=tool==='image';
  imageComposer.classList.toggle('is-text-only',image&&imageEngine==='zspicy');
  moodUI.sync({visible:image,locked:busy});
  imageStudio.hidden=!image;
  syncComposerOptions();
  if(!image){closeComposerAddMenu();return;}
  // Keep the two-mode selection synchronized without adding another toolbar button.
  $('image-reference-mode-wrap').hidden=true;
  $('image-reference-mode').value=imageReferenceMode;$('image-reference-mode').disabled=busy;
  syncReferenceIntentUi();
  const textbox=$('image-composer-prompt');
  if(document.activeElement!==textbox && textbox.value!==$('prompt').value)
    textbox.value=$('prompt').value;
  const hasPhotoReferences=imageInputReferences().length>0;
  const hasBasePhoto=(imageEngine==='soulpro'||isReinterpret())&&!!sourceUrl;
  textbox.placeholder=window.__PV_LAB_NATIVE__===1
    ?'Anything else? Add a direction (optional)'
    :!hasPhotoReferences&&!hasBasePhoto
      ?'What do you imagine?'
      :referencesOnly()||imageEngine==='fal'
        ?'Describe the image you want to create...'
        :'What would you like to change?';
  updateComposerPromptBudget();
  syncSoulBar();
  // Trained characters keep their identity tile. Reference image models use only the left +.
  const trainedCharacterTile=imageEngine==='soul'||imageEngine==='soulpro';
  imageComposer.classList.toggle('has-character-picker',(imageEngine==='soul'||imageEngine==='soulpro')&&!isSoul2());
  $('composer-character').hidden=!trainedCharacterTile;
  textbox.disabled=busy || $('prompt').disabled;
  $('image-composer-model-label').textContent=imageStudioModelTitle();
  setModelIcon(document.querySelector('.composer-model-symbol'),imageEngine);
  for(const [copy,real] of [
    ['image-composer-ratio','ratio'],['image-composer-resolution','resolution'],
    ['image-composer-count','image-count']
  ])synchronizeComposerSelect(copy,real);
  $('image-composer-count-wrap').hidden=$('image-count-control').hidden;
  $('image-composer-resolution').parentElement.hidden=$('resolution-control').hidden;
  $('image-composer-ratio').parentElement.hidden=$('ratio-control').hidden;
  for(const id of ['image-composer-ratio','image-composer-resolution','image-composer-count'])
    $(id).disabled=busy;
  $('image-composer-model').disabled=busy;
  $('image-composer-edit-area').disabled=busy||!owner||customerMode;
  // Keep the same tool slot for every account; customer eligibility is still
  // enforced by the disabled state and the existing Retouch route.
  $('image-composer-edit-area').hidden=false;
  $('image-composer-add').disabled=busy;
  $('composer-add-saved-toggle').disabled=busy;
  // Only genuinely model-specific or reference-detail controls need the menu.
  // The standard image workflow has just the small inline Exact switch.
  const strengthOnly=isSoul2()||imageEngine==='soul'&&!isReinterpret();
  const referenceDetails=usesReferenceGuidance()&&references.length>0;
  const specialSettings=['gemini','fal','soul','soulpro'].includes(imageEngine);
  const showSettings=(specialSettings||referenceDetails)&&(!isSoul2()||!!hf.current());
  const settingsLabel=strengthOnly?'Identity '+Number($(isSoul2()?'hf-strength':'soul-strength').value).toFixed(2):imageEngine==='fal'?'Pose':imageEngine==='gemini'?'Batch':referenceDetails?'Refs':'Controls';
  const more=$('image-composer-more');
  more.querySelector('.composer-more-label').textContent=settingsLabel;
  more.classList.toggle('is-identity-adjustment',strengthOnly);
  more.setAttribute('aria-label',strengthOnly?'Adjust identity strength':imageEngine==='gemini'?'Batch processing':imageEngine==='fal'?'Pose controls':referenceDetails?'Reference details':'Model controls');
  more.title=more.getAttribute('aria-label');
  $('composer-options').querySelector('.composer-panel-head strong').textContent=strengthOnly?'Identity strength':referenceDetails&&!specialSettings?'Reference details':'Model controls';
  more.disabled=busy;
  more.hidden=!showSettings;
  $('composer-more-anchor').hidden=!showSettings;
  if(!showSettings&&!$('composer-options').hidden)toggleImageSettings(false);
  const clearMood=$('image-composer-moods-clear');
  if(clearMood){
    clearMood.hidden=!moodUI.active();
    clearMood.disabled=busy;
    clearMood.title=moodUI.active()?'Remove '+($('image-composer-moods').textContent||'selected mood').trim():'Remove selected mood';
  }
  imageComposer.classList.toggle('is-gemini',tool==='image'&&imageEngine==='gemini');
  const addHidden=imageEngine==='zspicy'||imageEngine==='soul'&&!isReinterpret();
  $('composer-add-wrap').hidden=addHidden;
  $('image-composer-add').hidden=addHidden;
  if(addHidden)closeComposerAddMenu();
  const savedLabel=isSoul2()?'Soul IDs':imageEngine==='soul'?'Trained LoRAs':'Saved photo packs';
  $('composer-add-saved-toggle').setAttribute('aria-label','Open '+savedLabel);
  $('composer-add-saved-toggle').title=savedLabel;
  $('composer-character').setAttribute('aria-label','Choose trained character');
  const generate=$('image-composer-generate');
  const generateActionLabel=$('generate').textContent;
  const creditCost=$('generate').dataset.credits||'';
  const priceState=customerMode?customerImagePricing?.current():null;
  const awaitingCreditPrice=customerMode&&customerGenerationReady&&
    (customerPriceIntentPending||priceState?.status==='checking')&&!creditCost;
  const priceUnavailable=customerMode&&customerGenerationReady&&priceState?.status==='error'&&!creditCost;
  // Reserve a second line even during pricing so Generate never changes size.
  // Keep the button settled while a bound quote loads. Never display an invented credit amount.
  generate.dataset.credits=creditCost||(priceUnavailable?'Retry credit check':'');
  generate.classList.toggle('has-credit-cost',!!creditCost);
  generate.classList.toggle('has-price-pending',!creditCost&&(awaitingCreditPrice||priceUnavailable));
  generate.setAttribute('aria-label',creditCost?'Generate · '+creditCost:'Generate');
  generate.classList.remove('is-submitting');
  generate.classList.toggle('is-long-label',generateActionLabel.length>16);
  generate.disabled=$('generate').disabled;
  generate.setAttribute('aria-busy',String(imageSubmissionPending));
  generate.querySelector('.composer-generate-label').textContent=generateActionLabel;
  const generateSparkle=generate.querySelector('.composer-generate-sparkle');
  if(generateSparkle)generateSparkle.hidden=generateActionLabel.startsWith('Connect ')||generateActionLabel.includes('not connected');
  // Pricing is contained inside Generate; the external status is for an
  // actual click/submission, not an inactive preflight that moves the deck.
  const progress=imageSubmissionPending?imageSubmissionStage:
    customerPriceIntentPending?'Preparing your image…':'';
  const progressLine=$('image-composer-status');
  // Do not overwrite a file-validation or generation error while controls
  // refresh. Its dismiss button (or the next valid upload) clears it explicitly.
  if(progressLine&&!progressLine.classList.contains('is-import-error')){
    progressLine.textContent=progress;
    // A price check is automatic for every account. Keep billing validation,
    // but do not show its transient diagnostic beneath Generate.
    progressLine.hidden=!progress||/^Checking price(?:\.{3}|…)?$/i.test(progress.trim());
  }
  if(tool==='image'&&fastImageHandoff.has(currentImageSubmissionKey()))
    generate.title='This exact request is already preparing. Change the direction or wait for confirmation.';
  else generate.removeAttribute('title');
  const block=$('composer-generation-block'),reason=$('composer-generation-reason'),review=$('composer-review-queue');
  const queueBlocked=!busy&&owner&&submissionBlocked();
  let message='';
  if(generate.disabled){
    if(imageSubmissionPending)message='';
    // The action button already indicates busy state. Keep upload preparation out of
    // document flow so the deck does not temporarily acquire a third row.
    else if(busy)message='';
    else if(!owner)message='Sign in to generate.';
    else if(queueBlocked)message=activeJobs.some(j=>j.status==='uncertain'&&jobProvider(j)===currentProvider())?'A previous request has an unknown status. Review it before generating again.':'The active generation limit has been reached. Wait for a job to finish.';
    else if(tool==='image'&&fastImageHandoff.has(currentImageSubmissionKey()))message='This exact request is already preparing. Change the direction, or wait for confirmation before submitting the same settings again.';
    else if(imageEngine==='soulpro'&&!file)message=isSoul2()?'':'Add a base image.';
    else if(isSoul2()&&!config.higgsfieldEnabled)message='Connect your Higgsfield API credential in Cloudflare. Open Identity strength for setup details.';
    else if(isSoul2()&&!hf.ready())message='Choose or create a completed Soul ID using the identity photo tile.';
    else if(imageEngine==='soulpro'&&!isSoul2()&&!soulProIdentity.configured)message='Choose and save the identity reference photos.';
    else if(imageEngine==='soul'&&!soul.ready())message='Choose a trained LoRA.';
    else if(imageEngine==='soul'&&isReinterpret()&&!soul.reinterpretReady())message='This character needs a trained Reinterpret identity.';
    else if(!hasInput()&&imageEngine==='fal')message='Add one pose image, 1–4 identity photos and a prompt.';
    else if(usesReferenceGuidance()&&imageGuidance().error)message=imageGuidance().error;
    else if(moodUI.invalid(imageEngine,$('prompt').value,imageInputReferences().length,imageEngine==='zspicy'?'base':imageReferenceMode))message=moodUI.error(imageEngine,$('prompt').value,imageInputReferences().length,imageEngine==='zspicy'?'base':imageReferenceMode);
    else if(!$('prompt').value.trim())message='';
  }
  // A blocked/uncertain queue belongs in the top navigation Queue popover, not as a third row in the image deck.
  // Keep generation disabled until reviewed, and preserve the reason in the button tooltip.
  // Keep duplicate request messages in the Generate tooltip; never add an
  // extra status row that changes the floating deck height.
  const exactPreparing=tool==='image'&&fastImageHandoff.has(currentImageSubmissionKey());
  // A selected look without a prompt or photo already has a disabled Generate
  // button and a tooltip. Repeating the hint inline adds an unwanted third row.
  const idleMoodNeedsInput=moodUI.active()&&!imageInputReferences().length&&!$('prompt').value.trim();
  // Controlled Pose instructions belong to accessible hover guidance, not a
  // third row that changes the approved Image deck geometry.
  const inlineMessage=imageEngine==='fal'||queueBlocked||exactPreparing||idleMoodNeedsInput?'':message;
  block.hidden=!inlineMessage;reason.textContent=inlineMessage;review.hidden=true;
  const poseHint='Controlled Pose: add one Pose photo, 1–4 Identity photos, and a prompt.';
  const modelButton=$('image-composer-model');
  if(imageEngine==='fal'){
    const hint=poseHint;
    modelButton.title=hint;
    modelButton.setAttribute('aria-description',hint);
  }else{
    modelButton.removeAttribute('title');
    modelButton.removeAttribute('aria-description');
  }
  if(message)generate.setAttribute('aria-description',message);
  else generate.removeAttribute('aria-description');
  generate.title=message?(message+(queueBlocked?' Open Queue at the top right to review it.':'')):(isSoul2()?'Review the live Higgsfield price before any charge. PV Soul accepts one base image and one optional trained Soul ID; use Seedream for multiple reference photos.':'');
  syncImageReferences();
  fitImageComposerPrompt();
  syncImageGalleryEmpty();
}
function fitImageModelMenu(){
  // Natural height when all models fit. For overflow, show whole model rows
  // and preserve at least 15px of clearance below the Studio navigation.
  const menu=$('image-composer-model-menu'),trigger=$('image-composer-model'),header=$('studio-header');
  if(!menu||!trigger||menu.hidden)return;
  const available=Math.max(0,Math.floor(trigger.getBoundingClientRect().top-Math.max(0,header?.getBoundingClientRect().bottom||0)-24));
  menu.style.setProperty('--pv-model-menu-available',available+'px');
  menu.style.removeProperty('--pv-model-menu-fit');
  menu.classList.remove('has-overflow');
  const items=$('image-composer-model-items');
  if(items){
    // Measure the actual rows: descriptions can wrap on smaller viewports.
    const chrome=menu.getBoundingClientRect().height-items.getBoundingClientRect().height;
    const style=getComputedStyle(items);
    const topPadding=parseFloat(style.paddingTop)||0,bottomPadding=parseFloat(style.paddingBottom)||0;
    const space=Math.max(0,available-chrome-topPadding-bottomPadding);
    const rows=[...items.children];
    let fitted=0,rowsHeight=0;
    for(const row of rows){
      const height=row.getBoundingClientRect().height;
      if(rowsHeight+height>space+.25)break;
      rowsHeight+=height;
      fitted++;
    }
    // Keep Search and Create / manage characters fixed. Only the list scrolls.
    if(fitted>0&&fitted<rows.length){
      menu.style.setProperty('--pv-model-menu-fit',Math.min(available,Math.ceil(chrome+topPadding+rowsHeight))+'px');
      menu.classList.add('has-overflow');
    }
  }
  // Clamp horizontal positioning to the visual viewport on mobile.
  menu.style.left='0px';
  const rect=menu.getBoundingClientRect(),parent=menu.parentElement.getBoundingClientRect();
  if(rect.width){
    const limit=Math.max(12,window.innerWidth-rect.width-12);
    const visualLeft=Math.max(12,Math.min(rect.left,limit));
    menu.style.left=Math.round(visualLeft-parent.left)+'px';
  }
}
window.addEventListener('resize',()=>{if(imageMenuOpen)fitImageModelMenu();});
window.visualViewport?.addEventListener('resize',()=>{if(imageMenuOpen)fitImageModelMenu();});
function closeImageModelMenu(){
  imageMenuOpen=false;$('image-composer-model-menu').hidden=true;
  $('image-composer-model').setAttribute('aria-expanded','false');
}
function populateImageModelMenu(query=''){
  const items=$('image-composer-model-items'),value=query.trim().toLowerCase();
  items.replaceChildren();
  for(const option of $('image-engine').options){
    if(option.hidden)continue;
    const name=option.textContent,detail=imageModelDescriptions[option.value]||'Image creation';
    if(value&&!(name+' '+detail+(['seedream','seedreamlite','flash','zspicy'].includes(option.value)?' Artistic Freedom':'')).toLowerCase().includes(value))continue;
    const row=document.createElement('button');row.type='button';
    row.className='composer-model-option';row.dataset.value=option.value;row.disabled=busy||option.disabled;
    row.setAttribute('role','option');row.setAttribute('aria-selected',String(option.value===imageEngine));
    const icon=document.createElement('span');icon.className='composer-model-icon';setModelIcon(icon,option.value);
    const info=document.createElement('span');info.className='composer-model-info';
    const title=document.createElement('strong');title.textContent=name;
    const heading=document.createElement('span');heading.className='composer-model-heading';heading.append(title);
    if(['seedream','seedreamlite','flash','zspicy'].includes(option.value)){
      const badge=document.createElement('span');badge.className='composer-model-freedom';
      badge.title='SpicyAPI adds no platform content filter. The model may still decline a request.';
      const star=document.createElement('span');star.setAttribute('aria-hidden','true');star.textContent='✳';
      badge.append(star,document.createTextNode('Artistic Freedom'));heading.append(badge);
    }
    const caption=document.createElement('small');caption.textContent=detail;caption.title=detail;
    info.append(heading,caption);
    const active=document.createElement('span');active.className='composer-model-check';
    active.textContent=option.value===imageEngine?'✓':'';
    row.append(icon,info,active);
    row.onclick=()=>{
      if(busy)return;
      $('image-engine').value=option.value;
      $('image-engine').dispatchEvent(new Event('change',{bubbles:true}));
      closeImageModelMenu();
    };
    items.append(row);
  }
  if(!items.children.length){
    const empty=document.createElement('p');empty.className='composer-model-no-match';
    empty.textContent='No matching models';items.append(empty);
  }
}
function toggleImageSettings(force){
  const open=typeof force==='boolean'?force:!$('app').classList.contains('image-settings-open');
  $('app').classList.toggle('image-settings-open',open);
  $('image-settings-scrim').hidden=true;
  $('composer-options').hidden=!open;
  $('image-composer-more').setAttribute('aria-expanded',String(open));
  if(open){closeImageModelMenu();closeComposerLibrary();closeComposerAddMenu();}
}
function syncImageStudioMode(){
  const isImage=tool==='image'&&!fashionActive&&!retouchActive;
  $('app').classList.toggle('image-studio-active',isImage);
  imageStudio.hidden=!isImage;
  if(!isImage){sceneImageMenuClose();if(moodDiscoveryOpen)setMoodDiscoveryOpen(false);closeComposerLibrary();closeComposerAddMenu();}
  if(isImage){
    if(archive.parentElement!==$('image-gallery-host'))$('image-gallery-host').append(archive);
  }else{
    $('archive-rest-anchor').after(archive);
    closeImageModelMenu();toggleImageSettings(false);
  }
  syncImageComposer();
}
// Elements autocomplete changes only the text entry experience. Its underlying
// selected images and profiles remain in the existing private reference pipeline.
const elementSuggestions=$('scene-element-suggestions');
let elementMentionMatches=[];
// Keep accepted @Elements from being offered again when their input event
// synchronizes the prompt, while allowing another @ to open fresh suggestions.
const committedElementMentions=[];
function closeElementSuggestions(){
  elementSuggestions.hidden=true;elementSuggestions.replaceChildren();elementMentionMatches=[];
}
function elementMentionContext(){
  const field=$('image-composer-prompt');
  const cursor=field.selectionStart;
  const prefix=field.value.slice(0,cursor);
  const found=/(?:^|[\s(])@([^@\n,;]{0,70})$/.exec(prefix);
  if(!found)return null;
  const phrase=found[1],start=cursor-phrase.length-1;
  if(committedElementMentions.some(m=>m.start===start&&prefix.slice(start).startsWith(m.token)))return null;
  return {start,end:cursor,query:phrase.trim().toLocaleLowerCase()};
}
function updateElementSuggestions(){
  if(tool!=='image'||busy||!owner){closeElementSuggestions();return;}
  const found=elementMentionContext();
  if(!found){closeElementSuggestions();return;}
  const available=sceneLibrary?.items?.()||[];
  const matches=available.filter(entry=>entry.title.toLocaleLowerCase().includes(found.query)).slice(0,6);
  if(!matches.length){closeElementSuggestions();return;}
  elementMentionMatches=matches;
  elementSuggestions.replaceChildren();
  for(const entry of matches){
    const choice=document.createElement('button');choice.type='button';choice.className='scene-element-choice';
    choice.setAttribute('role','option');
    const name=document.createElement('strong');name.textContent='@'+entry.title;
    const kind=document.createElement('small');kind.textContent=entry.category.slice(0,-1)+' · '+entry.refs.length+' saved view'+(entry.refs.length===1?'':'s');
    choice.append(name,kind);
    choice.onmousedown=event=>event.preventDefault();
    choice.onclick=()=>{void chooseElementMention(entry);};
    elementSuggestions.append(choice);
  }
  elementSuggestions.hidden=false;
}
async function chooseElementMention(entry){
  const field=$('image-composer-prompt'),found=elementMentionContext();
  if(!found){closeElementSuggestions();return;}
  const token='@'+entry.title;
  field.value=field.value.slice(0,found.start)+token+field.value.slice(found.end);
  committedElementMentions.push({start:found.start,token});
  const cursor=found.start+token.length;
  field.focus();field.setSelectionRange(cursor,cursor);
  closeElementSuggestions();
  field.dispatchEvent(new Event('input',{bubbles:true}));
  await sceneLibrary?.useById?.(entry.id);
}
$('image-composer-prompt').addEventListener('keydown',event=>{
  if(elementSuggestions.hidden)return;
  if(event.key==='Escape'){closeElementSuggestions();event.stopPropagation();}
  if(event.key==='Enter'&&elementMentionMatches.length){
    event.preventDefault();void chooseElementMention(elementMentionMatches[0]);
  }
});
document.addEventListener('pointerdown',event=>{
  if(!event.target.closest('#scene-element-suggestions,#image-composer-prompt'))
    closeElementSuggestions();
});
$('image-composer-prompt').addEventListener('input',event=>{
  if(busy)return;
  const textbox=$('image-composer-prompt');
  const pastedAtEnd=event.inputType==='insertFromPaste'&&textbox.selectionEnd===textbox.value.length;
  // Removing or changing a selected mention makes it eligible again.
  for(let i=committedElementMentions.length-1;i>=0;i--){
    const mention=committedElementMentions[i];
    if(textbox.value.slice(mention.start,mention.start+mention.token.length)!==mention.token)
      committedElementMentions.splice(i,1);
  }
  $('prompt').value=textbox.value;
  $('prompt').dispatchEvent(new Event('input',{bubbles:true}));
  updateElementSuggestions();
  // A long paste at the end should land on the newest lines, not on the first.
  // Wait for the normal composer sync to fit the field, then scroll the field only.
  if(pastedAtEnd)requestAnimationFrame(()=>{
    if(document.activeElement!==textbox)return;
    fitImageComposerPrompt();
    textbox.scrollTop=textbox.scrollHeight;
  });
});
for(const [copy,real] of [
  ['image-composer-ratio','ratio'],['image-composer-resolution','resolution'],
  ['image-composer-count','image-count']
]){
  // Keep the visible composer authoritative for every explicit user selection.
  // Some browsers fire input before change on selects; handle both consistently.
  const syncFromComposer=()=>{
    if(busy)return;
    const next=$(copy).value,control=$(real);
    if(![...control.options].some(option=>option.value===next))return;
    if(control.value===next)return;
    control.value=next;
    control.dispatchEvent(new Event('input',{bubbles:true}));
  };
  $(copy).addEventListener('input',syncFromComposer);
  $(copy).addEventListener('change',syncFromComposer);
}
$('composer-review-queue').onclick=()=>{$('active').open=true;$('active').scrollIntoView({behavior:'smooth',block:'start'});$('active').querySelector('summary')?.focus();};
$('image-composer-generate').onclick=()=>{
  if(busy||tool!=='image')return;
  // Show prices only after the customer's explicit Generate click, keeping
  // the editor and references intact. Never attempt unpaid provider work.
  if(customerMode&&customerBillingReady&&window.__PV_LAB_NATIVE__!==1&&
     (customerCreditBalance<=0||customerTrialGenerationPaused&&!customerGenerationReady)){
    void pricingOverlay.open();
    return;
  }
  $('generate').click();
};
$('image-composer-moods-clear').onclick=event=>{
  event.preventDefault();event.stopPropagation();
  if(!busy&&moodUI.active())moodUI.clear();
};
$('image-composer-edit-area').onclick=()=>{
  if(busy||tool!=='image')return;
  const photo=imageBaseForRetouch();
  void openRetouch({file:photo?.file||null,id:photo?.id||null});
};
function openComposerPhotoInput(){
  const input=imageEngine==='soulpro'||isReinterpret()?$('soul-base-image'):$('reference-images');
  if(input&&!input.disabled)input.click();
}
$('image-composer-add').onclick=()=>{
  if(busy)return;
  if(imageEngine==='soul'&&!isReinterpret()){$('composer-character').click();return;}
  closeComposerLibrary();closeImageModelMenu();closeReferenceIntent();toggleImageSettings(false);moodUI.close();
  openComposerPhotoInput();
};
$('composer-add-saved-toggle').onclick=()=>{
  if(busy)return;
  if(window.__PV_LAB_NATIVE__!==1&&tool==='image'&&!['soul','soulpro'].includes(imageEngine)){
    if(packStudio.isOpen()){packStudio.close();return;}
    closeReferenceIntent();moodUI.close();closeImageModelMenu();toggleImageSettings(false);closeComposerLibrary();
    packStudio.open();
    $('composer-add-saved-toggle').setAttribute('aria-expanded','true');
    return;
  }
  if(!$('composer-library').hidden){closeComposerLibrary();return;}
  openComposerLibrary();
};
$('image-composer-more').onclick=()=>toggleImageSettings();
$('image-settings-scrim').onclick=()=>toggleImageSettings(false);
$('image-composer-model').onclick=()=>{
  moodUI.close();
  if(busy)return;
  closeComposerAddMenu();closeComposerLibrary();toggleImageSettings(false);
  imageMenuOpen=!imageMenuOpen;
  if(imageMenuOpen)closeReferenceIntent();
  $('image-composer-model-menu').hidden=!imageMenuOpen;
  $('image-composer-model').setAttribute('aria-expanded',String(imageMenuOpen));
  if(imageMenuOpen){$('image-composer-model-search').value='';populateImageModelMenu();fitImageModelMenu();$('image-composer-model-search').focus();}
};
$('image-composer-model-search').oninput=()=>{populateImageModelMenu($('image-composer-model-search').value);$('image-composer-model-items').scrollTop=0;fitImageModelMenu();};
$('image-composer-train').onclick=()=>{
  closeImageModelMenu();
  if(!busy)void hf.open();
};
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){moodUI.close();if($('soul-pro-identity-dialog').open){$('soul-pro-identity-dialog').close();return;}closeComposerAddMenu();closeImageModelMenu();toggleImageSettings(false);closeComposerLibrary();}
});
document.addEventListener('click',e=>{
  if(imageMenuOpen&&!e.target.closest('.composer-model-wrap'))closeImageModelMenu();
  if(!$('composer-options').hidden&&!e.target.closest('#composer-options,#image-composer-more'))toggleImageSettings(false);
  if(!e.target.closest('#composer-moods,#image-composer-moods'))moodUI.close();
});
const HISTORY_IMAGE_DRAG_TYPE='application/x-pvlab-history-asset';
imageComposer.addEventListener('dragover',e=>{
  const types=Array.from(e.dataTransfer?.types||[]);
  if(types.includes('Files')||types.includes(HISTORY_IMAGE_DRAG_TYPE)){
    e.preventDefault();
    e.dataTransfer.dropEffect='copy';
    imageComposer.classList.add('is-dragging');
  }
});
imageComposer.addEventListener('dragleave',e=>{
  if(!imageComposer.contains(e.relatedTarget))imageComposer.classList.remove('is-dragging');
});
imageComposer.addEventListener('drop',e=>{
  e.preventDefault();imageComposer.classList.remove('is-dragging');
  if(!owner||busy||tool!=='image')return;
  if(imageEngine==='zspicy'){notify('Z-Image creates from text only. Your photos are saved for when you switch back to an image model.',true);return;}
  // History uses small 480px gallery WebPs. Native image dragging may include
  // that thumbnail as a File, even when the saved original is much larger.
  // Prefer the authenticated saved output ID over the browser's preview file.
  if(Array.from(e.dataTransfer?.types||[]).includes(HISTORY_IMAGE_DRAG_TYPE)){
    const assetId=e.dataTransfer.getData(HISTORY_IMAGE_DRAG_TYPE);
    const available=/^[a-z0-9_-]{8,128}$/i.test(assetId)&&
      [...$('history').querySelectorAll('.history-media.is-result img[data-asset]')]
        .some(img=>img.dataset.asset===assetId&&img.dataset.result==='true');
    if(!available){
      notify('Could not locate that original in History. Refresh the gallery and try again.',true);
      return;
    }
    const session=epoch;
    void action(async()=>{
      const original=await assetFile(assetId,'history-image');
      if(!owner||session!==epoch||tool!=='image')return;
      if(imageEngine==='soulpro')await setImage(original,assetId);
      else await addReferences([original],[assetId]);
      syncImageComposer();
    });
    return;
  }
  const list=[...(e.dataTransfer?.files||[])];
  // External file drops retain existing validation and reference behavior.
  if(!list.length)return;
  const unsupported=window.__PV_LAB_NATIVE__===1?null:list.find(f=>!['image/jpeg','image/png','image/webp'].includes(f.type));
  if(unsupported){notify('Unsupported image format: '+(unsupported.name||'file')+'. Use JPG, PNG or WebP.',true);return;}
  void action(async()=>{
    if(imageEngine==='soulpro'){
      if(list.length!==1)throw new Error('Choose exactly one base image for Soul Pro.');
      await setImage(list[0]);
    }else await addReferences(list);
    syncImageComposer();
  });
});
$('image-composer-prompt').addEventListener('paste',e=>{
  const files=[...(e.clipboardData?.files||[])].filter(f=>f.type.startsWith('image/'));
  if(!files.length||busy||!owner)return;
  e.preventDefault();
  if(imageEngine==='zspicy'){notify('Z-Image creates from text only. Switch models to reuse your saved photos.',true);return;}
  void action(async()=>{if(imageEngine==='soulpro')await setImage(files[0]);else await addReferences(files);});
});


/* Video Studio: the composer remains pinned while the center history stream scrolls.
   The existing stage, History cards and backend are moved, not duplicated. */
const videoFeedCenter=$('video-feed-center');
const videoInspector=$('video-inspector');
const mainWorkspace=document.querySelector('#app>.workspace');
const mediaStage=mainWorkspace.querySelector('.stage');
const videoJobCache=new Map();
let selectedVideoJob=null;
let videoStartFrameHandoff=false;
let videoSelectionRevision=0;
let videoLoadJobId=null,videoLoadErrorJobId=null;

/* Effects reuses the existing Video quote, submit, history and credit pipeline. */
let effectViewOpen=false,activeVideoEffect=null,effectGalleryTicket=0,applyingVideoEffect=false;
const effectPicker=$('effect-gallery-picker'),effectPickerUrls=new Set();
function refreshEffectsView(){
  // "owner" means signed-in here. The server-verified session "owner: true" is separate.
  const effectsAllowed=owner&&ownerAccount;
  $('tool-effects').hidden=!effectsAllowed;
  if(!effectsAllowed){
    effectViewOpen=false;
    activeVideoEffect=null;
    // Direct /studio?effects=1 links must not open a public work-in-progress.
    if(owner&&new URLSearchParams(location.search).has('effects'))updateEffectUrl(false);
  }
  const explorer=effectViewOpen&&effectsAllowed&&tool==='video'&&!fashionActive&&!retouchActive&&!assetLibrary?.active();
  $('app').classList.toggle('effects-explore-active',explorer);
  $('video-effects-explore').hidden=!explorer;
  mainWorkspace.hidden=explorer;
  const chip=!!activeVideoEffect&&owner&&tool==='video'&&!explorer&&mode==='start'&&engine===activeVideoEffect.engine;
  $('video-effect-active').hidden=!chip;
  if(chip)$('video-effect-name').textContent=activeVideoEffect.name+($('prompt').value.trim()===activeVideoEffect.prompt?'':' · Edited');
  $('tool-effects').classList.toggle('active',explorer);
  $('tool-effects').setAttribute('aria-pressed',String(explorer));
  if(tool==='video'){
    $('tool-video').classList.toggle('active',!explorer);
    $('tool-video').setAttribute('aria-pressed',String(!explorer));
  }
}
function updateEffectUrl(open){
  const url=new URL(location.href);
  if(open)url.searchParams.set('effects','1');else url.searchParams.delete('effects');
  if(url.href!==location.href)history.replaceState(history.state,'',url);
}
function closeEffectsView(){effectViewOpen=false;updateEffectUrl(false);refreshEffectsView();}
function openEffectsView({scroll=true}={}){
  if(!owner||!ownerAccount||busy)return;
  if(tool!=='video')setTool('video');
  effectViewOpen=true;updateEffectUrl(true);refreshEffectsView();
  if(scroll)$('video-effects-explore').scrollIntoView({behavior:'instant',block:'start'});
}
function clearEffectPickerUrls(){
  ++effectGalleryTicket;
  for(const url of effectPickerUrls)URL.revokeObjectURL(url);
  effectPickerUrls.clear();$('effect-gallery-picker-grid').replaceChildren();
}
function closeEffectPicker(){if(effectPicker.open)effectPicker.close();else clearEffectPickerUrls();}
effectPicker.addEventListener('close',clearEffectPickerUrls);
$('effect-gallery-picker-close').onclick=closeEffectPicker;
async function openEffectImagePicker(){
  if(!owner||!ownerAccount||tool!=='video'||busy)return;
  clearEffectPickerUrls();
  const ticket=effectGalleryTicket,requestEpoch=epoch,grid=$('effect-gallery-picker-grid'),status=$('effect-gallery-picker-status');
  status.textContent='Loading your saved images…';effectPicker.showModal();
  try{
    const jobs=[],seen=new Set();let cursor=null;
    for(let page=0;page<5&&jobs.length<24;page++){
      const q=new URLSearchParams();
      if(cursor?.before&&cursor?.afterId){q.set('before',cursor.before);q.set('afterId',cursor.afterId);}
      const data=await api('/api/jobs?'+q.toString());
      if(!owner||requestEpoch!==epoch||ticket!==effectGalleryTicket)return;
      for(const job of data.jobs||[]){
        if(job.settings?.type!=='image'||job.status!=='completed'||!job.outputId||seen.has(job.outputId))continue;
        seen.add(job.outputId);jobs.push(job);if(jobs.length===24)break;
      }
      cursor=data.next;if(!cursor)break;
    }
    if(!jobs.length){status.textContent='No completed images in recent History. You can upload a photograph instead.';return;}
    status.textContent='Choose one of your '+jobs.length+' recent images. The full-resolution original will be used.';
    let selecting=false,nextThumb=0;
    const thumbnails=[];
    for(const job of jobs){
      const button=document.createElement('button');button.type='button';button.className='effect-gallery-choice';
      button.setAttribute('aria-label','Use saved image as effect start frame');
      const img=document.createElement('img');img.alt='Saved image preview';img.loading='lazy';
      const title=document.createElement('span');title.textContent=(job.settings?.engine||'Image')+' · Open';
      button.append(img,title);grid.append(button);thumbnails.push({id:job.outputId,img});
      button.onclick=()=>{
        if(selecting||!owner||requestEpoch!==epoch)return;
        selecting=true;status.textContent='Loading the full-resolution photograph…';
        void action(async()=>{
          try{
            const original=await assetFile(job.outputId,'effect-start-frame');
            if(!owner||requestEpoch!==epoch||ticket!==effectGalleryTicket)return;
            if(await setImage(original,job.outputId)){
              closeEffectPicker();
              notify('Saved photograph loaded as your start frame. Review the motion prompt and live price to generate.');
            }
          }finally{selecting=false;if(effectPicker.open)status.textContent='Choose a saved image.';}
        });
      };
    }
    const workers=Array.from({length:4},async()=>{
      while(nextThumb<thumbnails.length){
        const item=thumbnails[nextThumb++];
        try{
          const blob=await assetThumbnailBlob(item.id);
          if(!owner||requestEpoch!==epoch||ticket!==effectGalleryTicket)return;
          const url=URL.createObjectURL(blob);effectPickerUrls.add(url);item.img.src=url;
        }catch{/* Original remains selectable if its thumbnail is unavailable. */}
      }
    });
    void Promise.all(workers);
  }catch(error){
    if(owner&&requestEpoch===epoch&&ticket===effectGalleryTicket)status.textContent='Could not open Gallery: '+error.message;
  }
}
async function chooseVideoEffect(id){
  if(!owner||!ownerAccount||busy)return;
  const resolved=resolveVideoEffect(id,config.videoEngines);
  if(!resolved.ok)throw new Error(resolved.message);
  const {effect,settings:plan}=resolved;
  if(tool!=='video')setTool('video');
  const extras=!!lastFile||references.length>0||mediaRefs.count()>0;
  if(extras&&!confirm('This effect uses one start frame. Clear existing extra references and the optional end frame? Saved History will not be changed.'))return;
  const existingFile=extras?file:null,existingId=extras?sourceId:null;
  if(extras)clearMedia();
  if(engine!==plan.engine){
    $('video-engine').value=plan.engine;
    $('video-engine').onchange();
    if(engine!==plan.engine)throw new Error('The required video model could not be selected. Nothing generated.');
  }
  setMode('start');
  $('duration').value=String(plan.duration);
  $('resolution').value=plan.resolution;
  $('audio').checked=plan.audio;
  $('prompt').value=plan.prompt;
  $('seed').value='';
  if(existingFile)await setImage(existingFile,existingId);
  activeVideoEffect=effect;
  closeEffectsView();update();refreshEffectsView();
  notify(effect.name+' loaded. Choose a start photograph, then review the exact credit quote. No video has been generated.');
}
mountVideoEffectsGallery($('video-effects-grid'),id=>{
  if(applyingVideoEffect||busy||!owner||!ownerAccount)return;
  applyingVideoEffect=true;
  void chooseVideoEffect(id).catch(error=>{if(owner)notify(error.message,true);}).finally(()=>{
    applyingVideoEffect=false;
  });
});
$('tool-effects').onclick=()=>openEffectsView();
$('video-effects-custom').onclick=closeEffectsView;
$('video-effect-change').onclick=()=>openEffectsView();
$('video-effect-upload').onclick=()=>{if(owner&&ownerAccount&&!busy&&!$('image').disabled)$('image').click();};
$('video-effect-from-gallery').onclick=()=>void openEffectImagePicker();
$('prompt').addEventListener('input',refreshEffectsView);

function bringVideoPlayerIntoView(){
  if(tool!=='video')return;
  // The history feed scrolls independently on desktop, so opening a video
  // without returning to the player above makes its cards appear unresponsive.
  videoFeedCenter.scrollTo({top:0,behavior:'instant'});
  if(window.matchMedia('(max-width:820px)').matches)
    mediaStage.scrollIntoView({behavior:'instant',block:'start'});
}
function showVideoJobStage(job){
  if(tool!=='video'||!job||job.settings?.type!=='video')return;
  const status=String(job.status||'submitting');
  const phase=status==='completed'
    ?!hasResult(job)?'missing':videoLoadErrorJobId===job.id?'load-error':videoLoadJobId===job.id?'loading':'completed'
    :status;
  const states={
    submitting:['Submitting','Starting your video','Your confirmed request is being submitted.'],
    queued:['Queued','Video queued','Waiting for the video model to begin processing.'],
    running:['Processing','Generating video','Your video is being created. You can leave this page and return to History.'],
    saving:['Finalizing','Finishing your video','Saving your result to private History.'],
    uncertain:['Review needed','Status unconfirmed','Check History before submitting another paid generation.'],
    failed:['Failed','Video generation failed','No video was returned. Review this record in History before trying again.'],
    resolved:['Unavailable','Video unavailable','This request did not produce a downloadable video.'],
    completed:['Saved','Video saved in History','Select the video thumbnail to open the player.'],
    loading:['Loading','Opening video','Loading the saved video for playback.'],
    'load-error':['Unavailable','Could not open video','The saved video could not be loaded. Select its thumbnail to retry.'],
    missing:['Unavailable','Video file unavailable','This job is marked completed, but no saved video file is available.']
  };
  const words=states[phase]||['Processing','Generating video','Your request is in progress.'];
  const stage=$('video-job-stage');
  if(job.outputId&&resultId===job.outputId&&resultUrl){stage.hidden=true;return;}
  stage.dataset.phase=phase;
  $('video-job-stage-state').textContent=words[0];
  $('video-job-stage-title').textContent=words[1];
  $('video-job-stage-message').textContent=words[2];
  const details=job.settings||{};
  $('video-job-stage-meta').textContent=[
    videoLabel(details),
    details.duration?details.duration+' sec':null,
    details.resolution?String(details.resolution).toUpperCase():null,
    details.aspectRatio&&details.aspectRatio!=='auto'?details.aspectRatio:null
  ].filter(Boolean).join(' · ');
  $('preview').hidden=true;$('video').pause();$('video').hidden=true;
  $('empty').hidden=true;$('download').hidden=true;
  $('preview-label').textContent=words[0]+' / Video';
  stage.hidden=false;
  if(!job.id){
    $('video-inspector-selected').hidden=true;
    $('video-inspector-empty').hidden=false;
    $('video-detail-status').textContent=words[0];
    // Preserve Current scene fields used by the live inspector renderer.
    $('video-inspector-empty').querySelector('.pv-video-sidebar-footnote').textContent=words[2];
  }
}
// The Video inspector only previews the real media bound to the selected job.
// Every thumbnail uses PV LAB's authenticated private-thumbnail helper.
function updateVideoInspectorReferences(job){
  const section=$('pv-video-detail-references'),strip=$('pv-video-detail-reference-strip');
  if(!section||!strip)return;
  const setting=job?.settings||{};
  const ids=Array.isArray(setting.referenceSourceIds)?setting.referenceSourceIds.filter(Boolean).slice(0,8):[];
  if(!ids.length&&setting.mode==='start'&&job?.sourceId)ids.push(job.sourceId);
  const key=job?.id?job.id+':'+ids.join(','):'';
  section.hidden=!ids.length;
  if(strip.dataset.key===key)return;
  strip.dataset.key=key;
  strip.replaceChildren();
  for(let i=0;i<ids.length;i++){
    const tile=document.createElement('div');
    tile.className='pv-video-ref-thumb';
    const role=setting.referenceRoles?.[i]?.role||'image';
    tile.title='Original '+role+' reference '+(i+1);
    tile.setAttribute('aria-label','Original '+role+' reference '+(i+1));
    strip.append(tile);
    composerAssetPhoto(tile,ids[i]);
  }
}
function updateVideoInspector(job){
  if(!videoInspector)return;
  const isSelected=tool==='video'&&!!job;
  $('app').classList.toggle('pv-video-history-selected',isSelected);
  const back=$('pv-video-history-back');if(back)back.hidden=!isSelected;
  $('video-inspector-empty').hidden=!!job;
  $('video-inspector-selected').hidden=!job;
  updateVideoInspectorReferences(job);
  if(!job){
    $('video-detail-status').textContent=videoStartFrameHandoff&&file?'Start frame':'';
    const sceneFoot=$('video-inspector-empty').querySelector('.pv-video-sidebar-footnote');
    if(sceneFoot)sceneFoot.textContent=tool==='video'&&mode==='start'&&!!file?'Start frame ready. Describe its motion to generate a video.':'Settings for your next video. Nothing has been generated.';
    for(const card of $('history').querySelectorAll('.is-current-video'))card.classList.remove('is-current-video');
    return;
  }
  const settings=job.settings||{},ready=hasResult(job);
  $('video-detail-status').textContent=job.status==='failed'&&isContentRestriction(job.error)?'Restricted':String(job.status||'').replace(/^./,c=>c.toUpperCase());
  $('video-detail-model').textContent=videoLabel(settings);
  $('video-detail-prompt').textContent=settings.prompt||'No motion direction saved.';
  $('video-detail-duration').textContent=settings.duration?settings.duration+' s':'Not set';
  $('video-detail-resolution').textContent=String(settings.resolution||'Not set').toUpperCase();
  $('video-detail-ratio').textContent=String(settings.aspectRatio||'Source');
  $('video-detail-date').textContent=detailDate(job.createdAt);
  $('video-detail-watch').disabled=!ready;
  $('video-detail-download').disabled=!ready;
  $('video-detail-delete').disabled=activeStates.has(job.status);
  fillDetailExtraActions(job,'video');
  for(const card of $('history').querySelectorAll('.card[data-kind="video"]'))
    card.classList.toggle('is-current-video',card.dataset.job===job.id);
}
function showVideoHistoryRecord(job,{play=true,reveal=false}={}){
  if(!job||!owner)return;
  videoStartFrameHandoff=false;
  selectedVideoJob=job;
  const selection=++videoSelectionRevision;
  const alreadyLoaded=!!(resultUrl&&resultId===job.outputId);
  const load=play&&hasResult(job)&&!alreadyLoaded;
  videoLoadJobId=load?job.id:null;
  videoLoadErrorJobId=null;
  updateVideoInspector(job);
  if(tool==='video'){
    if(autoPreview?.id&&autoPreview.id!==job.id)autoPreview=null;
    if(resultUrl&&resultId!==job.outputId)clearResult();
    showVideoJobStage(job);
    if(reveal)bringVideoPlayerIntoView();
    if(load)void viewMedia(async()=>{
      try{await openVideo(job,{scroll:false});}
      catch(error){
        if(tool==='video'&&selection===videoSelectionRevision&&selectedVideoJob?.id===job.id){
          videoLoadErrorJobId=job.id;
          showVideoJobStage(job);
        }
        throw error;
      }finally{
        if(selection===videoSelectionRevision&&selectedVideoJob?.id===job.id){
          videoLoadJobId=null;
          if(tool==='video'&&(!resultUrl||resultId!==job.outputId))showVideoJobStage(job);
        }
      }
    });
  }
}
// Keep a creation workspace until a user explicitly selects History or submits
// a new generation. Merely loading/refreshing History must not hijack the stage.
function clearVideoHistorySelection({reset=true}={}){
  ++videoSelectionRevision;videoLoadJobId=null;videoLoadErrorJobId=null;
  selectedVideoJob=null;updateVideoInspector(null);
  $('video-job-stage').hidden=true;
  if(reset&&tool==='video')resetPreview();
}
function restoreLatestVideoSelection(){
  if(tool!=='video'||!owner)return;
  const available=[...videoJobCache.values()];
  $('video-feed-empty').hidden=available.length>0;
  if(videoStartFrameHandoff&&!resultId){
    selectedVideoJob=null;updateVideoInspector(null);$('video-job-stage').hidden=true;return;
  }
  if(selectedVideoJob&&videoJobCache.has(selectedVideoJob.id)){
    selectedVideoJob=videoJobCache.get(selectedVideoJob.id);
    updateVideoInspector(selectedVideoJob);
    showVideoJobStage(selectedVideoJob);
    return;
  }
  if(selectedVideoJob&&historyLoading)return; // a refresh is still restoring its records
  if(selectedVideoJob){clearVideoHistorySelection();return;}
  updateVideoInspector(null);
  $('video-job-stage').hidden=true;
}
function syncVideoStudioMode(){
  if(!mainWorkspace)return;
  const videoMode=tool==='video'&&!fashionActive&&!retouchActive;
  $('app').classList.toggle('video-studio-active',videoMode);
  // Apply the final Video track widths in the same render as the video route.
  // A later MutationObserver-only toggle causes the brief rightward layout jump.
  $('app').classList.toggle('pv-video-ergonomic',videoMode);
  $('app').classList.toggle('pv-video-seedance',videoMode&&engine==='seedance');
  $('app').classList.toggle('pv-video-wan',videoMode&&['wan','wanprime'].includes(engine));
  mainWorkspace.classList.toggle('video-layout',videoMode);
  videoFeedCenter.hidden=!videoMode;
  videoInspector.hidden=!videoMode;
  if(videoMode){
    if(mediaStage.parentElement!==videoFeedCenter)
      videoFeedCenter.prepend(mediaStage);
    if(archive.parentElement!==videoFeedCenter)
      videoFeedCenter.append(archive);
    mainWorkspace.classList.add('video-layout');
    restoreLatestVideoSelection();
  }else{
    if(mediaStage.parentElement!==mainWorkspace)
      mainWorkspace.insertBefore(mediaStage,videoFeedCenter);
    if(archive.parentElement===videoFeedCenter)
      $('archive-rest-anchor').after(archive);
  }
}
$('pv-video-history-back').onclick=()=>{
  if(tool!=='video'||busy)return;
  clearVideoHistorySelection();
  videoFeedCenter.scrollTo({top:0,behavior:'instant'});
};
$('video-detail-watch').onclick=()=>{
  if(selectedVideoJob&&hasResult(selectedVideoJob))
    void viewMedia(()=>openVideo(selectedVideoJob,{scroll:false}));
};
$('video-detail-reuse').onclick=()=>{
  if(selectedVideoJob&&!busy)void action(()=>restore(selectedVideoJob));
};
$('video-detail-download').onclick=()=>{
  if(selectedVideoJob&&hasResult(selectedVideoJob))
    void action(()=>downloadJob(selectedVideoJob));
};
$('video-detail-delete').onclick=()=>{
  const job=selectedVideoJob;
  if(!job||busy||activeStates.has(job.status))return;
  if(!confirm('Delete this History record and its unshared files? This cannot be undone.'))return;
  void action(async()=>{
    await api('/api/jobs/'+job.id,{method:'DELETE'});
    const card=[...$('history').children].find(el=>el.dataset.job===job.id);
    if(card){cleanupHistoryCard(card);card.remove();}
    videoJobCache.delete(job.id);clearVideoHistorySelection();
    await syncHistory();restoreLatestVideoSelection();
    notify('Video record deleted. Spending history is unchanged.');
  });
};

/* The canvas is a genuine import surface, not a dead decorative placeholder. */
/* Studio entry actions are UI only: never trigger paid requests. */
function emptyExperience(){
  if(tool==='upscale')return {
    title:'Upscaler',
    description:'Restore fine detail and resolution while keeping your original composition.',
    action:'source',button:'Upload image',secondary:'',secondaryAction:'',
    footnote:'UPSCALED OUTPUTS ARE SAVED IN ASSETS'
  };
  if(tool==='video'){
    if(mode==='extend')return {title:'Continue the scene.',description:'Upload a video and describe what happens next.',action:'extend',button:'Choose a video',secondary:'Write the direction',secondaryAction:'prompt',footnote:'YOUR ORIGINAL VIDEO STAYS UNCHANGED'};
    if(mode==='text')return {
      title:'Describe the scene',
      description:'Write the movement, setting and sound for your video.',
      action:'prompt',button:'Write a direction',secondary:'Create an image first',secondaryAction:'image',
      footnote:'START WITH A DIRECTION'
    };
    if(mode==='reference')return {
      title:'Guide the motion with references',
      description:'Upload images or choose saved elements, then describe how they move and interact.',
      action:'references',button:'Upload images',secondary:'Write the direction',secondaryAction:'prompt',
      footnote:'YOUR REFERENCES STAY SEPARATE FROM GENERATED RESULTS'
    };
    return {
      title:'Your next scene starts here',
      description:'Choose an opening image to animate. Add an end frame only if you need a specific finish.',
      action:'source',button:'Choose start frame',secondary:'Create an image first',secondaryAction:'image',
      footnote:'A STILL IS ONLY THE BEGINNING'
    };
  }
  if(imageEngine==='soulpro')return {
    title:isSoul2()?'Your image, reimagined.':'Another identity. Same frame.',
    description:isSoul2()?'Reinterpret a photograph. Add a trained character whenever you want.':'Choose a photograph. Your saved Nina identity can become part of the scene.',
    action:'source',button:'Choose base image',secondary:'Add an instruction',secondaryAction:'prompt',
    footnote:'YOUR BASE PHOTOGRAPH CONTROLS THE COMPOSITION'
  };
  if(imageEngine==='zspicy')return {
    title:'Start from an idea.',
    description:'Describe an original frame and choose a Mood. This text-only model cannot use photographs.',
    action:'prompt',button:'Write an image prompt',secondary:'',secondaryAction:'',
    footnote:'TEXT-TO-IMAGE ONLY'
  };
  if(imageEngine==='fal')return {
    title:'A composition you control.',
    description:'Combine pose and identity references, then direct the image.',
    action:'references',button:'Add references',secondary:'Write the direction',secondaryAction:'prompt',
    footnote:'NO GENERATED IMAGE YET'
  };
  if(imageEngine==='soul'&&!isReinterpret())return {
    title:'A character in a new frame.',
    description:'Write a direction for your trained character, then make the image.',
    action:'prompt',button:'Write a direction',secondary:'',secondaryAction:'',
    footnote:'NO GENERATED IMAGE YET'
  };
  return {
    title:'Give an idea a form.',
    description:'Begin with a few words, or bring visual references into the frame.',
    action:'prompt',button:'Write an image prompt',secondary:'Add references',secondaryAction:'references',
    footnote:'NO GENERATED IMAGE YET'
  };
}
function refreshCanvasImport(){
  const main=$('canvas-import'),secondary=$('canvas-secondary');
  if(!main||!secondary)return;
  const experience=emptyExperience();
  $('empty-title').textContent=experience.title;
  $('empty-description').textContent=experience.description;
  $('empty-footnote').textContent=experience.footnote;
  main.dataset.action=experience.action;
  const mainText=main.firstChild;
  if(mainText&&mainText.nodeType===Node.TEXT_NODE)mainText.textContent=experience.button+' ';
  secondary.hidden=!experience.secondary;
  secondary.dataset.action=experience.secondaryAction;
  if(experience.secondary){
    const label=secondary.firstChild;
    if(label&&label.nodeType===Node.TEXT_NODE)label.textContent=experience.secondary+' ';
  }
}
function runCanvasEntry(action){
  if(busy||!owner)return;
  if(action==='image'){$('tool-image').click();return;}
  if(action==='prompt'){
    if(!$('prompt').hidden&&!$('prompt').disabled)$('prompt').focus();
    return;
  }
  const input=action==='extend'?$('video-references'):action==='references' ? $('reference-images') : $('image');
  if(input&&!input.disabled)input.click();
}
$('canvas-import').addEventListener('click',()=>runCanvasEntry($('canvas-import').dataset.action));
$('canvas-secondary').addEventListener('click',()=>runCanvasEntry($('canvas-secondary').dataset.action));
$('soul-use').onclick=()=>{if(busy)return;imageEngine='soul';$('image-engine').value='soul';setTool('image');window.scrollTo({top:0,behavior:'smooth'});};
$('soul-launch-manage').onclick=()=>{if(busy)return;imageEngine='soul';$('image-engine').value='soul';setTool('image');$('soul-dialog').showModal();void soul.load().catch(e=>notify(e.message,true));};
$('tool-upscale').onclick=()=>{if(!busy)setTool('upscale');};
$('upscale-model-trigger').onclick=()=>{
  if(busy)return;
  if($('upscale-model-menu').hidden)openUpscaleModelMenu();else closeUpscaleModelMenu();
};
$('upscale-model-trigger').onkeydown=event=>{
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();openUpscaleModelMenu();}
};
$('upscale-model-menu').addEventListener('click',event=>{
  const option=event.target.closest('[data-upscale-engine]');
  if(!option||!$('upscale-model-menu').contains(option)||busy)return;
  const value=option.dataset.upscaleEngine;
  if(!UPSCALE_PUBLIC_ENGINES.includes(value))return;
  $('upscale-engine').value=value;
  $('upscale-engine').dispatchEvent(new Event('change',{bubbles:true}));
  closeUpscaleModelMenu(true);
});
$('upscale-model-menu').addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();closeUpscaleModelMenu(true);return;}
  const choices=[...$('upscale-model-menu').querySelectorAll('button:not(:disabled)')],index=choices.indexOf(document.activeElement);
  if(['ArrowUp','ArrowDown','Home','End'].includes(event.key)){
    event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?choices.length-1:event.key==='ArrowUp'?(index-1+choices.length)%choices.length:(index+1)%choices.length;
    choices[next]?.focus({preventScroll:true});
  }
});
document.addEventListener('pointerdown',event=>{
  if(!$('upscale-model-menu').hidden&&!event.target.closest('#upscale-model-display'))closeUpscaleModelMenu();
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!$('upscale-model-menu').hidden){event.preventDefault();closeUpscaleModelMenu(true);}
});
$('upscale-engine').onchange=()=>{
  if(busy){$('upscale-engine').value=upscaleEngine;return;}
  const value=$('upscale-engine').value;
  if(!UPSCALE_PUBLIC_ENGINES.includes(value)){$('upscale-engine').value=upscaleEngine;return;}
  if(value===upscaleEngine){updateUpscaleModel();return;}
  upscaleEngine=value;
  clearUpscalePrice();
  upscalePriceMessage='Model changed. A fresh estimate is checked before upscaling. No job submitted.';
  if(value==='topaz-precision')$('upscale-info').open=true;
  $('notice').textContent='';$('notice').classList.remove('error');
  update();
};
for(const id of ['upscale-topaz-model','upscale-scale'])$(id).onchange=()=>{if(busy)return;invalidateUpscalePrice('Upscale settings changed. Check the price and output size again.');update();};
$('tool-fashion').onclick=()=>void openFashionStudio();
$('tool-retouch').onclick=()=>{if(!busy)void openRetouch({autofill:true});};
$('tool-image').onclick=()=>{if(!busy)setTool('image');};
$('tool-video').onclick=()=>{if(!busy)setTool('video');};
$('image-engine').onchange=()=>{if(busy)return;closeComposerAddMenu();closeComposerLibrary();const value=$('image-engine').value;imageRatioExplicit=false;soulRatioExplicit=false;imageEngine=['flash','kling','qwen3','krea3','zspicy','seedreamlite','gemini21'].includes(value)?value:value==='gemini'?'gemini':value==='soulpro'?'soulpro':value==='soul'?'soul':value==='fal'?'fal':'seedream';if(imageEngine==='kling'&&imageReferenceMode==='references')imageReferenceMode='base';poseMapSourceId=null;$('pose-preview-status').textContent='';if(imageEngine==='gemini21')imageProcessing='normal';$('image-processing').value=imageProcessing;setTool('image');renderReferences();prewarmSeedreamDeck();if(imageEngine==='zspicy')$('image-composer-prompt').focus({preventScroll:true});};
$('image-processing').onchange=()=>{if(busy)return;imageProcessing=$('image-processing').value==='batch'?'batch':'normal';setTool('image');};
function updateSoulProModelUi(){
  $('hf-settings').hidden=soulProModel!=='soul2';$('soul-pro-reference-profile').hidden=soulProModel==='soul2';
  $('soul-pro-seed').min=soulProModel==='soul2'?'1':'0';$('soul-pro-seed').max=soulProModel==='soul2'?'1000000':'2147483647';
  $('soul-pro-quality-row').hidden=soulProModel!=='ideogram45';
  $('soul-pro-note').textContent=soulProModel==='soul2'?'Official Higgsfield Soul 2. Create Soul IDs from photos in this Lab; Qwen LoRAs are not compatible.':soulProModel==='ideogram45'?'Precise Edit stays enabled at every quality tier. Medium is the default at $0.06; High is optional at $0.22.':'Kontext Max accepts 4 images total, so PV Lab sends the base image first plus up to 3 saved Nina identity references. Fixed estimate: $0.08 per image.';
}
$('soul-pro-model').onchange=()=>{if(busy)return;soulProModel=['soul2','kontextmax'].includes($('soul-pro-model').value)?$('soul-pro-model').value:'ideogram45';updateSoulProModelUi();update();};
$('soul-pro-quality').onchange=()=>{if(busy)return;soulProQuality=['very_low','low','medium','high'].includes($('soul-pro-quality').value)?$('soul-pro-quality').value:'medium';update();};
let newCustomerGrant=null;
const sessionRequest=createSessionRequest({
  baseUrl:API,getSession:()=>clerk?.session,
  onNewCustomer:grant=>{if(grant.sessionId===clerk?.session?.id)newCustomerGrant=grant;}
});
function hideFirstCreditToast(){
  const toast=$('pv-credit-toast');
  if(toast){toast.classList.remove('is-visible');toast.hidden=true;}
}
function showFirstCreditToast(profile){
  // The complimentary toast must not appear for purchased credit balances.
  if(profile?.welcomeCreditsPaused===true){newCustomerGrant=null;return;}
  const grant=newCustomerGrant;
  if(!grant||!profile?.customer||profile.owner!==false||
    grant.ownerId!==profile.ownerId||grant.sessionId!==clerk?.session?.id||
    !Number.isSafeInteger(profile.balanceCredits)||profile.balanceCredits<200)return;
  newCustomerGrant=null;
  const toast=$('pv-credit-toast');
  if(!toast)return;
  toast.hidden=false;
  requestAnimationFrame(()=>toast.classList.add('is-visible'));
  setTimeout(()=>{
    toast.classList.remove('is-visible');
    setTimeout(()=>{if(!toast.classList.contains('is-visible'))toast.hidden=true;},420);
  },3500);
}
async function api(path,options={}) {
  const generation=epoch;
  if(!owner&&path!=='/api/session')throw new Error('Sign in first.');
  const assertCurrent=()=>{if(generation!==epoch)throw new Error('Session changed.');};
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),path==='/api/session'?18000:path==='/api/gemini/jobs'||path==='/api/image-models/generate'?240000:path==='/api/fal/soul-pro'||path==='/api/fal/krea'||path==='/api/jobs'&&options.method==='POST'?150000:path==='/api/soul/datasets'?120000:65000);requestControllers.add(controller);
  try{
    const headers={...options.headers};let b=options.body;
    if(b!==undefined&&!(b instanceof Blob)&&!(b instanceof ArrayBuffer)){headers['Content-Type']='application/json';b=JSON.stringify(b);}
    const r=await sessionRequest(path,{method:options.method||'GET',headers,body:b,cache:'no-store',credentials:'omit',signal:controller.signal},assertCurrent);
    assertCurrent();
    if(!r.ok){
      const d=await r.json().catch(()=>({}));
      const fundingError=customerMode&&(r.status===402||
        (r.status===403&&/complimentary generation is paused/i.test(String(d.error||''))));
      if(fundingError){
        void wallet.refresh();
        // A background preview quote is preparation, not a request to buy.
        // Open plans only inside an explicit Generate action, preserving drafts.
        const generating=imageSubmissionPending||customerPriceIntentPending||
          busy&&(tool==='video'||tool==='upscale');
        if(generating&&options.method==='POST'&&!path.startsWith('/api/billing/')&&!path.startsWith('/api/customer/'))
          void pricingOverlay.open();
      }
      throw new Error(fundingError?'Choose credits when you are ready to generate. Your prompt and photographs stay in place.':d.error||`Request failed (${r.status}).`);
    }
    const value=options.blob?await r.blob():await r.json();assertCurrent();
    // Refresh the real wallet after a reserved job or a confirmed failed job. Never infer a debit locally.
    if(customerMode&&((options.method==='POST'&&(value?.job||Array.isArray(value?.jobs)))||(/^\/api\/jobs\/[^/]+$/.test(path)&&value?.job?.status==='failed')))void wallet.refresh();
    if(options.method==='DELETE'||path==='/api/jobs/bulk-delete'){clearAssetCache();void deviceMediaCache.clear();}return value;
  }finally{clearTimeout(timeout);requestControllers.delete(controller);}
}
async function action(fn){if(busy)return;busy=true;update();try{await fn();}catch(e){notify(e.name==='AbortError'?'Request interrupted. Refresh history before trying another generation.':e.message,true);}finally{busy=false;update();}}
async function viewMedia(fn){const generation=epoch;try{await fn();}catch(e){if(owner&&generation===epoch)notify(e.message,true);}}
const soul=createSoulController({api,action,notify,changed:update,owner:()=>owner,modeChanged:()=>setTool('image')});
const upscaleResultUI=createUpscaleResultUI({
  download:()=>downloadResult(),
  again:()=>{
    const button=$('generate');
    button.scrollIntoView({behavior:'smooth',block:'center'});
    button.focus({preventScroll:true});
  },
  loadSource:id=>assetBlob(id)
});
function clearResult(){$('video-job-stage').hidden=true;upscaleResultUI.clear();previewRevision++;if(resultUrl){$('preview').removeAttribute('src');$('preview').hidden=true;}release(resultUrl);resultUrl=null;resultId=null;resultSettings=null;$('video').pause();$('video').removeAttribute('src');$('video').load();$('video').hidden=true;$('download').hidden=true;}
function resetPreview(){
  clearResult();
  if(tool==='video'&&mode==='extend'&&mediaRefs.firstVideo()){const clip=mediaRefs.firstVideo();$('video').src=clip.url;$('video').hidden=false;$('preview').hidden=true;$('empty').hidden=true;$('preview-label').textContent='Video to extend';return;}
  // Video References has its own composition area. Even with real reference
  // photos attached, show their montage rather than treating Reference 1 as
  // an unrelated full-canvas generated result. The inputs are unchanged.
  // Image generation has a result-only canvas. Inputs remain in the reference list.
  const item=tool==='image'&&imageEngine!=='soulpro'||tool==='video'&&['text','reference'].includes(mode)?null:(tool==='upscale'||mode==='start')?
    (sourceUrl?{url:sourceUrl,label:tool==='upscale'?'Upscale input':'Start frame'}:null):
    (references[0]?{url:references[0].url,label:'Reference 1 / input'}:null);
  $('preview').alt='Uploaded source image, not a generated result';
  if(item){$('preview').src=item.url;$('preview').hidden=false;$('empty').hidden=true;$('preview-label').textContent=tool==='upscale'?'Original · '+sourceWidth+' × '+sourceHeight+' px':tool==='video'?item.label:item.label+' / not a result';if(tool==='upscale')upscaleResultUI.source({width:sourceWidth,height:sourceHeight});}
  else{
    $('preview').removeAttribute('src');$('preview').hidden=true;$('empty').hidden=false;
    $('preview-label').textContent=tool==='image'?'Result / Image':'Source / preview';
    refreshCanvasImport();
  }
}
function refreshInputPreview(){autoPreview=null;if(tool!=='image'||!resultUrl)resetPreview();}
function releaseReference(item){seedreamPreparer.forget(item.file);release(item.url);release(item.thumbUrl);}
function closeInputPreview(){const dialog=$('input-preview-dialog');if(dialog.open)dialog.close();$('input-preview-image').removeAttribute('src');}
function viewReference(item,index){
  if(!owner)return;
  $('input-preview-title').textContent='Reference '+(index+1)+' / Input';
  $('input-preview-description').textContent=item.file.name+' / '+item.width+' × '+item.height+' pixels in the original. Display preview only, not a generated result.';
  $('input-preview-image').src=item.url;
  $('input-preview-dialog').showModal();
}
$('input-preview-dialog').addEventListener('close',()=>{$('input-preview-image').removeAttribute('src');});

function clearMedia(){inspirationMoodId=null;videoLoadJobId=null;videoLoadErrorJobId=null;++videoSelectionRevision;videoStartFrameHandoff=false;imageReferenceMode=preferredImageReferenceMode();closeReferenceIntent();imageRatioExplicit=false;soulRatioExplicit=false;customerImagePricing?.reset();clearUpscalePrice();mediaRefs.clear();if(!fastImageHandoff.active())cancelImagePreparation();seedreamPreparer.clear();closeInputPreview();poseMapSourceId=null;$('pose-preview-status').textContent='';$('reference-progress').textContent='';imageRevision++;sourcePixels=0;sourceWidth=0;sourceHeight=0;release(sourceUrl);release(lastUrl);sourceUrl=null;lastUrl=null;file=null;sourceId=null;lastFile=null;lastSourceId=null;$('image').value='';$('last-image').value='';for(const r of references)releaseReference(r);references=[];$('reference-images').value='';frameMaker?.clear();$('filemeta').textContent=sourceHelp();$('last-filemeta').textContent='Leave empty for an open ending.';renderReferences();clearResult();resetPreview();update();}
async function inspectImage(candidate){
  if(tool==='upscale'&&candidate?.size>20*1024*1024)candidate=await prepareUpscaleInput(candidate,{maxBytes:20*1024*1024});
  if(window.__PV_LAB_NATIVE__===1)candidate=await preparePhotoInput(candidate,{maxBytes:20*1024*1024});
  if(!candidate)throw new Error('No image was provided. Drop a JPG, PNG or WebP photograph.');
  if(candidate.size>20*1024*1024)throw new Error('Image too large: '+(candidate.name||'photograph')+' ('+(Math.ceil(candidate.size/104857.6)/10).toFixed(1)+' MB). Maximum size is 20 MB per image. Compress it and try again.');
  if(!['image/jpeg','image/png','image/webp'].includes(candidate.type))throw new Error('Unsupported image format: '+(candidate.name||'file')+'. Use JPG, PNG or WebP.');
  if(!candidate.size)throw new Error('This image is empty. Choose another JPG, PNG or WebP photograph.');
  // Image previews already enforce 72 MP, and Seedream builds a separate <=34 MP provider working copy.
  // Keep uploaded originals untouched; do not reject a valid 6048 x 8064 (48.8 MP) camera photo by 64 pixels.
  const seedanceInput=tool==='video'&&engine==='seedance',maxSide=tool==='upscale'?16000:seedanceInput?6000:tool==='image'?12000:8000;
  if(tool==='image'&&imageEngine==='kling'){
    const issue=modelImageInputIssue('kling',[{file:candidate}]);if(issue)throw new Error(issue);
  }
  const prepared=await imagePreview(candidate),{width,height}=prepared;
  if(tool==='image'&&imageEngine==='kling'){
    const issue=modelImageInputIssue('kling',[{file:candidate,width,height}]);if(issue)throw new Error(issue);
  }
  const minimum=seedanceInput?300:240;
  if(Math.min(width,height)<minimum)throw new Error('Image too small: '+(candidate.name||'photograph')+' ('+width+' × '+height+' px). Minimum '+minimum+' × '+minimum+' px.');
  if(Math.max(width,height)>maxSide)throw new Error('Image dimensions too large: '+(candidate.name||'photograph')+' ('+width+' × '+height+' px). Maximum '+maxSide.toLocaleString()+' pixels per side.');
  if(Math.max(width/height,height/width)>(seedanceInput?2.5:8))throw new Error('Unsupported image proportions: '+(candidate.name||'photograph')+' ('+width+' × '+height+' px). Choose a less extreme aspect ratio.');
  return {file:candidate,id:null,url:URL.createObjectURL(prepared.preview),thumbUrl:URL.createObjectURL(prepared.thumbnail),width,height};
}

async function setImage(candidate,id=null){clearImageComposerNotice();const revision=++imageRevision,item=await inspectImage(candidate);release(item.thumbUrl);if(revision!==imageRevision||!owner){release(item.url);return false;}release(sourceUrl);clearResult();file=item.file;sourceId=id;sourceUrl=item.url;sourceWidth=item.width;sourceHeight=item.height;sourcePixels=item.width*item.height;if(isSoul2()&&!soulRatioExplicit)$('hf-bar-ratio').value='source';syncDefaultRatio(!imageRatioExplicit);$('filemeta').textContent=`${candidate.name||'Start frame'} / ${item.width} × ${item.height} / ${(candidate.size/1048576).toFixed(1)} MB`;resetPreview();update();return true;}
async function setLastImage(candidate,id=null){const e=epoch,item=await inspectImage(candidate);release(item.thumbUrl);if(e!==epoch||!owner){release(item.url);return false;}release(lastUrl);lastFile=item.file;lastSourceId=id;lastUrl=item.url;$('last-filemeta').textContent=`${candidate.name||'Last frame'} / ${item.width} × ${item.height} / ${(candidate.size/1048576).toFixed(1)} MB`;update();return true;}
function renderReferences(){
  if(usesReferenceGuidance()&&references.length){
    if(referencesOnly()){for(const r of references)if(r.role==='base')r.role=r.nonBaseRole||'none';}
    else{if(references[0].role!=='base')references[0].nonBaseRole=references[0].role;references[0].role='base';for(const r of references.slice(1))if(r.role==='base')r.role=r.nonBaseRole||'none';}
  }
  const box=$('reference-list'),scroll=box.scrollTop,fragment=document.createDocumentFragment();
  references.forEach((r,i)=>{
    if(r.elementId&&references.findIndex(x=>x.elementId===r.elementId)!==i)return;
    if(r.elementId){
      const item=document.createElement('div');item.className='reference-item reference-element-item';
      const img=document.createElement('img');img.src=r.thumbUrl||r.url;img.alt='Element @'+r.elementName;img.width=68;img.height=82;
      const fields=document.createElement('div');fields.className='reference-fields';
      const name=document.createElement('strong');name.textContent='@'+r.elementName;
      const count=references.filter(x=>x.elementId===r.elementId).length;
      const hint=document.createElement('small');hint.textContent=(r.elementCategory||'Element')+' · '+count+' selected view'+(count===1?'':'s')+' of '+(r.elementCount||count)+' saved';
      fields.append(name,hint);
      const controls=document.createElement('div');controls.className='reference-actions';
      const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.disabled=busy;
      remove.onclick=()=>{if(busy)return;closeInputPreview();for(let j=references.length-1;j>=0;j--){if(references[j].elementId===r.elementId){releaseReference(references[j]);references.splice(j,1);}}
        if(!references.length){imageReferenceMode=preferredImageReferenceMode();closeReferenceIntent();}
        renderReferences();refreshInputPreview();update();};
      controls.append(remove);item.append(img,fields,controls);fragment.append(item);return;
    }
    const item=document.createElement('div');item.className='reference-item';
    const img=document.createElement('img');img.src=r.thumbUrl;img.alt='Input reference '+(i+1);img.width=68;img.height=82;img.decoding='async';
    img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','Preview input reference '+(i+1));
    img.onclick=()=>{if(!busy)viewReference(r,i);};img.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();img.click();}};
    const fields=document.createElement('div');fields.className='reference-fields';
    const title=document.createElement('strong');title.textContent='Reference '+(i+1)+' / '+r.file.name;title.title=title.textContent;
    const role=document.createElement('select');role.setAttribute('aria-label','Role for reference '+(i+1));
    const available=usesReferenceGuidance()?REFERENCE_ROLES.filter(([id])=>!referencesOnly()||id!=='base'):REFERENCE_ROLES.filter(([id])=>!['base','composition','detail'].includes(id));
    for(const [value,label] of available)role.add(new Option(label,value));
    if(r.role&&!available.some(([id])=>id===r.role))role.add(new Option(r.role+' (image role)',r.role));
    if(imageEngine==='soulpro')r.role='identity';role.value=r.role||'none';role.disabled=busy||imageEngine==='soulpro';if(imageEngine==='soulpro')role.hidden=true;
    role.onchange=()=>{
      r.role=role.value;r.target=r.role==='outfit'?'full':'';autoPreview=null;
      if(r.role==='base'&&usesReferenceGuidance()){
        for(const ref of references)if(ref!==r&&ref.role==='base')ref.role='none';
        if(i>0){references.splice(i,1);references.unshift(r);notify('Base moved to Reference 1. Reference numbers updated; check any numbered notes.');}
      }
      if(imageEngine==='fal'){poseMapSourceId=null;$('pose-preview-status').textContent='Pose changed. Preview again if you want to inspect it.';}
      renderReferences();update();
    };
    const note=document.createElement('input');note.type='text';note.maxLength=300;note.placeholder='Use only the outfit, keep the room…';note.setAttribute('aria-label','Note for reference '+(i+1));note.value=r.note||'';note.disabled=busy;
    note.placeholder=r.role==='detail'?'Optional: left hand, shorter nails…':'Optional instruction for this reference';
    note.oninput=()=>{r.note=note.value;autoPreview=null;update();};if(imageEngine==='soulpro')note.hidden=true;fields.append(title,role);
    if(usesReferenceGuidance()&&REFERENCE_TARGETS[r.role]){
      const target=document.createElement('select');target.setAttribute('aria-label','Target for reference '+(i+1));
      if(r.role!=='outfit')target.add(new Option(r.role==='detail'?'Choose detail':'Whole object',''));
      for(const [value,label] of REFERENCE_TARGETS[r.role])target.add(new Option(label,value));
      target.value=r.target||(r.role==='outfit'?'full':'');target.disabled=busy;
      target.onchange=()=>{r.target=target.value;autoPreview=null;update();};fields.append(target);
    }
    fields.append(note);
    const controls=document.createElement('div');controls.className='reference-actions';
    const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.onclick=()=>{if(busy)return;closeInputPreview();releaseReference(r);references.splice(i,1);if(!references.length){imageReferenceMode=preferredImageReferenceMode();closeReferenceIntent();}if(imageEngine==='fal')poseMapSourceId=null;renderReferences();refreshInputPreview();update();};
    const up=document.createElement('button');up.type='button';up.textContent='Up';up.disabled=i===0||(usesReferenceGuidance()&&i===1&&references[0].role==='base');up.onclick=()=>{if(busy||i===0)return;closeInputPreview();[references[i-1],references[i]]=[references[i],references[i-1]];if(imageEngine==='fal')poseMapSourceId=null;renderReferences();refreshInputPreview();update();};
    controls.append(up,remove);item.append(img,fields,controls);fragment.append(item);
  });
  syncDefaultRatio();box.replaceChildren(fragment);box.scrollTop=scroll;$('ref-count').textContent=`${references.length} / ${referenceLimit()}`;
  sceneLibrary?.renderSelected();
}
async function addReferences(list,ids=[],labels=[]){
  clearImageComposerNotice();
  const e=epoch,incoming=[...list];if(imageEngine==='fal')poseMapSourceId=null;if(references.length+incoming.length>referenceLimit())throw new Error('This mode supports up to '+referenceLimit()+' image references.');
  const explicitBaseAfterElement=tool==='image'&&usesReferenceGuidance()&&referencesOnly()&&incoming.length===1&&
    references.some(ref=>ref.elementId)&&!labels[0]?.elementId&&!references.some(ref=>ref.role==='base');
  autoPreview=null;$('reference-list').setAttribute('aria-busy','true');let added=0;const toWarm=[];
  try{
    for(let i=0;i<incoming.length;i++){
      $('reference-progress').textContent='Preparing reference '+(i+1)+' of '+incoming.length+'…';
      if(tool==='image'){
        const issue=modelImageInputIssue(imageEngine,[...references,{file:incoming[i]}]);if(issue)throw new Error(issue);
      }
      const item=await inspectImage(incoming[i]);
      if(e!==epoch||!owner){releaseReference(item);return;}
      item.id=ids[i]||null;item.role=imageEngine==='soulpro'?'identity':labels[i]?.role||'none';item.note=imageEngine==='soulpro'?'':labels[i]?.note||'';item.target=labels[i]?.target||'';
       item.elementId=labels[i]?.elementId||null;item.elementName=labels[i]?.elementName||'';item.elementCategory=labels[i]?.elementCategory||'';
       item.elementView=labels[i]?.elementView;item.elementCount=labels[i]?.elementCount;if(usesReferenceGuidance()){if(!referencesOnly()&&!references.length){item.nonBaseRole=item.role==='base'?'none':item.role;item.role='base';}else if(item.role==='base')item.role='none';}references.push(item);added++;toWarm.push(item);
       if(explicitBaseAfterElement&&!item.elementId){
         imageReferenceMode='base';references.splice(references.indexOf(item),1);references.unshift(item);
         item.role='base';closeReferenceIntent();
       }
      renderReferences();refreshInputPreview();update();
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  }finally{
    if(e===epoch){
      $('reference-list').setAttribute('aria-busy','false');$('reference-progress').textContent=added?added+' reference'+(added===1?'':'s')+' ready. Originals kept unchanged.':'';
      update();
      // Load every thumbnail first; prewarming must not delay the next preview
      // behind an expensive 34 MP decode/encode in the image-worker queue.
      for(const item of toWarm)if(references.includes(item))prewarmSeedreamReference(item);
    }
  }
}

function referenceLimit(){if(tool==='image'&&moodUI.selected()==='hong-kong-nights'){const slots={seedream:7,seedreamlite:7,gemini:7,gemini21:7,krea3:1,qwen3:0};if(Object.hasOwn(slots,imageEngine))return slots[imageEngine];}if(tool==='image'&&moodUI.selected()==='fisheye-2000'&&['seedream','seedreamlite','gemini','gemini21'].includes(imageEngine))return 8;if(tool==='image'&&imageEngine==='krea3')return 4;if(tool==='image'&&imageEngine==='flash')return 10;if(tool==='image'&&imageEngine==='qwen3')return 3;if(tool==='image'&&imageEngine==='zspicy')return 0;if(tool==='image'&&imageEngine==='kling')return 1;return tool==='video'?VIDEO_MODELS[engine].maxImages:tool==='image'&&imageEngine==='soulpro'?4:tool==='image'&&imageEngine==='soul'?soul.referenceLimit():tool==='image'&&imageEngine==='fal'?5:10-builtInMoodReferenceCount({type:tool,mode:'image',engine:imageEngine,moodId:moodUI.selected()});}
function configureVideoControls(){
  const isVideo=tool==='video',model=VIDEO_MODELS[engine],sd=engine==='seedance',sd15=engine==='seedance15',sd4k=engine==='seedance4k',klingHf=engine==='klinghf',
    h3=engine==='h3',h3max=engine==='h3max',h3spicy=engine==='h3spicy',h3maxfal=engine==='h3maxfal',omni=engine==='omni',minimax=h3||h3max||h3spicy||h3maxfal;
  // Resolve unsupported modes before calculating which panels are visible.
  if(!model.modes.includes(mode))mode=model.modes[0];
  $('app').classList.toggle('video-extend-active',isVideo&&mode==='extend');
  $('app').classList.toggle('pv-video-seedance',isVideo&&engine==='seedance');
  $('app').classList.toggle('pv-video-wan',isVideo&&['wan','wanprime'].includes(engine));
  $('video-camera-lock-wrap').hidden=!isVideo||!sd15;
  $('video-task-switch').hidden=!isVideo||!sd;
  $('video-create-task').setAttribute('aria-selected',String(mode!=='extend'));
  $('mode-extend').setAttribute('aria-selected',String(mode==='extend'));
  $('video-modes').hidden=!isVideo||mode==='extend';
  $('pv-mode-reference-label').textContent=isVideo?'Reference set':'References';
  $('extend-help').hidden=!isVideo||mode!=='extend';
  $('video-media-label').textContent=mode==='extend'?'Video to extend':'Video references';
  $('video-media-title').textContent=mode==='extend'?'Add a video':'Add motion or camera references';
  $('video-references').multiple=mode!=='extend';
  $('video-model-control').hidden=!isVideo;$('video-engine').value=engine;
  $('mode-start').hidden=!isVideo||!model.modes.includes('start');
  $('mode-reference').hidden=!isVideo||!model.modes.includes('reference');
  $('mode-text').hidden=!isVideo||!model.modes.includes('text');
  for(const m of ['start','reference','text']){$('mode-'+m).classList.toggle('active',mode===m);$('mode-'+m).setAttribute('aria-selected',String(mode===m));}
  $('start-mode').hidden=tool==='image'&&imageEngine!=='soulpro'||isVideo&&mode!=='start';$('reference-mode').hidden=tool==='upscale'||isVideo&&!['reference','extend'].includes(mode)||tool==='image'&&['soul','soulpro'].includes(imageEngine);
  $('reference-media').hidden=!isVideo||!sd||!['reference','extend'].includes(mode);
  $('start-frame-maker').hidden=!isVideo||mode!=='reference'||!['wan','wanprime','h3','omni'].includes(engine);
  if(isVideo){
    const ratio=$('ratio').value,duration=Number($('duration').value)||15;
    const ratios=mode==='extend'?['auto']:klingHf?(mode==='start'?['auto']:['16:9','9:16','1:1']):omni?model.ratios:(sd||sd4k||minimax)&&mode==='start'?['auto']:(!sd&&!minimax&&mode==='start'?[...model.ratios,'21:9']:model.ratios);
    const defaultRatio=omni?'16:9':sd&&mode==='start'?'auto':ratios.includes(ratio)?ratio:(ratios.includes('auto')?'auto':ratios[0]);
    options('ratio',ratios,defaultRatio);
    $('ratio').parentElement.hidden=mode==='extend'||klingHf&&mode==='start'||(sd||sd4k||minimax)&&mode==='start'&&!omni;
    const durations=(sd||sd15||sd4k||minimax||omni||klingHf)?Array.from({length:model.maxSeconds-model.minSeconds+1},(_,i)=>i+model.minSeconds):[5,10,15,30];
    $('duration').replaceChildren(...durations.map(n=>new Option(n+' sec',String(n))));
    if(duration>=model.minSeconds&&duration<=30&&!([...$('duration').options].some(o=>Number(o.value)===duration)))$('duration').add(new Option(duration+' sec',String(duration)));
    $('duration').value=duration>=model.minSeconds&&duration<=model.maxSeconds?duration:Math.max(5,model.minSeconds);
    const currentResolution=$('resolution').value;
    $('resolution').replaceChildren(...model.resolutions.map(r=>new Option(r.toUpperCase(),r)));
    $('resolution').value=model.resolutions.includes(currentResolution)?currentResolution:(model.resolutions.includes('768p')?'768p':model.resolutions[0]);
    $('engine-name').textContent=model.label.toUpperCase();
    $('mode-heading').textContent='Create video';
    $('prompt').maxLength=h3maxfal||omni?6000:minimax?7000:sd||sd15||sd4k||klingHf?5000:6000;
    $('prompt-label').textContent='Prompt';
    $('prompt').placeholder=mode==='extend'?'Describe what happens next…':'Describe the movement, scene and sound…';
    $('seed').closest('details').hidden=mode==='extend'||klingHf||sd15&&$('resolution').value==='1080p';
    $('video-price-hint').textContent=sd15?'Low-cost choice · 720p with audio off is especially economical. Your exact price is reviewed before generation.':sd?'Longer scenes cost more. For inexpensive short clips, choose Seedance 1.5 Pro. Exact price is checked before generation.':'Your exact video price is checked before generation.';
    $('video-model-note').textContent=klingHf?'Kling 3.0 Pro via Higgsfield API · 3–15s · Text or one Start frame, optional end frame. Audio starts off. Pro is a fixed model profile; its API has no resolution parameter. Your actual Higgsfield account price is checked before submission. Soul Elements are not yet linked.':sd15?'Seedance 1.5 Pro / 4–12s / 480p–1080p / Start or Text / optional camera lock. Switch sound off for economical motion loops. SpicyAPI describes this route as uncensored, meaning no added platform scan. The model may still reject requests and its content rules apply. At 1080p no closing frame or fixed seed is supported.':sd4k?'Seedance 2.5 · 4K / 4–30s / Start frame / upscaled 4K delivery from a native up-to-1080p render. This premium output costs substantially more. Review the live credit price before creating.':sd?'Seedance 2.5 Standard / 4–30s / up to 1080p. Start frame follows your image ratio. Reference mode supports image, video and audio guidance. SpicyAPI describes Start, Text and Reference modes as uncensored: it adds no content scan, but the model can still refuse. Extend runs through Higgsfield instead and is subject to its separate policy.':h3maxfal?'H3 Max Reference on fal.ai / 5–15s / 480p–1080p / up to 12 image references. fal.ai safety checking is enabled, and provider/model/account rules can reject a request.':omni?'Gemini Omni Flash 1.1 on fal.ai / 3–10s / 360p–4K / Start, Reference and Text modes. Google/fal safety filters apply.':engine==='wanprime'?'Wan 3.0 Prime / faster Wan render / 2–30s / 480p–1080p / same Start frame and Reference modes as Wan 3.0. Higher live provider price.':engine==='h3'||engine==='h3max'||engine==='h3spicy'?'MiniMax H3 family on SpicyAPI. Available modes and resolution depend on the selected variant.':'Wan 3.0 / Start frame or image references. 21:9 start-frame mode makes a private local center crop, keeps your original, then uses Wan adaptive ratio because Wan rejects an explicit 21:9 parameter. Provider policies and model refusals apply.';
  }
  $('reference-drop').querySelector('small').textContent=tool==='image'&&imageEngine==='zspicy'?'Text-only model · no reference photos':'JPG / PNG / WebP · up to '+referenceLimit()+' photos';
  $('reference-drop').querySelector('span').textContent=isVideo?'Upload images':'Add identity, wardrobe or set references';
  $('reference-drop').setAttribute('aria-label',isVideo?'Upload images':'Add reference images, drop or browse');
  $('ref-count').textContent=references.length+' / '+referenceLimit();
  videoModelPicker.sync();
}
function setMode(nextMode){
  if(tool==='video'&&selectedVideoJob)clearVideoHistorySelection({reset:false});
  const modes=VIDEO_MODELS[engine].modes;mode=modes.includes(nextMode)?nextMode:modes[0];
  if(mode!=='extend'&&['text','start','reference'].includes(mode))lastVideoCreateMode=mode;
  if(mode!=='start')activeVideoEffect=null;
  configureVideoControls();resetPreview();update();refreshEffectsView();
}
$('mode-extend').onclick=()=>{if(!busy)setMode('extend');};
$('video-create-task').onclick=()=>{if(!busy)setMode(VIDEO_MODELS[engine].modes.includes(lastVideoCreateMode)?lastVideoCreateMode:'reference');};
$('mode-text').onclick=()=>{if(!busy)setMode('text');};
$('video-engine').onchange=()=>{
  if(busy){videoModelPicker.sync();return;}
  const requested=$('video-engine').value;
  if(!Object.hasOwn(VIDEO_MODELS,requested)||!videoSelectionEngines().includes(requested)){$('video-engine').value=engine;notify('The backend has not enabled this model yet.',true);videoModelPicker.sync();return;}
  if(references.length>VIDEO_MODELS[requested].maxImages){$('video-engine').value=engine;notify('Remove excess references or save an image pack before choosing this model.',true);videoModelPicker.sync();return;}
  if(requested!=='seedance'&&mediaRefs.count()){$('video-engine').value=engine;notify('Remove video/audio references before changing model. Your inputs have been kept.',true);videoModelPicker.sync();return;}
  const previousEngine=engine;
  engine=requested;activeVideoEffect=null;currentQuote=null;if($('quote-dialog').open)$('quote-dialog').close();
  if(engine==='seedance'&&previousEngine!=='seedance'&&mode==='start'&&!file)mode='reference';
  if(engine==='seedance'){$('duration').value='5';$('resolution').value='720p';$('audio').checked=true;}
  else if(engine==='seedance15'){$('duration').value='5';$('resolution').value='720p';$('audio').checked=false;$('video-camera-lock').checked=false;}
  else if(engine==='seedance4k'){$('duration').value='5';$('resolution').value='4k';}
  else if(engine==='klinghf'){$('duration').value='10';$('resolution').value='1080p';$('audio').checked=false;}
  else if(engine==='h3'){$('duration').value='5';$('resolution').value='768p';}
  else if(engine==='h3max'){$('duration').value='5';$('resolution').value='768p';}
  else if(engine==='h3spicy'){$('duration').value='5';$('resolution').value='768p';}
  else if(engine==='h3maxfal'){$('duration').value='5';$('resolution').value='768p';mode='reference';}
  else if(engine==='omni'){$('duration').value='8';$('resolution').value='720p';}
  configureVideoControls();resetPreview();update();refreshEffectsView();
};
const mediaRefs=createMediaReferences({element:$,owner:()=>owner,busy:()=>busy,epoch:()=>epoch,action,changed:()=>{autoPreview=null;if(tool==='video'&&mode==='extend')resetPreview();update();},
  upload:async snapshot=>(await api('/api/reference-uploads',{method:'POST',headers:{'Content-Type':snapshot.type,'X-Filename':encodeURIComponent(snapshot.name||'reference')},body:snapshot})).id,assetFile});
async function uploadAsset(snapshot){const data=await api('/api/uploads',{method:'POST',headers:{'Content-Type':snapshot.type,'X-Filename':encodeURIComponent(snapshot.name||'source.png')},body:snapshot});return data.id;}
async function ensureSource(){if(sourceId)return sourceId;const snapshot=file,rev=imageRevision;if(!snapshot)throw new Error(tool==='upscale'?'Choose an image to upscale first.':'Choose a start frame first.');const id=await uploadAsset(snapshot);if(rev!==imageRevision)throw new Error('Image changed during upload. Please try again.');sourceId=id;return id;}
async function ensureLast(){if(!lastFile)return null;if(lastSourceId)return lastSourceId;lastSourceId=await uploadAsset(lastFile);return lastSourceId;}
async function ensureReferences(){
  if(!references.length)throw new Error('Add at least one reference image.');
  for(let i=0;i<references.length;i++){const r=references[i];if(!r.id){notify('Uploading original reference '+(i+1)+' of '+references.length+'…');r.id=await uploadAsset(r.file);}}
  return references.map(r=>r.id);
}
async function ensureInputs(){if(tool==='video'&&mode==='extend'){const inputs=await mediaRefs.inputs();if(inputs.referenceVideoIds.length!==1)throw new Error('Choose exactly one video to extend.');return {sourceId:inputs.referenceVideoIds[0],lastSourceId:null,referenceSourceIds:[],referenceVideoIds:inputs.referenceVideoIds,referenceAudioIds:[]};}if(imageEngine==='soulpro'&&tool==='image')return {sourceId:await ensureSource(),lastSourceId:null,referenceSourceIds:[]};if(isReinterpret())return {sourceId:await ensureSource(),lastSourceId:null,referenceSourceIds:[]};if(tool==='image'&&imageEngine==='soul'){if(references.length)throw new Error('This LoRA mode cannot edit an input photo. Nothing was submitted.');return {sourceId:null,lastSourceId:null,referenceSourceIds:[]};}if(tool==='video'&&engine==='klinghf'&&mode==='text')return {sourceId:null,lastSourceId:null,referenceSourceIds:[]};if(tool==='video'&&['seedance','seedance15','h3','h3max','h3maxfal','omni'].includes(engine)){if(mode==='text')return {sourceId:null,lastSourceId:null,referenceSourceIds:[],referenceVideoIds:[],referenceAudioIds:[]};if(mode==='reference'){const ids=references.length?await ensureReferences():[];return {sourceId:ids[0]||null,lastSourceId:null,referenceSourceIds:ids,...(engine==='seedance'?await mediaRefs.inputs():{referenceVideoIds:[],referenceAudioIds:[]})};}}if(tool==='upscale')return {sourceId:await ensureSource(),lastSourceId:null,referenceSourceIds:[]};if(tool==='image'&&!imageInputReferences().length)return {sourceId:null,lastSourceId:null,referenceSourceIds:[]};if(tool==='image'||mode==='reference'){const ids=await ensureReferences();return {sourceId:ids[0],lastSourceId:null,referenceSourceIds:ids};}return {sourceId:await ensureSource(),lastSourceId:await ensureLast(),referenceSourceIds:[]};}
function applyConfig(c){c={...config,...c};config=c;hf.configure(c.higgsfieldEnabled);updateSoulProModelUi();soul.configure(c);$('soul-launch-note').textContent=c.soulTrainingEnabled?'FAL training is ready. Train from 20–80 photos, then use the character in Image.':'FAL training is not available on this Worker.';$('soul-launch-manage').disabled=!c.soulTrainingEnabled;const soulOption=$('image-engine').querySelector('[value=soul]'),soulProOption=$('image-engine').querySelector('[value=soulpro]'),falOption=$('image-engine').querySelector('[value=fal]');if(soulOption){soulOption.hidden=!!c.customer||!owner;soulOption.disabled=!c.soulTrainingEnabled||!!c.customer;}if(soulProOption)soulProOption.disabled=false;if(falOption)falOption.disabled=!c.falEnabled;if((imageEngine==='soul'&&!c.soulTrainingEnabled)||((imageEngine==='fal'||imageEngine==='soulpro'&&!isSoul2())&&!c.falEnabled)){imageEngine='seedream';$('image-engine').value='seedream';setTool(tool);}for(const option of $('video-engine').options){option.disabled=!videoSelectionEngines().includes(option.value);if(option.value==='klinghf')option.hidden=!owner||!!c.customer||!c.higgsfieldEnabled;}$('connection-status').textContent=(c.enabled?'SpicyAPI connected':'SpicyAPI disconnected')+(c.geminiEnabled?' · Gemini connected':'')+(c.openrouterEnabled?' · OpenRouter connected':'')+(c.soulTrainingEnabled?' · FAL training ready':'')+(c.falEnabled?' · FAL controls ready':'')+' / Private archive ready';update();}
function connection(){if(!owner||customerMode)return;$('api-key').value='';$('daily-limit').value=config.dailyLimitUsd||10;$('terms').checked=false;$('disconnect').hidden=!config.configured;$('key-note').textContent=config.configured?'A key is stored encrypted. Leave blank to keep it, or paste a replacement.':'Stored encrypted on your private backend. Never committed to GitHub or saved in browser storage.';$('connect-notice').textContent='';$('connect-dialog').showModal();}
$('connect-form').addEventListener('submit',async e=>{e.preventDefault();$('connect-save').disabled=true;try{const data=await api('/api/settings',{method:'POST',body:{apiKey:$('api-key').value,dailyLimitUsd:Number($('daily-limit').value),enabled:true,termsConfirmed:$('terms').checked}});$('api-key').value='';applyConfig(data.config);$('connect-dialog').close();notify('Provider key connected. Images and Upscale start on click; Video keeps price review.');}catch(error){$('connect-notice').textContent=error.message;}finally{$('connect-save').disabled=false;}});
$('disconnect').onclick=async()=>{if(!confirm('Remove the stored provider key? Your private history stays.'))return;try{applyConfig((await api('/api/settings',{method:'DELETE'})).config);$('api-key').value='';$('connect-dialog').close();notify('Generation disconnected.');}catch(e){$('connect-notice').textContent=e.message;}};
for(const button of document.querySelectorAll('[data-close]'))button.onclick=()=>$(button.dataset.close).close();
$('connect-dialog').addEventListener('close',()=>{$('api-key').value='';});
$('quote-dialog').addEventListener('close',()=>{currentQuote=null;if(owner)$('generate').focus();});
$('setup').onclick=connection;$('connection').onclick=connection;
$('mode-start').onclick=()=>setMode('start');$('mode-reference').onclick=()=>setMode('reference');
$('image').onchange=e=>action(async()=>{if(e.target.files[0])await setImage(e.target.files[0]);});
$('soul-base-image').onchange=e=>action(async()=>{if(e.target.files[0])await setImage(e.target.files[0]);e.target.value='';});
$('last-image').onchange=e=>action(async()=>{if(e.target.files[0])await setLastImage(e.target.files[0]);});
$('reference-images').onchange=e=>action(async()=>{if(e.target.files.length)await addReferences(e.target.files);e.target.value='';});
function bindDrop(zone,input,handler){for(const name of ['dragenter','dragover'])$(zone).addEventListener(name,e=>{e.preventDefault();$(zone).classList.add('drag');});for(const name of ['dragleave','drop'])$(zone).addEventListener(name,e=>{e.preventDefault();$(zone).classList.remove('drag');});$(zone).addEventListener('drop',e=>action(async()=>{await handler(e.dataTransfer.files);$(input).value='';}));}
bindDrop('soul-base-drop','soul-base-image',async files=>{if(files.length!==1)throw new Error('Choose exactly one base image.');await setImage(files[0]);});
bindDrop('drop','image',async files=>{if(files[0])await setImage(files[0]);});
bindDrop('upscale-canvas','image',async files=>{if(tool==='upscale'&&files[0])await setImage(files[0]);});
bindDrop('last-drop','last-image',async files=>{if(files[0])await setLastImage(files[0]);});
bindDrop('reference-drop','reference-images',async files=>{if(files.length)await addReferences(files);});
attachVideoReferenceBrowserDrop({
  doc:document,target:$('reference-drop'),input:$('reference-images'),
  enabled:()=>owner&&!busy&&!$('start-frame-dialog').open&&tool==='video'&&mode==='reference'&&VIDEO_MODELS[engine].maxImages>0,
  onFiles:files=>{void action(async()=>{await addReferences(files);});}
});
frameMaker=createVideoStartFrameMaker({
  element:$,
  context:()=>({
    engine,references,busy,aspectRatio:$('ratio').value,motionPrompt:$('prompt').value,
    allowed:owner&&tool==='video'&&mode==='reference'&&['wan','wanprime','h3','omni'].includes(engine),
    providerReady:!!config.enabled&&(!customerMode||customerGenerationReady)
  }),
  session:()=>epoch,
  active:requestEpoch=>owner&&epoch===requestEpoch,
  action,ensureReferences,prepareQuoteInputs,referenceRoles,
  compilePrompt:compileImagePrompt,
  validateReferences:referenceGuidanceError,
  api,
  onAccepted:job=>{setActive(job);surfaceHistoryJob(job);refreshHistorySoon();},
  loadPreview:assetBlob,
  useFrame:async job=>{
    const requestEpoch=epoch;
    const frame=await assetFile(job.outputId,'seedream-opening-frame');
    if(!owner||requestEpoch!==epoch||tool!=='video')
      throw Error('Your video workspace changed. Find the opening image in History.');
    setMode('start');
    if(!await setImage(frame,job.outputId))
      throw Error('Could not load the opening frame. Find the image in History.');
    videoStartFrameHandoff=true;
    selectedVideoJob=null;updateVideoInspector(null);update();
    notify('Opening image loaded into Start Frame. Reference photos remain available when you switch back to References. Wan will animate only the opening frame.');
  },
  imageQueueAvailable:()=>!activeJobs.some(j=>j.status==='uncertain'&&jobProvider(j)==='spicy')&&
    activeJobs.filter(j=>slotStates.has(j.status)&&j.settings?.type==='image'&&jobProvider(j)==='spicy').length<limitFor('image'),
  describePrice:q=>{
    if(customerMode){
      if(!Number.isSafeInteger(q.creditCost)||q.creditCost<1)
        throw Error('The Seedream quote did not return a valid credit price. No image submitted.');
      return q.creditCost.toLocaleString()+' credits';
    }
    return money(q.maxUsd)+' USD maximum';
  }
});
$('clear').onclick=()=>{moodUI.clear(true);clearMedia();notify('Editor cleared. Saved work is unchanged.');};
$('video-camera-lock').addEventListener('change',()=>{autoPreview=null;update();});
for(const id of ['prompt','duration','resolution','ratio','seed','audio','output-format','image-count','pose-strength','identity-strength','controlled-pose-seed'])$(id).addEventListener('input',()=>{if(id==='resolution'&&tool==='video'&&engine==='seedance15'){const hd=$('resolution').value==='1080p';$('seed').closest('details').hidden=hd;if(hd)$('seed').value='';}autoPreview=null;if(id==='ratio'&&tool==='image')imageRatioExplicit=true;if(id==='pose-strength')$('pose-strength-value').textContent=Number($('pose-strength').value).toFixed(2);if(id==='identity-strength')$('identity-strength-value').textContent=Number($('identity-strength').value).toFixed(2);update();});
$('preview-pose').onclick=()=>action(async()=>{
  if(imageEngine!=='fal')throw new Error('Choose Controlled Pose first.');
  const poseIndexes=references.map((r,i)=>r.role==='pose'?i:-1).filter(i=>i>=0);
  if(poseIndexes.length!==1)throw new Error('Assign exactly one reference as Pose.');
  const ids=await ensureReferences(),poseSourceId=ids[poseIndexes[0]];
  $('pose-preview-status').textContent='Extracting pose with DWPose…';
  const data=await api('/api/fal/pose-preview',{method:'POST',body:{poseSourceId}});
  poseMapSourceId=data.assetId;
  const blob=await api('/api/assets/'+poseMapSourceId,{blob:true}),url=URL.createObjectURL(blob);
  clearResult();resultUrl=url;resultId=poseMapSourceId;resultKind='image';resultExt='png';resultSettings={type:'image',engine:'fal',mode:'pose-preview',resolution:'preview',aspectRatio:'source'};
  $('preview').src=url;$('preview').alt='Detected DWPose preview';$('preview').hidden=false;$('video').hidden=true;$('empty').hidden=true;$('download').hidden=true;$('preview-label').textContent='Detected pose / preview';$('pose-preview-status').textContent='Pose ready. Generation will reuse this pose map.';update();
});
$('save').onclick=()=>action(async()=>{const inputs=await ensureInputs();await api('/api/drafts',{method:'POST',body:{...inputs,settings:settings()}});await syncHistory();notify(tool==='upscale'?'Upscale draft saved in Assets. No generation charge.':'Saved privately with the original media and settings. No generation charge.');});
$('upscale-check-price').onclick=()=>action(async()=>{
  if(tool!=='upscale'||!file)throw new Error('Choose an image to upscale first.');
  if(isFalUpscale()&&!config.falEnabled)throw new Error('FAL upscaling is not connected.');
  if(!isFalUpscale()&&!config.enabled){connection();return;}
  clearTimeout(upscaleQuoteTimer);upscaleQuoteTimer=null;upscaleQuote=null;upscaleQuoteNeedsCheck=true;upscaleManualReviewRequired=false;upscaleManualReviewKey='';upscalePriceMessage=isFalUpscale()?'Checking estimated price and output dimensions. No generation submitted.':'Checking the live price. No generation submitted.';updateUpscalePrice();
  const sessionEpoch=epoch;
  try{
    const originals=await ensureInputs(),inputs=isFalUpscale()?originals:await prepareQuoteInputs(originals);
    if(!inputs){upscalePriceMessage='Price check cancelled. No generation submitted.';return;}
    const key=upscalePriceKey(),selected=settings(),q=await api('/api/quotes',{method:'POST',body:{...inputs,settings:selected}});
    if(!owner||epoch!==sessionEpoch||tool!=='upscale'||key!==upscalePriceKey())throw new Error('Image, settings or session changed. Check the price again. Nothing was submitted.');
    validateUpscaleQuote(q,selected);upscaleQuote={quote:q,key,manual:true};upscaleQuoteNeedsCheck=false;upscaleManualReviewRequired=false;upscaleManualReviewKey='';upscalePriceMessage='';
    upscaleQuoteTimer=setTimeout(()=>{if(upscaleQuote?.quote.id===q.id){expireUpscalePrice(q.priceIsEstimate?'Estimate expired. A fresh estimate will be checked when you upscale.':'Live quote expired. A fresh price will be checked when you upscale.');update();}},Math.max(0,q.expiresAt-Date.now()));
    notify(isFalUpscale()?'Upscale estimate and dimensions checked. No generation submitted.':'Live upscale price checked. No generation submitted.');
  }catch(e){if(epoch===sessionEpoch){upscalePriceMessage='The price could not be checked. Try the price check again. Nothing was submitted.';}throw e;}
});
// Image Generate and Upscale authorize a paid request on click. Video keeps the quote dialog.
async function submitQuotedGeneration(q, expectedEpoch=epoch) {
  if(!owner||epoch!==expectedEpoch)throw new Error('Session changed.');
  if(!q||!Number.isFinite(q.expiresAt)||Date.now()>=q.expiresAt)throw new Error('Quote expired. No generation submitted. Please try again.');
  // Retain the same quote ID through the session-safe request helper. Never reprice/retry a paid task here.
  const data=await api(q.provider==='Higgsfield'&&q.settings?.type==='image'?'/api/higgsfield/generate':'/api/jobs',{method:'POST',body:{quoteId:q.id,confirm:true}});
  if(q.settings?.type==='image'&&moodDiscoveryOpen)setMoodDiscoveryOpen(false);
  if($('quote-dialog').open)$('quote-dialog').close();
  resetPreview();setActive(data.job);surfaceHistoryJob(data.job);
  if(q.settings?.type==='video'&&tool==='video'){
    showVideoHistoryRecord(data.job,{play:hasResult(data.job)});
    videoFeedCenter.scrollTo({top:0,behavior:'instant'});
  }
  autoPreview={id:data.job.id,revision:previewRevision};refreshHistorySoon();
  if(q.settings?.mode==='upscale'){
    if(hasResult(data.job))await openVideo(data.job,{scroll:false,justFinished:true});
    else if(activeStates.has(data.job.status)&&data.job.status!=='uncertain')upscaleResultUI.processing();
  }
  const failed=['failed','uncertain','resolved'].includes(data.job.status);
  if(q.settings?.type==='video'&&!failed){
    // The Video stage already shows the accepted request and its live status.
    notify('');
  }else{
    const destination=q.settings.mode==='upscale'?'Upscaled images below and Assets':'History';
    notify(failed?(isContentRestriction(data.job.error)?'The selected model declined this request under its content guidelines. Edit your prompt or explore another model in History.':data.job.error||(q.settings.mode==='upscale'?'The upscale was not confirmed. Check Queue and Upscaled images before trying again.':'The generation was not confirmed. Check History before another attempt.')):
      (['image','upscale'].includes(q.settings.mode)?(q.settings.mode==='upscale'?'Upscale requested.':'Image requested.')+(q.priceIsEstimate?' Estimated provider charge: '+money(q.estimatedUsd)+' USD. Not a guaranteed maximum. Results appear in '+destination+'.':' Quoted maximum: '+money(q.maxUsd)+' USD. Results appear in '+destination+'.'):''),failed);
  }
}
$('generate').onclick=()=>{if(tool==='image')return submitImageSnapshot();
  if(customerMode&&tool==='video'){
    if(!customerGenerationReady){
      const access=customerVideoAccess();
      if(access.pricing)void pricingOverlay.open({oneTime:true});
      else notify(access.message,true);
      return;
    }
    if(customerBillingReady&&customerCreditBalance<=0){void pricingOverlay.open({oneTime:true});return;}
  }
  return action(async()=>{
  if(tool==='upscale'&&!isFalUpscale())notify('Preparing your image and checking the live price. Nothing submitted yet…');
  const provider=currentProvider();if(provider==='spicy'&&!config.enabled){connection();return;}if(provider==='gemini'&&!config.geminiEnabled)throw new Error('Gemini API key is not available on the Lab backend.');if(provider==='fal'&&!config.falEnabled)throw new Error('FAL API key is not available on the Lab backend.');
  if(submissionBlocked())throw new Error('An active-job limit or an interrupted request blocks another generation. Check History.');
  const selectedTool=tool,sessionEpoch=epoch;
  if(selectedTool==='upscale'&&isFalUpscale()){
    updateUpscalePrice();
    let checked=upscaleQuote;
    if(!checked||upscaleQuoteNeedsCheck||checked.key!==upscalePriceKey()){
      const originals=await ensureInputs(),key=upscalePriceKey(),selected=settings();
      upscaleQuoteNeedsCheck=true;upscalePriceMessage='Checking Premium Upscale price and output dimensions…';updateUpscalePrice();
      const q=await api('/api/quotes',{method:'POST',body:{...originals,settings:selected}});
      if(!owner||epoch!==sessionEpoch||tool!=='upscale'||key!==upscalePriceKey())throw new Error('Image, settings or session changed before Premium Upscale submission. Nothing was submitted.');
      validateUpscaleQuote(q,selected);
      checked={quote:q,key,manual:false};upscaleQuote=checked;upscaleQuoteNeedsCheck=false;upscaleManualReviewRequired=false;upscaleManualReviewKey='';upscalePriceMessage='';updateUpscalePrice();
    }else{
      validateUpscaleQuote(checked.quote,settings());
    }
    const usedManualEstimate=checked.manual===true,reviewKey=checked.key;
    invalidateUpscalePrice('Submitting Premium Upscale with the checked estimate. If interrupted, refresh History before another attempt.');
    await submitQuotedGeneration(checked.quote,sessionEpoch);
    if(usedManualEstimate)requireUpscaleManualReview(reviewKey,'Estimate used. Check price & size again before another upscale.');
    else clearUpscalePrice();
    return;
  }
  if(selectedTool==='upscale'&&(upscaleQuote||upscaleQuoteNeedsCheck)){
    updateUpscalePrice();const checked=upscaleQuote;
    if(!checked||upscaleQuoteNeedsCheck)throw new Error('Check the upscale price before generating. Nothing was submitted.');
    validateUpscaleQuote(checked.quote,settings());
    if(checked.key!==upscalePriceKey())throw new Error('Image or settings changed. Check the price again. Nothing was submitted.');
    invalidateUpscalePrice('Submitting the checked quote. If interrupted, refresh History before another attempt.');
    await submitQuotedGeneration(checked.quote,sessionEpoch);clearUpscalePrice();
    return;
  }
  if(tool==='video'&&engine==='seedance'&&!config.videoEngines?.includes('seedance'))throw new Error('Seedance is not enabled on this backend.');
  if(tool==='video'&&engine==='klinghf'&&!config.higgsfieldEnabled)throw new Error('Higgsfield is not connected to this Lab. No Kling video submitted.');




  const inputs=await prepareQuoteInputs(await ensureInputs());if(!inputs)return;

  notify(selectedTool==='upscale'?'Checking live upscale price before submission…':'Requesting a live price. No generation submitted.');
  const q=await api('/api/quotes',{method:'POST',body:{...inputs,settings:settings()}});
  if(!owner||epoch!==sessionEpoch||tool!==selectedTool)throw new Error('Session or tool changed. No generation submitted.');
  if(selectedTool==='upscale'){
    if(q.settings.type!=='image'||q.settings.mode!=='upscale')throw new Error('Unexpected upscale quote. No generation submitted.');
    await submitQuotedGeneration(q,sessionEpoch);
    return;
  }
  if(selectedTool==='video'&&['seedance','seedance15','seedance4k','h3maxfal','omni','klinghf'].includes(engine)&&(q.settings.engine!==engine||q.settings.mode!==mode||q.settings.model!==VIDEO_MODELS[engine].endpoints[mode]))throw new Error('Provider quote does not match the selected video model and mode. Nothing was submitted.');
  if(customerMode&&(!Number.isSafeInteger(q.creditCost)||q.creditCost<1))throw new Error('No verified PV LAB credit price was returned. Nothing submitted.');
  currentQuote=q;const isImage=q.settings.type==='image',modeName=q.settings.mode==='extend'?'Extend Video':q.settings.mode==='text'?'Text to Video':q.settings.mode==='reference'?'Reference to Video':'Image to Video';
  $('quote-settings').textContent=q.settings.mode==='upscale'?`Image Upscaler / ${q.settings.resolution.toUpperCase()} / ${q.settings.outputFormat.toUpperCase()} / source ratio kept`:isImage?`${imageModelLabel(q.settings)} / ${q.settings.referenceSourceIds.length?'Reference Edit':'Text to Image'} / ${q.settings.resolution.toUpperCase()} / ${q.settings.aspectRatio}`:`${videoLabel(q.settings)} / ${modeName} / ${q.settings.duration}s / ${q.settings.resolution}`;
  const quotedCredits=Number.isSafeInteger(q.creditCost)&&q.creditCost>0?q.creditCost.toLocaleString()+' credits':'Price unavailable';
  const videoEuro=customerMode&&!isImage?videoCustomerQuoteLabels(q.creditCost):null;
  $('quote-price').textContent=videoEuro?.primary||(customerMode?quotedCredits:money(q.estimatedUsd));
  $('quote-limit').textContent=videoEuro?.detail||(customerMode?`Credit maximum reserved: ${quotedCredits}`:q.priceIsEstimate?`Estimated provider charge: ${money(q.maxUsd)} USD`:`Quoted maximum: ${money(q.maxUsd)} USD`);
  $('confirm-generation').textContent=videoEuro?.confirm||'Confirm & generate';
  $('quote-expiry').textContent='Valid until '+new Date(q.expiresAt).toLocaleTimeString()+'. No automatic repricing. '+(q.settings.transferNotes||[]).join(' ');
  $('quote-notice').textContent=q.notice||'';$('confirm-generation').disabled=false;$('quote-dialog').showModal();
});};
$('confirm-generation').onclick=async()=>{
  const q=currentQuote;if(!q||busy)return;
  if(Date.now()>=q.expiresAt){$('quote-notice').textContent='Quote expired. Close and review a new price.';return;}
  $('confirm-generation').disabled=true;
  const isVideo=q.settings?.type==='video'&&tool==='video';
  if(isVideo){
    autoPreview=null;selectedVideoJob=null;videoStartFrameHandoff=false;
    if(resultUrl)clearResult();
    showVideoJobStage({settings:q.settings,status:'submitting'});
  }
  let accepted=false;
  await action(async()=>{await submitQuotedGeneration(q);accepted=true;});
  if(isVideo&&!accepted&&owner&&tool==='video')
    showVideoJobStage({settings:q.settings,status:'uncertain'});
};
function limitFor(kind){const n=Number(config.concurrency?.[kind]);return Number.isInteger(n)&&n>0?n:1;}
function currentProvider(){if(tool==='video'&&engine==='klinghf')return 'higgsfield';if(tool==='image'&&imageEngine==='soul'&&soul.isKrea())return 'fal';if(tool==='video'&&engine==='seedance'&&mode==='extend')return 'higgsfield';if(tool==='image'&&['kling','krea3'].includes(imageEngine))return 'fal';if(isSoul2())return 'higgsfield';return isFalUpscale()?'fal':tool==='image'&&['gemini','gemini21'].includes(imageEngine)?'gemini':tool==='image'&&['fal','soulpro'].includes(imageEngine)?'fal':tool==='video'&&['h3maxfal','omni'].includes(engine)?'fal':'spicy';}
function jobProvider(j){const s=j?.settings||{};if(s.provider==='openrouter')return 'openrouter';if(s.provider==='higgsfield')return 'higgsfield';return s.provider==='gemini'||s.engine==='gemini'||String(s.model||'').startsWith('gemini-')?'gemini':s.provider==='fal'||['fal','soulpro','h3maxfal','omni'].includes(s.engine)||String(s.model||'').startsWith('fal-ai/')?'fal':'spicy';}
function submissionBlocked(){
  const kind=tool==='upscale'?'image':tool,provider=currentProvider(),falUpscale=tool==='upscale'&&provider==='fal';
  // An unconfirmed Gemini request retains its own reserved credits and History
  // record, but customers can explicitly start a NEW paid image after review.
  const customerGemini=customerMode&&provider==='gemini';
  const interrupted=!customerGemini&&activeJobs.some(j=>j.status==='uncertain'&&jobProvider(j)===provider&&(!falUpscale||j.settings?.mode==='upscale'));
  const active=activeJobs.filter(j=>{const jobKind=j.settings?.type==='image'?'image':'video',backgroundBatch=j.settings?.provider==='gemini'&&j.settings?.processing==='batch';return slotStates.has(j.status)&&!(customerGemini&&j.status==='uncertain')&&jobKind===kind&&!backgroundBatch&&jobProvider(j)===provider;}).length;
  const preparing=tool==='image'?fastImageHandoff.slots(provider):0;
  return interrupted||active+preparing>=(provider==='higgsfield'?2:limitFor(kind));
}
function schedulePoll(delay=10000){clearTimeout(timer);timer=null;if(owner&&activeJobs.some(j=>j.status!=='uncertain')&&!polling)timer=setTimeout(poll,delay);}
function setActiveJobs(list){
  activeJobs=[...new Map((list||[]).filter(j=>j&&activeStates.has(j.status)).map(j=>[j.id,j])).values()];
  activeJob=activeJobs.find(j=>j.status==='uncertain')||activeJobs[0]||null;
  $('active').hidden=!activeJobs.length;
  const uncertainCount=activeJobs.filter(j=>j.status==='uncertain').length;
  const workingCount=activeJobs.length-uncertainCount;
  $('queue-count').textContent=[
    workingCount?workingCount+' active':'',
    uncertainCount?uncertainCount+' to review':''
  ].filter(Boolean).join(' · ')||'0 jobs';
  $('active').classList.toggle('has-uncertain',uncertainCount>0);
  const queueSummary=$('active').querySelector('summary');
  const queueHint=uncertainCount?uncertainCount+' interrupted request'+(uncertainCount===1?'':'s')+'. Open Queue to review before submitting another generation.':activeJobs.length?activeJobs.length+' generation request'+(activeJobs.length===1?'':'s')+' in Queue.':'Show live generation queue';
  queueSummary.title=queueHint;
  queueSummary.setAttribute('aria-label',queueHint);
  if(!activeJobs.length)$('active').open=false;
  const saving=activeJobs.filter(j=>j.status==='saving').length;
  const batchImages=activeJobs.filter(j=>slotStates.has(j.status)&&j.settings?.type==='image'&&jobProvider(j)==='gemini'&&j.settings?.processing==='batch').length;
  const spicyImages=activeJobs.filter(j=>slotStates.has(j.status)&&j.settings?.type==='image'&&jobProvider(j)==='spicy').length;
  const geminiRunning=activeJobs.filter(j=>slotStates.has(j.status)&&j.status!=='uncertain'&&j.settings?.type==='image'&&jobProvider(j)==='gemini'&&j.settings?.processing!=='batch').length;
  const geminiInterrupted=activeJobs.filter(j=>j.status==='uncertain'&&j.settings?.type==='image'&&jobProvider(j)==='gemini').length;
  const falImages=activeJobs.filter(j=>slotStates.has(j.status)&&j.settings?.type==='image'&&jobProvider(j)==='fal').length;
  const videos=activeJobs.filter(j=>slotStates.has(j.status)&&j.settings?.type!=='image').length;
  $('active-status').textContent='Seedream '+spicyImages+' / '+limitFor('image')+' · Nano '+geminiRunning+' / '+limitFor('image')+(geminiInterrupted?' · '+geminiInterrupted+(customerMode?' Nano result(s) to review':' old Nano interrupted'):'')+(batchImages?' · '+batchImages+' Nano batch queued':'')+' · Controlled Pose '+falImages+' / '+limitFor('image')+' · videos '+videos+' / '+limitFor('video')+(saving?' · '+saving+' saving (no generation slot)':'');
  const labels={submitting:'Submitting',queued:'Queued',running:'Generating',saving:'Saving to private archive',uncertain:customerMode?'Result unconfirmed; original credits under review':'Interrupted: check provider before another attempt'};
  const providerLabel=j=>jobProvider(j)==='gemini'?'Gemini':jobProvider(j)==='openrouter'?'OpenRouter':jobProvider(j)==='fal'?'FAL':'SpicyAPI';
  $('active-detail').textContent=activeJobs.map((j,i)=>(i+1)+'. '+(j.settings?.type==='image'?'Image':'Video')+' · '+providerLabel(j)+' · '+labels[j.status]+(j.error?' · '+j.error:'')+(j.providerTaskId?' · '+j.providerTaskId:'')).join('\n')+(customerMode&&uncertainCount?'\nPV LAB cannot confirm this earlier result. No automatic retry or duplicate charge. Its credits remain reserved for provider review. A new generation has a separate charge. Contact support for the original request.':'');
  $('active-detail').style.whiteSpace='pre-line';
  $('resolve').hidden=customerMode||!activeJobs.some(j=>j.status==='uncertain');
  if($('queue-support'))$('queue-support').hidden=!customerMode||!uncertainCount;
  if(tool==='video'&&selectedVideoJob){
    const updated=activeJobs.find(j=>j.id===selectedVideoJob.id);
    if(updated){
      selectedVideoJob=updated;videoJobCache.set(updated.id,updated);
      updateVideoInspector(updated);showVideoJobStage(updated);
    }
  }
  schedulePoll();update();
}
function setActive(job){if(!job)return;setActiveJobs([...activeJobs.filter(j=>j.id!==job.id),job]);frameMaker?.onJob(job);}
async function poll(){
  if(!owner||!activeJobs.length||polling)return;
  const startedEpoch=epoch,snapshot=activeJobs.filter(j=>j.status!=='uncertain');
  if(!snapshot.length)return;
  clearTimeout(timer);timer=null;polling=true;
  try{
    const responses=await Promise.allSettled(snapshot.map(j=>api('/api/jobs/'+j.id)));
    if(!owner||startedEpoch!==epoch)return;
    const finished=[];let error=null;
    responses.forEach((result,i)=>{
      if(result.status==='fulfilled'){
        const job=result.value.job;setActive(job);
        if(!activeStates.has(job.status))finished.push(job);
      }else error=result.reason;
    });
    if(finished.length){
      const chosen=finished.find(j=>autoPreview?.id===j.id);
      const show=chosen&&autoPreview.revision===previewRevision&&(!busy||chosen.settings?.mode==='upscale');
      if(chosen)autoPreview=null;
      await syncHistory();
      if(!owner||startedEpoch!==epoch)return;
      if(chosen&&chosen.settings?.mode==='upscale'&&!hasResult(chosen))upscaleResultUI.finishedWithoutResult();
       if(show&&hasResult(chosen))await openVideo(chosen,{scroll:false,justFinished:chosen.settings?.mode==='upscale'});
      const ready=finished.filter(hasResult).length,failed=finished.filter(j=>j.status==='failed');
      if(failed.length)notify(isContentRestriction(failed[0].error)?'This model declined the request under its content guidelines. Your prompt is saved in History. Edit it or explore another model.':'Generation failed: '+(failed.length>1?failed.length+' jobs failed. ':'')+(failed[0].error||'The provider did not return an image. Check History.'),true);
      else if(ready)notify(ready===1?'Result saved. View or download it from History.':ready+' results saved. View or download them from History.');
      else notify(isContentRestriction(finished[0].error)?'This model declined the request under its content guidelines. Edit the prompt or choose another model in History.':finished[0].error||'No output file was returned. Nothing is available to download.',true);
    }
    if(error)notify(error.message,true);
  }catch(e){if(owner&&startedEpoch===epoch)notify(e.message,true);}
  finally{if(startedEpoch===epoch){polling=false;schedulePoll();}}
}
$('resolve').onclick=()=>action(async()=>{const interrupted=activeJobs.find(j=>j.status==='uncertain'&&jobProvider(j)===currentProvider())||activeJobs.find(j=>j.status==='uncertain');if(!interrupted||!confirm('First check '+({openrouter:'OpenRouter',gemini:'Google AI Studio',fal:'FAL',higgsfield:'Higgsfield',spicy:'SpicyAPI'}[jobProvider(interrupted)])+' activity and charges for request '+interrupted.id+'. This clears only this interrupted request without sending another generation. Continue only after checking.'))return;await api('/api/jobs/'+interrupted.id+'/resolve',{method:'POST',body:{confirm:true}});await syncHistory();});
/* The queue is a small navigation popover, not a persistent bottom status slab. */
document.addEventListener('pointerdown',event=>{
  const queue=$('active');
  if(queue?.open&&!queue.contains(event.target))queue.open=false;
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&$('active')?.open)$('active').open=false;
});
function button(text,fn,run=action){const b=document.createElement('button');b.className='quiet';b.textContent=text;b.onclick=()=>run(fn);return b;}
async function assetFile(id,name='source'){const blob=await api('/api/assets/'+id,{blob:true}),ext=({'image/jpeg':'jpg','video/quicktime':'mov','audio/mpeg':'mp3','audio/x-wav':'wav'})[blob.type]||blob.type.split('/')[1];return new File([blob],name+'.'+ext,{type:blob.type});}
async function restore(job){
  clearMedia();const p=job.settings||{};engine=engineFor(p);imageReferenceMode=p.referenceMode==='references'?'references':'base';$('composer-exact-prompt').checked=p.exactPrompt===true;
  if(p.mode==='upscale'){
    upscaleEngine=UPSCALE_PUBLIC_ENGINES.includes(p.upscaleEngine)?p.upscaleEngine:'seedvr2';$('upscale-engine').value=upscaleEngine;
    $('upscale-scale').value=String(p.scale===4?4:2);
    $('upscale-topaz-model').value=p.topazModel==='High Fidelity V3'?'High Fidelity V3':'Standard V2';
  }else if(p.type==='image'){
    imageEngine=['flash','kling','qwen3','zspicy','seedreamlite','gemini21'].includes(p.engine)?p.engine:p.engine==='gemini'||p.provider==='gemini'?'gemini':p.engine==='soulpro'?'soulpro':p.engine==='soul'?'soul':p.engine==='fal'||p.provider==='fal'?'fal':'seedream';
    imageProcessing=p.processing==='batch'?'batch':'normal';$('image-engine').value=imageEngine;$('image-processing').value=imageProcessing;
    if(imageEngine==='soul'){soul.setSelected(p.characterId||'');soul.restore(p);}
    if(imageEngine==='soulpro'){
      soulProModel=['soul2','kontextmax'].includes(p.soulProModel)?p.soulProModel:'ideogram45';if(soulProModel==='soul2'){hf.select(p.characterId||'');$('hf-bar-ratio').value=['16:9','9:16','4:3','3:4','1:1','2:3','3:2'].includes(p.aspectRatio)?p.aspectRatio:'source';$('hf-strength').value=p.identityStrength??1;$('hf-strength-value').textContent=Number(p.identityStrength??1).toFixed(2);$('hf-resolution').value=p.resolution==='720p'?'720p':'1080p'};soulProQuality=['very_low','low','medium','high'].includes(p.soulProQuality)?p.soulProQuality:'medium';
      $('soul-pro-model').value=soulProModel;$('soul-pro-quality').value=soulProQuality;$('soul-pro-seed').value=p.seed??'';updateSoulProModelUi();
    }
    if(imageEngine==='fal')poseMapSourceId=p.poseMapSourceId||null;
  }
  setTool(p.mode==='upscale'?'upscale':p.type||'video');setMode(p.mode||'start');
  const soulPro=tool==='image'&&imageEngine==='soulpro',controlledPose=tool==='image'&&imageEngine==='fal';
  if(tool==='image'&&!soulPro){$('start-mode').hidden=true;$('reference-mode').hidden=imageEngine==='soul';}
  if(soulPro){if(job.sourceId)await setImage(await assetFile(job.sourceId,'base-image'),job.sourceId);}
  else{
    const refs=tool==='image'&&imageEngine!=='soul'||p.mode==='reference';
    if(refs){
      // Curated Style inputs belong to the selected Mood. Restore only user
      // images; the loader reattaches styles if that Mood is still selected.
      const saved=(p.referenceSourceIds||[]).map((id,i)=>({id,label:p.referenceRoles?.[i]||{name:'reference-'+(i+1)}}))
        .filter(ref=>!isMoodStyleReference(ref.label));
      if(saved.length){const files=await Promise.all(saved.map(ref=>assetFile(ref.id,(ref.label.name||'reference').replace(/\.[^.]+$/,''))));await addReferences(files,saved.map(ref=>ref.id),saved.map(ref=>ref.label));}
    }
    else if(job.sourceId&&p.mode!=='extend'){await setImage(await assetFile(job.sourceId,'start-frame'),job.sourceId);if(p.lastSourceId)await setLastImage(await assetFile(p.lastSourceId,'last-frame'),p.lastSourceId);}
  }
  if(controlledPose)poseMapSourceId=p.poseMapSourceId||null;moodUI.restore(p,true);$('prompt').value=p.moodOriginalPrompt??p.prompt??'';
  if(soulPro){$('soul-pro-model').value=soulProModel;$('soul-pro-seed').value=p.seed??'';}
  if(p.duration&&!([...$('duration').options].some(o=>Number(o.value)===p.duration)))$('duration').add(new Option(p.duration+' sec',String(p.duration)));
  $('duration').value=p.duration||15;
  if(!isFalUpscale())$('resolution').value=p.resolution||(tool==='upscale'?'4k':tool==='image'?(imageEngine==='seedream'?'1k':'2k'):'1080p');
  $('ratio').value=p.aspectRatio||'auto';$('seed').value=p.seed??'';$('audio').checked=p.audio!==false;$('video-camera-lock').checked=p.cameraFixed===true;$('output-format').value=p.outputFormat||'jpeg';
  if(controlledPose){$('pose-strength').value=String(p.poseStrength??1);$('identity-strength').value=String(p.identityStrength??0.7);$('controlled-pose-seed').value=p.seed??'';$('pose-strength-value').textContent=Number(p.poseStrength??1).toFixed(2);$('identity-strength-value').textContent=Number(p.identityStrength??0.7).toFixed(2);$('pose-preview-status').textContent=poseMapSourceId?'Saved pose map will be reused.':'';}
  if(p.engine==='seedance'||engineFor(p)==='seedance')await mediaRefs.restore(p);
  configureVideoControls();update();
  notify(tool==='upscale'?'Original image restored with Premium Upscale. Nothing generated or charged.':soulPro?'Base image, prompt and engine restored. The current saved Nina identity will be used. Nothing generated or charged.':'Original media, reference roles, prompt and settings restored. Nothing generated or charged.');
  $(tool==='upscale'?'upscale-check-price':'prompt').focus();window.scrollTo({top:0,behavior:'smooth'});
}
// A reference is never a result. Downloads always address the stored output asset.
function hasResult(job){return job.status==='completed'&&typeof job.outputId==='string'&&!!job.outputId;}
function resultFormat(blob){
  const formats={'image/jpeg':['image','jpg'],'image/png':['image','png'],'image/webp':['image','webp'],'video/mp4':['video','mp4'],'video/webm':['video','webm']};
  const format=formats[blob.type.split(';')[0]];
  if(!blob.size||!format)throw new Error('The output file could not be opened. Refresh History and try View or Download again.');
  return format;
}

/* Image detail: full viewport artwork plus a persistent metadata inspector. */
let imageDetailJob=null;
$('image-detail-scene-save').onclick=()=>{const job=imageDetailJob;if(!job||!hasResult(job)){notify('Choose a completed Gallery image first.',true);return;}closeImageDetail();void sceneLibrary.fromGallery(job);};
const imageDetailFavoritePending=new Set();
function paintImageDetailFavorite(){
  const job=imageDetailJob,button=$('image-detail-favorite');
  const favorite=!!job?.favorite;
  button.disabled=!job||job.favorite===undefined||imageDetailFavoritePending.has(job.id);
  button.setAttribute('aria-pressed',String(favorite));
  button.setAttribute('aria-label',favorite?'Remove from favorites':'Add to favorites');
  button.title=button.getAttribute('aria-label');
}
const filmPanel=$('image-film-finish');
const filmControls=createFilmFinishControls(filmPanel,{onChange:()=>{
  if(filmBusy||!imageDetailJob)return;
  filmPanel.dataset.filmPending='true';
  filmStatus.textContent='Changes not applied';
  filmStatus.title='Press Apply finish to update the displayed image.';
}});
const filmActions=document.createElement('div');filmActions.className='film-finish-actions';
const filmApply=document.createElement('button');filmApply.id='image-film-apply';filmApply.type='button';filmApply.textContent='Apply finish';
const filmOriginal=document.createElement('button');filmOriginal.id='image-film-original';filmOriginal.type='button';filmOriginal.textContent='Download original';
const filmStatus=document.createElement('span');filmStatus.className='film-finish-status';filmStatus.setAttribute('role','status');
filmActions.append(filmApply,filmOriginal);filmPanel.append(filmActions);
filmPanel.querySelector('strong')?.append(filmStatus);
let filmBusy=false;
filmApply.onclick=async()=>{
  const job=imageDetailJob,requestEpoch=epoch;if(!owner||!hasResult(job)||filmBusy)return;
  filmBusy=true;filmControls.lock(true);filmApply.disabled=true;filmStatus.textContent='Applying…';
  try{
    const response=await api('/api/jobs/'+job.id+'/film-finish',{method:'POST',body:{outputId:job.outputId,settings:filmControls.get()}});
    if(!owner||epoch!==requestEpoch)return;
    imageDetailCache.set(job.id,response.job);
    surfaceHistoryJob(response.job);
    if(imageDetailJob?.id===job.id&&$('image-lightbox').open)await openVideo(response.job,{scroll:false,detail:true});
    notify('Film finish saved. No new AI generation or credit charge.');
  }catch(e){if(owner&&epoch===requestEpoch&&imageDetailJob?.id===job.id)filmStatus.textContent=e.message;}
  finally{filmBusy=false;filmControls.lock(false);filmApply.disabled=false;}
};
filmOriginal.onclick=async()=>{
  const job=imageDetailJob,requestEpoch=epoch;if(!owner||!hasResult(job))return;
  try{const id=job.settings.filmOriginalId||job.outputId,blob=await assetBlob(id);if(!owner||epoch!==requestEpoch)return;
    const [,ext]=resultFormat(blob),url=URL.createObjectURL(blob);downloadUrls.add(url);saveDownload(url,id,ext);
    setTimeout(()=>{release(url);downloadUrls.delete(url);},30000);
  }catch(e){notify(e.message,true);}
};
const imageDetailCache=new Map();
let imageDetailPreviewURL=null;
let imageDetailNavDirection=1,imageDetailPrefetchReads=0;
const imageDetailPrefetchQueue=[];
function releaseImageDetailPreview(){
  release(imageDetailPreviewURL);imageDetailPreviewURL=null;
}
function imageDetailPreview(id){
  const blob=thumbnailBlobs.get(id);
  if(blob)return imageDetailPreviewURL=URL.createObjectURL(blob);
  // Reuse the already painted gallery preview even if its Blob was evicted.
  const card=[...$('history').querySelectorAll('img[data-asset]')]
    .find(img=>img.dataset.asset===id&&img.complete&&img.naturalWidth);
  return card?.currentSrc||'';
}
function prefetchImageDetailNeighbors(){
  const items=imageDetailSequence(),position=items.findIndex(job=>job.id===imageDetailJob?.id);
  imageDetailPrefetchQueue.length=0;
  if(position<0||!owner||!$('image-lightbox').open)return;
  for(const offset of [imageDetailNavDirection,-imageDetailNavDirection,2*imageDetailNavDirection]){
    const id=items[position+offset]?.outputId;
    if(id&&!assetBlobs.has(id)&&!assetReads.has(id))imageDetailPrefetchQueue.push(id);
  }
  pumpImageDetailPrefetch();
}
function pumpImageDetailPrefetch(){
  // Bound speculative downloads; current navigation uses the shared in-flight
  // read immediately and never waits behind this queue. The 96 MB cache owns bytes.
  while(owner&&$('image-lightbox').open&&imageDetailPrefetchReads<1&&imageDetailPrefetchQueue.length){
    const id=imageDetailPrefetchQueue.shift();
    if(assetBlobs.has(id)||assetReads.has(id))continue;
    imageDetailPrefetchReads++;
    void assetBlob(id).catch(()=>{}).finally(()=>{imageDetailPrefetchReads--;pumpImageDetailPrefetch();});
  }
}
const imageDetailSourceURLs=new Set(); // small inspector previews
let imageDetailSourceIds=[];
let imageDetailSourceOriginalURL=null; // full resolution, only while opened
let imageDetailSourceOriginalMime=null;
let imageDetailSourceAssetId=null;
let imageDetailSourceRevision=0,imageDetailSourceOpenRevision=0;
function imageDetailSequence(){
  return [...$('history').querySelectorAll('.card[data-kind="image"]')]
    .map(card=>imageDetailCache.get(card.dataset.job))
    .filter(job=>job&&hasResult(job));
}
function refreshImageDetailNavigation(){
  const items=imageDetailSequence();
  const pos=items.findIndex(job=>job.id===imageDetailJob?.id);
  $('image-lightbox-counter').textContent=pos>=0?(pos+1)+' / '+items.length:'Image archive';
  $('image-detail-prev').hidden=pos<=0;
  $('image-detail-next').hidden=pos<0||pos>=items.length-1;
  $('image-detail-prev').disabled=false;
  $('image-detail-next').disabled=false;
}
async function navigateImageDetail(direction){
  if(!owner||!$('image-lightbox').open||$('image-source-lightbox').open)return;
  const items=imageDetailSequence(),position=items.findIndex(job=>job.id===imageDetailJob?.id);
  const next=items[position+direction];
  if(!next||position<0)return;
  imageDetailNavDirection=direction<0?-1:1;
  try{await openVideo(next,{scroll:false,detail:true});}
  catch(error){if(owner)notify('Unable to open this image. '+error.message,true);}
  finally{refreshImageDetailNavigation();}
}
function closeImageSourceViewer(){
  ++imageDetailSourceOpenRevision;
  if($('image-source-lightbox').open)$('image-source-lightbox').close();
  $('image-source-preview').removeAttribute('src');
  if(imageDetailSourceOriginalURL){release(imageDetailSourceOriginalURL);imageDetailSourceOriginalURL=null;}
  imageDetailSourceOriginalMime=null;
  $('image-source-download').disabled=true;
}
function releaseImageDetailSource(){
  ++imageDetailSourceRevision;
  closeImageSourceViewer();
  $('image-source-preview').removeAttribute('src');
  for(const url of imageDetailSourceURLs)release(url);
  imageDetailSourceURLs.clear();imageDetailSourceIds=[];
  imageDetailSourceAssetId=null;
  $('image-detail-reference-strip').replaceChildren();
  $('image-detail-reference-wrap').hidden=true;
}
function imageDetailReferenceIds(job){
  return visibleImageReferenceIds(job);
}
function showImageDetailSource(job){
  releaseImageDetailSource();
  const refIds=imageDetailReferenceIds(job);
  if(!refIds.length)return;
  const revision=imageDetailSourceRevision;
  imageDetailSourceIds=refIds;
  $('image-detail-reference-caption').textContent=refIds.length===1?'Source image':'References · '+refIds.length;
  $('image-detail-reference-wrap').hidden=false;
  refIds.forEach((assetId,index)=>{
    const button=document.createElement('button');button.type='button';
    button.className='image-detail-reference-item';
    button.setAttribute('aria-label','Open original reference '+(index+1)+' of '+refIds.length);
    button.setAttribute('aria-haspopup','dialog');button.title='View original reference '+(index+1);
    const img=document.createElement('img');img.alt='';img.width=58;img.height=68;img.hidden=true;
    if(index===0)img.id='image-detail-reference-thumb';
    const number=document.createElement('span');number.textContent=String(index+1);number.setAttribute('aria-hidden','true');
    button.append(img,number);button.onclick=()=>openImageDetailSource(assetId);
    $('image-detail-reference-strip').append(button);
    void assetThumbnailBlob(assetId).then(blob=>{
      if(!owner||revision!==imageDetailSourceRevision||imageDetailJob?.id!==job.id||!$('image-lightbox').open)return;
      if(!blob?.type.startsWith('image/'))return;
      const url=URL.createObjectURL(blob);imageDetailSourceURLs.add(url);
      img.src=url;img.hidden=false;
    }).catch(()=>{/* The numbered tile still opens the original when its thumbnail is unavailable. */});
  });
}

function openImageDetailSource(assetId){
  if(!owner||!$('image-lightbox').open||!imageDetailSourceIds.includes(assetId)||$('image-detail-reference-wrap').hidden)return;
  const dialog=$('image-source-lightbox');
  if(dialog.open)return;
  imageDetailSourceAssetId=assetId;
  $('image-source-title').textContent=imageDetailSourceIds.length===1?'Original image':'Reference '+(imageDetailSourceIds.indexOf(assetId)+1)+' of '+imageDetailSourceIds.length;
  const stage=$('image-source-stage'),img=$('image-source-preview');
  const sourceRevision=imageDetailSourceRevision;
  const openRevision=++imageDetailSourceOpenRevision;
  stage.classList.remove('is-zoomed');
  stage.setAttribute('aria-busy','true');
  $('image-source-fit').textContent='Fit';
  $('image-source-fit').setAttribute('aria-pressed','false');
  $('image-source-fit').disabled=true;
  $('image-source-download').disabled=true;
  imageDetailSourceOriginalMime=null;
  $('image-source-dimensions').textContent='LOADING ORIGINAL IMAGE…';
  $('image-source-unavailable').textContent='Loading original image…';
  $('image-source-unavailable').hidden=false;
  img.removeAttribute('src');img.hidden=true;
  dialog.showModal();
  $('image-source-close').focus();
  void assetBlob(assetId).then(blob=>{
    if(!owner||openRevision!==imageDetailSourceOpenRevision||sourceRevision!==imageDetailSourceRevision||!dialog.open||imageDetailSourceAssetId!==assetId)return;
    if(!blob?.type?.startsWith('image/'))throw Error('Original image unavailable');
    imageDetailSourceOriginalURL=URL.createObjectURL(blob);
    imageDetailSourceOriginalMime=blob.type.split(';')[0];
    img.src=imageDetailSourceOriginalURL;
    img.hidden=false;
    $('image-source-unavailable').hidden=true;
  }).catch(()=>{
    if(openRevision!==imageDetailSourceOpenRevision||!dialog.open)return;
    stage.setAttribute('aria-busy','false');
    $('image-source-unavailable').textContent='The full-resolution original could not be opened.';
    $('image-source-unavailable').hidden=false;
  });
}
function updateImageSourceDimensions(){
  const img=$('image-source-preview');
  if(!$('image-source-lightbox').open||!img.naturalWidth||!img.naturalHeight)return;
  $('image-source-stage').setAttribute('aria-busy','false');
  $('image-source-fit').disabled=false;
  $('image-source-download').disabled=!imageDetailSourceOriginalURL||!imageDetailSourceOriginalMime;
  $('image-source-dimensions').textContent=img.naturalWidth+' × '+img.naturalHeight+' / ORIGINAL RATIO';
}

function detailModelName(job){
  const settings=job?.settings||{};
  return settings.mode==='upscale'?upscaleName(settings):imageModelLabel(settings);
}
function galleryImageModelName(job){
  // One source of truth across Assets, History, pending cards and image details.
  return detailModelName(job);
}
function detailDate(value){
  const date=new Date(value);
  return Number.isFinite(date.valueOf())?date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'Unknown';
}
function fillDetailExtraActions(job,kind){
  const extra=$(kind==='image'?'image-detail-extra':'video-detail-extra');
  const box=$(kind==='image'?'image-detail-extra-list':'video-detail-extra-list');
  if(!extra||!box)return;
  box.replaceChildren();extra.open=false;
  const card=[...$('history').children].find(item=>item.dataset.job===job.id);
  const standard=kind==='image'
    ? new Set(['Download image','View image','Reuse','Repair','Upscale','Use in Video','Delete'])
    : new Set(['Download video','View video','Reuse','Delete']);
  if(card){
    for(const original of card.querySelectorAll('.cardactions button')){
      if(standard.has(original.textContent)||original.disabled)continue;
      const btn=document.createElement('button');btn.type='button';
      btn.textContent=original.textContent;btn.className='detail-extra-action';
      btn.onclick=()=>{
        if(kind==='image')closeImageDetail();
        original.click();
      };
      box.append(btn);
    }
  }
  extra.hidden=kind==='image'?false:box.children.length===0;
}
function showImageDetail(job,hasOutput,loading=false){
  if(!job||!owner)return;
  const changed=imageDetailJob?.id!==job.id;
  imageDetailJob=job;
  const params=job.settings||{},dialog=$('image-lightbox'),stage=$('image-lightbox-stage');
  stage.setAttribute('aria-busy',String(loading));
  stage.classList.remove('is-zoomed');stage.scrollTo({top:0,left:0,behavior:'instant'});
  $('image-lightbox-fit').setAttribute('aria-pressed','false');
  $('image-lightbox-fit').textContent='Fit';
  $('image-lightbox-fit').disabled=!hasOutput||loading;
  $('image-lightbox-title').textContent=hasOutput||loading?'Image result':'Image record';
  const contentRestricted=job.status==='failed'&&isContentRestriction(job.error);
  $('image-detail-status').textContent=contentRestricted?'Restricted':job.status?.charAt(0).toUpperCase()+String(job.status||'').slice(1);
  $('image-detail-status').dataset.status=contentRestricted?'restricted':job.status||'';
  paintImageDetailFavorite();
  filmPanel.hidden=params.moodId!=='hong-kong-nights'||!hasResult(job);
  if(!filmPanel.hidden){
    filmControls.set(params.filmFinish||HONG_KONG_FILM_FINISH);filmControls.lock(filmBusy||loading);
    filmApply.disabled=filmBusy||loading;filmOriginal.disabled=loading;
    filmPanel.dataset.filmPending='false';
    const earlierFilm=params.filmFinishStatus==='applied'&&params.filmFinishRevision!==FILM_FINISH_RENDER_REVISION;
    filmStatus.textContent=params.filmFinishStatus==='failed'?'Finish failed':earlierFilm?'Earlier finish':params.filmFinishStatus==='applied'?'Applied':params.filmFinishStatus==='off'?'Original shown':'Not applied';
    filmStatus.title=params.filmFinishStatus==='failed'?String(params.filmFinishError||'Film processing failed.'):
      earlierFilm?'An older film finish was saved. Press Apply finish to update it.':
      params.filmFinishStatus==='applied'?'The displayed image has this finish applied.':
      'Slider settings are selected but the image has not been processed. Press Apply finish.';
  }

  const mood=moodById(params.moodId),customMood=params.moodId==='custom'&&params.customMoodName;
  const moodName=customMood?String(params.customMoodName):mood?.name||'';
  const promptText=userFacingImagePrompt(params);
  // The provider's compiled styling stays private, only authored text is displayed.
  $('image-detail-mood-feature').hidden=!moodName;
  $('image-detail-mood-name').textContent=moodName;
  const intensity=Number(params.moodIntensity);
  $('image-detail-mood-strength').textContent=moodName&&Number.isFinite(intensity)?Math.round(intensity)+'% intensity':'';
  const hasWrittenDirection=!!promptText;
  $('image-detail-prompt-header').hidden=!hasWrittenDirection;
  $('image-detail-prompt').hidden=!hasWrittenDirection;
  $('image-detail-copy').disabled=!hasWrittenDirection;
  $('image-detail-prompt-heading').textContent=moodName?'Your direction':'Prompt';
  $('image-detail-prompt').textContent=promptText;
  $('image-detail-prompt').classList.toggle('is-collapsible',promptText.length>160);
  $('image-detail-prompt').classList.remove('is-expanded');
  $('image-detail-expand').setAttribute('aria-expanded','false');
  $('image-detail-expand').innerHTML='Show more <span aria-hidden="true">⌄</span>';
  $('image-detail-expand').hidden=promptText.length<=160;
  $('image-detail-metadata').open=true;
  document.querySelector('#image-detail-metadata .image-detail-secondary-data').open=false;
  $('image-detail-model').textContent=detailModelName(job);
  $('image-detail-mood-row').hidden=!!moodName || !params.moodId;
  const photoLook=params.moodId==='hong-kong-nights'&&params.moodVariant&&params.moodVariant!=='original'?(HONG_KONG_VARIANTS[params.moodVariant]?.label||''):'';
  $('image-detail-mood-value').textContent=params.moodId?[moodName||'Mood',photoLook,(params.moodIntensity||60)+'%'].filter(Boolean).join(' · '):'';
  $('image-detail-resolution').textContent=String(params.resolution||'Source').toUpperCase();
  $('image-detail-pixels').textContent='';
  $('image-detail-ratio').textContent=params.aspectRatio==='auto'?'Adaptive':String(params.aspectRatio||'Original');
  $('image-detail-created').textContent=detailDate(job.createdAt);
  $('image-detail-references').textContent=String(imageDetailReferenceIds(job).length);
  $('image-detail-price').textContent=customerMode?(jobCreditsReturned(job)?'Credits returned':job.estimatedUsd!=null?wallet.jobCharge(job):'Not charged'):job.settledUsd!=null?money(job.settledUsd):job.estimatedUsd!=null?'Estimate '+money(job.estimatedUsd):'Not reported';
  $('image-detail-dimensions').textContent=loading?(hasOutput?'PREVIEW / LOADING FULL IMAGE…':'Loading image…'):hasOutput?'FIT TO VIEW / ORIGINAL RATIO':contentRestricted?'CONTENT RESTRICTION':'NO RESULT AVAILABLE';
  $('image-lightbox-img').hidden=!hasOutput;
  stage.classList.toggle('is-content-restricted',contentRestricted);
  $('image-lightbox-content-notice').hidden=!contentRestricted;
  $('image-lightbox-content-description').textContent=contentRestricted?contentRestrictionGuidance(job):'';
  $('image-lightbox-content-credits').hidden=!jobCreditsReturned(job);
  $('image-lightbox-unavailable').hidden=hasOutput||loading||contentRestricted;
  $('image-lightbox-unavailable').textContent=job.status==='uncertain'?'Provider status is unknown. Nothing will be resubmitted automatically.':job.status==='draft'?'Saved draft. Choose Reuse to continue editing.':'No finished output file is available for this record.';
  $('image-detail-status-help').hidden=contentRestricted||!['failed','uncertain'].includes(job.status);
  $('image-detail-status-help').textContent=contentRestricted?'':job.error||(job.status==='uncertain'?'Verify the provider request before trying again.':'The provider did not return an output.');
  for(const id of ['image-detail-video','image-detail-reference','image-detail-upscale','image-detail-repair','image-detail-edit-area','image-detail-mood','image-detail-save-mood','image-lightbox-download'])
    $(id).disabled=!hasOutput||loading;
  $('image-detail-delete').disabled=activeStates.has(job.status);
  fillDetailExtraActions(job,'image');
  // Keep the app's one-piece result scroller at the photo when opening or
  // navigating to a different image. Do not jump during async preview upgrades.
  const resetViewerScroll=changed||!dialog.open;
  if(!dialog.open)dialog.showModal();
  if(resetViewerScroll)dialog.querySelector('.image-detail-layout')?.scrollTo({top:0,left:0,behavior:'instant'});
  if(changed)showImageDetailSource(job);
  refreshImageDetailNavigation();
}
async function openImageRecord(job){
  if(!job||(!['image','upscale'].includes(tool)&&!assetLibrary?.active()))return;
  if(hasResult(job))return openVideo(job,{scroll:false,detail:true});
  $('image-lightbox-img').removeAttribute('src');
  showImageDetail(job,false);
}
function closeImageDetail(){
  closeImageSourceViewer();
  if($('image-lightbox').open)$('image-lightbox').close();
}
function executeImageDetail(fn){
  const job=imageDetailJob;
  if(!job||busy||!owner)return;
  closeImageDetail();
  void action(()=>fn(job));
}
async function applyMoodToImage(job){
  if(!hasResult(job))throw new Error('Choose a completed image first.');
  const base=await assetFile(job.outputId,'mood-base-image');
  if((references.length||file||$('prompt').value.trim())&&!confirm('Replace the current unsaved editor to apply a mood to this image?'))return;
  moodUI.clear(true);clearMedia();
  if(!['seedream','seedreamlite','gemini','gemini21'].includes(imageEngine)){imageEngine='seedream';$('image-engine').value='seedream';}
  setTool('image');await addReferences([base],[job.outputId]);
  $('prompt').value='';update();moodUI.open();
  notify('Image loaded as the base. Choose a mood, then press Generate. Nothing has been submitted.');
}
async function useImageAsReference(job){
  if(!hasResult(job))throw new Error('Choose a completed image first.');
  if(tool!=='image'||assetLibrary?.active())setTool('image');
  if(['soul','soulpro'].includes(imageEngine)){
    imageEngine='seedream';$('image-engine').value='seedream';setTool('image');
  }
  const source=await assetFile(job.outputId,'image-reference');
  await addReferences([source],[job.outputId]);
  notify('Image added to the current references. Choose its role in Controls if needed.');
}
$('image-lightbox-close').onclick=closeImageDetail;
$('image-source-close').onclick=closeImageSourceViewer;
$('image-source-back').onclick=closeImageSourceViewer;
$('image-source-download').onclick=()=>{
  // The actual original is already loaded inside the source viewer. Never
  // download its compressed card thumbnail, and never request a second copy.
  if(!owner||!$('image-source-lightbox').open||!imageDetailSourceOriginalURL||!imageDetailSourceAssetId)return;
  const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'})[imageDetailSourceOriginalMime];
  if(!ext||$('image-source-download').disabled)return;
  saveDownload(imageDetailSourceOriginalURL,'source-'+imageDetailSourceAssetId,ext);
};
$('image-source-stage').onclick=event=>{
  if(event.target===$('image-source-stage'))closeImageSourceViewer();
};
$('image-source-fit').onclick=()=>{
  const stage=$('image-source-stage'),zoom=!stage.classList.contains('is-zoomed');
  stage.classList.toggle('is-zoomed',zoom);
  $('image-source-fit').textContent=zoom?'100%':'Fit';
  $('image-source-fit').setAttribute('aria-pressed',String(zoom));
  stage.scrollTo({top:0,left:0,behavior:'instant'});
};
$('image-source-preview').onload=updateImageSourceDimensions;
$('image-source-preview').onerror=()=>{
  if(!$('image-source-lightbox').open)return;
  $('image-source-stage').setAttribute('aria-busy','false');
  $('image-source-preview').hidden=true;
  $('image-source-fit').disabled=true;
  $('image-source-download').disabled=true;
  $('image-source-unavailable').hidden=false;
  $('image-source-dimensions').textContent='ORIGINAL IMAGE UNAVAILABLE';
};
$('image-source-lightbox').addEventListener('close',()=>{
  if($('image-source-lightbox').open)return; // Ignore a delayed close event if already reopened.
  ++imageDetailSourceOpenRevision;
  if(imageDetailSourceOriginalURL){release(imageDetailSourceOriginalURL);imageDetailSourceOriginalURL=null;}
  imageDetailSourceOriginalMime=null;
  $('image-source-download').disabled=true;
  $('image-source-preview').removeAttribute('src');
  $('image-source-stage').classList.remove('is-zoomed');
  $('image-source-stage').setAttribute('aria-busy','false');
  $('image-source-unavailable').hidden=true;
  $('image-source-fit').textContent='Fit';
  $('image-source-fit').setAttribute('aria-pressed','false');
  $('image-source-fit').disabled=true;
});
$('image-detail-prev').onclick=()=>void navigateImageDetail(-1);
$('image-detail-next').onclick=()=>void navigateImageDetail(1);
$('image-detail-expand').onclick=()=>{
  const expanded=$('image-detail-prompt').classList.toggle('is-expanded');
  $('image-detail-expand').setAttribute('aria-expanded',String(expanded));
  $('image-detail-expand').innerHTML=expanded?'Show less <span aria-hidden="true">⌃</span>':'Show more <span aria-hidden="true">⌄</span>';
};
document.addEventListener('keydown',event=>{
  if(!$('image-lightbox').open||$('image-source-lightbox').open||event.altKey||event.ctrlKey||event.metaKey||event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  if(event.key==='Escape'&&$('image-detail-extra').open){
    event.preventDefault();$('image-detail-extra').open=false;
    $('image-detail-extra').querySelector('summary').focus();return;
  }
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
    event.preventDefault();
    void navigateImageDetail(event.key==='ArrowLeft'?-1:1);
  }
});
let detailTouchStart=null;
$('image-lightbox-stage').addEventListener('touchstart',event=>{
  if(event.touches.length===1)detailTouchStart={x:event.touches[0].clientX,y:event.touches[0].clientY};
},{passive:true});
$('image-lightbox-stage').addEventListener('touchend',event=>{
  if(!detailTouchStart||!event.changedTouches.length)return;
  const dx=event.changedTouches[0].clientX-detailTouchStart.x;
  const dy=event.changedTouches[0].clientY-detailTouchStart.y;
  detailTouchStart=null;
  if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.4)void navigateImageDetail(dx<0?1:-1);
},{passive:true});
$('image-lightbox-stage').addEventListener('touchcancel',()=>{detailTouchStart=null;},{passive:true});
$('image-lightbox-fit').onclick=()=>{
  const stage=$('image-lightbox-stage'),zoom=!stage.classList.contains('is-zoomed');
  stage.classList.toggle('is-zoomed',zoom);
  $('image-lightbox-fit').setAttribute('aria-pressed',String(zoom));
  $('image-lightbox-fit').textContent=zoom?'100%':'Fit';
  stage.scrollTo({top:0,left:0,behavior:'instant'});
};
$('image-lightbox-img').onload=()=>{
  const img=$('image-lightbox-img');
  if($('image-lightbox-stage').getAttribute('aria-busy')==='true')return;
  if(img.naturalWidth&&img.naturalHeight&&resultId===imageDetailJob?.outputId){
    $('image-detail-dimensions').textContent=img.naturalWidth+' × '+img.naturalHeight+' / ORIGINAL RATIO';
    $('image-detail-pixels').textContent=img.naturalWidth+' × '+img.naturalHeight+' px';
  }
};
$('image-detail-copy').onclick=async()=>{
  if(!imageDetailJob)return;
  try{
    const text=userFacingImagePrompt(imageDetailJob.settings);if(!text)return;
    await navigator.clipboard.writeText(text);
    $('image-detail-copy').textContent='Copied ✓';
    $('image-detail-copy').dataset.copied='true';
  }catch{
    $('image-detail-copy').textContent='Copy unavailable';
  }
};
$('image-detail-video').onclick=()=>executeImageDetail(animateImage);
$('image-lightbox').addEventListener('click',event=>{
  const menu=$('image-detail-extra');if(menu.open&&!menu.contains(event.target))menu.open=false;
});
$('image-detail-favorite').onclick=async()=>{
  const job=imageDetailJob,requestEpoch=epoch;
  if(!owner||!job||job.favorite===undefined||imageDetailFavoritePending.has(job.id))return;
  const favorite=!job.favorite;
  imageDetailFavoritePending.add(job.id);paintImageDetailFavorite();
  try{
    await api('/api/library/members',{method:'POST',body:{ids:[job.id],favorite}});
    if(!owner||epoch!==requestEpoch)return;
    job.favorite=favorite;
    const cached=imageDetailCache.get(job.id);if(cached)cached.favorite=favorite;
    if(imageDetailJob?.id===job.id)imageDetailJob.favorite=favorite;
    // Refresh the existing gallery heart and Favorites view from the saved state.
    if(assetLibrary?.active())await loadHistory();else await syncHistory();
  }catch(error){if(owner&&epoch===requestEpoch)notify(error.message,true);}
  finally{imageDetailFavoritePending.delete(job.id);if(owner&&epoch===requestEpoch)paintImageDetailFavorite();}
};
$('image-detail-reuse').onclick=()=>executeImageDetail(restore);
$('image-lightbox-content-edit').onclick=()=>executeImageDetail(restore);
$('image-detail-reference').onclick=()=>executeImageDetail(useImageAsReference);
$('image-detail-mood').onclick=()=>executeImageDetail(applyMoodToImage);
$('image-detail-save-mood').onclick=()=>{
  if(!owner||!imageDetailJob||!hasResult(imageDetailJob))return;
  // Reuse this completed result as private board inspiration in the full editor.
  location.assign('./mood-creator.html?fromJob='+encodeURIComponent(imageDetailJob.id));
};
$('image-detail-upscale').onclick=()=>executeImageDetail(upscaleImage);
$('image-detail-repair').onclick=()=>executeImageDetail(openRepair);
$('image-detail-edit-area').onclick=()=>executeImageDetail(async job=>{
  const photo=await assetFile(job.outputId,'retouch-original');
  await openRetouch({file:photo,allowBusy:true});
});
$('image-detail-fix-eyes').onclick=()=>executeImageDetail(async job=>{
  const photo=await assetFile(job.outputId,'eye-repair-original');
  await openRetouch({file:photo,allowBusy:true});
  precisionEditor.suggest('eyes');
});
$('image-detail-delete').onclick=()=>{
  const job=imageDetailJob;
  if(!job||busy||activeStates.has(job.status)||!confirm('Delete this History record and its unshared files? This cannot be undone.'))return;
  closeImageDetail();
  void action(async()=>{
    await api('/api/jobs/'+job.id,{method:'DELETE'});
    const card=[...$('history').children].find(el=>el.dataset.job===job.id);
    if(card){cleanupHistoryCard(card);card.remove();}
    imageDetailCache.delete(job.id);clearResult();await syncHistory();syncImageGalleryEmpty();
    notify('History record deleted. Spending history is unchanged.');
  });
};
$('image-lightbox').addEventListener('close',()=>{
  if($('image-lightbox').open)return; // Ignore a delayed close event after reopening.
  ++previewRevision; // Cancel an in-flight next/previous asset fetch.
  imageDetailPrefetchQueue.length=0;releaseImageDetailPreview();
  releaseImageDetailSource();
  $('image-lightbox-img').removeAttribute('src');
  $('image-lightbox-stage').classList.remove('is-zoomed');
  $('image-detail-copy').textContent='Copy ⧉';
  $('image-detail-prompt').classList.remove('is-expanded');
  imageDetailJob=null;
  refreshImageDetailNavigation();
});

async function openVideo(job,{scroll=true,detail=false,justFinished=false}={}){
  if(job?.settings?.precisionEdit&&!job.settings.precisionFinalized&&job.status==='completed'){
    try{job=await precisionEditor.finalize(job);}catch(error){notify('The raw edit is saved, but preserving original pixels needs attention: '+error.message,true);}
  }
  if(!hasResult(job))throw new Error('This job has no completed output to view or download.');
  const imageDetail=job.settings?.type==='image'&&(tool==='image'||assetLibrary?.active()||detail);
  if(imageDetail)clearResult(); // Never leave the previous image's download active.
  const revision=++previewRevision;
  const current=()=>owner&&revision===previewRevision&&(!imageDetail||$('image-lightbox').open);
  if(imageDetail){
    releaseImageDetailPreview();
    const img=$('image-lightbox-img'),preview=imageDetailPreview(job.outputId);
    if(preview)img.src=preview;else img.removeAttribute('src');
    showImageDetail(job,!!preview,true);
    if(!preview&&!assetBlobs.has(job.outputId))void assetThumbnailBlob(job.outputId).then(blob=>{
      if(!current())return;
      releaseImageDetailPreview();imageDetailPreviewURL=URL.createObjectURL(blob);
      img.src=imageDetailPreviewURL;showImageDetail(job,true,true);
    }).catch(()=>{});
  }
  let blob,kind,ext,decodedURL=null;
  try{
    const original=assetBlob(job.outputId);
    if(imageDetail)prefetchImageDetailNeighbors();
    blob=await original;[kind,ext]=resultFormat(blob);
    if(!current())return;
    if(imageDetail){
      if(kind!=='image')throw Error('Image unavailable');
      // Keep the preview visible until the full-resolution pixels are decoded.
      decodedURL=URL.createObjectURL(blob);
      const decoded=new Image();decoded.src=decodedURL;
      await decoded.decode();
    }
  }catch(error){
    release(decodedURL);
    if(!current())return;
    if(imageDetail){
      const preview=!!$('image-lightbox-img').getAttribute('src');
      showImageDetail(job,preview,true);
      $('image-lightbox-stage').setAttribute('aria-busy','false');
      $('image-detail-dimensions').textContent=preview?'PREVIEW / FULL IMAGE UNAVAILABLE':'IMAGE UNAVAILABLE';
      $('image-lightbox-unavailable').hidden=preview;
      $('image-lightbox-unavailable').textContent='Image could not load. Close and reopen to retry.';
    }
    throw error;
  }
  if(!current()){release(decodedURL);return;}
  clearResult();
  resultUrl=decodedURL||URL.createObjectURL(blob);resultId=job.outputId;resultKind=kind;resultExt=ext;resultSettings={...job.settings,type:kind};
  if(kind==='image'){$('preview').src=resultUrl;$('preview').alt='Generated image result';$('preview').hidden=false;$('video').hidden=true;}
  else{$('video').src=resultUrl;$('video').hidden=false;$('preview').hidden=true;}
  $('empty').hidden=true;$('download').hidden=false;$('download').textContent='Download '+kind+' / '+ext.toUpperCase();
  $('preview-label').textContent='Generated result / '+(kind==='image'?'Image':job.settings.duration+'s');update();
  if(tool==='upscale'&&kind==='image'&&job.settings?.mode==='upscale'){
    upscaleResultUI.ready({url:resultUrl,ext,scale:job.settings.scale,
      sourceWidth:job.settings.sourceWidth||(job.sourceId&&job.sourceId===sourceId?sourceWidth:0),
      sourceHeight:job.settings.sourceHeight||(job.sourceId&&job.sourceId===sourceId?sourceHeight:0),
      outputWidth:job.settings.targetWidth,outputHeight:job.settings.targetHeight,
      sourceUrl:null,sourceAssetId:job.sourceId,announce:justFinished});
  }
  if((tool==='image'||assetLibrary?.active()||detail)&&kind==='image'){
    $('image-lightbox-img').src=resultUrl;
    releaseImageDetailPreview();
    showImageDetail(job,true);
    prefetchImageDetailNeighbors();
    return;
  }
  if(assetLibrary?.active()&&kind==='video'){$('asset-video-player').src=resultUrl;$('asset-video-dialog').showModal();return;}
  if(scroll&&tool==='video')videoFeedCenter.scrollTo({top:0,behavior:'smooth'});
  else if(scroll&&tool==='upscale')document.querySelector('.stage').scrollIntoView({behavior:'auto',block:'nearest'});
}
function saveDownload(url,id,ext){const a=document.createElement('a');a.href=url;a.download='parallel-vision-'+id+'.'+ext;document.body.append(a);a.click();a.remove();}
function downloadResult(){if(!owner||!resultUrl||!resultId)return;saveDownload(resultUrl,resultId,resultExt);}
async function downloadJob(job){
  if(!hasResult(job))throw new Error('No output file exists for this job. The reference is not a generated result.');
  if(resultUrl&&resultId===job.outputId){downloadResult();return;}
  const blob=await assetBlob(job.outputId);if(!owner)return;
  const [,ext]=resultFormat(blob),url=URL.createObjectURL(blob);downloadUrls.add(url);
  saveDownload(url,job.outputId,ext);
  setTimeout(()=>{release(url);downloadUrls.delete(url);},30000);
}
$('asset-video-download').onclick=downloadResult;
$('asset-video-close').onclick=()=>$('asset-video-dialog').close();
$('asset-video-dialog').addEventListener('close',()=>{const v=$('asset-video-player');v.pause();v.removeAttribute('src');v.load();});
$('download').onclick=downloadResult;
$('image-lightbox-download').onclick=downloadResult;



function redrawRepairCanvas(){
  if(!repairImage||!repairMaskCanvas)return;
  const canvas=$('repair-canvas'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(repairImage,0,0,canvas.width,canvas.height);
  ctx.save();ctx.globalAlpha=.45;ctx.drawImage(repairMaskCanvas,0,0);ctx.restore();
}
async function openRepair(job){
  if(!config.falEnabled)throw new Error('FAL image controls are not available on this backend.');
  if(!hasResult(job)||job.settings.type!=='image')throw new Error('Choose a completed image first.');
  repairTarget=job;repairMaskDirty=false;$('repair-prompt').value='';$('repair-status').textContent='';$('repair-strength').value='0.75';$('repair-strength-value').textContent='0.75';
  const blob=await api('/api/assets/'+job.outputId,{blob:true}),url=URL.createObjectURL(blob),img=new Image();
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
  repairImage=img;const canvas=$('repair-canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
  repairMaskCanvas=document.createElement('canvas');repairMaskCanvas.width=canvas.width;repairMaskCanvas.height=canvas.height;
  redrawRepairCanvas();$('repair-dialog').showModal();
  $('repair-dialog').addEventListener('close',()=>{release(url);repairImage=null;repairMaskCanvas=null;repairTarget=null;repairMaskDirty=false;},{once:true});
}
function repairPoint(event){
  const canvas=$('repair-canvas'),rect=canvas.getBoundingClientRect();
  return {x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height};
}
let repairDrawing=false,repairLast=null;
$('repair-canvas').addEventListener('pointerdown',e=>{if(!repairMaskCanvas)return;repairDrawing=true;repairLast=repairPoint(e);$('repair-canvas').setPointerCapture(e.pointerId);});
$('repair-canvas').addEventListener('pointermove',e=>{
  if(!repairDrawing||!repairMaskCanvas)return;const next=repairPoint(e),ctx=repairMaskCanvas.getContext('2d'),size=Number($('repair-brush').value)*repairMaskCanvas.width/Math.max(1,$('repair-canvas').clientWidth);
  ctx.strokeStyle='#fff';ctx.lineWidth=size;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(repairLast.x,repairLast.y);ctx.lineTo(next.x,next.y);ctx.stroke();repairLast=next;repairMaskDirty=true;redrawRepairCanvas();
});
for(const name of ['pointerup','pointercancel','pointerleave'])$('repair-canvas').addEventListener(name,()=>{repairDrawing=false;repairLast=null;});
$('repair-clear').onclick=()=>{if(!repairMaskCanvas)return;repairMaskCanvas.getContext('2d').clearRect(0,0,repairMaskCanvas.width,repairMaskCanvas.height);repairMaskDirty=false;redrawRepairCanvas();};
$('repair-strength').oninput=()=>{$('repair-strength-value').textContent=Number($('repair-strength').value).toFixed(2);};
$('repair-close').onclick=()=>$('repair-dialog').close();
$('repair-submit').onclick=()=>action(async()=>{
  if(!repairTarget||!repairMaskCanvas||!repairImage)throw new Error('Open a completed image for repair first.');
  const prompt=$('repair-prompt').value.trim();if(!prompt)throw new Error('Describe what should change inside the painted region.');if(!repairMaskDirty)throw new Error('Paint the region you want to repair.');
  const exportCanvas=document.createElement('canvas');exportCanvas.width=repairMaskCanvas.width;exportCanvas.height=repairMaskCanvas.height;const ctx=exportCanvas.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,exportCanvas.width,exportCanvas.height);ctx.drawImage(repairMaskCanvas,0,0);
  const maskBlob=await new Promise((resolve,reject)=>exportCanvas.toBlob(b=>b?resolve(b):reject(new Error('Could not create the repair mask.')),'image/png'));
  const maskFile=new File([maskBlob],'repair-mask.png',{type:'image/png'}),maskSourceId=await uploadAsset(maskFile);
  const sourceId=repairTarget.outputId,keepRefs=repairTarget.settings?.provider==='fal'||repairTarget.settings?.engine==='fal';
  const referenceSourceIds=keepRefs?(repairTarget.settings.referenceSourceIds||[]):[],referenceRoles=keepRefs?(repairTarget.settings.referenceRoles||[]):[];
  const settings={type:'image',provider:'fal',engine:'fal',model:'fal-ai/flux-general/inpainting',mode:'controlled-repair',prompt,resolution:'source',aspectRatio:'source',outputFormat:'png',strength:Number($('repair-strength').value),poseStrength:Number(repairTarget.settings?.poseStrength??0.65),identityStrength:Number(repairTarget.settings?.identityStrength??0.7),sourceWidth:repairImage.naturalWidth,sourceHeight:repairImage.naturalHeight,seed:'',referenceRoles};
  $('repair-status').textContent='Submitting repair to FAL…';
  const data=await api('/api/fal/repair',{method:'POST',body:{sourceId,maskSourceId,referenceSourceIds,poseMapSourceId:keepRefs?repairTarget.settings?.poseMapSourceId||null:null,settings}});
  if(data.job&&activeStates.has(data.job.status))setActive(data.job);if(data.job)autoPreview={id:data.job.id,revision:previewRevision};
  $('repair-dialog').close();await syncHistory();notify('Repair requested. The original image is unchanged; the repaired version will appear as a new History item.');
});
async function prepareQuoteInputs(inputs,snapshot=null){
  if(!snapshot&&tool==='video'){
    if((engine==='wan'||engine==='wanprime')&&mode==='start'&&$('ratio').value==='21:9'){
      const sessionEpoch=epoch, originals=[{id:inputs.sourceId,file},...(inputs.lastSourceId&&lastFile?[{id:inputs.lastSourceId,file:lastFile}]:[])],transferSourceIds=[];
      for(const item of originals){
        const cacheKey='wan21x9:'+item.id;let copy=workingCopies.get(cacheKey);
        if(!copy||Date.now()-copy.at>900000){
          notify('Preparing a private 21:9 working crop of '+item.file.name+'…');
          const prepared=await wanUltrawideWorkingCopy(item.file);
          if(epoch!==sessionEpoch||!owner)throw new Error('Session changed.');
          const id=await uploadAsset(prepared);copy={id,at:Date.now()};workingCopies.set(cacheKey,copy);
        }
        transferSourceIds.push(copy.id);
      }
      if(epoch!==sessionEpoch||!owner)throw new Error('Session changed.');
      return {...inputs,transferSourceIds};
    }
    if(['seedance','seedance15','seedance4k'].includes(engine)&&!['text','extend'].includes(mode)){
      const sessionEpoch=epoch;
      const originals=mode==='reference'?references:[{id:inputs.sourceId,file},...(inputs.lastSourceId&&lastFile?[{id:inputs.lastSourceId,file:lastFile}]:[])];
      const oversized=originals.filter(r=>r.file.size>PROVIDER_IMAGE_LIMIT);
      if(!oversized.length)return inputs;
      const transferSourceIds=[];
      for(const item of originals){
        if(item.file.size<=PROVIDER_IMAGE_LIMIT){transferSourceIds.push(item.id);continue;}
        const cacheKey='seedance:'+item.id;let copy=workingCopies.get(cacheKey);
        if(!copy||Date.now()-copy.at>900000){
          notify('Preparing a Seedance working copy of '+item.file.name+'…');
          const prepared=await providerWorkingCopy(item.file);
          if(epoch!==sessionEpoch||!owner)throw new Error('Session changed.');
          const id=await uploadAsset(prepared);copy={id,at:Date.now()};workingCopies.set(cacheKey,copy);
        }
        transferSourceIds.push(copy.id);
      }
      if(epoch!==sessionEpoch||!owner)throw new Error('Session changed.');
      return {...inputs,transferSourceIds};
    }
    return inputs;
  }
  const sessionEpoch=epoch;
  if(!snapshot&&tool==='upscale'&&!isFalUpscale()&&sourcePixels>UPSCALE_PIXELS[$('resolution').value]&&!confirm('This size tier is smaller than your source and would reduce its resolution. Continue with this tier?'))return null;
  const originals=snapshot?snapshot.originals:tool==='upscale'||isReinterpret()?[{id:inputs.sourceId,file}]:imageEngine==='soul'&&tool==='image'?[]:references;
  const selectedEngine=snapshot?.engine??(tool==='image'?imageEngine:null);
  const transferSourceIds=[];
  for(const item of originals){
    // Dimensions are known from inspectImage. If a legacy input omitted them,
    // decode it before quoting rather than silently passing through an unsafe ID.
    const seedreamInput=['seedream','seedreamlite'].includes(selectedEngine)&&(snapshot?true:tool==='image');
    const hasDimensions=Number.isSafeInteger(Number(item.width))&&Number(item.width)>0
      &&Number.isSafeInteger(Number(item.height))&&Number(item.height)>0;
    // Legacy restored drafts may lack width/height. Pass measured dimensions
    // into the same prewarm cache so pixel-limited inputs are never skipped.
    const prepareItem=seedreamInput&&!hasDimensions
      ?{...item,...(await imageDimensions(item.file))}
      :item;
    const pixels=seedreamInput?Number(prepareItem.width)*Number(prepareItem.height):0;
    const resizeForSeedream=pixels>SEEDREAM_INPUT_MAX_PIXELS;
    if(!resizeForSeedream&&item.file.size<=PROVIDER_IMAGE_LIMIT){
      transferSourceIds.push(item.id);continue;
    }
    const cacheKey=resizeForSeedream?'seedream-pixels:'+item.id:item.id;
    let copy=workingCopies.get(cacheKey);
    if(!copy||Date.now()-copy.at>900000){
      snapshot?.onProgress?.('Optimizing references',
        resizeForSeedream?'Fitting source pixels to Seedream; original kept.':'Preparing a smaller encoded copy; original kept.');
      if(!snapshot?.detached)notify(resizeForSeedream
        ?'Preparing a Seedream-compatible working copy of '+item.file.name+' ('+(pixels/1000000).toFixed(1)+' MP). Original unchanged.'
        :'Preparing a same-dimension working copy of '+item.file.name+'…');
      // Reuse the already-running background preparation or its 15-minute
      // local result. No local work is duplicated when Generate is pressed.
      const prepared=seedreamInput
        ?await seedreamPreparer.forSubmission(prepareItem)
        :(resizeForSeedream?await seedreamWorkingCopy(item.file):await providerWorkingCopy(item.file));
      if(epoch!==sessionEpoch||!owner)throw new Error('Session changed.');
      const id=await uploadAsset(prepared);copy={id,at:Date.now()};
      workingCopies.set(cacheKey,copy);
    }
    transferSourceIds.push(copy.id);
  }
  if(epoch!==sessionEpoch||!owner)throw new Error('Session changed.');
  return {...inputs,transferSourceIds};
}
async function upscaleImage(job){
  if(!hasResult(job)||job.settings.type!=='image')throw new Error('Choose a completed image first.');
  clearMedia();setTool('upscale');
  await setImage(await assetFile(job.outputId,'image-to-upscale'),job.outputId);
  update();notify(isFalUpscale()?'Image loaded for upscaling. Choose the Topaz model and scale, then click Upscale. PV Lab will check price and output size automatically before submitting.':'Image loaded for upscaling. Choose the size, then click Upscale to start one paid job. Nothing has been submitted yet.');
  window.scrollTo({top:0,behavior:'smooth'});
}

async function animateImage(job){
  if(!hasResult(job)||job.settings.type!=='image')throw new Error('Choose a completed image first.');
  const requestEpoch=epoch,firstFrame=await assetFile(job.outputId,'generated-image');
  if(!owner||epoch!==requestEpoch)return;
  clearMedia();videoStartFrameHandoff=true;selectedVideoJob=null;setTool('video');setMode('start');
  if(!await setImage(firstFrame,job.outputId)||!owner||epoch!==requestEpoch)return;
  $('prompt').value='';update();restoreLatestVideoSelection();
  notify('');
  videoFeedCenter.scrollTo({top:0,behavior:'instant'});
  window.scrollTo({top:0,behavior:'smooth'});
}
async function refineInSeedream(job,preset='full'){
  if(!hasResult(job)||job.settings.type!=='image')throw new Error('Choose a completed image first.');
  if(!config.enabled)throw new Error('SpicyAPI is not connected.');
  const prompts={
    full:'Preserve this exact adult person, identity, face, body proportions, pose, camera angle, framing, composition, room, lighting and overall image. Refine only photographic quality and anatomical detail. Improve hands, fingers, feet, toes, garment construction, fabric edges, hair strands, skin pores and subtle natural skin variation. Correct small anatomical or clothing artifacts without redesigning the person or scene. Keep the result realistic and unretouched, with natural texture, coherent shadows and restrained photographic detail. No body reshaping, no slimmer body, no enlarged features, no beauty-filter face, no plastic skin, no CGI look.',
    face:'Preserve the entire image exactly. Refine only facial fidelity and photographic facial detail: coherent eyes, eyelids, nose, lips, teeth if visible, freckles, skin pores and individual hair strands. Keep the same adult identity, expression, face shape, body, pose, clothing, background, framing and lighting. No beauty-filter face, no facial redesign, no body changes.',
    extremities:'Preserve the entire image exactly. Refine only hands, fingers, feet and toes for anatomically coherent realistic detail. Keep the exact adult identity, face, body proportions, pose, clothing, composition, room, camera and lighting unchanged. Do not reshape the body.',
    clothing:'Preserve the exact adult person, identity, body proportions, pose, composition, camera and lighting. Refine only garment construction and textile realism: clean seams, straps, hems, closures, fabric tension, folds and edges. Remove fused or impossible clothing artifacts. Do not redesign the outfit or body.'
  };
  clearMedia();setTool('image');imageEngine='seedream';$('image-engine').value='seedream';setTool('image');
  const file=await assetFile(job.outputId,'pv-soul-refine-source');
  await addReferences([file],[job.outputId],[{name:file.name,role:'none',note:'Primary image. Preserve identity, body, pose, composition, camera and lighting; refine only requested defects.'}]);
  $('prompt').value=prompts[preset]||prompts.full;
  $('resolution').value='1k';$('ratio').value='auto';$('image-count').value='1';update();
  notify('Loaded into Seedream Refine. Review the preset prompt, then click Generate. Nothing has been submitted yet.');
  window.scrollTo({top:0,behavior:'smooth'});
}

async function loadPacks(){const data=await api('/api/packs');sceneLibrary?.sync(data.packs);packs=data.packs.filter(p=>!isSceneLibraryPack(p));$('pack-select').replaceChildren(new Option('Choose a saved pack',''),...packs.map(p=>new Option(p.name,p.id)));if($('soul-pro-pack-select'))$('soul-pro-pack-select').replaceChildren(new Option('Choose a saved pack',''),...packs.filter(p=>p.refs?.length>=1).map(p=>new Option(p.name+' · '+p.refs.length+' ref'+(p.refs.length===1?'':'s'),p.id)));composerLibraryKey='';syncImageComposer();packStudio.refresh();}
$('pack-save').onclick=()=>action(async()=>{if(!references.length)throw new Error('Add reference images first.');const name=window.prompt('Name this reference pack, for example Nina FOK / Editorial');if(!name?.trim())return;const ids=await ensureReferences();await api('/api/packs',{method:'POST',body:{name:name.trim(),engine:tool==='video'?engine:'wan',referenceSourceIds:ids,referenceRoles:referenceRoles()}});await loadPacks();notify('Reference pack saved privately. No generation charge.');});
$('pack-load').onclick=()=>action(async()=>{
  const pack=packs.find(p=>p.id===$('pack-select').value);
  if(!pack)throw new Error('Choose a saved pack.');
  if(tool==='image'&&imageEngine==='fal'){
    const identities=pack.refs.filter(r=>r.role==='identity').slice(0,4);
    if(!identities.length)throw new Error('This pack has no references marked Identity.');
    const pose=references.find(r=>r.role==='pose')||null;
    const keep=pose?[pose]:[];
    for(const r of references)if(r!==pose)releaseReference(r);
    references=keep;
    const files=await Promise.all(identities.map(r=>assetFile(r.id,r.name.replace(/\.[^.]+$/,''))));
    await addReferences(files,identities.map(r=>r.id),identities);
    notify((pose?'Pose kept. ':'')+identities.length+' Nina identity reference'+(identities.length===1?'':'s')+' loaded from '+pack.name+'.');
    return;
  }
  if(usesReferenceGuidance()&&!referencesOnly()&&references.length){
    const base=references[0];
    if(pack.refs.length+1>referenceLimit())throw new Error('Keep the base and choose a pack with up to '+(referenceLimit()-1)+' references.');
    const files=await Promise.all(pack.refs.map(r=>assetFile(r.id,r.name.replace(/\.[^.]+$/,''))));
    for(const r of references.slice(1))releaseReference(r);references=[base];base.role='base';
    await addReferences(files,pack.refs.map(r=>r.id),pack.refs.map(r=>({...r,role:r.role==='base'?'none':r.role})));
    notify('Base kept. Reference pack loaded.');return;
  }
  if(pack.refs.length>referenceLimit())throw new Error('This pack contains more than '+referenceLimit()+' images for the current mode.');
  if(references.length&&!confirm('Replace the current references with this pack?'))return;
  const files=await Promise.all(pack.refs.map(r=>assetFile(r.id,r.name.replace(/\.[^.]+$/,''))));
  references.forEach(releaseReference);references=[];
  await addReferences(files,pack.refs.map(r=>r.id),pack.refs);
  notify('Pack loaded with reference order, roles and notes.');
});
$('pack-delete').onclick=()=>action(async()=>{const id=$('pack-select').value;if(!id||!confirm('Delete this reference pack? Existing generation history remains.'))return;await api('/api/packs/'+id,{method:'DELETE'});await loadPacks();notify('Reference pack deleted.');});
async function loadSoulProIdentity(){
  if(!owner)return;
  soulProIdentity=await api('/api/soul-pro/identity');
  if($('soul-pro-identity-status'))$('soul-pro-identity-status').textContent=soulProIdentity.configured?'Saved Nina identity · '+soulProIdentity.count+' reference'+(soulProIdentity.count===1?'':'s'):'Nina identity not set yet';
  update();
}
function clearSoulProPackPreview(){
  for(const url of soulProPackUrls)release(url);soulProPackUrls=[];soulProPackSelection=[];
  $('soul-pro-pack-grid').replaceChildren();$('soul-pro-pack-preview').hidden=true;$('soul-pro-pack-count').textContent='0 / 4 selected';
}
async function renderSoulProPack(pack){
  clearSoulProPackPreview();if(!pack)return;
  $('soul-pro-pack-preview').hidden=false;$('soul-pro-identity-dialog-status').textContent='Loading '+pack.refs.length+' pack image'+(pack.refs.length===1?'':'s')+'…';
  const chosen=new Set(pack.refs.slice(0,Math.min(4,pack.refs.length)).map(r=>r.id));
  soulProPackSelection=[...chosen];
  for(const ref of pack.refs){
    const label=document.createElement('label');label.className='soul-pro-pack-item';
    const box=document.createElement('input');box.type='checkbox';box.checked=chosen.has(ref.id);box.value=ref.id;
    const img=document.createElement('img');img.alt=ref.name||'Identity reference';
    const name=document.createElement('span');name.textContent=ref.name||'Reference';
    box.onchange=()=>{
      const selected=[...$('soul-pro-pack-grid').querySelectorAll('input:checked')];
      if(selected.length>4){box.checked=false;$('soul-pro-identity-dialog-status').textContent='Choose at most 4 images.';}
      soulProPackSelection=[...$('soul-pro-pack-grid').querySelectorAll('input:checked')].map(x=>x.value);
      $('soul-pro-pack-count').textContent=soulProPackSelection.length+' / 4 selected';
    };
    label.append(box,img,name);$('soul-pro-pack-grid').append(label);
    api('/api/assets/'+ref.id,{blob:true}).then(blob=>{
      if(!blob.type.startsWith('image/')||!blob.size)throw new Error('Preview unavailable');
      const url=URL.createObjectURL(blob);soulProPackUrls.push(url);img.src=url;
    }).catch(()=>{img.alt='Preview unavailable';});
  }
  $('soul-pro-pack-count').textContent=soulProPackSelection.length+' / 4 selected';
  $('soul-pro-identity-dialog-status').textContent='';
}
$('soul-pro-identity-manage').onclick=()=>{
  if(busy)return;closeComposerLibrary();toggleImageSettings(false);clearSoulProPackPreview();
  $('soul-pro-pack-select').value='';$('soul-pro-identity-dialog-status').textContent='';$('soul-pro-identity-files').value='';
  soulProEditingCurrent=soulProIdentity.configured;
  imageComposer.append($('soul-pro-identity-dialog'));
  $('soul-pro-identity-dialog').show();
  if(soulProEditingCurrent)void renderSoulProPack({refs:soulProIdentity.refs});
};
$('soul-pro-identity-files').onchange=()=>{
  soulProEditingCurrent=false;clearSoulProPackPreview();$('soul-pro-pack-select').value='';
  const files=[...$('soul-pro-identity-files').files];
  $('soul-pro-identity-dialog-status').textContent=files.length>4?'Choose at most 4 photos.':files.length+' new reference photos selected.';
};
$('soul-pro-pack-select').onchange=()=>action(async()=>{soulProEditingCurrent=false;$('soul-pro-identity-files').value='';const pack=packs.find(p=>p.id===$('soul-pro-pack-select').value);await renderSoulProPack(pack);});
$('soul-pro-save-identity').onclick=()=>action(async()=>{
  const status=$('soul-pro-identity-dialog-status'),files=[...$('soul-pro-identity-files').files],pack=packs.find(p=>p.id===$('soul-pro-pack-select').value);
  if(files.length&&soulProPackSelection.length){status.textContent='Use one source: uploaded images OR selected pack images.';return;}
  let ids=[],sourceLabel='';
  try{
    if(files.length){
      if(files.length>4){status.textContent='Choose at most 4 Nina identity images.';return;}
      status.textContent='Uploading '+files.length+' Nina image'+(files.length===1?'':'s')+'…';
      for(const file of files){await inspectImage(file).then(item=>{release(item.url);release(item.thumbUrl);});ids.push(await uploadAsset(file));}
      sourceLabel=files.length+' uploaded image'+(files.length===1?'':'s');
    }else if(pack||soulProEditingCurrent){
      ids=[...soulProPackSelection];
      if(ids.length<1||ids.length>4){status.textContent='Select 1 to 4 images from this pack.';return;}
      sourceLabel=ids.length+' selected image'+(ids.length===1?'':'s')+' from '+(pack?.name||'active Nina photos');
    }else{
      status.textContent='Upload 1–4 Nina images or choose images from a saved pack.';
      return;
    }
    status.textContent='Saving Nina identity…';
    soulProIdentity=await api('/api/soul-pro/identity',{method:'POST',body:{referenceSourceIds:ids}});
    clearSoulProPackPreview();$('soul-pro-identity-dialog').close();await loadPacks();update();
    notify('Nina identity saved from '+sourceLabel+'. '+(activeJobs.some(j=>j.status==='uncertain'&&jobProvider(j)==='fal')?'The previous FAL request still needs review in History before another generation.':'Add one base image, then Generate identity edit.'));
  }catch(error){
    status.textContent=error.name==='AbortError'?'Identity save was interrupted. Try again.':error.message;
    throw error;
  }
});
$('soul-pro-identity-dialog').addEventListener('close',()=>{
  clearSoulProPackPreview();
  if(owner&&tool==='image'&&imageEngine==='soulpro'){
    $('composer-library').hidden=false;$('composer-character').setAttribute('aria-expanded','true');
    composerLibraryKey='';renderComposerLibrary();$('composer-library-create').focus();
  }
});
$('soul-pro-clear-identity').onclick=()=>action(async()=>{
  if(!soulProIdentity.configured)return;if(!confirm('Clear the saved Nina identity? Existing generation history remains.'))return;
  soulProIdentity=await api('/api/soul-pro/identity',{method:'DELETE'});$('soul-pro-identity-dialog').close();update();notify('Saved Nina identity cleared.');
});

// Full-size archive media should not all compete for network bandwidth when a
// gallery page becomes visible. Prioritize the first visible cards and bound
// private image downloads while keeping the existing full-resolution viewer.
const MAX_GALLERY_PREVIEW_READS=4;
const galleryPreviewQueue=[];
let galleryPreviewReads=0;
function pumpGalleryPreviewQueue(){
  while(galleryPreviewReads<MAX_GALLERY_PREVIEW_READS&&galleryPreviewQueue.length){
    const {img,rev}=galleryPreviewQueue.shift();
    if(!owner||rev!==historyRevision||!img.isConnected)continue;
    galleryPreviewReads++;
    void assetThumbnailBlob(img.dataset.asset).then(blob=>{
      if(!owner||rev!==historyRevision||!img.isConnected)return;
      if(!blob.type.startsWith('image/')||!blob.size)throw new Error('Preview unavailable');
      const u=URL.createObjectURL(blob);cardUrls.add(u);img.dataset.objectUrl=u;img.src=u;
    }).catch(()=>{
      if(!owner||rev!==historyRevision||!img.isConnected)return;
      historyPreviewFailed(img);
    }).finally(()=>{
      galleryPreviewReads--;
      pumpGalleryPreviewQueue();
    });
  }
}
const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){
    if(!entry.isIntersecting)continue;
    const img=entry.target;observer.unobserve(img);
    galleryPreviewQueue.push({img,rev:historyRevision});
  }
  pumpGalleryPreviewQueue();
},{rootMargin:'200px'});
function historyPreviewFailed(img){
  const figure=img.closest('.history-media');if(!figure)return;
  img.classList.add('history-asset-loading');
  figure.classList.remove('has-image');figure.classList.add('is-unavailable');
  figure.setAttribute('aria-busy','false');
  if(!figure.querySelector('.history-preview-unavailable')){
    const fallback=document.createElement('span');fallback.className='history-preview-unavailable';
    fallback.textContent='Preview unavailable';figure.append(fallback);
  }
}
function historyImage(assetId,label,isResult=false){
  const figure=document.createElement('figure');figure.className='history-media'+(isResult?' is-result':'');
  figure.setAttribute('aria-busy','true');figure.setAttribute('aria-label',label);
  const img=document.createElement('img');img.alt=label;img.dataset.asset=assetId;img.dataset.result=String(isResult);img.loading='lazy';
  img.classList.add('history-asset-loading');
  img.onload=()=>{
    img.classList.remove('history-asset-loading');figure.classList.add('has-image');
    figure.classList.remove('is-unavailable');figure.setAttribute('aria-busy','false');
    figure.querySelector('.history-preview-unavailable')?.remove();
  };
  img.onerror=()=>historyPreviewFailed(img);
  const caption=document.createElement('figcaption');caption.textContent=label;figure.append(img,caption);return {figure,img};
}
function historyFingerprint(j){return JSON.stringify([j.status,j.outputId||'',j.providerTaskId||'',j.error||'',j.estimatedUsd??null,j.settledUsd??null,j.updatedAt||'',j.favorite,j.settings]);}
function isEmptyCustomerImageWelcome(){
  return customerMode&&tool==='image'&&!moodDiscoveryOpen&&
    $('app').classList.contains('image-studio-active')&&
    !$('lab-welcome-start').hidden&&!$('image-gallery-empty').hidden&&
    !$('history').querySelector('.card[data-kind="image"]');
}
function updateHistorySelectionUi(){
  const emptyCustomerWelcome=isEmptyCustomerImageWelcome();
  // Do not expose a meaningless "0 selected" selection bar over a brand-new
  // customer's six-Mood welcome. Owner accounts with saved images keep the
  // existing History Select flow and Discreet Mode is independent.
  if(emptyCustomerWelcome&&historySelectMode){
    historySelectMode=false;
    historySelected.clear();
  }
  $('history-selection').hidden=!historySelectMode;
  $('history-select').hidden=historySelectMode||emptyCustomerWelcome;
  $('history').classList.toggle('is-selecting',historySelectMode);
  for(const card of $('history').querySelectorAll('.card')){
    const selectable=historySelectMode&&card.dataset.deletable==='true',selected=historySelected.has(card.dataset.job);
    card.classList.toggle('is-selectable',selectable);card.classList.toggle('is-selected',selected);
    if(selectable){card.tabIndex=0;card.removeAttribute('role');card.setAttribute('aria-selected',String(selected));}
    else{card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',card.dataset.kind==='image'?'Open image details':card.dataset.state==='completed'?'Open saved video in large player':'View video generation status');card.removeAttribute('aria-selected');}
    const box=card.querySelector('.history-select-box');if(box){box.hidden=!historySelectMode;const input=box.querySelector('input');if(input)input.checked=selected;}
  }
  $('history-selection-count').textContent=historySelected.size+' selected';
  $('history-delete-selected').disabled=historySelected.size===0;
  assetLibrary?.selection();
}
function setHistorySelectMode(on){
  historySelectMode=!!on;if(!historySelectMode)historySelected.clear();updateHistorySelectionUi();
}
function cleanupHistoryCard(card){if(!card)return;for(const img of card.querySelectorAll('img')){observer.unobserve(img);const u=img.dataset.objectUrl;if(u){release(u);cardUrls.delete(u);}}}
function historyJobVisible(job){return !!assetLibrary?.active()||(tool==='upscale'?job.settings?.mode==='upscale':job.settings?.type===tool);}
function renderCards(jobs,{upsert=false}={}){
  const items=upsert?[...jobs].reverse():jobs;
  for(const j of items){
    if(!historyJobVisible(j))continue;
    const existing=[...$('history').children].find(el=>el.dataset.job===j.id),fingerprint=historyFingerprint(j);
    if(existing?.dataset.fingerprint===fingerprint)continue;
    if(j.settings.type==='image')imageDetailCache.set(j.id,j);
    const card=document.createElement('article');card.className='card';card.dataset.kind=j.settings.type==='image'?'image':'video';card.dataset.job=j.id;card.dataset.state=j.status;card.dataset.fingerprint=fingerprint;card.dataset.deletable=String(!activeStates.has(j.status));
    const proportions=String(j.settings.aspectRatio||'16:9').split(':').map(Number);const geometry=j.settings.galleryDimensions;card.dataset.ratio=String(geometry&&geometry.assetId===j.outputId&&geometry.width>0&&geometry.height>0?geometry.width/geometry.height:proportions[0]/proportions[1]||16/9);
    if(j.settings.type==='video')videoJobCache.set(j.id,j);
    const openCard=()=>{
      if(!owner||historySelectMode)return;
      if(j.settings.type==='image')void viewMedia(()=>openImageRecord(j));
      else if(assetLibrary?.active())void viewMedia(()=>openVideo(j));else if(tool==='video')showVideoHistoryRecord(j,{play:true,reveal:true});
    };
    card.addEventListener('click',event=>{
      if(historySelectMode||event.target.closest('button,input,select,textarea,a,label'))return;
      openCard();
    });
    card.addEventListener('keydown',event=>{
      if(historySelectMode||event.target!==card||!['Enter',' '].includes(event.key))return;
      event.preventDefault();openCard();
    });
    if(!activeStates.has(j.status)){
      const select=document.createElement('label');select.className='history-select-box';select.hidden=!historySelectMode;
      const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=historySelected.has(j.id);checkbox.setAttribute('aria-label','Select this History item');
      const toggleSelection=()=>{checkbox.checked=!checkbox.checked;if(checkbox.checked)historySelected.add(j.id);else historySelected.delete(j.id);updateHistorySelectionUi();};
      checkbox.onchange=()=>{if(checkbox.checked)historySelected.add(j.id);else historySelected.delete(j.id);updateHistorySelectionUi();};
      select.append(checkbox);card.append(select);
      card.addEventListener('click',event=>{if(!historySelectMode)return;if(event.target.closest('.history-select-box'))return;event.preventDefault();event.stopImmediatePropagation();toggleSelection();},true);
      card.addEventListener('keydown',event=>{if(event.target!==card||!historySelectMode||!['Enter',' '].includes(event.key))return;event.preventDefault();toggleSelection();});
    }
    const image=j.settings.type==='image',ready=hasResult(j),previews=[];
    const contentRestricted=j.status==='failed'&&isContentRestriction(j.error);
    if(ready&&image){
      const {figure,img}=historyImage(j.outputId,'Generated image',true);previews.push(img);card.append(figure);
      img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','View generated image at full size');
      img.title='Drag to the Image deck to reuse the full-resolution original';
      figure.draggable=true;img.draggable=true;
      figure.addEventListener('dragstart',event=>{
        if(!owner||historySelectMode||busy||!event.dataTransfer||!j.outputId){
          event.preventDefault();return;
        }
        event.dataTransfer.effectAllowed='copy';
        event.dataTransfer.setData(HISTORY_IMAGE_DRAG_TYPE,j.outputId);
      });
      figure.addEventListener('dragend',()=>imageComposer.classList.remove('is-dragging'));
      img.onclick=e=>{e.stopPropagation();openCard();};img.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();img.click();}};
    }else if(ready&&j.sourceId){
      const {figure,img}=historyImage(j.sourceId,'Original start frame thumbnail, not the video');previews.push(img);
      figure.classList.add('history-video-thumb');
      const playLabel=document.createElement('span');playLabel.className='history-video-play';playLabel.setAttribute('aria-hidden','true');
      playLabel.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m9 5 10 7-10 7Z"/></svg><span>PLAY VIDEO</span>';figure.append(playLabel);card.append(figure);
    }else{
      const empty=document.createElement('div');empty.className='history-no-result';
      if(contentRestricted){
        empty.classList.add('is-content-restricted');
        const kicker=document.createElement('small');kicker.className='content-restriction-kicker';kicker.textContent='PV LAB / CONTENT GUIDELINES';
        const title=document.createElement('strong');title.textContent='Not with this model.';
        const detail=document.createElement('p');detail.className='content-restriction-copy';detail.textContent=contentRestrictionGuidance(j);
        const edit=button('Reuse prompt',()=>restore(j));edit.classList.add('content-restriction-edit');
        const foot=document.createElement('div');foot.className='content-restriction-foot';
        const saved=document.createElement('small');saved.textContent='Your prompt is saved.';foot.append(saved);
        if(jobCreditsReturned(j)){
          const refunded=document.createElement('small');refunded.className='content-restriction-credits';refunded.textContent='Credits returned';foot.append(refunded);
        }
        empty.append(kicker,title,detail,edit,foot);
      }else{
        const title=document.createElement('strong'),detail=document.createElement('span');
        title.textContent=j.settings.mode==='soul-id-training'&&j.status==='completed'?'Soul ID ready':j.status==='draft'?'Saved draft':j.status==='failed'?imageFailureHeading(j.error):j.status==='uncertain'?'Status unknown':activeStates.has(j.status)?({submitting:'Submitting',queued:'Queued',running:'Generating',saving:'Saving'}[j.status]||'Result pending'):ready?'Video saved':j.status==='completed'?'Output unavailable':'No result';
        detail.textContent=j.settings.mode==='soul-id-training'&&j.status==='completed'?'Choose this identity from the Soul ID photo tile to generate.':j.status==='draft'?'No generation submitted.':j.status==='failed'?(j.error||'The provider ended this request without a generated file.'):j.status==='uncertain'?'PV Lab could not confirm the provider state. Check the provider before retrying; nothing will be resubmitted automatically.':activeStates.has(j.status)?'The finished output will appear here.':ready?'Select this record to load and play the saved video.':'No generated file is available to view or download.';
        empty.append(title,detail);
      }
      card.append(empty);
    }
    if(ready){
      // Overlay controls remain accessible when the Assets grid hides card metadata.
      const quickDownload=document.createElement('button');quickDownload.type='button';quickDownload.className='history-hover-download'+(image?'':' history-video-download');
      quickDownload.title=image?'Download full-resolution image':'Download video';quickDownload.setAttribute('aria-label',quickDownload.title);
      quickDownload.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/></svg>';
      quickDownload.onclick=event=>{event.preventDefault();event.stopPropagation();if(!historySelectMode)void viewMedia(()=>downloadJob(j));};
      card.append(quickDownload);
    }
    const body=document.createElement('div');body.className='cardbody';
    const meta=document.createElement('div');meta.className='cardmeta';
    const imageLabel=image?(j.settings.mode==='upscale'?'UPSCALE':j.settings.mode==='soul-id-training'?'SOUL ID TRAINING':j.settings.mode==='reinterpret'?'IMAGE · REINTERPRET':'IMAGE'):videoLabel(j.settings)+' / '+j.settings.duration+'s';
    const modelLabel=image?galleryImageModelName(j).toUpperCase():null;
    const resolutionLabel=j.settings.mode==='upscale'?upscaleSize(j.settings):j.settings.resolution;
    meta.textContent=[j.status.toUpperCase(),imageLabel,modelLabel,resolutionLabel,new Date(j.createdAt).toLocaleDateString()].filter(Boolean).join(' / ');
    meta.title=image?'Model: '+galleryImageModelName(j):'Video model: '+videoLabel(j.settings);
    const p=document.createElement('p');p.textContent=image?imageHistoryCaption(j.settings):(j.settings.prompt||'No direction saved.');
    const actions=document.createElement('div');actions.className='cardactions';
    if(ready){
      const download=button(image?'Download image':'Download video',()=>downloadJob(j));download.classList.add('result-download');actions.append(download);
      actions.append(button(image?'View image':'View video',()=>image?openImageRecord(j):openVideo(j),viewMedia));
    }else{
      const download=button(image?'Download image':'Download video',async()=>{});download.disabled=true;download.title='Available only when a completed output file exists.';actions.append(download);
    }
    actions.append(button('Reuse',()=>restore(j)));
    if(ready&&image){
      if(j.settings?.engine==='soul')actions.append(button('Refine in Seedream',()=>refineInSeedream(j,'full')));
      actions.append(button('Repair',()=>openRepair(j)));actions.append(button('Upscale',()=>upscaleImage(j)));actions.append(button('Use in Video',()=>animateImage(j)));
    }
    if(j.status==='failed'&&jobProvider(j)==='fal'&&j.providerTaskId)actions.append(button('Recover FAL output',async()=>{
      notify('Checking fal.ai for an existing output. No generation will be submitted.');
      const data=await api('/api/jobs/'+j.id+'/recover',{method:'POST'});
      await syncHistory();
      if(data.job&&hasResult(data.job))await openVideo(data.job,{scroll:false});
      notify(data.job&&hasResult(data.job)?'Recovered the existing fal.ai output into private History.':'No recoverable fal.ai output was found.',!(data.job&&hasResult(data.job)));
    }));
    const canReconcile=j.status==='uncertain'&&j.settings.provider==='fal'&&!j.providerTaskId&&(j.settings.engine==='soulpro'&&['inline-data-uri','fal-cdn'].includes(j.settings.inputTransport)||j.settings.mode==='upscale');
    if(canReconcile)actions.append(button('Check FAL status',async()=>{
      notify('Checking FAL for the original request. No generation will be submitted.');
      await api('/api/jobs/'+j.id+'/reconcile',{method:'POST',body:{}});
      await syncHistory();
      notify('FAL status checked. History refreshed. No generation submitted.');
    }));
    if(j.status==='uncertain'&&!customerMode)actions.append(button('Mark reviewed',async()=>{
      if(!confirm('Have you checked this '+(jobProvider(j)==='openrouter'?'OpenRouter':jobProvider(j)==='fal'?'FAL':jobProvider(j)==='gemini'?'Google':'SpicyAPI')+' request in the provider dashboard? This closes only this interruption. The reserved estimate stays in spending history. It does not generate, retry, cancel or refund anything.'))return;
      await api('/api/jobs/'+j.id+'/resolve',{method:'POST',body:{confirm:true}});
      await syncHistory();notify('This interruption was marked reviewed. Nothing was generated or resubmitted.');
    }));
    if(!activeStates.has(j.status))actions.append(button('Delete',async()=>{
      if(!confirm('Delete this saved record and its unshared files? This cannot be undone.'))return;
      await api('/api/jobs/'+j.id,{method:'DELETE'});cleanupHistoryCard(card);card.remove();await syncHistory();notify('Record deleted. Spending history is unchanged.');
    }));
    const cost=document.createElement('div');cost.className='fine';
    const provider=jobProvider(j),falEstimate=provider==='fal'&&j.estimatedUsd!=null;
    cost.textContent=customerMode?(j.estimatedUsd==null?'Draft / no credits used':j.status==='failed'?'Credits refunded after confirmed failure: '+wallet.jobCharge(j):j.status==='uncertain'?'Credits reserved, provider status unknown: '+wallet.jobCharge(j):'PV Lab charge: '+wallet.jobCharge(j)):j.settledUsd!=null?'Provider settled: '+money(j.settledUsd):falEstimate&&j.status==='failed'?'Lab estimate released: '+money(j.estimatedUsd)+' · provider billing not reported':falEstimate&&j.status==='uncertain'?'Lab estimate reserved: '+money(j.estimatedUsd)+' · provider status unknown':falEstimate?'Lab estimate reserved: '+money(j.estimatedUsd):j.estimatedUsd!=null?'Budget reserved: '+money(j.estimatedUsd):'Draft / no generation charge';
    body.append(meta,p,actions,cost);if(canReconcile){const help=document.createElement('p');help.className='fine';help.textContent='Find the original request; never submits a generation.';body.append(help);}if(j.settings.transferNotes?.length){const note=document.createElement('p');note.className='fine history-error';note.textContent=j.settings.transferNotes.join(' ');body.append(note);}
    if(j.error&&!contentRestricted){const error=document.createElement('p');error.className='fine history-error';error.textContent=j.error;body.append(error);}
    if(!ready&&j.sourceId){
      const refs=document.createElement('details');refs.className='history-source';const summary=document.createElement('summary');summary.textContent='Uploaded reference / not a result';
      const {figure,img}=historyImage(j.sourceId,'Original uploaded reference');previews.push(img);refs.append(summary,figure);body.append(refs);
    }
    if(j.providerTaskId){const task=document.createElement('div');task.className='fine history-task';task.textContent='Provider task: '+j.providerTaskId;body.append(task);}
    card.append(body);assetLibrary?.decorate(card,j);
    if(existing){cleanupHistoryCard(existing);existing.replaceWith(card);}else if(upsert)$('history').prepend(card);else $('history').append(card);
    for(const img of previews)observer.observe(img);
  }
  updateHistorySelectionUi();
  if(tool==='video'&&!assetLibrary?.active())restoreLatestVideoSelection();
}
let historyLoadId=0,historyLoading=false,historyHasPage=false,historyAutoLoadPaused=false,historyPaginationFrame=0;
const historyPageObserver=new IntersectionObserver(entries=>{
  if(entries.some(entry=>entry.isIntersecting)&&!historyAutoLoadPaused)void loadEarlierHistory();
},{rootMargin:'0px 0px 600px 0px'});
function updateHistoryPagination(){
  historyPageObserver.disconnect();cancelAnimationFrame(historyPaginationFrame);
  const more=$('more');
  more.hidden=!owner||!next;more.disabled=historyLoading;
  more.textContent=historyLoading?'Loading earlier work…':historyAutoLoadPaused?'Retry loading earlier work':'Load earlier work';
  more.setAttribute('aria-busy',String(historyLoading));
  if(owner&&next&&!historyLoading&&!historyAutoLoadPaused){
    // Recheck after the gallery has laid out the appended cards, including short
    // pages that still leave the end of the gallery inside the viewport.
    historyPaginationFrame=requestAnimationFrame(()=>historyPageObserver.observe(more));
  }
}
async function loadEarlierHistory(){
  if(!owner||!next||historyLoading)return;
  const rev=historyRevision;
  historyAutoLoadPaused=false;
  try{await loadHistory(true);}catch(error){
    if(owner&&rev===historyRevision&&error.name!=='AbortError')notify('Could not load earlier work. Tap Retry to try again.',true);
  }
}
async function loadHistory(append=false,incremental=false){
  if(!owner||(append&&(!next||historyLoading)))return;
  assetLibrary?.heading();
  if(!append&&!incremental){
    // Prevent the empty Image welcome and its atmospheric hero flashing while
    // the previous tool's cards are replaced by this account's saved History.
    const emptyImageGallery=$('image-gallery-empty');
    if(emptyImageGallery)emptyImageGallery.hidden=true;
    historySelected.clear();next=null;historyHasPage=false;historyAutoLoadPaused=false;videoJobCache.clear();imageDetailCache.clear();historyRevision++;observer.disconnect();galleryPreviewQueue.length=0;cardUrls.forEach(release);cardUrls.clear();$('history').replaceChildren();updateHistorySelectionUi();}
  renderPendingImageCards();
  const rev=historyRevision,loadId=++historyLoadId,q=assetLibrary?.query()||new URLSearchParams();
  if(append&&next){q.set('before',next.before);q.set('afterId',next.afterId);}
  historyLoading=true;updateHistoryPagination();
  try{
    const data=await api('/api/jobs?'+q);
    if(!owner||rev!==historyRevision||loadId!==historyLoadId)return;
    renderCards(data.jobs,{upsert:incremental});
    // A completed provider result may need local pixel-preserving compositing after a reload.
    for(const job of data.jobs||[])if(job?.status==='completed'&&job.settings?.precisionEdit&&!job.settings?.precisionFinalized)
      void precisionEditor.finalize(job).then(updated=>surfaceHistoryJob(updated)).catch(error=>{
        if(owner)console.warn('Precision Edit composite pending:',error.message);
      });
    if(!incremental||!historyHasPage)next=data.next;historyHasPage=true;
    $('emptyarchive').hidden=$('history').children.length>0;$('emptyarchive').textContent=assetLibrary?.active()?'No items here yet. Add work using Select to Add to folder, or mark a heart for Favorites.':tool==='upscale'?'No upscaled images yet':'No saved work yet.';
    if(data.concurrency)config.concurrency=data.concurrency;setActiveJobs(data.activeJobs||(data.active?[data.active]:[]));syncImageGalleryEmpty();if(tool==='video'&&!assetLibrary?.active())restoreLatestVideoSelection();
  }catch(error){
    if(append&&rev===historyRevision&&loadId===historyLoadId)historyAutoLoadPaused=true;
    throw error;
  }finally{
    if(loadId===historyLoadId){historyLoading=false;updateHistoryPagination();}
  }
}
async function syncHistory(){return loadHistory(false,true);}
function surfaceHistoryJob(job){
  if(!job||!owner||!historyJobVisible(job))return;
  if(assetLibrary?.active()){void syncHistory().catch(e=>notify(e.message,true));return;}
  renderCards([job],{upsert:true});$('emptyarchive').hidden=true;if(tool==='video'&&!assetLibrary?.active())restoreLatestVideoSelection();
}
let lastCustomerHistoryWake=0;
function refreshCustomerHistoryOnWake(){
  if(!owner||!customerMode||document.hidden||historyLoading)return;
  const now=Date.now();if(now-lastCustomerHistoryWake<10000)return;
  lastCustomerHistoryWake=now;
  void syncHistory().catch(error=>{if(owner&&customerMode)console.warn('History refresh failed:',error.message);});
}
window.addEventListener('focus',refreshCustomerHistoryOnWake);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshCustomerHistoryOnWake();});
function refreshHistorySoon(){
  const expectedEpoch=epoch;
  queueMicrotask(()=>syncHistory().catch(error=>{if(owner&&epoch===expectedEpoch)notify('History refresh delayed. Your queued job is safe. '+error.message,true);}));
}
$('refresh').onclick=()=>action(()=>loadHistory());$('more').onclick=loadEarlierHistory;
for(const id of ['refresh','history-select'])$(id)?.addEventListener('click',()=>{if(moodDiscoveryOpen)setMoodDiscoveryOpen(false);});
$('history-select').onclick=()=>setHistorySelectMode(true);
$('history-cancel-select').onclick=()=>setHistorySelectMode(false);
$('history-select-all').onclick=()=>{
  historySelected=new Set([...$('history').querySelectorAll('.card[data-deletable="true"]')].filter(card=>card.getClientRects().length).map(card=>card.dataset.job));
  for(const box of $('history').querySelectorAll('.history-select-box input'))box.checked=true;
  updateHistorySelectionUi();
};
$('history-delete-selected').onclick=()=>action(async()=>{
  const ids=[...historySelected];if(!ids.length)return;
  if(!confirm('Delete '+ids.length+' selected History item'+(ids.length===1?'':'s')+' and their unshared files? This cannot be undone.'))return;
  const result=await api('/api/jobs/bulk-delete',{method:'POST',body:{ids}});
  setHistorySelectMode(false);await loadHistory();if(assetLibrary?.active())await assetLibrary.load();notify((result.deleted||ids.length)+' History item'+((result.deleted||ids.length)===1?'':'s')+' deleted. Spending history is unchanged.');
});
function finishLabBoot(){window.__pvLabFinishBoot?.();document.documentElement.classList.remove('pv-studio-route-pending');}
function lock(){const pvStrip=$('pv-video-detail-reference-strip');if(pvStrip){pvStrip.replaceChildren();pvStrip.dataset.key='';}const pvRefPanel=$('pv-video-detail-references');if(pvRefPanel)pvRefPanel.hidden=true;sceneLibrary?.reset();setMoodDiscoveryOpen(false);customerPriceIntentPending=false;customerImagePricing?.reset();packStudio.forceClose();newCustomerGrant=null;hideFirstCreditToast();resetWelcomeStart();studioAccount.update();moodReferences.clear();void deviceMediaCache.signOut();document.documentElement.classList.remove('pv-native-route-pending');retouchActive=false;history.scrollRestoration='auto';precisionEditor.reset();$('app').classList.remove('retouch-studio-active');customerMode=false;customerVideoProfile={};customerCreditBalance=0;customerGenerationReady=false;customerTrialGenerationPaused=false;customerBillingReady=false;customerImagePricing?.reset();wallet.connect({customer:false});$('studio-invite-friends').hidden=true;fashionController?.lock();setFashionActive(false);assetLibrary?.reset();hf.reset();epoch++;imageSubmissionPending=false;pendingImageCards.clear();moodUI.clear(true);clearAssetCache();for(const p of composerPortraits.values())p.then(url=>{if(url)release(url);});composerPortraits.clear();composerLibraryKey='';composerPortraitKey='';closeComposerLibrary();historySelected.clear();historySelectMode=false;clearSoulProPackPreview();soulProIdentity={configured:false,count:0,refs:[]};workingCopies.clear();fastImageHandoff.clear();autoPreview=null;downloadUrls.forEach(release);downloadUrls.clear();myMoods.reset();owner=false;ownerAccount=false;updateHistoryPagination();userId='';soul.reset();historyRevision++;galleryPreviewQueue.length=0;clearTimeout(timer);timer=null;activeJob=null;activeJobs=[];polling=false;requestControllers.forEach(c=>c.abort());requestControllers.clear();observer.disconnect();cardUrls.forEach(release);cardUrls.clear();clearMedia();$('prompt').value='';$('history').replaceChildren();$('app').hidden=true;$('gate').hidden=false;$('connection').hidden=true;$('logout').hidden=true;$('api-key').value='';for(const d of document.querySelectorAll('dialog[open]'))d.close();currentQuote=null;config={};packs=[];$('pack-select').replaceChildren(new Option('Choose a saved pack',''));closeImageModelMenu();toggleImageSettings(false);$('app').classList.remove('image-studio-active');imageStudio.hidden=true;imageDetailCache.clear();releaseImageDetailSource();videoJobCache.clear();selectedVideoJob=null;effectViewOpen=false;activeVideoEffect=null;closeEffectPicker();syncVideoStudioMode();refreshEffectsView();$('pv-guest-closed-state').hidden=true;finishLabBoot();}
const pricingOverlay=createPricingOverlay({
  buy:(sku,report)=>wallet.buyPlan(sku,report),
  getAccount:()=>({signedIn:owner,customer:customerMode}),
  onSignIn:()=>$('signin')?.click()
});
const wallet=createCustomerWallet({
  api,notify,onBalance:value=>{customerCreditBalance=Number(value)||0;studioAccount.updateBalance(value);},
  onClosed:async()=>{lock();await clerk.signOut();},
  openPricing:options=>pricingOverlay.open(options)
});
customerImagePricing=createCustomerImagePricing({snapshot:imageCreditQuoteSnapshot,quote:fetchCustomerImagePrice,changed:()=>update()});
async function sync(){if(syncing)return;syncing=true;try{if(!clerk.isSignedIn){lock();$('auth-status').textContent='';$('signin').hidden=false;$('signin').disabled=false;$('auth-retry').hidden=true;return;}if(owner&&userId===clerk.user.id)return;if(owner&&userId!==clerk.user.id)lock();
  // Preserve the loading screen until the requested Studio destination is ready.
  // This also covers a sign-in without a browser reload.
  document.documentElement.classList.add('pv-studio-boot-lock');
  document.documentElement.classList.add('pv-studio-route-pending');
  document.body.classList.remove('lab-ready');
  window.__pvLabBootStage?.('Verifying your account');
  const data=await api('/api/session');
  // Preserve the user's requested destination before any config reconciliation.
  const requestedRoute=studioRoute();
  window.__pvLabBootStage?.('Preparing your workspace');owner=true;ownerAccount=data.owner===true&&data.customer!==true;customerMode=!!data.customer;customerVideoProfile=customerMode?data:{};customerGenerationReady=!!data.generationReady;customerTrialGenerationPaused=!!data.trialGenerationPaused;customerBillingReady=!!data.billingReady;userId=clerk.user.id;void deviceMediaCache.select(userId);wallet.connect(data);studioAccount.update({signed:true,user:clerk.user,profile:data});hf.setCustomerPricing(customerMode?{trainingCredits:data.soulIdTrainingCredits,imageCredits:data.soul2ImageCredits}:null);if(customerMode)void claimReferral(code=>api('/api/customer/referrals/claim',{method:'POST',body:{code}}));applyConfig(data.config);refreshEffectsView();$('identity').textContent=customerMode?'My workspace':'Owner workspace';if(window.__PV_LAB_NATIVE__===1&&!window.__pvNativeRouteResolved)document.documentElement.classList.add('pv-native-route-pending');$('gate').hidden=true;$('app').hidden=false;$('signin').hidden=true;$('signin').disabled=true;showFirstCreditToast(data);$('connection').hidden=customerMode;$('logout').hidden=false;
    if(data.accountClosed){
      // The old Clerk identity can remain signed in while deletion is queued.
      // Never show a purchasable wallet or a fake "sign-in is loading" state.
      await deviceMediaCache.signOut();$('studio-invite-friends').hidden=true;
      $('app').hidden=true;$('gate').hidden=false;$('signin').disabled=true;
      $('lab-wallet-toggle').hidden=true;$('lab-add-credits').hidden=true;
      $('pv-guest-closed-state').hidden=false;
      $('auth-status').textContent='This previous PV LAB account is closed. Sign out before registering a new account. Deletion may still be processing; no payments or generations can be made from this identity.';
      return;
    }
    if(!customerMode&&new URLSearchParams(location.search).get('settings')==='connection')connection();
    // Do not reveal the former empty-gallery layout while private History is
    // still resolving. The final first-image cards must already be selected
    // before the loading overlay disappears.
    $('emptyarchive').textContent='Loading your images…';
    $('history').setAttribute('aria-busy','true');
    // Resolve direct Fashion, Retouch, Assets, or Mood entries before revealing
    // the application. Never flash the Image editor in place of another tool.
    const restoreEffects=new URLSearchParams(location.search).get('effects')==='1';
    try{await restoreStudioEntry(requestedRoute);}catch(error){
      notify('Requested '+requestedRoute+' workspace could not open. Your work is still available. '+error.message,true);
      // A loading error is not permission to send the visitor to Image.
      if(owner&&['image','video','upscale'].includes(requestedRoute))setTool(requestedRoute);
    }
    if(restoreEffects&&ownerAccount&&tool==='video')openEffectsView({scroll:false});
    if(customerMode&&new URLSearchParams(location.search).get('referrals')==='1')wallet.openReferrals();
    // Private History can be slow, but it must not lock an already verified Studio.
    // Results still arrive through loadHistory and are checked against the session epoch.
    const historyEpoch=epoch;
    let historyResolved=false;
    window.__pvLabBootStage?.('Loading your saved work');
    const historyReady=loadHistory().catch(error=>{
      if(owner&&epoch===historyEpoch)notify('History could not refresh. Your saved work is unchanged. Try Refresh or Assets. '+error.message,true);
    }).finally(()=>{
      if(epoch!==historyEpoch)return;
      historyResolved=true;
      $('history').removeAttribute('aria-busy');
      if(owner&&userId===clerk?.user?.id&&document.body.classList.contains('lab-ready'))showWelcomeStart(data);
    });
    // Non-essential account resources no longer delay the first visible frame.
    void Promise.all([loadPacks().catch(error=>console.warn('Photo packs could not load:',error)),
      soul.load().catch(error=>console.warn('Saved characters could not load:',error)),
      loadSoulProIdentity().catch(error=>console.warn('Saved identity could not load:',error))]);
    // A slow library request must not leave a signed-in customer on the splash.
    // Until the verified History arrives, keep an explicit loading placeholder.
    await Promise.race([historyReady,new Promise(resolve=>setTimeout(resolve,5000))]);
    if(!historyResolved&&owner&&epoch===historyEpoch){
      $('emptyarchive').hidden=false;
      $('emptyarchive').textContent='Loading your saved work…';
      const galleryEmpty=$('image-gallery-empty');if(galleryEmpty)galleryEmpty.hidden=true;
    }
    void myMoods.refresh().catch(()=>{/* Personal boards must not block image Studio sign-in. */});
    syncVideoStudioMode();
    if(historyResolved)showWelcomeStart(data);
    restoreGuestImageDraft();
    window.__pvLabBootStage?.('Workspace ready');
    finishLabBoot();
    void pricingOverlay.resumeAfterSignIn().catch(()=>{});
    if(!fashionActive&&fashionController)void fashionController.sync();if(customerMode&&new URLSearchParams(location.search).get('billing')==='success'){notify('Checkout returned. Credits appear when Stripe confirms payment.');void wallet.refresh();}}catch(e){
  const stillSignedIn=!!clerk?.isSignedIn;
  // A new V2 Clerk identity is not yet a funded PV LAB wallet. Only redirect
  // after the authenticated migration endpoint confirms the identity is unlinked.
  // Do not guess from email or treat a temporary /api/session failure as a new user.
  const migrationCheckNeeded=/set up your new PV LAB account|unlinked|not linked|migration|connect existing account/i.test(String(e?.message||''));
  // Network timeouts and backend errors are NOT evidence of an unlinked account.
  // Avoid an extra migration probe that can hide the real failure behind the splash.
  if(stillSignedIn&&!owner&&migrationCheckNeeded&&['pvlab.studio','www.pvlab.studio','pvlab-studio.pages.dev'].includes(location.hostname.toLowerCase())){
    try{
      const migrationController=new AbortController();
      const migrationTimer=setTimeout(()=>migrationController.abort(),6000);
      let response;
      try{response=await sessionRequest('/api/migration/status',{cache:'no-store',credentials:'omit',signal:migrationController.signal});}
      finally{clearTimeout(migrationTimer);}
      if(response.ok){
        const migration=await response.json();
        if(migration?.linked===false){
          const next=location.pathname+location.search+location.hash;
          location.replace('./connect-account.html?next='+encodeURIComponent(next));
          return;
        }
      }
    }catch{}
  }
  lock();$('auth-status').textContent=stillSignedIn?'Studio setup could not finish. '+e.message+' Reload to retry.':e.message;$('signin').hidden=stillSignedIn;$('signin').disabled=stillSignedIn;$('auth-retry').hidden=!stillSignedIn;$('logout').hidden=!stillSignedIn;studioAccount.update({signed:stillSignedIn,user:clerk?.user});}finally{syncing=false;finishLabBoot();if(owner&&window.__PV_LAB_NATIVE__===1){
      window.ReactNativeWebView?.postMessage(JSON.stringify({type:'PV_LAB_READY'}));
      // Older shells may reload without sending a destination command.
      // Release the restored workspace rather than leave an endless loader.
      setTimeout(()=>document.documentElement.classList.remove('pv-native-route-pending'),12000);
    }}}
$('studio-invite-friends').onclick=()=>location.assign('./account.html#referrals');
$('auth-retry').onclick=()=>location.reload();$('signin').onclick=()=>clerk?.openSignIn();$('logout').onclick=async()=>{lock();await clerk?.signOut();$('auth-status').textContent='Signed out. Your archive remains private.';};
$('pv-guest-closed-signout').onclick=()=>$('logout').click();
assetLibrary=createAssetLibrary({api,notify,archive,app:$('app'),selected:()=>historySelected,selectMode:setHistorySelectMode,reload:()=>loadHistory(),restoreStudio:()=>{syncImageStudioMode();syncVideoStudioMode();syncStudioNav();},beforeOpen:()=>{++previewRevision;$('video').pause();if(retouchActive)leaveRetouch();setFashionActive(false);syncStudioRoute('assets');},kind:()=>tool==='upscale'?'upscale':tool==='video'?'video':'image',ready:()=>owner});
setTool(['fashion','assets','retouch'].includes(studioRoute())?'image':studioRoute());
// Commands from the trusted app shell reuse the same editor and never submit jobs.
if(window.__PV_LAB_NATIVE__===1&&window.ReactNativeWebView){
  window.__PV_LAB_COMMAND__=async command=>{
    if(!owner)return;
    try{
      if(command?.action==='gallery'){await assetLibrary.open();return;}
      // Ready for a fifth native tab. Retouch opens the existing workspace;
      // the native shell still owns the bottom navigation and selected icon.
      if(command?.action==='retouch'){await openRetouch({push:false,autofill:true});return;}
      if(command?.action==='credits'){if(customerMode)$('lab-wallet-toggle').click();else notify('Owner workspace. Provider costs appear before generation.');return;}
      if(command?.action==='create'||command?.action==='mood'){
        assetLibrary.close();if(tool!=='image'||retouchActive||fashionActive)setTool('image');else{syncStudioRoute('image');syncImageStudioMode();syncStudioNav();}
        if(command.action==='mood'){
          if(command.moodboard){await myMoods.refresh();const board=myMoods.find(command.moodboard);if(!board)throw Error('This Mood is unavailable.');moodUI.restore({moodId:'custom',customMoodBoardId:board.id,moodIntensity:board.intensity});}
          else {const mood=moodById(command.mood);if(!mood)throw Error('This Mood is unavailable.');moodUI.restore({moodId:mood.id,moodIntensity:mood.defaultIntensity||70});}
          if(imageEngine==='seedream')$('resolution').value='2k';
          update();
        }
        if(command.handoff){
          const packet=await takeMoodHandoff(command.handoff);
          if(packet.file)await addReferences([packet.file]);
          if(packet.prompt)$('prompt').value=packet.prompt;
          update();
        }
        window.scrollTo({top:0,behavior:'smooth'});
      }
    }catch(e){notify(e.message,true);}
    finally{window.__pvNativeRouteResolved=true;document.documentElement.classList.remove('pv-native-route-pending');}
  };
}

window.__pvLabBootStage?.('Connecting your account');
try{clerk=await loadLabAccount();clerk.addListener(()=>void sync());await sync();}catch{window.__pvLabBootStage?.('Account connection failed');document.documentElement.classList.remove('pv-native-route-pending');$('gate').hidden=false;$('auth-retry').hidden=false;$('signin').disabled=true;$('auth-status').textContent='Sign-in could not load. Check your connection and reload the page.';finishLabBoot();}






// Soul composer: independent scene and optional character, with visible output controls.
function syncSoulBar(){
  const active=isSoul2();imageComposer.classList.toggle('is-pv-soul',active);imageComposer.classList.toggle('is-seedream',tool==='image'&&['seedream','seedreamlite','flash','kling','qwen3','krea3','zspicy','gemini','gemini21'].includes(imageEngine));imageComposer.classList.toggle('has-soul-source',active&&!!sourceUrl);
  document.querySelectorAll('.hf-bar-control').forEach(el=>el.hidden=!active);
  $('hf-bar-source').hidden=!active||!!sourceUrl;
  if(!active)return;
  $('hf-bar-resolution').value=$('hf-resolution').value;
  const ratios=['16:9','9:16','4:3','3:4','1:1','2:3','3:2'];
  const ratio=sourceWidth&&sourceHeight?ratios.reduce((a,b)=>{const d=r=>{const [w,h]=r.split(':').map(Number);return Math.abs(Math.log(w/h/(sourceWidth/sourceHeight)));};return d(b)<d(a)?b:a;},'16:9'):'16:9';
  $('hf-bar-ratio').options[0].textContent=ratio;
  const img=$('hf-bar-source-photo');img.hidden=!sourceUrl;
  if(sourceUrl&&img.getAttribute('src')!==sourceUrl)img.src=sourceUrl;
  if(!sourceUrl)img.removeAttribute('src');
  $('hf-bar-source').classList.toggle('has-photo',!!sourceUrl);
  $('hf-bar-source').disabled=busy;$('hf-bar-ratio').disabled=busy;$('hf-bar-resolution').disabled=busy;
}
$('hf-bar-source').onclick=()=>{if(!busy)$('soul-base-image').click();};
$('hf-bar-ratio').onchange=()=>{soulRatioExplicit=$('hf-bar-ratio').value!=='source';resultSettings=null;update();};
$('hf-bar-resolution').onchange=()=>{$('hf-resolution').value=$('hf-bar-resolution').value;resultSettings=null;update();};
window.addEventListener('resize',()=>{if(!imageComposer.hidden)fitImageComposerPrompt();});
window.visualViewport?.addEventListener('resize',()=>{if(!imageComposer.hidden)fitImageComposerPrompt();});

// The editor stays interactive: a paid submission only reads this captured request.
async function submitImageSnapshot(){
  if(busy||imageSubmissionPending||customerPriceIntentPending||!owner||!hasInput()||submissionBlocked()||fastImageHandoff.has(currentImageSubmissionKey()))return;
  if(customerMode&&customerBillingReady&&window.__PV_LAB_NATIVE__!==1&&
     (customerCreditBalance<=0||customerTrialGenerationPaused&&!customerGenerationReady)){
    void pricingOverlay.open();return;
  }
  if(usesReferenceGuidance()){
    const advisories=referenceRoleAdvisories(referenceRoles());
    if(advisories.length&&!confirm('Check these reference roles before spending credits:\n\n'+advisories.join('\n\n')+'\n\nGenerate anyway?'))return;
  }
  const previousNanoUnconfirmed=customerMode&&currentProvider()==='gemini'&&activeJobs.some(j=>j.status==='uncertain'&&jobProvider(j)==='gemini');
  // A fresh paid request is NEVER a retry of an unknown provider transaction.
  // Confirm this *before* consuming the customer's current price snapshot.
  if(previousNanoUnconfirmed&&!confirm('A previous Nano Banana Pro result could not be confirmed. Its credits remain reserved for review. This starts a NEW image and uses additional credits. No earlier request will be retried or cancelled. Continue?'))return;
  // The preview quote remains authoritative. If it is still being prepared,
  // one explicit Generate click immediately waits for/reuses that exact quote
  // and submits once. No additional click or speculative customer price.
  const snapshot=customerMode?imageCreditQuoteSnapshot():null;
  let customerPriced=customerMode?customerImagePricing?.consume(snapshot?.key):null;
  if(customerMode&&!customerPriced){
    if(!customerGenerationReady||!snapshot?.key||!customerImageProviderReady())return;
    customerPriceIntentPending=true;update();
    try{
      await customerImagePricing.readyForClick(snapshot.key);
      customerPriced=customerImagePricing.consume(snapshot.key);
      if(!customerPriced)throw new Error('The live image price expired. Nothing was charged.');
      $('generate').dataset.credits=(customerPriced.kind==='server-estimate'?'~':'')+
        customerPriced.credits.toLocaleString()+' credits';
    }catch(error){
      customerPriceIntentPending=false;
      if(owner)notify('Image price could not be confirmed. '+error.message,true);
      update();return;
    }
  }
  const sessionEpoch=epoch,provider=currentProvider();
  let selected=structuredClone(settings());
  const disableAutoMoodReferences=inspirationMoodId!==null&&selected.moodId===inspirationMoodId;
  const requested=Math.max(1,Math.min(imageProcessing==='batch'?20:4,Number($('image-count').value)||1));
  const selectedPose=poseMapSourceId,selectedBase=file,selectedSourceId=sourceId;
  const sourceMode=imageEngine==='soulpro'||isReinterpret();
  const chosen=sourceMode?(selectedBase?[{file:selectedBase,id:selectedSourceId,width:sourceWidth,height:sourceHeight}]:[]):imageEngine==='soul'?[]:imageInputReferences().map(ref=>({file:ref.file,id:ref.id,width:ref.width,height:ref.height,ref}));
  const fastEligible=!customerMode&&selected.engine==='seedream'&&requested===1&&provider==='spicy';
  const requestKey=fastEligible?currentImageSubmissionKey(selected,requested):'';
  const check=()=>{if(!owner||epoch!==sessionEpoch)throw new Error('Session changed. No further requests submitted.');};
  let feedback=null,dispatched=false,detached=false,fastTicket=null;
  const record=job=>{
    if(!job)return;
    check();dispatched=false;
    if(moodDiscoveryOpen)setMoodDiscoveryOpen(false);
    // The real server queue replaces the local preparation reservation only
    // when the provider-bound job has been acknowledged.
    if(fastTicket){fastImageHandoff.release(fastTicket);fastTicket=null;}
    feedback?.accept();
    if(activeStates.has(job.status))setActive(job);
    surfaceHistoryJob(job);refreshHistorySoon();
    if(detached)update();
  };
  const send=async(path,body,detail='Waiting for the provider to confirm.')=>{check();feedback?.phase('Submitting',detail);dispatched=true;return api(path,{method:'POST',body});};
  customerPriceIntentPending=false;
  imageSubmissionPending=true;imageSubmissionStage='Preparing…';update();
  let submitted=0;
  try{
    if(provider==='spicy'&&!config.enabled){connection();return;}
    if(['flash','kling','krea3'].includes(selected.engine)&&chosen.length>(selected.engine==='flash'?10:selected.engine==='krea3'?4:1))throw new Error(selected.engine==='kling'?'Kling V3 accepts one base image. Remove extra references or choose Flash.':selected.engine==='krea3'?'Krea 3 accepts up to four photographs. Remove extra references.':'Flash accepts up to 10 references.');
    if(provider==='gemini'&&!config.geminiEnabled)throw new Error('Gemini API is not connected.');
    if(provider==='fal'&&!config.falEnabled)throw new Error('FAL API is not connected.');
    if(provider==='higgsfield'&&!config.higgsfieldEnabled)throw new Error('Higgsfield API is not connected.');
    if(provider==='spicy'){
      const used=activeJobs.filter(j=>slotStates.has(j.status)&&j.settings?.type==='image'&&jobProvider(j)==='spicy').length+fastImageHandoff.slots('spicy');
      if(requested>Math.max(0,limitFor('image')-used))throw new Error('Not enough available image slots for this batch.');
    }
    const modelInputError=modelImageInputIssue(selected.engine,chosen,{count:requested,processing:selected.processing});
    if(modelInputError)throw new Error(modelInputError);
    const ratioParts=String(selected.aspectRatio||'').split(':').map(Number);
    const inputRatio=sourceMode?sourceWidth/sourceHeight:chosen[0]?.ref?.width/chosen[0]?.ref?.height;
    const ratio=ratioParts.length===2&&ratioParts.every(n=>n>0)?ratioParts[0]/ratioParts[1]:inputRatio>0?inputRatio:16/9;
    feedback=beginImageFeedback(['higgsfield','fal'].includes(provider)&&!['flash','kling','krea3'].includes(selected.engine)?1:requested,selected,ratio);
    if(fastEligible){
      fastTicket=fastImageHandoff.reserve(requestKey,provider,requested);
      if(!fastTicket)throw new Error('This exact request is already preparing. No duplicate generation submitted.');
      detached=true;feedback.detachButton();
      // The frozen request proceeds asynchronously, but the editor can now
      // accept a different prompt. Preparing remains visible in History.
      imageSubmissionPending=false;imageSubmissionStage='Sending…';update();
    }
    // Upload up to three original references at once, retaining snapshot order
    // and successful IDs for reuse. No paid call starts before every upload succeeds.
    const originals=new Array(chosen.length),missing=chosen.filter(item=>!item.id).length;
    let cursor=0,uploaded=0,uploadError=null;
    if(missing)feedback.phase('Uploading references','0 / '+missing);
    const uploadNext=async()=>{
      while(!uploadError&&cursor<chosen.length){
        const index=cursor++,item=chosen[index];
        try{
          check();const id=item.id||await uploadAsset(item.file);check();originals[index]={id,file:item.file,width:item.width,height:item.height};
          if(item.ref&&references.includes(item.ref))item.ref.id=id;
          if(sourceMode&&file===selectedBase)sourceId=id;
          if(!item.id){uploaded++;feedback.phase('Uploading references',uploaded+' / '+missing);}
        }catch(error){uploadError=error;}
      }
    };
    await Promise.all(Array.from({length:Math.min(3,chosen.length)},uploadNext));
    if(uploadError)throw uploadError;
    check();
    const curated=disableAutoMoodReferences
      ?{settings:selected,references:[]}
      :await moodReferences.prepare(selected,{sessionKey:sessionEpoch,check});
    selected=curated.settings;originals.push(...curated.references);
    let inputs={sourceId:sourceMode?originals[0]?.id||null:null,lastSourceId:null,referenceSourceIds:sourceMode?[]:originals.map(r=>r.id)};
    if(selected.engine==='kling'){
      for(let i=0;i<requested;i++){
        const data=await send('/api/image-models/generate',{...inputs,settings:selected});
        if(!data.job)throw new Error('No generation record returned. Check History before retrying.');
        record(data.job);submitted++;
        if(data.job.error)throw new Error(data.job.error);
      }
    }else if(provider==='higgsfield'){
      // Price checking does not submit a paid job. Keep the compose settings frozen in this quote.
      feedback.phase('Checking live price','No image has been generated or charged.');
      const cached=customerPriced?.kind==='bound'&&customerPriced.provider==='higgsfield'?customerPriced.quotes[0]:null;
      const q=cached||await api('/api/higgsfield/quote',{method:'POST',body:{...inputs,settings:selected}});
      check();
      if(!q?.id||q.provider!=='Higgsfield'||q.settings?.provider!=='higgsfield'||(q.settings.characterId||'')!==(selected.characterId||'')||q.sourceId!==inputs.sourceId||!Number.isFinite(q.estimatedUsd)||q.estimatedUsd<=0||!Number.isFinite(q.expiresAt)||q.expiresAt<=Date.now())throw new Error('Higgsfield price review did not match your selected image and identity. Nothing generated.');
      if(customerMode&&(!Number.isSafeInteger(q.creditCost)||q.creditCost<1))throw new Error('No verified PV LAB credit price was returned for Soul 2. Nothing submitted.');
      feedback.finish();feedback=null;
      currentQuote=q;
      $('quote-settings').textContent='PV Soul 2 / '+(q.settings.characterName||'NO SOUL ID')+' / '+q.settings.resolution.toUpperCase()+' / '+q.settings.aspectRatio+' / '+(q.sourceId?'Base photo':'Text to image');
      $('confirm-generation').textContent='Confirm & generate';
      $('quote-price').textContent=customerMode?q.creditCost.toLocaleString()+' credits':money(q.estimatedUsd);
      $('quote-limit').textContent=customerMode?'Soul 2 launch rate: '+q.creditCost.toLocaleString()+' credits. The live API quote was checked; no generation or credit charge yet.':'Live Higgsfield estimate: '+money(q.estimatedUsd)+' USD. Actual provider billing may differ. No automatic retries.';
      $('quote-expiry').textContent='Valid until '+new Date(q.expiresAt).toLocaleTimeString()+'. One image. No generation or charge yet.';
      $('quote-notice').textContent=q.notice||'';$('confirm-generation').disabled=false;$('quote-dialog').showModal();
      return;
    }else if(provider==='fal'){
      const path=selected.engine==='krea3'?'/api/fal/krea-3':selected.engine==='soul'&&selected.trainer==='krea2'?'/api/fal/krea':selected.engine==='soulpro'?'/api/fal/soul-pro':'/api/fal/controlled-pose';
      for(let i=0;i<(selected.engine==='krea3'?requested:1);i++){
        const data=await send(path,{...inputs,settings:selected,...(selected.engine==='fal'?{poseMapSourceId:selectedPose}:{})});
        if(!data.job)throw new Error('No generation record returned. Check History before retrying.');
        record(data.job);submitted++;if(data.job.error)throw new Error(data.job.error);
      }
    }else if(provider==='gemini'){
      const batch=selected.processing==='batch';
      for(let i=0;i<(batch?1:requested);i++){
        const data=await send('/api/gemini/jobs',{...inputs,count:batch?requested:1,settings:selected,confirmNewCharge:previousNanoUnconfirmed});
        if(!data.jobs?.length)throw new Error('No generation record returned. Check History before retrying.');
        for(const job of data.jobs){record(job);submitted++;}
        if(data.jobs.some(job=>['failed','uncertain','resolved'].includes(job.status)))break;
      }
    }else{
      const bound=customerPriced?.kind==='bound'&&customerPriced.provider==='spicy'&&customerPriced.count===requested?customerPriced:null;
      if(bound){
        if(JSON.stringify(bound.inputs.referenceSourceIds)!==JSON.stringify(inputs.referenceSourceIds)||
           (bound.inputs.sourceId||null)!==(inputs.sourceId||null))
          throw new Error('References changed after the price check. Nothing submitted.');
        inputs=bound.inputs;
      }else inputs=await prepareQuoteInputs(inputs,{originals,engine:selected.engine,detached,onProgress:(...args)=>feedback.phase(...args)});
      if(!inputs)return;
      const batchSeedream=['seedream','flash'].includes(selected.engine)&&requested>1;
      const refCount=inputs.referenceSourceIds?.length||0;
      const pricingTitle=refCount?'Preparing provider files':'Checking price';
      const priceDetail=refCount?refCount+' references · '+requested+' price'+(requested===1?'':'s')+' · no paid generation yet':requested+' live price'+(requested===1?'':'s')+' · no paid generation yet';
      feedback.phase(pricingTitle,priceDetail);
      let pricingTimer=null;const pricingStarted=Date.now();
      const quotes=[];
      try{
        if(bound)quotes.push(...bound.quotes);
        else{
        pricingTimer=setInterval(()=>feedback?.phase(pricingTitle,priceDetail+' · '+Math.floor((Date.now()-pricingStarted)/1000)+'s'),2500);
        if(batchSeedream){
          // A single request stages the reference bytes once and returns independently
          // bound prices for each image. The provider still receives unique paid jobs.
          const priced=await api('/api/quotes',{method:'POST',body:{...inputs,settings:selected,count:requested}});
          if(!Array.isArray(priced?.quotes)||priced.quotes.length!==requested)throw new Error('Seedream did not return the complete set of independent prices. Nothing submitted.');
          quotes.push(...priced.quotes);
        }else{
          for(let i=0;i<requested;i++){
            check();const q=await api('/api/quotes',{method:'POST',body:{...inputs,settings:selected}});
            quotes.push(q);
          }
        }
        }
      }finally{clearInterval(pricingTimer);}
      check();
      if(new Set(quotes.map(q=>q?.id)).size!==quotes.length)throw new Error('Price identifiers were duplicated. Nothing submitted.');
      for(const q of quotes){
        if(!q||q.settings?.type!=='image'||q.settings.mode!==selected.mode||selected.engine==='soul'&&(q.settings.engine!=='soul'||q.settings.characterId!==selected.characterId||q.settings.preset!==selected.preset)||!Number.isFinite(q.maxUsd)||q.maxUsd<0)
          throw new Error('Unexpected image quote. No images submitted.');
      }
      for(let i=0;i<quotes.length;i++){
        const q=quotes[i];
        check();if(!Number.isFinite(q.expiresAt)||Date.now()>=q.expiresAt)throw new Error('Quote expired. Nothing further submitted.');
        const data=await send('/api/jobs',{quoteId:q.id,confirm:true},'Sending image '+(i+1)+' of '+quotes.length+' to the provider.');
        if(!data.job)throw new Error('No generation record returned. Check History before retrying.');
        record(data.job);submitted++;
        if(['failed','uncertain','resolved'].includes(data.job.status)){notify(data.job.error||'Request needs review in History.',true);return;}
      }
    }
    check();notify(submitted+' image request'+(submitted===1?'':'s')+' recorded. Results appear in History.');
  }catch(e){if(owner&&epoch===sessionEpoch){feedback?.fail(e,dispatched);notify((submitted?submitted+' request(s) recorded. ':'')+(e.name==='AbortError'?'Request interrupted. Check History before retrying.':e.message),true);if(dispatched)refreshHistorySoon();}}
  finally{
    feedback?.finish();
    if(fastTicket)fastImageHandoff.release(fastTicket);
    if(epoch===sessionEpoch){
      // Detached calls must not reset the input lock of a newer non-detached
      // submission that may be using the same editor.
      if(!detached){imageSubmissionPending=false;imageSubmissionStage='Sending…';}
      update();
    }
  }
}



