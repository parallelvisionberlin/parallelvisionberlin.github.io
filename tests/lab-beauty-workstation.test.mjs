import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {beautySettings,validateBeautyQuote} from '../lab/beauty-settings.js';
const read=name=>readFileSync(new URL('../lab/'+name,import.meta.url),'utf8');
const html=read('beauty.html'),css=read('beauty-workstation-20261107.css'),ui=read('beauty-workstation-20261107.js'),engine=read('beauty.js');
const baseline={makeup:'keep',hair:'keep',skin:'natural',light:'keep',color:'keep',strength:50};
test('ALTER approved workstation preserves one real native source/result and no fabricated demo',()=>{
 assert.match(html,/<h1>ALTER <br>Studio\.<\/h1>/);
 assert.match(html,/beauty-workstation-20261107\.css\?v=/);
 assert.match(html,/beauty-workstation-20261107\.js\?v=/);
 assert.match(html,/id="beauty-result"[^>]+hidden/);
 assert.match(html,/id="alter-compare-top" hidden/);
 assert.match(html,/id="alter-compare-bottom" hidden/);
 assert.match(html,/id="beauty-result-image"/);
 assert.match(ui,/result\.dataset\.beforeUrl/);
 assert.match(ui,/result\.hidden/);
 assert.match(ui,/data-alter-view/);
 assert.match(css,/alter-compare-bottom/);
 assert.doesNotMatch(html,/class="beauty-looks-arrow/);
 assert.match(html,/rel="icon" href="\.\/branding\/pv-mark\.png"/);
});
test('Native Beauty model/ratio/credit controls remain unique in workstation',()=>{
 for(const id of ['beauty-photo','beauty-model','beauty-ratio','beauty-resolution','beauty-generate','beauty-strength','beauty-direction','beauty-result','beauty-history']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 for(const id of ['alter-layer-look','alter-layer-skin','alter-layer-base','alter-choose-look'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(engine,/validateBeautyQuote\(priced,chosen,source\.id\)/);
 assert.match(engine,/quoteId:frozen\.id,confirm:true/);
 assert.equal((html.match(/data-beauty-choice=/g)||[]).length,45);
});
test('Fine light inputs are real, bounds-checked prompt/quote settings; defaults byte-identical',()=>{
 const old=beautySettings({...baseline,model:'seedream',resolution:'1k',aspectRatio:'4:5'});
 const newDefault=beautySettings({...baseline,model:'seedream',resolution:'1k',aspectRatio:'4:5',advancedLight:{exposure:0,contrast:0,highlights:0,shadows:0,warmth:0}});
 assert.equal(newDefault.prompt,old.prompt);
 for(const id of ['exposure','contrast','highlights','shadows','warmth']){
  assert.match(html,new RegExp('id="beauty-'+id+'"'));
  assert.match(engine,new RegExp("'beauty-"+id+"'"));
 }
 const changed=beautySettings({...baseline,advancedLight:{exposure:3,contrast:12,highlights:-8,shadows:6,warmth:8}});
 for(const v of [/raise exposure by approximately 0\.3 stops/,/increase contrast slightly/,/decrease highlights slightly/,/increase shadows slightly/,/increase warmth slightly/])assert.match(changed.prompt,v);
 const quote={id:'quote-x',creditCost:25,expiresAt:Date.now()+60000,settings:{...changed,referenceSourceIds:['source']}};
 assert.equal(validateBeautyQuote(quote,changed,'source'),quote);
 assert.throws(()=>validateBeautyQuote(quote,old,'source'));
 const zero=beautySettings({...baseline,strength:0,advancedLight:{exposure:3}});
 assert.doesNotMatch(zero.prompt,/exposure/);
 assert.throws(()=>beautySettings({...baseline,advancedLight:{exposure:21}}),/valid lighting/);
 assert.throws(()=>beautySettings({...baseline,advancedLight:{warmth:51}}),/valid lighting/);
 assert.throws(()=>beautySettings({...baseline,advancedLight:{contrast:1.2}}),/valid lighting/);
});
