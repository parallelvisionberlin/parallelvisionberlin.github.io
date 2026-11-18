import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {beautyLookCatalog as catalog} from '../lab/beauty-look-catalog.js';
const html=readFileSync(new URL('../lab/beauty.html',import.meta.url),'utf8');
const keys={light:['flash','high-key'],color:['warm','film','soft-film']};
for(const [category,ids] of Object.entries(keys))for(const id of ids){
 test(`ALTER ${category}/${id} uses its new user-approved photographic preview`,()=>{
  const option=catalog[category].find(x=>x.id===id);
  assert.ok(option,`missing ${category}/${id}`);
  assert.match(option.image,new RegExp(`alter-${category}-${id}-fixed-20261107\\.webp$`));
  const buf=readFileSync(new URL('../lab/'+option.image.slice(2),import.meta.url));
  assert.ok(buf.length>14000);
  assert.equal(buf.subarray(0,4).toString(),'RIFF');
  assert.equal(buf.subarray(8,12).toString(),'WEBP');
  const pattern=new RegExp(`data-beauty-choice="beauty-${category}" data-value="${id}"[^>]+>\\s*<span class="beauty-choice-photo" style="background-image:url\\('([^']+)'\\)`);
  assert.equal(html.match(pattern)?.[1],option.image);
 });
}
test('ALTER preserves all other approved Light/Color reference pictures and original option',()=>{
 const old={
  light:{daylight:'alter-light-daylight-20261107.webp',softbox:'alter-light-softbox-20261107.webp',side:'alter-light-side-editorial-20261107.webp','low-key':'alter-light-low-key-20261107.webp',window:'alter-light-window-20261107.webp',rim:'alter-light-rim-editorial-20261107.webp'},
  color:{neutral:'alter-color-neutral-20261107.webp',cool:'alter-color-cool-20261107.webp',mono:'alter-color-mono-20261107.webp',muted:'alter-color-muted-20261107.webp',contrast:'alter-color-contrast-20261107.webp'}
 };
 for(const category of ['light','color']){
  assert.equal(catalog[category].length,9);
  assert.equal(catalog[category][0].id,'keep');
  assert.equal(catalog[category][0].image,null);
  for(const [id,filename] of Object.entries(old[category]))assert.equal(catalog[category].find(x=>x.id===id)?.image,'./visuals/beauty/atelier/'+filename);
 }
 assert.equal((html.match(/data-beauty-original/g)||[]).length,5);
});
