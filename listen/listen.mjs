import {createMeasurementTransport} from './measurement-transport.mjs?v=20261030-reliable1';
import {API,SLUG,metaDetails,newId} from '../links/shared.mjs?v=20261103-workspace1';
import {renderRelease} from '../links/release-view.mjs?v=20261103-workspace1';
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
const viewId=newId();
const openedAt=Date.now(),measurement=createMeasurementTransport({onFailure:reason=>console.warn('Music measurement delivery failed:',reason)});
window.addEventListener?.('pagehide',()=>measurement.flush());
function measure(event,service=''){
  const campaign=(params.get('utm_campaign')||'').replace(/[^\p{L}\p{N} _.()\-]/gu,'').slice(0,64);
  const tag=name=>(params.get(name)||'').replace(/[^\p{L}\p{N} _.()\-]/gu,'').slice(0,64);
  const data={id:event==='view'?viewId:newId(),viewId,releaseId:release.id,event,service,source:source(),campaign,medium:tag('utm_medium'),content:tag('utm_content'),term:tag('utm_term'),seconds:Math.min(86400,Math.floor((Date.now()-openedAt)/1000))};
  void measurement.send(API+'/api/music/public/events',data);
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
  let previewPlayed=false;const render=()=>{renderRelease(root,release,{onClick:clicked,onPresave:()=>measure('presave')});root.querySelector?.('audio')?.addEventListener('play',()=>{if(!previewPlayed){previewPlayed=true;measure('preview');}},{once:true});};render();measure('view');
  const switchIn=Date.parse((release.releaseDate||'')+'T00:00:00Z')-Date.now();
  if(release.presave?.mode==='before-release'&&switchIn>0&&switchIn<2147483000)setTimeout(render,switchIn+500);
  bootMeta();
}catch(error){
  root.className='release-error';root.replaceChildren();const title=document.createElement('h1');title.textContent='Release unavailable.';
  const message=document.createElement('p');message.textContent=error.message||'Please try again shortly.';
  const link=document.createElement('a');link.href='/';link.textContent='Visit Parallel Vision';root.append(title,message,link);
}
