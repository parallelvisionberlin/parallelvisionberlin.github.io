import {eventDimensions,analyticsReports} from './music-analytics.mjs';
import {API,MUSIC_PIXEL,CLICK_EVENTS,BACKGROUNDS,SERVICES,SLUG,UUID,releaseUrl,safeUrl,validateLinks} from './music-links-shared.mjs';
export const MUSIC_LINKS_VERSION='music-links-20261030-v7';
const PREFIX='/api/music',DAY=86400000,HOUR=3600000;
const ORIGINS=new Set(['https://parallelvisionlabel.com','https://www.parallelvisionlabel.com']);
const SOURCES=new Set(['direct','meta','instagram','facebook','google','youtube','soundcloud','email','other']);
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
function fail(status,message){throw Object.assign(Error(message),{status});}
const stmt=(env,sql,...p)=>env.LAB_DB.prepare(sql).bind(...p);
const one=(env,sql,...p)=>stmt(env,sql,...p).first();
const all=async(env,sql,...p)=>(await stmt(env,sql,...p).all()).results;
const releaseSelect='SELECT r.*,d.background FROM music_releases r LEFT JOIN music_link_designs d ON d.release_id=r.id';
const releaseById=(env,id)=>one(env,releaseSelect+' WHERE r.id=?',id);
async function bytes(request,max){
  if(Number(request.headers.get('content-length'))>max)fail(413,'This file is too large.');
  const reader=request.body?.getReader();if(!reader)fail(400,'A request body is required.');
  const parts=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;
    if(size>max){await reader.cancel();fail(413,'This file is too large.');}parts.push(value);}
  const result=new Uint8Array(size);let i=0;for(const part of parts){result.set(part,i);i+=part.length;}return result;
}
async function body(request,max=20000,{plain=false}={}){
  if(!(plain?/^(application\/json|text\/plain)(;|$)/i:/^application\/json(;|$)/i).test(request.headers.get('content-type')||''))fail(415,'Send JSON.');
  let data;try{data=JSON.parse(new TextDecoder().decode(await bytes(request,max)));}catch(e){if(e.status)throw e;fail(400,'Invalid JSON.');}
  if(!data||typeof data!=='object'||Array.isArray(data))fail(400,'Send a JSON object.');return data;
}
function text(value,max,required=false){
  if(typeof value!=='string'||value.length>max||/[\x00-\x1f]/.test(value))fail(400,'Check the release details.');
  const result=value.trim();if(required&&!result)fail(400,'Artist and release title are required.');return result;
}
function pixel(value){if(typeof value!=='string'||! /^(?:\d{8,20})?$/.test(value))fail(400,'Enter a numeric Meta Pixel ID.');return value;}
export function validateRelease(data){
  const slug=text(data.slug,80,true);if(!SLUG.test(slug))fail(400,'Use lowercase letters, numbers and hyphens for the link.');
  const title=text(data.title,160,true),artist=text(data.artist,200,true),catalogue=text(data.catalogue||'',40),description=text(data.description||'',280);
  const releaseDate=text(data.releaseDate||'',10);
  if(releaseDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)||!Number.isFinite(Date.parse(releaseDate))||new Date(releaseDate).toISOString().slice(0,10)!==releaseDate))fail(400,'Choose a valid release date.');
  if(!['draft','published','archived'].includes(data.status))fail(400,'Choose a release status.');
  let artworkUrl,audioUrl,links;
  try{artworkUrl=safeUrl(data.artworkUrl||'');audioUrl=safeUrl(data.audioUrl||'');links=validateLinks(data.links);}catch(e){fail(400,e.message);}
  if(data.status==='published'&&(!artworkUrl||!links.length))fail(400,'Add artwork and at least one platform link before publishing.');
  if(data.background!==undefined&&!BACKGROUNDS.includes(data.background))fail(400,'Choose a supported page background.');
  return {background:data.background,slug,title,artist,catalogue,description,releaseDate,artworkUrl,audioUrl,links,pixelId:pixel(data.pixelId||''),status:data.status};
}
function view(row){return {id:row.id,slug:row.slug,title:row.title,artist:row.artist,catalogue:row.catalogue,description:row.description,
  background:row.background||'blur',artworkUrl:row.artwork_url,audioUrl:row.audio_url,releaseDate:row.release_date,links:JSON.parse(row.links),pixelId:row.pixel_id,
  status:row.status,revision:row.revision,createdAt:row.created_at,updatedAt:row.updated_at,url:releaseUrl(row.slug)};}
