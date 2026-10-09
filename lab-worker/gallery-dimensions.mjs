import {storedImageDimensions} from './fal-upscale.mjs';
export function headerDimensions(bytes,mime){
  if(mime!=='image/webp')return storedImageDimensions(bytes,mime);
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(bytes.length<30||String.fromCharCode(...bytes.subarray(0,4))!=='RIFF'||String.fromCharCode(...bytes.subarray(8,12))!=='WEBP')throw Error('Invalid WebP header');
  const kind=String.fromCharCode(...bytes.subarray(12,16));let width,height;
  if(kind==='VP8X'){width=1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16);height=1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16);}
  else if(kind==='VP8 '&&bytes[23]===157&&bytes[24]===1&&bytes[25]===42){width=view.getUint16(26,true)&16383;height=view.getUint16(28,true)&16383;}
  else if(kind==='VP8L'&&bytes[20]===47){const bits=view.getUint32(21,true);width=(bits&16383)+1;height=((bits>>>14)&16383)+1;}
  if(!(width>0&&height>0&&width<=16000&&height<=16000))throw Error('Unsupported dimensions');
  return {width,height};
}
export async function ensureGalleryDimensions(env,j){
  const p=JSON.parse(j.params),assetId=j.output_id;
  if(p.type!=='image'||!assetId||!env.LAB_MEDIA)return;
  if(p.galleryDimensions?.assetId===assetId)return;
  try{
    const asset=await env.LAB_DB.prepare('SELECT object_key,mime FROM assets WHERE id=? AND owner_id=?').bind(assetId,j.owner_id).first();
    if(!asset)return;
    const object=await env.LAB_MEDIA.get(asset.object_key,{range:{offset:0,length:262144}});
    if(!object)return;
    const dimensions={assetId,...headerDimensions(new Uint8Array(await object.arrayBuffer()),asset.mime)};
    await env.LAB_DB.prepare("UPDATE jobs SET params=json_set(params,'$.galleryDimensions',json(?)) WHERE id=? AND owner_id=? AND output_id=?").bind(JSON.stringify(dimensions),j.id,j.owner_id,assetId).run();
    p.galleryDimensions=dimensions;j.params=JSON.stringify(p);
  }catch{/* An unavailable preview must not block the rest of History. */}
}
