// First-party, cookie-free PV LAB traffic counts. No visitor/session IDs are created.
// We send only a page category, coarse source category and approximate entry flag.
const API='https://parallel-vision-lab.parallelvision.workers.dev/api/public/traffic';
const OWN_HOSTS=new Set(['parallelvisionlabel.com','www.parallelvisionlabel.com','pvlab.studio','www.pvlab.studio']);
function pageCategory(path){
  const part=path.replace(/\/+$/,'').split('/').pop()?.toLowerCase()||'';
  if(!part||part==='lab'||part==='index.html')return 'home';
  if(part==='studio.html')return 'studio';
  if(part==='moods.html')return 'moods';
  if(part==='mood-creator.html')return 'mood-creator';
  if(part==='fashion.html')return 'fashion';
  if(part==='account.html')return 'account';
  return 'other';
}
function labelSource(name){
  const text=String(name||'').toLowerCase().trim();
  if(!text)return '';
  if(text.includes('reddit')||text==='redd.it')return 'reddit';
  if(text==='ig'||text.includes('instagram'))return 'instagram';
  if(text.includes('tiktok'))return 'tiktok';
  if(text.includes('facebook')||text==='fb'||text==='meta')return 'facebook';
  if(text.includes('youtube')||text==='youtu.be')return 'youtube';
  if(text.includes('google'))return 'google';
  if(/^(?:bing|duckduckgo|search|yahoo|ecosia)$/.test(text))return 'search';
  if(/^(?:email|newsletter|mail)$/.test(text))return 'newsletter';
  if(/^(?:parallelvision|parallel-vision|parallelvisionlabel)$/.test(text))return 'parallel-vision';
  return 'other';
}
function navigationSource(){
  let ref=null;
  try{if(document.referrer)ref=new URL(document.referrer);}catch{}
  const host=ref?.hostname?.toLowerCase()||'';
  const own=OWN_HOSTS.has(host);
  // Every public page load counts as a view; internal clicks and reloads are not new site entries.
  const nav=performance.getEntriesByType?.('navigation')?.[0];
  const reload=nav?.type==='reload';
  const internal=own&&(host.endsWith('pvlab.studio')||ref.pathname==='/lab'||ref.pathname.startsWith('/lab/'));
  if(reload||internal)return {source:'internal',entry:false};
  const params=new URLSearchParams(location.search),utm=params.get('utm_source');
  if(utm)return {source:labelSource(utm),entry:true};
  if(!ref)return {source:'direct',entry:true};
  if(own)return {source:'parallel-vision',entry:true};
  if(host==='redd.it'||host.endsWith('.redd.it')||host==='reddit.com'||host.endsWith('.reddit.com'))return {source:'reddit',entry:true};
  if(host==='instagram.com'||host.endsWith('.instagram.com'))return {source:'instagram',entry:true};
  if(host==='tiktok.com'||host.endsWith('.tiktok.com'))return {source:'tiktok',entry:true};
  if(host==='facebook.com'||host.endsWith('.facebook.com')||host==='fb.com'||host.endsWith('.fb.com'))return {source:'facebook',entry:true};
  if(host==='youtube.com'||host.endsWith('.youtube.com')||host==='youtu.be')return {source:'youtube',entry:true};
  if(host==='google.com'||host.startsWith('google.')||host.includes('.google.'))return {source:'google',entry:true};
  if(host==='bing.com'||host.endsWith('.bing.com')||host==='duckduckgo.com'||host.endsWith('.duckduckgo.com')||host==='ecosia.org'||host.endsWith('.ecosia.org'))return {source:'search',entry:true};
  return {source:'other',entry:true};
}
let sent=false;
function measure(){
  if(sent||document.visibilityState==='hidden'||navigator.webdriver===true||
     navigator.globalPrivacyControl===true||navigator.doNotTrack==='1')return;
  sent=true;
  const event={page:pageCategory(location.pathname),...navigationSource()};
  // No cookies, referrer URL, IP, account ID, device identifier or raw UTM values in the payload.
  try{
    void fetch(API,{
      method:'POST',mode:'cors',credentials:'omit',cache:'no-store',keepalive:true,
      referrerPolicy:'no-referrer',
      headers:{'Content-Type':'text/plain;charset=UTF-8'},
      body:JSON.stringify(event)
    }).catch(()=>{});
  }catch{ /* Analytics cannot block the site or its creative tools. */ }
}
if(document.visibilityState==='hidden')document.addEventListener('visibilitychange',measure);
else measure();
