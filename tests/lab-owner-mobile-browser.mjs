// The private owner dashboard must never drag the entire iPhone viewport sideways.
// Uses synthetic rows and the real published HTML/CSS, without Clerk or billing calls.
import assert from 'node:assert/strict';
import {readFile, mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PV_PLAYWRIGHT_MODULE||'playwright');
const root=new URL('../lab/',import.meta.url);
const [rawHtml,css,rawJs,rawProviderUi,rawAcquisitionUi,rawReviewUi,rawPaginationUi,rawPayoutUi,rawInspectUi,rawWorkspaceUi,rawOperationsUi,rawCustomersUi]=await Promise.all([
  readFile(new URL('owner.html',root),'utf8'),
  readFile(new URL('owner.css',root),'utf8'),
  readFile(new URL('owner.js',root),'utf8'),
  readFile(new URL('owner-providers-ui.js',root),'utf8'),
  readFile(new URL('owner-acquisition-ui.js',root),'utf8'),
  readFile(new URL('owner-generation-review-ui.js',root),'utf8'),
  readFile(new URL('owner-pagination.js',root),'utf8'),
  readFile(new URL('partner-payouts.js',root),'utf8'),
  readFile(new URL('owner-customer-inspection-ui.js',root),'utf8'),
  readFile(new URL('owner-workspace-ui.js',root),'utf8'),
  readFile(new URL('owner-operations-ui.js',root),'utf8'),
  readFile(new URL('owner-customers-ui.js',root),'utf8')
]);
// Run the real dashboard renderer with synthetic owner data, without authentication/network requests.
const providerJs="const {createOwnerProviderUI,renderOwnerProviderFinances}=(()=>{"+
  rawProviderUi.replace(/^export /gm,'')+
  ";return {createOwnerProviderUI,renderOwnerProviderFinances};})();\n";
