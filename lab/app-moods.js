import {MOODS,moodPreviewURL} from './moods.js?app=5&raveNight=3';
const $=id=>document.getElementById(id),detail=$('mood-detail'),button=$('continue-create');
let selected=null,file=null,photoURL='',opener=null,quote=null,revision=0,timer=null,expiry=null,service=null,serviceLoading=null,needsSignIn=false,sending=false,completed=false;
const generation=()=>service?Promise.resolve(service):serviceLoading||(serviceLoading=import('./app-mood-generation.js?v=20261011-cards-deck5').then(({createAppMoodGeneration})=>service=createAppMoodGeneration()));
function resetPrice(){revision++;clearTimeout(timer);clearTimeout(expiry);service?.cancel();quote=null;needsSignIn=false;button.disabled=!file;button.textContent=file?'Check price':'Generate';}
function clearPhoto(){if(photoURL)URL.revokeObjectURL(photoURL);photoURL='';file=null;$('photo-preview').removeAttribute('src');$('photo-preview').hidden=true;$('photo-change').hidden=true;$('remove-photo').hidden=true;$('photo-input').value='';resetPrice();}
function lockControls(value){$('photo-input').disabled=value;$('remove-photo').disabled=value;$('detail-direction').disabled=value;$('close-detail').disabled=value;$('back-detail').disabled=value;}
function openMood(mood,target){selected=mood;opener=target;completed=false;clearPhoto();lockControls(false);$('detail-direction').value='';$('photo-error').textContent='';$('detail-title').textContent=mood.name;$('detail-image').src=moodPreviewURL(mood,{detail:true});$('detail-image').onerror=()=>{$('detail-image').onerror=null;$('detail-image').src=mood.preview;};detail.showModal();detail.focus({preventScroll:true});detail.scrollTop=0;}
function close(){if(!sending)detail.close();}
$('close-detail').onclick=close;$('back-detail').onclick=close;
detail.addEventListener('cancel',event=>{if(sending)event.preventDefault();});
detail.addEventListener('close',()=>{clearPhoto();opener?.focus({preventScroll:true});});
async function prepare(){
  if(!file||sending||completed)return;
  resetPrice();const stamp=revision;button.disabled=true;button.textContent='Checking price…';$('photo-error').textContent='';
  try{const client=await generation();if(stamp!==revision)return;const ready=await client.prepare(file,selected,$('detail-direction').value.trim());if(stamp!==revision)return;quote=ready;button.textContent='Generate · '+quote.label;button.disabled=false;expiry=setTimeout(()=>{if(stamp===revision&&!sending&&!completed){resetPrice();$('photo-error').textContent='Price expired. Tap to refresh it.';}},Math.max(0,quote.expiresAt-Date.now()));}
  catch(error){if(stamp!==revision)return;needsSignIn=error.code==='SIGN_IN';$('photo-error').textContent=error.message;button.textContent=needsSignIn?'Sign in to generate':'Retry price';button.disabled=false;}
}
async function choose(next){if(!next||sending)return;if(!['image/jpeg','image/png','image/webp'].includes(next.type)||!next.size||next.size>10*1024*1024){$('photo-error').textContent='Choose a JPG, PNG or WebP photo up to 10 MB.';$('photo-input').value='';return;}clearPhoto();completed=false;file=next;photoURL=URL.createObjectURL(next);$('photo-preview').src=photoURL;$('photo-preview').hidden=false;$('photo-change').hidden=false;$('remove-photo').hidden=false;await prepare();}
$('photo-input').onchange=event=>void choose(event.target.files[0]);
$('remove-photo').onclick=()=>{clearPhoto();$('photo-error').textContent='';};
$('detail-direction').oninput=()=>{if(sending||completed)return;resetPrice();if(file){button.disabled=true;button.textContent='Checking price…';timer=setTimeout(()=>void prepare(),500);}};
for(const name of ['dragover','drop'])$('photo-picker').addEventListener(name,event=>{event.preventDefault();if(name==='drop')void choose(event.dataTransfer.files[0]);});
$('deck-form').onsubmit=async event=>{
  event.preventDefault();if(sending||completed||!file)return;
  if(needsSignIn){try{const client=await generation();if(await client.signIn())await prepare();}catch(error){$('photo-error').textContent=error.message;}return;}
  if(!quote||Date.now()>=quote.expiresAt){await prepare();return;}
  sending=true;clearTimeout(expiry);button.disabled=true;lockControls(true);button.textContent='Generating…';$('photo-error').textContent='';
  try{const response=await quote.submit();if(!response.job?.id)throw Error('The request was not confirmed. Check Gallery before trying again.');completed=true;button.textContent='Sent to Gallery';$('photo-error').textContent=['failed','uncertain','resolved'].includes(response.job.status)?(response.job.error||'Check this request in Gallery before trying again.'):'Your image is generating. Open Gallery to see its progress.';}
  catch(error){completed=true;button.textContent='Check Gallery';$('photo-error').textContent=error.message+' Check Gallery before starting another request.';}
  finally{sending=false;$('close-detail').disabled=false;$('back-detail').disabled=false;}
};
try{
 const order=['dreamcore','midnight-reverie','90s-cinema','synthetic-romance'];
 const moods=[...MOODS].sort((a,b)=>(order.includes(a.id)?order.indexOf(a.id):100)-(order.includes(b.id)?order.indexOf(b.id):100));
 $('count').textContent=moods.length+' LOOKS';
 for(const mood of moods){const card=document.createElement('button');card.className='mood-card';card.setAttribute('aria-label','Explore '+mood.name);const frame=document.createElement('span');frame.className='card-image';const img=document.createElement('img');img.src=moodPreviewURL(mood);img.onerror=()=>{img.onerror=null;img.src=mood.preview;};img.alt='';img.loading=$('mood-grid').children.length<4?'eager':'lazy';img.decoding='async';img.width=420;img.height=560;frame.append(img);const copy=document.createElement('span');copy.className='card-copy';const name=document.createElement('span');name.className='card-name';name.textContent=mood.name;const action=document.createElement('span');action.className='card-action';action.innerHTML='Try this look <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18m-6-6 6 6-6 6"/></svg>';copy.append(name,action);card.append(frame,copy);card.onclick=()=>openMood(mood,card);$('mood-grid').append(card);}
 window.ReactNativeWebView?.postMessage(JSON.stringify({type:'PV_LAB_READY'}));
}catch{$('load-error').hidden=false;}
