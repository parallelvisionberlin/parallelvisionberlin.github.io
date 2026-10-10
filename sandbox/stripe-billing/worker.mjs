// PV Lab Stripe billing sandbox. Deliberately NO generative, R2, owner, or
// production billing routes. One isolated test-mode Stripe wallet in its own D1.
import {ensureCustomer,customerSession,customerRoute,stripeWebhook,verifyStripeEvent} from '../../lab-worker/customer-billing.mjs';

export const VERSION='pv-lab-billing-sandbox-2026-10-10.1';
const ISSUER='https://clerk.parallelvisionlabel.com';
const ORIGINS=new Set(['https://parallelvisionlabel.com','https://www.parallelvisionlabel.com']);
const encoder=new TextEncoder();
let jwksCache={keys:[],at:0};

const fail=(status,message)=>{const e=new Error(message);e.status=status;throw e;};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});

function guardEnvironment(env,{webhook=false}={}){
  if(env.LAB_SANDBOX_MODE!=='true')
    fail(503,'Billing sandbox deployment is not configured.');
  // A live key must NEVER be able to process a charge from this Worker.
  if(!/^(?:sk|rk)_test_[A-Za-z0-9]+$/.test(env.LAB_STRIPE_SECRET_KEY||''))
    fail(503,'Add a Stripe TEST secret key to this sandbox Worker; never use a live key.');
  if(webhook&&!/^whsec_[A-Za-z0-9]+$/.test(env.LAB_STRIPE_WEBHOOK_SECRET||''))
    fail(503,'Configure the sandbox webhook signing secret separately from production.');
}
function testBillingEnv(env){
  // The imported production catalog currently gates Checkout on generation
  // readiness. Enable that condition only inside this dedicated billing-only
  // Worker. NO generation endpoints or provider credentials exist here.
  return {...env,LAB_CHECKOUT_ENABLED:'true',LAB_PUBLIC_GENERATION_ENABLED:'true',
    LAB_CUSTOMER_SPICY_API_KEY:'sandbox-checkout-no-generation-route'};
}
function unbase(value){
  return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length/4)*4,'=')),char=>char.charCodeAt(0));
}
async function jwks(refresh=false){
  if(!refresh&&Date.now()-jwksCache.at<600000)return jwksCache.keys;
  const r=await fetch(ISSUER+'/.well-known/jwks.json',{signal:AbortSignal.timeout(10000)});
  if(!r.ok)fail(503,'Sign-in verification unavailable.');
  const data=await r.json();
  if(!Array.isArray(data.keys))fail(503,'Sign-in verification unavailable.');
  jwksCache={keys:data.keys,at:Date.now()};return data.keys;
}
async function authenticate(request){
  const header=request.headers.get('Authorization')||'';
  if(!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(header)||header.length>10000)
    fail(401,'Sign in with your PV Lab account.');
  const token=header.slice(7),parts=token.split('.');
  let h,p;
  try{
    h=JSON.parse(new TextDecoder().decode(unbase(parts[0])));
    p=JSON.parse(new TextDecoder().decode(unbase(parts[1])));
  }catch{fail(401,'Invalid sign-in token.');}
  const t=Math.floor(Date.now()/1000);
  if(h.alg!=='RS256'||typeof h.kid!=='string'||p.iss!==ISSUER||
    !/^user_[A-Za-z0-9]+$/.test(p.sub||'')||!ORIGINS.has(p.azp)||
    !Number.isFinite(p.exp)||p.exp<=t||!Number.isFinite(p.iat)||p.iat>t+5||
    (p.nbf!==undefined&&(!Number.isFinite(p.nbf)||p.nbf>t+5)))
    fail(401,'Sign-in expired or invalid. Please sign in again.');
  let key=(await jwks()).find(x=>x.kid===h.kid&&x.kty==='RSA');
  if(!key)key=(await jwks(true)).find(x=>x.kid===h.kid&&x.kty==='RSA');
  if(!key)fail(401,'Unknown sign-in key.');
  let okay=false;
  try{
    const cryptoKey=await crypto.subtle.importKey('jwk',key,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    okay=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',cryptoKey,unbase(parts[2]),encoder.encode(parts[0]+'.'+parts[1]));
  }catch{}
  if(!okay)fail(401,'Invalid sign-in signature.');
  return p.sub;
}
function wrap(response,origin){
  const headers=new Headers(response.headers);
  headers.set('Cache-Control','no-store');
  headers.set('X-Content-Type-Options','nosniff');
  headers.set('X-Robots-Tag','noindex,nofollow,noarchive');
  headers.set('Referrer-Policy','no-referrer');
  headers.set('Vary','Origin');
  if(ORIGINS.has(origin))headers.set('Access-Control-Allow-Origin',origin);
  return new Response(response.body,{status:response.status,headers});
}
async function route(request,env){
  const url=new URL(request.url),origin=request.headers.get('Origin')||'';
  if(origin&&!ORIGINS.has(origin))fail(403,'Origin not allowed.');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{
    'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers':'Authorization,Content-Type',
    'Access-Control-Max-Age':'600'}});
  if(url.pathname==='/health'&&request.method==='GET')
    return json({ok:true,version:VERSION,testOnly:true,configured:
      env.LAB_SANDBOX_MODE==='true'&&/^(?:sk|rk)_test_/.test(env.LAB_STRIPE_SECRET_KEY||'')&&
      /^whsec_/.test(env.LAB_STRIPE_WEBHOOK_SECRET||'')});
  if(url.pathname==='/api/stripe/webhook'&&request.method==='POST'){
    guardEnvironment(env,{webhook:true});
    // Verify the signature before inspecting the test/live marker.
    const event=await verifyStripeEvent(env,request.clone());
    if(event.livemode!==false)fail(403,'Only Stripe sandbox events are accepted.');
    return stripeWebhook(request,env);
  }
  const allowed=new Set(['/api/session','/api/customer/wallet','/api/customer/catalog',
    '/api/billing/checkout','/api/billing/portal']);
  if(!allowed.has(url.pathname))fail(404,'Sandbox supports billing only; no image/video generation.');
  if(url.pathname==='/api/session'&&request.method!=='GET'||
     url.pathname==='/api/customer/wallet'&&request.method!=='GET'||
     url.pathname==='/api/customer/catalog'&&request.method!=='GET'||
     url.pathname.startsWith('/api/billing/')&&request.method!=='POST')fail(405,'Method not allowed.');
  guardEnvironment(env,{webhook:true});
  const subject=await authenticate(request);
  await ensureCustomer(env,subject);
  const billingEnv=testBillingEnv(env);
  if(url.pathname==='/api/session'){
    const account=await customerSession(billingEnv,subject);
    return json({...account,sandbox:true,generationReady:false,
      version:VERSION,notice:'Test credits only. No paid image or video generation is available on this Worker.'});
  }
  return customerRoute(request,billingEnv,subject);
}
export default{
  async fetch(request,env){
    const origin=request.headers.get('Origin')||'';
    try{return wrap(await route(request,env),origin);}
    catch(error){
      const status=Number.isInteger(error?.status)&&error.status>=400&&error.status<=599?error.status:500;
      return wrap(json({error:status===500?'Billing sandbox unavailable. No real payment was made.':error.message},status),origin);
    }
  }
};
