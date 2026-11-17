import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {INSPIRATION_SCENES} from '../lab/inspiration-catalog-data.js';
import {OWNER_ORIGINAL_HOVER_FRAMES,RAVER_INSPIRATION_SCENE} from '../lab/inspiration-owner-scenes.js';

const read=path=>readFileSync(new URL('../lab/'+path,import.meta.url),'utf8');
const manifest=JSON.parse(read('visuals/inspiration-sets/manifest.json'));
const byId=id=>INSPIRATION_SCENES.find(scene=>scene.id===id);
const isLocal=asset=>asset.startsWith('./visuals/inspiration-sets/');

test('all twenty owner uploads are archived by series with a real full frame and separately cropped card',()=>{
  assert.equal(manifest.frames.length,20);
  const expected=['dream-blur','flash-leather','chrome-couture','eros','hotel-intimacy','raver','hong-kong-nights','post-human','desert-sculptures'];
  assert.deepEqual([...new Set(manifest.frames.map(f=>f.series))].sort(),expected.sort());
  assert.deepEqual(manifest.frames.map(f=>f.index),Array.from({length:20},(_,i)=>i+1));
  for(const f of manifest.frames){
    assert.ok(f.sourceFile&&/^[a-f0-9]{64}$/.test(f.sourceSha256),'original filename and digest');
    const [w,h]=f.sourceSize,[x0,y0,x1,y1]=f.cardCropSourcePixels;
    assert.equal(y0,0);assert.equal(y1,h);
    assert.ok(x0>=0&&x1<=w&&x0<x1);
    assert.ok(Math.abs((x1-x0)/h-.6)<.002,'3:5 source crop');
    assert.ok(x0<=w*f.subjectFocalX&&w*f.subjectFocalX<=x1,'focal point included');
    for(const type of ['full','card']){
      const asset=f[type];
      assert.ok(isLocal(asset),'all owner assets stay on PV LAB origin');
      assert.ok(existsSync(new URL('../lab/'+asset.slice(2),import.meta.url)),'missing '+asset);
      const buffer=readFileSync(new URL('../lab/'+asset.slice(2),import.meta.url));
      assert.equal(buffer.subarray(0,4).toString(),'RIFF','WebP file magic');
      assert.equal(buffer.subarray(8,12).toString(),'WEBP','WebP type');
      assert.equal(buffer.length,f[type+'Bytes'],'byte count matches manifest');
      assert.ok(buffer.length<350000,'optimized preview must remain efficient');
    }
  }
  const chrome=manifest.frames[3];
  assert.equal(chrome.slug,'silver-sculpture');
  assert.ok(chrome.cardCropSourcePixels[0]>600&&chrome.cardCropSourcePixels[2]<1400,
    'Chrome Couture crop centers the model, not the dark wall');
});

test('approved original Image cards have second frame without replacing their primary covers',()=>{
  const html=read('studio.html');
  assert.equal((html.match(/data-guest-mood=/g)||[]).length,8);
  assert.equal((html.match(/data-welcome-mood=/g)||[]).length,8);
  const expected={
    'dream-blur':'dream-blur',
    'fashion-editorial':'flash-leather',
    'chrome-couture':'chrome-couture',
    'hong-kong-nights':'hong-kong-nights'
  };
  for(const [mood,series] of Object.entries(expected)){
    assert.ok(OWNER_ORIGINAL_HOVER_FRAMES[mood].includes('/'+series+'/cards/'));
    assert.ok(existsSync(new URL('../lab/'+OWNER_ORIGINAL_HOVER_FRAMES[mood].slice(2),import.meta.url)));
    assert.match(html,new RegExp('data-guest-mood="'+mood+'"'));
    assert.match(html,new RegExp('data-welcome-mood="'+mood+'"'));
  }
  assert.match(html,/inspirationCatalog=20261117-owner1/);
});

test('Raver is a distinct, two-frame Inspiration card and never a new backend Mood',()=>{
  assert.equal(INSPIRATION_SCENES.length,48);
  const raver=byId('raver');
  assert.equal(raver,RAVER_INSPIRATION_SCENE);
  assert.equal(raver.title,'Raver');
  assert.equal(raver.category,'After Hours');
  assert.equal(raver.examples.length,2);
  assert.notEqual(raver.examples[0].cover,raver.examples[1].cover);
  assert.ok(raver.examples.every(item=>isLocal(item.cover)&&item.prompt.length>110));
  const catalog=read('inspiration-catalog.js');
  assert.match(catalog,/sorted\.slice\(0,7\)/);
  assert.match(catalog,/highwayCard\.after\(raverCard\)/);
  assert.match(catalog,/installHoverPreview\(button,cover\)/);
  assert.doesNotMatch(read('inspiration-owner-scenes.js'),/fetch\(|\/api\/|submitImage\(|generateImage\(/);
});

test('Eros, Hotel, Post-Human and Desert preserve the existing recipes while offering owner frames',()=>{
  const sizes={'eros-lingerie':2,'hotel-intimacy':4,'post-human':5,'desert-sculptures':2};
  for(const [id,total] of Object.entries(sizes)){
    const scene=byId(id);
    assert.equal(scene.examples.length,total,id+' offers expected editable frames');
    assert.equal(scene.cover,scene.examples[0].cover);
    assert.equal(scene.prompt,scene.examples[0].prompt);
    assert.ok(scene.examples.every(f=>f.prompt.length>110));
    assert.ok(scene.examples.some(f=>isLocal(f.cover)),'owner photo is exposed');
  }
  assert.ok(byId('eros-lingerie').cover.startsWith('https://d2ol7oe51mr4n9.cloudfront.net/'),
    'original EROS hero preserved');
  assert.ok(isLocal(byId('hotel-intimacy').cover),'Hotel leads with owner photo');
  assert.ok(isLocal(byId('post-human').cover),'Post-Human leads with owner photo');
  assert.ok(!isLocal(byId('desert-sculptures').cover),'existing Desert Sculptures cover preserved');
  const catalog=read('inspiration-catalog.js');
  assert.match(catalog,/OWNER_ORIGINAL_HOVER_FRAMES/);
  assert.match(catalog,/item\?\.examples\?\.length>1\?item\.examples\[1\]\.cover/);
  assert.match(read('inspiration-catalog.css'),/img\[src\*="\/inspiration-sets\/"/);
});
