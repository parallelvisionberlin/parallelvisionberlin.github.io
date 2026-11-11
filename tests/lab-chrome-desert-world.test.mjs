import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const presetSource=readFileSync(path.join(root,'lab/editorial-world-presets.js'),'utf8');
const {CHROME_DESERT,resolveEditorialWorld,nextEditorialStep,previousEditorialStep,needsStylingChoice}=
 await import('data:text/javascript,'+encodeURIComponent(presetSource));
const full=readFileSync(path.join(root,'lab/full-editorial.js'),'utf8');
const html=readFileSync(path.join(root,'lab/full-editorial.html'),'utf8');

test('Chrome Desert is explicitly allowlisted, not arbitrary URL-supplied prompt content',()=>{
 assert.equal(resolveEditorialWorld('?world=chrome-desert'),CHROME_DESERT);
 assert.equal(resolveEditorialWorld('?world=other'),null);
 assert.equal(resolveEditorialWorld('?world=https://evil.invalid'),null);
 assert.equal(CHROME_DESERT.environments.length,2);
 for(const src of CHROME_DESERT.gallery)assert.ok(existsSync(path.join(root,'lab',src.slice(2))),src);
});
test('preset skips Styling and Location, ordinary Full Editorial retains four steps',()=>{
 assert.equal(nextEditorialStep(1,true),4);
 assert.equal(nextEditorialStep(2,true),4);
 assert.equal(nextEditorialStep(3,true),4);
 assert.equal(previousEditorialStep(4,true),1);
 assert.equal(nextEditorialStep(1,false),2);
 assert.equal(previousEditorialStep(4,false),3);
 assert.equal(needsStylingChoice(true,0,''),false);
 assert.equal(needsStylingChoice(false,0,''),true);
 assert.equal(needsStylingChoice(false,1,''),false);
});
test('preset handoff, crop, credit preflight and review are present',()=>{
 assert.match(full,/const curatedWorld=resolveEditorialWorld\(location\.search\)/);
 assert.match(full,/if\(curatedWorld\)void loadWorldReferences\(\)/);
 assert.match(full,/curatedWorld\?curatedWorld\.prompt/);
 assert.match(full,/function croppedWorldFile\(reference\)/);
 assert.match(full,/context\.drawImage\(image,sx,sy,sw,sh/);
 assert.match(full,/await loadWorldReferences\(\);if\(worldLoadError\)throw worldLoadError/);
 assert.match(full,/previousEditorialStep\(step,Boolean\(curatedWorld\)\)/);
 assert.match(full,/nextEditorialStep\(step,Boolean\(curatedWorld\)\)/);
 assert.match(html,/id="editorial-world-preset" hidden/);
 assert.match(html,/id="editorial-review-world" hidden/);
 assert.match(html,/full-editorial-world-preset\.css/);
 assert.match(full,/const quotes=await Promise\.all/);
 assert.match(full,/validQuote\(q\)/);
 assert.match(full,/if\(!profile\)\{await signIn\(\);return\}/);
});
