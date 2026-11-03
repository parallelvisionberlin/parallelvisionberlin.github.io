// Authenticated, minimal first-party funnel facts. The existing generation
// finance and Stripe checkout ledgers remain authoritative for jobs and money.
const allowed=new Set(['offer_viewed','offer_clicked']);
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export async function recordMoodOfferEvent(request,env,customerId){
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return json({error:'JSON required'},415);
  const raw=await request.text();
  if(raw.length>256)return json({error:'Payload too large'},413);
  let data;
  try{data=JSON.parse(raw);}catch{return json({error:'Invalid event'},400);}
  if(!data||Array.isArray(data)||typeof data!=='object'||!allowed.has(data.event)||Object.keys(data).some(key=>key!=='event'))
    return json({error:'Invalid event'},400);
  // The server-confirmed completed image, never a browser claim, qualifies an
  // account for offer measurements. No prices, wallet entries or jobs change.
  const completed=await env.LAB_DB.prepare(
    "SELECT 1 AS ok FROM lab_generation_finance WHERE customer_id=? AND tool_kind='image' AND last_state IN ('completed','reconstructed_completed') LIMIT 1"
  ).bind(customerId).first();
  if(!completed)return json({error:'No completed image'},409);
  const now=Date.now();
  await env.LAB_DB.prepare('DELETE FROM lab_mood_offer_funnel WHERE created_at<?').bind(now-90*86400000).run();
  await env.LAB_DB.prepare('INSERT OR IGNORE INTO lab_mood_offer_funnel(customer_id,event,source,created_at) VALUES(?,?,?,?)')
    .bind(customerId,data.event,'moods_result',now).run();
  return json({ok:true});
}
