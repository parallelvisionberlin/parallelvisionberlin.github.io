export const SOUL_TRAINER='fal-ai/qwen-image-2512-trainer';
export const SOUL_TEXT_MODEL='alibaba/qwen-image-2512-lora/text-to-image';
export const SOUL_EDIT_MODEL='alibaba/qwen-image-2512-lora/edit';
export const SOUL_MAX_DATASET=64*1024*1024;
const MAX_WEIGHT=2*1024*1024*1024;
const MAX_SOUL_STORAGE=10*1024*1024*1024;
const ACTIVE=new Set(['submitting','queued','training','uncertain']);
const enc=new TextEncoder();

function clean(value,max=500){return String(value??'').replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
function view(row){return {id:row.id,name:row.name,triggerWord:row.trigger_word,state:row.state,error:row.error||'',createdAt:row.created_at,updatedAt:row.updated_at,weightsArchived:!!row.lora_object_key};}
function safeFalUrl(value){
  let u;try{u=new URL(value);}catch{throw new Error('FAL returned an invalid weights URL.');}
  const host=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||!(host==='fal.media'||host.endsWith('.fal.media')))throw new Error('FAL returned an unexpected weights host.');
  return u.href;
}
async function falFetch(env,path,{method='GET',body,timeout=25000}={}){
  if(!env.FAL_KEY)throw Object.assign(new Error('FAL training is not configured on this Worker.'),{definite:true});
  let response;
  try{
    response=await fetch('https://queue.fal.run/'+path,{method,headers:{Authorization:'Key '+env.FAL_KEY,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(timeout),redirect:'error'});
  }catch{
    throw Object.assign(new Error('FAL request could not be confirmed. Check the FAL dashboard before retrying.'),{definite:false});
  }
  const raw=await response.text();let data=null;try{data=raw?JSON.parse(raw):{};}catch{}
  if(!response.ok||!data){
    const detail=clean(data?.detail||data?.error||data?.message||('HTTP '+response.status),350);
    throw Object.assign(new Error('FAL: '+detail),{definite:response.status>=400&&response.status<500&&response.status!==408&&response.status!==429});
  }
  return data;
}
async function signedUrl(env,url,label,path,id,ttl,d){
  const expires=Math.floor(d.now()/1000)+ttl,key=await d.derived(env,label,{name:'HMAC',hash:'SHA-256'},['sign']);
  const signature=d.base(await crypto.subtle.sign('HMAC',key,enc.encode(id+':'+expires)));
  return url.origin+path+id+'?expires='+expires+'&signature='+signature;
}
async function verifySigned(env,url,label,id,maxTtl,d){
  const expires=Number(url.searchParams.get('expires')),signature=url.searchParams.get('signature')||'',now=Math.floor(d.now()/1000);
  if(!Number.isInteger(expires)||expires<now||expires>now+maxTtl+5||!signature||signature.length>100)return false;
  const key=await d.derived(env,label,{name:'HMAC',hash:'SHA-256'},['verify']);
  try{return await crypto.subtle.verify('HMAC',key,d.unbase(signature),enc.encode(id+':'+expires));}catch{return false;}
}
async function cleanupDataset(env,row,d){
  if(!row?.dataset_id)return;
  const ds=await d.first(env,'SELECT * FROM soul_datasets WHERE id=? AND owner_id=?',row.dataset_id,row.owner_id);
  if(!ds)return;
  await env.LAB_MEDIA.delete(ds.object_key).catch(()=>{});
  await d.run(env,'DELETE FROM soul_datasets WHERE id=? AND owner_id=?',ds.id,row.owner_id).catch(()=>{});
}
async function archiveWeights(env,row,d){
  if(row.lora_object_key||!row.lora_source_url)return;
  const used=await d.first(env,'SELECT COALESCE(SUM(lora_bytes),0) AS n FROM soul_characters WHERE owner_id=?',row.owner_id);
  if(Number(used?.n||0)>=MAX_SOUL_STORAGE)throw new Error('PV Soul weight archive limit reached.');
  let target=safeFalUrl(row.lora_source_url),response;
  for(let i=0;i<3;i++){
    response=await fetch(target,{redirect:'manual',signal:AbortSignal.timeout(30000)});
    if(response.status>=300&&response.status<400){
      const next=response.headers.get('location');if(!next)throw new Error('FAL weights redirect had no location.');
      target=safeFalUrl(new URL(next,target).href);continue;
    }
    break;
  }
  if(!response?.ok)throw new Error('FAL weights download failed.');
  const declared=Number(response.headers.get('content-length')||0);
  if(!Number.isSafeInteger(declared)||declared<0||declared>MAX_WEIGHT)throw new Error('FAL weights exceed the archive limit.');
  if(declared&&Number(used?.n||0)+declared>MAX_SOUL_STORAGE)throw new Error('PV Soul weight archive limit reached.');
  const objectKey=`${row.owner_id}/soul/weights/${row.id}.safetensors`;
  let bytes=0;
  if(declared>0&&declared<=16*1024*1024||!env.LAB_MEDIA.createMultipartUpload){
    const buffer=await d.limitedBody(response,Math.min(MAX_WEIGHT,64*1024*1024));bytes=buffer.length;
    if(!bytes||declared&&bytes!==declared)throw new Error('Incomplete FAL weights download.');
    await env.LAB_MEDIA.put(objectKey,buffer,{httpMetadata:{contentType:'application/octet-stream'}});
  }else{
    const upload=await env.LAB_MEDIA.createMultipartUpload(objectKey,{httpMetadata:{contentType:'application/octet-stream'}});
    const reader=response.body.getReader(),parts=[];let buffer=new Uint8Array(8*1024*1024),usedBytes=0,part=1;
    try{
      while(true){
        const item=await reader.read();if(item.done)break;
        const chunk=item.value;bytes+=chunk.length;
        if(bytes>MAX_WEIGHT||Number(used?.n||0)+bytes>MAX_SOUL_STORAGE)throw new Error('PV Soul weight archive limit reached.');
        let offset=0;
        while(offset<chunk.length){
          const n=Math.min(buffer.length-usedBytes,chunk.length-offset);buffer.set(chunk.subarray(offset,offset+n),usedBytes);usedBytes+=n;offset+=n;
          if(usedBytes===buffer.length){parts.push(await upload.uploadPart(part++,buffer));usedBytes=0;}
        }
      }
      if(!bytes||declared&&bytes!==declared)throw new Error('Incomplete FAL weights download.');
      if(usedBytes)parts.push(await upload.uploadPart(part,buffer.slice(0,usedBytes)));
      await upload.complete(parts);
    }catch(error){await reader.cancel().catch(()=>{});await upload.abort().catch(()=>{});throw error;}
  }
  await d.run(env,'UPDATE soul_characters SET lora_object_key=?,lora_bytes=?,error=?,updated_at=? WHERE id=?',objectKey,bytes,'',d.now(),row.id);
}
async function refreshOne(env,row,d){
  if(!row||!row.fal_request_id||!['queued','training'].includes(row.state))return row;
  const locked=await d.run(env,'UPDATE soul_characters SET last_poll=? WHERE id=? AND last_poll<?',d.now(),row.id,d.now()-8000);
  if(!locked.meta.changes)return row;
  try{
    const id=encodeURIComponent(row.fal_request_id),status=await falFetch(env,SOUL_TRAINER+'/requests/'+id+'/status?logs=1');
    if(status.status==='IN_QUEUE'){
      await d.run(env,"UPDATE soul_characters SET state='queued',error='',updated_at=? WHERE id=?",d.now(),row.id);
    }else if(status.status==='IN_PROGRESS'){
      const last=Array.isArray(status.logs)&&status.logs.length?clean(status.logs.at(-1)?.message,300):'';
      await d.run(env,"UPDATE soul_characters SET state='training',error=?,updated_at=? WHERE id=?",last,d.now(),row.id);
    }else if(status.status==='COMPLETED'){
      const result=await falFetch(env,SOUL_TRAINER+'/requests/'+id),source=safeFalUrl(result?.diffusers_lora_file?.url);
      await d.run(env,"UPDATE soul_characters SET state='ready',lora_source_url=?,error='',updated_at=? WHERE id=?",source,d.now(),row.id);
      const fresh=await d.first(env,'SELECT * FROM soul_characters WHERE id=?',row.id);
      await cleanupDataset(env,fresh,d);
      try{await archiveWeights(env,fresh,d);}catch(error){await d.run(env,'UPDATE soul_characters SET error=?,updated_at=? WHERE id=?','Weights ready; private archive retry pending: '+clean(error.message,260),d.now(),row.id);}
    }else if(status.status==='FAILED'){
      await d.run(env,"UPDATE soul_characters SET state='failed',error=?,updated_at=? WHERE id=?",clean(status.error||status.detail||'FAL training failed.',400),d.now(),row.id);
      await cleanupDataset(env,row,d);
    }
  }catch(error){
    await d.run(env,'UPDATE soul_characters SET error=?,updated_at=? WHERE id=?',clean(error.message||'FAL status check failed.',400),d.now(),row.id).catch(()=>{});
  }
  return d.first(env,'SELECT * FROM soul_characters WHERE id=?',row.id);
}

export async function listCharacters(env,owner,d){
  const active=await d.rows(env,"SELECT * FROM soul_characters WHERE owner_id=? AND state IN ('queued','training') ORDER BY created_at DESC",owner);
  for(const row of active)if(d.now()-row.last_poll>8000)await refreshOne(env,row,d);
  const list=await d.rows(env,'SELECT * FROM soul_characters WHERE owner_id=? ORDER BY created_at DESC LIMIT 20',owner);
  return list.map(view);
}
export async function createDataset(request,env,owner,d){
  const count=Number(request.headers.get('x-photo-count'));
  if(!Number.isInteger(count)||count<20||count>80)d.fail(400,'PV Soul needs 20 to 80 training photos.');
  if(request.headers.get('content-type')?.split(';')[0]!=='application/zip')d.fail(415,'Upload the prepared training set as a ZIP.');
  if((await d.first(env,'SELECT COUNT(*) AS n FROM soul_datasets WHERE owner_id=?',owner)).n>=4)d.fail(409,'Too many private training sets are pending. Finish or resolve the existing training first.');
  const bytes=await d.limitedBody(request,SOUL_MAX_DATASET);
  if(bytes.length<32||bytes[0]!==0x50||bytes[1]!==0x4b||bytes[2]!==0x03||bytes[3]!==0x04)d.fail(400,'Training set is not a valid ZIP archive.');
  const id=crypto.randomUUID(),objectKey=`${owner}/soul/datasets/${id}.zip`;
  await env.LAB_MEDIA.put(objectKey,bytes,{httpMetadata:{contentType:'application/zip'}});
  try{await d.run(env,'INSERT INTO soul_datasets(id,owner_id,object_key,bytes,photo_count,created_at) VALUES(?,?,?,?,?,?)',id,owner,objectKey,bytes.length,count,d.now());}
  catch(error){await env.LAB_MEDIA.delete(objectKey);throw error;}
  return {id,bytes:bytes.length,photoCount:count};
}
export async function createCharacter(request,env,owner,url,d){
  if(!env.FAL_KEY)d.fail(503,'FAL training is not configured on this Worker.');
  const data=await d.body(request);
  if(data.confirm!==true)d.fail(400,'Confirm the adult-consent and training-data rights check.');
  const name=clean(data.name,80);if(!name)d.fail(400,'Give the character a name.');
  if((await d.first(env,"SELECT COUNT(*) AS n FROM soul_characters WHERE owner_id=? AND state IN ('submitting','queued','training','uncertain')",owner)).n>=1)d.fail(409,'A PV Soul training is already active or unresolved.');
  if((await d.first(env,'SELECT COUNT(*) AS n FROM soul_characters WHERE owner_id=?',owner)).n>=20)d.fail(409,'Keep up to 20 trained characters.');
  const dataset=await d.first(env,'SELECT * FROM soul_datasets WHERE id=? AND owner_id=?',d.uid(data.datasetId),owner);if(!dataset)d.fail(404,'Training set not found. Upload it again.');
  const id=crypto.randomUUID(),slug=name.normalize('NFKD').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'').toLowerCase().slice(0,24)||'character',trigger='pv_'+slug+'_'+id.slice(0,6);
  await d.run(env,"INSERT INTO soul_characters(id,owner_id,name,trigger_word,state,dataset_id,created_at,updated_at) VALUES(?,?,?,?, 'submitting',?,?,?)",id,owner,name,trigger,dataset.id,d.now(),d.now());
  try{
    const datasetUrl=await signedUrl(env,url,'soul-dataset','/soul-dataset/',dataset.id,86400,d);
    const result=await falFetch(env,SOUL_TRAINER,{method:'POST',body:{image_data_url:datasetUrl,learning_rate:0.0005,steps:1000,default_caption:'photo of '+trigger},timeout:30000});
    const requestId=clean(result.request_id,160);
    if(!requestId||!/^[A-Za-z0-9_-]{12,160}$/.test(requestId))throw Object.assign(new Error('FAL did not return a usable request id.'),{definite:false});
    await d.run(env,"UPDATE soul_characters SET state='queued',fal_request_id=?,error='',updated_at=? WHERE id=?",requestId,d.now(),id);
  }catch(error){
    const state=error.definite===true?'failed':'uncertain',message=error.definite===true?clean(error.message,400):'Training submission status is uncertain. Check the FAL dashboard before starting another training.';
    await d.run(env,'UPDATE soul_characters SET state=?,error=?,updated_at=? WHERE id=?',state,message,d.now(),id);
    if(state==='failed')await cleanupDataset(env,{...dataset,dataset_id:dataset.id,owner_id:owner},d);
  }
  return view(await d.first(env,'SELECT * FROM soul_characters WHERE id=?',id));
}
export async function deleteCharacter(env,owner,id,d){
  const row=await d.first(env,'SELECT * FROM soul_characters WHERE id=? AND owner_id=?',d.uid(id),owner);
  if(!row)d.fail(404,'PV Soul character not found.');
  if(ACTIVE.has(row.state))d.fail(409,'Active or uncertain training cannot be deleted. Resolve it after checking FAL first.');
  if(row.lora_object_key)await env.LAB_MEDIA.delete(row.lora_object_key).catch(()=>{});
  await cleanupDataset(env,row,d);
  await d.run(env,'DELETE FROM soul_characters WHERE id=? AND owner_id=?',row.id,owner);
  return {ok:true};
}
export async function resolveCharacter(request,env,owner,id,d){
  const data=await d.body(request),row=await d.first(env,'SELECT * FROM soul_characters WHERE id=? AND owner_id=?',d.uid(id),owner);
  if(!row)d.fail(404,'PV Soul character not found.');
  if(row.state!=='uncertain'||data.confirm!==true)d.fail(409,'Confirm you checked the FAL dashboard first.');
  await d.run(env,"UPDATE soul_characters SET state='failed',error=?,updated_at=? WHERE id=?",'Owner resolved uncertain FAL submission after checking the provider.',d.now(),row.id);
  await cleanupDataset(env,row,d);return {ok:true};
}
export async function publicDataset(request,env,url,d){
  const id=d.uid(url.pathname.split('/')[2]);
  if(!await verifySigned(env,url,'soul-dataset',id,86400,d))d.fail(403,'Expired or invalid training-set link.');
  const row=await d.first(env,'SELECT * FROM soul_datasets WHERE id=?',id);if(!row)d.fail(404,'Training set not found.');
  const owner=await env.OWNER_DB.prepare("SELECT id FROM users WHERE id=? AND role='owner' AND auth_provider='clerk'").bind(row.owner_id).first();if(!owner)d.fail(403,'Access revoked.');
  const object=await env.LAB_MEDIA.get(row.object_key);if(!object)d.fail(404,'Training set unavailable.');
  return new Response(object.body,{headers:{'Content-Type':'application/zip','Content-Length':String(object.size),'Content-Disposition':'inline; filename="pv-soul-training.zip"'}});
}
export async function publicWeight(request,env,url,d){
  const id=d.uid(url.pathname.split('/')[2]);
  if(!await verifySigned(env,url,'soul-weight',id,21600,d))d.fail(403,'Expired or invalid weights link.');
  const row=await d.first(env,"SELECT * FROM soul_characters WHERE id=? AND state='ready'",id);if(!row?.lora_object_key)d.fail(404,'Weights not archived.');
  const owner=await env.OWNER_DB.prepare("SELECT id FROM users WHERE id=? AND role='owner' AND auth_provider='clerk'").bind(row.owner_id).first();if(!owner)d.fail(403,'Access revoked.');
  const object=request.method==='HEAD'?await env.LAB_MEDIA.head(row.lora_object_key):await env.LAB_MEDIA.get(row.lora_object_key);if(!object)d.fail(404,'Weights unavailable.');
  const headers={'Content-Type':'application/octet-stream','Content-Length':String(object.size),'Content-Disposition':'inline; filename="pv-soul-'+row.id+'.safetensors"','Cache-Control':'private, max-age=300'};
  return new Response(request.method==='HEAD'?null:object.body,{headers});
}
export async function readyCharacter(env,owner,id,d){
  let row=await d.first(env,'SELECT * FROM soul_characters WHERE id=? AND owner_id=?',d.uid(id),owner);
  if(!row)d.fail(404,'PV Soul character not found.');
  if(['queued','training'].includes(row.state)){row=await refreshOne(env,row,d);}
  if(row.state!=='ready'||(!row.lora_object_key&&!row.lora_source_url))d.fail(409,'This PV Soul character is not ready yet.');
  return row;
}
export async function weightUrl(env,url,row,d){
  if(row.lora_object_key)return signedUrl(env,url,'soul-weight','/soul-weight/',row.id,21600,d);
  return safeFalUrl(row.lora_source_url);
}
export async function maintenance(env,d){
  await d.run(env,"UPDATE soul_characters SET state='uncertain',error=?,updated_at=? WHERE state='submitting' AND updated_at<?",'Training submission was interrupted. Check the FAL dashboard before retrying.',d.now(),d.now()-120000);
  const pending=await d.rows(env,"SELECT * FROM soul_characters WHERE state IN ('queued','training') ORDER BY last_poll LIMIT 3");
  for(const row of pending){
    const owner=await env.OWNER_DB.prepare("SELECT id FROM users WHERE id=? AND role='owner' AND auth_provider='clerk'").bind(row.owner_id).first();
    if(owner)await refreshOne(env,row,d);
  }
  const archives=await d.rows(env,"SELECT * FROM soul_characters WHERE state='ready' AND lora_object_key IS NULL AND lora_source_url IS NOT NULL ORDER BY updated_at LIMIT 1");
  for(const row of archives)try{await archiveWeights(env,row,d);}catch(error){await d.run(env,'UPDATE soul_characters SET error=?,updated_at=? WHERE id=?','Weights ready; private archive retry pending: '+clean(error.message,260),d.now(),row.id);}
  const stale=await d.rows(env,'SELECT * FROM soul_datasets WHERE created_at<? ORDER BY created_at LIMIT 5',d.now()-3*86400000);
  for(const ds of stale){
    const linked=await d.first(env,"SELECT id FROM soul_characters WHERE dataset_id=? AND state IN ('submitting','queued','training','uncertain')",ds.id);if(linked)continue;
    await env.LAB_MEDIA.delete(ds.object_key).catch(()=>{});await d.run(env,'DELETE FROM soul_datasets WHERE id=?',ds.id).catch(()=>{});
  }
}
export function characterView(row){return view(row);}
