import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='test-results/film-finish';await mkdir(dir,{recursive:true});
async function finish(bytes,grain,glow){
  const response=await fetch(`http://127.0.0.1:8799/?grain=${grain}&glow=${glow}`,{method:'POST',body:bytes,signal:AbortSignal.timeout(120000)});
  if(!response.ok)throw Error(await response.text());return Buffer.from(await response.arrayBuffer());
}
// Exercise the actual remote Images binding, not a mock of its blend semantics.
const pixels=Buffer.alloc(256*256*3,15);
for(let y=123;y<133;y++)for(let x=123;x<133;x++)for(let c=0;c<3;c++)pixels[(y*256+x)*3+c]=255;
for(let y=20;y<80;y++)for(let x=170;x<230;x++)for(let c=0;c<3;c++)pixels[(y*256+x)*3+c]=[230,175,140][c];
const input=await sharp(pixels,{raw:{width:256,height:256,channels:3}}).png().toBuffer();
const glowingBytes=await finish(input,0,100);
await writeFile(`${dir}/test-light-original.png`,input);await writeFile(`${dir}/test-light-glow.png`,glowingBytes);
const glowing=await sharp(glowingBytes).removeAlpha().raw().toBuffer();
console.log('Glow sample row',Array.from({length:40},(_,i)=>glowing[(128*256+110+i)*3]));
const clean=await sharp(await finish(input,0,0)).removeAlpha().raw().toBuffer();assert.deepEqual(clean,pixels,'zero controls preserve original pixels');
const fixtures=[['portrait','lab/mood-previews/hd/night-flash-20261011.jpg'],['night-lights','lab/mood-references/hong-kong-nights/03-shop-reflections.jpg']];
for(const [name,file] of fixtures){
  const base=await sharp(file).resize({width:1000,height:1000,fit:'inside',withoutEnlargement:true}).png().toBuffer();
  const outputs=[base];
  for(const [label,grain,glow] of [['light',30,30],['default',25,70],['strong',100,100]]){
    const bytes=await finish(base,grain,glow);await writeFile(`${dir}/${name}-${label}.png`,bytes);outputs.push(bytes);
  }
  const cells=[];for(let i=0;i<outputs.length;i++){
    const image=await sharp(outputs[i]).resize(360,520,{fit:'contain',background:'#151515'}).png().toBuffer();
    const label=Buffer.from(`<svg width="360" height="40"><rect width="360" height="40" fill="#151515"/><text x="18" y="26" fill="white" font-family="sans-serif" font-size="16">${['Original','Grain 30 / Glow 30','Grain 25 / Glow 70','Grain 100 / Glow 100'][i]}</text></svg>`);
    cells.push({input:image,left:360*i,top:40},{input:label,left:360*i,top:0});
  }
  await sharp({create:{width:1440,height:560,channels:3,background:'#151515'}}).composite(cells).jpeg({quality:92}).toFile(`${dir}/${name}-comparison.jpg`);
}
assert.ok(glowing[(128*256+135)*3]>pixels[(128*256+135)*3],'bright point should spread light');
assert.equal(glowing[(30*256+30)*3],15,'distant dark areas should remain dark');
const skin=(50*256+200)*3;
assert.ok(Math.abs(glowing[skin+1]/glowing[skin]-175/230)<.015,'warm skin must not shift orange');
assert.ok(Math.abs(glowing[skin+2]/glowing[skin]-140/230)<.015,'warm skin hue should remain stable');
console.log('Actual Cloudflare pixel checks passed. Original and three finishing strengths exported. No AI calls.');

