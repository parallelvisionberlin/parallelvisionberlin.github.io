import {clerkInstanceForHostname} from './clerk-instance.js?v=20261014-custom-domain1';
// Native tokens remain in memory. The Worker still verifies every signed claim.
export const isNativeLab=()=>typeof window!=='undefined'&&window.__PV_LAB_NATIVE__===1&&typeof window.ReactNativeWebView?.postMessage==='function';
const pending=new Map();
let pageId='',sequence=0;
function post(type,extra={}){window.ReactNativeWebView.postMessage(JSON.stringify({type,pageId,...extra}));}
function requestIdentity(force=false){
  if(!pageId){
    pageId=crypto.randomUUID();
    window.__PV_LAB_REPLY__=reply=>{
      if(reply?.pageId!==pageId)return;
      const entry=pending.get(reply.id);if(!entry)return;
      pending.delete(reply.id);clearTimeout(entry.timer);
      if(reply.error)entry.reject(Error('Your app session could not be renewed. Sign in again.'));
      else entry.resolve(reply);
    };
    window.addEventListener('pagehide',()=>{for(const entry of pending.values()){clearTimeout(entry.timer);entry.reject(Error('Page closed.'));}pending.clear();});
  }
  return new Promise((resolve,reject)=>{
    const id=String(++sequence),timer=setTimeout(()=>{pending.delete(id);reject(Error('The app did not respond. Reopen Lab.'));},15000);
    pending.set(id,{resolve,reject,timer});post('PV_LAB_AUTH',{id,force});
  });
}
// Keep third-party SDK imports and Clerk session hydration from blocking Studio forever.
function boundedSetup(task,timeoutMs,message){
  let timer;
  const expired=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(message)),timeoutMs);});
  return Promise.race([task,expired]).finally(()=>clearTimeout(timer));
}
let accountLoading=null;
export function loadLabAccount(){
  if(!accountLoading)accountLoading=createLabAccount().catch(error=>{accountLoading=null;throw error;});
  return accountLoading;
}
async function createLabAccount(){
  if(!isNativeLab()){
    const {frontendApi,publishableKey}=clerkInstanceForHostname(location.hostname);
    const sdk=import('https://esm.sh/@clerk/clerk-js@6?bundle');
    // Presentation policy for the independent PV LAB domain only.
    // Clerk's production SSO settings still control whether GitHub is enabled.
    const studioClerk=frontendApi==='https://clerk.pvlab.studio';
    if(studioClerk&&!document.getElementById('pvlab-social-provider-policy')){
      const style=document.createElement('style');
      style.id='pvlab-social-provider-policy';
      style.textContent='.cl-socialButtonsBlockButton__github,.cl-socialButtonsIconButton__github{display:none!important}.cl-socialButtons{grid-template-columns:minmax(0,1fr)!important}';
      document.head.append(style);
    }
    const ui=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=frontendApi+'/npm/@clerk/ui@1/dist/ui.browser.js';s.onload=resolve;s.onerror=()=>reject(Error('Clerk UI could not load.'));document.head.append(s);});
    const [{Clerk}]=await boundedSetup(Promise.all([sdk,ui]),12000,'Account sign-in resources timed out.');
    const clerk=new Clerk(publishableKey);
    await boundedSetup(clerk.load({
      ui:{ClerkUI:window.__internal_ClerkUICtor},
      signInFallbackRedirectUrl:location.href,
      signUpFallbackRedirectUrl:location.href,
      ...(studioClerk?{appearance:{elements:{
        socialButtonsBlockButton__github:{display:'none'},
        socialButtonsIconButton__github:{display:'none'},
        socialButtons:{gridTemplateColumns:'minmax(0,1fr)'}
      }}}:{})
    }),12000,'Your account session did not respond. Please reload.');
    return clerk;
  }
  const {initLabMobileUI}=await import('./mobile-ui.js?v=20261014-native-photo-picker1&createGallery=20261014-1&generateStable=20261014-1');
  initLabMobileUI();
  const identity=await requestIdentity();
  const signed=!!identity.token&&/^user_[A-Za-z0-9]+$/.test(identity.userId||'')&&/^sess_[A-Za-z0-9]+$/.test(identity.sessionId||'');
  const listeners=new Set();
  const account={isSignedIn:signed,user:signed?{id:identity.userId}:null,session:null,
    addListener(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    openSignIn(){post('PV_LAB_SIGN_IN');},
    async signOut(){post('PV_LAB_SIGN_OUT');}
  };
  if(signed)account.session={id:identity.sessionId,labNative:true,async getToken(options){
    const next=await requestIdentity(options?.skipCache===true);
    if(next.sessionId!==identity.sessionId||next.userId!==identity.userId||!next.token){
      account.session=null;account.isSignedIn=false;account.user=null;for(const fn of listeners)fn();throw Error('Session changed. Sign in again.');
    }
    return next.token;
  }};
  // Never retain the first token in this module's identity record.
  identity.token='';
  return account;
}
