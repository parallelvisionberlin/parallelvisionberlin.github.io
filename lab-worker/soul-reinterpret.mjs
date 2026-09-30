import {soulPreset} from './soul-presets.mjs';
// Qwen Image 2512 text LoRAs are NOT used on Qwen Edit 2511 or Z-Image.
// This route requires a separately trained Z-Image Turbo adapter linked to the Soul.
// Verified 2026-10-01: https://spicyapi.ai/ru/models/z-image-turbo-lora
export const SOUL_REINTERPRET_MODEL='alibaba/z-image-turbo-lora/edit';
export const SOUL_REINTERPRET_TRAINER='fal-ai/z-image-trainer';
export const SOUL_REINTERPRET_BASE='z-image-turbo';
export const REINTERPRET_TRAINING_MICROS=2260000; // fal.ai/z-image-trainer, 1,000 steps, checked 2026-10-01
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function reinterpretParameters(value,{fail}){
  const preset=soulPreset(value.preset||'photographic-real-skin');
  if(!preset)fail(400,'Choose a supported Reinterpret preset.');
  const prompt=typeof value.prompt==='string'?value.prompt.trim():'';
  if(prompt.length>3000)fail(400,'Reinterpret directions must be at most 3,000 characters.');
  if(!uuid.test(value.characterId||''))fail(400,'Choose a trained PV Soul character.');
  const imageFidelity=Number(value.imageFidelity??preset.imageFidelity),identityStrength=Number(value.identityStrength??preset.identityStrength);
  if(!Number.isFinite(imageFidelity)||imageFidelity<.35||imageFidelity>.95)fail(400,'Image fidelity must be between 0.35 and 0.95.');
  if(!Number.isFinite(identityStrength)||identityStrength<.25||identityStrength>1.75)fail(400,'Identity strength must be between 0.25 and 1.75.');
  for(const field of ['keepComposition','keepStyling'])if(value[field]!==undefined&&typeof value[field]!=='boolean')fail(400,'Preservation controls must be true or false.');
  if(!['source',undefined].includes(value.aspectRatio)||!['png','jpeg'].includes(value.outputFormat||'png'))fail(400,'Reinterpret follows the source ratio and supports PNG or JPEG.');
  if(value.referenceRoles?.length)fail(400,'Reinterpret uses exactly one base image, without additional references.');
  if(!['1k','1.5k',undefined].includes(value.resolution))fail(400,'Choose 1K or 1.5K for Reinterpret.');
  return {type:'image',provider:'spicy',engine:'soul',model:SOUL_REINTERPRET_MODEL,mode:'reinterpret',characterId:value.characterId,preset:preset.id,presetLabel:preset.label,prompt,imageFidelity,identityStrength,keepComposition:value.keepComposition!==false,keepStyling:value.keepStyling!==false,aspectRatio:'source',resolution:value.resolution||'1.5k',outputFormat:value.outputFormat||'png',referenceRoles:[]};
}
export function buildReinterpretInput(p,{triggerWord,weightsUrl,imageUrl}){
  const preset=soulPreset(p.preset);
  if(!preset||!triggerWord)throw new Error('Reinterpret identity or preset is missing.');
  const prompt=[
    `Photograph of the trained adult character ${triggerWord}. Preserve that character's facial identity and natural features.`,
    p.keepComposition?'Same framing, crop, camera height, perspective, body placement, pose, scene layout and furniture as the source photograph.':'Use the source as the starting image; composition may change with the direction.',
    p.keepStyling?'Same wardrobe, styling, materials and broad lighting logic as the source, except for explicit changes below.':'Wardrobe, styling and lighting may follow the photographic direction.',
    preset.direction,
    'Believable human anatomy, natural photographic skin, realistic material texture.',
    p.prompt?`Requested changes and scene details: ${p.prompt}`:''
  ].filter(Boolean).join('\n');
  return {prompt,resolution:p.resolution,strength:Number((1-p.imageFidelity).toFixed(4)),output_format:p.outputFormat,...(weightsUrl?{loras:[{path:weightsUrl,scale:p.identityStrength}]}:{}),...(imageUrl?{image_url:imageUrl}:{})};
}
