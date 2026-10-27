import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {sceneCoverId} from '../lab/scene-library.js';

test('selects the reference that best fits a landscape card without changing reference order',()=>{
  const refs=[{id:'portrait'},{id:'wide'},{id:'square'},{id:'wide2'}];
  const before=JSON.stringify(refs);
  assert.equal(sceneCoverId(refs,[0.625,1.6,1,2.4]),'wide');
  assert.equal(JSON.stringify(refs),before);
});

test('supports old packs and failed private thumbnails with a valid fallback',()=>{
  const refs=[{id:'missing'},{id:'second'},{id:'third'}];
  assert.equal(sceneCoverId(refs,[null,1.45,0.7]),'second');
  assert.equal(sceneCoverId(refs,[null,null,null]),'missing');
  assert.equal(sceneCoverId([{bad:true},{id:'real'}],[]),'real');
  assert.equal(sceneCoverId([]),null);
  assert.equal(sceneCoverId(undefined),null);
});

test('collection heading stays on the overview; selected Elements show their own image',()=>{
  const js=readFileSync(new URL('../lab/scene-library.js',import.meta.url),'utf8');
  assert.match(js,/hero\.hidden=!!selected;/);
  assert.match(js,/const selected=list\.find\(i=>i\.id===selectedId\)\|\|null;/);
  assert.match(js,/assetPhoto\(photo,item\.refs\[index\]\.id\)/);
  assert.match(js,/selectedPhotoIndex=i;assetPhoto\(photo,ref\.id\)/);
  assert.match(js,/dialog\.classList\.toggle\('scene-item-open',!!selected\)/);
  assert.match(js,/back\.onclick=.*selectedId=null/);
  assert.match(js,/profileSignal\(item\)/);
  assert.match(js,/failedProfiles\.set\(item\.id/);
  assert.match(js,/renderCover\(top,item\);/);
  assert.doesNotMatch(js,/assetPhoto\((?:image|portrait|img),/);
});

test('loads the displayed cover before scanning other private thumbnails',()=>{
  const js=readFileSync(new URL('../lab/scene-library.js',import.meta.url),'utf8');
  const displayed=js.indexOf('assetPhoto(host,chosen);');
  const firstRatio=js.indexOf('await getAssetRatio(first);',displayed);
  const laterPhotos=js.indexOf('const remaining=refs.map((ref,i)=>({ref,i}))',firstRatio);
  const requestCap=js.indexOf('Math.min(2,remaining.length)',laterPhotos);
  assert.ok(displayed>=0&&firstRatio>displayed&&laterPhotos>firstRatio&&requestCap>laterPhotos,
    'Visible thumbnail resolves before an idle, concurrency-limited best-cover scan');
  assert.match(js,/window\.requestIdleCallback\(resolve,\{timeout:1000\}\)/);
  assert.match(js,/if\(revision!==coverRevision\)return null;/);
});
