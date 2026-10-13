// Direct Google Gemini Interactions API, never a reseller or Batch.
export const NANO21_MODEL='gemini-nano-banana-2.1';
export const NANO21_STANDARD_MICROS=Object.freeze({'1k':33600,'2k':50400,'4k':113000});
export const NANO21_CREDITS=Object.freeze({'1k':8,'2k':10,'4k':20});
export function isNano21Job(p={}){
  return p.type==='image'&&p.provider==='gemini'&&p.engine==='gemini21'&&
    p.model===NANO21_MODEL&&p.processing==='normal'&&
    Object.hasOwn(NANO21_STANDARD_MICROS,p.resolution);
}
export function nano21Request(p,parts){
  if(!isNano21Job(p))throw Error('Invalid direct Nano Banana 2.1 model settings.');
  if(!Array.isArray(parts)||!parts.length)throw Error('Missing image instructions.');
  const input=parts.map(x=>{
    if(typeof x.text==='string')return {type:'text',text:x.text};
    if(typeof x.inlineData?.data==='string'&&['image/png','image/jpeg','image/webp'].includes(x.inlineData.mimeType))
      return {type:'image',mime_type:x.inlineData.mimeType,data:x.inlineData.data};
    throw Error('Unsupported Nano Banana 2.1 reference.');
  });
  const response_format={type:'image',image_size:p.resolution.toUpperCase()};
  if(p.aspectRatio&&p.aspectRatio!=='auto')response_format.aspect_ratio=p.aspectRatio;
  return {model:NANO21_MODEL,store:false,input,response_format};
}
export function nano21ImagePart(res){
  const uncertain=msg=>{const e=Error(msg);e.definite=false;throw e;};
  if(res?.model&&res.model!==NANO21_MODEL)uncertain('Google returned a different model; check provider history.');
  if(res?.status&&res.status!=='completed')uncertain('Google Interactions did not confirm a completed image: '+res.status);
  const blocks=(Array.isArray(res?.steps)?res.steps:[])
    .filter(s=>s?.type==='model_output').flatMap(s=>Array.isArray(s.content)?s.content:[]);
  if(res?.output_image)blocks.push(res.output_image);
  const img=blocks.findLast(x=>typeof x?.data==='string'&&
    (x.type==='image'||['image/png','image/jpeg','image/webp'].includes(x.mime_type)));
  if(!img)uncertain('Google Interactions did not provide a confirmed image. Check before retrying.');
  const mime=img.mime_type||img.mimeType||'image/png';
  if(!['image/png','image/jpeg','image/webp'].includes(mime))uncertain('Unexpected Google image media type.');
  return {mime,data:img.data};
}
