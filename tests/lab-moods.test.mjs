import test from 'node:test';
import assert from 'node:assert/strict';
import {MOODS,MOOD_MODELS,moodById,prepareMoodPrompt,preparePersonalMoodPrompt,userFacingImagePrompt,imageHistoryCaption,moodsPanelViewportGeometry} from '../lab/moods.js';
import {readFileSync} from 'node:fs';
import {compileImagePrompt} from '../lab/reference-guidance.js';

test('Synthetic Romance is an invasive physical transformation with identity-aware preservation',()=>{
  const mood=moodById('synthetic-romance');
  assert.equal(mood.category,'Cinema');
  assert.equal(mood.defaultIntensity,82);
  assert.match(mood.preview,/synthetic-romance-canon-kiss/);
  const base=prepareMoodPrompt('',mood.id,82,{engine:'seedream',referenceCount:1});
  assert.equal(base.error,'');
  assert.match(base.prompt,/INVASIVE PHYSICAL BODY TRANSFORMATION/);
  assert.match(base.prompt,/ALLOW replacement of wardrobe, skin, limbs/);
  assert.match(base.prompt,/70-89% \/ MAJOR SYNTHETIC RECONSTRUCTION/);
  assert.doesNotMatch(base.prompt,/Preserve face, identity, real body proportions, pose, camera, wardrobe and composition/);
  assert.deepEqual(base.metadata,{moodId:'synthetic-romance',moodIntensity:82,moodOriginalPrompt:''});
  assert.match(prepareMoodPrompt('A portrait',mood.id,100,{engine:'gemini'}).prompt,/TOTAL SYNTHETIC LIBERATION/);
});

test('Synthetic Romance never makes facial identity optional at strong intensities',()=>{
  for(const intensity of [1,35,69,82,89,95,100]){
    const {prompt,error}=prepareMoodPrompt('Keep this exact face', 'synthetic-romance',intensity,{engine:'seedream',referenceCount:1,referenceMode:'base'});
    assert.equal(error,'');
    assert.match(prompt,/FACE IDENTITY FIRST when a Base or Identity face is supplied/);
    assert.match(prompt,/original facial features, expression, gaze and age untouched regardless of intensity/);
    assert.doesNotMatch(prompt,/facial cues, functional internals|human face transitioning into machinery|retain facial structure with Lock Identity/);
    if(intensity>=70)assert.match(prompt,/unchanged original face|original face must remain entirely unchanged/);
  }
});

test('Synthetic Romance retains full instructions and stable morphology across reference modes',()=>{
  const random=Math.random;
  try{
    for(let morphology=0;morphology<5;morphology++){
      Math.random=()=>morphology/5;
      for(const engine of ['seedream','gemini'])for(const referenceMode of ['base','references']){
        for(const referenceCount of [1,2,3,10])for(const intensity of [1,34,35,69,70,82,89,90,99,100]){
          const original='Keep the same face, pose and composition.';
          const labels=Array.from({length:referenceCount},(_,i)=>({role:!i&&referenceMode==='base'?'base':'none'}));
          const result=prepareMoodPrompt(original,'synthetic-romance',intensity,{engine,referenceCount,referenceMode});
          const prompt=compileImagePrompt(result.prompt,labels,{...result.metadata,referenceMode});
          assert.equal(result.error,'');
          if(prompt.length>5000)
            assert.ok(referenceMode==='references'&&referenceCount===10,
              'Only the large full reference-only map should need a budget warning: '+prompt.length);
          else assert.ok(prompt.length<=5000,JSON.stringify({engine,referenceMode,referenceCount,intensity,morphology,length:prompt.length}));
          assert.equal(result.metadata.moodOriginalPrompt,original);
          assert.equal(result.metadata.moodIntensity,intensity);
          for(const detail of ['INVASIVE PHYSICAL BODY TRANSFORMATION','routed cables','Smoked mirror chrome','black nickel','graphite titanium','OPTICAL GLOSS','specular ribbons','dark reflection bands','35mm negative','shadow grain','halation','photochemical color','human tenderness'])assert.ok(prompt.includes(detail),detail);
          if(intensity>=35)assert.match(prompt,/SELECTED MORPHOLOGY:/);
          else assert.doesNotMatch(prompt,/SELECTED MORPHOLOGY:/);
        }
      }
    }
  }finally{Math.random=random;}
});

