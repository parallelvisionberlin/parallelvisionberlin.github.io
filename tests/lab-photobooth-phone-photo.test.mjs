import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seedreamWorkingDimensions} from '../lab/image-tools.js';

// Execute the real service with mocked authentication, decoding and API only.
const source=readFileSync(new URL('../lab/app-mood-generation.js',import.meta.url),'utf8')
  .replace(/^import .*;\n/gm,'').replace('export function createAppMoodGeneration','function createAppMoodGeneration');
function fixture(width,height){
  const calls=[],account={isSignedIn:true,session:{id:'session'},user:{id:'user'}};
  const deps={
    loadLabAccount:async()=>account,
    createSessionRequest:()=>async(path,options)=>{
      const body=options.body&&typeof options.body==='string'?JSON.parse(options.body):options.body;
      calls.push({path,body});
      let data;
      if(path==='/api/session')data={config:{enabled:true}};
      else if(path==='/api/uploads')data={id:body.name==='phone.jpeg'?'original':'working'};
      else if(path==='/api/quotes')data={id:'quote',settings:body.settings,maxUsd:0.036,expiresAt:Date.now()+60000};
      else if(path==='/api/jobs')data={job:{id:'job'}};
      else data={ok:true};
      return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
    },
    imageDimensions:async()=>({width,height}),
    seedreamWorkingCopy:async()=>{const dims=seedreamWorkingDimensions(width,height);calls.push({copy:dims});return new File(['working'],'working.webp',{type:'image/webp'});},
    providerWorkingCopy:async()=>{throw Error('Unexpected byte compression');},
    PROVIDER_IMAGE_LIMIT:10*1024*1024,
    prepareMoodPrompt:()=>({prompt:'Preserve identity',metadata:{moodId:'berlin-rave',moodVariant:'original'}}),
    createMoodReferenceLoader:()=>({prepare:async settings=>({references:[],settings})}),
    moodReferencePlan:()=>{},normalizeReferenceLabel:()=>({role:'base'}),
    pricedBoundQuotes:()=>({credits:25}),imageAutoRatio:()=> '3:4'
  };
  const service=new Function(...Object.keys(deps),source+';return createAppMoodGeneration();')(...Object.values(deps));
  return {service,calls,file:new File(['original'],'phone.jpeg',{type:'image/jpeg'})};
}
const mood={id:'berlin-rave',defaultIntensity:80};
test('48MP iPhone photo retains original, quotes the safe working copy and submits only on explicit action',async()=>{
  const {service,calls,file}=fixture(6048,8064);
  const quote=await service.prepare(file,mood,'');
  const uploads=calls.filter(x=>x.path==='/api/uploads');
  assert.equal(uploads.length,2);
  assert.strictEqual(uploads[0].body,file);
  assert.ok(calls.find(x=>x.copy).copy.width*calls.find(x=>x.copy).copy.height<=34000000);
  const bound=calls.find(x=>x.path==='/api/quotes').body;
  assert.deepEqual(bound.referenceSourceIds,['original']);
  assert.deepEqual(bound.transferSourceIds,['working']);
  assert.equal(bound.settings.resolution,'1k');
  assert.equal(calls.filter(x=>x.path==='/api/jobs').length,0);
  await quote.submit();
  assert.equal(calls.filter(x=>x.path==='/api/jobs').length,1);
  await assert.rejects(()=>quote.submit(),/already sent/);
});
test('ordinary phone photo uses original without unnecessary conversion',async()=>{
  const {service,calls}=fixture(3024,4032);
  await service.prepare(new File(['photo'],'phone.jpeg',{type:'image/jpeg'}),mood,'');
  assert.equal(calls.filter(x=>x.path==='/api/uploads').length,1);
  assert.equal(calls.filter(x=>x.copy).length,0);
});
test('rejections identify actual dimensions and reason before any upload, quote or job',async()=>{
  for(const [w,h,message] of [[120,160,/too small \(120 × 160 px\)/],[12001,4000,/too large in dimensions \(12001 × 4000 px\)/],[2400,240,/unsupported proportions \(2400 × 240 px\)/]]){
    const {service,calls,file}=fixture(w,h);
    await assert.rejects(()=>service.prepare(file,mood,''),message);
    assert.deepEqual(calls.map(x=>x.path),['/api/session']);
  }
});
