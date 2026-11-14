import test from 'node:test';
import assert from 'node:assert/strict';
import {moodById,prepareMoodPrompt} from '../lab/moods.js';
import {moodReferencePlan} from '../lab/mood-references.js';

const id='soft-pastel-film';
const options={engine:'seedream',referenceCount:1,referenceMode:'base'};
const tiers=[
  [1,'DELICATE'],[34,'DELICATE'],
  [35,'VISIBLE FILM'],[69,'VISIBLE FILM'],
  [70,'SIGNATURE PASTEL FILM'],[89,'SIGNATURE PASTEL FILM'],
  [90,'EXPRESSIVE FILM'],[99,'EXPRESSIVE FILM'],
  [100,'MAXIMUM PHOTOGRAPHIC FILM']
];

test('Soft Pastel Film defaults to 70 percent and follows a distinct intensity tier',()=>{
  const mood=moodById(id);
  assert.equal(mood.defaultIntensity,70);
  for(const [strength,tier] of tiers){
    const result=prepareMoodPrompt('',id,strength,options);
    assert.equal(result.error,'',String(strength));
    assert.equal(result.metadata.moodIntensity,strength);
    assert.match(result.prompt,new RegExp(tier));
    assert.match(result.prompt,/SOURCE-AWARE 35MM COLOR NEGATIVE/);
    assert.match(result.prompt,/original skin complexion/);
    assert.match(result.prompt,/time of day/);
  }
  const defaultPrompt=prepareMoodPrompt('',id,70,options).prompt;
  const maximumPrompt=prepareMoodPrompt('',id,100,options).prompt;
  assert.notEqual(defaultPrompt,maximumPrompt);
  assert.doesNotMatch(defaultPrompt,/MAXIMUM PHOTOGRAPHIC FILM/);
  assert.match(maximumPrompt,/without bleaching skin/);
});

test('Soft Pastel Film preserves the Base and does not inject hidden Style images',()=>{
  for(const engine of ['seedream','seedreamlite','gemini']){
    const recipe=prepareMoodPrompt('Keep the source portrait and scene.',id,70,{...options,engine});
    assert.equal(recipe.error,'',engine);
    const plan=moodReferencePlan({
      type:'image',mode:'image',engine,moodId:id,moodIntensity:70,
      referenceMode:'base',referenceRoles:[{name:'original.jpg',role:'base'}],
      prompt:recipe.prompt
    });
    assert.equal(plan.references.length,0,engine);
    assert.equal(plan.settings.referenceRoles.length,1,engine);
  }
});

test('Soft Pastel Film remains text-only compatible without inventing a Base',()=>{
  const recipe=prepareMoodPrompt('A candid portrait with soft window light.',id,70,{
    engine:'seedream',referenceCount:0
  });
  assert.equal(recipe.error,'');
  assert.match(recipe.prompt,/Honor the requested subject and composition/);
  assert.match(prepareMoodPrompt('',id,70,{referenceCount:0}).error,/Describe a subject/);
});
