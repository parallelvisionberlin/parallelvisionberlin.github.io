// Owner-only operational read model. This never polls a provider or mutates a job.
import {requireOwner} from './promotions.mjs';

export const OWNER_OPERATIONS_VERSION='owner-operations-v1';
const DAY=86400000,STALE_AFTER=30*60*1000,ITEM_LIMIT=20;
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{
  status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store',...extra}
});
const openAccount=alias=>`NOT EXISTS (SELECT 1 FROM lab_account_closures closed WHERE closed.customer_id=${alias}.owner_id)`;
const jobWhere=`${openAccount('j')} AND (j.state='uncertain' OR
  (j.state='failed' AND j.updated_at>=?) OR
  (j.state IN ('submitting','queued','running','saving') AND j.updated_at<=?))`;
const boundedId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(value)?value:null;
const timestamp=value=>Number.isSafeInteger(Number(value))&&Number(value)>=0?Number(value):null;
const count=value=>Number.isSafeInteger(Number(value))&&Number(value)>=0?Number(value):null;

async function readJobs(db,from,staleBefore){
  const [summary,recent]=await Promise.all([
    db.prepare(`SELECT COUNT(CASE WHEN j.state='failed' THEN 1 END) AS failed,
      COUNT(CASE WHEN j.state='uncertain' THEN 1 END) AS uncertain,
      COUNT(CASE WHEN j.state IN ('submitting','queued','running','saving') THEN 1 END) AS stale
      FROM jobs j WHERE ${jobWhere}`).bind(from,staleBefore).first(),
    db.prepare(`SELECT j.id AS jobId,c.id AS customerId,j.state,j.created_at AS createdAt,j.updated_at AS updatedAt
      FROM jobs j LEFT JOIN lab_customers c ON c.id=j.owner_id WHERE ${jobWhere}
      ORDER BY CASE WHEN j.state='uncertain' THEN 0 WHEN j.state='failed' THEN 2 ELSE 1 END,
      j.updated_at DESC,j.id DESC LIMIT ${ITEM_LIMIT}`).bind(from,staleBefore).all()
  ]);
  const counts={failed:count(summary?.failed),uncertain:count(summary?.uncertain),stale:count(summary?.stale)};
  if(Object.values(counts).some(value=>value===null)||!Array.isArray(recent?.results))throw Error('Unavailable job source');
  return {available:true,counts,items:recent.results.slice(0,ITEM_LIMIT).map(row=>({
    jobId:boundedId(row.jobId),customerId:boundedId(row.customerId),state:String(row.state),
    reason:row.state==='failed'?'failed':row.state==='uncertain'?'uncertain':'stale',
    createdAt:timestamp(row.createdAt),updatedAt:timestamp(row.updatedAt)
  })).filter(row=>row.jobId)};
}

async function readSettlements(db,at){
  const where=`s.settled_cost_usd IS NULL AND ${openAccount('s')}`;
  const [summary,recent]=await Promise.all([
    db.prepare(`SELECT COUNT(*) AS pending,COUNT(CASE WHEN s.next_check_at<=? THEN 1 END) AS due
      FROM lab_provider_settlements s WHERE ${where}`).bind(at).first(),
    db.prepare(`SELECT s.job_id AS jobId,c.id AS customerId,s.next_check_at AS nextCheckAt,s.attempts
      FROM lab_provider_settlements s LEFT JOIN lab_customers c ON c.id=s.owner_id
      WHERE ${where} ORDER BY s.next_check_at,s.job_id LIMIT ${ITEM_LIMIT}`).bind().all()
  ]);
  const pending=count(summary?.pending),due=count(summary?.due);
  if(pending===null||due===null||!Array.isArray(recent?.results))throw Error('Unavailable settlement source');
  return {available:true,pending,due,items:recent.results.slice(0,ITEM_LIMIT).map(row=>({
    jobId:boundedId(row.jobId),customerId:boundedId(row.customerId),
    nextCheckAt:timestamp(row.nextCheckAt),attempts:count(row.attempts)
  })).filter(row=>row.jobId)};
}

export async function ownerOperationsRoute(request,env,owner,{clock=Date.now}={}){
  // Authorization must succeed before any LAB_DB metadata or row is read.
  await requireOwner(env,owner);
  if(request.method!=='GET')return json({error:'Operations is read-only.'},405,{Allow:'GET'});
  const rawDays=new URL(request.url).searchParams.get('days')||'7';
  if(!['7','30'].includes(rawDays))return json({error:'Choose 7 or 30 days.'},400);
  const days=Number(rawDays),at=clock(),from=at-days*DAY;
  const [jobs,settlements]=await Promise.allSettled([
    readJobs(env.LAB_DB,from,at-STALE_AFTER),readSettlements(env.LAB_DB,at)
  ]);
  return json({schemaVersion:1,version:OWNER_OPERATIONS_VERSION,asOf:new Date(at).toISOString(),
    window:{days,from,to:at,staleAfterMs:STALE_AFTER},
    jobs:jobs.status==='fulfilled'?jobs.value:{available:false,counts:{failed:null,uncertain:null,stale:null},items:[]},
    settlements:settlements.status==='fulfilled'?settlements.value:{available:false,pending:null,due:null,items:[]},
    limits:{itemsPerSource:ITEM_LIMIT},
    limitations:[
      'Retained jobs only; closed accounts are excluded. Deleted creative jobs are not reconstructed.',
      'Failed counts use the selected period; uncertain and stale work includes all retained unresolved jobs.',
      'Stale means no stored update for 30 minutes, not a confirmed provider failure.',
      'A failed job may already have been refunded. Pending settlement is unconfirmed cost, not a new charge.',
      'This snapshot does not verify provider availability, scheduled runs, deployment parity or signed-in production behavior.'
    ]
  });
}
