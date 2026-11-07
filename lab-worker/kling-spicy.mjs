// Public Kling 3.0 via the existing SpicyAPI quote, credit and task pipeline.
// No extra safety flags, silent provider fallback or unquoted submissions.
export const KLING_SPICY_MODELS=Object.freeze({
  start:'kling/3.0/image-to-video',
  text:'kling/3.0/text-to-video'
});
const RATIOS=['16:9','9:16','1:1'];
const IMAGE_TYPES=['image/jpeg','image/png','image/webp'];
const MAX_IMAGE_BYTES=10000000;

export function klingSpicyParameters(value,{fail}){
  if(value?.type!=='video'||value.engine!=='kling3'||!Object.hasOwn(KLING_SPICY_MODELS,value.mode))
    fail(400,'Choose Kling 3.0 Text or Start frame.');
  const prompt=typeof value.prompt==='string'?value.prompt.trim():'';
  if(!prompt||prompt.length>2500)fail(400,'Write a Kling motion prompt of up to 2,500 characters.');
  const duration=Number(value.duration),mode=value.mode,ratio=value.aspectRatio||'auto';
  if(!Number.isInteger(duration)||duration<3||duration>15)fail(400,'Kling 3.0 supports 3 to 15 seconds.');
  if(value.resolution!=='1080p')fail(400,'Kling 3.0 is offered at 1080p in PV LAB.');
  if(value.provider&&value.provider!=='spicy')fail(400,'Kling 3.0 is available through SpicyAPI.');
  if(value.model&&value.model!==KLING_SPICY_MODELS[mode])fail(400,'Kling model does not match the selected mode.');
  if(mode==='text'&&!RATIOS.includes(ratio))fail(400,'Choose 16:9, 9:16 or 1:1 for Kling text video.');
  if(mode==='start'&&ratio!=='auto')fail(400,'Kling start-frame mode follows the source framing.');
  if(value.seed!==undefined&&value.seed!==null&&value.seed!=='')fail(400,'Kling 3.0 does not accept a manual seed.');
  if(value.referenceVideos?.length||value.referenceAudio?.length||value.referenceRoles?.length||value.elements?.length)
    fail(400,'Kling 3.0 accepts one start image and an optional last frame, not additional references or Elements.');
  return {type:'video',engine:'kling3',provider:'spicy',mode,model:KLING_SPICY_MODELS[mode],
    prompt,duration,resolution:'1080p',aspectRatio:ratio,audio:value.audio===true,seed:null,
    referenceRoles:[],referenceSourceIds:[],referenceVideoIds:[],referenceAudioIds:[],lastSourceId:null};
}

export function klingSpicyInput(p,{imageUrl=null,lastImageUrl=null}={}){
  if(p?.engine!=='kling3'||p.provider!=='spicy'||p.model!==KLING_SPICY_MODELS[p.mode]||
    !p.prompt||p.prompt.length>2500||!Number.isInteger(p.duration)||p.duration<3||p.duration>15||
    p.resolution!=='1080p')throw new Error('Invalid Kling 3.0 settings.');
  const input={prompt:p.prompt,duration_seconds:p.duration,resolution:'1080p',
    generate_audio:p.audio===true,shot_type:'single',guidance_scale:0.5};
  if(p.mode==='start'){
    if(!imageUrl||!/^https:\/\//.test(imageUrl))throw new Error('Kling needs an HTTPS start frame.');
    input.image_url=imageUrl;
    if(lastImageUrl){
      if(!/^https:\/\//.test(lastImageUrl))throw new Error('Kling needs an HTTPS last frame.');
      input.last_image_url=lastImageUrl;
    }
  }else{
    if(imageUrl||lastImageUrl||!RATIOS.includes(p.aspectRatio))throw new Error('Text-to-video does not use an image.');
    input.aspect_ratio=p.aspectRatio;
  }
  return input;
}

export async function prepareKlingSpicyInput(env,owner,data,p,url,{fail,source,signedInput}){
  if(data.referenceSourceIds?.length||data.referenceVideoIds?.length||data.referenceAudioIds?.length||
    data.transferSourceIds?.length||data.transferVideoIds?.length)
    fail(400,'Kling 3.0 does not accept additional image, video or audio references.');
  let primary=null,last=null,imageUrl=null,lastImageUrl=null;
  if(p.mode==='start'){
    if(!data.sourceId)fail(400,'Add a start frame for Kling image-to-video.');
    primary=await source(env,owner,data.sourceId);
    if(!IMAGE_TYPES.includes(primary.mime)||primary.bytes>MAX_IMAGE_BYTES)
      fail(400,'Kling needs a JPG, PNG or WebP start frame no larger than 10 MB.');
    if(data.lastSourceId){
      last=await source(env,owner,data.lastSourceId);
      if(!IMAGE_TYPES.includes(last.mime)||last.bytes>MAX_IMAGE_BYTES)
        fail(400,'Kling needs a JPG, PNG or WebP end frame no larger than 10 MB.');
    }
    imageUrl=await signedInput(env,url,primary.id,86400);
    if(last)lastImageUrl=await signedInput(env,url,last.id,86400);
    p.lastSourceId=last?.id||null;
  }else if(data.sourceId||data.lastSourceId)fail(400,'Text-to-video does not use start or end photographs.');
  return {primary,input:klingSpicyInput(p,{imageUrl,lastImageUrl})};
}
