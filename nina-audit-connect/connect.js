import { Clerk } from 'https://esm.sh/@clerk/clerk-js@6?bundle';
const API='https://parallel-vision-nina-audit.parallelvision.workers.dev';
const $=id=>document.getElementById(id);
const requestId=location.hash.slice(1);
let clerk, approved=false, syncing=false;
async function api(path,body={}) {
  const token=await clerk?.session?.getToken?.();
  if(!token)throw new Error('Sign in using your Nina owner account.');
  const result=await fetch(API+path,{method:'POST',cache:'no-store',credentials:'omit',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await result.json().catch(()=>({}));
  if(!result.ok)throw new Error(data.error||'Connection unavailable.');
  return data;
}
async function sync() {
  if(syncing||approved)return;syncing=true;
  try{
    $('signIn').hidden=Boolean(clerk?.isSignedIn);$('approve').hidden=true;
    if(!clerk?.isSignedIn){$('status').textContent='Sign in with the same owner account you use for Nina Analytics.';return;}
    if(/^[a-f0-9]{64}$/.test(requestId)){
      const info=await api('/connect/inspect',{request:requestId});
      $('client').textContent=`Request from ${info.clientName}. Returns to ${info.callback}.`;
      $('status').textContent='Owner verified. Approval grants private read-only access.';
      $('approve').hidden=false;$('approve').disabled=false;
    }else $('status').textContent='No new connection request. Manage existing access below, or start the connection from ChatGPT.';
    const data=await api('/connect/grants');$('connections').hidden=false;$('grants').replaceChildren();
    for(const grant of data.grants||[]){
      const row=document.createElement('div');row.className='grant';const label=document.createElement('span');
      label.textContent='Nina read-only connection';const revoke=document.createElement('button');revoke.textContent='Revoke access';
      revoke.onclick=async()=>{revoke.disabled=true;try{await api('/connect/revoke',{grantId:grant.id});row.remove();$('status').textContent='Access revoked. The connection must be approved again before it can read records.';}catch(e){$('status').textContent=e.message;revoke.disabled=false;}};
      row.append(label,revoke);$('grants').append(row);
    }
    if(!(data.grants||[]).length)$('grants').textContent='No authorized connections.';
  }catch(e){$('status').textContent=e.message||'The reader has not been deployed or cannot be reached.';}
  finally{syncing=false;}
}
$('approve').onclick=async()=>{
  $('approve').disabled=true;$('status').textContent='Authorizing…';
  try{const result=await api('/connect/approve',{request:requestId,consent:true});
    const target=new URL(result.redirectTo);
    if(target.protocol!=='https:'||!['chatgpt.com','chat.openai.com','platform.openai.com'].includes(target.hostname))throw new Error('Unexpected callback. Connection stopped.');
    approved=true;location.replace(target.href);
  }catch(e){$('status').textContent=e.message;$('approve').disabled=false;}
};
$('signIn').onclick=()=>clerk?.openSignIn();
try{
  await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://clerk.parallelvisionlabel.com/npm/@clerk/ui@1/dist/ui.browser.js';script.onload=resolve;script.onerror=reject;document.head.append(script);});
  clerk=new Clerk('pk_live_Y2xlcmsucGFyYWxsZWx2aXNpb25sYWJlbC5jb20k');
  await clerk.load({ui:window.__internal_ClerkUICtor,signInFallbackRedirectUrl:location.href,signUpFallbackRedirectUrl:location.href});
  clerk.addListener(()=>void sync());await sync();
}catch{$('status').textContent='Sign-in could not load. Refresh this page or use Nina Analytics to verify your owner sign-in.';}
