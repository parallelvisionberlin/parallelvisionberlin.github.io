import test from 'node:test';
import assert from 'node:assert/strict';
import {MOOD_MODELS,moodById,prepareMoodPrompt,userFacingImagePrompt} from '../lab/moods.js';
import {moodReferencePlan} from '../lab/mood-references.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';
import {INSPIRATION_VARIATIONS} from '../lab/inspiration-looks.js';

function submission(intensity,engine='seedream',direction='',extra=[]){
  const labels=[{name:'my-cafe.jpg',role:'base',note:''},...extra];
  const recipe=prepareMoodPrompt(direction,'fisheye-2000',intensity,{engine,referenceCount:labels.length});
  assert.equal(recipe.error,'');
  const settings={type:'image',mode:'image',engine,referenceMode:'base',aspectRatio:'auto',
    prompt:recipe.prompt,...recipe.metadata,referenceRoles:labels};
  const plan=moodReferencePlan(settings);
  return {...plan,recipe,compiled:compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings)};
}

test('a Base at 75 and 100 requests a Japanese Y2K environment as well as a real lens treatment',()=>{
  for(const engine of MOOD_MODELS)
  for(const intensity of [75,89,90,100]){
    const {recipe,compiled,settings}=submission(intensity,engine);
    assert.match(compiled,/Japanese shop signs|Japanese storefront signs/);
    assert.match(compiled,/rebuild surroundings|fully transform the background/);
    assert.match(compiled,/circa-2000 Tokyo/);
    assert.match(compiled,/15mm fisheye/);
    assert.match(compiled,/grain on skin AND shadows|grain in skin and shadows/);
    assert.match(compiled,/magazine-scan/);
    assert.match(compiled,/IDENTITY LOCK: keep face, body, expression, people count, pose and outfit/);
    assert.doesNotMatch(recipe.prompt,/outfit and background remain|Change only physically|OPTICS ONLY|Do not copy the two Style reference people, Tokyo alley/);
    if(intensity>=90)assert.match(compiled,/original background need not remain/);
    assert.equal(settings.moodIntensity,intensity);
    assert.equal(userFacingImagePrompt(settings),'');
  }
});

test('scene strength has distinct boundaries while identity and user direction retain priority',()=>{
  for(const [amount,marker] of [[1,'1-34%'],[34,'1-34%'],[35,'35-74%'],[74,'35-74%'],[75,'75-89%'],[89,'75-89%'],[90,'90-100%'],[100,'90-100%']]){
    const {recipe}=submission(amount);
    assert.ok(recipe.prompt.includes('SCENE '+marker));
    assert.match(recipe.prompt,/Explicit user edits and Environment\/location locks override the Mood scene/);
    if(amount<=34){
      assert.match(recipe.prompt,/retain the original place and objects/);
      assert.doesNotMatch(recipe.prompt,/rebuild surroundings|fully transform the background/);
    }
  }
});

test('an explicit cafe location and assigned Environment are preserved intact at maximum intensity',()=>{
  const direction='Keep this exact Berlin cafe and its lettering. Keep her face, black jacket, pose and coffee cup.';
  const environment={name:'my-cafe-environment.jpg',role:'room',note:'Use this exact cafe; do not change the place.'};
  for(const engine of ['seedream','seedreamlite','gemini','gemini21']){
    const {settings,compiled,recipe}=submission(100,engine,direction,[environment]);
    assert.ok(recipe.prompt.startsWith(direction+'\n\n'));
    assert.ok(compiled.includes(environment.note));
    assert.match(compiled,/explicit user location\/Environment locks win/i);
    assert.equal(settings.moodOriginalPrompt,direction);
    assert.equal(userFacingImagePrompt(settings),direction);
    assert.equal(settings.referenceRoles[1].role,'room');
  }
});

test('full and Lite provider budgets include the same original two photos and the complete role map',()=>{
  for(const engine of ['seedream','seedreamlite','gemini','gemini21'])
  for(const intensity of [34,74,75,100]){
    const extra=Array.from({length:7},(_,i)=>({name:'identity-'+i+'.jpg',role:'identity',note:''}));
    const {settings,references,compiled,recipe}=submission(intensity,engine,'',extra);
    assert.equal(references.length,2);
    assert.deepEqual(references.map(r=>r.file),['01-analog-daylight.webp','02-fisheye-flash.webp']);
    assert.deepEqual(settings.referenceRoles.slice(-2).map(r=>r.role),['style','style']);
    for(const reference of references){
      assert.ok(reference.label.note.length<=300);
      assert.match(reference.label.note,/location locks win/);
      assert.ok(compiled.includes(reference.label.note));
    }
    assert.equal(settings.prompt,recipe.prompt);
    assert.ok(compiled.length<=(engine==='seedreamlite'?3000:5000),engine+' '+intensity+' '+compiled.length);
    assert.equal(moodReferencePlan(settings).references.length,0);
  }
});

test('text-only and References Only keep the original scene recipe and do not enter the Base scene treatment',()=>{
  for(const [referenceCount,referenceMode] of [[0,'base'],[0,'references'],[1,'references'],[4,'references']]){
    const recipe=prepareMoodPrompt('A street-fashion portrait.','fisheye-2000',100,{referenceCount,referenceMode});
    assert.equal(recipe.error,'');
    assert.match(recipe.prompt,/ORIGINAL STREET-FASHION BRIEF/);
    assert.doesNotMatch(recipe.prompt,/SCENE 90-100%|Y2K WORLD|IDENTITY LOCK/);
  }
  assert.equal(moodById('fisheye-2000').defaultIntensity,75);
  const [direction]=INSPIRATION_VARIATIONS['fisheye-2000'];
  assert.match(direction,/selected intensity/);
  assert.match(direction,/explicit instruction to retain a particular location/);
  assert.doesNotMatch(direction,/clothing and setting of any uploaded Base/);
});
