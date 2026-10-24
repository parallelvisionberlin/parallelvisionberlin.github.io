import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateSync} from 'node:zlib';
import {readFileSync} from 'node:fs';
import {grainPng,filmAssetId,prepareFilmAsset,renderFilmFinish,shoulderPng,FILM_RENDER_REVISION,photochemicalPixel,earlyEightiesPrintPixel,sourceLightWeight,printGradePng,luminousMaskPng,deluxeResponse,photochemicalPlan} from '../lab-worker/film-finish.mjs';
import {filmFinishSettings,HONG_KONG_FILM_FINISH,FILM_FINISH_OFF,EIGHTIES_100_FILM_FINISH,eightiesBaseFinish} from '../lab/film-finish.js';
import {prepareMoodPrompt,preparePersonalMoodPrompt} from '../lab/moods.js';

test('grain is a valid non-tiled PNG, repeatable by image and scalable by strength',async()=>{
  const a=await grainPng(61,43,65,'photo-a'),b=await grainPng(61,43,65,'photo-a');assert.deepEqual(a,b);
  assert.notDeepEqual(a,await grainPng(61,43,65,'photo-b'));
  function pixels(bytes){let p=8,parts=[];while(p<bytes.length){const n=new DataView(bytes.buffer,bytes.byteOffset+p,4).getUint32(0);if(Buffer.from(bytes.slice(p+4,p+8)).toString()==='IDAT')parts.push(bytes.slice(p+8,p+8+n));p+=n+12;}return inflateSync(Buffer.concat(parts));}
  const scan=pixels(a),off=pixels(await grainPng(61,43,0,'photo-a')),heavy=pixels(await grainPng(61,43,100,'photo-a'));
  assert.equal(scan.length,(61*2+1)*43);
  let low=0,high=0;for(let y=0;y<43;y++)for(let x=0;x<61;x++){const i=y*123+2+x*2;assert.equal(off[i],0);low+=scan[i];high+=heavy[i];}
  assert.ok(high>low*1.4);assert.ok(low>0);
});
test('settings reject unsupported values and stable asset IDs isolate owners and settings',async()=>{
  for(const value of [null,{},[],{version:3,grain:10,haze:10,halation:10,film:10},{version:1,grain:101,glow:10},{version:1,grain:1.5,glow:0}])assert.throws(()=>filmFinishSettings(value));
  const a=await filmAssetId('owner-a','image',HONG_KONG_FILM_FINISH);
  assert.equal(a,await filmAssetId('owner-a','image',HONG_KONG_FILM_FINISH));
  assert.notEqual(a,await filmAssetId('owner-b','image',HONG_KONG_FILM_FINISH));
  assert.notEqual(a,await filmAssetId('owner-a','image',{...HONG_KONG_FILM_FINISH,film:65}));
});
test('off bypasses processing and cached derivatives bypass all rendering',async()=>{
  const original={id:'original',owner_id:'owner',bytes:100,object_key:'owner/original'};
  assert.equal(await prepareFilmAsset({},original,{version:1,grain:0,glow:0},{}),original);
  const saved={id:'finished',owner_id:'owner',object_key:'owner/finished'};
  assert.notDeepEqual(HONG_KONG_FILM_FINISH,FILM_FINISH_OFF,'New Hong Kong quotes use the approved preset; manual off remains available');
  assert.equal(await prepareFilmAsset({},original,FILM_FINISH_OFF,{}),original);
  const manual={...HONG_KONG_FILM_FINISH,grain:50,haze:60};
  assert.equal(await prepareFilmAsset({LAB_MEDIA:{head:async()=>({size:100})}},original,manual,{first:async()=>saved}),saved);
  await assert.rejects(renderFilmFinish(null,new Uint8Array(),manual,'x'),/unavailable/);
});
test('Hong Kong finish controls change metadata independently of creative intensity and preserve references',()=>{
  const a=prepareMoodPrompt('One woman by a window','hong-kong-nights',100,{referenceCount:1,filmFinish:{version:1,grain:20,glow:80}});
  const b=prepareMoodPrompt('One woman by a window','hong-kong-nights',100,{referenceCount:1,filmFinish:{version:1,grain:100,glow:0}});
  assert.equal(a.prompt,b.prompt);assert.equal(a.metadata.moodIntensity,100);assert.equal(b.metadata.filmFinish.grain,100);
  assert.match(a.prompt,/Keep identical face, expression, age, hair, body, pose, outfit/);
  assert.match(a.prompt,/EDIT IMAGE 1, not a new scene/);
  assert.doesNotMatch(a.prompt,/Heavy irregular clustered grain/);
  assert.equal(prepareMoodPrompt('Portrait','berlin-rave',100).metadata.filmFinish,undefined);
  assert.equal(preparePersonalMoodPrompt('Portrait',{id:'board',name:'Mine',baseMoodId:'hong-kong-nights',direction:'Quiet light'},60).metadata.filmFinish,undefined);
});

