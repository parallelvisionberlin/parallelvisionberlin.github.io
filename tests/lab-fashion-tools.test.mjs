import test from 'node:test';
import assert from 'node:assert/strict';
import {FASHION_MODELS,fashionParameters,fashionEstimateMicros,fashionInput,fashionRoute,refreshFashionJob} from '../lab-worker/fashion-tools.mjs';
const person='11111111-1111-4111-8111-111111111111';
const garment='22222222-2222-4222-8222-222222222222';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const base={modelSourceId:person,garmentSourceId:garment};

test('Fashion model list uses only known official API routes and no provider safety bypass',()=>{
 assert.equal(FASHION_MODELS.fashn16.model,'fal-ai/fashn/tryon/v1.6');
 assert.equal(FASHION_MODELS.fluxvto.model,'fal-ai/flux-pro/v1/vto');
 assert.equal(FASHION_MODELS.fashnmax.model,'tryon-max');
 const p=fashionParameters({...base,model:'fashn16'},fail);
 assert.equal(p.provider,'fal');
 assert.equal(p.type,'image');assert.equal(p.mode,'fashion');
 assert.deepEqual(p.referenceSourceIds,[garment]);
 assert.equal(fashionEstimateMicros(p),75000);
 const input=fashionInput(p,'https://model.example/person','https://model.example/outfit');
 assert.equal(input.model_image,'https://model.example/person');
 assert.equal(input.garment_image,'https://model.example/outfit');
 assert.equal(input.num_samples,1);assert.equal(input.moderation_level,undefined);
});
test('FASHN Max 1K through 4K cost is one output at published on-demand prices',()=>{
 for(const [quality,values] of Object.entries({fast:[75000,150000,225000],balanced:[150000,225000,300000],quality:[225000,300000,375000]}))
   for(const [i,resolution] of ['1k','2k','4k'].entries()){
     const p=fashionParameters({...base,model:'fashnmax',generationMode:quality,resolution},fail);
     assert.equal(fashionEstimateMicros(p),values[i]);
     const input=fashionInput(p,'person-url','garment-url');
     assert.equal(input.model_name,'tryon-max');assert.equal(input.inputs.model_image,'person-url');
     assert.equal(input.inputs.product_image,'garment-url');assert.equal(input.inputs.num_images,1);
   }
});
test('FLUX requires styling instructions and keeps the original person/garment roles',()=>{
 assert.throws(()=>fashionParameters({...base,model:'fluxvto'},fail),/needs a styling direction/);
 const p=fashionParameters({...base,model:'fluxvto',prompt:'Keep sleeves rolled'},fail);
 const input=fashionInput(p,'person-url','garment-url');
 assert.equal(input.human_image_url,'person-url');assert.equal(input.garment_image_url,'garment-url');
 assert.equal(input.prompt,'Keep sleeves rolled');
 assert.ok(fashionEstimateMicros(p,1900000,900000)>=57500);
});
test('Unknown models, repeated source IDs and invalid controls are rejected before paid route',()=>{
 assert.throws(()=>fashionParameters({...base,model:'unapproved'},fail),/Choose a supported/);
 assert.throws(()=>fashionParameters({...base,modelSourceId:garment,model:'fashn16'},fail),/two different images/);
 assert.throws(()=>fashionParameters({...base,model:'fashn16',quality:'unsafe'},fail),/Invalid Try-On/);
 assert.throws(()=>fashionParameters({...base,model:'fashnmax',resolution:'8k'},fail),/valid FASHN/);
});
test('Model availability advertises missing direct FASHN key without exposing secrets',async()=>{
 const d={fail};
 const response=await fashionRoute(new Request('https://lab.example/api/fashion/models'),{FAL_KEY:'mock-fal'},'owner-a',new URL('https://lab.example/api/fashion/models'),d);
 assert.equal(response.models.filter(m=>m.provider==='fal').every(m=>m.available),true);
 assert.equal(response.models.find(m=>m.id==='fashnmax').available,false);
 assert.equal(JSON.stringify(response).includes('mock-fal'),false);
});
test('Fashion quote stores a bound cost but does not submit or purchase a generation',async()=>{
 const calls=[],fake={
   fail,body:async()=>({...base,model:'fashn16',quality:'balanced'}),
   source:async(_,owner,id)=>{assert.equal(owner,'owner-a');return{id,kind:'source',mime:'image/png'};},
   run:async(_env,query,...args)=>{calls.push({query,args});return{meta:{changes:1}};}
 };
 const q=await fashionRoute(new Request('https://lab.example/api/fashion/quote',{method:'POST'}),{FAL_KEY:'mock-fal'},'owner-a',new URL('https://lab.example/api/fashion/quote'),fake);
 assert.equal(q.estimatedUsd,.075);assert.equal(q.priceIsEstimate,true);assert.equal(calls.length,1);
 assert.match(calls[0].query,/INSERT INTO quotes/);
 assert.equal(calls[0].args[1],'owner-a');
});
test('Missing direct FASHN API key prevents purchasing Max before any generation',async()=>{
 const d={fail,body:async()=>({...base,model:'fashnmax'})};
 await assert.rejects(()=>fashionRoute(new Request('https://lab.example/api/fashion/quote',{method:'POST'}),{},'owner-a',new URL('https://lab.example/api/fashion/quote'),d),/FASHN_API_KEY/);
});
test('Direct FASHN polling archives only the confirmed provider output and cannot resubmit',async()=>{
 const original=globalThis.fetch,changes=[],files=[];
 globalThis.fetch=async (_url,opts)=>{assert.equal(opts.method,'GET');assert.equal(opts.headers.Authorization,'Bearer test-fashn-secret');return new Response(JSON.stringify({status:'completed',output:['https://cdn.fashn.ai/fake/portrait.png']}),{headers:{'Content-Type':'application/json','x-fashn-credits-used':'2'}});};
 const job={id:'job-a',provider_id:'prediction-a'};
 try{
  await refreshFashionJob({FASHN_API_KEY:'test-fashn-secret'},job,{
    run:async(_env,sql,...args)=>{changes.push({sql,args});return{meta:{changes:1}};},
    stmt:()=>({}),copyResult:async(_env,_job,url)=>{files.push(url);}
  });
 }finally{globalThis.fetch=original;}
 assert.deepEqual(files,['https://cdn.fashn.ai/fake/portrait.png']);
 assert.ok(changes.some(c=>c.sql.includes("state='saving'")));
 assert.ok(changes.some(c=>c.sql.includes('settled_cost')));
});
test('Confirmed fashion quote submits once; duplicate confirmation returns the original paid job',async()=>{
 const quotes=new Map(),jobs=new Map(),submitted=[];
 const env={FAL_KEY:'fake-fal-secret'};
 const deps={
  fail,body:async request=>request.url.endsWith('/quote')?{...base,model:'fashn16',quality:'balanced'}:{confirm:true,quoteId:[...quotes.keys()][0]},
  source:async(_env,owner,id)=>{assert.equal(owner,'owner-a');return{id,mime:'image/png'};},
  config:async()=>({daily_limit_microusd:10000000}),
  signedInput:async(_env,_url,id)=>'https://private.example/input/'+id,
  first:async(_env,sql,...args)=>{
   if(sql.startsWith('SELECT * FROM quotes'))return quotes.get(args[0])||null;
   if(sql.startsWith('SELECT * FROM jobs WHERE owner_id=? AND quote_id='))return [...jobs.values()].find(j=>j.owner_id===args[0]&&j.quote_id===args[1])||null;
   if(sql.startsWith('SELECT * FROM jobs WHERE id='))return jobs.get(args[0])||null;
   throw new Error('Unexpected test SELECT: '+sql);
  },
  run:async(_env,sql,...a)=>{
   if(sql.startsWith('INSERT INTO quotes(')){
    quotes.set(a[0],{id:a[0],owner_id:a[1],source_id:a[2],params:a[3],estimate_microusd:a[4],expires_at:a[5],vendor_quote_id:a[6],expected_cost:a[7],payload:a[8]});
   }else if(sql.startsWith('INSERT INTO jobs(')){
    jobs.set(a[0],{id:a[0],owner_id:a[1],source_id:a[2],quote_id:a[3],params:a[4],state:'submitting',estimate_microusd:a[5]});
   }else if(sql.startsWith('UPDATE quotes SET payload=')){
    quotes.get(a[1]).payload=a[0];
   }else if(sql.startsWith("UPDATE jobs SET provider_id=")){
    const j=jobs.get(a[2]);j.provider_id=a[0];j.state='queued';
   }else throw new Error('Unexpected test write: '+sql);
   return{meta:{changes:1}};
  },
  falSubmit:async(model,key,input)=>{submitted.push({model,key,input});return 'mock-fashion-request-1';},
  jobView:job=>({id:job.id,status:job.state,providerTaskId:job.provider_id||null,settings:JSON.parse(job.params)})
 };
 const quoted=await fashionRoute(new Request('https://lab.example/api/fashion/quote',{method:'POST'}),env,'owner-a',new URL('https://lab.example/api/fashion/quote'),deps);
 assert.equal(quoted.estimatedUsd,.075);
 const first=await fashionRoute(new Request('https://lab.example/api/fashion/submit',{method:'POST'}),env,'owner-a',new URL('https://lab.example/api/fashion/submit'),deps);
 const repeat=await fashionRoute(new Request('https://lab.example/api/fashion/submit',{method:'POST'}),env,'owner-a',new URL('https://lab.example/api/fashion/submit'),deps);
 assert.equal(first.job.status,'queued');assert.equal(first.job.id,repeat.job.id);
 assert.equal(submitted.length,1);
 assert.equal(submitted[0].model,'fal-ai/fashn/tryon/v1.6');
 assert.equal(submitted[0].input.model_image,'https://private.example/input/'+person);
 assert.equal(submitted[0].input.garment_image,'https://private.example/input/'+garment);
 assert.equal(jobs.size,1);
});
