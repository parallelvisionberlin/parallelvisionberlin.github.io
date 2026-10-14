import {loadLabAccount} from './native-account.js?v=20261015-clerk-v2';
import {createSessionRequest} from './session-request.js?v=20261015-account-link';
const $=id=>document.getElementById(id);
const studio=new Set(['pvlab.studio','www.pvlab.studio','pvlab-studio.pages.dev']).has(location.hostname.toLowerCase());
let clerk=null,busy=false;
const endpoint='https://parallel-vision-lab.parallelvision.workers.dev';
const status=(message,error=false)=>{const node=$('status');node.textContent=message||'';node.classList.toggle('error',error);};
const request=createSessionRequest({baseUrl:endpoint,getSession:()=>clerk?.session});
const show=(id,visible)=>{$(id).hidden=!visible;};
function destination(){
  const allowed=new Set(['/','/studio.html','/account.html','/lab/','/lab/studio.html','/lab/account.html']);
  const next=new URLSearchParams(location.search).get('next');
  if(next&&next.startsWith('/')&&!next.startsWith('//')){
    const parsed=new URL(next,location.origin);
    if(parsed.origin===location.origin&&allowed.has(parsed.pathname))
      return parsed.pathname+parsed.search+parsed.hash;
  }
  return './studio.html?tool=image';
}
async function call(path,init={}){
  const response=await request(path,init),data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||'Could not verify your PV LAB account.');
  return data;
}
async function refresh(){
  const signed=!!clerk?.isSignedIn;
  show('auth',!signed);
  show('old',false);show('new',false);show('fresh',false);show('linked',false);
  if(!signed)return;
  const state=await call('/api/migration/status');
  if(studio){
    if(state.linked){
      $('continue').href=destination();show('linked',true);
    }else{show('new',true);show('fresh',true);}
  }else{show('old',true);}
}
async function action(button,operation){
  if(busy)return;
  busy=true;button.disabled=true;status('');
  try{await operation();}
  catch(e){status(e?.message||'This request could not be completed. Please try again.',true);}
  finally{busy=false;button.disabled=false;}
}
$('sign-in').addEventListener('click',()=>void action($('sign-in'),async()=>{
  if(!clerk)clerk=await loadLabAccount();
  await clerk.openSignIn({
    forceRedirectUrl:location.href,signUpForceRedirectUrl:location.href,
    appearance:{variables:{colorBackground:'#191919',colorForeground:'#f3f1ec',colorMutedForeground:'#b4b1a9'}}
  });
}));
$('issue').addEventListener('click',()=>void action($('issue'),async()=>{
  const data=await call('/api/migration/issue',{method:'POST'});
  $('transfer-code').value=data.code;
  show('issued',true);status('Code ready. Copy it into the new PV LAB tab within 10 minutes.');
}));
$('copy').addEventListener('click',()=>void action($('copy'),async()=>{
  const code=$('transfer-code').value;
  if(!code)return;
  try{await navigator.clipboard.writeText(code);status('Code copied. Paste it on pvlab.studio.');}
  catch{$('transfer-code').focus();$('transfer-code').select();status('Select and copy the code shown above.');}
}));
$('redeem').addEventListener('click',()=>void action($('redeem'),async()=>{
  const code=$('redeem-code').value.trim();
  if(!/^[A-Za-z0-9_-]{43}$/.test(code))throw Error('Paste the complete transfer code from the original site.');
  await call('/api/migration/redeem',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});
  $('redeem-code').value='';
  status('Account linked. Opening your Studio.');
  await refresh();location.replace(destination());
}));
$('create').addEventListener('click',()=>void action($('create'),async()=>{
  await call('/api/migration/new',{method:'POST'});
  status('Welcome to PV LAB. Your new account is ready.');
  await refresh();location.replace(destination());
}));
$('auth-explain').textContent=studio
  ?'Sign in with Google or email on the new pvlab.studio domain.'
  :'Sign in with the original Parallel Vision account that holds your existing work and credits.';
try{
  clerk=await loadLabAccount();
  clerk.addListener(()=>{void refresh().catch(e=>status(e.message,true));});
  await refresh();
}catch(e){status('Sign-in could not load. Check your connection and try reloading.',true);show('auth',true);}
