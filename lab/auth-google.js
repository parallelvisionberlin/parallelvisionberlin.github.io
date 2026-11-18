// PV LAB-owned Google OAuth entry. Legacy Parallel Vision and native app auth stay on Clerk's original flow.
const AUTH_KEY='pvlab-google-oauth-return-v1';
const MAX_AGE=15*60*1000;
export const isCustomGoogleHost=(hostname=location.hostname)=>hostname.toLowerCase()==='pvlab.studio';
export function validOAuthReturn(value,origin=location.origin){
  try{
    const url=new URL(String(value),origin);
    return url.origin===origin&&/^https?:$/.test(url.protocol)&&!url.username&&!url.password ? url.href : null;
  }catch{return null;}
}
export function readGoogleReturn(search=location.search,storage=sessionStorage,origin=location.origin,now=Date.now()){
  const nonce=new URLSearchParams(search).get('pv_auth');
  if(!nonce||!/^[-a-f0-9]{36}$/i.test(nonce))return null;
  let value;try{value=JSON.parse(storage.getItem(AUTH_KEY)||'null');}catch{return null;}
  if(value?.nonce!==nonce||!Number.isFinite(value.at)||now-value.at<0||now-value.at>MAX_AGE)return null;
  return validOAuthReturn(value.returnUrl,origin);
}
export function clearGoogleReturn(storage=sessionStorage){try{storage.removeItem(AUTH_KEY);}catch{}}
function ensureStyle(){
  if(document.getElementById('pv-auth-style'))return;
  const style=document.createElement('style');style.id='pv-auth-style';
  style.textContent=`
  #pv-auth-dialog{box-sizing:border-box;width:min(370px,calc(100vw - 32px));max-width:370px;max-height:calc(100dvh - 32px);margin:auto;padding:40px 32px 30px;border:1px solid #343438;border-radius:3px;background:#101114;color:#f5f3f0;box-shadow:0 28px 90px #0009;font-family:Arial,sans-serif;text-align:center;overflow:auto}
  #pv-auth-dialog::backdrop{background:#050507d9;backdrop-filter:blur(5px)}
  #pv-auth-dialog .pv-auth-logo{display:block;width:135px;height:auto;margin:6px auto 0}
  #pv-auth-dialog .pv-auth-byline{display:block;margin:10px auto 42px;font-size:8px;letter-spacing:.32em;color:#aaaab0}
  #pv-auth-dialog .pv-auth-google{display:block;box-sizing:border-box;width:100%;padding:15px 12px;border:1px solid #f0ede9;border-radius:2px;background:#eeeae3;color:#111;font-family:inherit;font-size:11px;letter-spacing:.075em;font-weight:700;cursor:pointer}
  #pv-auth-dialog .pv-auth-email{display:block;width:100%;margin:16px auto 0;padding:9px;border:0;background:none;color:#b5b5b7;text-decoration:underline;text-underline-offset:4px;font-family:inherit;font-size:12px;cursor:pointer}
  #pv-auth-dialog .pv-auth-close{position:absolute;top:12px;right:14px;padding:4px 6px;border:0;background:transparent;color:#aaa;font-size:22px;cursor:pointer}
  #pv-auth-dialog .pv-auth-stage{display:none}
  #pv-auth-dialog[data-loading="1"] .pv-auth-actions{display:none}
  #pv-auth-dialog[data-loading="1"] .pv-auth-stage{display:block}
  #pv-auth-dialog .pv-auth-track{width:152px;height:1px;margin:26px auto 0;background:#343538;overflow:hidden}
  #pv-auth-dialog .pv-auth-track::after{content:"";display:block;width:32%;height:100%;background:#d9dbdd;animation:pv-auth-load 1.5s ease-in-out infinite alternate}
  #pv-auth-dialog .pv-auth-status{margin:16px 0 0;min-height:18px;font-size:11px;color:#b4b4b7}
  #pv-auth-dialog .pv-auth-status:empty{display:none}
  @keyframes pv-auth-load{from{transform:translateX(-100%)}to{transform:translateX(410%)}}
  @media(prefers-reduced-motion:reduce){#pv-auth-dialog .pv-auth-track::after{animation:none;width:100%}}
  `;
  document.head.append(style);
}
function desiredReturn(options){
  const candidate=options.signInForceRedirectUrl||options.forceRedirectUrl||options.signUpForceRedirectUrl||location.href;
  return validOAuthReturn(candidate)||location.href;
}
// The first-party modal replaces the *Google* prebuilt flow without disabling Clerk's email/MFA UI.
export function openLabSignIn(clerk,options={}){
  if(!clerk)return;
  if(!isCustomGoogleHost()||typeof clerk.client?.signIn?.authenticateWithRedirect!=='function'||typeof document.createElement('dialog').showModal!=='function')return clerk.openSignIn(options);
  if(clerk.isSignedIn)return;
  const old=document.getElementById('pv-auth-dialog');
  if(old){if(!old.open)old.showModal();return;}
  ensureStyle();
  const dialog=document.createElement('dialog');dialog.id='pv-auth-dialog';dialog.setAttribute('aria-label','Sign in to PV LAB');
  const logo=document.createElement('img');logo.className='pv-auth-logo';logo.src='/branding/pvlab-wordmark-bold.svg';logo.alt='PV LAB';logo.width=135;logo.height=43;
  const by=document.createElement('span');by.className='pv-auth-byline';by.textContent='BY PARALLEL VISION';
  const close=document.createElement('button');close.className='pv-auth-close';close.type='button';close.setAttribute('aria-label','Close sign-in');close.textContent='×';close.onclick=()=>dialog.close();
  const actions=document.createElement('div');actions.className='pv-auth-actions';
  const google=document.createElement('button');google.type='button';google.className='pv-auth-google';google.textContent='CONTINUE WITH GOOGLE';
  const email=document.createElement('button');email.type='button';email.className='pv-auth-email';email.textContent='Use email instead';
  actions.append(google,email);
  const stage=document.createElement('div');stage.className='pv-auth-stage';stage.setAttribute('aria-live','polite');
  const track=document.createElement('div');track.className='pv-auth-track';track.setAttribute('aria-hidden','true');
  const status=document.createElement('p');status.className='pv-auth-status';status.textContent='Connecting securely…';stage.append(track,status);
  dialog.append(close,logo,by,actions,stage);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  email.onclick=()=>{dialog.close();void clerk.openSignIn(options);};
  google.onclick=async()=>{
    google.disabled=true;dialog.dataset.loading='1';close.hidden=true;
    let nonce;
    try{
      nonce=crypto.randomUUID();
      const returnUrl=desiredReturn(options);
      sessionStorage.setItem(AUTH_KEY,JSON.stringify({nonce,returnUrl,at:Date.now()}));
      const callback=new URL('/auth-callback.html',location.origin);
      callback.searchParams.set('pv_auth',nonce);
      // Clerk handles OAuth provider verification; no credentials or provider secrets in PV LAB.
      await clerk.client.signIn.authenticateWithRedirect({
        strategy:'oauth_google',redirectUrl:callback.href,redirectUrlComplete:callback.href
      });
    }catch{
      clearGoogleReturn();dialog.dataset.loading='0';close.hidden=false;google.disabled=false;
      const failure=document.createElement('p');failure.className='pv-auth-status';failure.setAttribute('role','alert');
      failure.textContent='Google sign-in could not start. Please retry or use email.';
      actions.querySelector('.pv-auth-status')?.remove();actions.append(failure);
    }
  };
  document.body.append(dialog);dialog.showModal();
}
