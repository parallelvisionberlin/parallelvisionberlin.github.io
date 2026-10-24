// Non-billable full-catalogue Photobooth regression after switching Explore Moods to 1K.
// Checks real Mood recipes, identity/reference maps and backend-facing settings,
// without submitting paid generation jobs or accessing customer photographs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {MOODS, moodById, prepareMoodPrompt} from '../lab/moods.js';
import {moodReferencePlan} from '../lab/mood-references.js';
import {builtInMoodReferenceCount, compileImagePrompt} from '../lab/reference-guidance.js';

const client=readFileSync(new URL('../lab/app-mood-generation.js',import.meta.url),'utf8');
const explore=readFileSync(new URL('../lab/explore-moods.js',import.meta.url),'utf8');
const mobile=readFileSync(new URL('../lab/app-moods.js',import.meta.url),'utf8');
const worker=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
const direction='Keep the same recognizable person, expression, viewpoint and framing.';

test('Photobooth uses 1K for both web and native mobile, with one bound paid submission',()=>{
  assert.equal(MOODS.length,17,'Expected the entire PV LAB curated Mood catalogue');
  assert.equal(new Set(MOODS.map(m=>m.id)).size,17,'Every Mood ID must be unique');
  assert.match(client,/resolution:'1k',aspectRatio:imageAutoRatio/);
  assert.doesNotMatch(client,/resolution:'2k',aspectRatio:imageAutoRatio/);
  assert.match(explore,/import\('\.\/app-mood-generation\.js\?/);
  assert.match(mobile,/import\('\.\/app-mood-generation\.js\?/);
  assert.match(client,/referenceRoles:file\?\[normalizeReferenceLabel\(\{name:file\.name,role:'base'\}\)\]:\[\]/);
  assert.match(client,/referenceSourceIds:\[\.\.\.\(original\?\[original\.id\]:\[\]\),\.\.\.styleIds\]/);
  assert.match(client,/quote\.settings\?\.moodId!==mood\.id/);
  assert.match(client,/client\.prepare|async prepare\(file,mood,direction(?:,moodVariant='original')?\)/);
  assert.equal((client.match(/confirm:true/g)||[]).length,1,'Only one explicit paid confirmation is allowed');
  assert.match(worker,/p\.referenceRoles=Array\.from\(\{length:count\}/);
  assert.match(worker,/const prompt=compileImagePrompt\(p\.prompt,p\.referenceRoles,p\)/);
});

test('all seventeen Mood thumbnails and editorial detail assets exist',()=>{
  for(const mood of MOODS){
    for(const asset of [mood.preview,mood.previewFull]){
      if(!asset)continue;
      const pathname=new URL(asset,'https://pvlab.studio').pathname;
      assert.ok(pathname.startsWith('/lab/'),'Mood preview paths must remain under PV LAB');
      assert.ok(existsSync(new URL('..'+pathname,import.meta.url)),mood.id+': missing '+pathname);
    }
    for(const suffix of ['', '-detail']){
      const pathname='/lab/mood-previews/mobile/v1/'+mood.id+suffix+'.jpg';
      assert.ok(existsSync(new URL('..'+pathname,import.meta.url)),mood.id+': missing native '+pathname);
    }
  }
});

for(const mood of MOODS){
  test('Photobooth 1K identity and prompt integrity: '+mood.name,()=>{
    assert.equal(moodById(mood.id),mood,'Mood ID resolves to the exact selected recipe');
    for(const hasPhoto of [true,false]){
      for(const intensity of [...new Set([25,mood.defaultIntensity||70,100])]){
        const recipe=prepareMoodPrompt(direction,mood.id,intensity,{
          engine:'seedream',referenceCount:hasPhoto?1:0,referenceMode:'base'
        });
        const context=mood.id+'/'+(hasPhoto?'base-photo':'text-only')+'/'+intensity;
        assert.equal(recipe.error,'',context+': '+recipe.error);
        assert.equal(recipe.metadata.moodId,mood.id,context+' Mood metadata');
        assert.equal(recipe.metadata.moodIntensity,intensity,context+' strength');
        assert.equal(recipe.metadata.moodOriginalPrompt,direction,context+' original direction');
        assert.ok(recipe.prompt.startsWith(direction+'\n\n'),context+' user text comes first');
        assert.ok(recipe.prompt.includes('PV LAB MOOD / '+mood.name+':'),context+' style is retained');
        const settings={
          type:'image',mode:'image',engine:'seedream',resolution:'1k',
          outputFormat:'png',referenceMode:'base',
          aspectRatio:hasPhoto?'3:4':'16:9',
          referenceRoles:hasPhoto?[{name:'customer-source.jpg',role:'base',note:''}]:[],
          prompt:recipe.prompt,...recipe.metadata
        };
        const planned=moodReferencePlan(settings);
        const roles=planned.settings.referenceRoles;
        const expanded=compileImagePrompt(planned.settings.prompt,roles,planned.settings);
        assert.equal(planned.settings.resolution,'1k',context+' resolution');
        assert.equal(planned.settings.prompt,recipe.prompt,context+' exact Mood direction retained');
        assert.ok(expanded.length<=5000,context+' compiled prompt exceeds provider 5000-char limit: '+expanded.length);
        assert.ok(!/\bundefined\b/.test(expanded),context+' broken recipe text');
        assert.ok(expanded.includes(direction),context+' user prompt survived reference assembly');
        assert.ok(roles.length+builtInMoodReferenceCount(planned.settings)<=10,context+' reference budget');
        if(hasPhoto){
          assert.equal(roles[0].role,'base',context+' original must remain Reference 1 Base');
          assert.match(expanded,/Base|base/,context+' original Base photo guidance included');
          assert.match(expanded,/identity|face|person|recognizable/i,context+' subject guidance included');
        }else{
          assert.ok(roles.every(r=>r.role!=='base'),context+' cannot invent a Base from style photos');
        }
        if(mood.id==='dream-blur'){
          assert.equal(planned.references.length,4,context+' optical Mood needs four style references');
          assert.ok(roles.slice(hasPhoto?1:0).every(r=>r.role==='style'),context+' style photos must not override identity');
        }else if(mood.id==='fisheye-2000'){
          assert.equal(planned.references.length,2,context+' two approved real photographic style references');
          assert.ok(roles.slice(hasPhoto?1:0).every(r=>r.role==='style'),context+' Mood does not override identity');
        }else if(mood.id==='hyper-pop'){
          assert.equal(planned.references.length,intensity>34?2:0,context+' chrome-cloud Style references at medium and high intensity only');
          assert.ok(roles.slice(hasPhoto?1:0).every(r=>r.role==='style'),context+' chrome-cloud sources may not replace Base identity');
        }else{
          assert.equal(planned.references.length,0,context+' no extra network-hosted Style photos');
        }
        if(['dreamcore','berlin-rave','synthetic-romance'].includes(mood.id)){
          assert.equal(builtInMoodReferenceCount(planned.settings),3,context+' built-in style images are still attached on the server');
          if(mood.id==='synthetic-romance')assert.match(expanded,/These are not Base or identity images/,context+' synthetic references are never the person');
          if(mood.id==='dreamcore')assert.match(expanded,/User sources and assigned roles control identity and camera/,context+' dream treatment cannot change identity');
          if(mood.id==='berlin-rave')assert.match(expanded,/outfit construction, compatible hair styling and flash ONLY, never identity/,context+' rave refs change wardrobe, never face');
        }
      }
    }
  });
}
