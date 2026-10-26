import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base=process.env.AGENCY_TEST_BASE||'http://127.0.0.1:8799';
await mkdir('agency-test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
try {
  for(const width of [1440,390,320]) {
    const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<400});
    await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
    await page.goto(base+'/maison-satin-the-finest.html');
    assert.equal(await page.locator('[data-fz-carousel].is-ready').count(),3);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'The Finest overflow at '+width);
    assert.ok(!/[↗→↓]/.test(await page.locator('body').innerText()),'Use SVG arrows');
    await page.locator('img').evaluateAll(async images=>{
      images.forEach(image=>image.loading='eager');
      await Promise.all(images.map(image=>image.decode()));
    });
    assert.equal(await page.locator('img').count(),19);
    for(const sectionId of ['film-stills','locations','storyboard']) {
      const section=page.locator('#'+sectionId),gallery=section.locator('[data-fz-carousel]');
      const count=section.locator('[data-fz-current]');
      await gallery.scrollIntoViewIfNeeded();
      await gallery.locator('[data-fz-next]').click();assert.equal(await count.innerText(),'02');
      await gallery.focus();await page.keyboard.press('ArrowRight');assert.equal(await count.innerText(),sectionId==='storyboard'?'01':'03');
      await page.keyboard.press('ArrowLeft');assert.equal(await count.innerText(),'02');
      await gallery.locator('[data-fz-prev]').click();assert.equal(await count.innerText(),'01');
      assert.equal(await gallery.locator('[data-fz-slide][aria-hidden=false]').count(),1);
      assert.equal(await gallery.locator('img').first().evaluate(image=>getComputedStyle(image).objectFit),'contain');
      await page.screenshot({path:'agency-test-artifacts/finest-'+sectionId+'-'+width+'.png'});
    }
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:'agency-test-artifacts/finest-hero-'+width+'.png'});
    await page.close();console.log('PASS The Finest images, galleries, keyboard and layout '+width+'px');
  }
} finally {await browser.close();}
