// Agency enquiries: private records, bounded first-party measurement, fixed-recipient notifications.
// Never touches credit balances, creative media, or customer/signup state.
export const AGENCY_REVISION='agency-public-20261025-v1';
const ORIGINS=new Set(['https://parallelvisionlabel.com','https://www.parallelvisionlabel.com']);
const SOURCES=new Set(['direct','parallel-vision','instagram','pinterest','linkedin','google','other']);
const EVENTS=new Set(['page_view','contact_click','form_start','film_play','homepage_click']);
const DIRECTIONS=new Set(['Fashion & Creative Direction','Film & Motion','Digital & Spatial Experiences','Web, commerce or campaigns','Music & sound','Something else']);
const BUDGETS=new Set(['','Under €2,500','€2,500 to €5,000','€5,000 to €15,000','€15,000+']);
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const EMAIL=/^[^\s@,;<>\x00-\x1f]{1,64}@[a-z0-9](?:[a-z0-9.-]{0,187}[a-z0-9])?\.[a-z]{2,}$/i;
const HOUR=3600000,DAY=24*HOUR;
const one=(env,sql,...args)=>env.LAB_DB.prepare(sql).bind(...args).first();
const run=(env,sql,...args)=>env.LAB_DB.prepare(sql).bind(...args).run();
const all=async(env,sql,...args)=>(await env.LAB_DB.prepare(sql).bind(...args).all()).results;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
function fail(status,message){throw Object.assign(new Error(message),{status});}
const dayOf=time=>new Date(time).toISOString().slice(0,10);
function clean(value,max,{required=false,multiline=false}={}){
  if(typeof value!=='string'||value.length>max||(!multiline&&/[\x00-\x1f]/.test(value))||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))fail(400,'Please check the project brief.');
  const result=value.trim();if(required&&!result)fail(400,'Please complete the required fields.');return result;
}
async function readBody(request,max,plain=false){
  const type=request.headers.get('content-type')||'';
  if(!(plain?/^text\/plain(?:\s*;|$)/i:/^application\/json(?:\s*;|$)/i).test(type))fail(415,'Unsupported request format.');
  if(Number(request.headers.get('content-length')||0)>max)fail(413,'The project brief is too long.');
  const reader=request.body?.getReader();if(!reader)fail(400,'A project brief is required.');
  const parts=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
    if(size>max){await reader.cancel();fail(413,'The project brief is too long.');}parts.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
  let data;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{fail(400,'Invalid request.');}
  if(!data||typeof data!=='object'||Array.isArray(data))fail(400,'Invalid request.');return data;
}
async function digest(env,value){
  if(!env.LAB_SECRET)fail(503,'The enquiry service is temporarily unavailable. Please use the email link.');
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.LAB_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('pv-agency-v1:'+value));
  return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
