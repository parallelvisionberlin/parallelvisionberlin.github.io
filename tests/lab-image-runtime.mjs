import {Miniflare} from 'miniflare';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const module=await readFile(new URL('../lab-worker/image-models.mjs',import.meta.url),'utf8');
const mf=new Miniflare({workers:[{name:'flash-runtime-test',modules:true,compatibilityDate:'2026-08-01',script:module.replace(/^export /gm,'')+`
export default {async fetch(){
  let legacyRejected=false;
  try{new Request('https://openrouter.ai/api/v1/images',{method:'POST',redirect:'error',body:'{}'});}catch(e){legacyRejected=String(e.message).includes('Invalid redirect');}
  let redirect;
  const result=await requestFlash('test-only',{model:FLASH_MODEL,prompt:'Test'},async(url,options)=>{
    // Construct a real Workers Request, but never send it or spend funds.
    const request=new Request(url,options);redirect=request.redirect;
    return Response.json({data:[{b64_json:'test'}]});
  });
  return Response.json({legacyRejected,redirect,received:result.data[0].b64_json});
}};`}]});
try{const response=await mf.dispatchFetch('http://localhost/');assert.equal(response.status,200);assert.deepEqual(await response.json(),{legacyRejected:true,redirect:'manual',received:'test'});console.log('PASS real Workers runtime reproduces original pre-network failure and accepts corrected Flash request');}finally{await mf.dispose();}
