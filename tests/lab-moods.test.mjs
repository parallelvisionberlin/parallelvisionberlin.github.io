import test from 'node:test';
import assert from 'node:assert/strict';
import {MOODS,MOOD_MODELS,moodById,prepareMoodPrompt,preparePersonalMoodPrompt,userFacingImagePrompt,imageHistoryCaption,moodsPanelViewportGeometry} from '../lab/moods.js';
import {readFileSync} from 'node:fs';
import {compileImagePrompt} from '../lab/reference-guidance.js';

test('My Moods reuse saved visual direction, not hidden board image references',()=>{
  const id='30000000-0000-4000-8000-000000000012';
  const board={id,name:'Liquid Memory',direction:'Pearlescent skin, humid cyan reflections, analog fog',baseMoodId:'dreamcore',intensity:85,imageIds:['30000000-0000-4000-8000-000000000003']};
  const r=preparePersonalMoodPrompt('A woman on a beach',board,85,{engine:'seedream',referenceCount:1});
  assert.equal(r.error,'');
  assert.match(r.prompt,/PV LAB MY MOOD \/ Liquid Memory/);
  assert.match(r.prompt,/PV LAB MOOD \/ Dreamcore/);
  assert.doesNotMatch(r.prompt,/000000000003/);
  assert.deepEqual(r.metadata,{moodId:'custom',customMoodName:'Liquid Memory',customMoodBoardId:id,moodIntensity:85,moodOriginalPrompt:'A woman on a beach'});
  assert.equal(userFacingImagePrompt({...r.metadata,prompt:r.prompt}),'A woman on a beach');
  assert.equal(imageHistoryCaption({...r.metadata,prompt:r.prompt}),'Liquid Memory · 85% · A woman on a beach');
  assert.match(preparePersonalMoodPrompt('',board,85,{engine:'seedream'}).error,/Describe a subject/);
});
test('My Moods live in the existing selector, result viewer and authenticated Worker',()=>{
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  const moods=readFileSync(new URL('../lab/moods.js',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  const editor=readFileSync(new URL('../lab/my-moods.js',import.meta.url),'utf8');
  const worker=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
  assert.match(moods,/'My Moods'/);
  assert.match(moods,/moods-board-create/);
  assert.match(moods,/createTile\.hidden=category!=='My Moods'\|\|personalMoods\.length===0/);
  assert.match(moods,/function setPersonalMoods\(next=\[\]\)/);
  assert.match(ui,/createMyMoods\(\{api,assetBlob,moodUI/);
  assert.match(ui,/image-detail-save-mood/);
  assert.match(ui,/myMoods\.reset\(\);owner=false/);
  assert.match(html,/id="moodboard-editor" class="moodboard-editor"/);
  assert.match(html,/id="moodboard-upload"/);
  assert.match(editor,/api\('\/api\/moodboards'/);
  assert.match(editor,/api\('\/api\/uploads'/);
  assert.match(worker,/moodBoardsRoute\(request,env,owner/);
  assert.match(worker,/SELECT image_ids FROM moodboards/);
  assert.match(worker,/customMoodName/);
});

test('My Moods never silently treat the original image subject prompt as a reusable style',()=>{
  const editor=readFileSync(new URL('../lab/my-moods.js',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  assert.doesNotMatch(editor,/direction\.value=userFacingImagePrompt\(settings\)/);
  assert.match(editor,/subject, not a reusable style/);
  assert.match(editor,/if\(!proposed\.direction&&!proposed\.baseMoodId\)/);
  assert.ok(editor.indexOf('const uploadedIds=await uploadStagedFiles()')>editor.indexOf('if(!proposed.direction&&!proposed.baseMoodId)'));
  assert.match(ui,/Curated Moods remain usable while personal boards are unavailable/);
});
test('exactly eleven unique curated moods with imagery',()=>{
  assert.equal(MOODS.length,11);
  assert.equal(new Set(MOODS.map(m=>m.id)).size,11);
  for(const mood of MOODS)for(const field of ['name','category','preview','direction','subtle','intense','avoid'])assert.ok(mood[field]);
});
test('only explicitly compatible image engines receive moods',()=>{
  assert.deepEqual([...MOOD_MODELS],['seedream','gemini']);
  assert.match(prepareMoodPrompt('portrait','night-flash',60,{engine:'soulpro'}).error,/supports Seedream/);
  assert.equal(moodById('fake'),null);
});
test('original prompt is not lost; mood metadata can be restored',()=>{
  const data=prepareMoodPrompt('Nina sitting by a window','hong-kong-nights',64,{engine:'gemini',referenceCount:1});
  assert.ok(data.prompt.startsWith('Nina sitting by a window\n\n'));
  assert.match(data.prompt,/atmospheric emerald haze/);
  assert.match(data.prompt,/first reference is the base/);
  assert.deepEqual(data.metadata,{moodId:'hong-kong-nights',moodIntensity:64,moodOriginalPrompt:'Nina sitting by a window'});
  assert.equal(data.error,'');
});
test('mood intensity actually affects the generated directions',()=>{
  const low=prepareMoodPrompt('portrait','kodak-gold',10);
  const high=prepareMoodPrompt('portrait','kodak-gold',90);
  assert.notEqual(low.prompt,high.prompt);
  assert.match(low.prompt,/golden color-negative print influence/i);
  assert.match(high.prompt,/visibly organic 35mm grain/i);
});
test('mood alone needs either a source or a subject; long prompts are blocked',()=>{
  assert.match(prepareMoodPrompt('','90s-cinema',60).error,/Describe a subject/);
  assert.equal(prepareMoodPrompt('','90s-cinema',60,{referenceCount:1}).error,'');
  assert.match(prepareMoodPrompt('X'.repeat(4950),'90s-cinema',60).error,/exceed 5,000/);
});
test('clear mood returns the unmodified original prompt',()=>{
  assert.deepEqual(prepareMoodPrompt('  portrait  ','',50),{prompt:'portrait',metadata:{},error:''});
});

test('Moods show only the user-authored direction, never compiled provider instructions',()=>{
  const settings={moodId:'hong-kong-nights',moodIntensity:90,moodOriginalPrompt:'Portrait beside a window',
    prompt:'Portrait beside a window\n\nPV LAB MOOD / Hong Kong Nights: internal art direction'};
  assert.equal(userFacingImagePrompt(settings),'Portrait beside a window');
  assert.equal(imageHistoryCaption(settings),'Hong Kong Nights · 90% · Portrait beside a window');
  assert.equal(userFacingImagePrompt({...settings,moodOriginalPrompt:''}),'');
  assert.equal(imageHistoryCaption({...settings,moodOriginalPrompt:''}),'Hong Kong Nights · 90%');
  assert.equal(userFacingImagePrompt({...settings,moodOriginalPrompt:undefined}),'Portrait beside a window');
});
test('Older Moods prompts are not exposed in the viewer or history',()=>{
  assert.equal(userFacingImagePrompt({prompt:'PV LAB MOOD / Hong Kong Nights: secret directions'}),'');
  assert.equal(userFacingImagePrompt({prompt:'My photograph\n\nPV LAB MOOD / Hong Kong Nights: secret directions'}),'My photograph');
  assert.equal(imageHistoryCaption({prompt:'Normal text-only image'}),'Normal text-only image');
  assert.equal(userFacingImagePrompt({moodId:'unlisted',prompt:'private prompt'}),'');
});
test('Image viewer, Copy and History render the public-facing prompt only',()=>{
  const js=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  assert.match(js,/const mood=moodById\(params.moodId\),customMood=/);
  assert.match(js,/const promptText=userFacingImagePrompt\(params\)/);
  assert.match(js,/const text=userFacingImagePrompt\(imageDetailJob.settings\)/);
  assert.match(js,/image\?imageHistoryCaption\(j.settings\)/);
  assert.match(html,/id="image-detail-mood-feature"/);
  assert.match(html,/id="image-detail-prompt-header"/);
});

test('High intensity is genuinely distinct for Cinema, Kodak and Sumi-e',()=>{
  const cinema=prepareMoodPrompt('Portrait','90s-cinema',100,{referenceCount:1});
  assert.match(cinema.prompt,/dramatic, glossy 1990s feature-film scene/i);
  assert.match(cinema.prompt,/DO NOT preserve the original flat daylight look/i);
  const gold=prepareMoodPrompt('Portrait','kodak-gold',100,{referenceCount:1});
  assert.match(gold.prompt,/abundant visibly organic 35mm grain/i);
  assert.match(gold.prompt,/Do not turn the face orange/i);
  const ink=prepareMoodPrompt('Portrait','sumi-ink',100,{referenceCount:1});
  assert.match(ink.prompt,/confidently executed Japanese ink-wash painting/i);
  assert.equal(moodById('sumi-ink').name,'Japanese Sumi-e');
  assert.match(moodById('hong-kong-nights').direction,/atmospheric emerald haze/i);
});
test('Gallery hover metadata identifies the exact image model',()=>{
  const src=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  assert.match(src,/function galleryImageModelName\(job\)/);
  assert.match(src,/modelLabel=image\?galleryImageModelName\(j\)\.toUpperCase\(\)/);
  assert.match(src,/meta\.textContent=\[j\.status\.toUpperCase\(\),imageLabel,modelLabel/);
});

test('90s Cinema thumbnail and applied mood share a film-scan style',()=>{
  const preset=moodById('90s-cinema');
  assert.equal(preset.preview,'/lab/mood-previews/90s-cinema-record-shop-20261010.webp');
  for(const intensity of [15,60,100]){
    const result=prepareMoodPrompt('A person in a room','90s-cinema',intensity,{engine:'seedream',referenceCount:1});
    assert.equal(result.error,'');
    assert.match(result.prompt,/35mm/i);
  }
  assert.match(prepareMoodPrompt('Portrait','90s-cinema',60).prompt,/film-gate edge/i);
  assert.match(prepareMoodPrompt('Portrait','90s-cinema',100).prompt,/sprocket perforations/i);
  const css=readFileSync(new URL('../lab/moods.css',import.meta.url),'utf8');
  assert.ok(css.includes('.moods-look-90s-cinema img{filter:none'));
});

test('Mood intensity control is prominent, responsive and reflects each live setting',()=>{
  const css=readFileSync(new URL('../lab/moods.css',import.meta.url),'utf8');
  const js=readFileSync(new URL('../lab/moods.js',import.meta.url),'utf8');
  assert.match(css,/grid-template-columns:minmax\(0,1fr\) 170px/);
  assert.match(css,/moods-intensity::\-webkit-slider-runnable-track/);
  assert.match(css,/height:7px/);
  assert.match(css,/moods-intensity::\-moz-range-progress/);
  assert.match(css,/@media\(max-width:740px\)/);
  assert.match(js,/slider\.style\.setProperty\('--moods-progress'/);
});

test('Moods footer has a larger primary action and a compact accessible explanation',()=>{
  const css=readFileSync(new URL('../lab/moods.css',import.meta.url),'utf8');
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../lab/moods.js',import.meta.url),'utf8');
  assert.match(html,/id="composer-moods-about"[^>]*aria-expanded="false"[^>]*aria-controls="composer-moods-explanation"/);
  assert.match(html,/id="composer-moods-explanation"[^>]*role="note" hidden/);
  assert.match(html,/class="moods-scale" aria-hidden="true"/);
  assert.match(html,/id="composer-moods-none" type="button" aria-label="Clear selected mood">Clear/);
  assert.doesNotMatch(html,/class="moods-bottom"/);
  assert.match(css,/#composer-moods-done,[\s\S]*?#composer-moods-switch\{[\s\S]*?min-height:48px/);
  assert.match(css,/\.moods-about-popover\{\s*position:absolute/);
  assert.match(js,/hint\.hidden=compatible/);
  assert.match(js,/done\.disabled=!chosen/);
  assert.match(js,/if\(event\.key==='Escape'\)\{/);
  assert.match(js,/if\(!aboutDetails\.hidden\)closeAbout\(true\)/);
  assert.match(js,/aboutButton\.setAttribute\('aria-expanded',String\(opening\)\)/);
});

test('Dreamcore V5 routes organic nature, people and built environments',()=>{
  const m=moodById('dreamcore');
  assert.equal(m.preview,'/lab/mood-previews/dreamcore-train-20261010.webp');
  assert.match(m.routing,/EVEN WHEN A PERSON IS PRESENT/);
  assert.match(m.routing,/ARCHITECTURE if houses/);
  assert.match(m.routing,/Otherwise PORTRAIT/);
  assert.match(m.person,/Skin may become realistically pearlescent/);
  assert.match(m.organic,/ORGANIC ROUTE, STRONGEST/);
  assert.match(m.organic,/REAL foam, water, wet rock/);
  assert.match(m.architecture,/Even at 100%/);
  assert.match(m.atmosphere,/Fog occupies real volume/);
  assert.match(m.climax,/ARCHITECTURE: keep the real building/);
  for(const [n,label] of [[1,'SUBTLE'],[34,'SUBTLE'],[35,'ATMOSPHERIC'],[69,'ATMOSPHERIC'],[70,'IMMERSIVE'],[89,'IMMERSIVE'],[90,'IMPOSSIBLE REALITY'],[99,'IMPOSSIBLE REALITY'],[100,'MAXIMUM 100%']]){
    const r=prepareMoodPrompt('Portrait at sea','dreamcore',n,{referenceCount:1});
    assert.equal(r.error,'');
    assert.equal(r.metadata.moodIntensity,n);
    assert.ok(r.prompt.includes(label));
    assert.match(r.prompt,/SOURCE ROUTING/);
    assert.match(r.prompt,/ORGANIC ROUTE/);
    assert.match(r.prompt,/PORTRAIT ROUTE/);
    assert.match(r.prompt,/ARCHITECTURE ROUTE/);
  }
  const max=prepareMoodPrompt('Portrait at sea','dreamcore',100,{referenceCount:1});
  assert.match(max.prompt,/luminous sea foam/);
  assert.match(max.prompt,/real building and furniture/);
  assert.doesNotMatch(prepareMoodPrompt('Portrait','dreamcore',99,{referenceCount:1}).prompt,/MAXIMUM 100%/);
  const compact=prepareMoodPrompt('Model by the sea','dreamcore',100,{referenceCount:10});
  assert.equal(compact.error,'');
  assert.match(compact.prompt,/ORGANIC if beach/);
  assert.match(compact.prompt,/ARCHITECTURE real building/);
  const onlyRefs=prepareMoodPrompt('A coastal portrait','dreamcore',100,{referenceCount:5,referenceMode:'references',engine:'gemini'});
  assert.equal(onlyRefs.error,'');
  assert.match(onlyRefs.prompt,/Reference-only: follow requested output/);
  const text=prepareMoodPrompt('Empty pool','dreamcore',100);
  assert.equal(text.error,'');
  assert.match(text.prompt,/No Base: use the written subject/);
  assert.equal(userFacingImagePrompt({...max.metadata,prompt:max.prompt}),'Portrait at sea');
  assert.match(prepareMoodPrompt('Portrait','hong-kong-nights',100,{referenceCount:1}).prompt,/Immersive humid nighttime atmosphere/);
  assert.match(readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8'),/not a literal opacity percentage/);
});

test('Dreamcore V5 compact direction fits ten references',()=>{
  const refs=Array.from({length:10},(_,i)=>({name:'ref-'+i+'.png',role:i?'none':'base'}));
  const r=prepareMoodPrompt('A model at the sea','dreamcore',100,{referenceCount:10});
  assert.equal(r.error,'');
  assert.ok(compileImagePrompt(r.prompt,refs).length<=5000);
});
test('Eleven moods are available, ten initially visible and Sumi-e last',()=>{
  const css=readFileSync(new URL('../lab/moods.css',import.meta.url),'utf8');
  const js=readFileSync(new URL('../lab/moods.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  assert.equal(MOODS.length,11);
  assert.deepEqual(MOODS.slice(8).map(m=>m.id),['dreamcore','hyper-pop','sumi-ink']);
  assert.match(css,/\.moods-grid\{display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css,/scrollbar-gutter:stable/);
  assert.match(js,/function fitGridViewport\(\)/);
  assert.match(js,/const last=visible\[desktopGridColumns\*initiallyVisibleRows-1\]/);
  assert.match(js,/grid\.style\.maxHeight=firstTwoRows\+'px'/);
  assert.match(html,/Eleven curated looks/);
});
test('Moods stays inside the viewport and reserves room for the floating composer',()=>{
  for(const [width,height,composerTop] of [
    [1440,900,700],[1280,720,510],[950,650,415],[390,780,490],
    [390,530,245],[360,430,170]
  ]){
    const g=moodsPanelViewportGeometry({viewportWidth:width,viewportHeight:height,composerTop});
    const topMargin=width<=740?14:28;
    const gap=g.gap;
    const calculatedTop=composerTop-gap+g.overlap-g.maxHeight;
    assert.ok(calculatedTop>=topMargin-1,'Moods popup clips at '+width+'x'+height+' top='+calculatedTop);
    assert.ok(g.maxHeight<=720);
    assert.ok(g.maxHeight<=height-topMargin-(width<=740?10:16));
    assert.ok(g.overlap===0||composerTop-gap+g.overlap>composerTop-gap,'Overlap only when necessary');
  }
  const ordinary=moodsPanelViewportGeometry({viewportWidth:1400,viewportHeight:900,composerTop:700});
  assert.equal(ordinary.overlap,0);
  const tight=moodsPanelViewportGeometry({viewportWidth:390,viewportHeight:530,composerTop:245});
  assert.ok(tight.overlap>0);
  assert.equal(tight.tight,true);
  const css=readFileSync(new URL('../lab/moods.css',import.meta.url),'utf8');
  const js=readFileSync(new URL('../lab/moods.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  assert.match(css,/\.moods-grid\{display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\);gap:11px;flex:0 1 auto/);
  assert.match(css,/\.moods-footer\{[\s\S]*?flex:0 0 auto/);
  assert.match(css,/\.moods-header\{display:flex;flex:0 0 auto/);
  assert.match(css,/\.composer-moods-backdrop\{/);
  assert.match(css,/\.is-viewport-tight/);
  assert.match(js,/function fitPanelViewport\(\)/);
  assert.match(js,/ResizeObserver\(refreshViewport\)/);
  assert.match(js,/backdrop\.onclick=\(\)=>close\(true\)/);
  assert.match(js,/document\.addEventListener\('click',event=>\{/);
  assert.match(js,/event\.preventDefault\(\);event\.stopPropagation\(\);\s*close\(true\)/);
  assert.match(js,/event\.key==='Escape'/);
  assert.match(html,/id="composer-moods-backdrop" class="composer-moods-backdrop" aria-hidden="true" hidden/);
  assert.match(html,/id="composer-moods" class="composer-moods" role="dialog"/);
});

test('Popup stays centered; selected mood and About are in the upper controls',()=>{
  const css=readFileSync(new URL('../lab/moods.css',import.meta.url),'utf8');
  const js=readFileSync(new URL('../lab/moods.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  assert.match(css,/position:absolute;bottom:calc\(100% \+ var\(--moods-anchor-gap,14px\) - var\(--moods-overlap,0px\)\);left:50%;z-index:125/);
  assert.match(css,/transform:translateX\(-50%\)/);
  assert.match(css,/width:min\(990px,calc\(100vw - 36px\)\)/);
  assert.match(html,/id="composer-moods-current-label" class="moods-current-label" hidden/);
  assert.match(js,/selectedLabel\.hidden=!chosen/);
  const header=html.slice(html.indexOf('<div class="moods-header">'),html.indexOf('<div id="composer-moods-grid"'));
  const footer=html.slice(html.indexOf('<div class="moods-footer">'),html.indexOf('<p id="composer-moods-compat"'));
  assert.ok(header.includes('id="composer-moods-about"'));
  assert.ok(header.includes('id="composer-moods-summary"'));
  assert.ok(header.includes('id="composer-moods-none"'));
  for(const id of ['composer-moods-about','composer-moods-summary','composer-moods-none'])assert.ok(!footer.includes('id="'+id+'"'));
  assert.match(html,/id="composer-moods-selection" class="moods-selection" hidden/);
  assert.match(js,/selection\.hidden=!chosen/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\) 170px/);
  assert.match(html,/moods\.css\?v=20261011-my-moods-tile1/);
  const worker=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
  for(const key of ['sumi-ink','dreamcore'])assert.ok(worker.includes("'"+key+"'"));
});

test('Soft Pastel Film uses uniquely versioned photo without CSS recoloring',()=>{
  const preset=moodById('soft-pastel-film');
  assert.equal(preset.preview,'/lab/mood-previews/soft-pastel-film-portrait-f77111b4.webp');
  const css=readFileSync(new URL('../lab/moods.css',import.meta.url),'utf8');
  assert.ok(css.includes('.moods-look-soft-pastel-film img{filter:none;'));
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  assert.match(html,/src="\.\/lab\.js\?v=[^"]+"/);
});


test('Image Studio active mood removal and stable Generate baseline',()=>{
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../lab/assets.css',import.meta.url),'utf8');
  assert.match(html,/id="image-composer-moods-clear"[^>]+aria-label="Remove selected mood"/);
  assert.match(js,/clearMood.hidden=!moodUI.active\(\)/);
  assert.match(js,/if\(!busy&&moodUI.active\(\)\)moodUI.clear\(\)/);
  assert.match(css,/#image-composer-moods-clear\[hidden\]\{display:none!important\}/);
  assert.match(css,/#image-composer.is-gemini .composer-controls\{flex-wrap:nowrap!important/);
  assert.match(js,/const inlineMessage=queueBlocked\|\|exactPreparing\?'':message/);
});


test('Moods prioritizes previews and toggles an already-selected thumbnail off',()=>{
  const js=readFileSync(new URL('../lab/moods.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../lab/moods.css',import.meta.url),'utf8');
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  assert.match(js,/card\.onclick=\(\)=>\{selected=selected===mood\.id\?null:mood\.id;render\(\);onChange\(\);\}/);
  assert.match(css,/Selected mood is beside filters/);
  assert.match(css,/\.moods-card-media\{aspect-ratio:5\/4\}/);
  assert.match(css,/\.moods-footer\{gap:3px;padding-top:7px\}/);
  assert.match(css,/\.moods-selection\{display:flex;align-items:center;justify-content:flex-end/);
  assert.match(css,/\.moods-controls\{[\s\S]*?grid-template-columns:minmax\(0,1fr\) 170px/);
  assert.match(css,/#composer-moods-done,[\s\S]*?#composer-moods-switch\{[\s\S]*?min-height:48px/);
  assert.match(css,/#composer-moods-intensity::-webkit-slider-runnable-track\{[\s\S]*?height:7px/);
  assert.match(html,/Clear selected mood/);
  assert.match(html,/moods\.css\?v=20261011-my-moods-tile1/);
});
