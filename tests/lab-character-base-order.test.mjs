import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeImageReferenceOrder,assignImageBase} from '../lab/reference-order.js';

const character=()=>Array.from({length:8},(_,i)=>({id:'alma-'+i,elementId:'alma',
  elementCategory:'characters',elementView:i,role:'identity',note:'Alma note '+i}));

test('deleting the Base never promotes Character photos; a replacement goes before the complete Character',()=>{
 const alma=character(),refs=[{id:'old-base',role:'base'},...alma];
 refs.shift();
 assert.equal(normalizeImageReferenceOrder(refs,'base'),'references');
 assert.ok(alma.every(ref=>ref.role==='identity'));
 const replacement={id:'new-base',role:'none'};
 refs.push(replacement);
 assert.equal(assignImageBase(refs,replacement),true);
 assert.equal(refs[0],replacement);
 assert.equal(replacement.role,'base');
 assert.deepEqual(refs.slice(1),alma);
 assert.ok(alma.every((ref,i)=>ref.role==='identity'&&ref.note==='Alma note '+i&&ref.elementView===i));
});

test('legacy drafts recover a Character wrongly marked Base without losing its role or notes',()=>{
 const alma=character();alma[0].role='base';alma[0].nonBaseRole='custom';
 const photo={id:'scene',role:'none'},refs=[...alma,photo];
 assert.equal(normalizeImageReferenceOrder(refs,'base'),'base');
 assert.equal(refs[0],photo);
 assert.equal(alma[0].role,'custom');
 assert.equal(alma[0].note,'Alma note 0');
 assert.ok(alma.slice(1).every(ref=>ref.role==='identity'));
});

test('Use as Base restores the old Base role and references-only restores every supporting role',()=>{
 const alma=character(),old={role:'base',nonBaseRole:'lighting'},next={role:'composition'};
 const refs=[old,...alma,next];
 assert.equal(assignImageBase(refs,next),true);
 assert.equal(refs[0],next);assert.equal(old.role,'lighting');
 assert.equal(normalizeImageReferenceOrder(refs,'references'),'references');
 assert.equal(next.role,'composition');
 assert.equal(assignImageBase(refs,alma[0]),false,'A grouped Character cannot become the Base');
 assert.equal(assignImageBase(refs,{}),false);
});
