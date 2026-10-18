// PV LAB / PRIVATE IMAGE GALLERY PREVIEWS
// Resizes an authenticated R2 image once, stores a compact WebP next to it,
// and returns only the derivative. The untouched original stays in its R2 key.
export const GALLERY_THUMB_EDGE=480;
export const GALLERY_THUMB_QUALITY=80;
export const GALLERY_THUMB_VERSION='v2-480q80';
const IMAGE_INPUT_LIMIT=20_000_000; // Images binding raw-byte input limit.
const THUMB_BYTE_LIMIT=2*1024*1024;

export function galleryThumbnailKey(asset){
  return asset.owner_id+'/thumbnails/'+GALLERY_THUMB_VERSION+'/'+asset.id+'.webp';
}
const imageAsset=asset=>asset&&['image/jpeg','image/png','image/webp'].includes(asset.mime);
const webpBytes=bytes=>bytes.length>=12&&
  String.fromCharCode(...bytes.subarray(0,4))==='RIFF'&&
  String.fromCharCode(...bytes.subarray(8,12))==='WEBP';
function thumbResponse(body,size){
  return new Response(body,{status:200,headers:{
    'Content-Type':'image/webp',
    'Content-Length':String(size),
    'Cache-Control':'private, no-store',
    'X-PV-Preview':'webp-480'
  }});
}
function thumbnailError(status,message){
  return new Response(JSON.stringify({error:message}),{
    status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}
  });
}

// Authorized route only: caller already checked asset id AND owner id in D1.
// This never exposes a public R2 URL or original media bytes to thumbnail clients.
export async function serveGalleryThumbnail(env,asset,ctx){
  if(!imageAsset(asset))return thumbnailError(415,'No image thumbnail is available for this file.');
  const key=galleryThumbnailKey(asset);
  const cached=await env.LAB_MEDIA.get(key);
  if(cached)return thumbResponse(cached.body,cached.size);
  if(!env.IMAGES?.input)return thumbnailError(503,'Image preview service is unavailable.');
  if(Number(asset.bytes)>IMAGE_INPUT_LIMIT)
    return thumbnailError(422,'This original is too large for an automatic thumbnail. Open the original image.');
  const original=await env.LAB_MEDIA.get(asset.object_key);
  if(!original)return thumbnailError(404,'The original image is unavailable.');
  if(original.size>IMAGE_INPUT_LIMIT)
    return thumbnailError(422,'This original is too large for an automatic thumbnail. Open the original image.');
  try{
    const resized=(await env.IMAGES.input(original.body)
      .transform({width:GALLERY_THUMB_EDGE,height:GALLERY_THUMB_EDGE,fit:'scale-down'})
      .output({format:'image/webp',quality:GALLERY_THUMB_QUALITY,anim:false})).response();
    if(!resized.ok)throw Error('Cloudflare Image Transformations returned '+resized.status);
    const bytes=new Uint8Array(await resized.arrayBuffer());
    if(!webpBytes(bytes)||bytes.length>THUMB_BYTE_LIMIT)
      throw Error('The thumbnail encoding was invalid or unexpectedly large.');
    // Durable, account-private, one-time derivative. Repeat gallery visits read
    // only the little WebP from R2 without recompressing or downloading the original.
    const save=env.LAB_MEDIA.put(key,bytes,{httpMetadata:{contentType:'image/webp'}});
    // The first preview must not wait for the R2 write: Cloudflare keeps the
    // private derivative save alive in the request context after responding.
    // Reads still use the identical owner-scoped key and original stays intact.
    if(typeof ctx?.waitUntil==='function')ctx.waitUntil(save.catch(()=>{}));
    else await save;
    return thumbResponse(bytes,bytes.length);
  }catch(error){
    // Only the preview fails. Gallery may fall back to the authenticated original;
    // generation, image identity and full-resolution archives are never affected.
    return thumbnailError(503,'Could not prepare the image preview. View the original instead.');
  }
}
