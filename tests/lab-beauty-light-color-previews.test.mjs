import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {beautyLookCatalog as catalog} from '../lab/beauty-look-catalog.js';

const html=readFileSync(new URL('../lab/beauty.html',import.meta.url),'utf8');
for(const group of ['light','color']) test('ALTER '+group+': eight unique relevant photographic previews preserve labels and generation settings',()=>{
 const options=catalog[group];
 assert.equal(options.length,9);
 assert.equal(options[0].id,'keep');
 assert.equal(options[0].image,null);
 const images=options.slice(1).map(x=>x.image);
 assert.equal(new Set(images).size,8);
 for(const item of options.slice(1)){
  assert.match(item.image,new RegExp('^\\./visuals/beauty/atelier/alter-'+group+'-.*-20261107\\.webp$'));
  const url=item.image;
  const file=new URL('../lab/'+url.slice(2),import.meta.url);
  const img=readFileSync(file);
  assert.ok(img.length>5500);
  assert.equal(img.subarray(0,4).toString(),'RIFF');
  const button=html.match(new RegExp('<button type="button" data-beauty-choice="beauty-'+group+'" data-value="'+item.id+'"[^>]*?>\\s*<span class="beauty-choice-photo" style="background-image:url\\(\\x27([^\\x27]+)\\x27\\)"','s'));
  assert.ok(button,'Photo missing from visible '+group+'/'+item.id+' card');
  assert.equal(button[1],url);
  assert.ok(html.includes('<span class="beauty-choice-name">'+item.label+'</span>'));
 }
});
