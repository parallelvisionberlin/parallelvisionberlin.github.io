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
 assert.match(top,/id="editorial-cast-search"/,'Search shares casting heading');
 assert.match(stage,/class="atelier-source-tabs editorial-casting-tabs"/,'Casting tabs are below the heading');
 assert.match(top,/id="editorial-cast-search"/,'Search remains in the same casting toolbar');
 assert.match(stage,/id="editorial-cast-selection"/);
 assert.match(stage,/id="editorial-casting-controls"/);
 assert.ok(stage.indexOf('id="model-thumbs"')<stage.indexOf('id="model-selection-count"'),'Thumbnails appear before count and Clear all');
 assert.match(js,/editorial-footer-add/,'Footer + adds another model using existing picker');
 const atelierCss=read('lab/full-editorial-atelier.css');
 assert.match(atelierCss,/PVLAB_IDENTITY_REFERENCE_MATCH_20261101/);
 assert.match(atelierCss,/#panel-model \.editorial-composition-option/);
 assert.match(atelierCss,/:has\(#panel-model:not\(\[hidden\]\)\)/,'Identity footer fills the remaining viewport height');
});

test('Identity starts empty and casting is always a deliberate selection',()=>{
 assert.match(html,/full-editorial\.js\?v=20261101-cast-feedback3/);
 assert.doesNotMatch(js,/seedApprovedExampleCast|initialExampleSeeded|initialExampleVersion/);
 assert.match(js,/renderDirections\(\);renderFiles\(\);updateOptions\(\);refreshSliderLabels\(\);updateSeriesSummary\(\);go\(directStart\?1:0\)/);
 assert.match(js,/region\.hidden=!ready/,'Composition only appears with two selected models');
 assert.match(js,/button\.disabled=!ready/,'Composition requires at least two models');
 assert.match(js,/\$\('editorial-cast-empty'\)\.hidden=modelGroups\.length>0/,'Cast strip has explicit empty state');
 assert.match(js,/if\(modelPhoto\)\{/,'User-provided model photo still loads when supplied');
});

test('Multi-model composition is not a dead control for single-model users',()=>{
 assert.match(html,/id="editorial-casting-controls"[^>]*aria-labelledby="editorial-composition-title"[^>]*hidden/);
 assert.match(html,/id="editorial-cast-empty"/,'The selected-cast strip keeps the empty state');
 assert.match(js,/region\.hidden=!ready/);
 assert.match(js,/button\.disabled=!ready/);
 assert.match(js,/button\.setAttribute\('aria-pressed',String\(active\)\)/);
});

test('Styling matches Identity rhythm while keeping real wardrobe references and direction',()=>{
 const stage=html.slice(html.indexOf('id="panel-style"'),html.indexOf('id="panel-mood"'));
 const styleCss=read('lab/full-editorial-atelier.css');
 assert.match(html,/full-editorial-atelier\.css\?v=20261101-tall-cast6/);
 assert.match(stage,/class="atelier-section-top editorial-styling-top"/);
 assert.match(stage,/id="outfit-gallery"/);
 assert.match(stage,/id="outfit-files"/);
 assert.match(stage,/id="styling-direction"/);
 assert.match(stage,/id="garment-guide"/);
 assert.equal((stage.match(/data-sample-kind="outfit"/g)||[]).length,6,'Original six real wardrobe cards are preserved');
 assert.match(styleCss,/PVLAB_STYLING_IDENTITY_PARITY_20261101/);
 assert.match(styleCss,/#panel-style \.stage-visual\{height:clamp\(220px,26svh,266px\)\}/);
 assert.match(styleCss,/#panel-style \.atelier-look\{[\s\S]*?height:clamp\(300px,36svh,350px\)/);
 assert.match(styleCss,/:has\(#panel-style:not\(\[hidden\]\)\) #step-footer/);
 assert.match(styleCss,/#panel-model \.atelier-cast-gallery \.atelier-reference/,'Casting card height changed without modifying Identity data');
});

test('Campaign composition portraits have the approved 185px fashion-editorial treatment',()=>{
 const c=read('lab/full-editorial-atelier.css');
 const options=html.match(/data-cast-composition="(?:mixed|alternating|together)"/g)||[];
 assert.equal(options.length,3,'The existing three composition actions remain unchanged');
 assert.match(c,/PVLAB_EDITORIAL_COMPOSITION_185PX_20261101/);
 assert.match(c,/height:185px;min-height:185px/,'All three desktop choices have the full 185px height');
 assert.match(c,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/,'Desktop keeps three equal columns');
 assert.match(c,/brightness\(\.83\) saturate\(\.82\)/,'Photography is visibly brighter');
 assert.match(c,/\.editorial-composition-option::after/,'Gradient remains readable over photography');
 assert.match(c,/height:172px;min-height:172px/,'The mobile carousel maintains a comfortable card height');
});

test('Empty Identity fits compactly and final Generate has editorial visual hierarchy',()=>{
 const atelier=read('lab/full-editorial-atelier.css');
 assert.match(atelier,/PVLAB_EDITORIAL_COMPACT_EMPTY_AND_CTA_20261101/);
 assert.doesNotMatch(atelier.slice(atelier.indexOf('PVLAB_EDITORIAL_COMPACT_EMPTY_AND_CTA_20261101')),
  /:has\(#editorial-cast-empty:not\(\[hidden\]\)\)/,'No state-dependent casting geometry');
 assert.match(atelier,/height:clamp\(154px,20svh,190px\)/);
 assert.match(html,/id="editorial-generate"[^>]*class="primary full editorial-final-cta"/);
 assert.match(html,/class="editorial-final-cta-label"/);
 assert.match(html,/Generate editorial/);
 assert.match(html,/class="editorial-final-cta-icon"/);
 assert.match(atelier,/\.editorial-final-cta-icon/);
 assert.match(atelier,/border-radius:3px;background:#f1eee6/);
 assert.match(atelier,/#step-next:disabled/);
 assert.match(js,/\$\('editorial-generate'\)\.addEventListener/,'Original paid generation action remains intact');
});

test('Selecting or removing a model never changes Identity hero or portrait dimensions',()=>{
 const atelier=read('lab/full-editorial-atelier.css');
 const compact=atelier.slice(atelier.indexOf('PVLAB_EDITORIAL_COMPACT_EMPTY_AND_CTA_20261101'),atelier.indexOf('/* The actual paid Generate action'));
 assert.doesNotMatch(compact, /:has\(#editorial-cast-empty:not\(\[hidden\]\)\)/);
 assert.match(compact, /\.flow-main:has\(#panel-model:not\(\[hidden\]\)\) #panel-model \.stage-visual/);
 assert.match(compact, /height:clamp\(272px,33svh,295px\)/);
 assert.match(compact, /min-height:71px;margin-top:8px;padding:7px 14px/,'Strip reserves identical space before and after selection');
 assert.doesNotMatch(js, /status\('Added to '\+\(kind==='model'/,'Casting no longer inserts a below-footer success message');
 assert.match(js, /status\(kind==='model'\?'':'Reference removed\.'\)/);
});

test('Identity typography clears Back and progress rail; Continue uses a subdued dark action',()=>{
 const c=read('lab/full-editorial-atelier.css');
 assert.match(c,/PVLAB_IDENTITY_HERO_TEXT_CTA_20261101/);
 assert.match(c,/height:210px/);
 assert.match(c,/bottom:54px/);
 assert.match(c,/\.flow-main:has\(#panel-model:not\(\[hidden\]\)\) #step-next\{/);
 assert.match(c,/background:#131414/);
 assert.match(c,/content:'↗'/);
 assert.match(c,/#step-next:disabled/);
 assert.doesNotMatch(c.slice(c.indexOf('PVLAB_IDENTITY_HERO_TEXT_CTA_20261101')),/#editorial-cast-empty:not/,'No state-dependent hero geometry');
 assert.match(html,/id="step-next" class="primary"/,'Existing continue action and semantics unchanged');
});
