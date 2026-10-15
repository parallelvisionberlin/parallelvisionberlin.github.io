import test from 'node:test';
import assert from 'node:assert/strict';
import {createMoodReferenceLoader} from '../lab/mood-references.js';
import {prepareMoodPrompt} from '../lab/moods.js';
const settings=()=>{
 const m=prepareMoodPrompt('The same subject in the original setting.','dream-blur',78,{referenceCount:1});
 return {type:'image',mode:'image',engine:'seedream',aspectRatio:'auto',prompt:m.prompt,...m.metadata,
   referenceRoles:[{name:'source.jpg',role:'base',note:''}]};
};
test('Dream Blur starts all four downloads together, then uploads four in parallel in reference order',async()=>{
 let downloads=0,uploads=0,releaseDownload,releaseUpload;
 const downloadsGate=new Promise(resolve=>{releaseDownload=resolve;});
 const uploadsGate=new Promise(resolve=>{releaseUpload=resolve;});
 const loader=createMoodReferenceLoader({
   fetchFile:()=>{downloads++;return downloadsGate.then(()=>new Response(new Blob(['picture'],{type:'image/jpeg'})));},
   upload:file=>{uploads++;const order=uploads;return uploadsGate.then(()=>({id:'upload-'+order}));}
 });
 const run=loader.prepare(settings(),{sessionKey:'signed-account'});
 await Promise.resolve();
 assert.equal(downloads,4,'Do not download one style photograph at a time');
 releaseDownload();
 await new Promise(setImmediate);
 assert.equal(uploads,4,'Do not upload each style photograph one after another');
 releaseUpload();
 const result=await run;
 assert.deepEqual(result.references.map(v=>v.id),['upload-1','upload-2','upload-3','upload-4']);
 assert.equal(result.settings.referenceRoles[0].role,'base');
 assert.deepEqual(result.settings.referenceRoles.slice(1).map(v=>v.role),['style','style','style','style']);
 assert.equal((await loader.prepare(settings(),{sessionKey:'signed-account'})).references.length,4);
 assert.equal(downloads,4);
 assert.equal(uploads,4);
});
test('all downloads must be good before any costly or account-specific upload begins',async()=>{
 let uploads=0,downloads=0;
 const loader=createMoodReferenceLoader({
   fetchFile:()=>{downloads++;return Promise.resolve(new Response(downloads===2?'not found':'picture',{status:downloads===2?404:200}));},
   upload:()=>{uploads++;return {id:'id'};}
 });
 await assert.rejects(loader.prepare(settings(),{sessionKey:'a'}),/could not load/);
 assert.equal(downloads,4);
 assert.equal(uploads,0);
});
