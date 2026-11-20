import {loadLabAccount} from '../lab/native-account.js?v=20261120-smartlinks-recovery1';
import {clerkInstanceForHostname} from '../lab/clerk-instance.js?v=20261014-custom-domain1';

// The homepage and /links share the same production Clerk application.
// Safari can reject the first-party UI bundle while the existing session is
// still recoverable. Retry hydration through the homepage's Clerk JS transport;
// do not transfer, store or synthesize identity tokens ourselves.
export async function loadSmartLinksAccount({
  primary=loadLabAccount,
  importFallback=()=>import('https://esm.sh/@clerk/clerk-js@6?bundle'),
  hostname=location.hostname,
  returnUrl=location.href,
  getUI=()=>globalThis.window?.__internal_ClerkUICtor,
  timeoutMs=12000
}={}){
  let primaryError;
  try{return await primary();}
  catch(error){primaryError=error;}
  try{
    const {publishableKey}=clerkInstanceForHostname(hostname);
    const module=await importFallback();
    if(typeof module?.Clerk!=='function')throw Error('Clerk SDK fallback is unavailable.');
    const clerk=new module.Clerk(publishableKey);
    const ui=getUI();
    const options={signInFallbackRedirectUrl:returnUrl,signUpFallbackRedirectUrl:returnUrl};
    if(typeof ui==='function')options.ui={ClerkUI:ui};
    let timer;
    try{
      await Promise.race([
        clerk.load(options),
        new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Clerk fallback timed out.')),timeoutMs);})
      ]);
    }finally{clearTimeout(timer);}
    // Without the sign-in UI a recovered signed-in session is fine, but a
    // signed-out account must not be left with an inert "Sign in" button.
    if(!clerk.session&&typeof ui!=='function')throw Error('Clerk sign-in UI is unavailable.');
    return clerk;
  }catch{
    throw primaryError;
  }
}

// Recoverable button flow: never strand the user with a disabled sign-in
// button when a third-party SDK/CDN load fails or Safari throttles a request.
export function createSmartLinksAuthRecovery({load,onReady,onFailure,onBusy}){
  let account=null,pending=null;
  async function connect({interactive=false}={}){
    if(!pending&&!account){
      onBusy(true);
      pending=(async()=>{
        try{
          const loaded=await load();
          onReady(loaded);
          account=loaded;
          return loaded;
        }catch(error){
          onFailure(error);
          return null;
        }finally{
          onBusy(false);
          pending=null;
        }
      })();
    }
    const current=pending?await pending:account;
    if(interactive&&current&&!current.session){
      try{current.openSignIn();}catch(error){onFailure(error);}
    }
    return current;
  }
  return {connect};
}
