// The private owner dashboard must never drag the entire iPhone viewport sideways.
// Uses synthetic rows and the real published HTML/CSS, without Clerk or billing calls.
import assert from 'node:assert/strict';
import {readFile, mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PV_PLAYWRIGHT_MODULE||'playwright');
const root=new URL('../lab/',import.meta.url);
const [rawHtml,css,rawJs,rawProviderUi,rawAcquisitionUi,rawReviewUi,rawPaginationUi,rawPayoutUi]=await Promise.all([
  readFile(new URL('owner.html',root),'utf8'),
  readFile(new URL('owner.css',root),'utf8'),
  readFile(new URL('owner.js',root),'utf8'),
  readFile(new URL('owner-providers-ui.js',root),'utf8'),
  readFile(new URL('owner-acquisition-ui.js',root),'utf8'),
  readFile(new URL('owner-generation-review-ui.js',root),'utf8'),
  readFile(new URL('owner-pagination.js',root),'utf8'),
  readFile(new URL('partner-payouts.js',root),'utf8')
]);
// Run the real dashboard renderer with synthetic owner data, without authentication/network requests.
const providerJs="const {createOwnerProviderUI,renderOwnerProviderFinances}=(()=>{"+
  rawProviderUi.replace(/^export /gm,'')+
  ";return {createOwnerProviderUI,renderOwnerProviderFinances};})();\n";
const acquisitionJs=rawAcquisitionUi.replace(/^import .*\n/gm,'').replace(/^export /gm,'')+'\n';
const paginationJs=rawPaginationUi.replace(/^export /gm,'')+'\n';
const reviewJs=rawReviewUi.replace(/^export /gm,'')+'\n';
const payoutJs="const {createOwnerPayoutNotice}=(()=>{"+rawPayoutUi.replace(/^export /gm,'')+";return {createOwnerPayoutNotice};})();\n";
const runtimeJs=payoutJs+providerJs+paginationJs+acquisitionJs+reviewJs+"const createSessionRequest=()=>async()=>({ok:false,json:async()=>({})});\n"+
  rawJs.replace(/^import .*\n/gm,'').replace(/\ntry\{clerk=await loadLabAccount\(\);[\s\S]*$/,'');
const html=rawHtml
  .replace(/<link\b[^>]*>/g,'')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'')
  .replace('</head>', '<style>'+css+'</style></head>');
