// Aggregate reporting only. No raw IP, full UA, fingerprint or exact coordinates retained.
const clean=(v,n=64)=>typeof v==='string'?v.replace(/[^\p{L}\p{N} _.()\-]/gu,'').trim().slice(0,n):'';
export function eventDimensions(request,data,time){
  const ua=(request.headers.get('user-agent')||'').slice(0,512),cf=request.cf||{};
  const device=/iPad|Tablet/i.test(ua)?'Tablet':/Mobile|iPhone|Android/i.test(ua)?'Mobile':ua?'Desktop':'Unknown';
  const browser=/Edg\//.test(ua)?'Edge':/OPR\//.test(ua)?'Opera':/Firefox|FxiOS/.test(ua)?'Firefox':/Chrome|CriOS/.test(ua)?'Chrome':/Safari/.test(ua)?'Safari':'Other';
  const os=/iPhone|iPad|iPod/.test(ua)?'iOS':/Android/.test(ua)?'Android':/Windows/.test(ua)?'Windows':/Mac OS/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':'Other';
  const seconds=data.seconds,delay=data.event==='click'&&Number.isFinite(seconds)&&seconds>=0?seconds<5?'Under 5s':seconds<15?'5–14s':seconds<30?'15–29s':seconds<60?'30–59s':'60s+':'';
  return [new Date(time).toISOString().slice(0,13),/^[A-Z]{2}$/.test(cf.country||'')?cf.country:'Unknown',clean(cf.region)||'Unknown',clean(cf.city)||'Unknown',device,browser,os,clean(data.medium),clean(data.content),clean(data.term),delay];
}
export async function analyticsReports(env,visible,bindings,start,hourStart=start){
  const totals="SUM(CASE WHEN event='view' THEN count ELSE 0 END) AS views,SUM(CASE WHEN event='click' THEN count ELSE 0 END) AS clicks,SUM(CASE WHEN event='preview' THEN count ELSE 0 END) AS previews";
  const reports={countries:'country',regions:'country,region',cities:'country,region,city',devices:'device',browsers:'browser',systems:'os',ads:'source,medium,campaign,content,term',hours:'hour_utc',delays:'delay_bucket'};
  const results=await Promise.all(Object.entries(reports).map(async([key,columns])=>{
    const extra=key==='delays'?" AND event='click' AND delay_bucket!=''":'';
    const order=key==='hours'?'hour_utc DESC':'views DESC,clicks DESC';
    const sql=`SELECT ${columns},${totals} FROM music_analytics_hourly WHERE release_id IN (${visible}) AND hour_utc>=?${extra} GROUP BY ${columns} ORDER BY ${order} LIMIT ${key==='hours'?2160:100}`;
    return [key,(await env.LAB_DB.prepare(sql).bind(...bindings,key==='hours'?hourStart:start).all()).results];
  }));
  const coverage=await env.LAB_DB.prepare(`SELECT ${totals},MIN(hour_utc) AS since FROM music_analytics_hourly WHERE release_id IN (${visible}) AND hour_utc>=?`).bind(...bindings,start).first();
  return {...Object.fromEntries(results),coverage};
}
