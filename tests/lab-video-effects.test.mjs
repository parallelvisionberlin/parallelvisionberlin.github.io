import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {VIDEO_EFFECTS,getVideoEffect,resolveVideoEffect} from '../lab/video-effects.js';
import {VIDEO_MODELS} from '../lab/video-models.js';

test('Motion Effects are three real start-frame recipes using supported models and existing art',()=>{
  assert.deepEqual(VIDEO_EFFECTS.map(x=>x.id),['liquid-metal','fabric-storm','ghost-motion']);
  assert.equal(getVideoEffect('missing'),null);
  for(const effect of VIDEO_EFFECTS){
    const model=VIDEO_MODELS[effect.engine];
    assert.ok(model,effect.id+' uses a known model');
    assert.ok(model.modes.includes('start'));
    assert.ok(model.resolutions.includes(effect.resolution));
    assert.ok(effect.duration>=model.minSeconds&&effect.duration<=model.maxSeconds);
    assert.ok(effect.prompt.length>150&&effect.prompt.length<=5000);
    assert.match(effect.prompt,/preserve|same|original/i);
    assert.match(effect.prompt,/camera/i);
    assert.equal(effect.audio,false);
    assert.ok(statSync(new URL('../lab/'+effect.poster.replace(/^\.\//,''),import.meta.url)).size>2000,'Poster exists: '+effect.poster);
    const resolved=resolveVideoEffect(effect.id,[effect.engine]);
    assert.equal(resolved.ok,true);
    assert.equal(resolved.settings.mode,'start');
    assert.equal(resolved.settings.engine,effect.engine);
    assert.equal(resolved.settings.prompt,effect.prompt);
  }
});

test('effect selection fails closed when model is disabled, with no substitution',()=>{
  assert.equal(resolveVideoEffect('unknown',['seedance']).ok,false);
  assert.equal(resolveVideoEffect('ghost-motion',['seedance']).ok,false);
  assert.equal(resolveVideoEffect('liquid-metal',[]).ok,false);
  assert.equal(resolveVideoEffect('liquid-metal',undefined).ok,false);
  assert.equal(resolveVideoEffect('ghost-motion',['seedance15']).settings.engine,'seedance15');
  assert.notEqual(resolveVideoEffect('ghost-motion',['seedance15']).settings.engine,'seedance');
});

test('Effects stay attached to existing Video Studio and do not create a paid shortcut',()=>{
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../lab/video-effects.css',import.meta.url),'utf8');
  for(const id of ['tool-effects','video-effects-explore','video-effects-grid','video-effect-active',
    'video-effect-upload','video-effect-from-gallery','effect-gallery-picker','effect-gallery-picker-grid']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'One UI element: '+id);
  }
  assert.match(html,/video-effects\.css\?v=20261016-1/);
  assert.match(js,/video-effects\.js\?v=20261016-1/);
  assert.match(js,/mountVideoEffectsGallery/);
  assert.match(js,/resolveVideoEffect\(id,config\.videoEngines\)/);
  assert.match(js,/assetThumbnailBlob\(item\.id\)/);
  assert.match(js,/assetFile\(job\.outputId,'effect-start-frame'\)/);
  assert.match(js,/setMode\('start'\)/);
  assert.match(js,/\$\('prompt'\)\.value=plan\.prompt/);
  assert.match(js,/\$\('generate'\)\.onclick/);
  assert.match(js,/\$\('quote-dialog'\)\.showModal\(\)/);
  assert.match(js,/\$\('confirm-generation'\)\.onclick/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(html,/not generated video results/i);
});


test('Motion Effects are owner-preview-only and never visible before server role verification',()=>{
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../lab/video-effects.css',import.meta.url),'utf8');
  assert.match(html,/<button id="tool-effects"[^>]*\shidden(?:\s|>)/);
  assert.match(css,/#tool-effects\[hidden\]\{display:none!important\}/);
  assert.match(js,/ownerAccount=data\.owner===true&&data\.customer!==true/);
  assert.match(js, /\$\('tool-effects'\)\.hidden=!effectsAllowed/);
  assert.match(js,/if\(restoreEffects&&ownerAccount&&tool==='video'\)/);
  assert.match(js,/function openEffectsView\(\{scroll=true\}=\{\}\)\{\s*if\(!owner\|\|!ownerAccount\|\|busy\)return/);
  assert.match(js,/function chooseVideoEffect\(id\)\{\s*if\(!owner\|\|!ownerAccount\|\|busy\)return/);
  assert.match(js,/myMoods\.reset\(\);owner=false;ownerAccount=false/);
});
