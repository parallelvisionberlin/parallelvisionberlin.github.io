from pathlib import Path
from hashlib import sha1
root=Path('.')
for name,expected in [('lab-worker/worker.mjs','2f19bdba368f9af484333b5e9b18e44146dd24c9'),('lab/lab.js','c43d816b80b3d1e5cd0d288c2ab54a3d3ba117b4'),('lab/index.html','7f8b39b139d364dadc02923ac1c88b1461656a20')]:
 b=(root/name).read_bytes();assert sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==expected,'Source changed: '+name

def replace(s,old,new):
 if old not in s: raise ValueError('missing: '+old[:170])
 return s.replace(old,new)
p=root/'lab-worker/worker.mjs';s=p.read_text()
s=replace(s,"export const VERSION = 'pv-lab-2026-09-27.3-billing1';", "import {seedanceParameters, prepareSeedance, REFERENCE_MIME, sniffReference} from './seedance.mjs';\nexport const VERSION = 'pv-lab-2026-09-27.4-seedance-standard';")
s=replace(s,"model:'Wan 3.0 / Seedream 5.0 Pro / Image Upscaler',", "videoEngines:['wan','seedance'],model:'Wan 3.0 / Seedance 2.5 / Seedream 5.0 Pro / Image Upscaler',")
s=replace(s,'function referenceLabels(value) {','function referenceLabels(value,max=10) {')
s=replace(s,"value.length>10)fail(400,'Use up to ten reference labels.');", "value.length>max)fail(400,'Use up to '+max+' reference labels.');")
s=replace(s,"  const prompt=typeof value.prompt==='string'?value.prompt.trim():'';\n  const referenceRoles=referenceLabels(value.referenceRoles);", "  if(value.type!=='image'&&value.engine==='seedance')return seedanceParameters(value,{fail,referenceLabels});\n  if(value.engine&&value.engine!=='wan'&&value.type!=='image')fail(400,'Unknown video model.');\n  const prompt=typeof value.prompt==='string'?value.prompt.trim():'';\n  const referenceRoles=referenceLabels(value.referenceRoles);")
s=replace(s,"  const prompt=[p.prompt,...labels].join('\\n');\n  if(prompt.length>(p.type==='image'?5000:6000))", "  if(p.engine==='seedance')for(let i=0;i<labels.length;i++)labels[i]=labels[i].replace(/^Reference (\\d+)/,'@Image$1');\n  const mediaLabels=p.engine==='seedance'?['referenceVideos','referenceAudio'].flatMap((key,k)=>(p[key]||[]).slice(0,p[k===0?'referenceVideoIds':'referenceAudioIds']?.length||0).map((r,i)=>'@'+(k===0?'Video':'Audio')+(i+1)+(r.name?' ('+r.name+')':'')+(r.note?': '+r.note:''))):[];\n  const prompt=[p.prompt,...labels,...mediaLabels].join('\\n');\n  if(prompt.length>(p.type==='image'||p.engine==='seedance'?5000:6000))")
s=replace(s,'  let primary=null,input;\n  if(p.type', "  if(p.engine==='seedance'){\n    const prepared=await prepareSeedance(env,owner,data,p,url,{fail,source,sources,signedInput});\n    if(p.prompt)prepared.input.prompt=assembledPrompt(p);return prepared;\n  }\n  let primary=null,input;\n  if(p.type")
s=replace(s,'async function sources(env,owner,ids) {','async function sources(env,owner,ids,max=10) {')
s=replace(s,"ids.length>10)fail(400,'Reference mode needs 1 to 10 images.');", "ids.length>max)fail(400,'Reference mode needs 1 to '+max+' images.');")
s=replace(s,"for(const key of ['referenceSourceIds','transferSourceIds'])", "for(const key of ['referenceSourceIds','transferSourceIds','referenceVideoIds','referenceAudioIds'])")
s=replace(s,"const list=await sources(env,owner,data.referenceSourceIds),labels=referenceLabels(data.referenceRoles);", "const max=data.engine==='seedance'?30:10;const list=await sources(env,owner,data.referenceSourceIds,max),labels=referenceLabels(data.referenceRoles,max);\n    if(list.some(a=>!a.mime.startsWith('image/')))fail(400,'Reference packs contain images only.');")
marker="  if(path==='/api/uploads'&&method==='POST') {"
media='''  if(path==='/api/reference-uploads'&&method==='POST') {
    const mime=request.headers.get('content-type')?.split(';')[0];
    if(!REFERENCE_MIME.has(mime))fail(415,'Choose an MP4/MOV video or MP3/WAV audio reference.');
    const bytes=await limitedBody(request,mime.startsWith('audio/')?15*1024*1024:MAX_IMAGE);
    if(!bytes.length||!sniffReference(bytes,mime))fail(400,'Reference file contents do not match the selected media type.');
    const usage=await first(env,'SELECT COALESCE(SUM(bytes),0) AS n,COUNT(*) AS count FROM assets WHERE owner_id=?',owner);
    if(usage.n+bytes.length>MAX_STORAGE||usage.count>=1000)fail(413,'Private archive limit reached.');
    const id=crypto.randomUUID(),objectKey=`${owner}/sources/${id}`;let filename='reference';
    try{filename=decodeURIComponent(request.headers.get('x-filename')||filename).replace(/[\\r\\n\\x00-\\x1f]/g,'').slice(0,180);}catch{}
    await env.LAB_MEDIA.put(objectKey,bytes,{httpMetadata:{contentType:mime}});
    try{await run(env,"INSERT INTO assets(id,owner_id,object_key,kind,mime,filename,bytes,created_at) VALUES(?,?,?,'source',?,?,?,?)",id,owner,objectKey,mime,filename,bytes.length,now());}catch(e){await env.LAB_MEDIA.delete(objectKey);throw e;}
    return json({id,filename,bytes:bytes.length},201);
  }
'''
s=replace(s,marker,media+marker);p.write_text(s)
p=root/'lab/index.html';s=p.read_text();s=replace(s,'20260927-upscale-oneclick1','20260927-seedance-standard1')
s=replace(s,'<small>Wan 3.0</small>','<small>Wan / Seedance</small>')
s=replace(s,'<div id="video-modes"', '''<div id="video-model-control"><label><span class="label">Video model</span><select id="video-engine"><option value="wan">Wan 3.0</option><option value="seedance" disabled>Seedance 2.5</option></select></label><p id="video-model-note" class="fine">Standard model access. Provider policies and model refusals apply. No automatic model switching.</p></div>
<div id="video-modes"''')
s=replace(s,'<button id="mode-start"', '<button id="mode-text" class="mode-tab" type="button" role="tab" aria-selected="false" hidden>Text to Video</button>\n<button id="mode-start"')
s=replace(s,'<p class="fine compact-fine" id="reference-help">','''<div id="reference-media" hidden>
<div class="upload-heading"><span class="label">Video references</span><span class="micro" id="video-ref-count">0 / 10 · 0 / 30s</span></div>
<label class="drop compact-drop"><span>Add motion or camera references</span><small>MP4 / MOV · 20 MiB each · 2 to 30 seconds</small><input id="video-references" type="file" multiple accept="video/mp4,video/quicktime"></label>
<div id="video-reference-list" class="reference-media-list"></div>
<div class="upload-heading"><span class="label">Audio references</span><span class="micro" id="audio-ref-count">0 / 10 · 0 / 30s</span></div>
<label class="drop compact-drop"><span>Add sound or music references</span><small>MP3 / WAV · 15 MiB each · 2 to 30 seconds</small><input id="audio-references" type="file" multiple accept="audio/mpeg,audio/wav,audio/x-wav"></label>
<div id="audio-reference-list" class="reference-media-list"></div>
<p class="fine">Up to 30 seconds combined per media type. Video references may add billable seconds; the live quote controls the maximum charge. History and Reuse retain every reference. Named packs below save images only.</p>
</div>
<p class="fine compact-fine" id="reference-help">''')
s=replace(s,'Wan 3.0 handles video.','Wan 3.0 and Seedance 2.5 handle video.');s=replace(s,'used for all three.', 'used for these tools.')
s=replace(s,'<link rel="stylesheet" href="./history.css?v=20260927-2">', '<link rel="stylesheet" href="./history.css?v=20260927-2">\n<link rel="stylesheet" href="./seedance.css?v=20260927-standard1">')
p.write_text(s)
p=root/'lab/lab.js';s=p.read_text();s="import {VIDEO_MODELS,engineFor,videoLabel} from './video-models.js?v=20260927-standard1';\nimport {createMediaReferences} from './media-references.js?v=20260927-standard1';\n"+s
s=replace(s,"let tool='video',", "let engine='wan';\nlet tool='video',")
s=replace(s,"return {type:'video',mode,prompt:", "return {type:'video',engine,mode,referenceVideos:mode==='reference'?mediaRefs.labels('video'):[],referenceAudio:mode==='reference'?mediaRefs.labels('audio'):[],prompt:")
s=replace(s,"return tool==='image'?!!$('prompt').value.trim():mode==='start'?!!file:references.length>0;", "return tool==='image'||mode==='text'?!!$('prompt').value.trim():mode==='start'?!!file:references.length>0||(engine==='seedance'&&mediaRefs.count()>0);")
s=replace(s,"(!file&&!lastFile&&!references.length&&!resultUrl)||busy", "(!file&&!lastFile&&!references.length&&!mediaRefs.count()&&!resultUrl&&!$('prompt').value.trim())||busy")
s=replace(s,"  resetPreview();update();\n}\n$('tool-upscale')", "  configureVideoControls();resetPreview();update();\n}\n$('tool-upscale')")
s=replace(s,"function clearMedia(){cancelImagePreparation();", "function clearMedia(){mediaRefs.clear();cancelImagePreparation();")
s=replace(s,"const maxSide=tool==='upscale'?16000:8000;", "const seedanceInput=tool==='video'&&engine==='seedance',maxSide=tool==='upscale'?16000:seedanceInput?6000:8000;")
s=replace(s,"if(Math.min(width,height)<240||Math.max(width,height)>maxSide||Math.max(width/height,height/width)>8)", "if(Math.min(width,height)<(seedanceInput?300:240)||Math.max(width,height)>maxSide||Math.max(width/height,height/width)>(seedanceInput?2.5:8))")
s=replace(s,"at least 240 pixels per side, no wider than 8:1, up to ","within the model dimensions and aspect ratio, up to ")
s=replace(s,"`${references.length} / 10`", "`${references.length} / ${referenceLimit()}`")
s=replace(s,"references.length+incoming.length>10)throw new Error('Reference mode supports up to 10 images.');", "references.length+incoming.length>referenceLimit())throw new Error('This mode supports up to '+referenceLimit()+' image references.');")
a=s.index('function setMode(');b=s.index('async function uploadAsset',a)
s=s[:a]+'''function referenceLimit(){return tool==='video'?VIDEO_MODELS[engine].maxImages:10;}
function configureVideoControls(){
  const isVideo=tool==='video',model=VIDEO_MODELS[engine],sd=engine==='seedance';
  $('video-model-control').hidden=!isVideo;$('video-engine').value=engine;
  if(!model.modes.includes(mode))mode='start';
  $('mode-text').hidden=!isVideo||!sd;
  for(const m of ['start','reference','text']){$('mode-'+m).classList.toggle('active',mode===m);$('mode-'+m).setAttribute('aria-selected',String(mode===m));}
  $('start-mode').hidden=tool==='image'||isVideo&&mode!=='start';$('reference-mode').hidden=tool==='upscale'||isVideo&&mode!=='reference';
  $('reference-media').hidden=!isVideo||!sd||mode!=='reference';
  $('start-frame-maker').hidden=!isVideo||mode!=='reference'||sd;
  if(isVideo){
    const ratio=$('ratio').value,duration=Number($('duration').value)||15;
    options('ratio',sd&&mode==='start'?['auto']:model.ratios,sd&&mode==='start'?'auto':model.ratios.includes(ratio)?ratio:'auto');
    $('ratio').parentElement.hidden=sd&&mode==='start';
    $('duration').replaceChildren(...(sd?Array.from({length:27},(_,i)=>i+4):[5,10,15,30]).map(n=>new Option(n+' sec',String(n))));
    if(duration>=model.minSeconds&&duration<=30&&!([...$('duration').options].some(o=>Number(o.value)===duration)))$('duration').add(new Option(duration+' sec',String(duration)));
    $('duration').value=duration>=model.minSeconds&&duration<=30?duration:5;
    $('engine-name').textContent=model.label.toUpperCase();
    $('mode-heading').textContent='01 / '+(mode==='text'?'Text to Video':mode==='reference'?'Reference to Video':'Image to Video');
    $('prompt').maxLength=sd?5000:6000;
    $('prompt-label').textContent=mode==='text'?'Scene direction':'Motion direction';
    $('video-model-note').textContent=sd?'Seedance 2.5 Standard / 4–30s / up to 1080p. Start frame follows your image ratio. Reference mode supports image, video and audio guidance. Provider policies and refusals remain in force.':'Wan 3.0 / Start frame or image references. Provider policies and model refusals apply.';
  }
  $('reference-drop').querySelector('small').textContent='Up to '+referenceLimit()+' images';
  $('ref-count').textContent=references.length+' / '+referenceLimit();
}
function setMode(nextMode){mode=VIDEO_MODELS[engine].modes.includes(nextMode)?nextMode:'start';configureVideoControls();resetPreview();update();}
$('mode-text').onclick=()=>{if(!busy)setMode('text');};
$('video-engine').onchange=()=>{
  if(busy)return;
  const requested=$('video-engine').value;
  if(!Object.hasOwn(VIDEO_MODELS,requested)||requested==='seedance'&&!config.videoEngines?.includes('seedance')){$('video-engine').value=engine;notify('The backend has not enabled this model yet.',true);return;}
  if(references.length>VIDEO_MODELS[requested].maxImages){$('video-engine').value=engine;notify('Remove excess references or save an image pack before choosing this model.',true);return;}
  if(requested!=='seedance'&&mediaRefs.count()){$('video-engine').value=engine;notify('Remove video/audio references before changing to Wan. Your inputs have been kept.',true);return;}
  engine=requested;currentQuote=null;if($('quote-dialog').open)$('quote-dialog').close();
  if(engine==='seedance'){$('duration').value='5';$('resolution').value='720p';}
  configureVideoControls();resetPreview();update();
};
const mediaRefs=createMediaReferences({element:$,owner:()=>owner,busy:()=>busy,epoch:()=>epoch,action,changed:()=>{autoPreview=null;update();},
  upload:async snapshot=>(await api('/api/reference-uploads',{method:'POST',headers:{'Content-Type':snapshot.type,'X-Filename':encodeURIComponent(snapshot.name||'reference')},body:snapshot})).id,assetFile});
''' +s[b:]
s=replace(s,"async function ensureInputs(){if(tool==='upscale')", "async function ensureInputs(){if(tool==='video'&&engine==='seedance'){if(mode==='text')return {sourceId:null,lastSourceId:null,referenceSourceIds:[],referenceVideoIds:[],referenceAudioIds:[]};if(mode==='reference'){const ids=references.length?await ensureReferences():[];return {sourceId:ids[0]||null,lastSourceId:null,referenceSourceIds:ids,...await mediaRefs.inputs()};}}if(tool==='upscale')")
s=replace(s,"function applyConfig(c){config=c;", "function applyConfig(c){config=c;$('video-engine').querySelector('[value=seedance]').disabled=!c.videoEngines?.includes('seedance');")
s=replace(s,"const selectedTool=tool,sessionEpoch=epoch;", "const selectedTool=tool,sessionEpoch=epoch;\n  if(tool==='video'&&engine==='seedance'&&!config.videoEngines?.includes('seedance'))throw new Error('Seedance is not enabled on this backend.');")
s=replace(s,"q.settings.mode==='reference'?'Reference to Video':'Image to Video'", "q.settings.mode==='text'?'Text to Video':q.settings.mode==='reference'?'Reference to Video':'Image to Video'")
s=replace(s,"`Wan 3.0 / ${modeName} / ${q.settings.duration}s / ${q.settings.resolution}`", "`${videoLabel(q.settings)} / ${modeName} / ${q.settings.duration}s / ${q.settings.resolution}`")
s=replace(s,"async function assetFile(id,name='source'){const blob=await api('/api/assets/'+id,{blob:true}),ext=blob.type==='image/jpeg'?'jpg':blob.type.split('/')[1];", "async function assetFile(id,name='source'){const blob=await api('/api/assets/'+id,{blob:true}),ext=({'image/jpeg':'jpg','video/quicktime':'mov','audio/mpeg':'mp3','audio/x-wav':'wav'})[blob.type]||blob.type.split('/')[1];")
s=replace(s,"const p=job.settings||{};setTool(","const p=job.settings||{};engine=engineFor(p);setTool(")
s=replace(s,"$('output-format').value=p.outputFormat||'jpeg';update();notify('Original media", "$('output-format').value=p.outputFormat||'jpeg';if(p.engine==='seedance'||engineFor(p)==='seedance')await mediaRefs.restore(p);configureVideoControls();update();notify('Original media")
s=replace(s,"body:{name:name.trim(),referenceSourceIds:ids,referenceRoles:referenceRoles()}", "body:{name:name.trim(),engine:tool==='video'?engine:'wan',referenceSourceIds:ids,referenceRoles:referenceRoles()}")
s=replace(s,"if(!pack)throw new Error('Choose a saved pack.');if(references.length", "if(!pack)throw new Error('Choose a saved pack.');if(pack.refs.length>referenceLimit())throw new Error('This pack needs Seedance reference mode: it contains more than '+referenceLimit()+' images.');if(references.length")
s=replace(s,"j.settings.duration+'s'} / ${j.settings.resolution}", "videoLabel(j.settings)+' / '+j.settings.duration+'s'} / ${j.settings.resolution}")
s=replace(s,"const item=tool==='image'?null:", "const item=tool==='image'||tool==='video'&&mode==='text'?null:")
s=replace(s,"'Start with your own frame.';", "tool==='video'&&mode==='text'?'Describe a scene to begin.':'Start with your own frame.';")
s=replace(s,"  currentQuote=q;const isImage=q.settings.type==='image',modeName=", "  if(selectedTool==='video'&&engine==='seedance'&&(q.settings.engine!=='seedance'||q.settings.mode!==mode||q.settings.model!==VIDEO_MODELS.seedance.endpoints[mode]))throw new Error('Provider quote does not match the selected Seedance mode. Nothing was submitted.');\n  currentQuote=q;const isImage=q.settings.type==='image',modeName=")
p.write_text(s)
(root/'lab/seedance.css').write_text('''#video-model-control{margin:0 0 1rem}#video-model-control select{width:100%}#video-model-note{margin:.65rem 0 0}
#reference-media{margin-top:1.4rem}#reference-media .upload-heading{margin-top:1rem;gap:.5rem;flex-wrap:wrap}
.reference-media-list{display:grid;gap:.8rem;max-height:480px;overflow:auto;margin:.75rem 0}
.reference-media-item{min-width:0;display:grid;gap:.6rem;border:1px solid var(--line,#30302d);padding:.75rem}
.reference-media-item strong{font-size:11px;font-weight:400;overflow-wrap:anywhere}
.reference-media-item video,.reference-media-item audio{display:block;width:100%;max-width:100%;max-height:220px}
.reference-media-item input{width:100%;min-width:0}.mode-switch{flex-wrap:wrap}.mode-tab{flex:1 1 auto}
#video-engine{min-width:0}#video-model-note{overflow-wrap:anywhere}
''')
p=root/'lab/README.md';p.write_text(p.read_text()+'''\n\n## Standard Seedance 2.5 (2026-09-27)\n\nVideo now offers Wan 3.0 and Seedance 2.5 Standard. Seedance supports text-to-video, first/last frames and reference-to-video with up to 30 images, 10 videos and 10 audio clips. Each audio/video reference is 2 to 30 seconds, with a separate 30-second combined limit for each media type. Workspace file limits are 20 MiB per video and 15 MiB per audio reference. Standard Seedance follows the first-frame aspect ratio. Other modes expose the supported ratios including 21:9. Output choices are 480p, 720p and 1080p, with 4 to 30 whole seconds. Selecting Seedance starts at 5 seconds and 720p; Reuse restores the saved values.\n\nThis is the standard model, not a Spicy endpoint or filter bypass. The provider's policies and model refusals remain intact. No prompt transformation to evade safety systems, automatic model fallback, or paid testing is added. The existing bound live quote and separate video confirmation remain mandatory. Reference videos may increase the quoted maximum charge.\n\nExisting encrypted credentials, owner verification, daily budgets, spending ledger, three-video capacity, Image batches, one-click image Upscale and private R2 archive are preserved. History and Reuse retain the exact selected model, original media, reference order, roles, notes and settings. Named packs store images only. No database migration, new subscription or payment integration is required.\n\nDeploy both worker.mjs and seedance.mjs as Worker modules, retaining the existing bindings and secret. Deploy the backend before the frontend: older backend configurations do not enable the new selector. Input reference media use owner-only upload/read endpoints and the same short-lived signed URLs supplied to the provider. Browser and backend tests use synthetic images, video, audio and mocked provider responses; no real paid generations are used.\n''')
