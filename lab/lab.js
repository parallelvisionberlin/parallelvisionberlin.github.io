// General-purpose private image-to-video workspace. Credentials never enter browser storage.
const API='https://parallel-vision-lab.parallelvision.workers.dev';
const $=id=>document.getElementById(id), activeStates=new Set(['submitting','queued','running','saving','uncertain']);
let clerk, owner=false, userId='', epoch=0, syncing=false, config={}, file=null, sourceId=null, imageRevision=0, busy=false;
let sourceUrl=null, lastFile=null, lastSourceId=null, lastUrl=null, references=[], mode='start';
let tool='video', packs=[],resultKind='video',resultExt='mp4';
let resultUrl=null, resultId=null, resultSettings=null, previewRevision=0, autoPreview=null, currentQuote=null, next=null, activeJob=null, timer=null, historyRevision=0;
const downloadUrls=new Set();
const cardUrls=new Set(), requestControllers=new Set();
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:4}).format(n);
const notify=(text,error=false)=>{$('notice').textContent=text;$('notice').classList.toggle('error',error);};
function release(url){if(url)URL.revokeObjectURL(url);}
function referenceRoles(){return references.map(r=>({name:r.file.name,role:r.role||'none',note:r.note||''}));}
function settings(){if(tool==='image')return {type:'image',mode:'image',prompt:$('prompt').value.trim(),resolution:$('resolution').value,aspectRatio:$('ratio').value,outputFormat:$('output-format').value,referenceRoles:referenceRoles()};return {type:'video',mode,prompt:$('prompt').value.trim(),duration:Number($('duration').value),resolution:$('resolution').value,aspectRatio:$('ratio').value,seed:$('seed').value,audio:$('audio').checked,referenceRoles:referenceRoles()};}
function hasInput(){return tool==='image'?!!$('prompt').value.trim():mode==='start'?!!file:references.length>0;}
function update(){const current=settings(),p=resultSettings||current,ratio=p.aspectRatio==='auto'?(p.mode==='reference'?'adaptive':'source ratio'):p.aspectRatio;$('settings-summary').textContent=p.type==='image'?`Image / ${p.resolution.toUpperCase()} / ${ratio}`:`${p.duration}s / ${p.resolution} / ${ratio}`;$('save').disabled=!owner||!hasInput()||busy;$('clear').disabled=(!file&&!lastFile&&!references.length&&!resultUrl)||busy;$('generate').disabled=!owner||!hasInput()||!current.prompt||busy||!!activeJob;$('generate').textContent=config.enabled?'Review price & generate':'Connect generation provider';for(const el of document.querySelectorAll('.controls input,.controls select,.controls textarea,.mode-tab,.tool-tab'))el.disabled=busy;}
function options(id,values,value){$(id).replaceChildren(...values.map(v=>new Option(v==='auto'?'Follow reference':v.toUpperCase(),v)));$(id).value=value;}
function setTool(value){tool=value==='image'?'image':'video';const image=tool==='image';$('tool-image').classList.toggle('active',image);$('tool-video').classList.toggle('active',!image);$('tool-image').setAttribute('aria-pressed',String(image));$('tool-video').setAttribute('aria-pressed',String(!image));$('video-modes').hidden=image;$('duration-control').hidden=image;$('video-utilities').hidden=image;$('format-control').hidden=!image;$('start-mode').hidden=image||mode!=='start';$('reference-mode').hidden=!image&&mode!=='reference';$('mode-heading').textContent=image?'02 / Text to Image + Reference Edit':'01 / Image to Video';$('engine-name').textContent=image?'SEEDREAM 5.0 PRO':'WAN 3.0';$('prompt-label').textContent=image?'Image direction':'Motion direction';$('prompt').maxLength=image?5000:6000;$('prompt').placeholder=image?'Describe the image. Add references for identity, wardrobe, a room or an object, or start with text only.':'One clear action, one camera move, light, atmosphere and sound.';options('resolution',image?['1k','2k']:['480p','720p','1080p'],image?'2k':'1080p');options('ratio',image?['auto','1:1','4:3','3:4','16:9','9:16','3:2','2:3','4:5','5:4','21:9','9:21','2:1','1:2','3:1','1:3']:['auto','16:9','9:16','1:1','4:3','3:4'],image?'1:1':'auto');clearResult();resetPreview();update();}
$('tool-image').onclick=()=>{if(!busy)setTool('image');};$('tool-video').onclick=()=>{if(!busy)setTool('video');};
async function api(path,options={}) {
  const generation=epoch,token=await clerk?.session?.getToken();if(!owner&&path!=='/api/session')throw new Error('Sign in first.');if(!token)throw new Error('Your sign-in expired. Sign in again.');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),65000);requestControllers.add(controller);
  try{const headers={Authorization:'Bearer '+token,...options.headers};let b=options.body;
    if(b!==undefined&&!(b instanceof Blob)&&!(b instanceof ArrayBuffer)){headers['Content-Type']='application/json';b=JSON.stringify(b);}
    const r=await fetch(API+path,{method:options.method||'GET',headers,body:b,cache:'no-store',credentials:'omit',signal:controller.signal});
    if(generation!==epoch)throw new Error('Session changed.');
    if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.error||`Request failed (${r.status}).`);}
    const value=options.blob?await r.blob():await r.json();if(generation!==epoch)throw new Error('Session changed.');return value;
  }finally{clearTimeout(timeout);requestControllers.delete(controller);}
}
async function action(fn){if(busy)return;busy=true;update();try{await fn();}catch(e){notify(e.name==='AbortError'?'Request interrupted. Refresh history before trying another generation.':e.message,true);}finally{busy=false;update();}}
function clearResult(){previewRevision++;if(resultUrl){$('preview').removeAttribute('src');$('preview').hidden=true;}release(resultUrl);resultUrl=null;resultId=null;resultSettings=null;$('video').pause();$('video').removeAttribute('src');$('video').load();$('video').hidden=true;$('download').hidden=true;}
function resetPreview(){clearResult();$('preview').alt='Uploaded source image, not a generated result';const item=tool==='video'&&mode==='start'?(sourceUrl?{url:sourceUrl,label:'Start frame'}:null):(references[0]?{url:references[0].url,label:'Reference 1'}:null);if(item){$('preview').src=item.url;$('preview').hidden=false;$('empty').hidden=true;$('preview-label').textContent=item.label+' / preview';}else{$('preview').removeAttribute('src');$('preview').hidden=true;$('empty').hidden=false;$('preview-label').textContent='Source / preview';}}
function clearMedia(){imageRevision++;release(sourceUrl);release(lastUrl);sourceUrl=null;lastUrl=null;file=null;sourceId=null;lastFile=null;lastSourceId=null;$('image').value='';$('last-image').value='';for(const r of references)release(r.url);references=[];$('reference-images').value='';$('filemeta').textContent='Choose the exact opening frame.';$('last-filemeta').textContent='Leave empty for an open ending.';renderReferences();clearResult();resetPreview();update();}
async function inspectImage(candidate){if(!candidate||!['image/jpeg','image/png','image/webp'].includes(candidate.type)||!candidate.size||candidate.size>20*1024*1024)throw new Error('Choose a JPG, PNG or WebP image up to 20 MB.');const url=URL.createObjectURL(candidate),probe=new Image();probe.src=url;try{await probe.decode();if(Math.min(probe.naturalWidth,probe.naturalHeight)<240||Math.max(probe.naturalWidth,probe.naturalHeight)>8000||Math.max(probe.naturalWidth/probe.naturalHeight,probe.naturalHeight/probe.naturalWidth)>8)throw new Error('Use an image 240 to 8000 pixels per side, with an aspect ratio no wider than 8:1.');}catch(e){release(url);throw new Error(e.message||'Image cannot be opened.');}return {file:candidate,id:null,url,width:probe.naturalWidth,height:probe.naturalHeight};}
async function setImage(candidate,id=null){const revision=++imageRevision,item=await inspectImage(candidate);if(revision!==imageRevision||!owner){release(item.url);return false;}release(sourceUrl);clearResult();file=item.file;sourceId=id;sourceUrl=item.url;$('filemeta').textContent=`${candidate.name||'Start frame'} / ${item.width} × ${item.height} / ${(candidate.size/1048576).toFixed(1)} MB`;resetPreview();update();return true;}
async function setLastImage(candidate,id=null){const e=epoch,item=await inspectImage(candidate);if(e!==epoch||!owner){release(item.url);return false;}release(lastUrl);lastFile=item.file;lastSourceId=id;lastUrl=item.url;$('last-filemeta').textContent=`${candidate.name||'Last frame'} / ${item.width} × ${item.height} / ${(candidate.size/1048576).toFixed(1)} MB`;update();return true;}
function renderReferences(){const box=$('reference-list');box.replaceChildren();references.forEach((r,i)=>{const item=document.createElement('div');item.className='reference-item';const img=document.createElement('img');img.src=r.url;img.alt='Reference '+(i+1);const fields=document.createElement('div');fields.className='reference-fields';const title=document.createElement('strong');title.textContent='Reference '+(i+1)+' / '+r.file.name;const role=document.createElement('select');role.setAttribute('aria-label','Role for reference '+(i+1));for(const name of ['none','identity','outfit','room','pose','object','style','lighting','custom'])role.add(new Option(name==='none'?'No assigned role':name,name));role.value=r.role||'none';role.onchange=()=>{r.role=role.value;};const note=document.createElement('input');note.type='text';note.maxLength=300;note.placeholder='Use only the outfit, keep the room…';note.setAttribute('aria-label','Note for reference '+(i+1));note.value=r.note||'';note.oninput=()=>{r.note=note.value;};fields.append(title,role,note);const controls=document.createElement('div');controls.className='reference-actions';const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.onclick=()=>{if(busy)return;release(r.url);references.splice(i,1);renderReferences();resetPreview();update();};const up=document.createElement('button');up.type='button';up.textContent='Up';up.disabled=i===0;up.onclick=()=>{if(busy||i===0)return;[references[i-1],references[i]]=[references[i],references[i-1]];renderReferences();resetPreview();update();};controls.append(up,remove);item.append(img,fields,controls);box.append(item);});$('ref-count').textContent=`${references.length} / 10`;}
async function addReferences(list,ids=[],labels=[]){const e=epoch,incoming=[...list];if(references.length+incoming.length>10)throw new Error('Reference mode supports up to 10 images.');for(let i=0;i<incoming.length;i++){const item=await inspectImage(incoming[i]);if(e!==epoch||!owner){release(item.url);return;}item.id=ids[i]||null;item.role=labels[i]?.role||'none';item.note=labels[i]?.note||'';references.push(item);}renderReferences();resetPreview();update();}
function setMode(nextMode){mode=nextMode==='reference'?'reference':'start';$('mode-start').classList.toggle('active',mode==='start');$('mode-reference').classList.toggle('active',mode==='reference');$('mode-start').setAttribute('aria-selected',String(mode==='start'));$('mode-reference').setAttribute('aria-selected',String(mode==='reference'));$('start-mode').hidden=mode!=='start';$('reference-mode').hidden=mode!=='reference';resetPreview();update();}
async function uploadAsset(snapshot){const data=await api('/api/uploads',{method:'POST',headers:{'Content-Type':snapshot.type,'X-Filename':encodeURIComponent(snapshot.name||'source.png')},body:snapshot});return data.id;}
async function ensureSource(){if(sourceId)return sourceId;const snapshot=file,rev=imageRevision;if(!snapshot)throw new Error('Choose a start frame first.');const id=await uploadAsset(snapshot);if(rev!==imageRevision)throw new Error('Image changed during upload. Please try again.');sourceId=id;return id;}
async function ensureLast(){if(!lastFile)return null;if(lastSourceId)return lastSourceId;lastSourceId=await uploadAsset(lastFile);return lastSourceId;}
async function ensureReferences(){if(!references.length)throw new Error('Add at least one reference image.');for(const r of references)if(!r.id)r.id=await uploadAsset(r.file);return references.map(r=>r.id);}
async function ensureInputs(){if(tool==='image'&&!references.length)return {sourceId:null,lastSourceId:null,referenceSourceIds:[]};if(tool==='image'||mode==='reference'){const ids=await ensureReferences();return {sourceId:ids[0],lastSourceId:null,referenceSourceIds:ids};}return {sourceId:await ensureSource(),lastSourceId:await ensureLast(),referenceSourceIds:[]};}
function applyConfig(c){config=c;$('connection-status').textContent=c.enabled?'SpicyAPI connected / Video + Image · Live quotes before payment':'Generation not connected · Drafts and private history are ready';update();}
function connection(){if(!owner)return;$('api-key').value='';$('daily-limit').value=config.dailyLimitUsd||10;$('terms').checked=false;$('disconnect').hidden=!config.configured;$('key-note').textContent=config.configured?'A key is stored encrypted. Leave blank to keep it, or paste a replacement.':'Stored encrypted on your private backend. Never committed to GitHub or saved in browser storage.';$('connect-notice').textContent='';$('connect-dialog').showModal();}
$('connect-form').addEventListener('submit',async e=>{e.preventDefault();$('connect-save').disabled=true;try{const data=await api('/api/settings',{method:'POST',body:{apiKey:$('api-key').value,dailyLimitUsd:Number($('daily-limit').value),enabled:true,termsConfirmed:$('terms').checked}});$('api-key').value='';applyConfig(data.config);$('connect-dialog').close();notify('Provider key connected. Review a live quote before generating.');}catch(error){$('connect-notice').textContent=error.message;}finally{$('connect-save').disabled=false;}});
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
for(const id of ['prompt','duration','resolution','ratio','seed','audio','output-format'])$(id).addEventListener('input',()=>{autoPreview=null;update();});
$('save').onclick=()=>action(async()=>{const inputs=await ensureInputs();await api('/api/drafts',{method:'POST',body:{...inputs,settings:settings()}});await loadHistory();notify('Saved privately with the original media and settings. No generation charge.');});
$('generate').onclick=()=>action(async()=>{if(!config.enabled){connection();return;}const inputs=await ensureInputs();notify('Requesting a live price. No generation submitted.');const q=await api('/api/quotes',{method:'POST',body:{...inputs,settings:settings()}});currentQuote=q;const isImage=q.settings.type==='image',modeName=q.settings.mode==='reference'?'Reference to Video':'Image to Video';$('quote-settings').textContent=isImage?`Seedream 5.0 Pro / ${q.settings.referenceSourceIds.length?'Reference Edit':'Text to Image'} / ${q.settings.resolution.toUpperCase()} / ${q.settings.aspectRatio}`:`Wan 3.0 / ${modeName} / ${q.settings.duration}s / ${q.settings.resolution}`;$('quote-price').textContent=money(q.estimatedUsd);$('quote-limit').textContent=`Quoted maximum: ${money(q.maxUsd)} USD`;$('quote-expiry').textContent='Valid until '+new Date(q.expiresAt).toLocaleTimeString()+'. No automatic repricing.';$('quote-notice').textContent='';$('confirm-generation').disabled=false;$('quote-dialog').showModal();});
$('confirm-generation').onclick=async()=>{const q=currentQuote;if(!q||busy)return;if(Date.now()>=q.expiresAt){$('quote-notice').textContent='Quote expired. Close and review a new price.';return;}$('confirm-generation').disabled=true;await action(async()=>{const data=await api('/api/jobs',{method:'POST',body:{quoteId:q.id,confirm:true}});$('quote-dialog').close();resetPreview();autoPreview={id:data.job.id,revision:previewRevision};setActive(data.job);await loadHistory();notify('Generation request recorded. You can leave the page and return to history.');});};
function setActive(job){activeJob=job&&activeStates.has(job.status)?job:null;$('active').hidden=!activeJob;clearTimeout(timer);timer=null;
  if(activeJob){const labels={submitting:'Submitting to the provider…',queued:'Queued at the provider.',running:'Generating your result…',saving:'Saving the finished result to your private archive.',uncertain:'Submission interrupted. Check the provider console before another attempt.'};$('active-status').textContent=labels[job.status];$('active-detail').textContent=job.error||(job.providerTaskId?'Provider task: '+job.providerTaskId:'No duplicate generation will be submitted automatically.');$('resolve').hidden=job.status!=='uncertain';timer=setTimeout(poll,10000);}update();}
