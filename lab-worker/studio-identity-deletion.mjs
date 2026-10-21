// PV LAB-only Clerk account termination. Never use the shared/legacy Clerk key.
// The verified D1 closure is authoritative immediately, even if Clerk or R2
// experiences an outage. Cron retries ban and final deletion independently.
const SUBJECT=/^user_[A-Za-z0-9]+$/;
const one=(env,sql,...values)=>env.LAB_DB.prepare(sql).bind(...values).first();
const run=(env,sql,...values)=>env.LAB_DB.prepare(sql).bind(...values).run();
const NOW=()=>Date.now();
const REMEMBER_TOKEN_MS=7*86400000;

export async function studioDeletedSubjectKey(env,subject){
  if(!SUBJECT.test(subject)||typeof env.LAB_SECRET!=='string'||env.LAB_SECRET.length<40)
    throw Error('PV LAB identity protection is not configured.');
  const secret=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.LAB_SECRET),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const digest=new Uint8Array(await crypto.subtle.sign('HMAC',secret,
    new TextEncoder().encode('pvlab-deleted-clerk-v1:'+subject)));
  return Array.from(digest,n=>n.toString(16).padStart(2,'0')).join('');
}

export async function rejectDeletedStudioSubject(env,subject){
  const key=await studioDeletedSubjectKey(env,subject);
  const record=await one(env,'SELECT 1 AS blocked FROM lab_studio_deleted_subject_keys WHERE subject_key=? AND expires_at>?',key,NOW());
  if(record){const error=Error('This PV LAB account has been deleted. Sign up again with a new account.');error.status=403;throw error;}
  // A recently deleted *new* studio-only wallet has a deterministic ID.
  // Even if a tombstone expires, its accounting closure prevents revival.
  const id='user_PvLabV2'+subject.slice(5);
  const closed=await one(env,'SELECT 1 AS closed FROM lab_account_closures WHERE customer_id=?',id);
  if(closed){const error=Error('This PV LAB account has been deleted. Sign up again with a new account.');error.status=403;throw error;}
}

async function enqueueLinkedClosures(env){
  await run(env,`INSERT OR IGNORE INTO lab_studio_identity_deletions(customer_id,new_subject,requested_at)
    SELECT c.customer_id,l.new_subject,c.requested_at
    FROM lab_account_closures c
    JOIN lab_clerk_identity_links l ON l.canonical_id=c.customer_id AND l.kind='customer'
    JOIN lab_customers w ON w.id=c.customer_id`);
}

async function taskForCustomer(env,id){
  if(!SUBJECT.test(id))return null;
  await run(env,`INSERT OR IGNORE INTO lab_studio_identity_deletions(customer_id,new_subject,requested_at)
    SELECT x.customer_id,l.new_subject,x.requested_at
    FROM lab_account_closures x
    JOIN lab_clerk_identity_links l ON l.canonical_id=x.customer_id AND l.kind='customer'
    WHERE x.customer_id=?`,id);
  return one(env,`SELECT t.customer_id,t.new_subject,t.state,t.banned_at,c.state AS closure_state
    FROM lab_studio_identity_deletions t
    JOIN lab_account_closures c ON c.customer_id=t.customer_id
    WHERE t.customer_id=?`,id);
}

async function studioRequest(env,subject,method,action){
  if(!SUBJECT.test(subject))throw Error('Invalid PV LAB Clerk identity.');
  const secret=env.LAB_CLERK_V2_SECRET_KEY;
  if(typeof secret!=='string'||!secret.startsWith('sk_'))
    throw Error('PV LAB Clerk production key unavailable; identity deletion remains queued.');
  const url='https://api.clerk.com/v1/users/'+encodeURIComponent(subject)+(action?'/'+action:'');
  const response=await fetch(url,{
    method,redirect:'manual',
    headers:{Authorization:'Bearer '+secret,Accept:'application/json'},
    signal:AbortSignal.timeout(12000)
  });
  if(response.status===404)return 'absent';
  if(!response.ok)throw Error('PV LAB Clerk account '+(action||'deletion')+' retry required (HTTP '+response.status+').');
  const result=await response.json().catch(()=>null);
  if(action==='ban'){
    if(!result||result.id!==subject)throw Error('PV LAB Clerk ban response could not be verified.');
  }else if(!result||result.id!==subject||result.deleted!==true){
    throw Error('PV LAB Clerk deletion response could not be verified.');
  }
  return 'confirmed';
}

async function verifyLinkedTask(env,task){
  if(!task||task.state!=='pending'||!SUBJECT.test(task.customer_id)||!SUBJECT.test(task.new_subject))
    throw Error('Invalid or completed PV LAB identity task.');
  const current=await one(env,`SELECT l.new_subject
    FROM lab_clerk_identity_links l JOIN lab_account_closures c ON c.customer_id=l.canonical_id
    WHERE l.canonical_id=? AND l.kind='customer'`,task.customer_id);
  if(current?.new_subject!==task.new_subject)
    throw Error('PV LAB Clerk identity link changed; manual verification required.');
}
async function banTask(env,task){
  await verifyLinkedTask(env,task);
  if(task.banned_at)return;
  await studioRequest(env,task.new_subject,'POST','ban');
  await run(env,`UPDATE lab_studio_identity_deletions SET banned_at=?
    WHERE customer_id=? AND new_subject=? AND state='pending' AND banned_at IS NULL`,
    NOW(),task.customer_id,task.new_subject);
}

