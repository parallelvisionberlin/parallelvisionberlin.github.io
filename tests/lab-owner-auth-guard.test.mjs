import test from 'node:test';
import assert from 'node:assert/strict';
import {createOwnerAuthGuard} from '../lab/owner-auth-guard.js';

test('initial owner identity loads once, routine Clerk token and profile updates do not reset workspace',()=>{
  let restarts=0,dialogOpen=true,scrollY=1280;
  const clerk={isSignedIn:true,user:{id:'user_RealOwner'},session:{id:'sess_RealOwner'}};
  const guard=createOwnerAuthGuard({
    getClerk:()=>clerk,
    onIdentityChange:()=>{restarts++;dialogOpen=false;scrollY=0;}
  });
  assert.equal(guard(),true,'initial signed-in identity loads');
  assert.equal(restarts,1);
  dialogOpen=true;scrollY=1280;
  for(let n=0;n<50;n++){
    // Clerk may return fresh User or Session objects during a silent token refresh.
    clerk.user={id:'user_RealOwner',firstName:'Updated '+n};
    clerk.session={id:'sess_RealOwner',lastActiveAt:new Date()};
    assert.equal(guard(),false,'same identity must not rebuild the dashboard');
  }
  assert.equal(restarts,1);
  assert.equal(dialogOpen,true,'review dialog must survive routine token updates');
  assert.equal(scrollY,1280,'the page must stay at the selected customer');
});

test('real account switches, session changes and sign out still clear private owner content',()=>{
  let resets=0;
  const clerk={isSignedIn:false,user:null,session:null};
  const guard=createOwnerAuthGuard({getClerk:()=>clerk,onIdentityChange:()=>resets++});
  assert.equal(guard(),true);
  assert.equal(guard(),false);
  assert.equal(resets,1);
  clerk.isSignedIn=true;clerk.user={id:'user_A'};clerk.session={id:'sess_A'};
  assert.equal(guard(),true);
  assert.equal(guard(),false);
  clerk.session={id:'sess_A_New'};assert.equal(guard(),true,'new session must be authorized');
  clerk.user={id:'user_B'};clerk.session={id:'sess_B'};
  assert.equal(guard(),true,'switching user must clear previous account data');
  clerk.isSignedIn=false;clerk.user=null;clerk.session=null;
  assert.equal(guard(),true,'sign out must lock the dashboard');
  assert.equal(guard(),false);
  assert.equal(resets,5);
});

test('transient missing Session during Clerk refresh does not unmount an authorized dashboard',()=>{
  let resets=0;
  const clerk={isSignedIn:true,user:{id:'user_Owner'},session:{id:'sess_Owner'}};
  const guard=createOwnerAuthGuard({getClerk:()=>clerk,onIdentityChange:()=>resets++});
  assert.equal(guard(),true);
  clerk.session=null;
  assert.equal(guard(),false);
  clerk.session={id:'sess_Owner'};
  assert.equal(guard(),false);
  clerk.user=null;
  assert.equal(guard(),false);
  clerk.user={id:'user_Owner'};
  assert.equal(guard(),false);
  assert.equal(resets,1);
});

test('unavailable identity cannot authorize an owner dashboard',()=>{
  const clerk={isSignedIn:true,user:null,session:null};
  let resets=0;
  const guard=createOwnerAuthGuard({getClerk:()=>clerk,onIdentityChange:()=>resets++});
  assert.equal(guard(),false);
  assert.equal(resets,0);
  clerk.user={id:'user_Owner'};clerk.session={id:'sess_Owner'};
  assert.equal(guard(),true);
  assert.equal(resets,1);
});
