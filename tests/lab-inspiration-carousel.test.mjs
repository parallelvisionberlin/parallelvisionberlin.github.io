import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read=path=>readFileSync(new URL('../lab/'+path,import.meta.url),'utf8');

test('both Image Inspiration entrances share the approved Chrome Couture and Cloud Spa swap',()=>{
  const html=read('studio.html');
  assert.equal((html.match(/class="inspiration-carousel-shell/g)||[]).length,2);
  assert.equal((html.match(/data-guest-mood=/g)||[]).length,8);
  assert.equal((html.match(/data-welcome-mood=/g)||[]).length,8);
  for(const id of ['dream-blur','soft-pastel-film','fashion-editorial','fisheye-2000','dreamcore','hong-kong-nights','80s-film']){
    assert.match(html,new RegExp('data-guest-mood="'+id+'"'));
    assert.match(html,new RegExp('data-welcome-mood="'+id+'"'));
  }
  assert.equal((html.match(/data-guest-mood="chrome-couture"/g)||[]).length,1);
  assert.equal((html.match(/data-welcome-mood="chrome-couture"/g)||[]).length,1);
  assert.equal((html.match(/data-inspiration-nav="prev"/g)||[]).length,2);
  assert.equal((html.match(/data-inspiration-nav="next"/g)||[]).length,2);
  assert.match(html,/inspiration-carousel\.css\?v=20261118-mobile-inertia2/);
  assert.match(html,/inspiration-carousel\.js\?v=20261117-inertia1/);
  assert.match(html,/id="lab-welcome-presets"/);
  const guest=[...html.matchAll(/data-guest-mood="([^"]+)"/g)].map(match=>match[1]);
  const signed=[...html.matchAll(/data-welcome-mood="([^"]+)"/g)].map(match=>match[1]);
  const expected=['dream-blur','soft-pastel-film','fashion-editorial','fisheye-2000','chrome-couture','hong-kong-nights','dreamcore','80s-film'];
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
test('both Inspiration rows support mouse-wheel browsing without trapping page scroll',()=>{
  const js=read('inspiration-carousel.js');
  const html=read('studio.html');
  assert.match(js,/track\.addEventListener\('wheel',event=>/);
  assert.match(js,/Math\.abs\(event\.deltaY\)<=Math\.abs\(event\.deltaX\)/);
  assert.match(js,/event\.ctrlKey\|\|event\.metaKey/);
  assert.match(js,/direction<0&&track\.scrollLeft<=2&&base<=2/);
  assert.match(js,/direction>0&&track\.scrollLeft>=limit-2&&base>=limit-2/);
  assert.match(js,/event\.preventDefault\(\)/);
  assert.match(js,/wheelTarget=clamp/);
  assert.match(js,/requestAnimationFrame/);
  assert.doesNotMatch(js,/lastWheelStep|230/);
  assert.match(read('inspiration-carousel.css'),/scroll-snap-type:none/);
  assert.match(js,/\},\{passive:false\}\)/);
  assert.match(html,/inspiration-carousel\.js\?v=20261117-inertia1&inspirationCatalog=20261117-owner1&noNativeTips=20261118v1&pastelDream=20261118a/);
});
test('vertical wheel gestures glide by pixels, accumulate, and release the page at both ends',()=>{
  const code=read('inspiration-carousel.js').replace(/^import [^\n]+\n/,'');
  const frames=new Map();
  let nextId=0,time=0;
  const nav=()=>({hidden:false,disabled:false,addEventListener(){}});
  const previous=nav(),next=nav();
  const track={
    clientWidth:600,scrollWidth:1500,scrollLeft:0,
    style:{scrollBehavior:'',removeProperty(name){if(name==='scroll-behavior')this.scrollBehavior='';}},
    events:{},
    addEventListener(type,fn){this.events[type]=fn;},
    querySelector(){return {getBoundingClientRect:()=>({width:220})};},
    scrollBy({left}){this.scrollLeft+=left;}
  };
  const shell={
    querySelector(selector){
      if(selector==='.pv-guest-cards,.lab-welcome-presets')return track;
      if(selector==='[data-inspiration-nav="prev"]')return previous;
      if(selector==='[data-inspiration-nav="next"]')return next;
      return null;
    }
  };
  const document={querySelectorAll:()=>[shell],addEventListener(){}};
  const requestAnimationFrame=fn=>{frames.set(++nextId,fn);return nextId;};
  const cancelAnimationFrame=id=>frames.delete(id);
  runInNewContext(code,{document,window:{addEventListener(){}},matchMedia:()=>({matches:false}),
    requestAnimationFrame,cancelAnimationFrame,getComputedStyle:()=>({columnGap:'14px'}),
    Element:class {},performance:{now:()=>time}});
  const animate=(count=70)=>{
    for(let i=0;i<count&&frames.size;i++){
      const callbacks=[...frames.values()];frames.clear();time+=16.7;
      for(const callback of callbacks)callback(time);
    }
  };
  const wheel=(deltaY,deltaX=0)=>{
    const event={deltaY,deltaX,deltaMode:0,defaultPrevented:false,ctrlKey:false,metaKey:false,
      preventDefault(){this.defaultPrevented=true;}};
    track.events.wheel(event);return event;
  };
  animate(1); // Initial arrow-state update.
  assert.equal(wheel(100).defaultPrevented,true);
  assert.equal(track.scrollLeft,0,'Wheel input initiates a frame, not an immediate card jump');
  animate(1);
  assert.ok(track.scrollLeft>0&&track.scrollLeft<100,'First frame is a partial easing step');
  assert.equal(wheel(70).defaultPrevented,true);
  animate();
  assert.ok(Math.abs(track.scrollLeft-200.6)<1,'Two wheel inputs accumulate as pixel deltas');
  assert.equal(frames.size,0,'Glide settles without a perpetual animation');
  assert.equal(track.style.scrollBehavior,'','Native scroll behavior returns after the glide');
  assert.equal(wheel(0,60).defaultPrevented,false,'Horizontal trackpad motion stays native');
  track.scrollLeft=900;
  assert.equal(wheel(80).defaultPrevented,false,'At right edge, wheel scrolls the page');
  assert.equal(wheel(-80).defaultPrevented,true,'Wheel can return inward from right edge');
  animate();
  track.scrollLeft=0;
  assert.equal(wheel(-80).defaultPrevented,false,'At left edge, wheel scrolls the page');
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

test('Phone Image Inspiration preserves kinetic free-scroll for both account states',()=>{
 const css=read('inspiration-carousel.css');
 const m=css.slice(css.indexOf('/* PVLAB_MOBILE_IMAGE_INERTIA_20261118'));
 assert.match(m,/@media\(max-width:680px\)/);
 assert.match(m,/#gate \.pv-guest-carousel \.pv-guest-cards/);
 assert.match(m,/#app\.image-studio-active #lab-welcome-start \.lab-welcome-carousel \.lab-welcome-presets/);
 assert.match(m,/scroll-snap-type:none!important/);
 assert.match(m,/scroll-behavior:auto!important/);
 assert.match(m,/-webkit-overflow-scrolling:touch/);
});
