import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const home=readFileSync(path.join(root,'lab/index.html'),'utf8');
const css=readFileSync(path.join(root,'lab/home-featured-photo-pack.css'),'utf8');

test('Chrome Desert is a separate thin feature before Full Editorial',()=>{
  const tools=home.indexOf('class="studio-tools"');
  const pack=home.indexOf('id="featured-photo-pack"');
  const editorial=home.indexOf('id="featured-editorial"');
  assert.ok(tools>=0&&pack>tools&&editorial>pack);
  assert.match(home,/PV LAB \/ FEATURED PHOTO PACK/);
  assert.match(home,/id="featured-photo-pack-title">Chrome<br>Desert/);
  assert.match(home,/class="pv-photo-pack-count">3 PHOTOS/);
  assert.match(home,/class="pv-photo-pack-action"[^>]*mood=chrome-couture[^>]*>Create in Image<\/a>/);
});

test('existing Full Editorial remains intact and follows the pack',()=>{
  assert.match(home,/id="featured-editorial"/);
  assert.match(home,/Full Editorial<br>Studio\./);
  assert.match(home,/href="\.\/full-editorial\.html\?start=1"/);
});

test('featured pack uses existing approved imagery and text-only action',()=>{
  assert.match(home,/mood-previews\/chrome-couture-metal-editorial-20261031\.jpg/);
  assert.ok(existsSync(path.join(root,'lab/mood-previews/chrome-couture-metal-editorial-20261031.jpg')));
  const section=home.slice(home.indexOf('id="featured-photo-pack"'),home.indexOf('id="featured-editorial"'));
  assert.doesNotMatch(section,/→|&rarr;|<svg/);
  assert.match(home,/home-featured-photo-pack\.css\?v=20261108-chrome-desert1/);
});

test('desktop stays deliberately thin and phone stacks without overflow',()=>{
  assert.match(css,/height:clamp\(360px,28vw,440px\)/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/\.pv-photo-pack-feature\{display:block;height:auto;min-height:0;overflow:hidden\}/);
  assert.doesNotMatch(css,/position:fixed|100vw/);
});