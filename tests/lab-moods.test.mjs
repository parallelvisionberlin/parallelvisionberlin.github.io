import test from 'node:test';
import assert from 'node:assert/strict';
import {MOODS,MOOD_MODELS,moodById,prepareMoodPrompt,userFacingImagePrompt,imageHistoryCaption} from '../lab/moods.js';
import {readFileSync} from 'node:fs';

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
  assert.match(js,/const mood=moodById\(params.moodId\),promptText=userFacingImagePrompt\(params\)/);
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
  assert.match(css,/grid-template-columns:minmax\(0,1fr\) 138px/);
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
  assert.match(html,/id="composer-moods-none" type="button">Clear selection/);
  assert.doesNotMatch(html,/class="moods-bottom"/);
  assert.match(css,/#composer-moods-done,[\s\S]*?#composer-moods-switch\{[\s\S]*?min-height:40px/);
  assert.match(css,/\.moods-about-popover\{\s*position:absolute/);
  assert.match(js,/hint\.hidden=compatible/);
  assert.match(js,/done\.disabled=!chosen/);
  assert.match(js,/event\.key==='Escape'&&!aboutDetails\.hidden/);
  assert.match(js,/aboutButton\.setAttribute\('aria-expanded',String\(opening\)\)/);
});

test('Dreamcore thumbnail and four distinct provider intensity tiers are connected',()=>{
  const mood=moodById('dreamcore');
  assert.equal(mood.category,'Experimental');
  assert.equal(mood.preview,'/lab/mood-previews/dreamcore-train-20261010.webp');
  const values=[20,50,80,100];
  const results=values.map((amount,i)=>prepareMoodPrompt('A person in a room','dreamcore',amount,{engine:i%2?'gemini':'seedream',referenceCount:1}));
  for(const result of results){
    assert.equal(result.error,'');
    assert.equal(result.metadata.moodId,'dreamcore');
    assert.match(result.prompt,/Preserve face, identity, real body proportions/i);
    assert.match(result.prompt,/tactile photographic materials/i);
  }
  assert.match(results[0].prompt,/SUBTLE \(1-34%\)/);
  assert.match(results[1].prompt,/ATMOSPHERIC \(35-69%\)/);
  assert.match(results[2].prompt,/IMMERSIVE \(70-89%\)/);
  assert.match(results[3].prompt,/IMPOSSIBLE REALITY \(90-100%\)/);
  assert.match(results[3].prompt,/actual world transformation/i);
  assert.match(results[3].prompt,/only gentle wardrobe hue drift/i);
  assert.match(results[3].prompt,/clouds can drift into an ordinary room/i);
  assert.doesNotMatch(results[0].prompt,/IMPOSSIBLE REALITY/);
  assert.doesNotMatch(results[1].prompt,/IMMERSIVE \(70-89%\)/);
  assert.doesNotMatch(results[2].prompt,/IMPOSSIBLE REALITY/);
  assert.equal(new Set(results.map(r=>r.prompt)).size,4);
  for(const boundary of [1,34,35,69,70,89,90,100]){
    const r=prepareMoodPrompt('Portrait','dreamcore',boundary,{referenceCount:1});
    assert.equal(r.error,'');
    assert.equal(r.metadata.moodIntensity,boundary);
  }
  assert.match(prepareMoodPrompt('Portrait','dreamcore',100,{referenceMode:'references',referenceCount:2}).prompt,/assigned reference roles/);
  assert.match(prepareMoodPrompt('Portrait','hong-kong-nights',100,{referenceCount:1}).prompt,/Immersive humid nighttime atmosphere/);
  const css=readFileSync(new URL('../lab/moods.css',import.meta.url),'utf8');
  assert.ok(css.includes('.moods-look-dreamcore img{filter:none;object-position:center center}'));
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  assert.match(html,/Eleven curated looks/);
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
test('Popup centered over composer; simplified empty state and About below CTA',()=>{
  const css=readFileSync(new URL('../lab/moods.css',import.meta.url),'utf8');
  const js=readFileSync(new URL('../lab/moods.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  assert.match(css,/position:absolute;bottom:calc\(100% \+ 12px\);left:50%;z-index:125/);
  assert.match(css,/transform:translateX\(-50%\)/);
  assert.match(css,/width:min\(990px,calc\(100vw - 30px\)\)/);
  assert.match(html,/id="composer-moods-current-label" class="moods-current-label" hidden/);
  assert.match(js,/selectedLabel\.hidden=!chosen/);
  const footer=html.slice(html.indexOf('<div class="moods-footer">'),html.indexOf('<p id="composer-moods-compat"'));
  assert.ok(footer.indexOf('id="composer-moods-about"')>footer.indexOf('id="composer-moods-none"'));
  assert.ok(footer.indexOf('id="composer-moods-about"')>footer.indexOf('id="composer-moods-done"'));
  assert.match(html,/moods\.css\?v=20261010-centered-moods6/);
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
