// PV LAB only. Purchase signals originate from verified Stripe webhooks.
// Authorization secret: LAB_META_CAPI_ACCESS_TOKEN in Cloudflare, never the frontend.
export const PV_LAB_META_PIXEL_ID = '1087722353874433';
export const labMetaOptIn = value => value === 'granted' || value === true;
const validSubject = /^user_[A-Za-z0-9]+$/;
const validStripeId = /^(?:cs_(?:test|live)_[A-Za-z0-9]+|in_[A-Za-z0-9]+)$/;

export async function labMetaPurchasePayload({subject,transactionId,amountCents,consented},timestamp=Date.now()) {
  if (!consented || !validSubject.test(subject || '') || !validStripeId.test(transactionId || '')) return null;
  if (!Number.isSafeInteger(amountCents) || amountCents < 1) return null;
  const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(subject));
  const externalId = [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');
  return {
    data:[{
      event_name:'Purchase',
      event_time:Math.floor(timestamp/1000),
      event_id:'pv-lab-purchase-'+transactionId,
      action_source:'website',
      event_source_url:'https://pvlab.studio/',
      user_data:{external_id:[externalId]},
      custom_data:{currency:'EUR',value:amountCents/100}
    }]
  };
}

export async function sendLabMetaPurchase(env,purchase,fetcher=fetch) {
  const token=env?.LAB_META_CAPI_ACCESS_TOKEN;
  if(typeof token!=='string'||!token) return {sent:false,reason:'not-configured'};
  const payload=await labMetaPurchasePayload(purchase);
  if(!payload) return {sent:false,reason:'not-consented-or-invalid'};
  if(typeof env.LAB_META_CAPI_TEST_EVENT_CODE==='string'&&env.LAB_META_CAPI_TEST_EVENT_CODE)
    payload.test_event_code=env.LAB_META_CAPI_TEST_EVENT_CODE;
  const response=await fetcher('https://graph.facebook.com/v25.0/'+PV_LAB_META_PIXEL_ID+'/events',{
    method:'POST',
    headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify(payload),
    signal:AbortSignal.timeout(4500)
  });
  if(!response.ok) return {sent:false,reason:'provider-rejected'};
  return {sent:true};
}
