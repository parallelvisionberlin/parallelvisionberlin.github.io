import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {HONG_KONG_REFERENCES,HONG_KONG_REFERENCE_VERSION} from '../lab-worker/hong-kong-references.mjs';
import {HONG_KONG_REFERENCE_MANIFEST,hongKongReferenceCount,hongKongUserReferenceLimit,hongKongReferenceError} from '../lab/hong-kong-reference-policy.js';
import {compileImagePrompt,builtInMoodReferenceCount,referenceGuidanceError} from '../lab/reference-guidance.js';
import {prepareMoodPrompt} from '../lab/moods.js';
import {moodReferencePlan} from '../lab/mood-references.js';
import {HONG_KONG_VARIANTS} from '../lab/hong-kong-variants.js';
import {HONG_KONG_FILM_FINISH,FILM_FINISH_RENDER_REVISION} from '../lab/film-finish.js';
import {quoteCustomerImageCredits} from '../lab-worker/customer-image-pricing.mjs';
import {krea3EstimateMicros} from '../lab-worker/krea3.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
test('The three approved originals reach Worker bytes in A/B/C order, never generated substitutes',()=>{
 assert.equal(HONG_KONG_REFERENCE_VERSION,'hk-three-originals-20261022-v2-diner-png');
 assert.deepEqual(HONG_KONG_REFERENCES.map(x=>x.name),['supervalu','diner-green-yellow','foggy-wet-street']);
 for(let i=0;i<3;i++){
  const r=HONG_KONG_REFERENCES[i],spec=HONG_KONG_REFERENCE_MANIFEST[i];
  const raw=Buffer.from(r.data,'base64');
  assert.equal(sha(raw),spec.sha256);assert.equal(r.mime,spec.mime);
  assert.deepEqual(raw,readFileSync(new URL('../lab/mood-references/hong-kong-nights/'+spec.file,import.meta.url)));
 }
});

test('Numbered provider prompt always matches actual three reference positions after user Base',()=>{
 for(const engine of ['seedream','seedreamlite','gemini','gemini21','krea3','qwen3']){
  const settings={type:'image',mode:'image',engine,moodId:'hong-kong-nights'};
  const max=hongKongUserReferenceLimit(settings);
  for(const count of [0,Math.min(max,1),max]){
   const labels=Array.from({length:count},(_,i)=>({name:'user-'+i+'.jpg',role:i===0?'base':'identity'}));
   const recipe=prepareMoodPrompt('Keep this existing person and scene.','hong-kong-nights',90,{engine,referenceCount:count});
   assert.equal(recipe.error,'',engine+' '+count+' '+recipe.error);
   const p={...settings,...recipe.metadata,prompt:recipe.prompt,referenceMode:'base',referenceRoles:labels};
   const final=compileImagePrompt(recipe.prompt,labels,p);
   assert.equal(builtInMoodReferenceCount(p),3);
   assert.ok(final.includes('BUILT-IN REFERENCES '+(count+1)+', '+(count+2)+', '+(count+3)) ||
     final.includes('HK STYLE REFERENCES '+(count+1)+'='),'Provider reference numbering');
   for(const [i,label] of ['Supervalu / DOMINANT LOOK','Diner green-yellow / SECONDARY COLOR','Foggy wet street / SECONDARY DEPTH'].entries()){
     const long='Reference '+(count+i+1)+' ['+label+']';
     const short=(count+i+1)+'='+['Supervalu','Diner','Foggy street'][i];
     assert.ok(final.includes(long)||final.includes(short),engine+' '+label+' was not mapped');
   }
   assert.match(final,/No neon spectacle/i);
   assert.ok(final.length<=(engine==='seedreamlite'?3000:5000),engine+' provider prompt overflow: '+final.length);
   if(engine==='seedream'||engine==='gemini')assert.deepEqual(moodReferencePlan(p).references,[],'No duplicate browser upload');
  }
  assert.ok(hongKongReferenceError(settings,max+1));
  assert.ok(referenceGuidanceError(Array.from({length:max+1},()=>({role:'identity'})),settings));
 }
});

test('New Hong Kong Nocturne generation defaults to approved film preset, manual off and history remain possible',()=>{
 const approved={version:2,grain:46,haze:56,halation:83,film:78};
 assert.deepEqual(HONG_KONG_VARIANTS.original.filmFinish,HONG_KONG_FILM_FINISH);
 assert.deepEqual(HONG_KONG_FILM_FINISH,{version:2,grain:0,haze:0,halation:0,film:0});
 assert.equal(FILM_FINISH_RENDER_REVISION,10);
 const base=prepareMoodPrompt('Portrait','hong-kong-nights',74,{engine:'seedream',referenceCount:1});
 const custom=prepareMoodPrompt('Portrait','hong-kong-nights',74,{engine:'seedream',referenceCount:1,filmFinish:{...HONG_KONG_FILM_FINISH}});
 assert.equal(base.prompt,custom.prompt);
 assert.deepEqual(base.metadata.filmFinish,HONG_KONG_FILM_FINISH);
 const ui=readFileSync(new URL('../lab/moods.js',import.meta.url),'utf8');
 assert.ok(ui.includes('finishControls.set({version:2,grain:46,haze:56,halation:83,film:78})'),'owner preset is only selected explicitly');
 assert.deepEqual(custom.metadata.filmFinish,HONG_KONG_FILM_FINISH);
});

test('Krea quotes all four input images and unrelated Mood pricing is unchanged',()=>{
 const p={type:'image',mode:'image',moodId:'hong-kong-nights',engine:'krea3',referenceRoles:[{role:'base'}],resolution:'2k'};
 assert.equal(hongKongReferenceCount(p),3);
 assert.equal(quoteCustomerImageCredits(p,1).estimatedUsd,krea3EstimateMicros(p,4)/1e6);
 const other={...p,moodId:'night-flash'};
 assert.equal(hongKongReferenceCount(other),0);
 assert.equal(quoteCustomerImageCredits(other,1).estimatedUsd,krea3EstimateMicros(other,1)/1e6);
 assert.ok(hongKongReferenceError({...p,engine:'qwen3'},1));
 assert.equal(hongKongReferenceCount({...p,moodId:'night-flash'}),0);
});