test('source-aware grain preserves black and white, favors midtones and does not add a gray veil',async()=>{
  const width=600,height=100,pixels=new Uint8Array(width*height*4),levels=[0,12,64,128,240,255];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)pixels.set([levels[Math.floor(x/100)],levels[Math.floor(x/100)],levels[Math.floor(x/100)],255],(y*width+x)*4);
  const bytes=await grainPng(width,height,100,'luminance',{width,height,pixels});
  let offset=8,parts=[];while(offset<bytes.length){const n=new DataView(bytes.buffer,bytes.byteOffset+offset,4).getUint32(0);if(Buffer.from(bytes.slice(offset+4,offset+8)).toString()==='IDAT')parts.push(bytes.slice(offset+8,offset+8+n));offset+=n+12;}
  const scan=inflateSync(Buffer.concat(parts)),mean=levels.map(()=>0),energy=levels.map(()=>0);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const k=Math.floor(x/100),i=y*(width*2+1)+1+x*2,delta=(scan[i]-levels[k])*scan[i+1]/255;
    mean[k]+=delta/10000;energy[k]+=delta*delta/10000;
  }
  assert.equal(energy[0],0);assert.equal(energy[5],0);
  assert.ok(energy[3]>energy[1]*3);assert.ok(energy[3]>energy[4]*3);
  for(const m of mean)assert.ok(Math.abs(m)<.15,'grain must not lift shadows or depress highlights systematically');
  assert.equal(FILM_RENDER_REVISION,10,'new V8 processing must not reuse previous film derivatives');
});
test('Restored Hong Kong look preserves subject and does not require invented scene relighting at any strength',()=>{
  for(const intensity of [21,70,100]){
    const {prompt,error}=prepareMoodPrompt('Portrait','hong-kong-nights',intensity,{referenceCount:1});
    assert.equal(error,'');
    assert.match(prompt,/Keep identical face, expression, age, hair, body, pose, outfit/);
    assert.match(prompt,/Avoid: flat teal LUT/);
    assert.doesNotMatch(prompt,/Relight whole Base|reconstruct cinematic scene lighting|off-axis light modeling/);
  }
});


test('neutral highlight shoulder preserves black, midtones and warm source hue',async()=>{
  const input=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAABCAIAAAB2XpiaAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFUlEQVQImWNgYGBoaGj4////s/U9AB+aBp+Ia7giAAAAAElFTkSuQmCC','base64');
  const bytes=await shoulderPng(input),parts=[];
  for(let p=8;p<bytes.length;){const n=new DataView(bytes.buffer,bytes.byteOffset+p,4).getUint32(0);if(Buffer.from(bytes.slice(p+4,p+8)).toString()==='IDAT')parts.push(bytes.slice(p+8,p+8+n));p+=n+12;}
  const row=inflateSync(Buffer.concat(parts));
  assert.deepEqual([...row.slice(1,4)],[0,0,0]);
  assert.deepEqual([...row.slice(5,8)],[128,128,128]);
  assert.ok(row[9]<255&&row[9]>235);assert.equal(row[9],row[10]);assert.equal(row[10],row[11]);
  assert.ok(Math.abs(row[14]/row[13]-175/230)<.01);assert.ok(Math.abs(row[15]/row[13]-140/230)<.01);
});

