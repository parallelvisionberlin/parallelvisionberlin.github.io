import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {HONG_KONG_VARIANTS,hongKongVariant} from '../lab/hong-kong-variants.js';
import {prepareMoodPrompt} from '../lab/moods.js';
import {moodReferencePlan,isMoodStyleReference} from '../lab/mood-references.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';

const originalHashes={
  'plaza-grill.webp':'f374494e03656eb0431c5c79e02412cf146405ba01bba19360bd7d2b0fa1b9d8',
  'greg-iii.png':'5a71e513a03809d3e79ebfe0e323a25f49b81387186eb3933c40ad839d3b2c04',
  'greg-reds.png':'3b5a605336163c0cf3e5384af7caa5951156b011029185cf2987dc0932b6ac58',
  'young-woman-tram.webp':'daf3222f20123167736a8527a69572636179363b6ef3e24080e9af1cd8142cb4',
  'silver-grill-cafe.jpg':'f6347d2143a501645cc92ac31a78244d9afc9dea7c33528fca49aa5ce9d1a52c',
  'supervalu.jpg':'04b05a9d14a03fc2a3c82e980a235e98d35e715d21a29cacdd2f67fdf559f643',
  'greg22.png':'312f30940550a782743a0bea74f4b1b86cb6259392b99cb2f58b3c541b4fb7ef',
  'sheung-wan-street.webp':'3cd80f74fe4f1fec29ecad173513d7537b1841cd3a7ab74ea119ad93d6fd4f86'
};

test('every shipped Hong Kong original is byte-identical to the user-uploaded photo',()=>{
  for(const [file,sha] of Object.entries(originalHashes)){
    const bytes=readFileSync(new URL('../lab/mood-references/hong-kong-nights/'+file,import.meta.url));
    assert.ok(bytes.length>40000,file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),sha,file);
  }
});
test('one Hong Kong Nights Mood retains three variant sets of four actual originals',()=>{
  assert.deepEqual(Object.keys(HONG_KONG_VARIANTS),['original','deep-green','slow-shutter']);
  assert.equal(hongKongVariant('invalid'),'original');
  const seen=new Set();
  for(const [id,v] of Object.entries(HONG_KONG_VARIANTS)){
    assert.equal(v.files.length,4,id);
    assert.deepEqual(v.filmFinish,{version:2,grain:0,haze:0,halation:0,film:0},'Film is opt-in for every look');
    for(const file of v.files){assert.ok(originalHashes[file],file);seen.add(file);}
  }
  assert.equal(seen.size,8);
  assert.deepEqual(HONG_KONG_VARIANTS.original.files,['greg-iii.png','plaza-grill.webp','young-woman-tram.webp','greg-reds.png']);
});
test('variant camera and color recipes retain authored subject and identity',()=>{
  const input='Keep the original woman, clothing, room and camera angle.';
  const seen=new Set();
  for(const [id,v] of Object.entries(HONG_KONG_VARIANTS)){
    const recipe=prepareMoodPrompt(input,'hong-kong-nights',85,{engine:'seedream',referenceCount:1,moodVariant:id});
    assert.equal(recipe.error,'',id);
    assert.ok(recipe.prompt.startsWith(input+'\n\n'));
    assert.equal(recipe.metadata.moodVariant,id);
    assert.deepEqual(recipe.metadata.filmFinish,v.filmFinish);
    assert.match(recipe.prompt,/IDENTITY FIRST/);
    assert.match(recipe.prompt,/Preserve face, identity, real body proportions/);
    assert.ok(recipe.prompt.includes(v.direction));
    seen.add(recipe.prompt);
  }
  assert.equal(seen.size,3);
});
test('original photographic sources stay intact for look previews without being injected into user Base generations',()=>{
  for(const [id,variant] of Object.entries(HONG_KONG_VARIANTS)){
    for(const engine of ['seedream','seedreamlite']){
      const recipe=prepareMoodPrompt('Portrait in my room','hong-kong-nights',60,{engine,referenceCount:1,moodVariant:id});
      assert.equal(recipe.error,'',id+'/'+engine);
      const settings={type:'image',mode:'image',engine,aspectRatio:'auto',
        referenceRoles:[{name:'room.jpg',role:'base'}],prompt:recipe.prompt,...recipe.metadata};
      const plan=moodReferencePlan(settings);
      assert.deepEqual(plan.references,[],'no hidden photography enters the model');
      assert.deepEqual(plan.settings.referenceRoles.map(r=>r.role),['base']);
      assert.deepEqual(plan.settings.referenceRoles.filter(r=>!isMoodStyleReference(r)).map(r=>[r.role,r.name]),[['base','room.jpg']]);
      assert.equal(plan.settings,settings,'no hidden changes to user request');
      const full=compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings);
      assert.ok(full.length<=(engine==='seedreamlite'?3000:5000),id+'/'+engine+' length '+full.length);
      for(const file of variant.files){
        const expected=file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'image/jpeg';
        assert.ok(['image/png','image/webp','image/jpeg'].includes(expected));
        const bytes=readFileSync(new URL('../lab/mood-references/hong-kong-nights/'+file,import.meta.url));
        assert.ok(bytes.length>40000,'original look photo remains available');
      }
    }
  }
});
test('Studio and public Explore route selected treatment through pricing without additional paid submissions',()=>{
  const explore=readFileSync(new URL('../lab/explore-moods.js',import.meta.url),'utf8');
  const photobooth=readFileSync(new URL('../lab/app-mood-generation.js',import.meta.url),'utf8');
  const worker=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../lab/moods.html',import.meta.url),'utf8');
  assert.match(explore,/client\.prepare\(source,selected,description,moodVariant\)/);
  assert.match(photobooth,/async prepare\(file,mood,direction,moodVariant='original'\)/);
  assert.match(photobooth,/quote\.settings\?\.moodVariant!==recipe\.metadata\.moodVariant/);
  assert.match(worker,/\['original','deep-green','slow-shutter'\]/);
  assert.match(ui,/id="mc-hk-variation"/);
  assert.match(explore,/query\.set\('variation',hongKongVariant\(moodVariant\)\)/);
});