const artifactDir='/tmp/pv-lab-owner-mobile';
await mkdir(artifactDir,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  for(const width of [320,375,390,430,768,1280,1792]){
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

      await page.evaluate(()=>paintTraffic({
        days:7,measured:true,firstTrackedDay:'2026-10-15',
        summary:{entrances:14,views:29,redditEntrances:6,newAccounts:2},
        trend:[
          {date:'2026-10-09',entrances:0,views:0,reddit:0},
          {date:'2026-10-10',entrances:0,views:0,reddit:0},
          {date:'2026-10-11',entrances:1,views:2,reddit:0},
          {date:'2026-10-12',entrances:2,views:4,reddit:1},
          {date:'2026-10-13',entrances:3,views:6,reddit:2},
          {date:'2026-10-14',entrances:4,views:8,reddit:2},
          {date:'2026-10-15',entrances:4,views:9,reddit:1}
        ],sources:[{source:'reddit',count:6},{source:'direct',count:5},{source:'google',count:3}],
        pages:[{page:'home',count:20},{page:'studio',count:9}]
      }));
      assert.equal(await page.locator('#owner-traffic-entries').textContent(),'14');
      assert.equal(await page.locator('#owner-traffic-reddit').textContent(),'6');
      assert.equal(await page.locator('#owner-traffic-signups').textContent(),'2');
      assert.equal(await page.locator('#owner-traffic-chart .owner-traffic-chart-column').count(),7);
      assert.ok((await page.locator('#owner-traffic-sources').innerText()).includes('Reddit'));
      assert.equal(await page.locator('a[data-owner-nav][href="#owner-traffic-section"]').count(),1,'Traffic has a dedicated sidebar link');

      await page.evaluate(async()=>{
        call=async path=>{
          if(path.startsWith('/api/admin/customers/review?'))
            return {images:[{jobId:'job_flaggedpreview001',finishedAt:Date.UTC(2026,9,16)}],
              counts:{images:1,videos:1}};
          if(!path.startsWith('/api/admin/acquisition?'))throw Error('Unexpected commercial test endpoint.');
          return {days:7,summary:{
            newUsers:2,activatedUsers:1,completedJobs:3,providerExposureUsd:.24,
            archivedJobs:1,archivedExposureUsd:.15,reconstructedCompleted:1,
            netCreditsSpent:120,checkoutStarts:2,checkoutPaid:1,revenueCents:1000
          },customers:[
            {id:'user_3lZGUxxxxLongFakeClerkCustomerIdentifierABC',email:'editorial+very-long-signup-name@example.com',
              joinedAt:Date.UTC(2026,9,14),completedJobs:2,creditsSpent:100,
              providerExposureUsd:.15,archivedJobs:1,archivedExposureUsd:.15,
              reconstructedCompleted:1,checkoutStarts:1,revenueCents:1000,reviewFlag:''},
            {id:'user_SuspectedTemporaryA',email:'temp@yournike.com',joinedAt:Date.UTC(2026,9,15),
              completedJobs:1,creditsSpent:20,providerExposureUsd:.04,
              checkoutStarts:0,revenueCents:0,reviewFlag:'disposable-email',promoHeld:true}
          ],notes:{checkout:'Tracking begins with this release.',cost:'Provider costs are estimates.'}};
        };
        await acquisitionUI.refresh();
      });
      assert.equal(await page.locator('#owner-acquisition-new').textContent(),'2');
      assert.equal(await page.locator('#owner-acquisition-revenue').textContent(),'€10.00');
      assert.match(await page.locator('#owner-acquisition-summary').textContent(),/1 finance records retained/);
      assert.match(await page.locator('#owner-acquisition-customers').innerText(),/1 archived record/);
      assert.equal(await page.locator('#owner-acquisition-customers tr').count(),2,'Customer activity table is populated');
      assert.match(await page.locator('#owner-acquisition-customers').innerText(),/Free generation paused/);
      assert.equal(await page.locator('.owner-acquisition-review-button').count(),1,
        'Only the active promotional hold shows a review control');
      await page.locator('.owner-acquisition-review-button').click();
      await page.locator('#owner-generation-review-dialog').waitFor({state:'visible'});
      await page.locator('.owner-generation-review-placeholder').first().waitFor({state:'visible'});
      assert.match(await page.locator('#owner-generation-review-status').innerText(),/Review access is logged/);
      assert.match(await page.locator('#owner-generation-review-disclosure').innerText(),/Uploaded photos/);
      await page.locator('#owner-generation-review-close').click();
      assert.equal(await page.locator('#owner-generation-review-dialog').evaluate(el=>el.open),false);



      assert.equal(await page.locator('.owner-customer-open').count(),3,'Each customer has a private activity action');
      if(width===390||width===1792){
        await page.evaluate(()=>{
          call=async path=>{
            if(!path.startsWith('/api/admin/customers/activity?'))throw Error('Unexpected activity test endpoint.');
            return {
              customer:{id:'user_active_creator',email:'editorial@example.com',balanceCredits:176},
              summary:{totalJobs:2,completedJobs:1,failedJobs:1,creditsCharged:34,creditsRefunded:10,netCreditsSpent:24,archivedJobs:1,providerExposureUsd:.15},
              jobs:[
                {id:'job_fail',createdAt:Date.UTC(2026,9,14),type:'video',provider:'fal',model:'wan-video',state:'failed',chargedCredits:10,refundedCredits:10},
                {id:'job_done',createdAt:Date.UTC(2026,9,13),type:'image',provider:'spicy',model:'seedream-v5',state:'completed',chargedCredits:24,refundedCredits:0}
              ],
              archivedFinance:[{jobId:'archived_test_row',createdAt:Date.UTC(2026,9,13),state:'reconstructed_completed',provider:null,type:null,exposureUsd:.15,costKind:'estimate',origin:'reconstructed'}],
              entries:[
                {createdAt:Date.UTC(2026,9,14),kind:'refund',credits:10,description:'Generation refund'},
                {createdAt:Date.UTC(2026,9,13),kind:'adjustment',credits:200,description:'Welcome credits'}
              ],limits:{jobs:50,entries:80}
            };
          };
        });
        await page.locator('.owner-customer-open').nth(1).click();
        await page.locator('#owner-customer-dialog[open]').waitFor();
        await page.locator('#owner-customer-dialog-body').getByText('seedream-v5').waitFor();
        assert.match(await page.locator('#owner-customer-dialog-body').innerText(),/Welcome credits/);
        assert.match(await page.locator('#owner-customer-dialog-body').innerText(),/Archived financial activity/);
        assert.match(await page.locator('#owner-customer-dialog-body').innerText(),/Completed \(reconstructed\)/);
        assert.match(await page.locator('#owner-customer-dialog-body').innerText(),/24/);
        const dialogWidth=await page.locator('#owner-customer-dialog').evaluate(el=>el.getBoundingClientRect().width);
        assert.ok(dialogWidth<=width,'Private history dialog must fit viewport');
        await page.locator('#owner-customer-dialog-close').click();
        assert.equal(await page.locator('#owner-customer-dialog').evaluate(el=>el.open),false);
        await page.evaluate(()=>window.scrollTo(0,0));
      }
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
          providerOverviewHidden:document.querySelector('.owner-balances-overview').hidden,
          detailedTop:document.querySelector('#owner-providers-section').getBoundingClientRect().top,
          vouchersTop:document.querySelector('#owner-vouchers-section').getBoundingClientRect().top,
          directoryTop:document.querySelector('#owner-customers-section').getBoundingClientRect().top,
          sidebarVisible:getComputedStyle(document.querySelector('.owner-sidebar')).display!=='none',
          shellPaddingTop:parseFloat(getComputedStyle(main).paddingTop),
          heroPaddingBottom:parseFloat(getComputedStyle(document.querySelector('.owner-hero')).paddingBottom),
          activityTop:document.querySelector('.owner-activity').getBoundingClientRect().top,
          activityBottom:document.querySelector('.owner-activity').getBoundingClientRect().bottom,
          purchasesHeight:document.querySelector('.owner-purchases-panel').getBoundingClientRect().height,
          clerkHeight:document.querySelector('#owner-integrations').getBoundingClientRect().height,
          quickActionsBottom:document.querySelector('.owner-quick-actions').getBoundingClientRect().bottom,
          quickActionsHeight:document.querySelector('.owner-quick-actions').getBoundingClientRect().height,
          providersBelow:document.querySelector('#owner-providers-section').getBoundingClientRect().top,
          viewportHeight:innerHeight
        };
      });
      assert.ok(dimensions.html<=width+1,'Whole page must fit '+width+'px, observed '+JSON.stringify(dimensions));
      assert.ok(dimensions.body<=width+1,'Body must fit '+width+'px, observed '+JSON.stringify(dimensions));
      assert.ok(dimensions.navLeft>=-1&&dimensions.navRight<=width+1,'Sticky navigation must fit viewport '+JSON.stringify(dimensions));
      assert.equal(dimensions.firstLabel,'Email / account','Column headings remain available in mobile rows');
      assert.ok(dimensions.signupsTop<dimensions.directoryTop,'Recent signups appear before the full directory');
      assert.equal(dimensions.providerOverviewHidden,true,'API Balances preview must not appear on the overview');
      assert.ok(dimensions.detailedTop>dimensions.vouchersTop,'Detailed Providers area belongs after the other ledgers');
      if(width>=1600){
        assert.ok(dimensions.quickActionsBottom>=dimensions.viewportHeight-65,
          'Overview cards should reach near the bottom of the desktop viewport: '+JSON.stringify(dimensions));
        assert.ok(dimensions.quickActionsBottom<=dimensions.viewportHeight+60,
          'Quick actions should remain near the desktop fold: '+JSON.stringify(dimensions));
      }
      assert.equal(dimensions.sidebarVisible,width>920,'Desktop sidebar collapses only for tablet and mobile');
      if(width>=1280){
        assert.equal(dimensions.shellPaddingTop,22,'Desktop shell is raised 16px without changing sidebar');
        assert.equal(dimensions.heroPaddingBottom,19,'Desktop hero-to-metrics spacing is tightened by 8px');
      } else if(width<=430){
        assert.equal(dimensions.shellPaddingTop,25,'Mobile top spacing remains unchanged');
      }
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
      if(width===1792){
        // Exercise automatic Clerk backfill with mocked private API responses only.
        await page.evaluate(async()=>{
          let completed=false;window.__syncCalls=0;
          const original=[
            {id:'user_one',email:null,joinedAt:Date.UTC(2026,9,14),balanceCredits:200,verifiedPayments:0,subscription:'none',plan:''},
            {id:'user_two',email:null,joinedAt:Date.UTC(2026,9,13),balanceCredits:200,verifiedPayments:0,subscription:'none',plan:''},
            {id:'user_three',email:null,joinedAt:Date.UTC(2026,9,12),balanceCredits:200,verifiedPayments:0,subscription:'none',plan:''}
          ];
          const overview=()=>({
            summary:{accounts:3,payingCustomers:0,activeSubscriptions:0,voucherClaims:0,rewardedReferrals:0},
            customers:original.map(c=>({...c,email:completed?c.id+'@example.com':null})),
            payments:[],referrals:[],vouchers:[],emailSyncConfigured:true
          });
          call=async path=>{
            if(path.startsWith('/api/admin/overview'))return overview();
            if(path==='/api/admin/customers/sync'){
              window.__syncCalls++;completed=true;
              return {requested:3,checked:3,verified:3,unverified:0,issues:{}};
            }
            throw Error('Unexpected private test route');
          };
          profile={owner:true};
          autoClerkSyncAttempted=false;
          await refreshDashboard();
        });
        await page.waitForFunction(()=>document.querySelector('#owner-email-status').textContent.includes('3 verified emails fetched'),{timeout:3000});
        assert.equal(await page.evaluate(()=>window.__syncCalls),1,'Automatic Clerk backfill should occur once');
        assert.match(await page.locator('#owner-recent-signups').innerText(),/user_one@example.com/,'Synced verified email appears in Latest signups');
        assert.equal(await page.locator('#owner-sync-state').innerText(),'Verified emails available','Clerk status reflects verified result');
      }
    }finally{await context.close();}
  }
  console.log('Owner dashboard widths 320, 375, 390, 430, 768, 1280 and 1792: no sideways scroll; Quick actions visible above the fold on wide desktop.');
}finally{await browser.close();}
