// Synthetic cards and real gallery CSS only. No accounts, uploads or provider calls.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import http from 'node:http';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({headless:true,...(process.env.PV_CHROMIUM_EXECUTABLE?{executablePath:process.env.PV_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-gpu']}: {})});
const css=['lab/lab.css','lab/image-studio.css','lab/assets.css'].map(p=>readFileSync(p,'utf8')).join('\n');
const source=readFileSync('lab/gallery-layout.js','utf8');
const ratios=[16/9,16/9,16/9,16/9,16/9,16/9,9/16,4/3,16/9,1];
const html=readFileSync('lab/studio.html','utf8');
const archiveStart=html.indexOf('<div class="archivehead">',html.indexOf('id="archive-rest-anchor"'));
const toolbar=html.slice(archiveStart,html.indexOf('<div id="history-selection"',archiveStart));
const toolbarCss=[...html.matchAll(/<link[^>]+href="\.\/([^"?]+\.css)[^"]*"/g)].map(match=>readFileSync('lab/'+match[1],'utf8')).join('\n');
const server=http.createServer((req,res)=>{
 const width=Number(new URL(req.url,'http://localhost').searchParams.get('width'))||1440;
 res.setHeader('Content-Type','text/html');
 res.end(`<style>${toolbarCss}\nbody{margin:0}</style><div id="app" class="image-studio-active"><section class="image-studio"><section class="archive">${toolbar}<div id="history" style="width:${width}px;max-width:100%">${Array.from({length:24},(_,i)=>`<article class="card" data-kind="image" data-id="${i}" data-ratio="0.5625"></article>`).join('')}</div></section></section></div><script type="module">${source}</script>`);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
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
 const context=await browser.newContext();
 const settings=await context.newPage();
 for(const width of [320,390,768,1440,1905.5]){
  await settings.setViewportSize({width:Math.ceil(width),height:1000});
  await settings.goto(`http://127.0.0.1:${server.address().port}/?width=${width}`);
  await settings.evaluate(()=>localStorage.removeItem('pv.lab.imageGallery.cardSize.v1'));
  await settings.reload();
  await settings.waitForFunction(()=>document.getElementById('history').dataset.cardSize==='medium');
  const eye=await settings.locator('#history-preview-toggle').boundingBox();
  assert.ok(await settings.locator('.archivehead>div').first().evaluate(el=>getComputedStyle(el).clipPath==='inset(50%)'),'History remains an accessible, visually hidden heading');
  for(const [size,index] of [['small',0],['medium',1],['large',2]]){
   await settings.locator('#image-gallery-view>summary').click();
   const menu=await settings.locator('.image-gallery-view-panel').boundingBox();
   assert.ok(menu.x>=0&&menu.x+menu.width<=Math.ceil(width)+1,'View menu fits the viewport');
   if(size==='medium'&&[320,1440].includes(width))await settings.screenshot({path:`/tmp/pv-gallery-view-${width}.png`});
   await settings.locator(`[data-gallery-size="${size}"]`).click();
   await settings.waitForFunction(size=>document.getElementById('history').dataset.cardSize===size,size);
   const columns=(width<=740?[3,2,1]:width<=1020?[4,3,2]:[6,4,3])[index];
   await settings.waitForFunction(columns=>{
    const cards=[...document.querySelector('#history').children],top=cards[0].getBoundingClientRect().top;
    return cards.filter(card=>Math.abs(card.getBoundingClientRect().top-top)<.1).length===columns;
   },columns);
   assert.equal(await settings.locator(`[data-gallery-size="${size}"]`).getAttribute('aria-pressed'),'true');
   assert.equal(await settings.locator('#image-gallery-view').evaluate(el=>el.open),false);
   assert.deepEqual(await settings.locator('#history .card').evaluateAll(cards=>cards.map(c=>Number(c.dataset.id))),Array.from({length:24},(_,i)=>i),'Size changes preserve chronological order');
   const currentEye=await settings.locator('#history-preview-toggle').boundingBox();
   assert.ok(Math.abs(currentEye.x-eye.x)<1&&Math.abs(currentEye.y-eye.y)<1,'Discreet Mode stays anchored');
   assert.ok(await settings.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Gallery controls do not cause horizontal overflow');
   checks++;
  }
  await settings.reload();
  await settings.waitForFunction(()=>document.getElementById('history').dataset.cardSize==='large');
  assert.equal(await settings.locator('[data-gallery-size="large"]').getAttribute('aria-pressed'),'true','Photo size survives reload');
  await settings.locator('#image-gallery-view>summary').click();
  await settings.keyboard.press('Escape');
  assert.equal(await settings.locator('#image-gallery-view').evaluate(el=>el.open),false);
  await settings.locator('#image-gallery-view>summary').click();
  await settings.locator('#refresh').click();
  assert.equal(await settings.locator('#image-gallery-view').evaluate(el=>el.open),false,'Outside click closes the menu');
  await settings.evaluate(()=>document.getElementById('app').classList.add('pv-moods-discovery-open'));
  assert.equal(await settings.locator('#image-gallery-view').isVisible(),false,'No card-size control in Inspiration');
  await settings.evaluate(()=>{document.getElementById('app').classList.remove('pv-moods-discovery-open');localStorage.setItem('pv.lab.imageGallery.cardSize.v1','invalid');});
  await settings.reload();
  await settings.waitForFunction(()=>document.getElementById('history').dataset.cardSize==='medium');
 }
 // Blocked browser storage must not prevent a size change.
 await settings.evaluate(()=>Object.defineProperty(Storage.prototype,'setItem',{value(){throw new Error('storage unavailable');}}));
 await settings.locator('#image-gallery-view>summary').click();
 await settings.locator('[data-gallery-size="small"]').click();
 await settings.waitForFunction(()=>document.getElementById('history').dataset.cardSize==='small');
 await context.close();
 checks++;
 console.log('GALLERY_ROW_FIT_CHECKS_PASSED='+checks);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
