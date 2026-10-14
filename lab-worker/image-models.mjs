// Kling V3 FAL API contract. Seedream Flash now uses the SpicyAPI quote/job flow.
export const IMAGE_PRICES={kling:28000};
export const IMAGE_RATIOS=['16:9','9:16','1:1','4:3','3:4','3:2','2:3','21:9'];
export function imageModelParameters(value,{fail,referenceRoles=[]}={}){
  const engine=value.engine,prompt=String(value.prompt||'').trim(),aspectRatio=value.aspectRatio||'auto';
  if(engine!=='kling')fail(400,'Unknown FAL image model.');
  if((!prompt&&!referenceRoles.length)||prompt.length>2500)fail(400,'Kling needs a prompt or base photograph. Text directions are limited to 2,500 characters.');
  if(!['1k','2k'].includes(value.resolution)||!['auto',...IMAGE_RATIOS].includes(aspectRatio))fail(400,'Choose 1K or 2K and a supported image ratio.');
  return {type:'image',engine,provider:'fal',model:'fal-ai/kling-image/v3/text-to-image',mode:'image',prompt,resolution:value.resolution,aspectRatio,outputFormat:'png',referenceMode:value.referenceMode==='references'?'references':'base',referenceRoles};
}
export function buildImageModelInput(p,urls,prompt=p.prompt){
  if(p.engine!=='kling')throw new Error('Unknown FAL image model.');
  if(urls.length>1)throw new Error('Kling V3 editing accepts one base image. Choose Seedream Flash for multiple references.');
  if(prompt.length>2500)throw new Error('Kling prompt plus reference instructions must fit 2,500 characters.');
  return {prompt,resolution:p.resolution.toUpperCase(),aspect_ratio:p.aspectRatio,output_format:'png',num_images:1,...(urls.length?{image_url:urls[0]}:{})};
}
