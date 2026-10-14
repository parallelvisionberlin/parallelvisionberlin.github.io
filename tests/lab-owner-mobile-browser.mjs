// The private owner dashboard must never drag the entire iPhone viewport sideways.
// Uses synthetic rows and the real published HTML/CSS, without Clerk or billing calls.
import assert from 'node:assert/strict';
import {readFile, mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PV_PLAYWRIGHT_MODULE||'playwright');
const root=new URL('../lab/',import.meta.url);
const [rawHtml,css]=await Promise.all([
  readFile(new URL('owner.html',root),'utf8'),
  readFile(new URL('owner.css',root),'utf8')
]);
const html=rawHtml
  .replace(/<link\b[^>]*>/g,'')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'')
  .replace('</head>', '<style>'+css+'</style></head>');
const artifactDir='/tmp/pv-lab-owner-mobile';
await mkdir(artifactDir,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  for(const width of [320,375,390,430,768,1280]){
    const context=await browser.newContext({
      viewport:{width,height:844},deviceScaleFactor:width<=430?3:1,
      isMobile:width<=430,hasTouch:width<=430,reducedMotion:'reduce'
    });
    const page=await context.newPage();
    try{
      await page.setContent(html,{waitUntil:'domcontentloaded'});
      await page.evaluate(()=>{
        document.querySelector('#owner-dashboard').hidden=false;
        for(const table of document.querySelectorAll('.owner-table-wrap table')){
          const headings=Array.from(table.tHead.rows[0].cells,th=>th.textContent.trim());
          const row=table.tBodies[0].insertRow();
          table.tBodies[0].replaceChildren(row);
          headings.forEach((heading,index)=>{
            const cell=row.insertCell();
            cell.dataset.label=heading;
            if(index===0){
              const strong=document.createElement('strong');
              strong.textContent='Email not synced';
              const small=document.createElement('small');
              small.textContent='user_3lZGUxxxxLongFakeClerkCustomerIdentifierABC';
              cell.append(strong,small);
            } else if(index===headings.length-1 && table.id==='never-matches'){
              cell.textContent='No activity';
            } else {
              cell.textContent=index===1?'12 Oct 2026':index===2?'200':index===3?'0':'Awaiting first purchase';
            }
          });
          // A second entry makes the data area tall enough to exercise anchor scrolling.
          const copy=row.cloneNode(true);
          table.tBodies[0].append(copy);
        }
        document.querySelector('#owner-voucher-result').hidden=false;
        document.querySelector('#owner-voucher-placeholder').hidden=true;
        document.querySelector('#owner-voucher-link').value='https://parallelvisionlabel.com/lab/account.html?voucher=PVLONGVOUCHERCODE0001#voucher';
      });
      const dimensions=await page.evaluate(()=>{
        const main=document.querySelector('.owner-shell');
        const jumpbar=document.querySelector('.owner-jumpbar');
        const rect=jumpbar.getBoundingClientRect();
        return {
          viewport:innerWidth,html:document.documentElement.scrollWidth,body:document.body.scrollWidth,
          main:main.getBoundingClientRect().width,
          navLeft:rect.left,navRight:rect.right,
          cards:[...document.querySelectorAll('.owner-table-wrap')].map(el=>({
            width:el.getBoundingClientRect().width,scrollWidth:el.scrollWidth
          })),
          firstLabel:document.querySelector('#owner-customers tbody td')?.dataset.label||''
        };
      });
      assert.ok(dimensions.html<=width+1,'Whole page must fit '+width+'px, observed '+JSON.stringify(dimensions));
      assert.ok(dimensions.body<=width+1,'Body must fit '+width+'px, observed '+JSON.stringify(dimensions));
      assert.ok(dimensions.navLeft>=-1&&dimensions.navRight<=width+1,'Sticky navigation must fit viewport '+JSON.stringify(dimensions));
      assert.equal(dimensions.firstLabel,'Email / account','Column headings remain available in mobile rows');
      if(width<=430)for(const card of dimensions.cards){
        assert.ok(card.scrollWidth<=card.width+1,'Mobile data must reflow instead of becoming a wide horizontal table at '+width);
      }
      await page.evaluate(()=>window.scrollTo(999,1200));
      await page.waitForTimeout(50);
      const position=await page.evaluate(()=>({x:scrollX,y:scrollY}));
      assert.ok(position.x<=1,'Document must not scroll horizontally at '+width+'px: '+JSON.stringify(position));
      assert.ok(position.y>0,'Vertical scrolling must keep working on '+width+'px screen');
      await page.screenshot({path:artifactDir+'/owner-'+width+'.png'});
    }finally{await context.close();}
  }
  console.log('Owner dashboard widths 320, 375, 390, 430, 768 and 1280: no page-level sideways scrolling.');
}finally{await browser.close();}
