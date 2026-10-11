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
export async function loadLabAccount(){
  if(!isNativeLab()){
    const {Clerk}=await import('https://esm.sh/@clerk/clerk-js@6?bundle');
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://clerk.parallelvisionlabel.com/npm/@clerk/ui@1/dist/ui.browser.js';s.onload=resolve;s.onerror=reject;document.head.append(s);});
    const clerk=new Clerk('pk_live_Y2xlcmsucGFyYWxsZWx2aXNpb25sYWJlbC5jb20k');
    await clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor},signInFallbackRedirectUrl:location.href,signUpFallbackRedirectUrl:location.href});
    return clerk;
  }
  const {initLabMobileUI}=await import('./mobile-ui.js?v=2');
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
