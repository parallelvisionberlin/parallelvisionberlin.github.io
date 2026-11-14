import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=name=>readFileSync(new URL('../lab/'+name,import.meta.url),'utf8');
const html=file('studio.html');
const css=file('video-generation-fabric.css');
const effect=file('video-generation-fabric.js');
const job=file('lab.js');

test('procedural fabric loads once after existing Video stage CSS',()=>{
  assert.equal((html.match(/video-generation-fabric\.css\?/g)||[]).length,1);
  assert.equal((html.match(/video-generation-fabric\.js\?/g)||[]).length,1);
  assert.ok(html.indexOf('video-generation-fabric.css')>html.indexOf('video-generation-cinema.css'));
  assert.match(html,/id="video-job-stage"[^>]*hidden role="status" aria-live="polite" aria-atomic="true"/);
});

test('fabric is decorative and tied to true Video job phases',()=>{
  assert.match(effect,/setAttribute\('aria-hidden','true'\)/);
  assert.match(effect,/stage\.dataset\.phase/);
  assert.match(effect,/app\.classList\.contains\('video-studio-active'\)/);
  assert.match(effect,/!stage\.hidden/);
  assert.match(effect,/activePhases=new Set\(\['submitting','queued','running','saving','loading'\]\)/);
  assert.match(job,/stage\.dataset\.phase=phase/);
});

test('no synthetic progress, billing calls or source media in the motion graphic',()=>{
  assert.doesNotMatch(effect,/fetch\(|XMLHttpRequest|api\/|stripe|checkout|localStorage|setInterval/gi);
  assert.doesNotMatch(effect,/Math\.random|progressPercent|estimateSeconds|countdown/i);
  assert.doesNotMatch(css,/background-image:\s*url|filter:\s*blur|linear-gradient/i);
  assert.match(css,/background:#050505!important/);
});

test('animation pauses off-screen, supports reduced motion and retains failure treatment',()=>{
  assert.match(effect,/document\.hidden/);
  assert.match(effect,/cancelAnimationFrame\(raf\)/);
  assert.match(effect,/prefers-reduced-motion: reduce/);
  assert.match(effect,/navigator\.connection\?\.saveData/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css,/data-phase="failed"[\s\S]*?\.pv-video-fabric\{display:block/);
  assert.match(css,/\.pv-video-fabric\{\s*display:none/);
});

test('new stylesheet touches only the existing Video job stage',()=>{
  assert.doesNotMatch(css,/#history|#video-inspector|#generate|#wallet|\.workspace\.video-layout/);
  assert.match(css,/\.video-job-stage\.pv-video-fabric-ready/);
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test('editorial registration marks and micro-signature remain active-only and decorative',()=>{
  assert.match(css,/border-top:1px solid #c7c7c3/);
  assert.match(css,/border-bottom:1px solid #c7c7c3/);
  assert.match(css,/content:"PV LAB \/ MOTION"/);
  assert.match(css,/pointer-events:none/);
  assert.match(css,/\.video-job-stage\.pv-video-fabric-ready:is\(\[data-phase="submitting"\],\[data-phase="queued"\],\[data-phase="running"\],\[data-phase="saving"\],\[data-phase="loading"\]\)::before/);
  assert.doesNotMatch(css,/data-phase="failed"/);
  assert.match(html,/video-generation-fabric\.css\?v=20261112-editorial2/);
});
