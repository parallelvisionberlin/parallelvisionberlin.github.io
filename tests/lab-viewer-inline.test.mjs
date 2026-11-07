import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,createContext} from 'node:vm';
const source=readFileSync('lab/lab.js','utf8');
const start=source.indexOf('async function stageViewerReplacement(selection){');
const end=source.indexOf("$('image-detail-fix-eyes').onclick",start);
assert.ok(start>0&&end>start);
function fixture({provider='spicy',badQuote=false,networkFailure=false}={}){
 const requests=[],uploads=[],recorded=[];let selectionValid=true,current=true,clock=Date.now();
 const controls={resolution:{value:'1k'},ratio:{options:[{value:'auto'},{value:'4:3'}]}};
 const state={owner:true,epoch:1,imageEngine:provider==='fal'?'krea3':provider==='gemini'?'gemini':'seedream',currentProvider:()=>provider,$:id=>controls[id],busy:false,imageSubmissionPending:false,
   config:{imageReplacementEnabled:true},tool:'image',customerImageProviderReady:()=>true,customerMode:true,customerGenerationReady:true,customerCreditBalance:100,
   modelImageInputIssue:()=>null,inspectImage:async file=>({file,width:640,height:480}),uploadAsset:async file=>{uploads.push(file);return 'asset-'+uploads.length;},
   File,Date:{now:()=>clock},releaseReference:()=>{},activeStates:new Set(['queued']),slotStates:new Set(['queued']),activeJobs:[],limitFor:()=>4,jobProvider:()=>provider,
   money:n=>'$'+n.toFixed(2),confirm:()=>true,setActive:job=>recorded.push(job),surfaceHistoryJob:job=>recorded.push(job),refreshHistorySoon:()=>{},
   imageReplacement:{finalize:async job=>({...job,settings:{...job.settings,replacementFinalized:true}})},
   fetchCustomerImagePrice:async(s,check)=>{check();return {kind:'bound',credits:35,expiresAt:clock+120000,quotes:[{id:'quote-1',estimatedUsd:.1,settings:{...s.settings,replacement:{...s.settings.replacement,...(badQuote?{scope:'object'}:{})}}}]};},
   api:async(path,options)=>{requests.push({path,body:options?.body});if(networkFailure)throw Error('Timeout');return {job:{id:'job-1',status:'queued',settings:options?.body?.settings||{}},jobs:[{id:'job-1',status:'queued'}]};},
   setTimeout:(f)=>setTimeout(f,0)};
 const context=createContext(state);
 const prepare=new Script(source.slice(start,end)+'\nstageViewerReplacement').runInContext(context);
 const selection={file:new File(['a'],'base.png',{type:'image/png'}),reference:new File(['b'],'reference.png',{type:'image/png'}),id:'original-id',mask:new Blob(['mask']),width:640,height:480,scope:'person',direction:'Keep pose.',isCurrent:()=>current,selectionCurrent:()=>selectionValid};
 return {state,requests,uploads,recorded,selection,prepare:()=>prepare(selection),invalidate:()=>{selectionValid=false;},close:()=>{current=false;},expire:()=>{clock+=120000;}};
}
test('preparing a viewer edit never submits, and one quote can only be submitted once',async()=>{
 const f=fixture(),q=await f.prepare();assert.equal(f.requests.length,0);assert.equal(f.uploads.length,2);assert.equal(q.label,'35 credits');
 const job=await q.submit();assert.equal(job.id,'job-1');assert.equal(f.requests.length,1);assert.equal(f.requests[0].path,'/api/jobs');
 assert.equal(f.requests[0].body.quoteId,'quote-1');await assert.rejects(q.submit(),/already sent/);assert.equal(f.requests.length,1);
});
test('a changed mask invalidates the captured price before any paid request',async()=>{
 const f=fixture(),q=await f.prepare();f.invalidate();await assert.rejects(q.submit(),/selection changed/);assert.equal(f.requests.length,0);
});
test('closing or changing accounts invalidates the captured request',async()=>{
 const f=fixture(),q=await f.prepare();f.close();await assert.rejects(q.submit(),/selection changed/);assert.equal(f.requests.length,0);
 const g=fixture(),r=await g.prepare();g.state.epoch++;await assert.rejects(r.submit(),/selection changed/);assert.equal(g.requests.length,0);
});
test('expired quotes and reduced wallet balances fail closed',async()=>{
 const f=fixture(),q=await f.prepare();f.expire();await assert.rejects(q.submit(),/expired/);assert.equal(f.requests.length,0);
 const g=fixture(),r=await g.prepare();g.state.customerCreditBalance=5;await assert.rejects(r.submit(),/Not enough credits/);assert.equal(g.requests.length,0);
});
test('a quote for the wrong selected area is rejected',async()=>{
 const f=fixture({badQuote:true});await assert.rejects(f.prepare(),/does not match/);assert.equal(f.requests.length,0);
});
test('an uncertain network response cannot resubmit the same quote',async()=>{
 const f=fixture({networkFailure:true}),q=await f.prepare();await assert.rejects(q.submit(),/not confirmed/);assert.equal(q.wasSubmitted(),true);
 await assert.rejects(q.submit(),/already sent/);assert.equal(f.requests.length,1);
});
test('reference replacement uses the selected Krea and Nano endpoints',async()=>{
 for(const [provider,path] of [['fal','/api/fal/krea-3'],['gemini','/api/gemini/jobs']]){
  const f=fixture({provider}),q=await f.prepare();await q.submit();assert.equal(f.requests[0].path,path);assert.equal(f.requests[0].body.settings.engine,f.state.imageEngine);
 }
});
test('no main Image draft mutation remains in the viewer adapter',()=>{
 const adapter=source.slice(start,end);
 assert.doesNotMatch(adapter,/clearMedia\(|moodUI\.clear|references\s*=|imageRevision\+\+|renderReferences\(|imageReplacement\.restore/);
 assert.doesNotMatch(adapter,/\$\('prompt'\)\.value\s*=/);
});
