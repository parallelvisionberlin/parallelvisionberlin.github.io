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
 for(const width of [320,390,1440,1905,1905.5,2116.6667,2194.4444]){
  for(const mode of ['image','assets','upscale']){
   const ancestor=mode==='image'?'class="image-studio"':mode==='assets'?'id="assets-gallery"':'';
   await page.setContent(`<style>${css}</style><div id="app" class="${mode}-studio-active"><section ${ancestor}><div id="history" style="width:${width}px">${Array.from({length:24},(_,i)=>`<article class="card" data-ratio="${ratios[i%ratios.length]}"></article>`).join('')}</div></section></div>`);
   await page.addScriptTag({content:source,type:'module'});
   await page.waitForFunction(()=>document.querySelector('#history .card').style.width);
   const result=await page.evaluate(()=>{
    const gallery=document.getElementById('history'),bounds=gallery.getBoundingClientRect(),rows=[];
    for(const card of gallery.children){const r=card.getBoundingClientRect();let row=rows.at(-1);if(!row||Math.abs(row.top-r.top)>.1){row={top:r.top,right:r.right,heights:[]};rows.push(row);}row.right=r.right;row.heights.push(r.height);}
    return {right:bounds.right,rows};
   });
   assert.ok(result.rows.length>1);
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
 console.log('GALLERY_ROW_FIT_CHECKS_PASSED='+checks);
}finally{await browser.close();}
