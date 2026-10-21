import test from 'node:test';
import assert from 'node:assert/strict';
import {opticalScatterPixels,scatteringEmitter,opticalStrength} from '../lab-worker/film-light-scatter.mjs';
import {photochemicalPlan,filmAssetId,FILM_RENDER_REVISION} from '../lab-worker/film-finish.mjs';
import {MOOD_MODELS,prepareMoodPrompt} from '../lab/moods.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';
const w=192,h=128;
function fixture(){const p=new Uint8Array(w*h*4);for(let i=0;i<p.length;i+=4)p.set([24,28,27,255],i);for(let y=22;y<78;y++)for(let x=127;x<166;x++)p.set([224,216,192,255],(y*w+x)*4);return p;}
const lightSum=layer=>{let n=0;for(let i=0;i<layer.length;i+=4)n+=(layer[i]+layer[i+1]+layer[i+2])*layer[i+3]/255;return n;};
const contribution=(layer,x,y)=>{const j=(y*w+x)*4;return layer[j]*layer[j+3]/255;};
test('optics: zero settings and an unlit photograph add exactly no light',()=>{
 assert.equal(lightSum(opticalScatterPixels(w,h,fixture(),{})),0);
 const p=new Uint8Array(w*h*4);for(let i=0;i<p.length;i+=4)p.set([31,55,43,255],i);
 assert.equal(lightSum(opticalScatterPixels(w,h,p,{haze:100,halation:100})),0);
 assert.equal(scatteringEmitter(108,130,111),0);
 assert.ok(scatteringEmitter(210,208,195)>.4,'soft window highlights must be accepted');
 assert.equal(opticalStrength(NaN),0);assert.equal(opticalStrength(-10),0);
});
test('optics: high slider positions have an unmistakably stronger response',()=>{
 const p=fixture(),levels=[0,30,60,100].map(v=>lightSum(opticalScatterPixels(w,h,p,{haze:v,halation:v})));
 for(let i=1;i<levels.length;i++)assert.ok(levels[i]>levels[i-1]);
 assert.ok(levels[3]>levels[1]*2.2,'maximum cannot feel like the 30% setting');
 const full=opticalScatterPixels(w,h,p,{haze:100,halation:100});
 assert.ok(contribution(full,119,50)>8,'light must visibly reach outside the existing window');
 assert.ok(contribution(full,0,127)<=1,'far-field Gaussian tail must stay below one 8-bit display level');
});
test('optics: broad haze and localized halation have different spatial behavior',()=>{
 const p=fixture(),haze=opticalScatterPixels(w,h,p,{haze:100}),halo=opticalScatterPixels(w,h,p,{halation:100});
 assert.ok(contribution(halo,125,50)>2,'tight halo outside a light edge');
 assert.ok(contribution(haze,105,50)>contribution(halo,105,50)+2,'haze spreads beyond the tight halo');
 assert.notDeepEqual(haze,halo);
 assert.deepEqual(haze,opticalScatterPixels(w,h,p,{haze:100}));
});
test('optics: bounds and transparent input are safe',()=>{
 assert.throws(()=>opticalScatterPixels(2000,2000,new Uint8Array(4),{}),/bounded/);
 assert.throws(()=>opticalScatterPixels(3,3,new Uint8Array(4),{}),/bounded/);
 const p=new Uint8Array(w*h*4);p.fill(255);for(let i=3;i<p.length;i+=4)p[i]=0;
 assert.equal(lightSum(opticalScatterPixels(w,h,p,{haze:100,halation:100})),0);
});
test('optics: light sliders do not change Film color or Grain strength',()=>{
 const settings={version:2,grain:23,haze:0,halation:0,film:100};
 const a=photochemicalPlan(settings,{engine:'v10'}),b=photochemicalPlan({...settings,haze:100,halation:100},{engine:'v10'});
 for(const key of ['printStrength','printOpacity','grainAmount'])assert.equal(a[key],b[key],key);
 const old=photochemicalPlan({...settings,haze:100,halation:100},{engine:'v8'});
 assert.equal(b.printStrength,old.printStrength);
 assert.ok(Math.abs(b.printOpacity-old.printOpacity)<1e-10,'approved maximum print color is retained');
 assert.equal(b.diffusionOpacity,0,'no whole-frame blur');assert.equal(a.grainAmount,23);
 assert.equal(FILM_RENDER_REVISION,10);
});
test('optics: derivative keys isolate settings and originals',async()=>{
 const s={version:2,grain:23,haze:100,halation:100,film:100};
 const a=await filmAssetId('owner','original',s);
 assert.equal(a,await filmAssetId('owner','original',s));
 assert.notEqual(a,await filmAssetId('owner','original',{...s,haze:30}));
 assert.notEqual(a,await filmAssetId('other','original',s));
});
test('Hong Kong atmosphere: stronger high range preserves lower recipe and fits every provider',()=>{
 for(const engine of MOOD_MODELS)for(const [amount,label] of [[90,null],[91,'VISIBLE ATMOSPHERE'],[95,'VISIBLE ATMOSPHERE'],[96,'STRONG ATMOSPHERE'],[100,'MAXIMUM ATMOSPHERE']]){
  const r=prepareMoodPrompt('Keep the original portrait and room.','hong-kong-nights',amount,{engine,referenceCount:1});
  assert.equal(r.error,'');
  if(label)assert.ok(r.prompt.includes(label),engine+' '+amount);else assert.doesNotMatch(r.prompt,/MAXIMUM ATMOSPHERE|VISIBLE ATMOSPHERE|STRONG ATMOSPHERE/);
  if(amount>90){assert.match(r.prompt,/suspended humidity/);assert.match(r.prompt,/dry rooms|dry interiors/);assert.doesNotMatch(r.prompt,/Increase atmospheric diffusion slightly|Add slight atmospheric diffusion/);}
  const roles=[{role:'base',name:'original.png',note:''}];
  assert.ok(compileImagePrompt(r.prompt,roles,{engine,referenceMode:'base',referenceRoles:roles}).length<=(engine==='seedreamlite'?3000:5000));
  assert.deepEqual(r.metadata.filmFinish,{version:2,grain:0,haze:0,halation:0,film:0});
 }
});
