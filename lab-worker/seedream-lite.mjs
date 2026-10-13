// Seedream 5 Lite delivers eight explicit 2K presets, not arbitrary ratios.
// Quoted billing uses SpicyAPI's bound maximum, never a static client price.
export const SEEDREAM_LITE_TEXT='bytedance/seedream-5.0-lite/text-to-image';
export const SEEDREAM_LITE_EDIT='bytedance/seedream-5.0-lite/edit';
export const LITE_SIZES=Object.freeze({
  '1:1':'2048*2048','4:3':'2304*1728','3:4':'1728*2304',
  '16:9':'2848*1600','9:16':'1600*2848',
  '3:2':'2496*1664','2:3':'1664*2496','21:9':'3136*1344'
});
export function seedreamLiteParameters(value,{fail,referenceRoles=[],moodMetadata=()=>({})}={}){
  const prompt=String(value.prompt||'').trim();
  if(!['image'].includes(value.mode)||value.type!=='image'||value.engine!=='seedreamlite')
    fail(400,'Choose Seedream Lite Image mode.');
  if(prompt.length<3||prompt.length>3000)
    fail(400,'Seedream Lite requires 3 to 3,000 characters, including Mood direction.');
  if(value.resolution!=='2k')fail(400,'Seedream Lite uses one 2K resolution tier.');
  const ratio=value.aspectRatio||'16:9';
  if(!Object.hasOwn(LITE_SIZES,ratio))fail(400,'Choose one of Seedream Lite’s eight supported aspect ratios.');
  if(!['png','jpeg'].includes(value.outputFormat||'png'))fail(400,'Choose PNG or JPEG.');
  if(referenceRoles.length>10)fail(400,'Seedream Lite accepts up to ten reference images.');
  return {
    type:'image',provider:'spicy',engine:'seedreamlite',mode:'image',
    model:SEEDREAM_LITE_TEXT,referenceMode:value.referenceMode==='references'?'references':'base',
    prompt,resolution:'2k',aspectRatio:ratio,outputFormat:value.outputFormat||'png',
    referenceRoles,...moodMetadata(value)
  };
}
export function seedreamLiteInput(p,{referenceUrls=[],prompt=p.prompt}={}){
  if(!Object.hasOwn(LITE_SIZES,p.aspectRatio))throw Error('Unsupported Seedream Lite ratio.');
  if(!Array.isArray(referenceUrls)||referenceUrls.length>10)
    throw Error('Too many Seedream Lite references.');
  if(typeof prompt!=='string'||prompt.length<3||prompt.length>3000)
    throw Error('Seedream Lite prompt and reference map must fit 3,000 characters.');
  return {size:LITE_SIZES[p.aspectRatio],output_format:p.outputFormat,prompt,
    ...(referenceUrls.length?{image_urls:referenceUrls}:{})};
}
