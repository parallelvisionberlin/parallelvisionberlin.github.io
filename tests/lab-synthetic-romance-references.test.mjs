import test from 'node:test';
import assert from 'node:assert/strict';
import {builtInMoodReferenceCount,compileImagePrompt,referenceGuidanceError} from '../lab/reference-guidance.js';
import {prepareMoodPrompt} from '../lab/moods.js';
import {SYNTHETIC_ROMANCE_REFERENCES} from '../lab-worker/synthetic-romance-references.mjs';
import {storedImageDimensions} from '../lab-worker/fal-upscale.mjs';

const settings={type:'image',mode:'image',engine:'seedream',moodId:'synthetic-romance'};
test('Synthetic Romance uses three valid uncropped canon references on supported image models',()=>{
  assert.equal(builtInMoodReferenceCount(settings),3);
  assert.deepEqual(SYNTHETIC_ROMANCE_REFERENCES.map(r=>r.name),['canon-ii-kiss','canon-dust','misty-robot-corridor']);
  for(const ref of SYNTHETIC_ROMANCE_REFERENCES){
    const bytes=Buffer.from(ref.data,'base64');
    assert.equal(bytes.length,ref.bytes);
    assert.deepEqual(storedImageDimensions(bytes,ref.mime),{width:1280,height:720});
  }
  for(const patch of [{moodId:'custom'},{moodId:'night-flash'},{moodId:''},{engine:'flash'},{engine:'soul'},{type:'video'},{mode:'upscale'}]){
    assert.equal(builtInMoodReferenceCount({...settings,...patch}),0);
    assert.equal(compileImagePrompt('Direction',[],{...settings,...patch}),'Direction');
  }
});
test('Synthetic Romance preserves roles, numbering and provider budget across every morphology and intensity tier',()=>{
  const random=Math.random;
  try{
    for(let morphology=0;morphology<5;morphology++){
      Math.random=()=>morphology/5;
      for(const engine of ['seedream','gemini'])for(const referenceMode of ['base','references']){
        for(const count of [0,1,2,7])for(const intensity of [1,34,35,69,70,89,90,99,100]){
          const labels=Array.from({length:count},(_,i)=>({role:!i&&referenceMode==='base'?'base':'none'}));
          const recipe=prepareMoodPrompt('Keep the person recognizable.','synthetic-romance',intensity,{engine,referenceCount:count,referenceMode});
          const prompt=compileImagePrompt(recipe.prompt,labels,{...settings,engine,...recipe.metadata});
          assert.equal(recipe.error,'');
          assert.ok(prompt.length<=5000,`${engine}/${referenceMode}/${count}/${intensity}/${morphology}: ${prompt.length}`);
          assert.ok(prompt.includes(`BUILT-IN REFERENCES ${count+1}, ${count+2}, ${count+3}:`));
          assert.match(prompt,/INVASIVE PHYSICAL BODY TRANSFORMATION/);
          assert.match(prompt,/These are not Base or identity images/);
          assert.match(prompt,/Never import their faces, couple, kiss, embrace/);
          assert.match(prompt,/allow the mood-requested body reconstruction/);
        }
      }
    }
  }finally{Math.random=random;}
});
test('Synthetic Romance reserves three slots without discarding user photographs',()=>{
  const labels=Array.from({length:8},()=>({role:'none'}));
  assert.match(referenceGuidanceError(labels,settings),/Synthetic Romance accepts up to 7 uploaded photos/);
  assert.equal(referenceGuidanceError(labels.slice(0,7),settings),'');
  assert.equal(referenceGuidanceError(labels,{...settings,moodId:'custom'}),'');
});
