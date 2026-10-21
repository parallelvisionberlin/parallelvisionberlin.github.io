import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {moodById,MOODS,prepareMoodPrompt} from '../lab/moods.js';
import {moodReferencePlan,createMoodReferenceLoader,isMoodStyleReference} from '../lab/mood-references.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';

test('Dream Blur is a curated Mood with actual user reference photography and a card',()=>{
  const mood=moodById('dream-blur');
  assert.ok(mood);
  assert.equal(mood.defaultIntensity,78);
  assert.equal(mood.category,'Analog');
  assert.match(mood.direction,/shutter|exposure/i);
  assert.match(mood.direction,/Source-adaptive color/);
  assert.match(mood.direction,/1980s\/1990s pushed 35mm/);
  assert.match(mood.direction,/full-body image remains full-body/i);
  assert.equal(MOODS.length,17);
  const photo=statSync(new URL('..'+mood.preview,import.meta.url));
  assert.ok(photo.size>100000);
  const html=readFileSync(new URL('../lab/moods.html',import.meta.url),'utf8');
  assert.equal((html.match(/data-mood-id="dream-blur"/g)||[]).length,1);
  assert.match(html,/LIGHT LEAKS\. MOTION\. FEELINGS\./);
  assert.match(html,/All 17 curated visual Moods/);
});
test('Dream Blur stays physically photographic and retains identity across intensity',()=>{
  for(const engine of ['seedream','seedreamlite','gemini','gemini21']){
    for(const intensity of [10,45,78,98,100]){
      const recipe=prepareMoodPrompt('Keep the same person and place.','dream-blur',intensity,{engine,referenceCount:1});
      assert.equal(recipe.error,'',engine+' '+intensity+': '+recipe.error);
      assert.match(recipe.prompt,/shutter|exposure/i);
      assert.match(recipe.prompt,/light/i);
      assert.match(recipe.prompt,/IDENTITY FIRST/i);
      assert.match(recipe.prompt,/Style/i);
      assert.match(recipe.prompt,/face|eye/i);
      assert.equal(recipe.metadata.moodId,'dream-blur');
    }
  }
  assert.notEqual(prepareMoodPrompt('Portrait','dream-blur',25,{referenceCount:1}).prompt,
    prepareMoodPrompt('Portrait','dream-blur',90,{referenceCount:1}).prompt);
});
test('the four supplied images attach as Style, without copying people or changing the Base',()=>{
  const original=prepareMoodPrompt('Same original woman indoors.','dream-blur',78,{referenceCount:1});
  const settings={type:'image',mode:'image',engine:'seedream',aspectRatio:'auto',prompt:original.prompt,...original.metadata,
    referenceRoles:[{name:'my-base.jpg',role:'base',note:''}]};
  const plan=moodReferencePlan(settings);
  assert.equal(plan.references.length,4);
  assert.deepEqual(plan.settings.referenceRoles.map(ref=>ref.role),['base','style','style','style','style']);
  assert.equal(moodReferencePlan(plan.settings).references.length,0);
  assert.equal(plan.settings.aspectRatio,'auto');
  for(const ref of plan.references){
    assert.ok(ref.label.name.startsWith('Dream Blur style - '));
    assert.ok(isMoodStyleReference(ref.label));
    assert.match(ref.label.note,/OPTICS ONLY/);
    assert.ok(statSync(new URL('..'+ref.url,import.meta.url)).size>100000);
  }
  assert.ok(compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings).length<=5000);
  assert.throws(()=>moodReferencePlan({...settings,referenceRoles:[...settings.referenceRoles,...Array.from({length:6},(_,i)=>({name:'other'+i,role:'identity',note:''}))]}),/six of your own/);
});
test('reference loader uploads all four photos once per account session',async()=>{
  let uploaded=0;
  const photo=new Blob(['fake-photo'],{type:'image/jpeg'});
  const loader=createMoodReferenceLoader({fetchFile:async()=>new Response(photo,{status:200}),
    upload:async()=>({id:'file-'+(++uploaded)})});
  const prepared=prepareMoodPrompt('Portrait.','dream-blur',78,{referenceCount:1});
  const settings={type:'image',mode:'image',engine:'seedream',aspectRatio:'auto',prompt:prepared.prompt,...prepared.metadata,
    referenceRoles:[{name:'base',role:'base',note:''}]};
  const first=await loader.prepare(settings,{sessionKey:'user-a'});
  assert.deepEqual(first.references.map(x=>x.id),['file-1','file-2','file-3','file-4']);
  assert.deepEqual((await loader.prepare(settings,{sessionKey:'user-a'})).references.map(x=>x.id),first.references.map(x=>x.id));
  assert.equal(uploaded,4);
  const other=await loader.prepare(settings,{sessionKey:'user-b'});
  assert.equal(other.references[0].id,'file-5');
});
test('backend allows Dream Blur jobs and saves it as a My Moods foundation',()=>{
 const worker=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
 const boards=readFileSync(new URL('../lab-worker/moodboards.mjs',import.meta.url),'utf8');
 assert.match(worker,/IMAGE_MOOD_IDS=new Set\([^\n]+dream-blur/);
 assert.match(boards,/MOODBOARD_BUILTINS=new Set\([^\n]+dream-blur/);
});

test('even 100% Dream Blur keeps the original framing, body and room while increasing genuine analog texture',()=>{
  for(const strength of [1,35,78,95,100]){
    const x=prepareMoodPrompt('Keep this same standing person against the same wall.','dream-blur',strength,{engine:'seedream',referenceCount:1});
    assert.equal(x.error,'');
    assert.match(x.prompt,/framing|crop/i);
    assert.match(x.prompt,/pose/);
    assert.match(x.prompt,/35mm/);
    assert.match(x.prompt,/IDENTITY FIRST/);
    assert.match(x.prompt,/Style photographs|Style references|Style photos|Style reference/);
    assert.doesNotMatch(x.prompt,/near-abstraction|subject dissolving into/);
  }
  const max=prepareMoodPrompt('Same full-body subject, same position.','dream-blur',100,{engine:'seedream',referenceCount:1});
  assert.match(max.prompt,/100%: maximum real shutter streaks/);
  assert.match(max.prompt,/DO NOT zoom into a headshot/);
  const textOnly=prepareMoodPrompt('Night street scene','dream-blur',80,{engine:'seedream',referenceCount:0});
  assert.equal(textOnly.error,'');
});

test('Dream Blur welcome text generates with four built-in Style photos without rewriting the 5K recipe',()=>{
  // This is the public first-image CTA direction, previously 39 characters
  // over the provider limit after automatic Style references were attached.
  const welcome='A photographic blue motion blur, passing headlights and rain-streaked reflections, intimate fragmented detail, realistic long exposure, deep cobalt shadows and light trails, natural film grain and beautiful imperfection.';
  for(const engine of ['seedream','gemini','gemini21']){
    for(const referenceMode of ['base','references']){
      for(const intensity of [1,78,100]){
        const mood=prepareMoodPrompt(welcome,'dream-blur',intensity,{engine,referenceCount:0,referenceMode});
        assert.equal(mood.error,'');
        const settings={type:'image',mode:'image',engine,referenceMode,aspectRatio:'auto',
          prompt:mood.prompt,...mood.metadata,referenceRoles:[]};
        const plan=moodReferencePlan(settings);
        const compiled=compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings);
        assert.equal(plan.references.length,4);
        assert.equal(plan.settings.referenceRoles.length,4);
        assert.equal(plan.settings.aspectRatio,'16:9');
        assert.equal(plan.settings.prompt,mood.prompt,'Never shorten or rewrite the Mood');
        assert.equal(plan.settings.moodOriginalPrompt,welcome);
        assert.ok(compiled.length<=5000,engine+' '+referenceMode+' '+intensity+' over by '+(compiled.length-5000));
        assert.ok(compiled.includes(welcome),'The full welcome direction must survive');
        assert.match(compiled,/DREAM BLUR V2/);
        assert.match(compiled,/There is no base image/);
        for(const role of plan.settings.referenceRoles){
          assert.equal(role.role,'style');
          assert.ok(compiled.includes(role.note),'Every Style photo keeps its optical instruction');
        }
      }
    }
  }
});

test('Dream Blur References Only uses concise guidance without shortening customer, Mood or optical notes',()=>{
  for(const resolution of ['1k','2k'])
    for(const direction of ['', 'Keep the same recognizable face and framing.'])
      for(const intensity of [25,78,100]){
        const recipe=prepareMoodPrompt(direction,'dream-blur',intensity,{engine:'seedream',referenceCount:1,referenceMode:'references'});
        assert.equal(recipe.error,'');
        const original={type:'image',mode:'image',engine:'seedream',referenceMode:'references',resolution,
          aspectRatio:'16:9',prompt:recipe.prompt,...recipe.metadata,referenceRoles:[{name:'portrait.jpg',role:'none',note:''}]};
        const plan=moodReferencePlan(original);
        const compiled=compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings);
        assert.ok(compiled.length<=5000,'References Only '+resolution+'/'+intensity+' exceeds budget by '+(compiled.length-5000));
        assert.equal(plan.settings.prompt,recipe.prompt,'Full Mood creative recipe unchanged');
        assert.equal(plan.settings.moodOriginalPrompt,direction,'Never trim customer direction');
        assert.match(compiled,/DREAM BLUR V2/);
        assert.match(compiled,/IDENTITY FIRST/);
        assert.match(compiled,/There is no base image/);
        assert.deepEqual(plan.settings.referenceRoles.map(x=>x.role),['none','style','style','style','style']);
        for(const ref of plan.references)assert.ok(compiled.includes(ref.label.note),'Keep exact optical note for '+ref.label.name);
        assert.equal(moodReferencePlan(plan.settings).references.length,0);
      }
});
test('Dream Blur References Only preserves explicit Identity roles and notes',()=>{
  const direction='Keep the recognizable facial identity and framing.';
  const recipe=prepareMoodPrompt(direction,'dream-blur',78,{engine:'seedream',referenceCount:2,referenceMode:'references'});
  const settings={type:'image',mode:'image',engine:'seedream',resolution:'2k',referenceMode:'references',
    aspectRatio:'16:9',prompt:recipe.prompt,...recipe.metadata,referenceRoles:[
      {name:'scene.jpg',role:'none',note:'Architecture is optional inspiration.'},
      {name:'portrait.jpg',role:'identity',note:'This photo defines the face.'}
    ]};
  const plan=moodReferencePlan(settings);
  const compiled=compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings);
  assert.ok(compiled.length<=5000,'Over limit by '+(compiled.length-5000));
  assert.match(compiled,/Architecture is optional inspiration/);
  assert.match(compiled,/This photo defines the face/);
  assert.match(compiled,/Keep one consistent subject/);
  assert.deepEqual(plan.settings.referenceRoles.map(x=>x.role),['none','identity','style','style','style','style']);
});
test('Genuine long user notes are rejected before uploads, never silently cut',async()=>{
  const recipe=prepareMoodPrompt('Keep original person.','dream-blur',78,{engine:'seedream',referenceCount:6,referenceMode:'references'});
  const settings={type:'image',mode:'image',engine:'seedream',resolution:'2k',referenceMode:'references',aspectRatio:'16:9',
    prompt:recipe.prompt,...recipe.metadata,referenceRoles:Array.from({length:6},(_,i)=>({name:'ref'+i+'.jpg',role:'none',note:'Custom personal instructions '.repeat(20)}))};
  let uploads=0;
  const loader=createMoodReferenceLoader({upload:async()=>{uploads++;throw Error('Unexpected paid upload');}});
  await assert.rejects(loader.prepare(settings,{sessionKey:'test'}),/exceed 5,000 characters/);
  assert.equal(uploads,0);
  assert.equal(settings.prompt,recipe.prompt);
});
