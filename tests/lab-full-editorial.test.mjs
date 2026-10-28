import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('lab/full-editorial.html');
const js=read('lab/full-editorial.js');
const css=read('lab/full-editorial.css');
test('Full Editorial has the approved hero and real four-step navigation',()=>{
 assert.match(html,/Full<br>Editorial<br>Studio/);
 assert.match(html,/full-editorial-hero-clean-20261028\.jpg/,'Use clean photographic hero, not flattened mockup screenshot');
 assert.doesNotMatch(html,/d6c51742-8079-4412-a063-25ed134cec95\.png/,'Old flattened composite must not remain in the hero');
 const hero=readFileSync(new URL('../lab/visuals/full-editorial-hero-clean-20261028.jpg',import.meta.url));
 assert.ok(hero.length>85000&&hero[0]===0xff&&hero[1]===0xd8,'Standalone full-resolution JPEG must be committed');
 for(const step of ['model','style','mood','generate','progress','results'])assert.match(html,new RegExp('id="panel-'+step+'"'));
 assert.match(html,/id="editorial-confirm"/);
 assert.match(html,/id="model-files"[^>]+multiple/);
 assert.match(html,/id="outfit-files"[^>]+multiple/);
 assert.match(html,/id="location-files"[^>]+multiple/);
 assert.match(css,/\.editorial-hero-art img/);
 assert.match(css,/@media\(max-width:520px\)/);
});
test('Navigation routes Full Editorial to its own real page, including legacy links',()=>{
 assert.match(read('lab/studios-menu.js'),/url\('full-editorial\.html'\)/);
 assert.match(read('lab/studio.html'),/get\("workflow"\)==="editorial"\)location\.replace\("\.\/full-editorial\.html"/);
 assert.match(read('tests/lab-landing-ui.cjs'),/full-editorial\\\.html\$/);
});
test('Generation is server quoted, confirmed once, and attached to real jobs',()=>{
 assert.match(js,/\/api\/uploads/);
 assert.match(js,/\/api\/quotes/);
 assert.match(js,/\$\('review-credits'\)\.addEventListener\('click',\(\)=>void reviewBatch\(\)\)/,'Visible primary review button must open real credit review');
 assert.match(js,/\/api\/jobs/);
 assert.match(js,/\/api\/assets\//);
 assert.match(js,/confirm:true/);
 assert.match(js,/Math\.min\(4,remain\)/,'Spicy image batch limit is four');
 assert.match(js,/creditCost/);
 assert.match(js,/Number\(q\.expiresAt\)>Date\.now\(\)/);
 assert.match(js,/Never retry a paid submission/);
 assert.doesNotMatch(js,/fakeResult|sampleResult|mockJob|Math\.random\(\).*job/i);
 assert.match(js,/status==='completed'&&job\.outputId/,'Gallery only shows real completed image jobs');
});
test('Upload inputs, confirmed pricing and private exports remain bounded',()=>{
 assert.match(js,/20\*1024\*1024/);
 assert.match(js,/10-used/,'No more than ten photo references');
 assert.match(js,/count:Math\.min\(4,remain\)/);
 assert.match(js,/function crc32/,'ZIP download is made from actual generated assets');
 assert.match(js,/new Blob\(parts,\{type:'application\/zip'\}\)/);
 assert.match(html,/Each image is generated as its own result/);
 assert.match(html,/Only completed PV LAB jobs appear here/);
});
