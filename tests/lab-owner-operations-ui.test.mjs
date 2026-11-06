import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createOwnerOperationsUI} from '../lab/owner-operations-ui.js';

// Small DOM boundary: exercises the actual renderer and event handlers without a
// browser, external dependency, remote request, account or paid generation.
class Element {
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.listeners={};this.disabled=false;this._text='';}
  set textContent(value){this._text=String(value);this.children=[];}
  get textContent(){return this._text+this.children.map(node=>node.textContent).join('');}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this._text='';this.children=[...nodes];}
  setAttribute(name,value){this.attributes[name]=String(value);}
  addEventListener(name,callback){this.listeners[name]=callback;}
  click(){if(!this.disabled)this.listeners.click?.({target:this});}
}
const ids=['owner-home-attention-items','owner-operations-content','owner-operations-refresh',
  'owner-operations-status','owner-work-records','owner-work-handoffs','owner-work-status'];
const nodes=root=>[root,...root.children.flatMap(nodes)];
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const snapshot=(overrides={})=>({schemaVersion:1,version:'owner-operations-v1',asOf:'2026-11-06T12:00:00.000Z',
  window:{days:7,from:1,to:2,staleAfterMs:1800000},
  jobs:{available:true,counts:{failed:1,uncertain:1,stale:0},items:[{jobId:'job_one',customerId:'user_ONE',reason:'uncertain',state:'uncertain',createdAt:1,updatedAt:2}]},
  settlements:{available:true,pending:0,due:0,items:[]},limits:{itemsPerSource:20},limitations:['Read only.'],...overrides});
const memory=()=>({schemaVersion:1,updatedAt:'2026-11-06T12:00:00.000Z',records:[{
  id:'change_one',title:'Saved change',summary:'A recorded result',status:'needs_verification',updatedAt:'2026-11-06T12:00:00.000Z',
  nextAction:'Inspect production evidence',files:['lab/owner.html'],tests:[{label:'Fixture',result:'passed',scope:'Local only'}],
  evidence:[{kind:'source',summary:'Recorded source',scope:'No production claim',source:'javascript:alert(1)'}],
  links:[{label:'Rejected URL',url:'https://evil.test/private'},{label:'Source',url:'https://github.com/parallelvisionberlin/parallelvisionberlin.github.io'}]
}],handoffs:[]});
function fixture(t,{call,loadWorkRecords=async()=>memory()}={}){
  const previous=globalThis.document,elements=Object.fromEntries(ids.map(id=>[id,new Element('div')]));
  elements['owner-operations-refresh'].tagName='BUTTON';
  const filters=['all','planned','in_progress','needs_verification','deployed'].map(state=>{
    const button=new Element('button');button.dataset.ownerWorkState=state;return button;
  });
  globalThis.document={getElementById:id=>elements[id]||null,createElement:tag=>new Element(tag),querySelectorAll:()=>filters};
  t.after(()=>{globalThis.document=previous;});
  const calls=[],opened=[];let ready=true,revision=1;
  const ui=createOwnerOperationsUI({call:async path=>{calls.push(path);return call?call(path):path==='/health'?{ok:true,version:'fixture',operations:'owner-operations-v1'}:snapshot();},
    ownerReady:()=>ready,revision:()=>revision,openActivity:customer=>opened.push(customer),loadWorkRecords});
  return {ui,elements,filters,calls,opened,setReady:value=>{ready=value;},advance:()=>{revision++;}};
}

