// Local state-machine tests only: no Clerk, Stripe, Worker or database access.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {rememberCheckout,takeCheckoutReturn} from '../lab/checkout-return.js';

function navigation(){
  const values=new Map();
  globalThis.sessionStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  globalThis.location={href:'https://pvlab.studio/studio?billing=cancel&tool=image'};
  globalThis.history={state:null,replaceState(_s,_t,url){location.href=String(url);}};
  return values;
}
test('cancel restores SKU, route and draft marker once, bound to the customer',()=>{
  navigation();rememberCheckout({sku:'topup29',ownerId:'customer-a',tool:'video',imageDraft:false});
  const result=takeCheckoutReturn({customer:true,ownerId:'customer-a'});
  assert.equal(result.sku,'topup29');assert.equal(result.tool,'video');assert.equal(result.billing,'cancel');
  assert.equal(new URL(location.href).searchParams.has('billing'),false);
  assert.equal(takeCheckoutReturn({customer:true,ownerId:'customer-a'},{back:true}),null);
});
test('cancel context rejects another account, owner, stale, future and unknown plans',()=>{
  for(const change of [{ownerId:'another'},{customer:false},{at:Date.now()-31*60*1000},{at:Date.now()+60000},{sku:'forged'},{tool:'https://evil.example'}]){
    const values=navigation();rememberCheckout({sku:'starter',ownerId:'customer-a'});
    const key=[...values.keys()][0];const intent=JSON.parse(values.get(key));
    if('customer' in change)assert.equal(takeCheckoutReturn({customer:false,ownerId:'customer-a'}),null);
    else{values.set(key,JSON.stringify({...intent,...change}));assert.equal(takeCheckoutReturn({customer:true,ownerId:'customer-a'}),null);}
    assert.equal(values.size,0,'Invalid context is consumed, never replayable');
  }
});
test('all six SKUs and a success return retain navigation without any payment action',()=>{
  for(const sku of ['starter','creator','studio','topup10','topup29','topup75']){
    navigation();rememberCheckout({sku,ownerId:'customer-a',imageDraft:true});location.href='https://pvlab.studio/studio?billing=success';
    assert.deepEqual({...takeCheckoutReturn({customer:true,ownerId:'customer-a'}),at:0},{sku,ownerId:'customer-a',tool:'image',imageDraft:true,at:0,billing:'success'});
  }
});

const source=(await readFile(new URL('../lab/customer-wallet.js',import.meta.url),'utf8'))
  .replace(/^import .*;$/gm,'').replace('export function createCustomerWallet','function createCustomerWallet');
function walletRig(){
  let now=0,id=0;const timers=new Map(),nodes=new Map(),listeners=new Map(),profiles=[],balances=[],notices=[],requests=[],destinations=[];
  const node=()=>({hidden:false,value:'',open:false,textContent:'',disabled:false,replaceChildren(){},append(){},setAttribute(){},classList:{add(){},remove(){}},close(){this.open=false;}});
  const document={visibilityState:'visible',getElementById(key){if(!nodes.has(key))nodes.set(key,node());return nodes.get(key);},createElement:node,createElementNS:node};
  const sandbox={document,window:{addEventListener:(type,fn)=>listeners.set(type,fn)},location:{assign:url=>destinations.push(url)},URL,
    Date:class extends Date{static now(){return now;}},
    setTimeout(fn,delay){timers.set(++id,{fn,at:now+delay});return id;},clearTimeout(key){timers.delete(key);},
    referralsAvailable:()=>false,metaConsentGranted:()=>false,trackLabEvent:()=>false,rememberCheckout:()=>{}};
  const create=vm.runInNewContext(source+';createCustomerWallet',sandbox);
  let respond=async path=>path.includes('checkout')?{url:'https://checkout.stripe.com/mock'}:{customer:true,ownerId:'a',generationReady:false,balanceCredits:0,billingReady:true,products:[],config:{enabled:false}};
  const wallet=create({api:path=>{requests.push(path);return respond(path);},onProfile:p=>profiles.push(p),onBalance:b=>balances.push(b),notify:m=>notices.push(m)});
  wallet.connect({customer:true,ownerId:'a',balanceCredits:0,billingReady:true,products:[]});
  async function settle(){for(let i=0;i<12;i++)await Promise.resolve();}
  return {wallet,profiles,balances,requests,destinations,listeners,timers,notices,respond(fn){respond=fn;},settle,
    async advance(ms){const end=now+ms;while(true){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();await settle();}now=end;await settle();}};
}
test('late webhook polls full profiles, stops after authorization and never infers permission from balance',async()=>{
  const r=walletRig();let count=0;
  r.respond(async()=>({customer:true,ownerId:'a',balanceCredits:1000,generationReady:++count>=3,billingReady:true,config:{enabled:count>=3}}));
  r.wallet.recoverCheckout();await r.settle();
  assert.equal(r.profiles[0].generationReady,false);assert.equal(r.profiles[0].balanceCredits,1000);
  await r.advance(5000);assert.equal(r.requests.length,3);assert.equal(r.profiles.at(-1).config.enabled,true);
  await r.advance(60000);assert.equal(r.requests.length,3);assert.ok(r.requests.every(p=>p==='/api/session'));
});
test('unconfirmed webhook polling has a bounded request count and no automatic purchase/generation',async()=>{
  const r=walletRig();r.wallet.recoverCheckout();await r.settle();await r.advance(90000);
  assert.equal(r.requests.length,12);assert.equal(r.timers.size,0);assert.ok(r.profiles.every(p=>!p.generationReady));
  assert.ok(r.requests.every(p=>p==='/api/session'));
});
test('old in-flight profiles and their cleanup cannot overwrite a new account refresh',async()=>{
  const r=walletRig();let oldReply,newReply;
  r.respond(()=>new Promise(resolve=>oldReply=resolve));const old=r.wallet.refresh();await r.settle();
  r.wallet.connect({customer:false});r.wallet.connect({customer:true,ownerId:'b',balanceCredits:0,products:[]});
  r.respond(()=>new Promise(resolve=>newReply=resolve));const current=r.wallet.refresh();await r.settle();
  oldReply({customer:true,ownerId:'a',balanceCredits:9000,generationReady:true});await old;
  assert.equal(r.profiles.length,0);
  newReply({customer:true,ownerId:'b',balanceCredits:35,generationReady:false});await current;
  assert.equal(r.profiles.length,1);assert.equal(r.profiles[0].ownerId,'b');assert.equal(r.balances.at(-1),35);
});
test('logout cancels webhook polling and ignores a retained response',async()=>{
  const r=walletRig();let reply;r.respond(()=>new Promise(resolve=>reply=resolve));r.wallet.recoverCheckout();await r.settle();
  r.wallet.connect({customer:false});reply({customer:true,balanceCredits:1000,generationReady:true});await r.settle();await r.advance(90000);
  assert.equal(r.profiles.length,0);assert.equal(r.requests.length,1);assert.equal(r.timers.size,0);
});
test('persisted pageshow resets the outgoing purchase lock and refreshes authorization; normal pageshow does not',async()=>{
  const r=walletRig();assert.equal(await r.wallet.buyPlan('topup10'),true);assert.equal(r.destinations.length,1);
  assert.equal(await r.wallet.buyPlan('topup10'),false);
  r.listeners.get('pageshow')({persisted:false});assert.equal(await r.wallet.buyPlan('topup10'),false);
  r.listeners.get('pageshow')({persisted:true});await r.settle();
  assert.ok(r.requests.includes('/api/session'));assert.equal(await r.wallet.buyPlan('topup29'),true);assert.equal(r.destinations.length,2);
});
