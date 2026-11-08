import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {beautySettings,validateBeautyQuote} from '../lab/beauty-settings.js';
import {beautyLookCatalog as catalog,beautyLookPresets as recipes} from '../lab/beauty-look-catalog.js';
const html=readFileSync(new URL('../lab/beauty.html',import.meta.url),'utf8');
const defaults={makeup:'keep',hair:'keep',skin:'natural',light:'keep',color:'keep',strength:50};
for(const [category,options] of Object.entries(catalog))test('ALTER '+category+': labels and all nine exact instructions match quoted settings',()=>{
 assert.equal(options.length,category==='makeup'?16:9);assert.equal(new Set(options.map(o=>o.id)).size,options.length);
 for(const o of options){
  assert.ok(html.includes(`data-beauty-choice="beauty-${category}" data-value="${o.id}"`));
  assert.ok(html.includes(`aria-label="${category[0].toUpperCase()+category.slice(1)}: ${o.label.replaceAll('&','&amp;').replaceAll('"','&quot;')}"`));
  const selected=beautySettings({...defaults,[category]:o.id});
  if(o.instruction)assert.ok(selected.prompt.includes(o.instruction),'Missing exact '+category+'/'+o.id+' direction');
  for(const other of options)if(other.id!==o.id&&other.instruction)assert.equal(selected.prompt.includes(other.instruction),false,'No stale competing '+other.id);
  const quote={id:'q',creditCost:25,expiresAt:2000,settings:{...selected,referenceSourceIds:['source']}};
  assert.equal(validateBeautyQuote(quote,selected,'source',1000),quote);
  const alternative=options.find(x=>x.id!==o.id);
  assert.throws(()=>validateBeautyQuote(quote,beautySettings({...defaults,[category]:alternative.id}),'source',1000));
 }
});
test('Presets correspond to visible category state and do not invent clothing replacement',()=>{
 for(const recipe of Object.values(recipes))for(const category of Object.keys(catalog))assert.ok(catalog[category].some(o=>o.id===recipe[category]));
 assert.equal(recipes.night.light,'low-key');assert.equal(recipes.film.color,'film');assert.equal(recipes.natural.light,'daylight');
});
test('Zero intensity cannot carry hidden optional changes; monochrome retains identity without contradictory chromatic locks',()=>{
 const zero=beautySettings({...defaults,makeup:'metallic',hair:'wet',skin:'dewy',light:'flash',color:'mono',strength:0,direction:'Make the hair bright green.'});
 assert.doesNotMatch(zero.prompt,/metallic|wet-look|dewy finish|on-camera flash|black-and-white|bright green/);
 const mono=beautySettings({...defaults,color:'mono'});
 assert.match(mono.prompt,/black-and-white/);assert.doesNotMatch(mono.prompt,/age, skin tone,/);assert.doesNotMatch(mono.prompt,/Keep the original hairstyle and hair colour/);assert.match(mono.prompt,/Preserve their identity/);
});
test('Arrow-free archive, PV LAB favicon and original typography remain in the delivered page',()=>{
 assert.doesNotMatch(html,/class="beauty-looks-arrow/);
 assert.match(html,/<h1>ALTER <br>Studio\.<\/h1>/);
 assert.match(html,/rel="icon" href="\.\/branding\/pv-mark\.png"/);
 assert.equal((html.match(/data-beauty-original/g)||[]).length,5);
});
