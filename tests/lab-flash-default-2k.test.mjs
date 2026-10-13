import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {imageModelParameters,buildImageModelInput,IMAGE_PRICES} from '../lab-worker/image-models.mjs';

test('Seedream Flash defaults to 2K in Studio; Seedream Pro retains 1K for drafts',()=>{
  const src=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  assert.match(src,/\['fal','seedream','kling'\]\.includes\(imageEngine\)\?'1k':'2k'/);
  assert.doesNotMatch(src,/\['fal','seedream','flash','kling'\]\.includes\(imageEngine\)\?'1k':'2k'/);
});
test('OpenRouter Flash quote and payload continue to use the same 2K unit price',()=>{
  const fail=(code,message)=>{throw Error(message)};
  const p=imageModelParameters({engine:'flash',type:'image',prompt:'A thoughtful editorial portrait',resolution:'2k',aspectRatio:'16:9'}, {fail,referenceRoles:[]});
  assert.equal(p.provider,'openrouter');
  assert.equal(p.resolution,'2k');
  assert.equal(IMAGE_PRICES.flash,18000);
  const input=buildImageModelInput(p,[]);
  assert.equal(input.resolution,'2K');
  assert.equal(input.n,1);
  assert.equal(input.aspect_ratio,'16:9');
});