// Midtone edge below the bloom threshold: only full-frame diffusion can soften it.
const edge=Buffer.alloc(256*64*3);
for(let y=0;y<64;y++)for(let x=0;x<256;x++)edge.fill(x<128?50:130,(y*256+x)*3,(y*256+x+1)*3);
const edgeInput=await sharp(edge,{raw:{width:256,height:64,channels:3}}).png().toBuffer();
const softened=await sharp(await finish(edgeInput,0,100)).removeAlpha().raw().toBuffer();
assert.ok(softened[(32*256+127)*3]>50,'diffusion reaches midtone foreground edges');
assert.ok(softened[(32*256+128)*3]<130,'diffusion softens the bright side too');
assert.equal(softened[(32*256+20)*3],50,'diffusion preserves distant dark flats');
console.log('Full-frame optical diffusion confirmed below the highlight threshold.');

async function finish35mm(bytes,{grain=0,haze=0,halation=0,film=0}={}){
  const query=new URLSearchParams({version:'2',grain:String(grain),haze:String(haze),halation:String(halation),film:String(film)});
  const response=await fetch('http://127.0.0.1:8799/?'+query,{method:'POST',body:bytes,signal:AbortSignal.timeout(120000)});
  if(!response.ok)throw Error('35mm remote renderer: '+await response.text());
  return Buffer.from(await response.arrayBuffer());
}
const offV2=await finish35mm(input);
assert.deepEqual(offV2,input,'all four sliders at zero return exact source bytes');
const fullV2=await finish35mm(input,{grain:36,haze:42,halation:22,film:65});
await writeFile(`${dir}/35mm-photochemical-default.png`,fullV2);
const gradeV2=await finish35mm(input,{film:100});
await writeFile(`${dir}/35mm-print-only.png`,gradeV2);
const gradePixels=await sharp(gradeV2).removeAlpha().raw().toBuffer();
const lamp=(126*256+126)*3;
assert.ok(gradePixels[lamp]>gradePixels[lamp+2],'35mm print curve warms white highlights');
const fullPixels=await sharp(fullV2).removeAlpha().raw().toBuffer();
assert.ok(fullPixels[(128*256+135)*3]>pixels[(128*256+135)*3],'light-source haze reaches around an existing lamp');
assert.ok(fullPixels[(30*256+30)*3]<40,'distant dark shadows remain dark');
const noLights=await sharp({create:{width:256,height:64,channels:3,background:{r:65,g:83,b:76}}}).png().toBuffer();
const noLightsWithHaze=await finish35mm(noLights,{haze:100,halation:100});
const noLightPixel=await sharp(noLightsWithHaze).removeAlpha().raw().toBuffer();
assert.ok(noLightPixel[0]<80&&noLightPixel[1]<95,'haze cannot invent a bright silhouette when no emitter exists');
console.log('Actual Cloudflare 35mm photochemical grade, haze, halation, grain and off-bypass checks passed; no AI generation.');

const deluxeAll=await finish35mm(input,{grain:100,haze:100,halation:100,film:100});
await writeFile(`${dir}/35mm-deluxe-full-100.png`,deluxeAll);
const deluxePixels=await sharp(deluxeAll).removeAlpha().raw().toBuffer();
assert.equal(deluxePixels.length,fullPixels.length,'deluxe full should preserve source dimensions');
assert.notDeepEqual(deluxePixels,fullPixels,'100/100/100/100 must be visibly distinct from the balanced finish');
console.log('Deluxe 100/100/100/100 rendered on real Cloudflare Images without additional AI inference.');

