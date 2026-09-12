import { controlledRows, controlledText, memoryControls } from './memory-controls.js';
import { currentAgreements } from './agreements.js';
import { listJournal } from './nina-journal.js';
import { relationshipEvaluationDiagnostic } from './relationship.js';
export async function memoryWorkspace(env,user) {
  const db=env.NINA_MEMORY_DB,visitor=user.memory_visitor_id;
  const [controls,pins,summary,profile,threads,agreements,relationship,journal,conversations,evaluation]=await Promise.all([
    memoryControls(env,user.id,visitor),
    db.prepare('SELECT memory_id,category,content,updated_at FROM pinned_memories WHERE visitor_id=? ORDER BY updated_at DESC LIMIT 200').bind(visitor).all(),
    db.prepare('SELECT summary FROM memory_summaries WHERE visitor_id=?').bind(visitor).first(),
    db.prepare('SELECT content FROM nina_private_context WHERE user_id=?').bind(user.id).first(),
    db.prepare("SELECT thread_id,content,updated_at FROM open_threads WHERE visitor_id=? AND status='active' ORDER BY updated_at DESC LIMIT 100").bind(visitor).all(),
    currentAgreements(env,user.id,{includeHidden:true}),
    db.prepare('SELECT state_json,relationship_summary,updated_at,last_evaluated_at FROM nina_relationship_states WHERE user_id=?').bind(user.id).first(),
    listJournal(env,user.id,{editing:true}),
    db.prepare('SELECT conversation_id,started_at,ended_at FROM conversations WHERE visitor_id=? ORDER BY started_at DESC LIMIT 15').bind(visitor).all(),
    relationshipEvaluationDiagnostic(env,user.id,visitor)
  ]);
  return {role:user.role,pins:controlledRows(pins.results||[],controls,'pin','memory_id'),summary:controlledText(summary?.summary,controls,'summary'),
    profile:controlledText(profile?.content,controls,'profile'),threads:controlledRows(threads.results||[],controls,'thread','thread_id'),
    agreements:agreements.map(a=>{const c=controls.find(c=>c.kind==='agreement'&&c.target_id===a.event_id);return {...a,hidden:c?.operation==='hide',revision:c?.revision||0};}),
    removed:controls.filter(c=>c.operation==='hide'&&c.kind!=='agreement').map(c=>({kind:c.kind,id:c.target_id,revision:c.revision})),
    relationship:relationship?{...relationship,state:JSON.parse(relationship.state_json),state_json:undefined}:null,evaluation,journal,conversations:conversations.results||[]};
}
