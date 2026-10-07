import {VIDEO_MODELS,engineFor,videoLabel} from './video-models.js?v=20261001-video-models2';
import {REFERENCE_ROLES,REFERENCE_TARGETS,normalizeReferenceLabel,compileImagePrompt,referenceGuidanceError,canUseReferenceGuidance} from './reference-guidance.js?v=20261002-reference1';
import {createMediaReferences} from './media-references.js?v=20260927-standard1';
import { createSessionRequest } from './session-request.js?v=20260927-auth1';
import { createSoulController } from './soul.js?v=20261001-presets2';
import { PROVIDER_IMAGE_LIMIT, UPSCALE_PIXELS, imageDimensions, providerWorkingCopy, wanUltrawideWorkingCopy, imagePreview, cancelImagePreparation } from './image-tools.js?v=20260930-soul-v02';
// General-purpose private image-to-video workspace. Credentials never enter browser storage.
const API='https://parallel-vision-lab.parallelvision.workers.dev';
const $=id=>document.getElementById(id), activeStates=new Set(['submitting','queued','running','saving','uncertain']), slotStates=new Set(['submitting','queued','running','uncertain']);
let clerk, owner=false, userId='', epoch=0, syncing=false, config={}, file=null, sourceId=null, imageRevision=0, busy=false;
let sourceUrl=null, lastFile=null, lastSourceId=null, lastUrl=null, references=[], mode='start';
let engine='wan', imageEngine='seedream', imageProcessing='normal', soulProModel='ideogram45', soulProQuality='medium', soulProIdentity={configured:false,count:0,refs:[]}, soulProPackSelection=[], soulProPackUrls=[], poseMapSourceId=null, repairTarget=null, repairImage=null, repairMaskCanvas=null, repairMaskDirty=false;
let tool='video', packs=[],resultKind='video',resultExt='mp4';
let resultUrl=null, resultId=null, resultSettings=null, previewRevision=0, autoPreview=null, currentQuote=null, next=null, activeJob=null, timer=null, historyRevision=0;
let activeJobs=[], polling=false, historySelectMode=false, historySelected=new Set();
const downloadUrls=new Set();
const workingCopies=new Map();
let upscaleQuote=null,upscaleQuoteNeedsCheck=false,upscaleQuoteTimer=null,upscalePriceMessage='';
let upscaleEngine='spicy';
const UPSCALE_MODELS=Object.freeze({
  spicy:{name:'Image Upscaler v1',provider:'SpicyAPI',model:'spicyapi/image-upscaler-v1/upscale',pricing:'https://spicyapi.ai/models/image-upscaler-v1',price:'Published price: $0.012 per image, the same for every size and file format.',description:'Enlarge one finished image, keeping its framing and aspect ratio. Size tiers are approximately 4, 17 and 67 megapixels. Choose a tier above your source size. No prompt, creativity or face controls.'},
  'topaz-precision':{name:'Topaz Precision',provider:'FAL',model:'topaz/upscale/image/precision',pricing:'https://fal.ai/models/topaz/upscale/image/precision',price:'Published price: $0.08 per started 24 megapixels of output.',description:'Enlarge while preserving the photograph. Standard V2 is the general option; High Fidelity V3 is for detailed sources. Choose 2× or 4× width and height. Face enhancement and cropping stay off.'},
  'topaz-wonder':{name:'Topaz Wonder 3.5',provider:'FAL',model:'topaz/upscale/image/generative',pricing:'https://fal.ai/models/topaz/upscale/image/generative',price:'Published price: $0.08 per started 8 megapixels of output.',description:'Restore small or blurry images with reconstructed detail. Texture and facial details may change. Choose 2× or 4× width and height. Face enhancement and cropping stay off.'}
});
let sourcePixels=0, sourceWidth=0, sourceHeight=0;
const cardUrls=new Set(), requestControllers=new Set();
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:4}).format(n);
const notify=(text,error=false)=>{$('notice').textContent=text;$('notice').classList.toggle('error',error);};
function release(url){if(url)URL.revokeObjectURL(url);}
function referenceRoles(){return references.map(r=>normalizeReferenceLabel({name:r.file.name,role:r.role||'none',note:r.note||'',target:r.target||''}));}
function usesReferenceGuidance(){return tool==='image'&&['seedream','gemini'].includes(imageEngine);}
function imageGuidance(){
  const labels=referenceRoles(),prompt=compileImagePrompt($('prompt').value,labels);
  return {prompt,error:referenceGuidanceError(labels)||(prompt.length>5000?'Direction and reference instructions exceed 5,000 characters. Shorten the direction or optional notes.':'')};
}
function updateReferenceGuidance(){
  const panel=$('reference-guidance'),active=usesReferenceGuidance();panel.hidden=!active||!references.length;
  if(!active)return;
  const {prompt,error}=imageGuidance(),unassigned=references.filter(r=>!r.role||r.role==='none').length;
  $('reference-guidance-text').textContent=prompt;
  $('reference-guidance-count').textContent=prompt.length.toLocaleString()+' / 5,000 characters';
  const warning=$('reference-guidance-warning');warning.textContent=error||(unassigned?unassigned+' reference'+(unassigned===1?' has':'s have')+' no role. Assign a role to specify what to copy.':'');warning.hidden=!warning.textContent;warning.classList.toggle('error',!!error);
  $('reference-provider').textContent=imageEngine==='seedream'?'Seedream 5 Pro · SpicyAPI':'Nano Banana Pro · Google';
  $('reference-help').textContent='Choose what each image contributes. Base keeps the scene; Pose copies posture only. Roles become automatic instructions. Results can still vary.';
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
  $('generation-help').textContent=fal?'Upscale starts one paid Topaz job in one click. PV Lab checks the estimated price and output dimensions automatically before submission; the displayed FAL price is an estimate and provider billing is authoritative.':'Upscale starts one paid upscaling job. You can check its live price above first; there is no extra price-review popup. Inputs over 10 MiB need a working copy; the Lab asks first and keeps the original.';
}
function upscalePriceKey(){return JSON.stringify({epoch,imageRevision,sourceId,tool,settings:tool==='upscale'?settings():null});}
function clearUpscalePrice(){clearTimeout(upscaleQuoteTimer);upscaleQuoteTimer=null;upscaleQuote=null;upscaleQuoteNeedsCheck=false;upscalePriceMessage='';}
function invalidateUpscalePrice(message){
  clearTimeout(upscaleQuoteTimer);upscaleQuoteTimer=null;
  if(upscaleQuote||upscaleQuoteNeedsCheck){upscaleQuote=null;upscaleQuoteNeedsCheck=true;upscalePriceMessage=message;}
}
function expireUpscalePrice(message){
  clearTimeout(upscaleQuoteTimer);upscaleQuoteTimer=null;upscaleQuote=null;upscaleQuoteNeedsCheck=false;upscalePriceMessage=message;
}
function updateUpscalePrice(){
  const active=tool==='upscale',fal=isFalUpscale();$('upscale-price').hidden=!active;
  if(upscaleQuote&&upscaleQuote.key!==upscalePriceKey())invalidateUpscalePrice(fal?'Image or settings changed. Check price & size again before upscaling.':'Image or settings changed. Check live price again before upscaling.');
  if(upscaleQuote&&Date.now()>=upscaleQuote.quote.expiresAt)expireUpscalePrice(fal?'Estimate expired. A fresh estimate will be checked when you upscale.':'Live quote expired. A fresh price will be checked when you upscale.');
  $('upscale-check-price').disabled=!active||!owner||!file||busy||!(fal?config.falEnabled:config.enabled);
  $('upscale-check-price').textContent=fal?(upscaleQuoteNeedsCheck?'Check price & size again':'Check price & size'):(upscaleQuoteNeedsCheck?'Check live price again':'Check live price');
  const q=upscaleQuote?.quote;
  $('upscale-price-status').textContent=q?(q.priceIsEstimate?('Estimated charge: '+money(q.estimatedUsd)+' USD. '+q.settings.sourceWidth+' × '+q.settings.sourceHeight+' → '+q.settings.targetWidth+' × '+q.settings.targetHeight+' output. Not a guaranteed maximum. Valid until '+new Date(q.expiresAt).toLocaleTimeString()+'. No generation submitted.'):('Live price: '+money(q.estimatedUsd)+' USD'+(q.maxUsd!==q.estimatedUsd?' · maximum '+money(q.maxUsd)+' USD':'')+'. Valid until '+new Date(q.expiresAt).toLocaleTimeString()+'. No generation submitted.')):upscalePriceMessage||(fal?'Check the estimated charge and output dimensions before upscaling.':'Check the price for this image before upscaling, or use Upscale directly.');
  if(active&&(fal&&!config.falEnabled||upscaleQuoteNeedsCheck))$('generate').disabled=true;
  if(active&&q)$('generate').textContent='Upscale · '+(q.priceIsEstimate?'est. ':q.maxUsd!==q.estimatedUsd?'max ':'')+money(q.priceIsEstimate?q.estimatedUsd:q.maxUsd);
}
function validateUpscaleQuote(q,selected){
  const which=upscaleMode(selected),fal=which!=='spicy',p=q?.settings,wrong=!q||!p||q.provider!==(fal?'fal.ai':'SpicyAPI')||p.model!==UPSCALE_MODELS[which].model||p.type!=='image'||p.mode!=='upscale'||upscaleMode(p)!==which||p.outputFormat!==selected.outputFormat||!q.id||!Number.isFinite(q.estimatedUsd)||q.estimatedUsd<0||!Number.isFinite(q.maxUsd)||q.maxUsd<q.estimatedUsd||!Number.isFinite(q.expiresAt)||q.expiresAt<=Date.now();
  if(wrong||fal&&(q.priceIsEstimate!==true||q.requiresPriceReview!==true||p.scale!==selected.scale||p.topazModel!==selected.topazModel||![p.sourceWidth,p.sourceHeight,p.targetWidth,p.targetHeight].every(n=>Number.isSafeInteger(n)&&n>0)||p.targetWidth!==p.sourceWidth*selected.scale||p.targetHeight!==p.sourceHeight*selected.scale)||!fal&&p.resolution!==selected.resolution)throw new Error('No usable upscale quote was returned for these settings. Nothing was submitted.');
}
function settings(){if(tool==='upscale')return isFalUpscale()?{type:'image',mode:'upscale',upscaleEngine,scale:Number($('upscale-scale').value),topazModel:upscaleEngine==='topaz-precision'?$('upscale-topaz-model').value:'Wonder 3.5',prompt:'',resolution:$('upscale-scale').value+'x',aspectRatio:'source',outputFormat:$('output-format').value,referenceRoles:[]}:{type:'image',mode:'upscale',upscaleEngine:'spicy',prompt:'',resolution:$('resolution').value,aspectRatio:'auto',outputFormat:$('output-format').value,referenceRoles:[]};if(tool==='image'&&imageEngine==='soulpro')return {type:'image',provider:'fal',engine:'soulpro',mode:'identity-edit',soulProModel,soulProQuality,prompt:$('prompt').value.trim(),sourceWidth,sourceHeight,seed:$('soul-pro-seed').value,resolution:'source',aspectRatio:'source',outputFormat:'png',referenceRoles:[]};if(tool==='image'&&imageEngine==='fal')return {type:'image',provider:'fal',engine:'fal',mode:'controlled-pose',prompt:$('prompt').value.trim(),resolution:'1k',aspectRatio:$('ratio').value,outputFormat:'png',poseStrength:Number($('pose-strength').value),identityStrength:Number($('identity-strength').value),seed:$('controlled-pose-seed').value,referenceRoles:referenceRoles()};if(tool==='image'){const base={type:'image',engine:imageEngine,processing:imageProcessing,mode:'image',prompt:$('prompt').value.trim(),resolution:imageEngine==='soul'?'native':$('resolution').value,aspectRatio:$('ratio').value,outputFormat:$('output-format').value,referenceRoles:imageEngine==='soul'?[]:referenceRoles()};return imageEngine==='soul'?{...base,characterId:soul.selectedId(),identityStrength:soul.strength(),...(isReinterpret()?{...soul.reinterpretSettings(),resolution:$('resolution').value,aspectRatio:'source'}:{})}:base;}return {type:'video',engine,mode,referenceVideos:mode==='reference'?mediaRefs.labels('video'):[],referenceAudio:mode==='reference'?mediaRefs.labels('audio'):[],prompt:$('prompt').value.trim(),duration:Number($('duration').value),resolution:$('resolution').value,aspectRatio:$('ratio').value,seed:$('seed').value,audio:$('audio').checked,referenceRoles:referenceRoles(),referencePixels:engine==='h3maxfal'?references.map(r=>r.width*r.height):[]};}
function hasInput(){if(tool==='upscale')return !!file;if(tool==='image'&&imageEngine==='soulpro')return !!file&&soulProIdentity.configured;if(tool==='image'&&imageEngine==='fal'){const roles=referenceRoles(),poses=roles.filter(r=>r.role==='pose').length,identities=roles.filter(r=>r.role==='identity').length;return !!$('prompt').value.trim()&&references.length>=2&&references.length<=5&&poses===1&&identities>=1&&identities<=4&&poses+identities===references.length;}if(tool==='image'&&imageEngine==='soul')return isReinterpret()?soul.reinterpretReady()&&!!file:soul.ready()&&!!$('prompt').value.trim();if(usesReferenceGuidance())return !imageGuidance().error&&(!!$('prompt').value.trim()||canUseReferenceGuidance(referenceRoles()));return tool==='image'||mode==='text'?!!$('prompt').value.trim():mode==='start'?!!file:references.length>0||(engine==='seedance'&&mediaRefs.count()>0);}
function update(){if($('soul-base-preview')){$('soul-base-preview').hidden=!sourceUrl;if(sourceUrl)$('soul-base-preview').src=sourceUrl;else $('soul-base-preview').removeAttribute('src');$('soul-base-name').textContent=file?.name||'';}const current=settings(),p=resultSettings||current,ratio=p.aspectRatio==='auto'?(p.mode==='reference'?'adaptive':'source ratio'):p.aspectRatio,imageName=p.mode==='upscale'?'Upscale':p.engine==='gemini'?'Nano Banana Pro':p.engine==='soulpro'?'PV Soul Pro':p.engine==='soul'?(p.mode==='reinterpret'?'PV Soul / Reinterpret':'PV Soul'):p.engine==='fal'?'Controlled Pose':'Image',resolution=p.resolution==='native'?'native':String(p.resolution||'').toUpperCase();$('settings-summary').textContent=p.mode==='upscale'?upscaleName(p)+' / '+upscaleSize(p)+' / source ratio':p.type==='image'?imageName+' / '+resolution+' / '+ratio:`${p.duration}s / ${p.resolution} / ${ratio}`;$('save').disabled=!owner||!hasInput()||busy;$('clear').disabled=(!file&&!lastFile&&!references.length&&!mediaRefs.count()&&!resultUrl&&!$('prompt').value.trim())||busy;const provider=currentProvider(),ready=provider==='gemini'?config.geminiEnabled:provider==='fal'?config.falEnabled:config.enabled,soulBlocked=tool==='image'&&imageEngine==='soul'&&(!config.soulTrainingEnabled||!soul.ready()||(isReinterpret()&&!soul.reinterpretReady()));$('generate').disabled=!owner||!hasInput()||(tool!=='upscale'&&!isReinterpret()&&imageEngine!=='soulpro'&&!current.prompt&&!(usesReferenceGuidance()&&canUseReferenceGuidance(referenceRoles())))||busy||submissionBlocked()||soulBlocked||(tool==='upscale'&&upscaleQuoteNeedsCheck);$('generate').textContent=ready?(tool==='image'?(imageEngine==='gemini'?(imageProcessing==='batch'?'Queue batch':'Generate now'):imageEngine==='soulpro'?'Generate identity edit':imageEngine==='fal'?'Generate controlled pose':isReinterpret()?'Reinterpret with Soul':'Generate'):tool==='upscale'?'Upscale':'Review price & generate'):(provider==='gemini'?'Gemini API not connected':provider==='fal'?'FAL API not connected':'Connect generation provider');$('generation-help').textContent=tool==='image'&&imageEngine==='soulpro'?(soulProIdentity.configured?(soulProModel==='ideogram45'?'One base image only. Nina identity loads automatically. Ideogram Precise keeps edit_precision=high; selected quality estimate: '+({very_low:'$0.008',low:'$0.03',medium:'$0.06',high:'$0.22'}[soulProQuality]||'$0.06')+' per image.':'One base image only. Nina identity loads automatically. Kontext Max uses the base plus up to 3 identity refs because its total image limit is 4. Estimate: $0.08 per image.'):'Set Nina identity once, then every Soul Pro render needs only one base image.'):tool==='image'&&imageEngine==='fal'?'Controlled Pose uses FAL DWPose + FLUX EasyControl. One Pose role and 1–4 Identity roles are required. Preview Pose is a small separate fal.ai compute charge.':tool==='image'&&imageEngine==='soul'?(isReinterpret()?'One base photograph and a separately trained Soul identity. High fidelity may keep the original face; lower it for more change. The live provider quote controls the charge.':'PV Soul Text uses your trained Qwen Image 2512 identity. The live provider quote is authoritative.'):tool==='image'&&imageEngine==='gemini'?(imageProcessing==='batch'?'Batch uses the same Nano Banana Pro model at 50% of standard API price. It runs asynchronously and can take minutes or hours; Google targets completion within 24 hours.':'Normal sends Nano Banana Pro immediately. 1K/2K are estimated at $0.134 per image and 4K at $0.24; Google billing is authoritative.'):(tool==='image'?'Generate starts one paid image at the live provider price, within your daily spending limit. No price-review popup.':tool==='upscale'?'Upscale starts one paid upscaling job. You can check its live price above first; there is no extra price-review popup.':'A live quote appears before any paid video.')+' Inputs over 10 MiB need a working copy; the Lab asks first and keeps the original. Saving history does not generate or charge.';for(const el of document.querySelectorAll('.controls input,.controls select,.controls textarea,.mode-tab,.tool-tab'))el.disabled=busy;updateReferenceGuidance();updateUpscaleModel();updateUpscalePrice();}
function options(id,values,value){$(id).replaceChildren(...values.map(v=>new Option(v==='auto'?'Follow reference':v==='source'?'Source':v.toUpperCase(),v)));$(id).value=value;}
function setTool(value){
  tool=['image','upscale'].includes(value)?value:'video';const image=tool==='image',upscale=tool==='upscale',video=tool==='video';
  for(const name of ['image','video','upscale']){$('tool-'+name).classList.toggle('active',tool===name);$('tool-'+name).setAttribute('aria-pressed',String(tool===name));}$('soul-launch').hidden=!image;
  $('video-modes').hidden=!video;$('duration-control').hidden=!video;$('image-model-control').hidden=!image;$('engine-name').hidden=image;$('image-processing-control').hidden=!image||imageEngine!=='gemini';$('soul-pro-settings').hidden=!image||imageEngine!=='soulpro';$('controlled-pose-settings').hidden=!image||imageEngine!=='fal';$('image-count-control').hidden=!image||imageEngine==='fal'||imageEngine==='soulpro';$('video-utilities').hidden=!video;$('format-control').hidden=video||(image&&(imageEngine==='gemini'||imageEngine==='fal'||imageEngine==='soulpro'));$('soul-controls').hidden=!image||imageEngine!=='soul';
  $('start-mode').hidden=(image&&imageEngine!=='soulpro')||video&&mode!=='start';$('reference-mode').hidden=upscale||video&&mode!=='reference'||image&&['soul','soulpro'].includes(imageEngine);
  $('last-upload').hidden=upscale||image&&imageEngine==='soulpro';$('start-label').textContent=upscale?'Image to upscale':image&&imageEngine==='soulpro'?'Base image':'Start frame';
  $('upscale-info').hidden=!upscale;$('prompt').hidden=upscale;$('prompt-label').hidden=upscale;$('resolution-control').hidden=image&&(imageEngine==='soul'&&!isReinterpret()||imageEngine==='fal'||imageEngine==='soulpro');$('ratio-control').hidden=upscale||image&&imageEngine==='soulpro';
  $('mode-heading').textContent=upscale?'03 / Image Upscale':image&&imageEngine==='soulpro'?'02 / PV Soul Pro · Nina Reinterpret':image?'02 / Text to Image + Reference Edit':'01 / Image to Video';
  $('engine-name').textContent=upscale?'IMAGE UPSCALER V1 · SPICYAPI':image?(imageEngine==='gemini'?'NANO BANANA PRO':imageEngine==='soulpro'?'PV SOUL PRO':imageEngine==='soul'?'PV SOUL':imageEngine==='fal'?'CONTROLLED POSE · FAL':'SEEDREAM 5.0 PRO'):'WAN 3.0';
  $('prompt-label').textContent=image?'Image direction':'Motion direction';$('prompt').maxLength=image?5000:6000;
  $('prompt').placeholder=image?'Describe the image. Add references for identity, wardrobe, a room or an object, or start with text only.':'One clear action, one camera move, light, atmosphere and sound.';
  options('resolution',upscale?['2k','4k','8k']:image?(imageEngine==='soulpro'?['source']:imageEngine==='fal'?['1k']:imageEngine==='gemini'?['1k','2k','4k']:imageEngine==='soul'?(isReinterpret()?['1k','1.5k']:['native']):['1k','2k']):['480p','720p','1080p'],upscale?'4k':image?(imageEngine==='soulpro'?'source':imageEngine==='soul'?(isReinterpret()?'1.5k':'native'):imageEngine==='fal'?'1k':'2k'):'1080p');
  if(upscale)for(const option of $('resolution').options)option.textContent=option.value.toUpperCase()+' · ~'+({'2k':4,'4k':17,'8k':67}[option.value])+' MP';
  options('output-format',upscale&&!isFalUpscale()?['png','jpeg','webp']:['png','jpeg'],'png');
  if(!file)$('filemeta').textContent=sourceHelp();
  options('ratio',image?(imageEngine==='soulpro'?['source']:imageEngine==='fal'?['1:1','4:3','3:4','16:9','9:16','21:9']:imageEngine==='gemini'?['auto','1:1','2:3','3:2','3:4','4:3','4:5','5:4','9:16','16:9','21:9']:imageEngine==='soul'?(isReinterpret()?['source']:['1:1','16:9','9:16','4:3','3:4','3:2','2:3','21:9','9:21']):['auto','1:1','4:3','3:4','16:9','9:16','3:2','2:3','4:5','5:4','21:9','9:21','2:1','1:2','3:1','1:3']):['auto','16:9','9:16','1:1','4:3','3:4'],image&&imageEngine==='soulpro'?'source':image&&imageEngine==='soul'?(isReinterpret()?'source':'1:1'):image&&imageEngine==='fal'?'3:4':'auto');
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
  configureVideoControls();renderReferences();resetPreview();update();
}
$('soul-use').onclick=()=>{if(busy)return;imageEngine='soul';$('image-engine').value='soul';setTool('image');window.scrollTo({top:0,behavior:'smooth'});};
$('soul-launch-manage').onclick=()=>{if(busy)return;imageEngine='soul';$('image-engine').value='soul';setTool('image');$('soul-dialog').showModal();void soul.load().catch(e=>notify(e.message,true));};
$('tool-upscale').onclick=()=>{if(!busy)setTool('upscale');};
$('upscale-engine').onchange=()=>{if(busy)return;const value=$('upscale-engine').value;upscaleEngine=Object.hasOwn(UPSCALE_MODELS,value)?value:'spicy';invalidateUpscalePrice('Upscale method changed. Check the price again before upscaling.');setTool('upscale');};
for(const id of ['upscale-topaz-model','upscale-scale'])$(id).onchange=()=>{if(busy)return;invalidateUpscalePrice('Upscale settings changed. Check the price and output size again.');update();};
$('tool-image').onclick=()=>{if(!busy)setTool('image');};$('tool-video').onclick=()=>{if(!busy)setTool('video');};
$('image-engine').onchange=()=>{if(busy)return;const value=$('image-engine').value;imageEngine=value==='gemini'?'gemini':value==='soulpro'?'soulpro':value==='soul'?'soul':value==='fal'?'fal':'seedream';poseMapSourceId=null;$('pose-preview-status').textContent='';$('image-processing').value=imageProcessing;setTool('image');renderReferences();};
$('image-processing').onchange=()=>{if(busy)return;imageProcessing=$('image-processing').value==='batch'?'batch':'normal';setTool('image');};
function updateSoulProModelUi(){
  $('soul-pro-quality-row').hidden=soulProModel!=='ideogram45';
  $('soul-pro-note').textContent=soulProModel==='ideogram45'?'Precise Edit stays enabled at every quality tier. Medium is the default at $0.06; High is optional at $0.22.':'Kontext Max accepts 4 images total, so PV Lab sends the base image first plus up to 3 saved Nina identity references. Fixed estimate: $0.08 per image.';
}
$('soul-pro-model').onchange=()=>{if(busy)return;soulProModel=$('soul-pro-model').value==='kontextmax'?'kontextmax':'ideogram45';updateSoulProModelUi();update();};
$('soul-pro-quality').onchange=()=>{if(busy)return;soulProQuality=['very_low','low','medium','high'].includes($('soul-pro-quality').value)?$('soul-pro-quality').value:'medium';update();};
const sessionRequest=createSessionRequest({baseUrl:API,getSession:()=>clerk?.session});
async function api(path,options={}) {
  const generation=epoch;
  if(!owner&&path!=='/api/session')throw new Error('Sign in first.');
  const assertCurrent=()=>{if(generation!==epoch)throw new Error('Session changed.');};
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),path==='/api/gemini/jobs'?240000:path==='/api/fal/soul-pro'||path==='/api/jobs'&&options.method==='POST'?150000:path==='/api/soul/datasets'?120000:65000);requestControllers.add(controller);
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
const soul=createSoulController({api,action,notify,changed:update,owner:()=>owner,modeChanged:()=>setTool('image')});
function clearResult(){previewRevision++;if(resultUrl){$('preview').removeAttribute('src');$('preview').hidden=true;}release(resultUrl);resultUrl=null;resultId=null;resultSettings=null;$('video').pause();$('video').removeAttribute('src');$('video').load();$('video').hidden=true;$('download').hidden=true;}
function resetPreview(){
  clearResult();
  // Image generation has a result-only canvas. Inputs remain in the reference list.
  const item=tool==='image'&&imageEngine!=='soulpro'||tool==='video'&&mode==='text'?null:(tool==='upscale'||mode==='start')?
    (sourceUrl?{url:sourceUrl,label:tool==='upscale'?'Upscale input':'Start frame'}:null):
    (references[0]?{url:references[0].url,label:'Reference 1 / input'}:null);
  $('preview').alt='Uploaded source image, not a generated result';
  if(item){$('preview').src=item.url;$('preview').hidden=false;$('empty').hidden=true;$('preview-label').textContent=item.label+' / not a result';}
  else{
    $('preview').removeAttribute('src');$('preview').hidden=true;$('empty').hidden=false;
    $('preview-label').textContent=tool==='image'?'Result / Image':'Source / preview';
    $('empty').querySelector('p').textContent=tool==='image'?'Your generated image will appear here.':tool==='video'&&mode==='text'?'Describe a scene to begin.':'Start with your own frame.';
    $('empty').querySelector('small').textContent=tool==='image'?'Input references stay on the left. Nothing generated yet.':'Your source and result appear here.';
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

function clearMedia(){clearUpscalePrice();mediaRefs.clear();cancelImagePreparation();closeInputPreview();poseMapSourceId=null;$('pose-preview-status').textContent='';$('reference-progress').textContent='';imageRevision++;sourcePixels=0;sourceWidth=0;sourceHeight=0;release(sourceUrl);release(lastUrl);sourceUrl=null;lastUrl=null;file=null;sourceId=null;lastFile=null;lastSourceId=null;$('image').value='';$('last-image').value='';for(const r of references)releaseReference(r);references=[];$('reference-images').value='';$('filemeta').textContent=sourceHelp();$('last-filemeta').textContent='Leave empty for an open ending.';renderReferences();clearResult();resetPreview();update();}
async function inspectImage(candidate){
  if(!candidate||!['image/jpeg','image/png','image/webp'].includes(candidate.type)||!candidate.size||candidate.size>20*1024*1024)throw new Error('Choose a JPG, PNG or WebP image up to 20 MB.');
  const seedanceInput=tool==='video'&&engine==='seedance',maxSide=tool==='upscale'?16000:seedanceInput?6000:8000;
  const prepared=await imagePreview(candidate),{width,height}=prepared;
  if(Math.min(width,height)<(seedanceInput?300:240)||Math.max(width,height)>maxSide||Math.max(width/height,height/width)>(seedanceInput?2.5:8))throw new Error('Use an image within the model dimensions and aspect ratio, up to '+maxSide.toLocaleString()+' pixels per side.');
  return {file:candidate,id:null,url:URL.createObjectURL(prepared.preview),thumbUrl:URL.createObjectURL(prepared.thumbnail),width,height};
}

async function setImage(candidate,id=null){const revision=++imageRevision,item=await inspectImage(candidate);release(item.thumbUrl);if(revision!==imageRevision||!owner){release(item.url);return false;}release(sourceUrl);clearResult();file=item.file;sourceId=id;sourceUrl=item.url;sourceWidth=item.width;sourceHeight=item.height;sourcePixels=item.width*item.height;$('filemeta').textContent=`${candidate.name||'Start frame'} / ${item.width} × ${item.height} / ${(candidate.size/1048576).toFixed(1)} MB`;resetPreview();update();return true;}
async function setLastImage(candidate,id=null){const e=epoch,item=await inspectImage(candidate);release(item.thumbUrl);if(e!==epoch||!owner){release(item.url);return false;}release(lastUrl);lastFile=item.file;lastSourceId=id;lastUrl=item.url;$('last-filemeta').textContent=`${candidate.name||'Last frame'} / ${item.width} × ${item.height} / ${(candidate.size/1048576).toFixed(1)} MB`;update();return true;}
function renderReferences(){
  const box=$('reference-list'),scroll=box.scrollTop,fragment=document.createDocumentFragment();
  references.forEach((r,i)=>{
    const item=document.createElement('div');item.className='reference-item';
    const img=document.createElement('img');img.src=r.thumbUrl;img.alt='Input reference '+(i+1);img.width=68;img.height=82;img.decoding='async';
    img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','Preview input reference '+(i+1));
    img.onclick=()=>{if(!busy)viewReference(r,i);};img.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();img.click();}};
    const fields=document.createElement('div');fields.className='reference-fields';
    const title=document.createElement('strong');title.textContent='Reference '+(i+1)+' / '+r.file.name;title.title=title.textContent;
    const role=document.createElement('select');role.setAttribute('aria-label','Role for reference '+(i+1));
    const available=usesReferenceGuidance()?REFERENCE_ROLES:REFERENCE_ROLES.filter(([id])=>!['base','composition','detail'].includes(id));
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
  box.replaceChildren(fragment);box.scrollTop=scroll;$('ref-count').textContent=`${references.length} / ${referenceLimit()}`;
}
async function addReferences(list,ids=[],labels=[]){
  const e=epoch,incoming=[...list];if(imageEngine==='fal')poseMapSourceId=null;if(references.length+incoming.length>referenceLimit())throw new Error('This mode supports up to '+referenceLimit()+' image references.');
  autoPreview=null;$('reference-list').setAttribute('aria-busy','true');let added=0;
  try{
    for(let i=0;i<incoming.length;i++){
      $('reference-progress').textContent='Preparing reference '+(i+1)+' of '+incoming.length+'…';
      const item=await inspectImage(incoming[i]);
      if(e!==epoch||!owner){releaseReference(item);return;}
      item.id=ids[i]||null;item.role=imageEngine==='soulpro'?'identity':labels[i]?.role||'none';item.note=imageEngine==='soulpro'?'':labels[i]?.note||'';item.target=labels[i]?.target||'';references.push(item);added++;
      renderReferences();refreshInputPreview();update();
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  }finally{
    if(e===epoch){$('reference-list').setAttribute('aria-busy','false');$('reference-progress').textContent=added?added+' reference'+(added===1?'':'s')+' ready. Originals kept unchanged.':'';}
  }
}

function referenceLimit(){return tool==='video'?VIDEO_MODELS[engine].maxImages:tool==='image'&&imageEngine==='soulpro'?4:tool==='image'&&imageEngine==='soul'?soul.referenceLimit():tool==='image'&&imageEngine==='fal'?5:10;}
function configureVideoControls(){
  const isVideo=tool==='video',model=VIDEO_MODELS[engine],sd=engine==='seedance',h3=engine==='h3',h3max=engine==='h3max',h3spicy=engine==='h3spicy',h3maxfal=engine==='h3maxfal',omni=engine==='omni',minimax=h3||h3max||h3spicy||h3maxfal;
  $('video-model-control').hidden=!isVideo;$('video-engine').value=engine;
  if(!model.modes.includes(mode))mode=model.modes[0];
  $('mode-start').hidden=!isVideo||!model.modes.includes('start');
  $('mode-reference').hidden=!isVideo||!model.modes.includes('reference');
  $('mode-text').hidden=!isVideo||!model.modes.includes('text');
  for(const m of ['start','reference','text']){$('mode-'+m).classList.toggle('active',mode===m);$('mode-'+m).setAttribute('aria-selected',String(mode===m));}
  $('start-mode').hidden=tool==='image'&&imageEngine!=='soulpro'||isVideo&&mode!=='start';$('reference-mode').hidden=tool==='upscale'||isVideo&&mode!=='reference'||tool==='image'&&['soul','soulpro'].includes(imageEngine);
  $('reference-media').hidden=!isVideo||!sd||mode!=='reference';
  $('start-frame-maker').hidden=!isVideo||mode!=='reference'||sd;
  if(isVideo){
    const ratio=$('ratio').value,duration=Number($('duration').value)||15;
    const ratios=omni?model.ratios:(sd||minimax)&&mode==='start'?['auto']:(!sd&&!minimax&&mode==='start'?[...model.ratios,'21:9']:model.ratios);
    const defaultRatio=omni?'16:9':sd&&mode==='start'?'auto':ratios.includes(ratio)?ratio:(ratios.includes('auto')?'auto':ratios[0]);
    options('ratio',ratios,defaultRatio);
    $('ratio').parentElement.hidden=(sd||minimax)&&mode==='start'&&!omni;
    const durations=(sd||minimax||omni)?Array.from({length:model.maxSeconds-model.minSeconds+1},(_,i)=>i+model.minSeconds):[5,10,15,30];
    $('duration').replaceChildren(...durations.map(n=>new Option(n+' sec',String(n))));
    if(duration>=model.minSeconds&&duration<=30&&!([...$('duration').options].some(o=>Number(o.value)===duration)))$('duration').add(new Option(duration+' sec',String(duration)));
    $('duration').value=duration>=model.minSeconds&&duration<=model.maxSeconds?duration:Math.max(5,model.minSeconds);
    const currentResolution=$('resolution').value;
    $('resolution').replaceChildren(...model.resolutions.map(r=>new Option(r.toUpperCase(),r)));
    $('resolution').value=model.resolutions.includes(currentResolution)?currentResolution:(model.resolutions.includes('768p')?'768p':model.resolutions[0]);
    $('engine-name').textContent=model.label.toUpperCase();
    $('mode-heading').textContent='01 / '+(mode==='text'?'Text to Video':mode==='reference'?'Reference to Video':'Image to Video');
    $('prompt').maxLength=h3maxfal||omni?6000:minimax?7000:sd?5000:6000;
    $('prompt-label').textContent=mode==='text'?'Scene direction':'Motion direction';
    $('video-model-note').textContent=sd?'Seedance 2.5 Standard / 4–30s / up to 1080p. Start frame follows your image ratio. Reference mode supports image, video and audio guidance. Provider policies and refusals remain in force.':h3maxfal?'H3 Max Reference on fal.ai / 5–15s / 480p–1080p / up to 12 image references. fal.ai safety checking is enabled, and provider/model/account rules can reject a request.':omni?'Gemini Omni Flash 1.1 on fal.ai / 3–10s / 360p–4K / Start, Reference and Text modes. Google/fal safety filters apply.':engine==='wanprime'?'Wan 3.0 Prime / faster Wan render / 2–30s / 480p–1080p / same Start frame and Reference modes as Wan 3.0. Higher live provider price.':engine==='h3'||engine==='h3max'||engine==='h3spicy'?'MiniMax H3 family on SpicyAPI. Available modes and resolution depend on the selected variant.':'Wan 3.0 / Start frame or image references. 21:9 start-frame mode makes a private local center crop, keeps your original, then uses Wan adaptive ratio because Wan rejects an explicit 21:9 parameter. Provider policies and model refusals apply.';
  }
  $('reference-drop').querySelector('small').textContent='Up to '+referenceLimit()+' images';
  $('ref-count').textContent=references.length+' / '+referenceLimit();
}
function setMode(nextMode){const modes=VIDEO_MODELS[engine].modes;mode=modes.includes(nextMode)?nextMode:modes[0];configureVideoControls();resetPreview();update();}
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
const mediaRefs=createMediaReferences({element:$,owner:()=>owner,busy:()=>busy,epoch:()=>epoch,action,changed:()=>{autoPreview=null;update();},
  upload:async snapshot=>(await api('/api/reference-uploads',{method:'POST',headers:{'Content-Type':snapshot.type,'X-Filename':encodeURIComponent(snapshot.name||'reference')},body:snapshot})).id,assetFile});
async function uploadAsset(snapshot){const data=await api('/api/uploads',{method:'POST',headers:{'Content-Type':snapshot.type,'X-Filename':encodeURIComponent(snapshot.name||'source.png')},body:snapshot});return data.id;}
async function ensureSource(){if(sourceId)return sourceId;const snapshot=file,rev=imageRevision;if(!snapshot)throw new Error(tool==='upscale'?'Choose an image to upscale first.':'Choose a start frame first.');const id=await uploadAsset(snapshot);if(rev!==imageRevision)throw new Error('Image changed during upload. Please try again.');sourceId=id;return id;}
async function ensureLast(){if(!lastFile)return null;if(lastSourceId)return lastSourceId;lastSourceId=await uploadAsset(lastFile);return lastSourceId;}
async function ensureReferences(){
  if(!references.length)throw new Error('Add at least one reference image.');
  for(let i=0;i<references.length;i++){const r=references[i];if(!r.id){notify('Uploading original reference '+(i+1)+' of '+references.length+'…');r.id=await uploadAsset(r.file);}}
  return references.map(r=>r.id);
}
async function ensureInputs(){if(imageEngine==='soulpro'&&tool==='image')return {sourceId:await ensureSource(),lastSourceId:null,referenceSourceIds:[]};if(isReinterpret())return {sourceId:await ensureSource(),lastSourceId:null,referenceSourceIds:[]};if(tool==='image'&&imageEngine==='soul')return {sourceId:null,lastSourceId:null,referenceSourceIds:[]};if(tool==='video'&&['seedance','h3','h3max','h3maxfal','omni'].includes(engine)){if(mode==='text')return {sourceId:null,lastSourceId:null,referenceSourceIds:[],referenceVideoIds:[],referenceAudioIds:[]};if(mode==='reference'){const ids=references.length?await ensureReferences():[];return {sourceId:ids[0]||null,lastSourceId:null,referenceSourceIds:ids,...(engine==='seedance'?await mediaRefs.inputs():{referenceVideoIds:[],referenceAudioIds:[]})};}}if(tool==='upscale')return {sourceId:await ensureSource(),lastSourceId:null,referenceSourceIds:[]};if(tool==='image'&&!references.length)return {sourceId:null,lastSourceId:null,referenceSourceIds:[]};if(tool==='image'||mode==='reference'){const ids=await ensureReferences();return {sourceId:ids[0],lastSourceId:null,referenceSourceIds:ids};}return {sourceId:await ensureSource(),lastSourceId:await ensureLast(),referenceSourceIds:[]};}
function applyConfig(c){config=c;soul.configure(c);$('soul-launch-note').textContent=c.soulTrainingEnabled?'FAL training is ready. Train from 20–80 photos, then use the character in Image.':'FAL training is not available on this Worker.';$('soul-launch-manage').disabled=!c.soulTrainingEnabled;const soulOption=$('image-engine').querySelector('[value=soul]'),soulProOption=$('image-engine').querySelector('[value=soulpro]'),falOption=$('image-engine').querySelector('[value=fal]');if(soulOption)soulOption.disabled=!c.soulTrainingEnabled;if(soulProOption)soulProOption.disabled=!c.falEnabled;if(falOption)falOption.disabled=!c.falEnabled;if((imageEngine==='soul'&&!c.soulTrainingEnabled)||((imageEngine==='fal'||imageEngine==='soulpro')&&!c.falEnabled)){imageEngine='seedream';$('image-engine').value='seedream';setTool('image');}for(const option of $('video-engine').options)option.disabled=!c.videoEngines?.includes(option.value);$('connection-status').textContent=(c.enabled?'SpicyAPI connected':'SpicyAPI disconnected')+(c.geminiEnabled?' · Gemini connected':'')+(c.soulTrainingEnabled?' · FAL training ready':'')+(c.falEnabled?' · FAL controls ready':'')+' / Private archive ready';update();}
function connection(){if(!owner)return;$('api-key').value='';$('daily-limit').value=config.dailyLimitUsd||10;$('terms').checked=false;$('disconnect').hidden=!config.configured;$('key-note').textContent=config.configured?'A key is stored encrypted. Leave blank to keep it, or paste a replacement.':'Stored encrypted on your private backend. Never committed to GitHub or saved in browser storage.';$('connect-notice').textContent='';$('connect-dialog').showModal();}
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
bindDrop('last-drop','last-image',async files=>{if(files[0])await setLastImage(files[0]);});
bindDrop('reference-drop','reference-images',async files=>{if(files.length)await addReferences(files);});
$('clear').onclick=()=>{clearMedia();notify('Editor cleared. Saved work is unchanged.');};
for(const id of ['prompt','duration','resolution','ratio','seed','audio','output-format','image-count','pose-strength','identity-strength','controlled-pose-seed'])$(id).addEventListener('input',()=>{autoPreview=null;if(id==='pose-strength')$('pose-strength-value').textContent=Number($('pose-strength').value).toFixed(2);if(id==='identity-strength')$('identity-strength-value').textContent=Number($('identity-strength').value).toFixed(2);update();});
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
$('save').onclick=()=>action(async()=>{const inputs=await ensureInputs();await api('/api/drafts',{method:'POST',body:{...inputs,settings:settings()}});await syncHistory();notify('Saved privately with the original media and settings. No generation charge.');});
$('upscale-check-price').onclick=()=>action(async()=>{
  if(tool!=='upscale'||!file)throw new Error('Choose an image to upscale first.');
  if(isFalUpscale()&&!config.falEnabled)throw new Error('FAL upscaling is not connected.');
  if(!isFalUpscale()&&!config.enabled){connection();return;}
  clearTimeout(upscaleQuoteTimer);upscaleQuoteTimer=null;upscaleQuote=null;upscaleQuoteNeedsCheck=true;upscalePriceMessage=isFalUpscale()?'Checking estimated price and output dimensions. No generation submitted.':'Checking the live price. No generation submitted.';updateUpscalePrice();
  const sessionEpoch=epoch;
  try{
    const originals=await ensureInputs(),inputs=isFalUpscale()?originals:await prepareQuoteInputs(originals);
    if(!inputs){upscalePriceMessage='Price check cancelled. No generation submitted.';return;}
    const key=upscalePriceKey(),selected=settings(),q=await api('/api/quotes',{method:'POST',body:{...inputs,settings:selected}});
    if(!owner||epoch!==sessionEpoch||tool!=='upscale'||key!==upscalePriceKey())throw new Error('Image, settings or session changed. Check the price again. Nothing was submitted.');
    validateUpscaleQuote(q,selected);upscaleQuote={quote:q,key};upscaleQuoteNeedsCheck=false;upscalePriceMessage='';
    upscaleQuoteTimer=setTimeout(()=>{if(upscaleQuote?.quote.id===q.id){expireUpscalePrice(q.priceIsEstimate?'Estimate expired. A fresh estimate will be checked when you upscale.':'Live quote expired. A fresh price will be checked when you upscale.');update();}},Math.max(0,q.expiresAt-Date.now()));
    notify(isFalUpscale()?'Upscale estimate and dimensions checked. No generation submitted.':'Live upscale price checked. No generation submitted.');
  }catch(e){if(epoch===sessionEpoch){upscalePriceMessage='The price could not be checked. Try the price check again. Nothing was submitted.';}throw e;}
});
// Image Generate and Upscale authorize a paid request on click. Video keeps the quote dialog.
async function submitQuotedGeneration(q, expectedEpoch=epoch) {
  if(!owner||epoch!==expectedEpoch)throw new Error('Session changed.');
  if(!q||!Number.isFinite(q.expiresAt)||Date.now()>=q.expiresAt)throw new Error('Quote expired. No generation submitted. Please try again.');
  // Retain the same quote ID through the session-safe request helper. Never reprice/retry a paid task here.
  const data=await api('/api/jobs',{method:'POST',body:{quoteId:q.id,confirm:true}});
  if($('quote-dialog').open)$('quote-dialog').close();
  resetPreview();autoPreview={id:data.job.id,revision:previewRevision};setActive(data.job);surfaceHistoryJob(data.job);refreshHistorySoon();
  const failed=['failed','uncertain','resolved'].includes(data.job.status);
  notify(failed?(data.job.error||'The generation was not confirmed. Check History before another attempt.'):
    (['image','upscale'].includes(q.settings.mode)?(q.settings.mode==='upscale'?'Upscale requested.':'Image requested.')+(q.priceIsEstimate?' Estimated provider charge: '+money(q.estimatedUsd)+' USD. Not a guaranteed maximum. Results appear in History.':' Quoted maximum: '+money(q.maxUsd)+' USD. Results appear in History.'):'Generation request recorded. You can leave the page and return to History.'),failed);
}
$('generate').onclick=()=>action(async()=>{
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
      checked={quote:q,key};upscaleQuote=checked;upscaleQuoteNeedsCheck=false;upscalePriceMessage='';updateUpscalePrice();
    }else{
      validateUpscaleQuote(checked.quote,settings());
    }
    invalidateUpscalePrice('Submitting Topaz with the checked estimate. If interrupted, refresh History before another attempt.');
    await submitQuotedGeneration(checked.quote,sessionEpoch);clearUpscalePrice();
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
  if(selectedTool==='image'&&imageEngine==='soulpro'){
    if(!soulProIdentity.configured)throw new Error('Set Nina identity once before generating.');
    const inputs=await ensureInputs(),imageSettings=settings();
    notify('Submitting PV Soul Pro identity edit to FAL…');
    const data=await api('/api/fal/soul-pro',{method:'POST',body:{...inputs,settings:imageSettings}});
    const job=data.job;if(!job)throw new Error('No PV Soul Pro job was returned.');
    if(activeStates.has(job.status))setActive(job);
    resetPreview();autoPreview={id:job.id,revision:previewRevision};surfaceHistoryJob(job);refreshHistorySoon();
    const failed=['failed','uncertain','resolved'].includes(job.status);
    notify(failed?(job.error||'PV Soul Pro was not confirmed. Check History before retrying.'):'PV Soul Pro requested. Budget reserve: '+money(job.estimatedUsd||0)+' USD. Result will appear in History.',failed);
    return;
  }
  if(selectedTool==='image'&&imageEngine==='fal'){
    const inputs=await ensureInputs(),imageSettings=settings();
    notify('Submitting Controlled Pose to FAL…');
    const data=await api('/api/fal/controlled-pose',{method:'POST',body:{...inputs,poseMapSourceId,settings:imageSettings}});
    const job=data.job;if(!job)throw new Error('No Controlled Pose job was returned.');
    if(activeStates.has(job.status))setActive(job);
    resetPreview();autoPreview={id:job.id,revision:previewRevision};surfaceHistoryJob(job);refreshHistorySoon();
    const failed=['failed','uncertain','resolved'].includes(job.status);
    notify(failed?(job.error||'Controlled Pose was not confirmed. Check History before retrying.'):'Controlled Pose requested. Budget reserve: '+money(job.estimatedUsd||0)+' USD. Result will appear in History.',failed);
    return;
  }
  if(selectedTool==='image'&&imageEngine==='gemini'){
    if(!config.geminiEnabled)throw new Error('Gemini API key is not available on the Lab backend.');
    const inputs=await ensureInputs(),requested=Math.max(1,Math.min(imageProcessing==='batch'?20:4,Number($('image-count').value)||1)),imageSettings=settings();
    if(imageProcessing==='batch'){
      notify('Queueing '+requested+' Nano Banana Pro image'+(requested===1?'':'s')+' in Batch…');
      const data=await api('/api/gemini/jobs',{method:'POST',body:{...inputs,count:requested,settings:imageSettings}});
      for(const job of data.jobs||[]){setActive(job);surfaceHistoryJob(job);}
      resetPreview();if(data.jobs?.length)autoPreview={id:data.jobs[0].id,revision:previewRevision};refreshHistorySoon();
      notify(requested+' Nano Banana Pro image'+(requested===1?'':'s')+' queued in Batch at the discounted API rate.');
      return;
    }
    notify('Generating '+requested+' Nano Banana Pro image'+(requested===1?'':'s')+'…');
    let completed=0,lastJob=null;
    for(let i=0;i<requested;i++){
      if(!owner||epoch!==sessionEpoch||tool!=='image'||imageEngine!=='gemini')break;
      const data=await api('/api/gemini/jobs',{method:'POST',body:{...inputs,count:1,settings:imageSettings}});
      const job=data.jobs?.[0];if(job){completed++;lastJob=job;if(activeStates.has(job.status))setActive(job);surfaceHistoryJob(job);}
    }
    if(!completed)throw new Error('No Nano Banana Pro generation was submitted.');
    resetPreview();if(lastJob)autoPreview={id:lastJob.id,revision:previewRevision};refreshHistorySoon();
    if(lastJob&&hasResult(lastJob))await openVideo(lastJob,{scroll:false});
    notify(completed+' Nano Banana Pro image'+(completed===1?'':'s')+' completed.');
    return;
  }
  const inputs=await prepareQuoteInputs(await ensureInputs());if(!inputs)return;
  if(selectedTool==='image'){
    const requested=Math.max(1,Math.min(4,Number($('image-count').value)||1));
    const activeImages=activeJobs.filter(j=>slotStates.has(j.status)&&j.settings?.type==='image'&&jobProvider(j)==='spicy').length;
    const available=Math.max(0,limitFor('image')-activeImages);
    if(requested>available)throw new Error('Only '+available+' image slot'+(available===1?' is':'s are')+' available right now. Wait for active images or choose a smaller batch.');
    notify('Preparing '+requested+' image'+(requested===1?'':'s')+'…');
    const imageSettings=settings(),quotes=[];
    for(let i=0;i<requested;i++){
      if(!owner||epoch!==sessionEpoch||tool!=='image')throw new Error('Session or tool changed. No further images submitted.');
      const q=await api('/api/quotes',{method:'POST',body:{...inputs,settings:imageSettings}});
      if(q.settings.type!=='image'||q.settings.mode!==imageSettings.mode||imageSettings.engine==='soul'&&(q.settings.engine!=='soul'||q.settings.characterId!==imageSettings.characterId||q.settings.preset!==imageSettings.preset))throw new Error('Unexpected image quote. No generation submitted.');
      quotes.push(q);
    }
    let submitted=0,lastJob=null;
    for(const q of quotes){
      if(!owner||epoch!==sessionEpoch||tool!=='image')break;
      if(!Number.isFinite(q.expiresAt)||Date.now()>=q.expiresAt)break;
      try{
        const data=await api('/api/jobs',{method:'POST',body:{quoteId:q.id,confirm:true}});
        submitted++;lastJob=data.job;setActive(data.job);surfaceHistoryJob(data.job);
        if(['failed','uncertain','resolved'].includes(data.job.status))break;
      }catch(e){
        if(!submitted)throw e;
        notify(submitted+' of '+requested+' images submitted. '+e.message,true);
        break;
      }
    }
    if(!submitted)throw new Error('No image generation was submitted.');
    resetPreview();
    if(lastJob)autoPreview={id:lastJob.id,revision:previewRevision};
    refreshHistorySoon();
    if(submitted===requested)notify(requested===1?'Image requested. Result appears in History.':requested+' images requested as one batch. Results appear independently in History.');
    return;
  }
  notify(selectedTool==='upscale'?'Preparing one paid upscale at the live provider price…':'Requesting a live price. No generation submitted.');
  const q=await api('/api/quotes',{method:'POST',body:{...inputs,settings:settings()}});
  if(!owner||epoch!==sessionEpoch||tool!==selectedTool)throw new Error('Session or tool changed. No generation submitted.');
  if(selectedTool==='upscale'){
    if(q.settings.type!=='image'||q.settings.mode!=='upscale')throw new Error('Unexpected upscale quote. No generation submitted.');
    await submitQuotedGeneration(q,sessionEpoch);
    return;
  }
  if(selectedTool==='video'&&['seedance','h3maxfal','omni'].includes(engine)&&(q.settings.engine!==engine||q.settings.mode!==mode||q.settings.model!==VIDEO_MODELS[engine].endpoints[mode]))throw new Error('Provider quote does not match the selected video model and mode. Nothing was submitted.');
  currentQuote=q;const isImage=q.settings.type==='image',modeName=q.settings.mode==='text'?'Text to Video':q.settings.mode==='reference'?'Reference to Video':'Image to Video';
  $('quote-settings').textContent=q.settings.mode==='upscale'?`Image Upscaler / ${q.settings.resolution.toUpperCase()} / ${q.settings.outputFormat.toUpperCase()} / source ratio kept`:isImage?`Seedream 5.0 Pro / ${q.settings.referenceSourceIds.length?'Reference Edit':'Text to Image'} / ${q.settings.resolution.toUpperCase()} / ${q.settings.aspectRatio}`:`${videoLabel(q.settings)} / ${modeName} / ${q.settings.duration}s / ${q.settings.resolution}`;
  $('quote-price').textContent=money(q.estimatedUsd);$('quote-limit').textContent=q.priceIsEstimate?`Estimated provider charge: ${money(q.maxUsd)} USD`:`Quoted maximum: ${money(q.maxUsd)} USD`;
  $('quote-expiry').textContent='Valid until '+new Date(q.expiresAt).toLocaleTimeString()+'. No automatic repricing. '+(q.settings.transferNotes||[]).join(' ');
  $('quote-notice').textContent='';$('confirm-generation').disabled=false;$('quote-dialog').showModal();
});
$('confirm-generation').onclick=async()=>{
  const q=currentQuote;if(!q||busy)return;
  if(Date.now()>=q.expiresAt){$('quote-notice').textContent='Quote expired. Close and review a new price.';return;}
  $('confirm-generation').disabled=true;
  await action(()=>submitQuotedGeneration(q));
};
function limitFor(kind){const n=Number(config.concurrency?.[kind]);return Number.isInteger(n)&&n>0?n:1;}
function currentProvider(){return isFalUpscale()?'fal':tool==='image'&&imageEngine==='gemini'?'gemini':tool==='image'&&['fal','soulpro'].includes(imageEngine)?'fal':tool==='video'&&['h3maxfal','omni'].includes(engine)?'fal':'spicy';}
function jobProvider(j){const s=j?.settings||{};return s.provider==='gemini'||s.engine==='gemini'||String(s.model||'').startsWith('gemini-')?'gemini':s.provider==='fal'||['fal','soulpro','h3maxfal','omni'].includes(s.engine)||String(s.model||'').startsWith('fal-ai/')?'fal':'spicy';}
function submissionBlocked(){
  const kind=tool==='upscale'?'image':tool,provider=currentProvider(),falUpscale=tool==='upscale'&&provider==='fal';
  return activeJobs.some(j=>j.status==='uncertain'&&jobProvider(j)===provider&&(!falUpscale||j.settings?.mode==='upscale'))||activeJobs.filter(j=>{const jobKind=j.settings?.type==='image'?'image':'video',backgroundBatch=j.settings?.provider==='gemini'&&j.settings?.processing==='batch';return slotStates.has(j.status)&&jobKind===kind&&!backgroundBatch&&jobProvider(j)===provider;}).length>=limitFor(kind);
}
function schedulePoll(delay=10000){clearTimeout(timer);timer=null;if(owner&&activeJobs.some(j=>j.status!=='uncertain')&&!polling)timer=setTimeout(poll,delay);}
function setActiveJobs(list){
  activeJobs=[...new Map((list||[]).filter(j=>j&&activeStates.has(j.status)).map(j=>[j.id,j])).values()];
  activeJob=activeJobs.find(j=>j.status==='uncertain')||activeJobs[0]||null;
  $('active').hidden=!activeJobs.length;
  const saving=activeJobs.filter(j=>j.status==='saving').length;
  const batchImages=activeJobs.filter(j=>slotStates.has(j.status)&&j.settings?.type==='image'&&jobProvider(j)==='gemini'&&j.settings?.processing==='batch').length;
  const spicyImages=activeJobs.filter(j=>slotStates.has(j.status)&&j.settings?.type==='image'&&jobProvider(j)==='spicy').length;
  const geminiRunning=activeJobs.filter(j=>slotStates.has(j.status)&&j.status!=='uncertain'&&j.settings?.type==='image'&&jobProvider(j)==='gemini'&&j.settings?.processing!=='batch').length;
  const geminiInterrupted=activeJobs.filter(j=>j.status==='uncertain'&&j.settings?.type==='image'&&jobProvider(j)==='gemini').length;
  const falImages=activeJobs.filter(j=>slotStates.has(j.status)&&j.settings?.type==='image'&&jobProvider(j)==='fal').length;
  const videos=activeJobs.filter(j=>slotStates.has(j.status)&&j.settings?.type!=='image').length;
  $('active-status').textContent='Seedream '+spicyImages+' / '+limitFor('image')+' · Nano '+geminiRunning+' / '+limitFor('image')+(geminiInterrupted?' · '+geminiInterrupted+' old Nano interrupted':'')+(batchImages?' · '+batchImages+' Nano batch queued':'')+' · Controlled Pose '+falImages+' / '+limitFor('image')+' · videos '+videos+' / '+limitFor('video')+(saving?' · '+saving+' saving (no generation slot)':'');
  const labels={submitting:'Submitting',queued:'Queued',running:'Generating',saving:'Saving to private archive',uncertain:'Interrupted: check provider before another attempt'};
  const providerLabel=j=>jobProvider(j)==='gemini'?'Gemini':jobProvider(j)==='fal'?'FAL':'SpicyAPI';
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
$('resolve').onclick=()=>action(async()=>{const interrupted=activeJobs.find(j=>j.status==='uncertain');if(!interrupted||!confirm('First check the provider console and its charges. This clears only the interrupted request without sending another generation. Continue only after checking.'))return;await api('/api/jobs/'+interrupted.id+'/resolve',{method:'POST',body:{confirm:true}});await syncHistory();});
function button(text,fn){const b=document.createElement('button');b.className='quiet';b.textContent=text;b.onclick=()=>action(fn);return b;}
async function assetFile(id,name='source'){const blob=await api('/api/assets/'+id,{blob:true}),ext=({'image/jpeg':'jpg','video/quicktime':'mov','audio/mpeg':'mp3','audio/x-wav':'wav'})[blob.type]||blob.type.split('/')[1];return new File([blob],name+'.'+ext,{type:blob.type});}
async function restore(job){
  clearMedia();const p=job.settings||{};engine=engineFor(p);
  if(p.mode==='upscale'){
    upscaleEngine=upscaleMode(p);$('upscale-engine').value=upscaleEngine;
    $('upscale-scale').value=String(p.scale===4?4:2);
    $('upscale-topaz-model').value=p.topazModel==='High Fidelity V3'?'High Fidelity V3':'Standard V2';
  }else if(p.type==='image'){
    imageEngine=p.engine==='gemini'||p.provider==='gemini'?'gemini':p.engine==='soulpro'?'soulpro':p.engine==='soul'?'soul':p.engine==='fal'||p.provider==='fal'?'fal':'seedream';
    imageProcessing=p.processing==='batch'?'batch':'normal';$('image-engine').value=imageEngine;$('image-processing').value=imageProcessing;
    if(imageEngine==='soul'){soul.setSelected(p.characterId||'');soul.restore(p);}
    if(imageEngine==='soulpro'){
      soulProModel=p.soulProModel==='kontextmax'?'kontextmax':'ideogram45';soulProQuality=['very_low','low','medium','high'].includes(p.soulProQuality)?p.soulProQuality:'medium';
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
    else if(job.sourceId){await setImage(await assetFile(job.sourceId,'start-frame'),job.sourceId);if(p.lastSourceId)await setLastImage(await assetFile(p.lastSourceId,'last-frame'),p.lastSourceId);}
  }
  if(controlledPose)poseMapSourceId=p.poseMapSourceId||null;$('prompt').value=p.prompt||'';
  if(soulPro){$('soul-pro-model').value=soulProModel;$('soul-pro-seed').value=p.seed??'';}
  if(p.duration&&!([...$('duration').options].some(o=>Number(o.value)===p.duration)))$('duration').add(new Option(p.duration+' sec',String(p.duration)));
  $('duration').value=p.duration||15;
  if(!isFalUpscale())$('resolution').value=p.resolution||(tool==='upscale'?'4k':tool==='image'?'2k':'1080p');
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
async function openVideo(job,{scroll=true}={}){
  if(!hasResult(job))throw new Error('This job has no completed output to view or download.');
  const revision=++previewRevision,blob=await api('/api/assets/'+job.outputId,{blob:true});
  if(!owner||revision!==previewRevision)return;
  const [kind,ext]=resultFormat(blob);clearResult();
  resultUrl=URL.createObjectURL(blob);resultId=job.outputId;resultKind=kind;resultExt=ext;resultSettings={...job.settings,type:kind};
  if(kind==='image'){$('preview').src=resultUrl;$('preview').alt='Generated image result';$('preview').hidden=false;$('video').hidden=true;}
  else{$('video').src=resultUrl;$('video').hidden=false;$('preview').hidden=true;}
  $('empty').hidden=true;$('download').hidden=false;$('download').textContent='Download '+kind+' / '+ext.toUpperCase();
  $('preview-label').textContent='Generated result / '+(kind==='image'?'Image':job.settings.duration+'s');update();
  if(scroll)document.querySelector('.stage').scrollIntoView({behavior:'smooth',block:'center'});
}
function saveDownload(url,id,ext){const a=document.createElement('a');a.href=url;a.download='parallel-vision-'+id+'.'+ext;document.body.append(a);a.click();a.remove();}
function downloadResult(){if(!owner||!resultUrl||!resultId)return;saveDownload(resultUrl,resultId,resultExt);}
async function downloadJob(job){
  if(!hasResult(job))throw new Error('No output file exists for this job. The reference is not a generated result.');
  if(resultUrl&&resultId===job.outputId){downloadResult();return;}
  const blob=await api('/api/assets/'+job.outputId,{blob:true});if(!owner)return;
  const [,ext]=resultFormat(blob),url=URL.createObjectURL(blob);downloadUrls.add(url);
  saveDownload(url,job.outputId,ext);
  setTimeout(()=>{release(url);downloadUrls.delete(url);},30000);
}
$('download').onclick=downloadResult;


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
async function prepareQuoteInputs(inputs){
  if(tool==='video'){
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
    if(engine==='seedance'&&mode!=='text'){
      const sessionEpoch=epoch;
      const originals=mode==='reference'?references:[{id:inputs.sourceId,file},...(inputs.lastSourceId&&lastFile?[{id:inputs.lastSourceId,file:lastFile}]:[])];
      const oversized=originals.filter(r=>r.file.size>PROVIDER_IMAGE_LIMIT);
      if(!oversized.length)return inputs;
      if(!confirm('SpicyAPI limits image inputs to 10 MiB each. Prepare a private compressed WebP working copy for '+oversized.length+' oversized Seedance reference image(s)? Originals stay unchanged in History.')){notify('Preparation cancelled. No generation was submitted.');return null;}
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
  if(tool==='upscale'&&!isFalUpscale()&&sourcePixels>UPSCALE_PIXELS[$('resolution').value]&&!confirm('This size tier is smaller than your source and would reduce its resolution. Continue with this tier?'))return null;
  const originals=tool==='upscale'||isReinterpret()?[{id:inputs.sourceId,file}]:imageEngine==='soul'&&tool==='image'?[]:references;
  const oversized=originals.filter(r=>r.file.size>PROVIDER_IMAGE_LIMIT);
  if(oversized.length&&!confirm('SpicyAPI limits uploads to 10 MiB per image. Prepare a compressed WebP working copy for '+oversized.length+' oversized image(s)? Pixel dimensions and transparency are kept, but compression can affect fine detail and metadata. The originals stay unchanged in your private archive.')){notify('Preparation cancelled. No generation was submitted.');return null;}
  const transferSourceIds=[];
  for(const item of originals){
    if(item.file.size<=PROVIDER_IMAGE_LIMIT){transferSourceIds.push(item.id);continue;}
    let copy=workingCopies.get(item.id);
    if(!copy||Date.now()-copy.at>900000){
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
  $('resolution').value='2k';$('ratio').value='auto';$('image-count').value='1';update();
  notify('Loaded into Seedream Refine. Review the preset prompt, then click Generate. Nothing has been submitted yet.');
  window.scrollTo({top:0,behavior:'smooth'});
}

async function loadPacks(){const data=await api('/api/packs');packs=data.packs;$('pack-select').replaceChildren(new Option('Choose a saved pack',''),...packs.map(p=>new Option(p.name,p.id)));if($('soul-pro-pack-select'))$('soul-pro-pack-select').replaceChildren(new Option('Choose a saved pack',''),...packs.filter(p=>p.refs?.length>=1).map(p=>new Option(p.name+' · '+p.refs.length+' ref'+(p.refs.length===1?'':'s'),p.id)));}
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
  $('soul-pro-identity-dialog-status').textContent='Select the exact Nina angles you want. 1 to 4 images.';
}
$('soul-pro-identity-manage').onclick=()=>{if(busy)return;clearSoulProPackPreview();$('soul-pro-pack-select').value='';$('soul-pro-identity-dialog-status').textContent='';$('soul-pro-identity-files').value='';$('soul-pro-identity-dialog').showModal();};
$('soul-pro-pack-select').onchange=()=>action(async()=>{const pack=packs.find(p=>p.id===$('soul-pro-pack-select').value);await renderSoulProPack(pack);});
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
    }else if(pack){
      ids=[...soulProPackSelection];
      if(ids.length<1||ids.length>4){status.textContent='Select 1 to 4 images from this pack.';return;}
      sourceLabel=ids.length+' selected image'+(ids.length===1?'':'s')+' from '+pack.name;
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
$('soul-pro-identity-dialog').addEventListener('close',clearSoulProPackPreview);
$('soul-pro-clear-identity').onclick=()=>action(async()=>{
  if(!soulProIdentity.configured)return;if(!confirm('Clear the saved Nina identity? Existing generation history remains.'))return;
  soulProIdentity=await api('/api/soul-pro/identity',{method:'DELETE'});$('soul-pro-identity-dialog').close();update();notify('Saved Nina identity cleared.');
});

const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){
    if(!entry.isIntersecting)continue;
    const img=entry.target;observer.unobserve(img);const rev=historyRevision;
    api('/api/assets/'+img.dataset.asset,{blob:true}).then(blob=>{
      if(!owner||rev!==historyRevision||!img.isConnected)return;
      if(!blob.type.startsWith('image/')||!blob.size)throw new Error('Preview unavailable');
      const u=URL.createObjectURL(blob);cardUrls.add(u);img.dataset.objectUrl=u;img.src=u;
    }).catch(()=>{
      if(!owner||rev!==historyRevision||!img.isConnected)return;
      img.alt=img.dataset.result==='true'?'Generated preview unavailable. Use View image or Download image to retry.':'Uploaded reference preview unavailable.';
      const caption=img.parentElement?.querySelector('figcaption');if(caption)caption.textContent=img.alt;
    });
  }
},{rootMargin:'200px'});
function historyImage(assetId,label,isResult=false){
  const figure=document.createElement('figure');figure.className='history-media'+(isResult?' is-result':'');
  const img=document.createElement('img');img.alt=label;img.dataset.asset=assetId;img.dataset.result=String(isResult);img.loading='lazy';
  const caption=document.createElement('figcaption');caption.textContent=label;figure.append(img,caption);return {figure,img};
}
function historyFingerprint(j){return JSON.stringify([j.status,j.outputId||'',j.providerTaskId||'',j.error||'',j.estimatedUsd??null,j.settledUsd??null,j.updatedAt||'',j.settings]);}
function updateHistorySelectionUi(){
  $('history-selection').hidden=!historySelectMode;
  $('history-select').hidden=historySelectMode;
  $('history').classList.toggle('is-selecting',historySelectMode);
  for(const card of $('history').querySelectorAll('.card')){
    const selectable=historySelectMode&&card.dataset.deletable==='true',selected=historySelected.has(card.dataset.job);
    card.classList.toggle('is-selectable',selectable);card.classList.toggle('is-selected',selected);
    if(selectable){card.tabIndex=0;card.setAttribute('aria-selected',String(selected));}
    else{card.removeAttribute('tabindex');card.removeAttribute('aria-selected');}
    const box=card.querySelector('.history-select-box');if(box){box.hidden=!historySelectMode;const input=box.querySelector('input');if(input)input.checked=selected;}
  }
  $('history-selection-count').textContent=historySelected.size+' selected';
  $('history-delete-selected').disabled=historySelected.size===0;
}
function setHistorySelectMode(on){
  historySelectMode=!!on;if(!historySelectMode)historySelected.clear();updateHistorySelectionUi();
}
function cleanupHistoryCard(card){if(!card)return;for(const img of card.querySelectorAll('img')){observer.unobserve(img);const u=img.dataset.objectUrl;if(u){release(u);cardUrls.delete(u);}}}
function renderCards(jobs,{upsert=false}={}){
  const items=upsert?[...jobs].reverse():jobs;
  for(const j of items){
    const existing=upsert?[...$('history').children].find(el=>el.dataset.job===j.id):null,fingerprint=historyFingerprint(j);
    if(existing?.dataset.fingerprint===fingerprint)continue;
    const card=document.createElement('article');card.className='card';card.dataset.job=j.id;card.dataset.state=j.status;card.dataset.fingerprint=fingerprint;card.dataset.deletable=String(!activeStates.has(j.status));
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
      img.onclick=()=>action(()=>openVideo(j));img.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();img.click();}};
    }else if(ready&&j.sourceId){
      const {figure,img}=historyImage(j.sourceId,'Source thumbnail / generated video ready');previews.push(img);card.append(figure);
    }else{
      const empty=document.createElement('div');empty.className='history-no-result';
      const title=document.createElement('strong'),detail=document.createElement('span');
      title.textContent=j.status==='draft'?'Saved draft':j.status==='failed'?'Generation failed':j.status==='uncertain'?'Status unknown':activeStates.has(j.status)?'Result pending':ready?'Video ready':j.status==='completed'?'Output unavailable':'No result';
      detail.textContent=j.status==='draft'?'No generation submitted.':j.status==='failed'?(j.error||'The provider ended this request without a generated file.'):j.status==='uncertain'?'PV Lab could not confirm the provider state. Check the provider before retrying; nothing will be resubmitted automatically.':activeStates.has(j.status)?'The finished output will appear here.':ready?'View or download your generated video below.':'No generated file is available to view or download.';
      empty.append(title,detail);card.append(empty);
    }
    const body=document.createElement('div');body.className='cardbody';
    const meta=document.createElement('div');meta.className='cardmeta';const imageLabel=image?(j.settings.mode==='upscale'?'UPSCALE / '+upscaleName(j.settings):j.settings.engine==='soulpro'?'PV SOUL PRO / '+(j.settings.soulProModel==='ideogram45'?'IDEOGRAM 4.5 '+String(j.settings.soulProQuality||'medium').toUpperCase():'FLUX KONTEXT MAX'):j.settings.mode==='reinterpret'?'PV SOUL / REINTERPRET / '+(j.settings.presetLabel||j.settings.preset||'').toUpperCase():'IMAGE'):videoLabel(j.settings)+' / '+j.settings.duration+'s';meta.textContent=`${j.status.toUpperCase()} / ${imageLabel} / ${j.settings.mode==='upscale'?upscaleSize(j.settings):j.settings.resolution} / ${new Date(j.createdAt).toLocaleDateString()}`;
    const p=document.createElement('p');p.textContent=j.settings.prompt||(j.settings.mode==='upscale'?'Image upscale / '+j.settings.resolution.toUpperCase():'No direction saved.');
    const actions=document.createElement('div');actions.className='cardactions';
    if(ready){
      const download=button(image?'Download image':'Download video',()=>downloadJob(j));download.classList.add('result-download');actions.append(download);
      actions.append(button(image?'View image':'View video',()=>openVideo(j)));
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
      if(!confirm('Have you checked this '+(jobProvider(j)==='fal'?'FAL':jobProvider(j)==='gemini'?'Google':'SpicyAPI')+' request in the provider dashboard? This closes only this interruption. The reserved estimate stays in spending history. It does not generate, retry, cancel or refund anything.'))return;
      await api('/api/jobs/'+j.id+'/resolve',{method:'POST',body:{confirm:true}});
      await syncHistory();notify('This interruption was marked reviewed. Nothing was generated or resubmitted.');
    }));
    if(!activeStates.has(j.status))actions.append(button('Delete',async()=>{
      if(!confirm('Delete this saved record and its unshared files? This cannot be undone.'))return;
      await api('/api/jobs/'+j.id,{method:'DELETE'});cleanupHistoryCard(card);card.remove();await syncHistory();notify('Record deleted. Spending history is unchanged.');
    }));
    const cost=document.createElement('div');cost.className='fine';
    const provider=jobProvider(j),falEstimate=provider==='fal'&&j.estimatedUsd!=null;
    cost.textContent=j.settledUsd!=null?'Provider settled: '+money(j.settledUsd):falEstimate&&j.status==='failed'?'Lab estimate released: '+money(j.estimatedUsd)+' · provider billing not reported':falEstimate&&j.status==='uncertain'?'Lab estimate reserved: '+money(j.estimatedUsd)+' · provider status unknown':falEstimate?'Lab estimate reserved: '+money(j.estimatedUsd):j.estimatedUsd!=null?'Budget reserved: '+money(j.estimatedUsd):'Draft / no generation charge';
    body.append(meta,p,actions,cost);if(canReconcile){const help=document.createElement('p');help.className='fine';help.textContent='Find the original request; never submits a generation.';body.append(help);}if(j.settings.transferNotes?.length){const note=document.createElement('p');note.className='fine history-error';note.textContent=j.settings.transferNotes.join(' ');body.append(note);}
    if(j.error){const error=document.createElement('p');error.className='fine history-error';error.textContent=j.error;body.append(error);}
    if(!ready&&j.sourceId){
      const refs=document.createElement('details');refs.className='history-source';const summary=document.createElement('summary');summary.textContent='Uploaded reference / not a result';
      const {figure,img}=historyImage(j.sourceId,'Original uploaded reference');previews.push(img);refs.append(summary,figure);body.append(refs);
    }
    if(j.providerTaskId){const task=document.createElement('div');task.className='fine history-task';task.textContent='Provider task: '+j.providerTaskId;body.append(task);}
    card.append(body);
    if(existing){cleanupHistoryCard(existing);existing.replaceWith(card);}else if(upsert)$('history').prepend(card);else $('history').append(card);
    for(const img of previews)observer.observe(img);
  }
  updateHistorySelectionUi();
}
async function loadHistory(append=false,incremental=false){const rev=historyRevision,query=append&&next?'?before='+next.before+'&afterId='+encodeURIComponent(next.afterId):'',data=await api('/api/jobs'+query);if(!owner||rev!==historyRevision)return;if(!append&&!incremental){historyRevision++;observer.disconnect();cardUrls.forEach(release);cardUrls.clear();$('history').replaceChildren();}renderCards(data.jobs,{upsert:incremental});next=data.next;$('more').hidden=!next;$('emptyarchive').hidden=$('history').children.length>0;if(data.concurrency)config.concurrency=data.concurrency;setActiveJobs(data.activeJobs||(data.active?[data.active]:[]));}
async function syncHistory(){return loadHistory(false,true);}
function surfaceHistoryJob(job){
  if(!job||!owner)return;
  renderCards([job],{upsert:true});$('emptyarchive').hidden=true;
}
function refreshHistorySoon(){
  const expectedEpoch=epoch;
  queueMicrotask(()=>syncHistory().catch(error=>{if(owner&&epoch===expectedEpoch)notify('History refresh delayed. Your queued job is safe. '+error.message,true);}));
}
$('refresh').onclick=()=>action(()=>loadHistory());$('more').onclick=()=>action(()=>loadHistory(true));
$('history-select').onclick=()=>setHistorySelectMode(true);
$('history-cancel-select').onclick=()=>setHistorySelectMode(false);
$('history-select-all').onclick=()=>{
  historySelected=new Set([...$('history').querySelectorAll('.card[data-deletable="true"]')].map(card=>card.dataset.job));
  for(const box of $('history').querySelectorAll('.history-select-box input'))box.checked=true;
  updateHistorySelectionUi();
};
$('history-delete-selected').onclick=()=>action(async()=>{
  const ids=[...historySelected];if(!ids.length)return;
  if(!confirm('Delete '+ids.length+' selected History item'+(ids.length===1?'':'s')+' and their unshared files? This cannot be undone.'))return;
  const result=await api('/api/jobs/bulk-delete',{method:'POST',body:{ids}});
  setHistorySelectMode(false);await loadHistory();notify((result.deleted||ids.length)+' History item'+((result.deleted||ids.length)===1?'':'s')+' deleted. Spending history is unchanged.');
});
function lock(){epoch++;historySelected.clear();historySelectMode=false;clearSoulProPackPreview();soulProIdentity={configured:false,count:0,refs:[]};workingCopies.clear();autoPreview=null;downloadUrls.forEach(release);downloadUrls.clear();owner=false;userId='';soul.reset();historyRevision++;clearTimeout(timer);timer=null;activeJob=null;activeJobs=[];polling=false;requestControllers.forEach(c=>c.abort());requestControllers.clear();observer.disconnect();cardUrls.forEach(release);cardUrls.clear();clearMedia();$('prompt').value='';$('history').replaceChildren();$('app').hidden=true;$('gate').hidden=false;$('connection').hidden=true;$('logout').hidden=true;$('api-key').value='';for(const d of document.querySelectorAll('dialog[open]'))d.close();currentQuote=null;config={};packs=[];$('pack-select').replaceChildren(new Option('Choose a saved pack',''));}
async function sync(){if(syncing)return;syncing=true;try{if(!clerk.isSignedIn){lock();$('auth-status').textContent='Sign in with your Parallel Vision owner account.';$('signin').disabled=false;return;}if(owner&&userId===clerk.user.id)return;const data=await api('/api/session');owner=true;userId=clerk.user.id;applyConfig(data.config);$('identity').textContent='Owner workspace';$('gate').hidden=true;$('app').hidden=false;$('connection').hidden=false;$('logout').hidden=false;await Promise.all([loadHistory(),loadPacks(),soul.load(),loadSoulProIdentity()]);}catch(e){lock();$('auth-status').textContent=e.message;$('signin').disabled=false;$('logout').hidden=!clerk?.isSignedIn;}finally{syncing=false;}}
$('signin').onclick=()=>clerk?.openSignIn();$('logout').onclick=async()=>{lock();await clerk?.signOut();$('auth-status').textContent='Signed out. Your archive remains private.';};
try{const {Clerk}=await import('https://esm.sh/@clerk/clerk-js@6?bundle');await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://clerk.parallelvisionlabel.com/npm/@clerk/ui@1/dist/ui.browser.js';s.onload=resolve;s.onerror=reject;document.head.append(s);});clerk=new Clerk('pk_live_Y2xlcmsucGFyYWxsZWx2aXNpb25sYWJlbC5jb20k');await clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor},signInFallbackRedirectUrl:location.href,signUpFallbackRedirectUrl:location.href});clerk.addListener(()=>void sync());await sync();}catch{$('auth-status').textContent='Sign-in could not load. Refresh this page or check your browser connection.';}
