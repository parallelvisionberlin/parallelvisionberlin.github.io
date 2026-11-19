import {openLabSignIn} from './auth-google.js?v=20261117-pv-google1';
import {loadLabAccount} from './native-account.js?v=20261014-native-photo-picker1&createGallery=20261014-1&generateStable=20261014-1&studioAuth=20261015-1&providerPolicy=20261015-google-only1';
import {createSessionRequest} from './session-request.js?v=20261015-canonical-studio1';
import {createAccountMenu} from './account-menu.js?v=20261030-robin-partner1';
import {beautySettings,validateBeautyQuote,BEAUTY_PROMPT_PREFIX,beautyAutoRatio} from './beauty-settings.js?v=20261119-makeup30-1&seedream55Default=20261119-15k1';
import {beautyLookCatalog} from './beauty-look-catalog.js?v=20261119-makeup30-1';
const API='https://parallel-vision-lab.parallelvision.workers.dev',$=id=>document.getElementById(id);
const activeStates=new Set(['submitting','queued','running','saving','uncertain']);
const menu=createAccountMenu($('beauty-account')),pendingKey='pvlab-beauty-pending';
let clerk=null,profile=null,sessionId='',epoch=0,revision=0,syncing=false,file=null,source=null,photoUrl='',resultUrl='',quote=null,photoWidth=0,photoHeight=0,compareUrl='';
let photoSelectionRevision=0,preparing=false,submitting=false,activeId='',uncertain=false,quoteTimer=null,expiryTimer=null,pollTimer=null,resultRevision=0,historyRevision=0;
const blobs=new Map(),makeupSources=new Map(),pendingJobs=new Map(),pollTimers=new Map();
let jobPhase='',detachedFromJob=false,resultLoading=false;
const request=createSessionRequest({baseUrl:API,getSession:()=>clerk?.session});
// The main Studio exposes Effects only to the server-verified owner account.
function syncHeaderAccess(){const effects=$('beauty-effects-link');if(effects)effects.hidden=!(profile?.owner===true&&profile?.customer!==true);}
const status=(message='',error=false)=>{$('beauty-status').textContent=message;$('beauty-status').classList.toggle('error',error);};
function readPending(){try{const p=JSON.parse(sessionStorage.getItem(pendingKey));return p?.sessionId===sessionId?p:null;}catch{return null;}}
function savePending(value){try{if(value)sessionStorage.setItem(pendingKey,JSON.stringify({...value,sessionId}));else sessionStorage.removeItem(pendingKey);}catch{}}
function busy(){return submitting||uncertain;}
function currentJobInDeck(){return !!activeId&&!detachedFromJob;}
function clearQuote(){quote=null;clearTimeout(expiryTimer);clearTimeout(quoteTimer);}
function settings(){return beautySettings({makeup:$('beauty-makeup').value,hair:$('beauty-hair').value,skin:$('beauty-skin').value,light:$('beauty-light').value,color:$('beauty-color').value,strength:$('beauty-strength').value,direction:$('beauty-direction').value,model:$('beauty-model').value,resolution:$('beauty-resolution').value,aspectRatio:$('beauty-ratio').value,sourceWidth:photoWidth,sourceHeight:photoHeight,filename:file?.name});}
function update(){
 $('beauty-strength-value').value=$('beauty-strength').value;
 const overlay=$('beauty-processing'),phase=uncertain?'uncertain':submitting?'submitting':currentJobInDeck()?(resultLoading?'saving':jobPhase||'queued'):'';
 overlay.hidden=!phase;overlay.dataset.phase=phase;
 if(phase){
  $('beauty-processing-title').textContent=phase==='uncertain'?'Check image history':phase==='submitting'?'Sending your edit':phase==='saving'?'Saving your image':phase==='queued'?'Your edit is queued':'Creating your image';
  $('beauty-processing-note').textContent=phase==='uncertain'?'Review History before another request.':phase==='submitting'?'Confirming your request securely':phase==='queued'?'Accepted. You can return to this in History.':phase==='saving'?'Saving the result to your account':'Processing with the selected image model';
 }
 const button=$('beauty-generate');button.disabled=busy()||preparing||resultLoading;button.setAttribute('aria-busy',String(submitting||preparing||resultLoading));
 button.textContent=uncertain?'Check Image history':submitting?'Sending…':currentJobInDeck()?'New edit':preparing?'Checking price…':quote?`Generate · ${quote.creditCost.toLocaleString()} credits`:'Generate';
 if(!busy()&&!preparing&&!quote&&!currentJobInDeck()){const arrow=document.createElement('span');arrow.className='beauty-arrow';arrow.setAttribute('aria-hidden','true');button.append(arrow);}
 $('beauty-refresh').hidden=!profile;$('beauty-check-history').hidden=!uncertain;
 const editBusy=submitting||currentJobInDeck()||resultLoading;
 for(const element of $('beauty-form').querySelectorAll('select,textarea,input[type=range]'))element.disabled=editBusy;
 $('beauty-photo').disabled=editBusy;$('beauty-change-photo').disabled=editBusy;
}
async function api(path,{method='GET',body,headers={}}={}){
 const version=epoch,init={method,headers:{...headers}};
 if(body!==undefined){if(body instanceof Blob)init.body=body;else{init.headers['Content-Type']='application/json';init.body=JSON.stringify(body);}}
 const response=await request(path,init);const data=await response.json().catch(()=>({}));
 if(version!==epoch)throw Error('Your account session changed.');
 if(!response.ok)throw Error(data.error||`The studio returned HTTP ${response.status}.`);
 return data;
}
async function imageBlob(id,version=epoch){
 const response=await request('/api/assets/'+encodeURIComponent(id));
 if(!response.ok)throw Error('Your image could not be loaded.');
 const blob=await response.blob();if(version!==epoch||!profile)throw Error('Your account session changed.');
 if(!blob.type.startsWith('image/'))throw Error('The stored result is not an image.');return blob;
}
function invalidate(){revision++;clearQuote();update();scheduleQuote();}
function scheduleQuote(){clearTimeout(quoteTimer);if(profile&&file&&!busy())quoteTimer=setTimeout(()=>void prepareQuote(),180);}
async function setPhoto(selected){
 if(!selected||busy())return;
 if(!['image/jpeg','image/png','image/webp'].includes(selected.type)||!selected.size||selected.size>10*1024*1024){status('Choose a JPG, PNG or WebP photograph up to 10 MiB.',true);$('beauty-photo').value='';return;}
 const at=++photoSelectionRevision,version=epoch,url=URL.createObjectURL(selected),image=new Image();file=null;source=null;clearQuote();update();revision++;image.src=url;
 try{await image.decode();if(!image.naturalWidth||!image.naturalHeight)throw Error();}catch{URL.revokeObjectURL(url);if(at===photoSelectionRevision)status('That photograph could not be read. Please choose another image.',true);return;}
 if(at!==photoSelectionRevision||version!==epoch){URL.revokeObjectURL(url);return;}
 if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=url;file=selected;photoWidth=image.naturalWidth;photoHeight=image.naturalHeight;source=null;clearQuote();
  $('beauty-ratio').querySelector('option[value="auto"]').textContent='Auto · '+beautyAutoRatio(photoWidth,photoHeight,$('beauty-model').value);
 $('beauty-photo-preview').src=url;$('beauty-photo-preview').hidden=false;$('beauty-photo-empty').hidden=true;
 $('beauty-change-photo').replaceChildren(document.createTextNode('Change photo '));const arrow=document.createElement('span');arrow.className='beauty-arrow';arrow.setAttribute('aria-hidden','true');$('beauty-change-photo').append(arrow);
 status('');update();scheduleQuote();
}
async function prepareQuote(){
 if(preparing||busy()||!profile||!file)return null;
 let chosen;try{chosen=settings();}catch(error){status(error.message,true);return null;}
 const version=epoch,edit=revision,selected=file;preparing=true;update();
 try{
  if(!profile.config?.enabled)throw Error('Image generation is not available for this account yet.');
  if(!source||source.file!==selected){
   const uploaded=await api('/api/uploads',{method:'POST',body:selected,headers:{'Content-Type':selected.type,'X-Filename':encodeURIComponent(selected.name)}});
   if(version!==epoch||selected!==file)return null;
   if(!uploaded.id)throw Error('Your photograph could not be prepared.');source={file:selected,id:uploaded.id};
   if(edit!==revision)return null;
  }
  let makeupSourceId=null;
  if(chosen.referenceRoles.length===2){
   const makeupId=$('beauty-makeup').value;
   if(!makeupSources.has(makeupId)){
    const option=beautyLookCatalog.makeup.find(item=>item.id===makeupId&&item.image);
    if(!option)throw Error('The makeup reference is unavailable. Nothing submitted.');
    // Use the exact approved image behind the selected thumbnail, never a generated substitute.
    const response=await fetch(new URL(option.image,import.meta.url),{credentials:'same-origin'});
    if(!response.ok)throw Error('The makeup reference could not load. Nothing submitted.');
    const blob=await response.blob();
    if(blob.type!=='image/webp'||!blob.size||blob.size>10*1024*1024)throw Error('The makeup reference is invalid. Nothing submitted.');
    if(version!==epoch||edit!==revision||selected!==file)return null;
    const uploaded=await api('/api/uploads',{method:'POST',body:blob,headers:{'Content-Type':'image/webp','X-Filename':encodeURIComponent('alter-makeup-'+makeupId+'.webp')}});
    if(version!==epoch)return null;
    if(!uploaded.id)throw Error('The makeup reference upload was not confirmed. Nothing submitted.');
    makeupSources.set(makeupId,uploaded.id);
   }
   makeupSourceId=makeupSources.get(makeupId);
   if(version!==epoch||edit!==revision||selected!==file)return null;
  }
  const referenceSourceIds=[source.id,...(makeupSourceId?[makeupSourceId]:[])];
  const priced=await api('/api/quotes',{method:'POST',body:{sourceId:source.id,referenceSourceIds,settings:chosen}});
  if(version!==epoch||edit!==revision||selected!==file)return null;
  quote=validateBeautyQuote(priced,chosen,source.id,Date.now(),makeupSourceId);
  expiryTimer=setTimeout(()=>{quote=null;update();scheduleQuote();},Math.min(2147483647,Math.max(1,quote.expiresAt-Date.now())));
  status('');return quote;
 }catch(error){if(version===epoch&&edit===revision){clearQuote();status(error.message,true);}return null;}
 finally{if(version===epoch){preparing=false;update();if(edit!==revision)scheduleQuote();}}
}
async function signIn(){
 try{clerk=clerk||await loadLabAccount();const url=location.href;openLabSignIn(clerk,{forceRedirectUrl:url,signInForceRedirectUrl:url,signUpForceRedirectUrl:url});}
 catch(error){status('Sign-in could not load. '+error.message,true);}
}
async function generate(event){
 event.preventDefault();
 if(currentJobInDeck()&&!submitting&&!resultLoading&&!uncertain){beginNewEdit();return;}
 if(busy()||preparing||resultLoading)return;
 if(!file){status('Add your photograph first.');$('beauty-photo').click();return;}
 if(!profile){await signIn();return;}
 if(!quote||quote.expiresAt<=Date.now()){await prepareQuote();if(quote)status('The credit price is ready. Press Generate to continue.');return;}
 const frozen=quote,version=epoch;let confirmedJob=null;jobPhase='submitting';submitting=true;clearTimeout(expiryTimer);savePending({quoteId:frozen.id,at:Date.now()});update();status('Sending your beauty edit…');
 try{
  const response=await api('/api/jobs',{method:'POST',body:{quoteId:frozen.id,confirm:true}});
  if(version!==epoch)return;
  if(!response.job?.id)throw Error('The server did not confirm a generation.');
  confirmedJob=response.job;clearQuote();activeId=response.job.id;detachedFromJob=false;jobPhase=response.job.status||'queued';pendingJobs.set(activeId,response.job.status);savePending({jobId:activeId,quoteId:frozen.id,at:Date.now()});
  // The paid request is now accepted. Hand off its actual progress immediately;
  // do not keep the interface in Sending while History or result bytes load.
  submitting=false;update();
  await showJob(response.job);void loadHistory();
 }catch(error){if(version===epoch){clearQuote();if(confirmedJob){activeId=activeStates.has(confirmedJob.status)?confirmedJob.id:'';if(!activeId)savePending(null);status('Your generation was received. '+error.message+' Use Refresh to check its result.',true);}else{uncertain=true;status(error.message+' Check Image history before starting another generation.',true);}}}
 finally{if(version===epoch){submitting=false;update();}}
}
async function showResult(job){
 if(!job.outputId)return;
 const version=epoch,selection=++resultRevision,sourceId=job.settings?.referenceSourceIds?.[0]||'';
 // Keep the original bytes for this selection, independently of the mutable upload tile.
 let original=sourceId&&sourceId===source?.id?source.file:null;
 const blob=await imageBlob(job.outputId,version);
 // History must compare against the source of THIS job, never whatever happens to be in the upload tile.
 if(sourceId&&!original){try{original=await imageBlob(sourceId,version);}catch{}}
 if(version!==epoch||selection!==resultRevision)return;
 if(resultUrl)URL.revokeObjectURL(resultUrl);resultUrl=URL.createObjectURL(blob);
 if(compareUrl)URL.revokeObjectURL(compareUrl);compareUrl=original?URL.createObjectURL(original):'';
 const beforeUrl=compareUrl;
 const resultNode=$('beauty-result');
 resultNode.dataset.beforeUrl=beforeUrl||'';resultNode.dataset.beforeSourceId=beforeUrl?sourceId:'';
 $('beauty-result-image').src=resultUrl;resultNode.hidden=false;$('beauty-download').href=resultUrl;
 $('beauty-download').download='pvlab-beauty-'+job.id+(blob.type==='image/jpeg'?'.jpg':blob.type==='image/webp'?'.webp':'.png');
 $('beauty-example-label').hidden=true;$('beauty-workspace').classList.add('has-result');
}
// Each confirmed job owns a background poll. The front editor never owns its lifetime.
function schedulePoll(id,delay=4000){
 clearTimeout(pollTimers.get(id));
 if(!pendingJobs.has(id)||!profile)return;
 pollTimers.set(id,setTimeout(()=>void poll(id),delay));
}
async function showJob(job){
 if(!job?.id)return;
 const foreground=currentJobInDeck()&&job.id===activeId;
 const state=job.status||'queued';
 if(foreground)jobPhase=state;
 if(state==='completed'||state==='failed'||state==='resolved'){
  pendingJobs.delete(job.id);clearTimeout(pollTimers.get(job.id));pollTimers.delete(job.id);
  if(readPending()?.jobId===job.id)savePending(null);
  if(foreground){
   if(state==='completed'){
    resultLoading=true;update();
    try{await showResult(job);status('Your beauty edit is ready.');}
    finally{resultLoading=false;activeId='';}
   }else{activeId='';status(job.error||'This edit did not finish. Check History before retrying.',true);}
  }
  await refreshProfile();
 }else if(state==='uncertain'){
  pendingJobs.delete(job.id);clearTimeout(pollTimers.get(job.id));pollTimers.delete(job.id);
  uncertain=true;if(foreground)activeId='';
  status('The generation needs review. Check Image history before starting another.',true);
 }else if(activeStates.has(state)){
  pendingJobs.set(job.id,state);
  if(foreground)status(state==='saving'?'Saving your result…':'Creating your beauty edit…');
  schedulePoll(job.id);
 }
 update();
}
async function poll(id){
 if(!profile||!pendingJobs.has(id))return;
 try{
  const {job}=await api('/api/jobs/'+encodeURIComponent(id));
  if(!pendingJobs.has(id))return;
  await showJob(job);
  if(!activeStates.has(job.status))void loadHistory();
 }catch(error){
  if(profile&&pendingJobs.has(id)){
   if(id===activeId)status(error.message+' Check History for the latest state.',true);
   schedulePoll(id,15000);
  }
 }
}
function beginNewEdit(){
 // A confirmed job remains in authenticated Results and keeps polling.
 // This resets only the editing surface; no new paid request is submitted.
 if(!currentJobInDeck()||submitting||resultLoading||uncertain)return;
 const previousId=activeId;detachedFromJob=true;activeId='';jobPhase='';
 const pending=readPending();
 if(pending?.jobId===previousId)savePending({...pending,detached:true});
 revision++;photoSelectionRevision++;clearQuote();
 if(photoUrl)URL.revokeObjectURL(photoUrl);
 if(resultUrl)URL.revokeObjectURL(resultUrl);
 if(compareUrl)URL.revokeObjectURL(compareUrl);
 photoUrl='';resultUrl='';compareUrl='';resultRevision++;
 file=null;source=null;photoWidth=0;photoHeight=0;
 $('beauty-result').dataset.beforeUrl='';$('beauty-result').dataset.beforeSourceId='';
 $('beauty-result-image').removeAttribute('src');$('beauty-download').removeAttribute('href');
 $('beauty-form').reset();
 $('beauty-ratio').querySelector('option[value="4:5"]').disabled=false;
 $('beauty-ratio').querySelector('option[value="auto"]').textContent='Auto';
 $('beauty-photo-preview').removeAttribute('src');$('beauty-photo-preview').hidden=true;
 $('beauty-photo-empty').hidden=false;$('beauty-change-photo').textContent='Upload image';
 $('beauty-result').hidden=true;$('beauty-example-label').hidden=false;
 $('beauty-workspace').classList.remove('has-result');
 $('beauty-direction').dataset.presetDirection='';
 for(const id of ['beauty-makeup','beauty-hair','beauty-skin','beauty-light','beauty-color']){
  $(id).dispatchEvent(new Event('change',{bubbles:true}));
 }
 $('beauty-strength').dispatchEvent(new Event('input',{bubbles:true}));
 status('Your generation continues in Results. Add a photo to create another.');
 update();
}
async function loadHistory(){
 if(!profile)return;const version=epoch,selection=++historyRevision;
 try{
  const data=await api('/api/jobs');if(version!==epoch||selection!==historyRevision)return;
  const actives=(data.activeJobs||[]).filter(j=>j.settings?.prompt?.startsWith(BEAUTY_PROMPT_PREFIX));
  const saved=(data.jobs||[]).filter(j=>j.settings?.type==='image'&&j.settings.prompt?.startsWith(BEAUTY_PROMPT_PREFIX));
  const jobs=[...actives.filter(j=>!saved.some(item=>item.id===j.id)),...saved];
  $('beauty-history').replaceChildren();for(const value of blobs.values())URL.revokeObjectURL(value);blobs.clear();
  $('beauty-empty-results').hidden=jobs.length>0;
  for(const job of jobs.slice(0,12)){
   const button=document.createElement('button');button.type='button';button.setAttribute('aria-label','Open beauty result from '+new Date(job.createdAt||Date.now()).toLocaleDateString());
   const label=document.createElement('span');label.textContent=job.status==='completed'?'Loading…':job.status==='queued'?'Queued · generating':job.status==='running'?'Generating':job.status==='saving'?'Saving':job.status;button.append(label);$('beauty-history').append(button);
   if(['submitting','queued','running','saving'].includes(job.status))button.dataset.beautyPending='true';
   if(job.status==='completed'&&job.outputId){
    button.addEventListener('click',()=>void showResult(job).catch(error=>status(error.message,true)));
    void imageBlob(job.outputId,version).then(blob=>{if(version!==epoch||!button.isConnected)return;const url=URL.createObjectURL(blob);blobs.set(job.id,url);const image=new Image();image.alt='Saved Beauty Studio result';image.src=url;button.replaceChildren(image);}).catch(()=>{if(button.isConnected)label.textContent='Open result';});
   }else button.disabled=true;
  }
  for(const active of actives){
   if(!activeId&&!detachedFromJob&&!file&&!uncertain)activeId=active.id;
   await showJob(active);
  }
 }catch(error){if(version===epoch)status(error.message,true);}
}
async function refreshProfile(){if(!profile)return;try{const next=await api('/api/session');profile=next;menu.update({signed:true,user:clerk.user,profile});syncHeaderAccess();}catch{} }
function clearPrivate(){
 epoch++;revision++;photoSelectionRevision++;clearQuote();clearTimeout(pollTimer);for(const timer of pollTimers.values())clearTimeout(timer);pollTimers.clear();pendingJobs.clear();detachedFromJob=false;resultLoading=false;makeupSources.clear();jobPhase='';file=null;source=null;photoWidth=0;photoHeight=0;activeId='';submitting=false;uncertain=false;profile=null;preparing=false;
 if(photoUrl)URL.revokeObjectURL(photoUrl);if(resultUrl)URL.revokeObjectURL(resultUrl);if(compareUrl)URL.revokeObjectURL(compareUrl);photoUrl='';resultUrl='';compareUrl='';$('beauty-result').dataset.beforeUrl='';$('beauty-result').dataset.beforeSourceId='';
 for(const value of blobs.values())URL.revokeObjectURL(value);blobs.clear();$('beauty-history').replaceChildren();
 $('beauty-form').reset();$('beauty-ratio').querySelector('option[value="4:5"]').disabled=false;$('beauty-ratio').querySelector('option[value="auto"]').textContent='Auto';$('beauty-photo-preview').removeAttribute('src');$('beauty-photo-preview').hidden=true;$('beauty-photo-empty').hidden=false;$('beauty-change-photo').textContent='Add photo';
 $('beauty-result-image').removeAttribute('src');$('beauty-download').removeAttribute('href');$('beauty-result').hidden=true;$('beauty-example-label').hidden=false;$('beauty-workspace').classList.remove('has-result');$('beauty-empty-results').hidden=false;
 $('beauty-reset-pending')?.setAttribute('hidden','');status('');menu.update({signed:false});$('beauty-signin').hidden=false;syncHeaderAccess();update();
}
async function sync(){
 const nextId=clerk?.isSignedIn?clerk.session?.id||'':'';
 if(nextId!==sessionId){if(sessionId||profile)clearPrivate();else{epoch++;revision++;clearQuote();}sessionId=nextId;}
 if(!nextId||syncing||profile)return;
 syncing=true;const version=epoch;
 try{
  const data=await api('/api/session');if(version!==epoch)return;
  profile=data;$('beauty-signin').hidden=true;menu.update({signed:true,user:clerk.user,profile});syncHeaderAccess();
  const pending=readPending();if(pending){if(pending.jobId){detachedFromJob=!!pending.detached;activeId=detachedFromJob?'':pending.jobId;pendingJobs.set(pending.jobId,'queued');void poll(pending.jobId);}else{uncertain=true;status('A previous submission needs review. Check Image history before starting another.',true);}}
  await loadHistory();scheduleQuote();
 }catch(error){if(version===epoch){status(error.message,true);menu.update({signed:false});}}
 finally{syncing=false;update();if(version!==epoch)void sync();}
}
$('beauty-change-photo').addEventListener('click',()=>$('beauty-photo').click());
$('beauty-photo').addEventListener('change',event=>{const chosen=event.target.files?.[0];event.target.value='';void setPhoto(chosen);});
for(const name of ['dragenter','dragover'])$('beauty-photo-drop').addEventListener(name,event=>{event.preventDefault();if(!busy())$('beauty-photo-drop').classList.add('is-dragging');});
$('beauty-photo-drop').addEventListener('dragleave',event=>{if(!event.currentTarget.contains(event.relatedTarget))event.currentTarget.classList.remove('is-dragging');});
$('beauty-photo-drop').addEventListener('drop',event=>{event.preventDefault();event.currentTarget.classList.remove('is-dragging');void setPhoto(event.dataTransfer?.files?.[0]);});
for(const id of ['beauty-makeup','beauty-hair','beauty-skin','beauty-light','beauty-color','beauty-model','beauty-resolution','beauty-ratio'])$(id).addEventListener('change',()=>{status('');invalidate();});
$('beauty-model').addEventListener('change',()=>{
 const is55=$('beauty-model').value==='seedream55';
 const resolution=$('beauty-resolution'),previous=resolution.value;
 const tier=resolution.querySelector('option[value="1.5k"]');
 if(is55){
  if(!tier)resolution.add(new Option('1.5K','1.5k'),1);
  if(previous==='1k')resolution.value='1.5k';
 }else if(tier){
  tier.remove();
  if(previous==='1.5k')resolution.value='1k';
 }
 const option=$('beauty-ratio').querySelector('option[value="4:5"]');option.disabled=is55;
 if(is55&&$('beauty-ratio').value==='4:5'){$('beauty-ratio').value='3:4';$('beauty-ratio').dispatchEvent(new Event('change',{bubbles:true}));}
 if(photoWidth&&photoHeight)$('beauty-ratio').querySelector('option[value="auto"]').textContent='Auto · '+beautyAutoRatio(photoWidth,photoHeight,$('beauty-model').value);
});
for(const id of ['beauty-strength','beauty-direction'])$(id).addEventListener('input',()=>{status('');invalidate();});
$('beauty-form').addEventListener('submit',event=>void generate(event));$('beauty-signin').addEventListener('click',()=>void signIn());
$('beauty-refresh').addEventListener('click',()=>{for(const id of pendingJobs.keys())void poll(id);void loadHistory();});
$('beauty-account').querySelector('[data-account-signout]').addEventListener('click',async()=>{clearPrivate();await clerk?.signOut();});
$('beauty-account').querySelector('[data-account-referrals]').addEventListener('click',()=>{location.href='./account.html';});
for(const button of document.querySelectorAll('[data-open-studios]'))button.addEventListener('click',()=>document.querySelector('.pv-studios-trigger')?.click());
window.addEventListener('pagehide',()=>{clearTimeout(pollTimer);for(const timer of pollTimers.values())clearTimeout(timer);clearTimeout(quoteTimer);clearTimeout(expiryTimer);});
window.addEventListener('pageshow',event=>{if(event.persisted){void sync();for(const id of pendingJobs.keys())void poll(id);if(!currentJobInDeck())scheduleQuote();}});
// An ambiguous submit stays blocked across reloads. Reset is an explicit new
// edit after opening History; it never retries the previous paid request.
const reset=document.createElement('button');reset.type='button';reset.id='beauty-reset-pending';reset.className='beauty-reset-pending';reset.textContent='Reviewed history · start a new edit';reset.hidden=true;$('beauty-check-history').after(reset);
$('beauty-check-history').target='_blank';$('beauty-check-history').rel='noopener';
$('beauty-check-history').addEventListener('click',()=>{reset.hidden=false;});
reset.addEventListener('click',()=>{savePending(null);clearPrivate();sessionId='';reset.hidden=true;void sync();});
update();
try{clerk=await loadLabAccount();await sync();clerk.addListener(()=>void sync());}catch(error){status('Sign-in is temporarily unavailable. You can still explore the studio. '+error.message,true);}
