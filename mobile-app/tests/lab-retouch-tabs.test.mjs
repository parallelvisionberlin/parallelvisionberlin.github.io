import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/LabApp.js',import.meta.url),'utf8');
const bridge=readFileSync(new URL('../src/labBridge.js',import.meta.url),'utf8');

test('five tab positions keep Create precisely in the center',()=>{
  const tabs=source.match(/\[\['gallery','▦','Gallery'\].*\['profile','○','Profile'\]\]/)?.[0];
  assert.ok(tabs,'The native bottom navigation should be declared');
  const ids=[...tabs.matchAll(/\['(gallery|moods|create|retouch|profile)','[^']+','[^']+'\]/g)].map(x=>x[1]);
  assert.deepEqual(ids,['gallery','moods','create','retouch','profile']);
  assert.equal(ids[2],'create');
  assert.equal(ids[3],'retouch');
});

test('Retouch is a real signed-in Studio destination, not a cosmetic tab',()=>{
  assert.match(source,/if\(next==='retouch'\)\{openStudio\(\{action:'retouch'\}\);return;\}/);
  assert.match(source,/command\?\.action==='retouch'\?'retouch'/);
  assert.match(source,/setTab\(studioTabFromCommand\(next\.command\)\)/);
  assert.match(source,/active=\{\['create','gallery','retouch'\]\.includes\(tab\)\}/);
  assert.match(source,/studioReady\.current&&\['create','gallery','retouch'\]\.includes\(tab\)/);
});

test('native WebView securely forwards Retouch through the existing bridge',()=>{
  assert.match(bridge,/location\.pathname==='\/lab\/studio\.html'/);
  assert.match(bridge,/window\.__PV_LAB_COMMAND__/);
  assert.match(bridge,/app=5/);
});

test('native tab controls retain safe touch targets and accessibility',()=>{
  assert.match(source,/accessibilityRole="tab"/);
  assert.match(source,/accessibilityLabel=\{label\}/);
  assert.match(source,/accessibilityState=\{\{selected:/);
  assert.match(source,/tab:\{flex:1,minHeight:54,/);
});
