import {VIDEO_MODELS,engineFor,videoLabel} from './video-models.js?v=20260927-standard1';
import {createMediaReferences} from './media-references.js?v=20260927-standard1';
import { createSessionRequest } from './session-request.js?v=20260927-auth1';
import { PROVIDER_IMAGE_LIMIT, UPSCALE_PIXELS, imageDimensions, providerWorkingCopy, wanUltrawideWorkingCopy, imagePreview, cancelImagePreparation } from './image-tools.js?v=20260927-ultrawide1';
// General-purpose private image-to-video workspace. Credentials never enter browser storage.
const API='https://parallel-vision-lab.parallelvision.workers.dev';
const $=id=>document.getElementById(id), activeStates=new Set(['submitting','queued','running','saving','uncertain']);
let clerk, owner=false, userId='', epoch=0, syncing=false, config={}, file=null, sourceId=null, imageRevision=0, busy=false;
let sourceUrl=null, lastFile=null, lastSourceId=null, lastUrl=null, references=[], mode='start';
let engine='wan', imageEngine='seedream', imageProcessing='normal';
let tool='video', packs=[],resultKind='video',resultExt='mp4';
let resultUrl=null, resultId=null, resultSettings=null, previewRevision=0, autoPreview=null, currentQuote=null, next=null, activeJob=null, timer=null, historyRevision=0;
let activeJobs=[], polling=false;
const downloadUrls=new Set();
const workingCopies=new Map();
let sourcePixels=0;
const cardUrls=new Set(), requestControllers=new Set();
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:4}).format(n);
const notify=(text,error=false)=>{$('notice').textContent=text;$('notice').classList.toggle('error',error);};
function release(url){if(url)URL.revokeObjectURL(url);}
function referenceRoles(){return references.map(r=>({name:r.file.name,role:r.role||'none',note:r.note||''}));}
function settings(){if(tool==='upscale')return {type:'image',mode:'upscale',prompt:'',resolution:$('resolution').value,aspectRatio:'auto',outputFormat:$('output-format').value,referenceRoles:[]};if(tool==='image')return {type:'image',engine:imageEngine,processing:imageProcessing,mode:'image',prompt:$('prompt').value.trim(),resolution:$('resolution').value,aspectRatio:$('ratio').value,outputFormat:$('output-format').value,referenceRoles:referenceRoles()};return {type:'video',engine,mode,referenceVideos:mode==='reference'?mediaRefs.labels('video'):[],referenceAudio:mode==='reference'?mediaRefs.labels('audio'):[],prompt:$('prompt').value.trim(),duration:Number($('duration').value),resolution:$('resolution').value,aspectRatio:$('ratio').value,seed:$('seed').value,audio:$('audio').checked,referenceRoles:referenceRoles()};}
function hasInput(){if(tool==='upscale')return !!file;return tool==='image'||mode==='text'?!!$('prompt').value.trim():mode==='start'?!!file:references.length>0||(engine==='seedance'&&mediaRefs.count()>0);}
function update(){const current=settings(),p=resultSettings||current,ratio=p.aspectRatio==='auto'?(p.mode==='reference'?'adaptive':'source ratio'):p.aspectRatio;$('settings-summary').textContent=p.type==='image'?`${p.mode==='upscale'?'Upscale':p.engine==='gemini'?'Nano Banana Pro':'Image'} / ${p.resolution.toUpperCase()} / ${ratio}`:`${p.duration}s / ${p.resolution} / ${ratio}`;$('save').disabled=!owner||!hasInput()||busy;$('clear').disabled=(!file&&!lastFile&&!references.length&&!mediaRefs.count()&&!resultUrl&&!$('prompt').value.trim())||busy;const ready=tool==='image'&&imageEngine==='gemini'?config.geminiEnabled:config.enabled;$('generate').disabled=!owner||!hasInput()||(tool!=='upscale'&&!current.prompt)||busy||(tool==='image'&&imageEngine==='gemini'?activeJobs.some(j=>j.status==='uncertain'):submissionBlocked());$('generate').textContent=ready?(tool==='image'?(imageEngine==='gemini'?(imageProcessing==='batch'?'Queue batch':'Generate now'):'Generate'):tool==='upscale'?'Upscale':'Review price & generate'):(tool==='image'&&imageEngine==='gemini'?'Gemini API not connected':'Connect generation provider');$('generation-help').textContent=tool==='image'&&imageEngine==='gemini'?(imageProcessing==='batch'?'Batch uses the same Nano Banana Pro model at 50% of standard API price. It runs asynchronously and can take minutes or hours; Google targets completion within 24 hours.':'Normal sends Nano Banana Pro immediately. 1K/2K are estimated at $0.134 per image and 4K at $0.24; Google billing is authoritative.'):(tool==='image'?'Generate starts one paid image at the live provider price, within your daily spending limit. No price-review popup.':tool==='upscale'?'Upscale starts one paid upscaling job at the live provider price, within your daily spending limit. No price-review popup.':'A live quote appears before any paid video.')+' Inputs over 10 MiB need a working copy; the Lab asks first and keeps the original. Saving history does not generate or charge.';for(const el of document.querySelectorAll('.controls input,.controls select,.controls textarea,.mode-tab,.tool-tab'))el.disabled=busy;}
function options(id,values,value){$(id).replaceChildren(...values.map(v=>new Option(v==='auto'?'Follow reference':v.toUpperCase(),v)));$(id).value=value;}
function setTool(value){
  tool=['image','upscale'].includes(value)?value:'video';const image=tool==='image',upscale=tool==='upscale',video=tool==='video';
  for(const name of ['image','video','upscale']){$('tool-'+name).classList.toggle('active',tool===name);$('tool-'+name).setAttribute('aria-pressed',String(tool===name));}
  $('video-modes').hidden=!video;$('duration-control').hidden=!video;$('image-model-control').hidden=!image;$('image-processing-control').hidden=!image||imageEngine!=='gemini';$('image-count-control').hidden=!image;$('video-utilities').hidden=!video;$('format-control').hidden=video||(image&&imageEngine==='gemini');
  $('start-mode').hidden=image||video&&mode!=='start';$('reference-mode').hidden=upscale||video&&mode!=='reference';
  $('last-upload').hidden=upscale;$('start-label').textContent=upscale?'Image to upscale':'Start frame';
  $('upscale-info').hidden=!upscale;$('prompt').hidden=upscale;$('prompt-label').hidden=upscale;$('ratio').parentElement.hidden=upscale;
  $('mode-heading').textContent=upscale?'03 / Image Upscale':image?'02 / Text to Image + Reference Edit':'01 / Image to Video';
  $('engine-name').textContent=upscale?'IMAGE UPSCALER':image?(imageEngine==='gemini'?'NANO BANANA PRO':'SEEDREAM 5.0 PRO'):'WAN 3.0';
  $('prompt-label').textContent=image?'Image direction':'Motion direction';$('prompt').maxLength=image?5000:6000;
  $('prompt').placeholder=image?'Describe the image. Add references for identity, wardrobe, a room or an object, or start with text only.':'One clear action, one camera move, light, atmosphere and sound.';
  options('resolution',upscale?['2k','4k','8k']:image?(imageEngine==='gemini'?['1k','2k','4k']:['1k','2k']):['480p','720p','1080p'],upscale?'4k':image?'2k':'1080p');
  options('output-format',upscale?['png','jpeg','webp']:['png','jpeg'],'png');
  options('ratio',image?(imageEngine==='gemini'?['auto','1:1','2:3','3:2','3:4','4:3','4:5','5:4','9:16','16:9','21:9']:['auto','1:1','4:3','3:4','16:9','9:16','3:2','2:3','4:5','5:4','21:9','9:21','2:1','1:2','3:1','1:3']):['auto','16:9','9:16','1:1','4:3','3:4'],'auto');
  if(image){const values=imageEngine==='gemini'&&imageProcessing==='batch'?[1,2,4,10,20]:[1,2,3,4],selected=Math.min(Number($('image-count').value)||1,values.at(-1));$('image-count').replaceChildren(...values.map(n=>new Option(n+' image'+(n===1?'':'s'),String(n))));$('image-count').value=String(values.includes(selected)?selected:1);}
  configureVideoControls();resetPreview();update();
}
$('tool-upscale').onclick=()=>{if(!busy)setTool('upscale');};
$('tool-image').onclick=()=>{if(!busy)setTool('image');};$('tool-video').onclick=()=>{if(!busy)setTool('video');};
$('image-engine').onchange=()=>{if(busy)return;imageEngine=$('image-engine').value==='gemini'?'gemini':'seedream';$('image-processing').value=imageProcessing;setTool('image');};
$('image-processing').onchange=()=>{if(busy)return;imageProcessing=$('image-processing').value==='batch'?'batch':'normal';setTool('image');};
const sessionRequest=createSessionRequest({baseUrl:API,getSession:()=>clerk?.session});
async function api(path,options={}) {
  const generation=epoch;
  if(!owner&&path!=='/api/session')throw new Error('Sign in first.');
  const assertCurrent=()=>{if(generation!==epoch)throw new Error('Session changed.');};
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),65000);requestControllers.add(controller);
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
function clearResult(){previewRevision++;if(resultUrl){$('preview').removeAttribute('src');$('preview').hidden=true;}release(resultUrl);resultUrl=null;resultId=null;resultSettings=null;$('video').pause();$('video').removeAttribute('src');$('video').load();$('video').hidden=true;$('download').hidden=true;}
function resetPreview(){
  clearResult();
  // Image generation has a result-only canvas. Inputs remain in the reference list.
  const item=tool==='image'||tool==='video'&&mode==='text'?null:(tool==='upscale'||mode==='start')?
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

function clearMedia(){mediaRefs.clear();cancelImagePreparation();closeInputPreview();$('reference-progress').textContent='';imageRevision++;sourcePixels=0;release(sourceUrl);release(lastUrl);sourceUrl=null;lastUrl=null;file=null;sourceId=null;lastFile=null;lastSourceId=null;$('image').value='';$('last-image').value='';for(const r of references)releaseReference(r);references=[];$('reference-images').value='';$('filemeta').textContent='Choose the exact opening frame.';$('last-filemeta').textContent='Leave empty for an open ending.';renderReferences();clearResult();resetPreview();update();}
async function inspectImage(candidate){
  if(!candidate||!['image/jpeg','image/png','image/webp'].includes(candidate.type)||!candidate.size||candidate.size>20*1024*1024)throw new Error('Choose a JPG, PNG or WebP image up to 20 MB.');
  const seedanceInput=tool==='video'&&engine==='seedance',maxSide=tool==='upscale'?16000:seedanceInput?6000:8000;
  const prepared=await imagePreview(candidate),{width,height}=prepared;
  if(Math.min(width,height)<(seedanceInput?300:240)||Math.max(width,height)>maxSide||Math.max(width/height,height/width)>(seedanceInput?2.5:8))throw new Error('Use an image within the model dimensions and aspect ratio, up to '+maxSide.toLocaleString()+' pixels per side.');
  return {file:candidate,id:null,url:URL.createObjectURL(prepared.preview),thumbUrl:URL.createObjectURL(prepared.thumbnail),width,height};
}

async function setImage(candidate,id=null){const revision=++imageRevision,item=await inspectImage(candidate);release(item.thumbUrl);if(revision!==imageRevision||!owner){release(item.url);return false;}release(sourceUrl);clearResult();file=item.file;sourceId=id;sourceUrl=item.url;sourcePixels=item.width*item.height;$('filemeta').textContent=`${candidate.name||'Start frame'} / ${item.width} × ${item.height} / ${(candidate.size/1048576).toFixed(1)} MB`;resetPreview();update();return true;}
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
    for(const name of ['none','identity','outfit','room','pose','object','style','lighting','custom'])role.add(new Option(name==='none'?'No assigned role':name,name));
    role.value=r.role||'none';role.disabled=busy;role.onchange=()=>{r.role=role.value;autoPreview=null;};
    const note=document.createElement('input');note.type='text';note.maxLength=300;note.placeholder='Use only the outfit, keep the room…';note.setAttribute('aria-label','Note for reference '+(i+1));note.value=r.note||'';note.disabled=busy;
    note.oninput=()=>{r.note=note.value;autoPreview=null;};fields.append(title,role,note);
    const controls=document.createElement('div');controls.className='reference-actions';
    const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.onclick=()=>{if(busy)return;closeInputPreview();releaseReference(r);references.splice(i,1);renderReferences();refreshInputPreview();update();};
    const up=document.createElement('button');up.type='button';up.textContent='Up';up.disabled=i===0;up.onclick=()=>{if(busy||i===0)return;closeInputPreview();[references[i-1],references[i]]=[references[i],references[i-1]];renderReferences();refreshInputPreview();update();};
    controls.append(up,remove);item.append(img,fields,controls);fragment.append(item);
  });
  box.replaceChildren(fragment);box.scrollTop=scroll;$('ref-count').textContent=`${references.length} / ${referenceLimit()}`;
}
async function addReferences(list,ids=[],labels=[]){
  const e=epoch,incoming=[...list];if(references.length+incoming.length>referenceLimit())throw new Error('This mode supports up to '+referenceLimit()+' image references.');
  autoPreview=null;$('reference-list').setAttribute('aria-busy','true');let added=0;
  try{
    for(let i=0;i<incoming.length;i++){
      $('reference-progress').textContent='Preparing reference '+(i+1)+' of '+incoming.length+'…';
      const item=await inspectImage(incoming[i]);
      if(e!==epoch||!owner){releaseReference(item);return;}
      item.id=ids[i]||null;item.role=labels[i]?.role||'none';item.note=labels[i]?.note||'';references.push(item);added++;
      renderReferences();refreshInputPreview();update();
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  }finally{
    if(e===epoch){$('reference-list').setAttribute('aria-busy','false');$('reference-progress').textContent=added?added+' reference'+(added===1?'':'s')+' ready. Originals kept unchanged.':'';}
  }
}

function referenceLimit(){return tool==='video'?VIDEO_MODELS[engine].maxImages:10;}
function configureVideoControls(){
  const isVideo=tool==='video',model=VIDEO_MODELS[engine],sd=engine==='seedance';
  $('video-model-control').hidden=!isVideo;$('video-engine').value=engine;
  if(!model.modes.includes(mode))mode='start';
  $('mode-text').hidden=!isVideo||!sd;
  for(const m of ['start','reference','text']){$('mode-'+m).classList.toggle('active',mode===m);$('mode-'+m).setAttribute('aria-selected',String(mode===m));}
  $('start-mode').hidden=tool==='image'||isVideo&&mode!=='start';$('reference-mode').hidden=tool==='upscale'||isVideo&&mode!=='reference';
  $('reference-media').hidden=!isVideo||!sd||mode!=='reference';
  $('start-frame-maker').hidden=!isVideo||mode!=='reference'||sd;
  if(isVideo){
    const ratio=$('ratio').value,duration=Number($('duration').value)||15;
    const ratios=sd&&mode==='start'?['auto']:(!sd&&mode==='start'?[...model.ratios,'21:9']:model.ratios);
    options('ratio',ratios,sd&&mode==='start'?'auto':ratios.includes(ratio)?ratio:'auto');
    $('ratio').parentElement.hidden=sd&&mode==='start';
    $('duration').replaceChildren(...(sd?Array.from({length:27},(_,i)=>i+4):[5,10,15,30]).map(n=>new Option(n+' sec',String(n))));
    if(duration>=model.minSeconds&&duration<=30&&!([...$('duration').options].some(o=>Number(o.value)===duration)))$('duration').add(new Option(duration+' sec',String(duration)));
    $('duration').value=duration>=model.minSeconds&&duration<=30?duration:5;
    $('engine-name').textContent=model.label.toUpperCase();
    $('mode-heading').textContent='01 / '+(mode==='text'?'Text to Video':mode==='reference'?'Reference to Video':'Image to Video');
    $('prompt').maxLength=sd?5000:6000;
    $('prompt-label').textContent=mode==='text'?'Scene direction':'Motion direction';
    $('video-model-note').textContent=sd?'Seedance 2.5 Standard / 4–30s / up to 1080p. Start frame follows your image ratio. Reference mode supports image, video and audio guidance. Provider policies and refusals remain in force.':'Wan 3.0 / Start frame or image references. 21:9 start-frame mode makes a private local center crop, keeps your original, then uses Wan adaptive ratio because Wan rejects an explicit 21:9 parameter. Provider policies and model refusals apply.';
  }
  $('reference-drop').querySelector('small').textContent='Up to '+referenceLimit()+' images';
  $('ref-count').textContent=references.length+' / '+referenceLimit();
}
function setMode(nextMode){mode=VIDEO_MODELS[engine].modes.includes(nextMode)?nextMode:'start';configureVideoControls();resetPreview();update();}
$('mode-text').onclick=()=>{if(!busy)setMode('text');};
$('video-engine').onchange=()=>{
  if(busy)return;
  const requested=$('video-engine').value;
  if(!Object.hasOwn(VIDEO_MODELS,requested)||requested==='seedance'&&!config.videoEngines?.includes('seedance')){$('video-engine').value=engine;notify('The backend has not enabled this model yet.',true);return;}
  if(references.length>VIDEO_MODELS[requested].maxImages){$('video-engine').value=engine;notify('Remove excess references or save an image pack before choosing this model.',true);return;}
  if(requested!=='seedance'&&mediaRefs.count()){$('video-engine').value=engine;notify('Remove video/audio references before changing to Wan. Your inputs have been kept.',true);return;}
  engine=requested;currentQuote=null;if($('quote-dialog').open)$('quote-dialog').close();
  if(engine==='seedance'){$('duration').value='5';$('resolution').value='720p';}
  configureVideoControls();resetPreview();update();
};
const mediaRefs=createMediaReferences({element:$,owner:()=>owner,busy:()=>busy,epoch:()=>epoch,action,changed:()=>{autoPreview=null;update();},
  upload:async snapshot=>(await api('/api/reference-uploads',{method:'POST',headers:{'Content-Type':snapshot.type,'X-Filename':encodeURIComponent(snapshot.name||'reference')},body:snapshot})).id,assetFile});
async function uploadAsset(snapshot){const data=await api('/api/uploads',{method:'POST',headers:{'Content-Type':snapshot.type,'X-Filename':encodeURIComponent(snapshot.name||'source.png')},body:snapshot});return data.id;}
async function ensureSource(){if(sourceId)return sourceId;const snapshot=file,rev=imageRevision;if(!snapshot)throw new Error('Choose a start frame first.');const id=await uploadAsset(snapshot);if(rev!==imageRevision)throw new Error('Image changed during upload. Please try again.');sourceId=id;return id;}
async function ensureLast(){if(!lastFile)return null;if(lastSourceId)return lastSourceId;lastSourceId=await uploadAsset(lastFile);return lastSourceId;}
async function ensureReferences(){
  if(!references.length)throw new Error('Add at least one reference image.');
  for(let i=0;i<references.length;i++){const r=references[i];if(!r.id){notify('Uploading original reference '+(i+1)+' of '+references.length+'…');r.id=await uploadAsset(r.file);}}
  return references.map(r=>r.id);
}
async function ensureInputs(){if(tool==='video'&&engine==='seedance'){if(mode==='text')return {sourceId:null,lastSourceId:null,referenceSourceIds:[],referenceVideoIds:[],referenceAudioIds:[]};if(mode==='reference'){const ids=references.length?await ensureReferences():[];return {sourceId:ids[0]||null,lastSourceId:null,referenceSourceIds:ids,...await mediaRefs.inputs()};}}if(tool==='upscale')return {sourceId:await ensureSource(),lastSourceId:null,referenceSourceIds:[]};if(tool==='image'&&!references.length)return {sourceId:null,lastSourceId:null,referenceSourceIds:[]};if(tool==='image'||mode==='reference'){const ids=await ensureReferences();return {sourceId:ids[0],lastSourceId:null,referenceSourceIds:ids};}return {sourceId:await ensureSource(),lastSourceId:await ensureLast(),referenceSourceIds:[]};}
function applyConfig(c){config=c;$('video-engine').querySelector('[value=seedance]').disabled=!c.videoEngines?.includes('seedance');$('connection-status').textContent=(c.enabled?'SpicyAPI connected':'SpicyAPI disconnected')+(c.geminiEnabled?' · Gemini connected':'')+' / Private archive ready';update();}
function connection(){if(!owner)return;$('api-key').value='';$('daily-limit').value=config.dailyLimitUsd||10;$('terms').checked=false;$('disconnect').hidden=!config.configured;$('key-note').textContent=config.configured?'A key is stored encrypted. Leave blank to keep it, or paste a replacement.':'Stored encrypted on your private backend. Never committed to GitHub or saved in browser storage.';$('connect-notice').textContent='';$('connect-dialog').showModal();}
$('connect-form').addEventListener('submit',async e=>{e.preventDefault();$('connect-save').disabled=true;try{const data=await api('/api/settings',{method:'POST',body:{apiKey:$('api-key').value,dailyLimitUsd:Number($('daily-limit').value),enabled:true,termsConfirmed:$('terms').checked}});$('api-key').value='';applyConfig(data.config);$('connect-dialog').close();notify('Provider key connected. Images and Upscale start on click; Video keeps price review.');}catch(error){$('connect-notice').textContent=error.message;}finally{$('connect-save').disabled=false;}});
$('disconnect').onclick=async()=>{if(!confirm('Remove the stored provider key? Your private history stays.'))return;try{applyConfig((await api('/api/settings',{method:'DELETE'})).config);$('api-key').value='';$('connect-dialog').close();notify('Generation disconnected.');}catch(e){$('connect-notice').textContent=e.message;}};
for(const button of document.querySelectorAll('[data-close]'))button.onclick=()=>$(button.dataset.close).close();
$('connect-dialog').addEventListener('close',()=>{$('api-key').value='';});
$('quote-dialog').addEventListener('close',()=>{currentQuote=null;if(owner)$('generate').focus();});
$('setup').onclick=connection;$('connection').onclick=connection;
$('mode-start').onclick=()=>setMode('start');$('mode-reference').onclick=()=>setMode('reference');
$('image').onchange=e=>action(async()=>{if(e.target.files[0])await setImage(e.target.files[0]);});
$('last-image').onchange=e=>action(async()=>{if(e.target.files[0])await setLastImage(e.target.files[0]);});
$('reference-images').onchange=e=>action(async()=>{if(e.target.files.length)await addReferences(e.target.files);e.target.value='';});
function bindDrop(zone,input,handler){for(const name of ['dragenter','dragover'])$(zone).addEventListener(name,e=>{e.preventDefault();$(zone).classList.add('drag');});for(const name of ['dragleave','drop'])$(zone).addEventListener(name,e=>{e.preventDefault();$(zone).classList.remove('drag');});$(zone).addEventListener('drop',e=>action(async()=>{await handler(e.dataTransfer.files);$(input).value='';}));}
bindDrop('drop','image',async files=>{if(files[0])await setImage(files[0]);});
bindDrop('last-drop','last-image',async files=>{if(files[0])await setLastImage(files[0]);});
bindDrop('reference-drop','reference-images',async files=>{if(files.length)await addReferences(files);});
$('clear').onclick=()=>{clearMedia();notify('Editor cleared. Saved work is unchanged.');};
for(const id of ['prompt','duration','resolution','ratio','seed','audio','output-format','image-count'])$(id).addEventListener('input',()=>{autoPreview=null;update();});
$('save').onclick=()=>action(async()=>{const inputs=await ensureInputs();await api('/api/drafts',{method:'POST',body:{...inputs,settings:settings()}});await syncHistory();notify('Saved privately with the original media and settings. No generation charge.');});
// Image Generate and Upscale authorize a paid request on click. Video keeps the quote dialog.
async function submitQuotedGeneration(q, expectedEpoch=epoch) {
  if(!owner||epoch!==expectedEpoch)throw new Error('Session changed.');
  if(!q||!Number.isFinite(q.expiresAt)||Date.now()>=q.expiresAt)throw new Error('Quote expired. No generation submitted. Please try again.');
  // Retain the same quote ID through the session-safe request helper. Never reprice/retry a paid task here.
  const data=await api('/api/jobs',{method:'POST',body:{quoteId:q.id,confirm:true}});
  if($('quote-dialog').open)$('quote-dialog').close();
  resetPreview();autoPreview={id:data.job.id,revision:previewRevision};setActive(data.job);
  await syncHistory();
  const failed=['failed','uncertain','resolved'].includes(data.job.status);
  notify(failed?(data.job.error||'The generation was not confirmed. Check History before another attempt.'):
    (['image','upscale'].includes(q.settings.mode)?(q.settings.mode==='upscale'?'Upscale requested.':'Image requested.')+' Quoted maximum: '+money(q.maxUsd)+' USD. Results appear in History.':'Generation request recorded. You can leave the page and return to History.'),failed);
}
$('generate').onclick=()=>action(async()=>{
  if(!config.enabled){connection();return;}
  if(submissionBlocked())throw new Error('An active-job limit or an interrupted request blocks another generation. Check History.');
  const selectedTool=tool,sessionEpoch=epoch;
  if(tool==='video'&&engine==='seedance'&&!config.videoEngines?.includes('seedance'))throw new Error('Seedance is not enabled on this backend.');
  if(selectedTool==='image'&&imageEngine==='gemini'){
    if(!config.geminiEnabled)throw new Error('Gemini API key is not available on the Lab backend.');
    const inputs=await ensureInputs(),requested=Math.max(1,Math.min(imageProcessing==='batch'?20:4,Number($('image-count').value)||1)),imageSettings=settings();
    if(imageProcessing==='batch'){
      notify('Queueing '+requested+' Nano Banana Pro image'+(requested===1?'':'s')+' in Batch…');
      const data=await api('/api/gemini/jobs',{method:'POST',body:{...inputs,count:requested,settings:imageSettings}});
      for(const job of data.jobs||[])setActive(job);
      resetPreview();if(data.jobs?.length)autoPreview={id:data.jobs[0].id,revision:previewRevision};await syncHistory();
      notify(requested+' Nano Banana Pro image'+(requested===1?'':'s')+' queued in Batch at the discounted API rate.');
      return;
    }
    notify('Generating '+requested+' Nano Banana Pro image'+(requested===1?'':'s')+'…');
    let completed=0,lastJob=null;
    for(let i=0;i<requested;i++){
      if(!owner||epoch!==sessionEpoch||tool!=='image'||imageEngine!=='gemini')break;
      const data=await api('/api/gemini/jobs',{method:'POST',body:{...inputs,count:1,settings:imageSettings}});
      const job=data.jobs?.[0];if(job){completed++;lastJob=job;if(activeStates.has(job.status))setActive(job);}
    }
    if(!completed)throw new Error('No Nano Banana Pro generation was submitted.');
    resetPreview();if(lastJob)autoPreview={id:lastJob.id,revision:previewRevision};await syncHistory();
    if(lastJob&&hasResult(lastJob))await openVideo(lastJob,{scroll:false});
    notify(completed+' Nano Banana Pro image'+(completed===1?'':'s')+' completed.');
    return;
  }
  const inputs=await prepareQuoteInputs(await ensureInputs());if(!inputs)return;
  if(selectedTool==='image'){
    const requested=Math.max(1,Math.min(4,Number($('image-count').value)||1));
    const activeImages=activeJobs.filter(j=>j.settings?.type==='image').length;
    const available=Math.max(0,limitFor('image')-activeImages);
    if(requested>available)throw new Error('Only '+available+' image slot'+(available===1?' is':'s are')+' available right now. Wait for active images or choose a smaller batch.');
    notify('Preparing '+requested+' image'+(requested===1?'':'s')+'…');
    const imageSettings=settings(),quotes=[];
    for(let i=0;i<requested;i++){
      if(!owner||epoch!==sessionEpoch||tool!=='image')throw new Error('Session or tool changed. No further images submitted.');
      const q=await api('/api/quotes',{method:'POST',body:{...inputs,settings:imageSettings}});
      if(q.settings.type!=='image'||q.settings.mode!=='image')throw new Error('Unexpected image quote. No generation submitted.');
      quotes.push(q);
    }
    let submitted=0,lastJob=null;
    for(const q of quotes){
      if(!owner||epoch!==sessionEpoch||tool!=='image')break;
      if(!Number.isFinite(q.expiresAt)||Date.now()>=q.expiresAt)break;
      try{
        const data=await api('/api/jobs',{method:'POST',body:{quoteId:q.id,confirm:true}});
        submitted++;lastJob=data.job;setActive(data.job);
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
    await syncHistory();
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
  if(selectedTool==='video'&&engine==='seedance'&&(q.settings.engine!=='seedance'||q.settings.mode!==mode||q.settings.model!==VIDEO_MODELS.seedance.endpoints[mode]))throw new Error('Provider quote does not match the selected Seedance mode. Nothing was submitted.');
  currentQuote=q;const isImage=q.settings.type==='image',modeName=q.settings.mode==='text'?'Text to Video':q.settings.mode==='reference'?'Reference to Video':'Image to Video';
  $('quote-settings').textContent=q.settings.mode==='upscale'?`Image Upscaler / ${q.settings.resolution.toUpperCase()} / ${q.settings.outputFormat.toUpperCase()} / source ratio kept`:isImage?`Seedream 5.0 Pro / ${q.settings.referenceSourceIds.length?'Reference Edit':'Text to Image'} / ${q.settings.resolution.toUpperCase()} / ${q.settings.aspectRatio}`:`${videoLabel(q.settings)} / ${modeName} / ${q.settings.duration}s / ${q.settings.resolution}`;
  $('quote-price').textContent=money(q.estimatedUsd);$('quote-limit').textContent=`Quoted maximum: ${money(q.maxUsd)} USD`;
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
function submissionBlocked(){return activeJobs.some(j=>j.status==='uncertain')||activeJobs.filter(j=>(j.settings?.type==='image'?'image':'video')===(tool==='upscale'?'image':tool)).length>=limitFor(tool==='upscale'?'image':tool);}
function schedulePoll(delay=10000){clearTimeout(timer);timer=null;if(owner&&activeJobs.some(j=>j.status!=='uncertain')&&!polling)timer=setTimeout(poll,delay);}
function setActiveJobs(list){
  activeJobs=[...new Map((list||[]).filter(j=>j&&activeStates.has(j.status)).map(j=>[j.id,j])).values()];
  activeJob=activeJobs.find(j=>j.status==='uncertain')||activeJobs[0]||null;
  $('active').hidden=!activeJobs.length;
  const images=activeJobs.filter(j=>j.settings?.type==='image').length,videos=activeJobs.length-images;
  $('active-status').textContent=images+' / '+limitFor('image')+' images active · '+videos+' / '+limitFor('video')+' videos active';
  const labels={submitting:'Submitting',queued:'Queued',running:'Generating',saving:'Saving',uncertain:'Interrupted: check provider before another attempt'};
  $('active-detail').textContent=activeJobs.map((j,i)=>(i+1)+'. '+(j.settings?.type==='image'?'Image':'Video')+' · '+labels[j.status]+(j.error?' · '+j.error:'')+(j.providerTaskId?' · '+j.providerTaskId:'')).join('\n');
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
async function restore(job){clearMedia();const p=job.settings||{};engine=engineFor(p);setTool(p.mode==='upscale'?'upscale':p.type||'video');setMode(p.mode||'start');if(tool==='image'){$('start-mode').hidden=true;$('reference-mode').hidden=false;}const refs=tool==='image'||p.mode==='reference';if(refs){const ids=p.referenceSourceIds||[];const files=await Promise.all(ids.map((id,i)=>assetFile(id,(p.referenceRoles?.[i]?.name||'reference-'+(i+1)).replace(/\.[^.]+$/,''))));await addReferences(files,ids,p.referenceRoles||[]);}else if(job.sourceId){await setImage(await assetFile(job.sourceId,'start-frame'),job.sourceId);if(p.lastSourceId)await setLastImage(await assetFile(p.lastSourceId,'last-frame'),p.lastSourceId);}$('prompt').value=p.prompt||'';
  if(p.duration&&!([...$('duration').options].some(o=>Number(o.value)===p.duration)))$('duration').add(new Option(p.duration+' sec',String(p.duration)));
  $('duration').value=p.duration||15;$('resolution').value=p.resolution||(tool==='image'?'2k':'1080p');$('ratio').value=p.aspectRatio||'auto';$('seed').value=p.seed??'';$('audio').checked=p.audio!==false;$('output-format').value=p.outputFormat||'jpeg';if(p.engine==='seedance'||engineFor(p)==='seedance')await mediaRefs.restore(p);configureVideoControls();update();notify('Original media, reference roles, prompt and settings restored. Nothing generated or charged.');$('prompt').focus();window.scrollTo({top:0,behavior:'smooth'});}
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

async function prepareQuoteInputs(inputs){
  if(tool==='video'){
    if(engine==='wan'&&mode==='start'&&$('ratio').value==='21:9'){
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
  if(tool==='upscale'&&sourcePixels>UPSCALE_PIXELS[$('resolution').value]&&!confirm('This size tier is smaller than your source and would reduce its resolution. Continue with this tier?'))return null;
  const originals=tool==='upscale'?[{id:inputs.sourceId,file}]:references;
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
  update();notify('Image loaded for upscaling. Choose the size, then click Upscale to start one paid job. Nothing has been submitted yet.');
  window.scrollTo({top:0,behavior:'smooth'});
}

async function animateImage(job){clearMedia();setTool('video');setMode('start');await setImage(await assetFile(job.outputId,'generated-image'),job.outputId);$('prompt').value='';update();notify('Generated image loaded as the video start frame. Add motion direction and review the price.');window.scrollTo({top:0,behavior:'smooth'});}
async function loadPacks(){const data=await api('/api/packs');packs=data.packs;$('pack-select').replaceChildren(new Option('Choose a saved pack',''),...packs.map(p=>new Option(p.name,p.id)));}
$('pack-save').onclick=()=>action(async()=>{if(!references.length)throw new Error('Add reference images first.');const name=window.prompt('Name this reference pack, for example Nina FOK / Editorial');if(!name?.trim())return;const ids=await ensureReferences();await api('/api/packs',{method:'POST',body:{name:name.trim(),engine:tool==='video'?engine:'wan',referenceSourceIds:ids,referenceRoles:referenceRoles()}});await loadPacks();notify('Reference pack saved privately. No generation charge.');});
$('pack-load').onclick=()=>action(async()=>{const pack=packs.find(p=>p.id===$('pack-select').value);if(!pack)throw new Error('Choose a saved pack.');if(pack.refs.length>referenceLimit())throw new Error('This pack needs Seedance reference mode: it contains more than '+referenceLimit()+' images.');if(references.length&&!confirm('Replace the current references with this pack?'))return;const files=await Promise.all(pack.refs.map(r=>assetFile(r.id,r.name.replace(/\.[^.]+$/,''))));references.forEach(releaseReference);references=[];await addReferences(files,pack.refs.map(r=>r.id),pack.refs);notify('Pack loaded with reference order, roles and notes.');});
$('pack-delete').onclick=()=>action(async()=>{const id=$('pack-select').value;if(!id||!confirm('Delete this reference pack? Existing generation history remains.'))return;await api('/api/packs/'+id,{method:'DELETE'});await loadPacks();notify('Reference pack deleted.');});
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
function cleanupHistoryCard(card){if(!card)return;for(const img of card.querySelectorAll('img')){observer.unobserve(img);const u=img.dataset.objectUrl;if(u){release(u);cardUrls.delete(u);}}}
function renderCards(jobs,{upsert=false}={}){
  const items=upsert?[...jobs].reverse():jobs;
  for(const j of items){
    const existing=upsert?[...$('history').children].find(el=>el.dataset.job===j.id):null,fingerprint=historyFingerprint(j);
    if(existing?.dataset.fingerprint===fingerprint)continue;
    const card=document.createElement('article');card.className='card';card.dataset.job=j.id;card.dataset.state=j.status;card.dataset.fingerprint=fingerprint;
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
      title.textContent=j.status==='draft'?'Saved draft':activeStates.has(j.status)?'Result pending':ready?'Video ready':j.status==='completed'?'Output unavailable':'No result';
      detail.textContent=j.status==='draft'?'No generation submitted.':activeStates.has(j.status)?'The finished output will appear here.':ready?'View or download your generated video below.':'No generated file is available to view or download.';
      empty.append(title,detail);card.append(empty);
    }
    const body=document.createElement('div');body.className='cardbody';
    const meta=document.createElement('div');meta.className='cardmeta';meta.textContent=`${j.status.toUpperCase()} / ${image?(j.settings.mode==='upscale'?'UPSCALE':'IMAGE'):videoLabel(j.settings)+' / '+j.settings.duration+'s'} / ${j.settings.resolution} / ${new Date(j.createdAt).toLocaleDateString()}`;
    const p=document.createElement('p');p.textContent=j.settings.prompt||(j.settings.mode==='upscale'?'Image upscale / '+j.settings.resolution.toUpperCase():'No direction saved.');
    const actions=document.createElement('div');actions.className='cardactions';
    if(ready){
      const download=button(image?'Download image':'Download video',()=>downloadJob(j));download.classList.add('result-download');actions.append(download);
      actions.append(button(image?'View image':'View video',()=>openVideo(j)));
    }else{
      const download=button(image?'Download image':'Download video',async()=>{});download.disabled=true;download.title='Available only when a completed output file exists.';actions.append(download);
    }
    actions.append(button('Reuse',()=>restore(j)));
    if(ready&&image){actions.append(button('Upscale',()=>upscaleImage(j)));actions.append(button('Use in Video',()=>animateImage(j)));}
    if(!activeStates.has(j.status))actions.append(button('Delete',async()=>{
      if(!confirm('Delete this saved record and its unshared files? This cannot be undone.'))return;
      await api('/api/jobs/'+j.id,{method:'DELETE'});cleanupHistoryCard(card);card.remove();await syncHistory();notify('Record deleted. Spending history is unchanged.');
    }));
    const cost=document.createElement('div');cost.className='fine';cost.textContent=j.settledUsd!=null?'Provider settled: '+money(j.settledUsd):j.estimatedUsd!=null?'Budget reserved: '+money(j.estimatedUsd):'Draft / no generation charge';
    body.append(meta,p,actions,cost);if(j.settings.transferNotes?.length){const note=document.createElement('p');note.className='fine history-error';note.textContent=j.settings.transferNotes.join(' ');body.append(note);}
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
}
async function loadHistory(append=false,incremental=false){const rev=historyRevision,query=append&&next?'?before='+next.before+'&afterId='+encodeURIComponent(next.afterId):'',data=await api('/api/jobs'+query);if(!owner||rev!==historyRevision)return;if(!append&&!incremental){historyRevision++;observer.disconnect();cardUrls.forEach(release);cardUrls.clear();$('history').replaceChildren();}renderCards(data.jobs,{upsert:incremental});next=data.next;$('more').hidden=!next;$('emptyarchive').hidden=$('history').children.length>0;if(data.concurrency)config.concurrency=data.concurrency;setActiveJobs(data.activeJobs||(data.active?[data.active]:[]));}
async function syncHistory(){return loadHistory(false,true);}
$('refresh').onclick=()=>action(()=>loadHistory());$('more').onclick=()=>action(()=>loadHistory(true));
function lock(){epoch++;workingCopies.clear();autoPreview=null;downloadUrls.forEach(release);downloadUrls.clear();owner=false;userId='';historyRevision++;clearTimeout(timer);timer=null;activeJob=null;activeJobs=[];polling=false;requestControllers.forEach(c=>c.abort());requestControllers.clear();observer.disconnect();cardUrls.forEach(release);cardUrls.clear();clearMedia();$('prompt').value='';$('history').replaceChildren();$('app').hidden=true;$('gate').hidden=false;$('connection').hidden=true;$('logout').hidden=true;$('api-key').value='';for(const d of document.querySelectorAll('dialog[open]'))d.close();currentQuote=null;config={};packs=[];$('pack-select').replaceChildren(new Option('Choose a saved pack',''));}
async function sync(){if(syncing)return;syncing=true;try{if(!clerk.isSignedIn){lock();$('auth-status').textContent='Sign in with your Parallel Vision owner account.';$('signin').disabled=false;return;}if(owner&&userId===clerk.user.id)return;const data=await api('/api/session');owner=true;userId=clerk.user.id;applyConfig(data.config);$('identity').textContent='Owner workspace';$('gate').hidden=true;$('app').hidden=false;$('connection').hidden=false;$('logout').hidden=false;await loadHistory();await loadPacks();}catch(e){lock();$('auth-status').textContent=e.message;$('signin').disabled=false;$('logout').hidden=!clerk?.isSignedIn;}finally{syncing=false;}}
$('signin').onclick=()=>clerk?.openSignIn();$('logout').onclick=async()=>{lock();await clerk?.signOut();$('auth-status').textContent='Signed out. Your archive remains private.';};
try{const {Clerk}=await import('https://esm.sh/@clerk/clerk-js@6?bundle');await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://clerk.parallelvisionlabel.com/npm/@clerk/ui@1/dist/ui.browser.js';s.onload=resolve;s.onerror=reject;document.head.append(s);});clerk=new Clerk('pk_live_Y2xlcmsucGFyYWxsZWx2aXNpb25sYWJlbC5jb20k');await clerk.load({ui:window.__internal_ClerkUICtor,signInFallbackRedirectUrl:location.href,signUpFallbackRedirectUrl:location.href});clerk.addListener(()=>void sync());await sync();}catch{$('auth-status').textContent='Sign-in could not load. Refresh this page or check your browser connection.';}
