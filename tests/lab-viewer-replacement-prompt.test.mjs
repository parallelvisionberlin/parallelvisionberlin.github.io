import test from 'node:test';
import assert from 'node:assert/strict';
import {compileImagePrompt} from '../lab/reference-guidance.js';

const id='bb582de2-453d-499a-a1c5-c1b4bef6e3ba';
const notes=Array.from({length:8},(_,i)=>'View '+i+' stable Alma identity/body details: '+('Natural proportions, consistent hair texture and real skin, retain the pose. ').repeat(3).slice(0,245));
function fixture(scope='person'){
 const roles=[{name:'Original image',role:'base',note:''},
  ...notes.map((note,i)=>({name:'Alma Rosati',role:i===7?'body':'identity',note,
    elementId:id,elementName:'Alma Rosati',elementCategory:'characters',elementView:i,elementCount:8}))];
 const ids=Array.from({length:8},(_,i)=>'source-'+i);
 const s={type:'image',mode:'image',engine:'seedream',referenceMode:'base',
   replacement:{version:1,scope,referenceSourceIds:ids},referenceSourceIds:['base',...ids]};
 const direction='Replace the selected '+scope+' using the saved Character; preserve all other subjects, lighting, overlaps and the exact original camera position.';
 return {roles,settings:s,direction};
}
test('all eight Alma views and all authored notes fit a normal 5000-character quote without discarding any',()=>{
 const {roles,settings,direction}=fixture();
 const assembled=compileImagePrompt(direction,roles,settings);
 assert.ok(assembled.length<5000,'Prompt is '+assembled.length+' chars');
 assert.match(assembled,/Alma Rosati \(8 views\): one consistent person/);
 assert.match(assembled,/Reference 1 \[Base\]/);
 assert.match(assembled,/Reference 9 \[Body\]/);
 for(const note of notes)assert.ok(assembled.includes(note.trim()),'Each saved view note survives after existing whitespace normalization');
 assert.ok(assembled.includes(direction),'Authored direction remains unmodified');
 assert.match(assembled,/REVIEWED REPLACEMENT/);
});
test('Face scope uses only identity reference roles without whole-body changes',()=>{
 const {roles,settings,direction}=fixture('face');
 const compiled=compileImagePrompt(direction,roles.slice(0,8),
   {...settings,referenceSourceIds:settings.referenceSourceIds.slice(0,8),replacement:{...settings.replacement,referenceSourceIds:settings.replacement.referenceSourceIds.slice(0,7)}});
 assert.ok(compiled.length<5000);assert.match(compiled,/facial identity only/);assert.ok(compiled.includes(notes[0].trim()));
});
test('normal Image and non-replacement reference prompts keep their original compiler',()=>{
 const {roles,settings,direction}=fixture();
 const output=compileImagePrompt(direction,roles.slice(0,2),{...settings,replacement:null});
 assert.doesNotMatch(output,/REVIEWED BASE EDIT/);
 assert.match(output,/REFERENCE MAP/);
});
test('long user-authored directions are never silently cut to satisfy a provider limit',()=>{
 const {roles,settings}=fixture();
 const requested='Original details '+('Precise art direction. ').repeat(190);
 const output=compileImagePrompt(requested,roles,settings);
 assert.ok(output.includes(requested.trim()));
 assert.ok(output.length>5000,'The existing server limit can give a clear error for genuinely oversized authored input');
});
