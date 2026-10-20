// Ephemeral Wrangler preview only. No production storage, account or AI binding.
import {renderFilmFinish} from '../lab-worker/film-finish.mjs';
export default {async fetch(request,env){
  if(request.method==='GET')return new Response('film-preview-ready');
  const u=new URL(request.url),bytes=new Uint8Array(await request.arrayBuffer());
  if(bytes.length>3_000_000)return new Response('Fixture too large',{status:413});
  try{return new Response(await renderFilmFinish(env.IMAGES,bytes,u.searchParams.get('version')==='2'?{version:2,grain:Number(u.searchParams.get('grain')),haze:Number(u.searchParams.get('haze')),halation:Number(u.searchParams.get('halation')),film:Number(u.searchParams.get('film'))}:{version:1,grain:Number(u.searchParams.get('grain')),glow:Number(u.searchParams.get('glow'))},'film-preview-fixed-seed',{engine:['v6','v3','v8','v9'].includes(u.searchParams.get('engine'))?u.searchParams.get('engine'):'v6'}),{headers:{'Content-Type':'image/png'}});}
  catch(e){return new Response(String(e.message),{status:422});}
}};
