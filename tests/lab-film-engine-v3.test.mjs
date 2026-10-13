import test from 'node:test';
import assert from 'node:assert/strict';
import {filmPrintPixelV3,filmEmitterWeightV3,FILM_ENGINE_V3_REVISION} from '../lab-worker/film-engine-v3.mjs';
import {photochemicalPixel,sourceLightWeight} from '../lab-worker/film-finish.mjs';
const excess=x=>x[1]-(x[0]+x[2])*.5;
test('V3 keeps luminous emerald shadows rather than subtracting green channel',()=>{
  assert.equal(FILM_ENGINE_V3_REVISION,7);
  for(const input of [[32,68,60],[40,97,82],[60,115,94],[38,130,105]]){
    const v3=filmPrintPixelV3(...input,1),v6=photochemicalPixel(...input,1);
    assert.ok(excess(v3)>=.89*excess(input),'source green not preserved: '+JSON.stringify({input,v3}));
    assert.ok(excess(v3)>1.08*excess(v6),'must exceed old print chroma: '+JSON.stringify({input,v3,v6}));
  }
  assert.deepEqual(filmPrintPixelV3(0,0,0,1),[0,0,0]);
  const skin=filmPrintPixelV3(191,149,123,1);
  assert.ok(skin[0]>skin[1]&&skin[1]>skin[2]);
  assert.ok(Math.abs((skin[0]-skin[1])-42)<11);
});
test('V3 admits actual green/amber practical light but not face edges',()=>{
  assert.ok(filmEmitterWeightV3(12,211,122,.3,sourceLightWeight(12,211,122,.3))>.3);
  assert.ok(filmEmitterWeightV3(234,171,65,.3,sourceLightWeight(234,171,65,.3))>.3);
  assert.equal(filmEmitterWeightV3(175,124,103,.35,sourceLightWeight(175,124,103,.35)),0);
  assert.equal(filmEmitterWeightV3(48,105,92,.35,sourceLightWeight(48,105,92,.35)),0);
  assert.equal(filmEmitterWeightV3(110,130,111,.3,sourceLightWeight(110,130,111,.3)),0);
});
