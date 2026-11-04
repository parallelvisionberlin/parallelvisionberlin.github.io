// Prefer Clerk's documented, first-party Frontend API browser bundle.
// esm.sh remains a bounded fallback for networks that block the primary script.
// This changes bootstrap transport only, never identity, tokens, sessions or billing.
export async function loadClerkBrowserSdk({
  frontendApi,publishableKey,doc=document,win=window,
  fallbackImport=()=>import('https://esm.sh/@clerk/clerk-js@6?bundle'),
  primaryTimeoutMs=7500
}){
  let script;
  try{
    return await new Promise((resolve,reject)=>{
      let finished=false;
      const complete=(error,client)=>{
        if(finished)return;
        finished=true;clearTimeout(timer);
        script.onload=null;script.onerror=null;
        if(error)reject(error);else resolve(client);
      };
      script=doc.createElement('script');
      script.src=frontendApi+'/npm/@clerk/clerk-js@6/dist/clerk.browser.js';
      script.async=true;
      script.crossOrigin='anonymous';
      script.setAttribute('data-clerk-publishable-key',publishableKey);
      script.onload=()=>{
        const clerk=win.Clerk;
        if(typeof clerk?.load==='function')complete(null,clerk);
        else complete(new Error('Clerk browser bundle did not initialize.'));
      };
      script.onerror=()=>complete(new Error('Clerk browser bundle could not load.'));
      const timer=setTimeout(()=>complete(new Error('Clerk browser bundle timed out.')),primaryTimeoutMs);
      try{doc.head.appendChild(script)}catch(error){complete(error)}
    });
  }catch{
    // Remove a failed/late script before a fallback can create a second Clerk.
    script?.remove?.();
    try{
      const module=await fallbackImport();
      if(typeof module?.Clerk!=='function')throw Error('No Clerk constructor');
      return new module.Clerk(publishableKey);
    }catch{
      const error=new Error('Both Clerk SDK delivery paths were unavailable.');
      error.code='AUTH_SDK';
      throw error;
    }
  }
}
