import {createAssetLibrary} from './assets.js?v=20261010-navigation-media1';
import {createCustomerWallet} from './customer-wallet.js?v=20261010-referrals3';
import {createCustomerImagePricing} from './customer-image-pricing.js?v=20261010-customer-credits1';
import {customerImagePriceKey,pricedBoundQuotes,imageAutoRatio} from './image-credit-preview.js?v=20261010-customer-credits1';
import {captureReferralCode,claimReferral} from './referral-capture.js?v=20261010-referrals1';
captureReferralCode();
import {createSoul2UI} from './higgsfield-ui.js?v=20261010-soul-price1';
import {VIDEO_MODELS,engineFor,videoLabel} from './video-models.js?v=20261009-extend1';
import {REFERENCE_ROLES,REFERENCE_TARGETS,normalizeReferenceLabel,compileImagePrompt,referenceGuidanceError,canUseReferenceGuidance} from './reference-guidance.js?v=20261009-flash-kling';
import {createMoodSelector,moodById,userFacingImagePrompt,imageHistoryCaption} from './moods.js?v=20261010-80s-photo1';
import {createMediaReferences} from './media-references.js?v=20261009-extend2';
import { createSessionRequest } from './session-request.js?v=20260927-auth1';
import { createSoulController } from './soul.js?v=20261001-presets2';
import { PROVIDER_IMAGE_LIMIT, UPSCALE_PIXELS, imageDimensions, providerWorkingCopy, wanUltrawideWorkingCopy, imagePreview, cancelImagePreparation } from './image-tools.js?v=20260930-soul-v02';
// General-purpose private image-to-video workspace. Credentials never enter browser storage.
const API='https://parallel-vision-lab.parallelvision.workers.dev';
const $=id=>document.getElementById(id), activeStates=new Set(['submitting','queued','running','saving','uncertain']), slotStates=new Set(['submitting','queued','running','uncertain']);
let clerk, owner=false, customerMode=false, customerGenerationReady=false, customerImagePricing=null, imageRatioExplicit=false, soulRatioExplicit=false, userId='', epoch=0, syncing=false, config={}, file=null, sourceId=null, imageRevision=0, busy=false;
let imageSubmissionPending=false,imageSubmissionStage='Sending…';
const pendingImageCards=new Map();
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
  return {
    phase(title,detail=''){
      for(const id of ids){const entry=pendingImageCards.get(id);if(entry){entry.title=title;entry.detail=detail;}}
      if(imageSubmissionPending){
        imageSubmissionStage=title==='Uploading references'?'Uploading '+detail:title==='Preparing provider files'?'Preparing files…':title==='Checking price'?'Checking price…':title==='Optimizing references'?'Optimizing…':title==='Submitting'?'Submitting…':'Sending…';
        const button=$('image-composer-generate');if(button)button.textContent=imageSubmissionStage;
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
let fashionActive=false,fashionController=null,fashionMount=null;
function studioRoute(){const value=new URLSearchParams(location.search).get('tool');return ['image','video','upscale','assets','fashion'].includes(value)?value:'image';}
function syncStudioRoute(value){
  if(!owner)return;
  const url=new URL(location.href);
  if(url.searchParams.get('tool')===value)return;
  url.searchParams.set('tool',value);
  history.replaceState(history.state,'',url);
}
async function restoreStudioEntry(){
  const route=studioRoute();
  if(route==='assets')await assetLibrary.open();
  else if(route==='fashion')await openFashionStudio();
  else syncStudioRoute(tool);
}
let sourceUrl=null, lastFile=null, lastSourceId=null, lastUrl=null, references=[], mode='start';
let engine='seedance', imageEngine='seedream', imageProcessing='normal', soulProModel='soul2', soulProQuality='medium', soulProIdentity={configured:false,count:0,refs:[]}, soulProPackSelection=[], soulProPackUrls=[], poseMapSourceId=null, repairTarget=null, repairImage=null, repairMaskCanvas=null, repairMaskDirty=false;
let tool='image', packs=[],resultKind='video',resultExt='mp4';
let resultUrl=null, resultId=null, resultSettings=null, previewRevision=0, autoPreview=null, currentQuote=null, next=null, activeJob=null, timer=null, historyRevision=0;
let activeJobs=[], polling=false, historySelectMode=false, historySelected=new Set();
const downloadUrls=new Set();
const workingCopies=new Map();
let upscaleQuote=null,upscaleQuoteNeedsCheck=false,upscaleQuoteTimer=null,upscalePriceMessage='',upscaleManualReviewRequired=false,upscaleManualReviewKey='';
let upscaleEngine='spicy';
const UPSCALE_MODELS=Object.freeze({
  spicy:{name:'Image Upscaler v1',provider:'SpicyAPI',model:'spicyapi/image-upscaler-v1/upscale',pricing:'https://spicyapi.ai/models/image-upscaler-v1',price:'Published price: $0.012 per image, the same for every size and file format.',description:'Enlarge one finished image, keeping its framing and aspect ratio. Size tiers are approximately 4, 17 and 67 megapixels. Choose a tier above your source size. No prompt, creativity or face controls.'},
  'topaz-precision':{name:'Topaz Precision',provider:'FAL',model:'topaz/upscale/image/precision',pricing:'https://fal.ai/models/topaz/upscale/image/precision',price:'Published price: $0.08 per started 24 megapixels of output.',description:'Enlarge while preserving the photograph. Standard V2 is the general option; High Fidelity V3 is for detailed sources. Choose 2× or 4× width and height. Face enhancement and cropping stay off.'},
  'topaz-wonder':{name:'Topaz Wonder 3.5',provider:'FAL',model:'topaz/upscale/image/generative',pricing:'https://fal.ai/models/topaz/upscale/image/generative',price:'Published price: $0.08 per started 8 megapixels of output.',description:'Restore small or blurry images with reconstructed detail. Texture and facial details may change. Choose 2× or 4× width and height. Face enhancement and cropping stay off.'}
});
let sourcePixels=0, sourceWidth=0, sourceHeight=0;
let ratioSourceKey='';
let imageReferenceMode='base';
const moodUI=createMoodSelector({panel:$('composer-moods'),button:$('image-composer-moods'),getEngine:()=>imageEngine,
  chooseEngine:engine=>{if(busy)return;$('image-engine').value=engine;$('image-engine').dispatchEvent(new Event('change',{bubbles:true}));},
  onOpen:()=>{closeImageModelMenu();closeComposerLibrary();toggleImageSettings(false);},
  onChange:()=>{autoPreview=null;update();}
});
function referencesOnly(){return usesReferenceGuidance()&&imageReferenceMode==='references';}
$('image-reference-mode').onchange=()=>{
  imageReferenceMode=$('image-reference-mode').value;autoPreview=null;
  renderReferences();syncDefaultRatio(!imageRatioExplicit);update();
};
const cardUrls=new Set(), requestControllers=new Set();
// Private, bounded session cache. Gallery and viewer share original bytes and
// in-flight reads; each surface owns its own revocable object URL.
const assetBlobs=new Map(),assetReads=new Map();
let assetBlobBytes=0;
function clearAssetCache(){assetBlobs.clear();assetReads.clear();assetBlobBytes=0;}
async function assetBlob(id){
  if(!owner)throw new Error('Sign in first.');
  const cached=assetBlobs.get(id);
  if(cached){assetBlobs.delete(id);assetBlobs.set(id,cached);return cached;}
  if(assetReads.has(id))return assetReads.get(id);
  const generation=epoch;
  const pending=api('/api/assets/'+encodeURIComponent(id),{blob:true}).then(blob=>{
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
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:4}).format(n);
// Keep Upscaler progress and confirmation alongside its paid action controls.
function syncNoticePlacement(){
  const notice=$('notice'),slot=$('upscale-notice-slot'),inline=tool==='upscale'&&owner&&!assetLibrary?.active()&&!fashionActive;
  if(inline&&notice.parentElement!==slot)slot.append(notice);
  else if(!inline&&notice.parentElement===slot)$('archive-rest-anchor').before(notice);
  slot.hidden=!inline||!notice.textContent.trim();
}
const notify=(text,error=false)=>{
  const notice=$('notice');notice.textContent=text;notice.classList.toggle('error',error);
  syncNoticePlacement();
};
function release(url){if(url)URL.revokeObjectURL(url);}
function isSoul2(){return tool==='image'&&imageEngine==='soulpro'&&soulProModel==='soul2';}
const hf=createSoul2UI({api,uploadAsset,assetPhoto:composerAssetPhoto,notify,getPacks:()=>packs,onChange:()=>{composerLibraryKey='';update();},onJob:job=>{if(activeStates.has(job.status))setActive(job);surfaceHistoryJob(job);refreshHistorySoon();}});
function referenceRoles(){return references.map(r=>normalizeReferenceLabel({name:r.file.name,role:r.role||'none',note:r.note||'',target:r.target||''}));}
function usesReferenceGuidance(){return tool==='image'&&['seedream','gemini','flash','kling'].includes(imageEngine);}
function imageGuidance(){
  const labels=referenceRoles(),mood=moodUI.enrich($('prompt').value,{engine:imageEngine,referenceCount:references.length,referenceMode:imageReferenceMode});
  const prompt=compileImagePrompt(mood.prompt,labels);
  return {prompt,error:referenceGuidanceError(labels)||mood.error||(prompt.length>5000?'Direction, mood and reference instructions exceed 5,000 characters. Shorten the direction or optional notes.':'')};
}
function updateReferenceGuidance(){
  const panel=$('reference-guidance'),active=usesReferenceGuidance();panel.hidden=!active||!references.length;
  if(!active)return;
  const {prompt,error}=imageGuidance(),unassigned=references.filter(r=>!r.role||r.role==='none').length;
  $('reference-guidance-text').textContent=prompt;
  $('reference-guidance-count').textContent=prompt.length.toLocaleString()+' / 5,000 characters';
  const warning=$('reference-guidance-warning');warning.textContent=error||(unassigned?unassigned+' reference'+(unassigned===1?' has':'s have')+' no role. Assign a role to specify what to copy.':'');warning.hidden=!warning.textContent;warning.classList.toggle('error',!!error);
  $('reference-provider').textContent=imageEngine==='flash'?'Seedream Flash · OpenRouter':imageEngine==='kling'?'Kling V3 · FAL':imageEngine==='seedream'?'Seedream 5 Pro · SpicyAPI':'Nano Banana Pro · Google';
  $('reference-help').textContent=referencesOnly()?'Create a new composition. Assign Identity, Body or other properties to the references; no photo is the base.':'Choose what each image contributes. Base keeps the scene; Pose copies posture only. Roles become automatic instructions. Results can still vary.';
  $('prompt-label').textContent=canUseReferenceGuidance(referenceRoles())?'Additional changes (optional)':'Image direction';
}
function isReinterpret(){return tool==='image'&&imageEngine==='soul'&&soul.mode()==='reinterpret';}
function sourceHelp(){return tool==='upscale'?'Choose the finished image to enlarge. Its framing and aspect ratio are kept.':tool==='image'&&imageEngine==='soulpro'?'Choose the exact source photograph. It controls pose, body, camera and scene.':'Choose the exact opening frame.';}
function isFalUpscale(){return tool==='upscale'&&upscaleEngine!=='spicy';}
function upscaleMode(p){return Object.hasOwn(UPSCALE_MODELS,p?.upscaleEngine)?p.upscaleEngine:'spicy';}
function upscaleName(p){const model=UPSCALE_MODELS[upscaleMode(p)];return model.name+(upscaleMode(p)==='topaz-precision'?' / '+(p.topazModel||'Standard V2'):'')+' · '+model.provider;}
function upscaleSize(p){return p.targetWidth&&p.targetHeight?p.targetWidth+' × '+p.targetHeight:p.scale?p.scale+'×':String(p.resolution||'').toUpperCase();}
function updateUpscaleModel(){
  const active=tool==='upscale',fal=isFalUpscale(),model=UPSCALE_MODELS[upscaleEngine];$('upscale-model-control').hidden=!active;$('upscale-topaz-control').hidden=!active||upscaleEngine!=='topaz-precision';$('upscale-scale-control').hidden=!fal;$('mode-heading').parentElement.classList.toggle('upscale-mode',active);
  for(const option of $('upscale-engine').options)option.disabled=option.value!=='spicy'&&!config.falEnabled;
  if(!active)return;
  $('resolution-control').hidden=fal;$('engine-name').textContent=model.name.toUpperCase()+' · '+model.provider.toUpperCase();
  $('upscale-model-name').textContent=upscaleName(settings());$('upscale-model-description').textContent=model.description+(fal?' Lab output limit: approximately 67 megapixels.':'');$('upscale-published-price').textContent=model.price;$('upscale-pricing-link').href=model.pricing;
  $('upscale-content-label').textContent=fal?'FAL content restrictions':'No added SpicyAPI filter';$('upscale-content-note').textContent=fal?'Sexually explicit content is not allowed.':'The model may still refuse an input.';$('upscale-content-link').href=fal?'https://fal.ai/legal/acceptable-use-policy':model.pricing;
  $('upscale-price-help').textContent='Optional · no generation charge';
  $('generation-help').textContent=fal?'Upscale starts one paid Topaz job in one click. PV Lab checks the estimated price and output dimensions automatically before submission; the displayed FAL price is an estimate and provider billing is authoritative.':'Upscale starts one paid upscaling job. You can check its live price above first; there is no extra price-review popup. Inputs over 10 MiB need a working copy; the Lab prepares it automatically and keeps the original.';
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
  $('upscale-price-status').textContent=customerMode&&q?('Estimated credit charge: '+wallet.describe(q.maxUsd)+'. Valid until '+new Date(q.expiresAt).toLocaleTimeString()+'. No generation submitted.'):q?(q.priceIsEstimate?('Estimated charge: '+money(q.estimatedUsd)+' USD. '+q.settings.sourceWidth+' × '+q.settings.sourceHeight+' → '+q.settings.targetWidth+' × '+q.settings.targetHeight+' output. Not a guaranteed maximum. Valid until '+new Date(q.expiresAt).toLocaleTimeString()+'. No generation submitted.'):('Live price: '+money(q.estimatedUsd)+' USD'+(q.maxUsd!==q.estimatedUsd?' · maximum '+money(q.maxUsd)+' USD':'')+'. Valid until '+new Date(q.expiresAt).toLocaleTimeString()+'. No generation submitted.')):upscalePriceMessage||(fal?'Check the estimated charge and output dimensions before upscaling.':'Check the price for this image before upscaling, or use Upscale directly.');
  if(active&&(fal&&!config.falEnabled||(!fal&&upscaleQuoteNeedsCheck)||upscaleManualReviewRequired))$('generate').disabled=true;
  if(active&&q)$('generate').textContent=customerMode?'Upscale · '+wallet.describe(q.maxUsd):'Upscale · '+(q.priceIsEstimate?'est. ':q.maxUsd!==q.estimatedUsd?'max ':'')+money(q.priceIsEstimate?q.estimatedUsd:q.maxUsd);
}
function validateUpscaleQuote(q,selected){
  const which=upscaleMode(selected),fal=which!=='spicy',p=q?.settings,wrong=!q||!p||q.provider!==(fal?'fal.ai':'SpicyAPI')||p.model!==UPSCALE_MODELS[which].model||p.type!=='image'||p.mode!=='upscale'||upscaleMode(p)!==which||p.outputFormat!==selected.outputFormat||!q.id||!Number.isFinite(q.estimatedUsd)||q.estimatedUsd<0||!Number.isFinite(q.maxUsd)||q.maxUsd<q.estimatedUsd||!Number.isFinite(q.expiresAt)||q.expiresAt<=Date.now();
  if(wrong||fal&&(q.priceIsEstimate!==true||q.requiresPriceReview!==true||p.scale!==selected.scale||p.topazModel!==selected.topazModel||![p.sourceWidth,p.sourceHeight,p.targetWidth,p.targetHeight].every(n=>Number.isSafeInteger(n)&&n>0)||p.targetWidth!==p.sourceWidth*selected.scale||p.targetHeight!==p.sourceHeight*selected.scale)||!fal&&p.resolution!==selected.resolution)throw new Error('No usable upscale quote was returned for these settings. Nothing was submitted.');
}
function settings(){if(tool==='upscale')return isFalUpscale()?{type:'image',mode:'upscale',upscaleEngine,scale:Number($('upscale-scale').value),topazModel:upscaleEngine==='topaz-precision'?$('upscale-topaz-model').value:'Wonder 3.5',prompt:'',resolution:$('upscale-scale').value+'x',aspectRatio:'source',outputFormat:$('output-format').value,referenceRoles:[]}:{type:'image',mode:'upscale',upscaleEngine:'spicy',prompt:'',resolution:$('resolution').value,aspectRatio:'auto',outputFormat:$('output-format').value,referenceRoles:[]};if(isSoul2())return {type:'image',provider:'higgsfield',engine:'soulpro',soulProModel:'soul2',mode:'identity-edit',prompt:$('prompt').value.trim(),...hf.parameters(),seed:$('soul-pro-seed').value,aspectRatio:$('hf-bar-ratio').value,outputFormat:'png',referenceRoles:[]};if(tool==='image'&&imageEngine==='soulpro')return {type:'image',provider:'fal',engine:'soulpro',mode:'identity-edit',soulProModel,soulProQuality,prompt:$('prompt').value.trim(),sourceWidth,sourceHeight,seed:$('soul-pro-seed').value,resolution:'source',aspectRatio:'source',outputFormat:'png',referenceRoles:[]};if(tool==='image'&&imageEngine==='fal')return {type:'image',provider:'fal',engine:'fal',mode:'controlled-pose',prompt:$('prompt').value.trim(),resolution:'1k',aspectRatio:$('ratio').value,outputFormat:'png',poseStrength:Number($('pose-strength').value),identityStrength:Number($('identity-strength').value),seed:$('controlled-pose-seed').value,referenceRoles:referenceRoles()};if(tool==='image'){const mood=moodUI.enrich($('prompt').value,{engine:imageEngine,referenceCount:references.length,referenceMode:imageReferenceMode});const base={type:'image',engine:imageEngine,processing:imageProcessing,referenceMode:imageReferenceMode,mode:'image',prompt:mood.prompt,...mood.metadata,resolution:imageEngine==='soul'?'native':$('resolution').value,aspectRatio:$('ratio').value,outputFormat:['seedream','flash','kling'].includes(imageEngine)?'png':$('output-format').value,referenceRoles:imageEngine==='soul'?[]:referenceRoles()};return imageEngine==='soul'?{...base,characterId:soul.selectedId(),identityStrength:soul.strength(),...(isReinterpret()?{...soul.reinterpretSettings(),resolution:$('resolution').value,aspectRatio:'source'}:{})}:base;}return {type:'video',engine,mode,...(mode==='extend'?{provider:'higgsfield'}:{}),referenceVideos:['reference','extend'].includes(mode)?mediaRefs.labels('video'):[],referenceAudio:mode==='reference'?mediaRefs.labels('audio'):[],prompt:$('prompt').value.trim(),duration:Number($('duration').value),resolution:$('resolution').value,aspectRatio:mode==='extend'?'auto':$('ratio').value,seed:mode==='extend'?null:$('seed').value,audio:$('audio').checked,referenceRoles:referenceRoles(),referencePixels:engine==='h3maxfal'?references.map(r=>r.width*r.height):[]};}
function hasInput(){if(tool==='video'&&mode==='extend')return mediaRefs.labels('video').length===1&&!!$('prompt').value.trim();if(tool==='upscale')return !!file;if(tool==='image'&&imageEngine==='soulpro')return isSoul2()?hf.ready()&&(!!file||!!$('prompt').value.trim()):!!file&&soulProIdentity.configured;if(tool==='image'&&imageEngine==='fal'){const roles=referenceRoles(),poses=roles.filter(r=>r.role==='pose').length,identities=roles.filter(r=>r.role==='identity').length;return !!$('prompt').value.trim()&&references.length>=2&&references.length<=5&&poses===1&&identities>=1&&identities<=4&&poses+identities===references.length;}if(tool==='image'&&imageEngine==='soul')return isReinterpret()?soul.reinterpretReady()&&!!file:soul.ready()&&!!$('prompt').value.trim();if(usesReferenceGuidance())return !imageGuidance().error&&(!!$('prompt').value.trim()||canUseReferenceGuidance(referenceRoles())||(moodUI.active()&&references.length>0));return tool==='image'||mode==='text'?!!$('prompt').value.trim():mode==='start'?!!file:references.length>0||(engine==='seedance'&&mediaRefs.count()>0);}
function syncVideoFrameCards(){
  for(const [id,url] of [['video-start-thumb',sourceUrl],['video-end-thumb',lastUrl]]){const img=$(id);if(!img)continue;img.hidden=!url;img.parentElement.classList.toggle('has-frame',!!url);if(url&&img.getAttribute('src')!==url)img.src=url;else if(!url)img.removeAttribute('src');}
}
function update(){syncVideoFrameCards();$('app').classList.toggle('extension-loaded',tool==='video'&&mode==='extend'&&mediaRefs.labels('video').length>0);if(tool==='video'&&mode==='extend')$('video-ref-count').textContent=mediaRefs.labels('video').length+' / 1';$('save').textContent=tool==='video'?'Save draft':tool==='upscale'?'Save upscale draft':'Save to private history';if($('soul-base-preview')){$('soul-base-preview').hidden=!sourceUrl;if(sourceUrl)$('soul-base-preview').src=sourceUrl;else $('soul-base-preview').removeAttribute('src');$('soul-base-name').textContent=file?.name||'';}const current=settings(),p=resultSettings||current,ratio=p.aspectRatio==='auto'?(p.mode==='reference'?'adaptive':'source ratio'):p.aspectRatio,imageName=p.mode==='upscale'?'Upscale':p.engine==='flash'?'Seedream Flash':p.engine==='kling'?'Kling V3':p.engine==='gemini'?'Nano Banana Pro':p.provider==='higgsfield'?'PV Soul':p.engine==='soulpro'?'PV Soul Pro':p.engine==='soul'?(p.mode==='reinterpret'?'PV Soul / Reinterpret':'PV Soul'):p.engine==='fal'?'Controlled Pose':'Image',resolution=p.resolution==='native'?'native':String(p.resolution||'').toUpperCase();$('settings-summary').textContent=p.mode==='upscale'?upscaleName(p)+' / '+upscaleSize(p)+' / source ratio':p.type==='image'?imageName+' / '+resolution+' / '+ratio:`${p.duration}s / ${p.resolution} / ${ratio}`;$('save').disabled=!owner||!hasInput()||busy;$('clear').disabled=(!file&&!lastFile&&!references.length&&!mediaRefs.count()&&!resultUrl&&!$('prompt').value.trim())||busy;const provider=currentProvider(),ready=provider==='openrouter'?config.openrouterEnabled:provider==='higgsfield'?config.higgsfieldEnabled:provider==='gemini'?config.geminiEnabled:provider==='fal'?config.falEnabled:config.enabled,soulBlocked=tool==='image'&&imageEngine==='soul'&&(!config.soulTrainingEnabled||!soul.ready()||(isReinterpret()&&!soul.reinterpretReady()));$('generate').disabled=!owner||!hasInput()||(tool!=='upscale'&&!isReinterpret()&&imageEngine!=='soulpro'&&!current.prompt&&!(usesReferenceGuidance()&&canUseReferenceGuidance(referenceRoles())))||busy||imageSubmissionPending||submissionBlocked()||soulBlocked||(tool==='image'&&moodUI.invalid(imageEngine,$('prompt').value,references.length,imageReferenceMode))||(tool==='upscale'&&((!isFalUpscale()&&upscaleQuoteNeedsCheck)||upscaleManualReviewRequired));$('generate').textContent=ready?(tool==='image'?(imageEngine==='gemini'?(imageProcessing==='batch'?'Queue batch':'Generate now'):imageEngine==='soulpro'?(isSoul2()?'Review price':'Generate'):imageEngine==='fal'?'Generate controlled pose':isReinterpret()?'Reinterpret with Soul':'Generate'):tool==='upscale'?'Upscale':'Generate'):(provider==='openrouter'?'Connect OpenRouter':provider==='higgsfield'?'Higgsfield API not connected':provider==='gemini'?'Gemini API not connected':provider==='fal'?'FAL API not connected':'Connect generation provider');$('generation-help').textContent=tool==='image'&&imageEngine==='flash'?'Seedream Flash · $0.018 estimated per image · OpenRouter. '+(config.openrouterEnabled?'':'Add OPENROUTER_API_KEY in the Worker secrets to connect. '):tool==='image'&&imageEngine==='kling'?'Kling V3 · $0.028 estimated per image · FAL. Text or one base image; 1K / 2K.':isSoul2()?'PV Soul uses one base image and an optional trained Soul ID, NOT multiple reference photos. '+(hf.current()?'Selected identity: '+hf.current().name+'. ':'NO SOUL ID: results will not preserve Nina. ')+(customerMode?'Soul 2 uses PV Lab credits at its confirmed live quote.':'Review the live Higgsfield price and confirm before any generation; provider billing is authoritative.'):tool==='image'&&imageEngine==='soulpro'?(soulProIdentity.configured?(soulProModel==='ideogram45'?'One base image only. Nina identity loads automatically. Ideogram Precise keeps edit_precision=high; selected quality estimate: '+({very_low:'$0.008',low:'$0.03',medium:'$0.06',high:'$0.22'}[soulProQuality]||'$0.06')+' per image.':'One base image only. Nina identity loads automatically. Kontext Max uses the base plus up to 3 identity refs because its total image limit is 4. Estimate: $0.08 per image.'):'Set Nina identity once, then every Soul Pro render needs only one base image.'):tool==='image'&&imageEngine==='fal'?'Controlled Pose uses FAL DWPose + FLUX EasyControl. One Pose role and 1–4 Identity roles are required. Preview Pose is a small separate fal.ai compute charge.':tool==='image'&&imageEngine==='soul'?(isReinterpret()?'One base photograph and a separately trained Soul identity. High fidelity may keep the original face; lower it for more change. The live provider quote controls the charge.':'PV Soul Text uses your trained Qwen Image 2512 identity. The live provider quote is authoritative.'):tool==='image'&&imageEngine==='gemini'?(imageProcessing==='batch'?'Batch uses the same Nano Banana Pro model at 50% of standard API price. It runs asynchronously and can take minutes or hours; Google targets completion within 24 hours.':'Normal sends Nano Banana Pro immediately. 1K/2K are estimated at $0.134 per image and 4K at $0.24; Google billing is authoritative.'):(tool==='image'?'Generate starts one paid image at the live provider price, within your daily spending limit. No price-review popup.':tool==='upscale'?'Upscale starts one paid upscaling job. You can check its live price above first; there is no extra price-review popup.':'A live quote appears before any paid video.')+' Inputs over 10 MiB need a working copy; the Lab prepares it automatically and keeps the original. Saving a draft does not generate or charge.';for(const el of document.querySelectorAll('.controls input,.controls select,.controls textarea,.mode-tab,.tool-tab'))el.disabled=busy;updateReferenceGuidance();updateUpscaleModel();updateUpscalePrice();syncImageComposer();}
function options(id,values,value){$(id).replaceChildren(...values.map(v=>new Option(v==='auto'?'Follow reference':v==='source'?'Source':v.toUpperCase(),v)));$(id).value=value;}
function syncDefaultRatio(force=false){
  const select=$('ratio'),values=[...select.options].map(o=>o.value);
  if(tool==='upscale'||(tool==='image'&&(imageEngine==='soulpro'||isReinterpret())))return;
  if(force)imageRatioExplicit=false;
  const ref=referencesOnly()?null:references.find(r=>r.role==='base')||references.find(r=>r.role==='pose')||references[0];
  const source=referencesOnly()?null:tool==='image'&&imageEngine==='soul'?null:tool==='video'&&mode==='text'?null:
    tool==='video'&&mode==='start'?(file?{width:sourceWidth,height:sourceHeight}:null):ref||((tool==='image'&&file)?{width:sourceWidth,height:sourceHeight}:null);
  const key=[tool,imageEngine,imageReferenceMode,mode,source?.width||0,source?.height||0,ref?.url||sourceUrl||'',values.join(',')].join(':');
  if(!force&&key===ratioSourceKey)return;
  ratioSourceKey=key;
  select.value=imageAutoRatio({values,reference:source,explicit:tool==='image'&&imageRatioExplicit&&!force,current:select.value,defaultRatio:'16:9'});
}

function setFashionActive(active){
  if(fashionActive===active)return;
  fashionActive=active;
  $('app').classList.toggle('fashion-studio-active',active);
  $('fashion-studio').hidden=!active;
  for(const name of ['image','video','upscale','fashion']){
    const selected=active?name==='fashion':name===tool;
    $('tool-'+name).classList.toggle('active',selected);
    $('tool-'+name).setAttribute('aria-pressed',String(selected));
  }
  syncImageStudioMode();syncVideoStudioMode();
}
async function openFashionStudio(){
  if(!owner)return;
  if(busy)return;
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
      fashionMount=import('./fashion-studio.js?v=20261010-deck01')
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
  if(value==='fashion'){void openFashionStudio();return;}
  if(value==='assets'){void viewMedia(()=>assetLibrary.open());return;}
  setFashionActive(false);
  const nextTool=['image','video','upscale'].includes(value)?value:'image';
  const galleryChanged=nextTool!==tool||!!assetLibrary?.active();
  assetLibrary?.close();
  if($('soul-pro-identity-dialog').open)$('soul-pro-identity-dialog').close();
  const toolChanged=tool!==nextTool;
  tool=nextTool;syncStudioRoute(tool);const image=tool==='image',upscale=tool==='upscale',video=tool==='video';
  $('app').classList.toggle('upscale-studio-active',upscale);
  if(toolChanged){$('notice').textContent='';$('notice').classList.remove('error');}
  syncNoticePlacement();
  for(const name of ['image','video','upscale']){$('tool-'+name).classList.toggle('active',tool===name);$('tool-'+name).setAttribute('aria-pressed',String(tool===name));}$('soul-launch').hidden=!image;
  $('video-modes').hidden=!video;$('duration-control').hidden=!video;$('image-model-control').hidden=!image;$('engine-name').hidden=image;$('image-processing-control').hidden=!image||imageEngine!=='gemini';$('soul-pro-settings').hidden=!image||imageEngine!=='soulpro';$('controlled-pose-settings').hidden=!image||imageEngine!=='fal';$('image-count-control').hidden=!image||imageEngine==='fal'||imageEngine==='soulpro';$('video-utilities').hidden=!video;$('format-control').hidden=video||(image&&(imageEngine==='gemini'||imageEngine==='fal'||imageEngine==='soulpro'));$('soul-controls').hidden=!image||imageEngine!=='soul';
  $('start-mode').hidden=(image&&imageEngine!=='soulpro')||video&&mode!=='start';$('reference-mode').hidden=upscale||video&&mode!=='reference'||image&&['soul','soulpro'].includes(imageEngine);
  $('last-upload').hidden=upscale||image&&imageEngine==='soulpro';$('start-label').textContent=upscale?'Image to upscale':image&&imageEngine==='soulpro'?'Base image':'Start frame';
  $('upscale-info').hidden=!upscale;$('prompt').hidden=upscale;$('prompt-label').hidden=upscale;$('resolution-control').hidden=image&&(imageEngine==='soul'&&!isReinterpret()||imageEngine==='fal'||imageEngine==='soulpro');$('ratio-control').hidden=upscale||image&&imageEngine==='soulpro';
  $('mode-heading').textContent=upscale?'03 / Image Upscale':image&&imageEngine==='soulpro'?'02 / PV Soul Pro · Nina Reinterpret':image?'02 / Text to Image + Reference Edit':'01 / Image to Video';
  $('engine-name').textContent=upscale?'IMAGE UPSCALER V1 · SPICYAPI':image?(imageEngine==='gemini'?'NANO BANANA PRO':imageEngine==='soulpro'?'PV SOUL PRO':imageEngine==='soul'?'PV SOUL':imageEngine==='fal'?'CONTROLLED POSE · FAL':'SEEDREAM 5.0 PRO'):'WAN 3.0';
  $('prompt-label').textContent=image?'Image direction':'Motion direction';$('prompt').maxLength=image?5000:6000;
  $('prompt').placeholder=image?'Describe the image. Add references for identity, wardrobe, a room or an object, or start with text only.':'One clear action, one camera move, light, atmosphere and sound.';
  options('resolution',upscale?['2k','4k','8k']:image?(imageEngine==='soulpro'?['source']:imageEngine==='fal'?['1k']:imageEngine==='gemini'?['1k','2k','4k']:imageEngine==='soul'?(isReinterpret()?['1k','1.5k']:['native']):['1k','2k']):['480p','720p','1080p'],upscale?'4k':image?(imageEngine==='soulpro'?'source':imageEngine==='soul'?(isReinterpret()?'1.5k':'native'):['fal','seedream','flash','kling'].includes(imageEngine)?'1k':'2k'):engine==='seedance'?'720p':'1080p');
  if(upscale)for(const option of $('resolution').options)option.textContent=option.value.toUpperCase()+' · ~'+({'2k':4,'4k':17,'8k':67}[option.value])+' MP';
  options('output-format',upscale&&!isFalUpscale()?['png','jpeg','webp']:['png','jpeg'],'png');
  if(!file)$('filemeta').textContent=sourceHelp();
  options('ratio',image?(imageEngine==='soulpro'?['source']:['flash','kling'].includes(imageEngine)?['auto','16:9','9:16','1:1','4:3','3:4','3:2','2:3','21:9']:imageEngine==='fal'?['1:1','4:3','3:4','16:9','9:16','21:9']:imageEngine==='gemini'?['auto','1:1','2:3','3:2','3:4','4:3','4:5','5:4','9:16','16:9','21:9']:imageEngine==='soul'?(isReinterpret()?['source']:['1:1','16:9','9:16','4:3','3:4','3:2','2:3','21:9','9:21']):['auto','1:1','4:3','3:4','16:9','9:16','3:2','2:3','4:5','5:4','21:9','9:21','2:1','1:2','3:1','1:3']):['auto','16:9','9:16','1:1','4:3','3:4'],image&&imageEngine==='soulpro'?'source':image&&imageEngine==='soul'?(isReinterpret()?'source':'1:1'):image&&imageEngine==='fal'?'3:4':'auto');
  if(image){const values=(imageEngine==='fal'||imageEngine==='soulpro')?[1]:imageEngine==='gemini'&&imageProcessing==='batch'?[1,2,4,10,20]:[1,2,3,4],selected=Math.min(Number($('image-count').value)||1,values.at(-1));$('image-count').replaceChildren(...values.map(n=>new Option(n+' image'+(n===1?'':'s'),String(n))));$('image-count').value=String(values.includes(selected)?selected:1);}
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
  configureVideoControls();syncDefaultRatio(true);renderReferences();resetPreview();refreshCanvasImport();update();syncImageStudioMode();syncVideoStudioMode();
  if(owner&&assetLibrary&&galleryChanged){setHistorySelectMode(false);void loadHistory().catch(e=>notify(e.message,true));}
}

/* Floating Image Studio: one gallery, one real backend, no duplicate submissions.
   The composer mirrors the existing hidden advanced controls, which remain
   authoritative for pricing, authentication, model limits and provider calls. */
const imageStudio = $('image-studio');
const imageComposer = $('image-composer');
const archive = document.querySelector('.archive');
let imageMenuOpen = false;
const composerPortraits=new Map();
const composerHomes=new Map();
let composerLibraryKey='',composerPortraitKey='',soulProEditingCurrent=false;
function composerAssetPhoto(host,id,characterName='',characterId=''){
  host.replaceChildren();
  const cover=/^nina[\s._-]*fok$/i.test(characterName.trim())?'/assets/optimized/nina-fok/Canon.webp':null;
  const placeholder=()=>{host.textContent=characterName?characterName.trim().split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase():'+';};
  if(!id&&!cover&&!characterId){placeholder();return;}
  const img=document.createElement('img');img.alt=characterName?characterName+' portrait':'Saved identity preview';img.onerror=()=>{if(img.isConnected)placeholder();};host.append(img);
  if(cover){img.src=cover;return;}
  const cacheKey=characterId?'character:'+characterId:id;
  if(!composerPortraits.has(cacheKey)){
    const revision=epoch;
    const photo=characterId?api('/api/soul/characters/'+encodeURIComponent(characterId)+'/preview',{blob:true}).catch(error=>{if(id)return api('/api/assets/'+encodeURIComponent(id),{blob:true});throw error;}):api('/api/assets/'+encodeURIComponent(id),{blob:true});
    composerPortraits.set(cacheKey,photo.then(blob=>{
      if(epoch!==revision||!owner)return null;
      const url=URL.createObjectURL(blob);return url;
    }).catch(()=>null));
  }
  composerPortraits.get(cacheKey).then(url=>{if(!img.isConnected)return;if(url)img.src=url;else{placeholder();}});
}
function composerCharacterAsset(id){
  const job=[...imageDetailCache.values()].find(j=>j.settings?.characterId===id&&j.outputId);
  return job?.outputId||null;
}
function composerMove(id,target){
  const node=$(id);if(!node)return;
  if(!composerHomes.has(id)){const anchor=document.createComment('Home: '+id);node.before(anchor);composerHomes.set(id,anchor);}
  if(target){if(node.parentElement!==target)target.append(node);}
  else composerHomes.get(id).after(node);
}
function syncComposerOptions(){
  const image=tool==='image',target=$('composer-options-fields');
  for(const id of ['format-control','image-processing-control','soul-controls','soul-pro-settings','controlled-pose-settings','reference-list','reference-guidance','save','clear'])composerMove(id,image?target:null);
  if(!image){$('reference-list').hidden=false;return;}
  target.dataset.engine=imageEngine;
  target.dataset.compact=String(imageEngine==='soul'&&!isReinterpret());
  $('reference-list').hidden=['soul','soulpro'].includes(imageEngine);
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
  $('composer-library').hidden=true;$('composer-character').setAttribute('aria-expanded','false');
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
$('composer-character').onclick=()=>{if(busy)return;const open=$('composer-library').hidden;toggleImageSettings(false);closeImageModelMenu();$('composer-library').hidden=!open;$('composer-character').setAttribute('aria-expanded',String(open));if(open)renderComposerLibrary();};
$('composer-library-close').onclick=closeComposerLibrary;
$('composer-character-create').onclick=()=>{if(busy)return;closeComposerLibrary();void hf.open({create:true});};
$('composer-library-delete').onclick=()=>{if(!busy)$('pack-delete').click();};
$('composer-options-close').onclick=()=>toggleImageSettings(false);
$('composer-library-create').onclick=()=>{if(busy)return;if(isSoul2()){closeComposerLibrary();void hf.open({create:true});return;}if(imageEngine==='soul')$('soul-manage').click();else if(imageEngine==='soulpro')$('soul-pro-identity-manage').click();else $('pack-save').click();};
$('composer-library-manage').onclick=()=>{if(busy)return;if(isSoul2()){closeComposerLibrary();void hf.open();return;}(imageEngine==='soulpro'?$('soul-pro-identity-manage'):$('soul-manage')).click();};
function setModelIcon(element,engine){
  const paths={seedream:'bytedance.svg',flash:'bytedance.svg',gemini:'google.svg',soulpro:'pv-mark.png',soul:'pv-mark.png'};
  const path=paths[engine];element.replaceChildren();
  if(path){const img=document.createElement('img');img.src='./branding/'+path;img.alt='';img.width=20;img.height=20;element.append(img);}
  else element.textContent='◈';
}
const imageModelDescriptions = Object.freeze({
  seedream:'Image creation and reference-guided edits',
  flash:'Seedream Flash · $0.018/image · up to 14 references',
  kling:'Kling V3 · $0.028/image · text or one base image',
  gemini:'Nano Banana Pro · image and reference editing',
  soulpro:'Create from text or a photograph · optional character',
  soul:'Text-to-image with a trained character LoRA',
  fal:'Controlled Pose · FAL FLUX image controls'
});
function imageStudioModelTitle(){
  if(isSoul2())return 'PV Soul';
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
function syncImageGalleryEmpty(){
  renderPendingImageCards();
  const imageCards=$('history').querySelectorAll('.card[data-kind="image"]').length;
  $('image-gallery-empty').hidden=imageCards>0;
}
let draggedComposerReference=null;
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
  tray.replaceChildren();
  if(tool!=='image'||imageEngine==='soul'&&!isReinterpret()){tray.hidden=true;return;}
  const items=isSoul2()?[]:[...references];
  if((imageEngine==='soulpro'||isReinterpret())&&sourceUrl)items.unshift({thumbUrl:sourceUrl,file:{name:'Base image'},isBase:true});
  for(let i=0;i<items.length;i++){
    const ref=items[i],tile=document.createElement('div');
    tile.className='composer-reference-tile';tile.title=ref.file?.name||'Reference image';
    const img=document.createElement('img');
    img.src=ref.thumbUrl||ref.url;img.alt=(ref.isBase?'Base image':'Image reference '+(i+1));
    img.loading='lazy';img.decoding='async';img.draggable=false;tile.append(img);
    if(!ref.isBase){
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
    marker.textContent=ref.isBase||ref.role==='base'?'BASE':ref.role&&ref.role!=='none'?ref.role.toUpperCase():String(i+1);
    marker.setAttribute('aria-hidden','true');if(isSoul2())marker.hidden=true;tile.append(marker);
    if(usesReferenceGuidance()&&(i>0||referencesOnly())){
      marker.hidden=true;
      const role=document.createElement('select');role.className='composer-reference-role';role.setAttribute('aria-label','Role for image '+(i+1));role.disabled=busy;
      for(const [value,label] of REFERENCE_ROLES.filter(([value])=>value!=='base'))role.add(new Option(value==='none'?'REF '+(i+1):label,value));
      role.value=ref.role||'none';role.onchange=()=>{ref.role=role.value;ref.target=role.value==='outfit'?'full':'';renderReferences();update();};tile.append(role);
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
        closeInputPreview();releaseReference(target);references.splice(idx,1);
        if(imageEngine==='fal')poseMapSourceId=null;
        renderReferences();refreshInputPreview();update();
      };
      tile.append(remove);
    }
    tray.append(tile);
  }
  const remaining=Math.max(0,referenceLimit()-references.length);
  if(items.length&&remaining>0&&imageEngine!=='soulpro'&&imageEngine!=='soul'){
    const more=document.createElement('button');more.type='button';
    more.className='composer-add-tile';more.textContent='+';
    more.title='Add more references';more.setAttribute('aria-label','Add more image references');
    more.onclick=()=>$('image-composer-add').click();tray.append(more);
  }
  tray.hidden=!items.length;
}
// Keep even very long pasted prompts inside the scrollable editor. The
// textarea is never allowed to determine the height of the floating dock.
function fitImageComposerPrompt(){
  const textbox=$('image-composer-prompt');
  if(!textbox)return;
  const narrow=window.innerWidth<=740;
  const short=window.innerHeight<=640;
  const minimum=narrow?47:42;
  const viewport=window.visualViewport?.height||window.innerHeight;
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
  moodUI.sync({visible:image,locked:busy});
  imageStudio.hidden=!image;
  syncComposerOptions();
  if(!image)return;
  $('image-reference-mode-wrap').hidden=!usesReferenceGuidance()||!references.length;
  $('image-reference-mode').value=imageReferenceMode;$('image-reference-mode').disabled=busy;
  const textbox=$('image-composer-prompt');
  if(document.activeElement!==textbox && textbox.value!==$('prompt').value)
    textbox.value=$('prompt').value;
  textbox.placeholder='Describe the scene you imagine…';
  syncSoulBar();
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
  $('image-composer-add').disabled=busy;
  const strengthOnly=isSoul2()||imageEngine==='soul'&&!isReinterpret();
  $('image-composer-more').textContent=strengthOnly?'Identity '+Number($(isSoul2()?'hf-strength':'soul-strength').value).toFixed(2):'Options';
  $('image-composer-more').title=strengthOnly?'Adjust trained character identity strength':'Image options';
  $('composer-options').querySelector('.composer-panel-head strong').textContent=strengthOnly?'Identity strength':'Image options';
  $('image-composer-more').disabled=busy;
  $('image-composer-more').hidden=['seedream','flash','kling'].includes(imageEngine)||isSoul2()&&!hf.current();
  if(['seedream','flash','kling'].includes(imageEngine))toggleImageSettings(false);
  $('image-composer-add').hidden=imageEngine==='soul'&&!isReinterpret();
  $('composer-character').setAttribute('aria-label',imageEngine==='soul'||imageEngine==='soulpro'?'Choose character':'Saved reference photos');
  const generate=$('image-composer-generate');
  generate.classList.toggle('is-submitting',imageSubmissionPending);
  generate.disabled=$('generate').disabled;
  generate.textContent=imageSubmissionPending?imageSubmissionStage:$('generate').textContent;
  const block=$('composer-generation-block'),reason=$('composer-generation-reason'),review=$('composer-review-queue');
  const queueBlocked=!busy&&owner&&submissionBlocked();
  let message='';
  if(generate.disabled){
    if(imageSubmissionPending)message='';
    else if(busy)message='Preparing your request…';
    else if(!owner)message='Sign in to generate.';
    else if(queueBlocked)message=activeJobs.some(j=>j.status==='uncertain'&&jobProvider(j)===currentProvider())?'A previous request has an unknown status. Review it before generating again.':'The active generation limit has been reached. Wait for a job to finish.';
    else if(imageEngine==='soulpro'&&!file)message=isSoul2()?'':'Add a base image.';
    else if(isSoul2()&&!config.higgsfieldEnabled)message='Connect your Higgsfield API credential in Cloudflare. Open Identity strength for setup details.';
    else if(isSoul2()&&!hf.ready())message='Choose or create a completed Soul ID using the identity photo tile.';
    else if(imageEngine==='soulpro'&&!isSoul2()&&!soulProIdentity.configured)message='Choose and save the identity reference photos.';
    else if(imageEngine==='soul'&&!soul.ready())message='Choose a trained LoRA.';
    else if(imageEngine==='soul'&&isReinterpret()&&!soul.reinterpretReady())message='This character needs a trained Reinterpret identity.';
    else if(!hasInput()&&imageEngine==='fal')message='Add one pose image, 1–4 identity photos and a prompt.';
    else if(usesReferenceGuidance()&&imageGuidance().error)message=imageGuidance().error;
    else if(moodUI.invalid(imageEngine,$('prompt').value,references.length,imageReferenceMode))message=moodUI.error(imageEngine,$('prompt').value,references.length,imageReferenceMode);
    else if(!$('prompt').value.trim())message='';
  }
  block.hidden=!message;reason.textContent=message;review.hidden=!queueBlocked;
  generate.title=message||(isSoul2()?'Review the live Higgsfield price before any charge. PV Soul accepts one base image and one optional trained Soul ID; use Seedream for multiple reference photos.':'');
  syncImageReferences();
  fitImageComposerPrompt();
  syncImageGalleryEmpty();
}
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
    if(value&&!(name+' '+detail).toLowerCase().includes(value))continue;
    const row=document.createElement('button');row.type='button';
    row.className='composer-model-option';row.dataset.value=option.value;row.disabled=busy||option.disabled;
    row.setAttribute('role','option');row.setAttribute('aria-selected',String(option.value===imageEngine));
    const icon=document.createElement('span');icon.className='composer-model-icon';setModelIcon(icon,option.value);
    const info=document.createElement('span');info.className='composer-model-info';
    const title=document.createElement('strong');title.textContent=name;
    const caption=document.createElement('small');caption.textContent=detail;
    info.append(title,caption);
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
  const open=!['seedream','flash','kling'].includes(imageEngine)&&(typeof force==='boolean'?force:!$('app').classList.contains('image-settings-open'));
  $('app').classList.toggle('image-settings-open',open);
  $('image-settings-scrim').hidden=true;
  $('composer-options').hidden=!open;
  $('image-composer-more').setAttribute('aria-expanded',String(open));
  if(open){closeImageModelMenu();closeComposerLibrary();}
}
function syncImageStudioMode(){
  const isImage=tool==='image'&&!fashionActive;
  $('app').classList.toggle('image-studio-active',isImage);
  imageStudio.hidden=!isImage;
  if(!isImage)closeComposerLibrary();
  if(isImage){
    if(archive.parentElement!==$('image-gallery-host'))$('image-gallery-host').append(archive);
  }else{
    $('archive-rest-anchor').after(archive);
    closeImageModelMenu();toggleImageSettings(false);
  }
  syncImageComposer();
}
$('image-composer-prompt').addEventListener('input',()=>{
  if(busy)return;
  $('prompt').value=$('image-composer-prompt').value;
  $('prompt').dispatchEvent(new Event('input',{bubbles:true}));
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
$('image-composer-generate').onclick=()=>{if(!busy&&tool==='image')$('generate').click();};
$('image-composer-add').onclick=()=>{
  if(busy)return;
  const input=imageEngine==='soulpro'||isReinterpret()?$('soul-base-image'):$('reference-images');
  if(imageEngine==='soul'&&!isReinterpret()){$('composer-character').click();return;}
  if(input&&!input.disabled)input.click();
};
$('image-composer-more').onclick=()=>toggleImageSettings();
$('image-settings-scrim').onclick=()=>toggleImageSettings(false);
$('image-composer-model').onclick=()=>{
  moodUI.close();
  if(busy)return;
  closeComposerLibrary();toggleImageSettings(false);
  imageMenuOpen=!imageMenuOpen;
  $('image-composer-model-menu').hidden=!imageMenuOpen;
  $('image-composer-model').setAttribute('aria-expanded',String(imageMenuOpen));
  if(imageMenuOpen){$('image-composer-model-search').value='';populateImageModelMenu();$('image-composer-model-search').focus();}
};
$('image-composer-model-search').oninput=()=>populateImageModelMenu($('image-composer-model-search').value);
$('image-composer-train').onclick=()=>{
  closeImageModelMenu();
  if(!busy)void hf.open();
};
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){moodUI.close();if($('soul-pro-identity-dialog').open){$('soul-pro-identity-dialog').close();return;}closeImageModelMenu();toggleImageSettings(false);closeComposerLibrary();}
});
document.addEventListener('click',e=>{
  if(imageMenuOpen&&!e.target.closest('.composer-model-wrap'))closeImageModelMenu();
  if(!e.target.closest('#composer-moods,#image-composer-moods'))moodUI.close();
});
imageComposer.addEventListener('dragover',e=>{
  if(e.dataTransfer?.types.includes('Files')){e.preventDefault();imageComposer.classList.add('is-dragging');}
});
imageComposer.addEventListener('dragleave',e=>{
  if(!imageComposer.contains(e.relatedTarget))imageComposer.classList.remove('is-dragging');
});
imageComposer.addEventListener('drop',e=>{
  e.preventDefault();imageComposer.classList.remove('is-dragging');
  if(!owner||busy||tool!=='image')return;
  const list=[...(e.dataTransfer?.files||[])].filter(f=>f.type.startsWith('image/'));
  if(!list.length)return;
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
let videoSelectionRevision=0;
function updateVideoInspector(job){
  if(!videoInspector)return;
  $('video-inspector-empty').hidden=!!job;
  $('video-inspector-selected').hidden=!job;
  if(!job){$('video-detail-status').textContent='';return;}
  const settings=job.settings||{},ready=hasResult(job);
  $('video-detail-status').textContent=String(job.status||'').replace(/^./,c=>c.toUpperCase());
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
function showVideoHistoryRecord(job,{play=true}={}){
  if(!job||!owner)return;
  selectedVideoJob=job;
  ++videoSelectionRevision;
  updateVideoInspector(job);
  if(play&&hasResult(job)&&tool==='video'){
    void viewMedia(()=>openVideo(job,{scroll:false}));
  } else if(tool==='video'&&!hasResult(job)&&!file){
    if(resultUrl)clearResult();
    resetPreview();
  }
}
function restoreLatestVideoSelection(){
  if(tool!=='video'||!owner)return;
  const available=[...videoJobCache.values()];
  if(!available.length){
    selectedVideoJob=null;
    updateVideoInspector(null);
    $('video-feed-empty').hidden=false;
    return;
  }
  $('video-feed-empty').hidden=true;
  if(selectedVideoJob&&videoJobCache.has(selectedVideoJob.id)){
    selectedVideoJob=videoJobCache.get(selectedVideoJob.id);
    updateVideoInspector(selectedVideoJob);
    return;
  }
  showVideoHistoryRecord(available[0],{play:false});
}
function syncVideoStudioMode(){
  if(!mainWorkspace)return;
  const videoMode=tool==='video'&&!fashionActive;
  $('app').classList.toggle('video-studio-active',videoMode);
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
    selectedVideoJob=null;videoJobCache.delete(job.id);
    await syncHistory();restoreLatestVideoSelection();
    notify('Video record deleted. Spending history is unchanged.');
  });
};

/* The canvas is a genuine import surface, not a dead decorative placeholder. */
/* Studio entry actions are UI only: never trigger paid requests. */
function emptyExperience(){
  if(tool==='upscale')return {
    title:'Upscale',
    description:'Enhance resolution and detail. Keep your original composition.',
    action:'source',button:'Upload image',secondary:'',secondaryAction:'',
    footnote:'UPSCALED OUTPUTS ARE SAVED IN ASSETS'
  };
  if(tool==='video'){
    if(mode==='extend')return {title:'Continue the scene.',description:'Upload a video and describe what happens next.',action:'extend',button:'Choose a video',secondary:'Write the direction',secondaryAction:'prompt',footnote:'YOUR ORIGINAL VIDEO STAYS UNCHANGED'};
    if(mode==='text')return {
      title:'Imagine the next scene.',
      description:'Describe a place, a movement or a moment worth seeing.',
      action:'prompt',button:'Write a direction',secondary:'Create an image first',secondaryAction:'image',
      footnote:'START WITH A DIRECTION'
    };
    if(mode==='reference')return {
      title:'Build from your references.',
      description:'Bring images, motion and atmosphere into a single visual direction.',
      action:'references',button:'Add references',secondary:'Write the direction',secondaryAction:'prompt',
      footnote:'YOUR REFERENCES STAY SEPARATE FROM GENERATED RESULTS'
    };
    return {
      title:'Your next scene starts here.',
      description:'Begin with a still, then shape its motion, light and atmosphere.',
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
$('upscale-engine').onchange=()=>{if(busy)return;const value=$('upscale-engine').value;upscaleEngine=Object.hasOwn(UPSCALE_MODELS,value)?value:'spicy';invalidateUpscalePrice('Upscale method changed. Check the price again before upscaling.');setTool('upscale');};
for(const id of ['upscale-topaz-model','upscale-scale'])$(id).onchange=()=>{if(busy)return;invalidateUpscalePrice('Upscale settings changed. Check the price and output size again.');update();};
$('tool-fashion').onclick=()=>void openFashionStudio();
$('tool-image').onclick=()=>{if(!busy)setTool('image');};$('tool-video').onclick=()=>{if(!busy)setTool('video');};
$('image-engine').onchange=()=>{if(busy)return;const value=$('image-engine').value;imageRatioExplicit=false;soulRatioExplicit=false;imageEngine=['flash','kling'].includes(value)?value:value==='gemini'?'gemini':value==='soulpro'?'soulpro':value==='soul'?'soul':value==='fal'?'fal':'seedream';poseMapSourceId=null;$('pose-preview-status').textContent='';$('image-processing').value=imageProcessing;setTool('image');renderReferences();};
$('image-processing').onchange=()=>{if(busy)return;imageProcessing=$('image-processing').value==='batch'?'batch':'normal';setTool('image');};
function updateSoulProModelUi(){
  $('hf-settings').hidden=soulProModel!=='soul2';$('soul-pro-reference-profile').hidden=soulProModel==='soul2';
  $('soul-pro-seed').min=soulProModel==='soul2'?'1':'0';$('soul-pro-seed').max=soulProModel==='soul2'?'1000000':'2147483647';
  $('soul-pro-quality-row').hidden=soulProModel!=='ideogram45';
  $('soul-pro-note').textContent=soulProModel==='soul2'?'Official Higgsfield Soul 2. Create Soul IDs from photos in this Lab; Qwen LoRAs are not compatible.':soulProModel==='ideogram45'?'Precise Edit stays enabled at every quality tier. Medium is the default at $0.06; High is optional at $0.22.':'Kontext Max accepts 4 images total, so PV Lab sends the base image first plus up to 3 saved Nina identity references. Fixed estimate: $0.08 per image.';
}
$('soul-pro-model').onchange=()=>{if(busy)return;soulProModel=['soul2','kontextmax'].includes($('soul-pro-model').value)?$('soul-pro-model').value:'ideogram45';updateSoulProModelUi();update();};
$('soul-pro-quality').onchange=()=>{if(busy)return;soulProQuality=['very_low','low','medium','high'].includes($('soul-pro-quality').value)?$('soul-pro-quality').value:'medium';update();};
const sessionRequest=createSessionRequest({baseUrl:API,getSession:()=>clerk?.session});
async function api(path,options={}) {
  const generation=epoch;
  if(!owner&&path!=='/api/session')throw new Error('Sign in first.');
  const assertCurrent=()=>{if(generation!==epoch)throw new Error('Session changed.');};
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),path==='/api/gemini/jobs'||path==='/api/image-models/generate'?240000:path==='/api/fal/soul-pro'||path==='/api/jobs'&&options.method==='POST'?150000:path==='/api/soul/datasets'?120000:65000);requestControllers.add(controller);
  try{
    const headers={...options.headers};let b=options.body;
    if(b!==undefined&&!(b instanceof Blob)&&!(b instanceof ArrayBuffer)){headers['Content-Type']='application/json';b=JSON.stringify(b);}
    const r=await sessionRequest(path,{method:options.method||'GET',headers,body:b,cache:'no-store',credentials:'omit',signal:controller.signal},assertCurrent);
    assertCurrent();
    if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.error||`Request failed (${r.status}).`);}
    const value=options.blob?await r.blob():await r.json();assertCurrent();return value;
  }finally{clearTimeout(timeout);requestControllers.delete(controller);}
}
async function action(fn){if(busy)return;busy=true;update();try{await fn();}catch(e){notify(e.name==='AbortError'?'Request interrupted. Refresh history before trying another generation.':e.message,true);}finally{busy=false;update();}}
async function viewMedia(fn){const generation=epoch;try{await fn();}catch(e){if(owner&&generation===epoch)notify(e.message,true);}}
const soul=createSoulController({api,action,notify,changed:update,owner:()=>owner,modeChanged:()=>setTool('image')});
function clearResult(){previewRevision++;if(resultUrl){$('preview').removeAttribute('src');$('preview').hidden=true;}release(resultUrl);resultUrl=null;resultId=null;resultSettings=null;$('video').pause();$('video').removeAttribute('src');$('video').load();$('video').hidden=true;$('download').hidden=true;}
function resetPreview(){
  clearResult();
  if(tool==='video'&&mode==='extend'&&mediaRefs.firstVideo()){const clip=mediaRefs.firstVideo();$('video').src=clip.url;$('video').hidden=false;$('preview').hidden=true;$('empty').hidden=true;$('preview-label').textContent='Video to extend';return;}
  // Image generation has a result-only canvas. Inputs remain in the reference list.
  const item=tool==='image'&&imageEngine!=='soulpro'||tool==='video'&&mode==='text'?null:(tool==='upscale'||mode==='start')?
    (sourceUrl?{url:sourceUrl,label:tool==='upscale'?'Upscale input':'Start frame'}:null):
    (references[0]?{url:references[0].url,label:'Reference 1 / input'}:null);
  $('preview').alt='Uploaded source image, not a generated result';
  if(item){$('preview').src=item.url;$('preview').hidden=false;$('empty').hidden=true;$('preview-label').textContent=tool==='video'?item.label:item.label+' / not a result';}
  else{
    $('preview').removeAttribute('src');$('preview').hidden=true;$('empty').hidden=false;
    $('preview-label').textContent=tool==='image'?'Result / Image':'Source / preview';
    refreshCanvasImport();
  }
}
function refreshInputPreview(){autoPreview=null;if(tool!=='image'||!resultUrl)resetPreview();}
function releaseReference(item){release(item.url);release(item.thumbUrl);}
function closeInputPreview(){const dialog=$('input-preview-dialog');if(dialog.open)dialog.close();$('input-preview-image').removeAttribute('src');}
function viewReference(item,index){
  if(!owner)return;
  $('input-preview-title').textContent='Reference '+(index+1)+' / Input';
  $('input-preview-description').textContent=item.file.name+' / '+item.width+' × '+item.height+' pixels in the original. Display preview only, not a generated result.';
  $('input-preview-image').src=item.url;
  $('input-preview-dialog').showModal();
}
$('input-preview-dialog').addEventListener('close',()=>{$('input-preview-image').removeAttribute('src');});

function clearMedia(){imageRatioExplicit=false;soulRatioExplicit=false;customerImagePricing?.reset();clearUpscalePrice();mediaRefs.clear();cancelImagePreparation();closeInputPreview();poseMapSourceId=null;$('pose-preview-status').textContent='';$('reference-progress').textContent='';imageRevision++;sourcePixels=0;sourceWidth=0;sourceHeight=0;release(sourceUrl);release(lastUrl);sourceUrl=null;lastUrl=null;file=null;sourceId=null;lastFile=null;lastSourceId=null;$('image').value='';$('last-image').value='';for(const r of references)releaseReference(r);references=[];$('reference-images').value='';$('filemeta').textContent=sourceHelp();$('last-filemeta').textContent='Leave empty for an open ending.';renderReferences();clearResult();resetPreview();update();}
async function inspectImage(candidate){
  if(!candidate||!['image/jpeg','image/png','image/webp'].includes(candidate.type)||!candidate.size||candidate.size>20*1024*1024)throw new Error('Choose a JPG, PNG or WebP image up to 20 MB.');
  const seedanceInput=tool==='video'&&engine==='seedance',maxSide=tool==='upscale'?16000:seedanceInput?6000:8000;
  const prepared=await imagePreview(candidate),{width,height}=prepared;
  if(Math.min(width,height)<(seedanceInput?300:240)||Math.max(width,height)>maxSide||Math.max(width/height,height/width)>(seedanceInput?2.5:8))throw new Error('Use an image within the model dimensions and aspect ratio, up to '+maxSide.toLocaleString()+' pixels per side.');
  return {file:candidate,id:null,url:URL.createObjectURL(prepared.preview),thumbUrl:URL.createObjectURL(prepared.thumbnail),width,height};
}

async function setImage(candidate,id=null){const revision=++imageRevision,item=await inspectImage(candidate);release(item.thumbUrl);if(revision!==imageRevision||!owner){release(item.url);return false;}release(sourceUrl);clearResult();file=item.file;sourceId=id;sourceUrl=item.url;sourceWidth=item.width;sourceHeight=item.height;sourcePixels=item.width*item.height;if(isSoul2()&&!soulRatioExplicit)$('hf-bar-ratio').value='source';syncDefaultRatio(!imageRatioExplicit);$('filemeta').textContent=`${candidate.name||'Start frame'} / ${item.width} × ${item.height} / ${(candidate.size/1048576).toFixed(1)} MB`;resetPreview();update();return true;}
async function setLastImage(candidate,id=null){const e=epoch,item=await inspectImage(candidate);release(item.thumbUrl);if(e!==epoch||!owner){release(item.url);return false;}release(lastUrl);lastFile=item.file;lastSourceId=id;lastUrl=item.url;$('last-filemeta').textContent=`${candidate.name||'Last frame'} / ${item.width} × ${item.height} / ${(candidate.size/1048576).toFixed(1)} MB`;update();return true;}
function renderReferences(){
  if(usesReferenceGuidance()&&references.length){
    if(referencesOnly()){for(const r of references)if(r.role==='base')r.role=r.nonBaseRole||'none';}
    else{if(references[0].role!=='base')references[0].nonBaseRole=references[0].role;references[0].role='base';for(const r of references.slice(1))if(r.role==='base')r.role=r.nonBaseRole||'none';}
  }
  const box=$('reference-list'),scroll=box.scrollTop,fragment=document.createDocumentFragment();
  references.forEach((r,i)=>{
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
    const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.onclick=()=>{if(busy)return;closeInputPreview();releaseReference(r);references.splice(i,1);if(imageEngine==='fal')poseMapSourceId=null;renderReferences();refreshInputPreview();update();};
    const up=document.createElement('button');up.type='button';up.textContent='Up';up.disabled=i===0||(usesReferenceGuidance()&&i===1&&references[0].role==='base');up.onclick=()=>{if(busy||i===0)return;closeInputPreview();[references[i-1],references[i]]=[references[i],references[i-1]];if(imageEngine==='fal')poseMapSourceId=null;renderReferences();refreshInputPreview();update();};
    controls.append(up,remove);item.append(img,fields,controls);fragment.append(item);
  });
  syncDefaultRatio();box.replaceChildren(fragment);box.scrollTop=scroll;$('ref-count').textContent=`${references.length} / ${referenceLimit()}`;
}
async function addReferences(list,ids=[],labels=[]){
  const e=epoch,incoming=[...list];if(imageEngine==='fal')poseMapSourceId=null;if(references.length+incoming.length>referenceLimit())throw new Error('This mode supports up to '+referenceLimit()+' image references.');
  autoPreview=null;$('reference-list').setAttribute('aria-busy','true');let added=0;
  try{
    for(let i=0;i<incoming.length;i++){
      $('reference-progress').textContent='Preparing reference '+(i+1)+' of '+incoming.length+'…';
      const item=await inspectImage(incoming[i]);
      if(e!==epoch||!owner){releaseReference(item);return;}
      item.id=ids[i]||null;item.role=imageEngine==='soulpro'?'identity':labels[i]?.role||'none';item.note=imageEngine==='soulpro'?'':labels[i]?.note||'';item.target=labels[i]?.target||'';if(usesReferenceGuidance()){if(!referencesOnly()&&!references.length){item.nonBaseRole=item.role;item.role='base';}else if(item.role==='base')item.role='none';}references.push(item);added++;
      renderReferences();refreshInputPreview();update();
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  }finally{
    if(e===epoch){$('reference-list').setAttribute('aria-busy','false');$('reference-progress').textContent=added?added+' reference'+(added===1?'':'s')+' ready. Originals kept unchanged.':'';}
  }
}

function referenceLimit(){if(tool==='image'&&imageEngine==='flash')return 14;if(tool==='image'&&imageEngine==='kling')return 1;return tool==='video'?VIDEO_MODELS[engine].maxImages:tool==='image'&&imageEngine==='soulpro'?4:tool==='image'&&imageEngine==='soul'?soul.referenceLimit():tool==='image'&&imageEngine==='fal'?5:10;}
function configureVideoControls(){
  const isVideo=tool==='video',model=VIDEO_MODELS[engine],sd=engine==='seedance',h3=engine==='h3',h3max=engine==='h3max',h3spicy=engine==='h3spicy',h3maxfal=engine==='h3maxfal',omni=engine==='omni',minimax=h3||h3max||h3spicy||h3maxfal;
  $('app').classList.toggle('video-extend-active',isVideo&&mode==='extend');
  $('video-task-switch').hidden=!isVideo||!sd;
  $('video-create-task').setAttribute('aria-selected',String(mode!=='extend'));
  $('mode-extend').setAttribute('aria-selected',String(mode==='extend'));
  $('video-modes').hidden=!isVideo||mode==='extend';
  $('extend-help').hidden=!isVideo||mode!=='extend';
  $('video-media-label').textContent=mode==='extend'?'Video to extend':'Video references';
  $('video-media-title').textContent=mode==='extend'?'Add a video':'Add motion or camera references';
  $('video-references').multiple=mode!=='extend';
  $('video-model-control').hidden=!isVideo;$('video-engine').value=engine;
  if(!model.modes.includes(mode))mode=model.modes[0];
  $('mode-start').hidden=!isVideo||!model.modes.includes('start');
  $('mode-reference').hidden=!isVideo||!model.modes.includes('reference');
  $('mode-text').hidden=!isVideo||!model.modes.includes('text');
  for(const m of ['start','reference','text']){$('mode-'+m).classList.toggle('active',mode===m);$('mode-'+m).setAttribute('aria-selected',String(mode===m));}
  $('start-mode').hidden=tool==='image'&&imageEngine!=='soulpro'||isVideo&&mode!=='start';$('reference-mode').hidden=tool==='upscale'||isVideo&&!['reference','extend'].includes(mode)||tool==='image'&&['soul','soulpro'].includes(imageEngine);
  $('reference-media').hidden=!isVideo||!sd||!['reference','extend'].includes(mode);
  $('start-frame-maker').hidden=!isVideo||mode!=='reference'||sd;
  if(isVideo){
    const ratio=$('ratio').value,duration=Number($('duration').value)||15;
    const ratios=mode==='extend'?['auto']:omni?model.ratios:(sd||minimax)&&mode==='start'?['auto']:(!sd&&!minimax&&mode==='start'?[...model.ratios,'21:9']:model.ratios);
    const defaultRatio=omni?'16:9':sd&&mode==='start'?'auto':ratios.includes(ratio)?ratio:(ratios.includes('auto')?'auto':ratios[0]);
    options('ratio',ratios,defaultRatio);
    $('ratio').parentElement.hidden=mode==='extend'||(sd||minimax)&&mode==='start'&&!omni;
    const durations=(sd||minimax||omni)?Array.from({length:model.maxSeconds-model.minSeconds+1},(_,i)=>i+model.minSeconds):[5,10,15,30];
    $('duration').replaceChildren(...durations.map(n=>new Option(n+' sec',String(n))));
    if(duration>=model.minSeconds&&duration<=30&&!([...$('duration').options].some(o=>Number(o.value)===duration)))$('duration').add(new Option(duration+' sec',String(duration)));
    $('duration').value=duration>=model.minSeconds&&duration<=model.maxSeconds?duration:Math.max(5,model.minSeconds);
    const currentResolution=$('resolution').value;
    $('resolution').replaceChildren(...model.resolutions.map(r=>new Option(r.toUpperCase(),r)));
    $('resolution').value=model.resolutions.includes(currentResolution)?currentResolution:(model.resolutions.includes('768p')?'768p':model.resolutions[0]);
    $('engine-name').textContent=model.label.toUpperCase();
    $('mode-heading').textContent='Create video';
    $('prompt').maxLength=h3maxfal||omni?6000:minimax?7000:sd?5000:6000;
    $('prompt-label').textContent='Prompt';
    $('prompt').placeholder=mode==='extend'?'Describe what happens next…':'Describe the movement, scene and sound…';
    $('seed').closest('details').hidden=mode==='extend';
    $('video-model-note').textContent=sd?'Seedance 2.5 Standard / 4–30s / up to 1080p. Start frame follows your image ratio. Reference mode supports image, video and audio guidance. Provider policies and refusals remain in force.':h3maxfal?'H3 Max Reference on fal.ai / 5–15s / 480p–1080p / up to 12 image references. fal.ai safety checking is enabled, and provider/model/account rules can reject a request.':omni?'Gemini Omni Flash 1.1 on fal.ai / 3–10s / 360p–4K / Start, Reference and Text modes. Google/fal safety filters apply.':engine==='wanprime'?'Wan 3.0 Prime / faster Wan render / 2–30s / 480p–1080p / same Start frame and Reference modes as Wan 3.0. Higher live provider price.':engine==='h3'||engine==='h3max'||engine==='h3spicy'?'MiniMax H3 family on SpicyAPI. Available modes and resolution depend on the selected variant.':'Wan 3.0 / Start frame or image references. 21:9 start-frame mode makes a private local center crop, keeps your original, then uses Wan adaptive ratio because Wan rejects an explicit 21:9 parameter. Provider policies and model refusals apply.';
  }
  $('reference-drop').querySelector('small').textContent='Up to '+referenceLimit()+' images';
  $('ref-count').textContent=references.length+' / '+referenceLimit();
}
function setMode(nextMode){const modes=VIDEO_MODELS[engine].modes;mode=modes.includes(nextMode)?nextMode:modes[0];configureVideoControls();resetPreview();update();}
$('mode-extend').onclick=()=>{if(!busy)setMode('extend');};
$('video-create-task').onclick=()=>{if(!busy)setMode('reference');};
$('mode-text').onclick=()=>{if(!busy)setMode('text');};
$('video-engine').onchange=()=>{
  if(busy)return;
  const requested=$('video-engine').value;
  if(!Object.hasOwn(VIDEO_MODELS,requested)||!config.videoEngines?.includes(requested)){$('video-engine').value=engine;notify('The backend has not enabled this model yet.',true);return;}
  if(references.length>VIDEO_MODELS[requested].maxImages){$('video-engine').value=engine;notify('Remove excess references or save an image pack before choosing this model.',true);return;}
  if(requested!=='seedance'&&mediaRefs.count()){$('video-engine').value=engine;notify('Remove video/audio references before changing model. Your inputs have been kept.',true);return;}
  engine=requested;currentQuote=null;if($('quote-dialog').open)$('quote-dialog').close();
  if(engine==='seedance'){$('duration').value='5';$('resolution').value='720p';}
  else if(engine==='h3'){$('duration').value='5';$('resolution').value='768p';}
  else if(engine==='h3max'){$('duration').value='5';$('resolution').value='768p';}
  else if(engine==='h3spicy'){$('duration').value='5';$('resolution').value='768p';}
  else if(engine==='h3maxfal'){$('duration').value='5';$('resolution').value='768p';mode='reference';}
  else if(engine==='omni'){$('duration').value='8';$('resolution').value='720p';}
  configureVideoControls();resetPreview();update();
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
async function ensureInputs(){if(tool==='video'&&mode==='extend'){const inputs=await mediaRefs.inputs();if(inputs.referenceVideoIds.length!==1)throw new Error('Choose exactly one video to extend.');return {sourceId:inputs.referenceVideoIds[0],lastSourceId:null,referenceSourceIds:[],referenceVideoIds:inputs.referenceVideoIds,referenceAudioIds:[]};}if(imageEngine==='soulpro'&&tool==='image')return {sourceId:await ensureSource(),lastSourceId:null,referenceSourceIds:[]};if(isReinterpret())return {sourceId:await ensureSource(),lastSourceId:null,referenceSourceIds:[]};if(tool==='image'&&imageEngine==='soul'){if(references.length)throw new Error('This LoRA mode cannot edit an input photo. Nothing was submitted.');return {sourceId:null,lastSourceId:null,referenceSourceIds:[]};}if(tool==='video'&&['seedance','h3','h3max','h3maxfal','omni'].includes(engine)){if(mode==='text')return {sourceId:null,lastSourceId:null,referenceSourceIds:[],referenceVideoIds:[],referenceAudioIds:[]};if(mode==='reference'){const ids=references.length?await ensureReferences():[];return {sourceId:ids[0]||null,lastSourceId:null,referenceSourceIds:ids,...(engine==='seedance'?await mediaRefs.inputs():{referenceVideoIds:[],referenceAudioIds:[]})};}}if(tool==='upscale')return {sourceId:await ensureSource(),lastSourceId:null,referenceSourceIds:[]};if(tool==='image'&&!references.length)return {sourceId:null,lastSourceId:null,referenceSourceIds:[]};if(tool==='image'||mode==='reference'){const ids=await ensureReferences();return {sourceId:ids[0],lastSourceId:null,referenceSourceIds:ids};}return {sourceId:await ensureSource(),lastSourceId:await ensureLast(),referenceSourceIds:[]};}
function applyConfig(c){c={...config,...c};config=c;hf.configure(c.higgsfieldEnabled);updateSoulProModelUi();soul.configure(c);$('soul-launch-note').textContent=c.soulTrainingEnabled?'FAL training is ready. Train from 20–80 photos, then use the character in Image.':'FAL training is not available on this Worker.';$('soul-launch-manage').disabled=!c.soulTrainingEnabled;const soulOption=$('image-engine').querySelector('[value=soul]'),soulProOption=$('image-engine').querySelector('[value=soulpro]'),falOption=$('image-engine').querySelector('[value=fal]');if(soulOption)soulOption.disabled=!c.soulTrainingEnabled;if(soulProOption)soulProOption.disabled=false;if(falOption)falOption.disabled=!c.falEnabled;if((imageEngine==='soul'&&!c.soulTrainingEnabled)||((imageEngine==='fal'||imageEngine==='soulpro'&&!isSoul2())&&!c.falEnabled)){imageEngine='seedream';$('image-engine').value='seedream';setTool('image');}for(const option of $('video-engine').options)option.disabled=!c.videoEngines?.includes(option.value);$('connection-status').textContent=(c.enabled?'SpicyAPI connected':'SpicyAPI disconnected')+(c.geminiEnabled?' · Gemini connected':'')+(c.openrouterEnabled?' · OpenRouter connected':'')+(c.soulTrainingEnabled?' · FAL training ready':'')+(c.falEnabled?' · FAL controls ready':'')+' / Private archive ready';update();}
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
$('clear').onclick=()=>{moodUI.clear(true);clearMedia();notify('Editor cleared. Saved work is unchanged.');};
for(const id of ['prompt','duration','resolution','ratio','seed','audio','output-format','image-count','pose-strength','identity-strength','controlled-pose-seed'])$(id).addEventListener('input',()=>{autoPreview=null;if(id==='ratio'&&tool==='image')imageRatioExplicit=true;if(id==='pose-strength')$('pose-strength-value').textContent=Number($('pose-strength').value).toFixed(2);if(id==='identity-strength')$('identity-strength-value').textContent=Number($('identity-strength').value).toFixed(2);update();});
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
  const data=await api(q.provider==='Higgsfield'?'/api/higgsfield/generate':'/api/jobs',{method:'POST',body:{quoteId:q.id,confirm:true}});
  if($('quote-dialog').open)$('quote-dialog').close();
  resetPreview();autoPreview={id:data.job.id,revision:previewRevision};setActive(data.job);surfaceHistoryJob(data.job);refreshHistorySoon();
  const failed=['failed','uncertain','resolved'].includes(data.job.status);
  const destination=q.settings.mode==='upscale'?'Upscaled images below and Assets':'History';
  notify(failed?(data.job.error||(q.settings.mode==='upscale'?'The upscale was not confirmed. Check Queue and Upscaled images before trying again.':'The generation was not confirmed. Check History before another attempt.')):
    (['image','upscale'].includes(q.settings.mode)?(q.settings.mode==='upscale'?'Upscale requested.':'Image requested.')+(q.priceIsEstimate?' Estimated provider charge: '+money(q.estimatedUsd)+' USD. Not a guaranteed maximum. Results appear in '+destination+'.':' Quoted maximum: '+money(q.maxUsd)+' USD. Results appear in '+destination+'.'):'Generation request recorded. You can leave the page and return to History.'),failed);
}
$('generate').onclick=()=>{if(tool==='image')return submitImageSnapshot();return action(async()=>{
  if(tool==='upscale'&&!isFalUpscale())notify('Preparing your image and checking the live price. Nothing submitted yet…');
  const provider=currentProvider();if(provider==='spicy'&&!config.enabled){connection();return;}if(provider==='gemini'&&!config.geminiEnabled)throw new Error('Gemini API key is not available on the Lab backend.');if(provider==='fal'&&!config.falEnabled)throw new Error('FAL API key is not available on the Lab backend.');
  if(submissionBlocked())throw new Error('An active-job limit or an interrupted request blocks another generation. Check History.');
  const selectedTool=tool,sessionEpoch=epoch;
  if(selectedTool==='upscale'&&isFalUpscale()){
    updateUpscalePrice();
    let checked=upscaleQuote;
    if(!checked||upscaleQuoteNeedsCheck||checked.key!==upscalePriceKey()){
      const originals=await ensureInputs(),key=upscalePriceKey(),selected=settings();
      upscaleQuoteNeedsCheck=true;upscalePriceMessage='Checking estimated price and output dimensions before Topaz submission…';updateUpscalePrice();
      const q=await api('/api/quotes',{method:'POST',body:{...originals,settings:selected}});
      if(!owner||epoch!==sessionEpoch||tool!=='upscale'||key!==upscalePriceKey())throw new Error('Image, settings or session changed before Topaz submission. Nothing was submitted.');
      validateUpscaleQuote(q,selected);
      checked={quote:q,key,manual:false};upscaleQuote=checked;upscaleQuoteNeedsCheck=false;upscaleManualReviewRequired=false;upscaleManualReviewKey='';upscalePriceMessage='';updateUpscalePrice();
    }else{
      validateUpscaleQuote(checked.quote,settings());
    }
    const usedManualEstimate=checked.manual===true,reviewKey=checked.key;
    invalidateUpscalePrice('Submitting Topaz with the checked estimate. If interrupted, refresh History before another attempt.');
    await submitQuotedGeneration(checked.quote,sessionEpoch);
    if(usedManualEstimate)requireUpscaleManualReview(reviewKey,'Estimate used. Check price & size again before another Topaz upscale.');
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




  const inputs=await prepareQuoteInputs(await ensureInputs());if(!inputs)return;

  notify(selectedTool==='upscale'?'Checking live upscale price before submission…':'Requesting a live price. No generation submitted.');
  const q=await api('/api/quotes',{method:'POST',body:{...inputs,settings:settings()}});
  if(!owner||epoch!==sessionEpoch||tool!==selectedTool)throw new Error('Session or tool changed. No generation submitted.');
  if(selectedTool==='upscale'){
    if(q.settings.type!=='image'||q.settings.mode!=='upscale')throw new Error('Unexpected upscale quote. No generation submitted.');
    await submitQuotedGeneration(q,sessionEpoch);
    return;
  }
  if(selectedTool==='video'&&['seedance','h3maxfal','omni'].includes(engine)&&(q.settings.engine!==engine||q.settings.mode!==mode||q.settings.model!==VIDEO_MODELS[engine].endpoints[mode]))throw new Error('Provider quote does not match the selected video model and mode. Nothing was submitted.');
  currentQuote=q;const isImage=q.settings.type==='image',modeName=q.settings.mode==='extend'?'Extend Video':q.settings.mode==='text'?'Text to Video':q.settings.mode==='reference'?'Reference to Video':'Image to Video';
  $('quote-settings').textContent=q.settings.mode==='upscale'?`Image Upscaler / ${q.settings.resolution.toUpperCase()} / ${q.settings.outputFormat.toUpperCase()} / source ratio kept`:isImage?`Seedream 5.0 Pro / ${q.settings.referenceSourceIds.length?'Reference Edit':'Text to Image'} / ${q.settings.resolution.toUpperCase()} / ${q.settings.aspectRatio}`:`${videoLabel(q.settings)} / ${modeName} / ${q.settings.duration}s / ${q.settings.resolution}`;
  $('quote-price').textContent=customerMode?wallet.describe(q.maxUsd):money(q.estimatedUsd);$('quote-limit').textContent=customerMode?`Credit maximum reserved: ${wallet.describe(q.maxUsd)}`:q.priceIsEstimate?`Estimated provider charge: ${money(q.maxUsd)} USD`:`Quoted maximum: ${money(q.maxUsd)} USD`;
  $('quote-expiry').textContent='Valid until '+new Date(q.expiresAt).toLocaleTimeString()+'. No automatic repricing. '+(q.settings.transferNotes||[]).join(' ');
  $('quote-notice').textContent=q.notice||'';$('confirm-generation').disabled=false;$('quote-dialog').showModal();
});};
$('confirm-generation').onclick=async()=>{
  const q=currentQuote;if(!q||busy)return;
  if(Date.now()>=q.expiresAt){$('quote-notice').textContent='Quote expired. Close and review a new price.';return;}
  $('confirm-generation').disabled=true;
  await action(()=>submitQuotedGeneration(q));
};
function limitFor(kind){const n=Number(config.concurrency?.[kind]);return Number.isInteger(n)&&n>0?n:1;}
function currentProvider(){if(tool==='video'&&engine==='seedance'&&mode==='extend')return 'higgsfield';if(tool==='image'&&imageEngine==='flash')return 'openrouter';if(tool==='image'&&imageEngine==='kling')return 'fal';if(isSoul2())return 'higgsfield';return isFalUpscale()?'fal':tool==='image'&&imageEngine==='gemini'?'gemini':tool==='image'&&['fal','soulpro'].includes(imageEngine)?'fal':tool==='video'&&['h3maxfal','omni'].includes(engine)?'fal':'spicy';}
function jobProvider(j){const s=j?.settings||{};if(s.provider==='openrouter'||s.engine==='flash')return 'openrouter';if(s.provider==='higgsfield')return 'higgsfield';return s.provider==='gemini'||s.engine==='gemini'||String(s.model||'').startsWith('gemini-')?'gemini':s.provider==='fal'||['fal','soulpro','h3maxfal','omni'].includes(s.engine)||String(s.model||'').startsWith('fal-ai/')?'fal':'spicy';}
function submissionBlocked(){
  const kind=tool==='upscale'?'image':tool,provider=currentProvider(),falUpscale=tool==='upscale'&&provider==='fal';
  return activeJobs.some(j=>j.status==='uncertain'&&jobProvider(j)===provider&&(!falUpscale||j.settings?.mode==='upscale'))||activeJobs.filter(j=>{const jobKind=j.settings?.type==='image'?'image':'video',backgroundBatch=j.settings?.provider==='gemini'&&j.settings?.processing==='batch';return slotStates.has(j.status)&&jobKind===kind&&!backgroundBatch&&jobProvider(j)===provider;}).length>=(provider==='higgsfield'?2:limitFor(kind));
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
  if(!activeJobs.length)$('active').open=false;
  const saving=activeJobs.filter(j=>j.status==='saving').length;
  const batchImages=activeJobs.filter(j=>slotStates.has(j.status)&&j.settings?.type==='image'&&jobProvider(j)==='gemini'&&j.settings?.processing==='batch').length;
  const spicyImages=activeJobs.filter(j=>slotStates.has(j.status)&&j.settings?.type==='image'&&jobProvider(j)==='spicy').length;
  const geminiRunning=activeJobs.filter(j=>slotStates.has(j.status)&&j.status!=='uncertain'&&j.settings?.type==='image'&&jobProvider(j)==='gemini'&&j.settings?.processing!=='batch').length;
  const geminiInterrupted=activeJobs.filter(j=>j.status==='uncertain'&&j.settings?.type==='image'&&jobProvider(j)==='gemini').length;
  const falImages=activeJobs.filter(j=>slotStates.has(j.status)&&j.settings?.type==='image'&&jobProvider(j)==='fal').length;
  const videos=activeJobs.filter(j=>slotStates.has(j.status)&&j.settings?.type!=='image').length;
  $('active-status').textContent='Seedream '+spicyImages+' / '+limitFor('image')+' · Nano '+geminiRunning+' / '+limitFor('image')+(geminiInterrupted?' · '+geminiInterrupted+' old Nano interrupted':'')+(batchImages?' · '+batchImages+' Nano batch queued':'')+' · Controlled Pose '+falImages+' / '+limitFor('image')+' · videos '+videos+' / '+limitFor('video')+(saving?' · '+saving+' saving (no generation slot)':'');
  const labels={submitting:'Submitting',queued:'Queued',running:'Generating',saving:'Saving to private archive',uncertain:'Interrupted: check provider before another attempt'};
  const providerLabel=j=>jobProvider(j)==='gemini'?'Gemini':jobProvider(j)==='openrouter'?'OpenRouter':jobProvider(j)==='fal'?'FAL':'SpicyAPI';
  $('active-detail').textContent=activeJobs.map((j,i)=>(i+1)+'. '+(j.settings?.type==='image'?'Image':'Video')+' · '+providerLabel(j)+' · '+labels[j.status]+(j.error?' · '+j.error:'')+(j.providerTaskId?' · '+j.providerTaskId:'')).join('\n');
  $('active-detail').style.whiteSpace='pre-line';
  $('resolve').hidden=!activeJobs.some(j=>j.status==='uncertain');
  schedulePoll();update();
}
function setActive(job){if(!job)return;setActiveJobs([...activeJobs.filter(j=>j.id!==job.id),job]);}
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
      const show=chosen&&autoPreview.revision===previewRevision&&!busy;
      if(chosen)autoPreview=null;
      await syncHistory();
      if(!owner||startedEpoch!==epoch)return;
      if(show&&hasResult(chosen))await openVideo(chosen,{scroll:false});
      const ready=finished.filter(hasResult).length;
      if(ready)notify(ready===1?'Result saved. View or download it from History.':ready+' results saved. View or download them from History.');
      else notify(finished[0].error||'No output file was returned. Nothing is available to download.',true);
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
  clearMedia();const p=job.settings||{};engine=engineFor(p);imageReferenceMode=p.referenceMode==='references'?'references':'base';
  if(p.mode==='upscale'){
    upscaleEngine=upscaleMode(p);$('upscale-engine').value=upscaleEngine;
    $('upscale-scale').value=String(p.scale===4?4:2);
    $('upscale-topaz-model').value=p.topazModel==='High Fidelity V3'?'High Fidelity V3':'Standard V2';
  }else if(p.type==='image'){
    imageEngine=['flash','kling'].includes(p.engine)?p.engine:p.engine==='gemini'||p.provider==='gemini'?'gemini':p.engine==='soulpro'?'soulpro':p.engine==='soul'?'soul':p.engine==='fal'||p.provider==='fal'?'fal':'seedream';
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
    if(refs){const ids=p.referenceSourceIds||[];if(ids.length){const files=await Promise.all(ids.map((id,i)=>assetFile(id,(p.referenceRoles?.[i]?.name||'reference-'+(i+1)).replace(/\.[^.]+$/,''))));await addReferences(files,ids,p.referenceRoles||[]);}}
    else if(job.sourceId&&p.mode!=='extend'){await setImage(await assetFile(job.sourceId,'start-frame'),job.sourceId);if(p.lastSourceId)await setLastImage(await assetFile(p.lastSourceId,'last-frame'),p.lastSourceId);}
  }
  if(controlledPose)poseMapSourceId=p.poseMapSourceId||null;moodUI.restore(p,true);$('prompt').value=p.moodOriginalPrompt??p.prompt??'';
  if(soulPro){$('soul-pro-model').value=soulProModel;$('soul-pro-seed').value=p.seed??'';}
  if(p.duration&&!([...$('duration').options].some(o=>Number(o.value)===p.duration)))$('duration').add(new Option(p.duration+' sec',String(p.duration)));
  $('duration').value=p.duration||15;
  if(!isFalUpscale())$('resolution').value=p.resolution||(tool==='upscale'?'4k':tool==='image'?(imageEngine==='seedream'?'1k':'2k'):'1080p');
  $('ratio').value=p.aspectRatio||'auto';$('seed').value=p.seed??'';$('audio').checked=p.audio!==false;$('output-format').value=p.outputFormat||'jpeg';
  if(controlledPose){$('pose-strength').value=String(p.poseStrength??1);$('identity-strength').value=String(p.identityStrength??0.7);$('controlled-pose-seed').value=p.seed??'';$('pose-strength-value').textContent=Number(p.poseStrength??1).toFixed(2);$('identity-strength-value').textContent=Number(p.identityStrength??0.7).toFixed(2);$('pose-preview-status').textContent=poseMapSourceId?'Saved pose map will be reused.':'';}
  if(p.engine==='seedance'||engineFor(p)==='seedance')await mediaRefs.restore(p);
  configureVideoControls();update();
  notify(tool==='upscale'?'Original image and upscale settings restored. Nothing generated or charged.':soulPro?'Base image, prompt and engine restored. The current saved Nina identity will be used. Nothing generated or charged.':'Original media, reference roles, prompt and settings restored. Nothing generated or charged.');
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
const imageDetailCache=new Map();
let imageDetailNavBusy=false;
let imageDetailSourceURL=null;
let imageDetailSourceRevision=0;
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
  $('image-detail-prev').disabled=imageDetailNavBusy;
  $('image-detail-next').disabled=imageDetailNavBusy;
}
async function navigateImageDetail(direction){
  if(!owner||imageDetailNavBusy||!$('image-lightbox').open)return;
  const items=imageDetailSequence(),position=items.findIndex(job=>job.id===imageDetailJob?.id);
  const next=items[position+direction];
  if(!next||position<0)return;
  imageDetailNavBusy=true;
  refreshImageDetailNavigation();
  try{await openVideo(next,{scroll:false,detail:true});}
  catch(error){if(owner)notify('Unable to open this image. '+error.message,true);}
  finally{imageDetailNavBusy=false;refreshImageDetailNavigation();}
}
function releaseImageDetailSource(){
  ++imageDetailSourceRevision;
  if(imageDetailSourceURL){release(imageDetailSourceURL);imageDetailSourceURL=null;}
  $('image-detail-reference-thumb').hidden=true;
  $('image-detail-reference-thumb').removeAttribute('src');
  $('image-detail-reference-wrap').hidden=true;
}
function showImageDetailSource(job){
  releaseImageDetailSource();
  const refIds=[job.sourceId,...(Array.isArray(job.settings?.referenceSourceIds)?job.settings.referenceSourceIds:[])]
    .filter((value,index,items)=>typeof value==='string'&&value&&items.indexOf(value)===index);
  if(!refIds.length)return;
  const assetId=refIds[0],revision=imageDetailSourceRevision;
  $('image-detail-reference-caption').textContent=refIds.length===1?'Source image':'Source image · '+refIds.length+' references';
  void assetBlob(assetId).then(blob=>{
    if(!owner||revision!==imageDetailSourceRevision||imageDetailJob?.id!==job.id||!$('image-lightbox').open)return;
    if(!blob?.type.startsWith('image/'))return;
    imageDetailSourceURL=URL.createObjectURL(blob);
    const img=$('image-detail-reference-thumb');
    img.src=imageDetailSourceURL;
    img.hidden=false;
    $('image-detail-reference-wrap').hidden=false;
  }).catch(()=>{/* Reference thumbnail is optional, never block viewing the generated result. */});
}

function detailModelName(job){
  const settings=job?.settings||{};
  if(settings.mode==='upscale')return upscaleName(settings);
  if(settings.engine==='flash')return 'Seedream Flash';
  if(settings.engine==='kling')return 'Kling V3';
  if(settings.engine==='gemini')return 'Nano Banana Pro';
  if(settings.provider==='higgsfield')return settings.mode==='soul-id-training'?'Soul ID training':'PV Soul';
  if(settings.engine==='soulpro')return 'PV Soul Pro';
  if(settings.engine==='soul')return 'PV Soul';
  if(settings.engine==='fal')return 'Controlled Pose';
  return 'Seedream 5 Pro';
}
function galleryImageModelName(job){
  const s=job?.settings||{};
  if(s.engine==='soulpro'&&s.soulProModel==='ideogram45')return 'Ideogram 4.5';
  if(s.engine==='soulpro'&&s.soulProModel==='kontextmax')return 'FLUX Kontext Max';
  if(s.engine==='soulpro'&&s.soulProModel==='soul2')return 'Higgsfield Soul 2';
  if(s.provider==='higgsfield'&&s.mode!=='soul-id-training')return 'Higgsfield Soul 2';
  if(s.engine==='fal'&&s.mode==='controlled-pose')return 'FLUX Controlled Pose';
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
  extra.hidden=box.children.length===0;
}
function showImageDetail(job,hasOutput,loading=false){
  if(!job||!owner)return;
  imageDetailJob=job;
  const params=job.settings||{},dialog=$('image-lightbox'),stage=$('image-lightbox-stage');
  stage.setAttribute('aria-busy',String(loading));
  stage.classList.remove('is-zoomed');stage.scrollTo({top:0,left:0,behavior:'instant'});
  $('image-lightbox-fit').setAttribute('aria-pressed','false');
  $('image-lightbox-fit').textContent='Fit';
  $('image-lightbox-fit').disabled=!hasOutput;
  $('image-lightbox-title').textContent=hasOutput||loading?'Image result':'Image record';
  $('image-detail-status').textContent=job.status?.charAt(0).toUpperCase()+String(job.status||'').slice(1);
  const mood=moodById(params.moodId),promptText=userFacingImagePrompt(params);
  // The provider's compiled styling stays in the private job record, never in
  // the customer-facing Image detail panel or its Copy action.
  $('image-detail-mood-feature').hidden=!mood;
  $('image-detail-mood-name').textContent=mood?.name||'';
  const intensity=Number(params.moodIntensity);
  $('image-detail-mood-strength').textContent=mood&&Number.isFinite(intensity)?Math.round(intensity)+'% intensity':'';
  const hasWrittenDirection=!!promptText;
  $('image-detail-prompt-header').hidden=!hasWrittenDirection;
  $('image-detail-prompt').hidden=!hasWrittenDirection;
  $('image-detail-copy').disabled=!hasWrittenDirection;
  $('image-detail-prompt-heading').textContent=mood?'Your direction':'Prompt';
  $('image-detail-prompt').textContent=promptText;
  $('image-detail-prompt').classList.toggle('is-collapsible',promptText.length>250);
  $('image-detail-prompt').classList.remove('is-expanded');
  $('image-detail-expand').setAttribute('aria-expanded','false');
  $('image-detail-expand').innerHTML='Show more <span aria-hidden="true">⌄</span>';
  $('image-detail-expand').hidden=promptText.length<=250;
  $('image-detail-metadata').open=true;
  $('image-detail-model').textContent=detailModelName(job);
  $('image-detail-mood-row').hidden=!!mood || !params.moodId;
  $('image-detail-mood-value').textContent=params.moodId?((mood?.name||'Mood')+' · '+(params.moodIntensity||60)+'%'):'';
  $('image-detail-resolution').textContent=String(params.resolution||'Source').toUpperCase();
  $('image-detail-ratio').textContent=params.aspectRatio==='auto'?'Adaptive':String(params.aspectRatio||'Original');
  $('image-detail-created').textContent=detailDate(job.createdAt);
  $('image-detail-references').textContent=String(params.referenceSourceIds?.length||0);
  $('image-detail-price').textContent=customerMode?(job.estimatedUsd!=null?wallet.jobCharge(job):'Not charged'):job.settledUsd!=null?money(job.settledUsd):job.estimatedUsd!=null?'Estimate '+money(job.estimatedUsd):'Not reported';
  $('image-detail-dimensions').textContent=loading?'Loading image…':hasOutput?'FIT TO VIEW / ORIGINAL RATIO':'NO RESULT AVAILABLE';
  $('image-lightbox-img').hidden=!hasOutput;
  $('image-lightbox-unavailable').hidden=hasOutput||loading;
  $('image-lightbox-unavailable').textContent=job.status==='uncertain'?'Provider status is unknown. Nothing will be resubmitted automatically.':job.status==='draft'?'Saved draft. Choose Reuse to continue editing.':'No finished output file is available for this record.';
  $('image-detail-status-help').hidden=!['failed','uncertain'].includes(job.status);
  $('image-detail-status-help').textContent=job.error||(job.status==='uncertain'?'Verify the provider request before trying again.':'The provider did not return an output.');
  for(const id of ['image-detail-video','image-detail-reference','image-detail-upscale','image-detail-repair','image-lightbox-download'])
    $(id).disabled=!hasOutput;
  $('image-detail-delete').disabled=activeStates.has(job.status);
  fillDetailExtraActions(job,'image');
  if(!dialog.open)dialog.showModal();
  showImageDetailSource(job);
  refreshImageDetailNavigation();
}
async function openImageRecord(job){
  if(!job||(!['image','upscale'].includes(tool)&&!assetLibrary?.active()))return;
  if(hasResult(job))return openVideo(job,{scroll:false,detail:true});
  $('image-lightbox-img').removeAttribute('src');
  showImageDetail(job,false);
}
function closeImageDetail(){
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
  if(!['seedream','gemini'].includes(imageEngine)){imageEngine='seedream';$('image-engine').value='seedream';}
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
$('image-detail-prev').onclick=()=>void navigateImageDetail(-1);
$('image-detail-next').onclick=()=>void navigateImageDetail(1);
$('image-detail-expand').onclick=()=>{
  const expanded=$('image-detail-prompt').classList.toggle('is-expanded');
  $('image-detail-expand').setAttribute('aria-expanded',String(expanded));
  $('image-detail-expand').innerHTML=expanded?'Show less <span aria-hidden="true">⌃</span>':'Show more <span aria-hidden="true">⌄</span>';
};
document.addEventListener('keydown',event=>{
  if(!$('image-lightbox').open||event.altKey||event.ctrlKey||event.metaKey||event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
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
  if(img.naturalWidth&&img.naturalHeight)
    $('image-detail-dimensions').textContent=img.naturalWidth+' × '+img.naturalHeight+' / ORIGINAL RATIO';
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
$('image-detail-reuse').onclick=()=>executeImageDetail(restore);
$('image-detail-reference').onclick=()=>executeImageDetail(useImageAsReference);
$('image-detail-mood').onclick=()=>executeImageDetail(applyMoodToImage);
$('image-detail-upscale').onclick=()=>executeImageDetail(upscaleImage);
$('image-detail-repair').onclick=()=>executeImageDetail(openRepair);
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
  ++previewRevision; // Cancel an in-flight next/previous asset fetch.
  releaseImageDetailSource();
  $('image-lightbox-img').removeAttribute('src');
  $('image-lightbox-stage').classList.remove('is-zoomed');
  $('image-detail-copy').textContent='Copy ⧉';
  $('image-detail-prompt').classList.remove('is-expanded');
  imageDetailJob=null;
  refreshImageDetailNavigation();
});

async function openVideo(job,{scroll=true,detail=false}={}){
  if(!hasResult(job))throw new Error('This job has no completed output to view or download.');
  const revision=++previewRevision;
  const imageDetail=job.settings?.type==='image'&&(tool==='image'||assetLibrary?.active()||detail);
  if(imageDetail){$('image-lightbox-img').removeAttribute('src');showImageDetail(job,false,true);}
  let blob,kind,ext;
  try{blob=await assetBlob(job.outputId);[kind,ext]=resultFormat(blob);}
  catch(error){
    if(!owner||revision!==previewRevision)return;
    if(imageDetail){showImageDetail(job,false);$('image-lightbox-unavailable').textContent='Image could not load. Close and reopen to retry.';}
    throw error;
  }
  if(!owner||revision!==previewRevision)return;
  clearResult();
  resultUrl=URL.createObjectURL(blob);resultId=job.outputId;resultKind=kind;resultExt=ext;resultSettings={...job.settings,type:kind};
  if(kind==='image'){$('preview').src=resultUrl;$('preview').alt='Generated image result';$('preview').hidden=false;$('video').hidden=true;}
  else{$('video').src=resultUrl;$('video').hidden=false;$('preview').hidden=true;}
  $('empty').hidden=true;$('download').hidden=false;$('download').textContent='Download '+kind+' / '+ext.toUpperCase();
  $('preview-label').textContent='Generated result / '+(kind==='image'?'Image':job.settings.duration+'s');update();
  if((tool==='image'||assetLibrary?.active()||detail)&&kind==='image'){
    $('image-lightbox-img').src=resultUrl;
    showImageDetail(job,true);
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
    if(engine==='seedance'&&!['text','extend'].includes(mode)){
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
  const transferSourceIds=[];
  for(const item of originals){
    if(item.file.size<=PROVIDER_IMAGE_LIMIT){transferSourceIds.push(item.id);continue;}
    let copy=workingCopies.get(item.id);
    if(!copy||Date.now()-copy.at>900000){
      snapshot?.onProgress?.('Optimizing references','Preparing a working copy; originals are kept.');
      notify('Preparing a same-dimension working copy of '+item.file.name+'…');
      const prepared=await providerWorkingCopy(item.file);
      if(epoch!==sessionEpoch||!owner)throw new Error('Session changed.');
      const id=await uploadAsset(prepared);copy={id,at:Date.now()};workingCopies.set(item.id,copy);
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

async function animateImage(job){clearMedia();setTool('video');setMode('start');await setImage(await assetFile(job.outputId,'generated-image'),job.outputId);$('prompt').value='';update();notify('Generated image loaded as the video start frame. Add motion direction and review the price.');window.scrollTo({top:0,behavior:'smooth'});}
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

async function loadPacks(){const data=await api('/api/packs');packs=data.packs;$('pack-select').replaceChildren(new Option('Choose a saved pack',''),...packs.map(p=>new Option(p.name,p.id)));if($('soul-pro-pack-select'))$('soul-pro-pack-select').replaceChildren(new Option('Choose a saved pack',''),...packs.filter(p=>p.refs?.length>=1).map(p=>new Option(p.name+' · '+p.refs.length+' ref'+(p.refs.length===1?'':'s'),p.id)));composerLibraryKey='';syncImageComposer();}
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

const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){
    if(!entry.isIntersecting)continue;
    const img=entry.target;observer.unobserve(img);const rev=historyRevision;
    assetBlob(img.dataset.asset).then(blob=>{
      if(!owner||rev!==historyRevision||!img.isConnected)return;
      if(!blob.type.startsWith('image/')||!blob.size)throw new Error('Preview unavailable');
      const u=URL.createObjectURL(blob);cardUrls.add(u);img.dataset.objectUrl=u;img.src=u;
    }).catch(()=>{
      if(!owner||rev!==historyRevision||!img.isConnected)return;
      historyPreviewFailed(img);
    });
  }
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
function updateHistorySelectionUi(){
  $('history-selection').hidden=!historySelectMode;
  $('history-select').hidden=historySelectMode;
  $('history').classList.toggle('is-selecting',historySelectMode);
  for(const card of $('history').querySelectorAll('.card')){
    const selectable=historySelectMode&&card.dataset.deletable==='true',selected=historySelected.has(card.dataset.job);
    card.classList.toggle('is-selectable',selectable);card.classList.toggle('is-selected',selected);
    if(selectable){card.tabIndex=0;card.removeAttribute('role');card.setAttribute('aria-selected',String(selected));}
    else{card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',(card.dataset.kind==='image'?'Open image':'Select video')+' details');card.removeAttribute('aria-selected');}
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
    const existing=upsert?[...$('history').children].find(el=>el.dataset.job===j.id):null,fingerprint=historyFingerprint(j);
    if(existing?.dataset.fingerprint===fingerprint)continue;
    if(j.settings.type==='image')imageDetailCache.set(j.id,j);
    const card=document.createElement('article');card.className='card';card.dataset.kind=j.settings.type==='image'?'image':'video';card.dataset.job=j.id;card.dataset.state=j.status;card.dataset.fingerprint=fingerprint;card.dataset.deletable=String(!activeStates.has(j.status));
    const proportions=String(j.settings.aspectRatio||'16:9').split(':').map(Number);const geometry=j.settings.galleryDimensions;card.dataset.ratio=String(geometry&&geometry.assetId===j.outputId&&geometry.width>0&&geometry.height>0?geometry.width/geometry.height:proportions[0]/proportions[1]||16/9);
    if(j.settings.type==='video')videoJobCache.set(j.id,j);
    const openCard=()=>{
      if(!owner||historySelectMode)return;
      if(j.settings.type==='image')void viewMedia(()=>openImageRecord(j));
      else if(assetLibrary?.active())void viewMedia(()=>openVideo(j));else if(tool==='video')showVideoHistoryRecord(j,{play:true});
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
    if(ready&&image){
      const {figure,img}=historyImage(j.outputId,'Generated image',true);previews.push(img);card.append(figure);
      img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','View generated image at full size');
      img.onclick=e=>{e.stopPropagation();openCard();};img.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();img.click();}};
    }else if(ready&&j.sourceId){
      const {figure,img}=historyImage(j.sourceId,'Source thumbnail / generated video ready');previews.push(img);card.append(figure);
    }else{
      const empty=document.createElement('div');empty.className='history-no-result';
      const title=document.createElement('strong'),detail=document.createElement('span');
      title.textContent=j.settings.mode==='soul-id-training'&&j.status==='completed'?'Soul ID ready':j.status==='draft'?'Saved draft':j.status==='failed'?'Generation failed':j.status==='uncertain'?'Status unknown':activeStates.has(j.status)?({submitting:'Submitting',queued:'Queued',running:'Generating',saving:'Saving'}[j.status]||'Result pending'):ready?'Video ready':j.status==='completed'?'Output unavailable':'No result';
      detail.textContent=j.settings.mode==='soul-id-training'&&j.status==='completed'?'Choose this identity from the Soul ID photo tile to generate.':j.status==='draft'?'No generation submitted.':j.status==='failed'?(j.error||'The provider ended this request without a generated file.'):j.status==='uncertain'?'PV Lab could not confirm the provider state. Check the provider before retrying; nothing will be resubmitted automatically.':activeStates.has(j.status)?'The finished output will appear here.':ready?'View or download your generated video below.':'No generated file is available to view or download.';
      empty.append(title,detail);card.append(empty);
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
    if(j.status==='uncertain')actions.append(button('Mark reviewed',async()=>{
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
    if(j.error){const error=document.createElement('p');error.className='fine history-error';error.textContent=j.error;body.append(error);}
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
let historyLoadId=0;
async function loadHistory(append=false,incremental=false){
  assetLibrary?.heading();
  if(!append&&!incremental){historySelected.clear();next=null;videoJobCache.clear();imageDetailCache.clear();historyRevision++;observer.disconnect();cardUrls.forEach(release);cardUrls.clear();$('history').replaceChildren();updateHistorySelectionUi();}
  renderPendingImageCards();
  const rev=historyRevision,loadId=++historyLoadId,q=assetLibrary?.query()||new URLSearchParams();
  if(append&&next){q.set('before',next.before);q.set('afterId',next.afterId);}
  const data=await api('/api/jobs?'+q);
  if(!owner||rev!==historyRevision||loadId!==historyLoadId)return;
  renderCards(data.jobs,{upsert:incremental});if(!incremental||!next)next=data.next;$('more').hidden=!next;
  $('emptyarchive').hidden=$('history').children.length>0;$('emptyarchive').textContent=assetLibrary?.active()?'No items here yet. Add work using Select → Add to folder, or mark a heart for Favorites.':tool==='upscale'?'Your upscaled images will appear here.':'No saved work yet.';
  if(data.concurrency)config.concurrency=data.concurrency;setActiveJobs(data.activeJobs||(data.active?[data.active]:[]));syncImageGalleryEmpty();if(tool==='video'&&!assetLibrary?.active())restoreLatestVideoSelection();
}
async function syncHistory(){return loadHistory(false,true);}
function surfaceHistoryJob(job){
  if(!job||!owner||!historyJobVisible(job))return;
  if(assetLibrary?.active()){void syncHistory().catch(e=>notify(e.message,true));return;}
  renderCards([job],{upsert:true});$('emptyarchive').hidden=true;if(tool==='video'&&!assetLibrary?.active())restoreLatestVideoSelection();
}
function refreshHistorySoon(){
  const expectedEpoch=epoch;
  queueMicrotask(()=>syncHistory().catch(error=>{if(owner&&epoch===expectedEpoch)notify('History refresh delayed. Your queued job is safe. '+error.message,true);}));
}
$('refresh').onclick=()=>action(()=>loadHistory());$('more').onclick=()=>action(()=>loadHistory(true));
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
function finishLabBoot(){window.__pvLabFinishBoot?.();}
function lock(){customerMode=false;wallet.connect({customer:false});$('studio-invite-friends').hidden=true;fashionController?.lock();setFashionActive(false);assetLibrary?.reset();hf.reset();epoch++;imageSubmissionPending=false;pendingImageCards.clear();moodUI.clear(true);clearAssetCache();for(const p of composerPortraits.values())p.then(url=>{if(url)release(url);});composerPortraits.clear();composerLibraryKey='';composerPortraitKey='';closeComposerLibrary();historySelected.clear();historySelectMode=false;clearSoulProPackPreview();soulProIdentity={configured:false,count:0,refs:[]};workingCopies.clear();autoPreview=null;downloadUrls.forEach(release);downloadUrls.clear();owner=false;userId='';soul.reset();historyRevision++;clearTimeout(timer);timer=null;activeJob=null;activeJobs=[];polling=false;requestControllers.forEach(c=>c.abort());requestControllers.clear();observer.disconnect();cardUrls.forEach(release);cardUrls.clear();clearMedia();$('prompt').value='';$('history').replaceChildren();$('app').hidden=true;$('gate').hidden=false;$('connection').hidden=true;$('logout').hidden=true;$('api-key').value='';for(const d of document.querySelectorAll('dialog[open]'))d.close();currentQuote=null;config={};packs=[];$('pack-select').replaceChildren(new Option('Choose a saved pack',''));closeImageModelMenu();toggleImageSettings(false);$('app').classList.remove('image-studio-active');imageStudio.hidden=true;imageDetailCache.clear();releaseImageDetailSource();videoJobCache.clear();selectedVideoJob=null;syncVideoStudioMode();finishLabBoot();}
const wallet=createCustomerWallet({api,notify});
async function sync(){if(syncing)return;syncing=true;try{if(!clerk.isSignedIn){lock();$('auth-status').textContent='Sign in to your PV Lab workspace.';$('signin').disabled=false;return;}if(owner&&userId===clerk.user.id)return;const data=await api('/api/session');owner=true;customerMode=!!data.customer;userId=clerk.user.id;wallet.connect(data);hf.setCustomerPricing(customerMode?{trainingCredits:data.soulIdTrainingCredits,imageCredits:data.soul2ImageCredits}:null);$('studio-invite-friends').hidden=!customerMode;if(customerMode)await claimReferral(code=>api('/api/customer/referrals/claim',{method:'POST',body:{code}}));applyConfig(data.config);$('identity').textContent=customerMode?'My workspace':'Owner workspace';$('gate').hidden=true;$('app').hidden=false;$('connection').hidden=customerMode;$('logout').hidden=false;if(customerMode&&new URLSearchParams(location.search).get('referrals')==='1')wallet.openReferrals();await Promise.all([loadHistory(),loadPacks(),soul.load(),loadSoulProIdentity()]);syncVideoStudioMode();await restoreStudioEntry();if(!fashionActive&&fashionController)void fashionController.sync();if(customerMode&&new URLSearchParams(location.search).get('billing')==='success'){notify('Checkout returned. Credits appear when Stripe confirms payment.');void wallet.refresh();}}catch(e){lock();$('auth-status').textContent=e.message;$('signin').disabled=false;$('logout').hidden=!clerk?.isSignedIn;}finally{syncing=false;finishLabBoot();}}
$('studio-invite-friends').onclick=()=>{$('studio-invite-friends').closest('details').open=false;wallet.openReferrals();};
$('auth-retry').onclick=()=>location.reload();$('signin').onclick=()=>clerk?.openSignIn();$('logout').onclick=async()=>{lock();await clerk?.signOut();$('auth-status').textContent='Signed out. Your archive remains private.';};
assetLibrary=createAssetLibrary({api,notify,archive,app:$('app'),selected:()=>historySelected,selectMode:setHistorySelectMode,reload:()=>loadHistory(),restoreStudio:()=>{syncImageStudioMode();syncVideoStudioMode();},beforeOpen:()=>{++previewRevision;$('video').pause();setFashionActive(false);syncStudioRoute('assets');},kind:()=>tool==='upscale'?'upscale':tool==='video'?'video':'image',ready:()=>owner});
setTool(['fashion','assets'].includes(studioRoute())?'image':studioRoute());
try{const {Clerk}=await import('https://esm.sh/@clerk/clerk-js@6?bundle');await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://clerk.parallelvisionlabel.com/npm/@clerk/ui@1/dist/ui.browser.js';s.onload=resolve;s.onerror=reject;document.head.append(s);});clerk=new Clerk('pk_live_Y2xlcmsucGFyYWxsZWx2aXNpb25sYWJlbC5jb20k');await clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor},signInFallbackRedirectUrl:location.href,signUpFallbackRedirectUrl:location.href});clerk.addListener(()=>void sync());await sync();}catch{$('gate').hidden=false;$('auth-retry').hidden=false;$('signin').disabled=true;$('auth-status').textContent='Sign-in could not load. Check your connection and reload the page.';finishLabBoot();}






// Soul composer: independent scene and optional character, with visible output controls.
function syncSoulBar(){
  const active=isSoul2();imageComposer.classList.toggle('is-pv-soul',active);imageComposer.classList.toggle('is-seedream',tool==='image'&&['seedream','flash','kling'].includes(imageEngine));imageComposer.classList.toggle('has-soul-source',active&&!!sourceUrl);
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
  if(busy||imageSubmissionPending||!owner||!hasInput()||submissionBlocked())return;
  const sessionEpoch=epoch,selected=structuredClone(settings()),provider=currentProvider();
  const requested=Math.max(1,Math.min(imageProcessing==='batch'?20:4,Number($('image-count').value)||1));
  const selectedPose=poseMapSourceId,selectedBase=file,selectedSourceId=sourceId;
  const sourceMode=imageEngine==='soulpro'||isReinterpret();
  const chosen=sourceMode?(selectedBase?[{file:selectedBase,id:selectedSourceId}]:[]):imageEngine==='soul'?[]:references.map(ref=>({file:ref.file,id:ref.id,ref}));
  const check=()=>{if(!owner||epoch!==sessionEpoch)throw new Error('Session changed. No further requests submitted.');};
  let feedback=null,dispatched=false;
  const record=job=>{if(!job)return;check();dispatched=false;feedback?.accept();if(activeStates.has(job.status))setActive(job);surfaceHistoryJob(job);refreshHistorySoon();};
  const send=async(path,body,detail='Waiting for the provider to confirm.')=>{check();feedback?.phase('Submitting',detail);dispatched=true;return api(path,{method:'POST',body});};
  imageSubmissionPending=true;imageSubmissionStage='Preparing…';update();
  let submitted=0;
  try{
    if(provider==='spicy'&&!config.enabled){connection();return;}
    if(provider==='openrouter'&&!config.openrouterEnabled)throw new Error('Add OPENROUTER_API_KEY as a Secret in Cloudflare → parallel-vision-lab, then deploy and reload.');
    if(['flash','kling'].includes(selected.engine)&&chosen.length>(selected.engine==='flash'?14:1))throw new Error(selected.engine==='kling'?'Kling V3 accepts one base image. Remove extra references or choose Flash.':'Flash accepts up to 14 references.');
    if(provider==='gemini'&&!config.geminiEnabled)throw new Error('Gemini API is not connected.');
    if(provider==='fal'&&!config.falEnabled)throw new Error('FAL API is not connected.');
    if(provider==='higgsfield'&&!config.higgsfieldEnabled)throw new Error('Higgsfield API is not connected.');
    if(provider==='spicy'){
      const used=activeJobs.filter(j=>slotStates.has(j.status)&&j.settings?.type==='image'&&jobProvider(j)==='spicy').length;
      if(requested>Math.max(0,limitFor('image')-used))throw new Error('Not enough available image slots for this batch.');
    }
    const ratioParts=String(selected.aspectRatio||'').split(':').map(Number);
    const inputRatio=sourceMode?sourceWidth/sourceHeight:chosen[0]?.ref?.width/chosen[0]?.ref?.height;
    const ratio=ratioParts.length===2&&ratioParts.every(n=>n>0)?ratioParts[0]/ratioParts[1]:inputRatio>0?inputRatio:16/9;
    feedback=beginImageFeedback(['higgsfield','fal'].includes(provider)&&!['flash','kling'].includes(selected.engine)?1:requested,selected,ratio);
    // Upload up to three original references at once, retaining snapshot order
    // and successful IDs for reuse. No paid call starts before every upload succeeds.
    const originals=new Array(chosen.length),missing=chosen.filter(item=>!item.id).length;
    let cursor=0,uploaded=0,uploadError=null;
    if(missing)feedback.phase('Uploading references','0 / '+missing);
    const uploadNext=async()=>{
      while(!uploadError&&cursor<chosen.length){
        const index=cursor++,item=chosen[index];
        try{
          check();const id=item.id||await uploadAsset(item.file);check();originals[index]={id,file:item.file};
          if(item.ref&&references.includes(item.ref))item.ref.id=id;
          if(sourceMode&&file===selectedBase)sourceId=id;
          if(!item.id){uploaded++;feedback.phase('Uploading references',uploaded+' / '+missing);}
        }catch(error){uploadError=error;}
      }
    };
    await Promise.all(Array.from({length:Math.min(3,chosen.length)},uploadNext));
    if(uploadError)throw uploadError;
    check();
    let inputs={sourceId:originals[0]?.id||null,lastSourceId:null,referenceSourceIds:sourceMode?[]:originals.map(r=>r.id)};
    if(['flash','kling'].includes(selected.engine)){
      for(let i=0;i<requested;i++){
        const data=await send('/api/image-models/generate',{...inputs,settings:selected});
        if(!data.job)throw new Error('No generation record returned. Check History before retrying.');
        record(data.job);submitted++;
        if(data.job.error)throw new Error(data.job.error);
      }
    }else if(provider==='higgsfield'){
      // Price checking does not submit a paid job. Keep the compose settings frozen in this quote.
      feedback.phase('Checking live price','No image has been generated or charged.');
      const q=await api('/api/higgsfield/quote',{method:'POST',body:{...inputs,settings:selected}});
      check();
      if(!q?.id||q.provider!=='Higgsfield'||q.settings?.provider!=='higgsfield'||(q.settings.characterId||'')!==(selected.characterId||'')||q.sourceId!==inputs.sourceId||!Number.isFinite(q.estimatedUsd)||q.estimatedUsd<=0||!Number.isFinite(q.expiresAt)||q.expiresAt<=Date.now())throw new Error('Higgsfield price review did not match your selected image and identity. Nothing generated.');
      feedback.finish();feedback=null;
      currentQuote=q;
      $('quote-settings').textContent='PV Soul 2 / '+(q.settings.characterName||'NO SOUL ID')+' / '+q.settings.resolution.toUpperCase()+' / '+q.settings.aspectRatio+' / '+(q.sourceId?'Base photo':'Text to image');
      $('quote-price').textContent=customerMode?wallet.describe(q.maxUsd):money(q.estimatedUsd);
      $('quote-limit').textContent=customerMode?'Soul 2 launch rate: '+wallet.describe(q.maxUsd)+'. The live API quote was checked; no generation or credit charge yet.':'Live Higgsfield estimate: '+money(q.estimatedUsd)+' USD. Actual provider billing may differ. No automatic retries.';
      $('quote-expiry').textContent='Valid until '+new Date(q.expiresAt).toLocaleTimeString()+'. One image. No generation or charge yet.';
      $('quote-notice').textContent=q.notice||'';$('confirm-generation').disabled=false;$('quote-dialog').showModal();
      return;
    }else if(provider==='fal'){
      const path=selected.engine==='soulpro'?'/api/fal/soul-pro':'/api/fal/controlled-pose';
      const data=await send(path,{...inputs,settings:selected,...(selected.engine==='fal'?{poseMapSourceId:selectedPose}:{})});
      if(!data.job)throw new Error('No generation record returned. Check History before retrying.');
      record(data.job);submitted=1;if(data.job.error)throw new Error(data.job.error);
    }else if(provider==='gemini'){
      const batch=selected.processing==='batch';
      for(let i=0;i<(batch?1:requested);i++){
        const data=await send('/api/gemini/jobs',{...inputs,count:batch?requested:1,settings:selected});
        if(!data.jobs?.length)throw new Error('No generation record returned. Check History before retrying.');
        for(const job of data.jobs){record(job);submitted++;}
        if(data.jobs.some(job=>['failed','uncertain','resolved'].includes(job.status)))break;
      }
    }else{
      inputs=await prepareQuoteInputs(inputs,{originals,onProgress:(...args)=>feedback.phase(...args)});if(!inputs)return;
      const batchSeedream=selected.engine==='seedream'&&requested>1;
      const refCount=inputs.referenceSourceIds?.length||0;
      const pricingTitle=refCount?'Preparing provider files':'Checking price';
      const priceDetail=refCount?refCount+' references · '+requested+' price'+(requested===1?'':'s')+' · no paid generation yet':requested+' live price'+(requested===1?'':'s')+' · no paid generation yet';
      feedback.phase(pricingTitle,priceDetail);
      let pricingTimer=null;const pricingStarted=Date.now();
      const quotes=[];
      try{
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
  finally{feedback?.finish();if(epoch===sessionEpoch){imageSubmissionPending=false;imageSubmissionStage='Sending…';update();}}
}