async function poll(){
  if(!owner||!activeJob)return;
  try{
    const id=activeJob.id,data=await api('/api/jobs/'+id);setActive(data.job);
    if(!activeJob){
      const show=autoPreview?.id===id&&autoPreview.revision===previewRevision&&!busy;
      autoPreview=null;await loadHistory();
      if(hasResult(data.job)){
        if(show)await openVideo(data.job,{scroll:false});
        notify('Result saved. View or download the generated '+(data.job.settings.type==='image'?'image':'video')+' from History.');
      }else notify(data.job.error||'No output file was returned. Nothing is available to download.',true);
    }
  }catch(e){notify(e.message,true);if(activeJob)timer=setTimeout(poll,15000);}
}
$('resolve').onclick=()=>action(async()=>{if(!activeJob||!confirm('First check the provider console and its charges. This clears the local lock without sending another generation. Continue only after checking.'))return;await api('/api/jobs/'+activeJob.id+'/resolve',{method:'POST',body:{confirm:true}});setActive(null);await loadHistory();});
function button(text,fn){const b=document.createElement('button');b.className='quiet';b.textContent=text;b.onclick=()=>action(fn);return b;}
async function assetFile(id,name='source'){const blob=await api('/api/assets/'+id,{blob:true}),ext=blob.type==='image/jpeg'?'jpg':blob.type.split('/')[1];return new File([blob],name+'.'+ext,{type:blob.type});}
async function restore(job){clearMedia();const p=job.settings||{};setTool(p.type||'video');setMode(p.mode||'start');if(tool==='image'){$('start-mode').hidden=true;$('reference-mode').hidden=false;}const refs=tool==='image'||p.mode==='reference';if(refs){const ids=p.referenceSourceIds||[];const files=await Promise.all(ids.map((id,i)=>assetFile(id,(p.referenceRoles?.[i]?.name||'reference-'+(i+1)).replace(/\.[^.]+$/,''))));await addReferences(files,ids,p.referenceRoles||[]);}else if(job.sourceId){await setImage(await assetFile(job.sourceId,'start-frame'),job.sourceId);if(p.lastSourceId)await setLastImage(await assetFile(p.lastSourceId,'last-frame'),p.lastSourceId);}$('prompt').value=p.prompt||'';
  if(p.duration&&!([...$('duration').options].some(o=>Number(o.value)===p.duration)))$('duration').add(new Option(p.duration+' sec',String(p.duration)));
  $('duration').value=p.duration||15;$('resolution').value=p.resolution||(tool==='image'?'2k':'1080p');$('ratio').value=p.aspectRatio||'auto';$('seed').value=p.seed??'';$('audio').checked=p.audio!==false;$('output-format').value=p.outputFormat||'jpeg';update();notify('Original media, reference roles, prompt and settings restored. Nothing generated or charged.');$('prompt').focus();window.scrollTo({top:0,behavior:'smooth'});}
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
async function animateImage(job){clearMedia();setTool('video');setMode('start');await setImage(await assetFile(job.outputId,'generated-image'),job.outputId);$('prompt').value='';update();notify('Generated image loaded as the video start frame. Add motion direction and review the price.');window.scrollTo({top:0,behavior:'smooth'});}
async function loadPacks(){const data=await api('/api/packs');packs=data.packs;$('pack-select').replaceChildren(new Option('Choose a saved pack',''),...packs.map(p=>new Option(p.name,p.id)));}
$('pack-save').onclick=()=>action(async()=>{if(!references.length)throw new Error('Add reference images first.');const name=window.prompt('Name this reference pack, for example Nina FOK / Editorial');if(!name?.trim())return;const ids=await ensureReferences();await api('/api/packs',{method:'POST',body:{name:name.trim(),referenceSourceIds:ids,referenceRoles:referenceRoles()}});await loadPacks();notify('Reference pack saved privately. No generation charge.');});
$('pack-load').onclick=()=>action(async()=>{const pack=packs.find(p=>p.id===$('pack-select').value);if(!pack)throw new Error('Choose a saved pack.');if(references.length&&!confirm('Replace the current references with this pack?'))return;const files=await Promise.all(pack.refs.map(r=>assetFile(r.id,r.name.replace(/\.[^.]+$/,''))));references.forEach(r=>release(r.url));references=[];await addReferences(files,pack.refs.map(r=>r.id),pack.refs);notify('Pack loaded with reference order, roles and notes.');});
$('pack-delete').onclick=()=>action(async()=>{const id=$('pack-select').value;if(!id||!confirm('Delete this reference pack? Existing generation history remains.'))return;await api('/api/packs/'+id,{method:'DELETE'});await loadPacks();notify('Reference pack deleted.');});
const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){
    if(!entry.isIntersecting)continue;
    const img=entry.target;observer.unobserve(img);const rev=historyRevision;
    api('/api/assets/'+img.dataset.asset,{blob:true}).then(blob=>{
      if(!owner||rev!==historyRevision||!img.isConnected)return;
      if(!blob.type.startsWith('image/')||!blob.size)throw new Error('Preview unavailable');
      const u=URL.createObjectURL(blob);cardUrls.add(u);img.src=u;
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
function renderCards(jobs){
  for(const j of jobs){
    const card=document.createElement('article');card.className='card';card.dataset.job=j.id;card.dataset.state=j.status;
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
    const meta=document.createElement('div');meta.className='cardmeta';meta.textContent=`${j.status.toUpperCase()} / ${image?'IMAGE':j.settings.duration+'s'} / ${j.settings.resolution} / ${new Date(j.createdAt).toLocaleDateString()}`;
    const p=document.createElement('p');p.textContent=j.settings.prompt||'No direction saved.';
    const actions=document.createElement('div');actions.className='cardactions';
    if(ready){
      const download=button(image?'Download image':'Download video',()=>downloadJob(j));download.classList.add('result-download');actions.append(download);
      actions.append(button(image?'View image':'View video',()=>openVideo(j)));
    }else{
      const download=button(image?'Download image':'Download video',async()=>{});download.disabled=true;download.title='Available only when a completed output file exists.';actions.append(download);
    }
    actions.append(button('Reuse',()=>restore(j)));
    if(ready&&image)actions.append(button('Use in Video',()=>animateImage(j)));
    if(!activeStates.has(j.status))actions.append(button('Delete',async()=>{
      if(!confirm('Delete this saved record and its unshared files? This cannot be undone.'))return;
      await api('/api/jobs/'+j.id,{method:'DELETE'});await loadHistory();notify('Record deleted. Spending history is unchanged.');
    }));
    const cost=document.createElement('div');cost.className='fine';cost.textContent=j.settledUsd!=null?'Provider settled: '+money(j.settledUsd):j.estimatedUsd!=null?'Budget reserved: '+money(j.estimatedUsd):'Draft / no generation charge';
    body.append(meta,p,actions,cost);
    if(j.error){const error=document.createElement('p');error.className='fine history-error';error.textContent=j.error;body.append(error);}
    if(!ready&&j.sourceId){
      const refs=document.createElement('details');refs.className='history-source';const summary=document.createElement('summary');summary.textContent='Uploaded reference / not a result';
      const {figure,img}=historyImage(j.sourceId,'Original uploaded reference');previews.push(img);refs.append(summary,figure);body.append(refs);
    }
    if(j.providerTaskId){const task=document.createElement('div');task.className='fine history-task';task.textContent='Provider task: '+j.providerTaskId;body.append(task);}
    card.append(body);$('history').append(card);for(const img of previews)observer.observe(img);
  }
}
async function loadHistory(append=false){const rev=historyRevision,query=append&&next?'?before='+next.before+'&afterId='+encodeURIComponent(next.afterId):'',data=await api('/api/jobs'+query);if(!owner||rev!==historyRevision)return;if(!append){historyRevision++;observer.disconnect();cardUrls.forEach(release);cardUrls.clear();$('history').replaceChildren();}renderCards(data.jobs);next=data.next;$('more').hidden=!next;$('emptyarchive').hidden=$('history').children.length>0;setActive(data.active);}
$('refresh').onclick=()=>action(()=>loadHistory());$('more').onclick=()=>action(()=>loadHistory(true));
function lock(){epoch++;autoPreview=null;downloadUrls.forEach(release);downloadUrls.clear();owner=false;userId='';historyRevision++;clearTimeout(timer);activeJob=null;requestControllers.forEach(c=>c.abort());requestControllers.clear();observer.disconnect();cardUrls.forEach(release);cardUrls.clear();clearMedia();$('prompt').value='';$('history').replaceChildren();$('app').hidden=true;$('gate').hidden=false;$('connection').hidden=true;$('logout').hidden=true;$('api-key').value='';for(const d of document.querySelectorAll('dialog[open]'))d.close();currentQuote=null;config={};packs=[];$('pack-select').replaceChildren(new Option('Choose a saved pack',''));}
async function sync(){if(syncing)return;syncing=true;try{if(!clerk.isSignedIn){lock();$('auth-status').textContent='Sign in with your Parallel Vision owner account.';$('signin').disabled=false;return;}if(owner&&userId===clerk.user.id)return;const data=await api('/api/session');owner=true;userId=clerk.user.id;applyConfig(data.config);$('identity').textContent='Owner workspace';$('gate').hidden=true;$('app').hidden=false;$('connection').hidden=false;$('logout').hidden=false;await loadHistory();await loadPacks();}catch(e){lock();$('auth-status').textContent=e.message;$('signin').disabled=false;$('logout').hidden=!clerk?.isSignedIn;}finally{syncing=false;}}
$('signin').onclick=()=>clerk?.openSignIn();$('logout').onclick=async()=>{lock();await clerk?.signOut();$('auth-status').textContent='Signed out. Your archive remains private.';};
try{const {Clerk}=await import('https://esm.sh/@clerk/clerk-js@6?bundle');await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://clerk.parallelvisionlabel.com/npm/@clerk/ui@1/dist/ui.browser.js';s.onload=resolve;s.onerror=reject;document.head.append(s);});clerk=new Clerk('pk_live_Y2xlcmsucGFyYWxsZWx2aXNpb25sYWJlbC5jb20k');await clerk.load({ui:window.__internal_ClerkUICtor,signInFallbackRedirectUrl:location.href,signUpFallbackRedirectUrl:location.href});clerk.addListener(()=>void sync());await sync();}catch{$('auth-status').textContent='Sign-in could not load. Refresh this page or check your browser connection.';}
