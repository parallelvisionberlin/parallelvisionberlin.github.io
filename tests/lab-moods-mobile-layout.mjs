import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE||resolve('mobile-app/node_modules/@playwright/test/index.mjs')).href);
const root=resolve('.');mkdirSync('test-results',{recursive:true});
const server=createServer((req,res)=>{
 const path=resolve(root,'.'+new URL(req.url,'http://local').pathname);
 if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}
 let data=readFileSync(path);
 if(path.endsWith('/moods.html'))data=Buffer.from(data.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
 const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
 res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');res.end(data);
});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
try{
 const original=execFileSync('git',['show','7417ac9f2d1081b5150b339fe68528f5b4d0d852:lab/explore-moods-photobooth.css'],{encoding:'utf8'});
 const changed=readFileSync('lab/explore-moods-photobooth.css','utf8');
 for(const [width,height] of [[390,844],[320,640],[430,932],[1440,1000]]){
  const states=[];
  for(const [mode,css] of [['before',original],['after',changed]]){
   const page=await browser.newPage({viewport:{width,height}});
   await page.route('**/explore-moods-photobooth.css*',r=>r.fulfill({contentType:'text/css',body:css}));
   await page.goto(origin+'/lab/moods.html');
   await page.evaluate(()=>{
    const d=document.getElementById('mc-look-dialog'),im=document.getElementById('mc-look-preview');
    im.src=document.querySelector('[data-mood-id="night-flash"] img').getAttribute('src');im.dataset.moodId='night-flash';
    document.getElementById('mc-look-title').textContent='Night Flash';
    d.showModal();
   });
   await page.evaluate(()=>document.fonts.ready);
   const s=await page.evaluate(()=>{
    const el=id=>document.getElementById(id),box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom}};
    const header=document.querySelector('.mc-photobooth-header'),media=document.querySelector('.mc-look-dialog-media');
    return{dialog:box(el('mc-look-dialog')),hero:box(media),header:box(header),headerPosition:getComputedStyle(header).position,
     photoTransform:getComputedStyle(el('mc-look-preview')).transform,button:box(el('mc-look-continue')),
     title:box(el('mc-look-title')),drop:box(el('mc-look-dropzone')),
     arrowContent:getComputedStyle(el('mc-look-continue'),'::after').content,
     arrowMask:getComputedStyle(el('mc-look-continue'),'::after').maskImage,
     browseFont:getComputedStyle(document.querySelector('.mc-photobooth-browse>span')).fontSize,
     overflow:document.documentElement.scrollWidth>innerWidth};
   });states.push(s);
   if(mode==='after'){
    if(width<=600){
     assert.equal(s.headerPosition,'absolute');assert.ok(Math.abs(s.hero.y-s.dialog.y-1)<2,'photo starts at card top');
     assert.equal(s.photoTransform,'none');assert.equal(s.arrowContent,'""');assert.notEqual(s.arrowMask,'none');assert.equal(s.browseFont,'0px');
     assert.ok(s.button.bottom<=s.dialog.bottom,'Generate stays inside card');assert.equal(s.overflow,false);
    }
    await page.screenshot({path:'test-results/moods-mobile-top-'+width+'.png'});
   }await page.close();
  }
  if(width>600)assert.deepEqual(states[0],states[1],'desktop presentation must be identical');
  console.log('PASS Moods mobile photo/header/vector arrows and desktop isolation',width,height);
 }
}finally{await browser.close();server.close();}
