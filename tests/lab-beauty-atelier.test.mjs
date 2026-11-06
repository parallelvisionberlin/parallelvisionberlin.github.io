import test from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {beautySettings,validateBeautyQuote,BEAUTY_PROMPT_PREFIX} from '../lab/beauty-settings.js';
const source=readFileSync(new URL('../lab/beauty.html',import.meta.url),'utf8');
test('ALTER defaults remain Original / Original / Natural / 50 and preserve the legacy prompt',()=>{
 const settings=beautySettings({makeup:'keep',hair:'keep',skin:'natural',strength:50});
 assert.equal(settings.prompt,[BEAUTY_PROMPT_PREFIX,'Edit the supplied photograph of this same person. Preserve their identity, facial structure, age, skin tone, body proportions, pose and background. Make only the requested beauty changes. Do not add a veil, clothing, jewellery or props unless explicitly requested.','Keep the original makeup. Keep the original hairstyle and hair colour. Preserve natural skin texture, pores, freckles and distinctive marks. Look intensity: 50/100; scale the beauty changes accordingly.','Believable fashion photography, realistic skin and hair; no plastic smoothing or reshaped anatomy.'].join('\n'));
 for(const [id,value] of [['makeup','keep'],['hair','keep'],['skin','natural'],['light','keep'],['color','keep']])assert.match(source,new RegExp(`id="beauty-${id}"[\\s\\S]*?<option value="${value}" selected>`));
 assert.match(source,/id="beauty-strength"[^>]*value="50"/);
});
test('All 45 visible choices compile through the existing image route',()=>{
 const selects=[...source.matchAll(/<select id="beauty-(makeup|hair|skin|light|color)"[^>]*>([\s\S]*?)<\/select>/g)];
 assert.equal(selects.length,5);
 for(const [,category,options] of selects){
  const values=[...options.matchAll(/<option value="([^"]+)"/g)].map(m=>m[1]);assert.equal(values.length,9);
  for(const value of values){const s=beautySettings({[category]:value});assert.equal(s.type,'image');assert.equal(s.engine,'seedream');assert.equal(s.mode,'image');assert.equal(s.referenceRoles[0].role,'identity');}
 }
});
test('Light and color are prompt-only instructions, scaled to strength and quote-bound',()=>{
 const settings=beautySettings({light:'flash',color:'mono'});
 assert.match(settings.prompt,/Direct on-camera flash/);assert.match(settings.prompt,/black-and-white/);
 assert.deepEqual(Object.keys(settings),Object.keys(beautySettings()));
 assert.doesNotMatch(beautySettings({light:'flash',color:'mono',strength:0}).prompt,/on-camera flash|black-and-white/);
 const q={id:'q',creditCost:23,expiresAt:2000,settings:{...settings,referenceSourceIds:['source']}};
 assert.equal(validateBeautyQuote(q,settings,'source',1000),q);
 assert.throws(()=>validateBeautyQuote(q,beautySettings({light:'softbox',color:'mono'}),'source',1000));
 for(const category of ['makeup','hair','skin','light','color'])for(const value of ['invalid','constructor','__proto__'])assert.throws(()=>beautySettings({[category]:value}));
});
test('Presentation never adds a provider or automatic generation path',()=>{
 const ui=readFileSync(new URL('../lab/beauty-approved-20261029.js',import.meta.url),'utf8');
 assert.doesNotMatch(ui,/fetch\(|\/api\/|requestSubmit|\.submit\(/);
 assert.match(ui,/prefers-reduced-motion/);assert.match(ui,/pointercancel/);assert.match(ui,/role','slider/);
});

test('Approved hero image and its full composition stylesheet remain byte-identical',()=>{
 const digest=path=>createHash('sha256').update(readFileSync(new URL(path,import.meta.url))).digest('hex');
 assert.equal(digest('../lab/visuals/beauty/atelier/hero.webp'),'ecaa0cb86a6af9cf1cf1975a2d3fe59a265ffe66085a1e1e0e6e52b2ecd38bb1');
 assert.equal(digest('../lab/beauty-editorial-final.css'),'8fb8d32b81006996a9667f5449d55f069b605eaaecfbd482c35a8508c83ef665');
 assert.match(source,/<h1>ALTER <br>Studio\.<\/h1>/);
 assert.match(source,/rel="icon" href="\.\/branding\/pv-mark\.png"/);
 const refinement=readFileSync(new URL('../lab/beauty-flow-refinement.css',import.meta.url),'utf8');
 assert.doesNotMatch(refinement,/background-image|beauty-editor-grid|\bh1\b/);
 assert.doesNotMatch(source,/class="beauty-looks-arrow/);
});

test('Wheel animation settles on pixel-quantized and fractional scroll positions without idle frames',async()=>{
 const {runInNewContext}=await import('node:vm');
 const ui=readFileSync(new URL('../lab/beauty-approved-20261029.js',import.meta.url),'utf8');
 const body=ui.match(/const animateWheel=\(\)=>\{([\s\S]*?)\n  \};/)?.[1];assert.ok(body);
 for(const quantized of [true,false])for(const [start,end] of [[0,126],[126,0],[0,75.25],[35,.4]]){
  const context={result:null,start,end,quantized};
  runInNewContext(`let offset=start,target=end,wheelFrame=0;const queue=[];
   const track={get scrollLeft(){return offset},set scrollLeft(v){offset=quantized?Math.round(v):v}};
   const clamp=v=>Math.max(0,Math.min(200,v));
   const requestAnimationFrame=fn=>{queue.push(fn);return queue.length};
   const animateWheel=()=>{${body}};
   animateWheel();let frames=0;while(queue.length&&frames<80){frames++;queue.shift()()}
   result={frames,pending:queue.length,left:offset,wheelFrame};`,context);
  assert.equal(context.result.pending,0,'No idle animation loop after '+start+' -> '+end);
  assert.equal(context.result.wheelFrame,0);
  assert.ok(Math.abs(context.result.left-end)<=.5,'Final scroll position is reached to pixel precision');
 }
});
