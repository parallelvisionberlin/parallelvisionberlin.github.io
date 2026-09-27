from pathlib import Path
import json, hashlib
p=Path('tests/lab-upscale-ui.mjs');s=p.read_text()
a="await x.page.waitForFunction(()=>document.querySelector('#tool-upscale').getAttribute('aria-pressed')==='true');assert.equal(await x.page.locator('#resolution').inputValue(),'8k');"
b="await x.page.waitForFunction(()=>document.querySelector('#tool-upscale').getAttribute('aria-pressed')==='true'&&document.querySelector('#resolution').value==='8k'&&!document.querySelector('#resolution').disabled);assert.equal(await x.page.locator('#resolution').inputValue(),'8k');"
assert s.count(a)==1;s=s.replace(a,b);p.write_text(s)
p=Path('lab-worker/worker.mjs');s=p.read_text()
a="This API key is not allowed to use Wan 3.0. Allow the Wan 3.0 route used by this Lab on the API key."
b="This API key is not allowed to use the selected model. Enable that model route in your provider API-key settings."
assert s.count(a)==1;s=s.replace(a,b);p.write_text(s)
p=Path('.lab-worker-replacements.json');changes=json.loads(p.read_text());changes.append([a,b]);p.write_text(json.dumps(changes))
print('FINAL_WORKER_SHA256',hashlib.sha256(s.encode()).hexdigest())
p=Path('tests/lab-worker.test.mjs');s=p.read_text();s+=r'''
test('Large upscale PNG output is streamed to private storage and not limited to the upload ceiling',async()=>{
 const originalFetch=globalThis.fetch;createMode='ok';providerState='queued';const{env,objects}=fixture(),id=await setup(env);
 const parts=[];let outputKey='';env.LAB_MEDIA.createMultipartUpload=async key=>{outputKey=key;return {uploadPart:async(number,bytes)=>{parts.push(new Uint8Array(bytes));return {partNumber:number,etag:'test'};},complete:async()=>{const all=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const part of parts){all.set(part,offset);offset+=part.length;}objects.set(outputKey,all);},abort:async()=>{throw new Error('Unexpected abort');}};};
 const size=21*1024*1024+13,header=new Uint8Array([137,80,78,71,13,10,26,10]);
 try{
  const q=await(await req(env,'/api/quotes',{method:'POST',data:{sourceId:id,settings:upscaleSettings}})).json();
  const j=(await(await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})).json()).job;
  globalThis.fetch=async(url,options)=>{if(String(url)==='https://cdn.spicyapi.ai/test.png'){let sent=0;return new Response(new ReadableStream({pull(controller){if(sent===size){controller.close();return;}const n=Math.min(sent===0?4:1024*1024,size-sent),b=new Uint8Array(n);for(let i=0;i<n&&sent+i<header.length;i++)b[i]=header[sent+i];sent+=n;controller.enqueue(b);}}),{headers:{'content-type':'image/png','content-length':String(size)}});}return originalFetch(url,options);};
  providerState='succeeded';const done=(await(await req(env,'/api/jobs/'+j.id)).json()).job;
  assert.equal(done.status,'completed');assert.ok(parts.length>=3);assert.equal(objects.get(outputKey).length,size);assert.equal((await req(env,'/api/assets/'+done.outputId)).headers.get('content-type'),'image/png');
 }finally{globalThis.fetch=originalFetch;}
});
''';p.write_text(s)
