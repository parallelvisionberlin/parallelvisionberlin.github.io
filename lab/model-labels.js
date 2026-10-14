// A result's label comes from the actual saved provider model (when available),
// not whichever Image model happens to be selected in the Studio today.
// Used by History/Assets, the image viewer, status summaries, and pending cards.
// Keep this independent of the DOM so older saved jobs can be tested unchanged.
const exactModelNames=Object.freeze([
  [/^bytedance\/seedream-5\.0-lite\//,'Seedream 5 Lite'],
  [/^bytedance\/seedream-5\.0-pro\//,'Seedream 5 Pro'],
  [/^bytedance-seed\/seedream-5-0-flash(?:\/|$)/,'Seedream Flash'], // Historical OpenRouter records
  [/^bytedance\/seedream-5\.0-flash\//,'Seedream Flash'],
  [/^alibaba\/qwen-image-3\.0\//,'Qwen Image 3.0'],
  [/^alibaba\/z-image-spicy\//,'Z-Image Spicy'],
  [/^fal-ai\/kling-image\/v3\//,'Kling V3'],
  [/^gemini-3-pro-image(?:-|$)/,'Nano Banana Pro'],
  [/^gemini-nano-banana-2\.1(?:-|$)/,'Nano Banana 2.1']
]);

const engineNames=Object.freeze({
  seedream:'Seedream 5 Pro',
  seedreamlite:'Seedream 5 Lite',
  flash:'Seedream Flash',
  qwen3:'Qwen Image 3.0',
  zspicy:'Z-Image Spicy',
  kling:'Kling V3',
  gemini:'Nano Banana Pro',
  gemini21:'Nano Banana 2.1'
});

export function imageModelLabel(settings={}){
  const s=settings&&typeof settings==='object'?settings:{};
  const model=String(s.model||'').toLowerCase();
  const engine=String(s.engine||'').toLowerCase();
  const provider=String(s.provider||'').toLowerCase();
  const mode=String(s.mode||'').toLowerCase();

  if(mode==='soul-id-training')return 'Soul ID training';
  // Trained identity models have intentionally different public names from
  // the underlying LoRA, so a Qwen or Z-Image LoRA must not be presented as
  // an ordinary Qwen 3 or Z-Image Spicy generation.
  if(engine==='soul')return s.trainer==='krea2'||model==='fal-ai/krea-2/turbo/lora'?'Krea 2 LoRA':'PV Soul'; // Keep legacy Qwen and Z-Image labels.

  if(engine==='soulpro'||provider==='higgsfield'){
    if(model.startsWith('higgsfield-ai/soul/v2/'))return 'Higgsfield Soul 2';
    if(model.startsWith('ideogram/v4.5/'))return 'Ideogram 4.5';
    if(model.startsWith('fal-ai/flux-pro/kontext/max/'))return 'FLUX Kontext Max';
    if(s.soulProModel==='soul2')return 'Higgsfield Soul 2';
    if(s.soulProModel==='ideogram45')return 'Ideogram 4.5';
    if(s.soulProModel==='kontextmax')return 'FLUX Kontext Max';
    return engine==='soulpro'?'PV Soul Pro':'Higgsfield';
  }

  if(engine==='fashion'||provider==='fashn'||model.includes('/fashn/')){
    return model.includes('tryon-max')||model==='tryon-max'?'FASHN Try-On Max':'FASHN Try-On';
  }
  if(engine==='fal'||mode==='controlled-pose'||mode==='controlled-repair'){
    return mode==='controlled-repair'||model.includes('inpainting')?'FLUX Precision Edit':'FLUX Controlled Pose';
  }

  // If the saved engine and model contradict each other, the actual routed
  // provider model takes precedence: do not falsely call a Lite result Pro.
  for(const [pattern,label] of exactModelNames)if(pattern.test(model))return label;

  // Use the engine only when the provider has not assigned a model yet
  // (e.g., a pending generation). An unknown recorded route must not
  // inherit a familiar model name from a stale editor engine.
  if(!model&&Object.hasOwn(engineNames,engine))return engineNames[engine];

  // Older records sometimes omit engine but retain a usable provider model.
  // Truly unknown routes must never be called "Seedream 5 Pro".
  return 'Image model';
}
