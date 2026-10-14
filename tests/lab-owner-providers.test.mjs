import test from 'node:test';
import assert from 'node:assert/strict';
import {ownerProviderBalances,resetOwnerProviderCacheForTests} from '../lab-worker/owner-providers.mjs';
import {labAdminRoute} from '../lab-worker/promotions.mjs';
const TIME=Date.UTC(2026,9,14,14,30);
const SECRET_OWNER='sk-spicy-OWNER-NOT-TO-LEAK',SECRET_CUSTOMER='sk-spicy-CUSTOMER-NOT-TO-LEAK';
const bindings={LAB_CUSTOMER_SPICY_API_KEY:SECRET_CUSTOMER,FAL_KEY:'fal-id:secret',
  FASHN_API_KEY:'fashn-secret',HF_CREDENTIALS:'hf-secret',GEMINI_API_KEY:'gemini-secret',OPENROUTER_API_KEY:'legacy-secret'};
function mockApi({spicyError=false,falAccess=false}={}){
  const called=[];
  const fetcher=async (url,options)=>{
    const u=new URL(url),authorization=options.headers.Authorization;
    called.push({url:u.href,method:options.method,authorization});
    assert.equal(options.method,'GET','No balance probe may perform paid POST submissions');
    assert.equal(options.redirect,'manual','Never follow redirects with credentials');
    const reply=(data,status=200)=>({status,ok:status>=200&&status<300,json:async()=>data});
    if(u.hostname==='api.spicyapi.ai'&&u.pathname==='/api/v1/chat/credit'){
      if(spicyError)throw Error('Network error must not leak');
      return reply({code:200,data:{available:'12.34',held:'0.50',total:'12.84'}});
    }
    if(u.hostname==='api.spicyapi.ai'&&u.pathname==='/api/v1/usage'){
      const owner=authorization.includes('OWNER'),month=owner?'3.10':'5.20',today=owner?'1.00':'2.00';
      assert.equal(u.searchParams.get('from'),'2026-10-01');
      assert.equal(u.searchParams.get('to'),'2026-10-15');
      return reply({code:200,data:{currency:'USD',totalCalls:2,totalSpend:month,days:[{day:'2026-10-14',spend:today},{day:'2026-10-12',spend:owner?'2.10':'3.20'}]}});
    }
    if(u.hostname==='api.fal.ai'){
      if(falAccess)return reply({error:{message:'Access denied'}},403);
      if(u.pathname==='/v1/account/billing')return reply({username:'my-team',credits:{current_balance:9.5,currency:'USD'}});
      if(u.pathname==='/v1/models/usage')return reply({time_series:[
        {bucket:'2026-10-12T00:00:00Z',results:[{currency:'USD',cost_total:0.75}]},
        {bucket:'2026-10-14T00:00:00Z',results:[{currency:'USD',cost_total:0.25}]}
      ],next_cursor:null,has_more:false});
    }
    if(u.hostname==='api.fashn.ai'&&u.pathname==='/v1/credits')
      return reply({credits:{total:120,subscription:100,on_demand:20}});
    throw Error('Unexpected network endpoint '+u.hostname+u.pathname);
  };
  return {fetcher,called};
}
test('provider snapshot reads only verified GET endpoints, counts shared Spicy funds once and reports exact key usage',async()=>{
  resetOwnerProviderCacheForTests();
  const {fetcher,called}=mockApi();
  const data=await ownerProviderBalances(bindings,{ownerSpicyKey:SECRET_OWNER,customerWalletCredits:'800',fetcher,clock:()=>TIME});
  assert.deepEqual(data.providers.map(p=>p.id),['spicy','fal','higgsfield','gemini','fashn']);
  const spicy=data.providers[0];
  assert.equal(spicy.balance,'12.34');
  assert.equal(spicy.held,'0.50');
  assert.equal(spicy.spendToday,'3.00');
  assert.equal(spicy.spendMonth,'8.30');
  assert.equal(spicy.keyUsage[0].spendMonth,'3.10');
  assert.equal(spicy.keyUsage[1].spendMonth,'5.20');
  assert.equal(called.filter(x=>x.url.endsWith('/chat/credit')).length,1,'Shared account balance is fetched once');
  const fal=data.providers[1];assert.equal(fal.balance,'9.50');assert.equal(fal.spendToday,'0.25');
  assert.equal(fal.spendMonth,'1.00');assert.equal(fal.low,true);
  assert.equal(data.providers[2].balance,null,'Higgsfield no unverified wallet balance');
  assert.equal(data.providers[3].balance,null,'Gemini no unverified billing balance');
  assert.equal(data.providers[4].balance,'120');
  assert.equal(data.providers[4].balanceUnit,'credits','FASHN credits are not USD');
  assert.equal(data.providers[4].spendMonth,null,'No unverified FASHN spending');
  assert.equal(data.customerWallet.credits,'800');
  assert.match(JSON.stringify(data.legacy),/OpenRouter/);
  for(const secret of [SECRET_OWNER,SECRET_CUSTOMER,bindings.FAL_KEY,bindings.FASHN_API_KEY])
    assert.ok(!JSON.stringify(data).includes(secret),'Credentials never leak into owner response');
  assert.equal(called.length,6,'One shared wallet, two per-key usage reads, two fal reads and one FASHN read');
});
test('five minute cache and refresh throttle prevent repeated provider reads; errors never become invented 0',async()=>{
  resetOwnerProviderCacheForTests();
  const {fetcher,called}=mockApi();
  const options={ownerSpicyKey:SECRET_OWNER,fetcher,clock:()=>TIME};
  await ownerProviderBalances(bindings,options);
  assert.equal(called.length,6);
  const cached=await ownerProviderBalances(bindings,{...options,clock:()=>TIME+10000});
  assert.equal(cached.cached,true);assert.equal(called.length,6);
  const tooSoon=await ownerProviderBalances(bindings,{...options,clock:()=>TIME+11000,force:true});
  assert.equal(tooSoon.cached,true);assert.equal(called.length,6);
  const {fetcher:broken}=mockApi({spicyError:true,falAccess:true});
  const updated=await ownerProviderBalances(bindings,{...options,fetcher:broken,clock:()=>TIME+32000,force:true});
  assert.equal(updated.cached,false);
  assert.equal(updated.providers[0].balance,null,'Not misreported as zero after a failed balance call');
  assert.equal(updated.providers[0].lastSuccess,new Date(TIME).toISOString(),'Retain last successful sync timestamp');
  assert.equal(updated.providers[1].status,'permission-required');
  assert.equal(updated.providers[1].balance,null);
  assert.ok(!JSON.stringify(updated).includes('Network error must not leak'),'Remote error details are not returned');
});
test('owner finance endpoint denies non-owner before reading secrets, wallets or provider APIs',async()=>{
  resetOwnerProviderCacheForTests();
  let labs=0,decrypted=0,apiCalls=0;
  const env={OWNER_DB:{prepare:()=>({bind:()=>({first:async()=>null})})},
    LAB_DB:{prepare:()=>{labs++;throw Error('Must not access Lab finance for customer');}},...bindings};
  const request=new Request('https://parallel-vision-lab.parallelvision.workers.dev/api/admin/providers');
  await assert.rejects(()=>labAdminRoute(request,env,'customer-id',{decryptKey:()=>{decrypted++;},providerFetcher:()=>{apiCalls++;}}),
    error=>error?.status===403);
  assert.equal(labs,0);assert.equal(decrypted,0);assert.equal(apiCalls,0);
});
test('authorized owner endpoint shows separate liability and never discloses encrypted key',async()=>{
  resetOwnerProviderCacheForTests();
  let decrypted=0;
  const env={...bindings,
    OWNER_DB:{prepare:()=>({bind:()=>({first:async()=>({id:'owner-id'})})})},
    LAB_DB:{prepare:sql=>({bind:()=>({
      first:async()=>sql.includes('FROM settings')?{encrypted_key:'encrypted-private'}:{credits:250}
    })})}
  };
  const {fetcher}=mockApi();
  const request=new Request('https://parallel-vision-lab.parallelvision.workers.dev/api/admin/providers');
  const response=await labAdminRoute(request,env,'owner-id',{
    decryptKey:async()=>{decrypted++;return SECRET_OWNER;},providerFetcher:fetcher,providerClock:()=>TIME
  });
  assert.equal(response.status,200);
  const raw=await response.text();
  assert.ok(!raw.includes(SECRET_OWNER));assert.ok(!raw.includes('encrypted-private'));
  const data=JSON.parse(raw);
  assert.equal(data.customerWallet.credits,'250');
  assert.equal(data.providers[0].balance,'12.34');
  assert.equal(decrypted,1);
});
