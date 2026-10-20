import sharp from 'sharp';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='test-results/hk-optics-v10';await mkdir(dir,{recursive:true});
async function render(bytes,engine,settings){const q=new URLSearchParams({version:'2',engine,grain:0,haze:0,halation:0,film:0,...settings});const response=await fetch('http://127.0.0.1:8799/?'+q,{method:'POST',body:bytes,signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error(engine+' '+await response.text());return Buffer.from(await response.arrayBuffer());}
const raw=Buffer.alloc(192*128*3,24);for(let y=22;y<78;y++)for(let x=127;x<166;x++)for(let c=0;c<3;c++)raw[(y*192+x)*3+c]=[224,216,192][c];
const base=await sharp(raw,{raw:{width:192,height:128,channels:3}}).png().toBuffer();
const off=await render(base,'v10',{});assert.deepEqual(off,base,'zero settings must return exact source bytes');
const strengths=[];
for(const n of [30,60,100]){const bytes=await render(base,'v10',{haze:n,halation:n});const pixels=await sharp(bytes).removeAlpha().raw().toBuffer();const mean=pixels.reduce((a,v,i)=>a+Math.abs(v-raw[i]),0)/pixels.length;strengths.push(mean);await writeFile(dir+'/synthetic-'+n+'.png',bytes);assert.equal(pixels[(127*192)*3],24,'unlit far corner must remain unchanged');}
assert.ok(strengths[2]>strengths[0]*2,'100% must be much more visible than 30%');assert.ok(strengths[2]>strengths[1]);
const mid=Buffer.alloc(192*128*3,75),midPng=await sharp(mid,{raw:{width:192,height:128,channels:3}}).png().toBuffer();
const midOut=await sharp(await render(midPng,'v10',{haze:100,halation:100})).removeAlpha().raw().toBuffer();assert.deepEqual(midOut,mid,'no light source means no blanket haze or altered exposure');
const report={engine:10,syntheticStrengthMeanDifferences:strengths,fixtures:[],noAiGeneration:true};
for(const [name,file] of [['portrait','lab/mood-previews/hd/night-flash-20261011.jpg'],['interior','lab/mood-references/hong-kong-nights/06-interior-portrait.jpg'],['street','lab/mood-references/hong-kong-nights/03-shop-reflections.jpg']]){
 const input=await sharp(await readFile(file)).resize({width:900,height:900,fit:'inside',withoutEnlargement:true}).png().toBuffer();
 const outputs=[input];
 for(const [label,engine,settings] of [['v8','v8',{grain:23,haze:100,halation:100,film:100}],['v10-60','v10',{grain:23,haze:60,halation:60,film:100}],['v10-100','v10',{grain:23,haze:100,halation:100,film:100}]]){const b=await render(input,engine,settings);outputs.push(b);await writeFile(dir+'/'+name+'-'+label+'.png',b);}
 const a=await sharp(outputs[1]).removeAlpha().raw().toBuffer(),b=await sharp(outputs[3]).removeAlpha().raw().toBuffer();assert.equal(a.length,b.length);const mean=a.reduce((n,v,i)=>n+Math.abs(v-b[i]),0)/a.length;assert.ok(mean>1,name+' new optics must not silently return V8');report.fixtures.push({name,meanDifferenceFromV8:mean});
 const cells=[];for(let i=0;i<outputs.length;i++){const image=await sharp(outputs[i]).resize(360,460,{fit:'contain',background:'#151515'}).png().toBuffer();const label=Buffer.from('<svg width="360" height="32"><rect width="360" height="32" fill="#151515"/><text x="12" y="22" fill="white" font-family="sans-serif" font-size="14">'+['Original','Previous V8 / max','New optics / 60','New optics / 100'][i]+'</text></svg>');cells.push({input:image,left:i*360,top:32},{input:label,left:i*360,top:0});}
 await sharp({create:{width:1440,height:492,channels:3,background:'#151515'}}).composite(cells).jpeg({quality:92}).toFile(dir+'/'+name+'-comparison.jpg');
}
await writeFile(dir+'/verification.json',JSON.stringify(report,null,2));console.log('HK_V10_REMOTE_PASS',JSON.stringify(report));
