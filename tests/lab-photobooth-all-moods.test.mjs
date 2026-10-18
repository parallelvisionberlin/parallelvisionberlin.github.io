// Non-billable full-catalogue Photobooth regression after switching Explore Moods to 1K.
// Checks real Mood recipes, identity/reference maps and backend-facing settings,
// without submitting paid generation jobs or accessing customer photographs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MOODS, moodById, prepareMoodPrompt} from '../lab/moods.js';
import {moodReferencePlan} from '../lab/mood-references.js';
import {builtInMoodReferenceCount, compileImagePrompt} from '../lab/reference-guidance.js';

const client=readFileSync(new URL('../lab/app-mood-generation.js',import.meta.url),'utf8');
const explore=readFileSync(new URL('../lab/explore-moods.js',import.meta.url),'utf8');
const mobile=readFileSync(new URL('../lab/app-moods.js',import.meta.url),'utf8');
const worker=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
const direction='Keep the same recognizable person, expression, viewpoint and framing.';

test('Photobooth uses 1K for both web and native mobile, with one bound paid submission',()=>{
  assert.equal(MOODS.length,16,'Expected the entire PV LAB curated Mood catalogue');
  assert.equal(new Set(MOODS.map(m=>m.id)).size,16,'Every Mood ID must be unique');
  assert.match(client,/resolution:'1k',aspectRatio:imageAutoRatio/);
  assert.doesNotMatch(client,/resolution:'2k',aspectRatio:imageAutoRatio/);
  assert.match(explore,/import\('\.\/app-mood-generation\.js\?/);
  assert.match(mobile,/import\('\.\/app-mood-generation\.js\?/);
  assert.match(client,/referenceRoles:file\?\[normalizeReferenceLabel\(\{name:file\.name,role:'base'\}\)\]:\[\]/);
  assert.match(client,/referenceSourceIds:\[\.\.\.\(original\?\[original\.id\]:\[\]\),\.\.\.styleIds\]/);
  assert.match(client,/quote\.settings\?\.moodId!==mood\.id/);
  assert.match(client,/client\.prepare|async prepare\(file,mood,direction\)/);
  assert.equal((client.match(/confirm:true/g)||[]).length,1,'Only one explicit paid confirmation is allowed');
  assert.match(worker,/p\.referenceRoles=Array\.from\(\{length:count\}/);
  assert.match(worker,/const prompt=compileImagePrompt\(p\.prompt,p\.referenceRoles,p\)/);
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
        if(['dream-blur','hong-kong-nights'].includes(mood.id)){
          assert.equal(planned.references.length,4,context+' optical Mood needs four style references');
          assert.ok(roles.slice(hasPhoto?1:0).every(r=>r.role==='style'),context+' style photos must not override identity');
        }else{
          assert.equal(planned.references.length,0,context+' no extra network-hosted Style photos');
        }
        if(['dreamcore','berlin-rave','synthetic-romance'].includes(mood.id)){
          assert.equal(builtInMoodReferenceCount(planned.settings),3,context+' built-in style images are still attached on the server');
          assert.match(expanded,/These are not Base or identity images/,context+' built-ins must not replace face or composition');
        }
      }
    }
  });
}
