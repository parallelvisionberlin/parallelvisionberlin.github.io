// The private owner dashboard must never drag the entire iPhone viewport sideways.
// Uses synthetic rows and the real published HTML/CSS, without Clerk or billing calls.
import assert from 'node:assert/strict';
import {readFile, mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PV_PLAYWRIGHT_MODULE||'playwright');
const root=new URL('../lab/',import.meta.url);
const [rawHtml,css,rawJs,rawProviderUi]=await Promise.all([
  readFile(new URL('owner.html',root),'utf8'),
  readFile(new URL('owner.css',root),'utf8'),
  readFile(new URL('owner.js',root),'utf8'),
  readFile(new URL('owner-providers-ui.js',root),'utf8')
]);
// Run the real dashboard renderer with synthetic owner data, without authentication/network requests.
const providerJs="const {createOwnerProviderUI,renderOwnerProviderFinances}=(()=>{"+
  rawProviderUi.replace(/^export /gm,'')+
  ";return {createOwnerProviderUI,renderOwnerProviderFinances};})();\n";
const runtimeJs=providerJs+"const createSessionRequest=()=>async()=>({ok:false,json:async()=>({})});\n"+
  rawJs.replace(/^import .*\n/gm,'').replace(/\ntry\{clerk=await loadLabAccount\(\);[\s\S]*$/,'');
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
      await page.addScriptTag({content:runtimeJs});
      await page.evaluate(()=>{
        render({
          summary:{accounts:3,payingCustomers:1,activeSubscriptions:1,voucherClaims:0,rewardedReferrals:0},
          customers:[
            {id:'user_3lZGUxxxxLongFakeClerkCustomerIdentifierABC',email:null,joinedAt:Date.UTC(2026,9,14),
              balanceCredits:200,verifiedPayments:0,subscription:'none',plan:''},
            {id:'user_active_creator',email:'editorial@example.com',joinedAt:Date.UTC(2026,9,13),
              balanceCredits:280,verifiedPayments:1,subscription:'active',plan:'Studio'},
            {id:'user_earlier_creator',email:'model@example.com',joinedAt:Date.UTC(2026,9,12),
              balanceCredits:100,verifiedPayments:0,subscription:'none',plan:''}
          ],
          payments:[{customerId:'user_active_creator',email:'editorial@example.com',
            kind:'purchase',credits:200,paidAt:Date.UTC(2026,9,13),reference:'stripe_verified_test'}],
          referrals:[],vouchers:[],emailSyncConfigured:true
        });
        renderOwnerProviderFinances({
          asOf:new Date(Date.UTC(2026,9,14,14,30)).toISOString(),cached:false,
          customerWallet:{credits:'250',note:'Separate from provider cash.'},
          legacy:[{name:'OpenRouter',status:'legacy configured'}],
          providers:[
            {id:'spicy',name:'SpicyAPI',configured:true,status:'live',balance:'12.34',balanceUnit:'USD',held:'0.50',
             spendToday:'3.00',spendMonth:'8.30',spendUnit:'USD',spendKind:'settled provider charges',billingType:'Prepaid USD',
             lastSuccess:new Date(Date.UTC(2026,9,14,14,30)).toISOString(),lastChecked:new Date(Date.UTC(2026,9,14,14,30)).toISOString(),
             keyUsage:[{label:'Parallel Vision Lab · personal',spendToday:'1.00',spendMonth:'3.10',configured:true,status:'live'},
                       {label:'PV Lab Customers',spendToday:'2.00',spendMonth:'5.20',configured:true,status:'live'}]},
            {id:'fal',name:'fal.ai',configured:true,status:'live',balance:'9.50',balanceUnit:'USD',spendToday:'0.25',
             spendMonth:'1.00',spendUnit:'USD',spendKind:'provider usage estimates',billingType:'Prepaid USD',low:true},
            {id:'higgsfield',name:'Higgsfield',configured:true,status:'configured',balance:null,billingType:'Credits / top-up'},
            {id:'gemini',name:'Google Gemini',configured:true,status:'configured',balance:null,billingType:'Prepay or postpay (verify in console)'},
            {id:'fashn',name:'FASHN',configured:true,status:'live',balance:'120',balanceUnit:'credits',billingType:'API credits',low:false}
          ]
        });
        profile={owner:true};
        document.querySelector('#owner-voucher-result').hidden=false;
        document.querySelector('#owner-voucher-placeholder').hidden=true;
        document.querySelector('#owner-voucher-link').value='https://parallelvisionlabel.com/lab/account.html?voucher=PVLONGVOUCHERCODE0001#voucher';
      });
      assert.equal(await page.locator('#owner-recent-signups .owner-recent-item').count(),3,'Three newest signups shown');
      assert.equal(await page.locator('#owner-recent-payments .owner-recent-item').count(),1,'Verified payment shown');
      assert.equal(await page.locator('#owner-provider-previews .owner-provider-preview').count(),5,'Five provider summaries from verified mock');
      assert.equal(await page.locator('#owner-provider-details .owner-provider-detail').count(),5,'All provider details shown');
      assert.match(await page.locator('#owner-provider-details').innerText(),/\$12\.34/,'Spicy balance shown once');
      assert.match(await page.locator('#owner-provider-details').innerText(),/Balance unavailable/,'Unknown balances are not zeros');
      assert.match(await page.locator('#owner-customer-liability').innerText(),/250 PV LAB credits/,'Customer units are separate');
      assert.equal(await page.locator('a[data-owner-nav][href="#owner-providers-section"]').count(),1,'Dedicated Providers sidebar destination');

      await page.locator('[data-recent-filter="subscribed"]').click();
      assert.equal(await page.locator('#owner-recent-signups .owner-recent-item').count(),1,'Subscribers filter shows active plans only');
      assert.equal(await page.locator('#owner-recent-title').innerText(),'Latest subscribers.','Filter title is accurate');
      await page.locator('[data-recent-filter="all"]').click();
      assert.equal(await page.locator('#owner-recent-signups .owner-recent-item').count(),3,'All signups can be restored');
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
          firstLabel:document.querySelector('#owner-customers td')?.dataset.label||'',
          signupsTop:document.querySelector('#owner-recent-signups').getBoundingClientRect().top,
          providerTop:document.querySelector('#owner-provider-previews').getBoundingClientRect().top,
          detailedTop:document.querySelector('#owner-providers-section').getBoundingClientRect().top,
          directoryTop:document.querySelector('#owner-customers-section').getBoundingClientRect().top,
          sidebarVisible:getComputedStyle(document.querySelector('.owner-sidebar')).display!=='none'
        };
      });
      assert.ok(dimensions.html<=width+1,'Whole page must fit '+width+'px, observed '+JSON.stringify(dimensions));
      assert.ok(dimensions.body<=width+1,'Body must fit '+width+'px, observed '+JSON.stringify(dimensions));
      assert.ok(dimensions.navLeft>=-1&&dimensions.navRight<=width+1,'Sticky navigation must fit viewport '+JSON.stringify(dimensions));
      assert.equal(dimensions.firstLabel,'Email / account','Column headings remain available in mobile rows');
      assert.ok(dimensions.signupsTop<dimensions.directoryTop,'Recent signups appear before the full directory');
      assert.ok(dimensions.providerTop<dimensions.detailedTop,'API balance cards appear before the detailed Providers view');
      assert.equal(dimensions.sidebarVisible,width>920,'Desktop sidebar collapses only for tablet and mobile');
      if(width>=1280){
        console.log('Desktop Control Room geometry:',JSON.stringify(dimensions));
        assert.ok(dimensions.signupsTop<790,'Newest signups visible in the first desktop viewport: '+JSON.stringify(dimensions));
      }
      if(width<=430)for(const card of dimensions.cards){
        assert.ok(card.scrollWidth<=card.width+1,'Mobile data must reflow instead of becoming a wide horizontal table at '+width);
      }
      await page.evaluate(()=>window.scrollTo(999,1200));
      await page.waitForTimeout(50);
      const position=await page.evaluate(()=>({x:scrollX,y:scrollY}));
      assert.ok(position.x<=1,'Document must not scroll horizontally at '+width+'px: '+JSON.stringify(position));
      assert.ok(position.y>0,'Vertical scrolling must keep working on '+width+'px screen');
      if(width>=1280){
        await page.locator('a[data-owner-nav][href="#owner-providers-section"]').click();
        assert.equal(await page.locator('a[data-owner-nav][href="#owner-providers-section"]').getAttribute('aria-current'),'location');
        assert.equal(await page.locator('#owner-providers-title').innerText(),'Providers.');
        await page.evaluate(()=>window.scrollTo(0,0));
      }
      await page.screenshot({path:artifactDir+'/owner-'+width+'.png'});
    }finally{await context.close();}
  }
  console.log('Owner dashboard widths 320, 375, 390, 430, 768 and 1280: no page-level sideways scrolling.');
}finally{await browser.close();}
