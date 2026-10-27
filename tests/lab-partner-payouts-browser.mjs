import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const {chromium}=await import(process.env.PV_PLAYWRIGHT_MODULE||'playwright');
const root=resolve('.'),output=resolve('test-results/bellini-payouts');await mkdir(output,{recursive:true});
const html=`<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/lab/account.css"><link rel="stylesheet" href="/lab/vitolas-studio.css"><link rel="stylesheet" href="/lab/partner-payouts.css"><style>body{font:15px Arial;background:#101010;color:#eee;margin:0}main{padding:24px;max-width:1100px;margin:auto}button{cursor:pointer}</style><body class="pv-account-page pv-partner-page"><main><h1>Bellini Studios</h1><section id="payout" class="partner-payouts"></section><p id="notice" hidden></p></main><script type="module">
import {createPartnerPayoutUI,createOwnerPayoutNotice} from '/lab/partner-payouts.js';
const owner=new URLSearchParams(location.search).has('owner');let revision=1,release;
const payment={reference:'checkout:cs_synthetic',amountCents:12000,feeCents:400,taxCents:0,baseCents:11600,rate:50,commissionCents:5800};
let data={availableCents:owner?0:0,requestedCents:owner?5800:0,paidCents:0,feePending:owner?0:1,nextPayDate:'2026-10-30',breakdown:[],history:owner?[{id:'synthetic',createdAt:Date.now(),amountCents:5800,status:'pending'}]:[]};
window.calls=[];window.hold=false;
const api=async(path,body)=>{window.calls.push({path,body});if(window.hold){await new Promise(r=>release=r);window.hold=false;}
 if(path==='/api/admin/partner-payouts')return {requests:[{amountCents:5800}]};
 if(path.endsWith('/prepare'))data={...data,availableCents:5800,feePending:0,breakdown:[payment]};
 else if(path.endsWith('/confirm'))data={...data,requestedCents:0,paidCents:5800,history:[{...data.history[0],status:'paid',transferReference:body.transferReference}]};
 else if(body?.requestId){if(body.expectedAmountCents!==5800)throw Error('Incorrect expected amount');data={...data,availableCents:0,requestedCents:5800,breakdown:[],history:[{id:'synthetic',createdAt:Date.now(),amountCents:5800,status:'pending'}]};}
 return structuredClone(data);};
const ui=createPartnerPayoutUI({root:document.getElementById('payout'),api,isCurrent:r=>r===revision});
const notice=createOwnerPayoutNotice({root:document.getElementById('notice'),api,isCurrent:r=>r===revision});
window.invalidate=()=>{revision++;ui.clear();notice.clear();};window.release=()=>release?.();window.loadNotice=()=>notice.load(revision);
await ui.load({path:owner?'/api/admin/partners/bellini-studio/payouts':'/api/customer/partner/payouts',owner,revision});window.ready=true;
</script>`;
const server=createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');if(u.pathname==='/test'){res.setHeader('Content-Type','text/html');return res.end(html);}
 const path=resolve(root,'.'+u.pathname);if(!path.startsWith(root+'/'))return res.writeHead(403).end();
 try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});let checks=0;
try{for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/test');await page.waitForFunction(()=>window.ready);
 await page.getByRole('button',{name:'Calcular neto',exact:true}).click();
 await page.getByRole('button',{name:'Solicitar pago',exact:true}).waitFor();
 assert.equal((await page.evaluate(()=>window.calls)).filter(c=>c.body?.requestId).length,0,'Calculating does not request money');checks++;
 assert.match(await page.locator('#payout').innerText(),/58,00/);checks++;
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks++;
 await page.screenshot({path:output+'/available-'+width+'.png',fullPage:true});
 await page.getByRole('button',{name:'Solicitar pago',exact:true}).click();await page.getByText('Pendiente',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Solicitar pago',exact:true}).isDisabled(),true);checks++;
 const request=await page.evaluate(()=>window.calls.find(c=>c.body?.requestId));assert.equal(request.body.expectedAmountCents,5800);checks++;
 await page.reload();await page.waitForFunction(()=>window.ready);await page.evaluate(()=>window.hold=true);
 await page.getByRole('button',{name:'Calcular neto',exact:true}).click();await page.evaluate(()=>window.invalidate());await page.evaluate(()=>window.release());
 await page.waitForFunction(()=>document.getElementById('payout').hidden);assert.equal(await page.locator('#payout').innerText(),'');checks++;
 await page.goto(origin+'/test?owner=1');await page.waitForFunction(()=>window.ready);
 await page.getByPlaceholder('Referencia de tu transferencia').fill('BANK-SYNTHETIC');await page.getByRole('button',{name:/Confirmar abono/}).click();
 await page.getByText('Transferido',{exact:true}).waitFor();assert.match(await page.locator('#payout').innerText(),/BANK-SYNTHETIC/);checks++;
 await page.evaluate(()=>window.loadNotice());assert.match(await page.locator('#notice').innerText(),/58,00/);checks++;
 await page.evaluate(()=>window.invalidate());assert.equal(await page.locator('#notice').isHidden(),true);checks++;
 assert.deepEqual(errors,[]);checks++;await page.close();
}console.log(checks+' payout UI assertions passed');}finally{await browser.close();await new Promise(r=>server.close(r));}
