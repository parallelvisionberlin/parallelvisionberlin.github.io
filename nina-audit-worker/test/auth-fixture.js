export function kvFixture(){
 const store=new Map();
 return {store,async put(k,v,options={}){store.set(k,{value:v,options});},async get(k,opts){const r=store.get(k);if(!r)return null;const type=typeof opts==='string'?opts:opts?.type;return type==='json'?JSON.parse(r.value):type==='arrayBuffer'?new TextEncoder().encode(r.value).buffer:r.value;},async delete(k){store.delete(k);},async list({prefix='',limit=1000,cursor}={}){const keys=[...store.keys()].filter(k=>k.startsWith(prefix)).sort();const start=Number(cursor)||0;return {keys:keys.slice(start,start+limit).map(name=>({name})),list_complete:start+limit>=keys.length,cursor:start+limit<keys.length?String(start+limit):''};}};
}
const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
export async function clerkFixture(){
 const key=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk=await crypto.subtle.exportKey('jwk',key.publicKey);jwk.kid='nina-audit-test';
 const issuer='https://audit-owner-test.clerk.accounts.dev';
 return {issuer,jwk,async token(sub,azp='https://parallelvisionlabel.com'){
 const now=Math.floor(Date.now()/1000);const text=enc({alg:'RS256',kid:jwk.kid})+'.'+enc({iss:issuer,sub,azp,iat:now,exp:now+300});
 const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key.privateKey,new TextEncoder().encode(text));return text+'.'+Buffer.from(sig).toString('base64url');}};
}
