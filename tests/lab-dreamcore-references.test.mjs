import test from 'node:test';
import assert from 'node:assert/strict';
import {builtInMoodReferenceCount,compileImagePrompt,referenceGuidanceError} from '../lab/reference-guidance.js';
import {prepareMoodPrompt} from '../lab/moods.js';
import {DREAMCORE_REFERENCES} from '../lab-worker/dreamcore-references.mjs';
import {storedImageDimensions} from '../lab-worker/fal-upscale.mjs';

const settings={type:'image',mode:'image',engine:'seedream',moodId:'dreamcore'};
test('Dreamcore references retain valid uncropped images and only activate on supported image models',()=>{
  assert.equal(builtInMoodReferenceCount(settings),3);
  assert.deepEqual(DREAMCORE_REFERENCES.map(r=>r.name),['train','industrial-corridor','misty-walkway']);
  for(const ref of DREAMCORE_REFERENCES){
    const bytes=Buffer.from(ref.data,'base64');
    assert.equal(bytes.length,ref.bytes);
    assert.deepEqual(storedImageDimensions(bytes,ref.mime),{width:1280,height:960});
  }
  for(const patch of [{moodId:'custom'},{moodId:'night-flash'},{moodId:''},{engine:'flash'},{engine:'soul'},{type:'video'},{mode:'upscale'}]){
    assert.equal(builtInMoodReferenceCount({...settings,...patch}),0);
    assert.equal(compileImagePrompt('Direction',[],{...settings,...patch}),'Direction');
  }
});
test('Dreamcore final payload preserves reference numbering, roles and prompt budget across intensity tiers',()=>{
  for(const engine of ['seedream','gemini'])for(const referenceMode of ['base','references']){
    for(const count of [0,1,2,7])for(const intensity of [1,34,35,69,70,89,90,99,100]){
      const original='Keep the person and car recognizable.';
      const labels=Array.from({length:count},(_,i)=>({role:!i&&referenceMode==='base'?'base':'none'}));
      const recipe=prepareMoodPrompt(original,'dreamcore',intensity,{engine,referenceCount:count,referenceMode});
      const prompt=compileImagePrompt(recipe.prompt,labels,{...settings,engine,...recipe.metadata});
      assert.equal(recipe.error,'');
      assert.ok(prompt.length<=5000,`${engine}/${referenceMode}/${count}/${intensity}: ${prompt.length}`);
      assert.match(prompt,/DREAMCORE V6/);
      assert.ok(prompt.includes(`BUILT-IN REFERENCES ${count+1}, ${count+2}, ${count+3}:`));
      assert.match(prompt,/Do not copy trains, pools/);
      assert.match(prompt,/User instructions and assigned roles take priority/);
      if(!count||referenceMode==='references')assert.match(prompt,/These are not Base or identity images/);
      else assert.match(prompt,/The user Base controls identity/);
    }
  }
});
test('Dreamcore reserves three slots without silently discarding user references',()=>{
  const labels=Array.from({length:8},()=>({role:'none'}));
  assert.match(referenceGuidanceError(labels,settings),/Dreamcore accepts up to 7 uploaded photos/);
  assert.equal(referenceGuidanceError(labels.slice(0,7),settings),'');
  assert.equal(referenceGuidanceError(labels,{...settings,moodId:'night-flash'}),'');
});
