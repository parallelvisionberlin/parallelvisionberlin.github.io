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
  assert.match(html,/data-welcome-mood="soft-pastel-film"/);
  assert.match(html,/data-guest-mood="soft-pastel-film"/);
  assert.doesNotMatch(html,/Choose Vinyl Heat/);
  assert.equal(INSPIRATION_SCENES.length,48);
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

test('catalog has 48 unique scene concepts, eight categories, valid covers and editable photographic prompts',()=>{
  const ids=new Set(),names=new Set(),categories=new Set();
  for(const scene of INSPIRATION_SCENES){
    assert.ok(!ids.has(scene.id),'duplicate id '+scene.id);
    assert.ok(!names.has(scene.title),'duplicate name '+scene.title);
    ids.add(scene.id);names.add(scene.title);categories.add(scene.category);
    assert.ok(scene.prompt.length>110&&scene.prompt.length<=5000,scene.title+' prompt length');
    if(scene.id==='eros-lingerie'){
      assert.equal(new URL(scene.cover).origin,'https://d2ol7oe51mr4n9.cloudfront.net','preserve the approved EROS hosted cover');
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


test('Inspiration hover frames use verified alternative photographs, not generated or reused card covers',()=>{
  const js=read('inspiration-catalog.js');
  const css=read('inspiration-catalog.css');
  const original=read('studio.html');
  const expected={
    '90s-cinema':'mood-previews/90s-cinema-record-shop-20261010.webp',
    'fisheye-2000':'mood-references/fisheye-2000/02-fisheye-flash.webp',
    'hong-kong-nights':'mood-references/hong-kong-nights/plaza-grill.webp',
    dreamcore:'welcome-cards/cloud-spa.webp',
    '80s-film':'welcome-cards/sun-fade.webp'
  };
  for(const [id,file] of Object.entries(expected)){
    assert.ok(js.includes("'"+id+"':'./"+file+"'"),id+' has a registered hover shot');
    assert.ok(existsSync(new URL('../lab/'+file,import.meta.url)),id+' hover photo must exist');
    assert.ok(!original.includes('src="./'+file+'"'),id+' cover and hover shot must differ');
  }
  for(const id of ['lost-highway','desert-stop']){
    const scene=INSPIRATION_SCENES.find(item=>item.id===id);
    assert.ok(scene.examples.length>1&&scene.examples[0].cover!==scene.examples[1].cover);
  }
  assert.match(js,/item\?\.examples\?\.length>1\?item\.examples\[1\]\.cover/);
  assert.match(js,/button\.addEventListener\('pointerenter'/);
  assert.match(js,/overlay\.addEventListener\('load'/);
  assert.match(js,/button\.dataset\.hoverFrame=nextCover/);
  assert.match(js,/installHoverPreview\(button,cover\)/);
  assert.match(js,/OWNER_ORIGINAL_HOVER_FRAMES/);
  assert.match(js,/raverCard&&highwayCard/);
  assert.match(js,/hover:hover/);
  assert.doesNotMatch(js,/generateImage\(|fetch\(|\/api\//);
  assert.match(css,/pointer:fine/);
  assert.match(css,/\.pv-inspiration-hover-shot\.is-ready/);
  assert.match(css,/not\(\[aria-pressed="true"\]\)/);
  assert.match(css,/transition-delay:\.16s/);
  assert.match(css,/prefers-reduced-motion:reduce/);
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
  assert.match(js,/inspiration-catalog\.css\?v=20261117-owner1/);
});


test('Inspiration cards do not expose native hover titles, while keeping screen-reader labels',()=>{
  const html=read('studio.html');
  const catalog=read('inspiration-catalog.js');
  const chrome=[...html.matchAll(/<button\\b[^>]*data-(?:guest|welcome)-mood="chrome-couture"[^>]*>/g)].map(m=>m[0]);
  assert.equal(chrome.length,2,'Public and signed-in Chrome Couture cards exist');
  for(const card of chrome){
    assert.doesNotMatch(card,/\\btitle=/,'No browser tooltip on the card');
    assert.match(card,/\\baria-label=/,'Screen reader name remains');
  }
  assert.doesNotMatch(catalog,/button\\.title\\s*=/,'Dynamic Inspiration cards have no browser-native titles');
  assert.match(catalog,/button\\.setAttribute\\('aria-label'/,'Dynamic cards keep accessible names');
});
