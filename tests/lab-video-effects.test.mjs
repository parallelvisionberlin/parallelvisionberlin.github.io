import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VIDEO_EFFECTS,getVideoEffect,resolveVideoEffect,validateEffectIdentityPhoto} from '../lab/video-effects.js';
import {VIDEO_MODELS} from '../lab/video-models.js';

test('Effects lists only Metro Blonde and uses the existing Transform model',()=>{
  assert.deepEqual(VIDEO_EFFECTS.map(x=>x.id),['metro-blonde']);
  assert.equal(getVideoEffect('missing'),null);
  const effect=getVideoEffect('metro-blonde'),model=VIDEO_MODELS[effect.engine];
  assert.equal(effect.engine,'seedance');
  assert.ok(model.modes.includes('transform'));
  assert.ok(model.resolutions.includes(effect.resolution));
  assert.ok(effect.duration>=model.minSeconds&&effect.duration<=model.maxSeconds);
  assert.equal(effect.audio,false);
  assert.ok(effect.prompt.length>150&&effect.prompt.length<=5000);
  assert.match(effect.prompt,/Replace the blonde woman/i);
  assert.match(effect.prompt,/original.*video/i);
  assert.match(effect.previewVideo,/^https:\/\/v3b\.fal\.media\/files\//);
  const resolved=resolveVideoEffect(effect.id,[effect.engine]);
  assert.equal(resolved.ok,true);
  assert.equal(resolved.settings.mode,'transform');
  assert.equal(resolved.settings.engine,effect.engine);
  assert.equal(resolved.settings.prompt,effect.prompt);
});

test('effect selection fails closed and validates identity photos without generating',()=>{
  assert.equal(resolveVideoEffect('unknown',['seedance']).ok,false);
  assert.equal(resolveVideoEffect('metro-blonde',[]).ok,false);
  assert.equal(resolveVideoEffect('metro-blonde',undefined).ok,false);
  assert.equal(resolveVideoEffect('metro-blonde',['seedance15']).ok,false);
  assert.equal(resolveVideoEffect('metro-blonde',['seedance']).settings.engine,'seedance');
  const file={type:'image/jpeg',size:250000};
  assert.equal(validateEffectIdentityPhoto(file),file);
  assert.throws(()=>validateEffectIdentityPhoto({type:'application/pdf',size:300}),/JPG/);
  assert.throws(()=>validateEffectIdentityPhoto({type:'image/png',size:25*1048576}),/20 MB/);
});

test('Effects stay attached to existing owner Studio, Transform and paid review',()=>{
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../lab/video-effects.css',import.meta.url),'utf8');
  const media=readFileSync(new URL('../lab/media-references.js',import.meta.url),'utf8');
  for(const id of ['tool-effects','video-effects-explore','video-effects-grid','video-effect-active',
    'video-effect-upload','video-effect-from-gallery','effect-gallery-picker','effect-gallery-picker-grid']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'One UI element: '+id);
  }
  assert.match(html,/video-effects\.css\?v=20261111-metro-blonde1/);
  assert.match(js,/video-effects\.js\?v=20261111-metro1/);
  assert.match(js,/mountVideoEffectsGallery/);
  assert.match(js,/resolveVideoEffect\(id,config\.videoEngines\)/);
  assert.match(js,/fetch\(effect\.previewVideo/);
  assert.match(js,/setMode\('transform'\)/);
  assert.match(js,/await mediaRefs\.addVideoFiles\(\[sourceVideo\]\)/);
  assert.match(js,/if\(identityPhoto\)await addReferences\(\[identityPhoto\]\)/);
  assert.match(media,/addVideoFiles:files=>add\(files,'video'\)/);
  assert.match(js,/\$\('generate'\)\.onclick/);
  assert.match(js,/\$\('quote-dialog'\)\.showModal\(\)/);
  assert.match(js,/\$\('confirm-generation'\)\.onclick/);
  assert.match(css,/#video-effects-grid\{display:grid;grid-template-columns:repeat\(6/);
  assert.match(css,/prefers-reduced-motion/);
});

test('Effects remain hidden until server owner role verification',()=>{
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../lab/video-effects.css',import.meta.url),'utf8');
  assert.match(html,/<button id="tool-effects"[^>]*\shidden(?:\s|>)/);
  assert.match(css,/#tool-effects\[hidden\]\{display:none!important\}/);
  assert.match(js,/ownerAccount=data\.owner===true&&data\.customer!==true/);
  assert.match(js,/\$\('tool-effects'\)\.hidden=!effectsAllowed/);
  assert.match(js,/if\(restoreEffects&&ownerAccount&&tool==='video'\)/);
  assert.match(js,/function openEffectsView\(\{scroll=true\}=\{\}\)\{\s*if\(!owner\|\|!ownerAccount\|\|busy\)return/);
  assert.match(js,/function chooseVideoEffect\(id,identityPhoto=null\)\{\s*if\(!owner\|\|!ownerAccount\|\|busy\)return/);
  assert.match(js,/myMoods\.reset\(\);owner=false;ownerAccount=false/);
});
