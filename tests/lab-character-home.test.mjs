import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const home=readFileSync(path.join(root,'lab/index.html'),'utf8');
const studio=readFileSync(path.join(root,'lab/studio.html'),'utf8');
const js=readFileSync(path.join(root,'lab/lab.js'),'utf8');
const css=readFileSync(path.join(root,'lab/character-home.css'),'utf8');

test('character invitation follows Studio cards and precedes pricing',()=>{
  const tools=home.indexOf('class="studio-tools"');
  const character=home.indexOf('id="create-your-character"');
  const pricing=home.indexOf('class="lab-plans" id="pricing"');
  assert.ok(tools>=0&&character>tools&&pricing>character);
  assert.match(home,/<span>Your character\.<\/span><span>Every scene\.<\/span>/);
});
test('character invitation links to the exact create workflow',()=>{
  assert.match(home,/studio\.html\?tool=image&amp;createCharacter=1/);
  assert.match(js,/if\(owner&&tool==='image'&&requestedRoute==='image'&&/);
  assert.match(js,/sceneLibrary\.open\('characters'\)/);
  assert.match(js,/createCharacterButton\.click\(\)/);
  assert.match(studio,/characterLanding=20261024v1/);
});
test('character invitation reuses local project images and responsive CSS',()=>{
  for(const img of ['nina-silver-world.webp','nina-original-identity.webp']){
    assert.match(home,new RegExp(img.replace('.','\\.')));
    assert.ok(existsSync(path.join(root,'lab/visuals/character-studies',img)));
  }
  assert.match(home,/character-home\.css\?v=20261029-cinematic-world1/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.doesNotMatch(css,/#studio-header|\.mc-home|\.pv-showcase/);
});
test('no billing or generation is performed by deep link',()=>{
  const logic=js.slice(js.indexOf('Character landing intent'),js.indexOf('Character landing intent')+640);
  assert.doesNotMatch(logic,/fetch\(|\/api\b|generate|\bquote\b|\bbuy\b/);
  assert.match(logic,/sceneLibrary\.open/);
});

test('character CTA uses a line SVG, never an iOS emoji arrow',()=>{
  const cta=home.match(/<a class="lab-character-home__action"[^>]*>(.*?)<\/a>/s)?.[1];
  assert.match(cta,/^Create your character <svg/);
  assert.match(cta,/aria-hidden="true"/);
  assert.doesNotMatch(cta,/[↗➡⬆🔗]/u);
});