test('Synthetic Romance leaves room for authored direction, identity notes and a saved Mood',()=>{
  const labels=[{role:'base',note:'Keep the same expression.'},{role:'identity',note:'Use these facial proportions.'},{role:'style',note:'Use physical materials and optical reflections.'}];
  const original='Keep the expression and framing. '.repeat(40).trim();
  const result=prepareMoodPrompt(original,'synthetic-romance',100,{engine:'gemini',referenceCount:labels.length});
  assert.equal(result.error,'');
  const final=compileImagePrompt(result.prompt,labels,{...result.metadata,referenceMode:'base'});
  assert.ok(final.length<=5000);
  assert.ok(final.includes(original));
  assert.match(final,/Use these facial proportions/);
  assert.match(final,/TOTAL SYNTHETIC LIBERATION/);
  const board={id:'synthetic-budget-test',name:'My Synthetic Romance',baseMoodId:'synthetic-romance',direction:'Worn black nickel, tender human expression, restrained red practicals.'};
  const saved=preparePersonalMoodPrompt('',board,82,{engine:'seedream',referenceCount:labels.length});
  assert.equal(saved.error,'');
  assert.ok(compileImagePrompt(saved.prompt,labels,{...saved.metadata,referenceMode:'base'}).length<=5000);
  assert.ok(saved.prompt.includes(board.direction));
  assert.match(prepareMoodPrompt('','synthetic-romance',82).error,/Describe a subject/);
  assert.match(prepareMoodPrompt('X'.repeat(5000),'synthetic-romance',82,{referenceCount:1}).error,/exceed 5,000/);
});

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
  assert.match(html,/id="composer-moods-create"[^>]*aria-label="Create Mood"/);
  assert.match(moods,/createMoodButton\.onclick=startPersonalMood/);
  assert.match(moods,/createButton\.onclick=startPersonalMood/);
  assert.doesNotMatch(moods,/const createTile=/);
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

