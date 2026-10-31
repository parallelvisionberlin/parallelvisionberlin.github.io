// Synthetic cards and real gallery CSS only. No accounts, uploads or provider calls.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({headless:true,...(process.env.PV_CHROMIUM_EXECUTABLE?{executablePath:process.env.PV_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-gpu']}: {})});
const css=['lab/lab.css','lab/image-studio.css','lab/assets.css'].map(p=>readFileSync(p,'utf8')).join('\n');
const source=readFileSync('lab/gallery-layout.js','utf8');
const ratios=[16/9,16/9,16/9,16/9,16/9,16/9,9/16,4/3,16/9,1];
let checks=0;
try{
 const page=await browser.newPage({viewport:{width:2400,height:1000}});
 // The fractional widths reproduce the layout rounding exposed by desktop
 // browser zoom. Integer widths cover the unchanged 100% geometry.
 for(const width of [320,390,740,768,1020,1024,1440,1905,1905.5,2116.6667,2194.4444]){
  await page.setViewportSize({width:Math.ceil(width),height:1000});
  for(const mode of ['image','assets','upscale']){
   const ancestor=mode==='image'?'class="image-studio"':mode==='assets'?'id="assets-gallery"':'';
   await page.setContent(`<style>${css}</style><div id="app" class="${mode}-studio-active"><section ${ancestor}><div id="history" style="width:${width}px">${Array.from({length:24},(_,i)=>`<article class="card" data-ratio="${ratios[i%ratios.length]}"></article>`).join('')}</div></section></div>`);
   await page.addScriptTag({content:source,type:'module'});
   await page.waitForFunction(()=>document.querySelector('#history .card').style.width);
   const result=await page.evaluate(()=>{
    const gallery=document.getElementById('history'),bounds=gallery.getBoundingClientRect(),rows=[];
    for(const card of gallery.children){const r=card.getBoundingClientRect();let row=rows.at(-1);if(!row||Math.abs(row.top-r.top)>.1){row={top:r.top,right:r.right,heights:[]};rows.push(row);}row.right=r.right;row.heights.push(r.height);}
    return {right:bounds.right,rows,ratios:[...gallery.children].map(card=>{const r=card.getBoundingClientRect();return r.width/r.height;})};
   });
   assert.ok(result.rows.length>1);
   if(mode==='image'){
    const columns=width<=740?2:width<=1020?3:4;
    assert.equal(result.rows.length,24/columns,'Image rows use the selected responsive count');
    for(const row of result.rows)assert.equal(row.heights.length,columns,'Each complete Image row has the expected number of results');
    result.ratios.forEach((ratio,i)=>assert.ok(Math.abs(ratio-ratios[i%ratios.length])<.002,'Image cards retain their original proportions'));
   }
   for(const row of result.rows.slice(0,-1)){
    const gap=result.right-row.right;
    assert.ok(gap>=-.05&&gap<1.1,`${mode}, width ${width}: completed row must reach its right edge; gap=${gap}`);
    assert.ok(row.heights.every(h=>Math.abs(h-row.heights[0])<.1),'A completed row retains one shared image height');
   }
   if(mode==='image'&&width===1905.5){
    await page.evaluate(()=>document.documentElement.classList.add('pv-native-lab'));
    await page.waitForFunction(()=>document.querySelector('#history').classList.contains('native-gallery-grid'));
    assert.equal(await page.locator('.card').first().evaluate(el=>el.style.width),'','Native gallery clears desktop widths');
    assert.equal(await page.locator('.card').first().evaluate(el=>el.classList.contains('native-gallery-wide')),true);
   }
   checks++;
  }
 }
 // Four 9:16 results must form one tall row, rather than many small portraits.
 await page.setContent(`<style>${css}</style><div id="app" class="image-studio-active"><section class="image-studio"><div id="history" style="width:1905.5px">${Array.from({length:7},()=>'<article class="card" data-ratio="0.5625"></article>').join('')}</div></section></div>`);
 await page.addScriptTag({content:source,type:'module'});
 await page.waitForFunction(()=>document.querySelector('#history .card').style.width);
 const portraits=await page.locator('.card').evaluateAll(cards=>cards.map(card=>{const r=card.getBoundingClientRect();return {width:r.width,height:r.height,top:r.top};}));
 assert.ok(portraits.slice(0,4).every(card=>card.top===portraits[0].top&&card.height>840));
 assert.ok(portraits.slice(4).every(card=>card.top>portraits[0].top&&Math.abs(card.width-portraits[0].width)<.1),'Partial last row does not enlarge remaining portraits');
 checks++;
 console.log('GALLERY_ROW_FIT_CHECKS_PASSED='+checks);
}finally{await browser.close();}
