import {loadLabAccount} from './native-account.js?v=20261117-pv-google1';
import {readGoogleReturn,clearGoogleReturn,openLabSignIn} from './auth-google.js?v=20261117-pv-google1';
const status=document.getElementById('auth-callback-status');
const actions=document.getElementById('auth-callback-actions');
const retry=document.getElementById('auth-callback-retry');
const returnUrl=readGoogleReturn();
let clerk;
function fail(message){status.textContent=message;actions.setAttribute('open','');}
retry.addEventListener('click',async()=>{
  if(!clerk){location.replace('./');return;}
  clearGoogleReturn();
  actions.removeAttribute('open');
  try{openLabSignIn(clerk,{forceRedirectUrl:'https://pvlab.studio/'});}catch{location.replace('./');}
});
if(!returnUrl||location.hostname!=='pvlab.studio'){
  clearGoogleReturn();
  fail('The sign-in return expired. Please start again from PV LAB.');
}else{
  try{
    clerk=await loadLabAccount();
    // Complete the Clerk-managed OAuth state before permitting an authenticated return.
    await clerk.handleRedirectCallback({
      redirectUrl:location.href,
      afterSignInUrl:returnUrl,
      afterSignUpUrl:returnUrl,
      signInUrl:returnUrl
    });
    if(clerk.isSignedIn&&clerk.session){
      clearGoogleReturn();
      location.replace(returnUrl);
    }else{
      fail('More verification is required to finish sign-in.');
    }
  }catch{
    fail('Sign-in could not be completed. Please retry from PV LAB.');
  }
}
