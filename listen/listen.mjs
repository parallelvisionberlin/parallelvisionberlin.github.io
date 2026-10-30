import {API,SLUG,metaDetails,newId} from '../links/shared.mjs';
import {renderRelease} from '../links/release-view.mjs?v=20261030-refined1';
const root=document.getElementById('release'),params=new URLSearchParams(location.search);
const slug=params.get('release')||'',consentKey='pv-music-meta-consent-v1';
let release=null,tracking=null,initialized=false,choice='default';
try{const stored=localStorage.getItem(consentKey);if(stored==='granted'||stored==='denied')choice=stored;}catch{}
function bootMeta(){
  if(choice==='denied'||initialized||!/^\d{8,20}$/.test(tracking?.pixelId||''))return;
  initialized=true;
  if(!window.fbq){const fbq=window.fbq=function(){fbq.callMethod?fbq.callMethod.apply(fbq,arguments):fbq.queue.push(arguments);};window._fbq=fbq;fbq.push=fbq;fbq.loaded=true;fbq.version='2.0';fbq.queue=[];
    const script=document.createElement('script');script.async=true;script.src='https://connect.facebook.net/en_US/fbevents.js';document.head.append(script);}
  if(choice==='granted')window.fbq('consent','grant');
  window.fbq('init',tracking.pixelId);
  window.fbq('trackSingle',tracking.pixelId,'PageView');window.fbq('trackSingle',tracking.pixelId,'ViewContent',metaDetails(release));
}
function setConsent(next){
  const previous=choice;choice=next;try{localStorage.setItem(consentKey,next);}catch{}
  document.getElementById('meta-consent').hidden=true;
  if(next==='granted'){
    if(initialized&&previous!=='granted')window.fbq?.('consent','grant');else bootMeta();
  }else if(initialized)window.fbq?.('consent','revoke');
}
document.querySelectorAll('[data-consent]').forEach(button=>button.addEventListener('click',()=>setConsent(button.dataset.consent)));
document.getElementById('privacy-choices').addEventListener('click',()=>{document.getElementById('meta-consent').hidden=false;});
function source(){
  const utm=(params.get('utm_source')||'').toLowerCase();
  if(params.has('fbclid')||/^(meta|fb|ig|facebook|instagram)$/.test(utm))return utm==='instagram'||utm==='ig'?'instagram':utm==='facebook'||utm==='fb'?'facebook':'meta';
  if(['google','youtube','soundcloud','email'].includes(utm))return utm;
  if(utm)return 'other';
  let host;try{host=new URL(document.referrer).hostname;}catch{return 'direct';}
  for(const name of ['instagram','facebook','google','youtube','soundcloud'])if(host===name+'.com'||host.endsWith('.'+name+'.com'))return name;
  return host===location.hostname?'direct':'other';
}
function measure(event,service=''){
  const campaign=(params.get('utm_campaign')||'').replace(/[^\p{L}\p{N} _.()\-]/gu,'').slice(0,64);
  const data={id:newId(),releaseId:release.id,event,service,source:source(),campaign};
  const payload=JSON.stringify(data),url=API+'/api/music/public/events';
  if(!navigator.sendBeacon?.(url,new Blob([payload],{type:'text/plain;charset=UTF-8'})))fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:payload,keepalive:true,credentials:'omit'}).catch(()=>{});
}
function clicked(service){
  measure('click',service);
  if(choice!=='denied'&&initialized)window.fbq('trackSingleCustom',tracking.pixelId,tracking.clickEvent,metaDetails(release,service),{eventID:newId()});
}
try{
  if(slug.length>80||!SLUG.test(slug))throw Error('Choose a release link to listen.');
  const response=await fetch(API+'/api/music/public/releases/'+encodeURIComponent(slug),{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(15000)});
  const data=await response.json();if(!response.ok)throw Error(data.error||'This release is not available.');
  release=data.release;tracking=data.tracking;
  document.title=release.artist+' / '+release.title+' / Parallel Vision';
  document.querySelector('meta[name="description"]').content='Listen to '+release.title+' by '+release.artist+'. Parallel Vision.';
  document.querySelector('link[rel="canonical"]').href=release.url;
  renderRelease(root,release,{onClick:clicked});measure('view');
  bootMeta();
}catch(error){
  root.className='release-error';root.replaceChildren();const title=document.createElement('h1');title.textContent='Release unavailable.';
  const message=document.createElement('p');message.textContent=error.message||'Please try again shortly.';
  const link=document.createElement('a');link.href='/';link.textContent='Visit Parallel Vision';root.append(title,message,link);
}
