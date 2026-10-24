import {MOODS,moodPreviewURL} from './moods.js?filmOptics=2&app=5&raveNight=3&hongKongRefs=4&dreamcore=7&syntheticRefs=1&raveIdentity=1&filmRevision=4&hkContinuity=4&hkScene=5&hkCinematography=1&midnightFlashV2=1&moodLock=20261014-mood-consistency1&dreamBlur=20261015v1&filmCapture=20261016v2&hkRestore=20261018v1&hkFidelity=20261018v2&hkAtmosphere=20261019v1&hkCanon=20261020v1&hkImage3=20261020v1&hkLight=20261021v10&fisheye=20261020v1&fisheyeCover=20261021v1&hkRefs=20261023two1&dreamBlurBase=20261024v1&fisheyeY2K=20261024v1&eightiesTape=20261024v1';
import {preparePhotoInput} from './photo-input.js?v=1';
const $=id=>document.getElementById(id),detail=$('mood-detail'),button=$('continue-create');
let selected=null,file=null,photoURL='',opener=null,quote=null,revision=0,timer=null,expiry=null,service=null,serviceLoading=null,needsSignIn=false,sending=false,completed=false,photoRevision=0;
const generation=()=>service?Promise.resolve(service):serviceLoading||(serviceLoading=import('./app-mood-generation.js?filmOptics=2&v=20261012-photo-layout1&hongKongRefs=4&dreamcore=7&syntheticRefs=1&raveIdentity=1&filmRevision=4&hkContinuity=4&hkScene=5&hkCinematography=1&midnightFlashV2=1&moodLock=20261014-mood-consistency1&quoteUX=20261016v1&firstRatio=20261016v2&photobooth1k=20261018v1&dreamBlurNotes=20261018v1&refOnlyDreamBlurFix=20261018v1&hkVariants=20261018-real1&hkRestore=20261018v1&hkFidelity=20261018v2&hkAtmosphere=20261019v1&hkCanon=20261020v1&hkImage3=20261020v1&hkLight=20261021v10&fisheye=20261020v1&dreamBlurBase=20261024v1&fisheyeY2K=20261024v1&eightiesTape=20261024v1').then(({createAppMoodGeneration})=>service=createAppMoodGeneration()));
function resetPrice(){revision++;clearTimeout(timer);clearTimeout(expiry);service?.cancel();quote=null;needsSignIn=false;button.disabled=true;button.textContent='Generate';button.removeAttribute('aria-busy');}
function clearPhoto(){photoRevision++;if(photoURL)URL.revokeObjectURL(photoURL);photoURL='';file=null;$('photo-preview').removeAttribute('src');$('photo-preview').hidden=true;$('photo-change').hidden=true;$('remove-photo').hidden=true;$('photo-input').value='';resetPrice();}
function lockControls(value){$('photo-input').disabled=value;$('remove-photo').disabled=value;$('detail-direction').disabled=value;$('close-detail').disabled=value;$('back-detail').disabled=value;}
function openMood(mood,target){selected=mood;opener=target;completed=false;detail.dataset.mood=mood.id;$('disclosure').hidden=false;clearPhoto();lockControls(false);$('detail-direction').value='';$('photo-error').textContent='';$('detail-title').textContent=mood.name;$('detail-image').src=moodPreviewURL(mood,{detail:true});$('detail-image').onerror=()=>{$('detail-image').onerror=null;$('detail-image').src=mood.preview;};detail.showModal();detail.focus({preventScroll:true});detail.scrollTop=0;}
function close(){if(!sending)detail.close();}
$('close-detail').onclick=close;$('back-detail').onclick=close;
detail.addEventListener('cancel',event=>{if(sending)event.preventDefault();});
detail.addEventListener('close',()=>{clearPhoto();opener?.focus({preventScroll:true});});
async function prepare(){
  if(!file||sending||completed)return;
  resetPrice();const stamp=revision;button.disabled=true;button.textContent='Generate';button.setAttribute('aria-busy','true');$('photo-error').textContent='';
  try{const client=await generation();if(stamp!==revision)return;const ready=await client.prepare(file,selected,$('detail-direction').value.trim());if(stamp!==revision)return;quote=ready;button.textContent='Generate · '+quote.label;button.disabled=false;button.removeAttribute('aria-busy');expiry=setTimeout(()=>{if(stamp===revision&&!sending&&!completed)void prepare();},Math.max(0,quote.expiresAt-Date.now()-20000));}
  catch(error){if(stamp!==revision)return;needsSignIn=error.code==='SIGN_IN';$('photo-error').textContent=error.message;button.textContent=needsSignIn?'Sign in to generate':'Retry price';button.disabled=false;button.removeAttribute('aria-busy');}
}
async function choose(next){
 if(!next||sending)return;
 clearPhoto();completed=false;lockControls(false);$('disclosure').hidden=false;
 const stamp=photoRevision;button.disabled=true;$('photo-error').textContent='Opening photo…';
 try{
  const prepared=await preparePhotoInput(next);if(stamp!==photoRevision||!detail.open)return;
  file=prepared;photoURL=URL.createObjectURL(file);$('photo-preview').src=photoURL;
  $('photo-preview').hidden=false;$('photo-change').hidden=false;$('remove-photo').hidden=false;
  await prepare();
 }catch(error){if(stamp!==photoRevision)return;$('photo-error').textContent=error.message;$('photo-input').value='';button.disabled=true;}
}
$('photo-input').onchange=event=>void choose(event.target.files[0]);
$('remove-photo').onclick=()=>{clearPhoto();$('photo-error').textContent='';};
$('detail-direction').oninput=()=>{if(sending||completed)return;resetPrice();if(file){button.disabled=true;button.setAttribute('aria-busy','true');timer=setTimeout(()=>void prepare(),180);}};
for(const name of ['dragover','drop'])$('photo-picker').addEventListener(name,event=>{event.preventDefault();if(name==='drop')void choose(event.dataTransfer.files[0]);});
$('deck-form').onsubmit=async event=>{
  event.preventDefault();if(sending||completed||!file)return;
  if(needsSignIn){try{const client=await generation();if(await client.signIn())await prepare();}catch(error){$('photo-error').textContent=error.message;}return;}
  if(!quote||Date.now()>=quote.expiresAt){await prepare();return;}
  sending=true;$('disclosure').hidden=true;clearTimeout(expiry);button.disabled=true;lockControls(true);button.textContent='Generating…';$('photo-error').textContent='';
  try{const response=await quote.submit();if(!response.job?.id)throw Error('The request was not confirmed. Check Gallery before trying again.');completed=true;button.textContent='Sent to Gallery';$('photo-error').textContent=['failed','uncertain','resolved'].includes(response.job.status)?(response.job.error||'Check this request in Gallery before trying again.'):'Your image is generating.';}
  catch(error){completed=true;button.textContent='Check Gallery';$('photo-error').textContent=error.message+' Check Gallery before starting another request.';}
  finally{sending=false;$('close-detail').disabled=false;$('back-detail').disabled=false;}
};
try{
 const order=['dreamcore','dream-blur','midnight-reverie','90s-cinema','synthetic-romance'];
 const moods=[...MOODS].sort((a,b)=>(order.includes(a.id)?order.indexOf(a.id):100)-(order.includes(b.id)?order.indexOf(b.id):100));
 $('count').textContent=moods.length+' LOOKS';
 for(const mood of moods){const card=document.createElement('button');card.className='mood-card';card.dataset.mood=mood.id;card.setAttribute('aria-label','Explore '+mood.name);const frame=document.createElement('span');frame.className='card-image';const img=document.createElement('img');img.src=moodPreviewURL(mood);img.onerror=()=>{img.onerror=null;img.src=mood.preview;};img.alt='';img.loading=$('mood-grid').children.length<4?'eager':'lazy';img.decoding='async';img.width=420;img.height=560;frame.append(img);const copy=document.createElement('span');copy.className='card-copy';const name=document.createElement('span');name.className='card-name';name.textContent=mood.name;const action=document.createElement('span');action.className='card-action';action.innerHTML='Try this look <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18m-6-6 6 6-6 6"/></svg>';copy.append(name,action);card.append(frame,copy);card.onclick=()=>openMood(mood,card);$('mood-grid').append(card);}
 window.ReactNativeWebView?.postMessage(JSON.stringify({type:'PV_LAB_READY'}));
}catch{$('load-error').hidden=false;}
