import test from 'node:test';
import assert from 'node:assert/strict';
import {findFalRequest} from '../lab-worker/fal-recovery.mjs';

const created=Date.parse('2026-10-02T12:00:00.000Z'),updated=created+20_000,now=created+3_600_000;
const endpoint='fal-ai/ideogram/v3/edit';
const input={prompt:'Keep the room and camera framing.',image_urls:['data:image/png;base64,AAAA','data:image/png;base64,BBBB'],rendering_speed:'QUALITY',seed:17,settings:{count:1,enabled:true}};
const options={key:'test-key-not-real',endpoint,input,createdAt:created,updatedAt:updated,nowMs:now};
const item=(id='request-a',changes={})=>({request_id:id,endpoint_id:endpoint,sent_at:new Date(created+5_000).toISOString(),started_at:new Date(created+6_000).toISOString(),json_input:structuredClone(input),...changes});
const page=(items,next=null)=>({items,has_more:next!==null,next_cursor:next});
function history(...pages){
  const calls=[];
  const fetch=async(url,init)=>{
    const parsed=new URL(url);calls.push({url:parsed,init});
    assert.equal(parsed.origin,'https://api.fal.ai');assert.equal(parsed.pathname,'/v1/models/requests/by-endpoint');
    assert.equal(init.method,'GET');assert.equal(init.body,undefined);assert.equal(init.headers.Authorization,'Key test-key-not-real');assert.equal(init.redirect,'error');
    assert.equal(parsed.searchParams.get('endpoint_id'),endpoint);assert.equal(parsed.searchParams.get('expand'),'payloads');
    assert.equal(parsed.searchParams.get('start'),new Date(created-120_000).toISOString());assert.equal(parsed.searchParams.get('end'),new Date(now).toISOString());
    const result=pages[calls.length-1];assert.ok(result,'unexpected extra history request');
    return result instanceof Response?result:Response.json(result);
  };
  return {fetch,calls};
}
async function rejectsWith(promise,code){await assert.rejects(promise,error=>{assert.equal(error.code,code);assert.ok(error.status>=400);assert.ok(!error.message.includes(options.key));return true;});}

test('Recovery returns only exact existing request metadata without calling a paid endpoint',async()=>{
  const reordered={settings:{enabled:true,count:1},seed:17,rendering_speed:'QUALITY',image_urls:[...input.image_urls],prompt:input.prompt};
  const h=history(page([item('request-a',{json_input:reordered,json_output:{secret:'not returned'}})]));
  assert.deepEqual(await findFalRequest(options,h.fetch),{requestId:'request-a',endpointId:endpoint,sentAt:new Date(created+5_000).toISOString()});assert.equal(h.calls.length,1);
});
test('Exact payload mismatch, reordered images and different settings cannot match by timestamp',async()=>{
  for(const changed of [{...input,prompt:input.prompt+' Changed'},{...input,image_urls:[...input.image_urls].reverse()},{...input,seed:'17'},{...input,image_urls:['data:image/png;base64,CCCC',input.image_urls[1]]},{...input,extra:true}]){
    await rejectsWith(findFalRequest(options,history(page([item('a',{json_input:changed})])).fetch),'history_not_found');
  }
});
test('Exact inputs outside the submission window or under another endpoint cannot match',async()=>{
  for(const change of [{sent_at:new Date(created-120_001).toISOString()},{sent_at:new Date(updated+120_001).toISOString()},{endpoint_id:'fal-ai/other/model'}]){
    await rejectsWith(findFalRequest(options,history(page([item('a',change)])).fetch),'history_not_found');
  }
});
test('Two distinct matching request IDs stay ambiguous, including across pages',async()=>{
  const h=history(page([item('a')],'next'),page([item('b')]));
  await rejectsWith(findFalRequest(options,h.fetch),'history_ambiguous');assert.equal(h.calls.length,2);assert.equal(h.calls[1].url.searchParams.get('cursor'),'next');
});
test('Pagination is completed before a unique match is accepted and duplicate same IDs are deduplicated',async()=>{
  const h=history(page([item('a')],'second'),page([item('other',{json_input:{...input,seed:18}})],'third'),page([item('a')]));
  assert.equal((await findFalRequest(options,h.fetch)).requestId,'a');assert.equal(h.calls.length,3);
});
test('Empty history leaves the original request unresolved',async()=>{
  await rejectsWith(findFalRequest(options,history(page([])).fetch),'history_not_found');
});
test('Missing candidate payload prevents accepting an otherwise unique match',async()=>{
  for(const json_input of [undefined,null,'not an expanded input']){
    await rejectsWith(findFalRequest(options,history(page([item('a'),item('unknown',{json_input})])).fetch),'history_payload_missing');
  }
});
test('Unavailable HTTP response never exposes provider errors, input or keys',async()=>{
  for(const status of [401,403,429,500]){
    const h=history(new Response('Sensitive provider detail: '+options.key+' '+input.image_urls[0],{status}));
    await rejectsWith(findFalRequest(options,h.fetch),status===401||status===403?'history_access':'history_http');
  }
  await rejectsWith(findFalRequest(options,async()=>{throw new Error(options.key);}),'history_unavailable');
});
test('Malformed or contradictory pagination fails closed',async()=>{
  for(const body of [{items:[],has_more:false},{items:[],has_more:true,next_cursor:null},{items:[],has_more:false,next_cursor:'next'},{items:{},has_more:false,next_cursor:null}]){
    await rejectsWith(findFalRequest(options,history(body).fetch),'history_invalid');
  }
  await rejectsWith(findFalRequest(options,history(page([item()],'same'),page([],'same')).fetch),'history_incomplete');
});
test('A match on a truncated page limit is never accepted',async()=>{
  const h=history(...Array.from({length:25},(_,i)=>page(i===0?[item()]:[],'page-'+i)));
  await rejectsWith(findFalRequest(options,h.fetch),'history_incomplete');assert.equal(h.calls.length,25);
});
test('Missing record timestamp or malformed JSON cannot be silently skipped',async()=>{
  await rejectsWith(findFalRequest(options,history(page([item('a'),item('unknown',{sent_at:undefined})])).fetch),'history_invalid');
  await rejectsWith(findFalRequest(options,history(new Response('{invalid')).fetch),'history_invalid');
});
test('Oversized response is rejected before reading and invalid arguments make no requests',async()=>{
  const oversized=new Response('not read',{headers:{'Content-Length':String(24*1024*1024+1)}});
  await rejectsWith(findFalRequest(options,history(oversized).fetch),'history_too_large');
  for(const changed of [{createdAt:NaN},{createdAt:1e20},{updatedAt:created-1},{nowMs:created-1},{input:null},{key:''},{endpoint:'https://queue.fal.run/paid'}]){
    await rejectsWith(findFalRequest({...options,...changed},async()=>{assert.fail('invalid arguments must not fetch');}),'history_arguments');
  }
});
test('Undeclared streaming response is bounded and canceled before parsing an oversized payload',async()=>{
  let canceled=false;
  const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(24*1024*1024+1));},cancel(){canceled=true;}});
  await rejectsWith(findFalRequest(options,history(new Response(stream)).fetch),'history_too_large');
  assert.equal(canceled,true);
});
