import test from 'node:test';
import assert from 'node:assert/strict';
import {MOODS,MOOD_MODELS,moodById,prepareMoodPrompt,userFacingImagePrompt,imageHistoryCaption} from '../lab/moods.js';
import {readFileSync} from 'node:fs';

test('exactly ten unique curated moods with imagery',()=>{
  assert.equal(MOODS.length,10);
  assert.equal(new Set(MOODS.map(m=>m.id)).size,10);
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
  assert.match(css,/\.moods-about-popover\{position:absolute/);
  assert.match(js,/hint\.hidden=compatible/);
  assert.match(js,/done\.disabled=!chosen/);
  assert.match(js,/event\.key==='Escape'&&!aboutDetails\.hidden/);
  assert.match(js,/aboutButton\.setAttribute\('aria-expanded',String\(opening\)\)/);
});

test('Dreamcore thumbnail and provider intensity directions are connected',()=>{
  const mood=moodById('dreamcore');
  assert.equal(mood.category,'Experimental');
  assert.equal(mood.preview,'/lab/mood-previews/dreamcore-train-20261010.webp');
  const low=prepareMoodPrompt('A person in a room','dreamcore',20,{engine:'seedream',referenceCount:1});
  const middle=prepareMoodPrompt('A person in a room','dreamcore',60,{engine:'gemini',referenceCount:1});
  const high=prepareMoodPrompt('A person in a room','dreamcore',100,{engine:'seedream',referenceCount:1});
  for(const result of [low,middle,high]){
    assert.equal(result.error,'');
    assert.equal(result.metadata.moodId,'dreamcore');
    assert.match(result.prompt,/preserve face, identity, real body proportions/i);
  }
  assert.match(low.prompt,/gentle optical bloom/i);
  assert.match(middle.prompt,/Photographic dreamcore/i);
  assert.match(high.prompt,/Strong dreamlike editorial transformation/i);
  assert.notEqual(low.prompt,high.prompt);
  assert.match(high.prompt,/copying the preview's train or platform/i);
  const css=readFileSync(new URL('../lab/moods.css',import.meta.url),'utf8');
  assert.ok(css.includes('.moods-look-dreamcore img{filter:none;object-position:center center}'));
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  assert.match(html,/Ten curated looks/);
});



test('Integrated two-row footer keeps the thumbnails visually dominant',()=>{
  const css=readFileSync(new URL('../lab/moods.css',import.meta.url),'utf8');
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  assert.equal(MOODS.length,10);
  assert.equal(MOODS[8].id,'dreamcore');
  assert.equal(MOODS[9].id,'hyper-pop');
  assert.ok(!MOODS.some(m=>m.id==='sumi-ink'));
  assert.match(css,/\.moods-grid\{display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css,/\.moods-footer\{[\s\S]*?display:flex;flex:0 0 auto;flex-direction:column/);
  assert.match(css,/\.moods-footer-heading\{display:flex;align-items:center;justify-content:space-between/);
  assert.match(css,/\.moods-controls\{[\s\S]*?display:grid;grid-template-columns:minmax\(0,1fr\) 138px/);
  assert.doesNotMatch(css,/\.moods-controls\{display:contents\}/);
  assert.match(css,/#composer-moods-done:disabled,[\s\S]*?background:#303234/);
  assert.match(html,/moods\.css\?v=20261010-footer-hybrid5/);
  assert.match(html,/Ten curated looks/);
});
test('Dreamcore is accepted by the worker while archived Sumi-e remains readable',()=>{
  const worker=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
  assert.match(worker,/const IMAGE_MOOD_IDS=new Set\(\[[^\]]*'dreamcore'[^\]]*\]\)/);
  assert.match(worker,/const IMAGE_MOOD_IDS=new Set\(\[[^\]]*'sumi-ink'[^\]]*\]\)/);
  assert.ok(!MOODS.some(m=>m.id==='sumi-ink'));
  assert.equal(moodById('sumi-ink').name,'Japanese Sumi-e');
  const legacy=prepareMoodPrompt('A portrait','sumi-ink',60,{referenceCount:1});
  assert.equal(legacy.error,'');
  assert.equal(legacy.metadata.moodId,'sumi-ink');
  assert.match(imageHistoryCaption({moodId:'sumi-ink',moodIntensity:60,moodOriginalPrompt:'Portrait'}),/Japanese Sumi-e · 60%/);
});
