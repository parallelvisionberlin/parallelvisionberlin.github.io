import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {signupWelcomeMessage} from '../lab-worker/signup-welcome-email.mjs';
const {chromium}=await import(process.env.PV_PLAYWRIGHT_MODULE||'playwright');
const artifacts=resolve(process.env.PV_UI_ARTIFACTS||'/tmp/pvlab-welcome-email');
await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({headless:true});
const {html}=signupWelcomeMessage();
try{
  for(const [width,height] of [[1440,900],[1100,850],[768,900],[600,850],[430,900],[390,844],[320,740]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
    const page=await context.newPage(),errors=[],media=new Set();
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://pvlab.studio/email/**',async route=>{
      const name=route.request().url().split('/').at(-1);
      assert.match(name,/^(welcome-20261104-[a-z-]+\.jpg|pvlab-wordmark-bold\.png)$/);
      media.add(name);
      await route.fulfill({status:200,contentType:name.endsWith('.png')?'image/png':'image/jpeg',body:await readFile(resolve('lab/email',name))});
    });
    await page.setContent(html,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>[...document.images].every(x=>x.complete&&x.naturalWidth>0));
    const measure=()=>page.evaluate(()=>{
      const rect=selector=>{
        const element=document.querySelector(selector);
        if(!element)throw Error("Missing email element "+selector);
        const {x,y,width,height,right,bottom}=element.getBoundingClientRect();
        return {x,y,width,height,right,bottom};
      };
      return {card:rect('.pv-card'),hero:rect('.pv-hero'),logo:rect('.pv-wordmark'),title:rect('.pv-title'),button:rect('.pv-button'),tiles:rect('.pv-tiles'),copy:rect('.pv-character-copy'),portraits:rect('.pv-character-images'),scrollWidth:document.documentElement.scrollWidth,
        images:[...document.images].map(i=>({width:i.width,naturalWidth:i.naturalWidth})),background:getComputedStyle(document.querySelector('.pv-hero')).backgroundImage};
    });
    const b=await measure();
    assert.ok(b.card.width<=Math.min(width,760)+1);
    assert.ok(b.scrollWidth<=width+1,'Horizontal overflow '+width);
    assert.ok(b.button.height>=44&&b.button.width>=150,'Comfortable touch target');
    assert.ok(b.button.y<b.tiles.y,'Primary CTA precedes editorial modules');
    assert.ok(b.logo.width>=120&&b.logo.width<=156);
    assert.ok(b.images.every(i=>i.width<=i.naturalWidth),'No image upscaling');
    if(width<=600){
      assert.match(b.background,/hero-mobile/);
      assert.ok(b.portraits.y>=b.copy.bottom-1,'Character module stacks on phones');
      assert.ok(b.button.y<650,'Primary action remains compact on phones');
    }else{
      assert.match(b.background,/hero-desktop/);
      assert.ok(b.portraits.x>b.copy.x+100,'Character module spreads on desktop');
    }
    await page.screenshot({path:artifacts+'/welcome-'+width+'.png',fullPage:true});
    await page.addStyleTag({content:'img{visibility:hidden!important}.pv-hero{background-image:none!important}'});
    assert.ok(await page.locator('.pv-title').isVisible());
    assert.ok(await page.getByRole('link',{name:'Enter the studio',exact:true}).isVisible());
    assert.ok(await page.getByRole('link',{name:'Explore Moods',exact:true}).isVisible());
    if(width===390)await page.screenshot({path:artifacts+'/welcome-images-blocked.png',fullPage:true});
    await page.locator('style').evaluateAll(styles=>styles.forEach(s=>s.remove()));
    assert.ok((await measure()).scrollWidth<=width+1,'No stylesheet fallback overflow '+width);
    assert.deepEqual(errors,[]);
    console.log('PASS '+width+'px; '+media.size+' assets; no overflow; image-blocking and CSS-stripped fallbacks');
    await context.close();
  }
}finally{await browser.close();}