async function gradeWithEngine(bytes,engine,controls={grain:100,haze:100,halation:100,film:100}){
  const query=new URLSearchParams({engine,version:'2',...Object.fromEntries(Object.entries(controls).map(([k,v])=>[k,String(v)]))});
  const response=await fetch('http://127.0.0.1:8799/?'+query,{
    method:'POST',body:bytes,signal:AbortSignal.timeout(120000)
  });
  if(!response.ok)throw Error('V3 comparison '+engine+': '+await response.text());
  return Buffer.from(await response.arrayBuffer());
}
async function greenExcess(bytes,region){
  let image=sharp(bytes);
  if(region)image=image.extract(region);
  const data=await image.resize({width:Math.min(region?.width||400,400),fit:'inside',withoutEnlargement:true})
    .removeAlpha().raw().toBuffer({resolveWithObject:true});
  let total=0,chromatic=0,n=0;
  for(let i=0;i<data.data.length;i+=3){
    const [r,g,b]=data.data.subarray(i,i+3);
    total+=g-(r+b)*.5;chromatic+=Math.max(r,g,b)-Math.min(r,g,b);n++;
  }
  return {green:total/n,chroma:chromatic/n};
}
async function comparison(name,bytes){
  const older=await gradeWithEngine(bytes,'v6');
  const candidate=await gradeWithEngine(bytes,'v3');
  const original=await greenExcess(bytes),v6=await greenExcess(older),v3=await greenExcess(candidate);
  const labels=['Original','Approved V6','V3 candidate'],layers=[bytes,older,candidate],cells=[];
  for(let i=0;i<3;i++){
    const frame=await sharp(layers[i]).resize(360,420,{fit:'contain',background:'#151716'}).png().toBuffer();
    const title=Buffer.from('<svg width="360" height="32"><rect width="360" height="32" fill="#151716"/><text x="12" y="22" fill="#f4f1e8" font-size="15" font-family="sans-serif">'+labels[i]+'</text></svg>');
    cells.push({input:frame,left:i*360,top:32},{input:title,left:i*360,top:0});
  }
  await sharp({create:{width:1080,height:452,channels:3,background:'#151716'}}).composite(cells)
    .jpeg({quality:91}).toFile(`${dir}/v3-comparison-${name}.jpg`);
  console.log('V3 color comparison '+name+' '+JSON.stringify({original,v6,v3}));
  assert.equal((await sharp(candidate).metadata()).width,(await sharp(bytes).metadata()).width);
  return {original,v6,v3};
}
// Six physically interpretable swatches distinguish emerald, skin, neutral
// shadows and tungsten instead of measuring a global green overlay.
const printColors=[[32,75,65],[22,98,80],[40,128,106],[185,142,122],[14,26,24],[241,197,116]];
const card=Buffer.alloc(480*320*3);
for(let y=0;y<320;y++)for(let x=0;x<480;x++){
  const [r,g,b]=printColors[Math.floor(x/80)],o=(y*480+x)*3;
  card[o]=r;card[o+1]=g;card[o+2]=b;
}
const calibration=await sharp(card,{raw:{width:480,height:320,channels:3}}).png().toBuffer();
const summary=await comparison('six-film-colors',calibration);
const [oldEmerald,newEmerald]=await Promise.all(['v6','v3'].map(async engine=>{
  const bytes=await gradeWithEngine(calibration,engine,{grain:0,haze:0,halation:0,film:100});
  return greenExcess(bytes,{left:0,top:0,width:240,height:320});
}));
assert.ok(newEmerald.green>oldEmerald.green+2,'V3 must preserve visible emerald against V6');
for(const [name,asset] of [
  ['night-interior','lab/mood-references/hong-kong-nights/06-interior-portrait.jpg'],
  ['passage-haze','lab/mood-references/hong-kong-nights/05-passage-diffusion.jpg'],
  ['colored-city','lab/mood-references/hong-kong-nights/02-city-haze.jpg'],
  ['wet-street','lab/mood-references/hong-kong-nights/03-shop-reflections.jpg']
]){
  const original=await sharp(asset).resize({width:850,height:850,fit:'inside',withoutEnlargement:true}).png().toBuffer();
  await comparison(name,original);
}
// Controlled emitter on a dark field, processed with optical controls only.
const neonRaw=Buffer.alloc(320*256*3);
for(let y=0;y<256;y++)for(let x=0;x<320;x++){
 const px=(y*320+x)*3,d=(x-154)**2+(y-127)**2;
 const col=d<11**2?[12,211,122]:[13,23,21];
 neonRaw[px]=col[0];neonRaw[px+1]=col[1];neonRaw[px+2]=col[2];
}
const neon=await sharp(neonRaw,{raw:{width:320,height:256,channels:3}}).png().toBuffer();
const optics={grain:0,haze:100,halation:100,film:0};
const neonOld=await gradeWithEngine(neon,'v6',optics),neonNew=await gradeWithEngine(neon,'v3',optics);
await sharp(neonNew).png().toFile(`${dir}/v3-colored-practical.png`);
const at=(buf,width,x,y)=>buf[(y*width+x)*3+1];
const greenOld=await sharp(neonOld).removeAlpha().raw().toBuffer(),greenNew=await sharp(neonNew).removeAlpha().raw().toBuffer();
assert.ok(at(greenNew,320,171,127)>at(greenOld,320,171,127)+1,'V3 colored practical must diffuse more visibly');
assert.ok(at(greenNew,320,20,20)<38,'Unlit dark corner stays dark');
console.log('V3 Cloudflare comparisons passed. V3 is now production default; explicit V6 comparison remains available. No AI generation.');


