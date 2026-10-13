// Verified SpicyAPI image contracts (13 Oct 2026).
// Qwen Image 3.0: https://spicyapi.ai/models/qwen-image-3-0/text-to-image
//                 https://spicyapi.ai/models/qwen-image-3-0/edit
// Z-Image Spicy:  https://spicyapi.ai/models/z-image-spicy/text-to-image
// All final charges use /jobs/quote bound by SpicyAPI. No client-provided cost.
export const QWEN3_TEXT='alibaba/qwen-image-3.0/text-to-image';
export const QWEN3_EDIT='alibaba/qwen-image-3.0/edit';
export const Z_IMAGE_SPICY='alibaba/z-image-spicy/text-to-image';
export const EXPERIMENTAL_RATIOS=Object.freeze(['1:1','16:9','9:16','4:3','3:4','3:2','2:3','21:9']);
export function experimentalImageParameters(value,{fail,referenceRoles=[],moodMetadata=()=>({})}={}){
  if(value?.type!=='image'||value.mode!=='image'||!['qwen3','zspicy'].includes(value.engine))
    fail(400,'Unknown image model.');
  const engine=value.engine,prompt=typeof value.prompt==='string'?value.prompt.trim():'';
  const ratio=value.aspectRatio||'16:9',resolution=value.resolution||(engine==='qwen3'?'2k':'1.5k');
  if(!prompt&&!referenceRoles.length)fail(400,'Add a prompt or a reference image.');
  if(prompt.length>5000)fail(400,'Direction exceeds the 5,000-character limit.');
  if(!EXPERIMENTAL_RATIOS.includes(ratio))fail(400,'Choose a supported image ratio for this model.');
  if(engine==='qwen3'&&!['1k','2k'].includes(resolution))fail(400,'Qwen Image 3.0 supports 1K or 2K.');
  if(engine==='zspicy'&&!['1k','1.5k'].includes(resolution))fail(400,'Z-Image Spicy supports image sizes up to 1536 pixels.');
  if(engine==='qwen3'&&referenceRoles.length>3)fail(400,'Qwen Image 3.0 accepts a maximum of three reference images.');
  if(engine==='zspicy'&&referenceRoles.length)fail(400,'Z-Image Spicy is text-to-image only. Remove reference photographs or choose Qwen Image 3.0.');
  return {
    type:'image',provider:'spicy',engine,mode:'image',
    model:engine==='qwen3'?QWEN3_TEXT:Z_IMAGE_SPICY,
    prompt,resolution,aspectRatio:ratio,referenceMode:value.referenceMode==='references'?'references':'base',
    outputFormat:'png',referenceRoles,...moodMetadata(value)
  };
}
export function zImageDimensions(resolution,aspectRatio){
  if(!['1k','1.5k'].includes(resolution)||!EXPERIMENTAL_RATIOS.includes(aspectRatio))
    throw new Error('Unsupported Z-Image Spicy image dimensions.');
  const cap=resolution==='1k'?1024:1536;
  const [w,h]=aspectRatio.split(':').map(Number);
  // Round smaller side to 8px, never exceed the provider's 1536px limit.
  const width=w>=h?cap:Math.max(256,Math.round(cap*w/h/8)*8);
  const height=h>=w?cap:Math.max(256,Math.round(cap*h/w/8)*8);
  return Object.freeze({width,height});
}
export function buildExperimentalImageInput(settings,refCount){
  const p=settings;
  if(p.engine==='qwen3'){
    if(!Number.isInteger(refCount)||refCount<0||refCount>3)throw Error('Qwen Image 3.0 accepts up to three references.');
    return {resolution:p.resolution,aspect_ratio:p.aspectRatio,num_outputs:1,
      // Preserve creative direction and Mood instructions without provider rewriting.
      enable_prompt_expansion:false};
  }
  if(p.engine==='zspicy'){
    if(refCount)throw Error('Z-Image Spicy does not accept image references.');
    return {...zImageDimensions(p.resolution,p.aspectRatio),enable_prompt_expansion:false};
  }
  throw Error('Unknown image model.');
}
