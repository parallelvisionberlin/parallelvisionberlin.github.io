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
  assert.match(home,/<span>Make room for<\/span> <span>your character\.<\/span>/);
});
test('character invitation links to the exact create workflow',()=>{
  assert.match(home,/studio\.html\?tool=image&amp;createCharacter=1/);
  assert.match(js,/if\(owner&&tool==='image'&&requestedRoute==='image'&&/);
  assert.match(js,/sceneLibrary\.open\('characters'\)/);
  assert.match(js,/createCharacterButton\.click\(\)/);
  assert.match(studio,/characterLanding=20261024v1/);
});
test('casting invitation uses separate local portraits, loaded fonts and a contained phone rail',()=>{
  for(const img of ['night-cast03.webp','ivory-cast03.webp','chrome-cast03.webp','plum-cast03.webp','bronze-cast03.webp','copper-inertia.webp','android-inertia.webp','curls-inertia.webp']){
    assert.match(home,new RegExp(img.replace('.','\\.')));
    assert.ok(existsSync(path.join(root,'lab/visuals/character-casting',img)));
  }
  assert.match(home,/character-home\.css\?v=20261030-casting-inertia-3/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/font-family:PV Casting Display/);
  assert.ok(css.includes('border-radius:999px'), 'character CTA should be rounded');
  assert.match(css,/overflow-x:auto/);
  assert.match(css,/scroll-snap-type:none/);
  assert.doesNotMatch(css,/84svh|__world|font-style:italic/);
  for(const file of ['russo-one-latin-v18.woff','rajdhani-medium-latin-v17.woff','rajdhani-semibold-latin-v17.woff']){
    assert.ok(existsSync(path.join(root,'lab/fonts',file)));
  }
  assert.doesNotMatch(css,/#studio-header|\.mc-home|\.pv-showcase/);
});
test('no billing or generation is performed by deep link',()=>{
  const logic=js.slice(js.indexOf('Character landing intent'),js.indexOf('Character landing intent')+640);
  assert.doesNotMatch(logic,/fetch\(|\/api\b|generate|\bquote\b|\bbuy\b/);
  assert.match(logic,/sceneLibrary\.open/);
});

test('character CTA follows the owner-approved text-only action design',()=>{
  const cta=home.match(/<a class="lab-character-home__action"[^>]*>(.*?)<\/a>/s)?.[1];
  assert.equal(cta,'Create your character');
});
