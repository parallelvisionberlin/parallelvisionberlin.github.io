import {createSessionRequest} from './session-request.js?v=20260927-auth1';
export function createFashionStudio(root=document,{sessionClient=null,onNavigate=null}={}){
const API='https://parallel-vision-lab.parallelvision.workers.dev';
const $=id=>root.getElementById(id);
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:4}).format(n);
const modes={
  fashn16:{description:'An alternative for straightforward garment transfer, through fal.ai.',note:'fal.ai charges separately. Published estimate: $0.075 per image.',provider:'fal'},
  fashnmax:{description:'High-detail garment transfer using your FASHN API credits.',note:'Balanced 1K estimates 2 FASHN credits ($0.15). Review the quote before generating.',provider:'fashn'},
  fluxvto:{description:'Prompt-directed styling for layering, fit and the way clothing is worn.',note:'fal.ai charges by megapixel. Person image maximum 2 MP; garment maximum 1 MP.',provider:'fal'}
};
let clerk=null,authenticated=false,sessionId='',models=[],busy=false,quote=null,pollTimeout=null,activeJobId='',resultUrl='',signingIn=false;
let fileKeys=new Map(),previews=new Map(),revision=0,authVersion=0;
const request=createSessionRequest({baseUrl:API,getSession:()=>clerk?.session});
function status(message,error=false){$('status').textContent=message||'';$('status').classList.toggle('error',error);}
function revokeResult(){if(resultUrl)URL.revokeObjectURL(resultUrl);resultUrl='';$('result-image').hidden=true;$('result-image').removeAttribute('src');$('result-placeholder').hidden=false;$('download').hidden=true;}
function clearQuote(){quote=null;$('quote-box').hidden=true;$('quote').hidden=false;}
function change(){revision++;clearQuote();update();}
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
  $('model-note').textContent=d.note+(providerModel&&!providerModel.available?' This model is not connected yet.':'');
  $('direction-required').textContent=selected==='fluxvto'?'REQUIRED':'OPTIONAL';
  $('direction').placeholder=selected==='fluxvto'?'Describe how the garment should be worn…':'Keep the silhouette. Open the jacket, soften the folds…';
  $('quote').disabled=!authenticated||busy||!$('person-file').files.length||!$('garment-file').files.length||!providerModel?.available||(selected==='fluxvto'&&!$('direction').value.trim());
  const title=busy?'Preparing…':'Review price';
  if($('quote').dataset.caption!==title){
    $('quote').dataset.caption=title;
    const arrow=document.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
    $('quote').replaceChildren(document.createTextNode(title+' '),arrow);
  }
  const person=!!$('person-file').files.length,garment=!!$('garment-file').files.length;
  $('action-hint').textContent=!person||!garment?'Add a person and garment to review your cost.':!providerModel?.available?'This model is not connected. Select another available engine.':selected==='fluxvto'&&!$('direction').value.trim()?'Add a styling direction for FLUX.':'Review the estimate first. Generating always needs confirmation.';
  $('action-hint').hidden=!!quote;
  $('confirm').disabled=busy||!quote||quote.expiresAt<=Date.now();
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
    fileKeys.delete(id);status('Photographs selected. Review the model and estimated cost.');change();
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
async function upload(id){
  const file=$(id).files?.[0];if(!file)throw new Error('Select both photographs first.');
  const saved=fileKeys.get(id);if(saved?.file===file)return saved.assetId;
  const result=await api('/api/uploads',{method:'POST',body:file,headers:{'Content-Type':file.type,'X-Filename':encodeURIComponent(file.name)}});
  if($(id).files?.[0]!==file)throw new Error('Photograph changed during upload. Review again.');
  fileKeys.set(id,{file,assetId:result.id});return result.id;
}
$('fashion-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!authenticated)return;
  const provider=models.find(x=>x.id===current());
  if(!provider?.available){status('Connect the selected model API key first.',true);return;}
  const editVersion=revision;
  clearQuote();busy=true;update();status('Uploading photographs to your private Cloudflare archive. No generation has started.');
  try{
    const modelSourceId=await upload('person-file'),garmentSourceId=await upload('garment-file');
    if(revision!==editVersion)throw new Error('Inputs changed. Review again.');
    const settings={model:current(),modelSourceId,garmentSourceId,prompt:$('direction').value.trim(),
      resolution:$('max-resolution').value,generationMode:$('max-mode').value,
      category:$('fashn16-category').value,quality:$('fashn16-quality').value};
    const response=await api('/api/fashion/quote',{method:'POST',body:settings});
    if(revision!==editVersion)throw new Error('Settings changed. Request a new quote.');
    quote=response;
    const credits=current()==='fashnmax'?Math.round(response.estimatedUsd/.075):null;
    $('quote-price').textContent=(credits===null?'Estimated provider cost: ':'Estimated: '+credits+' credits · ')+money(response.estimatedUsd);
    $('quote-note').textContent=response.notice+' This price check does not generate an image. Quote expires at '+new Date(response.expiresAt).toLocaleTimeString()+'.';
    $('quote-box').hidden=false;$('quote').hidden=true;status('');
  }catch(e){status(e.message,true);}
  finally{busy=false;update();}
});
$('confirm').addEventListener('click',async()=>{
  if(busy||!quote)return;
  if(quote.expiresAt<=Date.now()){status('Estimate expired. Review price again.',true);clearQuote();update();return;}
  const quoted=quote;busy=true;update();status('Submitting one paid fashion generation. Please do not repeat this request.');
  try{
    const response=await api('/api/fashion/submit',{method:'POST',body:{quoteId:quoted.id,confirm:true}});
    clearQuote();revokeResult();const job=response.job;
    await showJob(job);
    await loadHistory();
  }catch(e){
    // Never automatically resubmit an ambiguous paid request.
    clearQuote();status(e.message+' If submission may have reached the provider, check PV Lab History and the provider dashboard before trying again.',true);
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
    activeJobId=job.id;status('Generation '+state+'. The output will be saved to your PV Lab archive.');
    clearTimeout(pollTimeout);pollTimeout=setTimeout(()=>void poll(job.id),4000);return;
  }
  activeJobId='';clearTimeout(pollTimeout);
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
    balance.textContent=result.connected?'Connected · '+result.credits.total+' credits':(result.note||'FASHN API key is not configured.');
    balance.title=result.connected?result.credits.onDemand+' on-demand / '+result.credits.subscription+' subscription credits':'';

  }catch(e){
    if(authenticated)$('fashn-api-state').textContent='Connection not verified · '+e.message;
  }finally{
    button.disabled=!authenticated;
  }
}
$('check-fashn').addEventListener('click',()=>void checkFashnBalance());
async function loadHistory(){
  if(!authenticated)return;
  const container=$('fashion-history');
  try{
    const data=await api('/api/jobs');
    const jobs=(data.jobs||[]).filter(j=>j.settings?.mode==='fashion').slice(0,8);
    container.replaceChildren();
    if(!jobs.length){const empty=document.createElement('p');empty.className='tip';empty.textContent='No fashion generations yet.';container.append(empty);return;}
    for(const job of jobs){
      const btn=document.createElement('button');btn.type='button';btn.className='history-item';
      const label=document.createElement('span');label.textContent=models.find(m=>m.id===job.settings?.fashionModel)?.label||job.settings?.fashionModel||'Fashion';
      const st=document.createElement('small');st.textContent=job.status;btn.append(label,st);
      btn.addEventListener('click',()=>void showJob(job).catch(e=>status(e.message,true)));container.append(btn);
    }
  }catch(e){container.textContent='History is temporarily unavailable. '+e.message;}
}
$('refresh-history').addEventListener('click',()=>void loadHistory());
$('download').addEventListener('click',()=>{
  if(!resultUrl)return;const a=document.createElement('a');a.href=resultUrl;a.download='pv-lab-fashion.png';document.body.append(a);a.click();a.remove();
});
$('signin').addEventListener('click',()=>clerk?.openSignIn());
$('reload').addEventListener('click',()=>location.reload());
function lock(){
  authVersion++;$('fashion-history').replaceChildren();models=[];
  authenticated=false;sessionId='';clearTimeout(pollTimeout);pollTimeout=null;activeJobId='';busy=false;clearQuote();revokeResult();
  for(const url of previews.values())URL.revokeObjectURL(url);
  previews.clear();fileKeys.clear();revision++;
  for(const [fileId,imgId,hintId] of [['person-file','person-preview','person-hint'],['garment-file','garment-preview','garment-hint']]){
    $(fileId).value='';$(imgId).hidden=true;$(imgId).removeAttribute('src');$(hintId).hidden=false;
  }
  $('fashn-api-state').textContent='Sign in to check API credits';$('check-fashn').disabled=true;
  $('gate').hidden=false;$('workspace').hidden=true;$('signin').disabled=!clerk;
  update();
}
async function sync(){
  if(signingIn)return;signingIn=true;
  const version=authVersion;
  try{
    if(!clerk?.isSignedIn){lock();$('auth-status').textContent='Sign in with your Parallel Vision owner account.';return;}
    if(authenticated&&sessionId===clerk.session?.id)return;
    await api('/api/session');const info=await api('/api/fashion/models');
    models=info.models||[];authenticated=true;sessionId=clerk.session?.id||'';
    $('gate').hidden=true;$('workspace').hidden=false;update();await Promise.all([loadHistory(),checkFashnBalance()]);
  }catch(e){if(version===authVersion){lock();$('auth-status').textContent=e.message;}}
  finally{signingIn=false;}
}
if(onNavigate)root.addEventListener('click',event=>{
  const link=event.target.closest?.('a[href*="studio.html?tool="]');
  if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();onNavigate(new URL(link.href,location.href).searchParams.get('tool')||'image');
});
update();
const ready=(async()=>{
if(sessionClient){clerk=sessionClient;await sync();return;}
try{
  const {Clerk}=await import('https://esm.sh/@clerk/clerk-js@6?bundle');
  await new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://clerk.parallelvisionlabel.com/npm/@clerk/ui@1/dist/ui.browser.js';
    script.onload=resolve;script.onerror=reject;document.head.append(script);
  });
  clerk=new Clerk('pk_live_Y2xlcmsucGFyYWxsZWx2aXNpb25sYWJlbC5jb20k');
  await clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor},signInFallbackRedirectUrl:location.href,signUpFallbackRedirectUrl:location.href});
  clerk.addListener(()=>void sync());await sync();
}catch{
  $('auth-status').textContent='Sign-in could not load. Reload the page.';
  $('reload').hidden=false;$('signin').disabled=true;
}

})();
return {ready,sync,lock};
}
if(document.getElementById('fashion-form'))createFashionStudio();