async function settings(env,account=''){
  if(account){const scoped=await one(env,'SELECT pixel_id AS pixelId,click_event AS clickEvent,revision FROM music_user_settings WHERE account_id=?',account);if(scoped)return scoped;}
  return await one(env,'SELECT pixel_id AS pixelId,click_event AS clickEvent,revision FROM music_link_settings WHERE id=1')||{pixelId:MUSIC_PIXEL,clickEvent:CLICK_EVENTS[0],revision:0};}
// The Worker verifies Clerk's signature, issuer and authorized origin before calling here.
async function accountScope(env,account){
  if(!account)fail(401,'Sign in to manage your smart links.');
  const owner=await env.OWNER_DB.prepare("SELECT id FROM users WHERE id=? AND role='owner' AND auth_provider='clerk' LIMIT 1").bind(account).first();
  if(owner)return '';
  if(!/^user_[A-Za-z0-9]+$/.test(account))fail(403,'A verified Parallel Vision account is required.');
  await stmt(env,"INSERT OR IGNORE INTO music_user_settings(account_id,pixel_id,click_event) VALUES(?,'','MusicLinkClick')",account).run();
  return account;
}
export async function musicAdminRoute(request,env,owner,{clock=Date.now}={}){
  const scope=await accountScope(env,owner);
  const url=new URL(request.url),path=url.pathname.slice((PREFIX+'/admin').length),method=request.method,time=clock();
  if(path==='/settings'){
    if(method==='GET')return json({settings:await settings(env,scope),version:MUSIC_LINKS_VERSION});
    if(method==='POST'){
      const data=await body(request,512),id=pixel(data.pixelId);
      if(!CLICK_EVENTS.includes(data.clickEvent))fail(400,'Choose a supported conversion event.');
      if(!Number.isSafeInteger(data.revision)||data.revision<1)fail(400,'Reload the tracking settings.');
      const changed=scope?await one(env,'UPDATE music_user_settings SET pixel_id=?,click_event=?,revision=revision+1 WHERE account_id=? AND revision=? RETURNING account_id',id,data.clickEvent,scope,data.revision):await one(env,'UPDATE music_link_settings SET pixel_id=?,click_event=?,revision=revision+1 WHERE id=1 AND revision=? RETURNING id',id,data.clickEvent,data.revision);
      if(!changed)fail(409,'Tracking settings changed in another tab. Reload before saving.');
      return json({settings:await settings(env,scope)});
    }
  }
  if(path==='/dashboard'&&method==='GET'){
    const days=Number(url.searchParams.get('days')||30);if(![7,30,90,0].includes(days))fail(400,'Choose 7, 30, 90 days or all time.');
    const start=days?new Date(time-(days-1)*DAY).toISOString().slice(0,10):'0000-01-01';
    const selected=url.searchParams.get('releaseId')||'';if(selected&&!UUID.test(selected))fail(400,'Choose a valid smart link.');
    const visible="SELECT id FROM music_releases WHERE ((?='' AND created_by NOT IN (SELECT account_id FROM music_user_settings)) OR created_by=?) AND (?='' OR id=?)";
    const [releases,counts,platforms,sources,campaigns,trend]=await Promise.all([
      all(env,releaseSelect+' WHERE r.id IN ('+visible+') ORDER BY r.created_at DESC,r.id DESC',scope,scope,selected,selected),
      all(env,'SELECT release_id AS releaseId,event,SUM(count) AS count FROM music_link_daily WHERE release_id IN ('+visible+') AND day_utc>=? GROUP BY release_id,event',scope,scope,selected,selected,start),
      all(env,"SELECT service,SUM(count) AS count FROM music_link_daily WHERE release_id IN ("+visible+") AND day_utc>=? AND event='click' GROUP BY service ORDER BY count DESC",scope,scope,selected,selected,start),
      all(env,"SELECT source,SUM(CASE WHEN event='view' THEN count ELSE 0 END) AS views,SUM(CASE WHEN event='click' THEN count ELSE 0 END) AS clicks FROM music_link_daily WHERE release_id IN ("+visible+") AND day_utc>=? GROUP BY source ORDER BY views DESC",scope,scope,selected,selected,start),
      all(env,"SELECT campaign,SUM(CASE WHEN event='view' THEN count ELSE 0 END) AS views,SUM(CASE WHEN event='click' THEN count ELSE 0 END) AS clicks FROM music_link_daily WHERE release_id IN ("+visible+") AND day_utc>=? AND campaign!='' GROUP BY campaign ORDER BY clicks DESC LIMIT 20",scope,scope,selected,selected,start),
      all(env,"SELECT day_utc AS day,SUM(CASE WHEN event='view' THEN count ELSE 0 END) AS views,SUM(CASE WHEN event='click' THEN count ELSE 0 END) AS clicks FROM music_link_daily WHERE release_id IN ("+visible+") AND day_utc>=? GROUP BY day_utc ORDER BY day_utc",scope,scope,selected,selected,days?start:new Date(time-89*DAY).toISOString().slice(0,10))
    ]);
    const analytics=await analyticsReports(env,visible,[scope,scope,selected,selected],start,new Date(Math.max(days?Date.parse(start):0,time-89*DAY)).toISOString().slice(0,10));
    const available=await all(env,releaseSelect+" WHERE (?='' AND r.created_by NOT IN (SELECT account_id FROM music_user_settings)) OR r.created_by=? ORDER BY r.created_at DESC",scope,scope);
    const records=releases.map(row=>{const metrics={views:0,clicks:0};for(const c of counts)if(c.releaseId===row.id)metrics[c.event==='view'?'views':'clicks']+=Number(c.count);return {...view(row),...metrics};});
    const total=records.reduce((s,r)=>({views:s.views+r.views,clicks:s.clicks+r.clicks}),{views:0,clicks:0});
    return json({analytics,availableReleases:available.map(r=>({id:r.id,title:r.title,artist:r.artist})),releases:records,summary:{...total,published:records.filter(r=>r.status==='published').length},platforms,sources,campaigns,trend,days,settings:await settings(env,scope),version:MUSIC_LINKS_VERSION});
  }
  if(path==='/media'&&method==='POST'){
    const content=await bytes(request,12*1024*1024),head=new TextDecoder('latin1').decode(content.subarray(0,16));
    let mime='';
    if(content[0]===255&&content[1]===216&&content[2]===255)mime='image/jpeg';
    else if(content[0]===137&&head.slice(1,4)==='PNG'&&content[4]===13&&content[5]===10&&content[6]===26&&content[7]===10)mime='image/png';
    else if(head.startsWith('RIFF')&&head.slice(8,12)==='WEBP')mime='image/webp';
    else if(head.startsWith('ID3')||content[0]===255&&(content[1]&0xe0)===0xe0)mime='audio/mpeg';
    if(!mime||content.length<16)fail(415,'Upload a JPG, PNG, WebP or MP3 file.');
    if(mime.startsWith('image/')&&content.length>6*1024*1024)fail(413,'Artwork must be smaller than 6 MB.');
    const quota=await one(env,'SELECT COALESCE(SUM(bytes),0) AS bytes FROM music_link_media WHERE created_by=?',owner);
    if(Number(quota.bytes)+content.length>500*1024*1024)fail(409,'Release media storage is full. Use hosted artwork or audio links.');
    const id=crypto.randomUUID(),key='music-links/'+id;
    await env.LAB_MEDIA.put(key,content,{httpMetadata:{contentType:mime}});
    try{await stmt(env,'INSERT INTO music_link_media(id,object_key,mime,bytes,created_by,created_at) VALUES(?,?,?,?,?,?)',id,key,mime,content.length,owner,time).run();}
    catch(e){await env.LAB_MEDIA.delete(key).catch(()=>{});throw e;}
    return json({id,url:API+PREFIX+'/public/media/'+id,mime},201);
  }
  const id=path.slice('/releases/'.length),create=path==='/releases';
  if(method==='POST'&&(create||path.startsWith('/releases/')&&UUID.test(id))){
    const data=await body(request),r=validateRelease(data);
    const duplicate=await one(env,'SELECT id FROM music_releases WHERE slug=?',r.slug);
    if(duplicate&&(create||duplicate.id!==id))fail(409,'That release link already exists. Choose another link.');
    const values=[r.title,r.artist,r.catalogue,r.description,r.artworkUrl,r.audioUrl,r.releaseDate,JSON.stringify(r.links),r.pixelId,r.status,time];
    if(create){
      const count=await one(env,'SELECT COUNT(*) AS n FROM music_releases WHERE created_by=?',owner);if(count.n>=500)fail(409,'The release limit has been reached.');
      // A caller-generated UUID makes a retried create safe, including lost responses.
      if(!UUID.test(data.id||''))fail(400,'Reload the creator and try again.');
      const existing=await one(env,'SELECT * FROM music_releases WHERE id=?',data.id);
      if(existing)fail(409,'This release was already saved. Refresh the dashboard before retrying.');
      try{await env.LAB_DB.batch([stmt(env,'INSERT INTO music_releases(id,slug,title,artist,catalogue,description,artwork_url,audio_url,release_date,links,pixel_id,status,updated_at,created_at,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',data.id,r.slug,...values,time,owner),stmt(env,'INSERT INTO music_link_designs(release_id,background) VALUES(?,?)',data.id,r.background||'blur')]);}
      catch(e){if(/unique/i.test(e.message))fail(409,'This release or link already exists. Refresh the dashboard.');throw e;}
      return json({release:view(await releaseById(env,data.id))},201);
    }
    const previous=await one(env,'SELECT * FROM music_releases WHERE id=?',id);if(!previous||scope&&previous.created_by!==scope||!scope&&await one(env,'SELECT account_id FROM music_user_settings WHERE account_id=?',previous.created_by))fail(404,'Release not found.');
    if(previous.slug!==r.slug)fail(409,'Saved release links stay fixed so existing adverts keep working.');
    if(!Number.isSafeInteger(data.revision)||data.revision<1)fail(400,'Reload this release before saving.');
    // D1 batch is atomic. Match the original revision before either write so a stale tab cannot replace the design.
    const writes=[];
    if(r.background!==undefined)writes.push(stmt(env,'INSERT INTO music_link_designs(release_id,background) SELECT id,? FROM music_releases WHERE id=? AND revision=? ON CONFLICT(release_id) DO UPDATE SET background=excluded.background',r.background,id,data.revision));
    writes.push(stmt(env,'UPDATE music_releases SET title=?,artist=?,catalogue=?,description=?,artwork_url=?,audio_url=?,release_date=?,links=?,pixel_id=?,status=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=?',...values,id,data.revision));
    const changed=await env.LAB_DB.batch(writes);
    if(!changed.at(-1).meta.changes)fail(409,'This release changed in another tab. Reload before saving.');
    return json({release:view(await releaseById(env,id))});
  }
  fail(405,'Unsupported music dashboard action.');
}
async function digest(env,value){
  if(!env.LAB_SECRET)fail(503,'Music measurement is temporarily unavailable.');
  const encoder=new TextEncoder(),key=await crypto.subtle.importKey('raw',encoder.encode(env.LAB_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const hash=await crypto.subtle.sign('HMAC',key,encoder.encode('music-links:'+value));return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function musicPublicRoute(request,env,{clock=Date.now}={}){
  const url=new URL(request.url),path=url.pathname.slice((PREFIX+'/public').length),method=request.method,time=clock();
  if(path==='/status'&&method==='GET'){
    await one(env,'SELECT id FROM music_releases LIMIT 1');await one(env,'SELECT release_id FROM music_link_designs LIMIT 1');await one(env,'SELECT account_id FROM music_user_settings LIMIT 1');await one(env,'SELECT release_id FROM music_analytics_hourly LIMIT 1');return json({ready:true,version:MUSIC_LINKS_VERSION});
  }
  if(path.startsWith('/media/')&&['GET','HEAD'].includes(method)){
    const id=path.slice('/media/'.length);if(!UUID.test(id))fail(404,'Media not found.');
    const record=await one(env,'SELECT * FROM music_link_media WHERE id=?',id);if(!record)fail(404,'Media not found.');
    const range=request.headers.get('range');let start=0,end=record.bytes-1;
    if(range){const m=/^bytes=(\d*)-(\d*)$/.exec(range);if(!m||!m[1]&&!m[2])return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+record.bytes}});
      if(!m[1])start=Math.max(0,record.bytes-Number(m[2]));else{start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]));}
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=record.bytes)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+record.bytes}});}
    const object=await env.LAB_MEDIA.get(record.object_key,{range:{offset:start,length:end-start+1}});if(!object)fail(404,'Media not found.');
    return new Response(method==='HEAD'?null:object.body,{status:range?206:200,headers:{'Content-Type':record.mime,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes',...(range?{'Content-Range':`bytes ${start}-${end}/${record.bytes}`}:{})}});
  }
  if(path.startsWith('/releases/')&&method==='GET'){
    const slug=path.slice('/releases/'.length);if(slug.length>80||!SLUG.test(slug))fail(404,'Release not found.');
    const row=await one(env,releaseSelect+" WHERE r.slug=? AND r.status='published'",slug);if(!row)fail(404,'This release is not available.');
    const config=await settings(env,row.created_by);return json({release:view(row),tracking:{pixelId:row.pixel_id||config.pixelId,clickEvent:config.clickEvent},version:MUSIC_LINKS_VERSION});
  }
  if(path==='/events'&&method==='POST'){
    if(!ORIGINS.has(request.headers.get('origin')||''))fail(403,'Use the Parallel Vision release page.');
    if(/bot\b|crawler|spider|preview|headless|curl|wget/i.test(request.headers.get('user-agent')||'')||request.cf?.botManagement?.verifiedBot)return new Response(null,{status:204});
    const data=await body(request,2048,{plain:true});
    if(!UUID.test(data.id||'')||!UUID.test(data.releaseId||'')||!['view','click','preview'].includes(data.event)||!SOURCES.has(data.source)||
      typeof data.campaign!=='string'||data.campaign.length>64||!/^[\p{L}\p{N} _.()\-]*$/u.test(data.campaign)||
      data.event!=='click'&&data.service!==''||data.event==='click'&&!SERVICES.some(s=>s.id===data.service))fail(400,'Invalid music event.');
    const release=await one(env,"SELECT links,audio_url FROM music_releases WHERE id=? AND status='published'",data.releaseId);if(!release)fail(404,'Release not found.');
    if(data.event==='preview'&&!release.audio_url)fail(400,'No audio preview is configured.');
    if(data.event==='click'&&!JSON.parse(release.links).some(l=>l.service===data.service))fail(400,'Unknown platform link.');
    if(await one(env,'SELECT id FROM music_analytics_receipts WHERE id=?',data.id))return new Response(null,{status:204});
    const bucket=Math.floor(time/HOUR),key=bucket+':'+await digest(env,bucket+':'+(request.headers.get('cf-connecting-ip')||'unknown'));
    const limited=await one(env,'INSERT INTO music_link_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<120 RETURNING count',key,(bucket+2)*HOUR);
    if(!limited)return json({error:'Music measurement rate limit reached.'},429);
    const writes=[];
    if(data.event!=='preview')writes.push(stmt(env,'INSERT OR IGNORE INTO music_link_receipts(id,release_id,event,service,source,campaign,day_utc,created_at) VALUES(?,?,?,?,?,?,?,?)',data.id,data.releaseId,data.event,data.service,data.source,data.campaign,new Date(time).toISOString().slice(0,10),time));
    writes.push(stmt(env,'INSERT OR IGNORE INTO music_analytics_receipts(id,release_id,event,service,source,campaign,hour_utc,country,region,city,device,browser,os,medium,content,term,delay_bucket,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',data.id,data.releaseId,data.event,data.service,data.source,data.campaign,...eventDimensions(request,data,time),time));
    await env.LAB_DB.batch(writes);
    return new Response(null,{status:204});
  }
  fail(404,'Music link not found.');
}
export async function pruneMusicEvents(env,{clock=Date.now}={}){
  await env.LAB_DB.batch([stmt(env,'DELETE FROM music_link_receipts WHERE created_at<?',clock()-2*DAY),stmt(env,'DELETE FROM music_link_limits WHERE expires_at<?',clock()),stmt(env,'DELETE FROM music_analytics_receipts WHERE created_at<?',clock()-2*DAY)]);
}
