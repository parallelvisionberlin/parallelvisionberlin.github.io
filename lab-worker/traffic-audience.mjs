// Independent daily aggregates, never visitor profiles or combinations of attributes.
export const AUDIENCE_DIMENSIONS=Object.freeze(['country','region','city','device','browser','os','language','hour']);
const UNKNOWN='unknown';
function place(value){
  if(typeof value!=='string')return '';
  const text=value.normalize('NFC').trim().replace(/\s+/g,' ');
  return text.length<=80&&/^[\p{L}\p{M}\p{N} .,'’()\-]+$/u.test(text)?text:'';
}
export function trafficAudience(request,time){
  // Only Cloudflare's request metadata is authoritative for geography. Never accept
  // client-supplied location headers/body, nor retain IPs or exact coordinates.
  const cf=request.cf||{},country=/^[A-Z]{2}$/.test(cf.country||'')&&!['XX','T1'].includes(cf.country)?cf.country:UNKNOWN;
  const region=country!==UNKNOWN?place(cf.region):'',city=country!==UNKNOWN?place(cf.city):'';
  const ua=(request.headers.get('user-agent')||'').slice(0,512);
  const os=/Android/i.test(ua)?'android':/iPad|iPhone|iPod/i.test(ua)?'ios':/CrOS/i.test(ua)?'chromeos':/Windows/i.test(ua)?'windows':/Macintosh|Mac OS X/i.test(ua)?'macos':/Linux/i.test(ua)?'linux':UNKNOWN;
  const device=/iPad|Tablet/i.test(ua)||(/Android/i.test(ua)&&!/Mobile/i.test(ua))?'tablet':/Mobile|iPhone|iPod/i.test(ua)?'mobile':os!==UNKNOWN?'desktop':UNKNOWN;
  const browser=/Instagram/i.test(ua)?'instagram':/FBAN|FBAV/i.test(ua)?'facebook':/Edg(?:e|A|iOS)?\//i.test(ua)?'edge':/SamsungBrowser\//i.test(ua)?'samsung':/OPR\/|Opera/i.test(ua)?'opera':/Firefox\/|FxiOS\//i.test(ua)?'firefox':/Chrome\/|CriOS\//i.test(ua)?'chrome':/Safari\//i.test(ua)?'safari':UNKNOWN;
  const preferred=(request.headers.get('accept-language')||'').slice(0,128).split(',')[0].split(';')[0].trim();
  const language=/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(preferred)?preferred.split('-')[0].toLowerCase():UNKNOWN;
  return {country,region:region?`${region}, ${country}`:UNKNOWN,
    city:city?[city,region,country].filter(Boolean).join(', '):UNKNOWN,
    device,browser,os,language,hour:String(new Date(time).getUTCHours()).padStart(2,'0')};
}
export function audienceStatements(env,request,time,day,entry){
  return Object.entries(trafficAudience(request,time)).map(([dimension,value])=>
    env.LAB_DB.prepare('INSERT INTO lab_traffic_audience_daily(day_utc,dimension,value,page_views,entrances) VALUES(?,?,?,1,?) ON CONFLICT(day_utc,dimension,value) DO UPDATE SET page_views=page_views+1,entrances=entrances+excluded.entrances')
      .bind(day,dimension,value,entry?1:0));
}
export async function trafficAudienceReport(env,from,to){
  const [{results},first]=await Promise.all([
    env.LAB_DB.prepare(`WITH grouped AS (
      SELECT dimension,value,SUM(page_views) AS views,SUM(entrances) AS entrances
      FROM lab_traffic_audience_daily WHERE day_utc BETWEEN ? AND ? GROUP BY dimension,value
    ), ranked AS (
      SELECT *,SUM(views) OVER(PARTITION BY dimension) AS total_views,
        SUM(entrances) OVER(PARTITION BY dimension) AS total_entrances,
        ROW_NUMBER() OVER(PARTITION BY dimension ORDER BY entrances DESC,views DESC,value ASC) AS rank,
        ROW_NUMBER() OVER(PARTITION BY dimension ORDER BY views DESC,entrances DESC,value ASC) AS view_rank
      FROM grouped
    ) SELECT * FROM ranked WHERE rank<=50 OR view_rank<=50 ORDER BY dimension,rank`).bind(from,to).all(),
    env.LAB_DB.prepare('SELECT MIN(day_utc) AS firstDay FROM lab_traffic_audience_daily').bind().first()
  ]);
  const dimensions=Object.fromEntries(AUDIENCE_DIMENSIONS.map(key=>[key,{items:[],totalViews:0,totalEntrances:0}]));
  for(const row of results||[]){
    const group=dimensions[row.dimension];if(!group)continue;
    group.totalViews=Number(row.total_views)||0;group.totalEntrances=Number(row.total_entrances)||0;
    group.items.push({value:row.value,views:Number(row.views)||0,entrances:Number(row.entrances)||0});
  }
  return {firstTrackedDay:first?.firstDay||null,dimensions,age:{available:false,reason:'Age is not collected. Traffic cannot establish a visitor’s age.'}};
}
