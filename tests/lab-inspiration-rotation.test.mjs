import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  INSPIRATION_VARIATIONS,LEGACY_INSPIRATION_PROMPTS,
  createInspirationRotation,isInspirationExample
} from '../lab/inspiration-looks.js';

function memoryStorage(){
  const data=new Map();
  return {
    getItem:key=>data.get(key)||null,
    setItem:(key,value)=>data.set(key,value),
    dump:()=>new Map(data)
  };
}

test('seven Inspiration cards have eight distinct photographic examples each',()=>{
  const names=['dream-blur','90s-cinema','fashion-editorial','chrome-couture','dreamcore','hong-kong-nights','80s-film'];
  assert.deepEqual(Object.keys(INSPIRATION_VARIATIONS).sort(),names.sort());
  const all=[];
  for(const [id,scenes] of Object.entries(INSPIRATION_VARIATIONS)){
    assert.equal(scenes.length,8,id+' needs eight editorial variations');
    assert.equal(new Set(scenes).size,8,id+' includes duplicate scenarios');
    for(const scene of scenes){
      assert.ok(scene.length>85&&scene.length<1100,id+' scene is implausibly short/long');
      assert.ok(isInspirationExample(scene));
      all.push(scene);
    }
  }
  assert.equal(new Set(all).size,56,'No repeated scenes across different Moods');
  assert.ok(INSPIRATION_VARIATIONS['fashion-editorial'].some(scene=>/older woman/i.test(scene)));
  assert.ok(INSPIRATION_VARIATIONS['fashion-editorial'].some(scene=>/male fashion model/i.test(scene)));
  assert.ok(INSPIRATION_VARIATIONS['fashion-editorial'].some(scene=>/two adult models/i.test(scene)));
  assert.ok(INSPIRATION_VARIATIONS['fashion-editorial'].some(scene=>/hands fastening/i.test(scene)));
});

test('reselecting one card cycles through eight visible prompts and wraps cleanly',()=>{
  const storage=memoryStorage(),rotation=createInspirationRotation(storage);
  let current='';
  const visited=[];
  for(let i=0;i<8;i++){
    const choice=rotation.select('fashion-editorial',current);
    assert.equal(choice.preserved,false);
    assert.equal(choice.index,i);
    current=choice.prompt;
    visited.push(current);
  }
  assert.deepEqual(visited,INSPIRATION_VARIATIONS['fashion-editorial']);
  assert.equal(rotation.select('fashion-editorial',current).prompt,visited[0]);
  assert.equal(rotation.select('unknown-mood'),null);
});

test('user-written and manually altered prompts are never replaced',()=>{
  const rotation=createInspirationRotation(memoryStorage());
  const custom='An elderly musician under purple light, candid 35mm, leather shoes.';
  assert.deepEqual(rotation.select('dream-blur',custom),{prompt:custom,preserved:true});
  const first=rotation.select('dream-blur','');
  assert.equal(first.index,0,'Preserving custom work must not advance the carousel');
  const edited=first.prompt+' Please keep this specific person.';
  assert.deepEqual(rotation.select('90s-cinema',edited),{prompt:edited,preserved:true});
  assert.equal(rotation.select('90s-cinema','').index,0);
  assert.equal(rotation.select('fashion-editorial',custom).prompt,custom);
});

test('guest and signed-in studio can share rotation through session storage',()=>{
  const storage=memoryStorage();
  const guest=createInspirationRotation(storage);
  const first=guest.select('hong-kong-nights','');
  const signed=createInspirationRotation(storage);
  const second=signed.select('hong-kong-nights',first.prompt);
  assert.equal(second.index,1);
  assert.notEqual(first.prompt,second.prompt);
  assert.equal(guest.select('fashion-editorial','').index,0,'Each card tracks its own position');
});

test('the old fixed demo prompt is replaced by a photographic variation',()=>{
  const rotation=createInspirationRotation(memoryStorage());
  for(const [id,legacyPrompt] of Object.entries(LEGACY_INSPIRATION_PROMPTS)){
    assert.ok(isInspirationExample(legacyPrompt));
    assert.equal(rotation.select(id,legacyPrompt).index,0);
  }
});

test('session storage failures never prevent choosing an Inspiration card',()=>{
  const broken={
    getItem(){throw Error('Storage blocked');},
    setItem(){throw Error('Storage blocked');}
  };
  const rotation=createInspirationRotation(broken);
  assert.equal(rotation.select('fashion-editorial','').index,0);
  assert.equal(rotation.select('fashion-editorial','').index,1);
});

test('authenticated requests skip invisible Mood photos but retain explicit user references',()=>{
  const lab=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  const guest=readFileSync(new URL('../lab/studio-guest-image.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  assert.match(lab,/const choice=inspirationRotation\.select\(id,\$\('prompt'\)\.value\)/);
  assert.match(lab,/const preserveWorkspace=choice\.preserved\|\|references\.length>0\|\|!!file/);
  assert.match(lab,/inspirationMoodId=id/);
  assert.match(lab,/disableAutoMoodReferences:inspirationMoodId!==null&&selected\.moodId===inspirationMoodId/);
  assert.match(lab,/const curated=s\.disableAutoMoodReferences[\s\S]*?\?\{settings:selected,references:\[\]\}/);
  assert.match(lab,/const curated=disableAutoMoodReferences[\s\S]*?\?\{settings:selected,references:\[\]\}/);
  assert.match(lab,/imageInputReferences\(\)\.map\(ref=>\(\{file:ref\.file/);
  assert.match(guest,/createInspirationRotation\(sessionStorage\)/);
  assert.match(html,/inspiration=rotation1/);
  assert.equal([...html.matchAll(/data-welcome-mood=/g)].length,7,'Keep the six original signed-in photographs and add Chrome Couture');
  assert.equal([...html.matchAll(/data-guest-mood=/g)].length,7,'Keep the six original public photographs and add Chrome Couture');
});


test('Flash Leather treatment is about flash, material and lighting, not a default model',()=>{
  const moods=readFileSync(new URL('../lab/moods.js',import.meta.url),'utf8');
  const start=moods.indexOf('"id": "fashion-editorial"');
  const end=moods.indexOf('"id": "berlin-rave"',start);
  assert.ok(start>=0&&end>start);
  const direction=moods.slice(start,end);
  assert.match(direction,/direct or off-axis flash/);
  assert.match(direction,/tactile leather and fabric texture/);
  assert.match(direction,/Respect the written subject/);
  assert.match(direction,/Never introduce a default wet-haired woman/);
});


test('Chrome Couture preserves the original non-explicit editorial scene and adds selective starburst optics',()=>{
  const sample=INSPIRATION_VARIATIONS['chrome-couture'][0];
  assert.match(sample,/High-fashion futuristic editorial, portrait of a woman in a silver metallic corset/);
  assert.match(sample,/sharp chrome blade resting against her shoulder/);
  assert.match(sample,/vintage optical starburst diffraction/);
  assert.match(sample,/believable direct-flash falloff/);
  const lab=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  assert.match(lab,/id==='chrome-couture'\?'fashion-editorial':id/);
  assert.match(lab,/draft.mood==='chrome-couture'\?'fashion-editorial':draft.mood/);
  assert.match(lab,/inspirationMoodId=underlyingMood/);
  const moods=readFileSync(new URL('../lab/moods.js',import.meta.url),'utf8');
  assert.doesNotMatch(moods,/"id": "chrome-couture"/,'Do not alter the fixed curated Mood catalog');
});
