// Browser-only diagnostic. No credentials, network APIs, paid jobs or stored images.
import http from 'node:http';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const baseline={};
for(const file of ['image-tools.js','image-worker.js']){
  baseline[file]=execFileSync('git',['show','origin/main:lab/'+file],{encoding:'utf8'});
}
const current={
  'image-tools.js':readFileSync('lab/image-tools.js','utf8'),
  'image-worker.js':readFileSync('lab/image-worker.js','utf8')
};
assert.notEqual(baseline['image-tools.js'],current['image-tools.js'],'Run on a PR with a code change');
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1'),parts=url.pathname.split('/').filter(Boolean);
  if(parts.length===0){res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><title>Preview timing</title>');return;}
  const [variant,file]=parts;
  const source=(variant==='baseline'?baseline:variant==='candidate'?current:null)?.[file];
  if(!source){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'}).end(source);
});
await new Promise(resolve=>server.listen(4189,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
try{
  const results=[];
  for(const variant of ['baseline','candidate']){
    const context=await browser.newContext({viewport:{width:1280,height:800}});
    const page=await context.newPage();
    await page.goto('http://127.0.0.1:4189/');
    const result=await page.evaluate(async variant=>{
      const tools=await import('/'+variant+'/image-tools.js?v=bench1');
      const canvas=new OffscreenCanvas(6200,6000);
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='#67839d';ctx.fillRect(0,0,6200,6000);
      for(let i=0;i<80;i++){ctx.fillStyle=`rgb(${i*3},${(i*5)%255},${(i*11)%255})`;ctx.fillRect(i*71,0,52,6000);}
      const jpg=await canvas.convertToBlob({type:'image/jpeg',quality:.9});
      canvas.width=canvas.height=0;
      const file=new File([jpg],'synthetic-large-camera.jpg',{type:'image/jpeg'});
      const coldStart=performance.now();
      const first=await tools.imageReferencePreview(file);
      const coldMs=Math.round(performance.now()-coldStart);
      const background=tools.seedreamWorkingCopy(file);
      // The browser's first preparation worker can begin the large copy.
      await new Promise(resolve=>setTimeout(resolve,80));
      const underLoadStart=performance.now();
      const second=await tools.imageReferencePreview(file);
      const duringHeavyMs=Math.round(performance.now()-underLoadStart);
      const workingCopy=await background;
      tools.cancelImagePreparation();
      return {variant,jpegBytes:file.size,pixels:6200*6000,coldMs,duringHeavyMs,
        referenceDimensions:[first.width,first.height],thumbBytes:first.thumbnail.size,
        secondThumbBytes:second.thumbnail.size,workingBytes:workingCopy.size};
    },variant);
    results.push(result);
    await context.close();
  }
  for(const result of results)console.log('REFERENCE_PREVIEW_BROWSER_TIMING '+JSON.stringify(result));
  const baselineBusy=results[0].duringHeavyMs,candidateBusy=results[1].duringHeavyMs;
  console.log('REFERENCE_PREVIEW_BUSY_DELTA_MS='+Math.round(baselineBusy-candidateBusy));
  assert.equal(results[0].pixels,results[1].pixels);
  assert.deepEqual(results[0].referenceDimensions,results[1].referenceDimensions);
  assert.ok(results.every(r=>r.thumbBytes>0&&r.workingBytes>0));
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
