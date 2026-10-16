// Krea 3 (fal.ai) image creation/editing. Published $0.025 per processed MP.
// Safety checker remains enabled. Do not market this model as uncensored.
export const KREA3_EDIT='krea/v3/edit';
export const KREA3_TEXT='krea/v3/text-to-image';
export const KREA3_PRICE_PER_MP=0.025;
export const KREA3_MAX_REFERENCES=4;
const SIZES=Object.freeze({
  '1:1':[[1024,1024],[2048,2048]],
  '16:9':[[1024,576],[2048,1152]],
  '9:16':[[576,1024],[1152,2048]],
  '4:3':[[1024,768],[2048,1536]],
  '3:4':[[768,1024],[1536,2048]],
  '3:2':[[1008,672],[2016,1344]],
  '2:3':[[672,1008],[1344,2016]],
  '21:9':[[1008,432],[2016,864]]
});
const defaultFail=(status,message)=>{const e=new Error(message);e.status=status;throw e;};
export function krea3Size(resolution='2k',aspectRatio='16:9'){
  const sizes=SIZES[aspectRatio]||SIZES['16:9'];
  const [width,height]=sizes[resolution==='1k'?0:1];
  return {width,height};
}
export function krea3Parameters(value,{fail=defaultFail,referenceRoles=[]}={}){
  const prompt=String(value?.prompt||'').trim();
  if(prompt.length>5000)fail(400,'Krea 3 supports at most 5,000 prompt characters.');
  if(!['1k','2k'].includes(value?.resolution)||!Object.hasOwn(SIZES,value?.aspectRatio))
    fail(400,'Krea 3 needs 1K or 2K and a supported aspect ratio.');
  if(referenceRoles.length>KREA3_MAX_REFERENCES)
    fail(400,'Krea 3 accepts up to four references in PV LAB.');
  if(!prompt&&!referenceRoles.length)fail(400,'Add a prompt or a source photograph.');
  return {
    type:'image',provider:'fal',engine:'krea3',mode:'image',prompt,
    model:referenceRoles.length?KREA3_EDIT:KREA3_TEXT,
    resolution:value.resolution,aspectRatio:value.aspectRatio,outputFormat:'png',
    referenceMode:value.referenceMode==='references'?'references':'base',
    referenceRoles
  };
}
// Bound the estimate by charging up to one output-size MP for each image reference.
// Smaller reference images can cost less at fal; customer rates are explicitly estimates.
export function krea3EstimateMicros(p,referenceCount=0){
  if(!Number.isInteger(referenceCount)||referenceCount<0||referenceCount>KREA3_MAX_REFERENCES)
    throw Error('Invalid Krea 3 reference count.');
  const {width,height}=krea3Size(p.resolution,p.aspectRatio);
  return Math.ceil(width*height/1048576*(referenceCount+1)*KREA3_PRICE_PER_MP*1e6);
}
export function krea3Input(p,urls=[],compiledPrompt=p.prompt){
  if(!Array.isArray(urls)||urls.length>KREA3_MAX_REFERENCES)
    throw Error('Krea 3 accepts zero to four reference images.');
  const prompt=String(compiledPrompt||'').trim()
    .replace(/\bReference (\d+)\b/g,(_,n)=>'<image-'+n+'>');
  if(!prompt||prompt.length>5000)throw Error('Krea 3 needs a valid prompt within 5,000 characters.');
  return {
    prompt,model:'berry',reasoning_level:urls.length?'medium':'low',
    image_size:krea3Size(p.resolution,p.aspectRatio),
    output_format:'png',enable_safety_checker:true,
    ...(urls.length?{image_urls:urls}:{})
  };
}