test('Create Mood stays prominent across tabs without a duplicate My Moods tile',()=>{
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../lab/moods.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../lab/moods.css',import.meta.url),'utf8');
  const action=html.indexOf('id="composer-moods-create"');
  const close=html.indexOf('id="composer-moods-close"');
  const toolbar=html.indexOf('id="composer-moods-filters"');
  assert.ok(action>0&&action<close&&close<toolbar,'Create Mood should live to the left of X in the persistent header');
  assert.match(html,/class="moods-header-actions"/);
  assert.match(js,/createMoodButton\.onclick=startPersonalMood/);
  assert.match(js,/const startPersonalMood=\(\)=>\{close\(\);onCreatePersonal\(\);\}/);
  assert.match(js,/emptyPersonal\.hidden=category!=='My Moods'\|\|personalMoods\.length>0/);
  assert.doesNotMatch(js,/\bcreateTile\b/);
  assert.doesNotMatch(css,/\.moods-board-create/);
  assert.match(css,/#image-composer #composer-moods-create\{/);
  assert.match(css,/min-height:42px;padding:9px 15px/);
  assert.doesNotMatch(css,/transform:translateY\((18|15)px\)/);
  assert.match(css,/\.moods-header-actions\{display:flex;grid-column:2;grid-row:2;align-items:center/);
  assert.match(css,/\.moods-header-actions\{gap:4px\}/);
  assert.match(css,/min-height:44px;padding:9px 12px;font-size:12px;gap:6px/);
  assert.match(css,/flex-basis:44px;width:44px;min-width:44px;height:44px;min-height:44px/);
  assert.match(html,/moods\.css\?v=20261011-header-align2/);
  assert.match(css,/@media\(max-width:420px\)/);
  assert.match(css,/\.moods-create-tail\{display:none\}/);
});

test('Mobile Generate is centered in a dedicated column beside wrapped settings',()=>{
  const css=readFileSync(new URL('../lab/assets.css',import.meta.url),'utf8');
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  const block=css.slice(css.indexOf('/* Mobile Image deck:'));
  assert.match(block,/@media\(max-width:650px\)/);
  assert.match(block,/#image-composer:not\(\.is-pv-soul\) \.image-composer-toolbar\{\s*display:grid;grid-template-columns:minmax\(0,1fr\) 100px/);
  assert.match(block,/\.composer-controls\{\s*display:flex;flex-wrap:wrap/);
  assert.match(block,/\.composer-flex\{display:none\}/);
  assert.match(block,/\.composer-generate\{\s*grid-column:2;grid-row:1;align-self:center/);
  assert.match(block,/height:82px;min-height:82px;max-height:82px/);
  assert.match(block,/@media\(max-width:360px\)/);
  assert.match(html,/assets\.css\?v=[^"]+&mobileGenerate=1/);
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
test('Moods category filters have readable touch targets and preserve thumbnail proportions',()=>{
  const css=readFileSync(new URL('../lab/moods.css',import.meta.url),'utf8');
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../lab/moods.js',import.meta.url),'utf8');
  assert.match(css,/#image-composer \.moods-filter\{[\s\S]*?min-height:39px;padding:9px 15px/);
  assert.match(css,/#image-composer \.moods-filter\{[\s\S]*?font-size:13px;font-weight:550/);
  assert.match(css,/#image-composer \.moods-filter\.is-selected\{background:#eee/);
  assert.match(css,/#image-composer \.moods-filter:hover:not\(\.is-selected\)/);
  assert.match(css,/\.moods-filters\{display:flex;gap:8px;overflow-x:auto/);
  assert.match(css,/\.moods-grid\{display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css,/\.moods-card-media\{[^\n]*aspect-ratio:5\/4/);
  assert.match(js,/\['All','Cinema','Fashion','Analog','Experimental','My Moods'\]/);
  assert.match(html,/moods\.css\?v=20261011-header-align2/);
});

test('seventeen unique curated moods with imagery',()=>{
  assert.equal(MOODS.length,17);
  assert.equal(new Set(MOODS.map(m=>m.id)).size,17);
  for(const mood of MOODS)for(const field of ['name','category','preview','direction','subtle','intense','avoid'])assert.ok(mood[field]);
});
test('only explicitly compatible image engines receive moods',()=>{
  assert.deepEqual([...MOOD_MODELS],['seedream','seedreamlite','krea3','gemini','gemini21','qwen3','zspicy']);
  assert.match(prepareMoodPrompt('portrait','night-flash',60,{engine:'soulpro'}).error,/does not support Moods/);
  assert.equal(moodById('fake'),null);
});
test('Krea 3 accepts curated and personal Moods, preserves source directions and stays within reference limits',()=>{
  const original='Editorial photograph of a woman in a studio.';
  const mood=prepareMoodPrompt(original,'night-flash',82,{engine:'krea3',referenceCount:1,referenceMode:'base'});
  assert.equal(mood.error,'');
  assert.ok(mood.prompt.startsWith(original));
  assert.match(mood.prompt,/PV LAB MOOD \/ Night Flash/);
  assert.equal(mood.metadata.moodId,'night-flash');
  assert.equal(mood.metadata.moodIntensity,82);
  const refs=[{name:'source.png',role:'base'}];
  const compiled=compileImagePrompt(mood.prompt,refs,{type:'image',mode:'image',engine:'krea3',referenceMode:'base',...mood.metadata});
  assert.match(compiled,/Reference 1/);
  assert.match(compiled,/PV LAB MOOD \/ Night Flash/);
  assert.ok(compiled.length<=5000);
  const custom=preparePersonalMoodPrompt(original,{id:'30000000-0000-4000-8000-000000000020',name:'My Flash',direction:'Soft red flash and deep shadows',baseMoodId:'night-flash'},76,{engine:'krea3',referenceCount:1,referenceMode:'base'});
  assert.equal(custom.error,'');
  assert.match(custom.prompt,/PV LAB MY MOOD \/ My Flash/);
  assert.equal(custom.metadata.moodId,'custom');
  assert.equal(userFacingImagePrompt({...mood.metadata,prompt:mood.prompt}),original);
  assert.match(imageHistoryCaption({...mood.metadata,prompt:mood.prompt}),/Night Flash · 82%/);
  assert.match(prepareMoodPrompt(original,'night-flash',82,{engine:'kling'}).error,/does not support Moods/);
  const worker=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
  assert.match(worker,/engine==='krea3'\)return \{\.\.\.krea3Parameters\(\{\.\.\.value,referenceMode\},\{fail,referenceRoles\}\),\.\.\.imageMoodMetadata\(value\)\}/);
});
test('original prompt is not lost; mood metadata can be restored',()=>{
  const data=prepareMoodPrompt('Nina sitting by a window','hong-kong-nights',64,{engine:'gemini',referenceCount:1});
  assert.ok(data.prompt.startsWith('Nina sitting by a window\n\n'));
  assert.match(data.prompt,/selective petrol-green light around existing lamps/i);
  assert.match(data.prompt,/EDIT IMAGE 1, not a new scene/);
  assert.match(data.prompt,/Keep identical face, expression, age, hair/);
  assert.deepEqual(data.metadata,{moodId:'hong-kong-nights',moodIntensity:64,moodOriginalPrompt:'Nina sitting by a window',moodVariant:'original',filmFinish:{version:2,grain:13,haze:100,halation:78,film:100}});
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
  assert.match(moodById('hong-kong-nights').direction,/1990s Hong Kong night-film photography/i);
});
test('Gallery hover metadata identifies the exact image model',()=>{
  const src=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  assert.match(src,/function galleryImageModelName\(job\)/);
  assert.match(src,/modelLabel=image\?galleryImageModelName\(j\)\.toUpperCase\(\)/);
  assert.match(src,/meta\.textContent=\[j\.status\.toUpperCase\(\),imageLabel,modelLabel/);
});

test('90s Cinema thumbnail and applied mood share a film-scan style',()=>{
  const preset=moodById('90s-cinema');
  assert.equal(preset.preview,'/lab/mood-previews/hd/90s-cinema-clean-final-20261011.jpg');
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
  assert.match(html,/id="composer-moods-browse-count"/);
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

test('Dreamcore V7 routes organic nature, people and built environments',()=>{
  const m=moodById('dreamcore');
  assert.equal(m.preview,'/lab/mood-bank/2026-10-11/dreamcore/preview.webp');
  assert.match(m.routing,/EVEN WHEN A PERSON IS PRESENT/);
  assert.match(m.routing,/ARCHITECTURE if houses/);
  assert.match(m.routing,/Otherwise PORTRAIT/);
  assert.match(m.person,/Skin may become realistically pearlescent/);
  assert.match(m.organic,/ORGANIC ROUTE, STRONGEST/);
  assert.match(m.organic,/REAL foam, water, wet rock/);
  assert.match(m.architecture,/factories|industrial scenes/);
  assert.match(m.architecture,/luminous depth/);
  assert.match(m.architecture,/Rough concrete and brick keep pores/);
  assert.doesNotMatch(m.architecture,/one small source-led detail|subtle real atmospheric haze/);
  assert.match(m.atmosphere,/Fog occupies real volume/);
  assert.match(m.climax,/ARCHITECTURE: keep the real building/);
  for(const [n,label] of [[1,'SUBTLE'],[34,'SUBTLE'],[35,'ATMOSPHERIC'],[69,'ATMOSPHERIC'],[70,'IMMERSIVE'],[89,'IMMERSIVE'],[90,'IMPOSSIBLE REALITY'],[99,'IMPOSSIBLE REALITY'],[100,'MAXIMUM 100%']]){
    const r=prepareMoodPrompt('Portrait at sea','dreamcore',n,{referenceCount:0});
    assert.equal(r.error,'');
    assert.equal(r.metadata.moodIntensity,n);
    assert.ok(r.prompt.includes(label));
    assert.match(r.prompt,/Route ORGANIC if beach or nature dominates/);
    assert.match(r.prompt,/ARCHITECTURE for rooms\/cities\/industry/);
    assert.match(r.prompt,/otherwise PORTRAIT/);
  }
  const max=prepareMoodPrompt('Portrait at sea','dreamcore',100,{referenceCount:1});
  assert.match(max.prompt,/ORGANIC luminous water/);
  assert.match(max.prompt,/ARCHITECTURE real building/);
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
  const restoredHongKong=prepareMoodPrompt('Portrait','hong-kong-nights',100,{referenceCount:1}).prompt;
  assert.match(restoredHongKong,/MOOD STRENGTH 100\/100/);
  assert.match(restoredHongKong,/deepen real dark gaps and extend localized luminous falloff/);
  assert.match(restoredHongKong,/unaffected dry interiors/);
  assert.doesNotMatch(restoredHongKong,/reconstruct cinematic scene lighting|off-axis light modeling/);
  assert.match(readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8'),/not a literal opacity percentage/);
});

test('Dreamcore V7 compact direction fits ten references',()=>{
  const refs=Array.from({length:10},(_,i)=>({name:'ref-'+i+'.png',role:i?'none':'base'}));
  const r=prepareMoodPrompt('A model at the sea','dreamcore',100,{referenceCount:10});
  assert.equal(r.error,'');
  assert.ok(compileImagePrompt(r.prompt,refs,{...r.metadata,referenceMode:'base'}).length<=5000);
});
test('Seventeen moods are available, ten initially visible and Sumi-e last',()=>{
  const css=readFileSync(new URL('../lab/moods.css',import.meta.url),'utf8');
  const js=readFileSync(new URL('../lab/moods.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  assert.equal(MOODS.length,17);
  assert.equal(MOODS.at(-1).id,'sumi-ink');
  assert.match(css,/\.moods-grid\{display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css,/scrollbar-gutter:stable/);
  assert.match(js,/function fitGridViewport\(\)/);
  assert.match(js,/const last=visible\[desktopGridColumns\*initiallyVisibleRows-1\]/);
  assert.match(js,/grid\.style\.maxHeight=firstTwoRows\+'px'/);
  assert.match(html,/Seventeen curated looks/);
});
test('Moods preserves its gallery height as the image deck grows and stays in the viewport',()=>{
  for(const [width,height,composerTop] of [
    [1440,900,700],[1280,720,510],[950,650,415],[390,780,490],
    [390,530,245],[360,430,170]
  ]){
    const desiredHeight=width<=740?450:650;
    const g=moodsPanelViewportGeometry({viewportWidth:width,viewportHeight:height,composerTop,panelHeight:desiredHeight});
    const topMargin=width<=740?14:28;
    const displayedHeight=Math.min(g.maxHeight,desiredHeight);
    const calculatedTop=composerTop-g.gap+g.overlap-displayedHeight;
    assert.ok(calculatedTop>=topMargin-1,'Moods popup clips at '+width+'x'+height+' top='+calculatedTop);
    assert.ok(g.maxHeight<=720);
    assert.ok(g.maxHeight<=height-topMargin-(width<=740?10:16));
    assert.ok(g.overlap===0||composerTop-g.gap+g.overlap>composerTop-g.gap,'Overlap only when necessary');
  }
  const normal=moodsPanelViewportGeometry({viewportWidth:1400,viewportHeight:900,composerTop:700,panelHeight:640});
  const withReferences=moodsPanelViewportGeometry({viewportWidth:1400,viewportHeight:900,composerTop:540,panelHeight:640});
  assert.equal(normal.maxHeight,withReferences.maxHeight,'Uploading photos must not change the gallery height cap');
  assert.equal(normal.overlap,0);
  assert.equal(withReferences.overlap,142,'A taller deck shifts the Mood popup over the deck instead of shrinking it');
  const tight=moodsPanelViewportGeometry({viewportWidth:390,viewportHeight:530,composerTop:245,panelHeight:450});
  assert.ok(tight.overlap>0);
  assert.equal(tight.tight,true);
  const css=readFileSync(new URL('../lab/moods.css',import.meta.url),'utf8');
  const js=readFileSync(new URL('../lab/moods.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  assert.match(css,/\.moods-grid\{display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\);gap:11px;flex:0 1 auto/);
  assert.match(css,/\.moods-footer\{[\s\S]*?flex:0 0 auto/);
  assert.match(css,/\.moods-header\{display:grid;flex:0 0 auto/);
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
  assert.match(html,/moods\.css\?v=20261011-header-align2/);
  const worker=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
  for(const key of ['sumi-ink','dreamcore'])assert.ok(worker.includes("'"+key+"'"));
});

test('Soft Pastel Film uses uniquely versioned photo without CSS recoloring',()=>{
  const preset=moodById('soft-pastel-film');
  assert.equal(preset.preview,'/lab/mood-bank/2026-10-11/soft-pastel-film/preview.webp');
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
  assert.ok(js.includes("const inlineMessage=imageEngine==='fal'||queueBlocked||exactPreparing||idleMoodNeedsInput?'':message"),'Controlled Pose guidance stays outside the deck');
  assert.match(js,/modelButton\.setAttribute\('aria-description',hint\)/);
  assert.match(js,/modelButton\.removeAttribute\('aria-description'\)/);
  assert.match(js,/const idleMoodNeedsInput=moodUI.active\(\)/);
});


test('Moods prioritizes previews and toggles an already-selected thumbnail off',()=>{
  const js=readFileSync(new URL('../lab/moods.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../lab/moods.css',import.meta.url),'utf8');
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  assert.match(js,/card\.onclick=\(\)=>\{selected=selected===mood\.id\?null:mood\.id;/);
  assert.match(js,/if\(selected&&mood\.defaultIntensity\)intensity=mood\.defaultIntensity/);
  assert.match(css,/Selected mood is beside filters/);
  assert.match(css,/\.moods-card-media\{aspect-ratio:6\/5\}/);
  assert.match(css,/\.moods-footer\{gap:2px;padding-top:12px\}/);
  assert.match(css,/\.moods-selection\{display:flex;align-items:center;justify-content:flex-end/);
  assert.match(css,/\.moods-controls\{[\s\S]*?grid-template-columns:minmax\(0,1fr\) 170px/);
  assert.match(css,/#composer-moods-done,[\s\S]*?#composer-moods-switch\{[\s\S]*?min-height:48px/);
  assert.match(css,/#composer-moods-intensity::-webkit-slider-runnable-track\{[\s\S]*?height:7px/);
  assert.match(html,/Clear selected mood/);
  assert.match(html,/moods\.css\?v=20261011-header-align2/);
});


test('Preview-first Moods deck enlarges photos while keeping original slider and CTA sizing',()=>{
  const css=readFileSync(new URL('../lab/moods.css',import.meta.url),'utf8');
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  assert.match(css,/\.moods-card-media\{aspect-ratio:6\/5\}/);
  assert.match(css,/grid-template-rows:17px 25px;gap:4px/);
  assert.doesNotMatch(html,/class="moods-scale"/);
  assert.match(css,/#composer-moods-intensity\{grid-column:1;grid-row:2\}/);
  assert.match(css,/\.moods-footer\{gap:2px;padding-top:12px\}/);
  assert.match(css,/#composer-moods-intensity::-webkit-slider-runnable-track\{\s*height:7px/);
  assert.match(css,/#composer-moods-done,[\s\S]*?#composer-moods-switch\{[\s\S]*?min-height:48px/);
  assert.match(css,/max-height:min\(720px,var\(--moods-available-height/);
  assert.match(html,/moods\.css\?v=20261011-header-align2/);
  assert.equal(MOODS.length,17);
});


test('80s Film early film-to-tape prompt scales in five protected stages',()=>{
  const preset=moodById('80s-film');
  assert.equal(preset.description,'1981-1984 film-to-tape, soft analog color and subtle period details');
  const original='Preserve this person and bedroom composition';
  const steps=[[20,/SUBTLE 1-34%/],[50,/TAPE COLOR 35-69%/],[80,/EARLY-80S STILL 70-89%/],[93,/PERIOD MEMORY 90-99%/],[100,/BASE PHOTO \/ 100% PRIORITY/]];
  const prompts=steps.map(([intensity,stage])=>{
    const r=prepareMoodPrompt(original,'80s-film',intensity,{engine:'seedream',referenceCount:1});
    assert.equal(r.error,'');assert.ok(r.prompt.startsWith(original+'\n\n'));
    assert.match(r.prompt,stage);assert.match(r.prompt,/35mm/);
    assert.match(r.prompt,/1981-1984/);assert.match(r.prompt,intensity===100?/well-preserved PAL analog tape/:/well-preserved PAL analog videotape/);
    assert.match(r.prompt,intensity===100?/same recognizable face and expression/:/facial identity/);assert.match(r.prompt,/actual place/);
    assert.match(r.prompt,/first reference is the base photograph/);
    if(intensity===100){assert.match(r.prompt,/EARLY-80S MATERIAL CULTURE/);assert.match(r.prompt,/garment categories actually visible in the Base/);}
    else if(intensity>=70){assert.match(r.prompt,/small 1981-1984 changes/);assert.match(r.prompt,/preserving garment category/);}
    else{assert.match(r.prompt,/No period restyling/);assert.match(r.prompt,/Keep clothes and environmental details unchanged/);}
    assert.equal(r.metadata.moodIntensity,intensity);assert.equal(r.metadata.moodOriginalPrompt,original);
    return r.prompt;
  });
  assert.equal(new Set(prompts).size,steps.length);
  assert.doesNotMatch(prompts[3],/MAXIMUM 100% \/ EARLY-80S TAPE/);
  assert.match(prompts[4],/No fake VHS tracking bars/);
  assert.match(prompts[4],/No scene replacement/);
  const textOnly=prepareMoodPrompt('Fashion model in an early-80s film scene','80s-film',100);
  assert.equal(textOnly.error,'');assert.match(textOnly.prompt,/Without a Base, follow the written subject/);
  const refsOnly=prepareMoodPrompt('Period fashion still','80s-film',100,{referenceCount:2,referenceMode:'references',engine:'gemini'});
  assert.equal(refsOnly.error,'');assert.match(refsOnly.prompt,/Reference-only: follow requested output/);
});

test('80s Film retains fixed recipes and rejects actual reference-note overflow without truncation',()=>{
  const direction='An actor in a room';
  const refs=Array.from({length:10},(_,i)=>({name:'film-ref-'+i+'.jpg',role:i?'none':'base'}));
  for(const amount of [20,50,80,93,100]){
    const r=prepareMoodPrompt(direction,'80s-film',amount,{referenceCount:10,engine:'seedream'});
    const one=prepareMoodPrompt(direction,'80s-film',amount,{referenceCount:1,engine:'seedream'});
    assert.equal(r.error,'');assert.equal(r.prompt,one.prompt,'Reference count never changes the authored recipe');
    assert.match(r.prompt,amount===100?/BASE PHOTO \/ 100% PRIORITY/:/80S FILM \/ EARLY 1980S FILM-TO-TAPE/);
    const provider=compileImagePrompt(r.prompt,refs,{...r.metadata,referenceMode:'base'});
    assert.ok(provider.includes(r.prompt),'The complete Mood survives compilation');
    if(amount===100){
      const noted=refs.map(r=>({...r,note:'Keep this specific source detail unchanged. '.repeat(7)}));
      const overflow=compileImagePrompt(r.prompt,noted,{...r.metadata,referenceMode:'base'});
      assert.ok(overflow.length>5000,'Genuine long reference notes must still overflow');
      assert.ok(overflow.includes(r.prompt),'Never shrink the Mood to hide overflow');
    }
  }
  const studio=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  const app=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  const creator=readFileSync(new URL('../lab/mood-creator.js',import.meta.url),'utf8');
  assert.match(studio,/src="\.\/lab\.js\?v=20\d{6}-[^"\s]+"/);
  assert.match(app,/moods\.js\?v=20\d{6}-/);assert.match(creator,/moods\.js\?v=20\d{6}-/);
  const board={id:'10000000-0000-4000-8000-000000000080',name:'Early Tape',baseMoodId:'80s-film',direction:'Keep the original white shirt'};
  const single=preparePersonalMoodPrompt('Same room',board,100,{engine:'seedream',referenceCount:1});
  for(const count of [1,2,10]){
    const saved=preparePersonalMoodPrompt('Same room',board,100,{engine:'seedream',referenceCount:count});
    const boardRefs=Array.from({length:count},(_,i)=>({name:'ref-'+i+'.jpg',role:i?'none':'base'}));
    assert.equal(saved.error,'');assert.equal(saved.prompt,single.prompt,'Saved Mood never recompiles to fit references');
    const compiled=compileImagePrompt(saved.prompt,boardRefs,{...saved.metadata,referenceMode:'base'});
    assert.ok(compiled.includes(board.direction),'Keep authored saved style');
  }
  const duo=prepareMoodPrompt('Fashion scene','80s-film',100,{engine:'seedream',referenceCount:2});
  assert.match(duo.prompt,/BASE PHOTO \/ 100% PRIORITY/);
});

test('Berlin Rave V5 carries minimal clothing, flash and source composition through every tier',()=>{
  const mood=moodById('berlin-rave');
  assert.equal(mood.category,'Fashion');assert.equal(mood.defaultIntensity,80);
  assert.equal(mood.preview,'/lab/mood-previews/berlin-rave-grid-20261015.webp');
  assert.equal(mood.previewFull,'/lab/mood-previews/berlin-rave-detail-20261015.webp');
  for(const referenceCount of [0,1,10])for(const intensity of [10,55,80,95,100]){
    const result=prepareMoodPrompt('A person in a white shirt','berlin-rave',intensity,{referenceCount});
    const labels=Array.from({length:referenceCount},(_,i)=>({role:i?'none':'base'}));
    const prompt=compileImagePrompt(result.prompt,labels,{...result.metadata,referenceMode:'base'});
    assert.equal(result.error,'');
    assert.match(prompt,/BERLIN RAVE V5/);
    assert.match(prompt,/black leather and glossy latex/);
    assert.match(prompt,/narrow harness straps/i);
    assert.match(prompt,/direct on-camera flash/);
    assert.match(prompt,/Nearby walls/);
    if(referenceCount){
      assert.match(prompt,/camera distance/);
      assert.match(prompt,/full-length/i);
      assert.match(prompt,/back-facing/i);
    }else assert.match(prompt,/SAME character/);
    assert.match(prompt,/Clothing ref/);
    assert.match(prompt,/Style ref/);
    assert.doesNotMatch(prompt,/industrial scene reconstruction|replace unsuitable scenery|sculpted silhouette/i);
    assert.ok(prompt.length<=5000);
    assert.equal(result.metadata.moodIntensity,intensity);
  }
  assert.match(prepareMoodPrompt('Portrait','berlin-rave',10,{referenceCount:1}).prompt,/recognizable original outfit/);
  assert.match(prepareMoodPrompt('Portrait','berlin-rave',100,{referenceCount:1}).prompt,/substantial cutouts, original skin or machinery visible/);
});

test('Berlin Rave preserves user instructions and optional reference roles',()=>{
  const original='Change only the garment, keep the long hair and daylight';
  const look=prepareMoodPrompt(original,'berlin-rave',80,{referenceCount:1});
  assert.equal(look.error,'');
  assert.ok(look.prompt.startsWith(original+'\n\n'));
  assert.equal(look.metadata.moodOriginalPrompt,original);
  assert.match(look.prompt,/Explicit user instructions and assigned reference roles override these Mood defaults/);
  const refsOnly=prepareMoodPrompt('Black clubwear','berlin-rave',80,{engine:'gemini',referenceCount:3,referenceMode:'references'});
  assert.equal(refsOnly.error,'');
  assert.match(refsOnly.prompt,/assigned reference roles/);
  assert.doesNotMatch(refsOnly.prompt,/Base: preserve/);
  const labels=[{role:'base',note:'Keep both people full-length.'},{role:'outfit',target:'full'},{role:'lighting'}];
  const result=prepareMoodPrompt('Adapt the reference garments to each person.','berlin-rave',100,{referenceCount:labels.length});
  const final=compileImagePrompt(result.prompt,labels,{...result.metadata,referenceMode:'base'});
  assert.match(final,/Clothing \/ Full outfit/);
  assert.match(final,/Fit it to the target subject and pose/);
  assert.ok(final.length<=5000);
  const saved=preparePersonalMoodPrompt('Portrait',{id:'rave-v5',name:'My Rave',direction:'Refined worn leather',baseMoodId:'berlin-rave'},100,{referenceCount:1});
  assert.equal(saved.error,'');
  assert.match(saved.prompt,/BERLIN RAVE V5/);
  assert.ok(compileImagePrompt(saved.prompt,[{role:'base'}],{...saved.metadata,referenceMode:'base'}).length<=5000);
  assert.match(prepareMoodPrompt('','berlin-rave',80).error,/Describe a subject or add an image/);
  assert.match(prepareMoodPrompt('X'.repeat(5000),'berlin-rave',100,{referenceCount:1}).error,/exceed 5,000/);
});

test('Moods stays dark at rest and uses solid citron only when selected',()=>{
  const css=readFileSync(new URL('../lab/assets.css',import.meta.url),'utf8');
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  const start=css.indexOf('/* PV LAB / MOODS: dark idle control');
  assert.ok(start>0);
  const style=css.slice(start);
  assert.match(style,/#image-composer \.composer-mood-control #image-composer-moods\{/);
  assert.match(style,/background:#232523/);
  assert.match(style,/color:#d6ff00/);
  assert.match(style,/border:1px solid #383a37;border-radius:9px/);
  assert.match(style,/background:#2d302c/);
  assert.match(style,/\.is-mood-selected\[aria-expanded="true"\]/);
  assert.match(style,/min-height:40px;min-width:94px/);
  assert.match(style,/#image-composer \.composer-mood-control #image-composer-moods\.is-mood-selected\{/);
  assert.match(style,/background:linear-gradient\(160deg,#e0ff47 0%,#d1f900 100%\)/);
  assert.match(style,/color:#18220e/);
  assert.match(style,/#image-composer \.composer-mood-control #image-composer-moods\.is-mood-selected:hover:not\(:disabled\)\{[^}]*color:#18220e;/);
  assert.match(style,/#image-composer \.composer-mood-control #image-composer-moods-clear\{/);
  assert.match(style,/color:#1b2a09/);
  assert.match(style,/@media\(max-width:740px\)/);
  assert.match(style,/min-height:35px;min-width:0/);
  assert.match(style,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(style,/#image-composer \.composer-generate/);
  assert.doesNotMatch(style,/#image-composer \.composer-settings-pill\{/);
  assert.match(html,/assets\.css\?v=[^"]+&moodsCitron=3/);
});


test('Berlin Rave fits the final reference-map budget for one to ten photos at every intensity',()=>{
  for(const engine of ['seedream','gemini'])for(const referenceMode of ['base','references']){
    for(const count of [1,2,3,10])for(const intensity of [1,34,35,69,70,89,90,99,100]){
      const original='Keep her face and pose; change the outfit';
      const labels=Array.from({length:count},(_,i)=>({name:'reference-'+i+'.png',role:i===0&&referenceMode==='base'?'base':'none'}));
      const result=prepareMoodPrompt(original,'berlin-rave',intensity,{engine,referenceCount:count,referenceMode});
      assert.equal(result.error,'');
      assert.equal(result.metadata.moodOriginalPrompt,original);
      assert.equal(result.metadata.moodIntensity,intensity);
      assert.match(result.prompt,/Reinterpret adult outfits/);
      const compiled=compileImagePrompt(result.prompt,labels,{...result.metadata,referenceMode});
      if(compiled.length>5000)
        assert.ok(referenceMode==='references'&&count===10,'Only large full reference-only guidance may overflow');
      else assert.ok(compiled.length<=5000,engine+' '+referenceMode+' '+count+' photos at '+intensity+'%');
    }
  }
  const saved=preparePersonalMoodPrompt('',{id:'rave-budget-test',name:'My Berlin Rave',direction:'Refined worn leather and lean tailoring',baseMoodId:'berlin-rave'},100,{engine:'seedream',referenceCount:1});
  assert.equal(saved.error,'');
  assert.ok(compileImagePrompt(saved.prompt,[{name:'base.png',role:'base',note:'Keep my face and hair.'}],{...saved.metadata,referenceMode:'base'}).length<=5000);
});

test('Text-only Z-Image parks references without expanding the compact Image deck',()=>{
  const js=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../lab/assets.css',import.meta.url),'utf8');
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  assert.match(js,/function imageInputReferences\(\)\{return tool==='image'&&imageEngine==='zspicy'\?\[\]:references;\}/);
  assert.match(js,/if\(tool==='image'&&imageEngine==='zspicy'\)return !!\$\('prompt'\)\.value\.trim\(\)/);
  assert.match(js,/imageInputReferences\(\)\.map\(ref=>\(\{file:ref\.file/);
  assert.match(js,/if\(tool==='image'&&!imageInputReferences\(\)\.length\)return \{sourceId:null,lastSourceId:null,referenceSourceIds:\[\]\}/);
  assert.match(js,/if\(tool!=='image'\|\|imageEngine==='zspicy'\|\|imageEngine==='soul'/);
  assert.match(js,/classList\.toggle\('is-seedream',tool==='image'&&\['seedream','seedreamlite','flash','kling','qwen3','krea3','zspicy','gemini','gemini21'\]/);
  // The dock is now sized by the checked CSS grid, not a JavaScript width flag.
  assert.match(css,/#image-composer\.is-seedream\{grid-template-columns:minmax\(0,1fr\) 144px\}/);
  assert.doesNotMatch(css,/#image-composer\.is-seedream\{[^}]*min-height:(?:224|272)px/);
  assert.doesNotMatch(css,/#image-composer\.is-seedream \.composer-controls\{[^}]*flex-wrap:nowrap/);
  assert.match(css,/#image-composer\.is-text-only \.image-composer-references\{display:none!important\}/);
  assert.match(html,/stableImageDeck=1&zTextOnly=2/);
});

test('Mood recipe stays fixed across prompt lengths and reference counts',()=>{
  for(const mood of MOODS)for(const engine of ['seedream','gemini','seedreamlite']){
    for(const intensity of [20,80,100])for(const referenceMode of ['base','references']){
      const short='Editorial portrait';
      const original=prepareMoodPrompt(short,mood.id,intensity,{engine,referenceMode,referenceCount:1,filmFinish:null});
      const signature=original.prompt.slice(short.length);
      for(const direction of ['A', 'An editorial portrait with soft light. '.repeat(30), 'X'.repeat(2400)]){
        for(const referenceCount of [1,3,6,10]){
          const authored=direction.trim();
          const next=prepareMoodPrompt(direction,mood.id,intensity,{engine,referenceMode,referenceCount,filmFinish:null,compact:true,ultraCompact:true});
          assert.equal(next.prompt.slice(authored.length),signature,
            mood.id+' '+engine+' '+referenceMode+' '+intensity+'% must retain the same authored Mood');
          assert.ok(next.prompt.startsWith(authored),'User direction must remain intact');
          if(next.error&&/exceed/.test(next.error))assert.match(next.error,/exceed (3,000|5,000) characters by [\d,]+/);
        }
      }
    }
  }
});
test('No Mood retains the detailed reference map and large directions are rejected without truncation',()=>{
  const labels=[{role:'base'},{role:'identity',note:'Keep the exact eye shape.'}];
  const plain=compileImagePrompt('Change the shirt',labels,{referenceMode:'base'});
  const withMood=compileImagePrompt('Change the shirt',labels,{referenceMode:'base',moodId:'midnight-reverie'});
  assert.match(plain,/Use as the base photograph/);
  assert.match(plain,/Use for the subject identity and consistent facial features/);
  assert.match(withMood,/Base photograph: preserve its framing/);
  assert.ok(withMood.length<plain.length);
  const overflow=prepareMoodPrompt('X'.repeat(4500),'midnight-reverie',80,{engine:'seedream',referenceCount:1});
  assert.ok(overflow.prompt.startsWith('X'.repeat(4500)));
  assert.match(overflow.error,/exceed 5,000 characters by [\d,]+/);
  const refsOnly=compileImagePrompt(overflow.prompt,[{role:'identity',note:'Keep the exact eye shape.'}],{referenceMode:'references',...overflow.metadata});
  assert.match(refsOnly,/Use for the subject identity and consistent facial features/);
  assert.match(refsOnly,/Keep the exact eye shape/);
});
test('Saved Mood never recompiles its curated base to fit additional user directions',()=>{
  const board={id:'saved-consistency-test',name:'Studio Film',baseMoodId:'80s-film',direction:'High-fashion analogue cinema'};
  const input='X'.repeat(1600);
  const saved=preparePersonalMoodPrompt(input,board,85,{engine:'seedream',referenceCount:1});
  const plain=prepareMoodPrompt(input,'80s-film',85,{engine:'seedream',referenceCount:1});
  assert.ok(saved.prompt.startsWith(plain.prompt));
  assert.ok(saved.prompt.includes(input)&&saved.prompt.includes(board.direction));
  assert.match(saved.error,/exceed 5,000 characters by [\d,]+/);
  assert.equal(saved.prompt,preparePersonalMoodPrompt(input,board,85,{engine:'seedream',referenceCount:10}).prompt);
});
