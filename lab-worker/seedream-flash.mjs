// SpicyAPI Seedream 5 Flash contracts verified 2026-10-14.
// https://spicyapi.ai/models/seedream-5-0-flash/text-to-image
// https://spicyapi.ai/models/seedream-5-0-flash/edit
// Pricing always uses a live /jobs/quote before a paid /jobs/createTask.
export const FLASH_TEXT='bytedance/seedream-5.0-flash/text-to-image';
export const FLASH_EDIT='bytedance/seedream-5.0-flash/edit';
export const FLASH_RATIOS=Object.freeze(['1:1','4:3','3:4','16:9','9:16','3:2','2:3','4:5','5:4','21:9','9:21','2:1','1:2','3:1','1:3']);
export function seedreamFlashParameters(value,{fail,referenceRoles=[],moodMetadata=()=>({})}={}){
  if(value?.type!=='image'||value.engine!=='flash'||value.mode!=='image')
    fail(400,'Choose Seedream Flash Image mode.');
  const prompt=typeof value.prompt==='string'?value.prompt.trim():'';
  if(!prompt&&!referenceRoles.length)fail(400,'Add a direction or at least one reference photograph.');
  if(prompt.length>5000)fail(400,'Seedream Flash direction exceeds 5,000 characters.');
  if(referenceRoles.length>10)fail(400,'Seedream Flash accepts at most ten reference images.');
  if(!['1k','2k'].includes(value.resolution))fail(400,'Seedream Flash supports 1K or 2K.');
  const ratio=value.aspectRatio||'auto';
  if(ratio!=='auto'&&!FLASH_RATIOS.includes(ratio))fail(400,'Choose a supported Seedream Flash image ratio.');
  if(!['png','jpeg'].includes(value.outputFormat||'png'))fail(400,'Choose PNG or JPEG.');
  return {type:'image',provider:'spicy',engine:'flash',mode:'image',
    model:FLASH_TEXT,prompt,resolution:value.resolution,
    aspectRatio:ratio,outputFormat:value.outputFormat||'png',
    referenceMode:value.referenceMode==='references'?'references':'base',
    referenceRoles,...moodMetadata(value)};
}
export function seedreamFlashInput(p,refCount=0){
  if(!Number.isInteger(refCount)||refCount<0||refCount>10)throw Error('Seedream Flash accepts up to ten reference images.');
  if(!['1k','2k'].includes(p.resolution))throw Error('Unsupported Seedream Flash resolution.');
  const ratio=p.aspectRatio==='auto'&&!refCount?'16:9':p.aspectRatio;
  if(ratio!=='auto'&&!FLASH_RATIOS.includes(ratio))throw Error('Unsupported Seedream Flash ratio.');
  return {resolution:p.resolution,aspect_ratio:ratio,output_format:p.outputFormat||'png'};
}
