import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {beautyLookCatalog} from '../lab/beauty-look-catalog.js';
import {beautySettings,validateBeautyQuote} from '../lab/beauty-settings.js';
const html=readFileSync(new URL('../lab/beauty.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../lab/beauty-makeup-expansion-20261108.css',import.meta.url),'utf8');
test('16 makeup cards use matching distinct high-resolution local images and backend-safe settings',()=>{
 const catalog=beautyLookCatalog.makeup;
 assert.equal(catalog.length,16);
 assert.equal(catalog[0].id,'keep');
 assert.equal(new Set(catalog.map(x=>x.id)).size,16);
 assert.equal(new Set(catalog.slice(1).map(x=>x.image)).size,15);
 for(const option of catalog){
  assert.ok(html.includes('data-beauty-choice="beauty-makeup" data-value="'+option.id+'"'));
  if(option.id==='keep')continue;
  const p=new URL('../lab/'+option.image.slice(2),import.meta.url);
  assert.ok(statSync(p).size>11000,option.id);
  const b=readFileSync(p);
  assert.equal(b.subarray(0,4).toString(),'RIFF');
  assert.equal(b.subarray(8,12).toString(),'WEBP');
  assert.ok(html.includes(option.image));
  const settings=beautySettings({makeup:option.id});
  assert.ok(settings.prompt.includes(option.instruction));
  const q={id:'test',creditCost:25,expiresAt:2000,settings:{...settings,referenceSourceIds:['source']}};
  assert.equal(validateBeautyQuote(q,settings,'source',1000),q);
 }
});
test('Makeup has internal vertical scroll, other four tabs and hero remain unchanged',()=>{
 assert.match(html,/beauty-makeup-expansion-20261108\.css\?v=20261108-makeup1/);
 assert.match(css,/#beauty-panel-makeup \.beauty-choice-list/);
 assert.match(css,/overflow-y:\s*auto/);
 assert.match(css,/grid-auto-rows/);
 assert.doesNotMatch(css,/background-image|\.beauty-editor-grid|\.beauty-photo|\.beauty-looks-list|\.beauty-edit-panel/);
 assert.equal((html.match(/data-beauty-choice="beauty-makeup"/g)||[]).length,16);
 for(const cat of ['hair','skin','light','color'])assert.equal((html.match(new RegExp('data-beauty-choice="beauty-'+cat+'"','g'))||[]).length,9);
 assert.equal((html.match(/data-look="/g)||[]).length,20);
});
