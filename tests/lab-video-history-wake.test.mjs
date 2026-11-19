import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const studio=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');

test('Owner Video History wakes to reconcile server-completed jobs, without a customer-only gate',()=>{
  const code=studio.slice(studio.indexOf('function refreshHistoryOnWake(){'),
    studio.indexOf('window.addEventListener(\'focus\',refreshHistoryOnWake);'));
  assert.match(code,/if\(!owner\|\|document\.hidden\|\|historyLoading\)return/);
  assert.match(code,/activeStates\.has\(selectedVideoJob\?\.status\)/);
  assert.match(code,/\.\.\.videoJobCache\.values\(\)/);
  assert.match(code,/if\(!customerMode&&!pendingVideo\)return/);
  assert.match(code,/void syncHistory\(\)/);
  assert.doesNotMatch(code,/\/api\/quotes|\/api\/jobs['\"],\{method:'POST'\}/);
});
test('Focus and tab visibility trigger owner recovery; guest and settled idle Studio remain untouched',()=>{
  assert.match(studio,/window\.addEventListener\('focus',refreshHistoryOnWake\)/);
  assert.match(studio,/visibilitychange',\(\)=>\{if\(!document\.hidden\)refreshHistoryOnWake\(\);\}/);
  assert.match(studio,/const now=Date\.now\(\);if\(now-lastHistoryWake<10000\)return/);
  assert.match(html,/videoHistoryWake=20261119v1/);
});
