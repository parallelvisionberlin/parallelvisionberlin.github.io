import {createSessionRequest} from './session-request.js?v=20260927-auth1';
const API='https://parallel-vision-lab.parallelvision.workers.dev';
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:4}).format(n);
const modes={
  fashn16:{description:'Stable garment transfer, designed to preserve patterns and clothing details.',note:'Published fal.ai estimate: $0.075 per image. The model decides the final garment fit.',provider:'fal'},
  fashnmax:{description:'Premium product fidelity, including accessories and detailed fashion looks. Direct FASHN API.',note:'Requires FASHN API credits and a FASHN_API_KEY Worker secret. One successful 1K Balanced output costs two FASHN credits.',provider:'fashn'},
  fluxvto:{description:'Prompt-directed styling: layering, rolled sleeves and the way garments are worn.',note:'fal.ai charges by input and output megapixels. This workspace requires a person image ≤2 MP and a garment image ≤1 MP.',provider:'fal'}
};
let clerk=null,authenticated=false,sessionId='',models=[],busy=false,quote=null,pollTimeout=null,activeJobId='',resultUrl='',signingIn=false;
let fileKeys=new Map(),previews=new Map(),revision=0;
const request=createSessionRequest({baseUrl:API,getSession:()=>clerk?.session});
function status(message,error=false){$('status').textContent=message||'';$('status').classList.toggle('error',error);}
function revokeResult(){if(resultUrl)URL.revokeObjectURL(resultUrl);resultUrl='';$('result-image').hidden=true;$('result-image').removeAttribute('src');$('result-placeholder').hidden=false;$('download').hidden=true;}
function clearQuote(){quote=null;$('quote-box').hidden=true;$('quote').hidden=false;}
function change(){revision++;clearQuote();update();}
async function api(path,{method='GET',body,headers={}}={}){
  const init={method,headers:{...headers}};
  if(body!==undefined){
    if(body instanceof File || body instanceof Blob){init.body=body;}
    else{init.headers['Content-Type']='application/json';init.body=JSON.stringify(body);}
  }
  const res=await request(path,init);
  let payload;try{payload=await res.json();}catch{payload={};}
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
  $('direction-required').textContent=selected==='fluxvto'?'Required':'Optional';
  $('direction').placeholder=selected==='fluxvto'?'Describe how the garment should be worn (required).':'Optional: roll up sleeves, open jacket, or keep original styling.';
  $('quote').disabled=!authenticated||busy||!$('person-file').files.length||!$('garment-file').files.length||!providerModel?.available||(selected==='fluxvto'&&!$('direction').value.trim());
  $('quote').textContent=busy?'Working…':'Review price';
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
  for(const event of ['dragenter','dragover'])container.addEventListener(event,()=>container.classList.add('drag-over'));
  for(const event of ['dragleave','drop'])container.addEventListener(event,()=>container.classList.remove('drag-over'));
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
    quote=response;$('quote-price').textContent='Estimated provider cost: '+money(response.estimatedUsd);
    $('quote-note').textContent=response.notice+' This price check does not generate an image. Quote expires at '+new Date(response.expiresAt).toLocaleTimeString()+'.';
    $('quote-box').hidden=false;$('quote').hidden=true;status('Review the estimate. Confirm only if you want one paid render.');
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
  const blob=await assetBlob(job.outputId);
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
  authenticated=false;sessionId='';clearTimeout(pollTimeout);pollTimeout=null;activeJobId='';busy=false;clearQuote();revokeResult();
  for(const url of previews.values())URL.revokeObjectURL(url);
  previews.clear();fileKeys.clear();revision++;
  for(const [fileId,imgId,hintId] of [['person-file','person-preview','person-hint'],['garment-file','garment-preview','garment-hint']]){
    $(fileId).value='';$(imgId).hidden=true;$(imgId).removeAttribute('src');$(hintId).hidden=false;
  }
  $('gate').hidden=false;$('workspace').hidden=true;$('signin').disabled=!clerk;
  update();
}
async function sync(){
  if(signingIn)return;signingIn=true;
  try{
    if(!clerk?.isSignedIn){lock();$('auth-status').textContent='Sign in with your Parallel Vision owner account.';return;}
    if(authenticated&&sessionId===clerk.session?.id)return;
    await api('/api/session');const info=await api('/api/fashion/models');
    models=info.models||[];authenticated=true;sessionId=clerk.session?.id||'';
    $('gate').hidden=true;$('workspace').hidden=false;update();await loadHistory();
  }catch(e){lock();$('auth-status').textContent=e.message;}
  finally{signingIn=false;}
}
update();
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
