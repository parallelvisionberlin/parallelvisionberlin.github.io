import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {moodReferencePlan,createMoodReferenceLoader,isMoodStyleReference} from '../lab/mood-references.js';
import {prepareMoodPrompt} from '../lab/moods.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';

function settingsFor(moodId='hong-kong-nights',count=1,{engine='seedream',variant='original',intensity=60,referenceMode='base'}={}){
  const recipe=prepareMoodPrompt('Portrait by a window',moodId,intensity,
    {engine,referenceCount:count,referenceMode,moodVariant:variant});
  assert.equal(recipe.error,'');
  return {type:'image',mode:'image',engine,referenceMode,aspectRatio:'auto',
    prompt:recipe.prompt,...recipe.metadata,
    referenceRoles:Array.from({length:count},(_,i)=>({
      name:'source-'+i+'.png',role:referenceMode==='references'?'identity':i?'identity':'base',note:''}))};
}

test('restored Hong Kong Nights never automatically inserts Style images in Base, References-only or text-only',()=>{
  for(const engine of ['seedream','seedreamlite','gemini','gemini21'])
    for(const variant of ['original','deep-green','slow-shutter'])
    for(const referenceMode of ['base','references'])
    for(const count of [0,1,6,7]){
      const settings=settingsFor('hong-kong-nights',count,{engine,variant,referenceMode});
      const plan=moodReferencePlan(settings);
      assert.equal(plan.settings,settings,'the unchanged input settings are returned');
      assert.deepEqual(plan.references,[],'no hidden reference photos');
      assert.equal(plan.settings.referenceRoles.length,count,'user references are not rewritten');
      assert.equal(plan.settings.aspectRatio,'auto','preserve inherited ratio');
      assert.ok(compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings).length<=(engine==='seedreamlite'?3000:5000));
    }
});
test('Hong Kong authentic photos remain recognizable as historical Style references but are not reattached',()=>{
  const saved=settingsFor();
  saved.referenceRoles.push({name:'Hong Kong Nights style - 02-city-haze.jpg',role:'style'});
  assert.ok(isMoodStyleReference(saved.referenceRoles.at(-1)));
  const plan=moodReferencePlan(saved);
  assert.equal(plan.settings,saved);
  assert.deepEqual(plan.references,[]);
});
test('Hong Kong preflight rejects prompt overflow before any fetch or upload',async()=>{
  let calls=0;
  const loader=createMoodReferenceLoader({
    fetchFile:async()=>{calls++;throw Error('must not download');},
    upload:async()=>{calls++;throw Error('must not upload');}
  });
  const normal=settingsFor();
  const done=await loader.prepare(normal,{sessionKey:'session-a'});
  assert.equal(done.settings,normal);
  assert.deepEqual(done.references,[]);
  assert.equal(calls,0);
  const over={...normal,prompt:'x'.repeat(5000)};
  await assert.rejects(loader.prepare(over,{sessionKey:'session-a'}),/exceed 5,000 characters by/);
  assert.equal(calls,0);
});
test('Dream Blur still has its existing four analog Style references and 10-image budget',()=>{
  const settings=settingsFor('dream-blur');
  const plan=moodReferencePlan(settings);
  assert.equal(plan.references.length,4);
  assert.deepEqual(plan.settings.referenceRoles.map(r=>r.role),['base','style','style','style','style']);
  assert.equal(moodReferencePlan(plan.settings).references.length,0,'History does not duplicate Style photos');
  for(const ref of plan.references)assert.ok(readFileSync(new URL('..'+ref.url,import.meta.url)).length>1000);
  assert.throws(()=>moodReferencePlan(settingsFor('dream-blur',7)),/six/);
});
test('Dream Blur cached uploads stay account-scoped and retain reference order',async()=>{
  let seq=0,downloads=0;
  const loader=createMoodReferenceLoader({
    fetchFile:async()=>{downloads++;return new Response(new Blob(['reference'],{type:'image/jpeg'}));},
    upload:async()=>({id:'upload-'+(++seq)})
  });
  const settings=settingsFor('dream-blur');
  assert.deepEqual((await loader.prepare(settings,{sessionKey:'a'})).references.map(r=>r.id),['upload-1','upload-2','upload-3','upload-4']);
  assert.deepEqual((await loader.prepare(settings,{sessionKey:'a'})).references.map(r=>r.id),['upload-1','upload-2','upload-3','upload-4']);
  assert.equal(downloads,4);
  assert.deepEqual((await loader.prepare(settings,{sessionKey:'b'})).references.map(r=>r.id),['upload-5','upload-6','upload-7','upload-8']);
  loader.clear();
  await loader.prepare(settings,{sessionKey:'b'});
  assert.equal(seq,12);
});
test('Dream Blur failed Style downloads are retriable, and cancellation prevents upload',async()=>{
  let fail=true,cancelled=false,uploads=0;
  const loader=createMoodReferenceLoader({
    fetchFile:async()=>new Response('image',{status:fail?404:200}),
    upload:async()=>({id:String(++uploads)})
  });
  await assert.rejects(loader.prepare(settingsFor('dream-blur'),{sessionKey:'a'}),/could not load/);
  assert.equal(uploads,0);
  fail=false;
  assert.equal((await loader.prepare(settingsFor('dream-blur'),{sessionKey:'a'})).references.length,4);
  const stopped=createMoodReferenceLoader({
    fetchFile:async()=>{cancelled=true;return new Response('image');},
    upload:async()=>{throw Error('must not upload');}
  });
  await assert.rejects(stopped.prepare(settingsFor('dream-blur'),{
    sessionKey:'a',check(){if(cancelled)throw Error('Session changed');}
  }),/Session changed/);
});
test('Unrelated Moods, unsupported models and modes are not changed by reference restoration',async()=>{
  const loader=createMoodReferenceLoader({fetchFile:()=>{throw Error('unexpected download');},upload:()=>{throw Error('unexpected upload');}});
  const cases=[
    {...settingsFor(),moodId:'night-flash'},
    {...settingsFor(),moodId:'custom'},
    {...settingsFor(),engine:'kling'},
    {...settingsFor(),mode:'upscale'}
  ];
  for(const settings of cases){
    const plan=await loader.prepare(settings,{sessionKey:'a'});
    assert.equal(plan.settings,settings);
    assert.deepEqual(plan.references,[]);
  }
});
test('Hong Kong text recipe is fixed independently of direction length and Film Finish',()=>{
  for(const engine of ['seedream','gemini'])for(const amount of [21,60,85,100]){
    const small=prepareMoodPrompt('Same original face.','hong-kong-nights',amount,{engine,referenceCount:1});
    const large=prepareMoodPrompt('Keep the same person and room. '.repeat(28).trim(),
      'hong-kong-nights',amount,{engine,referenceCount:1});
    assert.equal(small.error,'');assert.equal(large.error,'');
    assert.equal(large.prompt.slice(large.metadata.moodOriginalPrompt.length),
      small.prompt.slice(small.metadata.moodOriginalPrompt.length));
    assert.equal(large.metadata.filmFinish.film,0);
    assert.deepEqual(moodReferencePlan({...settingsFor(),prompt:large.prompt}).references,[]);
  }
  const source=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  assert.match(source,/compileImagePrompt\(planned.settings.prompt,planned.settings.referenceRoles,current\)/,
    'Frontend still checks final provider instructions');
});
