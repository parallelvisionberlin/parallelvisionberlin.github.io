import {createSessionRequest} from './session-request.js?v=20260927-auth1&studioAuth=20261015-1';
import {loadLabAccount} from './native-account.js?v=20261014-custom-domain1&studioAuth=20261015-1';
export function createFashionStudio(root=document,{sessionClient=null,onNavigate=null,publicPreview=()=>false}={}){
const API='https://parallel-vision-lab.parallelvision.workers.dev';
const $=id=>root.getElementById(id);
const modes={
  fashn16:{description:'An alternative for straightforward garment transfer.',note:'Estimated cost: $0.075 per image. Review the quote before generating.',provider:'fal'},
  fashnmax:{description:'High-detail garment transfer using your FASHN API credits.',note:'Balanced 1K estimates 2 FASHN credits ($0.15). Review the quote before generating.',provider:'fashn'},
  fluxvto:{description:'Prompt-directed styling for layering, fit and the way clothing is worn.',note:'Pricing varies with image size. Person image maximum 2 MP; garment maximum 1 MP.',provider:'fal'}
};
let clerk=null,authenticated=false,isCustomer=false,sessionId='',models=[],busy=false,quote=null,pollTimeout=null,activeJobId='',resultUrl='',signingIn=false;
let preparing=false,quoteTimer=null,quoteExpiryTimer=null;
let fileKeys=new Map(),previews=new Map(),revision=0,authVersion=0;
let galleryCursor=null,galleryItems=[],galleryLoading=false,galleryRevision=0,selectedGalleryJob='';
const galleryPreviews=new Map(),galleryCards=new Map();
const GALLERY_PAGE_SIZE=12;
/* Looks guide garment fit only. Keep the user's optional directions independent. */
const lookDirections=Object.freeze({
  runway:'Fit the supplied garment naturally with clean lines and a polished fashion presentation. Preserve the original person, pose, garment design and setting.',
  editorial:'Prioritize precise garment placement, realistic folds and refined fabric detail. Keep the original person, garment and background unchanged.',
  street:'Use a relaxed, naturally worn fit with believable fabric drape. Preserve the original person, garment design and setting.',
  avantgarde:'Respect the garment’s distinctive shape and construction, with believable folds and proportions. Preserve the person and original background.',
  minimal:'Keep the garment fit simple and clean, with accurate seams and material texture. Preserve the source person and setting.',
  techwear:'Respect technical garment details, fastenings, seams and functional layering with a realistic fit. Preserve the source person and setting.',
  tailoring:'Prioritize accurate tailoring, seams, lapels, folds and a natural fit while preserving the uploaded garment design and original person.',
  conceptual:'Preserve unusual garment construction and distinctive details with physically believable fit. Keep the source person and setting unchanged.'
});
let activeLook='';
function finalDirection(){
  const manual=$('direction').value.trim();
  const look=current()==='fashn16'?'':(lookDirections[activeLook]||'');
  return [look,manual].filter(Boolean).join('\n');
}
function syncLooks(){
  const strip=$('looks-scroller');if(!strip)return;
  const supported=current()!=='fashn16';
  for(const card of strip.querySelectorAll('[data-look]')){
    card.disabled=!supported;
    card.setAttribute('aria-pressed',String(supported&&activeLook===card.dataset.look));
  }
  const note=$('looks-support');
  note.textContent=supported?'':'Styling prompt unavailable with v1.6';
}

const request=createSessionRequest({baseUrl:API,getSession:()=>clerk?.session});
function status(message,error=false){$('status').textContent=message||'';$('status').classList.toggle('error',error);}
function revokeResult(){if(resultUrl)URL.revokeObjectURL(resultUrl);resultUrl='';$('result-image').hidden=true;$('result-image').removeAttribute('src');$('result-placeholder').hidden=false;$('download').hidden=true;}
function clearQuote(){quote=null;clearTimeout(quoteTimer);clearTimeout(quoteExpiryTimer);}
function readyToQuote(){return authenticated&&!!$('person-file').files.length&&!!$('garment-file').files.length&&models.some(x=>x.id===current()&&x.available)&&(current()!=='fluxvto'||!!finalDirection())&&finalDirection().length<=1200;}
function scheduleQuote(){
  clearTimeout(quoteTimer);
  if(!busy&&readyToQuote())quoteTimer=setTimeout(()=>void prepareQuote(),400);
}
function change(){revision++;clearQuote();update();scheduleQuote();}
async function api(path,{method='GET',body,headers={}}={}){
  const version=authVersion;
  const init={method,headers:{...headers}};
  if(body!==undefined){
    if(body instanceof File || body instanceof Blob){init.body=body;}
    else{init.headers['Content-Type']='application/json';init.body=JSON.stringify(body);}
  }
  const res=await request(path,init);
  let payload;try{payload=await res.json();}catch{payload={};}
  if(version!==authVersion)throw new Error('Session changed.');
  if(!res.ok)throw new Error(payload.error||('The Lab returned HTTP '+res.status));
  return payload;
}
async function assetBlob(id){
  const res=await request('/api/assets/'+encodeURIComponent(id));
  if(!res.ok)throw new Error((await res.json().catch(()=>({}))).error||'Could not open your private image.');
  return res.blob();
}
function current(){return $('model-select').value;}
function update(){
  const selected=current(),d=modes[selected],providerModel=models.find(x=>x.id===selected);
  $('fashn16-options').hidden=selected!=='fashn16';
  $('fashnmax-options').hidden=selected!=='fashnmax';
  $('model-description').textContent=d.description;
  $('model-note').textContent=(authenticated&&!isCustomer?d.note:'Review the credit cost before generating.')+(providerModel&&!providerModel.available?' This model is not connected yet.':'');
  $('direction-required').textContent=selected==='fluxvto'?'REQUIRED':'OPTIONAL';
  $('direction').placeholder=selected==='fluxvto'?'Describe how the garment should be worn…':'Keep the silhouette. Open the jacket, soften the folds…';
  syncLooks();
  $('quote').disabled=!publicPreview()&&(busy||preparing||!readyToQuote());
  const title=busy?'Generating…':quote?'Generate · '+quote.creditCost.toLocaleString()+' credits':'Generate';
  if($('quote').dataset.caption!==title){
    $('quote').dataset.caption=title;
    const arrow=document.createElement('span');arrow.setAttribute('aria-hidden','true');
    $('quote').replaceChildren(document.createTextNode(title),arrow);
  }
  const person=!!$('person-file').files.length,garment=!!$('garment-file').files.length;
  $('action-hint').textContent=!person||!garment?'Add a person and garment.':!providerModel?.available?'This model is not connected. Select another available engine.':selected==='fluxvto'&&!finalDirection()?'Add a styling direction for FLUX.':finalDirection().length>1200?'Shorten your styling direction to 1,200 characters.':'';
  $('action-hint').hidden=!$('action-hint').textContent;
}
function choosePhoto(id,slot,img,hint){
  const input=$(id),container=$(slot),preview=$(img),invitation=$(hint);
  input.addEventListener('change',()=>{
    const file=input.files?.[0];if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>20*1024*1024){
      input.value='';status('Choose a JPG, PNG or WebP image up to 20 MiB.',true);change();return;
    }
    const old=previews.get(id);if(old)URL.revokeObjectURL(old);
    const src=URL.createObjectURL(file);previews.set(id,src);preview.src=src;preview.hidden=false;invitation.hidden=true;
    fileKeys.delete(id);status('');change();
  });
  for(const event of ['dragenter','dragover'])container.addEventListener(event,e=>{e.preventDefault();container.classList.add('drag-over');});
  container.addEventListener('dragleave',e=>{if(!container.contains(e.relatedTarget))container.classList.remove('drag-over');});
  container.addEventListener('drop',e=>{
    e.preventDefault();container.classList.remove('drag-over');
    const file=e.dataTransfer?.files?.[0];if(!file)return;
    try{
      const transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files;
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }catch{status('Could not load the dropped photograph. Click the tile to browse instead.',true);}
  });
}
choosePhoto('person-file','person-slot','person-preview','person-hint');
choosePhoto('garment-file','garment-slot','garment-preview','garment-hint');
for(const id of ['model-select','fashn16-category','fashn16-quality','max-resolution','max-mode']){
  $(id).addEventListener('change',()=>{change();status('');});
}
$('direction').addEventListener('input',()=>change());
const looks=$('looks-scroller');
if(looks){
  looks.addEventListener('click',event=>{
    const card=event.target.closest('[data-look]');if(!card||card.disabled)return;
    const next=activeLook===card.dataset.look?'':card.dataset.look;
    const nextPrompt=[next?lookDirections[next]:'',$('direction').value.trim()].filter(Boolean).join('\n');
    if(nextPrompt.length>1200){status('Shorten your styling direction before adding a look.',true);return;}
    activeLook=next;syncLooks();change();
    status('');
  });
  for(const [id,offset] of [['looks-prev',-1],['looks-next',1]]){
    $(id)?.addEventListener('click',()=>{
      looks.scrollBy({left:offset*Math.max(220,looks.clientWidth*.66),behavior:'smooth'});
    });
  }
  $('looks-view-all')?.addEventListener('click',()=>{
    const expanded=looks.classList.toggle('looks-expanded');
    $('looks-view-all').textContent=expanded?'CLOSE':'VIEW ALL';
    $('looks-view-all').setAttribute('aria-expanded',String(expanded));
  });
}

