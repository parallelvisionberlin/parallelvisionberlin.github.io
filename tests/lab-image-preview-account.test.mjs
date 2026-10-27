import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const legacy='pv-lab-image-previews-hidden-v1';
function workspace(initial={},blocked=false){
  const values=new Map(Object.entries(initial)),events={},classes=new Set();
  if(values.get(legacy)==='1')classes.add('pv-image-previews-hidden');
  const list={contains:key=>classes.has(key),remove:key=>classes.delete(key),
    toggle(key,on){if(on)classes.add(key);else classes.delete(key);}};
  const button={addEventListener:(name,fn)=>events[name]=fn,setAttribute(){}};
  const message={classList:{add(){},remove(){}},setAttribute(){}};
  const app={classList:{contains:()=>true}};
  const document={documentElement:{classList:list},
    getElementById:id=>({'app':app,'history-preview-toggle':button,'image-discreet-message':message}[id]||null),
    addEventListener:(name,fn)=>events[name]=fn};
  runInNewContext(readFileSync('lab/image-discreet.js','utf8'),{document,window:{},
    localStorage:{getItem:key=>{if(blocked)throw Error('Storage unavailable');return values.get(key)??null;},setItem:(key,value)=>{if(blocked)throw Error('Storage unavailable');values.set(key,value);}},
    MutationObserver:class{observe(){}},setTimeout:()=>1,clearTimeout(){}});
  return {values,hidden:()=>classes.has('pv-image-previews-hidden'),click:()=>events.click(),
    select:(userId,hasHistory)=>events['pv-image-preview-account']({detail:{userId,hasHistory}})};
}
test('new account shows cards even when a previous account concealed previews',()=>{
  const w=workspace({[legacy]:'1'});
  w.select('new-user');w.select('new-user',false);
  assert.equal(w.hidden(),false);
  assert.equal(w.values.get(legacy+':account:new-user'),'0');
});
test('existing library keeps its legacy concealment during first migration',()=>{
  const w=workspace({[legacy]:'1'});
  w.select('existing-user');assert.equal(w.hidden(),true);
  w.select('existing-user',true);assert.equal(w.hidden(),true);
  assert.equal(w.values.get(legacy+':account:existing-user'),'1');
});
test('hide and reveal persist separately across accounts, reload and empty History',()=>{
  const w=workspace();
  w.select('a',false);w.click();assert.equal(w.hidden(),true);
  w.select('b',false);assert.equal(w.hidden(),false);
  w.select('a',false);assert.equal(w.hidden(),true,'Empty History cannot override an explicit preference');
  w.click();assert.equal(w.hidden(),false);
  w.select('b',false);w.click();
  const restored=workspace(Object.fromEntries(w.values));
  restored.select('a');assert.equal(restored.hidden(),false);
  restored.select('b');assert.equal(restored.hidden(),true);
  restored.select('');assert.equal(restored.hidden(),false,'Sign-out clears the private presentation');
});

test('an explicit hidden choice survives refresh when browser storage is unavailable',()=>{
  const w=workspace({},true);w.select('a',false);w.click();
  w.select('a',false);assert.equal(w.hidden(),true);
  w.select('b',false);assert.equal(w.hidden(),false);
  w.select('a',false);assert.equal(w.hidden(),true);
});
