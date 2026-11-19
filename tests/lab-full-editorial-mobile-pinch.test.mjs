import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync(new URL('../lab/full-editorial.html',import.meta.url),'utf8');

test('Full Editorial prevents touch pinch zoom only in its workflow',()=>{
  assert.match(html, /@media \(hover: none\) and \(pointer: coarse\)\s*\{\s*#editorial-flow\s*\{\s*touch-action:\s*pan-x pan-y;/);
  assert.match(html, /<meta name="viewport" content="width=device-width,initial-scale=1">/);
  assert.doesNotMatch(html,/user-scalable=no|maximum-scale=1/);
  const script=html.match(/<!-- FULL_EDITORIAL_PINCH_GUARD_20261119:[\s\S]*?<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script,'Guard must be present in the document head');

  const handlers=new Map();
  class MockElement {
    constructor(inWorkflow){this.inWorkflow=inWorkflow;}
    closest(selector){return selector==='#editorial-flow'&&this.inWorkflow?this:null;}
  }
  runInNewContext(script,{
    Element:MockElement,
    document:{addEventListener(name,handler,options){handlers.set(name,{handler,options});}}
  });
  for(const name of ['gesturestart','gesturechange']){
    const entry=handlers.get(name);
    assert.ok(entry, name+' handler exists');
    assert.equal(entry.options.passive,false,'Safari gesture must be cancelable');
    const inside={cancelable:true,target:new MockElement(true),preventDefault(){this.prevented=true;}};
    entry.handler(inside);
    assert.equal(inside.prevented,true,'Workflow pinch is prevented');
    const outside={cancelable:true,target:new MockElement(false),preventDefault(){this.prevented=true;}};
    entry.handler(outside);
    assert.notEqual(outside.prevented,true,'Elsewhere page zoom stays accessible');
    const noncancelable={cancelable:false,target:new MockElement(true),preventDefault(){this.prevented=true;}};
    entry.handler(noncancelable);
    assert.notEqual(noncancelable.prevented,true,'Noncancelable events remain intact');
  }
});
