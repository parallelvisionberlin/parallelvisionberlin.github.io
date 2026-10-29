import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
const start=source.indexOf('let historyLoadId='),end=source.indexOf('function surfaceHistoryJob',start);
assert.ok(start>0&&end>start);
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function fixture(){
  const requests=[],notices=[],frames=new Map(),observations=[],previewEvents=[];
  // The extracted History code uses the real account-preview publisher. Supply
  // its surrounding account/browser state instead of replacing that function.
  const window={},document=new EventTarget();
  document.addEventListener('pv-image-preview-account',event=>previewEvents.push(event.detail));
  const elements={more:{setAttribute(){}},emptyarchive:{},history:{children:[],replaceChildren(){this.children=[];}}};
  let callback,frame=0;
  class Observer{
    constructor(fn,options){callback=fn;assert.equal(options.rootMargin,'0px 0px 600px 0px');}
    observe(element){observations.push(element);}
    disconnect(){observations.length=0;}
  }
  const rig=new Function('$','api','IntersectionObserver','requestAnimationFrame','cancelAnimationFrame','notify','window','document','CustomEvent',`
    let owner=true,userId='account-a',next=null,historyRevision=0,tool='image',config={};
    const historySelected=new Set(),videoJobCache=new Map(),imageDetailCache=new Map(),cardUrls=new Set(),galleryPreviewQueue=[];
    const observer={disconnect(){}},assetLibrary={heading(){},query(){return new URLSearchParams({kind:tool});},active(){return false;}};
    const release=()=>{},updateHistorySelectionUi=()=>{},renderPendingImageCards=()=>{},setActiveJobs=()=>{},syncImageGalleryEmpty=()=>{},restoreLatestVideoSelection=()=>{};
    function renderCards(jobs,{upsert}){for(const job of jobs){if(upsert)$('history').children.unshift(job);else $('history').children.push(job);}}
    ${source.slice(start,end)}
    return {loadHistory,syncHistory,loadEarlierHistory,updateHistoryPagination,
      changeKind(value){tool=value;return loadHistory();},
      signOut(){owner=false;userId='';syncImagePreviewAccount();historyRevision++;updateHistoryPagination();},
      selectAccount(value){owner=true;userId=value;syncImagePreviewAccount();return loadHistory();},
      state:()=>({next,historyLoading,historyAutoLoadPaused})};
  `)(id=>elements[id],url=>new Promise((resolve,reject)=>requests.push({url,resolve,reject})),Observer,
    fn=>{frames.set(++frame,fn);return frame;},id=>frames.delete(id),message=>notices.push(message),window,document,CustomEvent);
  return {...rig,elements,requests,notices,observations,previewEvents,window,
    near(){callback([{isIntersecting:true,target:elements.more}]);},
    away(){callback([{isIntersecting:false,target:elements.more}]);},
    paint(){const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());}};
}
const page=(id,next=null)=>({jobs:id?[{id,settings:{type:'image'}}]:[],next});
const cursor={before:100,afterId:'job-1'};

test('approaching the bottom loads one cursor page, keeps existing work and stops at the end',async()=>{
  const r=fixture(),initial=r.loadHistory();
  r.requests[0].resolve(page('job-1',cursor));await initial;r.paint();
  assert.equal(r.observations.length,1);
  r.away();assert.equal(r.requests.length,1);
  r.near();r.near();void r.loadEarlierHistory();
  assert.equal(r.requests.length,2,'repeated intersections and clicks share one in-flight page');
  assert.match(r.requests[1].url,/before=100&afterId=job-1/);
  assert.equal(r.elements.more.disabled,true);
  assert.equal(r.elements.more.textContent,'Loading earlier work…');
  r.requests[1].resolve(page('job-2'));await settle();r.paint();
  assert.deepEqual(r.elements.history.children.map(j=>j.id),['job-1','job-2']);
  assert.equal(r.elements.more.hidden,true);
  r.near();assert.equal(r.requests.length,2);
  const sync=r.syncHistory();r.requests[2].resolve(page('new-job',cursor));await sync;r.paint();
  assert.equal(r.state().next,null,'refreshing recent jobs must not reopen exhausted pages');
  assert.equal(r.observations.length,0);
  assert.deepEqual(r.previewEvents,[{userId:'account-a',hasHistory:true}],
    'Append and incremental refresh must not overwrite the initial account preview state');
});