async function limit(env,key,maximum,expiresAt){
  const row=await one(env,'INSERT INTO agency_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<? RETURNING count',key,expiresAt,maximum);
  return !!row;
}
async function increment(env,time,event,source){
  await run(env,'INSERT INTO agency_daily(day,event,source,count) VALUES(?,?,?,1) ON CONFLICT(day,event,source) DO UPDATE SET count=count+1',dayOf(time),event,source);
}
export function validateAgencyBrief(data){
  if(!UUID.test(data.id||''))fail(400,'Please reload the form and try again.');
  if(data.website)fail(400,'Please try again without autofilling the hidden field.');
  const name=clean(data.name,120,{required:true}),email=clean(data.email,200,{required:true}).toLowerCase();
  if(!EMAIL.test(email))fail(400,'Please enter a valid email address.');
  const company=clean(data.company||'',160),message=clean(data.message,3000,{required:true,multiline:true});
  if(message.length<10)fail(400,'Please add a few words about the project.');
  if(!DIRECTIONS.has(data.direction)||!BUDGETS.has(data.budget||''))fail(400,'Please choose a project direction and budget.');
  return {id:data.id.toLowerCase(),name,email,company,direction:data.direction,budget:data.budget||'',message,source:SOURCES.has(data.source)?data.source:'other'};
}
export async function agencyPublicRoute(request,env,ctx,{clock=Date.now}={}){
  const path=new URL(request.url).pathname,time=clock();
  if(path==='/api/public/agency/status'&&request.method==='GET'){
    await one(env,'SELECT id FROM agency_enquiries LIMIT 1');
    return json({ready:!!env.LAB_SECRET,revision:AGENCY_REVISION});
  }
  if(!ORIGINS.has(request.headers.get('origin')||''))fail(403,'Please use the Parallel Vision website.');
  if(path==='/api/public/agency/events'&&request.method==='POST'){
    const data=await readBody(request,512,true);
    if(!EVENTS.has(data.event)||!SOURCES.has(data.source))fail(400,'Invalid event.');
    if(/bot\b|crawler|spider|preview|headless|curl|wget/i.test(request.headers.get('user-agent')||'')||request.cf?.botManagement?.verifiedBot)return new Response(null,{status:204});
    const ip=request.headers.get('cf-connecting-ip')||'unknown';
    const bucket=Math.floor(time/HOUR);
    const key='event:'+bucket+':'+await digest(env,bucket+':'+ip);
    if(await limit(env,key,60,(bucket+2)*HOUR))await increment(env,time,data.event,data.source);
    return new Response(null,{status:204});
  }
  if(path!=='/api/public/agency/enquiries'||request.method!=='POST')fail(404,'Unknown agency endpoint.');
  const data=validateAgencyBrief(await readBody(request,16000));
  // The digest binds the receipt to this exact brief, not just a client-generated UUID.
  const payloadDigest=await digest(env,JSON.stringify(data));
  const existing=await one(env,'SELECT digest FROM agency_enquiries WHERE id=?',data.id);
  if(existing){if(existing.digest!==payloadDigest)fail(409,'This receipt belongs to a different brief. Please retry.');return json({ok:true,id:data.id},200);}
  const bucket=Math.floor(time/HOUR),today=dayOf(time);
  const ipKey=await digest(env,bucket+':'+(request.headers.get('cf-connecting-ip')||'unknown'));
  const emailKey=await digest(env,today+':'+data.email);
  if(!await limit(env,'submit-ip:'+bucket+':'+ipKey,3,(bucket+2)*HOUR)||
     !await limit(env,'submit-email:'+today+':'+emailKey,3,time+2*DAY)||
     !await limit(env,'submit-day:'+today,60,time+2*DAY))fail(429,'Too many attempts. Please try later or use the email link.');
  const inserted=await one(env,'INSERT INTO agency_enquiries(id,digest,name,email,company,direction,budget,message,source,created_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING RETURNING id',data.id,payloadDigest,data.name,data.email,data.company,data.direction,data.budget,data.message,data.source,time);
  if(!inserted){const duplicate=await one(env,'SELECT digest FROM agency_enquiries WHERE id=?',data.id);if(duplicate?.digest!==payloadDigest)fail(409,'This receipt belongs to a different brief. Please retry.');}
  // Once the durable record exists, measurement or email failures must not turn it into a failed enquiry.
  if(inserted)await increment(env,time,'enquiry_received',data.source).catch(()=>{});
  if(ctx?.waitUntil)ctx.waitUntil(processAgencyNotifications(env).catch(()=>{}));
  return json({ok:true,id:data.id},inserted?201:200);
}
export function agencyNotification(row){
  return {from:'Parallel Vision Agency <hello@pvlab.studio>',to:['contact@parallelvisionlabel.com'],reply_to:row.email,
    subject:'Agency enquiry / '+row.direction,
    text:['NEW AGENCY ENQUIRY','',row.name,row.email,row.company||'',
      'Direction: '+row.direction,'Budget: '+(row.budget||'To discuss'),'Source: '+row.source,'',row.message,'',
      'Receipt: '+row.id,'Private inbox: https://parallelvisionlabel.com/agency/inbox.html',
      'Submitted through the Parallel Vision Agency project form.'].join('\n')};
}
export async function processAgencyNotifications(env,{clock=Date.now,fetcher=fetch}={}){
  if(!String(env.LAB_RESEND_API_KEY||'').startsWith('re_'))return {sent:0};
  const time=clock();let sent=0;
  // Stop uncertain retries before the provider's 24-hour idempotency window closes.
  await run(env,"UPDATE agency_enquiries SET mail_state='failed' WHERE mail_state IN ('pending','sending') AND (mail_attempts>=3 OR (first_attempt IS NOT NULL AND first_attempt<?))",time-20*HOUR);
  const queue=await all(env,"SELECT * FROM agency_enquiries WHERE (mail_state='pending' OR (mail_state='sending' AND last_attempt<?)) AND (last_attempt IS NULL OR last_attempt<?) AND mail_attempts<3 ORDER BY created_at LIMIT 3",time-15*60000,time-15*60000);
  for(const row of queue){
    // Reserve at most ten attempts per day; do not consume the welcome-email allowance.
    if(!await limit(env,'mail-day:'+dayOf(time),10,time+2*DAY))break;
    const claim=await one(env,"UPDATE agency_enquiries SET mail_state='sending',mail_attempts=mail_attempts+1,first_attempt=COALESCE(first_attempt,?),last_attempt=? WHERE id=? AND (mail_state='pending' OR (mail_state='sending' AND last_attempt<?)) AND (last_attempt IS NULL OR last_attempt<?) RETURNING id",time,time,row.id,time-15*60000,time-15*60000);
    if(!claim)continue;
    try{
      const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.LAB_RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'pv-agency:'+row.id},body:JSON.stringify(agencyNotification(row)),signal:AbortSignal.timeout(12000),redirect:'error'});
      const result=await response.json().catch(()=>({}));
      if(!response.ok||typeof result.id!=='string')throw Error('Notification not confirmed.');
      await run(env,"UPDATE agency_enquiries SET mail_state='sent',delivery_id=? WHERE id=?",result.id.slice(0,120),row.id);sent++;
    }catch{await run(env,"UPDATE agency_enquiries SET mail_state=CASE WHEN mail_attempts>=3 THEN 'failed' ELSE 'pending' END WHERE id=? AND mail_state='sending'",row.id);}
  }
  return {sent};
}
export async function agencyAdminRoute(request,env,owner,{clock=Date.now}={}){
  const authorised=await env.OWNER_DB.prepare("SELECT id FROM users WHERE id=? AND role='owner' AND auth_provider='clerk' LIMIT 1").bind(owner).first();
  if(!authorised)fail(403,'Owner access required.');
  const url=new URL(request.url),path=url.pathname;
  if(path==='/api/admin/agency/enquiries'&&request.method==='GET'){
    const offset=Number(url.searchParams.get('offset')||0);
    if(!Number.isSafeInteger(offset)||offset<0||offset>100000)fail(400,'Invalid page.');
    const [records,totals,events]=await Promise.all([
      all(env,'SELECT id,name,email,company,direction,budget,message,source,created_at,status,mail_state FROM agency_enquiries ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET ?',offset),
      one(env,"SELECT COUNT(*) AS total,SUM(status='new') AS unread,SUM(mail_state='failed') AS notificationFailures FROM agency_enquiries"),
      all(env,'SELECT event,SUM(count) AS count FROM agency_daily WHERE day>=? GROUP BY event',dayOf(clock()-29*DAY))
    ]);
    return json({records,totals,events,offset,hasMore:offset+records.length<Number(totals.total),notificationConfigured:String(env.LAB_RESEND_API_KEY||'').startsWith('re_'),revision:AGENCY_REVISION});
  }
  const id=path.slice('/api/admin/agency/enquiries/'.length);
  if(!path.startsWith('/api/admin/agency/enquiries/')||!UUID.test(id))fail(404,'Unknown enquiry.');
  if(request.method==='DELETE'){await run(env,'DELETE FROM agency_enquiries WHERE id=?',id);return json({ok:true});}
  if(request.method==='POST'){
    const data=await readBody(request,128);if(!['new','read','archived'].includes(data.status))fail(400,'Invalid enquiry status.');
    const row=await one(env,'UPDATE agency_enquiries SET status=? WHERE id=? RETURNING id',data.status,id);
    if(!row)fail(404,'Enquiry not found.');return json({ok:true});
  }
  fail(405,'Unsupported enquiry action.');
}
export async function pruneAgencyData(env,{clock=Date.now}={}){
  const time=clock();
  await env.LAB_DB.batch([
    env.LAB_DB.prepare('DELETE FROM agency_limits WHERE expires_at<?').bind(time),
    env.LAB_DB.prepare('DELETE FROM agency_daily WHERE day<?').bind(dayOf(time-90*DAY)),
    env.LAB_DB.prepare('DELETE FROM agency_enquiries WHERE created_at<?').bind(time-90*DAY)
  ]);
}
