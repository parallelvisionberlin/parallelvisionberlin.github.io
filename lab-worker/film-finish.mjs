import {filmFinishSettings} from '../lab/film-finish.js';
import {bytesFrom,renderFilmFinish,FILM_RENDER_REVISION,INPUT_LIMIT} from '../lab/film-renderer.mjs';

export * from '../lab/film-renderer.mjs';

export async function filmAssetId(owner,originalId,settings,variant='v10'){
  // Existing Hong Kong V10 asset IDs must remain byte-for-byte stable.
  const fields=[FILM_RENDER_REVISION,owner,originalId,filmFinishSettings(settings)];
  if(variant!=='v10')fields.push(variant);
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(fields))));
  digest[6]=(digest[6]&15)|64;digest[8]=(digest[8]&63)|128;
  const s=Array.from(digest.slice(0,16),n=>n.toString(16).padStart(2,'0')).join('');
  return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
}

// Caller has already authorized the original asset. No URL fetch, provider API,
// generation quote or wallet debit exists anywhere in this module.
export async function prepareFilmAsset(env,original,settings,{first,remaining,variant='v10'}){
  const finish=filmFinishSettings(settings);
  if(!finish.grain&&!finish.haze&&!finish.halation&&!finish.film)return original;
  const id=await filmAssetId(original.owner_id,original.id,finish,variant);
  const cached=await first(env,'SELECT * FROM assets WHERE id=? AND owner_id=?',id,original.owner_id);
  if(cached&&await env.LAB_MEDIA.head(cached.object_key))return cached;
  if(original.bytes>INPUT_LIMIT)throw Error('This image is too large for the film finish.');
  const source=await env.LAB_MEDIA.get(original.object_key);
  if(!source)throw Error('The original image is unavailable.');
  const input=await bytesFrom(new Response(source.body),INPUT_LIMIT);
  const bytes=await renderFilmFinish(env.IMAGES,input,finish,original.id,{engine:variant==='eighties'?'eighties':'v10'});
  if(bytes.length>remaining)throw Error('There is not enough archive space for a finished copy.');
  const object_key=original.owner_id+'/film-finish/v'+FILM_RENDER_REVISION+'/'+id+'.png';
  await env.LAB_MEDIA.put(object_key,bytes,{httpMetadata:{contentType:'image/png'}});
  return {id,owner_id:original.owner_id,object_key,kind:'source',mime:'image/png',filename:'parallel-vision-film-'+id+'.png',bytes:bytes.length,created_at:Date.now()};
}
