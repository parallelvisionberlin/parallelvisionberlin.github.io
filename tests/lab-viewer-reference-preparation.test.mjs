import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareViewerReferenceImages} from '../lab/viewer-reference-preparation.js';

test('viewer preparation keeps all nine source photos in order, with at most two running',async()=>{
 const items=Array.from({length:9},(_,i)=>i),progress=[];let running=0,peak=0;
 const out=await prepareViewerReferenceImages(items,async value=>{
  running++;peak=Math.max(peak,running);
  await new Promise(resolve=>setTimeout(resolve,value%2?2:9));running--;
  return 'owned-'+value;
 },{onProgress:(phase,detail)=>progress.push([phase,detail])});
 assert.equal(peak,2);assert.deepEqual(out,items.map(i=>'owned-'+i));
 assert.equal(progress.length,10);assert.match(progress[0][1],/^0 \/ 9/);
 assert.match(progress.at(-1)[1],/^9 \/ 9/);
 assert.ok(progress.every(p=>p[0]==='Preparing images'));
});
test('a failed preparation stops scheduling new work and never retries',async()=>{
 let calls=0;
 await assert.rejects(prepareViewerReferenceImages([1,2,3,4],async value=>{
  calls++;if(value===1)throw Error('Upload rejected');
  await new Promise(resolve=>setTimeout(resolve,5));return value;
 }),/Upload rejected/);
 assert.ok(calls<=2);
});
test('stale account or mask state aborts remaining preparation',async()=>{
 let current=true,calls=0;
 await assert.rejects(prepareViewerReferenceImages([1,2,3,4],async value=>{
  calls++;await new Promise(resolve=>setTimeout(resolve,2));current=false;return value;
 },{check:()=>{if(!current)throw Error('Selection changed');}}),/Selection changed/);
 assert.ok(calls<=2);
});
test('prepared image concurrency and price phase are scoped to the viewer, never normal Image defaults',()=>{
 const src=readFileSync('lab/lab.js','utf8');
 assert.match(src,/viewerReplacement:s\.viewerReplacement===true/);
 assert.match(src,/if\(snapshot\?\.viewerReplacement\)/);
 assert.match(src,/s\.onProgress\?\.\('Checking price'/);
 const viewer=readFileSync('lab/image-viewer-editor.js','utf8');
 const setKind=viewer.slice(viewer.indexOf('  function setKind('),viewer.indexOf('  function renderLibrary('));
 assert.doesNotMatch(setKind,/fetchLibrary\(|libraryOpen=true/);
 assert.match(viewer,/chooseReference\.id='viewer-choose-reference'/);
 assert.match(viewer,/Change /);assert.match(viewer,/Preparing images…/);
});
