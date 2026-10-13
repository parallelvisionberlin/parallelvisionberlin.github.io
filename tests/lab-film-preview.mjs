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
