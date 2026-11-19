import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seedreamFlashParameters,seedreamFlashInput,FLASH_TEXT,FLASH_EDIT} from '../lab-worker/seedream-flash.mjs';
test('Image defaults: Seedream 5.5 uses 1.5K, Seedream 5 Pro owner 1K and Flash 2K',()=>{
  const src=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  assert.match(src,/imageEngine==='seedream55'\?'1\.5k':\['fal','seedream','kling'\]\.includes\(imageEngine\)\?'1k':'2k'/);
  assert.doesNotMatch(src,/\['fal','seedream','flash','kling'\]\.includes\(imageEngine\)\?'1k':'2k'/);
  assert.doesNotMatch(src,/\['fal','seedream55','seedream','kling'\]\.includes\(imageEngine\)\?'1k':'2k'/);
  assert.match(src,/ownerAccount&&imageEngine==='seedream'\?'1k':'2k'/);
});
test('Flash uses the SpicyAPI text and edit endpoint and live bound pricing',()=>{
  const fail=(code,message)=>{throw Error(message)};
  const value={engine:'flash',type:'image',mode:'image',prompt:'Thoughtful editorial portrait',resolution:'2k',aspectRatio:'16:9'};
  const p=seedreamFlashParameters(value,{fail,referenceRoles:[]});
  assert.equal(p.provider,'spicy');
  assert.equal(p.model,FLASH_TEXT);
  assert.equal(seedreamFlashInput(p,0).resolution,'2k');
  assert.equal(seedreamFlashInput(p,0).aspect_ratio,'16:9');
  assert.equal(FLASH_EDIT,'bytedance/seedream-5.0-flash/edit');
  const worker=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
  assert.match(worker,/p\.model=refs\.length\?FLASH_EDIT:FLASH_TEXT/);
  assert.match(worker,/vendorRequest\('\/jobs\/quote',key,payload\)/);
  assert.match(worker,/vendorRequest\('\/jobs\/createTask',key,payload,id\)/);
  assert.doesNotMatch(worker,/OPENROUTER_API_KEY/);
});
