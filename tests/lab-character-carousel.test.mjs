import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const script=readFileSync('lab/character-home-carousel.js','utf8');
function setup(reduced=false){
 let now=0,id=0;const frames=new Map(),handlers=new Map(),sectionHandlers=new Map(),attributes=new Map(),captures=new Set();
 const nav=()=>({disabled:false,handlers:{},addEventListener(t,f){this.handlers[t]=f;}});
 const prev=nav(),next=nav();
 const track={scrollLeft:0,scrollWidth:2200,clientWidth:600,firstElementChild:{getBoundingClientRect:()=>({width:230})},addEventListener(t,f){handlers.set(t,f)},setAttribute:(k,v)=>attributes.set(k,v),removeAttribute:k=>attributes.delete(k),focus(){},setPointerCapture:i=>captures.add(i),hasPointerCapture:i=>captures.has(i),releasePointerCapture:i=>captures.delete(i),scrollTo({left}){this.scrollLeft=left;handlers.get('scroll')?.();}};
 const section={querySelector:s=>s.includes('__rail')?track:s.includes('prev')?prev:next,addEventListener:(t,f)=>sectionHandlers.set(t,f)};
 const context={document:{querySelectorAll:()=>[section],addEventListener(){}},window:{addEventListener(){}},matchMedia:()=>({matches:reduced,addEventListener(){}}),getComputedStyle:()=>({gap:'10px'}),performance:{now:()=>now},requestAnimationFrame:f=>{frames.set(++id,f);return id},cancelAnimationFrame:i=>frames.delete(i)};
 vm.runInNewContext(script,context);
 const emit=(type,props={},sectionEvent=false)=>{const e={isPrimary:true,button:0,pointerId:1,clientX:400,clientY:100,target:{closest:()=>null},preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true},...props};(sectionEvent?sectionHandlers:handlers).get(type)?.(e);return e;};
 const advance=ms=>{now+=ms;const queued=[...frames.values()];frames.clear();for(const f of queued)f(now)};
 const flick=()=>{emit('pointerdown');advance(16);emit('pointermove',{clientX:330});advance(16);emit('pointermove',{clientX:250});emit('pointerup',{clientX:250});};
 return {track,prev,next,emit,advance,flick,frames,attributes};
}
test('horizontal release coasts, slows down, and settles without snapping',()=>{const s=setup();s.flick();const release=s.track.scrollLeft;s.advance(16);const first=s.track.scrollLeft-release;assert.ok(first>0);s.advance(16);const second=s.track.scrollLeft-release-first;assert.ok(second>0&&second<first);for(let i=0;i<220;i++)s.advance(16);assert.equal(s.frames.size,0);assert.ok(s.track.scrollLeft>release);assert.ok(s.track.scrollLeft<=1600);});
test('coasting stops at the end without wrapping',()=>{const s=setup();s.track.scrollLeft=1550;s.flick();for(let i=0;i<30;i++)s.advance(16);assert.equal(s.track.scrollLeft,1600);assert.equal(s.next.disabled,true);assert.equal(s.frames.size,0);});
test('vertical gestures are left to page scrolling',()=>{const s=setup();s.emit('pointerdown');const e=s.emit('pointermove',{clientX:397,clientY:150});s.emit('pointerup');assert.equal(s.track.scrollLeft,0);assert.equal(e.prevented,undefined);assert.equal(s.frames.size,0);});
test('reduced motion disables release inertia',()=>{const s=setup(true);s.flick();const release=s.track.scrollLeft;s.advance(100);assert.equal(s.track.scrollLeft,release);assert.equal(s.frames.size,0);});
test('pointer cancellation clears dragging without a fling',()=>{const s=setup();s.emit('pointerdown');s.advance(16);s.emit('pointermove',{clientX:300});assert.equal(s.attributes.has('data-dragging'),true);s.emit('pointercancel');assert.equal(s.attributes.has('data-dragging'),false);assert.equal(s.frames.size,0);});
test('arrow controls and focused keyboard navigation use one card and obey bounds',()=>{const s=setup();assert.equal(s.prev.disabled,true);s.next.handlers.click();assert.equal(s.track.scrollLeft,240);const e=s.emit('keydown',{key:'ArrowRight'},true);assert.equal(e.prevented,true);assert.equal(s.track.scrollLeft,480);s.emit('keydown',{key:'End'},true);assert.equal(s.track.scrollLeft,1600);s.emit('keydown',{key:'Home'},true);assert.equal(s.track.scrollLeft,0);const text=s.emit('keydown',{key:'ArrowRight',target:{closest:()=>({})}},true);assert.equal(text.prevented,undefined);});
test('new input stops momentum and normal creation links remain clickable',()=>{const s=setup();s.flick();assert.ok(s.frames.size);s.emit('pointerdown',{target:{closest:()=>({tagName:'A'})}});assert.equal(s.frames.size,0);const click=s.emit('click');assert.equal(click.prevented,undefined);});
test('a drag suppresses its synthetic click, and a held gesture does not fling',()=>{const s=setup();s.emit('pointerdown');s.advance(16);s.emit('pointermove',{clientX:250});s.advance(150);s.emit('pointerup');assert.equal(s.frames.size,0);assert.equal(s.emit('click').prevented,true);assert.equal(s.emit('click').prevented,undefined);});