// The portrait / interior / street comparisons only run the existing film
// finishing engine. They never call SpicyAPI or spend any credits.
const hkControls={grain:12,haze:24,halation:18,film:15};
for(const [name,file] of [
  ['portrait','lab/mood-previews/hd/night-flash-20261011.jpg'],
  ['interior','lab/mood-references/hong-kong-nights/06-interior-portrait.jpg'],
  ['street','lab/mood-references/hong-kong-nights/03-shop-reflections.jpg']
]){
  const base=await sharp(file).resize({width:850,height:850,fit:'inside',withoutEnlargement:true}).png().toBuffer();
  const older=await gradeWithEngine(base,'v3',hkControls);
  const improved=await gradeWithEngine(base,'v8',hkControls);
  const originalPixels=await sharp(base).removeAlpha().raw().toBuffer();
  const oldPixels=await sharp(older).removeAlpha().raw().toBuffer();
  const newPixels=await sharp(improved).removeAlpha().raw().toBuffer();
  assert.equal(newPixels.length,originalPixels.length);
  let oldError=0,newError=0,difference=0,midPixels=0;
  for(let i=0;i<originalPixels.length;i+=3){
    const l=(.2126*originalPixels[i]+.7152*originalPixels[i+1]+.0722*originalPixels[i+2])/255;
    if(l<.18||l>.78)continue;
    midPixels++;
    for(let c=0;c<3;c++){
      oldError+=Math.abs(originalPixels[i+c]-oldPixels[i+c]);
      newError+=Math.abs(originalPixels[i+c]-newPixels[i+c]);
      difference+=Math.abs(oldPixels[i+c]-newPixels[i+c]);
    }
  }
  assert.ok(midPixels>1000,name+' needs a real textured photograph');
  assert.ok(difference>0,name+' optical upgrade must have a visible pixel effect');
  assert.ok(newError<=oldError*1.035,name+' should retain at least as much midtone detail');
  const assets=[base,older,improved],captions=['Original','Existing V3 finish','New V8 finish'],composite=[];
  for(let col=0;col<3;col++){
    const image=await sharp(assets[col]).resize(370,465,{fit:'contain',background:'#151716'}).png().toBuffer();
    const label=Buffer.from('<svg width="370" height="35"><rect width="370" height="35" fill="#151716"/><text x="14" y="24" fill="#f4f2ed" font-family="sans-serif" font-size="16">'+captions[col]+'</text></svg>');
    composite.push({input:image,left:col*370,top:35},{input:label,left:col*370,top:0});
  }
  await sharp({create:{width:1110,height:500,channels:3,background:'#151716'}})
    .composite(composite).jpeg({quality:91}).toFile(dir+'/hong-kong-v8-'+name+'-ab.jpg');
  console.log('HONG_KONG_V8_AB '+name+' '+JSON.stringify({midPixels,oldError,newError,difference}));
}

