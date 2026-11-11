import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const home=readFileSync(path.join(root,'lab/index.html'),'utf8');
const css=readFileSync(path.join(root,'lab/home-featured-photo-pack.css'),'utf8');
const section=home.slice(home.indexOf('id="featured-photo-pack"'),home.indexOf('id="featured-editorial"'));

test('Chrome Desert remains a compact feature between the existing tools and Full Editorial',()=>{
 const tools=home.indexOf('class="studio-tools"');
 const pack=home.indexOf('id="featured-photo-pack"');
 const editorial=home.indexOf('id="featured-editorial"');
 assert.ok(tools>=0&&pack>tools&&editorial>pack);
 assert.match(section,/PV LAB \/ FEATURED WORLD/);
 assert.match(section,/id="featured-photo-pack-title">Chrome<br>Desert/);
 assert.match(section,/03 VISUAL REFERENCES/);
 assert.match(section,/href="\.\/full-editorial\.html\?world=chrome-desert"/);
 assert.match(section,/>USE THIS WORLD<\/a>/);
});
test('all three original visual references are present, without decorative arrows',()=>{
 for(const file of ['hero.jpg','installation.jpg','curved.jpg']){
  assert.ok(section.includes('featured-worlds/chrome-desert/'+file),file);
  assert.ok(existsSync(path.join(root,'lab/visuals/featured-worlds/chrome-desert',file)),file);
 }
 assert.doesNotMatch(section,/→|&rarr;|<svg/);
 assert.doesNotMatch(section,/mood=chrome-couture/);
 assert.match(home,/home-featured-photo-pack\.css\?v=20261111-chrome-desert-world1/);
});
test('existing Full Editorial below remains the original separate feature',()=>{
 assert.match(home,/id="featured-editorial"/);
 assert.match(home,/Full Editorial<br>Studio\./);
 assert.match(home,/href="\.\/full-editorial\.html\?start=1"/);
});
test('desktop stays thin and phone stacks with no fixed-position overlay',()=>{
 assert.match(css,/height:clamp\(360px,28vw,440px\)/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/\.pv-photo-pack-feature\{display:block;height:auto;min-height:0;overflow:hidden\}/);
 assert.doesNotMatch(css,/position:fixed|100vw/);
});
