// Private, bounded multipart uploads. An assets row reserves archive capacity
// atomically before any media bytes are accepted. No jobs or wallet debits.
import {inspectUpscaleVideoRanges,VIDEO_UPSCALE_MAX_BYTES} from '../lab/video-upscale-metadata.js';
export const VIDEO_PART_BYTES=8*1024*1024;
export const VIDEO_UPLOAD_PENDING='application/x-pv-video-upload';
const sessionKey=(owner,id)=>owner+'/video-uploads/'+id+'.json';

export async function abandonVideoUpload(env,asset,{run}){
  const claimed=await run(env,'UPDATE assets SET mime=? WHERE id=? AND owner_id=? AND mime=?',VIDEO_UPLOAD_PENDING+'-aborting',asset.id,asset.owner_id,VIDEO_UPLOAD_PENDING);
  if(!claimed.meta.changes)return;
  const key=sessionKey(asset.owner_id,asset.id),object=await env.LAB_MEDIA.get(key);
  if(object){
    const session=await new Response(object.body).json();
    await env.LAB_MEDIA.resumeMultipartUpload(asset.object_key,session.uploadId).abort().catch(()=>{});
  }
  await env.LAB_MEDIA.delete(asset.object_key);
  await env.LAB_MEDIA.delete(key);
  await run(env,'DELETE FROM assets WHERE id=? AND owner_id=? AND mime=?',asset.id,asset.owner_id,VIDEO_UPLOAD_PENDING+'-aborting');
}

export async function videoSourceUploadRoute(request,env,owner,url,d){
  const {fail,first,run,rows,now,json,limitedBody}=d;
  if(request.method!=='POST')fail(405,'Use POST for video uploads.');
  if(!env.LAB_MEDIA.createMultipartUpload||!env.LAB_MEDIA.resumeMultipartUpload)fail(503,'Large video uploads are unavailable.');
  const readJson=async max=>{
    if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'Send JSON.');
    try{return JSON.parse(new TextDecoder().decode(await limitedBody(request,max)));}catch(e){if(e.status)throw e;fail(400,'Send valid upload details.');}
  };
  if(url.pathname==='/api/video-uploads'){
    const data=await readJson(32000),bytes=Number(data?.bytes),mime=data?.mime;
    if(!['video/mp4','video/quicktime'].includes(mime)||!Number.isSafeInteger(bytes)||bytes<128||bytes>VIDEO_UPSCALE_MAX_BYTES)
      fail(400,'Choose an MP4 or MOV up to 20 GB.');
    // Expired reservations cannot strand an account's archive capacity.
    const expired=await rows(env,'SELECT * FROM assets WHERE owner_id=? AND mime=? AND created_at<?',owner,VIDEO_UPLOAD_PENDING,now()-86400000);
    for(const asset of expired)await abandonVideoUpload(env,asset,d);
    const id=crypto.randomUUID(),key=owner+'/sources/'+id;
    const filename=String(data.filename||'source-video').replace(/[\r\n\x00-\x1f]/g,'').slice(0,180);
    const reserved=await run(env,"INSERT INTO assets(id,owner_id,object_key,kind,mime,filename,bytes,created_at) SELECT ?,?,?,'source',?,?,?,? WHERE (SELECT COALESCE(SUM(bytes),0) FROM assets WHERE owner_id=?)+?<=? AND (SELECT COUNT(*) FROM assets WHERE owner_id=? AND mime=?)<2",id,owner,key,VIDEO_UPLOAD_PENDING,filename,bytes,now(),owner,bytes,VIDEO_UPSCALE_MAX_BYTES,owner,VIDEO_UPLOAD_PENDING);
    if(!reserved.meta.changes)fail(413,'Your 20 GB private archive is full, or two video uploads are already in progress.');
    let upload;
    try{
      upload=await env.LAB_MEDIA.createMultipartUpload(key,{httpMetadata:{contentType:mime}});
      await env.LAB_MEDIA.put(sessionKey(owner,id),JSON.stringify({uploadId:upload.uploadId,mime,bytes,filename}),{httpMetadata:{contentType:'application/json'}});
    }catch(e){if(upload)await upload.abort().catch(()=>{});await run(env,'DELETE FROM assets WHERE id=? AND owner_id=? AND mime=?',id,owner,VIDEO_UPLOAD_PENDING);throw e;}
    return json({id,partBytes:VIDEO_PART_BYTES,maxBytes:VIDEO_UPSCALE_MAX_BYTES},201);
  }
  const match=url.pathname.match(/^\/api\/video-uploads\/([a-f\d-]{36})\/(part|complete|abort)(?:\/(\d+))?$/i);
  if(!match)fail(404,'Upload route not found.');
  const [,id,action,partText]=match;
  const asset=await first(env,"SELECT * FROM assets WHERE id=? AND owner_id=? AND kind='source'",id,owner);
  if(!asset)fail(404,'Video upload not found.');
  if(asset.mime!==VIDEO_UPLOAD_PENDING){
    if(action==='complete')return json({id,filename:asset.filename,bytes:asset.bytes},201);
    fail(409,'This upload is already complete.');
  }
  if(action==='abort'){await abandonVideoUpload(env,asset,d);return json({ok:true});}
  const saved=await env.LAB_MEDIA.get(sessionKey(owner,id));
  if(!saved)fail(409,'Upload details expired. Choose the video again.');
  const session=await new Response(saved.body).json();
  if(asset.created_at<now()-86400000)fail(409,'Upload expired. Choose the video again.');
  const upload=env.LAB_MEDIA.resumeMultipartUpload(asset.object_key,session.uploadId);
  const count=Math.ceil(asset.bytes/VIDEO_PART_BYTES);
  if(action==='part'){
    const part=Number(partText);
    if(!Number.isInteger(part)||part<1||part>count)fail(400,'Invalid upload part.');
    const expected=Math.min(VIDEO_PART_BYTES,asset.bytes-(part-1)*VIDEO_PART_BYTES);
    const bytes=await limitedBody(request,expected);
    if(bytes.length!==expected)fail(400,'Incomplete video part. Retry this part.');
    return json(await upload.uploadPart(part,bytes));
  }
  const data=await readJson(512*1024),parts=data?.parts;
  if(!Array.isArray(parts)||parts.length!==count||parts.some((p,i)=>p?.partNumber!==i+1||typeof p.etag!=='string'||!p.etag||p.etag.length>128))
    fail(400,'Video upload parts are incomplete or out of order.');
  let head=await env.LAB_MEDIA.head(asset.object_key);
  if(!head){await upload.complete(parts);head=await env.LAB_MEDIA.head(asset.object_key);}
  if(head?.size!==asset.bytes)fail(409,'The uploaded video size did not match the original.');
  try{
    await inspectUpscaleVideoRanges(asset.bytes,async(offset,length)=>{
      const object=await env.LAB_MEDIA.get(asset.object_key,{range:{offset,length}});
      if(!object)throw Error('Uploaded video is missing.');return object.arrayBuffer();
    });
  }catch(e){await abandonVideoUpload(env,asset,d);fail(400,String(e.message).slice(0,300));}
  const committed=await run(env,'UPDATE assets SET mime=? WHERE id=? AND owner_id=? AND mime=?',session.mime,id,owner,VIDEO_UPLOAD_PENDING);
  if(!committed.meta.changes)fail(409,'The video upload was cancelled before completion.');
  await env.LAB_MEDIA.delete(sessionKey(owner,id));
  return json({id,filename:asset.filename,bytes:asset.bytes},201);
}