// Stress A/B mirrors the high-haze manual values shown in the owner's
// October 19 screenshots. This is finishing only, not paid AI generation.
const stressed={grain:53,haze:98,halation:0,film:100};
for(const [name,file] of [
  ['portrait','lab/mood-previews/hd/night-flash-20261011.jpg'],
  ['interior','lab/mood-references/hong-kong-nights/06-interior-portrait.jpg'],
  ['street','lab/mood-references/hong-kong-nights/03-shop-reflections.jpg']
]){
  const original=await sharp(file).resize({width:850,height:850,fit:'inside',withoutEnlargement:true}).png().toBuffer();
  const oldFilm=await gradeWithEngine(original,'v3',stressed);
  const v8Film=await gradeWithEngine(original,'v8',stressed);
  const captions=['Original','V3 high haze','V8 high haze'],layers=[original,oldFilm,v8Film],cells=[];
  for(let col=0;col<3;col++){
    const frame=await sharp(layers[col]).resize(370,465,{fit:'contain',background:'#151716'}).png().toBuffer();
    const label=Buffer.from('<svg width="370" height="35"><rect width="370" height="35" fill="#151716"/><text x="14" y="24" fill="#f4f2ed" font-family="sans-serif" font-size="16">'+captions[col]+'</text></svg>');
    cells.push({input:frame,left:col*370,top:35},{input:label,left:col*370,top:0});
  }
  await sharp({create:{width:1110,height:500,channels:3,background:'#151716'}})
    .composite(cells).jpeg({quality:91}).toFile(dir+'/hong-kong-v8-'+name+'-high-haze-ab.jpg');
  console.log('HONG_KONG_V8_HIGH_HAZE_AB '+name+' saved');
}


// V9 visual acceptance pack: identical inputs, distinct high-value optical
// rendering only. This contacts the existing Images test binding, never the AI
// image provider and never a customer wallet.
const ownerV9Controls={grain:29,haze:100,halation:100,film:100};
for(const [name,file] of [
  ['portrait','lab/mood-previews/hd/night-flash-20261011.jpg'],
  ['interior','lab/mood-references/hong-kong-nights/06-interior-portrait.jpg'],
  ['street','lab/mood-references/hong-kong-nights/03-shop-reflections.jpg']
]){
  const src=await sharp(file).resize({width:850,height:850,fit:'inside',withoutEnlargement:true}).png().toBuffer();
  const v8=await gradeWithEngine(src,'v8',ownerV9Controls);
  const v9=await gradeWithEngine(src,'v9',ownerV9Controls);
  const oldPixels=await sharp(v8).removeAlpha().raw().toBuffer();
  const newPixels=await sharp(v9).removeAlpha().raw().toBuffer();
  assert.equal(oldPixels.length,newPixels.length,name+' V9 preserves dimensions');
  let changed=0;
  for(let i=0;i<oldPixels.length;i++)changed+=Math.abs(oldPixels[i]-newPixels[i]);
  assert.ok(changed>0,name+' high Haze/Halation must not silently return V8');
  const cells=[],frames=[src,v8,v9],labels=['Original','V8 high optics','V9 high optics'];
  for(let i=0;i<3;i++){
    const frame=await sharp(frames[i]).resize(370,465,{fit:'contain',background:'#151716'}).png().toBuffer();
    const label=Buffer.from('<svg width="370" height="35"><rect width="370" height="35" fill="#151716"/><text x="14" y="24" fill="#f4f2ed" font-family="sans-serif" font-size="16">'+labels[i]+'</text></svg>');
    cells.push({input:frame,left:i*370,top:35},{input:label,left:i*370,top:0});
  }
  await sharp({create:{width:1110,height:500,channels:3,background:'#151716'}})
    .composite(cells).jpeg({quality:91}).toFile(dir+'/hong-kong-v9-'+name+'-high-optics-ab.jpg');
  console.log('HONG_KONG_V9_AB '+name+' changed='+(changed/oldPixels.length).toFixed(3));
}
