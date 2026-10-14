// Cookie-free, aggregate-only visitor measurement for PV LAB public pages.
// No IP, device fingerprint, full URL/referrer, session token or identity is recorded.
import {BROWSER_ORIGINS} from './clerk-issuer-policy.mjs';

export const TRAFFIC_PAGES=Object.freeze([
  'home','studio','moods','mood-creator','fashion','account','other'
]);
export const TRAFFIC_SOURCES=Object.freeze([
  'reddit','instagram','tiktok','facebook','youtube','google','search','newsletter',
  'parallel-vision','direct','other','internal'
]);
const pages=new Set(TRAFFIC_PAGES),sources=new Set(TRAFFIC_SOURCES);
const DAY_MS=86400000;
const readRows=async(env,sql,...args)=>(await env.LAB_DB.prepare(sql).bind(...args).all()).results;
const readOne=(env,sql,...args)=>env.LAB_DB.prepare(sql).bind(...args).first();
const utcDay=time=>new Date(time).toISOString().slice(0,10);
const response=(status=204)=>new Response(null,{
  status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
});
function reject(status,message) {
  const error=new Error(message);
  error.status=status;
  throw error;
}
export async function recordLabTraffic(request,env,{clock=()=>Date.now()}={}){
  if(request.method!=='POST')reject(405,'Unsupported traffic method.');
  const origin=request.headers.get('origin')||'';
  if(!BROWSER_ORIGINS.has(origin))reject(403,'Browser origin required.');
  if(!/^text\/plain(?:\s*;|$)/i.test(request.headers.get('content-type')||''))reject(415,'Unsupported traffic content type.');
  if(Number(request.headers.get('content-length')||0)>320)reject(413,'Traffic event too large.');
  const raw=await request.text();
  if(raw.length>320)reject(413,'Traffic event too large.');
  let data;
  try{data=JSON.parse(raw);}catch{reject(400,'Invalid traffic event.');}
  if(!data||typeof data!=='object'||Array.isArray(data)||
     !pages.has(data.page)||!sources.has(data.source)||typeof data.entry!=='boolean')
    reject(400,'Invalid traffic event.');
  if((data.entry&&data.source==='internal')||(!data.entry&&data.source!=='internal'))
    reject(400,'Invalid traffic source for this navigation.');
  // Ignore common crawlers and platform link previews. This is not bot-proof.
  const ua=(request.headers.get('user-agent')||'').slice(0,200);
  if(/(?:bot\b|crawler|spider|slurp|preview|facebookexternalhit|headless|curl|wget)/i.test(ua) ||
     request.cf?.botManagement?.verifiedBot===true)return response();
  const time=Number(clock());
  if(!Number.isSafeInteger(time)||time<0)reject(500,'Traffic clock unavailable.');
  const day=utcDay(time);
  await env.LAB_DB.prepare('INSERT INTO lab_traffic_daily(day_utc,page,source,page_views,entrances) VALUES(?,?,?,1,?) ON CONFLICT(day_utc,page,source) DO UPDATE SET page_views=page_views+1,entrances=entrances+excluded.entrances')
    .bind(day,data.page,data.source,data.entry?1:0).run();
  return response();
}
export async function labTrafficReport(env,{days=7,clock=()=>Date.now()}={}){
  if(days!==7&&days!==30)reject(400,'Choose 7 or 30 days.');
  const current=Number(clock()),today=utcDay(current);
  const beginning=utcDay(Date.parse(today+'T00:00:00Z')-(days-1)*DAY_MS);
  const [records,first,accounts]=await Promise.all([
    readRows(env,'SELECT day_utc AS day,page,source,page_views AS views,entrances FROM lab_traffic_daily WHERE day_utc BETWEEN ? AND ? ORDER BY day_utc ASC,page ASC,source ASC',beginning,today),
    readOne(env,'SELECT MIN(day_utc) AS firstDay FROM lab_traffic_daily'),
    readOne(env,'SELECT COUNT(*) AS n FROM lab_customers WHERE created_at>=? AND created_at<?',
      Date.parse(beginning+'T00:00:00Z'),Date.parse(today+'T00:00:00Z')+DAY_MS)
  ]);
  const trends=[],byDate=new Map(),bySource=new Map(),byPage=new Map();
  const start=Date.parse(beginning+'T00:00:00Z');
  for(let offset=0;offset<days;offset++){
    const day=utcDay(start+offset*DAY_MS),row={date:day,entrances:0,views:0,reddit:0};
    trends.push(row);byDate.set(day,row);
  }
  let entrances=0,views=0,reddit=0;
  for(const record of records){
    const countViews=Number(record.views)||0,countEntries=Number(record.entrances)||0;
    views+=countViews;entrances+=countEntries;
    const day=byDate.get(record.day);
    if(day){
      day.views+=countViews;day.entrances+=countEntries;
      if(record.source==='reddit'){day.reddit+=countEntries;reddit+=countEntries;}
    }
    if(record.source!=='internal')bySource.set(record.source,(bySource.get(record.source)||0)+countEntries);
    byPage.set(record.page,(byPage.get(record.page)||0)+countViews);
  }
  return {
    days,from:beginning,to:today,firstTrackedDay:first?.firstDay||null,
    measured:!!first?.firstDay,
    summary:{entrances,views,redditEntrances:reddit,newAccounts:Number(accounts?.n)||0},
    trend:trends,
    sources:[...bySource].map(([source,count])=>({source,count}))
      .sort((a,b)=>b.count-a.count||a.source.localeCompare(b.source)),
    pages:[...byPage].map(([page,count])=>({page,count}))
      .sort((a,b)=>b.count-a.count||a.page.localeCompare(b.page)),
    note:'Counts are observed page loads and estimated entrances, not unique people. No visitor identifiers, cookies or full referrers are stored. Measurement begins after launch.'
  };
}
export async function pruneLabTraffic(env,{clock=()=>Date.now()}={}){
  const cutoff=utcDay(Number(clock())-90*DAY_MS);
  await env.LAB_DB.prepare('DELETE FROM lab_traffic_daily WHERE day_utc<?').bind(cutoff).run();
}
