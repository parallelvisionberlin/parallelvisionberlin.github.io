import test from 'node:test';
import assert from 'node:assert/strict';
import {falUploadImage} from '../lab-worker/fal-storage.mjs';

test('FAL receives raw multi-megabyte input on its CDN, with bounded retention and no API key on the signed upload',async()=>{
  const bytes=new Uint8Array(3_642_201),calls=[];
  const url=await falUploadImage('test-key',bytes,'image/png',{fetchImpl:async(url,init)=>{
    calls.push({url,init});
    return calls.length===1?Response.json({upload_url:'https://v3.fal.media/upload/test?signature=test',file_url:'https://v3b.fal.media/files/test.png'}):new Response(null,{status:200});
  }});
  assert.equal(url,'https://v3b.fal.media/files/test.png');assert.equal(calls.length,2);
  const [start,put]=calls;
  assert.ok(start.url.startsWith('https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3'));
  assert.equal(new Headers(start.init.headers).get('authorization'),'Key test-key');
  assert.deepEqual(JSON.parse(new Headers(start.init.headers).get('X-Fal-Object-Lifecycle')),{expiration_duration_seconds:86400});
  assert.ok(start.init.body.length<200);assert.equal(put.init.body,bytes);assert.equal(put.init.method,'PUT');
  assert.equal(new Headers(put.init.headers).get('authorization'),null);
  assert.equal(start.init.redirect,'manual');assert.equal(put.init.redirect,'manual');
});

test('Upload failures and unsafe locations cannot submit inference or leak credentials',async()=>{
  for(const mode of ['init-timeout','put-timeout','init-http','put-http','redirect','unsafe-upload','unsafe-file','bad-json']){
    let calls=0;
    await assert.rejects(falUploadImage('test-key',new Uint8Array([1]),'image/png',{fetchImpl:async(url,init)=>{
      calls++;assert.ok(!url.includes('queue.fal.run'));
      if(calls===1){
        if(mode==='init-timeout')throw new Error('Timeout');
        if(mode==='init-http')return new Response('',{status:403});
        if(mode==='redirect')return new Response('',{status:307,headers:{Location:'https://outside.example'}});
        if(mode==='bad-json')return new Response('bad json');
        return Response.json({upload_url:mode==='unsafe-upload'?'https://outside.example/private':'https://v3.fal.media/upload/x',file_url:mode==='unsafe-file'?'https://fal.media.evil.example/x':'https://v3.fal.media/files/x'});
      }
      assert.equal(new Headers(init.headers).get('authorization'),null);
      if(mode==='put-timeout')throw new Error('Timeout');
      return new Response('',{status:503});
    }}),e=>e.definite===true&&e.message.includes('No generation was submitted.')&&!e.message.includes('test-key'));
    assert.equal(calls,['put-timeout','put-http'].includes(mode)?2:1);
  }
});
