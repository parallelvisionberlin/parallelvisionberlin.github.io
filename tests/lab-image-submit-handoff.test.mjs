import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createImageSubmitHandoff} from '../lab/image-submit-handoff.js';

test('Identical draft cannot be submitted twice while still preparing',()=>{
  const h=createImageSubmitHandoff();
  const a=h.reserve('prompt-1','spicy',1);
  assert.ok(a);
  assert.equal(h.has('prompt-1'),true);
  assert.equal(h.reserve('prompt-1','spicy',1),null);
  assert.equal(h.slots('spicy'),1);
  assert.equal(h.reserve('prompt-2','spicy',1)?.count,1);
  assert.equal(h.slots('spicy'),2);
  assert.equal(h.slots('gemini'),0);
  h.release(a);
  assert.equal(h.slots('spicy'),1);
  assert.equal(h.has('prompt-1'),false);
  h.release(a);
  assert.equal(h.slots('spicy'),1);
  h.clear();
  assert.equal(h.active(),0);
});

test('A stale completion cannot release a newer request with the same signature',()=>{
  const h=createImageSubmitHandoff();
  const first=h.reserve('repeat','spicy');
  h.release(first);
  const later=h.reserve('repeat','spicy');
  h.release(first);
  assert.equal(h.has('repeat'),true);
  h.release(later);
  assert.equal(h.has('repeat'),false);
});

test('Only one owner Seedream image unlocks before server confirmation',()=>{
  const source=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  assert.match(source,/fastEligible=!customerMode&&selected.engine==='seedream'&&requested===1&&provider==='spicy'/);
  assert.match(source,/feedback=beginImageFeedback[\s\S]*?fastImageHandoff.reserve\(requestKey,provider,requested\)/);
  assert.match(source,/imageSubmissionPending=false;imageSubmissionStage='Sending…';update\(\)/);
  assert.match(source,/fastImageHandoff.has\(currentImageSubmissionKey\(\)\)/);
  assert.match(source,/fastImageHandoff.slots\('spicy'\)/);
  assert.match(source,/const seedreamInput=selectedEngine==='seedream'&&\(snapshot\?true:tool==='image'\)/);
  assert.match(source,/if\(!fastImageHandoff.active\(\)\)cancelImagePreparation\(\)/);
  assert.match(source,/if\(!detached\)\{imageSubmissionPending=false/);
  assert.match(html,/src="\.\/lab\.js\?v=20261011-[^"\s]+&wallet=1/);
});

test('Detached preparation cannot repaint a later in-flight button',()=>{
  const source=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  assert.match(source,/detachButton\(\)\{drivesComposerButton=false;\}/);
  assert.match(source,/if\(drivesComposerButton&&imageSubmissionPending\)/);
  assert.match(source,/detached=true;feedback.detachButton\(\)/);
});
