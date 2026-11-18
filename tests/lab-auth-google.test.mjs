import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isCustomGoogleHost,validOAuthReturn,readGoogleReturn,openLabSignIn,clearGoogleReturn} from '../lab/auth-google.js';

const nonce='a1b2c3d4-e5f6-47ab-8cde-1234567890ab';
const hostDescriptors=Object.fromEntries(['document','location','sessionStorage','crypto'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
function memory(){
  const data=new Map();
  return {getItem:key=>data.get(key)||null,setItem:(key,val)=>data.set(key,val),removeItem:key=>data.delete(key)};
}
test('Custom Google OAuth is isolated to the PV LAB apex, not legacy or preview instances',()=>{
  assert.equal(isCustomGoogleHost('pvlab.studio'),true);
  assert.equal(isCustomGoogleHost('parallelvisionlabel.com'),false);
  assert.equal(isCustomGoogleHost('pvlab-studio.pages.dev'),false);
});
test('OAuth callback return only allows same-origin URLs, preserving checkout path and hash',()=>{
  const origin='https://pvlab.studio';
  const good='/account.html?lab-checkout=5#pricing';
  assert.equal(validOAuthReturn(good,origin),origin+good);
  assert.equal(validOAuthReturn('https://evil.test/steal',origin),null);
  assert.equal(validOAuthReturn('//evil.test/steal',origin),null);
  assert.equal(validOAuthReturn('javascript:alert(1)',origin),null);
  assert.equal(validOAuthReturn('https://evil.test@pvlab.studio/',origin),null);
});
test('Callback rejects expired, replayed and mismatched OAuth intents',()=>{
  const store=memory(),origin='https://pvlab.studio',now=1800000000000;
  store.setItem('pvlab-google-oauth-return-v1',JSON.stringify({nonce,returnUrl:origin+'/studio.html?tool=image',at:now}));
  assert.equal(readGoogleReturn('?pv_auth='+nonce,store,origin,now),origin+'/studio.html?tool=image');
  assert.equal(readGoogleReturn('?pv_auth=bad',store,origin,now),null);
  assert.equal(readGoogleReturn('?pv_auth='+nonce,store,origin,now+900001),null);
  assert.equal(readGoogleReturn('?pv_auth='+nonce,store,origin,now-1),null);
  clearGoogleReturn(store);
  assert.equal(readGoogleReturn('?pv_auth='+nonce,store,origin,now),null);
});
function node(tag,lookup){
  const item={tagName:tag,id:'',className:'',dataset:{},children:[],open:false,hidden:false,
    setAttribute(name,val){this[name]=val;},
    append(...children){this.children.push(...children);},
    remove(){this.removed=true;this.open=false;},
    addEventListener(){},
    showModal(){this.open=true;},
    querySelector(sel){return descend(this,x=>'.'+x.className===sel);}
  };
  return item;
}
function descend(root,predicate){
  if(predicate(root))return root;
  for(const ch of root.children||[]){const match=descend(ch,predicate);if(match)return match;}
  return null;
}
test('Google entry uses a branded modal and preserves selected checkout return',async t=>{
  const saved=Object.fromEntries(['document','location','sessionStorage','crypto'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  t.after(()=>{for(const [key,descriptor]of Object.entries(saved)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  const store=memory(),lookup={};
  const doc={getElementById:id=>lookup[id]||null,createElement:tag=>node(tag,lookup),head:{append(el){lookup[el.id]=el;}},body:{append(el){lookup[el.id]=el;}}};
  const globals={document:doc,location:{hostname:'pvlab.studio',origin:'https://pvlab.studio',href:'https://pvlab.studio/#pricing'},sessionStorage:store,crypto:{randomUUID:()=>nonce}};
  for(const [key,value]of Object.entries(globals))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
  let redirect;
  const clerk={isSignedIn:false,client:{signIn:{authenticateWithRedirect:async args=>{redirect=args;}}},openSignIn:()=>{throw Error('Should use custom Google flow');}};
  openLabSignIn(clerk,{forceRedirectUrl:'https://pvlab.studio/?lab-checkout=abc#pricing'});
  const dialog=lookup['pv-auth-dialog'];
  assert.equal(dialog.open,true);
  assert.equal(descend(dialog,x=>x.className==='pv-auth-byline').textContent,'BY PARALLEL VISION');
  await descend(dialog,x=>x.className==='pv-auth-google').onclick();
  assert.equal(redirect.strategy,'oauth_google');
  assert.equal(redirect.redirectUrl,'https://pvlab.studio/auth-callback.html?pv_auth='+nonce);
  assert.equal(redirect.redirectUrlComplete,redirect.redirectUrl);
  assert.equal(readGoogleReturn('?pv_auth='+nonce,store,'https://pvlab.studio'),'https://pvlab.studio/?lab-checkout=abc#pricing');
});
test('First-party callback retains canonical approved logo and Clerk state completion',()=>{
  const html=readFileSync('lab/auth-callback.html','utf8'),script=readFileSync('lab/auth-callback.js','utf8');
  assert.match(html,/branding\/pvlab-wordmark-bold\.svg/);
  assert.match(html,/BY PARALLEL VISION/);
  assert.match(html,/class="track"/);
  assert.match(script,/await clerk\.handleRedirectCallback/);
  assert.match(script,/if\(clerk\.isSignedIn&&clerk\.session\)/);
  assert.doesNotMatch(script,/checkout\/create|credits\/update|token=/i);
});
test('Google modal fixture restores the original host property descriptors',()=>{
  for(const [key,descriptor]of Object.entries(hostDescriptors))
    assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis,key),descriptor,key+' is restored');
});