test('old film settings stay readable, v2 sliders validate and off is an exact original',async()=>{
  assert.deepEqual(filmFinishSettings({version:1,grain:100,glow:100}),{version:2,grain:100,haze:55,halation:35,film:0});
  assert.deepEqual(filmFinishSettings({version:1,grain:0,glow:0}),FILM_FINISH_OFF);
  for(const value of [{version:2,grain:20,haze:0,halation:0},{version:2,grain:0,haze:101,halation:0,film:0},{version:2,grain:0,haze:0,halation:-1,film:0},{version:2,grain:0,haze:0,halation:0,film:12.5}])
    assert.throws(()=>filmFinishSettings(value));
  assert.equal(await prepareFilmAsset({}, {id:'a',owner_id:'b'}, FILM_FINISH_OFF,{}).then(v=>v.id),'a');
  assert.notEqual(await filmAssetId('owner','image',{...HONG_KONG_FILM_FINISH,film:65}),
    await filmAssetId('owner','image',{...HONG_KONG_FILM_FINISH,film:95}));
});
test('35mm print curve shifts bright neutrals warm, shadows cool, keeps luminance and no artificial edge source',()=>{
  const warm=photochemicalPixel(239,239,239);
  const dark=photochemicalPixel(26,26,26);
  assert.ok(warm[0]>warm[2],'print highlight warms, blue rolls off');
  assert.ok(dark[2]>dark[0],'cool shadow crossover');
  assert.ok(warm.every(n=>n>210),'highlights remain luminous');
  assert.equal(sourceLightWeight(108,130,111,0.6),0,'skin/background midtones never become invented glow sources');
  assert.ok(sourceLightWeight(250,245,222,0.24)>.4,'only near-white luminous sources spread');
  assert.ok(sourceLightWeight(14,30,30,0.5)<.01,'dark silhouettes cannot seed halos');
});

