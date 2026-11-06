import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createOwnerCustomersUI,customerUsageForId,customerReportPageCount,customerLifetimeState} from '../lab/owner-customers-ui.js';

class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.listeners={};this.attributes={};this.dataset={};this.hidden=false;this.open=false;this._text='';}
  get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
  set textContent(value){this._text=String(value);this.children=[];}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this._text='';this.children=[...children];}
  setAttribute(name,value){this.attributes[name]=String(value);}
  addEventListener(name,callback){this.listeners[name]=callback;}
  click(){this.listeners.click?.({target:this});}
  expand(){this.open=true;this.listeners.toggle?.({target:this});}
  collapse(){this.open=false;this.listeners.toggle?.({target:this});}
}
const all=root=>[root,...root.children.flatMap(all)];
const settle=async()=>{for(let n=0;n<10;n++)await Promise.resolve();};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const account=(id='user_ONE',overrides={})=>({id,email:id+'@example.test',joinedAt:100,balanceCredits:19,verifiedPayments:1,subscription:'active',plan:'creator',lastPaidAt:200,...overrides});
const lifetime=(id='user_ONE',overrides={})=>({id,completedJobs:3,lastCompletedAt:300,creditsSpent:40,providerExposureUsd:.35,archivedJobs:1,archivedExposureUsd:.1,checkoutStarts:2,revenueCents:300,totalJobs:4,failedJobs:1,reconstructedCompleted:0,welcomeCredits:0,promoHeld:false,reviewFlag:null,...overrides});
const report=(customers,page=1,total=customers.length)=>({customers,pagination:{page,pageSize:20,total},notes:{cost:'Settled or estimated exposure, not profit.',checkout:'Earlier checkouts are not backfilled.'}});
function fixture(t,{call}={}){
  const previous=globalThis.document,body=new Element('tbody');
  globalThis.document={getElementById:()=>body,createElement:tag=>new Element(tag)};t.after(()=>{globalThis.document=previous;});
  let ready=true,revision=1;const calls=[],opened=[],reviewed=[];
  const ui=createOwnerCustomersUI({call:async path=>{calls.push(path);return call?call(path):report([lifetime()]);},ownerReady:()=>ready,revision:()=>revision,
    openActivity:value=>opened.push(value),openReview:value=>reviewed.push(value),formatDate:value=>'Date '+value,formatNumber:value=>String(value),mobileLabels:()=>{}});
  return {ui,body,calls,opened,reviewed,advance:()=>revision++,setReady:value=>{ready=value;},details:()=>all(body).filter(node=>node.tagName==='DETAILS'),main:()=>body.children.filter(row=>!row.className),expanded:()=>body.children.filter(row=>row.className==='owner-customer-usage-row')};
}

test('customer enrichment matches exact IDs, keeps stable server pages, and never merges by row order',async t=>{
  assert.equal(customerUsageForId([lifetime('user_OTHER')],'user_ONE'),null);
  assert.equal(customerUsageForId([lifetime('user_ONE')],'user_ONE').id,'user_ONE');
  assert.equal(customerReportPageCount({total:41,pageSize:20}),3);
  assert.equal(customerLifetimeState(lifetime()),'Purchased');
  const f=fixture(t,{call:async()=>report([lifetime('user_TWO',{completedJobs:8}),lifetime('user_ONE',{completedJobs:3})])});
  f.ui.setDirectory({customers:[account('user_ONE'),account('user_TWO')],pagination:{page:1},search:''});
  assert.equal(f.calls.length,0);assert.equal(f.main()[0].children.length,7);
  await f.ui.show();
  assert.equal(f.main()[0].children[4].textContent,'3');assert.equal(f.main()[1].children[4].textContent,'8');
  assert.deepEqual(f.calls,['/api/admin/acquisition?days=7&page=1']);
  await f.ui.show();assert.equal(f.calls.length,1);
});

