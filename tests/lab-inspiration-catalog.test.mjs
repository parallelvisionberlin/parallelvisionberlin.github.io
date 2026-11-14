import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {INSPIRATION_SCENES} from '../lab/inspiration-catalog-data.js';

const read=path=>readFileSync(new URL('../lab/'+path,import.meta.url),'utf8');

test('Image Inspiration expands original eight cards without modifying Moods',()=>{
  const html=read('studio.html');
  const catalog=read('inspiration-catalog.js');
  const auth=read('lab.js');
  const guest=read('studio-guest-image.js');
  assert.equal((html.match(/data-guest-mood="/g)||[]).length,8);
  assert.equal((html.match(/data-welcome-mood="/g)||[]).length,8);
  assert.equal(INSPIRATION_SCENES.length,47);
  assert.match(read('inspiration-carousel.js'),/import '.\/inspiration-catalog\.js/);
  assert.match(catalog,/\.inspiration-carousel-shell/);
  assert.match(catalog,/inspiration-view-all/);
  assert.match(catalog,/showModal\(\)/);
  assert.match(catalog,/inspiration-catalog-data\.js/);
  assert.match(auth,/window\.addEventListener\('pv-inspiration-concept'/);
  assert.match(guest,/window\.addEventListener\('pv-inspiration-concept'/);
  assert.match(auth,/moodUI\.clear\(true\)/);
  assert.match(auth,/inspirationMoodId=null/);
  assert.match(auth,/scene\.applied=true/);
  assert.match(guest,/storeDraft\(\)/);
  assert.doesNotMatch(catalog,/\/api\/|fetch\(|submitImage|createGeneration/);
});

test('catalog has 47 unique scene concepts, eight categories, valid covers and editable photographic prompts',()=>{
  const ids=new Set(),names=new Set(),categories=new Set();
  for(const scene of INSPIRATION_SCENES){
    assert.ok(!ids.has(scene.id),'duplicate id '+scene.id);
    assert.ok(!names.has(scene.title),'duplicate name '+scene.title);
    ids.add(scene.id);names.add(scene.title);categories.add(scene.category);
    assert.ok(scene.prompt.length>110&&scene.prompt.length<=5000,scene.title+' prompt length');
    if(['eros-lingerie','hotel-intimacy'].includes(scene.id)){
      assert.equal(new URL(scene.cover).origin,'https://d2ol7oe51mr4n9.cloudfront.net','preserve the two approved hosted previews');
    }else{
      assert.ok(scene.cover.startsWith('./'),'asset stays on PV LAB origin');
      assert.ok(existsSync(new URL('../lab/'+scene.cover.slice(2),import.meta.url)),'missing preview '+scene.cover);
    }
  }
  assert.deepEqual([...categories].sort(),['Cinema','After Hours','Fashion','Analog','Street','Future','Intimacy','Atmospheres'].sort());
  const existing=['Dream Blur','Flash Leather','Fisheye 2000','Green Haze'];
  assert.ok(existing.every(name=>!names.has(name)),'original approved cards cannot be duplicated');
});

test('approved road photographs form two coherent cards with five distinct editable shots',()=>{
  const highway=INSPIRATION_SCENES.find(scene=>scene.id==='lost-highway');
  const desert=INSPIRATION_SCENES.find(scene=>scene.id==='desert-stop');
  assert.equal(highway.examples.length,3);
  assert.equal(desert.examples.length,2);
  const shots=[...highway.examples,...desert.examples];
  assert.equal(new Set(shots.map(shot=>shot.cover)).size,5);
  assert.equal(new Set(shots.map(shot=>shot.prompt)).size,5);
  for(const card of [highway,desert]){
    assert.equal(card.cover,card.examples[0].cover);
    assert.equal(card.prompt,card.examples[0].prompt);
    for(const shot of card.examples){
      assert.ok(existsSync(new URL('../lab/'+shot.cover.slice(2),import.meta.url)));
      assert.ok(shot.prompt.length<5000);
      assert.match(shot.prompt,/preserve their facial identity/);
      assert.match(shot.prompt,/adults only/);
    }
  }
  assert.ok(highway.examples.every(shot=>/on-camera flash/.test(shot.prompt)));
  assert.ok(desert.examples.every(shot=>/harsh afternoon sunlight/.test(shot.prompt)));
});


test('Inspiration gallery keeps complete portrait cards and scrolls within the dialog',()=>{
  const css=read('inspiration-catalog.css');
  const js=read('inspiration-catalog.js');
  assert.match(css,/grid-auto-rows:max-content/);
  assert.match(css,/align-content:start/);
  assert.match(css,/flex:1 1 auto;min-height:0/);
  assert.match(css,/padding:24px 32px 42px;overflow-y:auto/);
  assert.match(css,/display:block;flex:0 0 auto;align-self:stretch/);
  assert.match(css,/aspect-ratio:3\/4/);
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(js,/viewAll\.textContent='Explore all'/);
  assert.match(js,/inspiration-catalog\.css\?v=20261111-full-portrait1/);
});
