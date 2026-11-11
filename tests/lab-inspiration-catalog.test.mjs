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
  assert.equal(INSPIRATION_SCENES.length,45);
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

test('catalog has 45 unique scene concepts, eight categories, working local covers and editable photographic prompts',()=>{
  const ids=new Set(),names=new Set(),categories=new Set();
  for(const scene of INSPIRATION_SCENES){
    assert.ok(!ids.has(scene.id),'duplicate id '+scene.id);
    assert.ok(!names.has(scene.title),'duplicate name '+scene.title);
    ids.add(scene.id);names.add(scene.title);categories.add(scene.category);
    assert.ok(scene.prompt.length>110&&scene.prompt.length<=5000,scene.title+' prompt length');
    assert.ok(scene.cover.startsWith('./'),'asset stays on PV LAB origin');
    assert.ok(existsSync(new URL('../lab/'+scene.cover.slice(2),import.meta.url)),'missing preview '+scene.cover);
  }
  assert.deepEqual([...categories].sort(),['Cinema','After Hours','Fashion','Analog','Street','Future','Intimacy','Atmospheres'].sort());
  const existing=['Dream Blur','Flash Leather','Fisheye 2000','Green Haze'];
  assert.ok(existing.every(name=>!names.has(name)),'original approved cards cannot be duplicated');
});
