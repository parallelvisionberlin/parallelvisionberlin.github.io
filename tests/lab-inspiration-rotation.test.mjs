import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldOmitAutomaticMoodReferencesForInspiration,moodReferencePlan} from '../lab/mood-references.js';
import {prepareMoodPrompt} from '../lab/moods.js';
import {
  INSPIRATION_VARIATIONS,LEGACY_INSPIRATION_PROMPTS,CHROME_COUTURE_DEFAULTS,
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

test('existing looks keep eight examples; Chrome Couture has twenty and Fisheye keeps its recipe',()=>{
  const names=['fisheye-2000','dream-blur','90s-cinema','fashion-editorial','chrome-couture','dreamcore','hong-kong-nights','80s-film'];
  assert.deepEqual(Object.keys(INSPIRATION_VARIATIONS).sort(),names.sort());
  const all=[];
  for(const [id,scenes] of Object.entries(INSPIRATION_VARIATIONS)){
    assert.equal(scenes.length,id==='fisheye-2000'?1:id==='chrome-couture'?20:8,id+' has the expected example count');
    assert.equal(new Set(scenes).size,scenes.length,id+' includes duplicate scenarios');
    for(const scene of scenes){
      assert.ok(scene.length>85&&scene.length<1100,id+' scene is implausibly short/long');
      assert.ok(isInspirationExample(scene));
      all.push(scene);
    }
  }
  assert.equal(new Set(all).size,69,'No repeated scenes across different Moods');
  assert.ok(INSPIRATION_VARIATIONS['fashion-editorial'].some(scene=>/older woman/i.test(scene)));
  assert.ok(INSPIRATION_VARIATIONS['fashion-editorial'].some(scene=>/male fashion model/i.test(scene)));
  assert.ok(INSPIRATION_VARIATIONS['fashion-editorial'].some(scene=>/two adult models/i.test(scene)));
  assert.ok(INSPIRATION_VARIATIONS['fashion-editorial'].some(scene=>/hands fastening/i.test(scene)));
});

test('Sun Fade uses the approved surfer scene first and cycles to distinct coast memories',()=>{
  const scenes=INSPIRATION_VARIATIONS['80s-film'];
  assert.equal(scenes.length,8);
  assert.match(scenes[0],/young adult woman.*surfboard/);
  assert.match(scenes[0],/muted blue-green water/);
  assert.doesNotMatch(scenes[0],/older woman/i);
  assert.ok(scenes.every(prompt=>/grain|35mm|film/i.test(prompt)));
  const storage=memoryStorage();
  storage.setItem('pv-lab-inspiration-rotation-v1',JSON.stringify({'80s-film':5,chromeCoutureRecipeVersion:2}));
  const rotation=createInspirationRotation(storage);
  assert.equal(rotation.select('80s-film','').prompt,scenes[0],'Stale rotation restarts with the new approved image');
  assert.equal(rotation.select('80s-film',scenes[0]).prompt,scenes[1],'Reselect advances to the next variation');
  const older='An older woman on a sun-warmed seaside balcony at the end of a long summer afternoon, faded curtains moving in a breeze, amber film highlights and bold photochemical color.';
  const legacyRotation=createInspirationRotation(memoryStorage());
  assert.equal(legacyRotation.select('80s-film',older).prompt,scenes[0],'Old canned prompt is replaced by the approved first image');
  assert.deepEqual(legacyRotation.select('80s-film','Custom personal beach photo, keep my friend in place.'),{
    prompt:'Custom personal beach photo, keep my friend in place.',preserved:true
  },'Never replace a user-authored prompt');
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  assert.equal((html.match(/welcome-cards\/sun-fade-inspiration-20261104\.webp/g)||[]).length,2,'Guest and signed-in cards share the same approved image');
  assert.doesNotMatch(html,/welcome-cards\/sun-fade\.webp/,'Previous preview is not shown');
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

test('authenticated Inspiration skips other invisible Mood photos but includes Dream Blur optics',()=>{
  const lab=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  const guest=readFileSync(new URL('../lab/studio-guest-image.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  assert.match(lab,/const choice=inspirationRotation\.select\(id,\$\('prompt'\)\.value\)/);
  assert.match(lab,/const preserveWorkspace=choice\.preserved\|\|references\.length>0\|\|!!file/);
  assert.match(lab,/inspirationMoodId=underlyingMood/);
  assert.match(lab,/disableAutoMoodReferences:shouldOmitAutomaticMoodReferencesForInspiration\(inspirationMoodId,selected\.moodId\)/);
  assert.match(lab,/const disableAutoMoodReferences=shouldOmitAutomaticMoodReferencesForInspiration\(inspirationMoodId,selected\.moodId\)/);
  assert.match(lab,/shouldOmitAutomaticMoodReferencesForInspiration\(inspirationMoodId,current\.moodId\)/);
  assert.equal((lab.match(/shouldOmitAutomaticMoodReferencesForInspiration\(/g)||[]).length,3,
    'Price preview, on-click submission, and prompt guidance must agree');
  assert.match(lab,/const curated=s\.disableAutoMoodReferences[\s\S]*?\?\{settings:selected,references:\[\]\}/);
  assert.match(lab,/const curated=disableAutoMoodReferences[\s\S]*?\?\{settings:selected,references:\[\]\}/);
  assert.match(lab,/imageInputReferences\(\)\.map\(ref=>\(\{file:ref\.file/);
  assert.match(guest,/createInspirationRotation\(sessionStorage\)/);
  assert.match(html,/inspiration=rotation1/);
  assert.equal([...html.matchAll(/data-welcome-mood=/g)].length,8,'Keep the six original signed-in photographs and include Chrome Couture and Fisheye');
  assert.equal([...html.matchAll(/data-guest-mood=/g)].length,8,'Keep the six original public photographs and include Chrome Couture and Fisheye');
});

test('Dream Blur Inspiration injects the exact four optical references with or without a Base',()=>{
  assert.equal(shouldOmitAutomaticMoodReferencesForInspiration('dream-blur','dream-blur'),false);
  for(const moodId of ['fashion-editorial','dreamcore','hong-kong-nights','90s-cinema','80s-film'])
    assert.equal(shouldOmitAutomaticMoodReferencesForInspiration(moodId,moodId),true,moodId+' remains text-only');
  assert.equal(shouldOmitAutomaticMoodReferencesForInspiration(null,'dream-blur'),false,'Manual Mood retains references');
  assert.equal(shouldOmitAutomaticMoodReferencesForInspiration('dream-blur','fashion-editorial'),false,'Other Mood selection is independent');
  for(const base of [false,true]){
    const recipe=prepareMoodPrompt('Tactile analog memory with natural slow shutter.','dream-blur',80,{
      engine:'seedream',referenceCount:base?1:0,referenceMode:'base'
    });
    const settings={type:'image',mode:'image',engine:'seedream',resolution:'2k',referenceMode:'base',
      aspectRatio:base?'3:4':'16:9',referenceRoles:base?[{name:'portrait.jpg',role:'base',note:''}]:[],
      prompt:recipe.prompt,...recipe.metadata};
    const plan=moodReferencePlan(settings);
    assert.equal(plan.references.length,4);
    assert.deepEqual(plan.settings.referenceRoles.map(r=>r.role),
      base?['base','style','style','style','style']:['style','style','style','style']);
    assert.deepEqual(plan.references.map(r=>r.file),[
      '01-blue-eye-light-memory.jpg','02-silhouette-blue-room.jpg',
      '03-city-light-trails.jpg','04-abstract-cyan-exposure.jpg'
    ]);
    assert.equal(plan.settings.aspectRatio,settings.aspectRatio);
    assert.equal(plan.settings.prompt,settings.prompt,'The entire Mood recipe stays untouched');
  }
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
  assert.equal(INSPIRATION_VARIATIONS['chrome-couture'].length,20);
  assert.equal(new Set(INSPIRATION_VARIATIONS['chrome-couture']).size,20);
  const lab=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  assert.match(lab,/id==='chrome-couture'\?'fashion-editorial':id/);
  assert.match(lab,/draft.mood==='chrome-couture'\?'fashion-editorial':draft.mood/);
  assert.match(lab,/inspirationMoodId=underlyingMood/);
  const moods=readFileSync(new URL('../lab/moods.js',import.meta.url),'utf8');
  assert.doesNotMatch(moods,/"id": "chrome-couture"/,'Do not alter the fixed curated Mood catalog');
});

test('Chrome Couture rotates twenty sensual Qwen editorial shots and keeps manual directions',()=>{
  assert.deepEqual(CHROME_COUTURE_DEFAULTS,{engine:'qwen3',resolution:'2k',aspectRatio:'16:9',count:1});
  const scenes=INSPIRATION_VARIATIONS['chrome-couture'];
  assert.ok(scenes.slice(1).every(prompt=>/sensual|seductive/.test(prompt)));
  const rotation=createInspirationRotation(memoryStorage());
  for(let i=0;i<20;i++)assert.equal(rotation.select('chrome-couture',i?scenes[i-1]:'').prompt,scenes[i]);
  assert.equal(rotation.select('chrome-couture',scenes[19]).prompt,scenes[0]);
  assert.equal(rotation.select('chrome-couture','My own couture concept').preserved,true);
  const lab=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  const guest=readFileSync(new URL('../lab/studio-guest-image.js',import.meta.url),'utf8');
  assert.match(lab,/const preferredEngine=id==='chrome-couture'\?CHROME_COUTURE_DEFAULTS\.engine:'seedream'/);
  assert.match(lab,/draft\.mood==='chrome-couture'\?CHROME_COUTURE_DEFAULTS\.engine:'seedream'/);
  assert.match(guest,/Qwen Image 3\.0/);
});
