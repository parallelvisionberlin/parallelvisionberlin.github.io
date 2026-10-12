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
for(const stage of ['mask','blur']){
  const r=await fetch('http://127.0.0.1:8799/?stage='+stage,{method:'POST',body:input});
  const bytes=Buffer.from(await r.arrayBuffer());await writeFile(`${dir}/test-light-${stage}.png`,bytes);
  const values=await sharp(bytes).removeAlpha().raw().toBuffer();console.log(stage,Array.from({length:40},(_,i)=>values[(128*256+110+i)*3]));
}
const clean=await sharp(await finish(input,0,0)).removeAlpha().raw().toBuffer();assert.deepEqual(clean,pixels,'zero controls preserve original pixels');
const fixtures=[['portrait','lab/mood-previews/hd/night-flash-20261011.jpg'],['night-lights','lab/mood-references/hong-kong-nights/03-shop-reflections.jpg']];
for(const [name,file] of fixtures){
  const base=await sharp(file).resize({width:1000,height:1000,fit:'inside',withoutEnlargement:true}).png().toBuffer();
  const outputs=[base];
  for(const [label,grain,glow] of [['light',30,30],['default',65,65],['strong',100,100]]){
    const bytes=await finish(base,grain,glow);await writeFile(`${dir}/${name}-${label}.png`,bytes);outputs.push(bytes);
  }
  const cells=[];for(let i=0;i<outputs.length;i++){
    const image=await sharp(outputs[i]).resize(360,520,{fit:'contain',background:'#151515'}).png().toBuffer();
    const label=Buffer.from(`<svg width="360" height="40"><rect width="360" height="40" fill="#151515"/><text x="18" y="26" fill="white" font-family="sans-serif" font-size="16">${['Original','Grain 30 / Glow 30','Grain 65 / Glow 65','Grain 100 / Glow 100'][i]}</text></svg>`);
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
