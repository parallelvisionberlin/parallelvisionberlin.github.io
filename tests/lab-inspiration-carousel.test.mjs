import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../lab/'+path,import.meta.url),'utf8');

test('both Image Inspiration entrances share the approved Chrome Couture and Cloud Spa swap',()=>{
  const html=read('studio.html');
  assert.equal((html.match(/class="inspiration-carousel-shell/g)||[]).length,2);
  assert.equal((html.match(/data-guest-mood=/g)||[]).length,8);
  assert.equal((html.match(/data-welcome-mood=/g)||[]).length,8);
  for(const id of ['dream-blur','90s-cinema','fashion-editorial','fisheye-2000','dreamcore','hong-kong-nights','80s-film']){
    assert.match(html,new RegExp('data-guest-mood="'+id+'"'));
    assert.match(html,new RegExp('data-welcome-mood="'+id+'"'));
  }
  assert.equal((html.match(/data-guest-mood="chrome-couture"/g)||[]).length,1);
  assert.equal((html.match(/data-welcome-mood="chrome-couture"/g)||[]).length,1);
  assert.equal((html.match(/data-inspiration-nav="prev"/g)||[]).length,2);
  assert.equal((html.match(/data-inspiration-nav="next"/g)||[]).length,2);
  assert.match(html,/inspiration-carousel\.css\?v=20261019-editorial-chevrons2/);
  assert.match(html,/inspiration-carousel\.js\?v=20261019-keyboard2/);
  assert.match(html,/id="lab-welcome-presets"/);
  const guest=[...html.matchAll(/data-guest-mood="([^"]+)"/g)].map(match=>match[1]);
  const signed=[...html.matchAll(/data-welcome-mood="([^"]+)"/g)].map(match=>match[1]);
  const expected=['dream-blur','90s-cinema','fashion-editorial','fisheye-2000','chrome-couture','hong-kong-nights','dreamcore','80s-film'];
  assert.deepEqual(guest,expected);
  assert.deepEqual(signed,expected);
  const arrows=[...html.matchAll(/<button\b[^>]*class="inspiration-nav [^"]+"[^>]*>[\s\S]*?<\/button>/g)].map(match=>match[0]);
  assert.equal(arrows.length,4);
  assert.equal(arrows.filter(tag=>tag.includes('aria-keyshortcuts="ArrowLeft"')).length,2);
  assert.equal(arrows.filter(tag=>tag.includes('aria-keyshortcuts="ArrowRight"')).length,2);
  assert.ok(arrows.every(tag=>tag.includes('<svg viewBox="0 0 24 24"')));
});
test('carousel shows six unchanged-sized cards on wide desktop and two on mobile',()=>{
  const css=read('inspiration-carousel.css'),js=read('inspiration-carousel.js');
  assert.match(css,/grid-auto-columns:calc\(\(100% - var\(--inspire-gap\)\*5\)\/6\)/);
  assert.match(css,/grid-auto-columns:calc\(\(100% - var\(--inspire-gap\)\)\/2\)/);
  assert.match(css,/scroll-snap-type:x mandatory/);
  assert.match(css,/hover>img\{transform:none!important\}/);
  assert.match(js,/scrollBy\(\{left:direction\*amount/);
  assert.match(js,/track\.scrollWidth-track\.clientWidth/);
  assert.match(js,/ResizeObserver/);
  assert.match(js,/prev\.hidden=/);
  assert.match(js,/next\.hidden=/);
  assert.match(js,/prev\.disabled=/);
  assert.match(js,/next\.disabled=/);
  assert.match(css,/\.inspiration-nav:disabled/);
  assert.match(css,/\.inspiration-nav svg/);
  assert.match(css,/inspiration-nav-prev\{left:-34px/);
  assert.match(js,/document\.addEventListener\('keydown'/);
  assert.match(js,/event\.key==='ArrowRight'\?1:-1/);
  assert.match(js,/target\.isContentEditable/);
  assert.match(js,/document\.querySelector\('dialog\[open\]'\)/);
});
test('carousel navigation cannot invoke paid jobs or rewrite the current prompt',()=>{
  const code=read('inspiration-carousel.js'),looks=read('inspiration-looks.js');
  assert.doesNotMatch(code,/fetch\(|\/api\/|submit\(|dispatchEvent\(|\.click\(/);
  assert.match(looks,/A modified example is now a user's own direction/);
  assert.match(looks,/if\(existing&&!isInspirationExample\(existing\)\)/);
  assert.doesNotMatch(read('moods.js'),/"id": "chrome-couture"/);
  assert.match(read('lab.js'),/const underlyingMood=id==='chrome-couture'\?'fashion-editorial':id/);
});

test('Image welcome and reopened Inspiration fit the viewport, but real History may grow',()=>{
  const css=read('image-editorial-deck.css');
  const start=css.indexOf('/* Image Studio is one creative surface.');
  const end=css.indexOf('/* Restore a bright cobalt',start);
  assert.ok(start>=0&&end>start,'Signed-in Image viewport rules are present');
  const rules=css.slice(start,end);
  assert.match(rules,/body:has\(#app\.image-studio-active:not\(\[hidden\]\)\) > footer\.pv-lab-footer/);
  assert.match(rules,/html:has\(#app\.image-studio-active:not\(\[hidden\]\)\)/);
  assert.doesNotMatch(rules,/:not\(\.pv-moods-discovery-open\)/,
    'Reopened Inspiration must retain the first-image viewport layout');
  assert.match(rules,/#image-gallery-empty:not\(\[hidden\]\) #lab-welcome-start:not\(\[hidden\]\)/,
    'Only the visible welcome/Discovery gallery is viewport-locked');
  assert.doesNotMatch(rules,/\.image-studio #history\s*\{/,
    'History image grid and paid jobs remain unaffected');
});
