import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const src=name=>readFileSync(new URL('../lab/'+name,import.meta.url));

test('empty canvas uses the exact approved original artwork bytes',()=>{
  assert.equal(createHash('sha256').update(src('visuals/video-android-trio-original.png')).digest('hex'),
    '7ed8131e8432c5182a2751a6d353a5fff87fd271d07fa0163dcc74fd74fc6ad7');
  const css=src('video-compact-studio.css').toString();
  assert.match(css,/:not\(\.pv-video-has-input\).*:has\(>#empty:not\(\[hidden\]\)\):before/);
  assert.match(css,/height:112px!important;min-height:112px!important/);
  assert.match(css,/height:32px!important;min-height:32px!important/);
  assert.match(css,/height:50px!important;min-height:50px!important/);
  assert.match(css,/grid-template-columns:minmax\(78px,1\.4fr\) repeat\(3,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(css,/hero-desktop\.webp|image-studio-active|upscale-studio-active/,
    'compact styles neither replace the model banner nor style another tool');
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test('source uploads suppress decoration in all modes without accessing generation APIs',()=>{
  const js=src('video-scene-states.js').toString();
  for(const id of ['video-start-thumb','video-end-thumb','video-reference-list','audio-reference-list'])assert.ok(js.includes(id));
  assert.match(js,/setModeClass\('pv-video-has-input',hasInput\)/);
  assert.doesNotMatch(js,/fetch\s*\(|\/api\/jobs|\/api\/quotes/);
  const editor=src('video-editorial-deck.js').toString();
  assert.match(editor,/const visuals=thumbnails/);
  assert.match(editor,/doc\.addEventListener\('wheel'/,'PR #473 remains installed');
  assert.match(editor,/passive:false/);
});
