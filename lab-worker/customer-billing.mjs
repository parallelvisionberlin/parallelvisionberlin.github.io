// Customer billing belongs only to PV Lab's D1 database.
// All changes in balances are immutable ledger entries. Never trust browser-supplied prices.
export const CREDIT_MULTIPLIER = 460;
export const CREDIT_MINIMUM = 7;
export const PACKS = Object.freeze({
  topup10:{type:'payment',cents:1000,credits:1000,title:'PV Lab · 1,000 credits'},
  topup29:{type:'payment',cents:2900,credits:3000,title:'PV Lab · 3,000 credits'},
  topup75:{type:'payment',cents:7500,credits:8000,title:'PV Lab · 8,000 credits'},
  starter:{type:'subscription',cents:1500,credits:1600,title:'PV Lab Starter · monthly'},
  creator:{type:'subscription',cents:3900,credits:4500,title:'PV Lab Creator · monthly'},
  studio:{type:'subscription',cents:9900,credits:12000,title:'PV Lab Studio · monthly'}
});
export function creditsForUsd(usd) {
  if (!Number.isFinite(usd) || usd < 0) throw new Error('Invalid quote.');
  return Math.max(CREDIT_MINIMUM,Math.ceil(Math.round(usd*1e6)*CREDIT_MULTIPLIER/1e6));
}
const now=()=>Date.now();
const fail=(status,message)=>{const e=new Error(message);e.status=status;throw e;};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const one=(env,sql,...a)=>env.LAB_DB.prepare(sql).bind(...a).first();
const exec=(env,sql,...a)=>env.LAB_DB.prepare(sql).bind(...a).run();
const ID=/^user_[a-zA-Z0-9]+$/;
function enabled(env) {return env.LAB_CHECKOUT_ENABLED==='true'&&env.LAB_PUBLIC_GENERATION_ENABLED==='true'&&!!env.LAB_STRIPE_SECRET_KEY&&!!env.LAB_STRIPE_WEBHOOK_SECRET&&!!env.LAB_CUSTOMER_SPICY_API_KEY;}
const catalog=()=>Object.entries(PACKS).map(([id,p])=>({id,type:p.type,priceEur:p.cents/100,credits:p.credits,title:p.title}));
export async function ensureCustomer(env,subject) {
  if(!ID.test(subject))fail(401,'Invalid account identity.');
  const t=now();
  await exec(env,'INSERT OR IGNORE INTO lab_customers(id,clerk_subject,balance_credits,created_at,updated_at) VALUES(?,?,0,?,?)',subject,subject,t,t);
  return subject;
}
export async function isLabCustomer(env,id){
  try{return !!(await one(env,'SELECT id FROM lab_customers WHERE id=?',id));}
  catch(e){
    // Historical owner-only test fixtures and pre-migration owner deployments
    // have no customer table. Never block or mutate the existing owner account.
    if(/no such table:\s*lab_customers\b/i.test(String(e?.message||'')))return false;
    throw e;
  }
}
export async function customerSession(env,id){
  const c=await one(env,'SELECT balance_credits,stripe_customer_id FROM lab_customers WHERE id=?',id);
  if(!c)fail(403,'This PV Lab account is unavailable.');
  const sub=await one(env,'SELECT plan_id,status FROM lab_subscriptions WHERE customer_id=?',id);
  return {customer:true,balanceCredits:c.balance_credits,subscription:sub||{plan_id:null,status:'none'},
    billingReady:enabled(env),generationReady:env.LAB_PUBLIC_GENERATION_ENABLED==='true'&&!!env.LAB_CUSTOMER_SPICY_API_KEY,
    products:catalog(),creditMultiplier:CREDIT_MULTIPLIER};
}
async function stripe(env,path,params,method='POST'){
  if(!env.LAB_STRIPE_SECRET_KEY)fail(503,'Stripe billing is not configured.');
  const res=await fetch('https://api.stripe.com/v1/'+path,{
    method,redirect:'manual',
    headers:{Authorization:'Bearer '+env.LAB_STRIPE_SECRET_KEY,...(method==='POST'?{'Content-Type':'application/x-www-form-urlencoded'}:{})},
    body:method==='POST'?new URLSearchParams(params).toString():undefined,
    signal:AbortSignal.timeout(20000)
  });
  if(!res.ok){const t=await res.text();if(res.status===401)fail(503,'Stripe API key could not be verified.');fail(502,'Stripe billing is temporarily unavailable ('+res.status+').');}
  const data=await res.json();
  return data;
}
function appUrl(env){
  const src=env.LAB_PUBLIC_APP_URL||'https://parallelvisionlabel.com/lab/studio.html';
  const u=new URL(src);
  if(u.protocol!=='https:'||u.username||u.password||u.hash)fail(503,'Invalid PV Lab checkout return URL.');
  return u.href;
}
function safeUrl(url){
  try { const u=new URL(url);return u.protocol==='https:'&&(u.hostname==='stripe.com'||u.hostname.endsWith('.stripe.com'))&&!u.username&&!u.password ?u.href:null;}catch{return null;}
}
export async function customerRoute(request,env,subject){
  const url=new URL(request.url),p=url.pathname,method=request.method;
  if(p==='/api/customer/wallet'&&method==='GET') {
    const state=await customerSession(env,subject);
    const result=await env.LAB_DB.prepare('SELECT delta_credits,kind,reference,created_at FROM lab_credit_entries WHERE customer_id=? ORDER BY created_at DESC LIMIT 30').bind(subject).all();
    return json({...state,activity:result.results});
  }
  if(p==='/api/customer/catalog'&&method==='GET')return json({products:catalog(),billingReady:enabled(env)});
  if(p==='/api/billing/checkout'&&method==='POST'){
    if(!enabled(env))fail(503,'Checkout is not enabled yet. No payment was initiated.');
    const data=await request.json().catch(()=>null),sku=String(data?.sku||''),item=PACKS[sku];
    if(!item)fail(400,'Choose an available credit pack or subscription.');
    const customer=await one(env,'SELECT stripe_customer_id FROM lab_customers WHERE id=?',subject);
    if(!customer)fail(403,'Account unavailable.');
    if(item.type==='subscription'){
      const active=await one(env,"SELECT stripe_subscription_id FROM lab_subscriptions WHERE customer_id=? AND status IN ('active','trialing','past_due','unpaid')",subject);
      if(active?.stripe_subscription_id)fail(409,'You already have a subscription. Manage it through Billing.');
    }
    const form={
      mode:item.type,
      'client_reference_id':subject,
      'metadata[lab_customer_id]':subject,
      'metadata[lab_sku]':sku,
      'line_items[0][price_data][currency]':'eur',
      'line_items[0][price_data][unit_amount]':String(item.cents),
      'line_items[0][price_data][product_data][name]':item.title,
      'line_items[0][price_data][tax_behavior]':'inclusive',
      'line_items[0][quantity]':'1',
      'success_url':appUrl(env)+(appUrl(env).includes('?')?'&':'?')+'billing=success',
      'cancel_url':appUrl(env)+(appUrl(env).includes('?')?'&':'?')+'billing=cancel',
      'billing_address_collection':'required',
      'customer_update[address]':'auto'
    };
    if(customer.stripe_customer_id)form.customer=customer.stripe_customer_id;
    else {delete form['customer_update[address]'];form.customer_creation=item.type==='payment'?'always':undefined;}
    if(item.type==='subscription'){
      form['line_items[0][price_data][recurring][interval]']='month';
      form['subscription_data[metadata][lab_customer_id]']=subject;
      form['subscription_data[metadata][lab_sku]']=sku;
    } else {
      form['payment_intent_data[metadata][lab_customer_id]']=subject;
      form['payment_intent_data[metadata][lab_sku]']=sku;
    }
    Object.keys(form).forEach(k=>form[k]===undefined&&delete form[k]);
    const session=await stripe(env,'checkout/sessions',form);
    const paymentUrl=safeUrl(session.url);
    if(!paymentUrl)fail(502,'Stripe did not return a verified checkout URL.');
    return json({url:paymentUrl,checkoutId:session.id});
  }
  if(p==='/api/billing/portal'&&method==='POST'){
    if(!enabled(env))fail(503,'Billing management is not configured.');
    const customer=await one(env,'SELECT stripe_customer_id FROM lab_customers WHERE id=?',subject);
    if(!customer?.stripe_customer_id)fail(404,'No Stripe customer record yet.');
    const session=await stripe(env,'billing_portal/sessions',{customer:customer.stripe_customer_id,return_url:appUrl(env)});
    const portalUrl=safeUrl(session.url);
    if(!portalUrl)fail(502,'Stripe did not return a verified billing portal.');
    return json({url:portalUrl});
  }
  fail(404,'Unknown customer billing endpoint.');
}
function fromHex(str){if(!/^[a-f0-9]{64}$/i.test(str))return null;return Uint8Array.from(str.match(/../g),x=>parseInt(x,16));}
export async function verifyStripeEvent(env,request){
  if(!env.LAB_STRIPE_WEBHOOK_SECRET)fail(503,'Webhook secret missing.');
  const signature=request.headers.get('stripe-signature')||'';
  const fields=signature.split(',').map(x=>x.trim().split('='));
  const t=fields.find(x=>x[0]==='t')?.[1],variants=fields.filter(x=>x[0]==='v1').map(x=>x[1]);
  if(!/^\d{10,12}$/.test(t||'')||Math.abs(Math.floor(now()/1000)-Number(t))>300||!variants.length)fail(400,'Invalid Stripe signature.');
  const raw=await request.text();
  if(raw.length>300000)fail(413,'Webhook too large.');
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.LAB_STRIPE_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const bytes=new TextEncoder().encode(t+'.'+raw);
  let valid=false;
  for(const v of variants){const hex=fromHex(v);if(hex&&await crypto.subtle.verify('HMAC',key,hex,bytes)){valid=true;break;}}
  if(!valid)fail(400,'Invalid Stripe signature.');
  const event=JSON.parse(raw);
  if(!/^evt_[A-Za-z0-9]+$/.test(event.id||'')||typeof event.type!=='string')fail(400,'Unrecognized Stripe event.');
  return event;
}
async function credit(env,customerId,credits,kind,reference){
  if(!Number.isSafeInteger(credits)||credits<1||!await isLabCustomer(env,customerId))fail(400,'Invalid credit recipient.');
  await exec(env,'INSERT OR IGNORE INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES(?,?,?,?,?,?)',
    reference,customerId,credits,kind,reference,now());
}
async function setStripeCustomer(env,subject,customerId){
  if(!subject||!customerId||typeof customerId!=='string'||!customerId.startsWith('cus_'))return;
  if(!await isLabCustomer(env,subject))fail(400,'Stripe payment refers to an unknown PV Lab customer.');
  await exec(env,'UPDATE lab_customers SET stripe_customer_id=COALESCE(stripe_customer_id,?),updated_at=? WHERE id=? AND (stripe_customer_id IS NULL OR stripe_customer_id=?)',
    customerId,now(),subject,customerId);
}
async function subscriptionDetails(env,id){
  if(!/^sub_[A-Za-z0-9]+$/.test(id||''))fail(400,'Invalid Stripe subscription.');
  return stripe(env,'subscriptions/'+id,null,'GET');
}
async function syncSubscription(env,sub) {
  const subject=sub.metadata?.lab_customer_id,sku=sub.metadata?.lab_sku;
  if(!subject||!PACKS[sku]||PACKS[sku].type!=='subscription'||!await isLabCustomer(env,subject))return null;
  const customerId=typeof sub.customer==='string'?sub.customer:sub.customer?.id;
  await setStripeCustomer(env,subject,customerId);
  await exec(env,'INSERT INTO lab_subscriptions(customer_id,stripe_subscription_id,stripe_customer_id,plan_id,status,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(customer_id) DO UPDATE SET stripe_subscription_id=excluded.stripe_subscription_id,stripe_customer_id=excluded.stripe_customer_id,plan_id=excluded.plan_id,status=excluded.status,updated_at=excluded.updated_at',
    subject,sub.id,customerId,sku,sub.status||'incomplete',now());
  return {subject,sku};
}
export async function stripeWebhook(request,env){
  const event=await verifyStripeEvent(env,request);
  if(await one(env,'SELECT event_id FROM lab_stripe_events WHERE event_id=?',event.id))return json({received:true,duplicate:true});
  const data=event.data?.object||{};
  if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){
    const subject=data.metadata?.lab_customer_id,sku=data.metadata?.lab_sku,item=PACKS[sku];
    if(subject&&item&&data.client_reference_id===subject&&data.currency==='eur'){
      if(data.mode==='payment'&&item.type==='payment'&&data.payment_status==='paid'&&Number(data.amount_total)===item.cents){
        await setStripeCustomer(env,subject,typeof data.customer==='string'?data.customer:data.customer?.id);
        await credit(env,subject,item.credits,'purchase','checkout:'+data.id);
      } else if(data.mode==='subscription'&&item.type==='subscription'&&data.subscription){
        const sub=await subscriptionDetails(env,typeof data.subscription==='string'?data.subscription:data.subscription.id);
        await syncSubscription(env,sub);
      }
    }
  } else if(event.type==='invoice.paid'){
    // Invoice fields differ between Stripe API versions. Fetch subscription metadata
    // from Stripe instead of trusting webhook-supplied customer IDs or quantities.
    const raw=data.subscription||data.parent?.subscription_details?.subscription;
    const id=typeof raw==='string'?raw:raw?.id;
    if(id&&data.status==='paid'){
      const sub=await subscriptionDetails(env,id);
      const meta=await syncSubscription(env,sub);
      if(meta&&data.currency==='eur'&&data.id&&sub.customer){
        await credit(env,meta.subject,PACKS[meta.sku].credits,'subscription','invoice:'+data.id);
      }
    }
  } else if(['customer.subscription.updated','customer.subscription.deleted','customer.subscription.created'].includes(event.type)){
    if(data.id)await syncSubscription(env,data);
  }
  await exec(env,'INSERT OR IGNORE INTO lab_stripe_events(event_id,event_type,processed_at) VALUES(?,?,?)',event.id,event.type,now());
  return json({received:true});
}
