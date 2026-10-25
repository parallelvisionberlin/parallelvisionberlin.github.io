// Financial read-back only. Never submit, retry, charge or restore a generation.
export async function reconcileProviderSettlements(env,{fetchSettlement,at=Date.now()}={}){
  const db=env.LAB_DB;
  if(!await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='lab_provider_settlements'").bind().first())return;
  const result=await db.prepare('SELECT * FROM lab_provider_settlements WHERE settled_cost_usd IS NULL AND next_check_at<=? ORDER BY next_check_at,job_id LIMIT 3').bind(at).all();
  await Promise.all((result.results||[]).map(async job=>{
    const delay=Math.min(3600000,30000*2**Math.min(job.attempts,7));
    const lock=await db.prepare('UPDATE lab_provider_settlements SET next_check_at=?,attempts=attempts+1 WHERE job_id=? AND next_check_at=? AND settled_cost_usd IS NULL').bind(at+delay,job.job_id,job.next_check_at).run();
    if(!lock.meta.changes)return;
    try{
      const record=await fetchSettlement(job);
      const cost=Number(record?.cost);
      if(record?.settled!==true||record.cost===null||record.cost===''||record.cost===undefined||!Number.isFinite(cost)||cost<0)return;
      await db.batch([
        db.prepare('UPDATE jobs SET settled_cost=? WHERE id=? AND owner_id=?').bind(cost,job.job_id,job.owner_id),
        db.prepare('UPDATE lab_generation_finance SET settled_cost_usd=?,updated_at=? WHERE job_id=? AND customer_id=?').bind(cost,at,job.job_id,job.owner_id),
        db.prepare('UPDATE lab_provider_settlements SET settled_cost_usd=?,settled_at=? WHERE job_id=? AND owner_id=?').bind(cost,at,job.job_id,job.owner_id)
      ]);
    }catch{/* Provider unavailable or final billing unreported: retain pending, back off. */}
  }));
}
