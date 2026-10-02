// PV Soul Pro is reference-driven identity editing. It deliberately does not use
// the experimental Reinterpret LoRA: source structure and identity references are
// separate inputs so one control cannot silently trade anatomy for identity.
export const SOUL_PRO_MODELS=Object.freeze({
  ideogram45:Object.freeze({
    id:'ideogram/v4.5/edit',
    label:'Ideogram 4.5 · Precise'
  }),
  kontextmax:Object.freeze({
    id:'fal-ai/flux-pro/kontext/max/multi',
    label:'FLUX Kontext Max · Multi',
    estimateMicros:80000
  })
});
const IDEOGRAM_QUALITY_USD=Object.freeze({very_low:.008,low:.03,medium:.06,high:.22});

const RATIOS=Object.freeze([
  ['21:9',21/9],['16:9',16/9],['4:3',4/3],['3:2',3/2],['1:1',1],['2:3',2/3],['3:4',3/4],['9:16',9/16],['9:21',9/21]
]);

function nearestRatio(width,height){
  const value=width/height;
  let best=RATIOS[0];
  for(const item of RATIOS)if(Math.abs(Math.log(value/item[1]))<Math.abs(Math.log(value/best[1])))best=item;
  return best[0];
}

export function soulProParameters(value,{fail,referenceLabels}){
  const variant=Object.hasOwn(SOUL_PRO_MODELS,value.soulProModel)?value.soulProModel:'ideogram45';
  const prompt=typeof value.prompt==='string'?value.prompt.trim():'';
  if(prompt.length>3500)fail(400,'PV Soul Pro directions must be at most 3,500 characters.');
  const width=Number(value.sourceWidth),height=Number(value.sourceHeight);
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<240||height<240||width>12000||height>12000)fail(400,'PV Soul Pro needs the source image dimensions.');
  const seed=value.seed==null||value.seed===''?null:Number(value.seed);
  if(seed!==null&&(!Number.isInteger(seed)||seed<0||seed>2147483647))fail(400,'PV Soul Pro seed must be a whole number from 0 to 2147483647.');
  const model=SOUL_PRO_MODELS[variant];
  const ideogramQuality=variant==='ideogram45'&&Object.hasOwn(IDEOGRAM_QUALITY_USD,value.soulProQuality)?value.soulProQuality:'medium';
  return {
    type:'image',provider:'fal',engine:'soulpro',mode:'identity-edit',
    model:model.id,soulProModel:variant,soulProLabel:model.label,soulProQuality:ideogramQuality,
    prompt,sourceWidth:width,sourceHeight:height,seed,
    resolution:'source',aspectRatio:'source',outputFormat:'png',
    referenceRoles:referenceLabels(value.referenceRoles,4)
  };
}

export function soulProEstimateMicros(p){
  if(p.soulProModel==='ideogram45')return Math.ceil((IDEOGRAM_QUALITY_USD[p.soulProQuality]??IDEOGRAM_QUALITY_USD.medium)*1000000);
  return SOUL_PRO_MODELS[p.soulProModel]?.estimateMicros||80000;
}

function identityPrompt(p,count,kontext=false){
  const identityRange=count===1?'the identity reference':'the '+count+' identity references';
  const sourceRule=kontext
    ?'IMAGE 1 IS THE BASE SOURCE IMAGE TO EDIT. Images 2 through '+(count+1)+' are identity references only. Never use Images 2 through '+(count+1)+' as the composition, pose, body, wardrobe, room, background or camera.'
    :'The primary image_url is the BASE SOURCE IMAGE TO EDIT. The separate reference_image_urls are identity references only. Never substitute a reference image for the base source.';
  return [
    'IDENTITY REINTERPRET.',
    sourceRule,
    'Preserve the base source crop, camera position, lens perspective, pose, body silhouette, body proportions, hand and foot placement, clothing, room, props, background and lighting unless the user explicitly asks to change one of those things.',
    'Use '+identityRange+' only to replace the visible person identity: facial structure, eyes, nose, mouth, hairline, hair character and stable identifying facial traits.',
    'Do not copy pose, body shape, wardrobe, room, background, camera angle or lighting from the identity references.',
    'The output must still visibly be the base source photograph, with the same composition and body staging, but with the target identity.',
    'Keep realistic human anatomy, natural skin texture and physically plausible contact shadows. Do not beautify, inflate or reshape the base body merely to match the identity references.',
    p.prompt?`Additional user-requested change to the BASE SOURCE only: ${p.prompt}`:'No additional change. Perform only the identity replacement on the base source.'
  ].join('\n');
}

export function buildSoulProInput(p,{sourceUrl,identityUrls}){
  const prompt=identityPrompt(p,identityUrls.length,p.soulProModel==='kontextmax');
  if(p.soulProModel==='kontextmax'){
    const input={
      prompt,
      image_urls:[sourceUrl,...identityUrls],
      guidance_scale:3.5,
      num_images:1,
      output_format:'png',
      enhance_prompt:false,
      aspect_ratio:nearestRatio(p.sourceWidth,p.sourceHeight)
    };
    if(p.seed!==null)input.seed=p.seed;
    return input;
  }
  const input={
    prompt,
    image_url:sourceUrl,
    reference_image_urls:identityUrls,
    edit_precision:'high',
    quality:p.soulProQuality||'medium',
    image_size:'auto',
    num_images:1
  };
  if(p.seed!==null)input.seed=p.seed;
  return input;
}
