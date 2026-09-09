// Shared, testable data and transport. No Anam or microphone code belongs here.
export const SITE_ORIGIN = 'https://parallelvisionlabel.com';
export const ACCOUNT_ORIGIN = 'https://parallel-vision-anam-token.parallelvision.workers.dev';
export const SITE_REVISION = 'SITE COHESION / 05.2';
export const projects = [
  {id:'city', title:'THE CITY', copy:'Berlin as remembered, rebuilt and imagined.', path:'/berlin-2063.html', image:'city'},
  {id:'fashion', title:'FASHION AFTER FABRIC', copy:'Bodies, material and identity beyond conventional clothing.', path:'/future-fashion.html', image:'fashion'},
  {id:'transmissions', title:'MOVING TRANSMISSIONS', copy:'Films and fragments from Berlin 2063.', path:'/moving-transmissions.html', image:null},
];
export const releases = [
  {id:'stay-low',title:'STAY LOW',artist:'MOLINARI × NINA FOK',url:'https://soundcloud.com/parallelvisionlabel/stay-low',playlist:false},
  {id:'tanzen',title:'TANZEN IM KREIS',artist:'ALEJANDRO MOLINARI',url:'https://soundcloud.com/parallelvisionlabel/sets/alejandro-molinari-tanzen-im',playlist:true},
  {id:'dark-rock',title:'DARK ROCK EP',artist:'BLEX',url:'https://soundcloud.com/parallelvisionlabel/sets/dark-rock-ep',playlist:true},
  {id:'built',title:'BUILT TO LAST EP',artist:'REFRAKT',url:'https://soundcloud.com/parallelvisionlabel/sets/refrakt-ny-built-to-last-matt',playlist:true},
];
export const accountSections = [
  {id:'profile',title:'Profile'}, {id:'credits',title:'Signal Credits'},
  {id:'redeem',title:'Redeem code'}, {id:'billing',title:'Billing'},
  {id:'memory',title:'Memory'}, {id:'newsletter',title:'Newsletter'},
  {id:'referral',title:'Refer a friend'},
];
export function trustedProjectURL(value) {
  try {const u=new URL(value,SITE_ORIGIN);return u.protocol==='https:'&&u.origin===SITE_ORIGIN&&!u.username&&!u.password?u.href:null;}catch{return null;}
}
export function soundCloudEmbed(release) {
  if (!releases.some(item=>item.url===release?.url)) throw new Error('Unknown release');
  return 'https://w.soundcloud.com/player/?url='+encodeURIComponent(release.url)+'&color=%23222222&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false';
}
export function formatTime(seconds) {
  if(!Number.isFinite(Number(seconds)))return 'Unavailable';
  const s=Math.max(0,Math.floor(Number(seconds)));return `${Math.floor(s/60)} min ${s%60?`${s%60} sec`:''}`.trim();
}
export function formatDate(value) {if(!value)return '';const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleDateString();}
const allowed = {
 '/api/account':['GET'], '/api/account/profile':['PUT'], '/api/account/preferences':['PUT'],
 '/api/nina/credits':['GET'], '/api/nina/credits/history?limit=8':['GET'],
 '/api/nina/credits/redeem':['POST'], '/api/account/billing?limit=12':['GET'], '/memory':['DELETE'],
};
export async function accountRequest(getToken,path,{method='GET',body}={},fetcher=fetch,timeoutMs=12000) {
  if(!allowed[path]?.includes(method))throw new Error('Unsupported account action');
  let timer;
  const controller=new AbortController();
  try {
    return await Promise.race([
      (async()=>{
        for(let attempt=0;attempt<2;attempt++){
          const token=await getToken({skipCache:attempt===1});
          if(!token)throw new Error('Sign in again to manage your account.');
          if(controller.signal.aborted)throw new Error('Account request timed out.');
          const response=await fetcher(ACCOUNT_ORIGIN+path,{method,signal:controller.signal,redirect:'error',headers:{Authorization:`Bearer ${token}`,Origin:SITE_ORIGIN,Accept:'application/json','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
          if(response.status===401&&attempt===0)continue;
          const data=await response.json().catch(()=>({}));
          if(!response.ok)throw new Error(typeof data.error==='string'?data.error:'Account request failed. Please try again.');
          return data;
        }
        throw new Error('Sign in again to manage your account.');
      })(),
      new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('The account request timed out. Please try again.'));},timeoutMs);}),
    ]);
  } finally {clearTimeout(timer);}
}
