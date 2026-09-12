import { MemoryEditError, workspaceEnabled } from './memory-controls.js';

export async function listJournal(env,userId,{editing=false}={}) {
  if(!workspaceEnabled(env)) return [];
  return (await env.NINA_MEMORY_DB.prepare(`SELECT entry_id,kind,scope,content,story_date,status,origin,revision,recorded_at,updated_at,source_message_id,
    CASE WHEN user_id=? THEN 1 ELSE 0 END AS editable FROM nina_journal_entries
    WHERE user_id=? OR (scope='shared' AND status='active') ORDER BY updated_at DESC LIMIT 160`).bind(userId,userId).all()).results
    .filter(row=>editing||row.status==='active');
}

export async function journalContext(env,userId) {
  const entries=await listJournal(env,userId); let used=0;
  const selected=entries.filter(e=>{const size=e.content.length+200;if(used+size>5000)return false;used+=size;return true;});
  if(!selected.length)return '';
  return `NINA CONTINUITY JOURNAL\n${JSON.stringify(selected.map(e=>({kind:e.kind,scope:e.scope,text:e.content,storyDate:e.story_date,recordedAt:e.recorded_at})))}\nIndependent entries describe Nina's imagined life within her character world. Shared entries record experiences in conversation with this visitor; fantasy entries remain imagined scenes. Never turn an independent or fantasy event into a physical experience with the visitor. Recorded dates are real conversation dates; a story date is separate. Preserve these details when relevant, without reciting a diary or pretending to have physically lived outside the character world when directly asked. Private entries belong only to this visitor. Later explicit corrections take precedence.`;
}

export async function journalStatements(env,visitorId,pinned,messages,now) {
  if(!workspaceEnabled(env))return [];
  const user=await env.NINA_MEMORY_DB.prepare('SELECT id FROM users WHERE memory_visitor_id=?').bind(visitorId).first();
  if(!user)return [];
  const statements=[];
  for(const item of pinned) {
    const kind={nina_autobiography:'independent',shared_memory:'shared',fantasy_roleplay:'fantasy'}[item.category];
    if(!kind)continue;
    const source=messages.find(m=>item.evidence_message_ids?.includes(m.message_id)&&(kind!=='independent'||m.role==='persona'));
    if(!source)continue;
    const id=`journal:${kind}:${source.message_id}`;
    statements.push(env.NINA_MEMORY_DB.prepare(`INSERT OR IGNORE INTO nina_journal_entries
      (entry_id,user_id,visitor_id,source_message_id,kind,content,origin,recorded_at,updated_at)
      VALUES (?,?,?,?,?,?,'conversation',?,?)`).bind(id,user.id,visitorId,source.message_id,kind,item.content.slice(0,800),source.created_at||now,now));
  }
  return statements;
}

export async function saveJournal(env,user,body) {
  const allowed=['id','kind','scope','content','storyDate','status','revision'];
  if(!body||Object.keys(body).some(k=>!allowed.includes(k))||!Number.isSafeInteger(body.revision)||body.revision<0)throw new MemoryEditError('Invalid journal edit.');
  if(!['independent','shared','fantasy'].includes(body.kind)||!['private','shared'].includes(body.scope)||!['active','hidden'].includes(body.status))throw new MemoryEditError('Invalid journal category.');
  if(body.scope==='shared'&&(user.role!=='owner'||body.kind!=='independent'))throw new MemoryEditError('Only the owner can publish independent world entries.',403);
  const content=typeof body.content==='string'?body.content.trim():'';
  if(!content||content.length>800)throw new MemoryEditError('Use 1 to 800 characters.');
  const storyDate=body.storyDate||null;
  if(storyDate&&(typeof storyDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(storyDate)||Number.isNaN(Date.parse(storyDate))))throw new MemoryEditError('Use a story date in YYYY-MM-DD format.');
  const id=body.id||crypto.randomUUID(),db=env.NINA_MEMORY_DB,now=new Date().toISOString();
  if(typeof id!=='string'||id.length>220)throw new MemoryEditError('Invalid journal record.');
  if(body.id) {
    const result=await db.prepare(`UPDATE nina_journal_entries SET kind=?,scope=?,content=?,story_date=?,status=?,revision=revision+1,updated_at=?
      WHERE entry_id=? AND user_id=? AND revision=?`).bind(body.kind,body.scope,content,storyDate,body.status,now,id,user.id,body.revision).run();
    if(!result.meta?.changes)throw new MemoryEditError('This entry changed or is unavailable. Reload before editing.',409);
  } else {
    if(body.revision!==0)throw new MemoryEditError('Invalid new record revision.');
    const count=await db.prepare('SELECT COUNT(*) AS n FROM nina_journal_entries WHERE user_id=?').bind(user.id).first();
    if(count.n>=500)throw new MemoryEditError('The journal has reached its entry limit.',409);
    await db.prepare(`INSERT INTO nina_journal_entries(entry_id,user_id,visitor_id,kind,scope,content,story_date,status,origin,recorded_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,'editor',?,?)`).bind(id,user.id,user.memory_visitor_id,body.kind,body.scope,content,storyDate,body.status,now,now).run();
  }
  return {saved:true,id,revision:body.revision+1};
}
