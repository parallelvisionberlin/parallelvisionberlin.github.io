import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {beautyLookCatalog} from '../lab/beauty-look-catalog.js';
const html=readFileSync(new URL('../lab/beauty.html',import.meta.url),'utf8');
const changed=new Map([['side','alter-light-side-editorial-20261107.webp'],['rim','alter-light-rim-editorial-20261107.webp']]);
test('Only the Side Light and Rim Light photographic previews are replaced',()=>{
 const options=beautyLookCatalog.light;
 assert.equal(options.length,9);
 const images=options.slice(1).map(o=>o.image);
 assert.equal(new Set(images).size,8);
 assert.equal(beautyLookCatalog.color.length,9);
 for(const [id,filename] of changed){
  const option=options.find(x=>x.id===id);
  assert.ok(option);
  const path='./visuals/beauty/atelier/'+filename;
  assert.equal(option.image,path);
  assert.ok(html.includes('data-beauty-choice="beauty-light" data-value="'+id+'"'));
  assert.ok(html.includes("background-image:url('"+path+"')"));
  const data=readFileSync(new URL('../lab/'+path.slice(2),import.meta.url));
  assert.equal(data.subarray(0,4).toString(),'RIFF');
  assert.equal(data.subarray(8,12).toString(),'WEBP');
  assert.ok(data.length>10000);
 }
 assert.equal(options.find(o=>o.id==='side').instruction,'Directional side lighting, sculpted shadows and controlled highlights.');
 assert.equal(options.find(o=>o.id==='rim').instruction,'A restrained rim light defining the subject against the existing background; retain natural facial detail.');
 assert.equal(html.match(/data-beauty-original/g)?.length,5);
 assert.ok(html.includes('<h1>ALTER <br>Studio.</h1>'));
});
