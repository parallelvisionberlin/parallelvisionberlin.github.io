import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('lab/full-editorial.html');
const js=read('lab/full-editorial.js');
const css=read('lab/full-editorial.css');
test('Full Editorial has the approved hero and real four-step navigation',()=>{
 assert.match(html,/aria-label="Full Editorial Studio"/);
 assert.match(html,/editorial-hero-art[^>]*><img src="\.\/visuals\/character-casting\/bronze-cast03\.webp"/,'Use original bronze casting photograph for the public hero');
 assert.doesNotMatch(html,/d6c51742-8079-4412-a063-25ed134cec95\.png/,'Old flattened composite must not remain in the hero');
 assert.doesNotMatch(html,/src="\.\/visuals\/full-editorial-hero-clean-20261028\.jpg"/,'Old chrome portrait must not render as hero');
 assert.match(css,/PVLAB_ANGULAR_EDITORIAL_20261029/,'Responsive editorial image art direction is present');
 assert.match(html,/class="hero-title-italic">Studio\./);
 assert.match(html,/Create your editorial/);
 assert.match(html,/class="editorial-hero-process"/);
 assert.match(html,/class="editorial-flow-rail"/);
 assert.match(js,/item\.classList\.toggle\('is-current'/);
 assert.match(css,/PVLAB_EDITORIAL_COHERENCE_20261029/);
 assert.match(css,/min-width:278px;min-height:62px/);
 assert.match(read('lab/studios-menu.js'),/pv-studios-editorial-artwork/);
 assert.match(read('lab/studios-menu.css'),/pv-studios-editorial-copy/);
 for(const step of ['model','style','mood','generate','progress','results'])assert.match(html,new RegExp('id="panel-'+step+'"'));
 assert.doesNotMatch(html,/id="editorial-confirm"/);
 assert.match(html,/id="editorial-generate"/);
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
 assert.match(js,/\$\('editorial-generate'\)\.addEventListener/,'One visible Generate action submits the displayed bound quote');
 assert.match(js,/frozen\.revision!==revision/,'Changed settings cannot submit an old quote');
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
 assert.match(js,/count:1/,'Every art-directed image is quoted individually');
 assert.match(js,/editorialShotPlan/,'Distinct shot prompts and cast references are built for each image');
 assert.match(js,/function crc32/,'ZIP download is made from actual generated assets');
 assert.match(js,/new Blob\(parts,\{type:'application\/zip'\}\)/);
 assert.match(html,/Each photograph receives its own shot direction/);
 assert.match(html,/Only completed PV LAB jobs appear here/);
});

test('Atelier references remain real and the creative steps feed real generation settings',()=>{
 for(const token of ['data-sample-kind="model"','data-sample-kind="outfit"','id="model-thumbs"','id="outfit-thumbs"','id="review-model-thumb"','id="review-outfit-thumb"','id="review-location-thumb"'])assert.ok(html.includes(token),token);
 for(const token of ['id="editorial-time"','id="editorial-atmosphere"','id="editorial-palette"','id="direction-summary"'])assert.ok(html.includes(token),token);
 assert.match(js,/async function toggleSample/);
 assert.match(js,/new File\(/);
 assert.match(js,/function updateSeriesSummary/);
 assert.match(js,/selectedDirections=\{location:null,moods:null,material:null\}/);
 assert.match(js,/const moodText=Object\.entries\(selectedDirections\)/);
 assert.match(html,/id="model-drop" class="editorial-own-cast"/,'First casting slot is the upload card');
 assert.match(html,/id="saved-character-gallery"/,'Saved characters are available inline');
 assert.match(html,/data-cast-composition="mixed"/,'Mixed editorial composition is available');
 assert.match(html,/data-cast-composition="alternating"/,'Individual portraits composition is available');
 assert.match(html,/data-cast-composition="together"/,'Together composition is available');
 assert.match(js,/castComposition==='together'/,'Together selection changes real shot references');
 assert.doesNotMatch(html,/id="identity-guide"/,'Redundant identity slider removed from casting step');
 assert.match(js,/function createModelGroup/,'Additional photos are grouped per model');
 assert.match(js,/function addSavedCharacter/,'Saved Character packs can join the cast');
 assert.match(js,/groupId===group.id/,'Shot references stay assigned to their person');
 assert.match(html,/Generate starts the set at the credit cost shown below/);
 assert.match(html,/full-editorial-atelier\.css/);
 assert.match(html,/id="editorial-mobile-menu"/);
});

test('Progress reuses the homepage ivory film and keeps results prominent',()=>{
 const film=html.match(/id="editorial-generation-film"[^>]*data-src="([^"]+)"/)[1];
 assert.ok(read('lab/index.html').includes('data-src="'+film+'"'),'Exact homepage Full Editorial film is reused');
 assert.doesNotMatch(html,/studios-original-reference.svg/);
 assert.match(js,/generationVideo.pause\(\)/);
 assert.match(js,/prefers-reduced-motion/);
 assert.match(read('lab/full-editorial-atelier.css'),/font-size:clamp\(34px,3.4vw,56px\)/);
});

test('Identity casting uses the approved photographic layout rather than standalone form rows',()=>{
 const stage=html.slice(html.indexOf('id="panel-model"'),html.indexOf('id="panel-style"'));
 const top=stage.slice(stage.indexOf('editorial-casting-top'),stage.indexOf('id="casting-reference-gallery"'));
 assert.match(top,/atelier-source-tabs/,'Casting source tabs share the title row');
 assert.match(top,/id="editorial-cast-search"/,'Search remains in the same casting toolbar');
 assert.match(stage,/id="editorial-cast-selection"/);
 assert.match(stage,/id="editorial-casting-controls"/);
 assert.ok(stage.indexOf('id="model-thumbs"')<stage.indexOf('id="model-selection-count"'),'Thumbnails appear before count and Clear all');
 assert.match(js,/editorial-footer-add/,'Footer + adds another model using existing picker');
 assert.match(css,/PVLAB_IDENTITY_REFERENCE_MATCH_20261101/);
 assert.match(css,/#panel-model \.editorial-composition-option/);
 assert.match(css,/:has\(#panel-model:not\(\[hidden\]\)\)/,'Identity footer fills the remaining viewport height');
});
