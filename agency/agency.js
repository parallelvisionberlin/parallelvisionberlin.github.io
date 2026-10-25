// Public, account-free agency enquiries. No form data is stored in the browser or analytics.
const API='https://parallel-vision-lab.parallelvision.workers.dev';
const EVENTS=new Set(['page_view','contact_click','form_start','film_play','homepage_click']);
export function agencySource(){
  const allowed=new Set(['direct','parallel-vision','instagram','pinterest','linkedin','google','other']);
  const declared=new URL(location.href).searchParams.get('from');
  if(allowed.has(declared))return declared;
  try{const host=new URL(document.referrer).hostname;
    if(/(^|\.)parallelvisionlabel\.com$/.test(host))return 'parallel-vision';
    for(const name of ['instagram','pinterest','linkedin','google'])if(host===name+'.com'||host.endsWith('.'+name+'.com')||(name==='google'&&host.startsWith('www.google.')))return name;
    return 'other';
  }catch{return 'direct';}
}
export function agencyEvent(event){
  if(!EVENTS.has(event)||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true)return;
  try{navigator.sendBeacon(API+'/api/public/agency/events',JSON.stringify({event,source:agencySource()}));}catch{}
}
const form=document.getElementById('project-brief');
if(form){
  agencyEvent('page_view');
  const button=form.querySelector('button[type="submit"]'),status=document.getElementById('brief-status');
  let busy=false,lastPayload='',receipt='',started=false;
  button.disabled=false;
  form.addEventListener('focusin',()=>{if(!started){started=true;agencyEvent('form_start');}});
  document.querySelectorAll('a[href="#contact"],.contact-email').forEach(link=>link.addEventListener('click',()=>agencyEvent('contact_click')));
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!form.reportValidity())return;
    const data=Object.fromEntries(new FormData(form));
    data.source=agencySource();const signature=JSON.stringify(data);
    if(signature!==lastPayload||!receipt){receipt=crypto.randomUUID();lastPayload=signature;}
    data.id=receipt;
    busy=true;button.disabled=true;button.textContent='Sending…';form.setAttribute('aria-busy','true');
    status.textContent='Sending your brief securely…';status.dataset.state='pending';
    try{
      const response=await fetch(API+'/api/public/agency/enquiries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),credentials:'omit',signal:AbortSignal.timeout(20000)});
      const result=await response.json().catch(()=>({}));
      if(!response.ok||result.ok!==true||result.id!==receipt)throw Error(result.error||'We could not confirm reception. Your brief is still here. Try again or use the email link.');
      status.textContent='Your brief has been received. We will reply to the email you provided. Reference: '+receipt.slice(0,8).toUpperCase()+'.';
      status.dataset.state='success';form.reset();lastPayload='';receipt='';
    }catch(error){
      status.textContent=error.name==='TimeoutError'?'We could not confirm reception yet. Your brief is still here. Try again with the same details or use the email link.':error.message;
      status.dataset.state='error';
    }finally{
      busy=false;button.disabled=false;button.textContent='Send project brief ↗';form.removeAttribute('aria-busy');status.focus({preventScroll:true});
    }
  });
}
document.querySelectorAll('[data-agency-home-link]').forEach(link=>link.addEventListener('click',()=>agencyEvent('homepage_click')));
document.querySelectorAll('video[data-agency-film],#studio-film').forEach(video=>video.addEventListener('playing',()=>agencyEvent('film_play'),{once:true}));
for(const button of document.querySelectorAll('[data-film-play]')){
  button.hidden=false;
  button.addEventListener('click',async()=>{
    const video=document.getElementById(button.dataset.filmPlay),note=button.closest('figure').querySelector('[role="status"]');
    if(!video)return;button.disabled=true;note.textContent='';
    if(!video.src)video.src=matchMedia('(max-width:760px)').matches?video.dataset.mobile:video.dataset.desktop;
    video.controls=true;
    try{await video.play();button.hidden=true;}catch{note.textContent='The film could not start. Open the project below to watch it.';}
    finally{button.disabled=false;}
  });
}
const youtube=document.querySelector('[data-youtube-play]');
if(youtube){youtube.hidden=false;youtube.addEventListener('click',()=>{
  const iframe=document.createElement('iframe');
  iframe.src='https://www.youtube-nocookie.com/embed/T4bKnLgdLjQ?autoplay=1&rel=0';
  iframe.title='Tanzen Im Kreis (Cabizbajo Remix), Berlin 2063';iframe.allow='autoplay; encrypted-media; picture-in-picture';iframe.allowFullscreen=true;
  iframe.referrerPolicy='strict-origin-when-cross-origin';
  youtube.closest('.motion-frame').replaceChildren(iframe);agencyEvent('film_play');
});}
document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('video[data-agency-film]').forEach(video=>video.pause());});
