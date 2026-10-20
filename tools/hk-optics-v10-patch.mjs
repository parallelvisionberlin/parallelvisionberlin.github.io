import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const hash=x=>createHash('sha256').update(x).digest('hex');
const before=await import(pathToFileURL(resolve('lab/moods.js')).href+'?beforeV10');
function recipes(m,other=false){const out=[];for(const mood of m.MOODS.filter(x=>other?x.id!=='hong-kong-nights':x.id==='hong-kong-nights'))for(const engine of m.MOOD_MODELS)for(const referenceMode of ['base','references'])for(const referenceCount of [0,1])for(const intensity of other?[20,60,90,100]:[1,34,60,70,90])out.push(m.prepareMoodPrompt('Preserve the photograph.',mood.id,intensity,{engine,referenceMode,referenceCount}));return hash(JSON.stringify(out));}
const locked={lower:recipes(before),other:recipes(before,true),color:hash(readFileSync('lab-worker/film-engine-v3.mjs')),worker:hash(readFileSync('lab-worker/worker.mjs')),references:hash(readFileSync('lab/mood-references.js'))};
function edit(path,changes){let s=readFileSync(path,'utf8');for(const [a,b] of changes){const n=a instanceof RegExp?[...s.matchAll(new RegExp(a.source,'g'))].length:s.split(a).length-1;assert.equal(n,1,path+' unique patch anchor: '+String(a).slice(0,100));s=s.replace(a,()=>b);}writeFileSync(path,s);}
edit('lab-worker/film-finish.mjs',[
 [/if\s*\(\s*finish\.haze\s*\|\|\s*finish\.halation\s*\)\s*\{/,"if(engine!=='v10'&&(finish.haze||finish.halation)){"],
 ["import {filmPrintPixelV3,filmEmitterWeightV3} from './film-engine-v3.mjs';","import {filmPrintPixelV3,filmEmitterWeightV3} from './film-engine-v3.mjs';\nimport {opticalScatterPixels} from './film-light-scatter.mjs';"],
 ["async function convertHighlights(bytes,asMask=false){",`export async function opticalScatterPng(bytes,settings){
  const {width,height,pixels}=await normalizedPixels(bytes);
  const light=opticalScatterPixels(width,height,pixels,settings),scan=new Uint8Array((width*4+1)*height);
  for(let y=0;y<height;y++)scan.set(light.subarray(y*width*4,(y+1)*width*4),y*(width*4+1)+1);
  return png(width,height,scan,6);
}
async function convertHighlights(bytes,asMask=false){`],
 ["  const signature=filmTop*Math.min(hazeTop,lightTop);",`  if(engine==='v10')return {
    ...photochemicalPlan(value,{engine:'v8'}),
    // Independent controls; Film 100 retains the approved print color curve.
    grainAmount:Math.min(134,f.grain*(1+.22*grainTop)),
    printStrength:filmTop,
    printOpacity:Math.min(.98,f.film/100*.88+.10*filmTop),
    diffusionOpacity:0,signature:0
  };
  const signature=filmTop*Math.min(hazeTop,lightTop);`],
 ["(['v3','v8'].includes(engine)?filmPrintPixelV3:photochemicalPixel)","(['v3','v8','v10'].includes(engine)?filmPrintPixelV3:photochemicalPixel)"],
 ["export async function renderFilmFinish(images,bytes,settings,seed,{engine='v8'}={}){","export async function renderFilmFinish(images,bytes,settings,seed,{engine='v10'}={}){"],
 ["if(!['v6','v3','v8'].includes(engine))", "if(!['v6','v3','v8','v10'].includes(engine))"],
 ["  if(finish.haze){\n    // Minimal global softness;",`  if(engine==='v10'&&(finish.haze||finish.halation)){
    const optical=await opticalScatterPng(sourcePng,finish);
    const layer=images.input(stream(optical)).transform({width,height,fit:'squeeze'});
    image=image.draw(layer,{opacity:1,composite:'lighter'});
  }
  if(engine!=='v10'&&finish.haze){
    // Minimal global softness;`],
 ["// V8 retains the proven V3 color curve and real-lamp emitter masks with less\n// global haze. V3 and V6 stay callable internally for image A/B and rollback.","// V10 retains V3 print color, but uses independent multiscale light-only\n// scattering. V8/V3/V6 remain available for controlled comparison/rollback."]
]);
edit('lab/film-finish.js',[
 ['export const FILM_FINISH_RENDER_REVISION=8;','export const FILM_FINISH_RENDER_REVISION=10;'],
 ["Grain: irregular pushed-negative texture. Haze: practical light scattering through humid air. Halation: light-source bloom without body outlines. Film: 35mm print contrast, warm highlights, cool shadows and soft rolloff. At high strengths the finish becomes more expressive. No extra AI generation.","Grain: texture only. Haze: broad, source-driven optical diffusion from real light sources. Halation: tighter glow around bright light edges. Film: the existing 35mm print color and tonal curve. Each control is independent; high optical settings are deliberately strong. Scene atmosphere comes from Mood intensity when generating; this finish adds optical diffusion, not reconstructed scene fog. No extra AI generation."],
 ["Humid optical diffusion from actual light sources","Multiscale optical light spread; high settings are strong"],
 ["Light-source bloom without glowing silhouettes","Localized highlight-edge glow, not whole-image blur"]
]);
edit('lab/moods.js',[
 ["    const photoStrength=refineAtmosphere\n", "    const airLevel=intensity===100?'MAXIMUM ATMOSPHERE':intensity>=96?'STRONG ATMOSPHERE':'VISIBLE ATMOSPHERE';\n    const photoStrength=refineAtmosphere\n"],
 ["?'Keep emerald/tungsten color, face and textures. Add slight atmospheric diffusion, suspended humidity, soft practical bloom, localized halation and subtle veiling flare. No uniform green wash, digital sharpening, extra grain or blur. Wet reflections outdoors only; dry rooms.'", "?airLevel+': Keep emerald/tungsten color, face and textures. Pronounced atmospheric diffusion and suspended humidity, lit by existing lights through mid/background depth. Broad soft practical bloom, localized halation and subtle veiling flare. Clear foreground eyes; rich unlit blacks. No uniform green wash, digital sharpening, extra grain or blur. Wet reflections outdoors only; dry rooms.'"],
 [":'Keep existing emerald/petrol shadows, warm tungsten light, natural skin and contrast. Increase atmospheric diffusion slightly: suspended humidity with depth, soft bloom and localized halation from existing lights/neon, subtle veiling flare. Embed air in the scene, not a uniform green wash or clean digital sharpening. Keep face, composition and room textures. Wet reflections only outdoors; dry interiors. No extra grain, muddy blacks or blanket blur.'", ":airLevel+': Keep existing emerald/petrol shadows, warm tungsten light, natural skin and contrast. Make atmospheric diffusion clearly visible: existing lamps and window light illuminate suspended humidity at several depths, with luminous middle distance and softer receding background. Broad soft practical bloom, localized halation and subtle veiling flare surround existing bright sources. At maximum make air unmistakable, not a subtle color grade. Embed air in the scene, not a uniform green wash or clean digital sharpening. Keep clear foreground eyes, face, composition, material textures and rich unlit blacks. Wet reflections only outdoors; dry interiors. No extra grain, muddy blacks, blanket blur or new lamps.'"],
 ["translucent humidity illuminated by existing light through the middle distance, with clear foreground details and unlit dark pockets","visible layered humidity illuminated by existing light through the middle distance, with clear foreground details and unlit dark pockets"]
]);
edit('tests/lab-film-preview-worker.mjs',[["['v6','v3','v8'].includes(u.searchParams.get('engine'))","['v6','v3','v8','v10'].includes(u.searchParams.get('engine'))"]]);
for(const path of ['tests/lab-film-finish.test.mjs','tests/lab-hong-kong-image3-baseline.test.mjs']){
 let s=readFileSync(path,'utf8');s=s.replaceAll('FILM_RENDER_REVISION,8','FILM_RENDER_REVISION,10').replaceAll('FILM_FINISH_RENDER_REVISION,8','FILM_FINISH_RENDER_REVISION,10');writeFileSync(path,s);
}
const marker='hkLight=20261021v10';
for(const name of readdirSync('lab').filter(n=>/\.(js|html)$/.test(n))){const path='lab/'+name,before=readFileSync(path,'utf8');const after=before.replace(/(['"]\.\/(?:film-finish|moods|lab|app-moods|app-mood-generation|explore-moods|mood-creator)\.js\?[^'"\s<>]+)/g,url=>url.includes(marker)?url:url+'&'+marker);if(after!==before)writeFileSync(path,after);}
const after=await import(pathToFileURL(resolve('lab/moods.js')).href+'?afterV10');
assert.equal(recipes(after),locked.lower,'1-90% approved Hong Kong recipe must remain exact');
assert.equal(recipes(after,true),locked.other,'Other Moods must remain exact');
for(const [key,path] of [['color','lab-worker/film-engine-v3.mjs'],['worker','lab-worker/worker.mjs'],['references','lab/mood-references.js']])assert.equal(hash(readFileSync(path)),locked[key],path);
writeFileSync('lab/HONG-KONG-LIGHT-WORK-STATE.md',`# Hong Kong light update, 21 October 2026\n\n- Retain Image 3's 1-90% generation recipe and existing V3/V8 print color formula. No changed image provider, references, billing, safety, stored originals or automatic Film Finish.\n- 91-95 requests visible atmosphere, 96-99 strong atmosphere, 100 maximum source-lit suspended humidity. No second AI pass, invented lamps, indoor wet floors or uniform green overlay.\n- Film Finish revision 10 replaces the weak optical mechanism with linear-light multiscale scattering from soft window highlights and real bright sources. Haze spreads light across three radii; Halation adds a tighter highlight-edge halo. No full-image blur. Native geometry/detail remain beneath the additive light-only layer.\n- Film strength and Grain amount no longer depend on Haze/Halation. Existing V8 renderer remains callable for comparison. New derivatives are separate; saved V8 finishes are not overwritten.\n- Existing Mood Intensity is the atmosphere control, separate from post-generation optics. No extra slider or extra paid pass is added.\n- Research: Cloudflare Images binding supports Porter-Duff lighter; Tiffen diffusion guide distinguishes highlight spill from global resolution loss. This is an artistic simulation, not measured film or true volumetric reconstruction.\n- Local inspection used a private crop of the owner's supplied screenshot; that screenshot is not uploaded to GitHub. Public repo photographic fixtures are used for remote binding checks.\n`);
console.log('HK_V10_PATCH_READY',JSON.stringify(locked));
