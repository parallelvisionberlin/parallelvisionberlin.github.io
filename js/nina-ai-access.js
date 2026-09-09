import { Clerk } from 'https://esm.sh/@clerk/clerk-js@6?bundle';
const API='https://parallel-vision-nina-audit.parallelvision.workers.dev';
const $=id=>document.getElementById(id);
const REQUEST_KEY='nina-audit-consent';
let requestId=new URLSearchParams(location.hash.slice(1)).get('request');
try {
  if(requestId)sessionStorage.setItem(REQUEST_KEY,JSON.stringify({id:requestId,expires:Date.now()+600000}));
  else if(!new URLSearchParams(location.search).has('manage')){const saved=JSON.parse(sessionStorage.getItem(REQUEST_KEY)||'null');if(saved?.expires>Date.now())requestId=saved.id;}
} catch {}
history.replaceState(null,'',location.pathname+location.search);
let clerk, loading=false;
// Do not render consent inside an attacker-controlled frame.
if(window.top!==window.self){document.body.replaceChildren(document.createTextNode('Open this authorization page directly.'));throw new Error('Framed authorization is not allowed');}
async function api(path,body){
  const token=await clerk?.session?.getToken?.();
  if(!token)throw new Error('Sign in with the Nina owner account.');
  const response=await fetch(API+path,{method:body?'POST':'GET',cache:'no-store',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error || 'The analysis service is not available.');
  return data;
}
async function sync(){
  if(loading)return;loading=true;
  $('consent').hidden=true;$('manage').hidden=true;$('agree').checked=false;$('approve').disabled=true;
  try{
    $('signIn').hidden=!!clerk?.isSignedIn;
    if(!clerk?.isSignedIn){$('status').textContent='Sign in with the same owner account used for Nina Analytics.';return;}
    if(requestId){
      const data=await api('/consent?request='+encodeURIComponent(requestId));
      $('client').textContent=data.clientName+' · callback: '+data.callbackHost;
      $('status').textContent='Owner access verified. Review the permission before continuing.';
      $('consent').hidden=false;
    }else{$('status').textContent='Connect or revoke a private analysis connection.';$('manage').hidden=false;}
  }catch(e){$('status').textContent=e.message;}finally{loading=false;}
}
async function decide(approve){
  $('approve').disabled=true;$('deny').disabled=true;
  try{
    if(approve&&!$('agree').checked)throw new Error('Review and confirm the permission first.');
    const data=await api('/consent',{id:requestId,approve});
    const target=new URL(data.redirectTo);
    if(target.protocol!=='https:'||!['chatgpt.com','chat.openai.com'].includes(target.hostname))throw new Error('Unexpected authorization redirect.');
    try{sessionStorage.removeItem(REQUEST_KEY);}catch{}
    location.assign(target.href);
  }catch(e){$('status').textContent=e.message;$('approve').disabled=!$('agree').checked;$('deny').disabled=false;}
}
$('agree').addEventListener('change',()=>$('approve').disabled=!$('agree').checked);
$('approve').addEventListener('click',()=>void decide(true));$('deny').addEventListener('click',()=>void decide(false));
$('signIn').addEventListener('click',()=>clerk?.openSignIn());
$('revoke').addEventListener('click',async()=>{
  if(!confirm('Revoke all existing Nina analysis connections?'))return;
  $('revoke').disabled=true;
  try{await api('/revoke-all',{confirm:true});$('status').textContent='Revocation requested. Existing audit connections will stop working as the update propagates.';}
  catch(e){$('status').textContent=e.message;}finally{$('revoke').disabled=false;}
});
try{
  if(!window.__internal_ClerkUICtor)await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://clerk.parallelvisionlabel.com/npm/@clerk/ui@1/dist/ui.browser.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});
  clerk=new Clerk('pk_live_Y2xlcmsucGFyYWxsZWx2aXNpb25sYWJlbC5jb20k');
  await clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor}});
  clerk.addListener(()=>void sync());await sync();
}catch{$('status').textContent='Owner sign-in could not load. Refresh the page to retry.';}
