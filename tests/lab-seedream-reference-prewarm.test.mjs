import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSeedreamReferencePreparer,seedreamPrepKind} from '../lab/seedream-reference-prep.js';

const item=(size,width,height,name='reference.webp')=>({file:{size,name},width,height});
const miB=1024*1024;
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

test('Only oversized inputs need local Seedream preparation',()=>{
  assert.equal(seedreamPrepKind(item(3*miB,3000,2000)),null);
  assert.equal(seedreamPrepKind(item(3*miB,7728,5152)),'pixels');
  assert.equal(seedreamPrepKind(item(11*miB,3000,2000)),'bytes');
  assert.equal(seedreamPrepKind(item(13*miB,7728,5152)),'pixels');
  assert.equal(seedreamPrepKind({file:{name:'broken',size:Infinity}}),null);
});
test('Background preparation is off the click path and shared by Generate',async()=>{
  const deferredCopy=deferred(),calls=[];
  const prep=createSeedreamReferencePreparer({
    pixelCopy:async(file,opts)=>{calls.push({file,opts});return deferredCopy.promise;},
    byteCopy:async()=>{throw Error('Unexpected compression');},
    canBackground:()=>true
  });
  const original=item(5*miB,7728,5152),first=prep.warm(original),second=prep.warm(original);
  assert.equal(first,second,'Identical reference has one preparation promise');
  assert.equal(prep.status(original),'preparing');
  const duringGenerate=prep.forSubmission(original);
  await Promise.resolve();
  assert.equal(calls.length,1);
  assert.equal(calls[0].opts.backgroundOnly,true);
  const encoded={name:'optimized.webp',size:2*miB};
  deferredCopy.resolve(encoded);
  assert.equal(await duringGenerate,encoded);
  assert.equal(await first,encoded);
  assert.equal(prep.status(original),'ready');
  assert.equal(await prep.forSubmission(original),encoded);
  assert.equal(calls.length,1,'Generate consumes prepared data without re-encoding');
});
test('Normal photos and browsers without workers are not slowed on upload',async()=>{
  const calls=[];
  const prep=createSeedreamReferencePreparer({
    pixelCopy:async()=>{calls.push('pixels');return 'pixels';},
    byteCopy:async()=>{calls.push('bytes');return 'bytes';},
    canBackground:()=>false
  });
  assert.equal(prep.warm(item(2*miB,1000,1000)),null);
  const large=item(13*miB,2200,2200);
  assert.equal(prep.warm(large),null,'No background-only main-thread fallback');
  assert.deepEqual(calls,[]);
  assert.equal(await prep.forSubmission(large),'bytes');
  assert.deepEqual(calls,['bytes']);
});
test('Files with matching names and dimensions never share stale working copies',async()=>{
  let counter=0,clock=0;
  const prep=createSeedreamReferencePreparer({
    pixelCopy:async()=>({number:++counter}),
    byteCopy:async()=>({number:++counter}),
    canBackground:()=>true,now:()=>clock
  });
  const a=item(3*miB,7728,5152),b=item(3*miB,7728,5152);
  assert.deepEqual(await prep.warm(a),{number:1});
  assert.deepEqual(await prep.warm(b),{number:2});
  clock=14*60*1000;
  assert.deepEqual(await prep.forSubmission(a),{number:1});
  clock=16*60*1000;
  assert.deepEqual(await prep.forSubmission(a),{number:3});
  assert.equal(counter,3);
});
test('Cleared and removed references do not cache stale preparations',async()=>{
  const d=deferred(),prep=createSeedreamReferencePreparer({
    pixelCopy:()=>d.promise,byteCopy:()=>d.promise,canBackground:()=>true
  }),a=item(2*miB,7728,5152);
  const promise=prep.warm(a);
  await Promise.resolve();
  prep.forget(a.file);
  d.resolve({name:'orphan.webp'});
  await promise;
  assert.equal(prep.status(a),'idle');
  prep.clear();
  assert.equal(prep.status(a),'idle');
});
test('Worker startup failure falls back only after explicit Generate',async()=>{
  const d=deferred(),seen=[];
  const prep=createSeedreamReferencePreparer({
    pixelCopy:async(_file,opts)=>{
      seen.push(opts.backgroundOnly);
      if(opts.backgroundOnly)return d.promise;
      return {name:'prepared-on-generate'};
    },
    byteCopy:async()=>null,
    canBackground:()=>true
  });
  const a=item(2*miB,7728,5152),background=prep.warm(a);
  const submit=prep.forSubmission(a);
  const unavailable=Object.assign(new Error('worker unavailable'),{code:'unavailable'});
  d.reject(unavailable);
  await assert.rejects(background,/worker unavailable/);
  assert.deepEqual(await submit,{name:'prepared-on-generate'});
  assert.deepEqual(seen,[true,false]);
});
test('Studio wiring starts after references enter the deck, never uploads in prewarm',()=>{
  const code=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  const module=readFileSync(new URL('../lab/seedream-reference-prep.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  assert.match(code,/references.push\(item\);added\+\+;\s*prewarmSeedreamReference\(item\)/);
  assert.match(code,/setTool\('image'\);renderReferences\(\);prewarmSeedreamDeck\(\)/);
  assert.match(code,/await seedreamPreparer.forSubmission\(item\)/);
  assert.match(code,/seedreamPreparer.clear\(\)/);
  assert.match(module,/inflight\.get\(source\)/);
  assert.doesNotMatch(module,/uploadAsset|\/api\/|jobs\/quote|billing/);
  assert.match(html,/src="\.\/lab\.js\?v=20261011-reference-prewarm1/);
});
test('Background copy never resorts to a CPU-heavy main-thread fallback',()=>{
  const tools=readFileSync(new URL('../lab/image-tools.js',import.meta.url),'utf8');
  assert.match(tools,/if\(backgroundOnly&&!canPrepareImagesInBackground\(\)\)/);
  assert.match(tools,/if\(backgroundOnly\)throw error/);
  assert.match(tools,/if\(backgroundOnly\)throw backgroundUnavailable\(\)/);
});

test('Restored references without dimensions are measured before prewarm cache lookup',()=>{
  const code=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  assert.match(code,/const prepareItem=seedreamInput&&!hasDimensions/);
  assert.match(code,/\{\.\.\.item,\.\.\.\(await imageDimensions\(item.file\)\)\}/);
  assert.match(code,/await seedreamPreparer.forSubmission\(prepareItem\)/);
});
