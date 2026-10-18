import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../lab/'+path,import.meta.url),'utf8');

test('both Image inspiration entrances retain the original six cards and add Chrome Couture as #7',()=>{
  const html=read('studio.html');
  assert.equal((html.match(/class="inspiration-carousel-shell/g)||[]).length,2);
  assert.equal((html.match(/data-guest-mood=/g)||[]).length,7);
  assert.equal((html.match(/data-welcome-mood=/g)||[]).length,7);
  for(const id of ['dream-blur','90s-cinema','fashion-editorial','dreamcore','hong-kong-nights','80s-film']){
    assert.match(html,new RegExp('data-guest-mood="'+id+'"'));
    assert.match(html,new RegExp('data-welcome-mood="'+id+'"'));
  }
  assert.equal((html.match(/data-guest-mood="chrome-couture"/g)||[]).length,1);
  assert.equal((html.match(/data-welcome-mood="chrome-couture"/g)||[]).length,1);
  assert.equal((html.match(/data-inspiration-nav="prev"/g)||[]).length,2);
  assert.equal((html.match(/data-inspiration-nav="next"/g)||[]).length,2);
  assert.match(html,/inspiration-carousel\.css\?v=20261019-chrome1/);
  assert.match(html,/inspiration-carousel\.js\?v=20261019-chrome1/);
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
});
test('carousel navigation cannot invoke paid jobs or rewrite the current prompt',()=>{
  const code=read('inspiration-carousel.js'),looks=read('inspiration-looks.js');
  assert.doesNotMatch(code,/fetch\(|\/api\/|submit\(|dispatchEvent\(|\.click\(/);
  assert.match(looks,/A modified example is now a user's own direction/);
  assert.match(looks,/if\(existing&&!isInspirationExample\(existing\)\)/);
  assert.doesNotMatch(read('moods.js'),/"id": "chrome-couture"/);
  assert.match(read('lab.js'),/const underlyingMood=id==='chrome-couture'\?'fashion-editorial':id/);
});
