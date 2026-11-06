// The private owner dashboard must never drag the entire iPhone viewport sideways.
// Uses synthetic rows and the real published HTML/CSS, without Clerk or billing calls.
import assert from 'node:assert/strict';
import {readFile, mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PV_PLAYWRIGHT_MODULE||'playwright');
const root=new URL('../lab/',import.meta.url);
const [rawHtml,css,rawJs,rawProviderUi,rawAcquisitionUi,rawReviewUi,rawPaginationUi,rawPayoutUi,rawInspectUi]=await Promise.all([
  readFile(new URL('owner.html',root),'utf8'),
  readFile(new URL('owner.css',root),'utf8'),
  readFile(new URL('owner.js',root),'utf8'),
  readFile(new URL('owner-providers-ui.js',root),'utf8'),
  readFile(new URL('owner-acquisition-ui.js',root),'utf8'),
  readFile(new URL('owner-generation-review-ui.js',root),'utf8'),
  readFile(new URL('owner-pagination.js',root),'utf8'),
  readFile(new URL('partner-payouts.js',root),'utf8'),
  readFile(new URL('owner-customer-inspection-ui.js',root),'utf8')
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
const runtimeJs=payoutJs+providerJs+paginationJs+acquisitionJs+reviewJs+inspectJs+"const createSessionRequest=()=>async(...args)=>window.__ownerQaMedia?window.__ownerQaMedia(...args):({ok:false,json:async()=>({})});\n"+
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
      await page.locator('[data-recent-filter="subscribed"]').click();
      assert.equal(await page.locator('#owner-recent-signups .owner-recent-item').count(),1,'Subscribers filter shows active plans only');
      assert.equal(await page.locator('#owner-recent-title').innerText(),'Latest subscribers.','Filter title is accurate');
      await page.locator('[data-recent-filter="all"]').click();
      assert.equal(await page.locator('#owner-recent-signups .owner-recent-item').count(),3,'All signups can be restored');
      // Unified Owner entry keeps every existing section and adds only read-only navigation.
      for(const selector of ['.owner-side-nav a[href="#owner-acquisition-section"]','.owner-side-nav a[href="#owner-release-section"]'])
        assert.equal(await page.locator(selector).count(),1,'One direct sidebar destination per new access path');
      assert.equal(await page.locator('.owner-workspace-paths a').count(),3,'Three focused entry paths');
      assert.equal(await page.locator('#owner-mobile-access').isVisible(),width<=920,'Mobile access replaces the crowded jumpbar only on small screens');
      for(const href of await page.locator('.owner-workspace-paths a,.owner-jumpbar a[href^="#"]').evaluateAll(links=>links.map(a=>a.getAttribute('href'))))
        assert.equal(await page.locator(href).count(),1,'Each internal shortcut resolves to an existing section');
      assert.equal(await page.locator('#owner-release-section .owner-check-detail[open]').count(),0,'Technical detail stays collapsed by default');
      if(width<=920){
        await page.locator('#owner-mobile-access > summary').click();
        assert.equal(await page.locator('.owner-jumpbar a[href="#owner-acquisition-section"]').isVisible(),true,'Revenue is reachable in the mobile menu');
        await page.locator('.owner-jumpbar a[href="#owner-acquisition-section"]').click();
        assert.equal(await page.locator('#owner-mobile-access').getAttribute('open'),null,'Menu closes after selecting a destination');
        await page.waitForFunction(()=>document.querySelector('.owner-side-nav a[href="#owner-acquisition-section"]').getAttribute('aria-current')==='location');
        assert.equal(await page.locator('.owner-side-nav a[href="#owner-acquisition-section"]').getAttribute('aria-current'),'location','Mobile and sidebar location remain in sync');
      }else{
        await page.locator('.owner-workspace-paths a[href="#owner-acquisition-section"]').click();
        await page.waitForFunction(()=>document.querySelector('.owner-side-nav a[href="#owner-acquisition-section"]').getAttribute('aria-current')==='location');
        assert.equal(await page.locator('.owner-side-nav a[href="#owner-acquisition-section"]').getAttribute('aria-current'),'location','Overview shortcuts update sidebar location');
      }
      await page.evaluate(()=>window.scrollTo(0,0));
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