function cleanupIssue(error){
  const message=String(error?.message||'');
  const status=message.match(/HTTP (\d{3})/);
  if(status)return 'clerk_http_'+status[1];
  if(message.includes('key unavailable'))return 'missing_studio_key';
  if(message.includes('response could not be verified'))return 'clerk_invalid_response';
  if(message.includes('link changed'))return 'identity_link_mismatch';
  if(message.includes('media cleanup'))return 'media_cleanup_pending';
  if(error?.name==='TimeoutError')return 'clerk_timeout';
  return 'cleanup_failed';
}
async function recordAttempt(env,id,error=null){
  await run(env,`INSERT INTO lab_studio_identity_cleanup_attempts(customer_id,attempted_at,issue)
    VALUES(?,?,?) ON CONFLICT(customer_id) DO UPDATE SET attempted_at=excluded.attempted_at,issue=excluded.issue`,
    id,NOW(),error?cleanupIssue(error):null);
}
export async function banClosedStudioIdentity(env,id){
  const task=await taskForCustomer(env,id);
  if(!task||task.state!=='pending')return false; // Legacy-only: never touch shared Clerk.
  try{await banTask(env,task);await recordAttempt(env,id);}
  catch(error){await recordAttempt(env,id,error);throw error;}
  return true;
}
// A returning closed-account session can finish its own queued identity cleanup
// without waiting for cron or unrelated provider maintenance. It never reopens
// a wallet and cannot touch an owner or a different customer's Clerk account.
export async function finishClosedStudioIdentity(env,id){
  const task=await taskForCustomer(env,id);
  if(!task||task.state!=='pending')return false;
  await processTask(env,task);
  return true;
}

async function finalizeTask(env,task){
  await verifyLinkedTask(env,task);
  const closure=await one(env,'SELECT state FROM lab_account_closures WHERE customer_id=?',task.customer_id);
  if(closure?.state!=='deleted')return;
  // R2 is the private media authority. Never delete the login if an orphan
  // object survives database cleanup, including an old thumbnail derivative.
  const leftovers=await env.LAB_MEDIA.list({prefix:task.customer_id+'/',limit:1});
  if(leftovers.objects?.length||leftovers.truncated)
    throw Error('PV LAB creative media cleanup is incomplete.');
  const key=await studioDeletedSubjectKey(env,task.new_subject);
  // Ensure a verified legal/billing clearance was recorded by the creative
  // cleanup process. This task cannot bypass that process.
  await studioRequest(env,task.new_subject,'DELETE');
  const t=NOW();
  await env.LAB_DB.batch([
    env.LAB_DB.prepare(`INSERT OR IGNORE INTO lab_studio_deleted_subject_keys(subject_key,expires_at)
      VALUES(?,?)`).bind(key,t+REMEMBER_TOKEN_MS),
    env.LAB_DB.prepare(`UPDATE lab_studio_identity_deletions
      SET new_subject=NULL,state='complete',completed_at=?
      WHERE customer_id=? AND new_subject=? AND state='pending'`).bind(t,task.customer_id,task.new_subject),
    env.LAB_DB.prepare(`DELETE FROM lab_clerk_identity_links
      WHERE canonical_id=? AND new_subject=? AND kind='customer'`).bind(task.customer_id,task.new_subject)
  ]);
}

async function processTask(env,task){
  try{
    // Deletion is independent of Clerk's optional paid ban feature. D1 already
    // blocks this closed wallet. Once billing/content cleanup is verified,
    // delete the identity directly even when a prior ban returned HTTP 402.
    if(task.closure_state==='deleted')await finalizeTask(env,task);
    else if(!task.banned_at)await banTask(env,task);
    await recordAttempt(env,task.customer_id);
  }catch(error){await recordAttempt(env,task.customer_id,error);throw error;}
}

export async function processStudioIdentityDeletions(env){
  // Owner-only historical test/development databases need not contain any
  // customer schema. A real customer deployment must provide the task tables.
  if(!await one(env,"SELECT name FROM sqlite_master WHERE type='table' AND name='lab_customers'"))return;
  if(!await one(env,"SELECT name FROM sqlite_master WHERE type='table' AND name='lab_studio_identity_deletions'"))
    throw Error('PV LAB identity deletion migration is required.');
  await enqueueLinkedClosures(env); // Recovers from interrupted closure responses.
  await run(env,'DELETE FROM lab_studio_deleted_subject_keys WHERE expires_at<?',NOW());
  const found=await env.LAB_DB.prepare(`SELECT t.customer_id,t.new_subject,t.banned_at,t.state,
      c.state AS closure_state
    FROM lab_studio_identity_deletions t
    JOIN lab_account_closures c ON c.customer_id=t.customer_id
    WHERE t.state='pending' ORDER BY t.requested_at LIMIT 8`).bind().all();
  let failed=false;
  for(const task of found.results){
    try{await processTask(env,task);}catch{failed=true;}
  }
  if(failed)throw Error('PV LAB identity cleanup is pending; Clerk or storage verification will be retried.');
}