test('deluxe photochemical response builds progressively above 70 without changing calibrated defaults',()=>{
  assert.equal(deluxeResponse(0),0);assert.equal(deluxeResponse(70),0);
  assert.equal(deluxeResponse(100),1);
  assert.ok(deluxeResponse(90)>deluxeResponse(80));
  const baseline=photochemicalPlan({version:2,grain:36,haze:42,halation:22,film:65});
  assert.equal(baseline.signature,0);
  assert.equal(baseline.hazeRadius,43);
  const newDefault=photochemicalPlan(HONG_KONG_FILM_FINISH);
  assert.ok(newDefault.signature>0,'New Hong Kong uses strong luminous film optics');
  assert.ok(newDefault.hazeOpacity>0);
  assert.ok(newDefault.halationOpacity>0);
  assert.ok(newDefault.printOpacity>0);
  assert.ok(newDefault.grainAmount>0);
  const full=photochemicalPlan({version:2,grain:100,haze:100,halation:100,film:100});
  const previous=photochemicalPlan({version:2,grain:100,haze:100,halation:100,film:100},{engine:'v3'});
  assert.ok(full.diffusionOpacity<previous.diffusionOpacity*.5,'V8 must reduce whole-image blur');
  for(const key of ['grainAmount','printStrength','printOpacity','hazeRadius','hazeOpacity','halationRadius','halationOpacity'])
    assert.equal(full[key],previous[key],'Preserve established source light behavior: '+key);
  assert.equal(full.signature,1);
  assert.ok(full.grainAmount>125&&full.grainAmount<=134);
  assert.ok(full.hazeRadius>60&&full.hazeOpacity>.45);
  assert.ok(full.halationOpacity>.45&&full.halationRadius>11);
  assert.ok(full.printOpacity>.95&&full.printStrength===1);
  assert.ok(full.diffusionOpacity>baseline.diffusionOpacity);
  const clean=photochemicalPlan(FILM_FINISH_OFF);
  assert.equal(clean.printOpacity,0);assert.equal(clean.hazeOpacity,0);
  const mid=photochemicalPlan({version:2,grain:65,haze:65,halation:65,film:65});
  assert.equal(mid.signature,0);
  assert.equal(mid.grainAmount,65);
});
test('deluxe 35mm crossover is stronger than standard without inventing a skin halo',()=>{
  const standard=photochemicalPixel(235,228,212),deluxe=photochemicalPixel(235,228,212,1);
  assert.ok(deluxe[0]-deluxe[2]>standard[0]-standard[2],'warm highlights separate on pushed print');
  const dark=photochemicalPixel(35,38,44,1);
  assert.ok(dark.every(n=>n>=0&&n<=255));
  assert.equal(sourceLightWeight(108,130,111,.6),0);
  assert.ok(sourceLightWeight(14,30,30,.5)<.01);
});
test('film result UI keeps source-safe controls visible and accessible',()=>{
  const css=readFileSync(new URL('../lab/image-result-deck.css',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../lab/film-finish.js',import.meta.url),'utf8');
  const app=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  assert.match(css,/#image-lightbox #image-film-finish\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/#image-lightbox #image-film-apply\{/);
  assert.match(css,/scroll-padding-bottom:36px/);
  assert.match(ui,/aria-expanded/);assert.match(ui,/Photochemical texture, atmospheric light and analog color/);
  assert.match(app,/filmApply.id='image-film-apply'/);
  assert.match(app,/filmOriginal.id='image-film-original'/);
});

test('v6 analog maximum visibly changes dim midtones and preserves pure black',()=>{
  for(const rgb of [[32,68,60],[40,97,82],[60,115,94],[120,155,130]]){
    const a=photochemicalPixel(...rgb,0),b=photochemicalPixel(...rgb,1);
    const delta=b.reduce((n,v,i)=>n+Math.abs(v-a[i]),0);
    assert.ok(delta>=6,'deluxe midtone difference: '+JSON.stringify({rgb,a,b,delta}));
  }
  assert.deepEqual(photochemicalPixel(0,0,0,1),[0,0,0]);
  assert.equal(sourceLightWeight(108,130,111,.6),0);
  const client=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  const backend=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
  assert.match(client,/Changes not applied/);assert.match(client,/Earlier finish/);
  assert.match(backend,/filmFinishRevision:output.id===original.id\?null:FILM_RENDER_REVISION/);
});

test('V3 promotion invalidates old derivatives and retains V6 as a reversible internal renderer',async()=>{
  assert.equal(FILM_RENDER_REVISION,10);
  const original=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAABCAIAAAB2XpiaAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFUlEQVQImWNgYGBoaGj4////s/U9AB+aBp+Ia7giAAAAAElFTkSuQmCC','base64');
  const v6=await printGradePng(original,1,'v6');
  const v3=await printGradePng(original,1,'v3');
  assert.notDeepEqual(v6,v3,'V3 grade must not be a no-op alias of V6');
  assert.notEqual(await filmAssetId('owner','image',HONG_KONG_FILM_FINISH),
    await filmAssetId('owner','image',{...HONG_KONG_FILM_FINISH,film:95}));
});

test('80s Film 100% only: automatic finish never affects other moods, engines or reference-only images',()=>{
  const base={type:'image',mode:'image',engine:'seedream',moodId:'80s-film',moodIntensity:100,
    referenceMode:'base',referenceRoles:[{role:'base',name:'source.jpg'},{role:'style',name:'80s Film style'}]};
  assert.deepEqual(eightiesBaseFinish(base),EIGHTIES_100_FILM_FINISH);
  assert.equal(EIGHTIES_100_FILM_FINISH.grain,100);
  assert.equal(EIGHTIES_100_FILM_FINISH.film,100);
  assert.ok(EIGHTIES_100_FILM_FINISH.halation<35,'Keep highlight bloom source-driven');
  for(const patch of [
    {moodIntensity:99},{moodIntensity:60},{moodId:'hong-kong-nights'},{moodId:'dream-blur'},
    {engine:'seedreamlite'},{engine:'gemini21'},{referenceMode:'references'},
    {referenceRoles:[{role:'identity'}]},{referenceRoles:[]},{type:'video'},{mode:'upscale'}
  ])assert.equal(eightiesBaseFinish({...base,...patch}),null,JSON.stringify(patch));
  assert.notDeepEqual(HONG_KONG_FILM_FINISH,FILM_FINISH_OFF,'80s and Hong Kong defaults stay distinct');
});

test('early-80s print response changes color negative optics while keeping neutral grays, face and scene geometries untouched',()=>{
  const black=earlyEightiesPrintPixel(0,0,0,1);
  assert.deepEqual(black,[0,0,0]);
  for(const n of [30,90,128,190,245]){
    const gray=earlyEightiesPrintPixel(n,n,n,1);
    assert.equal(gray[0],gray[1]);assert.equal(gray[1],gray[2]);
    assert.ok(gray[0]>=0&&gray[0]<=255);
  }
  const modernPortrait=[204,157,134];
  const print=earlyEightiesPrintPixel(...modernPortrait,1);
  assert.notDeepEqual(print,modernPortrait,'A completed digital image gains a deterministic tonal difference');
  assert.ok(print[0]>print[2],'Warm skin remains warm, never turns a teal uniform tint');
  assert.ok(print[0]<255&&print[2]>0,'Color still has readable detail');
  for(const rgb of [[3,2,2],[60,85,110],[122,155,129],[250,244,227]]){
    const output=earlyEightiesPrintPixel(...rgb,1);
    assert.ok(output.every(x=>Number.isInteger(x)&&x>=0&&x<=255));
  }
});

test('80s derivative IDs are isolated from Hong Kong and repeat without another AI request',async()=>{
  const owner='owner',original='image-id';
  const h=await filmAssetId(owner,original,EIGHTIES_100_FILM_FINISH);
  const e=await filmAssetId(owner,original,EIGHTIES_100_FILM_FINISH,'eighties');
  assert.notEqual(h,e,'80s and Hong Kong rendering may never share a cached derivative');
  assert.equal(e,await filmAssetId(owner,original,EIGHTIES_100_FILM_FINISH,'eighties'));
  const cached={id:e,owner_id:owner,object_key:'private/film-finish/v10/'+e+'.png'};
  const originalAsset={id:original,owner_id:owner,object_key:'private/output.png',bytes:1400};
  const env={LAB_MEDIA:{head:async(key)=>key===cached.object_key?{size:2100}:null}};
  assert.equal(await prepareFilmAsset(env,originalAsset,EIGHTIES_100_FILM_FINISH,{
    first:async(_env,_query,id)=>id===e?cached:null,remaining:8000,variant:'eighties'
  }),cached);
});

test('80s live/result plumbing retains original output and never invokes a second inference',()=>{
  const worker=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
  const studio=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  assert.match(worker,/const eighties=eightiesBaseFinish\(params\)/);
  assert.match(worker,/variant:eighties\?'eighties':'v10'/);
  assert.match(worker,/Choose a completed Hong Kong Nights or 100% 80s Film Base image/);
  assert.match(worker,/filmOriginalId:params\.filmOriginalId/);
  assert.match(worker,/filmFinishStatus='failed'/);
  assert.match(studio,/filmPanel\.hidden=!\(params\.moodId==='hong-kong-nights'\|\|eightiesBaseFinish\(params\)\)/);
  assert.match(studio,/filmControls\.set\(params\.filmFinish\|\|\(eightiesBaseFinish\(params\)\?EIGHTIES_100_FILM_FINISH/);
  assert.match(studio,/notify\('Film finish saved\. No new AI generation or credit charge\.'/);
});
