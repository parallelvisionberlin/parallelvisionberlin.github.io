import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../lab/account-menu.js',import.meta.url),'utf8');
const {accountIdentity,referralsAvailable}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('account avatars use the signed-in identity and reject unsafe image schemes',()=>{
  assert.deepEqual(accountIdentity({fullName:'Alejandro Molinari',hasImage:false,imageUrl:'https://example.com/default.png'}),{name:'Alejandro Molinari',email:'',initials:'AM',image:''});
  assert.equal(accountIdentity({primaryEmailAddress:{emailAddress:'eva@example.com'}}).initials,'EV');
  assert.equal(accountIdentity({fullName:'Eva Marris',hasImage:true,imageUrl:'javascript:alert(1)'}).image,'');
  assert.equal(accountIdentity({fullName:'Eva Marris',hasImage:true,imageUrl:'https://example.com/eva.png'}).image,'https://example.com/eva.png');
});
test('referral menu appears only for an eligible customer, never owner, pilot or restricted accounts',()=>{
  const eligible={customer:true,billingReady:true,generationReady:true};
  assert.equal(referralsAvailable(eligible),true);
  for(const override of [{customer:false},{billingReady:false},{generationReady:false},{pilot:true},{accountClosed:{state:'requested'}},{billingReview:true}])assert.equal(referralsAvailable({...eligible,...override}),false);
  assert.equal(referralsAvailable(null),false);
});

test('Agency stays in the verified owner-only account actions',()=>{
  assert.match(source,/agencyLink\.href='https:\/\/parallelvisionlabel\.com\/agency\//);
  assert.match(source,/agencyLink\.hidden=true/);
  assert.match(source,/agencyLink\.hidden=profile\?\.owner!==true/);
  assert.match(source,/if\(!signed\).*agencyLink\.hidden=true/);
});
