// Official Image API contracts verified 2026-10-09. Prices are estimates, not provider caps.
export const FLASH_MODEL='bytedance-seed/seedream-5-0-flash';
export const IMAGE_PRICES={flash:18000,kling:28000};
export const IMAGE_RATIOS=['16:9','9:16','1:1','4:3','3:4','3:2','2:3','21:9'];
export function imageModelParameters(value,{fail,referenceRoles=[]}){
  const engine=value.engine,prompt=String(value.prompt||'').trim(),aspectRatio=value.aspectRatio||'auto';
  if(!['flash','kling'].includes(engine))fail(400,'Unknown image model.');
  if(!prompt||prompt.length>(engine==='kling'?2500:5000))fail(400,engine==='kling'?'Kling needs a prompt of 1–2,500 characters.':'Flash needs a prompt of 1–5,000 characters.');
  if(!['1k','2k'].includes(value.resolution)||!['auto',...IMAGE_RATIOS].includes(aspectRatio))fail(400,'Choose 1K or 2K and a supported image ratio.');
  return {type:'image',engine,provider:engine==='flash'?'openrouter':'fal',model:engine==='flash'?FLASH_MODEL:'fal-ai/kling-image/v3/text-to-image',mode:'image',prompt,resolution:value.resolution,aspectRatio,outputFormat:'png',referenceMode:value.referenceMode==='references'?'references':'base',referenceRoles};
}
export function buildImageModelInput(p,urls,prompt=p.prompt){
  if(p.engine==='flash')return {model:FLASH_MODEL,prompt,n:1,resolution:p.resolution.toUpperCase(),aspect_ratio:p.aspectRatio,output_format:'png',...(urls.length?{input_references:urls.map(url=>({type:'image_url',image_url:{url}}))}:{}),provider:{allow_fallbacks:false}};
  if(urls.length>1)throw new Error('Kling V3 editing accepts one base image in this Lab. Choose Flash for multiple references.');
  if(prompt.length>2500)throw new Error('Kling prompt plus reference instructions must fit 2,500 characters.');
  return {prompt,resolution:p.resolution.toUpperCase(),aspect_ratio:p.aspectRatio,output_format:'png',num_images:1,...(urls.length?{image_url:urls[0]}:{})};
}
export async function requestFlash(key,input,fetcher=fetch){
  let response;
  try{response=await fetcher('https://openrouter.ai/api/v1/images',{method:'POST',redirect:'manual',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(180000)});}
  catch{throw Object.assign(new Error('OpenRouter response was interrupted. Check OpenRouter activity before retrying.'),{definite:false});}
  if(response.status>=300&&response.status<400)throw Object.assign(new Error('OpenRouter returned an unexpected redirect. It was not followed. No image request was sent to the redirected destination.'),{definite:true});
  if(!response.ok)throw Object.assign(new Error('OpenRouter rejected the image request (HTTP '+response.status+'). Check the API key, balance and model availability.'),{definite:response.status>=400&&response.status<500||response.status===502});
  let result;try{result=await response.json();}catch{throw Object.assign(new Error('OpenRouter returned unreadable image data. Check activity before retrying.'),{definite:false});}
  if(!result?.data?.[0]?.b64_json)throw Object.assign(new Error('OpenRouter returned no image. Check activity before retrying.'),{definite:false});
  return result;
}
