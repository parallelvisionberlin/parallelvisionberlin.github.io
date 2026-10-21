// Read-only operational diagnosis. Never emit message text, media URLs or credentials.
import { createHash } from 'node:crypto';
const account='a40ce1725295563a7b7db9fc3160480a';
const token=String(process.env.CLOUDFLARE_API_TOKEN||'').replace(/\s+/g,'');
async function api(path,body){
 const r=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+path,{
 method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
 ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000)});
 const j=await r.json();
 if(!r.ok||!j.success)throw new Error('CF_HTTP_'+r.status+'_'+(j.errors||[]).map(e=>e.code).join(','));
 return j.result;
}
const settings=await api('/workers/scripts/nina-instagram/settings');
const binding=settings.bindings.find(b=>b.name==='IG_MEMORY_DB'&&b.type==='d1');
if(!binding?.id)throw new Error('Missing Instagram D1 binding');
async function query(label,sql){
 try{
 const result=await api('/d1/database/'+binding.id+'/query',{sql});
 for(const block of result)for(const row of block.results||[]){
 if(row.instagram_user_id){row.contact=createHash('sha256').update(String(row.instagram_user_id)).digest('hex').slice(0,10);delete row.instagram_user_id;}
 console.log(label,JSON.stringify(row));
 }
 }catch(e){console.log(label,JSON.stringify({error:e.message}));}
}
console.log('DIAGNOSTIC_UTC',new Date().toISOString());
console.log('HEALTH',JSON.stringify(await (await fetch('https://nina-instagram.parallelvision.workers.dev/health',{signal:AbortSignal.timeout(20000)})).json()));
console.log('SCHEDULES',JSON.stringify(await api('/workers/scripts/nina-instagram/schedules')));
await query('CONFIG','SELECT mode FROM ig_autoreply_config WHERE id=1');
await query('VOLUME',"SELECT direction,COUNT(*) AS n,MAX(created_at) AS latest FROM ig_messages WHERE created_at>=datetime('now','-1 day') GROUP BY direction");
await query('DRAFTS',"SELECT COUNT(*) AS n,MAX(created_at) AS latest FROM ig_drafts WHERE created_at>=datetime('now','-1 day')");
await query('ATTEMPTS',"SELECT status,error_code,http_status,COUNT(*) AS n,MAX(updated_at) AS latest FROM ig_send_attempts WHERE created_at>=datetime('now','-1 day') GROUP BY status,error_code,http_status");
await query('RECENT',"SELECT m.instagram_user_id,m.direction,m.created_at,p.status,p.last_error_code,CASE WHEN m.body='[Voice note awaiting transcription]' THEN 'voice_pending' WHEN m.body='[Voice note could not be transcribed]' THEN 'voice_failed' ELSE 'text_or_transcribed' END AS kind,EXISTS(SELECT 1 FROM ig_owner_links l WHERE l.instagram_user_id=m.instagram_user_id AND l.revoked_at IS NULL AND l.expires_at>CURRENT_TIMESTAMP) AS linked_owner FROM ig_messages m LEFT JOIN ig_processing p ON p.incoming_message_id=m.message_id ORDER BY m.rowid DESC LIMIT 24");
await query('JOBS',"SELECT instagram_user_id,audience,status,attempts,last_error_code,datetime(due_at,'unixepoch') AS due_utc,datetime(expires_at,'unixepoch') AS expires_utc,updated_at FROM ig_reply_jobs ORDER BY updated_at DESC LIMIT 16");
await query('PROCESSING',"SELECT status,last_error_code,COUNT(*) AS n,MAX(updated_at) AS latest FROM ig_processing WHERE updated_at>=datetime('now','-3 hours') GROUP BY status,last_error_code");
