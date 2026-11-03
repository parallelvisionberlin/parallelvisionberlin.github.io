import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {compileImagePrompt,AUTO_IMAGE_REINTERPRET_PROMPT} from '../lab/reference-guidance.js';

const source=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
const start=source.indexOf('function effectiveImagePrompt(){');
const end=source.indexOf('\nfunction settings(){',start);
assert.ok(start>=0&&end>start);
const effective=new Script(source.slice(start,end)+';effectiveImagePrompt()');
const character=()=>Array.from({length:8},(_,i)=>({
 name:'view-'+i+'.webp',role:'identity',note:('Saved photograph '+i+' detail. ').padEnd(300,String(i)),
 elementId:'ad4b7111-39f4-47a9-898b-45a1cf07a030',elementName:'Alma Rosati',
 elementCategory:'characters',elementView:i,elementCount:8
}));
function direction(refs,{typed='',mood=false,mode='base'}={}){
 return effective.runInNewContext({
  $:()=>({value:typed}),tool:'image',imageReferenceMode:mode,imageEngine:'seedream',
  imageInputReferences:()=>refs,referenceRoles:()=>refs,AUTO_IMAGE_REINTERPRET_PROMPT,
  moodUI:{active:()=>mood,selected:()=> '90s-cinema',intensity:()=>50}
 });
}

test('empty Image direction with Base and eight full Character notes fits the real prompt assembly',()=>{
 for(const extra of [[],[{name:'second-photo.webp',role:'none',note:''}]]){
  const refs=[{name:'base.webp',role:'base',note:''},...extra,...character()];
  const original=JSON.stringify(refs);
  const settings={type:'image',mode:'image',engine:'seedream',referenceMode:'base'};
  const prompt=compileImagePrompt(direction(refs),refs,settings);
  assert.ok(prompt.length<=5000,'Empty direction must work at the supported ten-photo capacity: '+prompt.length);
  assert.match(prompt,/Apply the assigned reference properties to the base image/);
  character().forEach((ref,i)=>{
   assert.ok(prompt.includes('Reference '+(i+extra.length+2)+' [Identity]'));
   assert.ok(prompt.includes(ref.note),'Full saved note '+i+' survives');
  });
  assert.equal(JSON.stringify(refs),original);
 }
});

test('Character fallback preserves authored directions, Moods, photo-only fidelity and reference-only behavior',()=>{
 const base={role:'base'},refs=[base,...character()];
 const typed='Keep the room, replace its person with Alma.';
 assert.equal(direction(refs,{typed}),typed);
 assert.equal(direction(refs,{mood:true}),'Create a natural photographic variation of the base image, preserving its subject and overall composition.');
 assert.equal(direction([base]),AUTO_IMAGE_REINTERPRET_PROMPT);
 assert.equal(direction([base,...character().slice(0,2)]),AUTO_IMAGE_REINTERPRET_PROMPT);
 assert.equal(direction(character(),{mode:'references'}),'');
 const long='An explicitly authored direction. '.repeat(200);
 const prompt=compileImagePrompt(direction(refs,{typed:long}),refs,{type:'image',mode:'image',engine:'seedream'});
 assert.ok(prompt.includes(long.trim()),'Authored text is never silently shortened');
 assert.ok(prompt.length>5000,'Existing over-budget protection must still reject genuinely oversized prompts');
});
