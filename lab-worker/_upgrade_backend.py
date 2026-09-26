from pathlib import Path
root=Path('.')
p=root/'lab-worker/worker.mjs'
s=p.read_text()
assert "'pv-lab-2026-09-26.3'" in s, 'Unexpected backend version'
s=s.replace("'pv-lab-2026-09-26.3'","'pv-lab-2026-09-26.4'")
s=s.replace("const MODEL = MODEL_IMAGE;", "const STILL_TEXT = 'bytedance/seedream-5.0-pro/text-to-image';\nconst STILL_EDIT = 'bytedance/seedream-5.0-pro/edit';\nconst RATIOS = ['auto','1:1','4:3','3:4','16:9','9:16','3:2','2:3','4:5','5:4','21:9','9:21','2:1','1:2','3:1','1:3'];\nconst MODEL = MODEL_IMAGE;")
s=s.replace("model:'Wan 3.0'", "model:'Wan 3.0 / Seedream 5.0 Pro'")
s=s.replace("const e=new HttpError(502,'The Lab backend could not reach SpicyAPI. Your key was not stored and nothing was charged. Try again in a moment.');e.definite=true;throw e;", "const paid=path==='/jobs/createTask';\n    const e=new HttpError(502,paid?'Submission could not be confirmed. Check history and the provider before retrying.':'The provider could not be reached. No generation was submitted by this request.');e.definite=!paid;throw e;")
s=s.replace("else if(!result)message='SpicyAPI returned an unexpected response (HTTP '+r.status+'). Nothing was charged.';", "else if(!result)message='SpicyAPI returned an unexpected response (HTTP '+r.status+'). Check the request status before retrying.';")
start=s.index('function parameters(value) {');end=s.index('async function source(',start)
s=s[:start]+'''function sniff(bytes,mime) {
  if(mime==='image/png')return bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  if(mime==='image/jpeg')return bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  return mime==='image/webp'&&bytes.length>=12&&dec.decode(bytes.slice(0,4))==='RIFF'&&dec.decode(bytes.slice(8,12))==='WEBP';
}
function referenceLabels(value) {
  if(value==null)return [];
  if(!Array.isArray(value)||value.length>10)fail(400,'Use up to ten reference labels.');
  const allowed=['none','identity','outfit','room','pose','object','style','lighting','custom'];
  return value.map(x=>({name:String(x?.name||'').replace(/[\\r\\n]/g,' ').slice(0,180),role:allowed.includes(x?.role)?x.role:'none',note:String(x?.note||'').trim().slice(0,300)}));
}
function parameters(value) {
  if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'Invalid settings.');
  const prompt=typeof value.prompt==='string'?value.prompt.trim():'';
  const referenceRoles=referenceLabels(value.referenceRoles);
  if(value.type==='image'){
    if(prompt.length>5000||!['1k','2k'].includes(value.resolution)||!RATIOS.includes(value.aspectRatio||'1:1'))fail(400,'Choose 1K or 2K and a supported image ratio. Maximum prompt length is 5,000.');
    if(!['png','jpeg'].includes(value.outputFormat||'jpeg'))fail(400,'Choose PNG or JPEG.');
    return {type:'image',model:STILL_TEXT,mode:'image',prompt,resolution:value.resolution,aspectRatio:value.aspectRatio||'1:1',outputFormat:value.outputFormat||'jpeg',referenceRoles};
  }
  if(prompt.length>6000)fail(400,'Use no more than 6,000 prompt characters.');
  const duration=Number(value.duration),resolution=value.resolution;
  if(!Number.isInteger(duration)||duration<2||duration>30||!RESOLUTIONS.has(resolution))fail(400,'Choose 2 to 30 seconds and 480p, 720p or 1080p.');
  const ratio=value.aspectRatio||'auto';if(!['auto','16:9','9:16','1:1','4:3','3:4'].includes(ratio))fail(400,'Invalid video aspect ratio.');
  const seed=value.seed==null||value.seed===''?null:Number(value.seed);
  if(seed!==null&&(!Number.isInteger(seed)||seed<0||seed>2147483647))fail(400,'Seed must be a whole number from 0 to 2147483647.');
  const mode=value.mode==='reference'?'reference':'start';
  return {type:'video',model:mode==='reference'?MODEL_REFERENCE:MODEL_IMAGE,mode,prompt,duration,resolution,aspectRatio:ratio,seed,audio:value.audio!==false,referenceRoles};
}
function assembledPrompt(p) {
  const labels=(p.referenceRoles||[]).slice(0,p.referenceSourceIds?.length||0).map((r,i)=>r.role!=='none'||r.note?'Reference '+(i+1)+(r.name?' ('+r.name+')':'')+': '+(r.role!=='none'?r.role+'. ':'')+r.note:'').filter(Boolean);
  const prompt=[p.prompt,...labels].join('\\n');
  if(prompt.length>(p.type==='image'?5000:6000))fail(400,'Prompt plus reference notes is too long. Shorten the notes.');
  return prompt;
}
async function prepareInput(env,owner,data,p,url) {
  let primary=null,input;
  if(p.type==='image'){
    const refs=data.referenceSourceIds?.length?await sources(env,owner,data.referenceSourceIds):[];
    primary=refs[0]||null;p.referenceSourceIds=refs.map(a=>a.id);p.lastSourceId=null;p.model=refs.length?STILL_EDIT:STILL_TEXT;
    input={resolution:p.resolution,aspect_ratio:p.aspectRatio==='auto'&&!refs.length?'1:1':p.aspectRatio,output_format:p.outputFormat};
    if(refs.length&&url)input.image_urls=await Promise.all(refs.map(a=>signedInput(env,url,a.id)));
  }else if(p.mode==='reference'){
    const refs=await sources(env,owner,data.referenceSourceIds);primary=refs[0];p.referenceSourceIds=refs.map(a=>a.id);p.lastSourceId=null;
    input={resolution:p.resolution,duration_seconds:p.duration,generate_audio:p.audio,enable_prompt_expansion:false,aspect_ratio:p.aspectRatio==='auto'?'adaptive':p.aspectRatio};
    if(url)input.reference_image_urls=await Promise.all(refs.map(a=>signedInput(env,url,a.id)));
  }else{
    primary=await source(env,owner,data.sourceId);const last=data.lastSourceId?await source(env,owner,data.lastSourceId):null;p.referenceSourceIds=[];p.lastSourceId=last?.id||null;
    input={resolution:p.resolution,duration_seconds:p.duration,generate_audio:p.audio,enable_prompt_expansion:false};
    if(url){input.image_url=await signedInput(env,url,primary.id);if(last)input.last_image_url=await signedInput(env,url,last.id);}
    if(p.aspectRatio!=='auto')input.aspect_ratio=p.aspectRatio;
  }
  if(p.prompt)input.prompt=assembledPrompt(p);if(p.type!=='image'&&p.seed!==null)input.seed=p.seed;
  return {primary,input};
}
''' + s[end:]
s=s.replace("const jobs=await rows(env,'SELECT source_id,params FROM jobs WHERE owner_id=?',owner);for(const row of jobs)if(linkedSourceIds(row).includes(id))return true;", "const jobs=await rows(env,'SELECT source_id,output_id,params FROM jobs WHERE owner_id=?',owner);for(const row of jobs)if(row.output_id===id||linkedSourceIds(row).includes(id))return true;\n  const packs=await rows(env,'SELECT refs FROM packs WHERE owner_id=?',owner);for(const pack of packs)if(JSON.parse(pack.refs).some(r=>r.id===id))return true;")
a=s.index('async function copyResult(');b=s.index('async function refreshJob(',a)
s=s[:a]+'''async function copyResult(env,j,url) {
  let target=safeVideoUrl(url),r;
  for(let i=0;i<4;i++){
    r=await fetch(target,{redirect:'manual',signal:AbortSignal.timeout(30000)});
    if(r.status>=300&&r.status<400){const next=r.headers.get('location');if(!next)throw new Error('No output location.');target=safeVideoUrl(new URL(next,target).href);continue;}break;
  }
  if(!r?.ok)throw new Error('Output download failed.');
  const isImage=JSON.parse(j.params).type==='image';
  const mime=(r.headers.get('content-type')||'').split(';')[0];
  if(isImage?!['image/png','image/jpeg','image/webp'].includes(mime):!['video/mp4','application/octet-stream'].includes(mime))throw new Error('Unexpected output format.');
  const finalMime=isImage?mime:'video/mp4',ext=isImage?({'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[mime]):'mp4';
  const limit=isImage?MAX_IMAGE:MAX_VIDEO,declared=Number(r.headers.get('content-length')||0);
  if(declared>limit)throw new Error('Output exceeds the archive limit.');
  const stored=await first(env,'SELECT COALESCE(SUM(bytes),0) AS n FROM assets WHERE owner_id=?',j.owner_id);
  if(stored.n+(declared||limit)>MAX_STORAGE)throw new Error('Private archive storage limit reached.');
  const objectKey=`${j.owner_id}/results/${j.id}.${ext}`;let bytes=0;
  if(isImage||(declared>0&&declared<=16*1024*1024)){
    const buffer=await limitedBody(r,isImage?MAX_IMAGE:16*1024*1024);bytes=buffer.length;
    if(isImage&&!sniff(buffer,mime))throw new Error('Invalid image output.');
    await env.LAB_MEDIA.put(objectKey,buffer,{httpMetadata:{contentType:finalMime}});
  }else if(env.LAB_MEDIA.createMultipartUpload){
    const upload=await env.LAB_MEDIA.createMultipartUpload(objectKey,{httpMetadata:{contentType:finalMime}});
    const reader=r.body.getReader(),parts=[];let buffer=new Uint8Array(8*1024*1024),used=0,part=1;
    try{while(true){const value=await reader.read();if(value.done)break;let offset=0;bytes+=value.value.length;if(bytes>limit)throw new Error('Output exceeds archive limit.');while(offset<value.value.length){const n=Math.min(buffer.length-used,value.value.length-offset);buffer.set(value.value.subarray(offset,offset+n),used);used+=n;offset+=n;if(used===buffer.length){parts.push(await upload.uploadPart(part++,buffer));used=0;}}}if(used)parts.push(await upload.uploadPart(part,buffer.slice(0,used)));if(!parts.length)throw new Error('Empty output.');await upload.complete(parts);}catch(e){await reader.cancel().catch(()=>{});await upload.abort().catch(()=>{});throw e;}
  }else{const buffer=await limitedBody(r,16*1024*1024);bytes=buffer.length;await env.LAB_MEDIA.put(objectKey,buffer,{httpMetadata:{contentType:finalMime}});}
  await env.LAB_DB.batch([
    stmt(env,'INSERT OR IGNORE INTO assets(id,owner_id,object_key,kind,mime,filename,bytes,created_at) VALUES(?,?,?,?,?,?,?,?)',j.id,j.owner_id,objectKey,isImage?'source':'video',finalMime,'parallel-vision-'+j.id+'.'+ext,bytes,now()),
    stmt(env,"UPDATE jobs SET state='completed',output_id=?,remote_url=NULL,error='',updated_at=? WHERE id=?",j.id,now(),j.id)
  ]);
}
''' + s[b:]
s=s.replace("const output=result.output?.assets?.find(a=>a.mime?.startsWith('video/'))?.url;\n      if(typeof output!=='string')throw new Error('No video output.');", "const kind=JSON.parse(j.params).type==='image'?'image/':'video/';\n      const asset=result.output?.assets?.find(a=>a.mime?.startsWith(kind)&&a.url);\n      if(!asset&&result.output?.assets?.some(a=>a.pending===true)){await run(env,\"UPDATE jobs SET state='running',error='Provider is preparing the output file.',updated_at=? WHERE id=?\",now(),j.id);return;}\n      const output=asset?.url;if(typeof output!=='string')throw new Error('No compatible output file yet.');")
a=s.index("    const data=await body(request),p=parameters(data.settings),id=crypto.randomUUID();let primary;");b=s.index("    if((await first(env,'SELECT COUNT(*) AS n FROM jobs",a)
s=s[:a]+"    const data=await body(request),p=parameters(data.settings),id=crypto.randomUUID();\n    const {primary}=await prepareInput(env,owner,data,p,null);\n"+s[b:]
s=s.replace("id,owner,primary.id,JSON.stringify(p),now(),now()", "id,owner,primary?.id||null,JSON.stringify(p),now(),now()")
a=s.index("    const {key}=await requireConfigured(env,owner),data=await body(request),p=parameters(data.settings);let primary,input;");b=s.index("    const payload={model:p.model,input},q=await vendorRequest",a)
s=s[:a]+"    const {key}=await requireConfigured(env,owner),data=await body(request),p=parameters(data.settings);\n    if(!p.prompt)fail(400,'Add a prompt before generating.');\n    const {primary,input}=await prepareInput(env,owner,data,p,url);\n"+s[b:]
s=s.replace("id,owner,primary.id,JSON.stringify(p),maximum", "id,owner,primary?.id||null,JSON.stringify(p),maximum")
s=s.replace("    await source(env,owner,q.source_id);", "    for(const assetId of linkedSourceIds(q))await source(env,owner,assetId);")
s=s.replace("if(a){await env.LAB_MEDIA.delete(a.object_key);await run(env,'DELETE FROM assets WHERE id=?',a.id);}", "if(a){if(a.kind==='source')await pruneSource(env,owner,a.id);else{await env.LAB_MEDIA.delete(a.object_key);await run(env,'DELETE FROM assets WHERE id=?',a.id);}}")
needle="  if(path==='/api/uploads'&&method==='POST') {"
s=s.replace(needle,"""  if(path==='/api/packs'&&method==='GET'){
    const list=await rows(env,'SELECT id,name,refs,created_at FROM packs WHERE owner_id=? ORDER BY name',owner);
    return json({packs:list.map(p=>({...p,refs:JSON.parse(p.refs)}))});
  }
  if(path==='/api/packs'&&method==='POST'){
    const data=await body(request),name=String(data.name||'').trim().slice(0,100);
    if(!name)fail(400,'Give the pack a name.');
    if((await first(env,'SELECT COUNT(*) AS n FROM packs WHERE owner_id=?',owner)).n>=40)fail(409,'Keep up to 40 reference packs.');
    const list=await sources(env,owner,data.referenceSourceIds),labels=referenceLabels(data.referenceRoles);
    const refs=list.map((a,i)=>({id:a.id,name:a.filename,role:labels[i]?.role||'none',note:labels[i]?.note||''}));
    const id=crypto.randomUUID();await run(env,'INSERT INTO packs(id,owner_id,name,refs,created_at) VALUES(?,?,?,?,?)',id,owner,name,JSON.stringify(refs),now());
    return json({id,name,refs},201);
  }
  if(path.startsWith('/api/packs/')&&method==='DELETE'){
    const id=uid(path.split('/')[3]),pack=await first(env,'SELECT refs FROM packs WHERE id=? AND owner_id=?',id,owner);
    if(!pack)fail(404,'Pack not found.');await run(env,'DELETE FROM packs WHERE id=? AND owner_id=?',id,owner);
    for(const a of JSON.parse(pack.refs))await pruneSource(env,owner,a.id);return json({ok:true});
  }
"""+needle)
p.write_text(s)
schema=(root/'lab-worker/schema.sql').read_text().replace('source_id TEXT NOT NULL REFERENCES assets(id)', 'source_id TEXT REFERENCES assets(id)')
schema+='''\n-- Source assets include original uploads and still-image outputs reusable in video.\nCREATE TABLE IF NOT EXISTS packs(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,name TEXT NOT NULL,refs TEXT NOT NULL,created_at INTEGER NOT NULL);\nCREATE INDEX IF NOT EXISTS packs_owner ON packs(owner_id,name);\nCREATE TABLE IF NOT EXISTS lab_migrations(id TEXT PRIMARY KEY,applied_at INTEGER NOT NULL);\n'''
(root/'lab-worker/schema.sql').write_text(schema)
quotes=schema[schema.index('CREATE TABLE IF NOT EXISTS quotes'):schema.index('CREATE INDEX IF NOT EXISTS jobs_owner_history')]
quotes=quotes.replace('IF NOT EXISTS quotes','quotes_v2').replace('IF NOT EXISTS jobs','jobs_v2').replace('REFERENCES quotes(id)','REFERENCES quotes_v2(id)')
migration='-- Atomic D1 migration: nullable sources enable text-to-image; all rows copied.\n'+quotes+'\nINSERT INTO quotes_v2 SELECT * FROM quotes;\nINSERT INTO jobs_v2 SELECT * FROM jobs;\nDROP TABLE jobs;\nDROP TABLE quotes;\nALTER TABLE quotes_v2 RENAME TO quotes;\nALTER TABLE jobs_v2 RENAME TO jobs;\n'+schema[schema.index('CREATE INDEX IF NOT EXISTS jobs_owner_history'):]
migration+="\nINSERT INTO lab_migrations(id,applied_at) VALUES('20260926-images',unixepoch()*1000);\n"
(root/'lab-worker/migrations').mkdir(exist_ok=True)
(root/'lab-worker/migrations/0002-images.sql').write_text(migration)
