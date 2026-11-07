import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {beautyLookPresets,beautyLookCatalog} from '../lab/beauty-look-catalog.js';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(repo,'lab/beauty.html'),'utf8');
const css=fs.readFileSync(path.join(repo,'lab/beauty-archive-curation.css'),'utf8');
const section=html.match(/<section class="beauty-looks"[\s\S]*?<\/section>/)?.[0]||'';
const names=[...section.matchAll(/data-look="([a-z-]+)"/g)].map(m=>m[1]);
const sources=[...section.matchAll(/class="beauty-look-photo" src="([^"]+)"/g)].map(m=>m[1]);
test('curated archive has 20 independently named, photographed, functional presets',()=>{
 assert.equal(names.length,20);assert.equal(new Set(names).size,20);
 assert.deepEqual(new Set(names),new Set(Object.keys(beautyLookPresets)));
 assert.equal(sources.length,20);assert.equal(new Set(sources).size,20);
 for(const src of sources){assert.match(src,/^\.\/visuals\/beauty\/atelier\/[a-z0-9-.]+\.webp$/);const p=path.join(repo,'lab',src.slice(2));assert.equal(fs.existsSync(p),true,src);assert.ok(fs.statSync(p).size<180000,src)}
 assert.equal((section.match(/<small>/g)||[]).length,20);
 assert.equal((section.match(/aria-pressed="false"/g)||[]).length,20);
 assert.match(css,/\.beauty-look-copy small\{display:block/);
 assert.match(section,/aria-description="Scroll, swipe or use left and right arrow keys to browse/);
 assert.doesNotMatch(section,/class="beauty-looks-arrow/);
});
test('all looks map only to existing category values, with distinct combinations',()=>{
 const keys=['makeup','hair','skin','light','color'];
 const seen=[];
 for(const [id,look] of Object.entries(beautyLookPresets)){
  assert.equal(typeof look.text,'string');assert.ok(look.text.length>40&&look.text.length<1500,id);
  for(const key of keys){assert.ok(beautyLookCatalog[key].some(opt=>opt.id===look[key]),id+':'+key)}
  assert.doesNotMatch(look.text,/replace (?:the |their )?(?:clothing|outfit|location)|new accessories/i,id);
  seen.push(keys.map(k=>look[k]).join('/'));
 }
 assert.equal(new Set(seen).size,20,'Each look applies a distinct native configuration');
 assert.equal(beautyLookPresets.night.light,'low-key');
 assert.equal(beautyLookPresets.film.color,'film');
 assert.equal(beautyLookPresets.natural.light,'daylight');
});
test('publication respects locked ALTER and all original generation controls',()=>{
 assert.match(html,/<h1>ALTER <br>Studio\.<\/h1>/);
 assert.match(html,/\.\/branding\/pv-mark\.png/);
 assert.match(html,/beauty-archive-curation\.css\?v=20261107-archive1/);
 assert.match(html,/id="beauty-generate"/);
 assert.match(html,/id="beauty-photo"/);
 assert.match(html,/id="beauty-ratio"/);
 assert.match(html,/id="beauty-resolution"/);
 assert.match(html,/id="beauty-model"/);
 assert.match(html,/20 curated photographic directions/);
});
