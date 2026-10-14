// Owner-only provider finance read service. No billing/generation writes and no secret fields in output.
// Invoked AFTER the existing owner authentication and requireOwner guard in promotions.mjs.
const FIVE_MINUTES=300000, MIN_FORCE_GAP=30000;
let snapshot=null, lastStarted=0, pending=null;
const providerMeta=Object.freeze([
  {id:'spicy',name:'SpicyAPI',billingType:'Prepaid USD',billingUrl:'https://spicyapi.ai/console/billing',logoUrl:'https://spicyapi.ai/favicon.ico'},
  {id:'fal',name:'fal.ai',billingType:'Prepaid USD',billingUrl:'https://fal.ai/dashboard/billing',logoUrl:'https://fal.ai/favicon.ico'},
  {id:'higgsfield',name:'Higgsfield',billingType:'Credits / top-up',billingUrl:'https://open.higgsfield.ai',logoUrl:'https://higgsfield.ai/favicon.ico'},
  {id:'gemini',name:'Google Gemini',billingType:'Prepay or postpay (verify in console)',billingUrl:'https://aistudio.google.com/billing',logoUrl:'https://aistudio.google.com/favicon.ico'},
  {id:'fashn',name:'FASHN',billingType:'API credits',billingUrl:'https://app.fashn.ai/billing/api',logoUrl:'https://fashn.ai/favicon.ico'}
]);
const EMPTY={amount:null,currency:null};
const cleanAmount=value=>{
  if((typeof value!=='string'&&typeof value!=='number')||!(/^-?\d{1,9}(?:\.\d{1,6})?$/.test(String(value))))return null;
  const num=Number(value);return Number.isFinite(num)?String(value):null;
};
function micros(value){
  const v=cleanAmount(value);if(v===null)return null;
  const [whole,decimal='']=v.replace('-','').split('.');
  const n=BigInt(whole)*1000000n+BigInt(decimal.padEnd(6,'0'));
  return v.startsWith('-')?-n:n;
}
function asUsd(value){const n=micros(value);return n===null?null:{amount:(Number(n)/1e6).toFixed(2),currency:'USD'};}
function provider(id,configured){
  const m=providerMeta.find(p=>p.id===id);
  return {...m,configured:!!configured,status:configured?'configured':'not-configured',
    balance:null,balanceUnit:null,held:null,spendToday:null,spendMonth:null,spendUnit:null,
    spendKind:null,lastSuccess:null,lastChecked:null,error:null,low:false,note:null};
}
const iso=t=>new Date(t).toISOString();
function boundaries(t){
  const d=new Date(t),day=iso(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())).slice(0,10);
  const month=day.slice(0,7)+'-01',end=iso(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()+1)).slice(0,10);
  return {day,month,end};
}
async function readJson(url,key,scheme,fetcher){
  const r=await fetcher(url,{method:'GET',headers:{Authorization:scheme+' '+key,Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(8000)});
  if(!r||r.status>=300&&r.status<400)throw Error('redirect');
  if(r.status===401||r.status===403)throw Error('access');
  if(!r.ok)throw Error(r.status===429?'rate-limited':'unavailable');
  const body=await r.json();
  if(!body||typeof body!=='object'||Array.isArray(body))throw Error('invalid-data');
  return body;
}
function failed(p,e,t){
  const code=String(e?.message||'');
  p.status=code==='access'?'permission-required':'unavailable';
  p.error=code==='access'?'The configured key cannot read billing data. Check its permissions.':
    code==='rate-limited'?'Provider rate limit reached. Try again later.':
    'The read-only provider check could not be completed.';
  p.lastChecked=iso(t);return p;
}
async function spicyUsage(key,dates,fetcher){
  const query='?from='+encodeURIComponent(dates.month)+'&to='+encodeURIComponent(dates.end);
  const data=await readJson('https://api.spicyapi.ai/api/v1/usage'+query,key,'Bearer',fetcher);
  if(data.code!==200||!data.data||data.data.currency&&data.data.currency!=='USD')throw Error('invalid-data');
  const body=data.data,month=micros(body.totalSpend);
  if(month===null||!Array.isArray(body.days))throw Error('invalid-data');
  let day=0n;
  for(const row of body.days){if(row?.day===dates.day){const n=micros(row.spend);if(n===null)throw Error('invalid-data');day+=n;}}
  return {today:(Number(day)/1e6).toFixed(2),month:(Number(month)/1e6).toFixed(2)};
}
async function fetchSpicy(env,ownerKey,fetcher,t){
  const p=provider('spicy',!!env.LAB_CUSTOMER_SPICY_API_KEY||!!ownerKey);
  if(!p.configured){p.note='No customer or personal SpicyAPI credential is available.';return p;}
  const keys=[{label:'Parallel Vision Lab · personal',key:ownerKey},{label:'PV Lab Customers',key:env.LAB_CUSTOMER_SPICY_API_KEY}];
  const dates=boundaries(t),active=keys.filter(k=>!!k.key),current=keys.map(k=>({label:k.label,configured:!!k.key,spendToday:null,spendMonth:null,status:k.key?'checking':'not-configured'}));
  p.keyUsage=current;p.balanceUnit='USD';p.spendUnit='USD';p.spendKind='settled provider charges';
  p.note='One shared wallet. Usage is separated by key; no account-wide spend total is asserted for other keys.';
  // Wallet is account-level. Read it only once, never once per key.
  const preferred=env.LAB_CUSTOMER_SPICY_API_KEY||ownerKey;
  const outcomes=await Promise.allSettled([
    readJson('https://api.spicyapi.ai/api/v1/chat/credit',preferred,'Bearer',fetcher),
    ...active.map(k=>spicyUsage(k.key,dates,fetcher))
  ]);
  const balance=outcomes[0];
  if(balance.status==='fulfilled'&&balance.value?.code===200){
    const b=balance.value.data?.funding?.wallet||balance.value.data;
    const available=asUsd(b?.available),held=asUsd(b?.held);
    if(available&&held){p.balance=available.amount;p.held=held.amount;p.lastSuccess=iso(t);p.status='live';p.low=Number(available.amount)<10;}
    else {p.status='unavailable';p.error='Unexpected SpicyAPI balance format.';}
  } else if(balance.status==='rejected')failed(p,balance.reason,t);
  else {p.status='unavailable';p.error='Unexpected SpicyAPI balance response.';}
  let totalToday=0n,totalMonth=0n,all=true;
  active.forEach((k,i)=>{
    const item=current.find(x=>x.label===k.label),outcome=outcomes[i+1];
    if(outcome.status==='fulfilled'){
      item.status='live';item.spendToday=outcome.value.today;item.spendMonth=outcome.value.month;
      totalToday+=micros(item.spendToday);totalMonth+=micros(item.spendMonth);
    }else {item.status=String(outcome.reason?.message)==='access'?'permission-required':'unavailable';all=false;}
  });
  if(all&&active.length){
    p.spendToday=(Number(totalToday)/1e6).toFixed(2);p.spendMonth=(Number(totalMonth)/1e6).toFixed(2);
    if(!p.lastSuccess)p.lastSuccess=iso(t);
  }else if(active.length)p.note+=' Some per-key usage could not be retrieved, so combined spending is withheld.';
  p.lastChecked=iso(t);return p;
}
async function fetchFal(env,fetcher,t){
  const p=provider('fal',!!env.FAL_KEY);if(!p.configured)return p;
  p.balanceUnit='USD';p.spendUnit='USD';p.spendKind='provider usage estimates';
  const dates=boundaries(t),header='Key',key=env.FAL_KEY;
  const a='https://api.fal.ai/v1/account/billing?expand=credits';
  const q=new URL('https://api.fal.ai/v1/models/usage');
  q.searchParams.set('start',dates.month);q.searchParams.set('end',dates.end);
  q.searchParams.set('timezone','UTC');q.searchParams.set('timeframe','day');q.searchParams.set('expand','time_series');
  q.searchParams.set('bound_to_timeframe','false');q.searchParams.set('limit','1000');
  const [balance,usage]=await Promise.allSettled([readJson(a,key,header,fetcher),readJson(q.href,key,header,fetcher)]);
  if(balance.status==='fulfilled'){
    const b=balance.value.credits;
    if(b&&b.currency==='USD'&&asUsd(b.current_balance)){
      p.balance=asUsd(b.current_balance).amount;p.status='live';p.low=Number(p.balance)<10;p.lastSuccess=iso(t);
    }else {p.status='unavailable';p.error='Unexpected fal.ai billing response.';}
  }else failed(p,balance.reason,t);
  if(usage.status==='fulfilled'){
    const data=usage.value;
    if(Array.isArray(data.time_series)&&data.has_more===false){
      let day=0n,month=0n,valid=true;
      for(const bucket of data.time_series)for(const row of bucket.results||[]){
        if(row.currency!=='USD'){valid=false;break;}
        const cost=micros(row.cost_total);if(cost===null){valid=false;break;}
        month+=cost;if(String(bucket.bucket||'').slice(0,10)===dates.day)day+=cost;
      }
      if(valid){p.spendToday=(Number(day)/1e6).toFixed(2);p.spendMonth=(Number(month)/1e6).toFixed(2);
        if(!p.lastSuccess)p.lastSuccess=iso(t);}
      else p.note='Usage report contained an unknown currency or amount.';
    }else p.note='Full fal.ai usage report unavailable or paginated; no partial totals displayed.';
  }else p.note='Usage requires fal.ai billing/reporting permissions. The default generation key may not include them.';
  p.lastChecked=iso(t);return p;
}
async function fetchFashn(env,fetcher,t){
  const p=provider('fashn',!!env.FASHN_API_KEY);if(!p.configured)return p;
  p.balanceUnit='credits';p.spendUnit='credits';
  try {
    const data=await readJson('https://api.fashn.ai/v1/credits',env.FASHN_API_KEY,'Bearer',fetcher);
    const v=data.credits;
    if(!v||!Number.isSafeInteger(v.total)||v.total<0||!Number.isSafeInteger(v.subscription)||v.subscription<0||!Number.isSafeInteger(v.on_demand)||v.on_demand<0||v.total!==v.subscription+v.on_demand)throw Error('invalid-data');
    p.balance=String(v.total);p.components={subscription:String(v.subscription),onDemand:String(v.on_demand)};
    p.status='live';p.lastSuccess=iso(t);p.low=v.total<50;
    p.note='Credits are not USD. The provider does not expose verified cost-per-period data through this balance endpoint.';
  }catch(e){failed(p,e,t);}
  p.lastChecked=iso(t);return p;
}
function dashboardOnly(id,configured,t){
  const p=provider(id,configured);
  p.note=id==='higgsfield'
    ?'The API console provides usage and credits, but no documented account-balance read endpoint was confirmed.'
    :'Billing can be prepaid or postpaid. The Gemini generation key does not grant Cloud Billing report access.';
  p.lastChecked=iso(t);return p;
}
async function collect(env,ownerSpicyKey,fetcher,t,customerWalletCredits){
  const results=await Promise.allSettled([
    fetchSpicy(env,ownerSpicyKey,fetcher,t),
    fetchFal(env,fetcher,t),
    Promise.resolve(dashboardOnly('higgsfield',!!env.HF_CREDENTIALS,t)),
    Promise.resolve(dashboardOnly('gemini',!!env.GEMINI_API_KEY,t)),
    fetchFashn(env,fetcher,t)
  ]);
  const providers=results.map((r,i)=>r.status==='fulfilled'?r.value:{
    ...provider(providerMeta[i].id,true),status:'unavailable',error:'Provider financial information could not be retrieved.',lastChecked:iso(t)
  });
  if(snapshot?.providers)for(const p of providers){
    const earlier=snapshot.providers.find(x=>x.id===p.id);
    if(!p.lastSuccess&&earlier?.lastSuccess)p.lastSuccess=earlier.lastSuccess;
  }
  return {asOf:iso(t),ttlSeconds:300,providers,
    customerWallet:{credits:customerWalletCredits,unit:'PV LAB credits',note:'Customer wallet units are a separate obligation, not spendable provider cash. No currency conversion or valuation is implied.'},
    notes:['SpicyAPI personal and customer keys share one displayed balance, not two. Per-key usage is reported separately.','Values in USD are never added to FASHN credits or customer credit units.','Not all provider APIs expose actual billed spend; unavailable means unavailable.'],
    legacy:[...(env.OPENROUTER_API_KEY?[{name:'OpenRouter',status:'legacy configured, no new generation route'}]:[])]};
}
export async function ownerProviderBalances(env,{ownerSpicyKey=null,customerWalletCredits=null,force=false,fetcher=fetch,clock=Date.now}={}){
  const t=clock();
  if(snapshot&&t-lastStarted<FIVE_MINUTES&&(!force||t-lastStarted<MIN_FORCE_GAP))
    return {...snapshot,cached:true};
  if(pending)return pending;
  lastStarted=t;
  pending=collect(env,ownerSpicyKey,fetcher,t,customerWalletCredits).then(result=>{
    snapshot=result;return {...result,cached:false};
  }).finally(()=>{pending=null;});
  return pending;
}
// Only for isolated unit tests. No production code imports this helper.
export function resetOwnerProviderCacheForTests(){snapshot=null;lastStarted=0;pending=null;}
