import test from 'node:test';
import assert from 'node:assert/strict';
import {viewerLibraryEntries,loadViewerReference,guidanceLearned,rememberGuidance} from '../lab/viewer-replacement-library.js';
const refs=Array.from({length:8},(_,i)=>({id:'photo-'+i,name:'Angle '+i,role:i===7?'body':'identity',note:'Authored note '+i}));
const item={id:'20000000-0000-4000-8000-000000000099',name:'PVSCENE1|characters|Alma',title:'Alma',category:'characters',refs};
test('the existing private category and photo-pack library remain separate',()=>{
 const all=[item,{name:'PVSCENE1|props|Camera',refs:[{id:'camera'}]},{id:'pack',name:'My portraits',refs:[{id:'person',role:'identity'},{id:'base',role:'base'}]}];
 assert.deepEqual(viewerLibraryEntries(all,'person').map(x=>x.title),['Alma']);
 assert.deepEqual(viewerLibraryEntries(all,'person','library')[0].refs.map(x=>x.id),['person']);
 assert.equal(viewerLibraryEntries(all,'object')[0].title,'Camera');
 assert.equal(viewerLibraryEntries(all,'location').length,0);
});
test('Characters retain all eight photos, their order, group metadata and authored notes',async()=>{
 const reads=[];const result=await loadViewerReference(item,'person',{read:async id=>{reads.push(id);return new File(['x'],id,{type:'image/png'});},limit:10,isCurrent:()=>true});
 assert.deepEqual(reads,refs.map(x=>x.id));assert.equal(result.count,8);
 for(let i=0;i<8;i++){assert.ok(result.refs[i].label.note.includes('Authored note '+i));assert.equal(result.refs[i].label.elementView,i);assert.equal(result.refs[i].label.elementCount,8);}
 assert.equal(result.refs[7].label.role,'body');
});
test('a small model limit fails before any private-photo load instead of dropping Character views',async()=>{
 let reads=0;await assert.rejects(loadViewerReference(item,'person',{read:async()=>{reads++;},limit:3,isCurrent:()=>true}),/8 saved photos/);assert.equal(reads,0);
});
test('changing the account or closing the editor cancels a saved bundle',async()=>{
 let active=true,reads=0;
 await assert.rejects(loadViewerReference(item,'person',{read:async()=>{reads++;active=false;return new File(['x'],'x');},limit:10,isCurrent:()=>active}),/session changed/);assert.equal(reads,1);
});
test('a Location is never silently used as an Object',async()=>{
 await assert.rejects(loadViewerReference({...item,category:'locations'},'object',{read:async()=>{},limit:10,isCurrent:()=>true}),/matching/);
});
test('guidance stores one account-scoped completion flag and handles unavailable storage',()=>{
 const data=new Map(),storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
 assert.equal(guidanceLearned(storage,'one'),false);rememberGuidance(storage,'one');
 assert.equal(guidanceLearned(storage,'one'),true);assert.equal(guidanceLearned(storage,'two'),false);
 assert.deepEqual([...data.values()],['1']);assert.equal(guidanceLearned({getItem(){throw Error('blocked');}},'one'),false);
 assert.doesNotThrow(()=>rememberGuidance({setItem(){throw Error('blocked');}},'one'));
});
