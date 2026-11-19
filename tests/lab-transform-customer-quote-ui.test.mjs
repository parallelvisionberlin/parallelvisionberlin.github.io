import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
test('Transform does not expose a duration selector that the provider ignores',()=>{
 assert.match(ui,/\$\('duration-control'\)\.hidden=!video\|\|mode==='transform'/);
});
test('Customer Transform review uses PV credits and original video, not supplier preauthorization',()=>{
 assert.match(ui,/q\.settings\.sourceDurationSeconds\}s original/);
 assert.match(ui,/customerMode\?'Up to '\+quotedCredits/);
 assert.match(ui,/Unused credits return to your balance automatically after completion/);
 assert.match(ui,/Generate · up to/);
 assert.match(ui,/editEstimate&&customerMode/);
});
