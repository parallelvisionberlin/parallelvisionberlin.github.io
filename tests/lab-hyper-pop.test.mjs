// Targeted, non-billable regression for Hyper Pop material couture.
// No provider generation, customer uploads or charges occur in this suite.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {MOODS,moodById,prepareMoodPrompt} from '../lab/moods.js';
import {moodReferencePlan,createMoodReferenceLoader,isMoodStyleReference} from '../lab/mood-references.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';
import {visibleImageReferenceIds} from '../lab/image-detail-references.js';

const id='hyper-pop',portrait='Rework the clothes, but preserve the same recognizable person and framing.';
const supported=['seedream','seedreamlite','gemini','gemini21'];
const sourceLabel={name:'my-real-photo.jpg',role:'base',note:''};
function plan(engine,intensity,{base=true,text=portrait,referenceMode='base',extra=[]}={}){
  const labels=[...(base?[sourceLabel]:[]),...extra];
  const recipe=prepareMoodPrompt(text,id,intensity,{engine,referenceCount:labels.length,referenceMode});
  assert.equal(recipe.error,'',engine+'/'+intensity+': '+recipe.error);
  const settings={type:'image',mode:'image',engine,resolution:'1k',aspectRatio:'auto',referenceMode,
    prompt:recipe.prompt,...recipe.metadata,referenceRoles:labels};
  const curated=moodReferencePlan(settings);
  const compiled=compileImagePrompt(curated.settings.prompt,curated.settings.referenceRoles,curated.settings);
  return {recipe,settings,curated,compiled};
}

test('Hyper Pop stays one curated Mood, using original Reptare owner artwork',()=>{
  const mood=moodById(id);
  assert.ok(mood);
  assert.equal(MOODS.filter(m=>m.id===id).length,1);
  assert.equal(MOODS.length,17);
  assert.equal(mood.defaultIntensity,75);
  assert.equal(mood.preview,'/lab/visuals/reptare-detail.webp');
  assert.match(mood.direction,/liquid chrome/i);
  assert.match(mood.direction,/vapor-foam/i);
  assert.match(mood.direction,/mirror-alloy orbs/i);
  assert.match(mood.climax,/floor, wall or set surfaces/i);
  assert.match(mood.climax,/identity/i);
});

test('strength genuinely changes clothing and supporting set, not just saturation',()=>{
  const low=plan('seedream',25),mid=plan('seedream',60),high=plan('seedream',85),maximum=plan('seedream',100);
  assert.match(low.recipe.prompt,/Preserve original wardrobe/);
  assert.match(mid.recipe.prompt,/selected garment panels or accessories/);
  assert.match(high.recipe.prompt,/Reinterpret clothing as tailored liquid-metal couture/);
  assert.match(maximum.recipe.prompt,/MAXIMUM 90-100/);
  assert.match(maximum.recipe.prompt,/matching local set/i);
  assert.notEqual(high.recipe.prompt,maximum.recipe.prompt);
  for(const p of [low,mid,high,maximum]){
    assert.ok(p.recipe.prompt.startsWith(portrait+String.fromCharCode(10,10)));
    assert.match(p.recipe.prompt,/preserve recognizable face/i);
    assert.match(p.recipe.prompt,/Honor explicit garment/i);
    assert.ok(!p.recipe.prompt.includes('undefined'));
  }
  assert.equal(low.curated.references.length,0,'low intensity protects the source photo');
  assert.equal(mid.curated.references.length,2);
  assert.equal(high.curated.references.length,2);
  assert.equal(maximum.curated.references.length,2);
});

test('supporting photographs are real, ordered, and never interpreted as Base identity',()=>{
  const p=plan('seedream',100);
  assert.deepEqual(p.curated.references.map(r=>r.url),[
    '/lab/visuals/reptare-detail.webp',
    '/lab/visuals/studio-tools/video-liquid-dress.webp'
  ]);
  for(const ref of p.curated.references){
    assert.ok(existsSync(new URL('..'+ref.url,import.meta.url)),ref.url);
    assert.equal(ref.label.role,'style');
    assert.ok(isMoodStyleReference(ref.label),ref.label.name);
    assert.match(ref.label.note,/MATERIAL ONLY/);
    assert.match(ref.label.note,/Do not copy|Never import/);
  }
  assert.equal(p.curated.settings.referenceRoles[0].role,'base');
  assert.deepEqual(p.curated.settings.referenceRoles.slice(1).map(r=>r.role),['style','style']);
  assert.match(p.compiled,/Reference 1.*Base image/);
  assert.match(p.compiled,/MATERIAL ONLY/);
  const refs=['base-0','material-1','material-2'];
  assert.deepEqual(visibleImageReferenceIds({sourceId:'base-0',settings:{moodId:id,referenceSourceIds:refs,
    referenceRoles:p.curated.settings.referenceRoles}}),['base-0'],'preset photos stay hidden from image details/history');
  assert.equal(isMoodStyleReference({role:'base',name:p.curated.references[0].label.name}),false);
});