const acquisitionJs=rawAcquisitionUi.replace(/^import .*\n/gm,'').replace(/^export /gm,'')+'\n';
const paginationJs=rawPaginationUi.replace(/^export /gm,'')+'\n';
const reviewJs=rawReviewUi.replace(/^export /gm,'')+'\n';
const inspectJs=rawInspectUi.replace(/^export /gm,'')+'\n';
const payoutJs="const {createOwnerPayoutNotice}=(()=>{"+rawPayoutUi.replace(/^export /gm,'')+";return {createOwnerPayoutNotice};})();\n";
const workspaceJs=rawWorkspaceUi.replace(/^import .*\n/gm,'').replace(/^export /gm,'')+'\n';
const operationsJs=rawOperationsUi.replace(/^import .*\n/gm,'').replace(/^export /gm,'')+'\n';
const customersJs="const {createOwnerCustomersUI}=(()=>{"+rawCustomersUi.replace(/^export /gm,'')+";return {createOwnerCustomersUI};})();\n";
const runtimeJs=customersJs+payoutJs+providerJs+paginationJs+acquisitionJs+reviewJs+inspectJs+workspaceJs+operationsJs+"const createSessionRequest=()=>async(...args)=>window.__ownerQaMedia?window.__ownerQaMedia(...args):({ok:false,json:async()=>({})});\n"+
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
      // Give pushState and browser back a real same-origin history while mocking every document byte.
      await page.route('https://owner-fixture.test/',route=>route.fulfill({contentType:'text/html',body:html}));
      await page.goto('https://owner-fixture.test/',{waitUntil:'domcontentloaded'});
      await page.route('**/owner-work-records.json*',route=>route.fulfill({
        contentType:'application/json',body:JSON.stringify({schemaVersion:1,updatedAt:'2026-11-06T12:00:00.000Z',handoffs:[],records:[{
          id:'qa-retained-work',title:'Saved change <img src=x onerror=alert(1)>',component:'Owner',status:'needs_verification',
          summary:'Retained evidence, not a live sign-off.',nextAction:'Check the missing production observation.',
          updatedAt:'2026-11-06T12:00:00.000Z',baselineSha:null,reviewedSha:null,branch:null,files:[],
          tests:[{label:'Fixture test',result:'passed',scope:'Mocked behavior'}],
          deployment:{state:'pending',environment:'Fixture only',limitations:['No production verification.']},
          evidence:[{kind:'fixture',summary:'Documented result',scope:'Synthetic fixture',limitations:['Not observed in production.']}],
          blockers:['Real account observation pending.'],doNotRepeat:['Do not reconstruct the completed source audit.'],
          links:[{label:'Unsafe fixture link',url:'javascript:alert(1)'}]
        }]})
      }));
      await page.addScriptTag({content:runtimeJs});
      // Route real sections without invoking unrelated reads that would overwrite prepainted fixtures.
      const show=async hash=>page.evaluate(hash=>{
        const identity=profile;profile=null;workspace.route(hash);profile=identity;
      },hash);
      await page.evaluate(()=>{
        profile={owner:true};
        render({
          summary:{accounts:3,payingCustomers:1,activeSubscriptions:1,voucherClaims:0,rewardedReferrals:0},
          customers:[
            {id:'user_3lZGUxxxxLongFakeClerkCustomerIdentifierABC',email:null,joinedAt:Date.UTC(2026,9,14),
              balanceCredits:200,verifiedPayments:0,subscription:'none',plan:''},
            {id:'user_active_creator',email:'editorial@example.com',joinedAt:Date.UTC(2026,9,13),
              balanceCredits:280,verifiedPayments:1,subscription:'active',plan:'Studio'},
            {id:'user_earlierCreator',email:'model@example.com',joinedAt:Date.UTC(2026,9,12),
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
      await show('#owner-providers-section');
      assert.match(await page.locator('#owner-provider-details').innerText(),/\$12\.34/,'Spicy balance shown once');
      assert.match(await page.locator('#owner-provider-details').innerText(),/Balance unavailable/,'Unknown balances are not zeros');
      assert.match(await page.locator('#owner-customer-liability').innerText(),/250 PV LAB credits/,'Customer units are separate');
      assert.equal(await page.locator('.owner-side-nav a[href="#owner-providers-section"]').count(),1,'Providers remains a dedicated Business destination');
      const partnerGroup=page.locator('.owner-side-bottom > details.owner-partners');
      assert.equal(await partnerGroup.count(),1,'One expandable Partners group replaces all three flat sidebar links');
      assert.equal(await page.locator('.owner-side-nav > a[data-owner-robin],.owner-side-bottom > a[data-owner-robin],.owner-side-bottom > a[data-owner-vitolas],.owner-side-bottom > a[data-owner-bellini]').count(),0,'Partner studios are not separate primary or utility navigation items');
      for(const [name,path] of [['robin','robin-studio.html'],['vitolas','vitolas-studio.html'],['bellini','bellini-studio.html']])
        assert.equal(await partnerGroup.locator('a[data-owner-'+name+'][href="./'+path+'"]').count(),1,'Original partner destination and owner marker retained');
      assert.equal(await partnerGroup.getAttribute('open'),null,'Partners starts closed');
      if(width>920){
        assert.equal(await partnerGroup.isVisible(),false,'No empty partner group before owner-only links are revealed');
        await partnerGroup.locator('a').evaluateAll(links=>links.forEach(link=>{link.hidden=false;}));
        assert.equal(await partnerGroup.isVisible(),true,'Owner can see the Partners group');
        assert.equal(await partnerGroup.locator('a[data-owner-robin]').isVisible(),false,'Closed group keeps secondary destinations out of the sidebar');
        await partnerGroup.locator('summary').press('Enter');
        for(const link of await partnerGroup.locator('a').all())assert.equal(await link.isVisible(),true,'Keyboard expansion reveals all original partner links');
        await partnerGroup.locator('summary').press('Enter');
        assert.equal(await partnerGroup.getAttribute('open'),null,'Keyboard closes the group');
        assert.equal(await page.locator('.owner-sidebar').evaluate(el=>getComputedStyle(el).overflowY),'auto','Short laptop sidebars remain scrollable');
        await partnerGroup.locator('a').evaluateAll(links=>links.forEach(link=>{link.hidden=true;}));
        assert.equal(await partnerGroup.isVisible(),false,'Existing owner-link hiding also hides the group');
        await partnerGroup.locator('a').evaluateAll(links=>links.forEach(link=>{link.hidden=false;}));
      }

      await show('#owner-traffic-section');
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
      assert.equal(await page.locator('.owner-side-nav a[href="#owner-traffic-section"]').count(),1,'Traffic remains reachable within Business');
      assert.match(await page.locator('#owner-audience-empty').innerText(),/Earlier traffic totals have no location or device data/);
      assert.equal(await page.locator('#owner-audience-content').isVisible(),false,'One shared empty state replaces all empty panels');
      assert.equal(await page.locator('#owner-audience-metric').isEnabled(),false,'Empty audience has no active metric selector');
      await page.evaluate(()=>paintTrafficAudience({firstTrackedDay:'2026-11-03',dimensions:{
        country:{totalEntrances:3,totalViews:3,items:[{value:'US',entrances:3,views:3}]}
      }}));
      assert.equal(await page.locator('#owner-audience-content').isVisible(),true,'Small sample has one compact disclosure');
      assert.equal(await page.locator('#owner-audience-content').getAttribute('open'),null,'Small sample starts collapsed');
      assert.equal(await page.locator('#owner-audience-country').isVisible(),false,'Small sample hides the tall report');
      assert.match(await page.locator('#owner-audience-coverage').innerText(),/3 estimated entries/,'The real sample count remains visible');
      await page.locator('#owner-audience-sample-toggle').click();
      assert.equal(await page.locator('#owner-audience-country').isVisible(),true,'All details remain accessible');
      await page.locator('#owner-audience-metric').selectOption('views');
      assert.equal(await page.locator('#owner-audience-country').isVisible(),true,'Changing metric preserves an expanded small sample');
      await page.locator('#owner-audience-sample-toggle').click();
      await page.locator('#owner-audience-metric').selectOption('entrances');
      await page.evaluate(()=>paintTrafficAudience({
        firstTrackedDay:'2026-11-03',dimensions:{
          country:{totalEntrances:100,totalViews:250,items:[
            {value:'BR',entrances:60,views:90},{value:'DE',entrances:20,views:120},
            {value:'MX',entrances:5,views:10},{value:'US',entrances:4,views:8},
            {value:'GB',entrances:4,views:7},{value:'IT',entrances:3,views:6},
            {value:'FR',entrances:2,views:5},{value:'unknown',entrances:2,views:4}]},
          city:{totalEntrances:100,totalViews:250,items:[
            {value:'São Paulo, São Paulo, BR',entrances:60,views:90},
            {value:'A very long city and region name that must wrap safely on narrow phones, DE',entrances:40,views:160}]},
          region:{totalEntrances:100,totalViews:250,items:[{value:'São Paulo, BR',entrances:60,views:90}]},
          device:{totalEntrances:100,totalViews:250,items:[{value:'mobile',entrances:80,views:160},{value:'desktop',entrances:20,views:90}]},
          browser:{totalEntrances:100,totalViews:250,items:[{value:'instagram',entrances:60,views:120}]},
          os:{totalEntrances:100,totalViews:250,items:[{value:'android',entrances:60,views:120}]},
          language:{totalEntrances:100,totalViews:250,items:[{value:'pt',entrances:60,views:120}]},
          hour:{totalEntrances:100,totalViews:250,items:[{value:'12',entrances:100,views:250}]}
        }
      }));
      assert.match(await page.locator('#owner-audience-country').innerText(),/Brazil\s+60\s+60%/);
      assert.match(await page.locator('#owner-audience-city').innerText(),/São Paulo/);
      assert.equal(await page.locator('#owner-audience-country .owner-traffic-source-fill').first().evaluate(el=>el.style.width),'100%','The leading audience bar fills its row');
      assert.match(await page.locator('#owner-audience-coverage').innerText(),/Earlier traffic totals have no audience breakdown/);
      assert.equal(await page.locator('#owner-audience-content').isVisible(),true);
      assert.equal(await page.locator('#owner-audience-content').getAttribute('open'),'','Larger sample displays its report automatically');
      assert.equal(await page.locator('#owner-audience-sample-toggle').isVisible(),false,'Larger sample has no collecting-state disclosure');
      assert.equal(await page.locator('#owner-audience-empty').isVisible(),false);
      assert.equal(await page.locator('#owner-audience-technical').getAttribute('open'),null,'Technical details starts collapsed');
      assert.equal(await page.locator('#owner-audience-browser').isVisible(),false);
      await page.locator('#owner-audience-technical > summary').click();
      assert.match(await page.locator('#owner-audience-browser').innerText(),/Instagram browser/);
      await page.locator('#owner-audience-technical > summary').click();
      const groups=await page.locator('.owner-audience-locations > section,.owner-audience-secondary > section').evaluateAll(nodes=>nodes.map(n=>({top:n.getBoundingClientRect().top,left:n.getBoundingClientRect().left,width:n.getBoundingClientRect().width})));
      for(let index=1;index<groups.length;index++){
        assert.ok(groups[index].top>groups[index-1].top,'Audience sections form full-width rows');
        assert.ok(Math.abs(groups[index].left-groups[0].left)<1,'Audience rows share a left edge');
        assert.ok(Math.abs(groups[index].width-groups[0].width)<1,'Audience rows share their full width');
      }
      assert.match(await page.locator('#owner-audience-language').innerText(),/Portuguese/);
      assert.equal(await page.locator('#owner-audience-hour .owner-traffic-chart-column').count(),24);
      await page.locator('#owner-audience-country summary').click();
      assert.match(await page.locator('#owner-audience-country').innerText(),/Unknown/);
      await page.locator('#owner-audience-metric').selectOption('views');
      assert.match(await page.locator('#owner-audience-coverage').innerText(),/250 page views/);
      assert.match(await page.locator('#owner-audience-country .owner-traffic-source-row').first().innerText(),/Germany\s+120\s+48%/);
      assert.equal(await page.locator('#owner-audience-country .owner-traffic-source-fill').nth(1).evaluate(el=>el.style.width),'75%','Bars follow the selected metric');
      await page.locator('#owner-audience-metric').selectOption('entrances');
      await page.locator('#owner-audience-title').scrollIntoViewIfNeeded();
      await page.screenshot({path:artifactDir+'/audience-'+width+'.png',fullPage:false});

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
            {id:'user_earlierCreator',email:'model@example.com',joinedAt:Date.UTC(2026,9,15),
              completedJobs:1,creditsSpent:20,providerExposureUsd:.04,
              checkoutStarts:0,revenueCents:0,reviewFlag:'disposable-email',promoHeld:true}
          ],notes:{checkout:'Tracking begins with this release.',cost:'Provider costs are estimates.'}};
        };
        await acquisitionUI.refresh();
      });
      assert.equal(await page.locator('#owner-acquisition-new').textContent(),'2');
      assert.equal(await page.locator('#owner-acquisition-revenue').textContent(),'€10.00');
      assert.match(await page.locator('#owner-acquisition-archive-note').textContent(),/1 financial records retained/);
      await show('#owner-customers-section');
      assert.equal(await page.locator('#owner-acquisition-customers').count(),0,'There is no duplicate customer report table');
      assert.equal(await page.locator('#owner-customers .owner-customer-row-details').count(),3,'One customer list retains all accounts');
      await page.locator('#owner-customers .owner-customer-row-details > summary').nth(0).click();
      const firstUsage=page.locator('#owner-customers .owner-customer-usage-row').nth(0);
      await firstUsage.waitFor({state:'visible'});
      assert.match(await firstUsage.innerText(),/Archived finance records\s+1/,'Archived finance remains in the same account details');
      for(const field of ['Current balance','Verified payments','Subscription','Last payment','Net credits used','Provider exposure','Checkout starts','Recorded gross receipts','Review flag','Promotional hold'])
        assert.match(await firstUsage.innerText(),new RegExp(field),'Merged customer view retains '+field);
      assert.match(await page.locator('#owner-customers tr').nth(2).innerText(),/Not loaded/,'An unmatched account never inherits another customer activity');
      await page.locator('#owner-customers .owner-customer-row-details > summary').nth(2).click();
      const heldUsage=page.locator('#owner-customers .owner-customer-usage-row').nth(2);
      await heldUsage.waitFor({state:'visible'});
      assert.match(await heldUsage.innerText(),/Free generation paused/);
      assert.equal(await page.locator('.owner-customer-review-action').count(),1,'Only the active promotional hold shows a review control');
      await page.locator('.owner-customer-review-action').click();
      await page.locator('#owner-generation-review-dialog').waitFor({state:'visible'});
      await page.locator('.owner-generation-review-placeholder').first().waitFor({state:'visible'});
      assert.match(await page.locator('#owner-generation-review-status').innerText(),/Review access is logged/);
      assert.match(await page.locator('#owner-generation-review-disclosure').innerText(),/Uploaded photos/);
      await page.locator('#owner-generation-review-close').click();
      assert.equal(await page.locator('#owner-generation-review-dialog').evaluate(el=>el.open),false);



      await show('#owner-customers-section');
      assert.equal(await page.locator('.owner-customer-open').count(),3,'Each customer has a private activity action');
      for(const action of await page.locator('.owner-customer-open').all())
        assert.equal(await action.innerText(),'View activity','The generated-content entry point remains clearly named');
      if(width===390||width===1792){
        await page.evaluate(async()=>{
          const canvas=document.createElement('canvas');canvas.width=480;canvas.height=640;
          const ctx=canvas.getContext('2d');ctx.fillStyle='#334239';ctx.fillRect(0,0,480,640);
          const webp=Uint8Array.from(atob(canvas.toDataURL('image/webp').split(',')[1]),c=>c.charCodeAt(0));
          window.__qaReads=[];window.__qaUrls=new Set();window.__qaRevoked=[];
          const createUrl=URL.createObjectURL.bind(URL),revokeUrl=URL.revokeObjectURL.bind(URL);
          URL.createObjectURL=blob=>{const url=createUrl(blob);window.__qaUrls.add(url);return url;};
          URL.revokeObjectURL=url=>{window.__qaUrls.delete(url);window.__qaRevoked.push(url);revokeUrl(url);};
          window.__ownerQaMedia=async(path,init)=>{
            window.__qaReads.push({path,cache:init.cache,signal:!!init.signal});
            if(path.includes('inspect-media')&&path.includes('job_qa_deleted'))return new Response('{}',{status:404});
            if(path.includes('inspect-media')&&path.includes('job_qa_video'))return new Response(new Uint8Array([1,2,3,4]),{headers:{'content-type':'video/webm'}});
            return new Response(webp,{headers:{'content-type':'image/webp'}});
          };
          call=async path=>{
            if(path.startsWith('/api/admin/customers/inspect?')){
              const q=new URL(path,'https://lab.test').searchParams;
              const item={jobId:'job_qa_image',feature:'Moods',mood:'berlin-rave',model:'exact/seedream-v5',provider:'spicy',
                state:'completed',prompt:'Precise stored provider prompt <img src=x onerror=alert(1)>',promptSource:'saved-provider-request',
                originalDirection:'Original customer direction',settings:{moodIntensity:80,resolution:'2k',aspectRatio:'3:4',referencesCount:2},
                chargedCredits:40,refundedCredits:0,providerCostUsd:.036,estimatedCostUsd:.04,costKind:'settled',
                createdAt:Date.UTC(2026,10,2),updatedAt:Date.UTC(2026,10,2),hasPreview:true,mediaKind:'image'};
              return {page:Number(q.get('page')||1),pageSize:24,total:q.get('status')==='failed'?1:25,
                hasMore:!q.get('status')&&q.get('page')==='1',
                items:q.get('feature')==='Video Studio'?[{...item,jobId:'job_qa_video',feature:'Video Studio',mediaKind:'video',mood:'',settings:{duration:5,seed:123}}]:
                  q.get('status')==='failed'?[{...item,jobId:'job_qa_failed',state:'failed',hasPreview:false,refundedCredits:40,availability:'no-completed-result'}]:
                  q.get('page')==='2'?[{...item,jobId:'job_qa_deleted',hasPreview:false,availability:'deleted-or-unavailable'}]:[item],
                filters:{mood:['berlin-rave','night-flash'],feature:['Moods','Image Studio','Video Studio'],model:['exact/seedream-v5'],status:['completed','failed']}};
            }
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
        await page.locator('#owner-customer-dialog').getByRole('heading',{name:'Generation quality review',exact:true}).waitFor();
        await page.locator('#owner-customer-dialog-body').getByText('seedream-v5',{exact:true}).waitFor();
        assert.match(await page.locator('#owner-customer-dialog-body').innerText(),/Welcome credits/);
        assert.match(await page.locator('#owner-customer-dialog-body').innerText(),/Archived financial activity/);
        assert.match(await page.locator('#owner-customer-dialog-body').innerText(),/Completed \(reconstructed\)/);
        assert.match(await page.locator('#owner-customer-dialog-body').innerText(),/24/);
        const dialogWidth=await page.locator('#owner-customer-dialog').evaluate(el=>el.getBoundingClientRect().width);
        assert.ok(dialogWidth<=width,'Private history dialog must fit viewport');
        await page.locator('.owner-inspect-image').waitFor();
        assert.match(await page.locator('.owner-inspect-card').innerText(),/Original customer direction/);
        assert.match(await page.locator('.owner-inspect-card').innerText(),/referencesCount: 2/);
        assert.match(await page.locator('.owner-inspect-card').innerText(),/Provider cost \(settled\): \$0.0360/);
        assert.equal(await page.locator('.owner-inspect-info img').count(),0,'Prompt text is never interpreted as HTML');
        await page.locator('.owner-inspect-media').click();
        await page.locator('.owner-inspect-full').waitFor();
        assert.match(await page.locator('.owner-inspect-full').getAttribute('src'),/^blob:/,'Larger media uses an authenticated blob');
        await page.screenshot({path:artifactDir+'/quality-review-'+width+'.png',fullPage:false});
        await page.getByRole('button',{name:'Close preview',exact:true}).click();
        assert.equal(await page.locator('.owner-inspect-viewer').isVisible(),false);
        assert.ok(await page.evaluate(()=>window.__qaRevoked.length>=1),'Closing preview revokes its bytes');
        await page.getByRole('button',{name:'Next',exact:true}).click();
        await page.locator('[data-job-id="job_qa_deleted"]').waitFor();
        assert.match(await page.locator('.owner-inspect-grid').innerText(),/Result deleted or unavailable/);
        await page.getByRole('combobox',{name:'Filter generations by status'}).selectOption('failed');
        await page.locator('[data-job-id="job_qa_failed"]').waitFor();
        assert.match(await page.locator('.owner-inspect-pagination').innerText(),/Page 1 of 1/,'Filter resets page');
        assert.match(await page.locator('.owner-inspect-card').innerText(),/40 refunded/);
        const fit=await page.locator('#owner-customer-dialog').evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));
        assert.ok(fit.scroll<=fit.client+1,'Review filters, prompts and cards must fit activity dialog');
        await page.getByRole('combobox',{name:'Filter generations by status'}).selectOption('');
        await page.getByRole('combobox',{name:'Filter generations by feature'}).selectOption('Video Studio');
        await page.locator('[data-job-id="job_qa_video"]').waitFor();
        await page.locator('.owner-inspect-media').click();
        await page.locator('video.owner-inspect-full').waitFor();
        assert.equal(await page.locator('video.owner-inspect-full').evaluate(el=>el.controls),true);
        assert.match(await page.locator('video.owner-inspect-full').getAttribute('src'),/^blob:/);
        await page.locator('#owner-customer-dialog-close').click();
        assert.equal(await page.locator('#owner-customer-dialog').evaluate(el=>el.open),false);
        assert.equal(await page.evaluate(()=>window.__qaUrls.size),0,'Closing activity releases all preview blobs');
        assert.ok(await page.evaluate(()=>window.__qaReads.every(r=>r.cache==='no-store'&&r.signal)),'Every preview uses the session helper without caching');
        await page.evaluate(()=>window.scrollTo(0,0));
      }
      await show('#owner-overview');
      await page.locator('[data-recent-filter="subscribed"]').click();
      assert.equal(await page.locator('#owner-recent-signups .owner-recent-item').count(),1,'Subscribers filter shows active plans only');
      assert.equal(await page.locator('#owner-recent-title').innerText(),'Latest subscribers.','Filter title is accurate');
      await page.locator('[data-recent-filter="all"]').click();
      assert.equal(await page.locator('#owner-recent-signups .owner-recent-item').count(),3,'All signups can be restored');
      // Direct destinations replace vague parent tabs; legacy URLs retain all data and actions.
      assert.equal(await page.locator('.owner-side-nav a[data-owner-nav]').count(),7,'Seven direct task destinations');
      assert.deepEqual(await page.locator('.owner-side-nav a[data-owner-nav]').evaluateAll(links=>links.map(link=>link.textContent.trim())),
        ['Overview','Customers','Sales','Traffic','Costs','Promotions','Work log'],'Primary labels describe their actual tasks');
      assert.equal(await page.locator('#owner-mobile-access').isVisible(),width<=920,'Mobile navigation retains its established breakpoint');
      assert.equal(await page.locator('#owner-business-nav,#owner-customer-nav,#owner-system-nav').count(),0,'No redundant parent or customer view toggles');
      assert.equal(await page.locator('#owner-home-attention').count(),0,'Notifications are not repeated on Overview');
      assert.equal(await page.locator('#owner-notifications-dialog #owner-home-attention-items').count(),1,'Notification source has one header-dialog location');
      assert.equal(await page.locator('#owner-release-section').isVisible(),false,'Technical checklists stay out of the main page');
      for(const id of ['owner-traffic-section','owner-acquisition-section','owner-customers-section','owner-payments-section',
        'owner-referrals-section','owner-vouchers-section','owner-providers-section','owner-release-section'])
        assert.equal(await page.locator('#'+id).count(),1,'Every existing report/tool remains in the DOM');
      for(const [hash,view,section] of [
        ['#owner-overview','home','.owner-activity'],
        ['#owner-traffic-section','traffic','#owner-traffic-section'],
        ['#owner-acquisition-section','sales','#owner-acquisition-section'],
        ['#owner-payments-section','sales','#owner-payments-section'],
        ['#owner-providers-section','costs','#owner-providers-section'],
        ['#owner-referrals-section','promotions','#owner-referrals-section'],
        ['#owner-vouchers-section','promotions','#owner-vouchers-section'],
        ['#owner-customers-section','customers','#owner-customers-section'],
        ['#owner-customer-usage','customers','#owner-customers-section'],
        ['#owner-work-section','work','#owner-work-section']
      ]){
        await show(hash);
        assert.equal(await page.evaluate(()=>workspace.current().view),view,'Legacy and new hashes select the right task');
        assert.equal(await page.locator(section).isVisible(),true,'Requested report remains visible: '+hash);
        const visible=await page.locator('[data-owner-view]').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).display!=='none').map(n=>n.dataset.ownerView));
        assert.ok(visible.every(value=>value===view),'Other task pages stay hidden: '+hash+' '+JSON.stringify(visible));
        const fit=await page.evaluate(()=>({html:document.documentElement.scrollWidth,body:document.body.scrollWidth,width:innerWidth}));
        assert.ok(fit.html<=width+1&&fit.body<=width+1,'Each task page fits '+width+'px: '+hash+' '+JSON.stringify(fit));
        if(width<=430)for(const card of await page.locator('.owner-table-wrap:visible').evaluateAll(nodes=>nodes.map(n=>({client:n.getBoundingClientRect().width,scroll:n.scrollWidth}))))
          assert.ok(card.scroll<=card.client+1,'Visible mobile tables reflow within '+hash);
      }
      await show('#owner-acquisition-section');
      assert.equal(await page.locator('#owner-payments-section').isVisible(),true,'Sales includes the existing verified payment ledger');
      // Same-origin navigation and browser back retain task identity.
      await page.evaluate(()=>{profile=null;location.hash='owner-payments-section';});
      await page.waitForFunction(()=>workspace.current().view==='sales');
      await page.evaluate(()=>{location.hash='owner-work-section';});
      await page.waitForFunction(()=>workspace.current().view==='work');
      await page.goBack();
      await page.waitForFunction(()=>workspace.current().view==='sales');
      assert.equal(await page.locator('#owner-payments-section').isVisible(),true,'Back restores Sales with the payment ledger');
      if(width<=920){
        await page.locator('#owner-mobile-access > summary').click();
        await page.locator('.owner-jumpbar a[href="#owner-traffic-section"]').click();
        await page.waitForFunction(()=>workspace.current().view==='traffic'&&location.hash==='#owner-traffic-section');
        assert.equal(await page.locator('#owner-mobile-access').getAttribute('open'),null,'Mobile menu closes after selecting a task');
      }else{
        await page.locator('.owner-side-nav a[href="#owner-work-section"]').press('Enter');
        await page.waitForFunction(()=>workspace.current().view==='work');
      }
      // Checklists are a tool opened from Work log, not an always-present extra screen.
      await show('#owner-work-section');
      await page.evaluate(()=>{profile={owner:true};});
      await page.locator('#owner-work-section [data-owner-open-dialog="owner-reference-dialog"]').click();
      assert.equal(await page.locator('#owner-reference-dialog').isVisible(),true,'Release checklists remain accessible');
      assert.equal(await page.locator('#owner-release-section .owner-check-detail[open]').count(),0,'Checklist details stay collapsed until requested');
      await page.locator('[data-owner-close-dialog="owner-reference-dialog"]').click();
      assert.equal(await page.locator('#owner-release-section').isVisible(),false,'Closing the tool hides the engineering material');
      await page.evaluate(()=>workspace.route('#owner-release-section'));
      assert.equal(await page.locator('#owner-reference-dialog').isVisible(),true,'Legacy checklist URL opens the same tool');
      await page.locator('[data-owner-close-dialog="owner-reference-dialog"]').click();
      // Report periods are independent: changing conversion must never silently refresh Traffic.
      await page.evaluate(()=>{
        profile={owner:true};trafficDays=7;acquisitionDays=7;window.__periodReads=[];
        call=async path=>{
          window.__periodReads.push(path);
          if(path.startsWith('/api/admin/acquisition'))return {days:30,summary:{},customers:[],notes:{}};
          if(path.startsWith('/api/admin/traffic'))return {days:30,summary:{},daily:[],sources:[],pages:[]};
          throw Error('Unexpected period fixture read');
        };
      });
      await show('#owner-acquisition-section');
      await page.locator('[data-acquisition-days="30"]').click();
      await page.waitForFunction(()=>window.__periodReads.some(path=>path.startsWith('/api/admin/acquisition?days=30')));
      assert.equal(await page.evaluate(()=>trafficDays),7,'Conversion period does not change Traffic');
      assert.equal(await page.evaluate(()=>window.__periodReads.some(path=>path.startsWith('/api/admin/traffic'))),false,'Conversion period does not read Traffic');
      await show('#owner-traffic-section');
      await page.locator('[data-traffic-days="30"]').click();
      await page.waitForFunction(()=>window.__periodReads.some(path=>path.startsWith('/api/admin/traffic?days=30')));
      assert.equal(await page.evaluate(()=>acquisitionDays),30,'Traffic period preserves Conversion period');
      assert.equal(await page.evaluate(()=>window.__periodReads.filter(path=>path.startsWith('/api/admin/acquisition')).length),1,'Traffic period does not re-read Conversion');
      if(width===390||width===1792){
        await page.evaluate(async()=>{
          window.__opsReads=[];
          window.__ownerQaMedia=async(path,init)=>{
            window.__opsReads.push({path,method:init.method||'GET'});
            const value=path==='/health'?{ok:true,version:'fixture-worker',operations:'owner-operations-v1'}:{
              version:'owner-operations-v1',schemaVersion:1,asOf:'2026-11-06T12:00:00.000Z',
              window:{days:7},limits:{itemsPerSource:20},
              jobs:{available:true,counts:{failed:1,uncertain:1,stale:0},items:[{
                jobId:'job_fixture_uncertain',customerId:'user_active_creator',state:'uncertain',reason:'uncertain',updatedAt:1793966400000
              }]},
              settlements:{available:false,pending:null,due:null,items:[]},
              limitations:['Fixture only. No generation was requested.']
            };
            return new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});
          };
          await operationsUI.refresh({force:true});
          await operationsUI.loadRecords();
        });
        await page.locator('#owner-notifications-toggle').click();
        assert.equal(await page.locator('#owner-notifications-dialog').isVisible(),true,'Header opens the one notification list');
        assert.match(await page.locator('#owner-home-attention-items').innerText(),/1 jobs? needs? a status check/);
        assert.match(await page.locator('#owner-home-attention-items').innerText(),/1 failed job/);
        assert.match(await page.locator('#owner-home-attention-items').innerText(),/1 update needs verification/);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#owner-notifications-dialog').isVisible(),false,'Escape closes the native notifications dialog');
        await page.locator('#owner-notifications-toggle').click();
        await page.locator('[data-owner-close-dialog="owner-notifications-dialog"]').click();
        assert.equal(await page.locator('#owner-notifications-dialog').isVisible(),false,'Notifications close without changing the selected page');
        await page.evaluate(()=>workspace.route('#owner-system'));
        assert.equal(await page.locator('#owner-system-dialog').isVisible(),true,'Old System URL opens job status details');
        assert.match(await page.locator('#owner-operations-content').innerText(),/Provider result uncertain/);
        assert.match(await page.locator('#owner-operations-content').innerText(),/Settlement source unavailable/,'Missing source is not shown as zero');
        assert.equal(await page.locator('#owner-operations-content button').filter({hasText:'View customer'}).count(),1,'Operational item leads to the existing customer profile');
        const reads=await page.evaluate(()=>window.__opsReads);
        assert.deepEqual(reads.map(r=>r.path).sort(),['/api/admin/operations?days=7','/health'],'System reads only the two read-only endpoints');
        assert.ok(reads.every(r=>r.method==='GET'),'System must not trigger a retry, generation or payment mutation');
        await page.evaluate(()=>operationsUI.refresh());
        assert.equal(await page.evaluate(()=>window.__opsReads.length),2,'Fresh snapshot is reused instead of repeating reads');
        await page.locator('[data-owner-close-dialog="owner-system-dialog"]').click();
        await show('#owner-work-section');
        await page.locator('.owner-work-record > summary').click();
        assert.match(await page.locator('#owner-work-records').innerText(),/No production verification/);
        assert.match(await page.locator('#owner-work-records').innerText(),/Documented checks/);
        assert.equal(await page.locator('#owner-work-records img').count(),0,'Work memory text cannot inject HTML');
        assert.equal(await page.locator('#owner-work-records a[href^="javascript:"]').count(),0,'Unsafe work-memory links remain inert');
        await page.locator('[data-owner-work-state="deployed"]').click();
        assert.match(await page.locator('#owner-work-records').innerText(),/No records in this state/);
        await page.locator('[data-owner-work-state="needs_verification"]').click();
        assert.equal(await page.locator('.owner-work-record').count(),1,'State filter restores the retained record');
        await page.screenshot({path:artifactDir+'/operations-'+width+'.png',fullPage:false});
      }
      await show('#owner-overview');
      await page.evaluate(()=>window.scrollTo(0,0));
      const dimensions=await page.evaluate(()=>({
        viewport:innerWidth,html:document.documentElement.scrollWidth,body:document.body.scrollWidth,
        sidebarVisible:getComputedStyle(document.querySelector('.owner-sidebar')).display!=='none',
        providerOverviewHidden:document.querySelector('.owner-balances-overview').hidden,
        firstLabel:document.querySelector('#owner-customers td')?.dataset.label||'',
        signupsTop:document.querySelector('#owner-recent-signups').getBoundingClientRect().top,
        bodyFont:parseFloat(getComputedStyle(document.body).fontSize),
        customerFont:parseFloat(getComputedStyle(document.querySelector('#owner-customers td')).fontSize),
        introHidden:document.querySelector('#owner-view-intro').hidden
      }));
      assert.ok(dimensions.html<=width+1&&dimensions.body<=width+1,'Home fits viewport '+JSON.stringify(dimensions));
      assert.equal(dimensions.firstLabel,'Account','Mobile rows retain accessible column headings');
      assert.ok(dimensions.bodyFont>=14&&dimensions.customerFont>=14,'Primary content remains readable: '+JSON.stringify(dimensions));
      assert.equal(dimensions.introHidden,true,'Section headlines do not repeat descriptive paragraphs');
      assert.equal(dimensions.providerOverviewHidden,true,'Provider preview stays out of Home');
      assert.equal(dimensions.sidebarVisible,width>920,'Desktop sidebar retains tablet/mobile breakpoint');
      if(width>=1280)assert.ok(dimensions.signupsTop<790,'Recent signups remain visible in first desktop viewport');
      const purchaseLayout=await page.locator('.owner-purchases-panel').evaluate(panel=>{
        const title=panel.querySelector('h2'),list=panel.querySelector('.owner-payment-list'),item=list.querySelector('.owner-recent-item');
        const rectangle=node=>{const r=node.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height};};
        const text=document.createRange();text.selectNodeContents(title);
        const style=getComputedStyle(panel),titleStyle=getComputedStyle(title),textRect=text.getBoundingClientRect();
        return {
          panel:rectangle(panel),title:rectangle(title),list:rectangle(list),text:{top:textRect.top,bottom:textRect.bottom},
          signupTitle:rectangle(document.querySelector('#owner-recent-title')),
          overflowY:style.overflowY,maxHeight:style.maxHeight,flexGrow:style.flexGrow,
          paddingBottom:parseFloat(style.paddingBottom),borderBottom:parseFloat(style.borderBottomWidth),
          scrollHeight:panel.scrollHeight,clientHeight:panel.clientHeight,titleOverflow:titleStyle.overflow,
          person:item&&rectangle(item.querySelector('.owner-recent-person')),date:item&&rectangle(item.querySelector('.owner-recent-date'))
        };
      });
      assert.equal(purchaseLayout.overflowY,'visible','Recent purchases does not clip its content');
      assert.equal(purchaseLayout.maxHeight,'none','Recent purchases has no forced height cap');
      assert.equal(purchaseLayout.flexGrow,'0','Recent purchases does not stretch to fill the signup column');
      assert.ok(purchaseLayout.scrollHeight<=purchaseLayout.clientHeight+1,'Recent purchases has no internal cropped overflow');
      assert.ok(Math.abs(purchaseLayout.panel.bottom-purchaseLayout.list.bottom-purchaseLayout.paddingBottom-purchaseLayout.borderBottom)<=2,
        'Recent purchases ends naturally after its records: '+JSON.stringify(purchaseLayout));
      if(width>=1280){
        assert.ok(Math.abs(purchaseLayout.title.top-purchaseLayout.signupTitle.top)<=1,'Recent purchases aligns with Latest signups');
        assert.equal(purchaseLayout.titleOverflow,'visible','Purchase heading glyphs remain unclipped');
        assert.ok(purchaseLayout.text.top>=purchaseLayout.title.top-1&&purchaseLayout.text.bottom<=purchaseLayout.title.bottom+1,
          'The complete purchase heading fits its line box: '+JSON.stringify(purchaseLayout));
      }
      if(width<=430)assert.ok(purchaseLayout.person.right<=purchaseLayout.date.left-4,'Purchase email and date keep separate phone columns');
      if(width===390||width===1792)await page.screenshot({path:artifactDir+'/overview-top-'+width+'.png',fullPage:false});
      await page.evaluate(()=>window.scrollTo(999,1200));
      const position=await page.evaluate(()=>({x:scrollX,y:scrollY}));
      assert.ok(position.x<=1,'No horizontal document scrolling at '+width+'px');
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

        // The real Customers Refresh button must keep the current search/page,
        // discard stale lifetime data and load fresh exact-ID records on demand.
        await show('#owner-customers-section');
        await page.evaluate(async()=>{
          window.__customerRefreshReads=[];window.__holdCustomerRefresh=false;window.__customerRefreshVersion=0;
          const customers=[
            {id:'user_refreshOne',email:'refresh-one@example.com',joinedAt:100,balanceCredits:19,verifiedPayments:1,subscription:'none',plan:''},
            {id:'user_refreshTwo',email:'refresh-two@example.com',joinedAt:90,balanceCredits:29,verifiedPayments:0,subscription:'none',plan:''}
          ];
          const overview=()=>({summary:{accounts:41,payingCustomers:1,activeSubscriptions:0,voucherClaims:0,rewardedReferrals:0},
            customers:customers.map(c=>({...c,balanceCredits:c.balanceCredits+window.__customerRefreshVersion*10})),
            pagination:{page:2,pageSize:20,total:41},payments:[],referrals:[],vouchers:[],emailSyncConfigured:true});
          call=async path=>{
            window.__customerRefreshReads.push(path);
            if(path.startsWith('/api/admin/overview?')){
              if(window.__holdCustomerRefresh){window.__holdCustomerRefresh=false;return new Promise(resolve=>{window.__finishCustomerRefresh=()=>resolve(overview());});}
              return overview();
            }
            if(path==='/api/admin/acquisition?days=7&page=1')return {
              customers:[{id:'user_refreshTwo',completedJobs:23,lastCompletedAt:300},{id:'user_refreshOne',completedJobs:17,lastCompletedAt:200}],
              pagination:{page:1,pageSize:20,total:41},notes:{cost:'Fixture only.'}
            };
            throw Error('Unexpected Customers refresh test route: '+path);
          };
          profile={owner:true};autoClerkSyncAttempted=true;customerUI.clear();customerPage=2;
          document.querySelector('#owner-search').value='refresh';
          await refreshDashboard();
          customerUI.seed({customers:[{id:'user_refreshOne',completedJobs:1,lastCompletedAt:100},{id:'user_refreshTwo',completedJobs:2,lastCompletedAt:100}],
            pagination:{page:2,pageSize:20,total:41},notes:{}});
        });
        const customerRows=page.locator('#owner-customers > tr:not(.owner-customer-usage-row)');
        assert.deepEqual(await customerRows.locator('td:nth-child(5)').allTextContents(),['1','2'],'The fixture begins with cached lifetime counts');
        await page.evaluate(()=>{window.__customerRefreshVersion=1;window.__holdCustomerRefresh=true;});
        await page.locator('#owner-customers-refresh').click();
        assert.equal(await page.locator('#owner-customers-refresh').isDisabled(),true,'Customers Refresh shows the pending read');
        assert.equal(await page.locator('#owner-customers-refresh').innerText(),'Refreshing…');
        await page.evaluate(()=>window.__finishCustomerRefresh());
        await page.waitForFunction(()=>!document.querySelector('#owner-customers-refresh').disabled);
        assert.equal(await page.locator('#owner-customers-refresh').innerText(),'Refresh');
        assert.equal(await page.locator('#owner-search').inputValue(),'refresh','Refresh preserves the customer search');
        assert.equal(await page.locator('#owner-customers-pagination [aria-current="page"]').innerText(),'2','Refresh preserves directory page 2');
        assert.deepEqual(await customerRows.locator('td:first-child strong').allTextContents(),['refresh-one@example.com','refresh-two@example.com'],'Refresh preserves directory identity and order');
        assert.deepEqual(await customerRows.locator('td:nth-child(3)').allTextContents(),['29','39'],'Directory balances are read again');
        assert.deepEqual(await customerRows.locator('td:nth-child(5)').allTextContents(),['Not loaded','Not loaded'],'Cached lifetime counts are invalidated');
        assert.deepEqual(await page.evaluate(()=>window.__customerRefreshReads),[
          '/api/admin/overview?page=2&search=refresh','/api/admin/overview?page=2&search=refresh'
        ],'Search refresh is read-only, preserves the page and does not eagerly scan lifetime reports');
        await page.locator('#owner-customers .owner-customer-row-details > summary').first().click();
        await page.waitForFunction(()=>document.querySelector('#owner-customers > tr td:nth-child(5)').textContent==='17');
        assert.deepEqual(await customerRows.locator('td:nth-child(5)').allTextContents(),['17','23'],'Fresh lifetime data is joined by exact customer ID');
        assert.equal(await page.evaluate(()=>window.__customerRefreshReads.at(-1)),'/api/admin/acquisition?days=7&page=1','Details performs a fresh bounded lifetime read');
      }
    }catch(error){
      await page.screenshot({path:artifactDir+'/failure-'+width+'.png',fullPage:false}).catch(()=>{});
      throw error;
    }finally{await context.close();}
  }
  console.log('Owner direct navigation, merged customers, notifications, private review and independent periods fit 320, 375, 390, 430, 768, 1280 and 1792px.');
}finally{await browser.close();}
