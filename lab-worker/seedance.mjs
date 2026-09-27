// Standard Seedance 2.5 only. Model/provider refusals are never intercepted or bypassed.
export const SEEDANCE = Object.freeze({
  start:'bytedance/seedance-2.5/image-to-video',
  text:'bytedance/seedance-2.5/text-to-video',
  reference:'bytedance/seedance-2.5/reference-to-video'
});
export const REFERENCE_MIME = new Set(['video/mp4','video/quicktime','audio/mpeg','audio/wav','audio/x-wav']);
const IMAGE_MIME = new Set(['image/png','image/jpeg','image/webp']);
export function mediaLabels(value,fail) {
  if(value==null)return [];
  if(!Array.isArray(value)||value.length>10)fail(400,'Use up to ten references of each media type.');
  let duration=0;
  const result=value.map(x=>{
    const seconds=Number(x?.seconds);
    if(!Number.isFinite(seconds)||seconds<2||seconds>30)fail(400,'Each video or audio reference must be between 2 and 30 seconds.');
    duration+=seconds;
    return {name:String(x?.name||'').replace(/[\r\n]/g,' ').slice(0,180),seconds,note:String(x?.note||'').trim().slice(0,300)};
  });
  if(duration>30.05)fail(400,'Reference videos and audio each have a separate 30-second combined limit.');
  return result;
}
export function seedanceParameters(value,{fail,referenceLabels}) {
  const mode=value.mode||'start';if(!Object.hasOwn(SEEDANCE,mode))fail(400,'Unsupported Seedance generation mode.');
  const prompt=typeof value.prompt==='string'?value.prompt.trim():'';
  if(prompt.length>5000)fail(400,'Use no more than 5,000 prompt characters for Seedance.');
  const duration=Number(value.duration),resolution=value.resolution;
  if(!Number.isInteger(duration)||duration<4||duration>30||!['480p','720p','1080p'].includes(resolution))fail(400,'Seedance supports 4 to 30 seconds and 480p, 720p or 1080p.');
  const aspectRatio=value.aspectRatio||'auto';
  if(!['auto','21:9','16:9','9:16','1:1','4:3','3:4'].includes(aspectRatio)||mode==='start'&&aspectRatio!=='auto')fail(400,'Seedance start-frame mode follows the source image ratio.');
  const seed=value.seed==null||value.seed===''?null:Number(value.seed);
  if(seed!==null&&(!Number.isInteger(seed)||seed<0||seed>2147483647))fail(400,'Invalid Seedance seed.');
  if(value.model&&value.model!==SEEDANCE[mode])fail(400,'Seedance model and mode do not match.');
  return {type:'video',engine:'seedance',model:SEEDANCE[mode],mode,prompt,duration,resolution,aspectRatio,seed,audio:value.audio!==false,
    referenceRoles:referenceLabels(value.referenceRoles,30),referenceVideos:mediaLabels(value.referenceVideos,fail),referenceAudio:mediaLabels(value.referenceAudio,fail)};
}
export async function prepareSeedance(env,owner,data,p,url,{fail,source,sources,signedInput}) {
  const input={resolution:p.resolution,duration_seconds:p.duration,generate_audio:p.audio,aspect_ratio:p.aspectRatio==='auto'?'adaptive':p.aspectRatio};
  p.referenceSourceIds=[];p.referenceVideoIds=[];p.referenceAudioIds=[];p.lastSourceId=null;
  const image=async id=>{const a=await source(env,owner,id);if(!IMAGE_MIME.has(a.mime))fail(400,'This input must be an image.');return a;};
  let primary=null;
  if(p.mode==='start'){
    if(data.referenceSourceIds?.length||data.referenceVideoIds?.length||data.referenceAudioIds?.length)fail(400,'Start-frame mode cannot be combined with reference mode.');
    primary=await image(data.sourceId);const last=data.lastSourceId?await image(data.lastSourceId):null;p.lastSourceId=last?.id||null;
    if(url){input.image_url=await signedInput(env,url,primary.id);if(last)input.last_image_url=await signedInput(env,url,last.id);}
  }else if(p.mode==='text'){
    if(data.sourceId||data.lastSourceId||data.referenceSourceIds?.length||data.referenceVideoIds?.length||data.referenceAudioIds?.length)fail(400,'Text-to-video does not accept source media.');
  }else{
    if(data.lastSourceId)fail(400,'Reference mode does not use a last frame.');
    const ids=data.referenceSourceIds||[];
    if(!Array.isArray(ids)||ids.length>30||new Set(ids).size!==ids.length)fail(400,'Choose up to thirty distinct image references.');
    const images=ids.length?await sources(env,owner,ids,30):[];
    if(images.some(a=>!IMAGE_MIME.has(a.mime)))fail(400,'Image references must contain images.');
    primary=images[0]||null;p.referenceSourceIds=images.map(a=>a.id);
    for(const [idKey,labelsKey,apiKey,kind] of [['referenceVideoIds','referenceVideos','reference_video_urls','video/'],['referenceAudioIds','referenceAudio','reference_audio_urls','audio/']]){
      const mediaIds=data[idKey]||[],labels=p[labelsKey];
      if(!Array.isArray(mediaIds)||mediaIds.length>10||new Set(mediaIds).size!==mediaIds.length||labels.length!==mediaIds.length)fail(400,'Reference media and their duration metadata must match in order.');
      const assets=[];
      for(const id of mediaIds){const a=await source(env,owner,id);if(!REFERENCE_MIME.has(a.mime)||!a.mime.startsWith(kind))fail(400,'Incorrect reference media type.');assets.push(a);}
      p[idKey]=assets.map(a=>a.id);
      if(url&&assets.length)input[apiKey]=await Promise.all(assets.map(a=>signedInput(env,url,a.id)));
    }
    if(!images.length&&!p.referenceVideoIds.length&&!p.referenceAudioIds.length)fail(400,'Add at least one image, video or audio reference.');
    if(url&&images.length)input.reference_image_urls=await Promise.all(images.map(a=>signedInput(env,url,a.id)));
  }
  if(p.mode!=='reference'){
    if(p.referenceVideos.length||p.referenceAudio.length)fail(400,'Video and audio references require reference mode.');
    p.referenceRoles=[];
  }
  if(p.seed!==null)input.seed=p.seed;
  return {primary,input};
}
export function sniffReference(bytes,mime) {
  const ascii=(a,b)=>String.fromCharCode(...bytes.subarray(a,b));
  if(mime==='video/mp4'||mime==='video/quicktime')return bytes.length>=12&&ascii(4,8)==='ftyp';
  if(mime==='audio/wav'||mime==='audio/x-wav')return bytes.length>=12&&ascii(0,4)==='RIFF'&&ascii(8,12)==='WAVE';
  if(mime==='audio/mpeg')return bytes.length>=3&&(ascii(0,3)==='ID3'||bytes[0]===255&&(bytes[1]&224)===224);
  return false;
}