test('supported models attach pack, other modes keep text instructions without unsupported uploads',()=>{
  for(const engine of supported){
    for(const intensity of [25,35,60,75,90,100]){
      for(const base of [false,true]){
        const p=plan(engine,intensity,{base});
        assert.equal(p.curated.references.length,intensity>34?2:0,engine+'/'+intensity);
        assert.equal(p.curated.settings.referenceRoles.length,(base?1:0)+(intensity>34?2:0));
        assert.ok(p.compiled.length<=(engine==='seedreamlite'?3000:5000),
          engine+'/'+intensity+' compiled over budget '+p.compiled.length);
        if(base)assert.equal(p.curated.settings.referenceRoles[0].role,'base');
        else assert.ok(p.curated.settings.referenceRoles.every(r=>r.role==='style'));
        assert.ok(p.compiled.includes(portrait));
      }
    }
  }
  for(const engine of ['krea3','qwen3']){
    const p=plan(engine,100);
    assert.equal(p.curated.references.length,0,'no unsupported style attachment for '+engine);
    assert.match(p.recipe.prompt,/liquid chrome/i);
  }
});

test('assigned user Identity/Style roles remain before internal material photographs',()=>{
  const identity={name:'my-identity.jpg',role:'identity',note:'Use this face.'};
  const p=plan('seedream',100,{base:true,extra:[identity]});
  assert.deepEqual(p.curated.settings.referenceRoles.map(r=>r.role),['base','identity','style','style']);
  assert.equal(p.curated.settings.referenceRoles[1].name,identity.name);
  assert.match(p.compiled,/Use this face/);
  const photoOnly=plan('seedream',100,{base:false,text:'A couture editorial of one adult model.'});
  assert.equal(photoOnly.curated.settings.aspectRatio,'16:9');
  assert.ok(photoOnly.curated.settings.referenceRoles.every(r=>r.role==='style'));
  const none=plan('seedream',25,{base:false});
  assert.equal(none.curated.references.length,0);
});

test('high-strength pack respects ten-image provider limit before any upload',()=>{
  const extra=Array.from({length:8},(_,i)=>({name:'extra-'+i+'.jpg',role:'none',note:''}));
  const recipe=prepareMoodPrompt(portrait,id,100,{engine:'seedream',referenceCount:9});
  assert.equal(recipe.error,'');
  assert.throws(()=>moodReferencePlan({type:'image',mode:'image',engine:'seedream',
    prompt:recipe.prompt,...recipe.metadata,referenceRoles:[sourceLabel,...extra]}),/Hyper Pop includes 2 Style references/);
});

test('reference loader reuses authenticated style uploads; no network upload if a source is missing',async()=>{
  let calls=0,uploads=0;
  const fetchFile=async url=>{calls++;return new Response(new Blob(['fixture'],{type:'image/webp'}),{status:200,headers:{'content-type':'image/webp'}});};
  const loader=createMoodReferenceLoader({fetchFile,upload:async file=>{uploads++;return {id:'prepared-'+uploads};}});
  const p=plan('seedream',75);
  await assert.rejects(()=>loader.prepare(p.settings),/Sign in before/);
  const first=await loader.prepare(p.settings,{sessionKey:'signed-in-A'});
  assert.deepEqual(first.references.map(r=>r.id),['prepared-1','prepared-2']);
  const second=await loader.prepare(p.settings,{sessionKey:'signed-in-A'});
  assert.deepEqual(second.references.map(r=>r.id),['prepared-1','prepared-2']);
  assert.equal(uploads,2,'a second quote must not re-upload automatic references');
  assert.equal(calls,2);
  const third=await loader.prepare(p.settings,{sessionKey:'signed-in-B'});
  assert.deepEqual(third.references.map(r=>r.id),['prepared-3','prepared-4']);
  loader.clear();
  const broken=createMoodReferenceLoader({fetchFile:async()=>new Response('missing',{status:404}),
    upload:async()=>{throw Error('must not upload');}});
  await assert.rejects(()=>broken.prepare(p.settings,{sessionKey:'signed-in-C'}),/Hyper Pop Style reference could not load/);
});
