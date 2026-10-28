import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
const worker=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
const repair=readFileSync(new URL('../lab-worker/precision-edit.mjs',import.meta.url),'utf8');
test('Exact Prompt stays an inline switch and reaches the server',()=>{
 assert.match(html,/<label id="composer-exact-prompt-option"[^>]*><input id="composer-exact-prompt"/);
 assert.match(html,/id="composer-exact-prompt-help" class="composer-exact-tooltip" role="tooltip"/);
 assert.doesNotMatch(html,/id="composer-session-tools"/);
 assert.match(app,/exactPrompt:\$\('composer-exact-prompt'\)\.checked===true/);
 assert.match(worker,/value\?\.exactPrompt===true/);
});
test('reference conflicts require explicit review before generation',()=>{
 assert.match(app,/referenceRoleAdvisories\(referenceRoles\(\)\)/);
 assert.match(app,/Generate anyway\?/);
});
test('eye repair enters explicitly priced masked Retouch',()=>{
 assert.match(html,/id="image-detail-fix-eyes"/);
 assert.match(app,/precisionEditor\.suggest\('eyes'\)/);
 assert.match(repair,/const creditCost=d\.creditsForJobUsd/);
  assert.match(repair,/customerChargeCredits:creditCost/);
  assert.match(repair,/return d\.json\(\{quoteId,ticket,[\s\S]*?creditCost,/);
 assert.match(repair,/Magic Select is owner-only/);
});
