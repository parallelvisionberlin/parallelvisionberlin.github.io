import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateSync} from 'node:zlib';
import {grainPng,filmAssetId,prepareFilmAsset,renderFilmFinish} from '../lab-worker/film-finish.mjs';
import {filmFinishSettings,HONG_KONG_FILM_FINISH} from '../lab/film-finish.js';
import {prepareMoodPrompt,preparePersonalMoodPrompt} from '../lab/moods.js';

test('grain is a valid non-tiled PNG, repeatable by image and scalable by strength',async()=>{
  const a=await grainPng(61,43,65,'photo-a'),b=await grainPng(61,43,65,'photo-a');assert.deepEqual(a,b);
  assert.notDeepEqual(a,await grainPng(61,43,65,'photo-b'));
  function pixels(bytes){let p=8,parts=[];while(p<bytes.length){const n=new DataView(bytes.buffer,bytes.byteOffset+p,4).getUint32(0);if(Buffer.from(bytes.slice(p+4,p+8)).toString()==='IDAT')parts.push(bytes.slice(p+8,p+8+n));p+=n+12;}return inflateSync(Buffer.concat(parts));}
  const scan=pixels(a),off=pixels(await grainPng(61,43,0,'photo-a')),heavy=pixels(await grainPng(61,43,100,'photo-a'));
  assert.equal(scan.length,(61*2+1)*43);
  let low=0,high=0;for(let y=0;y<43;y++)for(let x=0;x<61;x++){const i=y*123+2+x*2;assert.equal(off[i],0);low+=scan[i];high+=heavy[i];}
  assert.ok(high>low*1.4);assert.ok(low>0);
});
test('settings reject unsupported values and stable asset IDs isolate owners and settings',async()=>{
  for(const value of [null,{},[],{version:2,grain:10,glow:10},{version:1,grain:101,glow:10},{version:1,grain:1.5,glow:0}])assert.throws(()=>filmFinishSettings(value));
  const a=await filmAssetId('owner-a','image',HONG_KONG_FILM_FINISH);
  assert.equal(a,await filmAssetId('owner-a','image',HONG_KONG_FILM_FINISH));
  assert.notEqual(a,await filmAssetId('owner-b','image',HONG_KONG_FILM_FINISH));
  assert.notEqual(a,await filmAssetId('owner-a','image',{...HONG_KONG_FILM_FINISH,glow:0}));
});
test('off bypasses processing and cached derivatives bypass all rendering',async()=>{
  const original={id:'original',owner_id:'owner',bytes:100,object_key:'owner/original'};
  assert.equal(await prepareFilmAsset({},original,{version:1,grain:0,glow:0},{}),original);
  const saved={id:'finished',owner_id:'owner',object_key:'owner/finished'};
  assert.equal(await prepareFilmAsset({LAB_MEDIA:{head:async()=>({size:100})}},original,HONG_KONG_FILM_FINISH,{first:async()=>saved}),saved);
  await assert.rejects(renderFilmFinish(null,new Uint8Array(),HONG_KONG_FILM_FINISH,'x'),/unavailable/);
});
test('Hong Kong finish controls change metadata independently of creative intensity and preserve references',()=>{
  const a=prepareMoodPrompt('One woman by a window','hong-kong-nights',100,{referenceCount:1,filmFinish:{version:1,grain:20,glow:80}});
  const b=prepareMoodPrompt('One woman by a window','hong-kong-nights',100,{referenceCount:1,filmFinish:{version:1,grain:100,glow:0}});
  assert.equal(a.prompt,b.prompt);assert.equal(a.metadata.moodIntensity,100);assert.equal(b.metadata.filmFinish.grain,100);
  assert.match(a.prompt,/Preserve natural pores/);assert.doesNotMatch(a.prompt,/Heavy irregular clustered grain/);
  assert.equal(prepareMoodPrompt('Portrait','berlin-rave',100).metadata.filmFinish,undefined);
  assert.equal(preparePersonalMoodPrompt('Portrait',{id:'board',name:'Mine',baseMoodId:'hong-kong-nights',direction:'Quiet light'},60).metadata.filmFinish,undefined);
});
