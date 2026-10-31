import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createImageSubmitHandoff,IMAGE_SUBMIT_COOLDOWN_MS} from '../lab/image-submit-handoff.js';

test('Accidental repeat clicks are blocked for two seconds while preparation slots remain reserved',()=>{
  let now=0;const h=createImageSubmitHandoff({clock:()=>now});
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
  assert.equal(h.has('prompt-1'),true,'Acknowledgement does not shorten double-click protection');
  now=IMAGE_SUBMIT_COOLDOWN_MS;
  assert.equal(h.has('prompt-1'),false);
  h.release(a);
  assert.equal(h.slots('spicy'),1);
  h.clear();
  assert.equal(h.active(),0);
});

test('A stale completion cannot release a newer request with the same signature',()=>{
  let now=0;const h=createImageSubmitHandoff({clock:()=>now});
  const first=h.reserve('repeat','spicy');
  h.release(first);
  now=IMAGE_SUBMIT_COOLDOWN_MS;
  const later=h.reserve('repeat','spicy');
  h.release(first);
  assert.equal(h.has('repeat'),true);
  h.release(later);
  now+=IMAGE_SUBMIT_COOLDOWN_MS;
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
  assert.match(source,/const seedreamInput=\['seedream','seedreamlite'\]\.includes\(selectedEngine\)&&\(snapshot\?true:tool==='image'\)/);
  assert.match(source,/if\(!fastImageHandoff.active\(\)\)cancelImagePreparation\(\)/);
  assert.match(source,/if\(!detached\)\{imageSubmissionPending=false/);
  // Asset revision dates change frequently; require the live studio script and wallet feature marker.
  assert.match(html,/<script type="module" src="\.\/lab\.js\?v=20\d{6}-[^"]+&wallet=1[^"]*"><\/script>/);
});

test('Detached preparation cannot repaint a later in-flight button',()=>{
  const source=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  assert.match(source,/detachButton\(\)\{drivesComposerButton=false;\}/);
  assert.match(source,/if\(drivesComposerButton&&imageSubmissionPending\)/);
  assert.match(source,/detached=true;feedback.detachButton\(\)/);
});


test('Identical intentional requests overlap after two seconds and keep independent slot reservations',()=>{
  let now=100;const h=createImageSubmitHandoff({clock:()=>now});
  const first=h.reserve('same-draft','spicy');
  now+=IMAGE_SUBMIT_COOLDOWN_MS-1;
  assert.equal(h.reserve('same-draft','spicy'),null);
  now++;
  assert.equal(h.has('same-draft'),false,'Cooldown ends before server acknowledgement');
  const second=h.reserve('same-draft','spicy');
  assert.ok(second);assert.notEqual(first.id,second.id);
  assert.equal(h.slots('spicy'),2);
  h.release(first);h.release(first);
  assert.equal(h.slots('spicy'),1,'An older completion cannot release the new request');
  assert.equal(h.has('same-draft'),true);
  now+=IMAGE_SUBMIT_COOLDOWN_MS;
  assert.equal(h.has('same-draft'),false);
  assert.equal(h.slots('spicy'),1,'Cooldown expiry does not free queue capacity');
  h.release(second);assert.equal(h.active(),0);
});

test('Sign out clears both cooldowns and pending requests',()=>{
  const h=createImageSubmitHandoff();
  const ticket=h.reserve('draft','spicy');h.clear();
  assert.equal(h.has('draft'),false);assert.equal(h.active(),0);
  const next=h.reserve('draft','spicy');h.release(ticket);
  assert.equal(h.slots('spicy'),1);h.release(next);
});
