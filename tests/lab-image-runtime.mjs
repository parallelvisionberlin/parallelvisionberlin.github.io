import {Miniflare} from 'miniflare';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const source=await readFile(new URL('../lab-worker/seedream-flash.mjs',import.meta.url),'utf8');
const mf=new Miniflare({workers:[{name:'flash-spicyapi-runtime-test',modules:true,compatibilityDate:'2026-08-01',script:source.replace(/^export /gm,'')+`
export default {async fetch(){
  const fail=(code,msg)=>{throw Error(msg)};
  const original={type:'image',engine:'flash',mode:'image',prompt:'Natural light portrait',resolution:'2k',aspectRatio:'auto'};
  const text=seedreamFlashParameters(original,{fail});
  const edit=seedreamFlashParameters(original,{fail,referenceRoles:[{role:'identity'}]});
  return Response.json({text:text.model,edit:FLASH_EDIT,provider:text.provider,textInput:seedreamFlashInput(text,0),editInput:seedreamFlashInput(edit,1)});
}};`}]});
try{
  const response=await mf.dispatchFetch('http://localhost/');
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.provider,'spicy');
  assert.equal(data.text,'bytedance/seedream-5.0-flash/text-to-image');
  assert.equal(data.edit,'bytedance/seedream-5.0-flash/edit');
  assert.equal(data.textInput.aspect_ratio,'16:9');
  assert.equal(data.editInput.aspect_ratio,'auto');
  console.log('PASS Flash SpicyAPI parameter generation in real Workers runtime without paid requests');
}finally{await mf.dispose();}
