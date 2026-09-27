from pathlib import Path
import json, hashlib
changes=[]
def replace(s,a,b):
    assert s.count(a)==1, 'Expected one patch context: '+a[:180]
    changes.append([a,b])
    return s.replace(a,b,1)
def block(s,start,end,new):
    a=s.index(start); b=s.index(end,a)
    return replace(s,s[a:b],new)
p=Path('lab-worker/worker.mjs'); s=p.read_text()
s=replace(s,"export const VERSION = 'pv-lab-2026-09-27.1';","export const VERSION = 'pv-lab-2026-09-27.2';\nconst UPSCALER = 'spicyapi/image-upscaler-v1/upscale';")
s=replace(s,"  if(value.type==='image'){","""  if(value.type==='image'&&value.mode==='upscale'){
    if(!['2k','4k','8k'].includes(value.resolution)||!['jpeg','png','webp'].includes(value.outputFormat||'jpeg'))fail(400,'Choose 2K, 4K or 8K and JPEG, PNG or WebP.');
    return {type:'image',model:UPSCALER,mode:'upscale',prompt:'',resolution:value.resolution,aspectRatio:'auto',outputFormat:value.outputFormat||'jpeg',referenceRoles:[]};
  }
  if(value.type==='image'){""")
s=replace(s,"  if(p.type==='image'){\n    const refs=", """  if(p.type==='image'&&p.mode==='upscale'){
    primary=await source(env,owner,data.sourceId);p.referenceSourceIds=[];p.lastSourceId=null;
    input={resolution:p.resolution,output_format:p.outputFormat};
    if(url)input.image_url=await signedInput(env,url,primary.id);
  }else if(p.type==='image'){
    const refs=""")
s=replace(s,"if(Array.isArray(p.referenceSourceIds))for(const id of p.referenceSourceIds)if(UUID.test(id||''))ids.add(id);", "for(const key of ['referenceSourceIds','transferSourceIds'])if(Array.isArray(p[key]))for(const id of p[key])if(UUID.test(id||''))ids.add(id);")
s=replace(s,"    if(!p.prompt)fail(400,'Add a prompt before generating.');","    if(p.mode!=='upscale'&&!p.prompt)fail(400,'Add a prompt before generating.');")
s=replace(s,"    if(p.type==='image'&&p.referenceSourceIds.length)input.image_urls=await stageImageReferences(env,owner,p.referenceSourceIds,key);","""    if(p.type==='image'){
      const originals=p.mode==='upscale'?[primary.id]:p.referenceSourceIds;
      if(originals.length){
        const ids=data.transferSourceIds??originals;
        if(!Array.isArray(ids)||ids.length!==originals.length||new Set(ids).size!==ids.length)fail(400,'Working copies must match the original images in order.');
        const transfers=await sources(env,owner,ids);
        const originalsData=await sources(env,owner,originals);
        p.transferSourceIds=transfers.map(a=>a.id);
        p.transferNotes=transfers.map((a,i)=>a.id===originals[i]?'':originalsData[i].filename+': original '+(originalsData[i].bytes/1048576).toFixed(2)+' MiB; provider working copy '+(a.bytes/1048576).toFixed(2)+' MiB.').filter(Boolean);
        const uris=await stageImageReferences(env,owner,p.transferSourceIds,key);
        if(p.mode==='upscale')input.image_url=uris[0];else input.image_urls=uris;
      }
    }""")
s=replace(s,"'Seedream reference uploads must be JPG, PNG or WebP, at most 10 MiB each. Your original is unchanged. No generation was submitted.'","'SpicyAPI image uploads are limited to 10 MiB per file. Prepare a working copy in the Lab before requesting a price. Your original remains unchanged. No generation was submitted.'")
s=replace(s,"    for(const assetId of linkedSourceIds(q))await source(env,owner,assetId);","""    if(savedPayload.model===UPSCALER&&!FILE_URI.test(savedPayload.input?.image_url||''))fail(409,'Review a fresh upscale quote to verify the input file. Nothing was submitted.');
    for(const assetId of linkedSourceIds(q))await source(env,owner,assetId);""")
