import { MemoryEditError, workspaceEnabled } from './memory-controls.js';

export async function listJournal(env,userId,{editing=false}={}) {
  if(!workspaceEnabled(env)) return [];
  return (await env.NINA_MEMORY_DB.prepare(`SELECT entry_id,kind,scope,content,story_date,status,origin,revision,recorded_at,updated_at,source_message_id,
    CASE WHEN user_id=? THEN 1 ELSE 0 END AS editable FROM nina_journal_entries
    WHERE (user_id=? OR (scope='shared' AND status='active')) AND (?=1 OR status='active')
    ORDER BY updated_at DESC LIMIT 160`).bind(userId,userId,editing?1:0).all()).results;
}

export async function journalContext(env,userId) {
  const entries=await listJournal(env,userId); let used=0;
  const selected=entries.filter(e=>{const size=e.content.length+200;if(used+size>5000)return false;used+=size;return true;});
  if(!selected.length)return '';
  return `NINA CONTINUITY JOURNAL\n${JSON.stringify(selected.map(e=>({kind:e.kind,scope:e.scope,text:e.content,storyDate:e.story_date,recordedAt:e.recorded_at})))}\nIndependent entries describe Nina's imagined life within her character world. Shared entries record experiences in conversation with this visitor; fantasy entries remain imagined scenes. Never turn an independent or fantasy event into a physical experience with the visitor. Recorded dates are real conversation dates; a story date is separate. Preserve these details when relevant, without reciting a diary or pretending to have physically lived outside the character world when directly asked. Private entries belong only to this visitor. Later explicit corrections take precedence.`;
}

export async function journalStatements(env,visitorId,pinned,messages,now,guard={sql:'1',params:[]}) {
  if(!workspaceEnabled(env))return [];
  const user=await env.NINA_MEMORY_DB.prepare('SELECT id FROM users WHERE memory_visitor_id=?').bind(visitorId).first();
  if(!user)return [];
  const statements=[];
  for(const item of pinned) {
    if(item.decision==='REJECT')continue;
    const kind={nina_autobiography:'independent',shared_memory:'shared',fantasy_roleplay:'fantasy'}[item.category];
    if(!kind)continue;
    const source=messages.find(m=>item.evidence_message_ids?.includes(m.message_id)&&(kind!=='independent'||m.role==='persona'));
    if(!source)continue;
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(item.content.trim().toLowerCase()));
    const fingerprint=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,24);
    const id=`journal:${kind}:${source.message_id}:${fingerprint}`;
    // Production extraction supplies the resolved pin id, including duplicates.
    // The fallback links historical/direct callers only to an exact account-owned copy.
    const pinId=item.memory_id||(await env.NINA_MEMORY_DB.prepare(`SELECT memory_id FROM pinned_memories
      WHERE visitor_id=? AND category=? AND lower(trim(content))=lower(trim(?)) ORDER BY updated_at DESC LIMIT 1`)
      .bind(visitorId,item.category,item.content).first())?.memory_id||null;
    const unedited=`NOT EXISTS (SELECT 1 FROM nina_memory_controls WHERE user_id=? AND visitor_id=?
      AND kind='pin' AND target_id=? AND operation IN ('save','hide'))`;
    if(pinId) statements.push(env.NINA_MEMORY_DB.prepare(`UPDATE nina_journal_entries
      SET content=?,kind=?,source_message_id=?,recorded_at=?,updated_at=?,revision=revision+1,
        scope='private'
      WHERE user_id=? AND visitor_id=? AND pin_memory_id=? AND origin='conversation' AND status='active'
        AND (content<>? OR kind<>?) AND ${unedited} AND ${guard.sql}`)
      .bind(item.content.slice(0,800),kind,source.message_id,source.created_at||now,now,
        user.id,visitorId,pinId,item.content.slice(0,800),kind,user.id,visitorId,pinId,...guard.params));
    statements.push(env.NINA_MEMORY_DB.prepare(`INSERT OR IGNORE INTO nina_journal_entries
      (entry_id,user_id,visitor_id,source_message_id,kind,content,origin,recorded_at,updated_at,pin_memory_id)
      SELECT ?,?,?,?,?,?,'conversation',?,?,? WHERE ${guard.sql}
        AND ${unedited}
        AND NOT EXISTS (SELECT 1 FROM nina_journal_entries WHERE user_id=? AND visitor_id=? AND pin_memory_id=?)`)
      .bind(id,user.id,visitorId,source.message_id,kind,item.content.slice(0,800),source.created_at||now,now,pinId,
        ...guard.params,user.id,visitorId,pinId,user.id,visitorId,pinId));
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
    const entry=await db.prepare(`SELECT j.pin_memory_id,COALESCE(c.revision,0) AS control_revision
      FROM nina_journal_entries j LEFT JOIN nina_memory_controls c
      ON c.user_id=j.user_id AND c.visitor_id=j.visitor_id AND c.kind='pin' AND c.target_id=j.pin_memory_id
      WHERE j.entry_id=? AND j.user_id=? AND j.visitor_id=? AND j.revision=?`)
      .bind(id,user.id,user.memory_visitor_id,body.revision).first();
    if(!entry)throw new MemoryEditError('This entry changed or is unavailable. Reload before editing.',409);
    const journalEdit=db.prepare(`UPDATE nina_journal_entries SET kind=?,scope=?,content=?,story_date=?,status=?,revision=revision+1,updated_at=?
      WHERE entry_id=? AND user_id=? AND visitor_id=? AND revision=?
        AND COALESCE((SELECT revision FROM nina_memory_controls WHERE user_id=? AND visitor_id=? AND kind='pin' AND target_id=?),0)=?`)
      .bind(body.kind,body.scope,content,storyDate,body.status,now,id,user.id,user.memory_visitor_id,body.revision,
        user.id,user.memory_visitor_id,entry.pin_memory_id,entry.control_revision);
    let result;
    if(entry.pin_memory_id) {
      const category={independent:'nina_autobiography',shared:'shared_memory',fantasy:'fantasy_roleplay'}[body.kind];
      const control=db.prepare(`INSERT INTO nina_memory_controls
        (user_id,visitor_id,kind,target_id,operation,content,category,revision,updated_at)
        SELECT ?,?,'pin',?,?,?,?,1,? WHERE EXISTS (SELECT 1 FROM nina_journal_entries
          WHERE entry_id=? AND user_id=? AND visitor_id=? AND revision=? AND updated_at=?
            AND content=? AND kind=? AND status=?)
        ON CONFLICT(user_id,kind,target_id) DO UPDATE SET operation=excluded.operation,content=excluded.content,
          category=excluded.category,revision=nina_memory_controls.revision+1,updated_at=excluded.updated_at
        WHERE nina_memory_controls.revision=?`)
        .bind(user.id,user.memory_visitor_id,entry.pin_memory_id,body.status==='hidden'?'hide':'save',content,category,now,
          id,user.id,user.memory_visitor_id,body.revision+1,now,content,body.kind,body.status,entry.control_revision);
      // D1 batches are atomic. The control trigger skips the just-edited identical row,
      // and synchronizes any other linked copies with their own revision increments.
      [result]=await db.batch([journalEdit,control]);
    } else result=await journalEdit.run();
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
