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
const input=await sharp(pixels,{raw:{width:256,height:256,channels:3}}).png().toBuffer();
const glowing=await sharp(await finish(input,0,100)).removeAlpha().raw().toBuffer();
assert.ok(glowing[(128*256+135)*3]>pixels[(128*256+135)*3],'bright point should spread light');
assert.equal(glowing[(30*256+30)*3],15,'distant dark areas should remain dark');
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
console.log('Actual Cloudflare pixel checks passed. Original and three finishing strengths exported. No AI calls.');