async function upload(id){
  const file=$(id).files?.[0];if(!file)throw new Error('Select both photographs first.');
  const saved=fileKeys.get(id);if(saved?.file===file)return saved.assetId;
  const result=await api('/api/uploads',{method:'POST',body:file,headers:{'Content-Type':file.type,'X-Filename':encodeURIComponent(file.name)}});
  if($(id).files?.[0]!==file)throw new Error('Photograph changed during upload. Review again.');
  fileKeys.set(id,{file,assetId:result.id});return result.id;
}
// Preparing an expiring, server-bound quote is free. Only the priced Generate
// action below can submit it; input changes and background work never generate.
async function prepareQuote(){
  if(busy||preparing||!readyToQuote())return;
  const editVersion=revision,accountVersion=authVersion;
  preparing=true;update();
  try{
    const modelSourceId=await upload('person-file'),garmentSourceId=await upload('garment-file');
    if(revision!==editVersion||accountVersion!==authVersion)return;
    const settings={model:current(),modelSourceId,garmentSourceId,prompt:finalDirection(),
      resolution:$('max-resolution').value,generationMode:$('max-mode').value,
      category:$('fashn16-category').value,quality:$('fashn16-quality').value};
    const response=await api('/api/fashion/quote',{method:'POST',body:settings});
    if(revision!==editVersion||accountVersion!==authVersion)return;
    // Display the same server price used by the atomic customer debit.
    if(!Number.isSafeInteger(response.creditCost)||response.creditCost<1||!response.id||!Number.isFinite(response.expiresAt)||response.expiresAt<=Date.now())
      throw new Error('The server did not confirm a PV LAB credit price. Nothing was charged.');
    quote=response;
    quoteExpiryTimer=setTimeout(()=>{clearQuote();update();scheduleQuote();},Math.max(1,response.expiresAt-Date.now()));
    status('');
  }catch(e){if(revision===editVersion&&accountVersion===authVersion)status(e.message,true);}
  finally{
    preparing=false;update();
    if(revision!==editVersion)scheduleQuote();
  }
}
$('fashion-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy||preparing||!readyToQuote())return;
  if(!quote||quote.expiresAt<=Date.now()){clearQuote();await prepareQuote();return;}
  const quoted=quote;clearTimeout(quoteExpiryTimer);busy=true;update();status('Generating your outfit…');
  try{
    const response=await api('/api/fashion/submit',{method:'POST',body:{quoteId:quoted.id,confirm:true}});
    clearQuote();revokeResult();const job=response.job;selectedGalleryJob=job.id;
    await showJob(job);
    await loadHistory();
  }catch(e){
    // Never automatically resubmit an ambiguous paid request.
    clearQuote();status(e.message+' Check your generation history before trying again.',true);
  }finally{busy=false;update();}
});
async function loadResult(job){
  if(!job.outputId)throw new Error('This generation has no archived output yet.');
  const version=authVersion;
  const blob=await assetBlob(job.outputId);
  if(!authenticated||version!==authVersion)return;
  revokeResult();resultUrl=URL.createObjectURL(blob);$('result-image').src=resultUrl;$('result-image').hidden=false;$('result-placeholder').hidden=true;$('download').hidden=false;
}
async function showJob(job){
  const state=job?.status||'unknown',name=modes[job?.settings?.fashionModel]?.description||'Fashion generation';
  if(state==='completed'){
    activeJobId='';clearTimeout(pollTimeout);
    await loadResult(job);
    status('Fashion image completed and saved privately.');return;
  }
  if(['queued','running','saving','submitting'].includes(state)){
    revokeResult();activeJobId=job.id;status('Generation '+state+'. The output will be saved to your PV Lab archive.');
    clearTimeout(pollTimeout);pollTimeout=setTimeout(()=>void poll(job.id),4000);return;
  }
  activeJobId='';clearTimeout(pollTimeout);revokeResult();
  if(state==='uncertain')status('Submission status is uncertain. Check the provider dashboard before retrying. '+(job.error||''),true);
  else status(name+'. '+(job.error||('Generation status: '+state)),true);
}
async function poll(id){
  if(!authenticated||activeJobId!==id)return;
  try{const data=await api('/api/jobs/'+encodeURIComponent(id));if(activeJobId!==id)return;await showJob(data.job);if(data.job.status==='completed')await loadHistory();}
  catch(e){status('Status check interrupted. Your existing generation was not resubmitted. '+e.message,true);pollTimeout=setTimeout(()=>void poll(id),8000);}
}
async function checkFashnBalance(){
  if(!authenticated)return;
  const button=$('check-fashn');
  button.disabled=true;
  $('fashn-api-state').textContent='Verifying connection…';
  try{
    const result=await api('/api/fashion/balance');
    if(!authenticated)return;
    const balance=$('fashn-api-state');
    balance.textContent=isCustomer?(result.connected?'Fashion provider connected. Your PV Lab wallet handles payment.':result.note||'Fashion provider is not ready.'):result.connected?'Connected · '+result.credits.total+' credits':(result.note||'FASHN API key is not configured.');
    balance.title=!isCustomer&&result.connected&&result.credits?result.credits.onDemand+' on-demand / '+result.credits.subscription+' subscription credits':'';

  }catch(e){
    if(authenticated)$('fashn-api-state').textContent='Connection not verified · '+e.message;
  }finally{
    button.disabled=!authenticated;
  }
}
$('check-fashn').addEventListener('click',()=>void checkFashnBalance());
// A single owner-scoped Fashion archive. The API returns 20 mixed jobs per
// page; follow existing cursors until we have a page of Fashion jobs.
function clearGalleryPreviews(){
  galleryRevision++;
  for(const objectUrl of galleryPreviews.values())URL.revokeObjectURL(objectUrl);
  galleryPreviews.clear();galleryCards.clear();
}
function fashionLabel(job){
  return models.find(m=>m.id===job.settings?.fashionModel)?.label||
    ({fashnmax:'FASHN Try-On Max',fashn16:'FASHN Try-On v1.6',fluxvto:'FLUX Virtual Try-On Pro'}[job.settings?.fashionModel])||
    'Fashion generation';
}
function galleryState(job){
  return job.status==='completed'&&job.outputId?'Completed':
    job.status==='completed'?'Missing output':
    job.status==='failed'?'Failed':job.status==='uncertain'?'Needs review':
    ['queued','running','submitting','saving'].includes(job.status)?'Generating':job.status||'Pending';
}
function renderGallery(){
  const container=$('fashion-history');container.replaceChildren();galleryCards.clear();
  $('fashion-gallery-count').textContent=galleryItems.length?String(galleryItems.length)+' shown':'';
  $('fashion-more').hidden=!galleryCursor;
  if(!galleryItems.length){
    const empty=document.createElement('p');empty.className='tip';
    empty.textContent=galleryCursor?'No Fashion results on this page. Load earlier work.':'Your Fashion generations will appear here after you create them.';
    container.append(empty);return;
  }
  for(const job of galleryItems){
    const label=fashionLabel(job);
    const button=document.createElement('button');button.type='button';button.className='history-item';
    button.dataset.job=job.id;
    button.setAttribute('aria-label',label+', '+galleryState(job)+'. Open in Result panel');
    button.setAttribute('aria-pressed',String(selectedGalleryJob===job.id));
    const media=document.createElement('span');media.className='history-media';
    const placeholder=document.createElement('span');placeholder.className='history-media-placeholder';
    const illustration=document.createElementNS('http://www.w3.org/2000/svg','svg');
    illustration.setAttribute('viewBox','0 0 24 24');
    illustration.setAttribute('width','30');illustration.setAttribute('height','30');illustration.setAttribute('aria-hidden','true');
    illustration.setAttribute('fill','none');illustration.setAttribute('stroke','currentColor');illustration.setAttribute('stroke-width','1');
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d','M3 4h18v16H3z M6 16l4-4 3 3 3-5 3 6');
    illustration.append(path);
    const emptyLabel=document.createElement('span');
    emptyLabel.textContent=job.status==='completed'&&job.outputId?'Loading image…':
      job.status==='failed'?'No image produced':
      job.status==='uncertain'?'Check provider status':'Result pending';
    placeholder.append(illustration,emptyLabel);
    media.append(placeholder);
    const url=galleryPreviews.get(job.id);
    if(url){
      const img=document.createElement('img');img.src=url;img.alt='Fashion image generated with '+label;
      media.append(img);
    }
    const info=document.createElement('span');info.className='history-info';
    const title=document.createElement('span');title.className='history-model';title.textContent=label;
    const line=document.createElement('span');line.className='history-info-line';
    const date=document.createElement('span');
    const time=Number(job.createdAt);
    date.textContent=Number.isFinite(time)&&time>0?new Date(time).toLocaleDateString(undefined,{day:'numeric',month:'short'}):'';
    const state=document.createElement('span');state.className='history-state';
    state.dataset.status=job.status||'';state.textContent=galleryState(job);
    line.append(date,state);
    info.append(title,line);
    if(['failed','uncertain'].includes(job.status)){
      const hint=document.createElement('span');hint.className='history-status-detail';
      hint.textContent=job.status==='uncertain'?'Check provider before retrying.':'No completed result. Select to see details.';
      info.append(hint);
    }
    button.append(media,info);
    button.addEventListener('click',()=>{
      selectedGalleryJob=job.id;
      for(const card of galleryCards.values())card.setAttribute('aria-pressed',String(card.dataset.job===job.id));
      void showJob(job).then(()=>$('result-stage').scrollIntoView({behavior:'smooth',block:'center'})).catch(e=>status(e.message,true));
    });
    galleryCards.set(job.id,button);container.append(button);
  }
}
async function loadGalleryThumbnails(revision){
  const images=galleryItems.filter(j=>j.status==='completed'&&j.outputId&&!galleryPreviews.has(j.id));
  let index=0;
  await Promise.all(Array.from({length:Math.min(3,images.length)},async()=>{
    while(index<images.length){
      const job=images[index++],version=authVersion;
      try{
        const blob=await assetBlob(job.outputId);
        if(!authenticated||version!==authVersion||revision!==galleryRevision)return;
        if(!blob.type.startsWith('image/'))throw new Error('The saved result was not an image.');
        const url=URL.createObjectURL(blob);
        const card=galleryCards.get(job.id);
        if(!card?.isConnected){URL.revokeObjectURL(url);continue;}
        galleryPreviews.set(job.id,url);
        const media=card.querySelector('.history-media');
        const img=document.createElement('img');img.src=url;img.alt='Fashion image generated with '+fashionLabel(job);
        media.append(img);
      }catch{
        if(revision===galleryRevision){
          const card=galleryCards.get(job.id);
          const hint=card?.querySelector('.history-media-placeholder span');
          if(hint)hint.textContent='Preview unavailable';
        }
      }
    }
  }));
}
async function loadHistory(append=false){
  if(!authenticated||galleryLoading)return;
  galleryLoading=true;
  const auth=authVersion,revision=galleryRevision;
  $('refresh-history').disabled=true;$('fashion-more').disabled=true;
  try{
    let cursor=append?galleryCursor:null,pages=0,found=0;
    const jobs=append?[...galleryItems]:[],seen=new Set(jobs.map(j=>j.id));
    do{
      const query=cursor?'?before='+encodeURIComponent(cursor.before)+'&afterId='+encodeURIComponent(cursor.afterId):'';
      const data=await api('/api/jobs'+query);
      if(auth!==authVersion||revision!==galleryRevision||!authenticated)return;
      for(const job of data.jobs||[]){
        if(job.settings?.mode==='fashion'&&!seen.has(job.id)){
          seen.add(job.id);jobs.push(job);found++;
        }
      }
      cursor=data.next||null;
      pages++;
    }while(cursor&&found<GALLERY_PAGE_SIZE&&pages<8);
    if(!append)clearGalleryPreviews();
    galleryItems=jobs;
    galleryCursor=cursor;
    renderGallery();
    void loadGalleryThumbnails(galleryRevision);
  }catch(error){
    if(auth===authVersion&&authenticated){
      if(!append&&!galleryItems.length){
        const empty=document.createElement('p');empty.className='tip';
        empty.textContent='Could not load Fashion generations. Refresh to try again.';
        $('fashion-history').replaceChildren(empty);
      }else status('The gallery could not refresh. '+error.message,true);
    }
  }finally{
    galleryLoading=false;
    $('refresh-history').disabled=!authenticated;
    $('fashion-more').disabled=!authenticated;
  }
}
$('refresh-history').addEventListener('click',()=>void loadHistory());
$('fashion-more').addEventListener('click',()=>void loadHistory(true));
$('download').addEventListener('click',()=>{
  if(!resultUrl)return;const a=document.createElement('a');a.href=resultUrl;a.download='pv-lab-fashion.png';document.body.append(a);a.click();a.remove();
});
$('signin').addEventListener('click',()=>clerk?.openSignIn());
$('reload').addEventListener('click',()=>location.reload());
function lock(){
  authVersion++;clearGalleryPreviews();galleryCursor=null;galleryItems=[];selectedGalleryJob='';$('fashion-history').replaceChildren();$('fashion-gallery-count').textContent='';$('fashion-more').hidden=true;models=[];
  authenticated=false;sessionId='';clearTimeout(pollTimeout);pollTimeout=null;activeJobId='';busy=false;clearQuote();revokeResult();
  for(const url of previews.values())URL.revokeObjectURL(url);
  previews.clear();fileKeys.clear();revision++;
  for(const [fileId,imgId,hintId] of [['person-file','person-preview','person-hint'],['garment-file','garment-preview','garment-hint']]){
    $(fileId).value='';$(imgId).hidden=true;$(imgId).removeAttribute('src');$(hintId).hidden=false;
  }
  activeLook='';$('direction').value='';syncLooks();
  if(publicPreview())status('');
  $('fashn-api-state').textContent='Sign in to check API credits';$('check-fashn').disabled=true;
  $('gate').hidden=publicPreview();$('workspace').hidden=!publicPreview();$('fashion-gallery').hidden=publicPreview();$('signin').disabled=!clerk;
  update();
}
async function sync(){
  if(signingIn)return;signingIn=true;
  const version=authVersion;
  try{
    if(!clerk?.isSignedIn){lock();$('auth-status').textContent='Sign in with your Parallel Vision owner account.';return;}
    if(authenticated&&sessionId===clerk.session?.id)return;
    const session=await api('/api/session');isCustomer=!!session.customer;const info=await api('/api/fashion/models');
    models=info.models||[];authenticated=true;sessionId=clerk.session?.id||'';
    $('gate').hidden=true;$('workspace').hidden=false;$('fashion-gallery').hidden=false;update();scheduleQuote();
    // Secondary gallery and provider-balance reads must never delay the editor.
    void loadHistory();
    void checkFashnBalance();
  }catch(e){if(version===authVersion){lock();$('auth-status').textContent=e.message;}}
  finally{signingIn=false;}
}
if(onNavigate)root.addEventListener('click',event=>{
  const link=event.target.closest?.('a[href*="studio.html?tool="]');
  if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();onNavigate(new URL(link.href,location.href).searchParams.get('tool')||'image');
});
// Guest settings and local photo previews use the approved form. Account
// operations still go through the real session client after authentication.
for(const type of ['click','submit'])root.addEventListener(type,event=>{
  if(!publicPreview())return;
  if(type==='click'&&!event.target.closest('#quote,#check-fashn,#refresh-history,#fashion-more'))return;
  event.preventDefault();event.stopImmediatePropagation();clerk?.openSignIn();
},true);
update();
const ready=(async()=>{
if(sessionClient){clerk=sessionClient;await sync();return;}
try{
  clerk=await loadLabAccount();
  clerk.addListener(()=>void sync());await sync();
}catch{
  $('auth-status').textContent='Sign-in could not load. Reload the page.';
  $('reload').hidden=false;$('signin').disabled=true;
}

})();
return {ready,sync,lock};
}
if(document.getElementById('fashion-form'))createFashionStudio();
