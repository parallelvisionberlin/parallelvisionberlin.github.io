// Extra Seedance routes. User-facing 4K is explicitly an upscaled deliverable,
// not a claim of native 4K inference. All provider safety/refusal rules remain.
export const SEEDANCE15=Object.freeze({
  start:'bytedance/seedance-1.5-pro/image-to-video',
  text:'bytedance/seedance-1.5-pro/text-to-video'
});
export const SEEDANCE_4K='bytedance/seedance-2.5-spicy/image-to-video';
const IMAGE_MIME=new Set(['image/jpeg','image/png','image/webp']);
const RATIOS=new Set(['21:9','16:9','4:3','1:1','3:4','9:16']);
export function seedanceVariantParameters(value,{fail}){
  const engine=value?.engine,mode=value.mode||'start';
  if(!['seedance15','seedance4k'].includes(engine))fail(400,'Unknown Seedance model.');
  if(engine==='seedance15'&&!['start','text'].includes(mode))
    fail(400,'Seedance 1.5 Pro supports Start frame or Text, not multi-reference mode.');
  if(engine==='seedance4k'&&mode!=='start')
    fail(400,'Seedance 2.5 · 4K requires a start frame.');
  const prompt=String(value.prompt||'').trim(),duration=Number(value.duration),resolution=value.resolution;
  if(engine==='seedance15'&&(prompt.length<3||prompt.length>5000))
    fail(400,'Seedance 1.5 Pro requires a motion direction of at least three characters.');
  if(engine==='seedance4k'&&prompt.length>5000)
    fail(400,'Use no more than 5,000 characters for Seedance 2.5 · 4K.');
  if(!Number.isInteger(duration)||duration<4||duration>(engine==='seedance15'?12:30))
    fail(400,'Choose a supported Seedance duration.');
  if(engine==='seedance15'&&!['480p','720p','1080p'].includes(resolution))
    fail(400,'Seedance 1.5 Pro supports 480p, 720p and 1080p.');
  if(engine==='seedance4k'&&resolution!=='4k')
    fail(400,'Seedance 2.5 · 4K is the upscaled 4K output option.');
  const aspectRatio=value.aspectRatio|| (engine==='seedance15'?'16:9':'auto');
  if(engine==='seedance15'&&!RATIOS.has(aspectRatio)||engine==='seedance4k'&&aspectRatio!=='auto')
    fail(400,'Choose an aspect ratio supported by this Seedance model.');
  const seed=value.seed===null||value.seed===undefined||value.seed===''?null:Number(value.seed);
  if(seed!==null&&(!Number.isInteger(seed)||seed<0||seed>2147483647))
    fail(400,'Choose an optional 32-bit whole-number seed.');
  if(engine==='seedance15'&&resolution==='1080p'&&seed!==null)
    fail(400,'Seedance 1.5 Pro 1080p does not support an explicit seed.');
  const cameraFixed=engine==='seedance15'&&value.cameraFixed===true;
  const p={type:'video',provider:'spicy',engine,mode,
    model:engine==='seedance15'?SEEDANCE15[mode]:SEEDANCE_4K,
    prompt,duration,resolution,aspectRatio,seed,
    audio:value.audio!==false,cameraFixed,referenceRoles:[]};
  if(value.model&&value.model!==p.model)fail(400,'Selected Seedance model and task do not match.');
  if(Array.isArray(value.referenceRoles)&&value.referenceRoles.length)
    fail(400,'This Seedance route does not support multiple reference roles.');
  return p;
}
export async function prepareSeedanceVariant(env,owner,data,p,url,{fail,source,sources,signedInput}){
  if(data.referenceSourceIds?.length||data.referenceVideoIds?.length||data.referenceAudioIds?.length)
    fail(400,'Use the standard Seedance 2.5 model for multi-reference video.');
  if(p.mode==='text'){
    if(data.sourceId||data.lastSourceId||data.transferSourceIds?.length)
      fail(400,'Text-to-video does not accept uploaded frames.');
    p.referenceSourceIds=[];p.lastSourceId=null;
    return {primary:null,input:{
      prompt:p.prompt,resolution:p.resolution,duration_seconds:p.duration,
      generate_audio:p.audio,aspect_ratio:p.aspectRatio,camera_fixed:p.cameraFixed,
      ...(p.seed===null?{}:{seed:p.seed})
    }};
  }
  if(!data.sourceId)fail(400,'Add a start frame to animate.');
  const original=await source(env,owner,data.sourceId),last=data.lastSourceId?await source(env,owner,data.lastSourceId):null;
  const originals=[original,...(last?[last]:[])];
  if(originals.some(a=>!IMAGE_MIME.has(a.mime)))fail(400,'Start frames must be JPEG, PNG or WebP.');
  if(p.engine==='seedance15'&&p.resolution==='1080p'&&last)
    fail(400,'Seedance 1.5 Pro at 1080p does not accept an ending frame.');
  let images=originals;
  if(data.transferSourceIds!==undefined){
    const ids=data.transferSourceIds;
    if(!Array.isArray(ids)||ids.length!==originals.length||new Set(ids).size!==ids.length)
      fail(400,'Prepared image copies do not match the selected start and end frames.');
    images=await sources(env,owner,ids,2);
    if(images.some(a=>!IMAGE_MIME.has(a.mime)))fail(400,'Video working frames must be images.');
    p.transferSourceIds=images.map(a=>a.id);
  }
  p.referenceSourceIds=[];p.lastSourceId=last?.id||null;
  const input={
    resolution:p.resolution,duration_seconds:p.duration,generate_audio:p.audio,
    ...(p.engine==='seedance15'?{aspect_ratio:p.aspectRatio,camera_fixed:p.cameraFixed}:{}),
    ...(p.prompt?{prompt:p.prompt}:{}),
    ...(p.seed===null?{}:{seed:p.seed})
  };
  if(url){
    input.image_url=await signedInput(env,url,images[0].id);
    if(last)input.last_image_url=await signedInput(env,url,images[1].id);
  }
  return {primary:original,input};
}