test('operations UI is owner-gated, uses only read endpoints and shares the existing customer activity flow',async t=>{
  const f=fixture(t);
  f.setReady(false);await f.ui.refresh();await f.ui.loadRecords();assert.deepEqual(f.calls,[]);
  f.setReady(true);await f.ui.refresh();await f.ui.loadRecords();
  assert.deepEqual(f.calls,['/api/admin/operations?days=7','/health']);
  assert.match(f.elements['owner-operations-content'].textContent,/Provider result uncertain/);
  const button=nodes(f.elements['owner-operations-content']).find(node=>node.tagName==='BUTTON');
  button.click();assert.deepEqual(f.opened,[{id:'user_ONE'}]);
  assert.ok(f.calls.every(path=>!/(generate|submit|retry|checkout|purchase|delete)/i.test(path)));
  const links=nodes(f.elements['owner-work-records']).filter(node=>node.tagName==='A');
  assert.equal(links.length,1);assert.match(links[0].href,/^https:\/\/github\.com\//);
  assert.equal(nodes(f.elements['owner-work-records']).some(node=>node.tagName==='SCRIPT'),false);
});

test('unknown sources render unavailable rather than zero, and failed backend publication is explicit',async t=>{
  const f=fixture(t,{call:async path=>path==='/health'?{ok:true,version:'fixture'}:snapshot({
    jobs:{available:false,counts:{failed:null,uncertain:null,stale:null},items:[]},
    settlements:{available:false,pending:null,due:null,items:[]}
  })});
  await f.ui.refresh();
  const content=f.elements['owner-operations-content'];
  assert.equal(nodes(content).filter(node=>node.tagName==='DD'&&node.textContent==='Unavailable').length,4);
  assert.match(f.elements['owner-home-attention-items'].textContent,/Job status unavailable/);
  assert.doesNotMatch(content.textContent,/0 due|No matching retained jobs/);
  f.ui.clear();
  const previousCalls=f.calls.length;
  // A missing module/version must not become a healthy empty job report.
  f.setReady(false);await f.ui.refresh();assert.equal(f.calls.length,previousCalls);
});

test('refresh and memory reads are single-flight, snapshots are reused, explicit refresh re-reads',async t=>{
  const jobRead=deferred(),recordRead=deferred();let memoryReads=0;
  const f=fixture(t,{call:async path=>path==='/health'?{ok:true}:jobRead.promise,
    loadWorkRecords:()=>{memoryReads++;return recordRead.promise;}});
  const first=f.ui.refresh(),second=f.ui.refresh({force:true});
  assert.equal(f.elements['owner-operations-refresh'].disabled,true);
  assert.equal(f.calls.length,2);assert.equal(memoryReads,1);
  jobRead.resolve(snapshot());recordRead.resolve(memory());await Promise.all([first,second]);await f.ui.loadRecords();
  assert.equal(f.elements['owner-operations-refresh'].disabled,false);
  await f.ui.refresh();assert.equal(f.calls.length,2);assert.equal(memoryReads,1);
  await f.ui.refresh({force:true});assert.equal(f.calls.length,4);assert.equal(memoryReads,1);
});

test('session reset prevents stale snapshots and work-memory responses repainting private views',async t=>{
  const jobRead=deferred(),recordRead=deferred();
  const f=fixture(t,{call:async path=>path==='/health'?{ok:true}:jobRead.promise,loadWorkRecords:()=>recordRead.promise});
  const old=f.ui.refresh();
  f.advance();f.setReady(false);f.ui.clear();
  jobRead.resolve(snapshot());recordRead.resolve(memory());await old;
  assert.equal(f.elements['owner-operations-content'].textContent,'');
  assert.equal(f.elements['owner-work-records'].textContent,'');
  assert.equal(f.elements['owner-home-attention-items'].textContent,'');
  assert.equal(f.elements['owner-operations-refresh'].disabled,false);
});

test('network failure or a wrong operations version never renders a zero-error success',async t=>{
  let wrongVersion=false;
  const f=fixture(t,{call:async path=>{if(path==='/health')throw Error('private provider detail');
    if(!wrongVersion)throw Error('private network detail');return {...snapshot(),version:'old-deployment'};}});
  await f.ui.refresh();
  assert.match(f.elements['owner-operations-content'].textContent,/Operational data unavailable/);
  assert.match(f.elements['owner-operations-status'].textContent,/Backend publication or access needs verification/);
  assert.doesNotMatch(f.elements['owner-operations-content'].textContent,/private|0 costs|No matching/);
  wrongVersion=true;await f.ui.refresh({force:true});
  assert.match(f.elements['owner-operations-content'].textContent,/not a zero-error result/);
});
