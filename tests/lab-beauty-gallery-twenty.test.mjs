import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {beautyLookCatalog,beautyLookPresets} from '../lab/beauty-look-catalog.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'lab/beauty.html'),'utf8');
const css=fs.readFileSync(path.join(root,'lab/beauty-gallery-20261107.css'),'utf8');
const ids=['goldenhour','skinstudy','windowstudy','softfocus','velvet','silverhalo','windblown'];
const names=['Golden Hour','Skin Study','Window Study','Soft Focus','Velvet','Silver Halo','Windblown'];
test('Twenty native archive cards retain the original thirteen first, then seven unique supplied photo treatments',()=>{
 const section=html.match(/<section class="beauty-looks"[\s\S]*?<\/section>/)?.[0]||'';
 const values=[...section.matchAll(/data-look="([a-z]+)"/g)].map(m=>m[1]);
 assert.equal(values.length,20);assert.equal(new Set(values).size,20);
 assert.deepEqual(values.slice(13),ids);
 assert.equal((section.match(/<small>/g)||[]).length,20);
 assert.equal((section.match(/aria-pressed="false"/g)||[]).length,20);
 assert.equal(section.includes('Editorial Looks &amp; Moods'),true);
 assert.equal(section.includes('class="beauty-looks-arrow'),false);
 assert.deepEqual(ids.map(id=>Boolean(beautyLookPresets[id])),ids.map(()=>true));
 for(const [i,id] of ids.entries()){
  const look=beautyLookPresets[id];
  assert.ok(section.includes(`<strong>${names[i]}</strong>`));
  const dest='./visuals/beauty/atelier/archive-'+id+'-20261107.webp';
  assert.ok(section.includes(dest));
  const p=path.join(root,'lab',dest.slice(2));
  assert.ok(fs.existsSync(p));assert.ok(fs.statSync(p).size<180000);
  for(const c of ['makeup','hair','skin','light','color'])assert.ok(beautyLookCatalog[c].some(s=>s.id===look[c]),id+':'+c);
  assert.doesNotMatch(look.text,/replace (?:their |the )?(?:outfit|wardrobe|location)|add new (?:scenery|objects)/i);
 }
});
test('Four full cards and a partial fifth are provided only at wide desktop widths',()=>{
 assert.match(html,/beauty-gallery-20261107\.css\?v=20261107-gallery1/);
 assert.match(css,/@media \(min-width: 1350px\)/);
 assert.match(css,/calc\(\(100% - 72px\) \/ 4\.2\)/);
 assert.match(css,/grid|carousel|scroll|strip|archive/i);
 assert.doesNotMatch(css,/(?:beauty-editor-grid|::before|background-image|background-position|background-size|mask-image|beauty-edit-panel|beauty-photo|beauty-choice-photo|#beauty-generate)/);
 assert.match(html,/<h1>ALTER <br>Studio\.<\/h1>/);
 assert.match(html,/beauty-panel-widen-20261107\.css/);
});
