// PV LAB authenticated first-party activation milestones.
// Browser events are client-reported, not proof of paid generation or purchase.
// No raw creative inputs, IPs, emails, session identifiers or tracking cookies.
const allowed=new Set(['studio_opened','mood_selected','model_selected','photo_added','generate_clicked','offer_viewed','offer_clicked','checkout_clicked']);
const surfaces=new Set(['studio','moods','billing']);
const models=new Set(['seedream','qwen3','kling','krea3','gemini','gemini21','flash','seedreamlite','soul','soulpro','zspicy','fal','other']);
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export function validJourneyEvent(data){
  if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).some(k=>!['event','surface','detail'].includes(k)))return false;
  if(!allowed.has(data.event)||!surfaces.has(data.surface))return false;
  const detail=data.detail??'none';
  if(typeof detail!=='string')return false;
  if(data.event==='model_selected')return data.surface==='studio'&&models.has(detail);
  if(data.event==='mood_selected')return ['studio','moods'].includes(data.surface)&&['berlin-rave','other'].includes(detail);
  return detail==='none';
}
export async function recordCustomerJourneyEvent(request,env,customerId,{clock=()=>Date.now()}={}){
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(request.headers.get('dnt')==='1'||request.headers.get('sec-gpc')==='1')return json({ok:true,recorded:false});
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return json({error:'JSON required'},415);
  const raw=await request.text();
  if(raw.length>192)return json({error:'Payload too large'},413);
  let data;try{data=JSON.parse(raw);}catch{return json({error:'Invalid event'},400);}
  if(!validJourneyEvent(data))return json({error:'Invalid event'},400);
  const now=clock();
  const day=new Date(now).toISOString().slice(0,10);
  await env.LAB_DB.prepare(`INSERT INTO lab_customer_journey(customer_id,day_utc,event,surface,detail,first_at,last_at,event_count)
    VALUES(?,?,?,?,?,?,?,1)
    ON CONFLICT(customer_id,day_utc,event,surface,detail)
    DO UPDATE SET last_at=excluded.last_at,event_count=MIN(100,lab_customer_journey.event_count+1)
    WHERE lab_customer_journey.last_at<=excluded.last_at-30000`)
    .bind(customerId,day,data.event,data.surface,data.detail??'none',now,now).run();
  return json({ok:true});
}
export async function pruneCustomerJourney(env,{clock=()=>Date.now()}={}){
  return env.LAB_DB.prepare('DELETE FROM lab_customer_journey WHERE last_at<?')
    .bind(clock()-90*86400000).run();
}
