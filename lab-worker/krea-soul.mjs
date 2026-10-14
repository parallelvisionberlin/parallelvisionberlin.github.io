// Owner-only experimental Krea 2 character LoRA through fal.ai.
// Keep Krea weights separate from legacy Qwen / Z-Image LoRA adapters.
// The existing soul_characters trigger prefix records trainer identity without
// a production D1 migration. Existing pv_ entries remain Qwen 2512.
export const KREA_TRAINER='fal-ai/krea-2-trainer';
export const KREA_MODEL='fal-ai/krea-2/turbo/lora';
export const KREA_STEPS=1000;
export const KREA_TRAINING_MICROS=3000000; // fal.ai $0.003/step, checked 2026-10-14
export const KREA_PRICE_PER_MP_MICROS=10000; // fal.ai $0.01/MP, checked 2026-10-14

const sizes=Object.freeze({
  '1:1':[1024,1024],
  '16:9':[1280,720],
  '9:16':[720,1280],
  '4:3':[1152,864],
  '3:4':[864,1152],
  '3:2':[1248,832],
  '2:3':[832,1248],
  '21:9':[1344,576],
  '9:21':[576,1344]
});
export const KREA_RATIOS=Object.freeze(Object.keys(sizes));
export function isKreaTrigger(word){
  return typeof word==='string'&&/^pvk_[a-z0-9_]+_[a-f0-9]{6}$/.test(word);
}
export function kreaTrainingInput(datasetUrl,triggerWord){
  if(!/^https:\/\//.test(datasetUrl)||!isKreaTrigger(triggerWord))throw new Error('Invalid Krea training dataset or trigger.');
  // ZIPs from the existing character studio have WebP images and no .txt sidecars.
  // Krea requires a nonempty trigger_phrase when auto_captioning is Off.
  return {
    images_data_url:datasetUrl,trigger_phrase:'photograph of '+triggerWord,
    auto_captioning:'Off',steps:KREA_STEPS,learning_rate:0.0005,resolution:'1024'
  };
}
export function kreaEstimateMicros(ratio){
  const size=sizes[ratio];if(!size)throw new Error('Unsupported Krea aspect ratio.');
  return Math.ceil(size[0]*size[1]*KREA_PRICE_PER_MP_MICROS/1000000);
}
export function kreaInferenceInput({prompt,triggerWord,weightUrl,identityStrength,aspectRatio,outputFormat}){
  const size=sizes[aspectRatio];
  if(!size||!isKreaTrigger(triggerWord)||typeof prompt!=='string'||!prompt.trim()||
     typeof weightUrl!=='string'||!/^https:\/\//.test(weightUrl)||
     !Number.isFinite(identityStrength)||identityStrength<0.25||identityStrength>1.75||
     !['png','jpeg'].includes(outputFormat))
    throw new Error('Invalid Krea generation settings.');
  const direction='Photograph of '+triggerWord+'. Preserve the trained person\'s recognisable face and characteristics. Natural skin texture and believable anatomy.\n'+prompt.trim();
  if(direction.length>5000)throw new Error('Krea directions exceed 5,000 characters.');
  return {
    prompt:direction,image_size:{width:size[0],height:size[1]},
    num_images:1,acceleration:'none',enable_prompt_expansion:false,
    enable_safety_checker:true,output_format:outputFormat,
    loras:[{path:weightUrl,scale:identityStrength}]
  };
}