test('one Details expansion preserves all prior fields and only an actual promo hold enables review',async t=>{
  const f=fixture(t);f.ui.setDirectory({customers:[account()],pagination:{page:1}});
  f.ui.seed(report([lifetime('user_ONE',{promoHeld:true,reviewFlag:'disposable-email'})]));
  assert.equal(f.calls.length,0);f.details()[0].expand();await settle();
  const expanded=f.expanded()[0];assert.equal(expanded.hidden,false);
  for(const field of ['Account ID','user_ONE','Subscription','creator','Last payment','Completed generations','Last completed',
    'Net credits used','Provider exposure','$0.35','Archived finance records','Checkout starts','Recorded gross receipts','€3.00','Review flag','Promotional hold'])
    assert.ok(expanded.textContent.includes(field),field);
  assert.equal(f.main()[0].textContent.includes('user_ONE'),true,'Email remains on row; raw ID is only in details');
  const activity=all(f.main()[0]).find(node=>node.tagName==='BUTTON');activity.click();assert.equal(f.opened[0].id,'user_ONE');
  const review=all(expanded).find(node=>node.tagName==='BUTTON');review.click();assert.equal(f.reviewed[0].id,'user_ONE');
  f.ui.seed(report([lifetime('user_ONE',{promoHeld:false})]));assert.equal(all(expanded).some(node=>node.tagName==='BUTTON'),false);
});

test('search performs no eager scan; expanded missing rows use bounded cached pages and stop at exact ID',async t=>{
  const f=fixture(t,{call:async path=>path.endsWith('page=1')?report([lifetime('user_OTHER')],1,60):report([lifetime('user_OLD')],2,60)});
  f.ui.setDirectory({customers:[account('user_OLD')],pagination:{page:1},search:'old'});await f.ui.show();
  assert.equal(f.calls.length,0);assert.equal(f.main()[0].children[4].textContent,'Not loaded');
  f.details()[0].expand();await settle();
  assert.deepEqual(f.calls,['/api/admin/acquisition?days=7&page=1','/api/admin/acquisition?days=7&page=2']);
  assert.equal(f.main()[0].children[4].textContent,'3');assert.equal(f.details()[0].open,true);
  f.details()[0].collapse();f.details()[0].expand();await settle();assert.equal(f.calls.length,2);
});

test('concurrent row expansion shares requests; missing IDs and failures never become zero counts',async t=>{
  const first=deferred();const f=fixture(t,{call:()=>first.promise});
  f.ui.setDirectory({customers:[account('user_ONE'),account('user_TWO')],pagination:{page:1},search:'user'});
  f.details().forEach(detail=>detail.expand());assert.equal(f.calls.length,1);
  first.resolve(report([],1,0));await settle();
  for(const row of f.main())assert.equal(row.children[4].textContent,'Unavailable');
  assert.equal(f.calls.length,1);assert.match(f.expanded()[0].textContent,/Lifetime activity unavailable/);
});

test('directory/session changes stop scanning and stale responses cannot repaint another account',async t=>{
  const first=deferred();const f=fixture(t,{call:()=>first.promise});
  f.ui.setDirectory({customers:[account('user_ONE')],pagination:{page:1},search:'one'});f.details()[0].expand();
  f.ui.setDirectory({customers:[account('user_TWO')],pagination:{page:1},search:'two'});
  first.resolve(report([lifetime('user_ONE')],1,100));await settle();
  assert.equal(f.calls.length,1);assert.equal(f.main()[0].children[4].textContent,'Not loaded');
  assert.doesNotMatch(f.body.textContent,/user_ONE/);
  const old=deferred();const g=fixture(t,{call:()=>old.promise});g.ui.setDirectory({customers:[account()],pagination:{page:1}});
  const refresh=g.ui.show();g.advance();g.setReady(false);g.ui.clear();old.resolve(report([lifetime()]));await refresh;
  assert.equal(g.body.textContent,'');g.ui.seed(report([lifetime()]));assert.equal(g.body.textContent,'');
});

test('all customer content is literal text and read actions never call a mutation/provider endpoint',async t=>{
  const f=fixture(t);f.ui.setDirectory({customers:[account('user_ONE',{email:'<script>bad()</script>'})],pagination:{page:1}});await f.ui.show();
  f.details()[0].expand();await settle();
  assert.equal(all(f.body).some(node=>node.tagName==='SCRIPT'),false);assert.match(f.body.textContent,/<script>bad/);
  assert.ok(f.calls.every(path=>/^\/api\/admin\/acquisition\?days=7&page=\d+$/.test(path)));
  f.setReady(false);f.ui.clear();await f.ui.show();assert.equal(f.calls.length,1);
});
