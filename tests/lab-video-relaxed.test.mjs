import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const css=read('lab/video-relaxed-studio.css').toString();
test('relaxed Video styling is scoped and retains native capability visibility',()=>{
  assert.match(read('lab/studio.html').toString(),/video-relaxed-studio\.css\?v=20261024-relaxed1/);
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
  assert.doesNotMatch(css,/image-studio-active|fashion-studio-active|upscale-studio-active|PV Motion/);
  assert.doesNotMatch(css,/pointer-events\s*:\s*none|overflow(?:-y)?\s*:\s*hidden|position\s*:\s*fixed/);
  assert.match(css,/#pv-video-model-pill\{display:none!important\}/);
  assert.match(css,/#pv-video-audio-pill:not\(\[hidden\]\)/);
  assert.match(css,/pv-video-output-collapsed/);
  assert.match(css,/:not\(\.pv-video-has-input\)/);
  assert.doesNotMatch(css,/#(?:mode-extend|video-model-control|video-model-trigger)[^{]*\{[^}]*display:none/);
  assert.match(css,/height:52px!important;min-height:52px!important;font-size:14px/);
});
test('approved subway artwork is local and locked, without replacing source-media logic',()=>{
  assert.equal(createHash('sha256').update(read('lab/visuals/video-subway-relaxed-approved.png')).digest('hex'),'e5d8b8f5a46acaa9227dcaea9c37077174e60a77488b342bf7cbb1a5fbef17e4');
  assert.match(css,/url\('\.\/visuals\/video-subway-relaxed-approved\.png'\)/);
  const state=read('lab/video-scene-states.js').toString();
  assert.match(state,/setModeClass\('pv-video-has-input',hasInput\)/);
  assert.doesNotMatch(state,/video-subway-relaxed-approved/,'Artwork never becomes a submitted source');
  assert.match(read('lab/video-editorial-deck.js').toString(),/doc\.addEventListener\('wheel'/,'Original wheel routing remains');
});
