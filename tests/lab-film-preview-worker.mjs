// Ephemeral Wrangler preview only. No production storage, account or AI binding.
import {renderFilmFinish} from '../lab-worker/film-finish.mjs';
export default {async fetch(request,env){
  if(request.method==='GET')return new Response('film-preview-ready');
  const u=new URL(request.url),bytes=new Uint8Array(await request.arrayBuffer());
  if(bytes.length>3_000_000)return new Response('Fixture too large',{status:413});
  if(u.searchParams.has('stage')){
    let image=env.IMAGES.input(new Blob([bytes]).stream());
    const stage=u.searchParams.get('stage');
    if(stage==='mask'||stage==='blur')image=image.transform({brightness:.62}).transform({contrast:12});
    if(stage==='blur')image=image.transform({blur:3});
    return (await image.output({format:'image/png'})).response();
  }
  try{return new Response(await renderFilmFinish(env.IMAGES,bytes,{version:1,grain:Number(u.searchParams.get('grain')),glow:Number(u.searchParams.get('glow'))},'film-preview-fixed-seed'),{headers:{'Content-Type':'image/png'}});}
  catch(e){return new Response(String(e.message),{status:422});}
}};
