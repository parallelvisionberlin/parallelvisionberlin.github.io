import test from 'node:test';
import assert from 'node:assert/strict';
import {builtInMoodReferenceCount,compileImagePrompt,referenceGuidanceError} from '../lab/reference-guidance.js';
import {prepareMoodPrompt} from '../lab/moods.js';
import {BERLIN_RAVE_REFERENCES} from '../lab-worker/berlin-rave-references.mjs';
import {storedImageDimensions} from '../lab-worker/fal-upscale.mjs';

const settings={type:'image',mode:'image',engine:'seedream',moodId:'berlin-rave'};
test('Only the built-in Berlin Rave mood enables its three photographs',()=>{
  assert.equal(builtInMoodReferenceCount(settings),3);
  assert.equal(BERLIN_RAVE_REFERENCES.length,3);
  for(const patch of [{moodId:'custom'},{moodId:'night-flash'},{moodId:''},{engine:'flash'},{engine:'soul'},{type:'video'},{mode:'upscale'}]){
    assert.equal(builtInMoodReferenceCount({...settings,...patch}),0);
    assert.equal(compileImagePrompt('Direction',[],{...settings,...patch}),'Direction');
  }
  for(const ref of BERLIN_RAVE_REFERENCES){
    const bytes=Buffer.from(ref.data,'base64');
    assert.equal(bytes.length,ref.bytes);
    assert.deepEqual(storedImageDimensions(bytes,ref.mime),{width:1280,height:720});
  }
});
test('Final Berlin Rave prompts fit the budget with all three hidden references',()=>{
  for(const engine of ['seedream','gemini'])for(const referenceMode of ['base','references']){
    for(const count of [0,1,2,7])for(const intensity of [1,34,35,69,70,80,89,90,99,100]){
      const original='Keep the same face, pose and composition.';
      const labels=Array.from({length:count},(_,i)=>({role:!i&&referenceMode==='base'?'base':'none'}));
      const recipe=prepareMoodPrompt(original,'berlin-rave',intensity,{engine,referenceCount:count,referenceMode});
      const prompt=compileImagePrompt(recipe.prompt,labels,{...settings,engine,...recipe.metadata});
      assert.equal(recipe.error,'');
      assert.ok(prompt.length<=5000,`${engine}/${referenceMode}/${count}/${intensity}: ${prompt.length}`);
      assert.match(prompt,/BERLIN RAVE V4/);
      assert.ok(prompt.includes(`BUILT-IN REFERENCES ${count+1}, ${count+2}, ${count+3}:`));
      assert.match(prompt,/Never import their people, faces, body shapes, robots, DJ equipment/);
      assert.match(prompt,/Explicit user instructions and assigned reference roles take priority/);
      if(!count||referenceMode==='references')assert.match(prompt,/These are not Base or identity images/);
      else assert.match(prompt,/The user Base controls identity/);
    }
  }
});
test('Capacity protects all user references and reserves the three built-ins',()=>{
  const labels=Array.from({length:8},()=>({role:'none'}));
  assert.match(referenceGuidanceError(labels,settings),/up to 7 uploaded photos/);
  assert.equal(referenceGuidanceError(labels.slice(0,7),settings),'');
  assert.equal(referenceGuidanceError(labels,{...settings,moodId:'night-flash'}),'');
});
