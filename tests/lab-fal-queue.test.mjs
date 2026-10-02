import test from 'node:test';
import assert from 'node:assert/strict';
import {falSubmit,falStatus,falResult} from '../lab-worker/fal-controlled-pose.mjs';

test('FAL submission keeps model subpaths; status and results use the owning app',async()=>{
  const calls=[],original=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{calls.push({url,options});return Response.json(options.method==='POST'?{request_id:'original-request'}:{status:'COMPLETED',image:{url:'https://v3.fal.media/example.png'}});};
  try{
    for(const [endpoint,app] of [
      ['ideogram/v4.5/edit','ideogram/v4.5'],
      ['fal-ai/flux-pro/kontext/max/multi','fal-ai/flux-pro'],
      ['topaz/upscale/image/precision','topaz/upscale'],
      ['topaz/upscale/image/generative','topaz/upscale'],
      ['minimax/h3-max/reference-to-video','minimax/h3-max'],
      ['fal-ai/dwpose','fal-ai/dwpose']
    ]){
      calls.length=0;
      const id=await falSubmit(endpoint,'synthetic-key',{image_url:'data:image/png;base64,c3ludGhldGlj'});
      await falStatus(endpoint,'synthetic-key',id);await falResult(endpoint,'synthetic-key',id);
      assert.equal(calls[0].url,'https://queue.fal.run/'+endpoint);
      assert.equal(calls[1].url,'https://queue.fal.run/'+app+'/requests/original-request/status?logs=1');
      assert.equal(calls[2].url,'https://queue.fal.run/'+app+'/requests/original-request');
      assert.equal(calls.filter(c=>c.options.method==='POST').length,1);
      assert.equal(calls[1].options.body,undefined);assert.equal(calls[2].options.body,undefined);
    }
  }finally{globalThis.fetch=original;}
});

test('FAL retrieval errors preserve HTTP diagnostics without declaring submission failure',async()=>{
  const original=globalThis.fetch;
  try{
    for(const status of [401,403,404,429,500]){
      globalThis.fetch=async()=>new Response('',{status});
      await assert.rejects(falStatus('ideogram/v4.5/edit','synthetic-key','request'),e=>e.status===status&&e.definite===false&&e.message.includes('HTTP '+status));
    }
  }finally{globalThis.fetch=original;}
});

test('FAL missing request ID or unreadable acceptance stays uncertain and is never resubmitted',async()=>{
  const original=globalThis.fetch;let calls=0;
  try{
    for(const reply of [()=>Response.json({}),()=>new Response('not JSON'),()=>new Response('',{status:503})]){
      calls=0;globalThis.fetch=async()=>{calls++;return reply();};
      await assert.rejects(falSubmit('topaz/upscale/image/precision','synthetic-key',{}),e=>e.uncertain===true);
      assert.equal(calls,1);
    }
    globalThis.fetch=async()=>Response.json({detail:'Invalid input'},{status:422});
    await assert.rejects(falSubmit('topaz/upscale/image/precision','synthetic-key',{}),e=>e.definite===true&&!e.uncertain);
  }finally{globalThis.fetch=original;}
});