s=replace(s,"model:'Wan 3.0 / Seedream 5.0 Pro'","model:'Wan 3.0 / Seedream 5.0 Pro / Image Upscaler'")
s=block(s,'async function copyResult(env,j,url) {','// Stage original image bytes',r'''async function copyResult(env,j,url) {
  let target=safeVideoUrl(url),r;
  for(let i=0;i<4;i++){
    r=await fetch(target,{redirect:'manual',signal:AbortSignal.timeout(30000)});
    if(r.status>=300&&r.status<400){const next=r.headers.get('location');if(!next)throw new Error('No output location.');target=safeVideoUrl(new URL(next,target).href);continue;}break;
  }
  if(!r?.ok)throw new Error('Output download failed.');
  const params=JSON.parse(j.params),isImage=params.type==='image';
  const mime=(r.headers.get('content-type')||'').split(';')[0];
  if(isImage?!['image/png','image/jpeg','image/webp'].includes(mime):!['video/mp4','application/octet-stream'].includes(mime))throw new Error('Unexpected output format.');
  const finalMime=isImage?mime:'video/mp4',ext=isImage?({'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[mime]):'mp4';
  const limit=params.mode==='upscale'?256*1024*1024:isImage?MAX_IMAGE:MAX_VIDEO;
  const declared=Number(r.headers.get('content-length')||0);
  if(!Number.isSafeInteger(declared)||declared<0||declared>limit)throw new Error('Output exceeds the archive limit.');
  const stored=await first(env,'SELECT COALESCE(SUM(bytes),0) AS n FROM assets WHERE owner_id=?',j.owner_id);
  if(stored.n+(declared||limit)>MAX_STORAGE)throw new Error('Private archive storage limit reached.');
  const objectKey=`${j.owner_id}/results/${j.id}.${ext}`;let bytes=0;
  if(declared>0&&declared<=16*1024*1024||!env.LAB_MEDIA.createMultipartUpload){
    const buffer=await limitedBody(r,Math.min(limit,16*1024*1024));bytes=buffer.length;
    if(!bytes||isImage&&!sniff(buffer,mime))throw new Error('Invalid image output.');
    if(declared&&bytes!==declared)throw new Error('Incomplete output download.');
    await env.LAB_MEDIA.put(objectKey,buffer,{httpMetadata:{contentType:finalMime}});
  }else{
    const upload=await env.LAB_MEDIA.createMultipartUpload(objectKey,{httpMetadata:{contentType:finalMime}});
    const reader=r.body.getReader(),parts=[],prefix=new Uint8Array(12);let prefixUsed=0,verified=!isImage;
    let buffer=new Uint8Array(8*1024*1024),used=0,part=1;
    try{
      while(true){
        const item=await reader.read();if(item.done)break;
        const chunk=item.value;bytes+=chunk.length;if(bytes>limit)throw new Error('Output exceeds archive limit.');
        if(!verified){const n=Math.min(prefix.length-prefixUsed,chunk.length);prefix.set(chunk.subarray(0,n),prefixUsed);prefixUsed+=n;if(prefixUsed===12){if(!sniff(prefix,mime))throw new Error('Invalid image output.');verified=true;}}
        let offset=0;while(offset<chunk.length){const n=Math.min(buffer.length-used,chunk.length-offset);buffer.set(chunk.subarray(offset,offset+n),used);used+=n;offset+=n;if(used===buffer.length){parts.push(await upload.uploadPart(part++,buffer));used=0;}}
      }
      if(!bytes||!verified&&!sniff(prefix.subarray(0,prefixUsed),mime))throw new Error('Invalid or empty output.');
      if(declared&&bytes!==declared)throw new Error('Incomplete output download.');
      if(used)parts.push(await upload.uploadPart(part,buffer.slice(0,used)));
      await upload.complete(parts);
    }catch(e){await reader.cancel().catch(()=>{});await upload.abort().catch(()=>{});throw e;}
  }
  await env.LAB_DB.batch([
    stmt(env,'INSERT OR IGNORE INTO assets(id,owner_id,object_key,kind,mime,filename,bytes,created_at) VALUES(?,?,?,?,?,?,?,?)',j.id,j.owner_id,objectKey,isImage?'source':'video',finalMime,'parallel-vision-'+j.id+'.'+ext,bytes,now()),
    stmt(env,"UPDATE jobs SET state='completed',output_id=?,remote_url=NULL,error='',updated_at=? WHERE id=?",j.id,now(),j.id)
  ]);
}
''')
p.write_text(s)
Path('.lab-worker-replacements.json').write_text(json.dumps(changes))
print('WORKER_SHA256',hashlib.sha256(s.encode()).hexdigest())
changes=[]
p=Path('lab/lab.js');s=p.read_text()
s="import { PROVIDER_IMAGE_LIMIT, UPSCALE_PIXELS, imageDimensions, providerWorkingCopy } from './image-tools.js?v=20260927-2';\n"+s
s=replace(s,'const downloadUrls=new Set();','const downloadUrls=new Set();\nconst workingCopies=new Map();\nlet sourcePixels=0;')
s=replace(s,"function settings(){if(tool==='image')", "function settings(){if(tool==='upscale')return {type:'image',mode:'upscale',prompt:'',resolution:$('resolution').value,aspectRatio:'auto',outputFormat:$('output-format').value,referenceRoles:[]};if(tool==='image')")
s=replace(s,"function hasInput(){return tool==='image'?", "function hasInput(){if(tool==='upscale')return !!file;return tool==='image'?")
s=replace(s,"!current.prompt||busy||submissionBlocked()","(tool!=='upscale'&&!current.prompt)||busy||submissionBlocked()")
s=replace(s,"$('generate').textContent=config.enabled?'Review price & generate':'Connect generation provider'","$('generate').textContent=config.enabled?(tool==='upscale'?'Review price & upscale':'Review price & generate'):'Connect generation provider'")
s=replace(s,"p.type==='image'?`Image / ${p.resolution.toUpperCase()} / ${ratio}`","p.type==='image'?`${p.mode==='upscale'?'Upscale':'Image'} / ${p.resolution.toUpperCase()} / ${ratio}`")
s=block(s,'function setTool(value){',"$('tool-image').onclick",r'''function setTool(value){
  tool=['image','upscale'].includes(value)?value:'video';const image=tool==='image',upscale=tool==='upscale',video=tool==='video';
  for(const name of ['image','video','upscale']){$('tool-'+name).classList.toggle('active',tool===name);$('tool-'+name).setAttribute('aria-pressed',String(tool===name));}
  $('video-modes').hidden=!video;$('duration-control').hidden=!video;$('video-utilities').hidden=!video;$('format-control').hidden=video;
  $('start-mode').hidden=image||video&&mode!=='start';$('reference-mode').hidden=upscale||video&&mode!=='reference';
  $('last-upload').hidden=upscale;$('start-label').textContent=upscale?'Image to upscale':'Start frame';
  $('upscale-info').hidden=!upscale;$('prompt').hidden=upscale;$('prompt-label').hidden=upscale;$('ratio').parentElement.hidden=upscale;
  $('mode-heading').textContent=upscale?'03 / Image Upscale':image?'02 / Text to Image + Reference Edit':'01 / Image to Video';
  $('engine-name').textContent=upscale?'IMAGE UPSCALER':image?'SEEDREAM 5.0 PRO':'WAN 3.0';
  $('prompt-label').textContent=image?'Image direction':'Motion direction';$('prompt').maxLength=image?5000:6000;
  $('prompt').placeholder=image?'Describe the image. Add references for identity, wardrobe, a room or an object, or start with text only.':'One clear action, one camera move, light, atmosphere and sound.';
  options('resolution',upscale?['2k','4k','8k']:image?['1k','2k']:['480p','720p','1080p'],upscale?'4k':image?'2k':'1080p');
  options('output-format',upscale?['jpeg','png','webp']:['jpeg','png'],'jpeg');
  options('ratio',image?['auto','1:1','4:3','3:4','16:9','9:16','3:2','2:3','4:5','5:4','21:9','9:21','2:1','1:2','3:1','1:3']:['auto','16:9','9:16','1:1','4:3','3:4'],image?'1:1':'auto');
  resetPreview();update();
}
$('tool-upscale').onclick=()=>{if(!busy)setTool('upscale');};
''')
s=replace(s,"const item=tool==='video'&&mode==='start'?","const item=(tool==='upscale'||tool==='video'&&mode==='start')?")
s=replace(s,"function clearMedia(){imageRevision++;","function clearMedia(){imageRevision++;sourcePixels=0;")
s=replace(s,"sourceId=id;sourceUrl=item.url;","sourceId=id;sourceUrl=item.url;sourcePixels=item.width*item.height;")
s=replace(s,"Math.max(probe.naturalWidth,probe.naturalHeight)>8000","Math.max(probe.naturalWidth,probe.naturalHeight)>(tool==='upscale'?16000:8000)||probe.naturalWidth*probe.naturalHeight>72000000")
s=replace(s,"throw new Error('Use an image 240 to 8000 pixels per side, with an aspect ratio no wider than 8:1.');","throw new Error('Use an image at least 240 pixels per side, no wider than 8:1, up to '+(tool==='upscale'?'16,000 pixels per side and 72 megapixels.':'8,000 pixels per side.'));")
s=replace(s,"$('start-mode').hidden=mode!=='start';$('reference-mode').hidden=mode!=='reference';resetPreview();update();}","$('start-mode').hidden=tool==='image'||tool==='video'&&mode!=='start';$('reference-mode').hidden=tool==='upscale'||tool==='video'&&mode!=='reference';resetPreview();update();}")
s=replace(s,"async function ensureInputs(){if(tool==='image'", "async function ensureInputs(){if(tool==='upscale')return {sourceId:await ensureSource(),lastSourceId:null,referenceSourceIds:[]};if(tool==='image'")
s=replace(s,"Video + Image · Live quotes before payment","Video + Image + Upscale · Live quotes before payment")
s=replace(s,"===tool).length>=limitFor(tool)","===(tool==='upscale'?'image':tool)).length>=limitFor(tool==='upscale'?'image':tool)")
s=replace(s,"setTool(p.type||'video');setMode(p.mode||'start');","setTool(p.mode==='upscale'?'upscale':p.type||'video');setMode(p.mode||'start');")
s=replace(s,"const inputs=await ensureInputs();notify('Requesting a live price. No generation submitted.');","const inputs=await prepareQuoteInputs(await ensureInputs());if(!inputs)return;notify('Requesting a live price. No generation submitted.');")
s=replace(s,"$('quote-settings').textContent=isImage?", "$('quote-settings').textContent=q.settings.mode==='upscale'?`Image Upscaler / ${q.settings.resolution.toUpperCase()} / ${q.settings.outputFormat.toUpperCase()} / source ratio kept`:isImage?")
s=replace(s,"$('quote-expiry').textContent='Valid until '+new Date(q.expiresAt).toLocaleTimeString()+'. No automatic repricing.';","$('quote-expiry').textContent='Valid until '+new Date(q.expiresAt).toLocaleTimeString()+'. No automatic repricing. '+(q.settings.transferNotes||[]).join(' ');")
s=replace(s,"image?'IMAGE':j.settings.duration+'s'", "image?(j.settings.mode==='upscale'?'UPSCALE':'IMAGE'):j.settings.duration+'s'")
s=replace(s,"j.settings.prompt||'No direction saved.'","j.settings.prompt||(j.settings.mode==='upscale'?'Image upscale / '+j.settings.resolution.toUpperCase():'No direction saved.')")
s=replace(s,"if(ready&&image)actions.append(button('Use in Video',()=>animateImage(j)));","if(ready&&image){actions.append(button('Upscale',()=>upscaleImage(j)));actions.append(button('Use in Video',()=>animateImage(j)));}")
s=replace(s,"    body.append(meta,p,actions,cost);","    body.append(meta,p,actions,cost);if(j.settings.transferNotes?.length){const note=document.createElement('p');note.className='fine history-error';note.textContent=j.settings.transferNotes.join(' ');body.append(note);}")
s=replace(s,"function lock(){epoch++;autoPreview=null;","function lock(){epoch++;workingCopies.clear();autoPreview=null;")
helper=r'''
async function prepareQuoteInputs(inputs){
  if(tool==='video')return inputs;
  const sessionEpoch=epoch;
  if(tool==='upscale'&&sourcePixels>UPSCALE_PIXELS[$('resolution').value]&&!confirm('This size tier is smaller than your source and would reduce its resolution. Continue with this tier?'))return null;
  const originals=tool==='upscale'?[{id:inputs.sourceId,file}]:references;
  const oversized=originals.filter(r=>r.file.size>PROVIDER_IMAGE_LIMIT);
  if(oversized.length&&!confirm('SpicyAPI limits uploads to 10 MiB per image. Prepare a compressed WebP working copy for '+oversized.length+' oversized image(s)? Pixel dimensions and transparency are kept, but compression can affect fine detail and metadata. The originals stay unchanged in your private archive.')){notify('Preparation cancelled. No generation was submitted.');return null;}
  const transferSourceIds=[];
  for(const item of originals){
    if(item.file.size<=PROVIDER_IMAGE_LIMIT){transferSourceIds.push(item.id);continue;}
    let copy=workingCopies.get(item.id);
    if(!copy||Date.now()-copy.at>900000){
      notify('Preparing a same-dimension working copy of '+item.file.name+'…');
      const prepared=await providerWorkingCopy(item.file);
      if(epoch!==sessionEpoch||!owner)throw new Error('Session changed.');
      const id=await uploadAsset(prepared);copy={id,at:Date.now()};workingCopies.set(item.id,copy);
    }
    transferSourceIds.push(copy.id);
  }
  if(epoch!==sessionEpoch||!owner)throw new Error('Session changed.');
  return {...inputs,transferSourceIds};
}
async function upscaleImage(job){
  if(!hasResult(job)||job.settings.type!=='image')throw new Error('Choose a completed image first.');
  clearMedia();setTool('upscale');
  await setImage(await assetFile(job.outputId,'image-to-upscale'),job.outputId);
  update();notify('Image loaded for upscaling. Choose the size and review the price; nothing has been submitted.');
  window.scrollTo({top:0,behavior:'smooth'});
}
'''
s=replace(s,"async function animateImage(job){",helper+"\nasync function animateImage(job){")
p.write_text(s)
p=Path('lab/index.html');s=p.read_text()
s=replace(s,'./lab.js?v=20260927-1','./lab.js?v=20260927-2')
s=replace(s,'./history.css?v=20260926-5','./history.css?v=20260927-2')
s=replace(s,'Image <small>Seedream 5.0 Pro</small></button></nav>','Image <small>Seedream 5.0 Pro</small></button><button id="tool-upscale" class="tool-tab" type="button" aria-pressed="false">Upscale <small>Image Upscaler</small></button></nav>')
s=replace(s,'<div id="start-mode" class="mode-panel">','<p id="upscale-info" class="fine upscale-info" hidden>Enlarge an existing image without writing a prompt. 2K, 4K and 8K are approximately 4, 17 and 67 megapixels, with the source ratio kept. Bigger is not automatically more realistic. Choose a tier above your source size. A live price is shown before payment.</p>\n<div id="start-mode" class="mode-panel">')
s=replace(s,'<span class="label">Start frame</span>','<span class="label" id="start-label">Start frame</span>')
s=replace(s,'<div class="upload-block">\n<div class="upload-heading"><span class="label">Last frame</span>','<div class="upload-block" id="last-upload">\n<div class="upload-heading"><span class="label">Last frame</span>')
s=replace(s,'A live quote appears before any paid generation. Saving history does not generate a video.','A live quote appears before any paid generation or upscale. Inputs over 10 MiB need a working copy for the image provider; the Lab asks first and keeps the original. Saving history is free of generation charges.')
s=replace(s,'Your existing provider key is used for both;','Image Upscaler enlarges a finished image. Your existing provider key is used for all three;')
p.write_text(s)
p=Path('lab/history.css');s=p.read_text();s+='\n/* The added tab stays within the existing responsive workbench. */\n.tool-switch{flex-wrap:wrap}.tool-tab{min-width:0}.upscale-info{margin:0 0 20px;font-size:11px}.frame-pair:has(#last-upload[hidden]){grid-template-columns:1fr}\n@media(max-width:560px){.tool-tab{flex:1 1 30%;display:block;text-align:left;padding:12px 10px}.tool-tab small{display:block;margin-top:4px;font-size:8px}}\n';p.write_text(s)
p=Path('lab/README.md');s=p.read_text();s+='''

## Image upscaler and working copies (2026-09-27)

Upscale uses `spicyapi/image-upscaler-v1/upscale`, not Topaz. It has no content prompt or invented realism controls. Select 2K/4K/8K (about 4/17/67 megapixels) and JPEG/PNG/WebP. It shares the four-image concurrency limit and the existing live quote, confirmed payment, private result archive, download and reuse flow. The original source remains separate from the output. A smaller size tier warns before submission.

SpicyAPI uploads are limited to 10 MiB. The Lab still accepts original uploads up to its existing 20 MiB limit. Before an oversized image is sent to the image provider, the browser asks permission to prepare a compressed WebP working copy at the same dimensions, retaining transparency. Fine detail and metadata may change from compression. The original is retained in R2 and History; transfer asset IDs and original/copy byte sizes are stored in the job. Reuse restores the original and settings. Declining or failing preparation never creates a paid task. No provider limits or safety systems are bypassed. A paid quote is requested only after all input files are prepared.

Upscale output archiving supports up to 256 MiB using bounded multipart uploads; the private archive remains capped at 2 GiB. No schema migration, added subscription, credential change or new storage bucket is required.

Primary schema references checked on 2026-09-27: https://spicyapi.ai/models/image-upscaler-v1 and https://docs.spicyapi.ai/docs/sdk . Live account quotes remain the pricing authority. Quality was not verified by a paid generation during installation.
''';p.write_text(s)
# Extend the existing mocked provider; these tests never contact a generation service.
p=Path('tests/lab-worker.test.mjs');s=p.read_text();s=replace(s,"quotedRequest?.model?.includes('seedream')?","(quotedRequest?.model?.includes('seedream')||quotedRequest?.model?.includes('image-upscaler'))?")
s+=r'''
const upscaleSettings={type:'image',mode:'upscale',resolution:'4k',outputFormat:'png'};
test('Upscale quotes require one source but no prompt; completed image retains original and safe reuse',async()=>{
 createMode='ok';createCount=0;providerState='queued';const{env}=fixture(),id=await setup(env);
 const missing=await req(env,'/api/quotes',{method:'POST',data:{settings:upscaleSettings}});assert.equal(missing.status,400);
 const qres=await req(env,'/api/quotes',{method:'POST',data:{sourceId:id,settings:upscaleSettings}});assert.equal(qres.status,200);const q=await qres.json();
 assert.equal(quotedRequest.model,'spicyapi/image-upscaler-v1/upscale');assert.equal(quotedRequest.input.image_url,'spicy://f/fil_synthetic_reference');assert.equal(quotedRequest.input.prompt,undefined);assert.equal(quotedRequest.input.aspect_ratio,undefined);assert.equal(createCount,0);
 const job=(await(await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})).json()).job;
 providerState='succeeded';const done=(await(await req(env,'/api/jobs/'+job.id)).json()).job;assert.equal(done.status,'completed');assert.equal(done.settings.mode,'upscale');assert.equal(done.sourceId,id);assert.notEqual(done.outputId,id);
 assert.equal((await req(env,'/api/assets/'+done.outputId)).headers.get('content-type'),'image/png');
 const reuse=await req(env,'/api/drafts',{method:'POST',data:{sourceId:done.sourceId,settings:done.settings}});assert.equal(reuse.status,201);assert.equal(createCount,1);
 assert.equal((await req(env,'/api/quotes',{method:'POST',authToken:guest,data:{sourceId:id,settings:upscaleSettings}})).status,403);
});
test('Upscale rejects invented presets and unsupported formats without buying a task',async()=>{
 const{env}=fixture(),id=await setup(env);createCount=0;
 for(const bad of [{...upscaleSettings,resolution:'16k'},{...upscaleSettings,outputFormat:'exe'}])assert.equal((await req(env,'/api/quotes',{method:'POST',data:{sourceId:id,settings:bad}})).status,400);
 assert.equal(createCount,0);
});
test('Oversized originals can use a separately-owned working copy while preserving original history pointers',async()=>{
 const{env}=fixture(),copyId=await setup(env);createCount=0;createMode='ok';providerState='queued';
 const bytes=new Uint8Array(11*1024*1024);bytes.set([137,80,78,71,13,10,26,10]);
 const upload=await req(env,'/api/uploads',{method:'POST',raw:bytes,headers:{'Content-Type':'image/png','X-Filename':'large-source.png'}});assert.equal(upload.status,201);const id=(await upload.json()).id;
 const blocked=await req(env,'/api/quotes',{method:'POST',data:{referenceSourceIds:[id],settings:imageSettings}});assert.equal(blocked.status,400);assert.equal(createCount,0);
 const r=await req(env,'/api/quotes',{method:'POST',data:{referenceSourceIds:[id],transferSourceIds:[copyId],settings:imageSettings}});assert.equal(r.status,200);const q=await r.json();assert.deepEqual(q.settings.referenceSourceIds,[id]);assert.deepEqual(q.settings.transferSourceIds,[copyId]);assert.match(q.settings.transferNotes[0],/11.00 MiB/);
 const j=(await(await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})).json()).job;assert.equal(j.sourceId,id);assert.equal(createCount,1);
 assert.equal((await req(env,'/api/assets/'+id)).headers.get('content-length'),String(bytes.length));
 const wrong=await req(env,'/api/quotes',{method:'POST',data:{referenceSourceIds:[id],transferSourceIds:[crypto.randomUUID()],settings:imageSettings}});assert.equal(wrong.status,404);
 const mismatch=await req(env,'/api/quotes',{method:'POST',data:{referenceSourceIds:[id],transferSourceIds:[],settings:imageSettings}});assert.equal(mismatch.status,400);
});
''';p.write_text(s)
print('Patched only Lab UI, Lab worker, helper documentation and mocked tests.')
