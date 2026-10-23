import assert from 'node:assert/strict';
import {readFile, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {signupWelcomeMessage} from '../lab-worker/signup-welcome-email.mjs';

const {chromium}=await import(process.env.PV_PLAYWRIGHT_MODULE||'playwright');
const artifacts=resolve(process.env.PV_UI_ARTIFACTS||'/tmp/pvlab-welcome-email');
await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({headless:true});
const {html}=signupWelcomeMessage();
const assets={
  'welcome-hero-horizontal.jpg':'lab/email/welcome-hero-horizontal.jpg',
  'welcome-detail-1.jpg':'lab/email/welcome-detail-1.jpg',
  'welcome-detail-2.jpg':'lab/email/welcome-detail-2.jpg',
  'welcome-detail-3.jpg':'lab/email/welcome-detail-3.jpg'
};
try{
  for(const [width,height] of [[1440,900],[1100,850],[768,900],[430,900],[390,844],[320,740]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://pvlab.studio/email/**',async route=>{
      const name=route.request().url().split('/').at(-1);
      if(!Object.hasOwn(assets,name))return route.abort();
      await route.fulfill({status:200,contentType:'image/jpeg',body:await readFile(resolve(assets[name]))});
    });
    await page.setContent(html,{waitUntil:'load'});
    // Simulate Gmail's centered message reading pane on wide screens,
    // without changing the real email markup or its client breakpoints.
    await page.evaluate(()=>{
      const wrapper=document.createElement('main');
      wrapper.id='gmail-reading-pane';
      wrapper.style.cssText='box-sizing:border-box;max-width:1180px;width:100%;margin:auto;';
      while(document.body.firstChild)wrapper.append(document.body.firstChild);
      document.body.append(wrapper);
    });
    await page.waitForFunction(()=>[...document.images].length===4&&[...document.images].every(x=>x.complete&&x.naturalWidth>0));
    const boxes=await page.evaluate(()=>{
      const rect=selector=>{
        const e=document.querySelector(selector);
        if(!e)throw Error('Missing '+selector);
        const {x,y,width,height,right,bottom}=e.getBoundingClientRect();
        return {x,y,width,height,right,bottom};
      };
      const cols=[...document.querySelectorAll('.pv-col')].map(x=>{
        const {x:xx,y,width,height,right,bottom}=x.getBoundingClientRect();
        return {x:xx,y,width,height,right,bottom};
      });
      const actions=[...document.querySelectorAll('.pv-action-col')].map(x=>{
        const {x:xx,y,width,height,right,bottom}=x.getBoundingClientRect();
        return {x:xx,y,width,height,right,bottom};
      });
      return {body:rect('body'),card:rect('.pv-card'),hero:rect('img[src*="welcome-hero-horizontal"]'),
        title:rect('.pv-title'),text:rect('.pv-description'),columns:cols,
        actionColumns:actions,button:rect('a[href="https://pvlab.studio/"]:last-child'),
        viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
        imageCount:document.images.length};
    });
    assert.equal(boxes.imageCount,4);
    assert.ok(boxes.card.width<=Math.min(width,822)+1,'Message overflow '+width+': '+JSON.stringify(boxes));
    assert.ok(boxes.scrollWidth<=width+1,'Horizontal scrolling on '+width+': '+JSON.stringify(boxes));
    assert.ok(boxes.hero.width<=boxes.card.width+1,'Hero overflows '+width);
    assert.ok(boxes.columns.length===2&&boxes.actionColumns.length===2);
    if(width>=1100){
      assert.ok(boxes.columns[1].x>boxes.columns[0].x+200,
        'Desktop must show real side-by-side copy, not a phone poster: '+JSON.stringify(boxes.columns));
      assert.ok(Math.abs(boxes.actionColumns[1].y-boxes.actionColumns[0].y)<30,
        'Desktop actions must align horizontally');
    }
    if(width<=430){
      assert.ok(boxes.columns[1].y>=boxes.columns[0].bottom-1,
        'Mobile title and body must stack: '+JSON.stringify(boxes.columns));
      assert.ok(boxes.actionColumns[1].y>=boxes.actionColumns[0].bottom-1,
        'Mobile CTA and secondary link must stack');
    }
    assert.deepEqual(errors,[]);
    const file=artifacts+'/welcome-'+width+'.png';
    await page.screenshot({path:file,fullPage:true});
    console.log('PASS welcome email '+width+'px '+JSON.stringify({
      cardWidth:Math.round(boxes.card.width),
      heroWidth:Math.round(boxes.hero.width),
      layout:width>1000?'editorial columns':width<=430?'mobile stacked':'fluid',
      horizontalOverflow:boxes.scrollWidth>width
    }));
    await context.close();
  }
}finally{await browser.close();}