test('short pages rearm the observer so older work continues without an extra scroll',async()=>{
  const r=fixture(),initial=r.loadHistory();
  r.requests[0].resolve(page('job-1',cursor));await initial;r.paint();r.near();
  r.requests[1].resolve(page(null,{before:50,afterId:'filtered-job'}));await settle();r.paint();
  assert.equal(r.observations.length,1);
  r.near();assert.match(r.requests[2].url,/before=50&afterId=filtered-job/);
  r.requests[2].resolve(page('older-job'));await settle();
});

test('failed pages pause automatic retries and retain the cursor for a manual retry',async()=>{
  const r=fixture(),initial=r.loadHistory();
  r.requests[0].resolve(page('job-1',cursor));await initial;r.paint();r.near();
  r.requests[1].reject(Error('Offline'));await settle();r.paint();
  assert.equal(r.observations.length,0);
  assert.equal(r.elements.more.disabled,false);
  assert.equal(r.elements.more.textContent,'Retry loading earlier work');
  assert.equal(r.notices.length,1);
  r.near();assert.equal(r.requests.length,2,'errors must not start an automatic request loop');
  const retry=r.loadEarlierHistory();assert.equal(r.requests[2].url,r.requests[1].url);
  r.requests[2].resolve(page('job-2'));await retry;
  assert.equal(r.elements.more.hidden,true);
});

test('changing filters or signing out prevents stale older pages from entering the gallery',async()=>{
  const r=fixture(),initial=r.loadHistory();
  r.requests[0].resolve(page('image-1',cursor));await initial;r.paint();r.near();
  const changed=r.changeKind('video');
  assert.equal(r.elements.history.children.length,0);
  assert.match(r.requests[2].url,/kind=video$/);
  r.requests[1].resolve(page('stale-image',cursor));await settle();
  assert.equal(r.elements.history.children.length,0);
  assert.equal(r.state().historyLoading,true,'an old response must not clear the new request guard');
  assert.equal(r.previewEvents.length,1,'stale filtered results cannot publish preview state');
  r.requests[2].resolve(page('video-1',cursor));await changed;r.paint();r.near();r.signOut();
  assert.equal(r.elements.more.hidden,true);
  r.requests[3].resolve(page('stale-video'));await settle();r.paint();
  assert.deepEqual(r.elements.history.children.map(j=>j.id),['video-1']);
  assert.equal(r.observations.length,0);
  assert.deepEqual(r.previewEvents.at(-1),{userId:''},'stale signed-out results cannot restore private preview state');
});

test('initial History publishes empty and populated state for the authenticated account',async()=>{
  for(const id of [null,'image-1']){
    const r=fixture(),initial=r.loadHistory();
    assert.deepEqual(r.previewEvents,[],'History state waits for the authenticated response');
    r.requests[0].resolve(page(id));await initial;
    const expected={userId:'account-a',hasHistory:!!id};
    assert.deepEqual(r.previewEvents,[expected]);
    assert.deepEqual(r.window.__pvImagePreviewAccount,expected);
  }
});

test('switching accounts rejects stale initial History and publishes only the current account outcome',async()=>{
  const r=fixture(),old=r.loadHistory(),current=r.selectAccount('account-b');
  assert.deepEqual(r.previewEvents,[{userId:'account-b'}]);
  r.requests[0].resolve(page('private-account-a',cursor));await old;
  assert.equal(r.elements.history.children.length,0);
  assert.equal(r.previewEvents.length,1,'the previous account cannot set the new account preview preference');
  assert.equal(r.state().historyLoading,true);
  r.requests[1].resolve(page(null));await current;r.paint();
  assert.deepEqual(r.previewEvents,[{userId:'account-b'},{userId:'account-b',hasHistory:false}]);
  assert.deepEqual(r.window.__pvImagePreviewAccount,{userId:'account-b',hasHistory:false});
  assert.equal(r.state().next,null);
  assert.equal(r.observations.length,0);
});
